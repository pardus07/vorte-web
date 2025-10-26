# Pull Request

## Summary
<!-- Brief description of what this PR does -->

User Profile Management feature with rate limiting, idempotency, and observability.

## Scope

### Routers
- 9 new endpoints (GET/PATCH/POST/DELETE)
- Profile retrieval and updates
- Email change flow (request + confirm)
- Password change
- Avatar management (upload-url + confirm + delete)
- Account deletion

### Services
- ProfileService - Profile CRUD with ETag support
- EmailVerificationService - 2-step email verification
- PasswordService - Secure password management
- AvatarService - MinIO presigned URL handling
- AccountErasureService - KVKV-compliant deletion

### Infrastructure
- Prometheus metrics for all operations
- OpenTelemetry distributed tracing
- MinIO CORS configuration
- Background PII erasure worker
- Rate limiting with Redis
- Idempotency support (24h window)

## Tests

### Unit Tests
- ✅ 8/8 passing (0.58s)
- ProfileService version conflict
- EmailVerificationService validation
- PasswordService security
- AvatarService validation
- AccountErasureService job queueing

### Integration Tests
- ✅ Rate limiting (3 tests)
  - Password change: 3/10min limit
  - Avatar upload: 5/10min limit
  - Email change: 3/hour limit
- ✅ Idempotency (4 tests)
  - Email change idempotency
  - Password change idempotency
  - Avatar upload URL idempotency
  - Account deletion idempotency
- ✅ Concurrency Control (3 tests)
  - Profile update concurrent conflict
  - Avatar confirm concurrent conflict
  - Avatar delete concurrent conflict

### Running Tests
```bash
# Linux/Mac
make test-all

# Windows
.\apps\backend\tests\test_runner.ps1 all
```

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] MinIO bucket & CORS configured
- [ ] MongoDB replica set active
- [ ] Production Argon2 parameters set (128MB, parallelism=4)
- [ ] Rate limit environment variables configured
- [ ] MINIO_PUBLIC_BASE_URL set correctly
- [ ] Prometheus alerts configured
- [ ] OpenTelemetry collector endpoint set

## Post-Deployment Monitoring

### Critical Metrics (First 60 Minutes)
- [ ] 5xx error rate < 1%
- [ ] P95 latency < 500ms for critical endpoints
- [ ] MinIO upload/confirm error rate ≈ 0
- [ ] Redis RTT < 5ms
- [ ] Erasure worker processing jobs

### Quick Smoke Test
```bash
# Get ETag
ETAG=$(curl -s -H "Authorization: Bearer $JWT" \
  https://<api>/api/v1/users/me -i | \
  grep -i ETag | cut -d' ' -f2)

# Update profile
curl -i -X PATCH https://<api>/api/v1/users/me \
  -H "Authorization: Bearer $JWT" \
  -H "If-Match: $ETAG" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"OK"}'
```

## Breaking Changes
- None (all new features)

## Migration Required
- [ ] Run `bash scripts/minio_bootstrap.sh` for avatars bucket
- [ ] Verify MongoDB indexes created (deleted_at, erasure_requested)
- [ ] Set production environment variables

## Documentation
- [x] API endpoints documented
- [x] Testing guide created (TESTING.md)
- [x] Ship checklist created (SHIP_CHECKLIST.md)
- [x] CHANGELOG updated

## Related Issues
Closes #XXX

## Screenshots/Demo
<!-- If applicable, add screenshots or demo links -->

## Reviewer Notes
<!-- Any specific areas you want reviewers to focus on -->

Focus areas:
- Rate limiting implementation
- Idempotency caching strategy
- ETag-based optimistic locking
- Background erasure worker logic
- Test coverage completeness

---

**Ready for Review:** ✅  
**Ready for Merge:** ⏳ (pending review)
