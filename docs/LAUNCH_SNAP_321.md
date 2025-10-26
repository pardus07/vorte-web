# 🚀 3-2-1 Launch Snap

**Ultra-compact final check - Print & Execute**

---

## 3️⃣ T-15: Final Measurements

### Audit (Staging/Production)
```bash
export BASE_URL="https://api.yourcompany.com"
./scripts/pre-launch-audit.sh "$BASE_URL"; echo "EXIT CODE:$?"
./scripts/pre-launch-audit.sh "$BASE_URL" | grep -E "FAIL|ERROR|CRITICAL" -n || true
```

### Quick Header Check
```bash
curl -sSI "$BASE_URL/health" | sed -n '1,20p'
```

### PromQL (Grafana Explore)
```promql
# Request rate
rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, sum by (le)(rate(http_request_duration_seconds_bucket[5m])))

# Payment success (30min)
sum(increase(payment_success_total[30m])) / sum(increase(payment_init_total[30m]))
```

---

## 2️⃣ GO/NO-GO (7 Criteria)

```
[ ] Audit: exit code 0
[ ] HTTP P95: < 2s
[ ] Error rate: < 1%
[ ] Payment success: > 95%
[ ] Notification backlog: < 100
[ ] Pods: healthy
[ ] Security headers: present
```

**All ✅ → GO | Any ❌ → HOLD (reason + action)**

---

## 1️⃣ Cutover & Watch

### Deploy
```bash
export NAMESPACE="production"
export RELEASE_TAG="2025-01-26.1"

kubectl -n "$NAMESPACE" set image deploy/vorte-api \
  api="registry.yourco/vorte-api:${RELEASE_TAG}"

kubectl -n "$NAMESPACE" rollout status deploy/vorte-api -w
kubectl -n "$NAMESPACE" get pods -o wide
```

### Canary Watch
```
T+5:  10% traffic
T+10: 50% traffic
T+15: 100% traffic
```

---

## 🔄 Emergency Rollback (≤5 min)

```bash
kubectl -n "$NAMESPACE" rollout undo deploy/vorte-api
kubectl -n "$NAMESPACE" rollout status deploy/vorte-api -w
```

---

## 📊 Mini Watchlist (T+30/60/120)

```
✅ P95 latency: < 2s
✅ Error rate: < 1%
✅ Payment success: > 95%
✅ Notification backlog: < 100
✅ Active alerts: 0
✅ Webhook/callback errors: 0
```

---

## 📢 Slack Announcement

```
🚀 GO LIVE: vorte-api ${RELEASE_TAG} → production

Metrics:
• P95: 1.2s
• Error: 0.3%
• Payment OK: 98%
• Alerts: 0

Checkpoints: T+30 / T+60 / T+120
Issues: @oncall
```

---

## 🎯 Quick Metrics (One-liner)

```bash
# All-in-one health
echo "P95:$(curl -s 'http://prom:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))' | jq -r '.data.result[0].value[1]')s | Err:$(curl -s 'http://prom:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])*100' | jq -r '.data.result[0].value[1]')% | Pay:$(curl -s 'http://prom:9090/api/v1/query?query=rate(payment_init_total{result=\"success\"}[5m])/rate(payment_init_total[5m])*100' | jq -r '.data.result[0].value[1]')%"
```

---

## 📞 Emergency

- **On-Call**: [PagerDuty/Slack]
- **iyzico**: +90 850 222 0 600
- **PayTR**: +90 444 25 52

---

## ✅ Pre-Flight (30 sec)

```
[ ] BASE_URL set
[ ] NAMESPACE set
[ ] RELEASE_TAG set
[ ] kubectl access
[ ] Prometheus access
[ ] Team on standby
[ ] Rollback plan ready
```

---

**🚀 EXECUTE!**

1. Run audit → Share results
2. Check GO/NO-GO → Make decision
3. Deploy → Monitor checkpoints
4. Success → Celebrate! 🎉
