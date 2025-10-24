# 🚀 Quick Production Deployment Guide

**Status:** ✅ Core Platform 100% Complete - Ready for Production

---

## 📸 What We Accomplished

### 🔧 Critical Fixes
- ✅ MongoDB Replica Set configured and active
- ✅ API healthcheck fixed (Python-based)
- ✅ ReservationRepository collection property added
- ✅ Argon2 optimized for dev (64MB) and prod (128MB)

### ✅ Validation Complete
- ✅ All services healthy (API, Web, Mongo, Redis, MinIO)
- ✅ MongoDB Replica Set active (rs0)
- ✅ Database connectivity verified
- ✅ E2E flow tested (user registration successful)
- ✅ API endpoints functional

### 📋 Documentation
- ✅ Requirements/Design/Tasks 100% synced
- ✅ Core Platform 100% complete (27/27 tasks)
- ✅ Production infrastructure ready

---

## 🎯 3-Step Quick Deploy

### Step 1: Tag & Push Release

```bash
git pull
git tag -a v1.0.0 -m "Core Platform 1.0.0 - Production Ready"
git push origin main --tags
```

### Step 2: Generate MongoDB Keyfile

```bash
# Generate keyfile for replica set authentication
openssl rand -base64 756 > mongo-keyfile
chmod 400 mongo-keyfile
```

### Step 3: Deploy Production Stack

```bash
# Start production services
docker compose -f docker-compose.prod.yml up -d

# Wait for MongoDB to be ready (30 seconds)
sleep 30

# Create admin user (first time only)
docker exec -it vorte-mongo mongosh --eval \
  'db.getSiblingDB("admin").createUser({
    user: "admin",
    pwd: "CHANGE_ME_STRONG_PASSWORD",
    roles: ["root"]
  })'

# Verify deployment
curl -f http://localhost:8000/api/health
```

**Expected Response:**
```json
{"status":"healthy","service":"vorte-api","version":"1.0.0"}
```

---

## 📁 Production Files (Already Created)

### 1. Prometheus Alerts
**File:** `infra/monitoring/prometheus-alerts.yml`

Key alerts configured:
- High error rate (>2% for 5min) → Page
- High P95 latency (Checkout >3s) → Ticket
- Inventory conflicts spike (>25 in 10min) → Ticket
- Error budget exhausted (>0.1% weekly) → FREEZE DEPLOYMENTS

### 2. MongoDB Backup Script
**File:** `scripts/backup_mongo.sh`

Features:
- Automated daily backups (3 AM)
- 7-day retention policy
- S3 upload support (optional)
- Slack notifications (optional)

**Setup Cron:**
```bash
chmod +x scripts/backup_mongo.sh

# Add to crontab
crontab -e

# Add this line:
0 3 * * * cd /opt/vorte && MONGO_PASS=YOUR_PASSWORD ./scripts/backup_mongo.sh >> /var/log/vorte-backup.log 2>&1
```

### 3. Production Docker Compose
**File:** `docker-compose.prod.yml`

Features:
- MongoDB with authentication + replica set
- TLS/SSL support
- Resource limits (CPU/Memory)
- High availability (2 replicas for API/Web)
- Prometheus + Grafana monitoring
- Health checks for all services

---

## 🔐 Environment Configuration

### Create Production Environment File

```bash
cp .env.production.example .env.production
nano .env.production
```

### Required Variables

```bash
# MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE

# Redis
REDIS_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE

# JWT (Generate: openssl rand -hex 32)
JWT_SECRET=CHANGE_ME_STRONG_SECRET_HERE

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE

# API
API_URL=https://api.vorte.com.tr
CORS_ORIGINS=https://vorte.com.tr,https://www.vorte.com.tr

# Grafana
GRAFANA_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
```

---

## 🔍 Verification Checklist

### 1. Service Health

```bash
docker compose -f docker-compose.prod.yml ps
```

**Expected:** All services "Up" and "healthy"

### 2. MongoDB Replica Set

```bash
docker exec -it vorte-mongo mongosh \
  -u admin -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  --eval "rs.status().ok"
```

**Expected:** `1`

### 3. API Health

```bash
curl http://localhost:8000/api/health
```

**Expected:** `{"status":"healthy",...}`

### 4. Frontend

```bash
curl http://localhost:3000
```

**Expected:** HTTP 200 with HTML content

### 5. Prometheus

```bash
curl http://localhost:9090/-/healthy
```

**Expected:** `Prometheus is Healthy.`

### 6. Grafana

```bash
curl http://localhost:3001/api/health
```

**Expected:** `{"commit":"...","database":"ok",...}`

---

## 📊 Monitoring Access

### Grafana Dashboard
- **URL:** http://localhost:3001
- **Username:** admin
- **Password:** (from .env.production)

