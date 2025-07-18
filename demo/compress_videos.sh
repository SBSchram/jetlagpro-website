#!/bin/bash

# Video compression script for JetLagPro demo
# Target: MP4 with H.264, 480x480 resolution, < 2MB file size, 800kbps bitrate

VIDEO_DIR="assets/videos"
OUTPUT_DIR="assets/videos/compressed"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Compression settings
RESOLUTION="480:480"
BITRATE="800k"
CODEC="libx264"
PRESET="medium"
CRF="28"

echo "Starting video compression for JetLagPro demo..."

# Process each video file
for video in "$VIDEO_DIR"/*.mp4; do
    if [ -f "$video" ]; then
        filename=$(basename "$video")
        output_file="$OUTPUT_DIR/$filename"
        
        echo "Compressing $filename..."
        
        ffmpeg -i "$video" \
            -vf "scale=$RESOLUTION:force_original_aspect_ratio=decrease,pad=$RESOLUTION:(ow-iw)/2:(oh-ih)/2" \
            -c:v $CODEC \
            -preset $PRESET \
            -crf $CRF \
            -b:v $BITRATE \
            -maxrate $BITRATE \
            -bufsize 1600k \
            -c:a aac \
            -b:a 128k \
            -movflags +faststart \
            -y "$output_file"
        
        # Get file size
        size=$(du -h "$output_file" | cut -f1)
        echo "  Compressed: $filename -> $size"
    fi
done

echo "Video compression complete!"
echo "Compressed videos saved to: $OUTPUT_DIR" 