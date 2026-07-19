#!/bin/bash
# Double-click this file to run the Hers app locally.
# It serves the built app at http://localhost:8082 and opens it in your browser.
# Keep this Terminal window open while using the app; close it to stop.
cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:$PATH"
( sleep 1; open "http://localhost:8082" ) &
echo "Starting Hers…  (leave this window open; close it to stop)"
node serve.mjs
