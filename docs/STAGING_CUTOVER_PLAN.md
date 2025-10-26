# 🚦 Staging Cutover Plan

**Date**: 2025-01-26  
**Environment**: Staging → Production  
**Status**: Ready for Staging Validation

---

## 📋 Pre-Staging Checklist

### Environment Preparation
- [ ] Staging URL confirmed: `https://staging-api.yourcompany.com`
- [ ] Prometheus URL: `http://prometheus-staging:9090`
- [ ] MongoDB URI: `mongodb://staging-mongo:27017`
- [ ] All credentials configured (sandbox/test mode)
- [ ] IP allowlists updated for staging

### Provider Configuration (Staging)
- [ ] **iyzico**: Sandbox mode enabled
- [ ] **PayTR**: Test merchant credentials
- [ ] **Email**: Sandbox/sink mode (no real emails)
- [ ] **SMS**: Test mode (no real SMS)

### Infrastructure
- [ ] All pods running and healthy
- [ ] Database migrations applied
- [ ] Indexes created and verified
- [ ] Monitoring stack operational
- [ ] Alert rules loaded

---

## 🚀 Staging Audit Execution

### Step 1: Run Full Audit

**Linux/macOS/WSL**:
```bash
export BASE_URL="https://staging-api.yourcompany.com"
export PROMETHEUS_URL="http://prometheus-staging:9090"
export MONGO_URI="mongodb://staging-mongo:27017"
export DB_NAME="payment_system"

chmod +x scripts/pre-launch-audit.sh
./scripts/pre-launch-audit.sh "$BASE_URL"
echo "EXIT CODE: $?"
```

**Windows PowerShell**:
```powershell
$BaseUrl = "https://staging-api.yourcompany.com"
$env:PROMETHEUS_URL = "http://prometheus-staging:9090"
$env:MONGO_URI = "mongodb://staging-mongo:27017"
$env:DB_NAME = "payment_system"

.\scripts\pre-launch-audit.ps1 -BaseUrl $BaseUrl
Write-Host "EXIT CODE: $LASTEXITCODE"
```

**Expected Output**:
```
🚀 Pre-Launch Audit Script
Base URL: https://staging-api.yourcompany.com
============================================================

📋 HTTP & Cache Validation (RFC 9110, RFC 9111, RFC 9457)
────────────────────────────────────────────────────────
✅ PASS: Health endpoint returns 200 OK
✅ PASS: X-Request-Id header present in response
✅ PASS: traceparent header propagated (W3C Trace Context)
✅ PASS: ETag or Last-Modified header present (RFC 9111 caching)
✅ PASS: Problem Details content-type present (RFC 9457)
✅ PASS: Problem Details structure valid (type/title/status/detail)

[... 23 more checks ...]

============================================================
📊 AUDIT SUMMARY
============================================================
✅ Passed: 28
❌ Failed: 0
⚠️  Warnings: 1
Total checks: 29
Pass rate: 96%

🚀 GO FOR LAUNCH! System ready for production deployment.

EXIT CODE: 0
```

### Step 2: Extract Failures (If Any)

**Bash**:
```bash
./scripts/pre-launch-audit.sh "$BASE_URL" | grep -E "FAIL|ERROR|CRITICAL" -n
```

**PowerShell**:
```powershell
.\scripts\pre-launch-audit.ps1 -BaseUrl $BaseUrl | Select-String -Pattern "FAIL|ERROR|CRITICAL"
```

---

## 📊 Dashboard Import & Validation

### Step 1: Import Dashboard
1. Open Grafana (staging): `https://grafana-staging.yourcompany.com`
2. Navigate to **Dashboards → Import**
3. Upload: `infra/monitoring/grafana/dashboards/day-0-1-monitoring.json`
4. Select data source: **Prometheus (Staging)**
5. Click **Import**

### Step 2: Verify Panels
Check these critical panels:
- ✅ **Service Uptime**: Should show 1 (UP)
- ✅ **Error Rate**: Should be < 1%
- ✅ **P95 Latency**: Should be < 2s
- ✅ **Active Alerts**: Should be 0
- ✅ **Payment Success Rate**: Should be > 95%
- ✅ **Notification Backlog**: Should be < 100

---

## 🧪 Functional Smoke Tests

