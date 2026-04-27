#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.runtime"
PID_FILE="$RUN_DIR/dev.pid"
LOG_FILE="$RUN_DIR/dev.log"
PORT="${PORT:-5173}"
HOST="${HOST:-127.0.0.1}"

mkdir -p "$RUN_DIR"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "lofiBoard dev server is already running: http://$HOST:$PORT"
  exit 0
fi

cd "$ROOT_DIR"
nohup npm run dev -- --host "$HOST" --port "$PORT" >"$LOG_FILE" 2>&1 &
echo "$!" >"$PID_FILE"
echo "lofiBoard dev server started: http://$HOST:$PORT"
