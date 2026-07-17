#!/usr/bin/env bash
# Install the Swagger Cursor plugin from this repo into the local Cursor
# instance for testing, without publishing to the marketplace.
#
# Cursor >= 2.6 auto-discovers plugins placed in ~/.cursor/plugins/local/<name>/
# (with .cursor-plugin/plugin.json inside). Re-run this script after every
# change to plugins/swagger, then restart Cursor or run "Developer: Reload
# Window".
#
# Usage: ./scripts/install-plugin-local.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_SRC="$REPO_ROOT/plugins/swagger"
TARGET="$HOME/.cursor/plugins/local/swagger"

[ -d "$PLUGIN_SRC" ] || { echo "Plugin source not found: $PLUGIN_SRC" >&2; exit 1; }

# Clean up the earlier all-products install, superseded by this plugin.
rm -rf "$HOME/.cursor/plugins/local/smartbear"

echo "Copying $PLUGIN_SRC -> $TARGET"
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -R "$PLUGIN_SRC"/. "$TARGET/"

echo
echo "Done. Now:"
echo "  1. Restart Cursor (Cmd+Q) or run 'Developer: Reload Window'."
echo "  2. Check Settings > Plugins: 'swagger' should be listed under Installed."
echo "  3. Type '/' in the agent chat: validate-api-contract, generate-api-tests,"
echo "     check-api-drift should appear."
echo "  4. First MCP tool call opens a browser window for SmartBear OAuth login."
