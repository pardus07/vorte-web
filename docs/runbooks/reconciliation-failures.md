# Runbook: Reconciliation Failures

## Alert: ReconciliationHighFailureRate

**Severity**: Warning  
**Component**: Payment  
**Trigger**: Reconciliation failure rate > 5% for 10+ minutes

## Symptoms

- High `payment_webhook_total{result="recon_fail"}` rate
- Reconciliation API calls failing
- Stuck payments not being recovered

## Impact

- **Operational**: Stuck payments require manual investigation
- **Customer Experience**: Delayed payment status updates
- **Support Load**: Increased support tickets

## Diagnosis

### 1. Check Failure Rate

```bash
# Query current failure rate
curl -s 'http://localhost:9090/api/v1/query?query=sum(rate(payment_webhook_total{result="recon_fail"}[15m]))by(provider)/sum(rate(reconciliation_calls_total[15m]))by(provider)' | jq
```

### 2. Check Reconciliation Worker Logs

```bash
# Docker Compose
docker-compose logs --tail=200 reconciliation-worker | grep -i error

# Kubernetes
kubectl logs -n vorte -l component=reconciliation-worker --tail=200 | grep -i error
```

### 3. Identify Error Patterns

Common error patterns:

**Authentication Errors**:
```
ERROR: iyzico retrieve failed: 401 Unauthorized
ERROR: PayTR status inquiry failed: Invalid token
```

**Network Errors**:
```
ERROR: httpx.ConnectTimeout: Connection timeout
ERROR: httpx.ReadTimeout: Read timeout
```

**API Errors**:
```
ERROR: iyzico retrieve failed: Payment not found
ERROR: PayTR status inquiry failed: Merchant not found
```

**Database Errors**:
```
ERROR: Can only use session with the MongoClient that started it
ERROR: Transaction aborted
```

### 4. Check Provider API Health

```bash
# Test iyzico API
curl -X POST https://api.iyzipay.com/payment/detail \
  -H "Authorization: IYZWSv2 ${IYZICO_API_KEY}:..." \
  -d '{"paymentId": "test"}' \
  -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n"

# Test PayTR API
curl -X POST https://www.paytr.com/odeme/durum-sorgu \
  -d "merchant_id=${PAYTR_MERCHANT_ID}" \
  -d "merchant_oid=test" \
  -d "paytr_token=..." \
  -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n"
```

### 5. Check API Latency

```bash
# Query p95 latency
curl -s 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(reconciliation_call_latency_seconds_bucket[5m]))by(le,provider))' | jq
```

## Resolution

### Scenario 1: Authentication Errors

**Symptoms**: 401/403 errors from provider API

**Fix**:
```bash
# Verify credentials
echo $IYZICO_API_KEY
echo $IYZICO_SECRET_KEY
echo $PAYTR_MERCHANT_ID
echo $PAYTR_MERCHANT_KEY
echo $PAYTR_MERCHANT_SALT

# Test credentials with provider
# iyzico: Use merchant panel to verify API key
# PayTR: Use merchant panel to verify merchant ID

# Update credentials if needed
# Docker Compose: Update .env file and restart
docker-compose restart reconciliation-worker

# Kubernetes: Update secrets and restart
kubectl delete secret iyzico-credentials -n vorte
kubectl create secret generic iyzico-credentials \
  --namespace=vorte \
  --from-literal=api-key='new-key' \
  --from-literal=secret-key='new-secret'
kubectl delete pod -n vorte -l component=reconciliation-worker
```

### Scenario 2: Network Timeouts

**Symptoms**: Connection timeout, read timeout errors

**Fix**:
```bash
# Check network connectivity
ping api.iyzipay.com
ping www.paytr.com

# Check DNS resolution
nslookup api.iyzipay.com
nslookup www.paytr.com

# Check firewall rules
# Ensure outbound HTTPS (443) is allowed

# Increase timeout if provider is slow
# Edit reconciliation.py or adapter timeout settings
```

