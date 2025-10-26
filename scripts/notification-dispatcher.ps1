# scripts/notification-dispatcher.ps1
# Notification Dispatcher Worker - Windows PowerShell Runner

param(
    [switch]$Watch = $false,
    [int]$IntervalSeconds = 60
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

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

function Run-Dispatcher {
    Write-Info "Starting notification dispatcher..."
    
    Push-Location "$ProjectRoot\apps\backend"
    
    try {
        python -m app.workers.notification_dispatcher
        
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Dispatcher completed successfully"
            return $true
        } else {
            Write-Error-Custom "Dispatcher failed with exit code $LASTEXITCODE"
            return $false
        }
    }
    catch {
        Write-Error-Custom "Dispatcher failed: $_"
        return $false
    }
    finally {
        Pop-Location
    }
}

# Main execution
if ($Watch) {
    Write-Info "Running dispatcher in watch mode (interval: ${IntervalSeconds}s)"
    Write-Info "Press Ctrl+C to stop"
    
    while ($true) {
        $success = Run-Dispatcher
        
        if (-not $success) {
            Write-Warn "Dispatcher failed, will retry in ${IntervalSeconds}s"
        }
        
        Start-Sleep -Seconds $IntervalSeconds
    }
}
else {
    $success = Run-Dispatcher
    
    if (-not $success) {
        exit 1
    }
}
