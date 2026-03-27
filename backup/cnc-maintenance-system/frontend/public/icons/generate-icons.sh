#!/bin/bash
# Generate PWA icons from SVG source using ImageMagick
# Usage: ./generate-icons.sh
# Requires: ImageMagick (convert command)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SVG_SOURCE="$SCRIPT_DIR/icon-192x192.svg"

SIZES=(72 96 128 144 152 192 384 512)

for size in "${SIZES[@]}"; do
  echo "Generating icon-${size}x${size}.png..."
  convert -background none -resize "${size}x${size}" "$SVG_SOURCE" "$SCRIPT_DIR/icon-${size}x${size}.png"
done

echo "All icons generated successfully!"
echo "Icons created in: $SCRIPT_DIR"
