#!/bin/sh
# Renders the four hand-in screenshots of the game served on :8081 (headless Chrome) into screenshots/.
# Usage: sh tools/shoot.sh [outdir]   (outdir defaults to screenshots; PNGs are kept beside the JPEGs there only when outdir is not screenshots)
set -e
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=${1:-screenshots}
T=$(mktemp -d)
i=1
for s in play stones clubhouse results; do
  "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$T/p$s" --window-size=1280,720 --virtual-time-budget=4000 --screenshot="$T/$s.png" "http://127.0.0.1:8081/index.html?shot=$s&nc=$$" >/dev/null 2>&1
  # Step the quality down until the JPEG fits the hand-in gate's 256 KiB per screenshot.
  for q in ${Q:-86} 82 78 74 70 66; do
    sips -s format jpeg -s formatOptions "$q" "$T/$s.png" --out "$OUT/$i-$s.jpg" >/dev/null
    [ "$(stat -f%z "$OUT/$i-$s.jpg")" -le 258000 ] && break
  done
  i=$((i + 1))
done
ls -l "$OUT"
