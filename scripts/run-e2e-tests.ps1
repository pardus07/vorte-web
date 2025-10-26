# Run E2E tests inside Docker container
# This ensures MongoDB replica set hostname resolution works correctly

Write-Host "🧪 Running E2E tests inside vorte-api container..." -ForegroundColor Cyan
Write-Host ""

# Check if container is running
$containerRunning = docker ps --filter "name=vorte-api" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Host "❌ Error: vorte-api container is not running" -ForegroundColor Red
    Write-Host "Please start services with: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

# Run E2E tests inside container
docker exec vorte-api sh -c @"
cd /app && python -m pytest apps/backend/tests/test_e2e_payment_flows.py -v -s --tb=short
"@

Write-Host ""
Write-Host "✅ E2E tests completed!" -ForegroundColor Green
