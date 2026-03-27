"""
Vorte Voice AI — Main Entry Point

LiveKit SIP Bridge → Gemini 2.5 Flash Native Audio
Telefon üzerinden 7/24 sesli AI müşteri hizmeti.
Ses kaydı: LiveKit Egress ile otomatik.
"""

import asyncio
import logging
import os

import aiohttp
from livekit import agents
from livekit.agents import (
    AgentSession,
    Agent,
    function_tool,
    RunContext,
)
from livekit.plugins.google import beta as google_beta

from src.config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    AGENT_VOICE,
    TRANSFER_PHONE,
    VORTE_API_URL,
    VORTE_API_KEY,
)
from src.system_prompt import SYSTEM_PROMPT
from src.session_manager import SessionManager
from src.call_logger import CallLogger

# Tools
from src.tools.products import PRODUCT_HANDLERS, get_product_info, get_stock_status, get_size_chart
from src.tools.company import COMPANY_HANDLERS, get_company_info, transfer_to_human
from src.tools.orders import ORDER_HANDLERS, get_order_status, get_shipment_info
from src.tools.dealers import DEALER_HANDLERS, get_dealer_orders, clear_dealer_session

# ─── Logging ─────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("vorte-voice-ai")


# ─── Ses Kaydı (Egress) ─────────────────────────────────────

async def start_room_recording(room_name: str) -> str | None:
    """LiveKit Egress ile room ses kaydını başlatır. Egress ID döner."""
    try:
        from livekit.api import LiveKitAPI
        from livekit.protocol.egress import (
            RoomCompositeEgressRequest,
            EncodedFileOutput,
            EncodedFileType,
        )

        api = LiveKitAPI(
            url=LIVEKIT_URL.replace("ws://", "http://"),
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
        )

        output = EncodedFileOutput(
            file_type=EncodedFileType.OGG,
            filepath="/recordings/{}.ogg".format(room_name),
        )

        request = RoomCompositeEgressRequest(
            room_name=room_name,
            audio_only=True,
            file_outputs=[output],
        )

        result = await api.egress.start_room_composite_egress(request)
        egress_id = result.egress_id
        logger.info("Recording started: egress_id=%s, room=%s", egress_id, room_name)
        await api.aclose()
        return egress_id

    except Exception as e:
        logger.warning("Recording not available: %s", e)
        return None


