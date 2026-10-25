#!/bin/sh
# Loads the game in headless Chrome (muted), lets a bot drive for 20 seconds
# of game time through both cameras, and checks it got up to speed and
# travelled along the road. Then runs the physics bench.
# Exit code 0 = pass. Usage: ./tools/smoke.sh
cd "$(dirname "$0")/.." || exit 1
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8799
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 0.6
OUT=$("$CHROME" --headless=new --mute-audio --use-angle=swiftshader --enable-unsafe-swiftshader \
  --virtual-time-budget=60000 --window-size=960,540 \
  --dump-dom "http://127.0.0.1:$PORT/index.html?smoke" 2>/dev/null | sed -n '/<pre id="smoke">/,/<\/pre>/p' | sed 's/<[^>]*>//g')
if [ -z "$OUT" ]; then echo "SMOKE FAIL: the game did not load or did not finish"; exit 1; fi
echo "$OUT"
echo "$OUT" | grep -q "SMOKE PASS" || exit 1
node tools/drive-bench.mjs
