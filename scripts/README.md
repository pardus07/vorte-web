# Launch Scripts

## 🚀 Launch Execution Scripts (NEW!)

### 90-Saniye Otomatik Launch

**Bash versiyonu:**
```bash
chmod +x scripts/launch-execute.sh
./scripts/launch-execute.sh
```

**PowerShell versiyonu:**
```powershell
.\scripts\launch-execute.ps1
```

Bu script otomatik olarak:
1. ✅ T-15: Roll call & takım hazırlığı
2. ✅ T-12: Staging audit çalıştırır
3. ✅ T-10: Image digest'i pin'ler
4. ✅ T-8: Production audit çalıştırır
5. ✅ GO/NO-GO kararı alır
6. ✅ T-5: Deploy başlatır
7. ✅ Monitoring talimatları verir

**Özellikler:**
- İnteraktif adım adım execution
- Otomatik audit validation
- Image digest pinning (crane/regctl)
- GO/NO-GO decision point
- Rollback komutları hazır
- Stop-the-line kriterleri

**Referans:** `docs/GREEN_ROOM_SCRIPT.md` - 90-saniye timeline

---

## Pre-Launch Audit Script

### Overview

Automated validation script that checks system readiness against latest standards:
- **RFC 9110** - HTTP Semantics
- **RFC 9111** - HTTP Caching  
- **RFC 9457** - Problem Details
- **W3C Trace Context** - Distributed tracing
- **Prometheus Best Practices** - Metrics naming
- **Kubernetes** - Graceful shutdown, probes
- **MongoDB** - TTL indexes, outbox pattern
- **OWASP API Security Top 10** - Security checks
- **PCI DSS v4.0** - Compliance basics

### Usage

```bash
# Make script executable
chmod +x scripts/pre-launch-audit.sh

# Run against local development
./scripts/pre-launch-audit.sh http://localhost:8000

# Run against staging
./scripts/pre-launch-audit.sh https://staging-api.yourcompany.com

# Run against production (final check)
./scripts/pre-launch-audit.sh https://api.yourcompany.com
```

### Environment Variables

```bash
# Optional - customize endpoints
export PROMETHEUS_URL="http://prometheus.yourcompany.com:9090"
export MONGO_URI="mongodb://user:pass@mongo.yourcompany.com:27017"
export DB_NAME="payment_system"

# Run audit
./scripts/pre-launch-audit.sh https://api.yourcompany.com
```

### Exit Codes

- **0** - All checks passed, ready for launch 🚀
- **0** - Warnings present but no critical failures ⚠️
- **1** - Critical failures found, hold deployment 🛑

### Sample Output

```
🚀 Pre-Launch Audit Script
Base URL: https://api.yourcompany.com
Prometheus: http://prometheus:9090
============================================================

📋 HTTP & Cache Validation (RFC 9110, RFC 9111, RFC 9457)
────────────────────────────────────────────────────────
✅ PASS: Health endpoint returns 200 OK
✅ PASS: X-Request-Id header present in response
✅ PASS: traceparent header propagated (W3C Trace Context)
✅ PASS: ETag or Last-Modified header present (RFC 9111 caching)
✅ PASS: Problem Details content-type present (RFC 9457)
✅ PASS: Problem Details structure valid (type/title/status/detail)

📊 Prometheus Metrics Validation
────────────────────────────────────────────────────────
✅ PASS: Prometheus API accessible
✅ PASS: Found 12 counter metrics with _total suffix
✅ PASS: Found 8 duration metrics with _seconds suffix
✅ PASS: Expected metric 'payment_init_total' found
✅ PASS: Expected metric 'notification_dispatch_total' found
✅ PASS: Found 15 histogram bucket metrics
✅ PASS: Histogram buckets include reasonable ranges (0.1, 0.5, 1, 5s)

☸️ Kubernetes Configuration
────────────────────────────────────────────────────────
✅ PASS: terminationGracePeriodSeconds set to 30s (≥30s)
✅ PASS: preStop hook configured for graceful shutdown
✅ PASS: Liveness probe configured
✅ PASS: Liveness probe failureThreshold ≥3 (avoids false positives)
✅ PASS: Readiness probe configured

🗄️ MongoDB TTL & Outbox Configuration
────────────────────────────────────────────────────────
✅ PASS: TTL index found on notifications_outbox.expireAt
✅ PASS: TTL index configured with expireAfterSeconds: 0 (exact expiration)
✅ PASS: Outbox documents have expireAt field (TTL lifecycle management)
✅ PASS: Outbox documents have claim fields (visibility timeout pattern)

🔒 Security & Compliance Quick Check
────────────────────────────────────────────────────────
✅ PASS: Security header 'Strict-Transport-Security' present
✅ PASS: Security header 'X-Frame-Options' present
✅ PASS: Security header 'X-Content-Type-Options' present
✅ PASS: Security header 'Content-Security-Policy' present
⚠️ WARN: Rate limiting headers not found (may be configured at proxy level)

📈 Day 0-1 Monitoring Readiness
────────────────────────────────────────────────────────
✅ PASS: Critical metric 'up' available
✅ PASS: Critical metric 'http_requests_total' available
✅ PASS: Critical metric 'http_request_duration_seconds' available
✅ PASS: Found 25 alert rules configured

============================================================
📊 AUDIT SUMMARY
============================================================
✅ Passed: 28
❌ Failed: 0
⚠️ Warnings: 1
Total checks: 29
Pass rate: 96%

🚀 GO FOR LAUNCH! System ready for production deployment.
```

