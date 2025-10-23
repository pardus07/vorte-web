FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
RUN pip install --no-cache-dir uv

# Copy dependency files
COPY apps/backend/pyproject.toml /app/

# Install dependencies
RUN uv pip install --system -r pyproject.toml

# Copy application code
COPY apps/backend /app

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host=0.0.0.0", "--port=8000", "--reload"]
