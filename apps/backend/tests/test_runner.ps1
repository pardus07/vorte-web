# PowerShell Test Runner for Windows
# Usage: .\apps\backend\tests\test_runner.ps1 [unit|integration|all]

param(
    [Parameter(Position=0)]
    [ValidateSet("unit", "integration", "all", "setup")]
    [string]$TestType = "all"
)

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Test-Unit {
    Write-Step "Running unit tests..."
    python -m pytest apps/backend/tests/unit -v
}

function Setup-Integration {
    Write-Step "Starting test infrastructure..."
    docker compose -f docker-compose.test.yml up -d mongo_test redis_test minio_test
    
    Write-Step "Waiting for services to be ready..."
    Start-Sleep -Seconds 5
    
    Write-Step "Initializing MongoDB replica set..."
    docker compose -f docker-compose.test.yml up mongo_init_test
    
    Write-Step "Initializing MinIO bucket..."
    $env:MINIO_ROOT_USER = "minioadmin"
    $env:MINIO_ROOT_PASSWORD = "minioadmin"
    $env:MINIO_ENDPOINT = "http://localhost:9002"
    $env:AVATAR_BUCKET = "avatars"
    bash scripts/minio_bootstrap.sh
    
    Write-Host "`nTest infrastructure is ready!" -ForegroundColor Green
}

function Test-Integration {
    Write-Step "Running integration tests..."
    
    $env:ENV = "TEST"
    $env:DISABLE_TRACING = "1"
    $env:MONGO_URI = "mongodb://localhost:27117/vorte_test?replicaSet=rs0"
    $env:REDIS_URL = "redis://localhost:6380/0"
    $env:MINIO_ENDPOINT = "http://localhost:9002"
    $env:MINIO_ACCESS_KEY = "minioadmin"
    $env:MINIO_SECRET_KEY = "minioadmin"
    $env:MINIO_BUCKET = "avatars"
    $env:MINIO_PUBLIC_BASE_URL = "http://localhost:9002/avatars"
    
    python -m pytest apps/backend/tests/integration -v
}

function Teardown-Integration {
    Write-Step "Stopping test infrastructure..."
    docker compose -f docker-compose.test.yml down -v
    Write-Host "`nTest infrastructure stopped!" -ForegroundColor Green
}

# Main execution
switch ($TestType) {
    "unit" {
        Test-Unit
    }
    "integration" {
        Test-Integration
    }
    "setup" {
        Setup-Integration
    }
    "all" {
        Test-Unit
        if ($LASTEXITCODE -eq 0) {
            Test-Integration
        }
    }
}

# Return exit code
exit $LASTEXITCODE
