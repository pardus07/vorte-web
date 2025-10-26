# apps/backend/tests/helpers/notification_fixtures.py
"""
Shared fixtures and utilities for notification tests.

Provides:
- MongoDB fixtures with replica set support
- Mock notification service fixtures
- Sample notification data builders
- HTTP mock helpers (respx)
"""
import pytest
from datetime import datetime, timezone
from bson import ObjectId
from unittest.mock import AsyncMock
from motor.motor_asyncio import AsyncIOMotorClient


# ============================================================================
# MongoDB Fixtures
# ============================================================================

@pytest.fixture(scope="session")
def mongo_uri():
    """MongoDB connection URI for tests."""
    # Use test database
    return "mongodb://localhost:27017/test_notifications"


@pytest.fixture(scope="session")
async def mongo_client(mongo_uri):
    """
    MongoDB client for tests.
    
    Note: For transaction tests, MongoDB must be running as replica set.
    Use docker-compose with replica set configuration.
    """
    client = AsyncIOMotorClient(mongo_uri)
    
    yield client
    
    # Cleanup
    client.close()


@pytest.fixture
async def clean_mongo(mongo_client):
    """Clean MongoDB collections before and after test."""
    # Clean before
    await mongo_client.test_notifications.notifications_outbox.delete_many({})
    await mongo_client.test_payments.payments.delete_many({})
    
    yield
    
    # Clean after
    await mongo_client.test_notifications.notifications_outbox.delete_many({})
    await mongo_client.test_payments.payments.delete_many({})


# ============================================================================
# Mock Service Fixtures
# ============================================================================

@pytest.fixture
def mock_sendgrid_adapter():
    """Mock SendGridAdapter."""
    adapter = AsyncMock()
    adapter.send_email = AsyncMock(return_value={"message_id": "test_msg_id"})
    adapter.mask_email = lambda email: email.replace("@", "@***")
    return adapter


@pytest.fixture
def mock_ses_adapter():
    """Mock SESAdapter."""
    adapter = AsyncMock()
    adapter.send_email = AsyncMock(return_value={"MessageId": "test_msg_id"})
    return adapter


@pytest.fixture
def mock_netgsm_adapter():
    """Mock NetgsmAdapter."""
    adapter = AsyncMock()
    adapter.send_sms = AsyncMock(return_value={"bulkid": "test_bulk_id", "status": "00"})
    return adapter


@pytest.fixture
def mock_verimor_adapter():
    """Mock VerimorAdapter."""
    adapter = AsyncMock()
    adapter.send_sms = AsyncMock(return_value={"message_id": "test_msg_id"})
    return adapter


@pytest.fixture
def mock_notification_service(mock_sendgrid_adapter, mock_ses_adapter):
    """Mock NotificationService with email adapters."""
    from app.services.notification_service import NotificationService
    
    service = NotificationService(
        sendgrid=mock_sendgrid_adapter,
        ses=mock_ses_adapter,
        sms_service=None,
        primary="sendgrid",
    )
    
    return service


# ============================================================================
# Sample Data Builders
# ============================================================================

def build_notification_doc(
    event_type="payment_success",
    payment_id="pay_123",
    order_id="ord_123",
    provider="iyzico",
    locale="tr",
    channels=None,
    payload=None,
    status="ENQUEUED",
    attempts=0,
    idempotency_key=None,
):
    """
    Build notification document for tests.
    
    Args:
        event_type: Event type (default: "payment_success")
        payment_id: Payment ID
        order_id: Order ID
        provider: Payment provider
        locale: Language code
        channels: Notification channels (default: ["email"])
        payload: Notification payload (default: minimal payload)
        status: Notification status (default: "ENQUEUED")
        attempts: Retry attempts (default: 0)
        idempotency_key: Idempotency key (default: generated)
    
    Returns:
        Notification document dict
    """
    if channels is None:
        channels = ["email"]
    
    if payload is None:
        payload = {
            "orderId": order_id,
            "amount": 10000,
            "currency": "TRY",
        }
    
    if idempotency_key is None:
        idempotency_key = f"{order_id}|{event_type}"
    
    now = datetime.now(timezone.utc)
    
    return {
        "_id": ObjectId(),
        "eventType": event_type,
        "paymentId": payment_id,
        "orderId": order_id,
        "provider": provider,
        "locale": locale,
        "channels": channels,
        "payload": payload,
        "status": status,
        "attempts": attempts,
        "nextAttemptAt": now,
        "lastError": None,
        "errors": [],
        "createdAt": now,
        "updatedAt": now,
        "sentAt": None,
        "idempotencyKey": idempotency_key,
    }


