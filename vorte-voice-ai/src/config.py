"""Vorte Voice AI — Configuration"""

import os
from dotenv import load_dotenv

load_dotenv()


# ─── Gemini AI ───────────────────────────────────────────────
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"

# ─── LiveKit ─────────────────────────────────────────────────
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "ws://localhost:7880")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "secret")

# ─── Vorte API ───────────────────────────────────────────────
VORTE_API_URL = os.getenv("VORTE_API_URL", "https://www.vorte.com.tr")
VORTE_API_KEY = os.getenv("VORTE_API_KEY", "")

# ─── Agent Settings ──────────────────────────────────────────
AGENT_VOICE = os.getenv("AGENT_VOICE", "Kore")
SESSION_TIMEOUT_MINUTES = int(os.getenv("SESSION_TIMEOUT_MINUTES", "15"))
TRANSFER_PHONE = os.getenv("TRANSFER_PHONE", "+905376220694")

# ─── Notification ────────────────────────────────────────────
NOTIFICATION_EMAIL = os.getenv("NOTIFICATION_EMAIL", "vortekurumsal@gmail.com")

# ─── Netgsm (Phase 2 — SMS OTP) ─────────────────────────────
NETGSM_USERCODE = os.getenv("NETGSM_USERCODE", "")
NETGSM_PASSWORD = os.getenv("NETGSM_PASSWORD", "")
NETGSM_MSGHEADER = os.getenv("NETGSM_MSGHEADER", "VORTE")
