# Vorte E-Commerce Platform

[![CI](https://github.com/YOUR_ORG/vorte/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/vorte/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/YOUR_ORG/vorte/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_ORG/vorte)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Production-ready e-commerce platform with RFC compliance, observability, and modern architecture.

**Status:** 27/30 acceptance criteria (90%) ✅

**🚀 [Quick Start Guide](./QUICK_START.md)** | [Validation Runbook](./VALIDATION_RUNBOOK.md) | [Pre-Flight Checklist](./PRE_FLIGHT_CHECKLIST.md)

## 🎯 Features

### RFC Compliance
- **RFC 9457**: Problem Details for HTTP APIs
- **RFC 9110**: HTTP Semantics (ETag, If-Match, optimistic locking)
- **RFC 8288**: Web Linking (cursor-based pagination)
- **W3C Trace Context**: Distributed tracing

### Architecture Patterns
- **Stripe-style Idempotency**: 24-hour replay window
- **Optimistic Locking**: ETag/If-Match for concurrent updates
- **Cursor-based Pagination**: Stable results with Link headers
- **MongoDB Transactions**: ACID guarantees
- **TTL + Change Streams**: Automatic resource cleanup

### Security & Compliance
- **Argon2id**: OWASP-recommended password hashing
- **JWT**: 15min access, 7day refresh tokens
- **Rate Limiting**: 60 req/min on auth endpoints
- **KVKK Compliance**: Turkish data protection law
- **PII Masking**: Automatic in logs

### Observability
- **Prometheus Metrics**: Business, HTTP, transaction metrics
- **OpenTelemetry**: Distributed tracing
- **Structured Logging**: JSON with traceId and PII masking

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

### Start All Services

```bash
# Start all services (MongoDB, Redis, MinIO, API, Web, Nginx)
docker compose up -d

# Check service health
docker compose ps

# View logs
docker compose logs -f api
```

## 📋 Validation & Testing

**Current Status**: 27/30 acceptance criteria completed (90%) ✅

### 📚 Documentation
- **[QUICK_START.md](./QUICK_START.md)** ⭐ - 30/30 in 3 steps
- **[COMMANDS_CHEATSHEET.md](./COMMANDS_CHEATSHEET.md)** - All commands in one page
- **[FINAL_VALIDATION_SUMMARY.md](./FINAL_VALIDATION_SUMMARY.md)** - Complete validation overview
- **[VALIDATION_RUNBOOK.md](./VALIDATION_RUNBOOK.md)** - Step-by-step validation guide
- **[PRE_FLIGHT_CHECKLIST.md](./PRE_FLIGHT_CHECKLIST.md)** - Pre-validation checklist
- **[DESIGN_ALIGNMENT_REPORT.md](./DESIGN_ALIGNMENT_REPORT.md)** - Documentation alignment report

### Quick Validation (Makefile)
```bash
# Run all validation steps
make validate-all

# Or step by step:
make validate-e2e    # 1. E2E tests (Playwright)
make validate-slo    # 2. Performance SLOs (k6)
# 3. CI: git push origin main
```

### Manual Validation
```bash
# 1. E2E Tests
docker compose up -d
cd apps/frontend && pnpm exec playwright test

# 2. Performance SLOs
k6 run --env BASE_URL=http://localhost tests/performance/homepage-p95.js
k6 run --env BASE_URL=http://localhost:8000 tests/performance/search-p95.js
k6 run --env BASE_URL=http://localhost:8000 tests/performance/checkout-p95.js

# 3. CI Pipeline
git push origin main  # Triggers GitHub Actions
```

### Available Commands
```bash
make help              # Show all available commands
make install           # Install all dependencies
make dev               # Start all services
make test              # Run all tests
make lint              # Run linters
make validate          # Run all quality checks
```

Services will be available at:
- **Frontend**: http://localhost (Nginx)
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Metrics**: http://localhost:8000/metrics
- **MinIO Console**: http://localhost:9001

### Local Development

#### Backend

```bash
cd apps/backend

# Install dependencies
pip install -e .

# Start MongoDB and Redis
docker compose up -d mongo redis

# Run API
uvicorn app.main:app --reload

# Run tests
pytest

# Run integration tests
pytest tests/integration/

# Type check
mypy app/

# Lint
ruff check app/
```

#### Frontend

```bash
cd apps/frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Build
npm run build

# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint
```

## 📚 Documentation

- [Implementation Status](./IMPLEMENTATION_STATUS.md) - Detailed task completion
- [Acceptance Criteria](./ACCEPTANCE_CRITERIA.md) - Production readiness checklist
- [Backend README](./apps/backend/README.md) - Backend API documentation
- [Frontend README](./apps/frontend/README.md) - Frontend documentation
- [Design Document](./.kiro/specs/core-platform/design.md) - Architecture design
- [Requirements](./.kiro/specs/core-platform/requirements.md) - Feature requirements

## 🏗️ Architecture

```
┌─────────────┐
│   Nginx     │ ← Reverse proxy, rate limiting, SSL
└──────┬──────┘
       │
   ┌───┴────┐
   │        │
┌──▼──┐  ┌─▼────┐
│ Web │  │ API  │ ← FastAPI, OpenTelemetry, Prometheus
└─────┘  └──┬───┘
            │
    ┌───────┼───────┐
    │       │       │
┌───▼──┐ ┌─▼───┐ ┌─▼────┐
│Mongo │ │Redis│ │MinIO │
└──────┘ └─────┘ └──────┘
```

## 🧪 Testing

### Unit Tests
```bash
cd apps/backend
pytest tests/unit/ -v
```

### Integration Tests
```bash
cd apps/backend
pytest tests/integration/ -v
```

### E2E Tests
```bash
cd apps/frontend
npm run test:e2e
```

### Performance Tests
```bash
# Using k6
k6 run tests/performance/load-test.js
```

## 📊 Monitoring

### Prometheus Metrics

Available at `/metrics`:

```
# Business metrics
vorte_inventory_reservation_attempts_total{sku, outcome}
vorte_inventory_available{sku}
vorte_order_created_total{order_type}

# HTTP metrics
vorte_http_requests_total{method, endpoint, status}
vorte_http_409_total{endpoint, reason}
vorte_http_428_total{endpoint, missing_header}

# Transaction metrics
vorte_transaction_duration_seconds{operation}
```

### Structured Logs

All logs include:
- `timestamp`: ISO 8601
- `level`: INFO, WARN, ERROR
- `traceId`: W3C Trace Context
- `method`, `path`, `status`, `duration_ms`
- PII automatically masked

### Distributed Tracing

OpenTelemetry traces include:
- HTTP semantic conventions
- MongoDB operations
- Redis operations
- Business context (orderId, cartId, sku, userId)

## 🔒 Security

### Authentication
- Argon2id password hashing (memory=128MB, time_cost=2, parallelism=4)
- JWT tokens with refresh rotation
- Rate limiting (60 req/min on auth)
- Secure cookies (HttpOnly, SameSite, Secure)

### API Security
- CORS configuration
- CSRF protection
- Rate limiting per endpoint
- Input validation with Pydantic
- SQL injection prevention (MongoDB)

### KVKK Compliance
- Consent collection on registration
- Data access right (GET /api/v1/users/me/data)
- Erasure right (DELETE /api/v1/users/me)
- PII masking in logs

## 🎨 Frontend

### Tech Stack
- React 18
- Vite
- TypeScript
- TanStack Query
- Tailwind CSS
- React Router

### Features
- RFC 9457 Problem Details UI
- ETag/If-Match handling
- Idempotency-Key generation
- WCAG 2.1 AA accessibility
- Responsive design
- Optimistic UI updates

## 🚢 Deployment

### Docker

```bash
# Build images
docker compose build

# Push to registry
docker tag vorte-api:latest registry.example.com/vorte-api:latest
docker push registry.example.com/vorte-api:latest
```

### Environment Variables

See `.env.example` files in:
- `apps/backend/.env.example`
- `apps/frontend/.env.example`

### Production Checklist

- [ ] Change JWT_SECRET
- [ ] Configure MongoDB replica set
- [ ] Configure Redis cluster
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS origins
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Set up log aggregation (ELK/Loki)
- [ ] Configure backup strategy
- [ ] Set up alerting
- [ ] Load testing
- [ ] Security audit

## 📈 Performance

### SLOs (Service Level Objectives)
- Homepage p95 < 2s
- Search p95 < 1.5s
- Checkout p95 < 3s

### Optimization
- Redis caching (5min TTL for products)
- MongoDB indexes
- Cursor-based pagination
- Image optimization
- Code splitting
- CDN for static assets

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style
- Backend: Follow PEP 8, use `ruff` and `mypy`
- Frontend: Follow Airbnb style guide, use `eslint` and `prettier`
- Commit messages: Conventional Commits

## 📝 License

MIT License - see LICENSE file for details

## 👥 Team

- Backend: FastAPI, MongoDB, Redis
- Frontend: React, TypeScript, Tailwind
- DevOps: Docker, Nginx, Prometheus

## 🆘 Support

- Documentation: See `/docs` folder
- Issues: GitHub Issues
- Email: support@vorte.com.tr

## 🎉 Acknowledgments

Built with:
- FastAPI
- React
- MongoDB
- Redis
- OpenTelemetry
- Prometheus

Following standards:
- RFC 9457 (Problem Details)
- RFC 9110 (HTTP Semantics)
- RFC 8288 (Web Linking)
- W3C Trace Context
- OWASP Security Guidelines
- WCAG 2.1 Accessibility Guidelines
