#!/usr/bin/env bash
set -euo pipefail

: "${MINIO_ENDPOINT:=http://localhost:9000}"
: "${MINIO_ROOT_USER:?MINIO_ROOT_USER required}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD required}"
: "${AVATAR_BUCKET:=avatars}"
: "${CORS_FILE:=infra/minio/cors.json}"

# mc alias
mc alias set vorte "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

# bucket create (idempotent)
mc mb --ignore-existing "vorte/${AVATAR_BUCKET}"

# CORS uygula
mc admin bucket cors set vorte/"${AVATAR_BUCKET}" "${CORS_FILE}"

# Anonim indirmeyi aç (public read); istersen "none" yapabilirsin
mc anonymous set download "vorte/${AVATAR_BUCKET}"

echo "OK: bucket=${AVATAR_BUCKET}, cors set, anonymous=download"
