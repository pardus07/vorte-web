# 🚀 Launch Card - Wallet Size

**Payment System Production Launch**

---

## 🎯 Staging (3 Commands)

```bash
export BASE_URL="https://staging-api.yourcompany.com"
./scripts/pre-launch-audit.sh "$BASE_URL"; echo "EXIT CODE: $?"
./scripts/pre-launch-audit.sh "$BASE_URL" | grep -E "FAIL|ERROR|CRITICAL" -n || true
```

**Expected**: `EXIT CODE: 0`, No FAIL

---

## 📊 Dashboard (1 Time)

Grafana → Import → `day-0-1-monitoring.json` → Prometheus

---

## ✅ GO/NO-GO (7 Checks)

```
[ ] Audit: exit code 0
[ ] P95: < 2s
[ ] Error: < 1%
[ ] Payment: > 95%
[ ] Backlog: < 100
[ ] Pods: healthy
[ ] Headers: present
```

**All YES → GO | Any NO → HOLD**

---

## 🚀 Production (4 Commands)

```bash
export BASE_URL="https://api.yourcompany.com"
export NAMESPACE="production"
export RELEASE_TAG="2025-01-26.1"

./scripts/pre-launch-audit.sh "$BASE_URL" && \
kubectl -n "$NAMESPACE" set image deploy/vorte-api api="registry.yourco/vorte-api:${RELEASE_TAG}" && \
kubectl -n "$NAMESPACE" rollout status deploy/vorte-api -w && \
kubectl -n "$NAMESPACE" get pods -o wide
```

---

## 🔄 Rollback (2 Commands)

```bash
kubectl -n "$NAMESPACE" rollout undo deploy/vorte-api
kubectl -n "$NAMESPACE" rollout status deploy/vorte-api -w
```

**Time**: < 5 minutes

---

## 📞 Emergency

- **On-Call**: [PagerDuty/Slack]
- **iyzico**: +90 850 222 0 600
- **PayTR**: +90 444 25 52

---

## 📚 Docs

- `docs/LAUNCH_CHEATSHEET.md` - One page
- `docs/STAGING_EXECUTION_GUIDE.md` - Step-by-step
- `docs/PRODUCTION_CUTOVER_TIMELINE.md` - Timeline

---

**🚀 READY TO LAUNCH!**
