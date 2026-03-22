#!/bin/bash
set -e

# Kill ojito server if running
kill $(lsof -ti:3131) 2>/dev/null || true

# Remove command
rm -f ~/.claude/commands/ojito.md

echo ""
echo "  ✓ Ojito desinstalado"
echo "    Para eliminar completamente: rm -rf ~/Documents/ojito"
echo ""
