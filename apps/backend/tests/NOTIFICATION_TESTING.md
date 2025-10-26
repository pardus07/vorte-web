# Notification System Testing Guide

This guide explains how to run and understand the notification system tests.

## Test Structure

```
tests/
├── test_notification_outbox_repo.py       # Repository layer tests
├── test_notification_dispatcher_worker.py # Dispatcher worker tests
├── test_notification_e2e_flow.py          # End-to-end integration tests
├── test_notification_provider_mocks.py    # Provider HTTP mock tests
├── helpers/
│   └── notification_fixtures.py           # Shared fixtures and utilities
└── requirements-test.txt                  # Test dependencies
```

## Test Categories

### 1. Repository Tests (`test_notification_outbox_repo.py`)

Tests the `NotificationOutboxRepository` layer:

- **Idempotency**: Duplicate enqueue with same `idempotencyKey` creates only one record
- **Atomic Claim**: `claim_for_dispatch` prevents concurrent workers from claiming same notification
- **State Transitions**: `mark_sent`, `mark_failed`, `mark_dead` update status correctly
- **Visibility Timeout**: Stuck notifications (worker crash) are reset after timeout
- **TTL Behavior**: SENT notifications have `expireAt` field for MongoDB TTL cleanup

**Run:**
```bash
pytest tests/test_notification_outbox_repo.py -v
```

### 2. Dispatcher Tests (`test_notification_dispatcher_worker.py`)

Tests the `NotificationDispatcher` worker:

- **Happy Path**: Notification sent successfully → marked SENT
- **Retry Path**: Transient failure → exponential backoff → retry scheduled
- **Dead Letter**: Max retries exceeded → moved to DEAD status
- **Concurrency**: Multiple workers don't send duplicate notifications
- **Metrics**: Prometheus counters and histograms recorded correctly

**Run:**
```bash
pytest tests/test_notification_dispatcher_worker.py -v
```

### 3. Provider Mock Tests (`test_notification_provider_mocks.py`)

Tests notification providers with HTTP mocking (respx):

- **SendGrid**: Success, rate limit (429), server error (5xx), fallback to SES
- **Netgsm**: Success, auth failure, rate limit
- **Verimor**: Success, invalid credentials
- **Fallback**: Primary fails → Secondary succeeds

**Run:**
```bash
pytest tests/test_notification_provider_mocks.py -v
```

### 4. E2E Tests (`test_notification_e2e_flow.py`)

Tests complete notification flow:

1. Payment status change → Outbox enqueue
2. Dispatcher polls → Claims notification
3. Provider sends → Notification marked SENT
4. TTL and `expireAt` set correctly
5. Metrics recorded

**Run:**
```bash
pytest tests/test_notification_e2e_flow.py -v
```

## Prerequisites

### 1. Install Test Dependencies

```bash
pip install -r tests/requirements-test.txt
```

### 2. MongoDB Replica Set (for Transaction Tests)

Some tests require MongoDB transactions, which need a replica set:

**Docker Compose:**
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  mongo:
    image: mongo:7
    command: ["--replSet", "rs0", "--bind_ip_all"]
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example
```

**Start and initialize:**
```bash
docker-compose -f docker-compose.test.yml up -d
docker exec -it <mongo_container> mongosh --eval "rs.initiate()"
```

### 3. Environment Variables

Set test environment variables:

```bash
export MONGODB_URL="mongodb://localhost:27017/test_notifications"
export SENDGRID_API_KEY="test_key"
export NETGSM_USERNAME="test_user"
export NETGSM_PASSWORD="test_pass"
```

## Running Tests

### Run All Notification Tests

```bash
pytest tests/test_notification_*.py -v
```

### Run with Coverage

```bash
pytest tests/test_notification_*.py --cov=app.repositories.notification_outbox_repository --cov=app.workers.notification_dispatcher --cov=app.services.notification_service --cov-report=html
```

### Run Specific Test

```bash
pytest tests/test_notification_outbox_repo.py::test_enqueue_idempotent -v
```

### Run by Marker

```bash
# Run only E2E tests
pytest -m e2e -v

