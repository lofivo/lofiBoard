#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.runtime/dev.pid"
PGID_FILE="$ROOT_DIR/.runtime/dev.pgid"
PORT="${PORT:-5173}"

stopped=0

if [[ -f "$PGID_FILE" ]]; then
  PGID="$(cat "$PGID_FILE")"
  if [[ -n "$PGID" ]] && kill -0 "-$PGID" 2>/dev/null; then
    kill "-$PGID" 2>/dev/null || true
    stopped=1
  fi
fi

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE")"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    stopped=1
  fi
fi

FALLBACK_PIDS="$(pgrep -f "$ROOT_DIR/node_modules/.bin/vite --host .* --port $PORT" || true)"
if [[ -n "$FALLBACK_PIDS" ]]; then
  while read -r vite_pid; do
    [[ -z "$vite_pid" ]] && continue
    kill "$vite_pid" 2>/dev/null || true
    stopped=1
  done <<< "$FALLBACK_PIDS"
fi

rm -f "$PID_FILE" "$PGID_FILE"

if [[ "$stopped" -eq 1 ]]; then
  rm -f "$PID_FILE" "$PGID_FILE"
  echo "Stopped lofiBoard dev server."
else
  rm -f "$PID_FILE" "$PGID_FILE"
  echo "lofiBoard dev server is not running."
fi
