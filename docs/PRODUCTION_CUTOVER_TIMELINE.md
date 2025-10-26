# 🚀 Production Cutover Timeline

**Target Date**: [TO BE SCHEDULED]  
**Deployment Strategy**: Blue-Green with Canary Rollout  
**Rollback Time**: < 5 minutes  
**Communication Channel**: #launch-channel

---

## 📋 Pre-Cutover Checklist (T-24 Hours)

### Validation Complete
- [ ] ✅ Staging audit: EXIT CODE 0
- [ ] ✅ Staging functional tests: All PASS
- [ ] ✅ Dashboard metrics: All green
- [ ] ✅ Load testing: Complete
- [ ] ✅ Security review: Sign-off received

### Approvals
- [ ] Product Owner: Approved
- [ ] Engineering Lead: Approved
- [ ] Security Lead: Approved
- [ ] DevOps Lead: Approved

### Infrastructure Ready
- [ ] Production cluster: Healthy
- [ ] Database migrations: Tested
- [ ] Secrets: Rotated and verified
- [ ] IP allowlists: Updated
- [ ] TLS certificates: Valid (> 30 days)
- [ ] Monitoring: All targets UP
- [ ] Alert rules: Loaded and tested

### Team Ready
- [ ] On-call: Assigned and notified
- [ ] Runbooks: Reviewed
- [ ] Rollback plan: Documented
- [ ] Communication plan: Ready
- [ ] War room: Scheduled (Zoom/Slack)

---

## 🕐 T-1 Hour: Final Validation

### 1. Run Production Audit (10 min)
```bash
export BASE_URL="https://api.yourcompany.com"
export PROMETHEUS_URL="http://prometheus-prod:9090"
export MONGO_URI="mongodb://prod-mongo:27017"
export DB_NAME="payment_system"

./scripts/pre-launch-audit.sh "$BASE_URL"
echo "EXIT CODE: $?"
```

**Expected**: EXIT CODE 0, All critical checks PASS

### 2. Verify Current Production (5 min)
```bash
# Check current version
kubectl get deployment payment-api -n production -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check pod health
kubectl get pods -n production -l app=payment-api

# Check metrics
curl -s http://prometheus-prod:9090/api/v1/query?query=up{job="payment-api"} | jq '.data.result[0].value[1]'
```

### 3. Team Sync (5 min)
- [ ] All team members online
- [ ] War room active
- [ ] Communication channels open
- [ ] Rollback plan reviewed

### 4. Stakeholder Notification (5 min)
```
#launch-channel:
🚀 Production deployment starting in 30 minutes
- Target: T-0 at [TIME]
- Strategy: Blue-Green with Canary (10% → 50% → 100%)
- Rollback: < 5 minutes if needed
- Status updates: T-0, T+15, T+30, T+60, T+120
```

---

## 🚀 T-0: Deployment Start

### Phase 1: Blue-Green Setup (5 min)

```bash
# Deploy new version (green) alongside current (blue)
kubectl apply -f infra/k8s/deployment-green.yaml -n production

# Wait for green pods to be ready
kubectl wait --for=condition=ready pod -l app=payment-api,version=green -n production --timeout=300s

# Verify green pods healthy
kubectl get pods -n production -l app=payment-api,version=green
```

**Checkpoint**:
- [ ] Green pods: Running and Healthy
- [ ] Health checks: Passing
- [ ] No errors in logs

---

### Phase 2: Canary 10% (5 min)

```bash
# Route 10% traffic to green
kubectl patch service payment-api -n production -p '{"spec":{"selector":{"version":"green","canary":"10"}}}'

# Monitor for 5 minutes
watch -n 10 'kubectl top pods -n production -l app=payment-api'
```

**Monitor Dashboard**:
- Error rate: < 1%
- P95 latency: < 2s
- Payment success rate: > 95%
- No new alerts

**Decision Point**:
- [ ] ✅ Metrics green → Continue to 50%
- [ ] 🛑 Metrics red → Rollback

---

### Phase 3: Canary 50% (5 min)

