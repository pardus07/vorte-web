# Validation Runbook - Final 3 Steps to 100%

Bu runbook, 30 kabul kriterinden kalan 3'ünü tamamlamak için adım adım kılavuzdur.

## Mevcut Durum: 27/30 (90%) ✅

**Tamamlanan**: Tüm geliştirme görevleri
**Bekleyen**: Çalışan ortam gerektiren 3 doğrulama görevi

---

## Adım 1: E2E Test Yürütümü ⏳

### Ön Koşullar
```bash
# Docker'ın çalıştığından emin ol
docker --version
docker compose --version

# Node.js 20+ kurulu olmalı
node --version
pnpm --version  # veya npm
```

### Test Ortamını Hazırla
```bash
# 1. Tüm servisleri başlat
docker compose up -d --build

# 2. Servislerin sağlıklı olmasını bekle
docker compose ps
# Tüm servisler "healthy" durumunda olmalı

# 3. API'nin yanıt verdiğini doğrula
curl http://localhost:8000/api/health
# Dönmeli: {"status": "healthy"}

# 4. Frontend'in servis ettiğini doğrula
curl http://localhost/health
# Dönmeli: "healthy"
```

### Test Verisi Oluştur (Opsiyonel)
```bash
# Admin kullanıcı ve örnek ürünler oluştur
cd apps/backend
python -c "
from app.services.db import init_db
from app.repositories.user_repository import user_repository
from app.repositories.product_repository import product_repository
import asyncio

async def seed():
    await init_db()
    # Gerekirse seed data ekle
    print('Seed data oluşturuldu')

asyncio.run(seed())
"
```

### E2E Testlerini Çalıştır
```bash
cd apps/frontend

# Playwright tarayıcılarını kur
pnpm install
pnpm exec playwright install --with-deps

# E2E testlerini çalıştır
pnpm exec playwright test --reporter=line

# CI için (artefaktlarla)
pnpm exec playwright test --reporter=junit,line --output-dir=./artifacts/playwright
```

### Beklenen Sonuçlar
- ✅ Guest checkout akışı geçer
- ✅ Kayıtlı kullanıcı akışı geçer
- ✅ Admin ürün yönetimi geçer
- ✅ Hata yönetimi (409/428) geçer
- ✅ Idempotency testleri geçer
- ✅ If-Match doğrulaması geçer

### Başarı Durumunda
**tasks.md'yi güncelle**:
```diff
- [ ] All E2E tests pass (catalog browsing, cart, checkout, payment, order creation) ⏳ *Requires running environment*
+ [x] All E2E tests pass (catalog browsing, cart, checkout, payment, order creation)
```

---

## Adım 2: Performans SLO Doğrulaması ⏳

### Ön Koşullar
```bash
# k6 kur
# Ubuntu/Debian:
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# macOS:
brew install k6

# Windows:
choco install k6
```

### Performans Testlerini Çalıştır
```bash
# Servislerin çalıştığından emin ol
docker compose up -d

# Test 1: Homepage p95 < 2s
BASE_URL=http://localhost k6 run tests/performance/homepage-p95.js

# Test 2: Search p95 < 1.5s
BASE_URL=http://localhost:8000 k6 run tests/performance/search-p95.js

# Test 3: Checkout p95 < 3s
BASE_URL=http://localhost:8000 k6 run tests/performance/checkout-p95.js
```

### Beklenen Sonuçlar
```
✓ http_req_duration..............: avg=800ms  min=200ms med=750ms max=2.1s  p(90)=1.2s p(95)=1.8s
✓ http_req_failed................: 0.00%  ✓ 0        ✗ 0   
✓ checks.........................: 100.00% ✓ 1000     ✗ 0
```

### SLO Hedefleri
- **Homepage**: p95 < 2000ms ✅
- **Search**: p95 < 1500ms ✅
- **Checkout**: p95 < 3000ms ✅

### Başarı Durumunda
**tasks.md'yi güncelle**:
```diff
- [ ] Performance SLOs are met: homepage p95 < 2s, search p95 < 1.5s, checkout p95 < 3s ⏳ *Requires load testing*
+ [x] Performance SLOs are met: homepage p95 < 2s, search p95 < 1.5s, checkout p95 < 3s
```

---

## Adım 3: CI Pipeline Yürütümü ⏳

### Ön Koşullar
```bash
# GitHub repository'nin olduğundan emin ol
git remote -v
# GitHub repository URL'i göstermeli

# Push erişimin olduğundan emin ol
git status
```

