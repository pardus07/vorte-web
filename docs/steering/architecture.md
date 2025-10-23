# Architecture Standards (VORTE)

## Monorepo Structure

- **apps/frontend**: React + Vite + TypeScript + Tailwind + shadcn/ui
- **apps/backend**: FastAPI (Python 3.12)
- **packages/common**: Shared types, utilities
- **infra/***: Docker, Nginx, deployment configs

## Backend Architecture

**Layered Structure:**
- `api/routers`: HTTP endpoints, request/response handling
- `service`: Business logic, orchestration
- `repository`: Data access layer (MongoDB)
- `schemas`: Pydantic models for validation
- `core`: Config, security (JWT, auth), middleware
- `integrations`: External adapters (payment, shipping, ERP, IYS)
- `events`: Domain events, event handlers
- `tasks`: Background jobs (Celery/RQ + Redis)

**Key Principles:**
- Interface-first design for integrations (adapter pattern)
- MongoDB transactions for multi-step operations
- Redis for caching, queues, rate limiting
- JWT + refresh token authentication
- Structured logging with traceId correlation

## Frontend Architecture

**Tech Stack:**
- React 18 + TypeScript
- Vite (build tool)
- TanStack Query (server state)
- React Hook Form + Zod (forms)
- Tailwind CSS + shadcn/ui (UI components)
- i18next (internationalization)

**Module Organization:**
- `pages/`: Route components
- `features/`: Feature-specific components and logic
- `components/`: Shared UI components
- `lib/`: Utilities, API clients, hooks
- `stores/`: Client state (if needed)

## Infrastructure

- **Database**: MongoDB (primary), Redis (cache/queue)
- **Storage**: MinIO (S3-compatible, local dev)
- **Reverse Proxy**: Nginx (rate limiting, caching, security headers)
- **Messaging**: Redis (RQ/Celery for background tasks)

## Security Standards

- No plain-text card data; use payment provider tokenization
- Secrets in `.env` (dev) and OS secret store (prod)
- KVKK/IYS compliance: explicit consent, PII masking in logs
- Rate limiting, CORS, CSRF protection
- CSP, HSTS headers via Nginx

## Testing Strategy

- **Test-First Development**: Write acceptance tests before implementation
- **Backend**: pytest (unit + integration + contract tests)
- **Frontend**: Vitest (component tests)
- **E2E**: Playwright (critical user flows)
- Every module requires tests before "done"

## Development Workflow

1. **Spec-Driven**: Requirements → Design → Tasks
2. **Test-First**: Write tests based on acceptance criteria
3. **Implementation**: Code to pass tests
4. **CI/CD**: Automated lint, test, build, security scans
