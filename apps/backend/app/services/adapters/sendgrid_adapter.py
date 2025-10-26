# apps/backend/app/services/adapters/sendgrid_adapter.py
"""
SendGrid Email Adapter with EU Region Support.

Implements SendGrid v3 Mail Send API with:
- EU endpoint (api.eu.sendgrid.com) for GDPR compliance
- Exponential backoff retry for rate limits (429) and server errors (5xx)
- Prometheus metrics for observability
- HTML and plain text template support

Refs:
- https://docs.sendgrid.com/api-reference/mail-send/mail-send
- https://docs.sendgrid.com/ui/sending-email/getting-started-with-the-sendgrid-api
- https://support.sendgrid.com/hc/en-us/articles/4412902219803-EU-Region-Support
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, UTC

import httpx

from app.services.metrics import PROVIDER_LATENCY_SECONDS


logger = logging.getLogger(__name__)


class SendGridAdapter:
    """
    SendGrid email adapter with EU region support.
    
    Features:
    - EU endpoint for GDPR compliance
    - Exponential backoff retry (429, 5xx)
    - Prometheus metrics
    - HTML + plain text support
    - Template variable substitution
    - Category and custom args support
    
    Rate Limits (SendGrid):
    - Free: 100 emails/day
    - Essentials: 40,000-100,000 emails/month
    - Pro: 1.5M+ emails/month
    
    Ref: https://sendgrid.com/pricing/
    """

    def __init__(
        self,
        api_key: str,
        use_eu_region: bool = True,
        from_email: str = "noreply@vorte.com.tr",
        from_name: str = "VORTE",
        max_retries: int = 3,
        timeout: float = 30.0,
    ) -> None:
        """
        Initialize SendGrid adapter.
        
        Args:
            api_key: SendGrid API key (starts with SG.)
            use_eu_region: Use EU endpoint (api.eu.sendgrid.com) for GDPR
            from_email: Default sender email
            from_name: Default sender name
            max_retries: Maximum retry attempts for 429/5xx
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.from_email = from_email
        self.from_name = from_name
        self.max_retries = max_retries
        self.timeout = timeout
        
        # Use EU endpoint for GDPR compliance
        if use_eu_region:
            self.base_url = "https://api.eu.sendgrid.com"
        else:
            self.base_url = "https://api.sendgrid.com"
        
        logger.info(f"SendGrid adapter initialized (region: {'EU' if use_eu_region else 'US'})")

    async def send_email(
        self,
        *,
        to_email: str,
        to_name: Optional[str] = None,
        subject: str,
        html_content: str,
        plain_text_content: Optional[str] = None,
        category: Optional[str] = None,
        custom_args: Optional[Dict[str, str]] = None,
        reply_to: Optional[str] = None,
        asm_group_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Send email via SendGrid v3 API.
        
        Args:
            to_email: Recipient email address
            to_name: Recipient name (optional)
            subject: Email subject
            html_content: HTML email body
            plain_text_content: Plain text email body (optional, fallback)
            category: Email category for tracking (e.g., "payment_notification")
            custom_args: Custom arguments for tracking (e.g., {"order_id": "123"})
            reply_to: Reply-to email address
            asm_group_id: Unsubscribe group ID (for marketing emails)
        
        Returns:
            Response dict with status and message_id
        
        Raises:
            httpx.HTTPError: If request fails after retries
            ValueError: If response is invalid
        
        Ref: https://docs.sendgrid.com/api-reference/mail-send/mail-send
        """
        # Build request payload
        payload = {
            "personalizations": [
                {
                    "to": [{"email": to_email, "name": to_name or to_email}],
                    "subject": subject,
                }
            ],
            "from": {
                "email": self.from_email,
                "name": self.from_name,
            },
            "content": [
                {"type": "text/html", "value": html_content},
            ],
        }
        
        # Add plain text fallback
        if plain_text_content:
            payload["content"].insert(0, {
                "type": "text/plain",
                "value": plain_text_content,
            })
        
        # Add reply-to
        if reply_to:
            payload["reply_to"] = {"email": reply_to}
        
        # Add category for tracking
        if category:
            payload["categories"] = [category]
        
        # Add custom args for tracking
        if custom_args:
            payload["custom_args"] = custom_args
        
        # Add unsubscribe group (for marketing emails)
        if asm_group_id:
            payload["asm"] = {"group_id": asm_group_id}
        
        # Send with retry logic
        return await self._send_with_retry(payload)

    async def _send_with_retry(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send email with exponential backoff retry.
        
        Retry logic:
        - 429 (rate limit): Retry with exponential backoff
        - 5xx (server error): Retry with exponential backoff
        - 4xx (client error): No retry, raise immediately
        
        Backoff: 1s, 2s, 4s (max 3 attempts)
        
        Ref: https://docs.sendgrid.com/api-reference/how-to-use-the-sendgrid-v3-api/rate-limits
        """
        url = f"{self.base_url}/v3/mail/send"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                with PROVIDER_LATENCY_SECONDS.labels(provider="sendgrid", method="send_email").time():
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        response = await client.post(url, json=payload, headers=headers)
                
                # Success (202 Accepted)
                if response.status_code == 202:
                    # Extract message ID from headers
                    message_id = response.headers.get("X-Message-Id", "unknown")
                    
                    logger.info(
                        f"Email sent successfully via SendGrid",
                        extra={
                            "to": payload["personalizations"][0]["to"][0]["email"],
                            "subject": payload["personalizations"][0]["subject"],
                            "message_id": message_id,
                            "attempt": attempt + 1,
                        }
                    )
                    
                    return {
                        "status": "sent",
                        "provider": "sendgrid",
                        "message_id": message_id,
                        "timestamp": datetime.now(UTC).isoformat(),
                    }
                
                # Rate limit (429) - retry with backoff
                elif response.status_code == 429:
                    backoff_seconds = 2 ** attempt  # 1s, 2s, 4s
                    
                    logger.warning(
                        f"SendGrid rate limit hit (429), retrying in {backoff_seconds}s",
                        extra={
                            "attempt": attempt + 1,
                            "max_retries": self.max_retries,
                            "backoff_seconds": backoff_seconds,
                        }
                    )
                    
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(backoff_seconds)
                        continue
                    else:
                        last_error = httpx.HTTPStatusError(
                            f"Rate limit exceeded after {self.max_retries} attempts",
                            request=response.request,
                            response=response,
                        )
                
                # Server error (5xx) - retry with backoff
                elif 500 <= response.status_code < 600:
                    backoff_seconds = 2 ** attempt
                    
                    logger.warning(
                        f"SendGrid server error ({response.status_code}), retrying in {backoff_seconds}s",
                        extra={
                            "status_code": response.status_code,
                            "attempt": attempt + 1,
                            "response_body": response.text[:200],
                        }
                    )
                    
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(backoff_seconds)
                        continue
                    else:
                        last_error = httpx.HTTPStatusError(
                            f"Server error after {self.max_retries} attempts",
                            request=response.request,
                            response=response,
                        )
                
                # Client error (4xx) - no retry
                else:
                    error_body = response.text
                    logger.error(
                        f"SendGrid client error ({response.status_code})",
                        extra={
                            "status_code": response.status_code,
                            "response_body": error_body[:500],
                        }
                    )
                    
                    response.raise_for_status()
            
            except httpx.TimeoutException as e:
                logger.warning(
                    f"SendGrid request timeout, attempt {attempt + 1}/{self.max_retries}",
                    extra={"error": str(e)}
                )
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                else:
                    last_error = e
            
            except httpx.HTTPError as e:
                logger.error(
                    f"SendGrid HTTP error: {e}",
                    extra={"attempt": attempt + 1}
                )
                last_error = e
                break
        
        # All retries exhausted
        if last_error:
            raise last_error
        
        raise ValueError("Email send failed for unknown reason")

    def mask_email(self, email: str) -> str:
        """
        Mask email for logging (PII protection).
        
        Example: test@example.com -> te**@ex**.com
        """
        if "@" not in email:
            return "***"
        
        local, domain = email.split("@", 1)
        
        # Mask local part
        if len(local) == 1:
            masked_local = "*"
        elif len(local) == 2:
            masked_local = "**"
        else:
            masked_local = local[:2] + "**"
        
        # Mask domain
        if "." in domain:
            domain_parts = domain.split(".")
            masked_domain = domain_parts[0][:2] + "**" + "." + domain_parts[-1]
        else:
            masked_domain = domain[:2] + "**"
        
        return f"{masked_local}@{masked_domain}"
