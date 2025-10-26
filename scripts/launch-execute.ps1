# scripts/launch-execute.ps1
# 
# 90-Saniye Launch Execution Script (PowerShell)
# Tüm adımları otomatik çalıştırır ve GO/NO-GO kararı verir

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Cyan "=========================================="
Write-ColorOutput Cyan "🚀 LAUNCH EXECUTION - 90 SANİYE"
Write-ColorOutput Cyan "=========================================="
Write-Output ""

# T-15: Roll Call
Write-ColorOutput Cyan "⏱️  T-15: ROLL CALL"
Write-Output "Captain, Driver, Scribe, Metrics, Infra, App, Security → Hazır mı?"
$rollCall = Read-Host "Tüm roller hazır mı? (y/n)"
if ($rollCall -ne "y") {
    Write-ColorOutput Red "❌ HOLD: Takım hazır değil"
    exit 1
}
Write-ColorOutput Green "✅ Takım hazır"
Write-Output ""

# T-12: Staging Audit
Write-ColorOutput Cyan "⏱️  T-12: STAGING AUDIT"
$stagingUrl = Read-Host "Staging URL (örn: https://staging-api.yourcompany.com)"
$env:BASE_URL = $stagingUrl

Write-Output "Staging audit çalıştırılıyor..."
& .\scripts\pre-launch-audit.ps1 -BaseUrl $stagingUrl
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "❌ HOLD: Staging audit başarısız"
    exit 1
}
Write-ColorOutput Green "✅ Staging audit başarılı"
Write-Output ""

# T-10: Image Digest
Write-ColorOutput Cyan "⏱️  T-10: IMAGE DIGEST"
$image = Read-Host "Image tag (örn: registry.yourco/vorte-api:2025-01-26.1)"

# crane veya regctl ile digest al
$digest = $null
if (Get-Command crane -ErrorAction SilentlyContinue) {
    $digest = crane digest $image
} elseif (Get-Command regctl -ErrorAction SilentlyContinue) {
    $digest = regctl image digest $image
} else {
    Write-ColorOutput Yellow "⚠️  crane veya regctl bulunamadı - manuel digest girin"
    $digest = Read-Host "Image digest (sha256:...)"
}

$fullImage = "$image@$digest"
Write-ColorOutput Green "✅ Image: $fullImage"
Write-Output ""

# T-8: Production Audit
Write-ColorOutput Cyan "⏱️  T-8: PRODUCTION AUDIT"
$prodUrl = Read-Host "Production URL (örn: https://api.yourcompany.com)"
$env:BASE_URL = $prodUrl

Write-Output "Production audit çalıştırılıyor..."
& .\scripts\pre-launch-audit.ps1 -BaseUrl $prodUrl
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "❌ HOLD: Production audit başarısız"
    exit 1
}
Write-ColorOutput Green "✅ Production audit başarılı"
Write-Output ""

# GO/NO-GO Decision
Write-ColorOutput Cyan "=========================================="
Write-ColorOutput Cyan "🎯 GO/NO-GO DECISION"
Write-ColorOutput Cyan "=========================================="
Write-Output ""
Write-Output "Tüm kriterler yeşil:"
Write-ColorOutput Green "✅ Staging audit: PASS"
Write-ColorOutput Green "✅ Production audit: PASS"
Write-ColorOutput Green "✅ Image digest: $digest"
Write-Output ""
$goDecision = Read-Host "🚀 LAUNCH için GO? (y/n)"

if ($goDecision -ne "y") {
    Write-ColorOutput Red "❌ HOLD: Launch iptal edildi"
    exit 1
}

Write-ColorOutput Green "🟢 GO FOR LAUNCH!"
Write-Output ""

# T-5: Deploy
Write-ColorOutput Cyan "⏱️  T-5: DEPLOY BAŞLIYOR"
$namespace = Read-Host "Kubernetes namespace (örn: production)"

$deployCmd = "kubectl -n $namespace set image deploy/vorte-api api=`"$fullImage`""
Write-Output $deployCmd
$runDeploy = Read-Host "Deploy komutunu çalıştır? (y/n)"

if ($runDeploy -eq "y") {
    kubectl -n $namespace set image deploy/vorte-api api="$fullImage"
    kubectl -n $namespace rollout status deploy/vorte-api -w
    Write-ColorOutput Green "✅ Deploy tamamlandı"
} else {
    Write-ColorOutput Yellow "⚠️  Deploy manuel olarak çalıştırılmalı:"
    Write-Output $deployCmd
}
Write-Output ""

# Monitoring Instructions
Write-ColorOutput Cyan "=========================================="
Write-ColorOutput Cyan "📊 MONİTORİNG TALİMATLARI"
Write-ColorOutput Cyan "=========================================="
Write-Output ""
Write-Output "Canary Progression:"
Write-Output "  T+5:  10% traffic → 5 dk izle"
Write-Output "  T+10: 50% traffic → 5 dk izle"
Write-Output "  T+15: 100% traffic → Sürekli izle"
Write-Output ""
Write-Output "Stop-the-Line Kriterleri:"
Write-Output "  ❌ P95 > 5s"
Write-Output "  ❌ Error > 5%"
Write-Output "  ❌ Payment Success < 90%"
Write-Output "  ❌ Alerts > 0"
Write-Output "  ❌ Webhook error artışı"
Write-Output ""
Write-Output "Rollback komutu (gerekirse):"
Write-Output "  kubectl -n $namespace rollout undo deploy/vorte-api"
Write-Output ""
Write-ColorOutput Green "🎉 LAUNCH BAŞARILI! Monitoring devam ediyor..."
