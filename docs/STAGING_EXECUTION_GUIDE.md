# 🚀 Staging Execution Guide - Copy-Paste Ready

**Date**: 2025-01-26  
**Status**: Ready to Execute  
**Duration**: ~30 minutes

---

## ✅ Pre-Flight Checklist (2 min)

```bash
# Verify access
[ ] BASE_URL: https://staging-api.yourcompany.com
[ ] Prometheus: http://prometheus-staging:9090
[ ] Grafana: https://grafana-staging.yourcompany.com
[ ] kubectl: Access to staging cluster
[ ] mongosh: Access to staging MongoDB

# Verify configuration
[ ] Webhook/callback IP allowlists updated
[ ] SMTP/SMS in sandbox mode
[ ] API keys are staging values (not production!)
[ ] TLS certificate valid
```

---

## 1️⃣ Run Audit (5 min)

### Linux/macOS/WSL
```bash
export BASE_URL="https://staging-api.yourcompany.com"
export PROMETHEUS_URL="http://prometheus-staging:9090"
export MONGO_URI="mongodb://staging-mongo:27017"
export DB_NAME="payment_system"

chmod +x scripts/pre-launch-audit.sh
./scripts/pre-launch-audit.sh "$BASE_URL"
echo "EXIT CODE: $?"
```

### Windows PowerShell
```powershell
$BaseUrl = "https://staging-api.yourcompany.com"
$env:PROMETHEUS_URL = "http://prometheus-staging:9090"
$env:MONGO_URI = "mongodb://staging-mongo:27017"
$env:DB_NAME = "payment_system"

.\scripts\pre-launch-audit.ps1 -BaseUrl $BaseUrl
Write-Host "EXIT CODE: $LASTEXITCODE"
```

### Extract Failures (if any)
```bash
# Bash
./scripts/pre-launch-audit.sh "$BASE_URL" | grep -E "FAIL|ERROR|CRITICAL" -n

# PowerShell
.\scripts\pre-launch-audit.ps1 -BaseUrl $BaseUrl | Select-String -Pattern "FAIL|ERROR|CRITICAL"
```

**Expected**: EXIT CODE: 0, Passed: 28+, Failed: 0

---

## 2️⃣ Import Dashboard (2 min)

1. Open Grafana: `https://grafana-staging.yourcompany.com`
2. **Dashboards → Import**
3. Upload: `infra/monitoring/grafana/dashboards/day-0-1-monitoring.json`
4. Data source: **Prometheus (Staging)**
5. Click **Import**

**Verify panels load**:
- Service Uptime
- Error Rate
- P95 Latency
- Payment Success Rate
- Notification Backlog

---

## 3️⃣ Functional Smoke Tests (10 min)

### Test 1: Successful Payment (iyzico)
```bash
# Test card: 5528790000000008, Expiry: 12/30, CVV: 123, 3DS: 123456

# Create order
ORDER_ID=$(curl -X POST https://staging-api.yourcompany.com/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"sku": "TEST-001", "quantity": 1, "price": 100.00}],
    "customer": {"email": "test@example.com", "phone": "+905551234567"}
  }' | jq -r '.orderId')

echo "Order ID: $ORDER_ID"

# Initialize payment
curl -X POST https://staging-api.yourcompany.com/api/v1/payments/init \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"provider\": \"iyzico\",
    \"amount\": 100.00,
    \"currency\": \"TRY\"
  }"

# Complete 3DS (manual step in browser)
# Then check status
curl -i https://staging-api.yourcompany.com/api/v1/orders/$ORDER_ID/payment
```

**Expected**:
- [ ] Payment status: SUCCESS
- [ ] order_confirmation email received
- [ ] order_confirmation SMS received
- [ ] ETag header present
- [ ] Last-Modified header present

---

