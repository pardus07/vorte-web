"""
Vorte Voice AI — Main Entry Point

LiveKit SIP Bridge → Pipecat Agent → Gemini 2.5 Flash Native Audio
Telefon üzerinden 7/24 sesli AI müşteri hizmeti.
"""

import asyncio
import logging

from livekit import agents, api as lkapi
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


# ─── Vorte Voice Agent ───────────────────────────────────────

class VorteVoiceAgent(Agent):
    """Vorte Tekstil sesli AI müşteri temsilcisi."""

    def __init__(self):
        super().__init__(
            instructions=SYSTEM_PROMPT,
        )
        self._session_manager: SessionManager | None = None
        self._call_logger: CallLogger | None = None

    # ── Product Tools ──

    @function_tool()
    async def get_product_info(self, ctx: RunContext, product_name: str) -> str:
        """Vorte ürünleri hakkında bilgi verir. Ürün adı, fiyat, renkler, bedenler."""
        logger.info(f"Tool: get_product_info({product_name})")
        if self._call_logger:
            self._call_logger.add_topic("ürün bilgisi")
        return await get_product_info(product_name)

    @function_tool()
    async def get_stock_status(
        self, ctx: RunContext, product_name: str, size: str = "", color: str = ""
    ) -> str:
        """Belirli bir ürünün stok durumunu kontrol eder."""
        logger.info(f"Tool: get_stock_status({product_name}, {size}, {color})")
        if self._call_logger:
            self._call_logger.add_topic("stok sorgulama")
        return await get_stock_status(product_name, size or None, color or None)

    @function_tool()
    async def get_size_chart(self, ctx: RunContext, gender: str) -> str:
        """Beden tablosu bilgisi verir. Erkek veya kadın için S-XXL beden ölçüleri."""
        logger.info(f"Tool: get_size_chart({gender})")
        if self._call_logger:
            self._call_logger.add_topic("beden tablosu")
        return await get_size_chart(gender)

    # ── Company Tools ──

    @function_tool()
    async def get_company_info(self, ctx: RunContext, info_type: str) -> str:
        """Vorte Tekstil şirket bilgileri: çalışma saatleri, adres, telefon, e-posta."""
        logger.info(f"Tool: get_company_info({info_type})")
        if self._call_logger:
            self._call_logger.add_topic("şirket bilgisi")
        return await get_company_info(info_type)

    @function_tool()
    async def transfer_to_human(self, ctx: RunContext, reason: str) -> str:
        """Müşteriyi web sitesine veya e-postaya yönlendirir. Çağrı transferi yapmaz."""
        logger.info(f"Tool: transfer_to_human({reason})")
        if self._call_logger:
            self._call_logger.add_topic("insan temsilciye yönlendirme")
        return (
            f"Bu konuda size en iyi şekilde yardımcı olabilmemiz için "
            f"vorte.com.tr/iletisim sayfamızı ziyaret edebilir veya "
            f"info@vorte.com.tr adresine mail atabilirsiniz. "
            f"Başka bir sorunuz var mı?"
        )

    # ── Order Tools (Phase 2) ──

    @function_tool()
    async def get_order_status(self, ctx: RunContext, order_number: str) -> str:
        """Sipariş durumunu sorgular. Sipariş numarası gerekli (VRT-XXXXXX-XXXX)."""
        logger.info(f"Tool: get_order_status({order_number})")
        if self._call_logger:
            self._call_logger.add_topic("sipariş sorgulama")
        return await get_order_status(order_number)

    @function_tool()
    async def get_shipment_info(self, ctx: RunContext, tracking_number: str) -> str:
        """Kargo takip bilgisi verir."""
        logger.info(f"Tool: get_shipment_info({tracking_number})")
        if self._call_logger:
            self._call_logger.add_topic("kargo takip")
        return await get_shipment_info(tracking_number)

    # ── Dealer Tools (Phase 2) ──

    @function_tool()
    async def get_dealer_orders(
        self, ctx: RunContext, dealer_code: str, password: str
    ) -> str:
        """Bayi sipariş ve üretim durumunu sorgular. Bayi kodu ve şifre gerekli."""
        logger.info(f"Tool: get_dealer_orders({dealer_code})")
        if self._call_logger:
            self._call_logger.add_topic("bayilik")
        return await get_dealer_orders(dealer_code, password)


