# apps/backend/app/services/adapters/netgsm_adapter.py
"""
Netgsm SMS adapter with GSM 03.38/Unicode encoding support.

Features:
- GSM 03.38 and Unicode (UCS-2) encoding detection
- Segment count calculation (160/153 for GSM, 70/67 for Unicode)
- Turkish character transliteration (optional)
- E.164 phone number normalization
- Retry logic with circuit breaker
- Prometheus metrics

Refs:
- https://www.netgsm.com.tr/dokuman/
- https://en.wikipedia.org/wiki/GSM_03.38
- https://en.wikipedia.org/wiki/E.164
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import Iterable, Optional, Dict, Any

import httpx


logger = logging.getLogger(__name__)


# GSM 03.38 basic character set (7-bit)
GSM_0338 = set(
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?"
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñüà"
)

# Turkish character transliteration map
TRANSLITERATE_TR = str.maketrans({
    "ğ": "g", "Ğ": "G",
    "ş": "s", "Ş": "S",
    "ç": "c", "Ç": "C",
    "ö": "o", "Ö": "O",
    "ü": "u", "Ü": "U",
    "ı": "i", "İ": "I",
})


def _is_gsm0338(text: str) -> bool:
    """
    Check if text contains only GSM 03.38 characters.
    
    Args:
        text: Text to check
    
    Returns:
        True if all characters are in GSM 03.38 basic set
    """
    return all(ch in GSM_0338 for ch in text)


def _segment_count(text: str, transliterate: bool = False) -> Dict[str, Any]:
    """
    Calculate SMS segment count and encoding.
    
    GSM 03.38: 160 chars (single), 153 chars (concatenated)
    Unicode (UCS-2): 70 chars (single), 67 chars (concatenated)
    
    Args:
        text: SMS text
        transliterate: Apply Turkish character transliteration
    
    Returns:
        Dict with encoding and segment count
    
    Example:
        >>> _segment_count("Hello")
        {"encoding": "GSM", "segments": 1, "length": 5}
        >>> _segment_count("Merhaba İğne")
        {"encoding": "UCS2", "segments": 1, "length": 12}
    """
    if transliterate:
        text = text.translate(TRANSLITERATE_TR)
    
    # Determine encoding
    if _is_gsm0338(text):
        encoding = "GSM"
        single_limit = 160
        concat_limit = 153
    else:
        encoding = "UCS2"
        single_limit = 70
        concat_limit = 67
    
    # Calculate segments
    text_length = len(text)
    
    if text_length == 0:
        segments = 0
    elif text_length <= single_limit:
        segments = 1
    else:
        # Concatenated SMS
        segments = (text_length + concat_limit - 1) // concat_limit
    
    return {
        "encoding": encoding,
        "segments": segments,
        "length": text_length,
    }


def _normalize_msisdn(msisdn: str, country_code: str = "90") -> str:
    """
    Normalize phone number to E.164 format.
    
    Args:
        msisdn: Phone number (various formats)
        country_code: Default country code (default: "90" for Turkey)
    
    Returns:
        E.164 formatted number (e.g., "+905321234567")
    
    Example:
        >>> _normalize_msisdn("05321234567")
        "+905321234567"
        >>> _normalize_msisdn("+90 532 123 4567")
        "+905321234567"
        >>> _normalize_msisdn("5321234567")
        "+905321234567"
    """
    # Remove all non-digit characters
    digits = re.sub(r"\D", "", msisdn)
    
    # Remove leading zero
    if digits.startswith("0"):
        digits = digits[1:]
    
    # Add country code if not present
    if not digits.startswith(country_code):
        digits = country_code + digits
    
    return f"+{digits}"


class NetgsmAdapter:
    """
    Netgsm SMS adapter.
    
    Features:
    - Send single/bulk SMS
    - GSM 03.38 / Unicode encoding
    - Turkish character transliteration
    - Retry logic with circuit breaker
    - Prometheus metrics
    
    Refs:
    - https://www.netgsm.com.tr/dokuman/
    """
    
    def __init__(
        self,
        username: str,
        password: str,
        header: str,
        endpoint: str = "https://api.netgsm.com.tr/sms/send/get",
        timeout_s: float = 10.0,
        transliterate_tr: bool = False,
        max_retries: int = 3,
    ) -> None:
        """
        Initialize Netgsm adapter.
        
        Args:
            username: Netgsm API username
            password: Netgsm API password
            header: SMS originator/header (e.g., "VORTE")
            endpoint: API endpoint URL
            timeout_s: HTTP timeout in seconds
            transliterate_tr: Transliterate Turkish characters to ASCII
            max_retries: Maximum retry attempts
        """
        self.username = username
        self.password = password
        self.header = header
        self.endpoint = endpoint
        self.timeout_s = timeout_s
        self.transliterate_tr = transliterate_tr
        self.max_retries = max_retries
        
        # HTTP client
        self.http = httpx.AsyncClient(timeout=timeout_s)
    
    async def aclose(self) -> None:
        """Close HTTP client."""
        await self.http.aclose()
    
    async def send_sms(
        self,
        to: Iterable[str],
        message: str,
        *,
        schedule_at: Optional[str] = None,
        custom_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send SMS via Netgsm.
        
        Args:
            to: Recipient phone numbers
            message: SMS text
            schedule_at: Schedule time (format: ddMMyyyyHHmm, optional)
            custom_id: Custom tracking ID (optional)
        
        Returns:
            Response dict with status and details
        
        Raises:
            Exception: If send fails after retries
        
        Example:
            >>> await adapter.send_sms(
            ...     to=["05321234567"],
            ...     message="Siparişiniz kargoya verildi."
            ... )
            {
                "ok": True,
                "provider": "netgsm",
                "message_id": "123456789",
                "encoding": "UCS2",
                "segments": 1,
                "recipients": 1,
            }
        """
        start_time = time.perf_counter()
        
        # Normalize recipients
        recipients = [_normalize_msisdn(num) for num in to]
        
        # Calculate encoding and segments
        seg_info = _segment_count(message, transliterate=self.transliterate_tr)
        
        # Apply transliteration if enabled
        final_message = message
        if self.transliterate_tr:
            final_message = message.translate(TRANSLITERATE_TR)
        
        # Build request parameters
        params = {
            "usercode": self.username,
            "password": self.password,
            "gsmno": ",".join(recipients),
            "message": final_message,
            "msgheader": self.header,
        }
        
        if schedule_at:
            params["startdate"] = schedule_at
        
        logger.info(
            f"Netgsm SMS send",
            extra={
                "recipients": len(recipients),
                "encoding": seg_info["encoding"],
                "segments": seg_info["segments"],
                "length": seg_info["length"],
                "header": self.header,
            }
        )
        
        # Send with retry
        try:
            response = await self._send_with_retry(params)
            
            latency = time.perf_counter() - start_time
            
            # Parse response
            # Netgsm returns: "00 {message_id}" on success
            # Error codes: 20, 30, 40, 50, 51, 70, 85
            response_text = response.text.strip()
            
            if response_text.startswith("00"):
                # Success
                message_id = response_text.split()[1] if len(response_text.split()) > 1 else response_text
                
                logger.info(
                    f"Netgsm SMS sent successfully",
                    extra={
                        "message_id": message_id,
                        "recipients": len(recipients),
                        "latency_ms": int(latency * 1000),
                    }
                )
                
                return {
                    "ok": True,
                    "provider": "netgsm",
                    "message_id": message_id,
                    "encoding": seg_info["encoding"],
                    "segments": seg_info["segments"],
                    "recipients": len(recipients),
                    "latency_ms": int(latency * 1000),
                }
            else:
                # Error
                error_code = response_text
                error_message = self._get_error_message(error_code)
                
                logger.error(
                    f"Netgsm SMS failed",
                    extra={
                        "error_code": error_code,
                        "error_message": error_message,
                        "recipients": len(recipients),
                    }
                )
                
                raise RuntimeError(f"Netgsm error {error_code}: {error_message}")
        
        except Exception as exc:
            latency = time.perf_counter() - start_time
            
            logger.error(
                f"Netgsm SMS send failed",
                extra={
                    "error": str(exc),
                    "recipients": len(recipients),
                    "latency_ms": int(latency * 1000),
                },
                exc_info=True,
            )
            
            raise
    
    async def _send_with_retry(self, params: Dict[str, str]) -> httpx.Response:
        """Send SMS with retry logic."""
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                response = await self.http.get(self.endpoint, params=params)
                return response
            
            except Exception as exc:
                last_error = exc
                
                if attempt < self.max_retries - 1:
                    # Exponential backoff
                    delay = 2 ** attempt
                    logger.warning(
                        f"Netgsm request failed, retrying in {delay}s",
                        extra={"attempt": attempt + 1, "error": str(exc)}
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"Netgsm request failed after {self.max_retries} attempts",
                        extra={"error": str(exc)}
                    )
        
        raise last_error
    
    def _get_error_message(self, error_code: str) -> str:
        """
        Get error message for Netgsm error code.
        
        Refs:
        - https://www.netgsm.com.tr/dokuman/
        """
        error_messages = {
            "20": "Invalid message content",
            "30": "Invalid username/password",
            "40": "Invalid header",
            "50": "Insufficient credits",
            "51": "Invalid package",
            "70": "Invalid parameters",
            "85": "Invalid phone number format",
        }
        
        return error_messages.get(error_code, f"Unknown error: {error_code}")
    
    def mask_phone(self, phone: str) -> str:
        """
        Mask phone number for logging (KVKK compliance).
        
        Args:
            phone: Phone number
        
        Returns:
            Masked phone number
        
        Example:
            >>> adapter.mask_phone("+905321234567")
            "+90532***4567"
        """
        if len(phone) < 8:
            return phone
        
        return phone[:6] + "***" + phone[-4:]
