# Commands Cheatsheet 📋

Tüm önemli komutlar tek sayfada!

## 🚀 Hızlı Başlangıç (3 Komut)

```bash
make install      # Bağımlılıkları kur
make dev          # Servisleri başlat
make validate-all # Tüm validasyonu çalıştır
```

---

## 📦 Setup & Installation

```bash
# Tüm bağımlılıkları kur
make install

# MongoDB replica set başlat
make setup-db

# Servisleri başlat
make dev

# Durum kontrolü
make status

# Smoke test
make smoke
```

---

## 🧪 Testing

### Unit Tests
```bash
# Tümü
make test

# Sadece backend
cd apps/backend && pytest tests/unit/ -v

# Sadece frontend
cd apps/frontend && pnpm run test
```

### Integration Tests
```bash
# Tümü
make test-integration

# Backend
cd apps/backend && pytest tests/integration/ -v
```

### E2E Tests
```bash
# Tümü
make test-e2e

# UI mode
cd apps/frontend && pnpm exec playwright test --ui

# Debug mode
cd apps/frontend && pnpm exec playwright test --debug

# Rapor görüntüle
cd apps/frontend && pnpm exec playwright show-report
```

### Performance Tests
```bash
# Tümü
make test-perf

# Tek tek
k6 run --env BASE_URL=http://localhost tests/performance/homepage-p95.js
k6 run --env BASE_URL=http://localhost:8000 tests/performance/search-p95.js
k6 run --env BASE_URL=http://localhost:8000 tests/performance/checkout-p95.js
```

---

## 🎯 Validation (Final 3 Steps)

```bash
# Tek komut - hepsini çalıştır
make validate-all

# Adım adım
make validate-e2e    # 1. E2E testleri
make validate-slo    # 2. Performance SLOs
git push origin main # 3. CI pipeline
```

---

## 🔍 Quality Checks

```bash
# Lint
make lint

# Format
make format

# Type check
make type-check

# Tüm kontroller + testler
make validate
```

---

## 🐳 Docker & Services

```bash
# Servisleri başlat
docker compose up -d

# Logları izle
docker compose logs -f

# Belirli servis logu
docker compose logs -f api
docker compose logs -f web

# Servisleri durdur
docker compose down

# Volumes ile birlikte temizle
docker compose down -v

# Servis durumu
docker compose ps

# Servis sağlık kontrolü
make status
```

---

## 🗄️ MongoDB

```bash
# MongoDB'ye bağlan
docker exec -it vorte-mongo mongosh -u admin -p password

# Replica set durumu
docker exec -it vorte-mongo mongosh -u admin -p password --eval "rs.status()"

# Replica set başlat
docker exec -it vorte-mongo mongosh -u admin -p password --eval "rs.initiate()"

# Database seç
use vorte

# Koleksiyonları listele
show collections

# Index'leri kontrol et
db.products.getIndexes()
db.inventory.getIndexes()
db.orders.getIndexes()

# Doküman sayısı
db.products.countDocuments()
```

---

## 🔴 Redis

```bash
# Redis'e bağlan
docker exec -it vorte-redis redis-cli

# Cache temizle
docker exec -it vorte-redis redis-cli FLUSHALL

# Key'leri listele
docker exec -it vorte-redis redis-cli KEYS '*'

# Belirli key'i oku
docker exec -it vorte-redis redis-cli GET "key_name"
```

---

## 🌐 API & Health Checks

```bash
# API health
curl http://localhost:8000/api/health

# Web health
curl http://localhost/health

# Metrics
curl http://localhost:8000/metrics

# API docs
open http://localhost:8000/docs

# OpenAPI spec
curl http://localhost:8000/openapi.json
```

---

## 🔒 RFC Compliance Tests

```bash
# 428 Precondition Required (missing Idempotency-Key)
curl -i -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{}'

# 428 Precondition Required (missing If-Match)
curl -i -X PATCH http://localhost:8000/api/v1/products/test \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated"}'

# 409 Conflict (ETag mismatch)
curl -i -X PATCH http://localhost:8000/api/v1/products/test \
  -H "Content-Type: application/json" \
  -H "If-Match: \"wrong-etag\"" \
  -d '{"name": "Updated"}'

# Idempotency test
IDEM_KEY=$(uuidgen)
curl -i -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -d '{"amount": 100}'
# Aynı key ile tekrar - aynı sonucu dönmeli
curl -i -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -d '{"amount": 100}'
```

