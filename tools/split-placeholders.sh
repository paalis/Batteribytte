#!/bin/sh
# Cuts the placeholder render (film-clips/out/*.mp4, 12 s, made with `om render film-clips`) into the four clips
# and packs each with make-sequence.sh. The real clips replace these: see ASSETS.md.
#   idle 0–4   charge 4–7   open 7–10   drain 10–12
set -eu
cd "$(dirname "$0")/.."
SRC=${1:-$(ls -t film-clips/out/*.mp4 | head -1)}
TMP=$(mktemp -d)
cut() { ffmpeg -loglevel error -y -ss "$2" -i "$SRC" -t "$3" -an -c:v libx264 -crf 14 -preset fast "$TMP/$1.mp4"; }
cut idle 0 4; cut charge 4 3; cut open 7 3; cut drain 10 2
for n in idle charge open drain; do tools/make-sequence.sh "$TMP/$n.mp4" "$n" assets/clips 90; done
rm -rf "$TMP"
du -sh assets/clips
