#!/bin/sh
# Loads the game in headless Chrome (muted) five times: as a computer in clear
# weather, as an iPad in the rain, in the Countash on the Underground, on
# Parabolica Street in snow at dawn, and in a race against seven AI cars. Each time a bot drives for 20 seconds
# of game time through both cameras, and the check fails if the car did not
# get up to speed, did not travel along the road, or (on iPad) the touch
# controls were not on screen. Then runs the physics bench.
# Exit code 0 = pass. Usage: ./tools/smoke.sh
cd "$(dirname "$0")/.." || exit 1
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8799
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 0.6
run() {
  "$CHROME" --headless=new --mute-audio --use-angle=swiftshader --enable-unsafe-swiftshader \
    --virtual-time-budget=28000 --window-size=1024,640 \
    --dump-dom "http://127.0.0.1:$PORT/index.html?smoke$1" 2>/dev/null | sed -n '/<pre id="smoke">/,/<\/pre>/p' | sed 's/<[^>]*>//g'
}
FAIL=0
for ARGS in "" "&device=touch&weather=rain" "&track=underground&car=countach-qv" "&track=parabolica&weather=snow&time=dawn" "&race&difficulty=hard"; do
  OUT=$(run "$ARGS")
  if [ -z "$OUT" ]; then echo "SMOKE FAIL ($ARGS): the game did not load or did not finish"; FAIL=1; continue; fi
  echo "$OUT"
  echo "$OUT" | grep -q "SMOKE PASS" || FAIL=1
done
[ $FAIL = 0 ] || exit 1
node tools/career-bench.mjs || exit 1
node tools/drive-bench.mjs
