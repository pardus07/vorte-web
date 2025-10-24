# Vorte Frontend

React + Vite + TypeScript e-commerce frontend with RFC compliance.

## Features

- **RFC 9457 Problem Details**: Automatic parsing and user-friendly error display
- **ETag/If-Match**: Optimistic locking for concurrent updates (RFC 9110)
- **Idempotency-Key**: Automatic generation for mutations (Stripe pattern)
- **W3C Trace Context**: Distributed tracing with traceparent/x-trace-id
- **RFC 8288 Link Headers**: Cursor-based pagination support
- **WCAG 2.1 AA**: Accessible UI components

## Tech Stack

- React 18
- Vite
- TypeScript
- TanStack Query (React Query)
- Axios
- Tailwind CSS
- React Router
- Vitest + Testing Library

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check
```

## API Client

The API client (`src/lib/api/client.ts`) automatically handles:

1. **ETag Storage**: GET responses store ETags for future updates
2. **If-Match Injection**: PATCH/PUT/DELETE requests include If-Match header
3. **Idempotency-Key**: POST/PATCH/PUT requests get unique idempotency keys
4. **Trace Context**: All requests include X-Trace-ID header
5. **Problem Details**: RFC 9457 errors are parsed and enhanced

### Error Handling

```typescript
try {
  await updateCart({ item_id: '123', qty: 2 });
} catch (error) {
  if (error.status === 409) {
    // ETag mismatch - resource was modified
    // error.needsRefresh === true
    // Refetch and retry
  } else if (error.status === 428) {
    // Missing required header (If-Match or Idempotency-Key)
  } else if (error.status === 429) {
    // Rate limit exceeded
    // error.retryAfter contains seconds to wait
  }
  
  // error.problem contains RFC 9457 Problem Details
  console.log(error.problem.traceId);
}
```

## Environment Variables

Create `.env` file:

```
VITE_API_URL=http://localhost:8000/api
```

## Testing

```bash
# Run unit tests
pnpm test

# Run with UI
pnpm test:ui

# Run E2E tests (Playwright)
pnpm test:e2e
```

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:

- Semantic HTML
- ARIA attributes
- Keyboard navigation
- Focus indicators
- Color contrast ratios

## Performance

- Code splitting with React.lazy
- Image optimization
- TanStack Query caching (5min stale time)
- Optimistic UI updates
