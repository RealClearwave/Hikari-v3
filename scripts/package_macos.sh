#!/usr/bin/env bash
set -euo pipefail

# Packaging script for macOS.
# Produces a clean release tar.gz for deployment.

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[ERROR] This script is for macOS only."
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$PROJECT_DIR/release"
TS="$(date +%Y%m%d_%H%M%S)"
PKG_NAME="ojv3_nextjs_${TS}"
STAGE_DIR="$RELEASE_DIR/$PKG_NAME"
ARCHIVE_PATH="$RELEASE_DIR/${PKG_NAME}.tar.gz"

mkdir -p "$RELEASE_DIR"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

cd "$PROJECT_DIR"

echo "[1/3] Collecting files..."
rsync -a \
  --exclude ".git" \
  --exclude ".next" \
  --exclude "node_modules" \
  --exclude "release" \
  --exclude "logs" \
  --exclude ".run" \
  --exclude "*.log" \
  --exclude ".DS_Store" \
  ./ "$STAGE_DIR/"

echo "[2/3] Creating archive..."
cd "$RELEASE_DIR"
tar -czf "$ARCHIVE_PATH" "$PKG_NAME"

echo "[3/3] Cleaning stage directory..."
rm -rf "$STAGE_DIR"

echo "[DONE] Package created: $ARCHIVE_PATH"
echo "[NEXT] Transfer it to Linux server, extract, then run scripts/deploy_linux.sh"
