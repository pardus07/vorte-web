# Production Deployment Guide

This guide covers deploying VORTE E-Commerce Platform to production with security hardening and monitoring.

## Prerequisites

- Docker & Docker Compose installed
- Domain name configured (e.g., vorte.com.tr)
- SSL/TLS certificates (Let's Encrypt recommended)
- Minimum 4GB RAM, 2 CPU cores
- 50GB disk space

## Quick Start (7 Steps)

### 1. Create Release Tag

```bash
git pull
git tag -a v1.0.0 -m "Core Platform 1.0.0 - production-ready"
git push --tags
```

### 2. Generate MongoDB Keyfile

```bash
# Generate keyfile for replica set authentication
openssl rand -base64 756 > mongo-keyfile
chmod 400 mongo-keyfile
```

### 3. Configure Environment

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

**Required Changes:**
- `MONGO_ROOT_PASSWORD` - Strong password (min 16 chars)
- `REDIS_PASSWORD` - Strong password
- `JWT_SECRET` - Generate with: `openssl rand -hex 32`
- `MINIO_ROOT_PASSWORD` - Strong password
- `GRAFANA_ADMIN_PASSWORD` - Strong password

### 4. Initialize MongoDB with Authentication

```bash
# Start MongoDB first
docker compose -f docker-compose.prod.yml up -d mongo

# Wait for MongoDB to be ready
sleep 10

# Initialize replica set
docker compose -f docker-compose.prod.yml up mongo-init

# Create admin user (if not auto-created)
docker exec -it vorte-mongo mongosh --eval \
  'db.getSiblingDB("admin").createUser({
    user: "admin",
    pwd: "YOUR_STRONG_PASSWORD",
    roles: ["root"]
  })'
```

### 5. Configure TLS/SSL

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d vorte.com.tr -d www.vorte.com.tr

# Copy certificates
sudo cp /etc/letsencrypt/live/vorte.com.tr/fullchain.pem infra/nginx/ssl/
sudo cp /etc/letsencrypt/live/vorte.com.tr/privkey.pem infra/nginx/ssl/
sudo chmod 644 infra/nginx/ssl/*.pem
```

#### Option B: Self-Signed (Development Only)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/nginx/ssl/privkey.pem \
  -out infra/nginx/ssl/fullchain.pem \
  -subj "/CN=vorte.com.tr"
```

### 6. Deploy All Services

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Check service health
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 7. Verify Deployment

```bash
# Health check
curl -f https://vorte.com.tr/api/health

# Expected response:
# {"status":"healthy","service":"vorte-api","version":"1.0.0"}

# Check MongoDB replica set
docker exec -it vorte-mongo mongosh \
  -u admin -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  --eval "rs.status().ok"

# Expected: 1

# Check Prometheus metrics
curl http://localhost:9090/-/healthy

# Check Grafana
curl http://localhost:3001/api/health
```

## Security Hardening

### 1. Argon2 Production Settings

Already configured in `docker-compose.prod.yml`:
```yaml
- ARGON2_MEMORY_MB=128
- ARGON2_TIME_COST=2
- ARGON2_PARALLELISM=4
```

### 2. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Nginx Security Headers

Already configured in `infra/nginx/nginx.conf`:
- HSTS (Strict-Transport-Security)
- CSP (Content-Security-Policy)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### 4. Rate Limiting

Already configured:
- Authentication endpoints: 60 req/min per IP
- API endpoints: Configurable via Nginx

## Monitoring Setup

### 1. Access Grafana

```bash
# Open in browser
open http://localhost:3001

# Login with credentials from .env.production
# Username: admin
# Password: (from GRAFANA_ADMIN_PASSWORD)
```

### 2. Import Dashboards

Pre-configured dashboards are in `infra/monitoring/grafana/dashboards/`:
- API Performance Dashboard
- Business Metrics Dashboard
- Infrastructure Dashboard

### 3. Configure Alerts

Prometheus alerts are configured in `infra/monitoring/prometheus-alerts.yml`:
- High error rate (>2% for 5min)
- High latency (P95 > SLO)
- Inventory conflicts spike
- Payment failures
- Error budget exhausted

### 4. Slack Notifications (Optional)

```bash
# Add to .env.production
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Restart services
docker compose -f docker-compose.prod.yml restart
```

## Backup Configuration

### 1. Set Up Automated Backups

```bash
# Make backup script executable
chmod +x scripts/backup_mongo.sh

# Test backup manually
MONGO_PASS=YOUR_PASSWORD ./scripts/backup_mongo.sh

# Add to crontab (runs daily at 3 AM)
crontab -e

# Add this line:
0 3 * * * cd /opt/vorte && MONGO_PASS=YOUR_PASSWORD ./scripts/backup_mongo.sh >> /var/log/vorte-backup.log 2>&1
```

### 2. Configure S3 Backup (Optional)

```bash
# Install AWS CLI
sudo apt-get install awscli

# Configure AWS credentials
aws configure

# Add to .env.production
AWS_S3_BUCKET=vorte-backups
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 3. Test Restore

```bash
# List backups
ls -lh /backups/

# Extract backup
tar -xzf /backups/mongo-20250124-030000.tar.gz

# Restore to MongoDB
docker exec -i vorte-mongo mongorestore \
  -u admin -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  --drop \
  /data/backup/mongo-20250124-030000
```

## Performance Optimization

### 1. Database Indexes

Already created automatically on startup:
- Products: text search, slug, category, price
- Users: email, phone
- Orders: user_id, status, created_at
- Inventory: sku, reserved_quantity
- Reservations: TTL index on expires_at

### 2. Redis Caching

Configured with:
- Max memory: 512MB
- Eviction policy: allkeys-lru
- Persistence: AOF enabled

### 3. CDN Configuration (Recommended)

Use CloudFlare or AWS CloudFront for:
- Static assets (images, CSS, JS)
- API response caching (with proper Cache-Control headers)
- DDoS protection

## Scaling

### 1. Horizontal Scaling

```yaml
# In docker-compose.prod.yml
deploy:
  replicas: 3  # Run 3 instances of API
```

### 2. Load Balancer

Configure Nginx upstream:
```nginx
upstream api_backend {
    least_conn;
    server api-1:8000;
    server api-2:8000;
    server api-3:8000;
}
```

### 3. Database Scaling

For high traffic:
- Add MongoDB replica set members
- Configure read preference: secondaryPreferred
- Use Redis Cluster for caching

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api

# Check health
docker compose -f docker-compose.prod.yml ps

# Restart service
docker compose -f docker-compose.prod.yml restart api
```

### MongoDB Connection Issues

```bash
# Check replica set status
docker exec -it vorte-mongo mongosh \
  -u admin -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  --eval "rs.status()"

# Check authentication
docker exec -it vorte-mongo mongosh \
  -u admin -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  --eval "db.adminCommand('ping')"
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Adjust resource limits in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 2G  # Increase if needed
```

## Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Check health
curl https://vorte.com.tr/api/health
```

### Certificate Renewal

```bash
# Renew Let's Encrypt certificates (automatic)
sudo certbot renew

# Or manually
sudo certbot renew --force-renewal

# Reload Nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### Database Maintenance

```bash
# Compact database
docker exec -it vorte-mongo mongosh \
  -u admin -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  --eval "db.runCommand({compact: 'products'})"

# Rebuild indexes
docker exec -it vorte-mongo mongosh \
  -u admin -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  --eval "db.products.reIndex()"
```

## SLO Monitoring

### Error Budget

- Target: 99.9% uptime (0.1% error budget per week)
- Alert: Error budget exhausted → FREEZE DEPLOYMENTS
- Review: Weekly SLO review meeting

### Performance SLOs

- Homepage P95: < 2s
- Search P95: < 1.5s
- Checkout P95: < 3s

### Incident Response

1. Check Grafana dashboards
2. Review Prometheus alerts
3. Check application logs
4. Review recent deployments
5. Rollback if necessary

## Support

- Documentation: https://docs.vorte.com.tr
- Runbooks: https://docs.vorte.com.tr/runbooks
- Monitoring: http://localhost:3001 (Grafana)
- Metrics: http://localhost:9090 (Prometheus)

---

**Last Updated:** 2025-01-24  
**Version:** 1.0.0  
**Status:** Production Ready ✅
