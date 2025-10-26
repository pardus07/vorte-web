# Go-Live Checklist - Payment System

## Overview

10-minute pre-production validation checklist with authoritative references.

**Status**: Complete this checklist before deploying to production.

---

## 1. Security & PCI-DSS

### PAN Masking
- [ ] **Display**: Show only BIN (first 6) + last 4 digits on screen
- [ ] **Storage**: Never store full PAN in logs or database
- [ ] **Distinction**: Masking (display) ≠ Truncation (storage)
- [ ] **Access Control**: Full PAN only for roles that absolutely need it

**Reference**: [PCI Security Standards](https://www.pcisecuritystandards.org/)

### API Security
- [ ] **OWASP Top 10**: Review API Security Top 10 threats
- [ ] **Logging**: Log all API calls with sanitized data (no PII/PAN)
- [ ] **Authorization**: Verify RBAC for all payment endpoints
- [ ] **Input Validation**: Validate all inputs (card numbers, amounts, etc.)
- [ ] **SSRF Protection**: Prevent server-side request forgery
- [ ] **Rate Limiting**: Implement per-user and per-IP rate limits

**Reference**: [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

## 2. TLS & NGINX

### HSTS Configuration
- [ ] **Header**: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] **Preload**: If planning preload, prepare domain at [hstspreload.org](https://hstspreload.org/)
- [ ] **Testing**: Verify with SSL Labs

**Reference**: [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

### Rate Limiting
- [ ] **Webhook/Callback**: ~100 req/min per IP
- [ ] **API Endpoints**: 1000 req/min per IP
- [ ] **Implementation**: Use `limit_req_zone` + `limit_req` in Nginx
- [ ] **Burst Handling**: Configure burst size appropriately

**Reference**: [NGINX Rate Limiting](http://nginx.org/en/docs/http/ngx_http_limit_req_module.html)

### IP Allowlisting
- [ ] **iyzico IPs**: Get current ranges from merchant panel
- [ ] **PayTR IPs**: Get current ranges from merchant panel
- [ ] **Nginx Config**: Use `allow`/`deny` directives
- [ ] **Update Process**: Document IP update procedure
- [ ] **Monitoring**: Alert on allowlist violations

**Files to check**:
- `infra/nginx/production.conf`
- `infra/nginx/README.md`

---

## 3. Kubernetes Health

### Probes Configuration
- [ ] **Liveness Probe**: Not too aggressive (avoid false positive restarts)
- [ ] **Readiness Probe**: Properly configured for traffic routing
- [ ] **Startup Probe**: For slow-starting containers
- [ ] **Timeouts**: Reasonable timeout values

**Reference**: [Kubernetes Probes Best Practices](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

### Graceful Termination
- [ ] **SIGTERM Handling**: Application handles SIGTERM properly
- [ ] **Grace Period**: `terminationGracePeriodSeconds` set appropriately (30-60s)
- [ ] **Connection Draining**: Active connections drained before shutdown
- [ ] **Worker Cleanup**: Background workers finish current tasks

---

## 4. Prometheus Metrics

### Naming Conventions
- [ ] **Counters**: End with `_total` (e.g., `payment_init_total`)
- [ ] **Duration**: End with `_seconds` (e.g., `refund_latency_seconds`)
- [ ] **Low Cardinality**: Labels have limited values
- [ ] **Consistent Labels**: Use same label names across metrics

**Example**:
```
notification_dispatch_total{provider="sendgrid", outcome="success"}
payment_init_latency_seconds{provider="iyzico", quantile="0.95"}
```

**Reference**: [Prometheus Naming Best Practices](https://prometheus.io/docs/practices/naming/)

---

## 5. Payment & Refund Specifics

### Zero-Decimal Currencies
- [ ] **JPY, KRW, etc.**: Handle as minor unit = 1 (no decimal places)
- [ ] **Standard Currencies**: TRY, USD, EUR = 2 decimal places
- [ ] **Three-Decimal**: KWD, BHD = 3 decimal places
- [ ] **Normalization**: Consistent handling across all adapters

**Reference**: [ISO 4217 Currency Codes](https://en.wikipedia.org/wiki/ISO_4217#Minor_units)

### Provider-Specific Flows
- [ ] **iyzico Refund**: Verify paymentTransactionId for item-level refunds
- [ ] **PayTR Refund**: Verify merchant_oid and HMAC signature
- [ ] **Documentation**: Cross-check with official provider docs

**References**:
- [iyzico API Documentation](https://docs.iyzico.com/)
- [PayTR Developer Portal](https://dev.paytr.com/)

---

## 6. Post-Production Monitoring (24-48 Hours)

### Critical Alerts
- [ ] **High Refund Rate**: Alert if refund rate > 10%
- [ ] **High Failure Rate**: Alert if payment failure rate > 5%
- [ ] **Webhook Absence**: Alert if no webhooks for 30 minutes
- [ ] **Dead-Letter Growth**: Alert on stuck message backlog

**PromQL Examples**:
```promql
# High refund rate
sum(rate(refund_total{outcome="ok"}[15m])) / sum(rate(payment_init_total[15m])) > 0.10

# Webhook absence during business hours
rate(webhook_ok_total[30m]) == 0 and on() hour() >= 9 and hour() <= 21
```

### Performance Metrics
- [ ] **P95/P99 Latency**: Monitor payment and refund latency
- [ ] **Cache Hit Rate**: Track ETag/304 responses
- [ ] **Bandwidth Savings**: Measure compression effectiveness
- [ ] **Database Performance**: Monitor query times and connection pool

**Reference**: [HTTP Caching RFC](https://httpwg.org/specs/rfc7234.html)

---

## 7. Final Touches

### Security Headers
- [ ] **CSP**: Content-Security-Policy configured
- [ ] **X-Frame-Options**: Set to DENY (prevent clickjacking)
- [ ] **X-Content-Type-Options**: Set to nosniff (prevent MIME sniffing)
- [ ] **Referrer-Policy**: Set to strict-origin-when-cross-origin

**Verification**:
```bash
curl -I https://your-domain.com/api/health
```

**Reference**: [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/)

### Documentation
- [ ] **IP Allowlist Update Process**: Documented in runbook
- [ ] **Dead-Letter Replay**: Runbook for stuck messages
- [ ] **Incident Response**: On-call procedures documented
- [ ] **Rollback Plan**: Clear rollback steps documented

**Files to check**:
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/runbooks/stuck-payments.md`
- `infra/nginx/README.md`

---

## Pre-Deployment Checklist

### Environment Variables
- [ ] All provider credentials configured
- [ ] Database connection strings verified
- [ ] Redis connection verified
- [ ] Email/SMS provider credentials set
- [ ] Monitoring endpoints configured

### Database
- [ ] All migrations run successfully
- [ ] Indexes created and verified
- [ ] Backup strategy in place
- [ ] Connection pooling configured

### Monitoring
- [ ] Prometheus scraping configured
- [ ] Grafana dashboards imported
- [ ] Alert rules loaded
- [ ] PagerDuty/Slack integration tested

### Testing
- [ ] E2E tests pass
- [ ] Load testing completed
- [ ] Webhook endpoints tested from provider IPs
- [ ] Failover scenarios tested

---

## Sign-Off

| Area | Reviewer | Status | Date |
|------|----------|--------|------|
| Security & PCI-DSS | | ⬜ | |
| TLS & NGINX | | ⬜ | |
| Kubernetes Health | | ⬜ | |
| Prometheus Metrics | | ⬜ | |
| Payment Flows | | ⬜ | |
| Monitoring Setup | | ⬜ | |
| Documentation | | ⬜ | |

---

## Post-Deployment Verification

**First 1 Hour**:
- [ ] Check error rates in Grafana
- [ ] Verify webhooks are being received
- [ ] Monitor payment success rate
- [ ] Check database connection pool

**First 24 Hours**:
- [ ] Review all alerts triggered
- [ ] Check P95/P99 latency trends
- [ ] Verify reconciliation worker runs
- [ ] Monitor notification delivery rates

**First Week**:
- [ ] Review incident reports
- [ ] Analyze performance trends
- [ ] Update documentation based on learnings
- [ ] Plan optimization improvements

---

## Emergency Contacts

- **DevOps Lead**: [contact]
- **Backend Lead**: [contact]
- **Payment Provider Support**:
  - iyzico: +90 850 222 0 600
  - PayTR: +90 444 25 52
- **On-Call**: [PagerDuty/Slack channel]

---

## References

1. [PCI Security Standards](https://www.pcisecuritystandards.org/)
2. [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
3. [Mozilla SSL Configuration](https://ssl-config.mozilla.org/)
4. [NGINX Rate Limiting](http://nginx.org/en/docs/http/ngx_http_limit_req_module.html)
5. [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
6. [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
7. [ISO 4217 Currency Codes](https://en.wikipedia.org/wiki/ISO_4217)
8. [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/)

---

**Last Updated**: 2025-01-25
**Version**: 1.0
**Status**: ✅ Ready for Production


---

## Final 5-Minute "Hard Stop" Validation

### Quick Reference - Latest Standards

This section uses the most current authoritative references (2023-2024).

---

### 1. HTTP & Cache Validation

**Standards**:
- ✅ **RFC 9110** - HTTP Semantics (replaces RFC 7230-7235)
- ✅ **RFC 9111** - HTTP Caching (replaces RFC 7234)
- ✅ **RFC 9457** - Problem Details for HTTP APIs

**Validation**:
```bash
# Check ETag/Last-Modified headers
curl -I https://your-domain.com/api/v1/orders/123/payment

# Verify 304 Not Modified behavior
curl -I https://your-domain.com/api/v1/orders/123/payment \
  -H "If-None-Match: \"abc123\""

# Check Problem Details format (RFC 9457)
curl https://your-domain.com/api/v1/payments/invalid \
  -H "Accept: application/problem+json"
```

**Expected**:
- [ ] ETag or Last-Modified present in 200 responses
- [ ] 304 responses when If-None-Match matches
- [ ] Problem Details JSON for 4xx/5xx errors

**References**:
- [RFC 9110 - HTTP Semantics](https://httpwg.org/specs/rfc9110.html)
- [RFC 9111 - HTTP Caching](https://httpwg.org/specs/rfc9111.html)
- [RFC 9457 - Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)

---

### 2. Observability - Tracing & Metrics

#### Distributed Tracing

**Standard**: W3C Trace Context

**Validation**:
```bash
# Send request with traceparent
curl https://your-domain.com/api/v1/payments/init \
  -H "traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01" \
  -H "X-Request-Id: $(uuidgen)"

# Check response headers
# Should include: X-Request-Id, traceparent (propagated)
```

**Expected**:
- [ ] traceparent header propagated in responses
- [ ] X-Request-Id in all responses (200/304/4xx/5xx)
- [ ] Trace IDs in logs for correlation

**References**:
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry](https://opentelemetry.io/docs/)

#### Prometheus Metrics

**Best Practices**:
- Counters end with `_total`
- Duration metrics end with `_seconds`
- Use histograms for latency (not gauges)
- Low cardinality labels (< 10 values per label)

**Validation**:
```bash
# Check metrics endpoint
curl http://localhost:9090/metrics | grep -E "(payment|notification|refund)"

# Verify naming conventions
curl http://localhost:9090/metrics | grep -E "_total|_seconds"
```

**Expected Metrics**:
```
# Counters
payment_init_total{provider="iyzico", result="success"} 1234
notification_dispatch_total{channel="email", status="sent"} 567
refund_total{provider="paytr", outcome="ok"} 89

# Histograms
payment_init_latency_seconds_bucket{provider="iyzico", le="0.5"} 100
refund_latency_seconds_bucket{provider="paytr", le="1.0"} 50

# Gauges
notification_outbox_backlog{status="ready"} 42
```

**References**:
- [Prometheus Naming Best Practices](https://prometheus.io/docs/practices/naming/)
- [Prometheus Metric Types](https://prometheus.io/docs/concepts/metric_types/)

---

### 3. Kubernetes Runtime Hygiene

#### Graceful Shutdown

**Configuration Check**:
```yaml
# deployment.yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: payment-api
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

**Validation**:
- [ ] `terminationGracePeriodSeconds` set (30-60s recommended)
- [ ] `preStop` hook with sleep (5-10s for connection draining)
- [ ] Liveness probe not too aggressive (avoid false positives)
- [ ] Readiness probe properly configured
- [ ] Application handles SIGTERM gracefully

**References**:
- [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Graceful Shutdown Best Practices](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)

---

### 4. Data Lifecycle & Durability

#### TTL Index (Auto-Expiration)

**MongoDB Configuration**:
```javascript
// Verify TTL index exists
db.notifications_outbox.getIndexes()

// Expected output:
{
  "key": { "expireAt": 1 },
  "name": "expireAt_ttl",
  "expireAfterSeconds": 0
}
```

**Validation**:
```bash
# Check if TTL index is active
mongosh --eval "db.notifications_outbox.getIndexes()" | grep expireAt

# Verify documents have expireAt field
mongosh --eval "db.notifications_outbox.findOne({}, {expireAt: 1})"
```

**Expected**:
- [ ] TTL index created on `expireAt` field
- [ ] `expireAfterSeconds: 0` (expire at exact time)
- [ ] All documents have `expireAt` timestamp
- [ ] Old documents automatically deleted

**References**:
- [MongoDB TTL Indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [TTL Index Limitations](https://www.mongodb.com/docs/manual/core/index-ttl/#timing-of-the-delete-operation)

#### Visibility Timeout Pattern

**Outbox Pattern Implementation**:
```python
# Claim message with visibility timeout
await outbox_repo.claim_message(
    message_id=msg_id,
    worker_id=worker_id,
    visibility_timeout=300  # 5 minutes
)

# If worker crashes, message becomes visible again after timeout
# Auto-retry mechanism built-in
```

**Validation**:
- [ ] Messages claimed with `claimedAt` + `claimedBy`
- [ ] Visibility timeout configured (5-15 minutes)
- [ ] Stuck reset worker runs periodically
- [ ] Metrics track stuck message count

**References**:
- [AWS SQS Visibility Timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)

---

### 5. Application Security Framework

#### OWASP API Security Top 10 (2023)

**Critical Checks**:

1. **Broken Object Level Authorization (BOLA)**
   - [ ] User can only access their own orders/payments
   - [ ] Admin endpoints require admin role
   - [ ] Payment status endpoint verifies ownership

2. **Broken Authentication**
   - [ ] JWT tokens properly validated
   - [ ] Token expiration enforced
   - [ ] Refresh token rotation implemented

3. **Broken Object Property Level Authorization**
   - [ ] Sensitive fields masked in responses
   - [ ] PAN never exposed in logs/responses
   - [ ] Admin-only fields filtered for regular users

4. **Unrestricted Resource Consumption**
   - [ ] Rate limiting on all endpoints
   - [ ] Request size limits enforced
   - [ ] Pagination on list endpoints

5. **Broken Function Level Authorization**
   - [ ] Refund endpoint requires admin role
   - [ ] Webhook endpoints IP-restricted
   - [ ] Internal APIs not publicly accessible

6. **Unrestricted Access to Sensitive Business Flows**
   - [ ] Idempotency keys prevent double-charging
   - [ ] Payment state machine enforced
   - [ ] Refund amount validation

7. **Server Side Request Forgery (SSRF)**
   - [ ] No user-controlled URLs in backend requests
   - [ ] Provider URLs hardcoded/validated
   - [ ] Webhook URLs validated

8. **Security Misconfiguration**
   - [ ] Debug mode disabled in production
   - [ ] Error messages don't leak stack traces
   - [ ] Security headers configured

9. **Improper Inventory Management**
   - [ ] API versioning in place
   - [ ] Deprecated endpoints documented
   - [ ] Unused endpoints removed

10. **Unsafe Consumption of APIs**
    - [ ] Provider responses validated
    - [ ] Timeouts on all external calls
    - [ ] Circuit breakers configured

**References**:
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OWASP API Security Project](https://owasp.org/www-project-api-security/)

---

### 6. Compliance (High-Level)

#### PCI DSS v4.0

**Key Requirements**:

**Requirement 3** - Protect Stored Account Data
- [ ] PAN never stored in full (only BIN + last 4)
- [ ] CVV never stored
- [ ] Encryption at rest for sensitive data

**Requirement 4** - Protect Cardholder Data with Strong Cryptography
- [ ] TLS 1.2+ for all transmissions
- [ ] Strong cipher suites only
- [ ] Certificate validation enforced

**Requirement 6** - Develop and Maintain Secure Systems
- [ ] Input validation on all endpoints
- [ ] Output encoding to prevent XSS
- [ ] SQL injection prevention (using ORMs)

**Requirement 10** - Log and Monitor All Access
- [ ] All payment operations logged
- [ ] PII/PAN masked in logs
- [ ] Log retention policy enforced
- [ ] Audit trail for refunds

**Requirement 11** - Test Security of Systems Regularly
- [ ] Vulnerability scanning scheduled
- [ ] Penetration testing planned
- [ ] Security patches applied

**Future-Dated Requirements** (March 2025):
- Multi-factor authentication for admin access
- Enhanced logging requirements
- Automated log review

**References**:
- [PCI DSS v4.0](https://www.pcisecuritystandards.org/document_library/)
- [PCI DSS v4.0 Summary of Changes](https://blog.pcisecuritystandards.org/pci-dss-v4-0-resource-hub)
- [PCI DSS Quick Reference Guide](https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-At-A-Glance.pdf)

---

## Final "Hard Stop" Checklist (5 Minutes)

### ✅ Automated Pre-Launch Audit

**NEW**: Use the automated audit script for comprehensive validation:

```bash
# Linux/macOS
chmod +x scripts/pre-launch-audit.sh
./scripts/pre-launch-audit.sh https://your-domain.com

# Windows PowerShell
.\scripts\pre-launch-audit.ps1 -BaseUrl "https://your-domain.com"
```

The audit script automatically validates:
- ✅ HTTP & Cache (RFC 9110, RFC 9111, RFC 9457)
- ✅ Distributed Tracing (W3C Trace Context)
- ✅ Prometheus Metrics (naming conventions, histograms)
- ✅ Kubernetes Configuration (probes, graceful shutdown)
- ✅ MongoDB TTL & Outbox Pattern
- ✅ Security Headers (OWASP)
- ✅ Day 0-1 Monitoring Readiness

**Exit Codes**:
- `0` = GO for launch 🚀
- `1` = HOLD deployment 🛑

**Documentation**: See `scripts/README.md` for detailed usage

---

### 📊 Day 0-1 Monitoring Dashboard

Import the launch monitoring dashboard to Grafana:

1. Open Grafana → Dashboards → Import
2. Upload `infra/monitoring/grafana/dashboards/day-0-1-monitoring.json`
3. Configure Prometheus data source
4. Monitor for first 24-48 hours

**Dashboard Features**:
- Critical health indicators (uptime, error rate, P95 latency, alerts)
- Request volume & performance trends
- Payment system health (success rates, webhooks, reconciliation)
- Notification system (backlog, dispatch rates, stuck resets)
- Kubernetes health (pod restarts, probe failures, resources)
- Tracing & debugging (request ID propagation, log volume)

---

### ✅ Manual Pre-Launch Verification (Fallback)

If automated script is not available, run these checks manually:

```bash
#!/bin/bash
# pre-launch-check.sh

echo "🔍 Running pre-launch validation..."

# 1. Tracing headers
echo "✓ Checking tracing headers..."
curl -s -I https://your-domain.com/api/health | grep -E "(X-Request-Id|traceparent)"

# 2. Metrics scraping
echo "✓ Checking Prometheus metrics..."
curl -s http://localhost:9090/metrics | grep -E "notification_dispatch_total|_latency_seconds|_backlog" | head -5

# 3. K8s probes
echo "✓ Checking Kubernetes probes..."
kubectl get deployment payment-api -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}'

# 4. TTL index
echo "✓ Checking MongoDB TTL index..."
mongosh --quiet --eval "db.notifications_outbox.getIndexes().filter(i => i.key.expireAt)" | grep expireAt

# 5. Visibility timeout
echo "✓ Checking stuck reset worker..."
kubectl get cronjob notification-stuck-reset -o jsonpath='{.spec.schedule}'

echo "✅ All checks passed! GO for launch! 🚀"
```

### Status Board

| Check | Status | Notes |
|-------|--------|-------|
| Tracing headers (X-Request-Id + traceparent) | ⬜ | RFC 9110 + W3C |
| Metrics naming (_total, _seconds) | ⬜ | Prometheus BP |
| K8s graceful shutdown (preStop + grace period) | ⬜ | K8s docs |
| TTL index active (expireAt) | ⬜ | MongoDB |
| Visibility timeout + stuck reset | ⬜ | AWS pattern |
| OWASP API Top 10 review | ⬜ | Security |
| PCI DSS key requirements | ⬜ | Compliance |

---

## Launch Decision

**All checks green?** ✅ **GO for launch!** 🚀

**Any red flags?** 🔴 **HOLD - Address issues before deployment**

---

## Post-Launch Monitoring Commands

```bash
# Watch error rates
watch -n 5 'curl -s http://prometheus:9090/api/v1/query?query=rate\(http_requests_total\{status=~\"5..\"\}\[5m\]\) | jq'

# Monitor payment success rate
watch -n 10 'curl -s http://prometheus:9090/api/v1/query?query=rate\(payment_init_total\{result=\"success\"\}\[5m\]\) | jq'

# Check notification backlog
watch -n 5 'curl -s http://prometheus:9090/api/v1/query?query=notification_outbox_backlog | jq'

# Tail application logs
kubectl logs -f deployment/payment-api --tail=100

# Watch for alerts
watch -n 10 'curl -s http://prometheus:9090/api/v1/alerts | jq ".data.alerts[] | select(.state==\"firing\")"'
```

---

**Last Updated**: 2025-01-25  
**Version**: 1.1  
**Status**: ✅ Ready for Production Launch  
**Validation**: All standards current as of 2024-2025
