"""Vorte Voice AI — Session Manager (15dk Gemini Live API limit)"""

import asyncio
import logging
from src.config import SESSION_TIMEOUT_MINUTES

logger = logging.getLogger("vorte-voice-ai.session")

# Session timeout thresholds
WARNING_MINUTES = SESSION_TIMEOUT_MINUTES - 3      # 12. dakikada uyarı
GOODBYE_MINUTES = SESSION_TIMEOUT_MINUTES - 0.5    # 14.5. dakikada kapat


class SessionManager:
    """Manages call session timeouts for Gemini Live API 15-minute limit."""

    def __init__(self, on_warning=None, on_timeout=None):
        self._on_warning = on_warning      # async callback: uyarı mesajı gönder
        self._on_timeout = on_timeout      # async callback: çağrıyı kapat
        self._task: asyncio.Task | None = None
        self._started = False

    async def start(self):
        """Start session timer."""
        if self._started:
            return
        self._started = True
        self._task = asyncio.create_task(self._run_timer())
        logger.info(f"Session timer started ({SESSION_TIMEOUT_MINUTES} min limit)")

    async def stop(self):
        """Cancel session timer."""
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._started = False
        logger.info("Session timer stopped")

    async def _run_timer(self):
        """Timer loop: warning at 12min, goodbye at 14.5min."""
        try:
            # Wait until warning threshold
            await asyncio.sleep(WARNING_MINUTES * 60)
            logger.info(f"Session warning at {WARNING_MINUTES} minutes")
            if self._on_warning:
                await self._on_warning()

            # Wait until goodbye threshold
            remaining = (GOODBYE_MINUTES - WARNING_MINUTES) * 60
            await asyncio.sleep(remaining)
            logger.info(f"Session timeout at {GOODBYE_MINUTES} minutes")
            if self._on_timeout:
                await self._on_timeout()

        except asyncio.CancelledError:
            logger.debug("Session timer cancelled (call ended normally)")
