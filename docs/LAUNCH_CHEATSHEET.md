# 🚀 Launch Cheatsheet - Copy-Paste Ready

**One-page reference for staging → production deployment**

---

## 0️⃣ Environment Variables

```bash
# STAGING
export BASE_URL="https://staging-api.yourcompany.com"
export NAMESPACE="staging"
export RELEASE_TAG="2025-01-26.1"

# PRODUCTION
export BASE_URL="https://api.yourcompany.com"
export NAMESPACE="production"
export RELEASE_TAG="2025-01-26.1"
```

---

## 1️⃣ Pre-Launch Audit (5 min)

```bash
# Run full audit
./scripts/pre-launch-audit.sh "$BASE_URL"
echo "EXIT CODE: $?"

# Extract failures only
./scripts/pre-launch-audit.sh "$BASE_URL" | grep -E "FAIL|ERROR|CRITICAL" -n || true
```

**Expected**: `EXIT CODE: 0`, All critical checks PASS

---

## 2️⃣ Dashboard Import (1 time)

1. Grafana → Dashboards → Import
2. File: `infra/monitoring/grafana/dashboards/day-0-1-monitoring.json`
3. Data source: Prometheus (staging/prod)
4. Import

---

## 3️⃣ Functional Smoke Tests (3 min)

```bash
# Health + security headers
curl -sS -i "$BASE_URL/health" | sed -n '1,20p'

# ETag/304 validation
ETAG=$(curl -sI "$BASE_URL/api/v1/orders/demo/payment" | awk -F': ' '/^ETag/ {print $2}' | tr -d '\r')
curl -sI -H "If-None-Match: $ETAG" "$BASE_URL/api/v1/orders/demo/payment" | head -n 1

# Tracing headers
curl -sS -i "$BASE_URL/" | awk '/X-Request-Id|traceparent|ETag|Last-Modified/'
```

**Expected**: 
- Health: 200 OK
- Second call: 304 Not Modified
- Headers: X-Request-Id, traceparent, ETag, Last-Modified present

---

## 4️⃣ GO/NO-GO Criteria

```
✅ Audit: exit code 0
✅ HTTP P95: < 2s
✅ Error rate: < 1%
✅ Payment success: > 95%
✅ Notification backlog: < 100
✅ Pods: healthy (restarts < 5/24h)
✅ Security headers: present
```

**All YES → GO | Any NO → HOLD**

---

## 5️⃣ Production Deployment

### T-15: Final Validation
```bash
./scripts/pre-launch-audit.sh "https://api.yourcompany.com"
echo "EXIT CODE: $?"
```

### T-0: Deploy (Rolling Update)
```bash
kubectl -n "$NAMESPACE" set image deploy/vorte-api \
  api="registry.yourco/vorte-api:${RELEASE_TAG}"

kubectl -n "$NAMESPACE" rollout status deploy/vorte-api -w

kubectl -n "$NAMESPACE" get pods -o wide
```

### T-0: Deploy (Blue-Green)
```bash
# Deploy blue
kubectl -n "$NAMESPACE" apply -f infra/k8s/vorte-api-blue.yaml
kubectl -n "$NAMESPACE" rollout status deploy/vorte-api-blue -w

# Switch service to blue
kubectl -n "$NAMESPACE" patch svc vorte-api --type='json' \
  -p='[{"op":"replace","path":"/spec/selector/color","value":"blue"}]'
```

### T+5/10/15: Quick Checks
```bash
# Health & headers
curl -sI "https://api.yourcompany.com/health" | head -n 20

# ETag/304 (production test)
ETAG=$(curl -sI "https://api.yourcompany.com/api/v1/orders/demo/payment" | awk -F': ' '/^ETag/ {print $2}' | tr -d '\r')
curl -sI -H "If-None-Match: $ETAG" "https://api.yourcompany.com/api/v1/orders/demo/payment" | head -n 1
```

**Grafana panels to watch**:
- HTTP P95
- Error rate
- Payment success
- Notification backlog
- Pod restarts
- Active alerts

