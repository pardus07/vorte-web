# VORTE E-Ticaret - Başlangıç Kılavuzu

## 🎯 Hızlı Başlangıç

### 1. Servisleri Başlat

```powershell
# PowerShell'de (Windows)
.\start.ps1

# Veya manuel olarak
docker compose -f infra/docker/docker-compose.yml up --build
```

### 2. Erişim Noktaları

Servisler başladıktan sonra:

- **Frontend**: http://localhost
- **API Documentation**: http://localhost/api/docs
- **API Health Check**: http://localhost/api/health
- **Prometheus Metrics**: http://localhost/metrics
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)

### 3. İlk Test

```powershell
# API health check
curl http://localhost/api/health

# Metrics endpoint
curl http://localhost/metrics
```

## 📁 Proje Yapısı

```
D:\vorte.com.tr\
├── apps/
│   ├── backend/          # FastAPI backend
│   │   ├── app/
│   │   │   ├── core/     # Config, middleware, exceptions
│   │   │   ├── routers/  # API endpoints
│   │   │   ├── services/ # Business logic
│   │   │   └── main.py   # FastAPI app
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   │
│   └── frontend/         # React + Vite frontend
│       ├── src/
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── Dockerfile
│       └── package.json
│
├── infra/
│   ├── docker/
│   │   └── docker-compose.yml
│   └── nginx/
│       └── nginx.conf    # Reverse proxy + rate limiting
│
├── docs/
│   ├── specs/            # Feature specifications
│   │   └── .kiro/specs/core-platform/
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   └── steering/         # Architecture standards
│       ├── architecture.md
│       ├── api-standards.md
│       └── ui-ux.md
│
└── .kiro/
    └── specs/            # Kiro spec files
```

## 🔧 Geliştirme

### Backend Geliştirme

```powershell
cd apps/backend

# Bağımlılıkları yükle
uv pip install -r pyproject.toml

# Geliştirme sunucusunu başlat
uvicorn app.main:app --reload --port 8000

# Testleri çalıştır
pytest
```

### Frontend Geliştirme

```powershell
cd apps/frontend

# Bağımlılıkları yükle
pnpm install

# Geliştirme sunucusunu başlat
pnpm dev

# Build
pnpm build
```

## 🧪 Test Etme

### Backend Testleri

```powershell
cd apps/backend
pytest -v
```

### Frontend Testleri

```powershell
cd apps/frontend
pnpm test
```

### E2E Testleri (Playwright)

```powershell
# Henüz kurulmadı - Task 16'da eklenecek
```

## 📊 Monitoring

### Prometheus Metrics

```powershell
# Tüm metrikleri görüntüle
curl http://localhost/metrics

# Örnek metrikler:
# - http_requests_total
# - http_request_duration_seconds
# - process_cpu_seconds_total
```

### Logs

```powershell
# Tüm servislerin loglarını görüntüle
docker compose -f infra/docker/docker-compose.yml logs -f

# Sadece API logları
docker compose -f infra/docker/docker-compose.yml logs -f api

# Sadece Frontend logları
docker compose -f infra/docker/docker-compose.yml logs -f web
```

## 🔐 Güvenlik

### Rate Limiting (NGINX)

- **Auth endpoints** (`/api/auth/*`): 5 req/s (burst 10)
- **Checkout endpoints** (`/api/checkout/*`): 3 req/s (burst 20)
- **General API**: 10 req/s (burst 50)

Rate limit aşıldığında HTTP 429 döner.

### Environment Variables

Hassas bilgiler `.env` dosyasında saklanır:

```env
JWT_SECRET=change_me_in_production
MONGO_URI=mongodb://mongo:27017/vorte
REDIS_URL=redis://redis:6379/0
```

**⚠️ Önemli**: Production'da `.env` dosyasını asla commit etmeyin!

## 🚀 Deployment

### Production Build

```powershell
# Backend image
docker build -f apps/backend/Dockerfile -t vorte-api:latest .

# Frontend image
docker build -f apps/frontend/Dockerfile -t vorte-web:latest .
```

### Production Compose

```powershell
# Production ortamı için ayrı compose dosyası oluşturun
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

## 📝 Sonraki Adımlar

1. **Spec'leri İncele**: `.kiro/specs/core-platform/` klasöründeki requirements, design ve tasks dosyalarını oku
2. **İlk Task'ı Başlat**: `tasks.md` dosyasını aç ve Task 1'den başla
3. **Test-First Yaklaşım**: Her task için önce testleri yaz, sonra implementasyonu yap
4. **CI/CD Kur**: GitHub Actions workflow'larını ekle (Task 17)

## 🆘 Sorun Giderme

### Docker servisleri başlamıyor

```powershell
# Tüm container'ları durdur ve temizle
docker compose -f infra/docker/docker-compose.yml down -v

# Yeniden başlat
docker compose -f infra/docker/docker-compose.yml up --build
```

### Port çakışması

Eğer 80, 8000, 5173 portları kullanılıyorsa:

1. `docker-compose.yml` dosyasında portları değiştir
2. `nginx.conf` dosyasında proxy ayarlarını güncelle

### MongoDB bağlantı hatası

```powershell
# MongoDB container'ının çalıştığını kontrol et
docker compose -f infra/docker/docker-compose.yml ps

# MongoDB loglarını kontrol et
docker compose -f infra/docker/docker-compose.yml logs mongo
```

## 📚 Kaynaklar

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [MongoDB Motor Documentation](https://motor.readthedocs.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [NGINX Documentation](https://nginx.org/en/docs/)

## 🤝 Katkıda Bulunma

1. Spec-driven yaklaşımı takip et (Requirements → Design → Tasks)
2. Test-first geliştirme yap
3. Commit mesajlarında Conventional Commits kullan
4. PR açmadan önce tüm testlerin geçtiğinden emin ol

---

**Hazırlayan**: Kiro AI  
**Tarih**: 2024-01-01  
**Versiyon**: 0.1.0
