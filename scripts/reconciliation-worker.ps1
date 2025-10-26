# Reconciliation Worker Management Script (PowerShell)
# Usage: .\scripts\reconciliation-worker.ps1 [start|stop|restart|logs|status|run-once]

param(
    [Parameter(Position=0)]
    [ValidateSet('start', 'stop', 'restart', 'logs', 'status', 'run-once')]
    [string]$Command
)

$ErrorActionPreference = "Stop"

# Get project root directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Function to print colored messages
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if docker-compose is available
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Error-Custom "docker-compose is not installed"
    exit 1
}

# Change to project root
Set-Location $ProjectRoot

switch ($Command) {
    'start' {
        Write-Info "Starting reconciliation worker..."
        docker-compose up -d reconciliation-worker
        Write-Info "Reconciliation worker started"
    }
    
    'stop' {
        Write-Info "Stopping reconciliation worker..."
        docker-compose stop reconciliation-worker
        Write-Info "Reconciliation worker stopped"
    }
    
    'restart' {
        Write-Info "Restarting reconciliation worker..."
        docker-compose restart reconciliation-worker
        Write-Info "Reconciliation worker restarted"
    }
    
    'logs' {
        Write-Info "Showing reconciliation worker logs (Ctrl+C to exit)..."
        docker-compose logs -f reconciliation-worker
    }
    
    'status' {
        Write-Info "Checking reconciliation worker status..."
        docker-compose ps reconciliation-worker
    }
    
    'run-once' {
        Write-Info "Running reconciliation worker once..."
        docker-compose exec reconciliation-worker python -m app.workers.reconciliation
        Write-Info "Reconciliation completed"
    }
    
    default {
        Write-Host "Usage: .\scripts\reconciliation-worker.ps1 {start|stop|restart|logs|status|run-once}"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  start     - Start the reconciliation worker"
        Write-Host "  stop      - Stop the reconciliation worker"
        Write-Host "  restart   - Restart the reconciliation worker"
        Write-Host "  logs      - Show reconciliation worker logs (follow mode)"
        Write-Host "  status    - Show reconciliation worker status"
        Write-Host "  run-once  - Manually trigger a single reconciliation run"
        exit 1
    }
}
