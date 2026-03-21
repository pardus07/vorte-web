"""Vorte Voice AI — Company Info Tools"""

import logging
import os

logger = logging.getLogger("vorte-voice-ai.tools.company")

TRANSFER_PHONE = os.getenv("TRANSFER_PHONE", "+905376220694")

# ─── Tool Definitions ────────────────────────────────────────

COMPANY_TOOLS = [
    {
        "name": "get_company_info",
        "description": "Vorte Tekstil şirket bilgileri: çalışma saatleri, adres, telefon, e-posta.",
        "parameters": {
            "type": "object",
            "properties": {
                "info_type": {
                    "type": "string",
                    "description": "İstenen bilgi türü",
                    "enum": ["saat", "adres", "telefon", "email", "genel"]
                }
            },
            "required": ["info_type"]
        }
    },
    {
        "name": "transfer_to_human",
        "description": "Müşteriyi insan temsilciye bağlar. Çözülemeyen sorunlarda veya müşteri talep ettiğinde kullan.",
        "parameters": {
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": "Transfer nedeni. Örnek: 'İade talebi', 'Fiyat görüşmesi', 'Teknik destek'"
                }
            },
            "required": ["reason"]
        }
    },
]


# ─── Company Info (Hardcoded — Phase 2'de API'ye taşınacak) ──

COMPANY_DATA = {
    "saat": (
        "Çalışma Saatleri:\n"
        "Pazartesi - Cumartesi: 09:00 - 18:00\n"
        "Pazar: Kapalı\n"
        "Online sipariş 7/24 açıktır."
    ),
    "adres": (
        "Adres: Nilüfer, Bursa / Türkiye\n"
        "Vorte Tekstil Toptan"
    ),
    "telefon": (
        "İletişim için vorte.com.tr/iletisim sayfamızı ziyaret edebilirsiniz.\n"
        "E-posta: info@vorte.com.tr\n"
        "Web: www.vorte.com.tr"
    ),
    "email": (
        "E-posta: info@vorte.com.tr\n"
        "Web: www.vorte.com.tr"
    ),
    "genel": (
        "Vorte Tekstil Toptan\n"
        "Nilüfer, Bursa / Türkiye\n"
        "E-posta: info@vorte.com.tr\n"
        "Web: www.vorte.com.tr\n"
        "İletişim: vorte.com.tr/iletisim\n"
        "Çalışma Saatleri: Pazartesi-Cumartesi 09:00-18:00\n"
        "Ürünler: Erkek Boxer, Kadın Külot\n"
        "Kumaş: %95 Taranmış Penye Pamuk, %5 Elastan"
    ),
}


# ─── Tool Handlers ───────────────────────────────────────────

async def get_company_info(info_type: str) -> str:
    """Return company information."""
    return COMPANY_DATA.get(info_type, COMPANY_DATA["genel"])


async def transfer_to_human(reason: str) -> str:
    """
    Transfer call to human representative.
    Actual SIP transfer is handled by LiveKit TransferSIPParticipant API.
    This function returns the instruction for the pipeline to execute the transfer.
    """
    logger.info(f"Transfer to human requested: {reason}")
    return f"TRANSFER_REQUESTED|reason={reason}"


# ─── Tool Router ─────────────────────────────────────────────

COMPANY_HANDLERS = {
    "get_company_info": lambda args: get_company_info(args["info_type"]),
    "transfer_to_human": lambda args: transfer_to_human(args["reason"]),
}
