"""Integration tests for rate limiting behavior."""
import asyncio
import uuid
import pytest

# Bu testler aşağıdaki varsayımlarla yazıldı:
# - conftest.py içinde `client` (httpx.AsyncClient) ve `auth_headers` (dict) fixture'ları var.
# - auth_headers, Authorization: Bearer <token> içeriyor.
# - ETag gereken uçlarda, önce GET /api/v1/users/me ile ETag alınacak.

pytestmark = pytest.mark.asyncio


async def _get_etag(client, headers):
    r = await client.get("/api/v1/users/me", headers=headers)
    assert r.status_code == 200
    return r.headers.get("ETag")


async def _retry_after_seconds(resp):
    ra = resp.headers.get("Retry-After")
    assert ra is not None, "Retry-After header bekleniyordu"
    try:
        return int(ra)
    except Exception:
        pytest.fail(f"Retry-After integer olmalı, gelen: {ra}")


class TestRateLimiting:
    async def test_password_change_3_in_10m_limit(self, client, auth_headers):
        """
        3/10dk limit: 4. istek 429 dönmeli ve Retry-After olmalı
        """
        # If-Match (ETag) gerekli
        etag = await _get_etag(client, auth_headers)

        async def req():
            # Her çağrıda farklı Idempotency-Key kullan ki idempotency rate-limit'i maskelemesin
            headers = {
                **auth_headers,
                "If-Match": etag,
                "Idempotency-Key": str(uuid.uuid4()),
            }
            payload = {"current_password": "wrong-pass", "new_password": "NewPassw0rd!"}
            return await client.post("/api/v1/users/me/password", json=payload, headers=headers)

        # Aynı 10 dk penceresinde 3 deneme izinli; 4. 429
        r1 = await req()
        r2 = await req()
        r3 = await req()
        r4 = await req()

        # İlk üçü validasyon (409/422) dönebilir; önemli olan 4.'ün 429 olması
        assert r4.status_code == 429, f"4. istekte 429 bekleniyordu, geldi: {r4.status_code}"
        await _retry_after_seconds(r4)

    async def test_avatar_upload_url_5_in_10m_limit(self, client, auth_headers):
        """
        5/10dk limit: 6. istek 429 ve Retry-After olmalı
        """
        async def req():
            headers = {
                **auth_headers,
                "Idempotency-Key": str(uuid.uuid4()),
            }
            payload = {"content_type": "image/png"}  # geçerli bir content-type
            return await client.post("/api/v1/users/me/avatar/upload-url", json=payload, headers=headers)

        rs = []
        for _ in range(5):
            rs.append(await req())
        r6 = await req()

        assert r6.status_code == 429, f"6. istekte 429 bekleniyordu, geldi: {r6.status_code}"
        await _retry_after_seconds(r6)

    async def test_email_change_3_in_1h_limit(self, client, auth_headers):
        """
        3/saat limit: 4. istek 429 ve Retry-After olmalı
        Email change request If-Match gerektirir; önce ETag alıyoruz.
        """
        etag = await _get_etag(client, auth_headers)

        async def req(ix):
            headers = {
                **auth_headers,
                "If-Match": etag,
                "Idempotency-Key": str(uuid.uuid4()),
            }
            payload = {"new_email": f"rate{ix}@example.com"}
            return await client.post("/api/v1/users/me/email-change", json=payload, headers=headers)

        r1 = await req(1)
        r2 = await req(2)
        r3 = await req(3)
        r4 = await req(4)

        assert r4.status_code == 429, f"4. istekte 429 bekleniyordu, geldi: {r4.status_code}"
        await _retry_after_seconds(r4)