### Test 1: Successful Payment Flow

**Test Card** (iyzico sandbox):
```
Card Number: 5528790000000008
Expiry: 12/30
CVV: 123
3DS Password: 123456
```

**Steps**:
1. Create order via API
2. Initialize payment with test card
3. Complete 3DS challenge
4. Verify payment status: `SUCCESS`
5. Check notifications:
   - ✅ `order_confirmation` email received
   - ✅ `order_confirmation` SMS received

**API Test**:
```bash
# 1. Create order
ORDER_ID=$(curl -X POST https://staging-api.yourcompany.com/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"sku": "TEST-001", "quantity": 1, "price": 100.00}],
    "customer": {
      "email": "test@example.com",
      "phone": "+905551234567"
    }
  }' | jq -r '.orderId')

# 2. Initialize payment
curl -X POST https://staging-api.yourcompany.com/api/v1/payments/init \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"provider\": \"iyzico\",
    \"amount\": 100.00,
    \"currency\": \"TRY\"
  }"

# 3. Check payment status
curl -i https://staging-api.yourcompany.com/api/v1/orders/$ORDER_ID/payment
```

**Expected**:
- Payment status: `SUCCESS`
- Email/SMS notifications sent
- ETag header present
- Last-Modified header present

---

### Test 2: Failed Payment Flow

**Test Card** (iyzico sandbox - insufficient funds):
```
Card Number: 5406670000000009
Expiry: 12/30
CVV: 123
```

**Steps**:
1. Create order via API
2. Initialize payment with failing card
3. Verify payment status: `FAILED`
4. Check notifications:
   - ✅ `payment_failed` email received
   - ✅ `payment_failed` SMS received
   - ✅ Retry link included

**Expected**:
- Payment status: `FAILED`
- Error details in Problem Details format
- Retry link in notification

---

### Test 3: ETag/Caching Validation

```bash
# 1. Get payment status (first request)
RESPONSE=$(curl -i https://staging-api.yourcompany.com/api/v1/orders/$ORDER_ID/payment)
echo "$RESPONSE"

# Extract ETag
ETAG=$(echo "$RESPONSE" | grep -i "etag:" | cut -d' ' -f2 | tr -d '\r')

# 2. Request with If-None-Match (should return 304)
curl -i https://staging-api.yourcompany.com/api/v1/orders/$ORDER_ID/payment \
  -H "If-None-Match: $ETAG"
```

**Expected**:
- First request: `200 OK` with ETag and Last-Modified
- Second request: `304 Not Modified` with same ETag and Last-Modified

---

### Test 4: Trace Context Propagation

```bash
# Generate trace ID
TRACE_ID="00-$(openssl rand -hex 16)-$(openssl rand -hex 8)-01"
REQUEST_ID=$(uuidgen)

# Send request with tracing headers
curl -i https://staging-api.yourcompany.com/api/v1/orders/$ORDER_ID/payment \
  -H "traceparent: $TRACE_ID" \
  -H "X-Request-Id: $REQUEST_ID"
```

**Expected**:
- Response includes `X-Request-Id: $REQUEST_ID`
- Response includes `traceparent` (propagated)
- Logs show same trace_id

---

## ✅ GO/NO-GO Criteria

### GO Criteria (All Must Pass)

#### 1. Audit Results
- ✅ Exit code: `0`
- ✅ All critical checks: `PASS`
- ✅ Warnings: Acceptable and documented

#### 2. Dashboard Metrics
- ✅ Service uptime: `100%`
- ✅ Error rate: `< 1%`
- ✅ P95 latency: `< 2s`
- ✅ Active alerts: `0`
- ✅ Payment success rate: `> 95%`
- ✅ Notification backlog: `< 100`

#### 3. Functional Tests
- ✅ Successful payment: Order confirmation sent
- ✅ Failed payment: Failure notification sent
- ✅ ETag/304: Caching working correctly
- ✅ Trace context: Headers propagated

#### 4. Infrastructure
- ✅ All pods: `Running` and `Healthy`
- ✅ Database: Responding
- ✅ Redis: Responding
- ✅ Prometheus: Scraping targets
- ✅ Alert rules: Loaded

