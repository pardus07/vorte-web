#!/bin/bash
# scripts/notification-dispatcher.sh
# Notification Dispatcher Worker - Local/Docker Compose Runner

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in Docker Compose
if [ -f "/.dockerenv" ]; then
    log_info "Running in Docker container"
    PYTHON_CMD="python"
else
    log_info "Running locally"
    PYTHON_CMD="python3"
fi

# Change to project root
cd "$PROJECT_ROOT/apps/backend"

# Run dispatcher
log_info "Starting notification dispatcher..."
$PYTHON_CMD -m app.workers.notification_dispatcher

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    log_info "Dispatcher completed successfully"
else
    log_error "Dispatcher failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
