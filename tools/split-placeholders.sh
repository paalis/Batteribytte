#!/bin/sh
# Cuts the placeholder render (film-clips/out/*.mp4, 14 s, made with `om render film-clips`) into the four clips
# and packs each with make-sequence.sh. The real clips replace these: see ASSETS.md.
#   idle 0–4   charge 4–8   open 8–12   drain 12–14
set -eu
cd "$(dirname "$0")/.."
SRC=${1:-$(ls -t film-clips/out/*.mp4 | head -1)}
TMP=$(mktemp -d)
cut() { ffmpeg -loglevel error -y -ss "$2" -i "$SRC" -t "$3" -an -c:v libx264 -crf 14 -preset fast "$TMP/$1.mp4"; }
cut idle 0 4; cut charge 4 4; cut open 8 4; cut drain 12 2
for n in idle charge open drain; do tools/make-sequence.sh "$TMP/$n.mp4" "$n" assets/clips 120; done
rm -rf "$TMP"
du -sh assets/clips
