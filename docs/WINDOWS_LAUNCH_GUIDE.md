# 🚀 Windows Launch Guide

**PowerShell ile hızlı launch execution**

---

## ⚡ Hızlı Başlangıç

### 1. Script İzinlerini Ayarla

```powershell
# Sadece bu oturum için script çalıştırma izni
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
```

### 2. Otomatik Launch Başlat

```powershell
# 90-saniye interaktif launch
.\scripts\launch-execute.ps1
```

---

## 📋 Manuel Execution Komutları

### A. Staging Audit (GO/NO-GO)

```powershell
$BASE_URL = "https://staging-api.yourcompany.com"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\scripts\pre-launch-audit.ps1 -BaseUrl $BASE_URL

# Sadece FAIL/ERROR/CRITICAL satırlarını göster
.\scripts\pre-launch-audit.ps1 -BaseUrl $BASE_URL | Select-String -Pattern "FAIL|ERROR|CRITICAL"
```

### B. Production Cutover (Canary → Full)

```powershell
$BASE_URL   = "https://api.yourcompany.com"
$NS         = "production"
$RELEASE    = "2025-01-26.1"
$IMAGE      = "registry.yourco/vorte-api:$RELEASE"

# Son prod audit
.\scripts\pre-launch-audit.ps1 -BaseUrl $BASE_URL

# İmajı çek ve digest'i al
docker pull $IMAGE | Out-Null
$digest = (docker image inspect $IMAGE --format '{{index .RepoDigests 0}}')
Write-Output "Digest: $digest"

# Rollout (digest ile immutable)
kubectl -n $NS set image deploy/vorte-api api="$digest"
kubectl -n $NS rollout status deploy/vorte-api -w
kubectl -n $NS get pods -o wide
```

### C. Rollback (≤5 dakika)

```powershell
kubectl -n $NS rollout undo deploy/vorte-api
kubectl -n $NS rollout status deploy/vorte-api -w
```

---

## 🔍 Hızlı Doğrulamalar

### Health Check

```powershell
$BASE_URL = "https://api.yourcompany.com"
Invoke-WebRequest -UseBasicParsing "$BASE_URL/health" | Select-Object StatusCode,Headers
```

### Metrics Check (Prometheus)

```powershell
# P95 latency
$promUrl = "http://prometheus:9090"
$query = "histogram_quantile(0.95, sum by (le)(rate(http_request_duration_seconds_bucket[5m])))"
Invoke-RestMethod "$promUrl/api/v1/query?query=$query" | ConvertTo-Json

# Error rate
$query = "rate(http_requests_total{status=~`"5..`"}[5m])/rate(http_requests_total[5m])*100"
Invoke-RestMethod "$promUrl/api/v1/query?query=$query" | ConvertTo-Json

# Payment success
$query = "rate(payment_init_total{result=`"success`"}[5m])/rate(payment_init_total[5m])*100"
Invoke-RestMethod "$promUrl/api/v1/query?query=$query" | ConvertTo-Json
```

---

## 🛑 Stop-the-Line Kriterleri

```
❌ P95 > 5s
❌ Error > 5%
❌ Payment Success < 90%
❌ Alerts > 0
❌ Webhook error artışı
```

**Herhangi bir tetikleyici → Hemen rollback!**

---

## 🔧 Alternatif Yöntemler

### WSL ile Bash Script Çalıştırma

```powershell
# WSL kuruluysa
wsl bash ./scripts/launch-execute.sh
```

### Git Bash ile

```powershell
# Git Bash kuruluysa
bash ./scripts/launch-execute.sh
```

---

## 📝 .gitattributes Ayarı (Opsiyonel)

Bash scriptleri için satır sonlarını düzelt:

```gitattributes
# .gitattributes dosyasına ekle
*.sh text eol=lf
```

Sonra:

```powershell
git add .gitattributes
git add --renormalize .
git commit -m "chore: normalize line endings for shell scripts"
```

---

## 🎯 Execution Checklist

```powershell
# Tüm hazırlıkları kontrol et
$checklist = @"
[ ] PowerShell execution policy ayarlandı
[ ] Docker Desktop çalışıyor
[ ] kubectl erişimi var
[ ] Prometheus erişimi var
[ ] Staging URL hazır
[ ] Production URL hazır
[ ] Takım hazır (Captain, Driver, Scribe, Metrics, Infra, App, Security)
[ ] Zoom/Teams bridge açık
[ ] Incident channel hazır (#launch-vorte-api)
[ ] Dashboard'lar açık
[ ] Rollback komutları hazır
"@

Write-Output $checklist
```

---

## 💡 Mini Hatırlatmalar

### Digest > Tag
```powershell
# ❌ YANLIŞ
kubectl set image deploy/vorte-api api="registry.yourco/vorte-api:2025-01-26.1"

# ✅ DOĞRU
kubectl set image deploy/vorte-api api="registry.yourco/vorte-api@sha256:abc123..."
```

### İz Sürme
- X-Request-Id ve traceparent log'larda
- Incident anında korelasyon hazır
- Grafana'da trace ID ile arama yapılabilir

### Rollback Sonrası
```powershell
# Eski versiyonun sağlıklı olduğunu doğrula
.\scripts\pre-launch-audit.ps1 -BaseUrl $BASE_URL
```

---

## 🚨 Sorun Giderme

### "running scripts is disabled"

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
```

### Docker digest alınamıyor

```powershell
# crane varsa
crane digest $IMAGE

# regctl varsa
regctl image digest $IMAGE

# Docker ile
docker image inspect $IMAGE --format '{{index .RepoDigests 0}}'
```

### kubectl erişim sorunu

```powershell
# Context'i kontrol et
kubectl config current-context

# Context'i değiştir
kubectl config use-context production
```

---

## 📞 Acil Durum İletişim

- **On-Call**: [PagerDuty/Slack]
- **Escalation**: [Engineering Lead]
- **Provider Destek**:
  - iyzico: +90 850 222 0 600
  - PayTR: +90 444 25 52

---

## 🎉 Başarılı Launch Sonrası

### T+30/60/120 Checkpoints

```powershell
# Metrics kontrolü
$checks = @"
✅ P95 < 2s
✅ Error < 1%
✅ Payment > 95%
✅ Notification backlog < 100
✅ Alerts = 0
✅ Webhook/callback errors = 0
"@

Write-Output $checks
```

---

**🚀 HAZIRSAN BAŞLA!**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\scripts\launch-execute.ps1
```

**Referans**: `docs/GREEN_ROOM_SCRIPT.md` - 90-saniye timeline

**🟢 GO FOR LAUNCH! 🚀**
