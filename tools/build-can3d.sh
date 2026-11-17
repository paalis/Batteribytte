#!/usr/bin/env bash
# Builds lib/can3d.js from src/can3d.js: three.js (pinned) tree-shaken and minified into one ES module.
# Run from the repo root. Needs Node; nothing is installed into the repo.
set -euo pipefail
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
( cd "$T" && npm init -y >/dev/null && npm i --no-audit --no-fund three@0.187.0 esbuild@0.25.10 >/dev/null )
NODE_PATH="$T/node_modules" "$T/node_modules/.bin/esbuild" src/can3d.js --bundle --format=esm --minify \
  --legal-comments=eof --target=es2020 --outfile=lib/can3d.js --log-level=warning \
  --alias:three="$T/node_modules/three"
ls -la lib/can3d.js
