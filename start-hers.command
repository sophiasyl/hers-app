#!/bin/bash
# Double-click this file (or run it in Terminal) to start the Hers. app.
# It serves the app at http://localhost:8082 for as long as this window stays open.
cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:$PATH"
echo ""
echo "  Starting Hers. …"
echo "  Once it's ready, open:  http://localhost:8082"
echo "  (Keep this window open. Press Ctrl+C to stop.)"
echo ""
exec node node_modules/expo/bin/cli start --web --port 8082
