"""Base payment provider interface."""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from decimal import Decimal
from enum import Enum


class PaymentStatus(str, Enum):
    """Payment status states."""
    INITIATED = "initiated"
    REQUIRES_AUTH = "requires_auth"  # 3DS authentication required
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentInitResponse:
    """Response from payment initiation."""
    
    def __init__(
        self,
        transaction_id: str,
        status: PaymentStatus,
        redirect_url: Optional[str] = None,
        requires_3ds: bool = False,
        error_message: Optional[str] = None
    ):
        self.transaction_id = transaction_id
        self.status = status
        self.redirect_url = redirect_url
        self.requires_3ds = requires_3ds
        self.error_message = error_message


class PaymentConfirmResponse:
    """Response from payment confirmation."""
    
    def __init__(
        self,
        transaction_id: str,
        status: PaymentStatus,
        amount: Decimal,
        currency: str,
        error_message: Optional[str] = None
    ):
        self.transaction_id = transaction_id
        self.status = status
        self.amount = amount
        self.currency = currency
        self.error_message = error_message


class RefundResponse:
    """Response from refund request."""
    
    def __init__(
        self,
        refund_id: str,
        transaction_id: str,
        amount: Decimal,
        status: str,
        error_message: Optional[str] = None
    ):
        self.refund_id = refund_id
        self.transaction_id = transaction_id
        self.amount = amount
        self.status = status
        self.error_message = error_message



class CustomerInfo:
    """Customer information for payment."""
    
    def __init__(
        self,
        email: str,
        name: str,
        phone: Optional[str] = None,
        ip_address: Optional[str] = None
    ):
        self.email = email
        self.name = name
        self.phone = phone
        self.ip_address = ip_address


class PaymentProvider(ABC):
    """
    Abstract base class for payment providers.
    
    All payment providers must implement this interface to ensure
    consistent behavior across different payment gateways.
    """
    
    @abstractmethod
    async def initiate_payment(
        self,
        amount: Decimal,
        currency: str,
        order_id: str,
        customer_info: CustomerInfo,
        idempotency_key: str,
        callback_url: Optional[str] = None
    ) -> PaymentInitResponse:
        """
        Initiate a payment transaction.
        
        Args:
            amount: Payment amount
            currency: Currency code (e.g., "TRY", "USD")
            order_id: Order identifier
            customer_info: Customer information
            idempotency_key: Unique key for idempotent requests
            callback_url: URL for payment callback/redirect
            
        Returns:
            PaymentInitResponse with transaction details
            
        Raises:
            PaymentError: If payment initiation fails
        """
        pass
    
    @abstractmethod
    async def confirm_payment(
        self,
        transaction_id: str
    ) -> PaymentConfirmResponse:
        """
        Confirm payment status after 3DS authentication.
        
        Args:
            transaction_id: Transaction identifier from initiate_payment
            
        Returns:
            PaymentConfirmResponse with final payment status
            
        Raises:
            PaymentError: If confirmation fails
        """
        pass
    
    @abstractmethod
    async def refund_payment(
        self,
        transaction_id: str,
        amount: Decimal,
        reason: str,
        idempotency_key: str
    ) -> RefundResponse:
        """
        Process a refund for a completed payment.
        
        Args:
            transaction_id: Original transaction identifier
            amount: Amount to refund
            reason: Reason for refund
            idempotency_key: Unique key for idempotent requests
            
        Returns:
            RefundResponse with refund details
            
        Raises:
            PaymentError: If refund fails
        """
        pass
    
    @abstractmethod
    async def verify_webhook(
        self,
        payload: Dict[str, Any],
        signature: str
    ) -> bool:
        """
        Verify webhook authenticity from payment provider.
        
        Args:
            payload: Webhook payload
            signature: Signature header from provider
            
        Returns:
            True if webhook is authentic, False otherwise
        """
        pass
    
    @abstractmethod
    async def get_transaction_status(
        self,
        transaction_id: str
    ) -> PaymentConfirmResponse:
        """
        Get current status of a transaction.
        
        Args:
            transaction_id: Transaction identifier
            
        Returns:
            PaymentConfirmResponse with current status
            
        Raises:
            PaymentError: If status check fails
        """
        pass


class PaymentError(Exception):
    """Base exception for payment errors."""
    
    def __init__(self, message: str, code: Optional[str] = None):
        self.message = message
        self.code = code or "PAYMENT_ERROR"
        super().__init__(self.message)


class PaymentTimeoutError(PaymentError):
    """Exception for payment timeout."""
    
    def __init__(self, message: str = "Payment request timed out"):
        super().__init__(message, "PAYMENT_TIMEOUT")


class Payment3DSFailedError(PaymentError):
    """Exception for 3DS authentication failure."""
    
    def __init__(self, message: str = "3D Secure authentication failed"):
        super().__init__(message, "PAYMENT_3DS_FAILED")
