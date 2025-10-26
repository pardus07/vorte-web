.PHONY: test-unit test-int-up test-int-down test-int test-all

# Run unit tests
test-unit:
	python -m pytest apps/backend/tests/unit -v

# Start test infrastructure
test-int-up:
	docker compose -f docker-compose.test.yml up -d mongo_test redis_test minio_test
	@echo "Waiting for services to be ready..."
	@sleep 5
	docker compose -f docker-compose.test.yml up mongo_init_test
	@echo "Initializing MinIO bucket..."
	@export MINIO_ROOT_USER=minioadmin && \
	 export MINIO_ROOT_PASSWORD=minioadmin && \
	 export MINIO_ENDPOINT=http://localhost:9002 && \
	 export AVATAR_BUCKET=avatars && \
	 bash scripts/minio_bootstrap.sh

# Stop test infrastructure
test-int-down:
	docker compose -f docker-compose.test.yml down -v

# Run integration tests
test-int:
	@export ENV=TEST && \
	 export DISABLE_TRACING=1 && \
	 export MONGO_URI="mongodb://localhost:27117/vorte_test?replicaSet=rs0" && \
	 export REDIS_URL="redis://localhost:6380/0" && \
	 export MINIO_ENDPOINT="http://localhost:9002" && \
	 export MINIO_ACCESS_KEY="minioadmin" && \
	 export MINIO_SECRET_KEY="minioadmin" && \
	 export MINIO_BUCKET="avatars" && \
	 export MINIO_PUBLIC_BASE_URL="http://localhost:9002/avatars" && \
	 python -m pytest apps/backend/tests/integration -v

# Run all tests
test-all: test-unit test-int

# Install dev dependencies
install-dev:
	pip install -r apps/backend/requirements-dev.txt
