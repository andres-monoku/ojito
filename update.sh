#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  Updating Ojito..."

cd "$SCRIPT_DIR"
git pull 2>/dev/null || true

cd server && npm install --silent

# Re-generate command
bash "$SCRIPT_DIR/install.sh"