def build_payment_doc(
    payment_id=None,
    order_id="ord_123",
    provider="iyzico",
    status="INITIATED",
    amount=10000,
    currency="TRY",
):
    """
    Build payment document for tests.
    
    Args:
        payment_id: Payment ID (default: generated ObjectId)
        order_id: Order ID
        provider: Payment provider
        status: Payment status
        amount: Amount in minor units
        currency: Currency code
    
    Returns:
        Payment document dict
    """
    if payment_id is None:
        payment_id = ObjectId()
    
    now = datetime.now(timezone.utc)
    
    return {
        "_id": payment_id,
        "orderId": order_id,
        "provider": provider,
        "status": status,
        "amount": amount,
        "currency": currency,
        "createdAt": now,
        "updatedAt": now,
    }


# ============================================================================
# HTTP Mock Helpers (respx)
# ============================================================================

def mock_sendgrid_success(respx_mock):
    """
    Mock SendGrid API for successful email send.
    
    Args:
        respx_mock: respx mock instance
    
    Returns:
        respx Route
    """
    import httpx
    return respx_mock.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(202, json={"message": "success"})
    )


def mock_sendgrid_failure(respx_mock, status_code=500):
    """
    Mock SendGrid API for failed email send.
    
    Args:
        respx_mock: respx mock instance
        status_code: HTTP status code (default: 500)
    
    Returns:
        respx Route
    """
    import httpx
    return respx_mock.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(status_code, json={"error": "Internal server error"})
    )


def mock_sendgrid_rate_limit(respx_mock):
    """
    Mock SendGrid API for rate limit (429).
    
    Args:
        respx_mock: respx mock instance
    
    Returns:
        respx Route
    """
    import httpx
    return respx_mock.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(429, json={"error": "Rate limit exceeded"})
    )


def mock_netgsm_success(respx_mock):
    """
    Mock Netgsm API for successful SMS send.
    
    Args:
        respx_mock: respx mock instance
    
    Returns:
        respx Route
    """
    import httpx
    return respx_mock.post("https://api.netgsm.com.tr/sms/send/otp").mock(
        return_value=httpx.Response(200, text="00 OK")
    )


def mock_netgsm_failure(respx_mock):
    """
    Mock Netgsm API for failed SMS send.
    
    Args:
        respx_mock: respx mock instance
    
    Returns:
        respx Route
    """
    import httpx
    return respx_mock.post("https://api.netgsm.com.tr/sms/send/otp").mock(
        return_value=httpx.Response(200, text="30 Invalid credentials")
    )


# ============================================================================
# Time Control Fixtures
# ============================================================================

@pytest.fixture
def freezer():
    """
    Freeze time for tests using freezegun.
    
    Usage:
        def test_something(freezer):
            freezer.move_to("2025-01-01 12:00:00")
            # Time is now frozen at 2025-01-01 12:00:00
    """
    from freezegun import freeze_time
    
    with freeze_time("2025-01-25 10:00:00") as frozen_time:
        yield frozen_time


# ============================================================================
# Metrics Fixtures
# ============================================================================

@pytest.fixture
def metrics_registry():
    """
    Isolated Prometheus CollectorRegistry for tests.
    
    Prevents metric name conflicts between tests.
    """
    from prometheus_client import CollectorRegistry
    
    registry = CollectorRegistry()
    yield registry


@pytest.fixture
def mock_metrics():
    """Mock Prometheus metrics functions."""
    from unittest.mock import MagicMock
    
    return {
        "incr": MagicMock(),
        "histogram": MagicMock(),
        "gauge": MagicMock(),
    }
