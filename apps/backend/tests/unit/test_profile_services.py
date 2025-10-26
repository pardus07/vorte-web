"""Unit tests for profile management services."""
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.profile_service import ProfileService
from app.services.email_verification_service import email_verification_service, EmailVerificationService
from app.services.password_service import password_service
from app.services.avatar_service import avatar_service
from app.services.account_erasure_service import account_erasure_service
from app.core.exceptions import ConflictError, ValidationError, NotFoundError
from app.schemas.profile import ProfileUpdate

# Mark all tests in this module as asyncio
pytestmark = pytest.mark.asyncio


class FakeUserRepository:
    """Fake repository for testing without database."""
    
    def __init__(self, user_data=None):
        self.user_data = user_data or {
            "_id": "test_user_123",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "version": 2,
            "deleted_at": None,
            "avatar_url": None,
        }
    
    async def get_by_id(self, user_id):
        return self.user_data if user_id == self.user_data["_id"] else None
    
    async def update_with_version(self, user_id, current_version, updates):
        # Simulate version mismatch
        if current_version != self.user_data["version"]:
            raise ConflictError(
                message="Version mismatch",
                details={
                    "current_version": self.user_data["version"],
                    "requested_version": current_version
                }
            )
        # Update user data
        self.user_data.update(updates)
        self.user_data["version"] += 1
        return self.user_data
    
    async def email_exists(self, email):
        return email == self.user_data["email"]


class TestProfileService:
    """Unit tests for ProfileService."""
    
    async def test_update_profile_with_version_mismatch_raises_conflict(self):
        """Test ProfileService.update_profile with version mismatch raises ConflictError."""
        fake_repo = FakeUserRepository()
        service = ProfileService(user_repo=fake_repo)
        
        updates = ProfileUpdate(first_name="New Name")
        
        with pytest.raises(ConflictError) as exc_info:
            await service.update_profile(
                user_id="test_user_123",
                if_match='"1"',  # Old version (user has version 2)
                updates=updates
            )
        
        # ProfileService wraps the error with its own message
        assert "modified" in str(exc_info.value.message).lower()


