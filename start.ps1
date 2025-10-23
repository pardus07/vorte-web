# VORTE E-Ticaret - Başlangıç Scripti
# Windows PowerShell için

Write-Host "🚀 VORTE E-Ticaret başlatılıyor..." -ForegroundColor Green
Write-Host ""

# Docker kontrolü
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker bulunamadı. Lütfen Docker Desktop'ı yükleyin." -ForegroundColor Red
    exit 1
}

# Docker Compose kontrolü
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose bulunamadı." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Docker kontrolleri tamamlandı" -ForegroundColor Green

# .env dosyası kontrolü
if (-not (Test-Path "apps/backend/.env")) {
    Write-Host "⚠️  .env dosyası bulunamadı, .env.example'dan kopyalanıyor..." -ForegroundColor Yellow
    Copy-Item "apps/backend/.env.example" "apps/backend/.env"
    Write-Host "✓ .env dosyası oluşturuldu" -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 Docker servisleri başlatılıyor..." -ForegroundColor Cyan
Write-Host ""

# Docker Compose ile servisleri başlat
docker compose -f infra/docker/docker-compose.yml up --build

# Ctrl+C ile durdurulduğunda
Write-Host ""
Write-Host "👋 VORTE E-Ticaret durduruldu." -ForegroundColor Yellow
