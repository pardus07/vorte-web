# Payment Reconciliation - Complete Implementation

## 🎉 Overview

Complete implementation of payment reconciliation system with automatic recovery for both iyzico and PayTR payment providers. The system automatically recovers stuck payments every 10 minutes, reducing operational overhead and improving customer experience.

## ✅ What's Included

### 1. Core Implementation

#### PayTR Status Inquiry API
- **File**: `apps/backend/app/services/adapters/paytr_adapter.py`
- **Method**: `async def status_inquiry(merchant_oid: str)`
- **Features**:
  - HMAC-SHA256 token authentication
  - JSON response parsing with validation
  - Proper error handling
  - Latency tracking

#### Reconciliation Worker
- **File**: `apps/backend/app/workers/reconciliation.py`
- **Features**:
  - Automatic recovery for iyzico and PayTR
  - MongoDB transaction support
  - Status mapping for both providers
  - Comprehensive error handling
  - Metrics emission

#### Enhanced Metrics
- **File**: `apps/backend/app/services/metrics.py`
- **New Metrics**:
  - `reconciliation_calls_total{provider}` - API call counter
  - `reconciliation_call_latency_seconds{provider}` - Latency histogram
  - `reconciliation_recovered_total{provider, status}` - Recovery counter
  - `reconciliation_stuck_total{provider}` - Stuck payment counter

### 2. Deployment Configurations

#### Docker Compose
- **Development**: `docker-compose.yml`
- **Production**: `docker-compose.prod.yml`
- **Features**:
  - Runs every 10 minutes (600 second sleep)
  - Automatic restart on failure
  - Environment variable configuration
  - Resource limits

#### Kubernetes
- **File**: `infra/k8s/reconciliation-cronjob.yaml`
- **Features**:
  - CronJob schedule: `*/10 * * * *`
  - Concurrency policy: Forbid
  - Resource limits and security context
  - ServiceAccount and ConfigMap
  - Secrets management

### 3. Monitoring & Alerting

#### Prometheus Alerts
- **File**: `infra/monitoring/prometheus-alerts.yml`
- **Alert Groups**:
  - `vorte-payment-reconciliation` (5 alerts)
  - `vorte-payment-providers` (4 alerts)
- **Key Alerts**:
  - Stuck payments > 0 for 5 minutes
  - Failure rate > 5% for 10 minutes
  - API latency p95 > 5s for 10 minutes
  - Worker not running for 15+ minutes
  - Backlog growing rapidly

#### Grafana Dashboard
- **File**: `infra/monitoring/grafana/dashboards/payment-reconciliation.json`
- **Panels** (18 total):
  - Stuck payments stat
  - Reconciliation call rate
  - Recovery success rate gauge
  - Failure rate stat
  - Call rate by provider (timeseries)
  - Payments recovered by provider (bars)
  - API latency p50/p95/p99 (timeseries)
  - API latency heatmap
  - Status distribution (pie chart)
  - Results by provider (bar gauge)
  - Stuck payments timeline
  - Error analysis (timeseries + table)

### 4. Documentation

#### User Documentation
- `docs/reconciliation-worker.md` - Complete user guide
- `docs/RECONCILIATION_PAYTR_PATCH.md` - PayTR patch details
- `docs/RECONCILIATION_DEPLOYMENT_CHECKLIST.md` - Deployment guide
- `docs/RECONCILIATION_COMPLETE.md` - This file

#### Runbooks
- `docs/runbooks/stuck-payments.md` - Troubleshooting stuck payments
- `docs/runbooks/reconciliation-failures.md` - Handling reconciliation failures

#### Management Scripts
- `scripts/reconciliation-worker.sh` - Bash management script
- `scripts/reconciliation-worker.ps1` - PowerShell management script

### 5. Tests

#### Test Coverage
- **File**: `apps/backend/tests/test_reconciliation_worker.py`
- **Test Cases** (9 total):
  - Worker initialization
  - No stuck payments scenario
  - iyzico payment reconciliation
  - PayTR payment reconciliation
  - Stuck payment alerts (> 60 minutes)
  - Status mapping (iyzico & PayTR)
  - API error handling
  - No status change scenario

