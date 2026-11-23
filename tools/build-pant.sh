#!/usr/bin/env bash
# Builds the page's scripts into lib/pant/: main.js (small, loads first) and, split out and loaded on demand,
# world.js (three.js, tree-shaken: only what src/pant/world.js imports) and lite.js. Run from the repo root.
set -euo pipefail
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
( cd "$T" && npm init -y >/dev/null && npm i --no-audit --no-fund three@0.187.0 esbuild@0.25.10 >/dev/null )
rm -rf lib/pant
# every file under assets/ with the first 10 hex of its sha256: src/pant/av.js puts it on the URL (?v=…)
AV=$(find assets -type f ! -name '*.md' ! -path '*/_candidates/*' -print0 | sort -z | xargs -0 sha256sum | \
  awk 'BEGIN{printf "{"} {printf "%s\"%s\":\"%s\"", (NR>1?",":""), $2, substr($1,1,10)} END{printf "}"}')
NODE_PATH="$T/node_modules" "$T/node_modules/.bin/esbuild" src/pant/main.js --bundle --splitting --format=esm --minify \
  --legal-comments=eof --target=es2020 --outdir=lib/pant --chunk-names='[name]-[hash]' --log-level=warning \
  --alias:three="$T/node_modules/three" --define:ASSET_V="$AV"
ls -la lib/pant
# index.html asks for main.js with its content hash, so a phone that cached an older main.js (lib/ is cached for a
# day, and served stale for a week after) fetches the new one as soon as the page itself is new
V=$(sha256sum lib/pant/main.js | cut -c1-10)
sed -i -E "s#lib/pant/main\.js(\?v=[0-9a-f]+)?#lib/pant/main.js?v=$V#g" index.html
grep -n "lib/pant/main.js" index.html
# the same for the assets index.html names itself (the first still, the AR files, the share image)
for p in assets/pant/stills/start.webp assets/can/battery-can.usdz assets/battery-fresh.webp assets/og.jpg; do
  H=$(sha256sum "$p" | cut -c1-10)
  sed -i -E "s#${p//./\\.}(\?v=[0-9a-f]+)?#$p?v=$H#g" index.html
done
grep -n "?v=" index.html
