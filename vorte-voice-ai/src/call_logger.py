"""Call Logger — Arama kayitlarini Vorte API'ye gonderir"""
import asyncio
import base64
import logging
import os
from datetime import datetime
from typing import Optional
import httpx
from src.config import VORTE_API_URL, VORTE_API_KEY

logger = logging.getLogger("call-logger")


class CallLogger:
    def __init__(self, call_id: str, caller_number: str = "Bilinmiyor"):
        self.call_id = call_id
        self.caller_number = caller_number
        self.start_time: Optional[datetime] = None  # Participant bağlandığında başlar
        self._created_at = datetime.now()  # Logger oluşturulma zamanı
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
            timeout=30.0,  # Ses dosyası upload için daha uzun timeout
        )
        self._sent = False

    def start_timer(self):
        """Gerçek konuşma süresini başlat (participant bağlandığında çağrılır)"""
        if self.start_time is None:
            self.start_time = datetime.now()
            logger.info("Call timer started")

    def add_message(self, role: str, text: str):
        """Konuşma mesajı ekle"""
        ref_time = self.start_time or self._created_at
        elapsed = (datetime.now() - ref_time).total_seconds()
        minutes = int(elapsed // 60)
        seconds = int(elapsed % 60)
        self.transcript.append({
            "role": role,
            "text": text,
            "time": "{:02d}:{:02d}".format(minutes, seconds)
        })

    def add_topic(self, topic: str):
        """Konuşulan konu ekle"""
        self.topics.add(topic)

    async def end_call(self, status: str = "completed", summary: str = None, sentiment: str = None):
        """Çağrıyı bitir ve Vorte API'ye gönder (ses dosyası dahil)"""
        if self._sent:
            logger.info("Call log already sent, skipping")
            return
        self._sent = True
        self.end_time = datetime.now()

        # Süre hesabı: start_time yoksa created_at kullan
        ref_time = self.start_time or self._created_at
        duration = int((self.end_time - ref_time).total_seconds())

        # Ses dosyasını oku ve base64 encode et
        audio_base64 = None
        audio_filename = None
        if self.audio_path and os.path.exists(self.audio_path):
            try:
                with open(self.audio_path, "rb") as f:
                    audio_data = f.read()
                audio_base64 = base64.b64encode(audio_data).decode("utf-8")
                audio_filename = os.path.basename(self.audio_path)
                size_kb = len(audio_data) / 1024
                logger.info("Audio file read: %s (%.1f KB)", audio_filename, size_kb)
            except Exception as e:
                logger.warning("Failed to read audio file: %s", e)

        payload = {
            "callId": self.call_id,
            "callerNumber": self.caller_number,
            "callDirection": "inbound",
            "status": status,
            "startedAt": ref_time.isoformat(),
            "endedAt": self.end_time.isoformat(),
            "durationSeconds": duration,
            "topics": list(self.topics),
            "summary": summary,
            "sentiment": sentiment or "neutral",
            "transcript": self.transcript,
            "audioUrl": self.audio_path,
            "audioBase64": audio_base64,
            "audioFilename": audio_filename,
        }

        try:
            resp = await self._client.post("/api/admin/voice-calls", json=payload)
            if resp.status_code in (200, 201):
                logger.info("Call log sent: %s (%ds)", self.call_id, duration)
            else:
                logger.error("Call log failed: %d %s", resp.status_code, resp.text)
        except Exception as e:
            logger.error("Call log error: %s", e)
        finally:
            await self._client.aclose()