### Scenario 3: Provider API Rate Limiting

**Symptoms**: 429 Too Many Requests errors

**Fix**:
```bash
# Check reconciliation frequency
# Default: every 10 minutes

# Reduce frequency if needed
# Docker Compose: Edit docker-compose.yml
# Change sleep 600 to sleep 900 (15 minutes)

# Kubernetes: Edit CronJob schedule
kubectl patch cronjob payment-reconciliation -n vorte \
  -p '{"spec":{"schedule":"*/15 * * * *"}}'

# Contact provider to increase rate limits
```

### Scenario 4: Database Transaction Errors

**Symptoms**: Session errors, transaction aborted

**Fix**:
```bash
# Check MongoDB replica set health
docker-compose exec mongo mongosh --eval "rs.status()"

# Ensure all members are healthy
# PRIMARY: 1 member
# SECONDARY: 0+ members (if multi-node)

# Check for replica set lag
docker-compose exec mongo mongosh --eval "rs.printSecondaryReplicationInfo()"

# Restart MongoDB if unhealthy
docker-compose restart mongo mongo-init

# Wait for replica set to stabilize
sleep 30

# Restart reconciliation worker
docker-compose restart reconciliation-worker
```

### Scenario 5: Payment Not Found Errors

**Symptoms**: Provider returns "payment not found"

**Possible Causes**:
- Payment was created in test mode but querying production API
- Payment ID mismatch in database
- Provider deleted old payment records

**Fix**:
```javascript
// Check payment in database
db.payments.findOne({ _id: ObjectId("...") })

// Verify providerRefs
// iyzico: providerRefs.iyz_paymentId should match provider
// PayTR: providerRefs.paytr_merchant_oid should match provider

// Check environment mismatch
// Ensure IYZICO_BASE_URL matches payment environment
// Sandbox: https://sandbox-api.iyzipay.com
// Production: https://api.iyzipay.com

// If payment is too old (>90 days), mark as failed manually
db.payments.updateOne(
  { _id: ObjectId("...") },
  {
    $set: {
      status: "FAILED",
      raw: { reason: "Payment not found in provider system (too old)" }
    }
  }
)
```

## Prevention

1. **Credential Rotation**: Test credentials after rotation
2. **Monitoring**: Alert on authentication errors immediately
3. **Rate Limiting**: Monitor API usage, stay within limits
4. **Replica Set Health**: Ensure MongoDB replica set is always healthy
5. **Timeout Tuning**: Adjust timeouts based on provider SLA
6. **Retry Logic**: Implement exponential backoff for transient errors

## Metrics to Monitor

```promql
# Failure rate by provider
sum(rate(payment_webhook_total{result="recon_fail"}[15m])) by (provider)
/ sum(rate(reconciliation_calls_total[15m])) by (provider)

# Error types
sum(increase(payment_webhook_total{result=~"recon_.*"}[1h])) by (result)

# API latency
histogram_quantile(0.95,
  sum(rate(reconciliation_call_latency_seconds_bucket[5m])) by (le, provider)
)
```

## Escalation

- **Failure rate < 10%**: Monitor, investigate during business hours
- **Failure rate 10-25%**: Investigate immediately, may need manual recovery
- **Failure rate > 25%**: Page on-call engineer, likely provider outage or credential issue

## Related Alerts

- `ReconciliationStuckPayments`
- `ReconciliationHighLatency`
- `PaymentProviderCircuitOpen`
- `ReconciliationWorkerNotRunning`

## References

- [Reconciliation Worker Documentation](../reconciliation-worker.md)
- [Stuck Payments Runbook](./stuck-payments.md)
- [iyzico API Documentation](https://docs.iyzico.com/)
- [PayTR API Documentation](https://dev.paytr.com/)
- [MongoDB Replica Set Troubleshooting](https://docs.mongodb.com/manual/tutorial/troubleshoot-replica-sets/)
