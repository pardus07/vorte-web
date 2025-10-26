# Quick Smoke Test for Local Environment
# Tests basic functionality before full audit

param(
    [string]$BaseUrl = "http://localhost:8000"
)

$ErrorActionPreference = "Continue"
$script:Passed = 0
$script:Failed = 0

function Write-Pass {
    param([string]$Message)
    Write-Host "✅ PASS: $Message" -ForegroundColor Green
    $script:Passed++
}

function Write-Fail {
    param([string]$Message)
    Write-Host "❌ FAIL: $Message" -ForegroundColor Red
    $script:Failed++
}

Write-Host "`n🔍 Quick Smoke Test - Local Environment" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "=" * 60

# Test 1: API Root
Write-Host "`n📡 Test 1: API Accessibility" -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/" -UseBasicParsing -ErrorAction Stop
    Write-Pass "API root accessible (Status: $($response.StatusCode))"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Pass "API responding (404 expected for root)"
    } else {
        Write-Fail "API not accessible: $($_.Exception.Message)"
    }
}

# Test 2: API Docs
Write-Host "`n📚 Test 2: API Documentation" -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/docs" -UseBasicParsing -ErrorAction Stop
    Write-Pass "API docs accessible"
} catch {
    Write-Fail "API docs not accessible"
}

# Test 3: OpenAPI Schema
Write-Host "`n📋 Test 3: OpenAPI Schema" -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/openapi.json" -UseBasicParsing -ErrorAction Stop
    Write-Pass "OpenAPI schema accessible"
} catch {
    Write-Fail "OpenAPI schema not accessible"
}

# Test 4: Metrics Endpoint
Write-Host "`n📊 Test 4: Prometheus Metrics" -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/metrics" -UseBasicParsing -ErrorAction Stop
    Write-Pass "Metrics endpoint accessible"
    
    $content = $response.Content
    if ($content -match "vorte_|http_requests_total|process_") {
        Write-Pass "Metrics data present"
    } else {
        Write-Fail "No metrics data found"
    }
} catch {
    Write-Fail "Metrics endpoint not accessible"
}

# Test 5: Docker Services
Write-Host "`n🐳 Test 5: Docker Services" -ForegroundColor Blue
try {
    $containers = docker ps --format "{{.Names}}" 2>$null
    
    $requiredServices = @("vorte-api", "vorte-mongo", "vorte-redis")
    foreach ($service in $requiredServices) {
        if ($containers -match $service) {
            Write-Pass "$service container running"
        } else {
            Write-Fail "$service container not running"
        }
    }
} catch {
    Write-Fail "Docker not accessible or not running"
}

# Test 6: MongoDB Connection
Write-Host "`n🗄️  Test 6: MongoDB Connection" -ForegroundColor Blue
try {
    $mongoTest = docker exec vorte-mongo mongosh --quiet --eval "db.adminCommand('ping')" 2>$null
    if ($mongoTest -match "ok.*1") {
        Write-Pass "MongoDB responding"
    } else {
        Write-Fail "MongoDB not responding"
    }
} catch {
    Write-Fail "Cannot connect to MongoDB"
}

# Test 7: Redis Connection
Write-Host "`n💾 Test 7: Redis Connection" -ForegroundColor Blue
try {
    $redisTest = docker exec vorte-redis redis-cli ping 2>$null
    if ($redisTest -match "PONG") {
        Write-Pass "Redis responding"
    } else {
        Write-Fail "Redis not responding"
    }
} catch {
    Write-Fail "Cannot connect to Redis"
}

# Summary
Write-Host "`n" + ("=" * 60)
Write-Host "📊 SMOKE TEST SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60)
Write-Host ""
Write-Host "✅ Passed: $($script:Passed)" -ForegroundColor Green
Write-Host "❌ Failed: $($script:Failed)" -ForegroundColor Red
Write-Host "Total: $($script:Passed + $script:Failed)"

if ($script:Failed -eq 0) {
    Write-Host "`n✅ All smoke tests passed! Ready for full audit." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  Some tests failed. Fix issues before running full audit." -ForegroundColor Yellow
    exit 1
}