# ─── Agent Session Entrypoint ────────────────────────────────

async def entrypoint(ctx: agents.JobContext):
    """Called when a new call/room is created by LiveKit SIP bridge."""

    logger.info(f"New call session: room={ctx.room.name}")

    # Extract caller number from room name
    # Room format: vorte-call-_05427313425_JP54G7F8VrL6
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
    logger.info(f"Call logger created: room={room_name}, caller={caller_number}")

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

    # Session manager for 15-minute timeout — explicit async callbacks
    async def _on_warning():
        await session.generate_reply(
            user_input="Oturum süresi dolmak üzere. Müşteriye başka sorusu olup olmadığını sor."
        )

    async def _on_timeout():
        await _end_call(session, ctx, call_logger, status="timeout")

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

    # Start audio recording via LiveKit Egress
    egress_id = None
    try:
        lk_api = lkapi.LiveKitAPI(
            url=LIVEKIT_URL.replace("ws://", "http://").replace("wss://", "https://"),
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
        )
        from livekit.protocol.egress import RoomCompositeEgressRequest, EncodedFileOutput, EncodedFileType
        recording_path = f"/recordings/{room_name}.ogg"
        egress_req = RoomCompositeEgressRequest(
            room_name=room_name,
            file_outputs=[EncodedFileOutput(
                file_type=EncodedFileType.OGG,
                filepath=recording_path,
            )],
            audio_only=True,
        )
        egress_result = await lk_api.egress.start_room_composite_egress(egress_req)
        egress_id = egress_result.egress_id
        call_logger.audio_path = recording_path
        logger.info(f"Recording started: {egress_id} -> {recording_path}")
        await lk_api.aclose()
    except Exception as e:
        logger.warning(f"Recording not available: {e}")

    # Update caller number from participant identity when they connect
    @ctx.room.on("participant_connected")
    def on_participant_connected(participant, *args):
        identity = participant.identity or ""
        if identity.startswith("sip_"):
            number = identity.replace("sip_", "")
            call_logger.caller_number = number
            logger.info(f"Caller number updated from participant: {number}")

    # Wait for session to end (participant disconnect triggers this)
    # The entrypoint function stays alive until the job ends
    # Use shutdown callback to send call log
    @ctx.add_shutdown_callback
    async def on_shutdown():
        logger.info("Job shutdown — sending call log")
        try:
            # Update caller from participants one more time
            for p in ctx.room.remote_participants.values():
                identity = p.identity or ""
                if identity.startswith("sip_"):
                    call_logger.caller_number = identity.replace("sip_", "")
                    break
            await call_logger.end_call(status="completed")
            logger.info("Call log sent successfully")
        except Exception as e:
            logger.error(f"Failed to send call log: {e}")


async def _end_call(
    session: AgentSession,
    ctx: agents.JobContext,
    call_logger: CallLogger | None = None,
    status: str = "completed",
):
    """Gracefully end the call after session timeout."""
    logger.info(f"Ending call — status={status}")
    await session.generate_reply(
        user_input="Oturum süresi doldu. Müşteriye teşekkür et ve vedalaş."
    )
    # Brief pause for TTS to finish
    await asyncio.sleep(3)

    # Disconnect first, then send log in background (don't block new calls)
    await ctx.room.disconnect()

    # Fire-and-forget: send call log to Vorte API after disconnect
    if call_logger:
        asyncio.create_task(call_logger.end_call(status=status))


# ─── Main ────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Starting Vorte Voice AI Agent...")
    logger.info(f"Model: {GEMINI_MODEL}")
    logger.info(f"Voice: {AGENT_VOICE}")
    logger.info(f"LiveKit: {LIVEKIT_URL}")

    # Ensure SIP trunk + dispatch rule exist at startup
    import sys
    sys.path.insert(0, "/app")
    try:
        from scripts.ensure_sip import ensure_sip_setup
        asyncio.run(ensure_sip_setup())
        logger.info("SIP setup verified at startup")
    except Exception as e:
        logger.warning(f"SIP auto-setup skipped: {e}")

    # Run the LiveKit agent worker
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
            ws_url=LIVEKIT_URL,
            num_idle_processes=1,  # Sunucu kaynağı sınırlı, 1 yeterli
        ),
    )