### Test 2: Failed Payment (insufficient funds)
```bash
# Test card: 5406670000000009, Expiry: 12/30, CVV: 123

# Create order
ORDER_ID=$(curl -X POST https://staging-api.yourcompany.com/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"sku": "TEST-002", "quantity": 1, "price": 50.00}],
    "customer": {"email": "test@example.com", "phone": "+905551234567"}
  }' | jq -r '.orderId')

# Initialize payment (will fail)
curl -X POST https://staging-api.yourcompany.com/api/v1/payments/init \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"provider\": \"iyzico\",
    \"amount\": 50.00,
    \"currency\": \"TRY\"
  }"

# Check status
curl -i https://staging-api.yourcompany.com/api/v1/orders/$ORDER_ID/payment
```

**Expected**:
- [ ] Payment status: FAILED
- [ ] payment_failed email received
- [ ] payment_failed SMS received
- [ ] Retry link included
- [ ] Problem Details format (RFC 9457)

---

### Test 3: ETag/304 Caching
```bash
# First request
RESPONSE=$(curl -i https://staging-api.yourcompany.com/api/v1/orders/$ORDER_ID/payment)
echo "$RESPONSE"

# Extract ETag
ETAG=$(echo "$RESPONSE" | grep -i "etag:" | cut -d' ' -f2 | tr -d '\r')
echo "ETag: $ETAG"

# Second request with If-None-Match
curl -i https://staging-api.yourcompany.com/api/v1/orders/$ORDER_ID/payment \
  -H "If-None-Match: $ETAG"
```

**Expected**:
- [ ] First request: 200 OK with ETag + Last-Modified
- [ ] Second request: 304 Not Modified
- [ ] ETag preserved in 304
- [ ] Last-Modified preserved in 304

---

### Test 4: Trace Context Propagation
```bash
# Generate trace ID
TRACE_ID="00-$(openssl rand -hex 16)-$(openssl rand -hex 8)-01"
REQUEST_ID=$(uuidgen || echo "req-$(date +%s)")

echo "Trace ID: $TRACE_ID"
echo "Request ID: $REQUEST_ID"

# Send request with tracing headers
curl -i https://staging-api.yourcompany.com/api/v1/orders/$ORDER_ID/payment \
  -H "traceparent: $TRACE_ID" \
  -H "X-Request-Id: $REQUEST_ID"
```

**Expected**:
- [ ] X-Request-Id: $REQUEST_ID in response
- [ ] traceparent propagated in response
- [ ] Same trace_id in logs

---

## 4️⃣ Check Dashboard Metrics (5 min)

Open Grafana dashboard and verify:

```
✅ Service Uptime: 100% (all instances UP)
✅ Error Rate: < 1% (target: < 0.5%)
✅ P95 Latency: < 2s (target: < 1.5s)
✅ Active Alerts: 0
✅ Payment Success Rate: > 95%
✅ Notification Backlog: < 100
✅ Pod Restarts (24h): < 5
✅ Request ID Propagation: > 99%
```

---

## 5️⃣ Infrastructure Health (3 min)

### Kubernetes Pods
```bash
kubectl get pods -n payment-system
```
**Expected**: All pods Running and Healthy

### Database Connectivity
```bash
# MongoDB
mongosh "$MONGO_URI/$DB_NAME" --eval "db.adminCommand('ping')"

# Redis
redis-cli -h staging-redis ping
```
**Expected**: MongoDB ok:1, Redis PONG

### Prometheus Targets
```bash
curl -s http://prometheus-staging:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```
**Expected**: All targets health: "up"

---

## 6️⃣ Security Validation (3 min)

### TLS Certificate
```bash
openssl s_client -connect staging-api.yourcompany.com:443 -servername staging-api.yourcompany.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```
**Expected**: Valid dates, not expired

### Security Headers
```bash
curl -I https://staging-api.yourcompany.com/api/health
```
**Expected**:
- [ ] Strict-Transport-Security
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] Content-Security-Policy

### PII Masking
```bash
kubectl logs -n payment-system deployment/payment-api --tail=100 | grep -E "card|cvv|pan" || echo "No PII found (good!)"
```
**Expected**: No full card numbers or CVV in logs

---

## 7️⃣ Fill Validation Summary (2 min)

Copy-paste this template into `docs/STAGING_VALIDATION_SUMMARY.md`:

