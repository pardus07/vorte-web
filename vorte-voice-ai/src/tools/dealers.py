"""Vorte Voice AI — Dealer Tools (Phase 2)"""

import httpx
import logging
from src.config import VORTE_API_URL, VORTE_API_KEY

logger = logging.getLogger("vorte-voice-ai.tools.dealers")

_client = httpx.AsyncClient(
    base_url=VORTE_API_URL,
    timeout=10.0,
)

# ─── Tool Definitions ────────────────────────────────────────

DEALER_TOOLS = [
    {
        "name": "get_dealer_orders",
        "description": "Bayi sipariş ve üretim durumunu sorgular. Bayiden bayi kodu (BAY-XXXXX) ve şifre iste.",
        "parameters": {
            "type": "object",
            "properties": {
                "dealer_code": {
                    "type": "string",
                    "description": "Bayi kodu. Format: BAY-XXXXX"
                },
                "password": {
                    "type": "string",
                    "description": "Bayi şifresi"
                }
            },
            "required": ["dealer_code", "password"]
        }
    },
]

# ─── Dealer JWT Session (per-call, kept in memory) ───────────

_dealer_tokens: dict[str, str] = {}  # dealer_code → JWT token


async def _authenticate_dealer(dealer_code: str, password: str) -> str | None:
    """Authenticate dealer and get JWT token."""
    # Check if we have a cached token
    if dealer_code in _dealer_tokens:
        return _dealer_tokens[dealer_code]

    try:
        resp = await _client.post(
            f"{VORTE_API_URL}/api/auth/dealer/login",
            json={"dealerCode": dealer_code, "password": password},
        )

        if resp.status_code == 200:
            # Extract JWT from Set-Cookie header
            cookies = resp.cookies
            token = cookies.get("dealer-session")
            if token:
                _dealer_tokens[dealer_code] = token
                return token

        if resp.status_code == 401:
            return None

        return None

    except Exception as e:
        logger.error(f"Dealer auth error: {e}")
        return None


# ─── Tool Handlers ───────────────────────────────────────────

PRODUCTION_STATUS_LABELS = {
    "PENDING": "Beklemede",
    "BOM_CALCULATED": "Malzeme Listesi Hazır",
    "MATERIALS_ORDERED": "Malzeme Siparişi Verildi",
    "MATERIALS_RECEIVED": "Malzemeler Alındı",
    "IN_PRODUCTION": "Üretimde",
    "QUALITY_CHECK": "Kalite Kontrol",
    "PACKAGING_STAGE": "Paketleme",
    "PROD_SHIPPED": "Kargoya Verildi",
    "PROD_DELIVERED": "Teslim Edildi",
    "PROD_CANCELLED": "İptal Edildi",
}


async def get_dealer_orders(dealer_code: str, password: str) -> str:
    """Fetch dealer production orders with JWT authentication."""
    # Step 1: Authenticate
    token = await _authenticate_dealer(dealer_code, password)
    if not token:
        return "Bayi girişi başarısız. Lütfen bayi kodunuzu ve şifrenizi kontrol edin."

    try:
        # Step 2: Fetch production orders with JWT
        resp = await _client.get(
            f"{VORTE_API_URL}/api/dealer/production",
            cookies={"dealer-session": token},
        )
        resp.raise_for_status()
        data = resp.json()

        orders = data.get("orders", [])
        if not orders:
            return "Aktif üretim siparişiniz bulunmuyor."

        results = []
        for order in orders[:5]:  # Max 5 sipariş göster
            po_number = order.get("poNumber", "")
            stage = PRODUCTION_STATUS_LABELS.get(
                order.get("currentStage", ""), order.get("currentStage", "")
            )
            estimated = order.get("estimatedDelivery", "")
            items = order.get("items", [])

            item_summary = ""
            if items:
                item_names = [f"{it.get('productName', '')} x{it.get('totalQuantity', 0)}" for it in items[:3]]
                item_summary = ", ".join(item_names)

            result = f"Sipariş {po_number}: {stage}"
            if item_summary:
                result += f" — {item_summary}"
            if estimated:
                result += f" — Tahmini teslim: {estimated}"

            results.append(result)

        return "Bayi siparişleriniz:\n" + "\n".join(results)

    except Exception as e:
        logger.error(f"get_dealer_orders error: {e}")
        return "Sipariş bilgileri şu anda alınamıyor. Lütfen daha sonra tekrar deneyin."


def clear_dealer_session(dealer_code: str = None):
    """Clear cached dealer token (call on session end)."""
    if dealer_code:
        _dealer_tokens.pop(dealer_code, None)
    else:
        _dealer_tokens.clear()


# ─── Tool Router ─────────────────────────────────────────────

DEALER_HANDLERS = {
    "get_dealer_orders": lambda args: get_dealer_orders(args["dealer_code"], args["password"]),
}
