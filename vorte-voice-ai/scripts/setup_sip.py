"""
Vorte Voice AI — SIP Trunk & Dispatch Rule Setup

LiveKit SIP trunkleri config dosyasıyla değil, API ile oluşturulur.
Bu script Netgsm SIP trunk ve dispatch rule'u LiveKit Server'a kaydeder.

Kullanım:
  python scripts/setup_sip.py

Gereksinimler:
  pip install livekit-api

Ortam Değişkenleri:
  LIVEKIT_URL          - LiveKit server URL (default: http://localhost:7880)
  LIVEKIT_API_KEY      - API key (default: devkey)
  LIVEKIT_API_SECRET   - API secret (default: secret)
  NETGSM_SIP_HOST      - Netgsm SIP gateway adresi (Netgsm destek'ten alınacak)
  NETGSM_SIP_USERNAME  - SIP kullanıcı adı (varsa)
  NETGSM_SIP_PASSWORD  - SIP şifresi (varsa)
"""

import asyncio
import os
import sys

from dotenv import load_dotenv

load_dotenv()

# ─── Config ──────────────────────────────────────────────────

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "http://localhost:7880")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "secret")

# Netgsm SIP bilgileri (Netgsm destek'ten alınacak)
NETGSM_SIP_HOST = os.getenv("NETGSM_SIP_HOST", "")
NETGSM_SIP_USERNAME = os.getenv("NETGSM_SIP_USERNAME", "")
NETGSM_SIP_PASSWORD = os.getenv("NETGSM_SIP_PASSWORD", "")

# Vorte 0850 numarası
VORTE_PHONE_NUMBER = "+908503058635"


async def setup():
    """Create SIP trunk and dispatch rule via LiveKit API."""

    try:
        from livekit.api import LiveKitAPI
        from livekit.protocol.sip import (
            CreateSIPInboundTrunkRequest,
            CreateSIPDispatchRuleRequest,
            SIPInboundTrunkInfo,
            SIPDispatchRuleIndividual,
            SIPDispatchRule,
        )
    except ImportError:
        print("ERROR: livekit-api paketi yüklü değil.")
        print("  pip install livekit-api")
        sys.exit(1)

    if not NETGSM_SIP_HOST:
        print("UYARI: NETGSM_SIP_HOST ortam değişkeni boş!")
        print("Netgsm destek'ten SIP gateway adresini öğrenin.")
        print("Örnek: sip.netgsm.com.tr")
        print("")
        print("Yine de devam ediliyor (test modunda)...")

    api = LiveKitAPI(
        url=LIVEKIT_URL,
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET,
    )

    # ── Step 1: SIP Inbound Trunk oluştur ──

    print("=" * 50)
    print("1. SIP Inbound Trunk oluşturuluyor...")
    print("=" * 50)

    trunk_info = SIPInboundTrunkInfo(
        name="netgsm-vorte-0850",
        numbers=[VORTE_PHONE_NUMBER],
    )

    # Netgsm SIP gateway adresleri (varsa)
    if NETGSM_SIP_HOST:
        trunk_info.allowed_addresses = [NETGSM_SIP_HOST]

    # SIP kimlik bilgileri (Netgsm gerektiriyorsa)
    if NETGSM_SIP_USERNAME:
        trunk_info.auth_username = NETGSM_SIP_USERNAME
    if NETGSM_SIP_PASSWORD:
        trunk_info.auth_password = NETGSM_SIP_PASSWORD

    try:
        trunk_request = CreateSIPInboundTrunkRequest(trunk=trunk_info)
        trunk_result = await api.sip.create_sip_inbound_trunk(trunk_request)
        trunk_id = trunk_result.sip_trunk_id
        print(f"  ✅ Trunk oluşturuldu: {trunk_id}")
        print(f"  📞 Numara: {VORTE_PHONE_NUMBER}")
        if NETGSM_SIP_HOST:
            print(f"  🌐 SIP Gateway: {NETGSM_SIP_HOST}")
    except Exception as e:
        print(f"  ❌ Trunk oluşturulamadı: {e}")
        await api.aclose()
        sys.exit(1)

    # ── Step 2: Dispatch Rule oluştur ──

    print("")
    print("=" * 50)
    print("2. Dispatch Rule oluşturuluyor...")
    print("=" * 50)

    try:
        dispatch_request = CreateSIPDispatchRuleRequest(
            rule=SIPDispatchRule(
                dispatch_rule_individual=SIPDispatchRuleIndividual(
                    room_prefix="vorte-call-",  # Her çağrı benzersiz room: vorte-call-xxxx
                    pin="",  # PIN yok — direkt bağlan
                ),
            ),
            trunk_ids=[trunk_id],
            name="vorte-voice-ai-dispatch",
        )
        dispatch_result = await api.sip.create_sip_dispatch_rule(dispatch_request)
        print(f"  ✅ Dispatch rule oluşturuldu: {dispatch_result.sip_dispatch_rule_id}")
        print(f"  🏠 Room prefix: vorte-call-* (her çağrı benzersiz room)")
        print(f"  📱 Trunk: {trunk_id}")
    except Exception as e:
        print(f"  ❌ Dispatch rule oluşturulamadı: {e}")
        await api.aclose()
        sys.exit(1)

    await api.aclose()

    # ── Özet ──

    print("")
    print("=" * 50)
    print("✅ KURULUM TAMAMLANDI")
    print("=" * 50)
    print(f"  SIP Trunk ID: {trunk_id}")
    print(f"  Numara: {VORTE_PHONE_NUMBER}")
    print(f"  Room: vorte-call")
    print("")
    print("Sonraki adımlar:")
    print("  1. Netgsm panelinden SIP trunk'ı aktifleştir")
    print(f"     IP: <sunucu-ip>, Port: 5060")
    print("  2. docker-compose up -d ile servisleri başlat")
    print("  3. 0850 305 86 35'i ara ve test et")


if __name__ == "__main__":
    asyncio.run(setup())
