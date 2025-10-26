# Reconciliation Worker Documentation

## Overview

The reconciliation worker is a background service that automatically recovers stuck payments by querying payment provider APIs. It runs every 10 minutes to ensure no payments are left in intermediate states.

## Purpose

Payments can get stuck in `PENDING_3DS` or `INITIATED` status due to:
- Network failures during webhook/callback delivery
- Provider API timeouts
- Customer abandoning 3DS authentication
- Browser crashes during payment flow

The reconciliation worker queries provider APIs to get the final payment status and updates the database accordingly.

## Implementation

### Core Components

1. **ReconciliationWorker Class** (`apps/backend/app/workers/reconciliation.py`)
   - Queries stuck payments from database
   - Calls provider APIs to get current status
   - Updates payment and order status in MongoDB transaction
   - Emits Prometheus metrics for monitoring

2. **Metrics** (`apps/backend/app/services/metrics.py`)
   - `reconciliation_recovered_total{provider, status}` - Payments successfully recovered
   - `reconciliation_stuck_total{provider}` - Payments stuck > 60 minutes (requires manual investigation)

### Reconciliation Logic

```python
# Query payments stuck > 15 minutes
stuck_payments = find_payments(
    status IN [PENDING_3DS, INITIATED],
    createdAt < NOW() - 15 minutes
)

# For each stuck payment:
for payment in stuck_payments:
    # Alert if stuck > 60 minutes
    if payment.createdAt < NOW() - 60 minutes:
        emit_alert(reconciliation_stuck_total)
    
    # Query provider API
    if payment.provider == "iyzico":
        status = iyzico.retrieve_payment_detail(payment.id)
        update_payment_and_order(payment, status)
        emit_metric(reconciliation_recovered_total)
    
    elif payment.provider == "paytr":
        status = paytr.status_inquiry(merchant_oid)
        update_payment_and_order(payment, status)
        emit_metric(reconciliation_recovered_total)
```

### Provider Support

| Provider | Status Query API | Auto-Recovery | Manual Investigation |
|----------|------------------|---------------|---------------------|
| iyzico   | ✅ Yes           | ✅ Yes        | ❌ No               |
| PayTR    | ✅ Yes           | ✅ Yes        | ❌ No               |

**Note**: Both providers support automatic reconciliation via status query APIs:
- **iyzico**: Uses `payment/detail` endpoint to retrieve payment status
- **PayTR**: Uses `odeme/durum-sorgu` (Status Inquiry) endpoint to query payment status

## Deployment

### Docker Compose (Development)

The reconciliation worker runs as a separate service:

```bash
# Start all services including reconciliation worker
docker-compose up -d

# View logs
docker-compose logs -f reconciliation-worker

# Manually trigger reconciliation
docker-compose exec reconciliation-worker python -m app.workers.reconciliation
```

### Docker Compose (Production)

```bash
# Start with production configuration
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f reconciliation-worker
```

### Kubernetes

Deploy as a CronJob:

```bash
# Create namespace
kubectl create namespace vorte

# Create secrets (see infra/k8s/README.md)
kubectl create secret generic mongodb-credentials --namespace=vorte --from-literal=uri='...'
kubectl create secret generic redis-credentials --namespace=vorte --from-literal=url='...'
kubectl create secret generic iyzico-credentials --namespace=vorte --from-literal=api-key='...' --from-literal=secret-key='...'

# Deploy CronJob
kubectl apply -f infra/k8s/reconciliation-cronjob.yaml

# Verify
kubectl get cronjob payment-reconciliation -n vorte

# View logs
kubectl logs -n vorte -l component=reconciliation-worker --tail=100
```

## Management Scripts

### Bash (Linux/macOS)

```bash
# Start worker
./scripts/reconciliation-worker.sh start

# Stop worker
./scripts/reconciliation-worker.sh stop

# Restart worker
./scripts/reconciliation-worker.sh restart

# View logs
./scripts/reconciliation-worker.sh logs

# Check status
./scripts/reconciliation-worker.sh status

# Run once manually
./scripts/reconciliation-worker.sh run-once
```

### PowerShell (Windows)

```powershell
# Start worker
.\scripts\reconciliation-worker.ps1 start

# Stop worker
.\scripts\reconciliation-worker.ps1 stop

# Restart worker
.\scripts\reconciliation-worker.ps1 restart

# View logs
.\scripts\reconciliation-worker.ps1 logs

# Check status
.\scripts\reconciliation-worker.ps1 status

# Run once manually
.\scripts\reconciliation-worker.ps1 run-once
```

## Monitoring

### Prometheus Metrics

```promql
# Payments recovered by reconciliation
sum(rate(reconciliation_recovered_total[5m])) by (provider, status)

# Payments stuck > 60 minutes
sum(reconciliation_stuck_total) by (provider)

# Reconciliation failures
sum(rate(payment_webhook_total{result="recon_fail"}[5m])) by (provider)

# Reconciliation API call rate
sum(rate(reconciliation_calls_total[5m])) by (provider)

# Reconciliation API latency (p95)
histogram_quantile(
  0.95,
  sum(rate(reconciliation_call_latency_seconds_bucket[5m])) by (le, provider)
)

# Reconciliation API latency (p99)
histogram_quantile(
  0.99,
  sum(rate(reconciliation_call_latency_seconds_bucket[5m])) by (le, provider)
)
```

