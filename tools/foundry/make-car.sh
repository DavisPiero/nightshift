#!/bin/zsh
# A car from its reference sheet to the game, one command:
#   ./tools/foundry/make-car.sh miata-na
# Measures the sheet, builds the model in Blender (no window), prints how well
# it matches the sheet, and captures it into assets/cars/. Needs Blender and
# `npm install`. New cars: see the top of tools/foundry/cars/miata_na.py.
set -e
cd "$(dirname "$0")/../.."
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
car=$1
[ -f "tools/foundry/cars/$car-trace.json" ] || "$BLENDER" -b --factory-startup --python tools/foundry/trace-sheet.py -- "$car" | grep traced
"$BLENDER" -b --factory-startup --python tools/foundry/build-car.py -- "$car" ${2:-} | grep -E 'BADCUT|SCORE|wrote|triangles'
node tools/capture-car.mjs "$car" | tail -2
