"""Integration tests for authentication flow."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestAuthRegistration:
    """Test user registration flow."""
    
    async def test_register_new_user_success(
        self,
        client: AsyncClient,
        test_user_data: dict
    ):
        """Test successful user registration."""
        response = await client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 201
        data = response.json()
        
        # Verify user data
        assert data["email"] == test_user_data["email"]
        assert data["first_name"] == test_user_data["first_name"]
        assert data["last_name"] == test_user_data["last_name"]
        assert data["role"] == "customer"
        assert data["email_verified"] is False
        assert "id" in data
        assert "password" not in data  # Password should never be returned
    
    async def test_register_duplicate_email_fails(
        self,
        client: AsyncClient,
        test_user_data: dict
    ):
        """Test that registering with duplicate email fails."""
        # Register first user
        response1 = await client.post("/api/v1/auth/register", json=test_user_data)
        assert response1.status_code == 201
        
        # Try to register again with same email
        response2 = await client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response2.status_code == 409  # Conflict
        error = response2.json()
        
        # Verify RFC 9457 problem+json format
        assert "type" in error
        assert "title" in error
        assert "status" in error
        assert error["status"] == 409
        assert "detail" in error
        assert "traceId" in error
    
    async def test_register_weak_password_fails(
        self,
        client: AsyncClient,
        test_user_data: dict
    ):
        """Test that weak password is rejected."""
        weak_data = test_user_data.copy()
        weak_data["password"] = "weak"  # Too short, no uppercase, no digit
        
        response = await client.post("/api/v1/auth/register", json=weak_data)
        
        assert response.status_code == 422  # Validation error
        error = response.json()
        assert "detail" in error
    
    async def test_register_invalid_email_fails(
        self,
        client: AsyncClient,
        test_user_data: dict
    ):
        """Test that invalid email is rejected."""
        invalid_data = test_user_data.copy()
        invalid_data["email"] = "not-an-email"
        
        response = await client.post("/api/v1/auth/register", json=invalid_data)
        
        assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
class TestAuthLogin:
    """Test user login flow."""
    
    async def test_login_success(
        self,
        client: AsyncClient,
        test_user_data: dict
    ):
        """Test successful login."""
        # Register user first
        await client.post("/api/v1/auth/register", json=test_user_data)
        
        # Login
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "user" in data
        assert "tokens" in data
        
        # Verify user data
        assert data["user"]["email"] == test_user_data["email"]
        
        # Verify tokens
        tokens = data["tokens"]
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "token_type" in tokens
        assert tokens["token_type"] == "bearer"
        assert "expires_in" in tokens
        assert tokens["expires_in"] == 900  # 15 minutes in seconds
    
    async def test_login_wrong_password_fails(
        self,
        client: AsyncClient,
        test_user_data: dict
    ):
        """Test that login with wrong password fails."""
        # Register user first
        await client.post("/api/v1/auth/register", json=test_user_data)
        
        # Try to login with wrong password
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user_data["email"],
                "password": "WrongPassword123!"
            }
        )
        
        assert response.status_code == 401  # Unauthorized
        error = response.json()
        
        # Verify RFC 9457 problem+json format
        assert error["status"] == 401
        assert "traceId" in error
    
    async def test_login_nonexistent_user_fails(
        self,
        client: AsyncClient
    ):
        """Test that login with non-existent email fails."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "SomePassword123!"
            }
        )
        
        assert response.status_code == 401  # Unauthorized


@pytest.mark.asyncio
class TestAuthProtectedEndpoints:
    """Test protected endpoints with authentication."""
    
    async def test_get_me_with_valid_token(
        self,
        client: AsyncClient,
        registered_user: dict
    ):
        """Test accessing /me with valid token."""
        headers = {
            "Authorization": f"Bearer {registered_user['tokens']['access_token']}"
        }
        
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == registered_user["user"]["id"]
        assert data["email"] == registered_user["user"]["email"]
    
    async def test_get_me_without_token_fails(
        self,
        client: AsyncClient
    ):
        """Test that accessing /me without token fails."""
        response = await client.get("/api/v1/auth/me")
        
        assert response.status_code == 401  # Unauthorized
    
    async def test_get_me_with_invalid_token_fails(
        self,
        client: AsyncClient
    ):
        """Test that accessing /me with invalid token fails."""
        headers = {"Authorization": "Bearer invalid.token.here"}
        
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401  # Unauthorized


