#!/bin/bash
# Regenerate macOS .icns and .ico from SVG icon
# Usage: npm run icon:gen

set -e
cd "$(dirname "$0")/.."
RES="resources"
SVG="$RES/icon.svg"
ICONSET="$RES/icon.iconset"

echo "→ Rendering SVG to PNG sizes..."
mkdir -p "$ICONSET"

# sips can't convert SVG directly, use rsvg-convert or qlmanage
if command -v rsvg-convert &>/dev/null; then
  RENDER="rsvg-convert"
elif command -v qlmanage &>/dev/null; then
  RENDER="qlmanage"
else
  echo "✗ Need rsvg-convert (brew install librsvg) or qlmanage"
  exit 1
fi

render_png() {
  local size=$1 out=$2
  if [ "$RENDER" = "rsvg-convert" ]; then
    rsvg-convert -w "$size" -h "$size" "$SVG" -o "$out"
  else
    qlmanage -t -s "$size" -o "$ICONSET" "$SVG" >/dev/null 2>&1
    mv "$ICONSET/icon.svg.png" "$out" 2>/dev/null || true
  fi
}

# Generate all required sizes for .icns
SIZES=(16 32 64 128 256 512)
for s in "${SIZES[@]}"; do
  double=$((s * 2))
  render_png "$s" "$ICONSET/icon_${s}x${s}.png"
  render_png "$double" "$ICONSET/icon_${s}x${s}@2x.png"
done

echo "→ Generating .icns..."
iconutil -c icns "$ICONSET" -o "$RES/icon.icns"
echo "✓ $RES/icon.icns"

echo "→ Generating .ico from 256x256..."
# .ico is just a PNG with .ico extension for electron-builder
cp "$ICONSET/icon_256x256@2x.png" "$RES/icon.png"
cp "$ICONSET/icon_256x256.png" "$RES/icon.ico"
echo "✓ $RES/icon.ico, $RES/icon.png"

echo ""
echo "→ Clearing macOS icon cache..."
sudo rm -rfv /Library/Caches/com.apple.iconservices.store 2>/dev/null || true
sudo find /private/var/folders/ -name com.apple.dock.iconcache -exec rm -fv {} \; 2>/dev/null || true
sudo find /private/var/folders/ -name com.apple.iconservices -exec rm -rfv {} \; 2>/dev/null || true

killall Dock 2>/dev/null || true
killall Finder 2>/dev/null || true

echo ""
echo "✓ Done! Icon regenerated and cache cleared."
echo "  If the old icon persists, log out and back in."
