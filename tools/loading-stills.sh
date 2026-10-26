#!/bin/sh
# Renders the track stills for the race loading screen (assets/loading/<track>.jpg)
# with headless Chrome at High graphics, the menus hidden. Re-run after
# changing how a track looks.
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
J="nightshift.save.settings.graphics='high'; nightshift.applyGraphics(); document.querySelectorAll('.screen').forEach(e=>e.style.display='none');"
node tools/shot.mjs "[
 {\"q\":\"screen=tracks&track=starter&time=sunset\",\"out\":\"$TMP/starter.png\",\"js\":\"$J nightshift.flyIndex=260\",\"after\":2.5},
 {\"q\":\"screen=tracks&track=underground\",\"out\":\"$TMP/underground.png\",\"js\":\"$J nightshift.flyIndex=420\",\"after\":2.5},
 {\"q\":\"screen=tracks&track=parabolica\",\"out\":\"$TMP/parabolica.png\",\"js\":\"$J nightshift.flyIndex=40\",\"after\":2.5}
]" | grep -v '^saved'
mkdir -p assets/loading
for t in starter underground parabolica; do
  sips -s format jpeg -s formatOptions 72 "$TMP/$t.png" --out "assets/loading/$t.jpg" >/dev/null
done
rm -r "$TMP"
ls -l assets/loading
