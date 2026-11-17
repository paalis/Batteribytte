#!/usr/bin/env bash
# Cuts the film (assets/journey2-720.mp4, 24 fps, 494 frames) into the image sequence journey.js scrubs:
# frames/720/000–493.webp for most screens, frames/540/ for phones and slow connections. Needs ffmpeg with libwebp.
set -euo pipefail
SRC=${1:-assets/journey2-720.mp4}
for size in 720 540; do
  rm -rf "frames/$size" && mkdir -p "frames/$size"
  scale=$([ "$size" = 720 ] && echo "720:1280" || echo "540:960")
  q=$([ "$size" = 720 ] && echo 50 || echo 55)
  ffmpeg -v error -i "$SRC" -vf "scale=$scale:flags=lanczos" -c:v libwebp -quality "$q" -compression_level 6 \
    -start_number 0 "frames/$size/%03d.webp"
done
ls frames/720 | wc -l
