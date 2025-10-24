# Quick Start - 30/30 in 3 Steps 🚀

Son 3 adımı tamamla ve %100'e ulaş!

## ⚡ Hızlı Yol (5 Dakika Hazırlık + 3 Saat Validation)

### 1️⃣ Go/No-Go Kontrolü (5 dakika)

```bash
# Gerekli araçlar kurulu mu?
docker --version
node --version
pnpm --version
k6 version

# Portlar boş mu?
netstat -an | grep -E ':(8000|5173|27017|6379|80)\s'
# Boş olmalı veya sadece Docker servisleri

# Environment dosyaları var mı?
ls apps/backend/.env
ls apps/frontend/.env

# MongoDB replica set hazır mı?
make setup-db
```

### 2️⃣ Tüm Validasyonu Çalıştır (2-4 saat)

```bash
# Tek komut - her şeyi çalıştırır
make validate-all
```

**Bu komut şunları yapar:**
1. ✅ E2E testlerini çalıştırır (Playwright)
2. ✅ Performance SLO'ları doğrular (k6)
3. ✅ CI için hazır olduğunu gösterir

### 3️⃣ Başarılıysa Etiketle ve Gönder (2 dakika)

```bash
# Tüm değişiklikleri commit et
git add -A
git commit -m "feat: validation complete – 30/30 ✅

E2E Tests: ✓
Performance SLOs: ✓
CI Ready: ✓

Status: 30/30 (100%) - Production Ready 🚀"

# Push et (CI tetiklenir)
git push origin main

# Release tag oluştur
git tag -a v1.0.0-rc.1 -m "Core Platform RC1"
git push --tags
```

---

## 🔍 Detaylı Adımlar

### Adım 1: Hazırlık Kontrolü

#### A. Bağımlılıkları Kur
```bash
make install
```

#### B. MongoDB Replica Set
```bash
# Replica set başlat
make setup-db

# Kontrol et
docker exec -it vorte-mongo mongosh -u admin -p password --eval "rs.status()"
```

#### C. Environment Dosyaları
```bash
# Backend .env
cat > apps/backend/.env << EOF
MONGO_URI=mongodb://admin:password@localhost:27017/vorte?authSource=admin&replicaSet=rs0
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key-min-32-chars-long-please
JWT_REFRESH_SECRET=your-refresh-secret-key-also-32-chars
PAYMENT_PROVIDER=mock
EOF

# Frontend .env
cat > apps/frontend/.env << EOF
VITE_API_URL=http://localhost:8000
VITE_BASE_URL=http://localhost:5173
EOF
```

#### D. Servisleri Başlat
```bash
make dev

# Sağlık kontrolü
make smoke
```

---

### Adım 2: Validation

#### Option A: Tek Komut (Önerilen)
```bash
make validate-all
```

#### Option B: Adım Adım
```bash
# 1. E2E Tests
make validate-e2e
# Rapor: cd apps/frontend && pnpm exec playwright show-report

# 2. Performance SLOs
make validate-slo

# 3. CI Pipeline
git push origin main
# GitHub Actions'da izle
```

#### Option C: Manuel
```bash
# E2E
docker compose up -d
cd apps/frontend
pnpm exec playwright install --with-deps
pnpm exec playwright test --reporter=html
pnpm exec playwright show-report

# Performance
k6 run --env BASE_URL=http://localhost tests/performance/homepage-p95.js
k6 run --env BASE_URL=http://localhost:8000 tests/performance/search-p95.js
k6 run --env BASE_URL=http://localhost:8000 tests/performance/checkout-p95.js

# CI
git push origin main
```

---

### Adım 3: Release