```markdown
## Staging Validation — 2025-01-26

**Audit**
- Exit code: 0
- Passed: 28 / Failed: 0 / Warnings: 1

**Functional**
- Success flow: PASS (email+SMS received)
- Failure flow: PASS (email+SMS + retry link)
- ETag/304: PASS
- Trace headers: PASS

**Metrics**
- HTTP P95: 1.2s ✅
- Error rate: 0.3% ✅
- Payment success rate: 98% ✅
- Notification backlog: 24 ✅

**Infrastructure**
- Pods: All healthy ✅
- DB/Redis: Responding ✅
- TLS & security headers: PASS ✅

**Decision**: ✅ GO for Production

**Notes**: All critical checks passed. Minor warning on rate limiting headers (configured at proxy level).

**Validator**: [YOUR NAME]
**Date**: 2025-01-26
```

---

## 8️⃣ GO/NO-GO Decision

### ✅ GO Criteria (All must pass)
- [x] Audit exit code: 0
- [x] All critical checks: PASS
- [x] Dashboard metrics: Green
- [x] Functional tests: All pass
- [x] Infrastructure: Healthy
- [x] Security: Validated

### 🛑 HOLD Criteria (Any triggers hold)
- [ ] Audit exit code: 1
- [ ] Critical check: FAIL
- [ ] Error rate: > 5%
- [ ] P95 latency: > 5s
- [ ] Payment success rate: < 90%
- [ ] Security issue found

---

## 🚀 If GO: Production Cutover Timeline

### T-24 Hours
- [ ] Staging validation complete ✅
- [ ] Security review sign-off
- [ ] Load testing complete
- [ ] Stakeholder approval
- [ ] Communication plan ready

### T-1 Hour
```bash
# Run production audit
export BASE_URL="https://api.yourcompany.com"
./scripts/pre-launch-audit.sh "$BASE_URL"
```
- [ ] All checks pass
- [ ] Team on standby
- [ ] Rollback plan ready

### T-0 (Launch)
```bash
# Deploy to production
kubectl apply -f infra/k8s/ --namespace=production

# Watch rollout
kubectl rollout status deployment/payment-api -n production
```
- [ ] Monitor dashboard continuously
- [ ] Watch for alerts
- [ ] Verify critical flows

### T+30 Minutes
- [ ] Error rate < 1%
- [ ] Payment success rate > 95%
- [ ] No critical alerts
- [ ] Update stakeholders

### T+2 Hours
- [ ] Review all metrics
- [ ] Verify webhook processing
- [ ] Check notification backlog
- [ ] Document any issues

### T+24 Hours
- [ ] Performance trends analysis
- [ ] Customer feedback review
- [ ] Plan optimizations
- [ ] Celebrate! 🎉

---

## 🛑 If HOLD: Issue Resolution

1. **Document all failures**
   ```bash
   ./scripts/pre-launch-audit.sh "$BASE_URL" | grep -E "FAIL|ERROR" > staging-failures.txt
   ```

2. **Create fix tickets**
   - Assign owners
   - Set priority
   - Target fix date

3. **Re-run validation**
   - After fixes applied
   - Full audit + functional tests
   - New GO/NO-GO decision

---

## 📞 Support Contacts

**Staging Issues**:
- DevOps: [contact]
- Backend: [contact]
- Security: [contact]

**Provider Support**:
- iyzico: +90 850 222 0 600
- PayTR: +90 444 25 52

**Emergency**:
- On-Call: [PagerDuty/Slack]

---

## 📋 Critical Notes

### IP Allowlists
- [ ] Verify latest IPs from provider panels
- [ ] No hard-coded IPs in config
- [ ] Both staging and production updated

### Secrets Rotation
- [ ] Staging secrets rotated post-audit
- [ ] Rollback-safe (old secrets still work for 24h)
- [ ] Production secrets ready

### Cache Discipline
- [ ] 304 responses include ETag + Last-Modified
- [ ] Both headers preserved together
- [ ] RFC 9110/9111 compliant

### Observability
- [ ] X-Request-Id (human-readable)
- [ ] traceparent (machine-readable)
- [ ] Both propagated in all responses

---

**Status**: Ready to Execute  
**Next Action**: Run audit and fill validation summary

**🚀 LET'S GO!**
