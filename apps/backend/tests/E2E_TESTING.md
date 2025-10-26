# E2E Testing Guide

## Overview

End-to-end tests validate complete payment flows including:
- iyzico 3DS payment flow
- PayTR callback flow
- Idempotency validation
- Resilience patterns (retry, circuit breaker)

## Prerequisites

### MongoDB Replica Set

E2E tests require MongoDB transactions, which only work with replica sets.

**Why Replica Set?**
- MongoDB transactions require replica set (even single-node)
- Ref: https://www.mongodb.com/docs/manual/core/transactions/

**Setup:**
Our `docker-compose.yml` already configures MongoDB with replica set:
```yaml
mongo:
  command: ["--replSet", "rs0", "--bind_ip_all"]

mongo-init:
  # Automatically initializes replica set on first run
```

## Running E2E Tests

### Option 1: Inside Docker Container (Recommended)

Run tests inside the API container to ensure proper hostname resolution:

**Linux/Mac:**
```bash
chmod +x scripts/run-e2e-tests.sh
./scripts/run-e2e-tests.sh
```

**Windows PowerShell:**
```powershell
.\scripts\run-e2e-tests.ps1
```

**Manual:**
```bash
docker exec vorte-api sh -c "cd /app && python -m pytest apps/backend/tests/test_e2e_payment_flows.py -v -s"
```

### Option 2: From Host Machine

If running from host, you need to resolve MongoDB hostname:

**1. Add to hosts file:**

Windows: `C:\Windows\System32\drivers\etc\hosts`
```
127.0.0.1 mongo
127.0.0.1 vorte-mongo
```

Linux/Mac: `/etc/hosts`
```
127.0.0.1 mongo
127.0.0.1 vorte-mongo
```

**2. Update connection string:**
```python
MONGO_URI=mongodb://localhost:27017/test_e2e_payments?replicaSet=rs0&directConnection=true
```

**3. Run tests:**
```bash
cd apps/backend
python -m pytest tests/test_e2e_payment_flows.py -v -s
```

## Test Scenarios

### 1. iyzico 3DS Flow
- Initialize payment → get threeDSHtmlContent (Base64)
- Verify Base64 decoding (FE requirement)
- Simulate webhook → verify AUTHORIZED status
- Test idempotency (duplicate webhook)

**Acceptance Criteria:**
- ✅ threeDSHtmlContent is valid Base64
- ✅ Webhook is idempotent
- ✅ State transitions: INITIATED → PENDING_3DS → AUTHORIZED
- ✅ p95 latency < 1s

### 2. PayTR Callback Flow
- Initialize payment → get form parameters
- Simulate callback with valid hash
- Verify response is exactly "OK" (plain text)
- Test invalid hash → still returns "OK"

**Acceptance Criteria:**
- ✅ Callback always returns "OK" (prevents "Devam Ediyor")
- ✅ Valid hash → payment AUTHORIZED
- ✅ Invalid hash → logged but still "OK"
- ✅ Duplicate callback → idempotent

**Ref:** https://dev.paytr.com/callback-validation

### 3. Idempotency
- Same Idempotency-Key + same params → cached response
- Same key + different params → ValueError

**Acceptance Criteria:**
- ✅ Cache hit returns same paymentDbId
- ✅ Param mismatch raises error

**Ref:** https://stripe.com/docs/api/idempotent_requests

### 4. Resilience
- Retry on 5xx/429 with exponential backoff
- Circuit breaker opens after 10 failures

**Acceptance Criteria:**
- ✅ Retry metrics recorded
- ✅ Circuit breaker state transitions logged

## Troubleshooting

### "Replica set is configured with internal hostnames"

**Cause:** MongoDB replica set uses `mongo:27017` but host can't resolve it.

**Solution:** Run tests inside container (Option 1) or add hosts entry (Option 2).

### "State transition failed"

**Cause:** Transaction not supported (standalone MongoDB).

**Solution:** Ensure replica set is initialized:
```bash
docker exec vorte-mongo mongosh --eval "rs.status()"
```

Should show `"ok": 1` and member state.

### "Connection refused"

**Cause:** Services not running.

**Solution:**
```bash
docker-compose up -d
docker-compose ps  # Verify all services are healthy
```

## CI/CD Integration

For GitHub Actions / GitLab CI:

```yaml
services:
  mongo:
    image: mongo:7.0
    options: >-
      --health-cmd "mongosh --eval 'rs.status()'"
      --health-interval 10s
    command: ["--replSet", "rs0", "--bind_ip_all"]

steps:
  - name: Initialize Replica Set
    run: |
      docker exec mongo mongosh --eval '
        rs.initiate({
          _id: "rs0",
          members: [{ _id: 0, host: "mongo:27017" }]
        })
      '
  
  - name: Run E2E Tests
    run: python -m pytest tests/test_e2e_payment_flows.py -v
    env:
      MONGO_URI: mongodb://mongo:27017/test?replicaSet=rs0
```

## Metrics Validation

After running E2E tests, verify metrics:

```bash
# Check Prometheus metrics
curl http://localhost:8000/metrics | grep payment_

# Expected metrics:
# payment_init_total{provider="iyzico",result="ok"} 1
# payment_init_total{provider="paytr",result="ok"} 1
# payment_webhook_total{provider="iyzico",result="ok"} 1
# payment_provider_latency_seconds_bucket{provider="iyzico",method="initialize_3ds"}
```

## Performance Benchmarks

Target SLAs:
- Payment initialization: p95 < 1s, p99 < 2s
- Webhook processing: p95 < 500ms, p99 < 1s
- Idempotency cache hit: p95 < 50ms

Measure with:
```bash
# Run tests with timing
python -m pytest tests/test_e2e_payment_flows.py -v --durations=10
```

## References

- MongoDB Transactions: https://www.mongodb.com/docs/manual/core/transactions/
- Replica Set Deployment: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set/
- iyzico 3DS: https://docs.iyzico.com/
- PayTR Callback: https://dev.paytr.com/callback-validation
- Stripe Idempotency: https://stripe.com/docs/api/idempotent_requests
