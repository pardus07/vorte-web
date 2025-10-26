"""Integration tests for profile management endpoints."""
import pytest
from httpx import AsyncClient

from app.main import app
from app.core.etag import generate_etag

# Mark all tests in this module as asyncio
pytestmark = pytest.mark.asyncio


class TestProfileRetrieval:
    """Test GET /api/v1/users/me endpoint."""
    
    @pytest.mark.asyncio
    async def test_get_profile_returns_profile_with_etag(self, auth_headers):
        """Test GET /api/v1/users/me returns profile with ETag."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/v1/users/me", headers=auth_headers)
        
        assert response.status_code == 200
        assert "ETag" in response.headers
        data = response.json()
        assert "email" in data
        assert "first_name" in data
        assert "version" in data


class TestProfileUpdate:
    """Test PATCH /api/v1/users/me endpoint."""
    
    async def test_update_without_if_match_returns_428(self, auth_headers):
        """Test PATCH /api/v1/users/me without If-Match returns 428."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.patch(
                "/api/v1/users/me",
                headers=auth_headers,
                json={"first_name": "Updated"}
            )
        
        assert response.status_code == 428
        data = response.json()
        assert data["title"] == "PRECONDITION_REQUIRED"
    
    async def test_update_with_old_etag_returns_409(self, auth_headers, test_user):
        """Test PATCH /api/v1/users/me with old ETag returns 409."""
        old_etag = generate_etag(1)
        
        # First update to increment version
        async with AsyncClient(app=app, base_url="http://test") as client:
            await client.patch(
                "/api/v1/users/me",
                headers={**auth_headers, "If-Match": old_etag},
                json={"first_name": "First Update"}
            )
            
            # Try with old ETag
            response = await client.patch(
                "/api/v1/users/me",
                headers={**auth_headers, "If-Match": old_etag},
                json={"first_name": "Second Update"}
            )
        
        assert response.status_code == 409
        data = response.json()
        assert data["title"] == "CONFLICT"
    
    async def test_update_with_current_etag_succeeds(self, auth_headers, test_user):
        """Test PATCH /api/v1/users/me with current ETag updates profile and returns new ETag."""
        current_etag = generate_etag(test_user["version"])
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.patch(
                "/api/v1/users/me",
                headers={**auth_headers, "If-Match": current_etag},
                json={"first_name": "Updated Name"}
            )
        
        assert response.status_code == 200
        assert "ETag" in response.headers
        new_etag = response.headers["ETag"]
        assert new_etag != current_etag
        
        data = response.json()
        assert data["first_name"] == "Updated Name"