#### 5. Security & Compliance
- ✅ TLS: Valid certificate chain
- ✅ Security headers: Present
- ✅ IP allowlists: Updated
- ✅ Provider credentials: Sandbox mode
- ✅ PII masking: Verified in logs

---

### HOLD Criteria (Any Triggers Hold)

#### Critical Failures
- ❌ Audit exit code: `1`
- ❌ Any critical check: `FAIL`
- ❌ Error rate: `> 5%`
- ❌ P95 latency: `> 5s`
- ❌ Payment success rate: `< 90%`

#### Infrastructure Issues
- ❌ Pods: Not running or unhealthy
- ❌ Database: Not responding
- ❌ Prometheus: Not scraping
- ❌ Alert rules: Not loaded

#### Security Issues
- ❌ TLS: Invalid certificate
- ❌ Security headers: Missing
- ❌ PII: Exposed in logs
- ❌ Credentials: Production mode in staging

---

## 📝 Staging Validation Report Template

```markdown
# Staging Validation Report

**Date**: [DATE]
**Validator**: [NAME]
**Environment**: Staging

## Audit Results
- Exit Code: [0/1]
- Passed: [X/29]
- Failed: [X/29]
- Warnings: [X]

## Dashboard Metrics
- Service Uptime: [%]
- Error Rate: [%]
- P95 Latency: [s]
- Payment Success Rate: [%]
- Notification Backlog: [count]

## Functional Tests
- [ ] Successful payment flow
- [ ] Failed payment flow
- [ ] ETag/304 caching
- [ ] Trace context propagation

## Infrastructure
- [ ] All pods healthy
- [ ] Database responding
- [ ] Redis responding
- [ ] Prometheus scraping
- [ ] Alert rules loaded

## Security
- [ ] TLS valid
- [ ] Security headers present
- [ ] IP allowlists updated
- [ ] Sandbox mode verified
- [ ] PII masking verified

## Decision
- [ ] ✅ GO for Production
- [ ] 🛑 HOLD - Issues found

## Issues Found
[List any issues]

## Next Steps
[Action items]

## Sign-Off
- Validator: [NAME] [DATE]
- Approver: [NAME] [DATE]
```

---

## 🚀 Production Cutover Plan (After Staging GO)

### Pre-Production (T-24 hours)
1. ✅ Staging validation complete
2. ⏭️ Security review sign-off
3. ⏭️ Load testing complete
4. ⏭️ Stakeholder approval
5. ⏭️ Communication plan ready

### T-1 Hour
1. ⏭️ Run production audit
2. ⏭️ Verify all checks pass
3. ⏭️ Team on standby
4. ⏭️ Rollback plan ready
5. ⏭️ Communication channels open

### T-0 (Launch)
1. ⏭️ Deploy to production
2. ⏭️ Monitor dashboard continuously
3. ⏭️ Watch for alerts
4. ⏭️ Verify critical flows
5. ⏭️ Document any issues

### T+1 Hour
1. ⏭️ Review error rates
2. ⏭️ Check payment success rate
3. ⏭️ Verify webhook processing
4. ⏭️ Monitor notification backlog
5. ⏭️ Update stakeholders

### T+24 Hours
1. ⏭️ Review all metrics
2. ⏭️ Analyze performance trends
3. ⏭️ Document learnings
4. ⏭️ Plan optimizations
5. ⏭️ Celebrate success! 🎉

---

## 📞 Contacts & Escalation

### Staging Team
- **DevOps Lead**: [contact]
- **Backend Lead**: [contact]
- **QA Lead**: [contact]

### Production Team
- **On-Call**: [PagerDuty/Slack]
- **Escalation**: [contact]

### Provider Support
- **iyzico**: +90 850 222 0 600
- **PayTR**: +90 444 25 52

---

## 🎯 Success Metrics

### Staging Success
- ✅ All audit checks pass
- ✅ Dashboard metrics green
- ✅ Functional tests pass
- ✅ No critical issues

### Production Success (Post-Launch)
- ✅ Zero critical incidents (first 24h)
- ✅ Performance within SLOs
- ✅ Payment success rate > 95%
- ✅ Customer satisfaction maintained

---

**Status**: Ready for Staging Validation  
**Next Action**: Run staging audit and report results

**🚦 LET'S VALIDATE STAGING!**