## 📊 Provider Comparison

| Feature | iyzico | PayTR |
|---------|--------|-------|
| **Status Query API** | ✅ `payment/detail` | ✅ `odeme/durum-sorgu` |
| **Auto-Recovery** | ✅ Yes | ✅ Yes |
| **Response Time** | ~200-400ms | ~200-500ms |
| **Authentication** | IYZWSv2 signature | HMAC-SHA256 token |
| **Status Values** | success, failure, init_threeds, etc. | success, failed, waiting, cancelled, refunded |
| **Implementation** | ✅ Complete | ✅ Complete |

## 🚀 Quick Start

### Docker Compose

```bash
# Start all services including reconciliation worker
docker-compose up -d

# View logs
docker-compose logs -f reconciliation-worker

# Manually trigger reconciliation
docker-compose exec reconciliation-worker python -m app.workers.reconciliation

# Check status
docker-compose ps reconciliation-worker
```

### Kubernetes

```bash
# Deploy CronJob
kubectl apply -f infra/k8s/reconciliation-cronjob.yaml

# Check status
kubectl get cronjob payment-reconciliation -n vorte

# View logs
kubectl logs -n vorte -l component=reconciliation-worker --tail=100

# Manually trigger
kubectl create job --from=cronjob/payment-reconciliation manual-recon-$(date +%s) -n vorte
```

### Management Scripts

```bash
# Bash (Linux/macOS)
./scripts/reconciliation-worker.sh start
./scripts/reconciliation-worker.sh logs
./scripts/reconciliation-worker.sh run-once

# PowerShell (Windows)
.\scripts\reconciliation-worker.ps1 start
.\scripts\reconciliation-worker.ps1 logs
.\scripts\reconciliation-worker.ps1 run-once
```

## 📈 Monitoring

### Prometheus Queries

```promql
# Reconciliation call rate by provider
sum(rate(reconciliation_calls_total[5m])) by (provider)

# Payments recovered by provider
sum(rate(reconciliation_recovered_total[5m])) by (provider, status)

# Stuck payments
sum(reconciliation_stuck_total) by (provider)

# API latency p95
histogram_quantile(0.95,
  sum(rate(reconciliation_call_latency_seconds_bucket[5m])) by (le, provider)
)

# Failure rate
sum(rate(payment_webhook_total{result="recon_fail"}[15m])) by (provider)
/ sum(rate(reconciliation_calls_total[15m])) by (provider)
```

### Grafana Dashboard

Import `infra/monitoring/grafana/dashboards/payment-reconciliation.json` to Grafana UI.

Dashboard includes:
- Real-time stuck payment count
- Reconciliation call rate and success rate
- API latency percentiles (p50, p95, p99)
- Status distribution and error analysis
- Provider comparison

## 🔧 Configuration

### Environment Variables

```bash
# MongoDB (required)
MONGO_URI=mongodb://user:pass@mongo:27017/vorte?replicaSet=rs0

# Redis (required)
REDIS_URL=redis://redis:6379/0

# iyzico (required)
IYZICO_API_KEY=your-api-key
IYZICO_SECRET_KEY=your-secret-key
IYZICO_BASE_URL=https://api.iyzipay.com

# PayTR (optional)
PAYTR_MERCHANT_ID=your-merchant-id
PAYTR_MERCHANT_KEY=your-merchant-key
PAYTR_MERCHANT_SALT=your-merchant-salt

# Application
ENVIRONMENT=production
PROMETHEUS_METRICS=true
```

### Schedule Configuration

**Docker Compose**: Edit `sleep 600` in `docker-compose.yml` (600 = 10 minutes)

**Kubernetes**: Edit `schedule: "*/10 * * * *"` in `reconciliation-cronjob.yaml`

## 🎯 Success Metrics

### Target SLOs

- **Recovery Rate**: > 80%
- **API Latency p95**: < 5s
- **Failure Rate**: < 5%
- **Stuck Payment Count**: < 5 at any time
- **Worker Uptime**: > 99.9%

### Current Performance (Expected)

- **Recovery Rate**: ~95%
- **API Latency p95**: ~1-2s
- **Failure Rate**: ~1-2%
- **Stuck Payment Count**: 0-2
- **Worker Uptime**: 100%