---

## 🧹 Cleanup

```bash
# Servisleri durdur ve temizle
make clean

# Cache temizle
make clean-cache

# Docker system temizle
docker system prune -f

# Volumes temizle
docker volume prune -f

# Node modules temizle
rm -rf apps/frontend/node_modules
rm -rf apps/frontend/.next

# Python cache temizle
find apps/backend -type d -name __pycache__ -exec rm -rf {} +
find apps/backend -type d -name .pytest_cache -exec rm -rf {} +
```

---

## 📊 Monitoring & Debugging

```bash
# Container stats
docker stats

# Container inspect
docker inspect vorte-api

# Network inspect
docker network inspect vorte_default

# Volume inspect
docker volume inspect vorte_mongo_data

# Logs with timestamp
docker compose logs -f --timestamps

# Last 100 lines
docker compose logs --tail=100

# Specific service logs
docker compose logs -f api --tail=50
```

---

## 🔧 Development

```bash
# Backend dev server
cd apps/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend dev server
cd apps/frontend
pnpm run dev

# Watch mode tests (backend)
cd apps/backend
pytest-watch

# Watch mode tests (frontend)
cd apps/frontend
pnpm run test -- --watch
```

---

## 📦 Build & Deploy

```bash
# Docker build
docker build -t vorte-api:latest -f apps/backend/Dockerfile apps/backend/
docker build -t vorte-web:latest -f apps/frontend/Dockerfile apps/frontend/

# Docker compose build
docker compose build

# Production build (frontend)
cd apps/frontend
pnpm run build

# Preview production build
cd apps/frontend
pnpm run preview
```

---

## 🏷️ Git & Release

```bash
# Status
git status

# Add all
git add -A

# Commit
git commit -m "feat: validation complete – 30/30 ✅"

# Push
git push origin main

# Tag
git tag -a v1.0.0-rc.1 -m "Core Platform RC1"
git push --tags

# View tags
git tag -l

# Delete tag
git tag -d v1.0.0-rc.1
git push origin :refs/tags/v1.0.0-rc.1
```

---

## 🐛 Troubleshooting

```bash
# Port kullanımı kontrol et
netstat -an | grep -E ':(8000|5173|27017|6379|80)\s'

# Process'leri öldür
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Docker restart
docker compose restart

# Belirli servis restart
docker compose restart api

# Logs with grep
docker compose logs api | grep ERROR

# Container shell
docker exec -it vorte-api bash
docker exec -it vorte-mongo bash

# File permissions fix
sudo chown -R $USER:$USER .
```

---

## 📚 Documentation

```bash
# View documentation
cat QUICK_START.md
cat FINAL_VALIDATION_SUMMARY.md
cat VALIDATION_RUNBOOK.md
cat PRE_FLIGHT_CHECKLIST.md

# Generate API docs
cd apps/backend
python -c "from app.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > openapi.json

# View in browser
open http://localhost:8000/docs
open http://localhost:8000/redoc
```

---

## 💡 Useful Aliases (Optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Vorte aliases
alias vdev='make dev'
alias vtest='make test'
alias vlogs='docker compose logs -f'
alias vclean='make clean'
alias vvalidate='make validate-all'
alias vsmoke='make smoke'
alias vstatus='make status'

# Docker shortcuts
alias dps='docker compose ps'
alias dlogs='docker compose logs -f'
alias ddown='docker compose down'
alias dup='docker compose up -d'

# MongoDB
alias vmongo='docker exec -it vorte-mongo mongosh -u admin -p password'

# Redis
alias vredis='docker exec -it vorte-redis redis-cli'
```

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Start everything | `make dev` |
| Run all tests | `make test` |
| Run E2E tests | `make test-e2e` |
| Run validation | `make validate-all` |
| Check status | `make status` |
| Smoke test | `make smoke` |
| View logs | `make logs` |
| Clean up | `make clean` |
| Help | `make help` |

---

**Pro Tip:** `make help` komutunu çalıştırarak tüm Makefile komutlarını görebilirsin! 🚀
