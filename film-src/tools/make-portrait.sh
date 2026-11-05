#!/bin/sh
# Builds the 9:16 version of the film next to this one (../../film-src-v), from the same index.html.
set -eu
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DST="$SRC/../film-src-v"
mkdir -p "$DST"
cp -R "$SRC/vendor" "$SRC/assets" "$DST/"
sed -e 's/"id":"portrait","type":"boolean","label":"Stående format (9:16)","default":false/"id":"portrait","type":"boolean","label":"Stående format (9:16)","default":true/' \
    -e 's/data-width="1920" data-height="1080"/data-width="1080" data-height="1920"/' \
    -e 's/#film { position: relative; width: 1920px; height: 1080px;/#film { position: relative; width: 1080px; height: 1920px;/' \
    -e 's/.type .l2, .type .l3 { font-size: 230px;/.type .l2, .type .l3 { font-size: 168px;/' \
    -e 's/.type .l1 { font-size: 84px;/.type .l1 { font-size: 60px;/' \
    "$SRC/index.html" > "$DST/index.html"
echo "$DST"
