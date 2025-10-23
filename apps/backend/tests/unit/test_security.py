"""Unit tests for security utilities (password hashing and JWT)."""
import pytest
from datetime import datetime, timedelta, timezone

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.schemas.user import UserRole
from jose import JWTError


class TestPasswordHashing:
    """Test password hashing with Argon2id."""
    
    def test_hash_password_creates_valid_hash(self):
        """Test that password hashing creates a valid Argon2id hash."""
        password = "TestP4ssw0rd!"
        hashed = hash_password(password)
        
        assert hashed is not None
        assert "$argon2id$" in hashed
        assert len(hashed) > 50
    
    def test_verify_password_with_correct_password(self):
        """Test password verification with correct password."""
        password = "TestP4ssw0rd!"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_with_incorrect_password(self):
        """Test password verification with incorrect password."""
        password = "TestP4ssw0rd!"
        hashed = hash_password(password)
        
        assert verify_password("WrongPassword", hashed) is False
    
    def test_different_passwords_produce_different_hashes(self):
        """Test that same password produces different hashes (due to salt)."""
        password = "TestP4ssw0rd!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        assert hash1 != hash2
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)


class TestJWTTokens:
    """Test JWT token creation and validation."""
    
    def test_create_access_token(self):
        """Test access token creation."""
        user_id = "123"
        email = "test@example.com"
        role = UserRole.CUSTOMER
        
        token = create_access_token(user_id, email, role)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 50
    
    def test_create_refresh_token(self):
        """Test refresh token creation."""
        user_id = "123"
        email = "test@example.com"
        role = UserRole.CUSTOMER
        
        token = create_refresh_token(user_id, email, role)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 50
    
    def test_decode_valid_token(self):
        """Test decoding a valid token."""
        user_id = "123"
        email = "test@example.com"
        role = UserRole.CUSTOMER
        
        token = create_access_token(user_id, email, role)
        payload = decode_token(token)
        
        assert payload.sub == user_id
        assert payload.email == email
        assert payload.role == role
        assert payload.jti is not None
        assert payload.exp > payload.iat
    
    def test_decode_expired_token_raises_error(self):
        """Test that decoding an expired token raises JWTError."""
        user_id = "123"
        email = "test@example.com"
        role = UserRole.CUSTOMER
        
        # Create token that expires immediately
        token = create_access_token(
            user_id,
            email,
            role,
            expires_delta=timedelta(seconds=-1)
        )
        
        with pytest.raises(JWTError):
            decode_token(token)
    
    def test_decode_invalid_token_raises_error(self):
        """Test that decoding an invalid token raises JWTError."""
        with pytest.raises(JWTError):
            decode_token("invalid.token.here")
    
    def test_token_contains_required_claims(self):
        """Test that token contains all required claims."""
        user_id = "123"
        email = "test@example.com"
        role = UserRole.ADMIN
        
        token = create_access_token(user_id, email, role)
        payload = decode_token(token)
        
        # Check all required claims
        assert payload.sub is not None
        assert payload.email is not None
        assert payload.role is not None
        assert payload.exp is not None
        assert payload.iat is not None
        assert payload.jti is not None
    
    def test_different_tokens_have_different_jti(self):
        """Test that each token has a unique JTI."""
        user_id = "123"
        email = "test@example.com"
        role = UserRole.CUSTOMER
        
        token1 = create_access_token(user_id, email, role)
        token2 = create_access_token(user_id, email, role)
        
        payload1 = decode_token(token1)
        payload2 = decode_token(token2)
        
        assert payload1.jti != payload2.jti
