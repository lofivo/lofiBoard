#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.runtime"
PID_FILE="$RUN_DIR/preview.pid"
PGID_FILE="$RUN_DIR/preview.pgid"
LOG_FILE="$RUN_DIR/preview.log"
PORT="${PORT:-4173}"
HOST="${HOST:-127.0.0.1}"

mkdir -p "$RUN_DIR"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "lofiBoard preview is already running: http://$HOST:$PORT"
    exit 0
  fi
  rm -f "$PID_FILE" "$PGID_FILE"
fi

cd "$ROOT_DIR"
npm install --prefer-offline --no-audit --no-fund
npm run build
if command -v setsid >/dev/null 2>&1; then
  nohup setsid npm run preview -- --host "$HOST" --port "$PORT" >"$LOG_FILE" 2>&1 &
else
  nohup npm run preview -- --host "$HOST" --port "$PORT" >"$LOG_FILE" 2>&1 &
fi
echo "$!" >"$PID_FILE"
PGID="$(ps -o pgid= -p "$!" 2>/dev/null | tr -d '[:space:]' || true)"
if [[ -n "$PGID" ]]; then
  echo "$PGID" >"$PGID_FILE"
fi
echo "lofiBoard preview started: http://$HOST:$PORT"
