#!/bin/sh
# Seed görselleri kalıcı uploads volume'a kopyala (ilk çalışmada)
SEED_DIR="/app/seed-images"
TARGET_DIR="/app/public/uploads/images"
MARKER="/app/public/uploads/.images-migrated"

if [ -d "$SEED_DIR" ] && [ ! -f "$MARKER" ]; then
  echo "[entrypoint] Seed görseller uploads volume'a kopyalanıyor..."
  mkdir -p "$TARGET_DIR"
  cp -r "$SEED_DIR"/* "$TARGET_DIR/" 2>/dev/null || true
  touch "$MARKER"
  COUNT=$(ls "$TARGET_DIR" 2>/dev/null | wc -l)
  echo "[entrypoint] Migrasyon tamamlandı: $COUNT görsel"
fi

exec node server.js