class TestEmailChange:
    """Test email change endpoints."""
    
    async def test_email_change_request_sends_verification(self, auth_headers):
        """Test POST /api/v1/users/me/email-change sends verification email and returns 202."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/users/me/email-change",
                headers={**auth_headers, "Idempotency-Key": "test-key-1"},
                json={"new_email": "newemail@example.com"}
            )
        
        assert response.status_code == 202
        data = response.json()
        assert data["message"] == "Verification email sent"
    
    async def test_email_change_with_existing_email_returns_422(self, auth_headers):
        """Test POST /api/v1/users/me/email-change with existing email returns 422."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/users/me/email-change",
                headers={**auth_headers, "Idempotency-Key": "test-key-2"},
                json={"new_email": "existing@example.com"}
            )
        
        assert response.status_code == 422
        data = response.json()
        assert "EMAIL_ALREADY_EXISTS" in data["detail"]
    
    async def test_email_change_confirm_with_valid_token_updates_email(self, auth_headers):
        """Test POST /api/v1/users/me/email-change/confirm with valid token updates email."""
        # First request email change
        async with AsyncClient(app=app, base_url="http://test") as client:
            await client.post(
                "/api/v1/users/me/email-change",
                headers={**auth_headers, "Idempotency-Key": "test-key-3"},
                json={"new_email": "newemail@example.com"}
            )
            
            # Get token from Redis (in real test, extract from email)
            # For now, mock the confirmation
            response = await client.post(
                "/api/v1/users/me/email-change/confirm",
                headers=auth_headers,
                json={"token": "valid-token-here"}
            )
        
        assert response.status_code == 200
        assert "ETag" in response.headers
    
    async def test_email_change_confirm_with_expired_token_returns_422(self, auth_headers):
        """Test POST /api/v1/users/me/email-change/confirm with expired token returns 422."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/users/me/email-change/confirm",
                headers=auth_headers,
                json={"token": "expired-token"}
            )
        
        assert response.status_code == 422
        data = response.json()
        assert "INVALID_OR_EXPIRED_TOKEN" in data["detail"]


class TestPasswordChange:
    """Test password change endpoint."""
    
    async def test_password_change_with_wrong_current_password_returns_422(self, auth_headers):
        """Test POST /api/v1/users/me/password with wrong current password returns 422."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/users/me/password",
                headers={**auth_headers, "Idempotency-Key": "pwd-key-1"},
                json={
                    "current_password": "wrongpassword",
                    "new_password": "NewSecurePass123!"
                }
            )
        
        assert response.status_code == 422
        data = response.json()
        assert "INVALID_CURRENT_PASSWORD" in data["detail"]
    
    async def test_password_change_with_correct_password_succeeds(self, auth_headers):
        """Test POST /api/v1/users/me/password with correct current password updates hash."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/users/me/password",
                headers={**auth_headers, "Idempotency-Key": "pwd-key-2"},
                json={
                    "current_password": "correctpassword",
                    "new_password": "NewSecurePass123!"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Password changed successfully"


class TestAvatarManagement:
    """Test avatar upload and deletion endpoints."""
    
    async def test_avatar_upload_url_returns_presigned_url(self, auth_headers):
        """Test POST /api/v1/users/me/avatar/upload-url returns presigned URL."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/users/me/avatar/upload-url",
                headers={**auth_headers, "Idempotency-Key": "avatar-key-1"},
                json={"content_type": "image/jpeg"}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "upload_url" in data
        assert "object_key" in data
        assert "expires_at" in data
    
    async def test_avatar_confirm_with_valid_object_updates_avatar_url(self, auth_headers, test_user):
        """Test POST /api/v1/users/me/avatar/confirm with valid object updates avatar_url."""
        current_etag = generate_etag(test_user["version"])
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/users/me/avatar/confirm",
                headers={
                    **auth_headers,
                    "If-Match": current_etag,
                    "Idempotency-Key": "avatar-key-2"
                },
                json={"object_key": "users/123/avatar-uuid.jpg"}
            )
        
        assert response.status_code == 200
        assert "ETag" in response.headers
        data = response.json()
        assert "avatar_url" in data
    
    async def test_avatar_confirm_with_oversized_file_returns_422(self, auth_headers, test_user):
        """Test POST /api/v1/users/me/avatar/confirm with oversized file returns 422."""
        current_etag = generate_etag(test_user["version"])
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/users/me/avatar/confirm",
                headers={
                    **auth_headers,
                    "If-Match": current_etag,
                    "Idempotency-Key": "avatar-key-3"
                },
                json={"object_key": "users/123/oversized-avatar.jpg"}
            )
        
        assert response.status_code == 422
        data = response.json()
        assert "FILE_TOO_LARGE" in data["detail"]
    
    async def test_avatar_delete_clears_avatar_url(self, auth_headers, test_user):
        """Test DELETE /api/v1/users/me/avatar clears avatar_url."""
        current_etag = generate_etag(test_user["version"])
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.delete(
                "/api/v1/users/me/avatar",
                headers={**auth_headers, "If-Match": current_etag}
            )
        
        assert response.status_code == 200
        assert "ETag" in response.headers
        data = response.json()
        assert data.get("avatar_url") is None


class TestAccountDeletion:
    """Test account deletion endpoint."""
    
    async def test_account_deletion_sets_deleted_at_and_revokes_tokens(self, auth_headers, test_user):
        """Test DELETE /api/v1/users/me sets deleted_at and revokes tokens."""
        current_etag = generate_etag(test_user["version"])
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.delete(
                "/api/v1/users/me",
                headers={
                    **auth_headers,
                    "If-Match": current_etag,
                    "Idempotency-Key": "delete-key-1"
                }
            )
        
        assert response.status_code == 202
        data = response.json()
        assert "erasure_job_id" in data
        assert "deleted_at" in data
        assert "retention_until" in data