### T+30/60/120: Checkpoints

Check metrics at each checkpoint:
```bash
# Error rate
curl -s "http://prometheus-prod:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])*100"

# P95 latency
curl -s "http://prometheus-prod:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))"

# Payment success
curl -s "http://prometheus-prod:9090/api/v1/query?query=rate(payment_init_total{result=\"success\"}[5m])/rate(payment_init_total[5m])*100"
```

---

## 6️⃣ Rollback (< 5 min)

### Rolling Deploy Rollback
```bash
kubectl -n "$NAMESPACE" rollout undo deploy/vorte-api
kubectl -n "$NAMESPACE" rollout status deploy/vorte-api -w
```

### Blue-Green Rollback
```bash
# Switch service back to green
kubectl -n "$NAMESPACE" patch svc vorte-api --type='json' \
  -p='[{"op":"replace","path":"/spec/selector/color","value":"green"}]'
```

**After rollback**: Re-run audit + smoke tests

---

## 7️⃣ Slack Status Messages

### T-0 GO
```
🔵 GO for Production
Deploy starting. Canary 10% → 50% → 100%
Checkpoints: T+5/10/15/30/60/120
Metrics: P95, error rate, payment success, backlog
Rollback: < 5 min
```

### T+15 Canary 50%
```
🟢 Canary 50%
P95: 1.3s | Error: 0.4% | Payment: 98% | Backlog: 22
Continuing...
```

### Final
```
✅ Cutover complete
All metrics green
Runbook & dashboard links pinned
```

---

## 8️⃣ Quick Metrics Check

```bash
# All-in-one health check
echo "=== Service Health ==="
kubectl -n "$NAMESPACE" get pods -l app=vorte-api

echo -e "\n=== Error Rate ==="
curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])*100" | jq -r '.data.result[0].value[1] // "0"' | awk '{printf "%.2f%%\n", $1}'

echo -e "\n=== P95 Latency ==="
curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))" | jq -r '.data.result[0].value[1] // "0"' | awk '{printf "%.2fs\n", $1}'

echo -e "\n=== Payment Success ==="
curl -s "http://prometheus:9090/api/v1/query?query=rate(payment_init_total{result=\"success\"}[5m])/rate(payment_init_total[5m])*100" | jq -r '.data.result[0].value[1] // "0"' | awk '{printf "%.1f%%\n", $1}'
```

---

## 9️⃣ Emergency Contacts

- **DevOps**: [contact]
- **Backend**: [contact]
- **On-Call**: [PagerDuty/Slack]
- **iyzico**: +90 850 222 0 600
- **PayTR**: +90 444 25 52

---

## 🔟 Documentation Quick Links

- **Execution Guide**: `docs/STAGING_EXECUTION_GUIDE.md`
- **Cutover Timeline**: `docs/PRODUCTION_CUTOVER_TIMELINE.md`
- **Validation Summary**: `docs/STAGING_VALIDATION_SUMMARY.md`
- **Audit Usage**: `docs/AUDIT_SCRIPT_USAGE.md`
- **Quick Launch**: `docs/QUICK_LAUNCH_GUIDE.md`

---

## ✅ Pre-Flight Checklist

```
[ ] Environment variables set
[ ] Audit script executable (chmod +x)
[ ] kubectl access verified
[ ] Prometheus accessible
[ ] Grafana dashboard imported
[ ] Team on standby
[ ] Rollback plan reviewed
[ ] Communication channels open
```

---

## 🎯 Success Thresholds

| Metric | Target | Critical |
|--------|--------|----------|
| Error Rate | < 1% | < 5% |
| P95 Latency | < 2s | < 5s |
| Payment Success | > 95% | > 90% |
| Notification Backlog | < 100 | < 500 |
| Pod Restarts (24h) | < 5 | < 10 |
| Active Alerts | 0 | < 3 |

**Target**: All green → Continue  
**Critical**: Any red → Rollback

---

**🚀 READY TO LAUNCH!**

**Next**: Run staging audit, fill validation summary, make GO/NO-GO decision
