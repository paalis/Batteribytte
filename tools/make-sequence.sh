#!/bin/sh
# Pack one clip for the page (see ASSETS.md).
#
#   tools/make-sequence.sh <clip> <name> [outdir] [frames]
#
#   <clip>    the source video (any format ffmpeg reads; sound is dropped)
#   <name>    idle | charge | open | drain
#   [outdir]  where the files go (default: assets/clips)
#   [frames]  only for «charge»: frames in the WebP sequence (default 90, use 60–120)
#
# Every clip becomes a 720×1280 H.264 video without sound, plus a WebP poster of its first and last frame.
# «charge» is scrubbed, so it also becomes
#   - a WebP sequence (charge/000.webp …), drawn on <canvas> on phones (iOS Safari scrubs video badly), and
#   - a video with a key frame on every frame (-g 1), for exact seeking on desktop.
# Then update clips.json (count, sizes) if anything changed — the page reads everything from there.
set -eu

IN=${1:?clip}; NAME=${2:?name: idle|charge|open|drain}; OUT=${3:-assets/clips}; N=${4:-90}
W=720; H=1280
mkdir -p "$OUT"
FIT="scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,setsar=1"

# the plain clip (played, not scrubbed): H.264, no sound, fast start; aim for 2–4 MB (raise -crf if it is bigger)
if [ "$NAME" != charge ]; then
  ffmpeg -loglevel error -y -i "$IN" -an -vf "$FIT" -c:v libx264 -profile:v high -pix_fmt yuv420p \
    -crf 23 -preset slow -g 30 -movflags +faststart "$OUT/$NAME.mp4"
fi

# posters: first and last frame (shown before the video has data, and with reduced motion)
ffmpeg -loglevel error -y -i "$IN" -vf "$FIT" -frames:v 1 -c:v libwebp -quality 80 "$OUT/$NAME-first.webp"
ffmpeg -loglevel error -y -sseof -0.1 -i "$IN" -vf "$FIT" -frames:v 1 -update 1 -c:v libwebp -quality 80 "$OUT/$NAME-last.webp"

if [ "$NAME" = charge ]; then
  # exactly N frames spread evenly over the clip: frame i is level 6 + 94·i/(N−1) on the page's meter
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
  FPS=$(echo "$N / $DUR" | bc -l)
  rm -rf "$OUT/charge"; mkdir -p "$OUT/charge"
  ffmpeg -loglevel error -y -i "$IN" -vf "fps=$FPS,$FIT" -frames:v "$N" -start_number 0 \
    -c:v libwebp -quality 72 -compression_level 6 "$OUT/charge/%03d.webp"
  # desktop: every frame a key frame, so currentTime lands exactly and fast
  ffmpeg -loglevel error -y -i "$IN" -an -vf "fps=$FPS,$FIT" -frames:v "$N" -c:v libx264 -profile:v high -pix_fmt yuv420p \
    -crf 24 -preset slow -g 1 -keyint_min 1 -sc_threshold 0 -movflags +faststart "$OUT/charge-scrub.mp4"
  echo "charge: $(ls "$OUT/charge" | wc -l) frames, $(du -sh "$OUT/charge" | cut -f1) sequence, $(du -h "$OUT/charge-scrub.mp4" | cut -f1) scrub video"
fi
[ "$NAME" = charge ] || echo "$NAME: $(du -h "$OUT/$NAME.mp4" | cut -f1) video → $OUT"