### Prometheus
- **URL:** http://localhost:9090
- **Metrics:** http://localhost:8000/metrics

### Pre-configured Dashboards
- API Performance Dashboard
- Business Metrics Dashboard
- Infrastructure Dashboard

---

## 🛡️ Security Hardening (Production)

### 1. Enable TLS/SSL

```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d vorte.com.tr

# Copy to nginx
sudo cp /etc/letsencrypt/live/vorte.com.tr/fullchain.pem infra/nginx/ssl/
sudo cp /etc/letsencrypt/live/vorte.com.tr/privkey.pem infra/nginx/ssl/
```

### 2. Firewall Rules

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Update Argon2 Settings

Already configured in production:
- Memory: 128MB (vs 64MB in dev)
- Time cost: 2
- Parallelism: 4

### 4. Secrets Management

**DO NOT commit to git:**
- `.env.production`
- `mongo-keyfile`
- SSL certificates

**Use secrets manager in production:**
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault

---

## 🔄 Backup & Recovery

### Manual Backup

```bash
MONGO_PASS=YOUR_PASSWORD ./scripts/backup_mongo.sh
```

### Restore from Backup

```bash
# Extract backup
tar -xzf /backups/mongo-20250124-030000.tar.gz

# Restore to MongoDB
docker exec -i vorte-mongo mongorestore \
  -u admin -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  --drop \
  /data/backup/mongo-20250124-030000
```

### S3 Backup (Optional)

Add to `.env.production`:
```bash
AWS_S3_BUCKET=vorte-backups
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

---

## 📈 Performance SLOs

### Target Metrics
- **Homepage P95:** < 2s
- **Search P95:** < 1.5s
- **Checkout P95:** < 3s
- **Uptime:** 99.9% (0.1% error budget per week)

### Alert Thresholds
- **Error Rate:** >2% for 5min → Page
- **Latency:** P95 > SLO for 10min → Ticket
- **Error Budget:** >75% consumed → Warning
- **Error Budget:** Exhausted → FREEZE DEPLOYMENTS

---

## 🚨 Incident Response

### 1. Check Grafana Dashboards
http://localhost:3001

### 2. Review Prometheus Alerts
http://localhost:9090/alerts

### 3. Check Application Logs

```bash
# API logs
docker compose -f docker-compose.prod.yml logs api --tail=100

# All services
docker compose -f docker-compose.prod.yml logs --tail=50
```

### 4. Check Service Health

```bash
docker compose -f docker-compose.prod.yml ps
```

### 5. Rollback if Necessary

```bash
# Stop current version
docker compose -f docker-compose.prod.yml down

# Checkout previous version
git checkout v0.9.0

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 📚 Additional Resources

### Documentation
- **Full Deployment Guide:** [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
- **System Status:** [SYSTEM_STATUS.md](SYSTEM_STATUS.md)
- **Validation Results:** [VALIDATION_RESULTS.md](VALIDATION_RESULTS.md)
- **Quick Start:** [QUICK_START.md](QUICK_START.md)

### Monitoring
- **Prometheus Alerts:** [infra/monitoring/prometheus-alerts.yml](infra/monitoring/prometheus-alerts.yml)
- **Backup Script:** [scripts/backup_mongo.sh](scripts/backup_mongo.sh)

### Configuration
- **Production Compose:** [docker-compose.prod.yml](docker-compose.prod.yml)
- **Environment Template:** [.env.production.example](.env.production.example)

---

## ✅ Deployment Checklist

Before going to production:

- [ ] Tag release (v1.0.0)
- [ ] Generate MongoDB keyfile
- [ ] Configure `.env.production` with strong passwords
- [ ] Generate SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up automated backups (cron)
- [ ] Configure S3 backup (optional)
- [ ] Set up Slack notifications (optional)
- [ ] Test backup and restore procedure
- [ ] Review Prometheus alerts
- [ ] Configure Grafana dashboards
- [ ] Test all health checks
- [ ] Verify MongoDB replica set
- [ ] Test E2E user flow
- [ ] Document rollback procedure
- [ ] Set up monitoring alerts
- [ ] Configure log aggregation (optional)

---

## 🎉 Success Criteria

Your deployment is successful when:

✅ All services show "healthy" status  
✅ MongoDB replica set is active (rs.status().ok = 1)  
✅ API health endpoint returns 200 OK  
✅ Frontend loads successfully  
✅ User registration flow works  
✅ Prometheus is collecting metrics  
✅ Grafana dashboards are accessible  
✅ Backups are running automatically  
✅ Alerts are configured and firing correctly  

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-24  
**Status:** ✅ Production Ready

**Need Help?** Review [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) for detailed instructions.
