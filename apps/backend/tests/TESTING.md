# Testing Guide

Complete guide for running User Profile Management tests.

## Quick Start

### Windows (PowerShell)

```powershell
# 1. Install dev dependencies
pip install -r apps/backend/requirements-dev.txt

# 2. Run unit tests (fast, no infrastructure needed)
python -m pytest apps/backend/tests/unit -v

# 3. Setup integration test infrastructure
.\apps\backend\tests\test_runner.ps1 setup

# 4. Run integration tests
.\apps\backend\tests\test_runner.ps1 integration

# 5. Run all tests
.\apps\backend\tests\test_runner.ps1 all

# 6. Cleanup
docker compose -f docker-compose.test.yml down -v
```

### Linux/Mac (Bash)

```bash
# 1. Install dev dependencies
pip install -r apps/backend/requirements-dev.txt

# 2. Run unit tests
make test-unit

# 3. Setup integration test infrastructure
make test-int-up

# 4. Run integration tests
make test-int

# 5. Run all tests
make test-all

# 6. Cleanup
make test-int-down
```

## Test Structure

```
apps/backend/tests/
├── unit/                           # Unit tests (no infrastructure)
│   └── test_profile_services.py   # 8 tests - Service layer
├── integration/                    # Integration tests (requires infrastructure)
│   ├── test_profile_endpoints.py  # 15 tests - API endpoints
│   ├── test_rate_limiting.py      # 4 tests - Rate limits
│   ├── test_idempotency.py        # 4 tests - Idempotency
│   └── test_concurrency_control.py # 4 tests - Concurrency
├── conftest.py                     # Shared fixtures
├── README.md                       # Test documentation
├── TESTING.md                      # This file
└── test_runner.ps1                 # Windows test runner
```

## Test Infrastructure

### Services

- **MongoDB Test**: Port 27117 (replica set enabled)
- **Redis Test**: Port 6380
- **MinIO Test**: Port 9002 (HTTP), 9003 (Console)

### Environment Variables

Test environment uses `.env.test`:

```env
ENV=TEST
DISABLE_TRACING=1
MONGO_URI=mongodb://localhost:27117/vorte_test?replicaSet=rs0
REDIS_URL=redis://localhost:6380/0
MINIO_ENDPOINT=http://localhost:9002
```

## Running Specific Tests

### By Test File

```bash
# Unit tests only
python -m pytest apps/backend/tests/unit/test_profile_services.py -v

# Profile endpoints only
python -m pytest apps/backend/tests/integration/test_profile_endpoints.py -v

# Rate limiting tests only
python -m pytest apps/backend/tests/integration/test_rate_limiting.py -v
```

### By Test Class

```bash
# Profile service tests
python -m pytest apps/backend/tests/unit/test_profile_services.py::TestProfileService -v

# Avatar service tests
python -m pytest apps/backend/tests/unit/test_profile_services.py::TestAvatarService -v
```

### By Test Name

```bash
# Specific test
python -m pytest apps/backend/tests/unit/test_profile_services.py::TestProfileService::test_update_profile_with_version_mismatch_raises_conflict -v

# Pattern matching
python -m pytest apps/backend/tests -k "avatar" -v
python -m pytest apps/backend/tests -k "rate_limit" -v
```

## Test Coverage

### Unit Tests (8/8 passing)

- ✅ ProfileService version conflict
- ✅ EmailVerificationService existing email
- ✅ EmailVerificationService invalid token
- ✅ PasswordService wrong password
- ✅ AvatarService invalid content type
- ✅ AvatarService missing object
- ✅ AvatarService oversized file
- ✅ AccountErasureService enqueue job

### Integration Tests (Skeletons Ready)

- 📝 15 profile endpoint tests
- 📝 4 rate limiting tests
- 📝 4 idempotency tests
- 📝 4 concurrency control tests

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker ps | grep mongo_test

# Check MongoDB logs
docker logs vorte-mongo_test-1

# Reinitialize replica set
docker compose -f docker-compose.test.yml up mongo_init_test
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis_test

# Test Redis connection
docker exec -it vorte-redis_test-1 redis-cli ping
```

### MinIO Connection Issues

```bash
# Check if MinIO is running
docker ps | grep minio_test

# Reinitialize bucket
export MINIO_ROOT_USER=minioadmin
export MINIO_ROOT_PASSWORD=minioadmin
export MINIO_ENDPOINT=http://localhost:9002
bash scripts/minio_bootstrap.sh
```

### Clear Test Data

```bash
# Clear MongoDB test database
docker exec -it vorte-mongo_test-1 mongosh vorte_test --eval "db.dropDatabase()"

# Clear Redis test database
docker exec -it vorte-redis_test-1 redis-cli FLUSHDB

# Restart all test services
docker compose -f docker-compose.test.yml restart
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongo:
        image: mongo:7.0
        ports: ["27017:27017"]
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
      minio:
        image: minio/minio:latest
        ports: ["9000:9000"]
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      
      - name: Install dependencies
        run: |
          pip install -r apps/backend/requirements.txt
          pip install -r apps/backend/requirements-dev.txt
      
      - name: Run tests
        run: |
          make test-unit
          make test-int
```

## Performance Benchmarks

- **Unit Tests**: ~0.55 seconds (8 tests)
- **Integration Tests**: ~5-10 seconds (depends on infrastructure)
- **Full Suite**: ~10-15 seconds

## Best Practices

1. **Always run unit tests first** - They're fast and catch most issues
2. **Use test isolation** - Each test should be independent
3. **Clean up after tests** - Use fixtures for setup/teardown
4. **Mock external services in unit tests** - Only use real services in integration tests
5. **Use descriptive test names** - Test name should describe what it tests

## Next Steps

- [ ] Implement remaining integration tests
- [ ] Add performance tests
- [ ] Add load tests
- [ ] Set up CI/CD pipeline
- [ ] Add test coverage reporting
