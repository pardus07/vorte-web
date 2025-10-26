#!/bin/bash
# Run E2E tests inside Docker container
# This ensures MongoDB replica set hostname resolution works correctly

set -e

echo "🧪 Running E2E tests inside vorte-api container..."
echo ""

# Check if container is running
if ! docker ps | grep -q vorte-api; then
    echo "❌ Error: vorte-api container is not running"
    echo "Please start services with: docker-compose up -d"
    exit 1
fi

# Run E2E tests inside container
docker exec vorte-api sh -c "
    cd /app && \
    python -m pytest apps/backend/tests/test_e2e_payment_flows.py -v -s --tb=short
"

echo ""
echo "✅ E2E tests completed!"
