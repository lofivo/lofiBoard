#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.runtime/preview.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "lofiBoard preview is not running."
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Stopped lofiBoard preview."
else
  echo "lofiBoard preview process was not running."
fi

rm -f "$PID_FILE"
