#!/bin/bash
# Convert KI-27.MOV to KI-27.mp4 per plan:
# - No sound (-an)
# - Compressed: H.264, CRF 30, 480x480, faststart
# - Crop from top so bottom is preserved: square crop keeping bottom, then scale to 480x480
# - No rotations (source frame as-is)
# Run from repo root. Requires ffmpeg on PATH.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/videos/KI-27.MOV"
DST="$ROOT/assets/videos/KI-27.mp4"

if [ ! -f "$SRC" ]; then
  echo "Source not found: $SRC" >&2
  exit 1
fi

# Crop to square keeping bottom; then scale to 480x480
ffmpeg -i "$SRC" \
  -vf 'crop=min(iw,ih):min(iw,ih):0:ih-min(iw,ih),scale=480:480' \
  -c:v libx264 -preset medium -crf 30 \
  -an \
  -movflags +faststart \
  -y "$DST"

echo "Output: $DST"
du -h "$DST" | cut -f1
