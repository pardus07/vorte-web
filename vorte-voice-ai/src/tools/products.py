"""Vorte Voice AI — Product Tools (Function Calling)"""

import httpx
import logging
from src.config import VORTE_API_URL, VORTE_API_KEY

logger = logging.getLogger("vorte-voice-ai.tools.products")

# ─── HTTP Client ─────────────────────────────────────────────

_client = httpx.AsyncClient(
    base_url=VORTE_API_URL,
    headers={"X-Server-Api-Key": VORTE_API_KEY} if VORTE_API_KEY else {},
    timeout=10.0,
)


# ─── Tool Definitions (for Gemini function calling) ──────────

PRODUCT_TOOLS = [
    {
        "name": "get_product_info",
        "description": "Vorte ürünleri hakkında bilgi verir. Ürün adı, fiyat, renkler, bedenler, kumaş bilgisi.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_name": {
                    "type": "string",
                    "description": "Aranan ürün adı veya anahtar kelime. Örnek: 'erkek boxer', 'kadın külot', 'siyah boxer'"
                }
            },
            "required": ["product_name"]
        }
    },
    {
        "name": "get_stock_status",
        "description": "Belirli bir ürünün stok durumunu kontrol eder.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_name": {
                    "type": "string",
                    "description": "Ürün adı. Örnek: 'erkek boxer siyah'"
                },
                "size": {
                    "type": "string",
                    "description": "Beden. Örnek: 'M', 'L', 'XL'",
                    "enum": ["S", "M", "L", "XL", "XXL"]
                },
                "color": {
                    "type": "string",
                    "description": "Renk adı. Örnek: 'Siyah', 'Lacivert', 'Gri', 'Beyaz', 'Ten'"
                }
            },
            "required": ["product_name"]
        }
    },
    {
        "name": "get_size_chart",
        "description": "Beden tablosu bilgisi verir. Erkek boxer veya kadın külot için S-XXL beden ölçüleri.",
        "parameters": {
            "type": "object",
            "properties": {
                "gender": {
                    "type": "string",
                    "description": "Cinsiyet: 'erkek' veya 'kadın'",
                    "enum": ["erkek", "kadın"]
                }
            },
            "required": ["gender"]
        }
    },
]


# ─── Tool Handlers ───────────────────────────────────────────

async def get_product_info(product_name: str) -> str:
    """Fetch product info from Vorte API."""
    try:
        # Search products
        resp = await _client.get("/api/products", params={"q": product_name, "limit": "3"})
        resp.raise_for_status()
        data = resp.json()

        products = data.get("products", [])
        if not products:
            return f"'{product_name}' ile eşleşen ürün bulunamadı."

        results = []
        for p in products[:3]:
            name = p.get("name", "")
            price = p.get("basePrice", 0)
            variants = p.get("variants", [])

            # Unique colors and sizes
            colors = sorted(set(v.get("color", "") for v in variants if v.get("active")))
            sizes = ["S", "M", "L", "XL", "XXL"]
            available_sizes = sorted(
                set(v.get("size", "") for v in variants if v.get("active") and v.get("stock", 0) > 0),
                key=lambda s: sizes.index(s) if s in sizes else 99
            )

            results.append(
                f"Ürün: {name}\n"
                f"Fiyat: {price:.2f} TL\n"
                f"Renkler: {', '.join(colors) if colors else 'Bilgi yok'}\n"
                f"Mevcut Bedenler: {', '.join(available_sizes) if available_sizes else 'Stok bilgisi yok'}\n"
                f"Kumaş: %95 Taranmış Penye Pamuk, %5 Elastan"
            )

        return "\n---\n".join(results)

    except Exception as e:
        logger.error(f"get_product_info error: {e}")
        return "Ürün bilgisi şu anda alınamıyor. Lütfen daha sonra tekrar deneyin."


async def get_stock_status(product_name: str, size: str = None, color: str = None) -> str:
    """Check stock status for a specific product variant."""
    try:
        resp = await _client.get("/api/products", params={"q": product_name, "limit": "1"})
        resp.raise_for_status()
        data = resp.json()

        products = data.get("products", [])
        if not products:
            return f"'{product_name}' ürünü bulunamadı."

        product = products[0]
        variants = product.get("variants", [])

        # Filter by color and size if specified
        matching = variants
        if color:
            matching = [v for v in matching if color.lower() in v.get("color", "").lower()]
        if size:
            matching = [v for v in matching if v.get("size", "").upper() == size.upper()]

        if not matching:
            return f"Belirtilen renk/beden kombinasyonu bulunamadı."

        results = []
        for v in matching:
            stock = v.get("stock", 0)
            status = "Stokta var" if stock > 10 else "Sınırlı stok" if stock > 0 else "Tükendi"
            results.append(f"{v.get('color', '')} {v.get('size', '')}: {status}")

        return f"{product.get('name', '')} stok durumu:\n" + "\n".join(results)

    except Exception as e:
        logger.error(f"get_stock_status error: {e}")
        return "Stok bilgisi şu anda alınamıyor."


async def get_size_chart(gender: str) -> str:
    """Return size chart info (hardcoded for Phase 1, will move to API in Phase 2)."""
    if gender.lower() == "erkek":
        return (
            "Erkek Boxer Beden Tablosu:\n"
            "S: Bel 72-80 cm, Kalça 88-96 cm\n"
            "M: Bel 80-88 cm, Kalça 96-104 cm\n"
            "L: Bel 88-96 cm, Kalça 104-112 cm\n"
            "XL: Bel 96-104 cm, Kalça 112-120 cm\n"
            "XXL: Bel 104-112 cm, Kalça 120-128 cm"
        )
    else:
        return (
            "Kadın Külot Beden Tablosu:\n"
            "S: Bel 62-70 cm, Kalça 86-94 cm\n"
            "M: Bel 70-78 cm, Kalça 94-102 cm\n"
            "L: Bel 78-86 cm, Kalça 102-110 cm\n"
            "XL: Bel 86-94 cm, Kalça 110-118 cm\n"
            "XXL: Bel 94-102 cm, Kalça 118-126 cm"
        )


# ─── Tool Router ─────────────────────────────────────────────

PRODUCT_HANDLERS = {
    "get_product_info": lambda args: get_product_info(args["product_name"]),
    "get_stock_status": lambda args: get_stock_status(
        args["product_name"], args.get("size"), args.get("color")
    ),
    "get_size_chart": lambda args: get_size_chart(args["gender"]),
}
