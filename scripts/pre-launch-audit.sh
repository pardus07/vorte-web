#!/bin/bash
# scripts/pre-launch-audit.sh
#
# Pre-Launch Audit Script
# Validates system configuration against production standards
#
# Usage: ./scripts/pre-launch-audit.sh
#
# Exit codes:
#   0 - All checks passed (GO for launch)
#   1 - One or more checks failed (HOLD)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED_CHECKS=0
TOTAL_CHECKS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

echo "=========================================="
echo "🚀 Pre-Launch Audit - Payment System"
echo "=========================================="
echo ""

# ============================================================================
# 1. HTTP Validators (RFC 9110, RFC 9111)
# ============================================================================
echo "📡 1. HTTP Validators & Caching"
echo "---"

# Check if API is reachable
if curl -s -f -o /dev/null -w "%{http_code}" http://localhost:8000/health > /dev/null 2>&1; then
    check_pass "API is reachable"
    
    # Check ETag header
    if curl -s -I http://localhost:8000/api/v1/orders/test/payment 2>/dev/null | grep -i "etag:" > /dev/null; then
        check_pass "ETag header present (RFC 9110)"
    else
        check_warn "ETag header missing (optional but recommended)"
    fi
    
    # Check Last-Modified header
    if curl -s -I http://localhost:8000/api/v1/orders/test/payment 2>/dev/null | grep -i "last-modified:" > /dev/null; then
        check_pass "Last-Modified header present (RFC 9110)"
    else
        check_warn "Last-Modified header missing (optional)"
    fi
else
    check_fail "API not reachable at http://localhost:8000"
fi

echo ""

# ============================================================================
# 2. Problem Details (RFC 9457)
# ============================================================================
echo "🔍 2. Problem Details Format"
echo "---"

