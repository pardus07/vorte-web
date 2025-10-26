# 🚀 Windows Quick Start

**3 komutla launch'a hazır!**

---

## ⚡ Hemen Başla

### 1️⃣ Script İzinlerini Aç

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
```

### 2️⃣ Launch'ı Başlat

```powershell
.\scripts\launch-execute.ps1
```

### 3️⃣ Takip Et

Script sizi adım adım yönlendirecek:
- ✅ T-15: Roll call
- ✅ T-12: Staging audit
- ✅ T-10: Image digest
- ✅ T-8: Production audit
- ✅ GO/NO-GO decision
- ✅ T-5: Deploy
- ✅ Monitoring

---

## 📋 Manuel Komutlar (Copy-Paste)

### Staging Audit

```powershell
$BASE_URL = "https://staging-api.yourcompany.com"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\scripts\pre-launch-audit.ps1 -BaseUrl $BASE_URL
```

### Production Deploy

```powershell
$BASE_URL = "https://api.yourcompany.com"
$NS = "production"
$RELEASE = "2025-01-26.1"
$IMAGE = "registry.yourco/vorte-api:$RELEASE"

# Audit
.\scripts\pre-launch-audit.ps1 -BaseUrl $BASE_URL

# Digest al
docker pull $IMAGE | Out-Null
$digest = (docker image inspect $IMAGE --format '{{index .RepoDigests 0}}')

# Deploy
kubectl -n $NS set image deploy/vorte-api api="$digest"
kubectl -n $NS rollout status deploy/vorte-api -w
```

### Rollback

```powershell
kubectl -n $NS rollout undo deploy/vorte-api
kubectl -n $NS rollout status deploy/vorte-api -w
```

---

## 🛑 Stop-the-Line

```
❌ P95 > 5s → ROLLBACK
❌ Error > 5% → ROLLBACK
❌ Payment < 90% → ROLLBACK
❌ Alerts > 0 → ROLLBACK
```

---

## 📚 Detaylı Dokümantasyon

- **[docs/WINDOWS_LAUNCH_GUIDE.md](docs/WINDOWS_LAUNCH_GUIDE.md)** - Tam Windows kılavuzu
- **[docs/GREEN_ROOM_SCRIPT.md](docs/GREEN_ROOM_SCRIPT.md)** - 90-saniye timeline
- **[docs/INDEX.md](docs/INDEX.md)** - Tüm dokümantasyon

---

**🟢 HAZIRSAN BAŞLA! 🚀**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\scripts\launch-execute.ps1
```