### CI Ortamını Hazırla
```bash
# 1. Tüm değişiklikleri commit et
git add .
git commit -m "feat: add E2E tests, performance tests, and CI pipeline"

# 2. CI'ı tetiklemek için push et
git push origin main
```

### CI Pipeline'ı İzle
1. GitHub repository'ye git
2. "Actions" sekmesine tıkla
3. CI workflow çalışmasını izle

### Beklenen CI Job'ları
- ✅ **prepare**: Bağımlılıklar kuruldu
- ✅ **lint_and_typecheck**: Linting geçti (ruff, eslint, mypy, tsc)
- ✅ **unit_tests**: Unit testler geçti (pytest, vitest)
- ✅ **build_and_integration**: Docker build'ler, integration testler geçti
- ✅ **e2e_tests**: E2E testler CI ortamında geçti
- ✅ **security_scan**: Trivy ve pip-audit tamamlandı
- ✅ **performance_tests**: k6 testleri geçti (sadece main branch)
- ✅ **push_images**: Image'lar registry'ye push edildi (sadece main branch)

### Beklenen Artefaktlar
- 📁 **playwright-artifacts**: Screenshot'lar, videolar, trace'ler
- 📁 **security-reports**: Güvenlik tarama sonuçları
- 📁 **coverage-reports**: Test coverage verileri

### Başarı Durumunda
**tasks.md'yi güncelle**:
```diff
- [ ] CI pipeline runs lint, tests, and security scans successfully ⏳ *Requires CI environment*
+ [x] CI pipeline runs lint, tests, and security scans successfully
```

---

## Final Durum Güncellemesi

Tüm 3 adım tamamlandıktan sonra özeti güncelle:

```diff
- **Status: 27/30 Completed (90%)** ✅
+ **Status: 30/30 Completed (100%)** 🎉

- **Pending Items** (require running environment):
- 1. E2E test execution with Playwright
- 2. Performance SLO validation with load testing
- 3. CI pipeline execution in GitHub Actions
+ **All Items Complete** ✅
```

---

## Sorun Giderme

### E2E Testleri Başarısız Olursa
```bash
# Servis loglarını kontrol et
docker compose logs api
docker compose logs web

# Test çıktısını kontrol et
pnpm exec playwright test --debug

# Test raporunu görüntüle
pnpm exec playwright show-report
```

### Performans Testleri Başarısız Olursa
```bash
# Servislerin yük altında olup olmadığını kontrol et
docker stats

# Test süresini artır/yükü azalt
# tests/performance/*.js dosyalarını düzenle

# API yanıt sürelerini manuel kontrol et
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/v1/products
```

### CI Pipeline Başarısız Olursa
```bash
# GitHub Actions loglarını kontrol et
# Repository > Actions > Başarısız run'a tıkla

# Yaygın sorunlar:
# - Eksik secret'lar
# - Docker build hataları
# - Test ortamı sorunları
# - Network timeout'ları
```

---

## Başarı Kriterleri

✅ **Tüm 30 kabul kriteri tamamlandı**
✅ **E2E testler CI'da geçiyor**
✅ **Performans SLO'ları karşılanıyor**
✅ **Güvenlik taramaları temiz**
✅ **Docker image'ları build edildi ve push edildi**
✅ **Artefaktlar saklandı**

---

## 100% Sonrası Sonraki Adımlar

1. **Staging'e Deploy**
   ```bash
   # Build edilmiş Docker image'larını kullan
   docker pull ghcr.io/YOUR_ORG/api:latest
   docker pull ghcr.io/YOUR_ORG/web:latest
   ```

2. **Kullanıcı Kabul Testi**
   - QA ekibi tarafından manuel test
   - İş paydaşları incelemesi
   - Güvenlik denetimi

3. **Production Deployment**
   - Blue-green deployment
   - Monitoring kurulumu
   - Alerting konfigürasyonu
   - Backup doğrulaması

4. **Launch Sonrası**
   - Performans izleme
   - Hata takibi
   - Kullanıcı geri bildirimi toplama
   - Sürekli iyileştirme

---

**Tahmini Süre**: 2-4 saat toplam
- Adım 1 (E2E): 30-60 dakika
- Adım 2 (Performans): 30-60 dakika
- Adım 3 (CI): 60-120 dakika

**Ön Koşullar**: Docker, Node.js, k6, GitHub repository

**Sonuç**: %100 tamamlanma, production-ready platform ✅
