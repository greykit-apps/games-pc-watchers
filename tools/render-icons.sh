#!/bin/sh
# Render the favicons, the apple-touch icon and the social card from
# icon.svg and tools/og.svg. Needs rsvg-convert (librsvg) and python3 with
# Pillow for the .ico. Run from the repo root; commit the outputs
# (games-meta STANDARD.md §9). Nothing rasterises at deploy time.
set -e
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
rsvg-convert -w 16 -h 16 icon.svg -o favicon-16x16.png
rsvg-convert -w 32 -h 32 icon.svg -o favicon-32x32.png
rsvg-convert -w 180 -h 180 icon.svg -o apple-touch-icon.png
rsvg-convert -w 48 -h 48 icon.svg -o "$tmp/48.png"
python3 -c 'import sys; from PIL import Image; Image.open(sys.argv[1]).save("favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])' "$tmp/48.png"
rsvg-convert -w 1200 -h 630 tools/og.svg -o og.png
echo "rendered favicon-16x16.png favicon-32x32.png apple-touch-icon.png favicon.ico og.png"