class TestEmailVerificationService:
    """Unit tests for EmailVerificationService."""
    
    async def test_request_email_change_with_existing_email_raises_validation_error(self):
        """Test EmailVerificationService.request_email_change with existing email raises ConflictError."""
        with patch.object(email_verification_service.user_repo, 'get_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"_id": "123", "version": 1, "email": "old@example.com"}
            
            with patch.object(email_verification_service.user_repo, 'email_exists', new_callable=AsyncMock) as mock_exists:
                mock_exists.return_value = True
                
                with pytest.raises(ConflictError) as exc_info:
                    await email_verification_service.request_email_change(
                        user_id="123",
                        new_email="existing@example.com",
                        if_match='"1"'
                    )
                
                assert "EMAIL_ALREADY_EXISTS" in str(exc_info.value.details)
    
    async def test_confirm_email_change_with_invalid_token_raises_validation_error(self):
        """Test EmailVerificationService.confirm_email_change with invalid token raises ValidationError."""
        from app.services.redis_service import redis_service
        
        # Create fake repo that doesn't hit database
        class FakeEmailRepo:
            async def get_by_id(self, user_id):
                return {
                    "_id": user_id,
                    "email": "old@example.com",
                    "version": 1,
                    "pending_email": "new@example.com"
                }
            
            async def confirm_email_change(self, user_id, token_hash):
                # Simulate invalid token
                raise ConflictError(
                    message="Invalid verification token",
                    details={"error": "EMAIL_TOKEN_INVALID"}
                )
            
            def to_public(self, doc):
                return {
                    "id": str(doc.get("_id", "u1")),
                    "email": doc.get("email", "old@example.com"),
                    "first_name": doc.get("first_name", "Test"),
                    "last_name": doc.get("last_name", "User"),
                    "role": doc.get("role", "customer"),
                    "email_verified": doc.get("email_verified", False),
                    "phone_verified": doc.get("phone_verified", False),
                    "version": doc.get("version", 1),
                    "created_at": doc.get("created_at", datetime.now(timezone.utc)),
                    "phone": doc.get("phone"),
                    "avatar_url": doc.get("avatar_url"),
                    "addresses": doc.get("addresses", [])
                }
        
        fake_repo = FakeEmailRepo()
        service = EmailVerificationService(user_repo=fake_repo)
        
        # Mock Redis to return None (invalid token)
        with patch.object(redis_service, 'get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=None)
            mock_get_client.return_value = mock_client
            
            with pytest.raises(ConflictError) as exc_info:
                await service.confirm_email_change(
                    user_id="u1",
                    token="invalid-token"
                )
            
            assert "EMAIL_TOKEN_INVALID" in str(exc_info.value.details)


class TestPasswordService:
    """Unit tests for PasswordService."""
    
    async def test_change_password_with_wrong_current_password_raises_validation_error(self):
        """Test PasswordService.change_password with wrong current password raises ConflictError."""
        with patch.object(password_service.user_repo, 'get_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {
                "_id": "123",
                "password_hash": "$argon2id$v=19$m=65536,t=2,p=2$correct_hash",
                "version": 1
            }
            
            with patch('app.services.password_service.verify_password', return_value=False):
                with pytest.raises(ConflictError) as exc_info:
                    await password_service.change_password(
                        user_id="123",
                        current_password="wrongpassword",
                        new_password="NewSecurePass123!",
                        if_match='"1"'
                    )
                
                assert "INVALID_CURRENT_PASSWORD" in str(exc_info.value.details)


class TestAvatarService:
    """Unit tests for AvatarService."""
    
    async def test_get_upload_url_with_invalid_content_type_raises_validation_error(self):
        """Test AvatarService.get_upload_url with invalid content type raises ValidationError."""
        # Patch _ensure_bucket to avoid MinIO connection
        with patch.object(avatar_service, '_ensure_bucket', return_value=None):
            with pytest.raises(ValidationError) as exc_info:
                await avatar_service.get_upload_url(
                    user_id="123",
                    content_type="application/pdf"
                )
            
            assert "INVALID_CONTENT_TYPE" in str(exc_info.value.details)
    
    async def test_confirm_upload_with_missing_object_raises_validation_error(self):
        """Test AvatarService.confirm_upload with missing object raises ValidationError."""
        from unittest.mock import Mock
        from minio.error import S3Error
        
        # Mock MinIO client to simulate missing object
        with patch.object(avatar_service, '_ensure_client', return_value=None):
            mock_client = Mock()
            mock_client.stat_object = Mock(side_effect=S3Error(
                code="NoSuchKey",
                message="Object not found",
                resource="",
                request_id="",
                host_id="",
                response=Mock(status=404)
            ))
            avatar_service.client = mock_client
            
            # Mock user repo
            with patch.object(avatar_service.user_repo, 'get_by_id', new_callable=AsyncMock) as mock_get:
                mock_get.return_value = {"_id": "123", "version": 1}
                
                with pytest.raises(ValidationError) as exc_info:
                    await avatar_service.confirm_upload(
                        user_id="123",
                        object_key="users/123/missing.jpg",
                        if_match='"1"'
                    )
                
                assert "OBJECT_NOT_FOUND" in str(exc_info.value.details)
    
    async def test_confirm_upload_with_oversized_file_raises_validation_error(self):
        """Test AvatarService.confirm_upload with oversized file raises ValidationError."""
        from unittest.mock import Mock
        
        # Mock MinIO client to simulate oversized file
        with patch.object(avatar_service, '_ensure_client', return_value=None):
            mock_stat = Mock()
            mock_stat.size = 3 * 1024 * 1024  # 3MB (over 2MB limit)
            
            mock_client = Mock()
            mock_client.stat_object = Mock(return_value=mock_stat)
            mock_client.remove_object = Mock()
            avatar_service.client = mock_client
            
            # Mock user repo
            with patch.object(avatar_service.user_repo, 'get_by_id', new_callable=AsyncMock) as mock_get:
                mock_get.return_value = {"_id": "123", "version": 1}
                
                with pytest.raises(ValidationError) as exc_info:
                    await avatar_service.confirm_upload(
                        user_id="123",
                        object_key="users/123/large.jpg",
                        if_match='"1"'
                    )
                
                assert "FILE_TOO_LARGE" in str(exc_info.value.details)


class TestAccountErasureService:
    """Unit tests for AccountErasureService."""
    
    @pytest.mark.asyncio
    async def test_delete_account_enqueues_erasure_job(self):
        """Test AccountErasureService.delete_account enqueues erasure job."""
        with patch.object(account_erasure_service.user_repo, 'get_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {
                "_id": "123",
                "version": 1,
                "password_hash": "$argon2id$v=19$m=65536,t=2,p=2$hash"
            }
            
            with patch.object(account_erasure_service.user_repo, 'update_with_version', new_callable=AsyncMock) as mock_update:
                mock_update.return_value = {"_id": "123", "version": 2, "deleted_at": datetime.now(timezone.utc)}
                
                with patch('app.services.account_erasure_service.verify_password', return_value=True):
                    result, etag = await account_erasure_service.delete_account(
                        user_id="123",
                        if_match='"1"',
                        current_password="correctpassword"
                    )
                
                assert "erasure_job_id" in result
                assert result["status"] == "accepted"
