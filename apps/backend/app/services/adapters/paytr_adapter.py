# apps/backend/app/services/adapters/paytr_adapter.py
"""
PayTR Direct API Adapter

Implements PayTR payment flow with HMAC-SHA256 authentication:
- Token generation for payment initialization
- Callback hash validation for webhook security
- Status inquiry for reconciliation

Refs:
- https://dev.paytr.com/direct-api
- https://dev.paytr.com/callback-validation
- https://www.paytr.com/odeme/durum-sorgu
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Any, Dict

import httpx

from app.services.resilience import resilient_payment_call
from app.services.metrics import PROVIDER_LATENCY_SECONDS


class PayTRAdapter:
    """
    PayTR Direct API adapter with HMAC-SHA256 authentication.
    
    Payment Flow:
    1. initialize_payment: Generate token and form parameters
    2. Frontend: POST form to PayTR hosted page
    3. User: Complete payment on PayTR
    4. PayTR: Redirect to merchant_ok_url / merchant_fail_url
    5. PayTR: POST callback to merchant with hash
    6. validate_callback_hash: Verify callback authenticity
    
    Critical: Callback response MUST be exactly "OK" (plain text) or PayTR
    will keep status as "Devam Ediyor" and retry indefinitely.
    Ref: https://dev.paytr.com/callback-validation
    """

    def __init__(
        self,
        merchant_id: str,
        merchant_key: str,
        merchant_salt: str,
        test_mode: bool = True,
        base_url: str = "https://www.paytr.com",
    ) -> None:
        """
        Initialize PayTR adapter.
        
        Args:
            merchant_id: PayTR merchant ID
            merchant_key: PayTR merchant key (for token generation)
            merchant_salt: PayTR merchant salt (for hash validation)
            test_mode: Enable test mode (1) or production (0)
            base_url: PayTR API base URL
        """
        self.merchant_id = merchant_id
        self.merchant_key = merchant_key
        self.merchant_salt = merchant_salt
        self.test_mode = "1" if test_mode else "0"
        self.base_url = base_url.rstrip("/")

    # ---------- PUBLIC API ----------

    def initialize_payment(
        self,
        *,
        merchant_oid: str,
        email: str,
        payment_amount: int,  # Minor units (kuruş)
        user_basket: list[Dict[str, Any]],
        user_ip: str,
        merchant_ok_url: str,
        merchant_fail_url: str,
        user_name: str = "",
        user_address: str = "",
        user_phone: str = "",
        no_installment: int = 0,
        max_installment: int = 0,
        currency: str = "TL",
        timeout_limit: int = 30,
        lang: str = "tr",
    ) -> Dict[str, Any]:
        """
        Generate PayTR payment form parameters.
        
        Frontend must POST these parameters to PayTR's iframe endpoint.
        
        Args:
            merchant_oid: Unique order ID (use payment DB ID)
            email: Customer email
            payment_amount: Amount in minor units (kuruş)
            user_basket: Basket items [{"name": "Product", "price": "1000", "quantity": 1}]
            user_ip: Customer IP address
            merchant_ok_url: Success redirect URL
            merchant_fail_url: Failure redirect URL
            no_installment: Disable installments (1) or allow (0)
            max_installment: Maximum installment count (0 = no limit)
            currency: Currency code (TL, USD, EUR)
            timeout_limit: Payment timeout in minutes
            lang: Language (tr, en)
        
        Returns:
            Form parameters dict to POST to PayTR
        
        Ref: https://dev.paytr.com/direct-api#request-parameters
        """
        # Encode basket as Base64 JSON
        user_basket_json = json.dumps(user_basket, ensure_ascii=False)
        user_basket_b64 = base64.b64encode(user_basket_json.encode("utf-8")).decode("ascii")

        # Generate payment token (HMAC-SHA256)
        # Order: merchant_id + user_ip + merchant_oid + email + payment_amount + 
        #        user_basket + no_installment + max_installment + currency + test_mode + merchant_key
        token_plain = (
            f"{self.merchant_id}{user_ip}{merchant_oid}{email}{payment_amount}"
            f"{user_basket_b64}{no_installment}{max_installment}{currency}{self.test_mode}"
        )
        paytr_token = self._generate_token(token_plain)

        # Build form parameters
        form_params = {
            "merchant_id": self.merchant_id,
            "merchant_oid": merchant_oid,
            "email": email,
            "payment_amount": str(payment_amount),
            "user_basket": user_basket_b64,
            "no_installment": str(no_installment),
            "max_installment": str(max_installment),
            "currency": currency,
            "test_mode": self.test_mode,
            "user_ip": user_ip,
            "merchant_ok_url": merchant_ok_url,
            "merchant_fail_url": merchant_fail_url,
            "timeout_limit": str(timeout_limit),
            "lang": lang,
            "paytr_token": paytr_token,
            # Optional fields
            "user_name": user_name,
            "user_address": user_address,
            "user_phone": user_phone,
        }

        return form_params

    def validate_callback_hash(
        self,
        *,
        merchant_oid: str,
        status: str,
        total_amount: str,
        hash_value: str,
    ) -> bool:
        """
        Validate PayTR callback hash for authenticity.
        
        PayTR sends callback with hash to verify it's from PayTR servers.
        CRITICAL: Use timing-safe comparison to prevent timing attacks.
        
        Args:
            merchant_oid: Order ID from callback
            status: Payment status from callback (success/failed)
            total_amount: Total amount from callback (minor units)
            hash_value: Hash from callback
        
        Returns:
            True if hash is valid, False otherwise
        
        Ref: https://dev.paytr.com/callback-validation
        """
        # Generate expected hash
        # Order: merchant_oid + merchant_salt + status + total_amount
        hash_plain = f"{merchant_oid}{self.merchant_salt}{status}{total_amount}"
        expected_hash = self._generate_hash(hash_plain)

        # Timing-safe comparison (prevents timing attacks)
        return hmac.compare_digest(expected_hash, hash_value)

    async def status_inquiry(self, merchant_oid: str) -> Dict[str, Any]:
        """
        Query payment status from PayTR for reconciliation.
        
        Used by reconciliation worker to get final status of stuck payments.
        
        Args:
            merchant_oid: Order ID to query
        
        Returns:
            Status response dict with:
            - status: Payment status (success/failed/waiting)
            - amount: Payment amount
            - currency: Currency code
            - payment_type: Payment method
            - installment_count: Installment count
            - net_amount: Net amount after commission
            - merchant_oid: Order ID
            - payment_date: Payment completion date (if success)
        
        Raises:
            httpx.HTTPError: If API call fails
            ValueError: If response is invalid
        
        Ref: https://www.paytr.com/odeme/durum-sorgu
        """
        # Generate token for status inquiry
        # Order: merchant_id + merchant_oid + merchant_salt
        token_plain = f"{self.merchant_id}{merchant_oid}{self.merchant_salt}"
        paytr_token = self._generate_hash(token_plain)

        # Prepare request payload
        payload = {
            "merchant_id": self.merchant_id,
            "merchant_oid": merchant_oid,
            "paytr_token": paytr_token,
        }

        # Call PayTR status inquiry API
        url = f"{self.base_url}/odeme/durum-sorgu"
        
        with PROVIDER_LATENCY_SECONDS.labels(provider="paytr", method="status_inquiry").time():
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    data=payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                response.raise_for_status()

        # Parse response
        try:
            result = response.json()
        except json.JSONDecodeError:
            # PayTR may return plain text error messages
            raise ValueError(f"Invalid JSON response from PayTR: {response.text}")

        # Validate response
        if not isinstance(result, dict):
            raise ValueError(f"Expected dict response, got {type(result)}")

        # Check for error response
        if result.get("status") == "failed" and "reason" in result:
            # PayTR returns error details in 'reason' field
            raise ValueError(f"PayTR status inquiry failed: {result.get('reason')}")

        return result

    # ---------- INTERNALS ----------

    def _generate_token(self, plain: str) -> str:
        """
        Generate HMAC-SHA256 token for payment initialization.
        
        Args:
            plain: Concatenated string of parameters
        
        Returns:
            Base64-encoded HMAC-SHA256 hash
        """
        signature = hmac.new(
            self.merchant_key.encode("utf-8"),
            plain.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        return base64.b64encode(signature).decode("ascii")

    def _generate_hash(self, plain: str) -> str:
        """
        Generate HMAC-SHA256 hash for callback validation.
        
        Args:
            plain: Concatenated string of callback parameters
        
        Returns:
            Base64-encoded HMAC-SHA256 hash
        """
        signature = hmac.new(
            self.merchant_salt.encode("utf-8"),
            plain.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        return base64.b64encode(signature).decode("ascii")
