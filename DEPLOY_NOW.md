# 🚀 Deploy NOW - Production Checklist

**Current Status:** ✅ v1.0.0 Tagged, System Validated, Ready to Deploy

---

## ⚡ Quick Deploy (Copy-Paste Ready)

### Option A: Deploy to Production Server (Linux)

```bash
# 1. Clone repository
git clone https://github.com/your-org/vorte.git
cd vorte
git checkout v1.0.0

# 2. Generate MongoDB keyfile
openssl rand -base64 756 > mongo-keyfile
chmod 400 mongo-keyfile

# 3. Configure environment
cp .env.production.example .env.production
nano .env.production  # Edit with your values

# 4. Start production stack
docker compose -f docker-compose.prod.yml up -d

# 5. Wait for services (60 seconds)
sleep 60

# 6. Create MongoDB admin user (first time only)
docker exec -it vorte-mongo mongosh --eval \
  'db.getSiblingDB("admin").createUser({
    user: "admin",
    pwd: "YOUR_STRONG_PASSWORD_HERE",
    roles: ["root"]
  })'

# 7. Verify deployment
curl -f http://localhost:8000/api/health
```

---

### Option B: Continue Development (Current Windows Environment)

Your current dev environment is already running and validated:

```powershell
# Check current status
docker compose ps

# View logs
docker compose logs -f api

# Access services
# API: http://localhost:8000
# Frontend: http://localhost:3000
# Docs: http://localhost:8000/api/docs
```

---

## ✅ 60-Second Smoke Test Checklist

After deployment, verify these in order:

