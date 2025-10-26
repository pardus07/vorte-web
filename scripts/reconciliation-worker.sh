#!/bin/bash
# Reconciliation Worker Management Script
# Usage: ./scripts/reconciliation-worker.sh [start|stop|restart|logs|status|run-once]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose is not installed"
    exit 1
fi

cd "$PROJECT_ROOT"

case "${1:-}" in
    start)
        log_info "Starting reconciliation worker..."
        docker-compose up -d reconciliation-worker
        log_info "Reconciliation worker started"
        ;;
    
    stop)
        log_info "Stopping reconciliation worker..."
        docker-compose stop reconciliation-worker
        log_info "Reconciliation worker stopped"
        ;;
    
    restart)
        log_info "Restarting reconciliation worker..."
        docker-compose restart reconciliation-worker
        log_info "Reconciliation worker restarted"
        ;;
    
    logs)
        log_info "Showing reconciliation worker logs (Ctrl+C to exit)..."
        docker-compose logs -f reconciliation-worker
        ;;
    
    status)
        log_info "Checking reconciliation worker status..."
        docker-compose ps reconciliation-worker
        ;;
    
    run-once)
        log_info "Running reconciliation worker once..."
        docker-compose exec reconciliation-worker python -m app.workers.reconciliation
        log_info "Reconciliation completed"
        ;;
    
    *)
        echo "Usage: $0 {start|stop|restart|logs|status|run-once}"
        echo ""
        echo "Commands:"
        echo "  start     - Start the reconciliation worker"
        echo "  stop      - Stop the reconciliation worker"
        echo "  restart   - Restart the reconciliation worker"
        echo "  logs      - Show reconciliation worker logs (follow mode)"
        echo "  status    - Show reconciliation worker status"
        echo "  run-once  - Manually trigger a single reconciliation run"
        exit 1
        ;;
esac
