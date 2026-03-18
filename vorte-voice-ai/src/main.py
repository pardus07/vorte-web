"""
Vorte Voice AI — Main Entry Point

LiveKit SIP Bridge → Pipecat Agent → Gemini 2.5 Flash Native Audio
Telefon üzerinden 7/24 sesli AI müşteri hizmeti.
"""

import asyncio
import json
import logging

from livekit import agents, rtc
from livekit.agents import (
    AgentSession,
    Agent,
    RoomInputOptions,
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

    # ── Product Tools ──

    @function_tool()
    async def get_product_info(self, ctx: RunContext, product_name: str) -> str:
        """Vorte ürünleri hakkında bilgi verir. Ürün adı, fiyat, renkler, bedenler."""
        logger.info(f"Tool: get_product_info({product_name})")
        return await get_product_info(product_name)

    @function_tool()
    async def get_stock_status(
        self, ctx: RunContext, product_name: str, size: str = "", color: str = ""
    ) -> str:
        """Belirli bir ürünün stok durumunu kontrol eder."""
        logger.info(f"Tool: get_stock_status({product_name}, {size}, {color})")
        return await get_stock_status(product_name, size or None, color or None)

    @function_tool()
    async def get_size_chart(self, ctx: RunContext, gender: str) -> str:
        """Beden tablosu bilgisi verir. Erkek veya kadın için S-XXL beden ölçüleri."""
        logger.info(f"Tool: get_size_chart({gender})")
        return await get_size_chart(gender)

    # ── Company Tools ──

    @function_tool()
    async def get_company_info(self, ctx: RunContext, info_type: str) -> str:
        """Vorte Tekstil şirket bilgileri: çalışma saatleri, adres, telefon, e-posta."""
        logger.info(f"Tool: get_company_info({info_type})")
        return await get_company_info(info_type)

    @function_tool()
    async def transfer_to_human(self, ctx: RunContext, reason: str) -> str:
        """Müşteriyi insan temsilciye bağlar."""
        logger.info(f"Tool: transfer_to_human({reason})")
        # TODO: LiveKit TransferSIPParticipant API ile gerçek transfer
        # Şimdilik bilgi ver
        return (
            f"Sizi yetkili arkadaşımıza bağlıyorum. "
            f"Bağlantı sağlanamazsa 0537 622 06 94 numarasını arayabilirsiniz. "
            f"İyi günler dilerim."
        )

    # ── Order Tools (Phase 2) ──

    @function_tool()
    async def get_order_status(self, ctx: RunContext, order_number: str) -> str:
        """Sipariş durumunu sorgular. Sipariş numarası gerekli (VRT-XXXXXX-XXXX)."""
        logger.info(f"Tool: get_order_status({order_number})")
        return await get_order_status(order_number)

    @function_tool()
    async def get_shipment_info(self, ctx: RunContext, tracking_number: str) -> str:
        """Kargo takip bilgisi verir."""
        logger.info(f"Tool: get_shipment_info({tracking_number})")
        return await get_shipment_info(tracking_number)

    # ── Dealer Tools (Phase 2) ──

    @function_tool()
    async def get_dealer_orders(
        self, ctx: RunContext, dealer_code: str, password: str
    ) -> str:
        """Bayi sipariş ve üretim durumunu sorgular. Bayi kodu ve şifre gerekli."""
        logger.info(f"Tool: get_dealer_orders({dealer_code})")
        return await get_dealer_orders(dealer_code, password)


# ─── Agent Session Entrypoint ────────────────────────────────

async def entrypoint(ctx: agents.JobContext):
    """Called when a new call/room is created by LiveKit SIP bridge."""

    logger.info(f"New call session: room={ctx.room.name}")

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
    session = AgentSession(
        llm=gemini_model,
    )

    # Session manager for 15-minute timeout
    session_manager = SessionManager(
        on_warning=lambda: session.say(
            "Başka sorunuz var mı? Yardımcı olabileceğim bir konu kaldıysa buyurun."
        ),
        on_timeout=lambda: _end_call(session, ctx),
    )

    # Start session
    await session.start(
        room=ctx.room,
        agent=agent,
    )

    # Start session timer
    await session_manager.start()

    # Greet the caller
    await session.say(
        "Vorte Tekstil'e hoş geldiniz, ben Vorte Asistan. Size nasıl yardımcı olabilirim?"
    )

    logger.info("Agent session started, greeting sent")


async def _end_call(session: AgentSession, ctx: agents.JobContext):
    """Gracefully end the call after session timeout."""
    logger.info("Session timeout — ending call")
    await session.say(
        "Görüşmemiz sona eriyor. Tekrar aramaktan çekinmeyin. İyi günler dilerim!"
    )
    # Brief pause for TTS to finish
    await asyncio.sleep(3)
    # Disconnect all participants
    await ctx.room.disconnect()


# ─── Main ────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Starting Vorte Voice AI Agent...")
    logger.info(f"Model: {GEMINI_MODEL}")
    logger.info(f"Voice: {AGENT_VOICE}")
    logger.info(f"LiveKit: {LIVEKIT_URL}")

    # Run the LiveKit agent worker
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
            ws_url=LIVEKIT_URL,
        ),
    )
