#!/bin/bash
# scripts/launch-execute.sh
# 
# 90-Saniye Launch Execution Script
# Tüm adımları otomatik çalıştırır ve GO/NO-GO kararı verir

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "🚀 LAUNCH EXECUTION - 90 SANİYE"
echo -e "==========================================${NC}"
echo ""

# T-15: Roll Call
echo -e "${BLUE}⏱️  T-15: ROLL CALL${NC}"
echo "Captain, Driver, Scribe, Metrics, Infra, App, Security → Hazır mı?"
read -p "Tüm roller hazır mı? (y/n): " ROLL_CALL
if [ "$ROLL_CALL" != "y" ]; then
    echo -e "${RED}❌ HOLD: Takım hazır değil${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Takım hazır${NC}"
echo ""

# T-12: Staging Audit
echo -e "${BLUE}⏱️  T-12: STAGING AUDIT${NC}"
read -p "Staging URL (örn: https://staging-api.yourcompany.com): " STAGING_URL
export BASE_URL="$STAGING_URL"

if ./scripts/pre-launch-audit.sh "$BASE_URL"; then
    echo -e "${GREEN}✅ Staging audit başarılı${NC}"
else
    echo -e "${RED}❌ HOLD: Staging audit başarısız${NC}"
    exit 1
fi
echo ""

# T-10: Image Digest
echo -e "${BLUE}⏱️  T-10: IMAGE DIGEST${NC}"
read -p "Image tag (örn: registry.yourco/vorte-api:2025-01-26.1): " IMAGE

# crane veya regctl ile digest al
if command -v crane > /dev/null 2>&1; then
    DIGEST=$(crane digest "$IMAGE")
elif command -v regctl > /dev/null 2>&1; then
    DIGEST=$(regctl image digest "$IMAGE")
else
    echo -e "${YELLOW}⚠️  crane veya regctl bulunamadı - manuel digest girin${NC}"
    read -p "Image digest (sha256:...): " DIGEST
fi

FULL_IMAGE="$IMAGE@$DIGEST"
echo -e "${GREEN}✅ Image: $FULL_IMAGE${NC}"
echo ""

# T-8: Production Audit
echo -e "${BLUE}⏱️  T-8: PRODUCTION AUDIT${NC}"
read -p "Production URL (örn: https://api.yourcompany.com): " PROD_URL
export BASE_URL="$PROD_URL"

if ./scripts/pre-launch-audit.sh "$BASE_URL"; then
    echo -e "${GREEN}✅ Production audit başarılı${NC}"
else
    echo -e "${RED}❌ HOLD: Production audit başarısız${NC}"
    exit 1
fi
echo ""

# GO/NO-GO Decision
echo -e "${BLUE}=========================================="
echo "🎯 GO/NO-GO DECISION"
echo -e "==========================================${NC}"
echo ""
echo "Tüm kriterler yeşil:"
echo -e "${GREEN}✅ Staging audit: PASS${NC}"
echo -e "${GREEN}✅ Production audit: PASS${NC}"
echo -e "${GREEN}✅ Image digest: $DIGEST${NC}"
echo ""
read -p "🚀 LAUNCH için GO? (y/n): " GO_DECISION

if [ "$GO_DECISION" != "y" ]; then
    echo -e "${RED}❌ HOLD: Launch iptal edildi${NC}"
    exit 1
fi

echo -e "${GREEN}🟢 GO FOR LAUNCH!${NC}"
echo ""

# T-5: Deploy
echo -e "${BLUE}⏱️  T-5: DEPLOY BAŞLIYOR${NC}"
read -p "Kubernetes namespace (örn: production): " NS

echo "kubectl -n $NS set image deploy/vorte-api api=\"$FULL_IMAGE\""
read -p "Deploy komutunu çalıştır? (y/n): " RUN_DEPLOY

if [ "$RUN_DEPLOY" = "y" ]; then
    kubectl -n "$NS" set image deploy/vorte-api api="$FULL_IMAGE"
    kubectl -n "$NS" rollout status deploy/vorte-api -w
    echo -e "${GREEN}✅ Deploy tamamlandı${NC}"
else
    echo -e "${YELLOW}⚠️  Deploy manuel olarak çalıştırılmalı:${NC}"
    echo "kubectl -n $NS set image deploy/vorte-api api=\"$FULL_IMAGE\""
fi
echo ""

# Monitoring Instructions
echo -e "${BLUE}=========================================="
echo "📊 MONİTORİNG TALİMATLARI"
echo -e "==========================================${NC}"
echo ""
echo "Canary Progression:"
echo "  T+5:  10% traffic → 5 dk izle"
echo "  T+10: 50% traffic → 5 dk izle"
echo "  T+15: 100% traffic → Sürekli izle"
echo ""
echo "Stop-the-Line Kriterleri:"
echo "  ❌ P95 > 5s"
echo "  ❌ Error > 5%"
echo "  ❌ Payment Success < 90%"
echo "  ❌ Alerts > 0"
echo "  ❌ Webhook error artışı"
echo ""
echo "Rollback komutu (gerekirse):"
echo "  kubectl -n $NS rollout undo deploy/vorte-api"
echo ""
echo -e "${GREEN}🎉 LAUNCH BAŞARILI! Monitoring devam ediyor...${NC}"
