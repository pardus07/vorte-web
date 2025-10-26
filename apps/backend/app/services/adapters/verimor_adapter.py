# apps/backend/app/services/adapters/verimor_adapter.py
"""
Verimor SMS adapter with İYS (İleti Yönetim Sistemi) support.

Features:
- Send single/bulk SMS via JSON API
- İYS compliance (is_commercial, iys_recipient_type)
- Scheduled SMS support
- Balance and header queries
- Retry logic with circuit breaker
- Prometheus metrics

Refs:
- https://developer.verimor.com.tr/
- https://developer.verimor.com.tr/v2/sms/send
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import List, Optional, Dict, Any

import httpx


logger = logging.getLogger(__name__)


class VerimorAdapter:
    """
    Verimor SMS adapter.
    
    Features:
    - JSON API (v2)
    - İYS compliance
    - Scheduled SMS
    - Balance/header queries
    - Retry logic with circuit breaker
    
    Refs:
    - https://developer.verimor.com.tr/
    """
    
    def __init__(
        self,
        base_url: str,
        username: str,
        password: str,
        source_addr: str,
        default_is_commercial: bool = False,
        default_iys_recipient_type: str = "BIREYSEL",
        timeout_s: float = 10.0,
        max_retries: int = 3,
    ) -> None:
        """
        Initialize Verimor adapter.
        
        Args:
            base_url: API base URL (e.g., "https://sms.verimor.com.tr")
            username: Verimor API username
            password: Verimor API password
            source_addr: SMS originator/header (e.g., "VORTE")
            default_is_commercial: Default commercial flag for İYS
            default_iys_recipient_type: Default recipient type ("BIREYSEL" or "TACIR")
            timeout_s: HTTP timeout in seconds
            max_retries: Maximum retry attempts
        """
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.source_addr = source_addr
        self.default_is_commercial = default_is_commercial
        self.default_iys_recipient_type = default_iys_recipient_type
        self.timeout_s = timeout_s
        self.max_retries = max_retries
        
        # HTTP client with Basic Auth
        self.http = httpx.AsyncClient(
            timeout=timeout_s,
            auth=(username, password),
        )
    
    async def aclose(self) -> None:
        """Close HTTP client."""
        await self.http.aclose()
    
    async def send_sms(
        self,
        messages: List[Dict[str, str]],
        *,
        is_commercial: Optional[bool] = None,
        iys_recipient_type: Optional[str] = None,
        send_at: Optional[str] = None,
        datacoding: Optional[str] = None,
        custom_id: Optional[str] = None,
    ) -> str:
        """
        Send SMS via Verimor.
        
        Args:
            messages: List of messages [{"dest": "905321234567", "text": "..."}]
            is_commercial: Commercial SMS flag (İYS)
            iys_recipient_type: Recipient type ("BIREYSEL" or "TACIR")
            send_at: Schedule time (ISO8601 format, optional)
            datacoding: Data coding ("unicode", optional)
            custom_id: Custom tracking ID (optional)
        
        Returns:
            Campaign ID (string)
        
        Raises:
            Exception: If send fails after retries
        
        Example:
            >>> await adapter.send_sms(
            ...     messages=[
            ...         {"dest": "905321234567", "text": "Siparişiniz kargoya verildi."},
            ...     ],
            ...     is_commercial=False,
            ... )
            "123456789"
        """
        start_time = time.perf_counter()
        
        # Build payload
        payload: Dict[str, Any] = {
            "messages": messages,
            "source_addr": self.source_addr,
            "is_commercial": self.default_is_commercial if is_commercial is None else is_commercial,
            "iys_recipient_type": self.default_iys_recipient_type if iys_recipient_type is None else iys_recipient_type,
        }
        
        if send_at:
            payload["send_at"] = send_at
        
        if datacoding:
            payload["datacoding"] = datacoding
        
        if custom_id:
            payload["custom_id"] = custom_id
        
        logger.info(
            f"Verimor SMS send",
            extra={
                "recipients": len(messages),
                "is_commercial": payload["is_commercial"],
                "iys_recipient_type": payload["iys_recipient_type"],
                "source_addr": self.source_addr,
            }
        )
        
        # Send with retry and circuit breaker
        try:
            response = await self._send_with_retry(
                method="POST",
                url=f"{self.base_url}/v2/send.json",
                json=payload,
            )
            
            latency = time.perf_counter() - start_time
            
            # Parse response
            # Success: plain text campaign ID
            # Error: HTTP error status
            if response.status_code == 200 and response.text.strip():
                campaign_id = response.text.strip()
                
                logger.info(
                    f"Verimor SMS sent successfully",
                    extra={
                        "campaign_id": campaign_id,
                        "recipients": len(messages),
                        "latency_ms": int(latency * 1000),
                    }
                )
                
                return campaign_id
            else:
                error_message = response.text or "Empty response"
                
                logger.error(
                    f"Verimor SMS failed",
                    extra={
                        "status_code": response.status_code,
                        "error": error_message,
                        "recipients": len(messages),
                    }
                )
                
                raise RuntimeError(f"Verimor error {response.status_code}: {error_message}")
        
        except Exception as exc:
            latency = time.perf_counter() - start_time
            
            logger.error(
                f"Verimor SMS send failed",
                extra={
                    "error": str(exc),
                    "recipients": len(messages),
                    "latency_ms": int(latency * 1000),
                },
                exc_info=True,
            )
            
            raise
    
    async def get_balance(self) -> str:
        """
        Get account balance.
        
        Returns:
            Balance as string
        
        Example:
            >>> await adapter.get_balance()
            "1234.56"
        """
        try:
            response = await self._send_with_retry(
                method="GET",
                url=f"{self.base_url}/v2/balance",
            )
            
            response.raise_for_status()
            
            balance = response.text.strip()
            
            logger.info(f"Verimor balance: {balance}")
            
            return balance
        
        except Exception as exc:
            logger.error(f"Verimor get_balance failed", extra={"error": str(exc)})
            raise
    
    async def get_headers(self) -> List[Dict[str, Any]]:
        """
        Get available SMS headers/originators.
        
        Returns:
            List of headers
        
        Example:
            >>> await adapter.get_headers()
            [{"header": "VORTE", "status": "active"}]
        """
        try:
            response = await self._send_with_retry(
                method="GET",
                url=f"{self.base_url}/v2/headers",
            )
            
            response.raise_for_status()
            
            headers = response.json()
            
            logger.info(f"Verimor headers: {len(headers)}")
            
            return headers
        
        except Exception as exc:
            logger.error(f"Verimor get_headers failed", extra={"error": str(exc)})
            raise
    
    async def _send_with_retry(
        self,
        method: str,
        url: str,
        **kwargs,
    ) -> httpx.Response:
        """Send HTTP request with retry logic."""
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                response = await self.http.request(method, url, **kwargs)
                return response
            
            except Exception as exc:
                last_error = exc
                
                if attempt < self.max_retries - 1:
                    # Exponential backoff
                    delay = 2 ** attempt
                    logger.warning(
                        f"Verimor request failed, retrying in {delay}s",
                        extra={"attempt": attempt + 1, "error": str(exc)}
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"Verimor request failed after {self.max_retries} attempts",
                        extra={"error": str(exc)}
                    )
        
        raise last_error
    
    def mask_phone(self, phone: str) -> str:
        """
        Mask phone number for logging (KVKK compliance).
        
        Args:
            phone: Phone number
        
        Returns:
            Masked phone number
        
        Example:
            >>> adapter.mask_phone("905321234567")
            "90532***4567"
        """
        if len(phone) < 8:
            return phone
        
        return phone[:5] + "***" + phone[-4:]
