#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/lofibrd/dist}"

cd "$ROOT_DIR"
npm run build
mkdir -p "$DEPLOY_DIR"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$ROOT_DIR/dist/" "$DEPLOY_DIR/"
else
  find "$DEPLOY_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a "$ROOT_DIR/dist/." "$DEPLOY_DIR/"
fi
echo "lofiBoard static files deployed to: $DEPLOY_DIR"
