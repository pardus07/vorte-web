# Pre-Launch Audit Script - Kullanım Kılavuzu

## 🎯 Genel Bakış

Otomatik pre-launch audit scripti, production deployment öncesi 29 kritik kontrolü otomatik olarak çalıştırır ve sistem hazırlığını doğrular.

**Desteklenen Platformlar**:
- ✅ Linux (Bash)
- ✅ macOS (Bash)
- ✅ Windows (PowerShell) - Execution policy gerektirir
- ✅ WSL (Windows Subsystem for Linux)

---

## 📋 Gereksinimler

### Tüm Platformlar
- `curl` - HTTP istekleri için
- `jq` - JSON parsing için

### Opsiyonel (Tam Kontroller İçin)
- `kubectl` - Kubernetes kontrolleri
- `mongosh` - MongoDB kontrolleri
- `prometheus` - Metrics kontrolleri

---

## 🚀 Kullanım

### Linux/macOS

```bash
# Script'i executable yap
chmod +x scripts/pre-launch-audit.sh

# Local development'a karşı çalıştır
./scripts/pre-launch-audit.sh http://localhost:8000

# Staging'e karşı çalıştır
./scripts/pre-launch-audit.sh https://staging-api.yourcompany.com

# Production'a karşı çalıştır (final check)
./scripts/pre-launch-audit.sh https://api.yourcompany.com

# Exit code kontrol et
echo "Exit code: $?"  # 0 = GO, 1 = HOLD
```

### Windows PowerShell

**Not**: PowerShell execution policy ayarlanmalı:
```powershell
# Execution policy'yi kontrol et
Get-ExecutionPolicy

# Gerekirse ayarla (Admin olarak)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Script'i çalıştır
.\scripts\pre-launch-audit.ps1 -BaseUrl "http://localhost:8000"

# Exit code kontrol et
$LASTEXITCODE  # 0 = GO, 1 = HOLD
```

### WSL (Windows Subsystem for Linux)

```bash
# WSL içinde
cd /mnt/d/vorte.com.tr  # veya projenizin path'i
chmod +x scripts/pre-launch-audit.sh
./scripts/pre-launch-audit.sh http://localhost:8000
```

### Docker Container İçinde

```bash
# Container'a gir
docker exec -it vorte-api bash

# Script'i çalıştır
./scripts/pre-launch-audit.sh http://localhost:8000
```

---

## 🔧 Environment Variables

Script, opsiyonel environment variable'lar kabul eder:

```bash
# Prometheus URL (default: http://localhost:9090)
export PROMETHEUS_URL="http://prometheus.yourcompany.com:9090"

# MongoDB URI (default: mongodb://localhost:27017)
export MONGO_URI="mongodb://user:pass@mongo.yourcompany.com:27017"

# Database name (default: payment_system)
export DB_NAME="payment_system"

# Script'i çalıştır
./scripts/pre-launch-audit.sh https://api.yourcompany.com
```

---

## 📊 Çıktı Formatı

### Başarılı Çalıştırma