## 🛡️ Security

- Non-root user (UID 1000) in Kubernetes
- Read-only root filesystem
- No privilege escalation
- All capabilities dropped
- Secrets managed via environment variables
- HMAC-SHA256 authentication for PayTR
- IYZWSv2 signature for iyzico

## 📚 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Reconciliation Worker                      │
│                   (Runs every 10 minutes)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Query Stuck Payments from MongoDB               │
│   status IN [PENDING_3DS, INITIATED] AND age > 15 minutes   │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   iyzico Reconciliation   │   │   PayTR Reconciliation    │
│                           │   │                           │
│  1. Call payment/detail   │   │  1. Call durum-sorgu      │
│  2. Map status            │   │  2. Map status            │
│  3. Update in transaction │   │  3. Update in transaction │
│  4. Emit metrics          │   │  4. Emit metrics          │
└───────────────────────────┘   └───────────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Prometheus Metrics                        │
│  - reconciliation_calls_total                                │
│  - reconciliation_recovered_total                            │
│  - reconciliation_stuck_total                                │
│  - reconciliation_call_latency_seconds                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Grafana Dashboard + Alerts                  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Workflow

1. **Every 10 minutes**: Worker wakes up
2. **Query**: Find payments stuck > 15 minutes
3. **Alert**: If payment stuck > 60 minutes, emit alert
4. **Reconcile**: Query provider API for current status
5. **Update**: Update payment status in MongoDB transaction
6. **Record**: Create payment event for audit trail
7. **Metrics**: Emit Prometheus metrics
8. **Sleep**: Wait 10 minutes, repeat

## 🐛 Troubleshooting

### Common Issues

1. **Worker not running**
   - Check container/pod status
   - Check logs for errors
   - Verify MongoDB replica set health

2. **High failure rate**
   - Check provider API status
   - Verify credentials
   - Check network connectivity
   - Review error logs

3. **Stuck payments not recovering**
   - Check provider merchant panel
   - Verify webhook/callback delivery
   - Check reconciliation worker logs
   - Manual recovery may be needed

### Runbooks

- [Stuck Payments](./runbooks/stuck-payments.md)
- [Reconciliation Failures](./runbooks/reconciliation-failures.md)

## 📦 Deployment

Follow the [Deployment Checklist](./RECONCILIATION_DEPLOYMENT_CHECKLIST.md) for step-by-step deployment guide.

### Pre-requisites

- MongoDB replica set (even single-node)
- Redis accessible
- Provider credentials configured
- Prometheus and Grafana (for monitoring)

### Deployment Steps

1. ✅ Verify environment
2. ✅ Run tests
3. ✅ Deploy to staging
4. ✅ Verify in staging
5. ✅ Deploy to production
6. ✅ Configure monitoring
7. ✅ Validate for 24 hours

## 🎓 Training

### For Engineers

- Read [Reconciliation Worker Documentation](./reconciliation-worker.md)
- Review [PayTR Patch Details](./RECONCILIATION_PAYTR_PATCH.md)
- Study runbooks for troubleshooting

### For Operations

- Learn management scripts
- Understand alert thresholds
- Practice runbook procedures
- Monitor Grafana dashboard

### For Support

- Understand stuck payment scenarios
- Know when to escalate
- Use merchant panels for verification

## 📞 Support

- **Engineering**: eng@vorte.com.tr
- **Operations**: ops@vorte.com.tr
- **iyzico Support**: https://www.iyzico.com/destek
- **PayTR Support**: https://www.paytr.com/iletisim

## 🔗 References

- [iyzico API Documentation](https://docs.iyzico.com/)
- [PayTR API Documentation](https://dev.paytr.com/)
- [PayTR Status Inquiry](https://www.paytr.com/odeme/durum-sorgu)
- [MongoDB Transactions](https://docs.mongodb.com/manual/core/transactions/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/histograms/)
- [Kubernetes CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)

---

**Version**: 1.0.0  
**Last Updated**: October 24, 2024  
**Status**: ✅ Production Ready  
**Maintainer**: VORTE Engineering Team
