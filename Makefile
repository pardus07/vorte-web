.PHONY: help install dev test lint validate e2e perf ci clean

# Default target
help:
	@echo "🚀 Vorte E-Commerce Platform - Development Commands"
	@echo ""
	@echo "📖 Quick Start: See QUICK_START.md for 30/30 in 3 steps"
	@echo ""
	@echo "Setup:"
	@echo "  make install          Install all dependencies"
	@echo "  make setup-db         Initialize MongoDB replica set"
	@echo ""
	@echo "Development:"
	@echo "  make dev              Start all services (docker compose)"
	@echo "  make dev-api          Start backend API only"
	@echo "  make dev-web          Start frontend only"
	@echo "  make logs             View all service logs"
	@echo "  make status           Check system status"
	@echo "  make smoke            Run smoke tests"
	@echo ""
	@echo "Testing:"
	@echo "  make test             Run all tests (unit + integration)"
	@echo "  make test-unit        Run unit tests only"
	@echo "  make test-integration Run integration tests only"
	@echo "  make test-e2e         Run E2E tests (Playwright)"
	@echo "  make test-perf        Run performance tests (k6)"
	@echo ""
	@echo "Quality:"
	@echo "  make lint             Run linters (ruff, eslint)"
	@echo "  make format           Format code"
	@echo "  make type-check       Run type checkers (mypy, tsc)"
	@echo "  make validate         Run all quality checks + tests"
	@echo ""
	@echo "🎯 Validation (Final 3 Steps to 100%):"
	@echo "  make validate-all     ⭐ Run all validation steps (E2E + SLO)"
	@echo "  make validate-e2e     Validate E2E tests"
	@echo "  make validate-slo     Validate performance SLOs"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean            Stop services and clean volumes"
	@echo "  make clean-cache      Clean cache directories"
	@echo ""
	@echo "📚 Documentation:"
	@echo "  QUICK_START.md              - 3 steps to 100%"
	@echo "  FINAL_VALIDATION_SUMMARY.md - Complete overview"
	@echo "  VALIDATION_RUNBOOK.md       - Detailed guide"
	@echo "  PRE_FLIGHT_CHECKLIST.md     - Pre-validation checklist"

# Setup
install:
	@echo "📦 Installing dependencies..."
	cd apps/frontend && pnpm install
	cd apps/backend && pip install -e .[dev]
	cd apps/frontend && pnpm exec playwright install --with-deps

setup-db:
	@echo "🗄️  Setting up MongoDB replica set..."
	docker compose up -d mongo
	sleep 5
	docker exec -it vorte-mongo mongosh -u admin -p password --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"

# Development
dev:
	@echo "🚀 Starting all services..."
	docker compose up -d

dev-api:
	@echo "🔧 Starting backend API..."
	cd apps/backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-web:
	@echo "🌐 Starting frontend..."
	cd apps/frontend && pnpm run dev

logs:
	docker compose logs -f

# Testing
test:
	@echo "🧪 Running all tests..."
	cd apps/backend && pytest tests/ -v
	cd apps/frontend && pnpm run test

test-unit:
	@echo "🧪 Running unit tests..."
	cd apps/backend && pytest tests/unit/ -v
	cd apps/frontend && pnpm run test

test-integration:
	@echo "🧪 Running integration tests..."
	docker compose up -d mongo redis
	cd apps/backend && pytest tests/integration/ -v

test-e2e:
	@echo "🎭 Running E2E tests..."
	docker compose up -d
	cd apps/frontend && pnpm exec playwright test --reporter=html
	cd apps/frontend && pnpm exec playwright show-report

test-perf:
	@echo "⚡ Running performance tests..."
	docker compose up -d
	k6 run --env BASE_URL=http://localhost tests/performance/homepage-p95.js
	k6 run --env BASE_URL=http://localhost:8000 tests/performance/search-p95.js
	k6 run --env BASE_URL=http://localhost:8000 tests/performance/checkout-p95.js

# Quality
lint:
	@echo "🔍 Running linters..."
	cd apps/backend && ruff check app/
	cd apps/frontend && pnpm run lint

format:
	@echo "✨ Formatting code..."
	cd apps/backend && ruff format app/
	cd apps/frontend && pnpm exec prettier --write "src/**/*.{ts,tsx}"

