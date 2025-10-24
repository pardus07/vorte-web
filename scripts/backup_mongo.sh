#!/usr/bin/env bash
# MongoDB Backup Script for VORTE E-Commerce Platform
# Runs daily at 03:00, keeps 7 days of backups
# Usage: ./backup_mongo.sh

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
MONGO_CONTAINER="${MONGO_CONTAINER:-vorte-mongo}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASS="${MONGO_PASS:-}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="mongo-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    log "ERROR: $*" >&2
    exit 1
}

# Validate environment
if [ -z "$MONGO_PASS" ]; then
    error "MONGO_PASS environment variable is required"
fi

if ! docker ps | grep -q "$MONGO_CONTAINER"; then
    error "MongoDB container '$MONGO_CONTAINER' is not running"
fi

# Create backup directory
log "Creating backup directory: $BACKUP_PATH"
mkdir -p "$BACKUP_PATH" || error "Failed to create backup directory"

# Perform backup
log "Starting MongoDB backup..."
if docker exec "$MONGO_CONTAINER" mongodump \
    --username "$MONGO_USER" \
    --password "$MONGO_PASS" \
    --authenticationDatabase admin \
    --out "/data/backup/${BACKUP_NAME}" \
    --gzip \
    --oplog; then
    log "MongoDB dump completed successfully"
else
    error "MongoDB dump failed"
fi

# Copy backup from container to host
log "Copying backup from container to host..."
if docker cp "${MONGO_CONTAINER}:/data/backup/${BACKUP_NAME}" "$BACKUP_PATH"; then
    log "Backup copied successfully to $BACKUP_PATH"
else
    error "Failed to copy backup from container"
fi

# Clean up container backup
log "Cleaning up container backup..."
docker exec "$MONGO_CONTAINER" rm -rf "/data/backup/${BACKUP_NAME}" || \
    log "WARNING: Failed to clean up container backup"

# Compress backup
log "Compressing backup..."
cd "$BACKUP_DIR" || error "Failed to change to backup directory"
if tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"; then
    log "Backup compressed successfully"
    rm -rf "$BACKUP_NAME"
else
    error "Failed to compress backup"
fi

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
log "Backup size: $BACKUP_SIZE"

# Remove old backups
log "Removing backups older than $RETENTION_DAYS days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "mongo-*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete -print | wc -l)
log "Removed $DELETED_COUNT old backup(s)"

# List current backups
log "Current backups:"
find "$BACKUP_DIR" -maxdepth 1 -type f -name "mongo-*.tar.gz" -printf "%T+ %p\n" | sort -r

# Verify backup integrity
log "Verifying backup integrity..."
if tar -tzf "${BACKUP_NAME}.tar.gz" > /dev/null 2>&1; then
    log "Backup integrity verified successfully"
else
    error "Backup integrity check failed"
fi

# Optional: Upload to S3/Cloud Storage
if [ -n "${AWS_S3_BUCKET:-}" ]; then
    log "Uploading backup to S3..."
    if aws s3 cp "${BACKUP_NAME}.tar.gz" "s3://${AWS_S3_BUCKET}/mongodb-backups/" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256; then
        log "Backup uploaded to S3 successfully"
    else
        log "WARNING: Failed to upload backup to S3"
    fi
fi

# Send notification (optional)
if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ MongoDB backup completed: ${BACKUP_NAME} (${BACKUP_SIZE})\"}" \
        > /dev/null 2>&1 || log "WARNING: Failed to send Slack notification"
fi

log "Backup completed successfully: ${BACKUP_NAME}.tar.gz"
log "Total backups retained: $(find "$BACKUP_DIR" -maxdepth 1 -type f -name "mongo-*.tar.gz" | wc -l)"

exit 0
