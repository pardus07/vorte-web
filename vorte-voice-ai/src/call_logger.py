"""Call Logger — Arama kayitlarini Vorte API'ye gonderir"""
import asyncio
import logging
from datetime import datetime
from typing import Optional
import httpx
from src.config import VORTE_API_URL, VORTE_API_KEY

logger = logging.getLogger("call-logger")


class CallLogger:
    def __init__(self, call_id: str, caller_number: str = "Bilinmiyor"):
        self.call_id = call_id
        self.caller_number = caller_number
        self.start_time = datetime.now()
        self.end_time: Optional[datetime] = None
        self.transcript: list[dict] = []
        self.topics: set[str] = set()
        self.audio_path: Optional[str] = None
        headers = {"X-Voice-AI-Source": "vorte-voice-ai"}
        if VORTE_API_KEY:
            headers["X-Server-Api-Key"] = VORTE_API_KEY
        self._client = httpx.AsyncClient(
            base_url=VORTE_API_URL,
            headers=headers,
            timeout=15.0,
        )
        self._sent = False  # Prevent double-send

    def add_message(self, role: str, text: str):
        """Konusma mesaji ekle (role: 'assistant' veya 'caller')"""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        minutes = int(elapsed // 60)
        seconds = int(elapsed % 60)
        self.transcript.append({
            "role": role,
            "text": text,
            "time": f"{minutes:02d}:{seconds:02d}"
        })

    def add_topic(self, topic: str):
        """Konusulan konu ekle"""
        self.topics.add(topic)

    async def end_call(self, status: str = "completed", summary: str = None, sentiment: str = None):
        """Cagriyi bitir ve Vorte API'ye gonder"""
        if self._sent:
            logger.info("Call log already sent, skipping")
            return
        self._sent = True
        self.end_time = datetime.now()
        duration = int((self.end_time - self.start_time).total_seconds())

        payload = {
            "callId": self.call_id,
            "callerNumber": self.caller_number,
            "callDirection": "inbound",
            "status": status,
            "startedAt": self.start_time.isoformat(),
            "endedAt": self.end_time.isoformat(),
            "durationSeconds": duration,
            "topics": list(self.topics),
            "summary": summary,
            "sentiment": sentiment or "neutral",
            "transcript": self.transcript,
            "audioUrl": self.audio_path,
        }

        try:
            resp = await self._client.post("/api/admin/voice-calls", json=payload)
            if resp.status_code in (200, 201):
                logger.info(f"Call log sent: {self.call_id} ({duration}s)")
            else:
                logger.error(f"Call log failed: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"Call log error: {e}")
        finally:
            await self._client.aclose()
