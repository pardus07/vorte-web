# Profile Management Tests

Comprehensive test suite for User Profile Management feature (Tasks 14-18).

## Test Structure

```
tests/
├── integration/
│   ├── test_profile_endpoints.py      # Task 14: API endpoint tests
│   ├── test_rate_limiting.py          # Task 16: Rate limit tests
│   ├── test_idempotency.py            # Task 17: Idempotency tests
│   └── test_concurrency_control.py    # Task 18: Concurrency tests
└── unit/
    └── test_profile_services.py       # Task 15: Service layer tests
```

## Running Tests

### All Tests
```bash
pytest apps/backend/tests/
```

### Integration Tests Only
```bash
pytest apps/backend/tests/integration/
```

### Unit Tests Only
```bash
pytest apps/backend/tests/unit/
```

### Specific Test File
```bash
pytest apps/backend/tests/integration/test_profile_endpoints.py
```

### With Coverage
```bash
pytest --cov=app.services --cov=app.routers apps/backend/tests/
```

### Verbose Output
```bash
pytest -v apps/backend/tests/
```

## Test Requirements

### Environment Setup
1. MongoDB running on `localhost:27017`
2. Redis running on `localhost:6379`
3. MinIO running on `localhost:9000`
4. Test database: `vorte_test`

### Environment Variables
```bash
export MONGO_URI="mongodb://localhost:27017/vorte_test"
export REDIS_URL="redis://localhost:6379/1"
export MINIO_ENDPOINT="localhost:9000"
export MINIO_ACCESS_KEY="minioadmin"
export MINIO_SECRET_KEY="minioadmin123"
export JWT_SECRET="test_secret_key"
```

### Docker Compose (Recommended)
```bash
docker-compose -f docker-compose.test.yml up -d
pytest apps/backend/tests/
docker-compose -f docker-compose.test.yml down
```

## Test Coverage

### Task 14: Integration Tests for Profile Endpoints
- ✅ GET /api/v1/users/me returns profile with ETag
- ✅ PATCH without If-Match returns 428
- ✅ PATCH with old ETag returns 409
- ✅ PATCH with current ETag succeeds
- ✅ Email change request sends verification
- ✅ Email change with existing email returns 422
- ✅ Email confirm with valid token updates email
- ✅ Email confirm with expired token returns 422
- ✅ Password change with wrong password returns 422
- ✅ Password change with correct password succeeds
- ✅ Avatar upload URL returns presigned URL
- ✅ Avatar confirm with valid object updates avatar_url
- ✅ Avatar confirm with oversized file returns 422
- ✅ Avatar delete clears avatar_url
- ✅ Account deletion sets deleted_at and revokes tokens

### Task 15: Unit Tests for Service Layer
- ✅ ProfileService version mismatch raises ConflictError
- ✅ EmailVerificationService existing email raises ValidationError
- ✅ EmailVerificationService invalid token raises ValidationError
- ✅ PasswordService wrong password raises ValidationError
- ✅ AvatarService invalid content type raises ValidationError
- ✅ AvatarService missing object raises ValidationError
- ✅ AvatarService oversized file raises ValidationError
- ✅ AccountErasureService enqueues erasure job

### Task 16: Rate Limiting Tests
- ✅ Password change: 3/10min limit enforced
- ✅ Avatar upload: 5/10min limit enforced
- ✅ Email change: 3/hour limit enforced
- ✅ Retry-After header present in 429 responses

### Task 17: Idempotency Tests
- ✅ Email change idempotency with same key
- ✅ Password change idempotency with same key
- ✅ Avatar upload URL idempotency with same key
- ✅ Account deletion idempotency with same key

### Task 18: Concurrency Control Tests
- ✅ Concurrent profile updates: one gets 409
- ✅ Concurrent avatar confirms: one gets 409
- ✅ Concurrent avatar deletes: one gets 409
- ✅ Sequential updates with fresh ETags succeed

## Fixtures

### Common Fixtures
- `test_user`: Creates a test user in database
- `auth_token`: Generates JWT token for authentication
- `auth_headers`: Returns headers with Bearer token

### Usage Example
```python
@pytest.mark.asyncio
async def test_example(auth_headers, test_user):
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/users/me", headers=auth_headers)
        assert response.status_code == 200
```

## Mocking

### External Services
- MinIO client operations are mocked in unit tests
- Redis operations use test database (db=1)
- Email sending is mocked (no actual emails sent)

### Example Mock
```python
with patch.object(service.user_repo, 'get_by_id', new_callable=AsyncMock) as mock:
    mock.return_value = {"_id": "123", "version": 1}
    # Test code here
```

## Troubleshooting

### Tests Failing Due to Database
```bash
# Clear test database
docker exec -it vorte-mongo mongosh vorte_test --eval "db.dropDatabase()"
```

### Tests Failing Due to Redis
```bash
# Clear Redis test database
docker exec -it vorte-redis redis-cli -n 1 FLUSHDB
```

### Rate Limit Tests Failing
```bash
# Clear rate limit keys
docker exec -it vorte-redis redis-cli -n 1 KEYS "rate_limit:*" | xargs docker exec -i vorte-redis redis-cli -n 1 DEL
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run tests
  run: |
    docker-compose -f docker-compose.test.yml up -d
    pytest apps/backend/tests/ --cov --cov-report=xml
    docker-compose -f docker-compose.test.yml down
```

## Notes

- All tests use async/await patterns
- Integration tests require running infrastructure
- Unit tests are isolated with mocks
- Rate limit tests may take longer due to timing
- Concurrency tests use asyncio.gather for parallel execution