```bash
# Route 50% traffic to green
kubectl patch service payment-api -n production -p '{"spec":{"selector":{"version":"green","canary":"50"}}}'

# Monitor for 5 minutes
```

**Monitor Dashboard**:
- Error rate: < 1%
- P95 latency: < 2s
- Payment success rate: > 95%
- Notification backlog: < 100

**Decision Point**:
- [ ] ✅ Metrics green → Continue to 100%
- [ ] 🛑 Metrics red → Rollback

---

### Phase 4: Full Cutover 100% (5 min)

```bash
# Route 100% traffic to green
kubectl patch service payment-api -n production -p '{"spec":{"selector":{"version":"green"}}}'

# Remove canary label
kubectl label pods -n production -l app=payment-api,version=green canary-

# Scale down blue
kubectl scale deployment payment-api-blue -n production --replicas=0
```

**Monitor Dashboard**:
- All metrics green
- No alerts firing
- Traffic flowing normally

---

## 📊 T+15 Minutes: First Checkpoint

### Metrics Review
```bash
# Error rate
curl -s "http://prometheus-prod:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])*100" | jq '.data.result[0].value[1]'

# P95 latency
curl -s "http://prometheus-prod:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))" | jq '.data.result[0].value[1]'

# Payment success rate
curl -s "http://prometheus-prod:9090/api/v1/query?query=rate(payment_init_total{result=\"success\"}[5m])/rate(payment_init_total[5m])*100" | jq '.data.result[0].value[1]'
```

**Expected**:
- [ ] Error rate: < 1%
- [ ] P95 latency: < 2s
- [ ] Payment success rate: > 95%
- [ ] No critical alerts

### Functional Verification
```bash
# Test successful payment
ORDER_ID=$(curl -X POST https://api.yourcompany.com/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"sku":"PROD-001","quantity":1,"price":100}],"customer":{"email":"test@example.com","phone":"+905551234567"}}' \
  | jq -r '.orderId')

# Verify order created
curl https://api.yourcompany.com/api/v1/orders/$ORDER_ID/payment
```

**Expected**:
- [ ] Order created successfully
- [ ] Payment status queryable
- [ ] ETag/Last-Modified present

### Stakeholder Update
```
#launch-channel:
✅ T+15: Deployment successful
- Error rate: 0.2%
- P95 latency: 1.1s
- Payment success: 98%
- All systems green
```

---

## 📊 T+30 Minutes: Second Checkpoint

### Deep Metrics Review
- [ ] HTTP metrics: All green
- [ ] Payment metrics: Success rate > 95%
- [ ] Notification metrics: Backlog < 100
- [ ] Kubernetes metrics: No restarts
- [ ] Database metrics: Query time normal

### Webhook Verification
```bash
# Check webhook processing
kubectl logs -n production deployment/payment-api --tail=100 | grep "webhook"

# Verify webhook success rate
curl -s "http://prometheus-prod:9090/api/v1/query?query=rate(webhook_ok_total[5m])" | jq '.data.result'
```

**Expected**:
- [ ] Webhooks processing normally
- [ ] No webhook errors
- [ ] Provider callbacks working

### Stakeholder Update
```
#launch-channel:
✅ T+30: All systems stable
- Webhooks: Processing normally
- Notifications: Dispatching
- No issues detected
```

---

## 📊 T+60 Minutes: Third Checkpoint

### Business Metrics
- [ ] Orders created: Normal volume
- [ ] Payments processed: Normal success rate
- [ ] Refunds: Processing normally
- [ ] Notifications: Delivered

### Customer Impact
- [ ] No customer complaints
- [ ] Support tickets: Normal volume
- [ ] User experience: No degradation

### Infrastructure Health
```bash
# Pod health
kubectl get pods -n production -l app=payment-api

# Resource usage
kubectl top pods -n production -l app=payment-api

# Database connections
mongosh "$MONGO_URI/$DB_NAME" --eval "db.serverStatus().connections"
```

**Expected**:
- [ ] All pods healthy
- [ ] CPU/Memory normal
- [ ] Database connections stable