async def stop_room_recording(egress_id: str, room_name: str = "") -> str | None:
    """Ses kaydını durdurur. Dosya yolunu döner. Dosyanın yazılmasını bekler."""
    if not egress_id:
        return None
    try:
        from livekit.api import LiveKitAPI
        from livekit.protocol.egress import StopEgressRequest

        api = LiveKitAPI(
            url=LIVEKIT_URL.replace("ws://", "http://"),
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
        )

        result = await api.egress.stop_egress(StopEgressRequest(egress_id=egress_id))
        logger.info("Recording stop requested: egress_id=%s", egress_id)
        await api.aclose()

        # Egress'in dosyayı yazmasını bekle (encode + flush süresi)
        expected_path = "/recordings/{}.ogg".format(room_name) if room_name else None

        # file_results varsa onu kullan, yoksa beklenen path'i dene
        file_path = None
        if result.file_results:
            file_path = result.file_results[0].filename
        elif expected_path:
            file_path = expected_path

        if file_path:
            # Dosyanın diske yazılmasını bekle (max 10 saniye, 1'er saniye kontrol)
            for attempt in range(10):
                if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                    logger.info("Recording file ready: %s (%d KB, attempt %d)",
                                file_path, os.path.getsize(file_path) // 1024, attempt + 1)
                    return file_path
                logger.info("Waiting for recording file... attempt %d/10", attempt + 1)
                await asyncio.sleep(1)

            # Son kontrol
            if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                return file_path
            logger.warning("Recording file not found after 10 seconds: %s", file_path)

        return None

    except Exception as e:
        logger.warning("Failed to stop recording: %s", e)
        return None


# ─── Vorte Voice Agent ───────────────────────────────────────

class VorteVoiceAgent(Agent):
    """Vorte Tekstil sesli AI müşteri temsilcisi."""

    def __init__(self):
        super().__init__(
            instructions=SYSTEM_PROMPT,
        )
        self._session_manager: SessionManager | None = None
        self._call_logger: CallLogger | None = None

    @function_tool()
    async def get_product_info(self, ctx: RunContext, product_name: str) -> str:
        """Vorte ürünleri hakkında bilgi verir."""
        logger.info("Tool: get_product_info(%s)", product_name)
        if self._call_logger:
            self._call_logger.add_topic("ürün bilgisi")
        return await get_product_info(product_name)

    @function_tool()
    async def get_stock_status(self, ctx: RunContext, product_name: str, size: str = "", color: str = "") -> str:
        """Belirli bir ürünün stok durumunu kontrol eder."""
        logger.info("Tool: get_stock_status(%s, %s, %s)", product_name, size, color)
        if self._call_logger:
            self._call_logger.add_topic("stok sorgulama")
        return await get_stock_status(product_name, size or None, color or None)

    @function_tool()
    async def get_size_chart(self, ctx: RunContext, gender: str) -> str:
        """Beden tablosu bilgisi verir."""
        logger.info("Tool: get_size_chart(%s)", gender)
        if self._call_logger:
            self._call_logger.add_topic("beden tablosu")
        return await get_size_chart(gender)

    @function_tool()
    async def get_company_info(self, ctx: RunContext, info_type: str) -> str:
        """Vorte Tekstil şirket bilgileri."""
        logger.info("Tool: get_company_info(%s)", info_type)
        if self._call_logger:
            self._call_logger.add_topic("şirket bilgisi")
        return await get_company_info(info_type)

    @function_tool()
    async def transfer_to_human(self, ctx: RunContext, reason: str) -> str:
        """Müşteriyi insan yetkiliye aktarır. Çözülemeyen konularda veya müşteri talep ettiğinde kullan."""
        logger.info("Tool: transfer_to_human(%s)", reason)
        if self._call_logger:
            self._call_logger.add_topic("çağrı aktarma")

        # Konuşma özetini hazırla
        summary = reason
        if self._call_logger and self._call_logger.topics:
            topics_str = ", ".join(self._call_logger.topics)
            summary = f"{reason} (Konuşulan konular: {topics_str})"

        # Vorte API'ye transfer talebi gönder → FCM push → Android app
        try:
            room_name = ""
            caller_number = "Bilinmeyen"
            call_id = ""
            if self._call_logger:
                room_name = self._call_logger.call_id
                caller_number = self._call_logger.caller_number
                call_id = self._call_logger.call_id

            async with aiohttp.ClientSession() as http:
                resp = await http.post(
                    f"{VORTE_API_URL}/api/admin/voice-calls/transfer",
                    json={
                        "roomName": room_name,
                        "callerNumber": caller_number,
                        "summary": summary,
                        "callId": call_id,
                    },
                    headers={
                        "Content-Type": "application/json",
                        "x-server-api-key": VORTE_API_KEY,
                    },
                    timeout=aiohttp.ClientTimeout(total=10),
                )
                result = await resp.json()

            if result.get("success"):
                logger.info("Transfer FCM gönderildi: %d cihaz", result.get("sentCount", 0))
                return (
                    "Yetkilimize aktarma isteği gönderildi. "
                    "Lütfen hatta kalın, yetkilimiz en kısa sürede bağlanacak. "
                    "Beklediğiniz için teşekkür ederim."
                )
            else:
                error = result.get("error", "Bilinmeyen hata")
                logger.warning("Transfer başarısız: %s", error)
                return (
                    "Şu an yetkilimize ulaşamıyoruz. "
                    "vorte.com.tr/iletisim sayfamızdan bize ulaşabilir "
                    "veya info@vorte.com.tr adresine mail atabilirsiniz. "
                    "Başka bir sorunuz var mı?"
                )

        except Exception as e:
            logger.error("Transfer API hatası: %s", e)
            return (
                "Aktarma sırasında bir sorun oluştu. "
                "vorte.com.tr/iletisim sayfamızdan bize ulaşabilirsiniz. "
                "Başka bir sorunuz var mı?"
            )

    @function_tool()
    async def get_order_status(self, ctx: RunContext, order_number: str) -> str:
        """Sipariş durumunu sorgular."""
        logger.info("Tool: get_order_status(%s)", order_number)
        if self._call_logger:
            self._call_logger.add_topic("sipariş sorgulama")
        return await get_order_status(order_number)

    @function_tool()
    async def get_shipment_info(self, ctx: RunContext, tracking_number: str) -> str:
        """Kargo takip bilgisi verir."""
        logger.info("Tool: get_shipment_info(%s)", tracking_number)
        if self._call_logger:
            self._call_logger.add_topic("kargo takip")
        return await get_shipment_info(tracking_number)

    @function_tool()
    async def get_dealer_orders(self, ctx: RunContext, dealer_code: str, password: str) -> str:
        """Bayi sipariş ve üretim durumunu sorgular."""
        logger.info("Tool: get_dealer_orders(%s)", dealer_code)
        if self._call_logger:
            self._call_logger.add_topic("bayilik")
        return await get_dealer_orders(dealer_code, password)


# ─── Agent Session Entrypoint ────────────────────────────────

async def entrypoint(ctx: agents.JobContext):
    """Called when a new call/room is created by LiveKit SIP bridge."""

    logger.info("New call session: room=%s", ctx.room.name)

    # Extract caller number from room name
    room_name = ctx.room.name or ""
    caller_number = "Bilinmiyor"
    if "vorte-call-" in room_name:
        suffix = room_name.split("vorte-call-")[-1].lstrip("_")
        parts = suffix.split("_")
        if parts and parts[0].isdigit():
            caller_number = parts[0]

    # Create call logger
    call_logger = CallLogger(
        call_id=room_name,
        caller_number=caller_number,
    )
    logger.info("Call logger created: room=%s, caller=%s", room_name, caller_number)

    # Start recording (fire-and-forget, don't block greeting)
    egress_id = None

    async def _start_recording():
        nonlocal egress_id
        await asyncio.sleep(2)  # Biraz bekle, room hazır olsun
        egress_id = await start_room_recording(room_name)
        if egress_id:
            call_logger.audio_path = "/recordings/{}.ogg".format(room_name)

    asyncio.create_task(_start_recording())

    # Create Gemini Realtime model
    gemini_model = google_beta.realtime.RealtimeModel(
        model=GEMINI_MODEL,
        api_key=GEMINI_API_KEY,
        voice=AGENT_VOICE,
        temperature=0.7,
        instructions=SYSTEM_PROMPT,
    )

    # Create agent session
    agent = VorteVoiceAgent()
    agent._call_logger = call_logger
    session = AgentSession(
        llm=gemini_model,
    )

    # Session manager for 15-minute timeout
    async def _on_warning():
        await session.generate_reply(
            user_input="Oturum süresi dolmak üzere. Müşteriye başka sorusu olup olmadığını sor."
        )

    async def _on_timeout():
        await _end_call(session, ctx, call_logger, egress_id, status="timeout")

    session_manager = SessionManager(
        on_warning=_on_warning,
        on_timeout=_on_timeout,
    )

    # Start session
    await session.start(
        room=ctx.room,
        agent=agent,
    )

    # Start session timer
    await session_manager.start()

    # Greet the caller
    await session.generate_reply(
        user_input="Müşteriyi selamla ve kendini tanıt."
    )

    logger.info("Agent session started, greeting sent")

    # ─── Transfer Fallback: Kullanıcı konuşmasını izle ─────────
    # Gemini Native Audio tool çağırmayabilir — konuşma bazlı fallback
    transfer_triggered = False

    TRANSFER_KEYWORDS = [
        "yetkili", "yetkiliye", "müdür", "müdüre",
        "insan", "gerçek kişi", "temsilci",
        "aktarın", "aktarsana", "bağlayın", "bağlar mısın",
        "birini bağla", "birine bağla", "yönlendir",
    ]

    async def _auto_transfer_fallback():
        """AI tool çağırmadığında otomatik transfer tetikle."""
        nonlocal transfer_triggered
        if transfer_triggered:
            return

        # 8 saniye bekle — AI tool çağırabilir
        await asyncio.sleep(8)

        # Tool çağrıldı mı kontrol et
        if "çağrı aktarma" in (call_logger.topics or []):
            logger.info("Transfer tool zaten çağrıldı, fallback iptal")
            return

        transfer_triggered = True
        logger.warning("FALLBACK: Kullanıcı transfer istedi ama AI tool çağırmadı — otomatik transfer!")

        try:
            result = await agent.transfer_to_human(
                ctx=None,
                reason="Müşteri yetkiliye aktarma istedi (otomatik fallback)"
            )
            logger.info("Fallback transfer sonucu: %s", result[:80] if result else "None")
            # AI'a durumu bildir
            await session.generate_reply(
                user_input="Transfer talebi gönderildi. Müşteriye 'Yetkilimize aktarma isteği gönderdim, lütfen hatta kalın' de."
            )
        except Exception as e:
            logger.error("Fallback transfer hatası: %s", e)

    @session.on("user_input_transcribed")
    def on_user_transcribed(ev):
        if not ev.is_final:
            return
        text = (ev.transcript or "").lower().strip()
        if not text:
            return
        logger.info("User transcript: %s", text[:100])

        # Transfer anahtar kelimelerini kontrol et
        if any(kw in text for kw in TRANSFER_KEYWORDS):
            logger.info("Transfer keyword tespit edildi: '%s'", text[:60])
            if not transfer_triggered and "çağrı aktarma" not in (call_logger.topics or []):
                asyncio.create_task(_auto_transfer_fallback())

    # Operatör bağlandığında AI vedalaşıp çıkacak
    async def _handle_operator_joined():
        """Operatör room'a katıldı — AI vedalaşıp ayrılır."""
        logger.info("Operatör bağlandı, AI ayrılıyor...")
        try:
            await session.generate_reply(
                user_input="Yetkilimiz görüşmeye katıldı. Müşteriye kısaca 'Yetkilimiz bağlandı, sizi aktarıyorum. İyi günler dilerim.' de."
            )
            await asyncio.sleep(3)
        except Exception as e:
            logger.warning("AI veda mesajı hatası: %s", e)
        # AI room'dan ayrılır, müşteri ve operatör kalır
        logger.info("AI room'dan ayrılıyor")
        await ctx.room.disconnect()

    # Update caller number and start timer when participant connects
    @ctx.room.on("participant_connected")
    def on_participant_connected(participant, *args):
        identity = participant.identity or ""
        if identity.startswith("sip_"):
            number = identity.replace("sip_", "")
            call_logger.caller_number = number
            call_logger.start_timer()  # Gerçek konuşma süresi burada başlar
            logger.info("Caller connected, timer started: %s", number)
        elif identity.startswith("operator"):
            logger.info("Operator joined: %s", identity)
            asyncio.create_task(_handle_operator_joined())

    # Katılımcı zaten odadaysa (SIP participant session başlamadan önce bağlanmış olabilir)
    for p in ctx.room.remote_participants.values():
        identity = p.identity or ""
        if identity.startswith("sip_"):
            call_logger.caller_number = identity.replace("sip_", "")
            call_logger.start_timer()
            logger.info("Existing SIP participant found, timer started: %s", call_logger.caller_number)
            break

    # Shutdown callback — stop recording + send call log
    @ctx.add_shutdown_callback
    async def on_shutdown():
        logger.info("Job shutdown — stopping recording and sending call log")
        try:
            # Update caller from participants
            for p in ctx.room.remote_participants.values():
                identity = p.identity or ""
                if identity.startswith("sip_"):
                    call_logger.caller_number = identity.replace("sip_", "")
                    break

            # Stop recording — dosyanın yazılmasını bekler (max 10sn)
            if egress_id:
                audio_file = await stop_room_recording(egress_id, room_name)
                if audio_file:
                    call_logger.audio_path = audio_file
                    logger.info("Recording saved: %s", audio_file)
                else:
                    call_logger.audio_path = None  # Docker path gönderme
                    logger.warning("Recording file not available, skipping audio upload")

            # Send call log
            await call_logger.end_call(status="completed")
            logger.info("Call log sent successfully")
        except Exception as e:
            logger.error("Shutdown error: %s", e)


async def _end_call(
    session: AgentSession,
    ctx: agents.JobContext,
    call_logger: CallLogger | None = None,
    egress_id: str | None = None,
    status: str = "completed",
):
    """Gracefully end the call after session timeout."""
    logger.info("Ending call — status=%s", status)
    await session.generate_reply(
        user_input="Oturum süresi doldu. Müşteriye teşekkür et ve vedalaş."
    )
    await asyncio.sleep(3)
    await ctx.room.disconnect()

    # Fire-and-forget: stop recording + send log
    if call_logger:
        room_name = ctx.room.name or ""
        async def _cleanup():
            if egress_id:
                audio_file = await stop_room_recording(egress_id, room_name)
                if audio_file:
                    call_logger.audio_path = audio_file
                else:
                    call_logger.audio_path = None
            await call_logger.end_call(status=status)
        asyncio.create_task(_cleanup())


# ─── Main ────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Starting Vorte Voice AI Agent...")
    logger.info("Model: %s", GEMINI_MODEL)
    logger.info("Voice: %s", AGENT_VOICE)
    logger.info("LiveKit: %s", LIVEKIT_URL)

    # Ensure SIP trunk + dispatch rule exist at startup
    import sys
    sys.path.insert(0, "/app")
    try:
        from scripts.ensure_sip import ensure_sip_setup
        asyncio.run(ensure_sip_setup())
        logger.info("SIP setup verified at startup")
    except Exception as e:
        logger.warning("SIP auto-setup skipped: %s", e)

    # Run the LiveKit agent worker
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
            ws_url=LIVEKIT_URL,
            num_idle_processes=3,  # 6 CPU ile 3 eşzamanlı çağrı desteği
        ),
    )
