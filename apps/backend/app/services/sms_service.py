# apps/backend/app/services/sms_service.py
"""
SMS Service with Netgsm → Verimor fallback.

Primary: Netgsm
Fallback: Verimor

Fallback triggers:
- 429 (rate limit)
- 5xx (server error)
- Timeout/network errors
- Circuit breaker open

No fallback for:
- 4xx (client errors - validation, auth, etc.)

Refs:
- https://www.netgsm.com.tr/dokuman/
- https://developer.verimor.com.tr/
"""
from __future__ import annotations

import logging
import time
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from app.services.adapters.netgsm_adapter import NetgsmAdapter
from app.services.adapters.verimor_adapter import VerimorAdapter


logger = logging.getLogger(__name__)


# HTTP status codes that should trigger fallback
RETRYABLE_HTTP_CODES = {408, 429, 500, 502, 503, 504}


@dataclass
class SmsMessage:
    """
    SMS message data structure.
    
    Attributes:
        to: Recipient phone numbers
        text: SMS text
        schedule_at: Schedule time (optional)
        custom_id: Custom tracking ID (optional)
        is_commercial: Commercial SMS flag (İYS, optional)
        iys_recipient_type: İYS recipient type (optional)
    """
    to: List[str]
    text: str
    schedule_at: Optional[str] = None
    custom_id: Optional[str] = None
    is_commercial: Optional[bool] = None
    iys_recipient_type: Optional[str] = None


class SmsService:
    """
    SMS service with fallback support.
    
    Primary: Netgsm
    Fallback: Verimor
    
    Fallback is triggered only for retryable errors:
    - 429 (rate limit)
    - 5xx (server errors)
    - Timeout/network errors
    - Circuit breaker open
    
    No fallback for 4xx client errors (validation, auth, etc.)
    """
    
    def __init__(
        self,
        netgsm: NetgsmAdapter,
        verimor: VerimorAdapter,
        fallback_enabled: bool = True,
        primary: str = "netgsm",
    ) -> None:
        """
        Initialize SMS service.
        
        Args:
            netgsm: Netgsm adapter instance
            verimor: Verimor adapter instance
            fallback_enabled: Enable fallback to secondary provider
            primary: Primary provider ("netgsm" or "verimor")
        """
        self.netgsm = netgsm
        self.verimor = verimor
        self.fallback_enabled = fallback_enabled
        self.primary = primary
        
        logger.info(
            f"SmsService initialized (primary: {primary}, fallback: {fallback_enabled})"
        )
    
    async def send_sms(self, msg: SmsMessage) -> Dict[str, Any]:
        """
        Send SMS with fallback support.
        
        Args:
            msg: SMS message to send
        
        Returns:
            Response dict with provider and result
        
        Raises:
            Exception: If all providers fail or non-retryable error occurs
        """
        start_time = time.perf_counter()
        
        # Determine provider order
        if self.primary == "netgsm":
            providers = [
                (self.netgsm, "netgsm"),
                (self.verimor, "verimor"),
            ]
        else:
            providers = [
                (self.verimor, "verimor"),
                (self.netgsm, "netgsm"),
            ]
        
        last_error: Optional[Exception] = None
        
        for idx, (provider, provider_name) in enumerate(providers):
            is_primary = (idx == 0)
            
            try:
                result = await self._send_via_provider(provider, provider_name, msg)
                
                latency = time.perf_counter() - start_time
                
                logger.info(
                    f"SMS sent successfully via {provider_name}",
                    extra={
                        "provider": provider_name,
                        "recipients": len(msg.to),
                        "is_fallback": not is_primary,
                        "latency_ms": int(latency * 1000),
                    }
                )
                
                return {
                    "provider": provider_name,
                    "result": result,
                    "is_fallback": not is_primary,
                    "latency_ms": int(latency * 1000),
                }
            
            except Exception as exc:
                retryable = self._is_retryable(exc)
                
                logger.warning(
                    f"SMS send failed via {provider_name}",
                    extra={
                        "provider": provider_name,
                        "error": str(exc),
                        "retryable": retryable,
                        "is_primary": is_primary,
                    }
                )
                
                # If primary failed with retryable error and fallback enabled, try secondary
                if is_primary and self.fallback_enabled and retryable:
                    reason = self._get_failure_reason(exc)
                    
                    logger.info(
                        f"Triggering fallback to secondary provider",
                        extra={"reason": reason}
                    )
                    
                    last_error = exc
                    continue  # Try next provider
                
                # Non-retryable error or fallback disabled - raise immediately
                raise
        
        # All providers failed
        if last_error:
            logger.error(
                "All SMS providers failed",
                extra={"last_error": str(last_error)}
            )
            raise last_error
        
        raise RuntimeError("SMS send failed for unknown reason")
    
    async def _send_via_provider(
        self,
        provider: Any,
        provider_name: str,
        msg: SmsMessage,
    ) -> Dict[str, Any]:
        """
        Send SMS via specific provider.
        
        Args:
            provider: Provider adapter instance
            provider_name: Provider name for logging
            msg: SMS message
        
        Returns:
            Provider response
        """
        if provider_name == "netgsm":
            return await provider.send_sms(
                to=msg.to,
                message=msg.text,
                schedule_at=msg.schedule_at,
                custom_id=msg.custom_id,
            )
        else:  # Verimor
            # Convert to Verimor message format
            messages = [
                {"dest": phone, "text": msg.text}
                for phone in msg.to
            ]
            
            campaign_id = await provider.send_sms(
                messages=messages,
                is_commercial=msg.is_commercial,
                iys_recipient_type=msg.iys_recipient_type,
                send_at=msg.schedule_at,
                custom_id=msg.custom_id,
            )
            
            return {
                "ok": True,
                "provider": "verimor",
                "campaign_id": campaign_id,
                "recipients": len(messages),
            }
    
    def _is_retryable(self, exc: Exception) -> bool:
        """
        Check if error is retryable (should trigger fallback).
        
        Retryable errors:
        - 429 (rate limit)
        - 5xx (server errors)
        - Timeout/network errors
        - Circuit breaker open
        
        Args:
            exc: Exception to check
        
        Returns:
            True if retryable, False otherwise
        """
        # Check HTTP status code
        status_code = getattr(exc, "status_code", None)
        if isinstance(status_code, int) and status_code in RETRYABLE_HTTP_CODES:
            return True
        
        # Check error message for common retryable patterns
        error_text = str(exc).lower()
        
        # Circuit breaker
        if "circuit" in error_text:
            return True
        
        # Timeout
        if "timeout" in error_text or "timed out" in error_text:
            return True
        
        # Network errors
        if "connection" in error_text or "network" in error_text:
            return True
        
        # Netgsm insufficient credits (should try fallback)
        if "50" in error_text or "insufficient" in error_text:
            return True
        
        return False
    
    def _get_failure_reason(self, exc: Exception) -> str:
        """
        Get failure reason for metrics.
        
        Args:
            exc: Exception
        
        Returns:
            Failure reason string
        """
        status_code = getattr(exc, "status_code", None)
        if status_code in RETRYABLE_HTTP_CODES:
            return f"http_{status_code}"
        
        error_text = str(exc).lower()
        
        if "circuit" in error_text:
            return "circuit_open"
        if "timeout" in error_text or "timed out" in error_text:
            return "timeout"
        if "connection" in error_text or "network" in error_text:
            return "network"
        if "50" in error_text or "insufficient" in error_text:
            return "insufficient_credits"
        
        return "unknown"
