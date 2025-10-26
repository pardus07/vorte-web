# apps/backend/app/services/adapters/iyzico_adapter.py
from __future__ import annotations

import base64
import hmac
import hashlib
import json
import secrets
import time
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional
from urllib.parse import urlparse

import httpx

from app.services.resilience import resilient_payment_call
from app.services.metrics import PROVIDER_LATENCY_SECONDS


class IyzicoAuth:
    """
    IYZWSv2 Yetkilendirme (HMAC-SHA256)
    Ref: https://docs.iyzico.com/.../authentication/hmacsha256-auth
    """
    def __init__(self, api_key: str, secret_key: str) -> None:
        self.api_key = api_key
        self.secret_key = secret_key

    @staticmethod
    def _json_minified(data: Dict[str, Any] | None) -> str:
        if not data:
            return ""
        # İmzayı deterministik kılmak için minified JSON
        return json.dumps(data, ensure_ascii=False, separators=(",", ":"))

    def build_headers(self, base_url: str, path: str, body: Dict[str, Any] | None) -> Dict[str, str]:
        rnd = f"{int(time.time() * 1000)}{secrets.randbelow(10**9)}"
        body_str = self._json_minified(body)
        # randomKey + uri.path + request.body
        payload = f"{rnd}{path}{body_str}".encode("utf-8")
        signature_hex = hmac.new(self.secret_key.encode("utf-8"), payload, hashlib.sha256).hexdigest()
        auth_plain = f"apiKey:{self.api_key}&randomKey:{rnd}&signature:{signature_hex}"
        auth_b64 = base64.b64encode(auth_plain.encode("utf-8")).decode("ascii")
        return {
            "Authorization": f"IYZWSv2 {auth_b64}",
            "x-iyzi-rnd": rnd,
            "Content-Type": "application/json",
        }


def _normalize_price(value: Any) -> str:
    """
    Response signature için 'trailing zero' normalizasyonu.
    Ref: Response Signature Validation / Trailing Zero
    """
    if value is None:
        return ""
    try:
        d = Decimal(str(value))
        # normalize() -> 10.50 => 10.5, 10.0 => 10
        return format(d.normalize(), "f").rstrip(".")
    except (InvalidOperation, ValueError):
        return str(value)


def _hmac_hex(secret_key: str, joined: str) -> str:
    return hmac.new(secret_key.encode("utf-8"), joined.encode("utf-8"), hashlib.sha256).hexdigest()


class IyzicoAdapter:
    """
    3DS Initialize, 3DS Auth ve Payment Detail uçları
    """
    def __init__(
        self,
        api_key: str,
        secret_key: str,
        base_url: str = "https://sandbox-api.iyzipay.com",
        timeout_seconds: float = 30.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.auth = IyzicoAuth(api_key, secret_key)
        self.timeout = timeout_seconds

    # ---------- PUBLIC API ----------

    @resilient_payment_call()
    async def initialize_3ds(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        POST /payment/3dsecure/initialize
        Dönen üç kritik alan: threeDSHtmlContent (Base64), paymentId, signature
        
        Resilience: Circuit breaker + retry (3 attempts, exponential backoff)
        """
        path = "/payment/3dsecure/initialize"
        headers = self.auth.build_headers(self.base_url, path, payload)
        
        with PROVIDER_LATENCY_SECONDS.labels(provider="iyzico", method="initialize_3ds").time():
            async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
                resp = await client.post(path, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        # Cevap imzasını doğrula (param order: paymentId, conversationId)
        self._verify_response_signature(
            service="3ds_init",
            response=data,
            fields=("paymentId", "conversationId"),
        )
        return data

    @resilient_payment_call()
    async def auth_3ds(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        POST /payment/3dsecure/auth  (3DS tamamla)
        Req: paymentId (+ conversationId, varsa conversationData)
        
        Resilience: Circuit breaker + retry (3 attempts, exponential backoff)
        """
        path = "/payment/3dsecure/auth"
        headers = self.auth.build_headers(self.base_url, path, payload)
        
        with PROVIDER_LATENCY_SECONDS.labels(provider="iyzico", method="auth_3ds").time():
            async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
                resp = await client.post(path, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        # Param order: paymentId, currency, basketId, conversationId, paidPrice, price
        self._verify_response_signature(
            service="3ds_auth",
            response=data,
            fields=("paymentId", "currency", "basketId", "conversationId", "paidPrice", "price"),
        )
        return data

    @resilient_payment_call()
    async def retrieve_payment_detail(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        POST /payment/detail  (reconciliation için)
        
        Resilience: Circuit breaker + retry (3 attempts, exponential backoff)
        """
        path = "/payment/detail"
        headers = self.auth.build_headers(self.base_url, path, payload)
        
        with PROVIDER_LATENCY_SECONDS.labels(provider="iyzico", method="retrieve_payment_detail").time():
            async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
                resp = await client.post(path, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        # Param order: paymentId, currency, basketId, conversationId, paidPrice, price
        self._verify_response_signature(
            service="detail",
            response=data,
            fields=("paymentId", "currency", "basketId", "conversationId", "paidPrice", "price"),
        )
        return data

    # ---------- INTERNALS ----------

    def _verify_response_signature(
        self,
        service: str,
        response: Dict[str, Any],
        fields: tuple[str, ...],
    ) -> None:
        """
        https://docs.iyzico.com/.../advanced/response-signature-validation
        """
        sig = response.get("signature")
        if not sig:
            # Bazı error yanıtlarında signature olmayabilir; success case'leri zorunlu tutuyoruz.
            raise ValueError(f"[{service}] Missing signature in response")

        # Alanları sırayla birleştir (':' ile). price/paidPrice için trailing zero normalizasyonu uygula.
        joined = ":".join(
            _normalize_price(response.get(k)) if k in ("price", "paidPrice") else str(response.get(k, ""))
            for k in fields
        )
        expected = _hmac_hex(self.auth.secret_key, joined)
        if expected != sig:
            raise ValueError(
                f"[{service}] Invalid response signature; expected={expected}, got={sig}, fields='{joined}'"
            )
