# Reconciliation Worker - Production Deployment Checklist

## Pre-Deployment

### 1. Environment Verification

- [ ] MongoDB replica set is configured and healthy
  ```bash
  docker-compose exec mongo mongosh --eval "rs.status()"
  # Verify: All members in PRIMARY/SECONDARY state
  ```

- [ ] Redis is accessible
  ```bash
  docker-compose exec redis redis-cli ping
  # Expected: PONG
  ```

- [ ] Provider credentials are configured
  ```bash
  # iyzico
  echo $IYZICO_API_KEY
  echo $IYZICO_SECRET_KEY
  echo $IYZICO_BASE_URL
  
  # PayTR
  echo $PAYTR_MERCHANT_ID
  echo $PAYTR_MERCHANT_KEY
  echo $PAYTR_MERCHANT_SALT
  ```

- [ ] Provider API connectivity test
  ```bash
  # Test iyzico
  curl -I https://api.iyzipay.com
  
  # Test PayTR
  curl -I https://www.paytr.com
  ```

### 2. Code Review

- [ ] All tests passing
  ```bash
  pytest apps/backend/tests/test_reconciliation_worker.py -v
  pytest apps/backend/tests/test_metrics.py -v
  pytest apps/backend/tests/test_paytr_adapter.py -v
  ```

- [ ] No linting errors
  ```bash
  ruff check apps/backend/app/workers/reconciliation.py
  ruff check apps/backend/app/services/adapters/paytr_adapter.py
  ```

- [ ] Code reviewed and approved
  - [ ] PayTR status inquiry implementation
  - [ ] Reconciliation worker updates
  - [ ] Metrics additions
  - [ ] Error handling

### 3. Documentation

- [ ] Reconciliation worker documentation updated
- [ ] PayTR patch documentation created
- [ ] Runbooks created (stuck-payments, reconciliation-failures)
- [ ] Prometheus alerts configured
- [ ] Grafana dashboard created

## Deployment Steps

### 4. Staging Deployment

- [ ] Deploy to staging environment
  ```bash
  # Docker Compose
  docker-compose -f docker-compose.test.yml up -d reconciliation-worker
  
  # Kubernetes
  kubectl apply -f infra/k8s/reconciliation-cronjob.yaml --dry-run=client
  ```

- [ ] Verify reconciliation worker starts
  ```bash
  # Docker Compose
  docker-compose logs reconciliation-worker
  
  # Kubernetes
  kubectl logs -n vorte -l component=reconciliation-worker
  ```

- [ ] Create test stuck payments in staging
  ```javascript
  // Create test payment stuck in PENDING_3DS
  db.payments.insertOne({
    orderId: "test_stuck_001",
    provider: "iyzico",
    status: "PENDING_3DS",
    amount: 10000,
    currency: "TRY",
    providerRefs: {
      iyz_paymentId: "test_payment_id"
    },
    createdAt: new Date(Date.now() - 20*60*1000), // 20 minutes ago
    updatedAt: new Date(Date.now() - 20*60*1000)
  })
  ```

- [ ] Verify reconciliation recovers test payments
  ```bash
  # Wait 10 minutes for reconciliation cycle
  # Check logs for recovery
  docker-compose logs reconciliation-worker | grep "Reconciled payment"
  ```

- [ ] Verify metrics are emitted
  ```bash
  curl -s http://localhost:9090/api/v1/query?query=reconciliation_calls_total
  curl -s http://localhost:9090/api/v1/query?query=reconciliation_recovered_total
  ```

### 5. Production Deployment

- [ ] Schedule deployment during low-traffic window
  - Recommended: 2-4 AM local time
  - Avoid: Peak hours, weekends, holidays

- [ ] Notify team of deployment
  - [ ] Engineering team
  - [ ] Operations team
  - [ ] Support team

- [ ] Deploy to production
  ```bash
  # Docker Compose
  docker-compose -f docker-compose.prod.yml up -d reconciliation-worker
  
  # Kubernetes
  kubectl apply -f infra/k8s/reconciliation-cronjob.yaml
  ```

- [ ] Verify deployment
  ```bash
  # Docker Compose
  docker-compose -f docker-compose.prod.yml ps reconciliation-worker
  docker-compose -f docker-compose.prod.yml logs --tail=50 reconciliation-worker
  
  # Kubernetes
  kubectl get cronjob payment-reconciliation -n vorte
  kubectl get jobs -n vorte -l component=reconciliation-worker
  ```

## Post-Deployment

### 6. Monitoring Setup

- [ ] Import Grafana dashboard
  ```bash
  # Upload infra/monitoring/grafana/dashboards/payment-reconciliation.json
  # to Grafana UI
  ```

