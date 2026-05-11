#!/usr/bin/env bash
set -euo pipefail

# One-click deploy for Linux:
# 1) install dependencies
# 2) optionally initialize database
# 3) build app
# 4) start app in background and write PID

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
RUN_DIR="$PROJECT_DIR/.run"
PID_FILE="$RUN_DIR/ojv3.pid"
LOG_FILE="$LOG_DIR/ojv3.log"
INIT_DB=true

if [[ "${1:-}" == "--skip-db" ]]; then
  INIT_DB=false
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "[ERROR] This script is for Linux only."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] node is required (recommend Node.js 20+)."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm is required."
  exit 1
fi

mkdir -p "$LOG_DIR" "$RUN_DIR"
cd "$PROJECT_DIR"

echo "[1/5] Checking env file..."
if [[ ! -f .env.local ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env.local
    echo "[WARN] .env.local not found. Copied from .env.example."
    echo "[WARN] Please edit .env.local with real DB and JWT config, then re-run."
    exit 1
  else
    echo "[ERROR] .env.local and .env.example are both missing."
    exit 1
  fi
fi

echo "[2/5] Installing dependencies..."
# Skip Puppeteer browser download on server deploy.
export PUPPETEER_SKIP_DOWNLOAD=1

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

if [[ "$INIT_DB" == "true" ]]; then
  echo "[3/5] Initializing database and sample files..."

  # shellcheck disable=SC1091
  source .env.local

  DB_PATH="${DB_PATH:-./data/ojv3.db}"
  DB_DIR="$(dirname "$DB_PATH")"
  mkdir -p "$DB_DIR"

  # Initialize SQLite database using sqlite3 CLI
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_PATH" < scripts/init.sql
    sqlite3 "$DB_PATH" < scripts/seed.sql
    if [[ -f scripts/migrate_ai.sql ]]; then
      sqlite3 "$DB_PATH" < scripts/migrate_ai.sql
    fi
    echo "[INFO] SQLite database initialized at $DB_PATH"
  else
    echo "[WARN] sqlite3 CLI not found, creating empty database."
    echo "[HINT] Run: node -e \"require('better-sqlite3')('./data/ojv3.db')\""
  fi

  bash scripts/seed_sample_files.sh
else
  echo "[3/5] Skipping database initialization (--skip-db)."
fi

echo "[4/5] Building app..."
npm run build

echo "[5/5] Starting app..."
if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" || true)"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" >/dev/null 2>&1; then
    echo "[INFO] Stopping old process: $OLD_PID"
    kill "$OLD_PID" || true
    sleep 1
  fi
fi

nohup npm run start >> "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

echo "[DONE] OJv3 Next.js deployed successfully."
echo "[INFO] PID: $NEW_PID"
echo "[INFO] Log: $LOG_FILE"
echo "[INFO] Visit: http://<your-server-ip>:3000"
