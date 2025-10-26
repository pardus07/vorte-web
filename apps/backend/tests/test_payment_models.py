"""
Unit tests for payment models

Tests Pydantic v2 validation, ObjectId serialization, and enum values.
"""
import pytest
from bson import ObjectId
from datetime import datetime

from app.models.payment import (
    Payment,
    PaymentEvent,
    PaymentProvider,
    PaymentStatus,
    ThreeDSInfo,
    ThreeDSStatus,
    ProviderRefs,
)


class TestPaymentModels:
    """Test Payment and PaymentEvent models"""

    def test_payment_creation_minimal(self):
        """Test creating payment with minimal required fields"""
        payment = Payment(
            orderId="ord_123",
            provider=PaymentProvider.iyzico,
            amount=10000,  # 100.00 TRY in minor units
        )
        
        assert payment.orderId == "ord_123"
        assert payment.provider == PaymentProvider.iyzico
        assert payment.amount == 10000
        assert payment.currency == "TRY"
        assert payment.status == PaymentStatus.INITIATED
        assert isinstance(payment.id, ObjectId)
        assert isinstance(payment.createdAt, datetime)

    def test_payment_with_3ds_info(self):
        """Test payment with 3DS information"""
        three_ds = ThreeDSInfo(
            version="2.2.0",
            status=ThreeDSStatus.FRICTIONLESS,
            eci="05",
            cavv="AAABCZIhcQAAAABZlyFxAAAAAAA="
        )
        
        payment = Payment(
            orderId="ord_456",
            provider=PaymentProvider.iyzico,
            amount=5000,
            threeDS=three_ds,
        )
        
        assert payment.threeDS.version == "2.2.0"
        assert payment.threeDS.status == ThreeDSStatus.FRICTIONLESS
        assert payment.threeDS.eci == "05"

    def test_payment_with_provider_refs(self):
        """Test payment with provider references"""
        refs = ProviderRefs(
            iyz_paymentId="12345678",
        )
        
        payment = Payment(
            orderId="ord_789",
            provider=PaymentProvider.iyzico,
            amount=15000,
            providerRefs=refs,
        )
        
        assert payment.providerRefs.iyz_paymentId == "12345678"
        assert payment.providerRefs.paytr_merchant_oid is None

    def test_payment_json_serialization(self):
        """Test payment JSON serialization with ObjectId"""
        payment = Payment(
            orderId="ord_abc",
            provider=PaymentProvider.paytr,
            amount=20000,
        )
        
        json_data = payment.model_dump(mode="json", by_alias=True)
        
        # ObjectId should be serialized as string
        assert isinstance(json_data["_id"], str)
        assert len(json_data["_id"]) == 24  # ObjectId string length

    def test_payment_status_enum(self):
        """Test PaymentStatus enum values"""
        assert PaymentStatus.INITIATED == "INITIATED"
        assert PaymentStatus.PENDING_3DS == "PENDING_3DS"
        assert PaymentStatus.AUTHORIZED == "AUTHORIZED"
        assert PaymentStatus.CAPTURED == "CAPTURED"
        assert PaymentStatus.FAILED == "FAILED"

    def test_payment_provider_enum(self):
        """Test PaymentProvider enum values"""
        assert PaymentProvider.iyzico == "iyzico"
        assert PaymentProvider.paytr == "paytr"

    def test_payment_event_creation(self):
        """Test creating payment event"""
        payment_id = ObjectId()
        
        event = PaymentEvent(
            paymentId=payment_id,
            provider=PaymentProvider.iyzico,
            externalEventId="evt_123",
            eventType="webhook",
            status="success",
            raw={"status": "success", "paymentId": "12345"},
        )
        
        assert event.paymentId == payment_id
        assert event.provider == PaymentProvider.iyzico
        assert event.externalEventId == "evt_123"
        assert event.eventType == "webhook"
        assert event.status == "success"
        assert event.raw["status"] == "success"
        assert isinstance(event.processedAt, datetime)

    def test_payment_event_json_serialization(self):
        """Test payment event JSON serialization"""
        payment_id = ObjectId()
        
        event = PaymentEvent(
            paymentId=payment_id,
            provider=PaymentProvider.paytr,
            externalEventId="evt_456",
            eventType="callback",
            status="failed",
        )
        
        json_data = event.model_dump(mode="json", by_alias=True)
        
        # Both ObjectIds should be serialized as strings
        assert isinstance(json_data["_id"], str)
        assert isinstance(json_data["paymentId"], str)
        assert json_data["status"] == "failed"

    def test_payment_amount_validation(self):
        """Test payment amount must be positive"""
        with pytest.raises(ValueError):
            Payment(
                orderId="ord_invalid",
                provider=PaymentProvider.iyzico,
                amount=0,  # Invalid: must be >= 1
            )

    def test_payment_currency_validation(self):
        """Test currency code validation"""
        with pytest.raises(ValueError):
            Payment(
                orderId="ord_invalid",
                provider=PaymentProvider.iyzico,
                amount=1000,
                currency="TR",  # Invalid: must be 3 chars
            )

    def test_three_ds_eci_validation(self):
        """Test 3DS ECI must be 2 characters"""
        with pytest.raises(ValueError):
            ThreeDSInfo(
                version="2.2.0",
                eci="5",  # Invalid: must be 2 chars
            )