# Test 404 response format
PROBLEM_RESPONSE=$(curl -s -H "Accept: application/problem+json" http://localhost:8000/api/v1/payments/nonexistent 2>/dev/null || echo "{}")

if echo "$PROBLEM_RESPONSE" | jq -e '.type' > /dev/null 2>&1; then
    check_pass "Problem Details 'type' field present (RFC 9457)"
else
    check_fail "Problem Details 'type' field missing"
fi

if echo "$PROBLEM_RESPONSE" | jq -e '.title' > /dev/null 2>&1; then
    check_pass "Problem Details 'title' field present"
else
    check_fail "Problem Details 'title' field missing"
fi

if echo "$PROBLEM_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
    check_pass "Problem Details 'status' field present"
else
    check_fail "Problem Details 'status' field missing"
fi

echo ""

# ============================================================================
# 3. Tracing Headers (W3C Trace Context)
# ============================================================================
echo "🔗 3. Distributed Tracing"
echo "---"

# Check X-Request-Id propagation
if curl -s -I http://localhost:8000/health 2>/dev/null | grep -i "x-request-id:" > /dev/null; then
    check_pass "X-Request-Id header propagated"
else
    check_fail "X-Request-Id header missing"
fi

# Check traceparent support
TRACE_RESPONSE=$(curl -s -I -H "traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01" http://localhost:8000/health 2>/dev/null || echo "")

if echo "$TRACE_RESPONSE" | grep -i "traceparent:" > /dev/null; then
    check_pass "traceparent header propagated (W3C Trace Context)"
else
    check_warn "traceparent header not propagated (optional but recommended)"
fi

echo ""

# ============================================================================
# 4. Prometheus Metrics
# ============================================================================
echo "📊 4. Prometheus Metrics"
echo "---"

if curl -s http://localhost:9090/metrics > /dev/null 2>&1; then
    METRICS=$(curl -s http://localhost:9090/metrics 2>/dev/null || echo "")
    
    # Check counter naming (_total suffix)
    if echo "$METRICS" | grep -E "payment_init_total|notification_dispatch_total|refund_total" > /dev/null; then
        check_pass "Counter metrics use _total suffix"
    else
        check_fail "Counter metrics missing or incorrectly named"
    fi
    
    # Check duration naming (_seconds suffix)
    if echo "$METRICS" | grep -E "_latency_seconds|_duration_seconds" > /dev/null; then
        check_pass "Duration metrics use _seconds suffix"
    else
        check_fail "Duration metrics missing or incorrectly named"
    fi
    
    # Check histogram buckets
    if echo "$METRICS" | grep -E "_seconds_bucket" > /dev/null; then
        check_pass "Histogram metrics configured"
    else
        check_warn "Histogram metrics not found"
    fi
    
    # Check label cardinality (basic check)
    LABEL_COUNT=$(echo "$METRICS" | grep -E "payment_init_total" | wc -l)
    if [ "$LABEL_COUNT" -lt 50 ]; then
        check_pass "Label cardinality appears reasonable (<50 variants)"
    else
        check_warn "High label cardinality detected ($LABEL_COUNT variants)"
    fi
else
    check_fail "Prometheus metrics endpoint not reachable"
fi

echo ""

# ============================================================================
# 5. Kubernetes Configuration
# ============================================================================
echo "☸️  5. Kubernetes Runtime Hygiene"
echo "---"

if command -v kubectl > /dev/null 2>&1; then
    # Check if deployment exists
    if kubectl get deployment payment-api > /dev/null 2>&1; then
        
        # Check terminationGracePeriodSeconds
        GRACE_PERIOD=$(kubectl get deployment payment-api -o jsonpath='{.spec.template.spec.terminationGracePeriodSeconds}' 2>/dev/null || echo "0")
        if [ "$GRACE_PERIOD" -ge 30 ]; then
            check_pass "terminationGracePeriodSeconds >= 30s ($GRACE_PERIOD)"
        else
            check_fail "terminationGracePeriodSeconds too low ($GRACE_PERIOD, should be >= 30)"
        fi
        
        # Check preStop hook
        if kubectl get deployment payment-api -o json 2>/dev/null | jq -e '.spec.template.spec.containers[0].lifecycle.preStop' > /dev/null 2>&1; then
            check_pass "preStop hook configured"
        else
            check_warn "preStop hook not configured (recommended for graceful shutdown)"
        fi
        
        # Check liveness probe
        if kubectl get deployment payment-api -o json 2>/dev/null | jq -e '.spec.template.spec.containers[0].livenessProbe' > /dev/null 2>&1; then
            check_pass "Liveness probe configured"
            
            # Check failure threshold
            FAILURE_THRESHOLD=$(kubectl get deployment payment-api -o jsonpath='{.spec.template.spec.containers[0].livenessProbe.failureThreshold}' 2>/dev/null || echo "0")
            if [ "$FAILURE_THRESHOLD" -ge 3 ]; then
                check_pass "Liveness probe failureThreshold >= 3 ($FAILURE_THRESHOLD)"
            else
                check_warn "Liveness probe failureThreshold low ($FAILURE_THRESHOLD, recommended >= 3)"
            fi
        else
            check_fail "Liveness probe not configured"
        fi
        
        # Check readiness probe
        if kubectl get deployment payment-api -o json 2>/dev/null | jq -e '.spec.template.spec.containers[0].readinessProbe' > /dev/null 2>&1; then
            check_pass "Readiness probe configured"
        else
            check_fail "Readiness probe not configured"
        fi
    else
        check_warn "Deployment 'payment-api' not found (may not be deployed yet)"
    fi
else
    check_warn "kubectl not available - skipping Kubernetes checks"
fi

echo ""

# ============================================================================
# 6. MongoDB TTL Index
# ============================================================================
echo "🗄️  6. Data Lifecycle Management"
echo "---"

if command -v mongosh > /dev/null 2>&1; then
    # Check TTL index on notifications_outbox
    TTL_INDEX=$(mongosh --quiet --eval "db.notifications_outbox.getIndexes().filter(i => i.key.expireAt).length" 2>/dev/null || echo "0")
    
    if [ "$TTL_INDEX" -gt 0 ]; then
        check_pass "TTL index exists on notifications_outbox.expireAt"
        
        # Verify expireAfterSeconds is 0
        EXPIRE_AFTER=$(mongosh --quiet --eval "db.notifications_outbox.getIndexes().filter(i => i.key.expireAt)[0].expireAfterSeconds" 2>/dev/null || echo "-1")
        if [ "$EXPIRE_AFTER" -eq 0 ]; then
            check_pass "TTL expireAfterSeconds = 0 (expire at exact time)"
        else
            check_warn "TTL expireAfterSeconds = $EXPIRE_AFTER (expected 0)"
        fi
    else
        check_fail "TTL index missing on notifications_outbox"
    fi
    
    # Check refunds collection indexes
    REFUND_INDEXES=$(mongosh --quiet --eval "db.refunds.getIndexes().length" 2>/dev/null || echo "0")
    if [ "$REFUND_INDEXES" -ge 5 ]; then
        check_pass "Refunds collection has required indexes ($REFUND_INDEXES)"
    else
        check_fail "Refunds collection missing indexes (found $REFUND_INDEXES, expected >= 5)"
    fi
else
    check_warn "mongosh not available - skipping MongoDB checks"
fi

echo ""

# ============================================================================
# 7. Visibility Timeout & Stuck Reset
# ============================================================================
echo "⏱️  7. Outbox Durability"
echo "---"

if command -v kubectl > /dev/null 2>&1; then
    # Check stuck reset cronjob
    if kubectl get cronjob notification-stuck-reset > /dev/null 2>&1; then
        check_pass "Stuck reset cronjob exists"
        
        SCHEDULE=$(kubectl get cronjob notification-stuck-reset -o jsonpath='{.spec.schedule}' 2>/dev/null || echo "")
        check_pass "Stuck reset schedule: $SCHEDULE"
    else
        check_fail "Stuck reset cronjob not found"
    fi
    
    # Check reconciliation cronjob
    if kubectl get cronjob reconciliation-worker > /dev/null 2>&1; then
        check_pass "Reconciliation cronjob exists"
    else
        check_warn "Reconciliation cronjob not found"
    fi
else
    check_warn "kubectl not available - skipping cronjob checks"
fi

echo ""

# ============================================================================
# 8. Security Headers
# ============================================================================
echo "🔒 8. Security Headers"
echo "---"

if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
    HEADERS=$(curl -s -I http://localhost:8000/health 2>/dev/null || echo "")
    
    # Check HSTS (if HTTPS)
    if echo "$HEADERS" | grep -i "strict-transport-security:" > /dev/null; then
        check_pass "HSTS header present"
    else
        check_warn "HSTS header missing (required for HTTPS)"
    fi
    
    # Check X-Frame-Options
    if echo "$HEADERS" | grep -i "x-frame-options:" > /dev/null; then
        check_pass "X-Frame-Options header present"
    else
        check_fail "X-Frame-Options header missing"
    fi
    
    # Check X-Content-Type-Options
    if echo "$HEADERS" | grep -i "x-content-type-options:" > /dev/null; then
        check_pass "X-Content-Type-Options header present"
    else
        check_fail "X-Content-Type-Options header missing"
    fi
    
    # Check CSP
    if echo "$HEADERS" | grep -i "content-security-policy:" > /dev/null; then
        check_pass "Content-Security-Policy header present"
    else
        check_warn "Content-Security-Policy header missing (recommended)"
    fi
fi

echo ""

# ============================================================================
# 9. Environment Variables
# ============================================================================
echo "🔐 9. Environment Configuration"
echo "---"

# Check critical env vars (without exposing values)
check_env_var() {
    if [ -n "${!1}" ]; then
        check_pass "$1 is set"
    else
        check_fail "$1 is not set"
    fi
}

check_env_var "IYZICO_API_KEY"
check_env_var "IYZICO_SECRET_KEY"
check_env_var "PAYTR_MERCHANT_ID"
check_env_var "PAYTR_MERCHANT_KEY"
check_env_var "PAYTR_MERCHANT_SALT"
check_env_var "MONGODB_URI"
check_env_var "REDIS_URL"
check_env_var "JWT_SECRET"

echo ""

# ============================================================================
# 10. Database Migrations
# ============================================================================
echo "🗃️  10. Database Migrations"
echo "---"

if command -v mongosh > /dev/null 2>&1; then
    # Check if collections exist
    COLLECTIONS=$(mongosh --quiet --eval "db.getCollectionNames()" 2>/dev/null || echo "[]")
    
    if echo "$COLLECTIONS" | grep "payments" > /dev/null; then
        check_pass "payments collection exists"
    else
        check_fail "payments collection missing"
    fi
    
    if echo "$COLLECTIONS" | grep "payment_events" > /dev/null; then
        check_pass "payment_events collection exists"
    else
        check_fail "payment_events collection missing"
    fi
    
    if echo "$COLLECTIONS" | grep "refunds" > /dev/null; then
        check_pass "refunds collection exists"
    else
        check_fail "refunds collection missing"
    fi
    
    if echo "$COLLECTIONS" | grep "notifications_outbox" > /dev/null; then
        check_pass "notifications_outbox collection exists"
    else
        check_fail "notifications_outbox collection missing"
    fi
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo "=========================================="
echo "📋 Audit Summary"
echo "=========================================="
echo ""
echo "Total checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$((TOTAL_CHECKS - FAILED_CHECKS))${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - GO FOR LAUNCH! 🚀${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review docs/GO_LIVE_CHECKLIST.md"
    echo "  2. Update provider IP allowlists in Nginx"
    echo "  3. Run database migrations"
    echo "  4. Deploy to production"
    echo "  5. Monitor for 24-48 hours"
    exit 0
else
    echo -e "${RED}❌ $FAILED_CHECKS CHECK(S) FAILED - HOLD DEPLOYMENT${NC}"
    echo ""
    echo "Action required:"
    echo "  1. Fix failed checks above"
    echo "  2. Re-run this script"
    echo "  3. Review docs/GO_LIVE_CHECKLIST.md"
    exit 1
fi
