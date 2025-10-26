# scripts/pre-launch-audit.ps1
#
# Pre-Launch Audit Script (PowerShell)
# Automated validation against latest standards (RFC 9110, RFC 9111, RFC 9457, W3C Trace Context, etc.)
#
# Usage: .\scripts\pre-launch-audit.ps1 [-BaseUrl "http://localhost:8000"]
# Example: .\scripts\pre-launch-audit.ps1 -BaseUrl "https://api.yourcompany.com"

param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$PrometheusUrl = $env:PROMETHEUS_URL ?? "http://localhost:9090",
    [string]$MongoUri = $env:MONGO_URI ?? "mongodb://localhost:27017",
    [string]$DbName = $env:DB_NAME ?? "payment_system"
)

$ErrorActionPreference = "Continue"

# Test results
$script:Passed = 0
$script:Failed = 0
$script:Warnings = 0

# Helper functions
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

function Write-Warn {
    param([string]$Message)
    Write-Host "⚠️  WARN: $Message" -ForegroundColor Yellow
    $script:Warnings++
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  INFO: $Message" -ForegroundColor Cyan
}

function Test-Command {
    param([string]$Command)
    return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

Write-Host "🚀 Pre-Launch Audit Script" -ForegroundColor Blue
Write-Host "Base URL: $BaseUrl" -ForegroundColor Blue
Write-Host "Prometheus: $PrometheusUrl" -ForegroundColor Blue
Write-Host "=" * 60

# ============================================================================
# 1. HTTP & Cache Validation (RFC 9110, RFC 9111, RFC 9457)
# ============================================================================
Write-Host ""
Write-Host "📋 HTTP & Cache Validation (RFC 9110, RFC 9111, RFC 9457)" -ForegroundColor Blue
Write-Host "─" * 60

Write-Info "Testing health endpoint with tracing headers..."
$TraceId = "00-$((New-Guid).ToString('N'))-$((New-Guid).ToString('N').Substring(0,16))-01"
$RequestId = (New-Guid).ToString()

try {
    $HealthResponse = Invoke-WebRequest -Uri "$BaseUrl/health" `
        -Headers @{
            "traceparent" = $TraceId
            "X-Request-Id" = $RequestId
        } `
        -UseBasicParsing `
        -ErrorAction Stop

    if ($HealthResponse.StatusCode -eq 200) {
        Write-Pass "Health endpoint returns 200 OK"
    } else {
        Write-Fail "Health endpoint not responding with 200 OK"
    }

    # Check for required headers
    if ($HealthResponse.Headers["X-Request-Id"]) {
        Write-Pass "X-Request-Id header present in response"
    } else {
        Write-Fail "X-Request-Id header missing (RFC 9110 compliance)"
    }

    if ($HealthResponse.Headers["traceparent"]) {
        Write-Pass "traceparent header propagated (W3C Trace Context)"
    } else {
        Write-Warn "traceparent header not propagated (W3C Trace Context)"
    }
} catch {
    Write-Fail "Health endpoint not reachable: $_"
}

# Test ETag/Last-Modified validation
Write-Info "Testing ETag/Last-Modified headers..."
try {
    $PaymentResponse = Invoke-WebRequest -Uri "$BaseUrl/api/v1/orders/test123/payment" `
        -UseBasicParsing `
        -ErrorAction SilentlyContinue

    if ($PaymentResponse.Headers["ETag"] -or $PaymentResponse.Headers["Last-Modified"]) {
        Write-Pass "ETag or Last-Modified header present (RFC 9111 caching)"
    } else {
        Write-Warn "No ETag or Last-Modified headers found (caching not optimized)"
    }
} catch {
    Write-Warn "Could not test ETag headers: $_"
}

# Test Problem Details format (RFC 9457)
Write-Info "Testing Problem Details format..."
try {
    $ProblemResponse = Invoke-WebRequest -Uri "$BaseUrl/api/v1/payments/invalid-id" `
        -Headers @{"Accept" = "application/problem+json"} `
        -UseBasicParsing `
        -ErrorAction SilentlyContinue

    if ($ProblemResponse.Headers["Content-Type"] -match "application/problem\+json") {
        Write-Pass "Problem Details content-type present (RFC 9457)"
        
        $ProblemJson = $ProblemResponse.Content | ConvertFrom-Json
        
        if ($ProblemJson.type -and $ProblemJson.title -and $ProblemJson.status -and $ProblemJson.detail) {
            Write-Pass "Problem Details structure valid (type/title/status/detail)"
        } else {
            Write-Warn "Problem Details structure incomplete"
        }
    } else {
        Write-Warn "Problem Details format not implemented (RFC 9457)"
    }
} catch {
    Write-Warn "Could not test Problem Details: $_"
}

# ============================================================================
# 2. Prometheus Metrics Validation
# ============================================================================
Write-Host ""
Write-Host "📊 Prometheus Metrics Validation" -ForegroundColor Blue
Write-Host "─" * 60

Write-Info "Checking Prometheus metrics naming conventions..."
try {
    $MetricsResponse = Invoke-RestMethod -Uri "$PrometheusUrl/api/v1/label/__name__/values" `
        -ErrorAction Stop

    if ($MetricsResponse.data) {
        Write-Pass "Prometheus API accessible"
        
        # Check for _total suffix on counters
        $TotalMetrics = $MetricsResponse.data | Where-Object { $_ -match '_total$' }
        if ($TotalMetrics.Count -gt 0) {
            Write-Pass "Found $($TotalMetrics.Count) counter metrics with _total suffix"
        } else {
            Write-Warn "No counter metrics with _total suffix found"
        }
        
        # Check for _seconds suffix on duration metrics
        $SecondsMetrics = $MetricsResponse.data | Where-Object { $_ -match '_seconds$' }
        if ($SecondsMetrics.Count -gt 0) {
            Write-Pass "Found $($SecondsMetrics.Count) duration metrics with _seconds suffix"
        } else {
            Write-Warn "No duration metrics with _seconds suffix found"
        }
        
        # Check for expected payment metrics
        $ExpectedMetrics = @("payment_init_total", "notification_dispatch_total", "refund_total", "payment_init_latency_seconds")
        foreach ($metric in $ExpectedMetrics) {
            if ($MetricsResponse.data -contains $metric) {
                Write-Pass "Expected metric '$metric' found"
            } else {
                Write-Warn "Expected metric '$metric' not found"
            }
        }
    }
} catch {
    Write-Fail "Prometheus API not accessible at $PrometheusUrl"
}

# Check histogram bucket configuration
Write-Info "Checking histogram bucket configuration..."
try {
    $HistogramQuery = "{__name__=~`".*_seconds_bucket`"}"
    $HistogramResponse = Invoke-RestMethod -Uri "$PrometheusUrl/api/v1/query?query=$HistogramQuery" `
        -ErrorAction Stop

    $HistogramCount = $HistogramResponse.data.result.Count
    if ($HistogramCount -gt 0) {
        Write-Pass "Found $HistogramCount histogram bucket metrics"
        
        # Check for reasonable bucket ranges
        $Buckets = $HistogramResponse.data.result | ForEach-Object { $_.metric.le } | Sort-Object -Unique | Select-Object -First 10
        if ($Buckets -match "0\.1|0\.5|1|5") {
            Write-Pass "Histogram buckets include reasonable ranges (0.1, 0.5, 1, 5s)"
        } else {
            Write-Warn "Histogram bucket ranges may not be optimal for latency measurement"
        }
    } else {
        Write-Warn "No histogram metrics found"
    }
} catch {
    Write-Warn "Could not check histogram buckets: $_"
}

# ============================================================================
# 3. Kubernetes Configuration
# ============================================================================
Write-Host ""
Write-Host "☸️  Kubernetes Configuration" -ForegroundColor Blue
Write-Host "─" * 60

if (Test-Command "kubectl") {
    Write-Info "Checking Kubernetes deployment configuration..."
    
    $Deployments = kubectl get deployments -o name 2>$null | Where-Object { $_ -match "payment|api" } | Select-Object -First 3
    
    foreach ($deployment in $Deployments) {
        $DeploymentName = $deployment -replace "deployment.apps/", ""
        Write-Info "Checking deployment: $DeploymentName"
        
        # Check terminationGracePeriodSeconds
        $GracePeriod = kubectl get $deployment -o jsonpath='{.spec.template.spec.terminationGracePeriodSeconds}' 2>$null
        if ($GracePeriod -and [int]$GracePeriod -ge 30) {
            Write-Pass "terminationGracePeriodSeconds set to ${GracePeriod}s (≥30s)"
        } else {
            Write-Warn "terminationGracePeriodSeconds not set or too low (<30s)"
        }
        
        # Check for preStop hook
        $PreStop = kubectl get $deployment -o jsonpath='{.spec.template.spec.containers[0].lifecycle.preStop}' 2>$null
        if ($PreStop) {
            Write-Pass "preStop hook configured for graceful shutdown"
        } else {
            Write-Warn "preStop hook not configured"
        }
        
        # Check liveness probe
        $Liveness = kubectl get $deployment -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}' 2>$null
        if ($Liveness) {
            Write-Pass "Liveness probe configured"
            
            # Check probe settings
            $FailureThreshold = kubectl get $deployment -o jsonpath='{.spec.template.spec.containers[0].livenessProbe.failureThreshold}' 2>$null
            if ($FailureThreshold -and [int]$FailureThreshold -ge 3) {
                Write-Pass "Liveness probe failureThreshold ≥3 (avoids false positives)"
            } else {
                Write-Warn "Liveness probe failureThreshold <3 (may cause false positive restarts)"
            }
        } else {
            Write-Warn "Liveness probe not configured"
        }
        
        # Check readiness probe
        $Readiness = kubectl get $deployment -o jsonpath='{.spec.template.spec.containers[0].readinessProbe}' 2>$null
        if ($Readiness) {
            Write-Pass "Readiness probe configured"
        } else {
            Write-Warn "Readiness probe not configured"
        }
    }
} else {
    Write-Warn "kubectl not available - skipping Kubernetes checks"
}

# ============================================================================
# 4. MongoDB TTL & Outbox Configuration
# ============================================================================
Write-Host ""
Write-Host "🗄️  MongoDB TTL & Outbox Configuration" -ForegroundColor Blue
Write-Host "─" * 60

if (Test-Command "mongosh") {
    Write-Info "Checking MongoDB TTL indexes..."
    
    try {
        $TtlCheck = mongosh "$MongoUri/$DbName" --quiet --eval "db.notifications_outbox.getIndexes().filter(i => i.key.expireAt).length" 2>$null
        
        if ([int]$TtlCheck -gt 0) {
            Write-Pass "TTL index found on notifications_outbox.expireAt"
            
            # Check TTL configuration
            $TtlConfig = mongosh "$MongoUri/$DbName" --quiet --eval "JSON.stringify(db.notifications_outbox.getIndexes().filter(i => i.key.expireAt)[0])" 2>$null | ConvertFrom-Json
            
            if ($TtlConfig.expireAfterSeconds -eq 0) {
                Write-Pass "TTL index configured with expireAfterSeconds: 0 (exact expiration)"
            } else {
                Write-Warn "TTL index expireAfterSeconds not set to 0"
            }
        } else {
            Write-Fail "TTL index not found on notifications_outbox collection"
        }
        
        # Check outbox document structure
        Write-Info "Checking outbox document structure..."
        $SampleDoc = mongosh "$MongoUri/$DbName" --quiet --eval "JSON.stringify(db.notifications_outbox.findOne({}, {expireAt: 1, claimedAt: 1, claimedBy: 1}))" 2>$null | ConvertFrom-Json
        
        if ($SampleDoc.expireAt) {
            Write-Pass "Outbox documents have expireAt field (TTL lifecycle management)"
        } else {
            Write-Warn "Outbox documents missing expireAt field"
        }
        
        if ($SampleDoc.claimedAt -or $SampleDoc.claimedBy) {
            Write-Pass "Outbox documents have claim fields (visibility timeout pattern)"
        } else {
            Write-Warn "Outbox documents missing claim fields (claimedAt/claimedBy)"
        }
    } catch {
        Write-Warn "Could not check MongoDB: $_"
    }
} else {
    Write-Warn "mongosh not available - skipping MongoDB checks"
}

# ============================================================================
# 5. Security & Compliance Quick Check
# ============================================================================
Write-Host ""
Write-Host "🔒 Security & Compliance Quick Check" -ForegroundColor Blue
Write-Host "─" * 60

Write-Info "Checking security headers..."
try {
    $SecurityResponse = Invoke-WebRequest -Uri "$BaseUrl/api/health" -UseBasicParsing -ErrorAction Stop
    
    $SecurityHeaders = @("Strict-Transport-Security", "X-Frame-Options", "X-Content-Type-Options", "Content-Security-Policy")
    foreach ($header in $SecurityHeaders) {
        if ($SecurityResponse.Headers[$header]) {
            Write-Pass "Security header '$header' present"
        } else {
            Write-Warn "Security header '$header' missing"
        }
    }
} catch {
    Write-Warn "Could not check security headers: $_"
}

# Test rate limiting
Write-Info "Testing rate limiting (basic check)..."
try {
    $RateLimitResponse = Invoke-WebRequest -Uri "$BaseUrl/api/health" -UseBasicParsing -ErrorAction Stop
    if ($RateLimitResponse.Headers["X-RateLimit-Limit"] -or $RateLimitResponse.Headers["RateLimit-Limit"]) {
        Write-Pass "Rate limiting headers present"
    } else {
        Write-Warn "Rate limiting headers not found (may be configured at proxy level)"
    }
} catch {
    Write-Warn "Could not check rate limiting: $_"
}

# ============================================================================
# 6. Day 0-1 Monitoring Readiness
# ============================================================================
Write-Host ""
Write-Host "📈 Day 0-1 Monitoring Readiness" -ForegroundColor Blue
Write-Host "─" * 60

Write-Info "Checking critical Day 0-1 metrics..."

$CriticalMetrics = @("up", "http_requests_total", "http_request_duration_seconds")

foreach ($metric in $CriticalMetrics) {
    try {
        $MetricCheck = Invoke-RestMethod -Uri "$PrometheusUrl/api/v1/query?query=$metric" -ErrorAction Stop
        if ($MetricCheck.data.result.Count -gt 0) {
            Write-Pass "Critical metric '$metric' available"
        } else {
            Write-Warn "Critical metric '$metric' not found"
        }
    } catch {
        Write-Warn "Could not check metric '$metric': $_"
    }
}

# Check alert rules
Write-Info "Checking alert rules configuration..."
try {
    $AlertRules = Invoke-RestMethod -Uri "$PrometheusUrl/api/v1/rules" -ErrorAction Stop
    $AlertCount = ($AlertRules.data.groups.rules | Where-Object { $_.type -eq "alerting" }).Count
    if ($AlertCount -gt 0) {
        Write-Pass "Found $AlertCount alert rules configured"
    } else {
        Write-Warn "No alert rules found in Prometheus"
    }
} catch {
    Write-Warn "Could not check alert rules: $_"
}

# ============================================================================
# Summary
# ============================================================================
Write-Host ""
Write-Host "=" * 60
Write-Host "📊 AUDIT SUMMARY" -ForegroundColor Blue
Write-Host "=" * 60

$Total = $script:Passed + $script:Failed + $script:Warnings
$PassRate = if ($Total -gt 0) { [math]::Round(($script:Passed * 100 / $Total), 0) } else { 0 }

Write-Host ""
Write-Host "✅ Passed: $($script:Passed)" -ForegroundColor Green
Write-Host "❌ Failed: $($script:Failed)" -ForegroundColor Red
Write-Host "⚠️  Warnings: $($script:Warnings)" -ForegroundColor Yellow
Write-Host "Total checks: $Total"
Write-Host "Pass rate: ${PassRate}%"

Write-Host ""
if ($script:Failed -eq 0 -and $PassRate -ge 80) {
    Write-Host "🚀 GO FOR LAUNCH! System ready for production deployment." -ForegroundColor Green
    exit 0
} elseif ($script:Failed -eq 0) {
    Write-Host "⚠️  PROCEED WITH CAUTION: Some warnings present but no critical failures." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "🛑 HOLD DEPLOYMENT: Critical issues found. Address failures before launch." -ForegroundColor Red
    exit 1
}