- [ ] Verify Prometheus alerts are active
  ```bash
  curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name=="vorte-payment-reconciliation")'
  ```

- [ ] Configure alert routing
  - [ ] Slack channel: #payment-alerts
  - [ ] PagerDuty: payment-team
  - [ ] Email: ops@vorte.com.tr

### 7. Smoke Tests

- [ ] Wait for first reconciliation cycle (10 minutes)

- [ ] Verify reconciliation runs successfully
  ```bash
  # Check logs
  docker-compose logs reconciliation-worker | grep "Starting reconciliation cycle"
  docker-compose logs reconciliation-worker | grep "Reconciliation cycle completed"
  ```

- [ ] Verify metrics are being collected
  ```bash
  # Check Prometheus
  curl -s 'http://localhost:9090/api/v1/query?query=reconciliation_calls_total' | jq
  curl -s 'http://localhost:9090/api/v1/query?query=reconciliation_call_latency_seconds_count' | jq
  ```

- [ ] Verify no errors in logs
  ```bash
  docker-compose logs reconciliation-worker | grep -i error
  # Expected: No critical errors
  ```

- [ ] Check Grafana dashboard
  - [ ] Reconciliation call rate > 0
  - [ ] No stuck payments
  - [ ] API latency < 5s
  - [ ] Success rate > 80%

### 8. Validation

- [ ] Monitor for 1 hour
  - [ ] No alerts triggered
  - [ ] Reconciliation cycles completing successfully
  - [ ] Metrics look healthy

- [ ] Monitor for 24 hours
  - [ ] Stuck payment count stable or decreasing
  - [ ] No increase in support tickets
  - [ ] Recovery rate > 80%

- [ ] Review with team
  - [ ] Engineering: Code quality, performance
  - [ ] Operations: Monitoring, alerts
  - [ ] Support: Customer impact

## Rollback Plan

If issues arise, rollback immediately:

### 9. Rollback Steps

- [ ] Stop reconciliation worker
  ```bash
  # Docker Compose
  docker-compose stop reconciliation-worker
  
  # Kubernetes
  kubectl patch cronjob payment-reconciliation -n vorte \
    -p '{"spec":{"suspend":true}}'
  ```

- [ ] Revert code changes
  ```bash
  git revert <commit-hash>
  git push origin main
  ```

- [ ] Redeploy previous version
  ```bash
  # Docker Compose
  docker-compose up -d reconciliation-worker
  
  # Kubernetes
  kubectl rollout undo cronjob/payment-reconciliation -n vorte
  ```

- [ ] Verify rollback successful
  ```bash
  docker-compose logs reconciliation-worker
  ```

- [ ] Notify team of rollback
  - [ ] Engineering team
  - [ ] Operations team
  - [ ] Support team

## Success Criteria

- [ ] Reconciliation worker running without errors
- [ ] Stuck payment count decreasing
- [ ] Recovery rate > 80%
- [ ] API latency p95 < 5s
- [ ] No increase in support tickets
- [ ] All alerts configured and working
- [ ] Team trained on runbooks

## Post-Deployment Tasks

- [ ] Update deployment documentation
- [ ] Schedule post-mortem meeting (if issues occurred)
- [ ] Review metrics after 1 week
- [ ] Optimize based on production data
- [ ] Plan next iteration (if needed)

## Sign-Off

- [ ] Engineering Lead: _______________
- [ ] Operations Lead: _______________
- [ ] Product Owner: _______________

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Version**: _______________

---

## Quick Reference

### Useful Commands

```bash
# Check reconciliation worker status
docker-compose ps reconciliation-worker

# View logs
docker-compose logs -f reconciliation-worker

# Manually trigger reconciliation
docker-compose exec reconciliation-worker python -m app.workers.reconciliation

# Check metrics
curl -s http://localhost:9090/api/v1/query?query=reconciliation_calls_total | jq

# Check stuck payments
curl -s http://localhost:9090/api/v1/query?query=reconciliation_stuck_total | jq

# Restart worker
docker-compose restart reconciliation-worker
```

### Key Metrics

- `reconciliation_calls_total` - Total API calls
- `reconciliation_recovered_total` - Payments recovered
- `reconciliation_stuck_total` - Payments stuck > 60 min
- `reconciliation_call_latency_seconds` - API latency

### Alert Thresholds

- Stuck payments: > 0 for 5 minutes
- Failure rate: > 5% for 10 minutes
- API latency p95: > 5s for 10 minutes
- Worker not running: > 15 minutes

### Support Contacts

- **Engineering**: eng@vorte.com.tr
- **Operations**: ops@vorte.com.tr
- **iyzico Support**: https://www.iyzico.com/destek
- **PayTR Support**: https://www.paytr.com/iletisim
