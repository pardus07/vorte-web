FROM node:20-alpine

WORKDIR /web

# Enable corepack for pnpm
RUN corepack enable

# Copy dependency files
COPY apps/frontend/package.json apps/frontend/pnpm-lock.yaml* /web/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy application code
COPY apps/frontend /web

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5173"]