@pytest.mark.asyncio
class TestTokenRefresh:
    """Test token refresh flow with rotation."""
    
    async def test_refresh_token_success(
        self,
        client: AsyncClient,
        registered_user: dict
    ):
        """Test successful token refresh."""
        refresh_token = registered_user["tokens"]["refresh_token"]
        
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify new tokens
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["access_token"] != registered_user["tokens"]["access_token"]
        assert data["refresh_token"] != refresh_token  # Token rotation
    
    async def test_refresh_token_rotation_old_token_revoked(
        self,
        client: AsyncClient,
        registered_user: dict
    ):
        """Test that old refresh token is revoked after rotation."""
        old_refresh_token = registered_user["tokens"]["refresh_token"]
        
        # First refresh - should succeed
        response1 = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": old_refresh_token}
        )
        assert response1.status_code == 200
        
        # Try to use old refresh token again - should fail
        response2 = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": old_refresh_token}
        )
        
        assert response2.status_code == 401  # Unauthorized
        error = response2.json()
        assert error["status"] == 401
        assert "revoked" in error["detail"].lower()
    
    async def test_refresh_with_invalid_token_fails(
        self,
        client: AsyncClient
    ):
        """Test that refresh with invalid token fails."""
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.token.here"}
        )
        
        assert response.status_code == 401  # Unauthorized


@pytest.mark.asyncio
class TestLogout:
    """Test logout flow."""
    
    async def test_logout_success(
        self,
        client: AsyncClient,
        registered_user: dict
    ):
        """Test successful logout."""
        headers = {
            "Authorization": f"Bearer {registered_user['tokens']['access_token']}"
        }
        
        response = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": registered_user["tokens"]["refresh_token"]},
            headers=headers
        )
        
        assert response.status_code == 204  # No content
    
    async def test_logout_revokes_tokens(
        self,
        client: AsyncClient,
        registered_user: dict
    ):
        """Test that logout revokes both tokens."""
        access_token = registered_user["tokens"]["access_token"]
        refresh_token = registered_user["tokens"]["refresh_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Logout
        logout_response = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token},
            headers=headers
        )
        assert logout_response.status_code == 204
        
        # Try to use access token - should fail
        me_response = await client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 401
        
        # Try to use refresh token - should fail
        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert refresh_response.status_code == 401


@pytest.mark.asyncio
class TestCompleteAuthFlow:
    """Test complete authentication flow end-to-end."""
    
    async def test_complete_flow(
        self,
        client: AsyncClient,
        test_user_data: dict
    ):
        """
        Test complete auth flow:
        1. Register
        2. Login
        3. Access protected endpoint
        4. Refresh token
        5. Access protected endpoint with new token
        6. Logout
        7. Verify tokens are revoked
        """
        # 1. Register
        register_response = await client.post(
            "/api/v1/auth/register",
            json=test_user_data
        )
        assert register_response.status_code == 201
        user = register_response.json()
        
        # 2. Login
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        assert login_response.status_code == 200
        auth_result = login_response.json()
        access_token_1 = auth_result["tokens"]["access_token"]
        refresh_token_1 = auth_result["tokens"]["refresh_token"]
        
        # 3. Access protected endpoint
        me_response_1 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token_1}"}
        )
        assert me_response_1.status_code == 200
        assert me_response_1.json()["id"] == user["id"]
        
        # 4. Refresh token
        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token_1}
        )
        assert refresh_response.status_code == 200
        new_tokens = refresh_response.json()
        access_token_2 = new_tokens["access_token"]
        refresh_token_2 = new_tokens["refresh_token"]
        
        # Verify tokens changed
        assert access_token_2 != access_token_1
        assert refresh_token_2 != refresh_token_1
        
        # 5. Access protected endpoint with new token
        me_response_2 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token_2}"}
        )
        assert me_response_2.status_code == 200
        
        # 6. Logout
        logout_response = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token_2},
            headers={"Authorization": f"Bearer {access_token_2}"}
        )
        assert logout_response.status_code == 204
        
        # 7. Verify tokens are revoked
        me_response_3 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token_2}"}
        )
        assert me_response_3.status_code == 401