# Run only unit tests
pytest -m unit -v

# Run only notification tests
pytest -m notification -v
```

### Run with Verbose Output

```bash
pytest tests/test_notification_*.py -vv -s
```

## Test Markers

Tests are marked with pytest markers for filtering:

- `@pytest.mark.unit`: Unit tests (isolated with mocks)
- `@pytest.mark.integration`: Integration tests (require infrastructure)
- `@pytest.mark.e2e`: End-to-end tests
- `@pytest.mark.notification`: Notification system tests
- `@pytest.mark.slow`: Slow-running tests

## Key Testing Patterns

### 1. Idempotency Testing

```python
# First enqueue
notif_id_1 = await repo.enqueue(..., idempotency_key="key1")
assert notif_id_1 is not None

# Second enqueue with same key (should be idempotent)
notif_id_2 = await repo.enqueue(..., idempotency_key="key1")
assert notif_id_2 is None  # Returns None for duplicate
```

### 2. Concurrency Testing

```python
# Simulate concurrent claims from multiple workers
results = await asyncio.gather(
    repo.claim_for_dispatch(notif_id, 60),
    repo.claim_for_dispatch(notif_id, 60),
    repo.claim_for_dispatch(notif_id, 60),
)

# Only one should succeed
successful_claims = [r for r in results if r is not None]
assert len(successful_claims) == 1
```

### 3. HTTP Mocking with respx

```python
@respx.mock
async def test_sendgrid_success():
    # Mock SendGrid API
    route = respx.post("https://api.eu.sendgrid.com/v3/mail/send").mock(
        return_value=httpx.Response(202, json={"message": "success"})
    )
    
    # Send email
    result = await service.send_email(msg)
    
    # Verify
    assert route.called
```

### 4. Time Control with freezegun

```python
def test_visibility_timeout(freezer):
    # Claim notification
    claimed = await repo.claim_for_dispatch(notif_id, visibility_timeout_seconds=60)
    
    # Move time forward
    freezer.move_to(datetime.utcnow() + timedelta(seconds=61))
    
    # Reset stuck notifications
    reset_count = await repo.reset_stuck_notifications()
    assert reset_count == 1
```

## Troubleshooting

### MongoDB Connection Errors

**Error:** `ServerSelectionTimeoutError`

**Solution:** Ensure MongoDB is running and accessible:
```bash
docker ps | grep mongo
mongosh --eval "db.adminCommand('ping')"
```

### Transaction Errors

**Error:** `Transaction numbers are only allowed on a replica set member or mongos`

**Solution:** Initialize MongoDB as replica set:
```bash
docker exec -it <mongo_container> mongosh --eval "rs.initiate()"
```

### respx Mock Not Working

**Error:** `AssertionError: assert False` (route not called)

**Solution:** Ensure `@respx.mock` decorator is applied:
```python
@pytest.mark.asyncio
@respx.mock  # <-- Required
async def test_something():
    ...
```

### Fixture Not Found

**Error:** `fixture 'mongo_client' not found`

**Solution:** Import fixtures in conftest.py:
```python
# tests/conftest.py
pytest_plugins = ["tests.helpers.notification_fixtures"]
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Notification Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r tests/requirements-test.txt
      
      - name: Initialize MongoDB replica set
        run: |
          docker exec ${{ job.services.mongodb.id }} mongosh --eval "rs.initiate()"
          sleep 5
      
      - name: Run notification tests
        run: |
          pytest tests/test_notification_*.py -v --cov --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Performance Benchmarks

Expected test execution times:

- **Repository tests**: ~5-10 seconds
- **Dispatcher tests**: ~10-15 seconds
- **Provider mock tests**: ~5-10 seconds
- **E2E tests**: ~15-20 seconds

**Total**: ~35-55 seconds for full notification test suite

## References

- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/)
- [respx Documentation](https://lundberg.github.io/respx/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [Prometheus Python Client](https://github.com/prometheus/client_python)
