# VORTE E-Ticaret Monorepo

Bu depo; **frontend (React+Vite+TS)** ve **backend (FastAPI)** uygulamalarını,
ortak paketleri ve altyapıyı tek çatı altında toplar.

Geliştirme; **spec-driven** yaklaşım ile yapılır: Requirements → Design → Tasks → Tests → Code.

- Frontend: `apps/frontend`
- Backend : `apps/backend`
- Common  : `packages/common`
- Infra   : `infra/*`
- Docs    : `docs/specs`, `docs/steering`

## Çalışma Sırası

1. Steering/Specs → 2. Test → 3. Kod → 4. CI

## Kurulum

### Gereksinimler

- Docker Desktop (Windows)
- Node.js 20 LTS
- Python 3.12
- pnpm (Node paket yöneticisi)

### Hızlı Başlangıç

```bash
# 1. Tüm servisleri başlat (ilk çalıştırmada build edilir)
docker compose -f infra/docker/docker-compose.yml up --build

# 2. Tarayıcıdan erişim
# Frontend: http://localhost
# API Docs: http://localhost/api/docs
# API Health: http://localhost/api/health
# Metrics: http://localhost/metrics
# MinIO Console: http://localhost:9001
```

### Geliştirme Ortamı

```bash
# Backend (lokal)
cd apps/backend
uv pip install -r pyproject.toml
uvicorn app.main:app --reload

# Frontend (lokal)
cd apps/frontend
pnpm install
pnpm dev

# Testler
cd apps/backend
pytest

cd apps/frontend
pnpm test
```

## Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Python 3.12, MongoDB, Redis
- **Infra**: Docker, Nginx, MinIO
- **Test**: Playwright (E2E), Vitest (FE), pytest (BE)
