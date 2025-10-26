# Runbook: Stuck Payments

## Alert: ReconciliationStuckPayments

**Severity**: Warning  
**Component**: Payment  
**Trigger**: Payments stuck in PENDING_3DS or INITIATED status for > 60 minutes

## Symptoms

- `reconciliation_stuck_total` metric > 0
- Payments not progressing to final status (AUTHORIZED/FAILED)
- Customer complaints about payment status

## Impact

- **Customer Experience**: Users don't know if payment succeeded
- **Revenue**: Potential lost sales if payments are actually successful but not captured
- **Support Load**: Increased support tickets

## Diagnosis

### 1. Check Stuck Payment Count

```bash
# Query Prometheus
curl -s 'http://localhost:9090/api/v1/query?query=reconciliation_stuck_total' | jq

# Check by provider
curl -s 'http://localhost:9090/api/v1/query?query=sum(reconciliation_stuck_total)by(provider)' | jq
```

### 2. Identify Stuck Payments in Database

```javascript
// MongoDB query
db.payments.find({
  status: { $in: ["PENDING_3DS", "INITIATED"] },
  createdAt: { $lt: new Date(Date.now() - 60*60*1000) }
}).sort({ createdAt: 1 }).limit(10)
```

### 3. Check Reconciliation Worker Status

```bash
# Docker Compose
docker-compose ps reconciliation-worker
docker-compose logs --tail=100 reconciliation-worker

# Kubernetes
kubectl get cronjob payment-reconciliation -n vorte
kubectl get jobs -n vorte -l component=reconciliation-worker
kubectl logs -n vorte -l component=reconciliation-worker --tail=100
```

### 4. Check Provider API Status

**iyzico**:
```bash
# Check iyzico status page
curl -I https://api.iyzipay.com/health

# Test retrieve payment detail
curl -X POST https://api.iyzipay.com/payment/detail \
  -H "Authorization: IYZWSv2 ${IYZICO_API_KEY}:..." \
  -d '{"paymentId": "stuck_payment_id"}'
```

**PayTR**:
```bash
# Check PayTR status
curl -I https://www.paytr.com

# Test status inquiry
curl -X POST https://www.paytr.com/odeme/durum-sorgu \
  -d "merchant_id=${PAYTR_MERCHANT_ID}" \
  -d "merchant_oid=stuck_payment_id" \
  -d "paytr_token=..."
```

### 5. Check Webhook/Callback Delivery

```bash
# Check webhook logs
docker-compose logs api | grep -i webhook | tail -50

# Check for webhook errors
curl -s 'http://localhost:9090/api/v1/query?query=rate(payment_webhook_total{result="error"}[10m])' | jq
```

## Resolution

### Scenario 1: Reconciliation Worker Not Running

**Symptoms**: No reconciliation calls in last 15+ minutes

**Fix**:
```bash
# Docker Compose
docker-compose restart reconciliation-worker

# Kubernetes
kubectl delete job -n vorte -l component=reconciliation-worker
# CronJob will create new job automatically
```

### Scenario 2: Provider API Down/Slow

**Symptoms**: High reconciliation API latency or failures

**Fix**:
1. Check provider status page
2. Contact provider support if outage
3. Wait for provider to recover
4. Reconciliation will auto-recover once provider is back

### Scenario 3: Webhook Endpoint Not Accessible

**Symptoms**: No webhooks received, but payments initiated

**Fix**:
```bash
# Check webhook endpoint accessibility
curl -I https://api.vorte.com.tr/api/v1/webhooks/iyzico
curl -I https://api.vorte.com.tr/api/v1/callbacks/paytr

# Check IP allowlist (if configured)
# Ensure provider IPs are allowed

# Check nginx logs
docker-compose logs nginx | grep webhook
```

### Scenario 4: Database Transaction Issues

**Symptoms**: "Can only use session with the MongoClient that started it" errors

**Fix**:
```bash
# Check MongoDB replica set status
docker-compose exec mongo mongosh --eval "rs.status()"

# Ensure replica set is healthy
# All members should be in PRIMARY or SECONDARY state

# Restart reconciliation worker
docker-compose restart reconciliation-worker
```

### Scenario 5: Manual Recovery Required

If automatic reconciliation fails, manually recover payments:

```javascript
// 1. Query stuck payment
const payment = db.payments.findOne({ _id: ObjectId("...") })

// 2. Check provider merchant panel
// - iyzico: https://merchant.iyzipay.com/
// - PayTR: https://www.paytr.com/magaza/

// 3. Update payment status manually
db.payments.updateOne(
  { _id: payment._id },
  {
    $set: {
      status: "AUTHORIZED", // or "FAILED"
      updatedAt: new Date(),
      raw: {
        manualRecovery: true,
        recoveredBy: "admin",
        recoveredAt: new Date(),
        reason: "Manual recovery after reconciliation failure"
      }
    }
  }
)

// 4. Record event
db.payment_events.insertOne({
  paymentId: payment._id,
  provider: payment.provider,
  externalEventId: `manual_recovery_${Date.now()}`,
  eventType: "MANUAL_RECOVERY",
  status: "AUTHORIZED",
  raw: { reason: "Manual recovery" },
  processedAt: new Date(),
  createdAt: new Date()
})
```

## Prevention

1. **Monitor Provider Status**: Set up alerts for provider API downtime
2. **Webhook Monitoring**: Alert if no webhooks received in 30 minutes
3. **Replica Set Health**: Ensure MongoDB replica set is always healthy
4. **Reconciliation Worker Health**: Alert if worker hasn't run in 15 minutes
5. **Regular Testing**: Test reconciliation flow in staging weekly

## Escalation

- **< 5 stuck payments**: Monitor, auto-recovery should handle
- **5-20 stuck payments**: Investigate root cause, manual recovery if needed
- **> 20 stuck payments**: Page on-call engineer, potential provider outage

## Related Alerts

- `ReconciliationWorkerNotRunning`
- `ReconciliationHighFailureRate`
- `PaymentProviderCircuitOpen`
- `WebhookProcessingFailures`

## References

- [Reconciliation Worker Documentation](../reconciliation-worker.md)
- [PayTR Reconciliation Patch](../RECONCILIATION_PAYTR_PATCH.md)
- [iyzico API Documentation](https://docs.iyzico.com/)
- [PayTR API Documentation](https://dev.paytr.com/)