```
🚀 Pre-Launch Audit Script
Base URL: https://api.yourcompany.com
Prometheus: http://prometheus:9090
============================================================

📋 HTTP & Cache Validation (RFC 9110, RFC 9111, RFC 9457)
────────────────────────────────────────────────────────
✅ PASS: Health endpoint returns 200 OK
✅ PASS: X-Request-Id header present in response
✅ PASS: traceparent header propagated (W3C Trace Context)
✅ PASS: ETag or Last-Modified header present (RFC 9111 caching)
✅ PASS: Problem Details content-type present (RFC 9457)
✅ PASS: Problem Details structure valid (type/title/status/detail)

📊 Prometheus Metrics Validation
────────────────────────────────────────────────────────
✅ PASS: Prometheus API accessible
✅ PASS: Found 12 counter metrics with _total suffix
✅ PASS: Found 8 duration metrics with _seconds suffix
✅ PASS: Expected metric 'payment_init_total' found
✅ PASS: Expected metric 'notification_dispatch_total' found
✅ PASS: Found 15 histogram bucket metrics
✅ PASS: Histogram buckets include reasonable ranges (0.1, 0.5, 1, 5s)

☸️  Kubernetes Configuration
────────────────────────────────────────────────────────
✅ PASS: terminationGracePeriodSeconds set to 30s (≥30s)
✅ PASS: preStop hook configured for graceful shutdown
✅ PASS: Liveness probe configured
✅ PASS: Liveness probe failureThreshold ≥3 (avoids false positives)
✅ PASS: Readiness probe configured

🗄️  MongoDB TTL & Outbox Configuration
────────────────────────────────────────────────────────
✅ PASS: TTL index found on notifications_outbox.expireAt
✅ PASS: TTL index configured with expireAfterSeconds: 0 (exact expiration)
✅ PASS: Outbox documents have expireAt field (TTL lifecycle management)
✅ PASS: Outbox documents have claim fields (visibility timeout pattern)

🔒 Security & Compliance Quick Check
────────────────────────────────────────────────────────
✅ PASS: Security header 'Strict-Transport-Security' present
✅ PASS: Security header 'X-Frame-Options' present
✅ PASS: Security header 'X-Content-Type-Options' present
✅ PASS: Security header 'Content-Security-Policy' present
⚠️  WARN: Rate limiting headers not found (may be configured at proxy level)

📈 Day 0-1 Monitoring Readiness
────────────────────────────────────────────────────────
✅ PASS: Critical metric 'up' available
✅ PASS: Critical metric 'http_requests_total' available
✅ PASS: Critical metric 'http_request_duration_seconds' available
✅ PASS: Found 25 alert rules configured

============================================================
📊 AUDIT SUMMARY
============================================================
✅ Passed: 28
❌ Failed: 0
⚠️  Warnings: 1
Total checks: 29
Pass rate: 96%

🚀 GO FOR LAUNCH! System ready for production deployment.
```

### Exit Codes

- **0** - Tüm kontroller başarılı veya sadece warning'ler var → **GO FOR LAUNCH** 🚀
- **1** - Kritik kontroller başarısız → **HOLD DEPLOYMENT** 🛑

---

## 🔍 Kontrol Edilen Özellikler

### 1. HTTP & Cache Validation (RFC 9110, RFC 9111, RFC 9457)
- ✅ Health endpoint erişilebilirliği
- ✅ X-Request-Id header propagation
- ✅ traceparent header propagation (W3C Trace Context)
- ✅ ETag/Last-Modified headers (caching)
- ✅ Problem Details format (RFC 9457)

### 2. Prometheus Metrics
- ✅ Prometheus API erişilebilirliği
- ✅ Counter metrics `_total` suffix
- ✅ Duration metrics `_seconds` suffix
- ✅ Expected metrics varlığı
- ✅ Histogram bucket configuration
- ✅ Label cardinality kontrolü

### 3. Kubernetes Configuration
- ✅ terminationGracePeriodSeconds (≥30s)
- ✅ preStop hook configuration
- ✅ Liveness probe configuration
- ✅ Liveness probe failureThreshold (≥3)
- ✅ Readiness probe configuration

### 4. MongoDB TTL & Outbox
- ✅ TTL index varlığı (notifications_outbox.expireAt)
- ✅ expireAfterSeconds: 0 configuration
- ✅ Outbox document structure (expireAt field)
- ✅ Visibility timeout pattern (claimedAt/claimedBy)

### 5. Security Headers
- ✅ Strict-Transport-Security
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Content-Security-Policy
- ⚠️  Rate limiting headers (optional)

### 6. Day 0-1 Monitoring
- ✅ Critical metrics availability (up, http_requests_total, etc.)
- ✅ Alert rules configuration

---

## 🐛 Troubleshooting

### "Required command 'jq' not found"