## Day 0-1 Monitoring Dashboard

### Overview

Grafana dashboard optimized for the first 24-48 hours after launch:

- **Critical Health Indicators** - Service uptime, error rate, P95 latency, active alerts
- **Request Volume & Performance** - RPS, response time distribution
- **Payment System Health** - Success rates, webhook processing, reconciliation
- **Notification System** - Backlog monitoring, dispatch rates, visibility timeouts
- **Kubernetes Health** - Pod restarts, probe failures, resource usage
- **Tracing & Debugging** - Request ID propagation, trace context, log volume
- **Launch Checklist Status** - Pre-launch audit results

### Import Dashboard

1. Open Grafana
2. Navigate to **Dashboards → Import**
3. Upload `infra/monitoring/grafana/dashboards/day-0-1-monitoring.json`
4. Configure data source (Prometheus)
5. Save dashboard

### Key Alerts

The dashboard includes built-in alerts for:

- **Payment Success Rate < 95%** - Critical payment system health
- **Notification Backlog > 1000** - Message queue overflow
- **Error Rate > 5%** - High error rate threshold
- **Pod Restarts > 5 in 24h** - Kubernetes stability issues

### Variables

- **Environment** - Filter by environment (production, staging)
- **Instance** - Filter by specific service instances

## Integration with CI/CD

### Pre-Deployment Hook

```yaml
# .github/workflows/deploy.yml
- name: Pre-Launch Audit
  run: |
    chmod +x scripts/pre-launch-audit.sh
    ./scripts/pre-launch-audit.sh ${{ env.STAGING_URL }}
  env:
    PROMETHEUS_URL: ${{ secrets.PROMETHEUS_URL }}
    MONGO_URI: ${{ secrets.MONGO_URI }}
```

### Post-Deployment Verification

```yaml
- name: Post-Deploy Health Check
  run: |
    # Wait for deployment to stabilize
    sleep 30
    
    # Run audit against production
    ./scripts/pre-launch-audit.sh ${{ env.PRODUCTION_URL }}
    
    # Check critical metrics
    curl -f "$PROMETHEUS_URL/api/v1/query?query=up{job='payment-api'}" | jq '.data.result[0].value[1]' | grep -q '1'
  env:
    PRODUCTION_URL: ${{ secrets.PRODUCTION_URL }}
    PROMETHEUS_URL: ${{ secrets.PROMETHEUS_URL }}
```

## Troubleshooting

### Common Issues

1. **"Required command 'jq' not found"**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install jq
   
   # macOS
   brew install jq
   
   # Alpine
   apk add jq
   ```

2. **"Prometheus API not accessible"**
   - Check `PROMETHEUS_URL` environment variable
   - Verify network connectivity
   - Check Prometheus service status

3. **"mongosh not found"**
   ```bash
   # Install MongoDB Shell
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-mongosh
   ```

4. **"kubectl not found"**
   ```bash
   # Install kubectl
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
   ```

### Debug Mode

```bash
# Enable verbose output
set -x
./scripts/pre-launch-audit.sh https://api.yourcompany.com
set +x
```

### Manual Verification

```bash
# Test individual components
curl -i https://api.yourcompany.com/health
curl -s http://prometheus:9090/api/v1/query?query=up
mongosh --eval "db.notifications_outbox.getIndexes()"
kubectl get deployments
```

## References

- [RFC 9110 - HTTP Semantics](https://httpwg.org/specs/rfc9110.html)
- [RFC 9111 - HTTP Caching](https://httpwg.org/specs/rfc9111.html)
- [RFC 9457 - Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [MongoDB TTL Indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [PCI DSS v4.0](https://www.pcisecuritystandards.org/document_library/)