### 1. Services Status
```bash
docker compose -f docker-compose.prod.yml ps
```
**Expected:** All services "Up" and "(healthy)"

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
curl -f http://localhost:8000/api/health
```
**Expected:** `{"status":"healthy","service":"vorte-api","version":"1.0.0"}`

### 4. Prometheus Metrics
```bash
curl -s http://localhost:8000/metrics | head -20
```
**Expected:** Prometheus metrics output

### 5. Grafana Dashboard
```bash
curl -f http://localhost:3001/api/health
```
**Expected:** `{"database":"ok",...}`

### 6. Frontend
```bash
curl -f http://localhost:3000
```
**Expected:** HTTP 200 with HTML

---

## 🔐 Security Hardening (Next Steps)

### 1. TLS/SSL Setup

#### Using Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone \
  -d vorte.com.tr \
  -d www.vorte.com.tr \
  --email admin@vorte.com.tr \
  --agree-tos

# Copy certificates
sudo mkdir -p infra/nginx/ssl
sudo cp /etc/letsencrypt/live/vorte.com.tr/fullchain.pem infra/nginx/ssl/
sudo cp /etc/letsencrypt/live/vorte.com.tr/privkey.pem infra/nginx/ssl/
sudo chmod 644 infra/nginx/ssl/*.pem

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

#### Auto-renewal (Cron)
```bash
# Add to crontab
0 0 1 * * certbot renew --quiet && docker compose -f docker-compose.prod.yml restart nginx
```

### 2. Nginx TLS Configuration

Add to `infra/nginx/conf.d/default.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name vorte.com.tr www.vorte.com.tr;

    # TLS certificates
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # TLS settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to backend
    location /api/ {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy to frontend
    location / {
        proxy_pass http://web:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name vorte.com.tr www.vorte.com.tr;
    return 301 https://$server_name$request_uri;
}
```

### 3. Firewall Rules

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

---

## 💾 Automated Backup Setup

### 1. Make Script Executable

```bash
chmod +x scripts/backup_mongo.sh
```

### 2. Test Backup Manually

```bash
# Set password
export MONGO_PASS="YOUR_STRONG_PASSWORD"

# Run backup
./scripts/backup_mongo.sh

# Check backup
ls -lh /backups/
```

### 3. Setup Cron (Daily at 3 AM)

```bash
# Edit crontab
crontab -e

# Add this line:
0 3 * * * cd /opt/vorte && MONGO_PASS="YOUR_PASSWORD" ./scripts/backup_mongo.sh >> /var/log/vorte-backup.log 2>&1
```

### 4. Optional: S3 Backup

Add to `.env.production`:
```bash
AWS_S3_BUCKET=vorte-backups
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=eu-central-1
```

Uncomment S3 upload section in `scripts/backup_mongo.sh`

---

## 📊 Monitoring Setup

### 1. Access Grafana

```bash
# Open in browser
http://localhost:3001

# Login
Username: admin
Password: (from .env.production GRAFANA_ADMIN_PASSWORD)
```

### 2. Import Dashboards

Pre-configured dashboards are in `infra/monitoring/grafana/dashboards/`

### 3. Configure Slack Alerts (Optional)

Add to `.env.production`:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Update `infra/monitoring/prometheus-alerts.yml` with Alertmanager config.

---

## 🔄 Deployment Workflow

### Regular Updates

```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild images
docker compose -f docker-compose.prod.yml build

# 3. Restart services (zero-downtime with replicas)
docker compose -f docker-compose.prod.yml up -d

# 4. Verify health
curl -f http://localhost:8000/api/health
```

### Rollback

```bash
# 1. Checkout previous version
git checkout v0.9.0

# 2. Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# 3. Verify
curl -f http://localhost:8000/api/health
```

---

## 📋 Production Readiness Checklist

### Before Going Live

- [ ] ✅ v1.0.0 tagged and pushed
- [ ] Generate MongoDB keyfile
- [ ] Configure `.env.production` with strong passwords
- [ ] Generate SSL/TLS certificates (Let's Encrypt)
- [ ] Configure Nginx with TLS
- [ ] Set up firewall rules (UFW)
- [ ] Test backup script manually
- [ ] Configure automated backups (cron)
- [ ] Set up S3 backup (optional)
- [ ] Configure Slack notifications (optional)
- [ ] Access Grafana and verify dashboards
- [ ] Test Prometheus alerts
- [ ] Verify all health checks pass
- [ ] Test MongoDB replica set
- [ ] Test E2E user registration flow
- [ ] Document rollback procedure
- [ ] Set up log aggregation (optional)
- [ ] Configure CDN (optional)

### After Going Live

- [ ] Monitor Grafana dashboards for 24 hours
- [ ] Verify backups are running
- [ ] Test restore procedure
- [ ] Monitor error budget
- [ ] Review Prometheus alerts
- [ ] Check performance metrics (P95 latency)
- [ ] Verify SSL/TLS is working
- [ ] Test from external network
- [ ] Monitor resource usage (CPU/Memory)
- [ ] Set up on-call rotation

---

## 🆘 Quick Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs SERVICE_NAME

# Check all services
docker compose -f docker-compose.prod.yml ps

# Restart specific service
docker compose -f docker-compose.prod.yml restart SERVICE_NAME
```

### MongoDB Connection Issues

```bash
# Check replica set
docker exec -it vorte-mongo mongosh \
  -u admin -p PASSWORD \
  --authenticationDatabase admin \
  --eval "rs.status()"

# Check authentication
docker exec -it vorte-mongo mongosh \
  -u admin -p PASSWORD \
  --authenticationDatabase admin \
  --eval "db.adminCommand('ping')"
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Adjust limits in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 2G  # Increase if needed
```

---

## 📞 Support

- **Documentation:** [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
- **Quick Guide:** [QUICK_DEPLOY.md](QUICK_DEPLOY.md)
- **System Status:** [SYSTEM_STATUS.md](SYSTEM_STATUS.md)
- **Validation:** [VALIDATION_RESULTS.md](VALIDATION_RESULTS.md)

---

**Version:** 1.0.0  
**Status:** ✅ Ready to Deploy  
**Last Updated:** 2025-01-24

🚀 **Ready when you are!**
