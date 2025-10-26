"""Integration tests for concurrency control with ETags."""
import asyncio
import uuid
import httpx
import pytest

pytestmark = pytest.mark.asyncio


async def _get_etag(client, headers):
    r = await client.get("/api/v1/users/me", headers=headers)
    assert r.status_code == 200
    return r.headers.get("ETag")


class TestConcurrencyControl:
    async def test_profile_update_concurrent_conflict(self, client, auth_headers):
        """
        Aynı ETag ile eşzamanlı iki PATCH isteği gönderildiğinde
        isteklerden biri 200, diğeri 409 dönmeli (optimistic locking).
        """
        etag = await _get_etag(client, auth_headers)

        payload1 = {"first_name": f"U{uuid.uuid4().hex[:6]}", "last_name": "A"}
        payload2 = {"first_name": f"V{uuid.uuid4().hex[:6]}", "last_name": "B"}

        h1 = {**auth_headers, "If-Match": etag, "Idempotency-Key": str(uuid.uuid4())}
        h2 = {**auth_headers, "If-Match": etag, "Idempotency-Key": str(uuid.uuid4())}

        async def do_patch(p, h):
            return await client.patch("/api/v1/users/me", json=p, headers=h)

        r1, r2 = await asyncio.gather(
            do_patch(payload1, h1),
            do_patch(payload2, h2),
        )

        codes = sorted([r1.status_code, r2.status_code])
        # Beklenen: [200, 409]
        assert codes[0] == 200 and codes[1] == 409, f"Unexpected codes: {codes}"

    async def test_avatar_confirm_concurrent_conflict(self, client, auth_headers):
        """
        Aynı ETag ile eşzamanlı iki avatar confirm çağrısında
        biri 200, diğeri 409 dönmeli.
        Test, MinIO'ya gerçek PUT yapar; MinIO erişilemezse skip eder.
        """
        # 1) Presigned URL al
        try:
            headers_url = {**auth_headers, "Idempotency-Key": str(uuid.uuid4())}
            r = await client.post(
                "/api/v1/users/me/avatar/upload-url",
                json={"content_type": "image/png"},
                headers=headers_url,
            )
            if r.status_code != 200:
                pytest.skip(f"upload-url not 200 (got {r.status_code}): {r.text}")
            body = r.json()
            upload_url = body["upload_url"]
            object_key = body["object_key"]
        except Exception as e:
            pytest.skip(f"cannot get presigned url: {e}")

        # 2) Presigned URL'e küçük bir PNG bytes PUT et
        try:
            async with httpx.AsyncClient(timeout=10) as ext:
                put_r = await ext.put(
                    upload_url,
                    content=b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"0" * 256,
                    headers={"Content-Type": "image/png"},
                )
                if put_r.status_code not in (200, 204):
                    pytest.skip(f"PUT to MinIO failed: {put_r.status_code} {put_r.text}")
        except Exception as e:
            pytest.skip(f"PUT presigned failed: {e}")

        # 3) Aynı ETag ile iki confirm çağrısını paralel yap
        etag = await _get_etag(client, auth_headers)
        payload = {"object_key": object_key}
        h1 = {**auth_headers, "If-Match": etag, "Idempotency-Key": str(uuid.uuid4())}
        h2 = {**auth_headers, "If-Match": etag, "Idempotency-Key": str(uuid.uuid4())}

        async def do_confirm(h):
            return await client.post("/api/v1/users/me/avatar/confirm", json=payload, headers=h)

        r1, r2 = await asyncio.gather(do_confirm(h1), do_confirm(h2))
        codes = sorted([r1.status_code, r2.status_code])
        assert codes[0] == 200 and codes[1] == 409, f"Unexpected codes: {codes} / {r1.text} / {r2.text}"

    async def test_avatar_delete_concurrent_conflict(self, client, auth_headers):
        """
        Aynı ETag ile eşzamanlı iki DELETE avatar çağrısında
        biri 200, diğeri 409 dönmeli.
        Avatar yoksa önce upload+confirm ile oluşturulur; MinIO yoksa skip edilir.
        """

        async def ensure_avatar():
            # Eğer mevcut avatar yoksa oluştur.
            info = await client.get("/api/v1/users/me", headers=auth_headers)
            assert info.status_code == 200
            has_avatar = info.json().get("avatar_url")
            if has_avatar:
                return

            # upload-url al + PUT + confirm
            headers_url = {**auth_headers, "Idempotency-Key": str(uuid.uuid4())}
            r = await client.post(
                "/api/v1/users/me/avatar/upload-url",
                json={"content_type": "image/png"},
                headers=headers_url,
            )
            if r.status_code != 200:
                pytest.skip(f"upload-url not 200 (got {r.status_code}): {r.text}")
            body = r.json()
            upload_url = body["upload_url"]
            object_key = body["object_key"]

            try:
                async with httpx.AsyncClient(timeout=10) as ext:
                    put_r = await ext.put(
                        upload_url,
                        content=b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"1" * 256,
                        headers={"Content-Type": "image/png"},
                    )
                    if put_r.status_code not in (200, 204):
                        pytest.skip(f"PUT to MinIO failed: {put_r.status_code} {put_r.text}")
            except Exception as e:
                pytest.skip(f"PUT presigned failed: {e}")

            etag_local = await _get_etag(client, auth_headers)
            headers_confirm = {
                **auth_headers,
                "If-Match": etag_local,
                "Idempotency-Key": str(uuid.uuid4()),
            }
            c = await client.post(
                "/api/v1/users/me/avatar/confirm",
                json={"object_key": object_key},
                headers=headers_confirm,
            )
            if c.status_code != 200:
                pytest.skip(f"confirm failed: {c.status_code} {c.text}")

        # Avatarı garanti et
        await ensure_avatar()

        # Aynı ETag ile iki eşzamanlı silme isteği
        etag = await _get_etag(client, auth_headers)
        h1 = {**auth_headers, "If-Match": etag, "Idempotency-Key": str(uuid.uuid4())}
        h2 = {**auth_headers, "If-Match": etag, "Idempotency-Key": str(uuid.uuid4())}

        async def do_delete(h):
            return await client.delete("/api/v1/users/me/avatar", headers=h)

        r1, r2 = await asyncio.gather(do_delete(h1), do_delete(h2))
        codes = sorted([r1.status_code, r2.status_code])
        assert codes[0] == 200 and codes[1] == 409, f"Unexpected codes: {codes} / {r1.text} / {r2.text}"
