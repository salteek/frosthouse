#!/bin/sh
# Renders the four hand-in screenshots of the game served on :8081 (headless Chrome) into screenshots/.
# Usage: sh tools/shoot.sh [outdir]   (outdir defaults to screenshots; PNGs are kept beside the JPEGs there only when outdir is not screenshots)
set -e
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=${1:-screenshots}
T=$(mktemp -d)
i=1
for s in play title clubhouse results; do
  "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$T/p$s" --window-size=1280,720 --virtual-time-budget=4000 --screenshot="$T/$s.png" "http://127.0.0.1:8081/index.html?shot=$s&nc=$$" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions "${Q:-88}" "$T/$s.png" --out "$OUT/$i-$s.jpg" >/dev/null
  i=$((i + 1))
done
ls -l "$OUT"