```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Alpine
apk add jq

# Windows (Chocolatey)
choco install jq
```

### "Prometheus API not accessible"

```bash
# Prometheus URL'ini kontrol et
echo $PROMETHEUS_URL

# Prometheus servisini kontrol et
curl http://localhost:9090/-/healthy

# Docker container'ı kontrol et
docker ps | grep prometheus
```

### "mongosh not found"

```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-mongosh

# macOS
brew install mongosh

# Windows
# Download from: https://www.mongodb.com/try/download/shell
```

### "kubectl not found"

```bash
# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# macOS
brew install kubectl

# Windows (Chocolatey)
choco install kubernetes-cli
```

### PowerShell Execution Policy Error

```powershell
# Mevcut policy'yi kontrol et
Get-ExecutionPolicy

# Policy'yi değiştir (Admin gerektirir)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Veya tek seferlik bypass
PowerShell -ExecutionPolicy Bypass -File .\scripts\pre-launch-audit.ps1 -BaseUrl "http://localhost:8000"
```

### API Endpoint Not Found

```bash
# API'nin çalıştığını doğrula
curl http://localhost:8000/

# Doğru endpoint'i kullan
# ✅ Doğru: http://localhost:8000
# ❌ Yanlış: http://localhost:8000/health (eğer root'ta değilse)
```

---

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  pre-launch-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y jq curl
      
      - name: Run pre-launch audit
        run: |
          chmod +x scripts/pre-launch-audit.sh
          ./scripts/pre-launch-audit.sh ${{ secrets.STAGING_URL }}
        env:
          PROMETHEUS_URL: ${{ secrets.PROMETHEUS_URL }}
          MONGO_URI: ${{ secrets.MONGO_URI }}
      
      - name: Deploy if audit passes
        if: success()
        run: |
          # Your deployment commands here
          kubectl apply -f infra/k8s/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
pre-launch-audit:
  stage: test
  image: ubuntu:latest
  before_script:
    - apt-get update && apt-get install -y jq curl
  script:
    - chmod +x scripts/pre-launch-audit.sh
    - ./scripts/pre-launch-audit.sh $STAGING_URL
  variables:
    PROMETHEUS_URL: $PROMETHEUS_URL
    MONGO_URI: $MONGO_URI
  only:
    - main

deploy:
  stage: deploy
  dependencies:
    - pre-launch-audit
  script:
    - kubectl apply -f infra/k8s/
  only:
    - main
```

---

## 📚 İlgili Dokümantasyon

- [Quick Launch Guide](./QUICK_LAUNCH_GUIDE.md) - Hızlı başlangıç rehberi
- [Launch Readiness](./LAUNCH_READINESS.md) - Kapsamlı launch paketi
- [Go-Live Checklist](./GO_LIVE_CHECKLIST.md) - Production checklist
- [Scripts README](../scripts/README.md) - Script dokümantasyonu

---

## 🎯 Best Practices

1. **Staging'de Test Et**: Production'a deploy etmeden önce staging'de çalıştır
2. **Düzenli Çalıştır**: Her deployment öncesi çalıştır
3. **CI/CD'ye Entegre Et**: Otomatik validation için pipeline'a ekle
4. **Sonuçları Dokümante Et**: Audit sonuçlarını kaydet ve takip et
5. **Fail'leri Düzelt**: Kritik fail'leri mutlaka düzelt, warning'leri değerlendir

---

## ✅ Checklist

Audit çalıştırmadan önce:
- [ ] Tüm servisler çalışıyor (API, MongoDB, Redis, Prometheus)
- [ ] Gerekli tool'lar kurulu (jq, curl, kubectl, mongosh)
- [ ] Environment variable'lar ayarlanmış
- [ ] Network erişimi var (API, Prometheus, MongoDB)
- [ ] Doğru URL kullanılıyor

---

**🚀 Hazırsan, audit'i çalıştır ve production'a deploy et!**
