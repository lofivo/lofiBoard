#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.runtime/dev.pid"
PGID_FILE="$ROOT_DIR/.runtime/dev.pgid"
PORT="${PORT:-5173}"

stopped=0

terminate_pid() {
  local pid="$1"
  [[ -z "$pid" ]] && return
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    stopped=1
  fi
}

terminate_pgid() {
  local pgid="$1"
  local current_pgid
  [[ -z "$pgid" ]] && return
  current_pgid="$(ps -o pgid= -p "$$" 2>/dev/null | tr -d '[:space:]' || true)"
  if [[ "$pgid" != "$current_pgid" ]] && kill -0 "-$pgid" 2>/dev/null; then
    kill "-$pgid" 2>/dev/null || true
    stopped=1
  fi
}

terminate_matching_port_processes() {
  local pid cwd args
  command -v lsof >/dev/null 2>&1 || return
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    args="$(ps -o args= -p "$pid" 2>/dev/null || true)"
    if [[ "$cwd" == "$ROOT_DIR" || "$args" == *"$ROOT_DIR"* ]]; then
      terminate_pid "$pid"
    fi
  done < <(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
}

if [[ -f "$PGID_FILE" ]]; then
  terminate_pgid "$(cat "$PGID_FILE" 2>/dev/null || true)"
fi

if [[ -f "$PID_FILE" ]]; then
  terminate_pid "$(cat "$PID_FILE" 2>/dev/null || true)"
fi

sleep 0.3
terminate_matching_port_processes

rm -f "$PID_FILE" "$PGID_FILE"
if [[ "$stopped" -eq 1 ]]; then
  echo "Stopped lofiBoard dev server."
else
  echo "lofiBoard dev server is not running."
fi
