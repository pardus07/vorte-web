"""Mock payment provider for testing."""
import uuid
import asyncio
from decimal import Decimal
from typing import Dict, Any, Optional

from .base import (
    PaymentProvider,
    PaymentInitResponse,
    PaymentConfirmResponse,
    RefundResponse,
    CustomerInfo,
    PaymentStatus,
    PaymentError,
    Payment3DSFailedError
)


class MockPaymentProvider(PaymentProvider):
    """
    Mock payment provider for testing.
    
    Simulates 3DS flow and various payment scenarios.
    """
    
    def __init__(self, simulate_3ds: bool = True, fail_rate: float = 0.0):
        """
        Initialize mock payment provider.
        
        Args:
            simulate_3ds: Whether to simulate 3DS authentication
            fail_rate: Probability of payment failure (0.0 to 1.0)
        """
        self.simulate_3ds = simulate_3ds
        self.fail_rate = fail_rate
        self.transactions: Dict[str, Dict[str, Any]] = {}
    
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
        Initiate mock payment.
        
        Simulates payment initiation with optional 3DS flow.
        """
        # Simulate network delay
        await asyncio.sleep(0.1)
        
        # Generate transaction ID
        transaction_id = f"mock_txn_{uuid.uuid4().hex[:16]}"
        
        # Store transaction
        self.transactions[transaction_id] = {
            "amount": amount,
            "currency": currency,
            "order_id": order_id,
            "customer_email": customer_info.email,
            "status": PaymentStatus.INITIATED,
            "idempotency_key": idempotency_key
        }
        
        if self.simulate_3ds:
            # Simulate 3DS authentication requirement
            redirect_url = f"https://mock-3ds.example.com/auth?txn={transaction_id}"
            
            self.transactions[transaction_id]["status"] = PaymentStatus.REQUIRES_AUTH
            
            return PaymentInitResponse(
                transaction_id=transaction_id,
                status=PaymentStatus.REQUIRES_AUTH,
                redirect_url=redirect_url,
                requires_3ds=True
            )
        else:
            # Direct authorization
            self.transactions[transaction_id]["status"] = PaymentStatus.AUTHORIZED
            
            return PaymentInitResponse(
                transaction_id=transaction_id,
                status=PaymentStatus.AUTHORIZED,
                requires_3ds=False
            )

    
    async def confirm_payment(
        self,
        transaction_id: str
    ) -> PaymentConfirmResponse:
        """
        Confirm mock payment after 3DS.
        
        Simulates payment confirmation with possible failure.
        """
        # Simulate network delay
        await asyncio.sleep(0.1)
        
        if transaction_id not in self.transactions:
            raise PaymentError(f"Transaction {transaction_id} not found", "TRANSACTION_NOT_FOUND")
        
        txn = self.transactions[transaction_id]
        
        # Simulate random failure based on fail_rate
        import random
        if random.random() < self.fail_rate:
            txn["status"] = PaymentStatus.FAILED
            raise Payment3DSFailedError("Mock 3DS authentication failed")
        
        # Success - capture payment
        txn["status"] = PaymentStatus.CAPTURED
        
        return PaymentConfirmResponse(
            transaction_id=transaction_id,
            status=PaymentStatus.CAPTURED,
            amount=txn["amount"],
            currency=txn["currency"]
        )
    
    async def refund_payment(
        self,
        transaction_id: str,
        amount: Decimal,
        reason: str,
        idempotency_key: str
    ) -> RefundResponse:
        """
        Process mock refund.
        """
        # Simulate network delay
        await asyncio.sleep(0.1)
        
        if transaction_id not in self.transactions:
            raise PaymentError(f"Transaction {transaction_id} not found", "TRANSACTION_NOT_FOUND")
        
        txn = self.transactions[transaction_id]
        
        if txn["status"] != PaymentStatus.CAPTURED:
            raise PaymentError("Can only refund captured payments", "INVALID_STATUS")
        
        if amount > txn["amount"]:
            raise PaymentError("Refund amount exceeds payment amount", "INVALID_AMOUNT")
        
        # Generate refund ID
        refund_id = f"mock_refund_{uuid.uuid4().hex[:16]}"
        
        # Update transaction status
        txn["status"] = PaymentStatus.REFUNDED
        txn["refund_id"] = refund_id
        txn["refund_amount"] = amount
        
        return RefundResponse(
            refund_id=refund_id,
            transaction_id=transaction_id,
            amount=amount,
            status="completed"
        )
    
    async def verify_webhook(
        self,
        payload: Dict[str, Any],
        signature: str
    ) -> bool:
        """
        Verify mock webhook.
        
        For mock provider, always returns True.
        """
        # In real implementation, verify HMAC signature
        return True
    
    async def get_transaction_status(
        self,
        transaction_id: str
    ) -> PaymentConfirmResponse:
        """
        Get mock transaction status.
        """
        if transaction_id not in self.transactions:
            raise PaymentError(f"Transaction {transaction_id} not found", "TRANSACTION_NOT_FOUND")
        
        txn = self.transactions[transaction_id]
        
        return PaymentConfirmResponse(
            transaction_id=transaction_id,
            status=txn["status"],
            amount=txn["amount"],
            currency=txn["currency"]
        )


# Singleton instance for testing
mock_payment_provider = MockPaymentProvider(simulate_3ds=True, fail_rate=0.0)
