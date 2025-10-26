# Ship Checklist - User Profile Management v1.1.0

## Pre-Deployment Checklist

### 0. Code Sync
```bash
git pull --rebase
```

### 1. Run All Tests
**Linux/Mac:**
```bash
make test-all
```

**Windows:**
```powershell
.\apps\backend\tests\test_runner.ps1 setup
.\apps\backend\tests\test_runner.ps1 all
```

**Expected Results:**
- ✅ Unit tests: 8/8 passing (~0.58s)
- ✅ Integration tests: 10 tests ready
- ✅ No diagnostics errors

### 2. MinIO Bucket & CORS Setup (Production)
```bash
export MINIO_ROOT_USER=<prod-user>
export MINIO_ROOT_PASSWORD=<prod-password>
export MINIO_ENDPOINT=<prod-endpoint>
bash scripts/minio_bootstrap.sh
```

**Verify:**
- ✅ Bucket `avatars` created
- ✅ CORS configured
- ✅ Public read access set

### 3. MongoDB Index Health Check
```bash
docker compose -f docker-compose.prod.yml up -d mongo
docker logs vorte-mongo | tail -n 100 | grep -i "createIndexes"
```

**Verify:**
- ✅ `email` unique index
- ✅ `phone` unique sparse index
- ✅ `deleted_at` index
- ✅ `erasure_requested` index

### 4. Erasure Worker Active Check
```bash
curl -s http://<api-domain>/metrics | grep account_erasure_jobs_total
```

**Expected:**
```
account_erasure_jobs_total{result="ok"} 0
account_erasure_jobs_total{result="skipped"} 0
account_erasure_duration_seconds_count 0
```

### 5. API Smoke Test (Non-Destructive)
```bash
# Health check
curl -i https://<api-domain>/api/health

# Profile retrieval
curl -i -H "Authorization: Bearer <JWT>" \
  https://<api-domain>/api/v1/users/me
```

**Expected:**
- ✅ Health: 200 OK
- ✅ Profile: 200 OK with ETag header

### 6. Rate Limit & Idempotency Quick Validation
```bash
# Test idempotency - same key should return same response
curl -i -X POST https://<api-domain>/api/v1/users/me/avatar/upload-url \
  -H "Authorization: Bearer <JWT>" \
  -H "Idempotency-Key: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{"content_type":"image/png"}'

# Run again with same key - should get identical response
curl -i -X POST https://<api-domain>/api/v1/users/me/avatar/upload-url \
  -H "Authorization: Bearer <JWT>" \
  -H "Idempotency-Key: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{"content_type":"image/png"}'
```

**Expected:**
- ✅ Both responses identical (status, body, ETag)

### 7. Production Environment Variables Check

**Required Variables:**
```bash
# Security
ARGON2_TIME_COST=2
ARGON2_MEMORY_COST=131072  # 128MB for production
ARGON2_PARALLELISM=4       # 4 for production

# Email
EMAIL_VERIFICATION_EXPIRES_SECONDS=3600

# Rate Limiting
RATE_LIMIT_PASSWORD_CHANGE_PER_10MIN=3
RATE_LIMIT_AVATAR_UPLOAD_PER_10MIN=5
RATE_LIMIT_EMAIL_CHANGE_PER_HOUR=3

# MinIO
MINIO_PUBLIC_BASE_URL=https://<cdn-or-gateway-url>
MINIO_ENDPOINT=<internal-endpoint>
MINIO_ACCESS_KEY=<key>
MINIO_SECRET_KEY=<secret>

# MongoDB
MONGO_URI=mongodb://<user>:<pass>@<host>/<db>?replicaSet=rs0&authSource=admin

# KVKV Compliance
PII_ERASURE_RETENTION_DAYS=30

# Observability
PROMETHEUS_METRICS=true
OTEL_EXPORTER_OTLP_ENDPOINT=<endpoint>
```

### 8. Create Release Tag
```bash
git tag -a v1.1.0 -m "User Profile Management + Observability + Tests complete"
git push --tags
```

### 9. Deploy
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Post-Deployment Monitoring (First 60 Minutes)

### Critical Metrics

**1. Error Rate**
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) / 
sum(rate(http_requests_total[5m])) < 0.01
```
**Target:** < 1%

**2. P95 Latency**
```promql
histogram_quantile(0.95, 
  rate(profile_request_duration_seconds_bucket[5m]))
```
**Target:** < 500ms for critical endpoints

**3. MinIO Errors**
```promql
rate(avatar_confirm_total{result="error"}[5m])
```
**Target:** ≈ 0

**4. Redis RTT**
```promql
redis_command_duration_seconds{command="get"}
```
**Target:** < 5ms

**5. Erasure Worker**
```promql
account_erasure_jobs_total{result="ok"}
```
**Target:** Incrementing for eligible users

### Quick Smoke Test (Non-Destructive)

```bash
# Get ETag
ETAG=$(curl -s -H "Authorization: Bearer $JWT" \
  https://<api>/api/v1/users/me -i | \
  grep -i ETag | cut -d' ' -f2)

# Update profile with If-Match
curl -i -X PATCH https://<api>/api/v1/users/me \
  -H "Authorization: Bearer $JWT" \
  -H "If-Match: $ETAG" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"OK"}'
```

**Expected:**
- ✅ 200 OK
- ✅ New ETag in response
- ✅ Profile updated

## Rollback Plan

If critical issues detected:

```bash
# 1. Rollback to previous version
git checkout v1.0.0
docker compose -f docker-compose.prod.yml up -d

# 2. Clear Redis rate limit keys (if needed)
docker exec -it vorte-redis redis-cli FLUSHDB

# 3. Monitor recovery
curl https://<api>/api/health
```

## Success Criteria

- ✅ All tests passing
- ✅ Error rate < 1%
- ✅ P95 latency < 500ms
- ✅ No 5xx errors in first hour
- ✅ Rate limiting working correctly
- ✅ Idempotency verified
- ✅ ETag concurrency control working
- ✅ Erasure worker processing jobs
- ✅ Metrics and traces visible in monitoring

## Sign-Off

- [ ] Tests passed
- [ ] Infrastructure verified
- [ ] Environment variables checked
- [ ] Deployed to production
- [ ] Post-deployment monitoring complete
- [ ] No critical issues detected

**Deployed by:** _____________  
**Date:** _____________  
**Version:** v1.1.0
