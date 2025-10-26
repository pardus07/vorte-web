# apps/backend/app/services/notification_service.py
"""
Notification Service with SendGrid → SES Fallback.

Primary: SendGrid (EU endpoint)
Fallback: AWS SES v2 (eu-central-1)

Fallback triggers:
- 429 (rate limit)
- 5xx (server error)
- Timeout/network errors
- Circuit breaker open

No fallback for:
- 4xx (client errors - validation, auth, etc.)

Refs:
- https://datatracker.ietf.org/doc/html/rfc6585#section-4 (429 Too Many Requests)
- https://docs.sendgrid.com/api-reference/mail-send/mail-send
- https://docs.aws.amazon.com/ses/latest/dg/send-email-api-v2.html
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional
from dataclasses import dataclass

from app.services.adapters.sendgrid_adapter import SendGridAdapter
from app.services.adapters.ses_adapter import SESAdapter
from app.services.sms_service import SmsService, SmsMessage


logger = logging.getLogger(__name__)


# HTTP status codes that should trigger fallback
RETRYABLE_HTTP_CODES = {408, 429, 500, 502, 503, 504}


@dataclass
class EmailMessage:
    """
    Email message data structure.
    
    Attributes:
        to: Recipient email address
        subject: Email subject
        html: HTML email body (optional)
        text: Plain text email body (optional)
        category: Email category for tracking (e.g., "order_confirmation")
        custom_args: Custom arguments for tracking (e.g., {"order_id": "123"})
        reply_to: Reply-to email address (optional)
        asm_group_id: SendGrid unsubscribe group ID (optional)
        tags: SES message tags (optional)
        template: Internal template name for metrics (optional)
    """
    to: str
    subject: str
    html: Optional[str] = None
    text: Optional[str] = None
    category: Optional[str] = None
    custom_args: Optional[Dict[str, Any]] = None
    reply_to: Optional[str] = None
    asm_group_id: Optional[int] = None
    tags: Optional[Dict[str, str]] = None
    template: Optional[str] = None


class NotificationService:
    """
    Email notification service with fallback support.
    
    Primary: SendGrid (EU)
    Fallback: AWS SES v2 (EU)
    
    Fallback is triggered only for retryable errors:
    - 429 (rate limit)
    - 5xx (server errors)
    - Timeout/network errors
    - Circuit breaker open
    
    No fallback for 4xx client errors (validation, auth, etc.)
    """

    def __init__(
        self,
        sendgrid: SendGridAdapter,
        ses: SESAdapter,
        sms_service: Optional[SmsService] = None,
        fallback_enabled: bool = True,
        primary: str = "sendgrid",
    ) -> None:
        """
        Initialize notification service.
        
        Args:
            sendgrid: SendGrid adapter instance
            ses: SES adapter instance
            sms_service: SMS service instance (optional)
            fallback_enabled: Enable fallback to secondary provider
            primary: Primary provider ("sendgrid" or "ses")
        """
        self.sendgrid = sendgrid
        self.ses = ses
        self.sms_service = sms_service
        self.fallback_enabled = fallback_enabled
        self.primary = primary
        
        logger.info(
            f"NotificationService initialized (email primary: {primary}, "
            f"sms: {'enabled' if sms_service else 'disabled'}, fallback: {fallback_enabled})"
        )

    async def send_email(self, msg: EmailMessage) -> Dict[str, Any]:
        """
        Send email with fallback support.
        
        Args:
            msg: Email message to send
        
        Returns:
            Response dict with provider and result
        
        Raises:
            Exception: If all providers fail or non-retryable error occurs
        """
        start_time = time.perf_counter()
        
        # Determine provider order
        if self.primary == "sendgrid":
            providers = [(self.sendgrid, "sendgrid"), (self.ses, "ses")]
        else:
            providers = [(self.ses, "ses"), (self.sendgrid, "sendgrid")]
        
        last_error: Optional[Exception] = None
        
        for idx, (provider, provider_name) in enumerate(providers):
            is_primary = (idx == 0)
            
            try:
                result = await self._send_via_provider(provider, provider_name, msg)
                
                # Success - record metrics
                self._observe_success(provider_name, msg.template, start_time)
                
                logger.info(
                    f"Email sent successfully via {provider_name}",
                    extra={
                        "provider": provider_name,
                        "to": provider.mask_email(msg.to),
                        "template": msg.template,
                        "is_fallback": not is_primary,
                    }
                )
                
                return {
                    "provider": provider_name,
                    "result": result,
                    "is_fallback": not is_primary,
                }
            
            except Exception as exc:
                retryable = self._is_retryable(exc)
                
                # Record failure metrics
                self._observe_failure(provider_name, msg.template, start_time, retryable)
                
                logger.warning(
                    f"Email send failed via {provider_name}",
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
                    self._record_fallback(reason)
                    
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
                "All email providers failed",
                extra={"last_error": str(last_error)}
            )
            raise last_error
        
        raise RuntimeError("Email send failed for unknown reason")

    async def _send_via_provider(
        self,
        provider: Any,
        provider_name: str,
        msg: EmailMessage,
    ) -> Dict[str, Any]:
        """
        Send email via specific provider.
        
        Args:
            provider: Provider adapter instance
            provider_name: Provider name for logging
            msg: Email message
        
        Returns:
            Provider response
        """
        if provider_name == "sendgrid":
            return await provider.send_email(
                to_email=msg.to,
                subject=msg.subject,
                html_content=msg.html,
                plain_text_content=msg.text,
                category=msg.category,
                custom_args=msg.custom_args or {},
                reply_to=msg.reply_to,
                asm_group_id=msg.asm_group_id,
            )
        else:  # SES
            return await provider.send_email(
                to_email=msg.to,
                subject=msg.subject,
                html_content=msg.html,
                plain_text_content=msg.text,
                category=msg.category,
                custom_args=msg.custom_args or {},
                reply_to=msg.reply_to,
            )

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
        
        return "unknown"

    def _observe_success(
        self,
        provider: str,
        template: Optional[str],
        start_time: float,
    ) -> None:
        """Record success metrics."""
        # These would integrate with your Prometheus metrics
        # For now, just log
        duration = time.perf_counter() - start_time
        logger.debug(
            f"Email send success metrics",
            extra={
                "provider": provider,
                "template": template,
                "duration_seconds": duration,
            }
        )

    def _observe_failure(
        self,
        provider: str,
        template: Optional[str],
        start_time: float,
        retryable: bool,
    ) -> None:
        """Record failure metrics."""
        duration = time.perf_counter() - start_time
        logger.debug(
            f"Email send failure metrics",
            extra={
                "provider": provider,
                "template": template,
                "duration_seconds": duration,
                "retryable": retryable,
            }
        )

    def _record_fallback(self, reason: str) -> None:
        """Record fallback metrics."""
        logger.debug(
            f"Email fallback triggered",
            extra={"reason": reason}
        )

    async def send_templated_email(
        self,
        *,
        template: str,
        locale: str,
        to: str,
        subject: Optional[str] = None,
        context: Dict[str, Any],
        category: str = "transactional",
        custom_args: Optional[Dict[str, Any]] = None,
        reply_to: Optional[str] = None,
        asm_group_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Send templated email with Jinja2 rendering and CSS inlining.
        
        Args:
            template: Template name (e.g., "order_confirmation")
            locale: Language code ("tr" or "en")
            to: Recipient email address
            subject: Email subject (optional, can be set in template)
            context: Template context variables
            category: Email category for tracking (default: "transactional")
            custom_args: Custom arguments for tracking
            reply_to: Reply-to email address
            asm_group_id: SendGrid unsubscribe group ID (marketing only)
        
        Returns:
            Response dict with provider and result
        
        Example:
            >>> await service.send_templated_email(
            ...     template="order_confirmation",
            ...     locale="tr",
            ...     to="customer@example.com",
            ...     context={
            ...         "order": {...},
            ...         "customer": {...},
            ...         "brand_name": "MyStore",
            ...         "current_year": "2025",
            ...     },
            ...     category="order",
            ...     custom_args={"order_id": "123"},
            ... )
        """
        # Import here to avoid circular dependency
        from app.notifications.renderer import render_email
        
        # Render template to HTML + text
        payload = render_email(template, locale, context)
        
        # Use subject from parameter, template, or context
        subject_final = subject or payload.get("subject") or context.get("subject") or "[Notification]"
        
        # Create email message
        msg = EmailMessage(
            to=to,
            subject=subject_final,
            html=payload["html"],
            text=payload["text"],
            category=category,
            custom_args=custom_args,
            reply_to=reply_to,
            asm_group_id=asm_group_id,
            template=template,
        )
        
        # Send via primary provider with fallback
        return await self.send_email(msg)

    # ============================================================================
    # SMS Methods
    # ============================================================================
    
    async def send_sms_notification(
        self,
        *,
        to: list[str],
        text: str,
        is_commercial: Optional[bool] = None,
        iys_recipient_type: Optional[str] = None,
        schedule_at: Optional[str] = None,
        custom_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send SMS notification.
        
        Args:
            to: Recipient phone numbers
            text: SMS text
            is_commercial: Commercial SMS flag (İYS compliance)
            iys_recipient_type: İYS recipient type ("BIREYSEL" or "TACIR")
            schedule_at: Schedule time (optional)
            custom_id: Custom tracking ID (optional)
        
        Returns:
            Response dict with provider and result
        
        Raises:
            RuntimeError: If SMS service not configured
            Exception: If SMS send fails
        
        Example:
            >>> await service.send_sms_notification(
            ...     to=["05321234567"],
            ...     text="Siparişiniz kargoya verildi.",
            ...     is_commercial=False,
            ... )
        """
        if not self.sms_service:
            raise RuntimeError("SMS service is not configured")
        
        start_time = time.perf_counter()
        
        try:
            msg = SmsMessage(
                to=to,
                text=text,
                is_commercial=is_commercial,
                iys_recipient_type=iys_recipient_type,
                schedule_at=schedule_at,
                custom_id=custom_id,
            )
            
            result = await self.sms_service.send_sms(msg)
            
            latency = time.perf_counter() - start_time
            
            logger.info(
                f"SMS sent successfully",
                extra={
                    "provider": result.get("provider"),
                    "recipients": len(to),
                    "is_fallback": result.get("is_fallback", False),
                    "latency_ms": int(latency * 1000),
                }
            )
            
            return result
        
        except Exception as exc:
            latency = time.perf_counter() - start_time
            
            logger.error(
                f"SMS send failed",
                extra={
                    "error": str(exc),
                    "recipients": len(to),
                    "latency_ms": int(latency * 1000),
                },
                exc_info=True,
            )
            
            raise
    
    async def send_sms_templated(
        self,
        *,
        template: str,
        locale: str,
        to: list[str],
        context: Dict[str, Any],
        is_commercial: Optional[bool] = None,
        iys_recipient_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send templated SMS notification.
        
        Uses Jinja2 templates from templates/{locale}/sms/{template}.txt
        Falls back to context["message"] or context["text"] if template not found.
        
        Args:
            template: Template name (e.g., "payment_authorized")
            locale: Language code ("tr" or "en")
            to: Recipient phone numbers
            context: Template context variables
            is_commercial: Commercial SMS flag (İYS compliance)
            iys_recipient_type: İYS recipient type ("BIREYSEL" or "TACIR")
        
        Returns:
            Response dict with provider and result
        
        Raises:
            ValueError: If SMS text cannot be resolved
        
        Example:
            >>> await service.send_sms_templated(
            ...     template="payment_authorized",
            ...     locale="tr",
            ...     to=["05321234567"],
            ...     context={
            ...         "order_id": "ORD-12345",
            ...         "amount": "250,00 TL",
            ...         "brand_name": "Vorte",
            ...     },
            ...     is_commercial=False,
            ... )
        """
        # Try to render from template
        text = None
        
        try:
            from app.notifications.sms_renderer import render_sms
            text = render_sms(template, locale, context)
        except Exception as exc:
            logger.warning(
                f"Failed to render SMS template, falling back to context",
                extra={
                    "template": template,
                    "locale": locale,
                    "error": str(exc),
                }
            )
            # Fallback to context
            text = context.get("message") or context.get("text")
        
        if not text:
            raise ValueError(
                f"SMS text could not be resolved for template '{template}'. "
                "Please provide template file or 'message'/'text' in context."
            )
        
        logger.debug(
            f"Sending templated SMS",
            extra={
                "template": template,
                "locale": locale,
                "recipients": len(to),
                "text_length": len(text),
            }
        )
        
        return await self.send_sms_notification(
            to=to,
            text=text,
            is_commercial=is_commercial,
            iys_recipient_type=iys_recipient_type,
            custom_id=f"{template}_{locale}",
        )