```bash
# Commit
git add -A
git commit -m "feat: validation complete – 30/30 ✅"

# Push (CI tetiklenir)
git push origin main

# Tag
git tag -a v1.0.0-rc.1 -m "Core Platform Release Candidate 1

Features:
- RFC 9110/9457/8288 compliant API
- Argon2id password hashing
- Inventory with TTL + Change Streams
- ETag/If-Match optimistic locking
- Idempotency-Key support
- Observability: Prometheus + OTel
- KVKK compliance

Validation:
- E2E tests: ✓
- Performance SLOs: ✓
- CI pipeline: ✓

Ready for staging deployment."

git push --tags
```

---

## ✅ Başarı Kriterleri

### E2E Tests
```bash
# Beklenen çıktı:
✓ Guest checkout flow
✓ Registered user flow
✓ Admin product management
✓ Error handling (409/428)
✓ Idempotency validation
✓ If-Match validation

Passed: 6/6 (100%)
```

### Performance SLOs
```bash
# Beklenen çıktı:
✓ http_req_duration..............: p(95)=1800ms (threshold: <2000ms)
✓ http_req_failed................: 0.00%
✓ checks.........................: 100.00%
```

### CI Pipeline
```bash
# GitHub Actions'da:
✓ Lint & typecheck
✓ Unit tests
✓ Integration tests
✓ E2E tests
✓ Security scans
✓ Docker builds
```

---

## 🐛 Sorun Giderme

### E2E Testleri Başarısız
```bash
# Debug mode
cd apps/frontend
pnpm exec playwright test --debug

# Tek test çalıştır
pnpm exec playwright test tests/e2e/checkout.spec.ts

# Retry ile
pnpm exec playwright test --retries=2
```

### Performance Düşük
```bash
# Cache temizle
make clean-cache

# MongoDB indexleri kontrol et
docker exec -it vorte-mongo mongosh -u admin -p password
use vorte
db.products.getIndexes()
db.inventory.getIndexes()

# Load'u azalt (test için)
# tests/performance/*.js dosyalarında stages değerlerini düşür
```

### MongoDB Replica Set Hatası
```bash
# Replica set başlat
docker exec -it vorte-mongo mongosh -u admin -p password
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "localhost:27017" }]
})

# Durumu kontrol et
rs.status()
```

### Port Çakışması
```bash
# Kullanılan portları kontrol et
netstat -an | grep -E ':(8000|5173|27017|6379|80)\s'

# Docker'ı temizle
docker compose down
docker system prune -f

# Yeniden başlat
make dev
```

---

## 📚 Ek Kaynaklar

- **[FINAL_VALIDATION_SUMMARY.md](./FINAL_VALIDATION_SUMMARY.md)** - Kapsamlı özet
- **[VALIDATION_RUNBOOK.md](./VALIDATION_RUNBOOK.md)** - Detaylı kılavuz
- **[PRE_FLIGHT_CHECKLIST.md](./PRE_FLIGHT_CHECKLIST.md)** - Hazırlık listesi
- **[DESIGN_ALIGNMENT_REPORT.md](./DESIGN_ALIGNMENT_REPORT.md)** - Doküman uyumu

---

## 🎯 Özet

```bash
# 1. Hazırlık (5 dakika)
make install
make setup-db
make dev
make smoke

# 2. Validation (2-4 saat)
make validate-all

# 3. Release (2 dakika)
git add -A
git commit -m "feat: validation complete – 30/30 ✅"
git push origin main
git tag -a v1.0.0-rc.1 -m "Core Platform RC1"
git push --tags
```

**Sonuç:** 30/30 (100%) - Production Ready! 🎉

---

## 💡 İpuçları

1. **İlk kez çalıştırıyorsan:** `FINAL_VALIDATION_SUMMARY.md` dosyasını oku
2. **Hızlı gitmek istiyorsan:** `make validate-all` yeterli
3. **Sorun yaşıyorsan:** `PRE_FLIGHT_CHECKLIST.md` kontrol et
4. **CI'da hata varsa:** GitHub Actions loglarını incele

**Takıldığın yer olursa:** Hata mesajını paylaş, hemen çözeriz! 🚀
