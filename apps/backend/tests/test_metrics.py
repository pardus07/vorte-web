# apps/backend/tests/test_metrics.py
"""
Tests for Prometheus metrics integration.

Validates:
- Payment initialization metrics (success/failure)
- Webhook processing metrics (ok/dup/error)
- Provider API latency tracking
"""
import pytest

from app.services.metrics import (
    incr,
    PAYMENT_INIT_TOTAL,
    PAYMENT_WEBHOOK_TOTAL,
    PROVIDER_LATENCY_SECONDS,
    PROMETHEUS_AVAILABLE,
)


def test_incr_payment_init_ok():
    """Test PAYMENT_INIT_OK metric can be called without errors."""
    # Should not raise exception
    incr("PAYMENT_INIT_OK", provider="iyzico")


def test_incr_payment_init_fail():
    """Test PAYMENT_INIT_FAIL metric can be called without errors."""
    # Should not raise exception
    incr("PAYMENT_INIT_FAIL", provider="iyzico")


def test_incr_webhook_ok():
    """Test WEBHOOK_OK metric can be called without errors."""
    # Should not raise exception
    incr("WEBHOOK_OK", provider="iyzico")


def test_incr_webhook_dup():
    """Test WEBHOOK_DUP metric can be called without errors."""
    # Should not raise exception
    incr("WEBHOOK_DUP", provider="iyzico")


def test_incr_webhook_error():
    """Test WEBHOOK_ERROR metric can be called without errors."""
    # Should not raise exception
    incr("WEBHOOK_ERROR", provider="iyzico")


def test_incr_webhook_transition_fail():
    """Test WEBHOOK_TRANSITION_FAIL metric can be called without errors."""
    # Should not raise exception
    incr("WEBHOOK_TRANSITION_FAIL", provider="iyzico")


def test_incr_webhook_payment_not_found():
    """Test WEBHOOK_PAY_NOT_FOUND metric can be called without errors."""
    # Should not raise exception
    incr("WEBHOOK_PAY_NOT_FOUND", provider="iyzico")


def test_incr_circuit_open():
    """Test provider_circuit_open_total metric can be called without errors."""
    # Should not raise exception
    incr("provider_circuit_open_total", provider="iyzico")


def test_incr_unknown_metric():
    """Test unknown metric name is silently ignored."""
    # Should not raise exception
    incr("UNKNOWN_METRIC", provider="iyzico")


def test_provider_latency_histogram():
    """Test provider latency histogram can be used."""
    # Should not raise exception
    histogram = PROVIDER_LATENCY_SECONDS.labels(provider="iyzico", method="initialize_3ds")
    
    # Test context manager
    with histogram.time():
        pass


def test_metrics_available():
    """Test that metrics module loads correctly."""
    assert PAYMENT_INIT_TOTAL is not None
    assert PAYMENT_WEBHOOK_TOTAL is not None
    assert PROVIDER_LATENCY_SECONDS is not None