### Stakeholder Update
```
#launch-channel:
✅ T+60: Production stable
- Business metrics: Normal
- Customer impact: None
- Infrastructure: Healthy
- Continuing monitoring
```

---

## 📊 T+120 Minutes: Final Checkpoint

### Comprehensive Review
- [ ] All metrics green for 2 hours
- [ ] No alerts fired
- [ ] No customer issues
- [ ] Team confident

### Blue Cleanup
```bash
# Remove blue deployment
kubectl delete deployment payment-api-blue -n production

# Verify only green running
kubectl get deployments -n production -l app=payment-api
```

### Documentation
- [ ] Update deployment log
- [ ] Document any issues
- [ ] Update runbooks if needed
- [ ] Archive rollback artifacts

### Stakeholder Final Update
```
#launch-channel:
🎉 T+120: Deployment COMPLETE
- All systems stable for 2 hours
- No issues detected
- Blue environment cleaned up
- Monitoring continues for 24h
- Thank you team! 🚀
```

---

## 🛑 Rollback Procedure (If Needed)

### Trigger Conditions
- Error rate > 5% for 5 minutes
- P95 latency > 5s for 5 minutes
- Payment success rate < 90% for 5 minutes
- Critical alert firing
- Data corruption detected

### Rollback Steps (< 5 minutes)

```bash
# 1. Route traffic back to blue
kubectl patch service payment-api -n production -p '{"spec":{"selector":{"version":"blue"}}}'

# 2. Scale up blue (if scaled down)
kubectl scale deployment payment-api-blue -n production --replicas=3

# 3. Wait for blue pods ready
kubectl wait --for=condition=ready pod -l app=payment-api,version=blue -n production --timeout=120s

# 4. Verify traffic on blue
kubectl get endpoints payment-api -n production

# 5. Scale down green
kubectl scale deployment payment-api-green -n production --replicas=0

# 6. Verify metrics recovering
watch -n 5 'curl -s http://prometheus-prod:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[1m])'
```

### Post-Rollback
1. **Notify stakeholders**
   ```
   #launch-channel:
   🛑 ROLLBACK EXECUTED
   - Reason: [REASON]
   - Traffic back on previous version
   - Investigating root cause
   - ETA for fix: [TIME]
   ```

2. **Root cause analysis**
   - Collect logs
   - Review metrics
   - Identify issue
   - Create fix plan

3. **Fix and retry**
   - Apply fixes
   - Re-run staging validation
   - Schedule new cutover

---

## 📞 Communication Plan

### Channels
- **#launch-channel**: Primary updates
- **#incidents**: If issues arise
- **War room**: Zoom/Slack call during deployment

### Update Schedule
- T-60: Pre-deployment notification
- T-0: Deployment starting
- T+15: First checkpoint
- T+30: Second checkpoint
- T+60: Third checkpoint
- T+120: Final checkpoint / completion

### Escalation
1. **On-call engineer**: First responder
2. **Engineering lead**: If issue persists > 10 min
3. **CTO**: If critical business impact

---

## 📋 Post-Deployment (T+24 Hours)

### Metrics Review
- [ ] Error rate trends
- [ ] Latency percentiles
- [ ] Payment success rate
- [ ] Customer satisfaction

### Retrospective
- [ ] What went well
- [ ] What could improve
- [ ] Action items
- [ ] Update runbooks

### Documentation
- [ ] Update deployment log
- [ ] Document learnings
- [ ] Share with team
- [ ] Archive artifacts

---

## ✅ Success Criteria

### Immediate (T+2 Hours)
- ✅ Error rate < 1%
- ✅ P95 latency < 2s
- ✅ Payment success rate > 95%
- ✅ No critical alerts
- ✅ No customer complaints

### Short-term (T+24 Hours)
- ✅ All metrics stable
- ✅ No incidents
- ✅ Customer satisfaction maintained
- ✅ Team confident

### Long-term (T+7 Days)
- ✅ Performance within SLOs
- ✅ No regressions
- ✅ Business metrics normal
- ✅ Lessons learned documented

---

**Status**: Ready for Production  
**Next Action**: Complete staging validation, then schedule cutover

**🚀 LET'S LAUNCH!**
