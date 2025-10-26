"""Integration tests for idempotency behavior."""
import uuid
import pytest

pytestmark = pytest.mark.asyncio


async def _get_etag(client, headers):
    r = await client.get("/api/v1/users/me", headers=headers)
    assert r.status_code == 200
    return r.headers.get("ETag")


class TestIdempotency:
    async def test_email_change_same_key_returns_same_response(self, client, auth_headers):
        """
        Aynı Idempotency-Key ile aynı email-change isteği 2 kez gönderildiğinde
        aynı yanıt (status/body) dönmeli.
        If-Match gerekli; ETag'i önce alıyoruz.
        """
        etag = await _get_etag(client, auth_headers)
        idem = str(uuid.uuid4())

        payload = {"new_email": f"idemp_{uuid.uuid4().hex[:8]}@example.com"}
        headers = {
            **auth_headers,
            "If-Match": etag,
            "Idempotency-Key": idem,
        }

        r1 = await client.post("/api/v1/users/me/email-change", json=payload, headers=headers)
        # İlk istek 200/409/422 olabilir (iş kurallarına göre); önemli olan 2. isteğin aynı sonucu getirmesi
        r2 = await client.post("/api/v1/users/me/email-change", json=payload, headers=headers)

        assert r1.status_code == r2.status_code
        assert r1.json() == r2.json()
        # ETag dönerse aynı olmalı (cache'den gelen yanıt):
        if "ETag" in r1.headers or "ETag" in r2.headers:
            assert r1.headers.get("ETag") == r2.headers.get("ETag")

    async def test_password_change_same_key_does_not_double_apply(self, client, auth_headers):
        """
        Aynı Idempotency-Key ile aynı password-change isteği tekrarlandığında:
        - Aynı yanıt (status/body) dönmeli
        - Versiyon artışı ikinci kez yaşanmamalı (başarılıysa tek seferlik artmalı)
        Not: current_password yanlış olabilir; yine de idempotency aynı yanıtı döndürür.
        """
        etag_before = await _get_etag(client, auth_headers)
        idem = str(uuid.uuid4())

        payload = {
            # Test ortamında mevcut parolayı bilmeyebiliriz; idempotency yine de doğrulanır.
            "current_password": "wrong-pass",
            "new_password": "NewPassw0rd!",
        }
        headers = {
            **auth_headers,
            "If-Match": etag_before,
            "Idempotency-Key": idem,
        }

        r1 = await client.post("/api/v1/users/me/password", json=payload, headers=headers)
        r2 = await client.post("/api/v1/users/me/password", json=payload, headers=headers)

        assert r1.status_code == r2.status_code
        assert r1.json() == r2.json()

        # Başarılı (200) ise tek versiyon artışı beklenir; cache yanıtı aynı ETag'i taşır.
        # Başarısız (409/422) ise versiyon değişmemiş olmalı.
        etag_after = await _get_etag(client, auth_headers)
        if r1.status_code == 200:
            # 1. yanıttaki ETag varsa, bu ETag ile mevcut profil ETag'i aynı olmalı (tek artış)
            if r1.headers.get("ETag"):
                assert r1.headers["ETag"] == etag_after
        else:
            # Hata halinde versiyon sabit kalır
            assert etag_after == etag_before

    async def test_avatar_upload_url_same_key_returns_same_presigned_url(self, client, auth_headers):
        """
        Aynı Idempotency-Key ile avatar upload-url isteği tekrarlandığında
        aynı upload_url/object_key/expires_at dönmeli.
        """
        idem = str(uuid.uuid4())
        payload = {"content_type": "image/png"}  # geçerli tip
        headers = {**auth_headers, "Idempotency-Key": idem}

        r1 = await client.post("/api/v1/users/me/avatar/upload-url", json=payload, headers=headers)
        r2 = await client.post("/api/v1/users/me/avatar/upload-url", json=payload, headers=headers)

        assert r1.status_code == 200, r1.text
        assert r2.status_code == 200, r2.text

        b1, b2 = r1.json(), r2.json()
        for k in ("upload_url", "object_key", "expires_at"):
            assert b1.get(k) == b2.get(k), f"{k} idempotent değil"

    async def test_account_deletion_same_key_returns_same_job_id(self, client, auth_headers):
        """
        Aynı Idempotency-Key ile iki kez hesap silme çağrısı yapıldığında aynı erasure_job_id dönmeli.
        Not: Bu test dosyasında en sonda koşmalı; kullanıcı silinir. Dosya içi sıra korunur.
        """
        etag = await _get_etag(client, auth_headers)
        idem = str(uuid.uuid4())
        headers = {
            **auth_headers,
            "If-Match": etag,
            "Idempotency-Key": idem,
        }

        r1 = await client.delete("/api/v1/users/me", headers=headers)
        r2 = await client.delete("/api/v1/users/me", headers=headers)

        assert r1.status_code == 202, r1.text
        assert r2.status_code == 202, r2.text

        b1, b2 = r1.json(), r2.json()
        assert b1.get("erasure_job_id") == b2.get("erasure_job_id")
        # Silme durum mesajı da aynı kalmalı
        assert b1.get("status") == b2.get("status")
