# apps/backend/app/services/idempotency.py
from __future__ import annotations

import json
import hashlib
from dataclasses import dataclass
from typing import Any, Dict, Optional
from redis.asyncio import Redis

IDEMP_PREFIX = "idem:payments:"
IDEMP_TTL_SECONDS = 24 * 60 * 60  # 24 saat


@dataclass
class CachedResponse:
    status: int
    headers: Dict[str, str]
    body: Dict[str, Any]


def _hash_params(params: Dict[str, Any]) -> str:
    """
    Param bütünlüğü için deterministik hash (Stripe yaklaşımı: aynı key + aynı paramlar)
    Ref: https://stripe.com/docs/api/idempotent_requests
    """
    raw = json.dumps(params, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class IdempotencyStore:
    """
    Redis-based idempotency store with 24-hour TTL.
    Stores complete HTTP response (status, headers, body) for replay.
    """

    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def get(self, key: str) -> Optional[CachedResponse]:
        """Get cached response for idempotency key"""
        raw = await self.redis.get(IDEMP_PREFIX + key)
        if not raw:
            return None
        data = json.loads(raw)
        return CachedResponse(status=data["status"], headers=data["headers"], body=data["body"])

    async def put(self, key: str, response: CachedResponse, params_fingerprint: str) -> None:
        """Store response with params fingerprint for validation"""
        payload = {
            "status": response.status,
            "headers": response.headers,
            "body": response.body,
            "fp": params_fingerprint,
        }
        await self.redis.set(IDEMP_PREFIX + key, json.dumps(payload), ex=IDEMP_TTL_SECONDS)

    async def reserve(self, key: str, params_fingerprint: str) -> bool:
        """
        Reserve idempotency key (first request wins).
        Returns True if reservation successful, False if already reserved.
        """
        payload = {"fp": params_fingerprint, "status": 202, "headers": {}, "body": {}}
        return await self.redis.set(IDEMP_PREFIX + key, json.dumps(payload), ex=IDEMP_TTL_SECONDS, nx=True)

    async def verify_params(self, key: str, params_fingerprint: str) -> bool:
        """Verify that cached request has same params fingerprint"""
        raw = await self.redis.get(IDEMP_PREFIX + key)
        if not raw:
            return True
        return json.loads(raw).get("fp") == params_fingerprint
