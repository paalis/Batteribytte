#!/usr/bin/env bash
# Builds the page's scripts into lib/pant/: main.js (small, loads first) and, split out and loaded on demand,
# world.js (three.js, tree-shaken: only what src/pant/world.js imports) and lite.js. Run from the repo root.
set -euo pipefail
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
( cd "$T" && npm init -y >/dev/null && npm i --no-audit --no-fund three@0.187.0 esbuild@0.25.10 >/dev/null )
rm -rf lib/pant
NODE_PATH="$T/node_modules" "$T/node_modules/.bin/esbuild" src/pant/main.js --bundle --splitting --format=esm --minify \
  --legal-comments=eof --target=es2020 --outdir=lib/pant --chunk-names='[name]-[hash]' --log-level=warning \
  --alias:three="$T/node_modules/three"
ls -la lib/pant
