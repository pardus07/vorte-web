"""Vorte Voice AI — Order & Shipping Tools (Phase 2)"""

import httpx
import logging
from src.config import VORTE_API_URL, VORTE_API_KEY

logger = logging.getLogger("vorte-voice-ai.tools.orders")

_client = httpx.AsyncClient(
    base_url=VORTE_API_URL,
    headers={"X-Server-Api-Key": VORTE_API_KEY} if VORTE_API_KEY else {},
    timeout=10.0,
)

# ─── Tool Definitions ────────────────────────────────────────

ORDER_TOOLS = [
    {
        "name": "get_order_status",
        "description": "Sipariş durumunu sorgular. Müşteriden sipariş numarası (VRT-XXXXXX-XXXX) iste.",
        "parameters": {
            "type": "object",
            "properties": {
                "order_number": {
                    "type": "string",
                    "description": "Sipariş numarası. Format: VRT-XXXXXX-XXXX"
                }
            },
            "required": ["order_number"]
        }
    },
    {
        "name": "get_shipment_info",
        "description": "Kargo takip bilgisi verir. Kargo takip numarası gerekli.",
        "parameters": {
            "type": "object",
            "properties": {
                "tracking_number": {
                    "type": "string",
                    "description": "Kargo takip numarası"
                }
            },
            "required": ["tracking_number"]
        }
    },
]


# ─── Status Labels (Turkish) ─────────────────────────────────

STATUS_LABELS = {
    "PENDING": "Beklemede",
    "PAID": "Ödendi",
    "PROCESSING": "Hazırlanıyor",
    "PRODUCTION": "Üretimde",
    "PRODUCTION_READY": "Üretim Hazır",
    "SHIPPED": "Kargoda",
    "DELIVERED": "Teslim Edildi",
    "CANCELLED": "İptal Edildi",
    "REFUNDED": "İade Edildi",
}


# ─── Tool Handlers ───────────────────────────────────────────

async def get_order_status(order_number: str) -> str:
    """Fetch order status from Vorte API."""
    try:
        resp = await _client.get(
            "/api/admin/orders",
            params={"search": order_number, "limit": "1"},
        )
        resp.raise_for_status()
        data = resp.json()

        orders = data.get("orders", [])
        if not orders:
            return f"Sipariş numarası '{order_number}' ile eşleşen sipariş bulunamadı. Lütfen numarayı kontrol edin."

        order = orders[0]
        status = STATUS_LABELS.get(order.get("status", ""), order.get("status", ""))
        total = order.get("totalAmount", 0)
        tracking = order.get("cargoTrackingNo", "")
        provider = order.get("cargoProvider", "")

        result = (
            f"Sipariş: {order.get('orderNumber', order_number)}\n"
            f"Durum: {status}\n"
            f"Tutar: {total:.2f} TL"
        )

        if tracking:
            result += f"\nKargo: {provider} — Takip No: {tracking}"
            if order.get("cargoTrackingUrl"):
                result += f"\nTakip linki web sitemizde mevcuttur."

        return result

    except Exception as e:
        logger.error(f"get_order_status error: {e}")
        return "Sipariş bilgisi şu anda alınamıyor. Lütfen daha sonra tekrar deneyin."


async def get_shipment_info(tracking_number: str) -> str:
    """Fetch shipping info."""
    try:
        resp = await _client.get(
            "/api/kargo-takip",
            params={"trackingNo": tracking_number},
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get("error"):
            return f"Kargo takip numarası '{tracking_number}' bulunamadı."

        status = data.get("status", "Bilinmiyor")
        location = data.get("location", "")

        result = f"Kargo Durumu: {status}"
        if location:
            result += f"\nKonum: {location}"

        return result

    except Exception as e:
        logger.error(f"get_shipment_info error: {e}")
        return "Kargo bilgisi şu anda alınamıyor."


# ─── Tool Router ─────────────────────────────────────────────

ORDER_HANDLERS = {
    "get_order_status": lambda args: get_order_status(args["order_number"]),
    "get_shipment_info": lambda args: get_shipment_info(args["tracking_number"]),
}
