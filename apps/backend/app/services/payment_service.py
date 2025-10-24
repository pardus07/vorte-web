"""Payment service with idempotency and retry logic."""
import asyncio
import json
import logging
from decimal import Decimal
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from app.integrations.payments.base import (
    PaymentProvider,
    CustomerInfo,
    PaymentStatus,
    PaymentError,
    PaymentTimeoutError,
    Payment3DSFailedError
)
from app.integrations.payments.config import payment_config
from app.integrations.payments.mock import mock_payment_provider
from app.services.redis_service import redis_service
from app.core.exceptions import ValidationError


logger = logging.getLogger(__name__)


class PaymentService:
    """
    Payment service with idempotency and retry logic.
    
    Implements Stripe-style idempotency pattern with 24-hour window.
    """
    
    def __init__(self, provider: Optional[PaymentProvider] = None):
        """
        Initialize payment service.
        
        Args:
            provider: Payment provider instance (defaults to mock)
        """
        self.provider = provider or mock_payment_provider
        self.redis = redis_service
        self.config = payment_config
    
    def _get_idempotency_key(self, idempotency_key: str, operation: str) -> str:
        """
        Generate Redis key for idempotency.
        
        Args:
            idempotency_key: User-provided idempotency key
            operation: Operation type (initiate, confirm, refund)
            
        Returns:
            Redis key
        """
        return f"payment:idem:{operation}:{idempotency_key}"
    
    async def _get_cached_response(
        self,
        idempotency_key: str,
        operation: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached idempotent response.
        
        Args:
            idempotency_key: Idempotency key
            operation: Operation type
            
        Returns:
            Cached response or None
        """
        try:
            client = await self.redis.get_client()
            cache_key = self._get_idempotency_key(idempotency_key, operation)
            cached = await client.get(cache_key)
            
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Failed to get cached response: {e}")
        
        return None

    
    async def _cache_response(
        self,
        idempotency_key: str,
        operation: str,
        response: Dict[str, Any]
    ):
        """
        Cache idempotent response.
        
        Args:
            idempotency_key: Idempotency key
            operation: Operation type
            response: Response to cache
        """
        try:
            client = await self.redis.get_client()
            cache_key = self._get_idempotency_key(idempotency_key, operation)
            
            await client.setex(
                cache_key,
                self.config.IDEMPOTENCY_WINDOW,
                json.dumps(response, default=str)
            )
        except Exception as e:
            logger.warning(f"Failed to cache response: {e}")
    
    async def _retry_with_backoff(
        self,
        operation,
        *args,
        **kwargs
    ):
        """
        Retry operation with exponential backoff.
        
        Args:
            operation: Async function to retry
            *args: Positional arguments for operation
            **kwargs: Keyword arguments for operation
            
        Returns:
            Operation result
            
        Raises:
            PaymentError: If all retries fail
        """
        last_error = None
        
        for attempt in range(self.config.MAX_RETRIES):
            try:
                return await operation(*args, **kwargs)
            except PaymentTimeoutError:
                # Don't retry timeouts
                raise
            except Payment3DSFailedError as e:
                # Log 3DS failure
                logger.error(f"PAYMENT_3DS_FAILED: {e.message}")
                raise
            except PaymentError as e:
                last_error = e
                
                if attempt < self.config.MAX_RETRIES - 1:
                    # Wait before retry
                    delay = self.config.RETRY_BACKOFF[attempt]
                    logger.warning(
                        f"Payment attempt {attempt + 1} failed: {e.message}. "
                        f"Retrying in {delay}s..."
                    )
                    await asyncio.sleep(delay)
                else:
                    # Final attempt failed
                    logger.error(f"Payment failed after {self.config.MAX_RETRIES} attempts")
                    raise
        
        # Should not reach here, but just in case
        if last_error:
            raise last_error
        raise PaymentError("Payment failed after retries")

    
    async def initiate_payment(
        self,
        amount: Decimal,
        currency: str,
        order_id: str,
        customer_email: str,
        customer_name: str,
        idempotency_key: str,
        callback_url: Optional[str] = None,
        customer_phone: Optional[str] = None,
        customer_ip: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initiate payment with idempotency.
        
        Args:
            amount: Payment amount
            currency: Currency code
            order_id: Order identifier
            customer_email: Customer email
            customer_name: Customer name
            idempotency_key: Unique idempotency key
            callback_url: Optional callback URL
            customer_phone: Optional customer phone
            customer_ip: Optional customer IP address
            
        Returns:
            Dict with transaction_id, status, redirect_url, etc.
            
        Raises:
            ValidationError: If validation fails
            PaymentError: If payment initiation fails
        """
        # Check for cached response
        cached = await self._get_cached_response(idempotency_key, "initiate")
        if cached:
            logger.info(f"Returning cached payment initiation for key {idempotency_key}")
            return cached
        
        # Validate amount
        if currency not in self.config.SUPPORTED_CURRENCIES:
            raise ValidationError(f"Unsupported currency: {currency}")
        
        min_amount = Decimal(str(self.config.MIN_AMOUNT.get(currency, 0)))
        max_amount = Decimal(str(self.config.MAX_AMOUNT.get(currency, 999999)))
        
        if amount < min_amount:
            raise ValidationError(f"Amount below minimum: {min_amount} {currency}")
        
        if amount > max_amount:
            raise ValidationError(f"Amount exceeds maximum: {max_amount} {currency}")
        
        # Prepare customer info
        customer_info = CustomerInfo(
            email=customer_email,
            name=customer_name,
            phone=customer_phone,
            ip_address=customer_ip
        )
        
        # Initiate payment with retry
        try:
            # Apply timeout
            init_response = await asyncio.wait_for(
                self._retry_with_backoff(
                    self.provider.initiate_payment,
                    amount=amount,
                    currency=currency,
                    order_id=order_id,
                    customer_info=customer_info,
                    idempotency_key=idempotency_key,
                    callback_url=callback_url
                ),
                timeout=self.config.TIMEOUT
            )
        except asyncio.TimeoutError:
            logger.error(f"Payment initiation timed out for order {order_id}")
            raise PaymentTimeoutError()
        
        # Prepare response
        response = {
            "transaction_id": init_response.transaction_id,
            "status": init_response.status.value,
            "requires_3ds": init_response.requires_3ds,
            "redirect_url": init_response.redirect_url,
            "initiated_at": datetime.utcnow().isoformat()
        }
        
        # Cache response
        await self._cache_response(idempotency_key, "initiate", response)
        
        return response

    
    async def confirm_payment(
        self,
        transaction_id: str,
        idempotency_key: str
    ) -> Dict[str, Any]:
        """
        Confirm payment after 3DS authentication.
        
        Args:
            transaction_id: Transaction identifier
            idempotency_key: Unique idempotency key
            
        Returns:
            Dict with transaction_id, status, amount, etc.
            
        Raises:
            PaymentError: If confirmation fails
        """
        # Check for cached response
        cached = await self._get_cached_response(idempotency_key, "confirm")
        if cached:
            logger.info(f"Returning cached payment confirmation for key {idempotency_key}")
            return cached
        
        # Confirm payment with retry
        try:
            confirm_response = await asyncio.wait_for(
                self._retry_with_backoff(
                    self.provider.confirm_payment,
                    transaction_id=transaction_id
                ),
                timeout=self.config.TIMEOUT
            )
        except asyncio.TimeoutError:
            logger.error(f"Payment confirmation timed out for transaction {transaction_id}")
            raise PaymentTimeoutError()
        
        # Prepare response
        response = {
            "transaction_id": confirm_response.transaction_id,
            "status": confirm_response.status.value,
            "amount": float(confirm_response.amount),
            "currency": confirm_response.currency,
            "confirmed_at": datetime.utcnow().isoformat()
        }
        
        # Cache response
        await self._cache_response(idempotency_key, "confirm", response)
        
        return response
    
    async def refund_payment(
        self,
        transaction_id: str,
        amount: Decimal,
        reason: str,
        idempotency_key: str
    ) -> Dict[str, Any]:
        """
        Process payment refund.
        
        Args:
            transaction_id: Original transaction identifier
            amount: Amount to refund
            reason: Refund reason
            idempotency_key: Unique idempotency key
            
        Returns:
            Dict with refund_id, status, etc.
            
        Raises:
            PaymentError: If refund fails
        """
        # Check for cached response
        cached = await self._get_cached_response(idempotency_key, "refund")
        if cached:
            logger.info(f"Returning cached refund for key {idempotency_key}")
            return cached
        
        # Process refund with retry
        try:
            refund_response = await asyncio.wait_for(
                self._retry_with_backoff(
                    self.provider.refund_payment,
                    transaction_id=transaction_id,
                    amount=amount,
                    reason=reason,
                    idempotency_key=idempotency_key
                ),
                timeout=self.config.TIMEOUT
            )
        except asyncio.TimeoutError:
            logger.error(f"Refund timed out for transaction {transaction_id}")
            raise PaymentTimeoutError()
        
        # Prepare response
        response = {
            "refund_id": refund_response.refund_id,
            "transaction_id": refund_response.transaction_id,
            "amount": float(refund_response.amount),
            "status": refund_response.status,
            "refunded_at": datetime.utcnow().isoformat()
        }
        
        # Cache response
        await self._cache_response(idempotency_key, "refund", response)
        
        return response
    
    async def get_transaction_status(
        self,
        transaction_id: str
    ) -> Dict[str, Any]:
        """
        Get current transaction status.
        
        Args:
            transaction_id: Transaction identifier
            
        Returns:
            Dict with transaction status
        """
        status_response = await self.provider.get_transaction_status(transaction_id)
        
        return {
            "transaction_id": status_response.transaction_id,
            "status": status_response.status.value,
            "amount": float(status_response.amount),
            "currency": status_response.currency
        }


# Singleton instance
payment_service = PaymentService()