type-check:
	@echo "🔎 Running type checkers..."
	cd apps/backend && mypy app/
	cd apps/frontend && pnpm run type-check

validate:
	@echo "✅ Running all validations..."
	make lint
	make type-check
	make test

# Validation (Final 3 Steps)
validate-e2e:
	@echo "🎯 Step 1/3: Validating E2E tests..."
	@echo "📋 See PRE_FLIGHT_CHECKLIST.md for details"
	docker compose up -d
	@echo "⏳ Waiting for services..."
	@timeout 60 bash -c 'until curl -f http://localhost:8000/api/health 2>/dev/null; do sleep 2; done' || true
	@timeout 60 bash -c 'until curl -f http://localhost/health 2>/dev/null; do sleep 2; done' || true
	cd apps/frontend && pnpm exec playwright test --reporter=html
	@echo "✅ E2E validation complete! View report: cd apps/frontend && pnpm exec playwright show-report"

validate-slo:
	@echo "🎯 Step 2/3: Validating performance SLOs..."
	@echo "📋 See PRE_FLIGHT_CHECKLIST.md for details"
	docker compose up -d
	@echo "⏳ Running k6 tests..."
	k6 run --env BASE_URL=http://localhost tests/performance/homepage-p95.js
	k6 run --env BASE_URL=http://localhost:8000 tests/performance/search-p95.js
	k6 run --env BASE_URL=http://localhost:8000 tests/performance/checkout-p95.js
	@echo "✅ SLO validation complete!"

validate-all:
	@echo "🎯 Running all 3 validation steps..."
	@echo ""
	@echo "📋 Pre-flight checklist: PRE_FLIGHT_CHECKLIST.md"
	@echo "📖 Validation runbook: VALIDATION_RUNBOOK.md"
	@echo ""
	make validate-e2e
	make validate-slo
	@echo ""
	@echo "🎯 Step 3/3: CI Pipeline"
	@echo "Push to GitHub to trigger CI:"
	@echo "  git add -A"
	@echo "  git commit -m 'chore: validation complete – 30/30 ✅'"
	@echo "  git push origin main"
	@echo ""
	@echo "✅ Local validation complete! Push to complete CI validation."

# Smoke Tests
smoke:
	@echo "💨 Running smoke tests..."
	@echo ""
	@echo "1️⃣ Health checks..."
	@curl -f http://localhost:8000/api/health || echo "❌ API health check failed"
	@curl -f http://localhost/health || echo "❌ Web health check failed"
	@echo ""
	@echo "2️⃣ Metrics endpoint..."
	@curl -f http://localhost:8000/metrics > /dev/null && echo "✅ Metrics OK" || echo "❌ Metrics failed"
	@echo ""
	@echo "3️⃣ RFC compliance checks..."
	@echo "Testing 428 Precondition Required (missing Idempotency-Key)..."
	@curl -s -o /dev/null -w "Status: %{http_code}\n" -X POST http://localhost:8000/api/v1/payments/initiate -H "Content-Type: application/json" -d '{}'
	@echo "Testing 428 Precondition Required (missing If-Match)..."
	@curl -s -o /dev/null -w "Status: %{http_code}\n" -X PATCH http://localhost:8000/api/v1/products/test -H "Content-Type: application/json" -d '{}'
	@echo ""
	@echo "✅ Smoke tests complete!"

# Cleanup
clean:
	@echo "🧹 Cleaning up..."
	docker compose down -v
	rm -rf apps/frontend/node_modules/.vite
	rm -rf apps/frontend/artifacts

clean-cache:
	@echo "🧹 Cleaning cache..."
	docker exec -it vorte-redis redis-cli FLUSHALL || true
	rm -rf apps/frontend/.next
	rm -rf apps/backend/__pycache__
	rm -rf apps/backend/.pytest_cache

# Quick status check
status:
	@echo "📊 System Status"
	@echo ""
	@echo "Docker Services:"
	@docker compose ps
	@echo ""
	@echo "Health Checks:"
	@curl -s http://localhost:8000/api/health | head -1 || echo "❌ API down"
	@curl -s http://localhost/health || echo "❌ Web down"
	@echo ""
	@echo "Ports:"
	@netstat -an | grep -E ':(8000|5173|27017|6379|80)\s' || echo "Checking ports..."
