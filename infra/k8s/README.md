# Kubernetes Deployment - Reconciliation Worker

This directory contains Kubernetes manifests for the payment reconciliation worker.

## Overview

The reconciliation worker is a CronJob that runs every 10 minutes to recover stuck payments by querying provider APIs.

**Schedule**: `*/10 * * * *` (every 10 minutes)

## Prerequisites

Before deploying the reconciliation worker, ensure you have:

1. **Kubernetes cluster** (v1.21+)
2. **kubectl** configured to access your cluster
3. **Secrets** created for payment providers
4. **MongoDB** and **Redis** accessible from the cluster

## Secrets Setup

### 1. MongoDB Credentials

```bash
kubectl create secret generic mongodb-credentials \
  --namespace=vorte \
  --from-literal=uri='mongodb://user:password@mongo:27017/vorte?replicaSet=rs0'
```

### 2. Redis Credentials

```bash
kubectl create secret generic redis-credentials \
  --namespace=vorte \
  --from-literal=url='redis://redis:6379/0'
```

### 3. iyzico Credentials

```bash
kubectl create secret generic iyzico-credentials \
  --namespace=vorte \
  --from-literal=api-key='your-iyzico-api-key' \
  --from-literal=secret-key='your-iyzico-secret-key'
```

### 4. PayTR Credentials (Optional)

```bash
kubectl create secret generic paytr-credentials \
  --namespace=vorte \
  --from-literal=merchant-id='your-paytr-merchant-id' \
  --from-literal=merchant-key='your-paytr-merchant-key' \
  --from-literal=merchant-salt='your-paytr-merchant-salt'
```

## Deployment

### 1. Create Namespace

```bash
kubectl create namespace vorte
```

### 2. Deploy CronJob

```bash
kubectl apply -f reconciliation-cronjob.yaml
```

### 3. Verify Deployment

```bash
# Check CronJob status
kubectl get cronjob payment-reconciliation -n vorte

# List jobs created by CronJob
kubectl get jobs -n vorte -l component=reconciliation-worker

# View logs from latest job
kubectl logs -n vorte -l component=reconciliation-worker --tail=100
```

## Management

### Manual Trigger

To manually trigger a reconciliation run without waiting for the schedule:

```bash
kubectl create job --from=cronjob/payment-reconciliation manual-recon-$(date +%s) -n vorte
```

### View Logs

```bash
# Get logs from latest job
kubectl logs -n vorte -l component=reconciliation-worker --tail=100 -f

# Get logs from specific job
kubectl logs -n vorte job/payment-reconciliation-1234567890
```

### Suspend CronJob

To temporarily disable the reconciliation worker:

```bash
kubectl patch cronjob payment-reconciliation -n vorte -p '{"spec":{"suspend":true}}'
```

To resume:

```bash
kubectl patch cronjob payment-reconciliation -n vorte -p '{"spec":{"suspend":false}}'
```

### Update Schedule

To change the schedule (e.g., run every 5 minutes):

```bash
kubectl patch cronjob payment-reconciliation -n vorte -p '{"spec":{"schedule":"*/5 * * * *"}}'
```

### Delete CronJob

```bash
kubectl delete cronjob payment-reconciliation -n vorte
```

## Monitoring

### Prometheus Metrics

The reconciliation worker emits the following Prometheus metrics:

- `reconciliation_recovered_total{provider, status}` - Total payments recovered
- `reconciliation_stuck_total{provider}` - Total payments stuck > 60 minutes
- `payment_webhook_total{provider, result="recon_*"}` - Reconciliation results

### Alerts

Configure Prometheus alerts for:

1. **Stuck Payments**: Alert when `reconciliation_stuck_total` > 0
2. **Failed Jobs**: Alert when CronJob fails multiple times
3. **No Runs**: Alert when no jobs have run in 15+ minutes

Example alert:

```yaml
- alert: ReconciliationStuckPayments
  expr: sum(reconciliation_stuck_total) > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Payments stuck for > 60 minutes"
    description: "{{ $value }} payments are stuck and require manual investigation"
```

## Troubleshooting

### Job Fails Immediately

Check logs for errors:

```bash
kubectl logs -n vorte -l component=reconciliation-worker --tail=100
```

Common issues:
- MongoDB connection failed (check `MONGO_URI` secret)
- Redis connection failed (check `REDIS_URL` secret)
- Provider API credentials invalid (check iyzico/PayTR secrets)

### Job Times Out

If jobs consistently hit the 5-minute timeout:

1. Check MongoDB performance (slow queries)
2. Check provider API latency
3. Reduce batch size in code
4. Increase `activeDeadlineSeconds` in manifest

### Too Many Stuck Payments

If `reconciliation_stuck_total` metric is high:

1. Check provider API status (outage?)
2. Check webhook/callback endpoints (receiving events?)
3. Investigate specific stuck payments manually
4. Consider reducing reconciliation threshold from 15 to 10 minutes

## Docker Compose Alternative

For local development or non-Kubernetes deployments, use Docker Compose:

```bash
# Start all services including reconciliation worker
docker-compose up -d

# View reconciliation worker logs
docker-compose logs -f reconciliation-worker

# Manually trigger reconciliation
docker-compose exec reconciliation-worker python -m app.workers.reconciliation
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string with replica set |
| `REDIS_URL` | Yes | Redis connection URL |
| `IYZICO_API_KEY` | Yes | iyzico API key |
| `IYZICO_SECRET_KEY` | Yes | iyzico secret key |
| `IYZICO_BASE_URL` | Yes | iyzico API base URL (sandbox or production) |
| `PAYTR_MERCHANT_ID` | No | PayTR merchant ID (optional) |
| `PAYTR_MERCHANT_KEY` | No | PayTR merchant key (optional) |
| `PAYTR_MERCHANT_SALT` | No | PayTR merchant salt (optional) |
| `ENVIRONMENT` | Yes | Environment name (development, staging, production) |
| `PROMETHEUS_METRICS` | No | Enable Prometheus metrics (default: true) |

### Resource Limits

Default resource limits:

- **Requests**: 256Mi memory, 100m CPU
- **Limits**: 512Mi memory, 500m CPU

Adjust based on your workload:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## Security

The CronJob runs with:

- Non-root user (UID 1000)
- Read-only root filesystem
- No privilege escalation
- All capabilities dropped
- Dedicated service account

Secrets are mounted as environment variables from Kubernetes Secrets, never hardcoded.

## References

- [Kubernetes CronJob Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [iyzico API Documentation](https://docs.iyzico.com/)
- [PayTR API Documentation](https://dev.paytr.com/)