### Alerts

Configure Prometheus alerts:

```yaml
# Alert: Stuck payments requiring manual investigation
- alert: ReconciliationStuckPayments
  expr: sum(reconciliation_stuck_total) > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Payments stuck for > 60 minutes"
    description: "{{ $value }} payments require manual investigation"

# Alert: Reconciliation failures
- alert: ReconciliationFailures
  expr: sum(rate(payment_webhook_total{result="recon_fail"}[5m])) > 0.1
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High reconciliation failure rate"
```

### Grafana Dashboard

Create a dashboard with:
1. **Stuck Payments Over Time** - Line chart of `reconciliation_stuck_total`
2. **Recovery Rate** - Success rate of reconciliation attempts
3. **Provider Comparison** - Recovery success by provider (iyzico vs PayTR)
4. **Alert Timeline** - Timeline of stuck payment alerts

## Troubleshooting

### Worker Not Running

```bash
# Check container status
docker-compose ps reconciliation-worker

# Check logs for errors
docker-compose logs reconciliation-worker

# Common issues:
# - MongoDB connection failed (check MONGO_URI)
# - Redis connection failed (check REDIS_URL)
# - Provider credentials invalid (check IYZICO_API_KEY, IYZICO_SECRET_KEY)
```

### High Stuck Payment Count

If `reconciliation_stuck_total` metric is high:

1. **Check Provider Status**
   - Is iyzico API operational?
   - Are webhooks being delivered?

2. **Check Webhook Endpoints**
   - Are webhook endpoints accessible?
   - Is IP allowlist configured correctly?
   - Are webhooks being processed successfully?

3. **Investigate Specific Payments**
   ```bash
   # Query stuck payments in MongoDB
   db.payments.find({
     status: { $in: ["PENDING_3DS", "INITIATED"] },
     createdAt: { $lt: new Date(Date.now() - 60*60*1000) }
   })
   ```

4. **Manual Recovery**
   - For iyzico: Check payment status in iyzico merchant panel
   - For PayTR: Check payment status in PayTR merchant panel
   - Update payment status manually if needed

### Reconciliation Failures

If reconciliation attempts are failing:

1. **Check Provider API Status**
   ```bash
   # Test iyzico API connectivity
   curl -X POST https://api.iyzipay.com/payment/detail \
     -H "Authorization: IYZWSv2 ..." \
     -d '{"paymentId": "..."}'
   ```

2. **Check Rate Limits**
   - iyzico has rate limits on API calls
   - Ensure reconciliation worker respects rate limits

3. **Check Logs**
   ```bash
   # View detailed error logs
   docker-compose logs reconciliation-worker | grep ERROR
   ```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | Yes | - | MongoDB connection string with replica set |
| `REDIS_URL` | Yes | - | Redis connection URL |
| `IYZICO_API_KEY` | Yes | - | iyzico API key |
| `IYZICO_SECRET_KEY` | Yes | - | iyzico secret key |
| `IYZICO_BASE_URL` | Yes | - | iyzico API base URL (sandbox or production) |
| `PAYTR_MERCHANT_ID` | No | - | PayTR merchant ID (optional) |
| `PAYTR_MERCHANT_KEY` | No | - | PayTR merchant key (optional) |
| `PAYTR_MERCHANT_SALT` | No | - | PayTR merchant salt (optional) |
| `ENVIRONMENT` | Yes | development | Environment name |
| `PROMETHEUS_METRICS` | No | true | Enable Prometheus metrics |

### Schedule Configuration

**Docker Compose**: Runs continuously with 10-minute sleep between cycles

**Kubernetes**: CronJob schedule `*/10 * * * *` (every 10 minutes)

To change the schedule:

```yaml
# Kubernetes: Edit reconciliation-cronjob.yaml
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes

# Docker Compose: Edit docker-compose.yml
command: >
  sh -c "
    while true; do
      python -m app.workers.reconciliation
      sleep 300  # 5 minutes
    done
  "
```

## Best Practices

1. **Monitor Metrics**: Set up alerts for stuck payments and reconciliation failures
2. **Regular Audits**: Review stuck payments weekly to identify patterns
3. **Provider Communication**: Report recurring issues to payment providers
4. **Backup Strategy**: Keep reconciliation logs for at least 30 days
5. **Testing**: Test reconciliation logic in staging before production deployment

## Security

- Secrets stored in environment variables or Kubernetes Secrets
- Non-root user (UID 1000) in Kubernetes
- Read-only root filesystem
- No privilege escalation
- All capabilities dropped

## References

- [iyzico API Documentation](https://docs.iyzico.com/)
- [PayTR API Documentation](https://dev.paytr.com/)
- [Kubernetes CronJob Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)
