# Hand-off: end of session 14 (2026-10-31)

## Repo state
- On `main`, everything committed and pushed; no other branches. `main` is the live site. Next work goes on a new branch; merge only when David signs off (he says "push" for merge everything and push).

## Read first
`CLAUDE.md`, `STATE.md`, the last 10 lines of `DECISIONS.md`.

## What comes next
1. Ask David the direction question below. The advice is in STATE.md; don't assume it was accepted.
2. If he brings notes from playing, or from watching Arlo, use `/notes` first.
3. Then plan and wait for his go-ahead. "Turn on racing" is the recommended first job: `src/race/` has the AI, grid, countdown and laps, benched but not in the game.

## How cars work now
- `GLB/<file>` goes in unchanged. A recipe in `tools/car-recipes.mjs` names slots by `material|node`, first match wins. `node tools/capture-car.mjs <id>` writes `assets/cars/<id>.bin` (every triangle), `<id>-lite.bin` (lod 2 iPad copy, lod 1 parked) and `assets/cars/tex/`.
- Check the printed scale: near 1:1 (or 100, 0.01 for files in other units) means the recipe's `axles` fit.
- Recipe helpers: `listIslands`, `findSteering`, `listCabinNear` print what is there. `tyresOnly` when a rim material holds other parts. `autoWheels` moves anything inside a wheel to it. `bonnet.x` cuts the bonnet from a one-skin body. `panels` names boxes; `cut: true` slices a fused body, otherwise whole islands move.
- `steeringFit` measures a wheel that is its own group; never hand-write an axis. `donor` takes a cabin from another GLB (`keep`, `drop`: any corner in a drop box takes the triangle), `cabinOut` removes this car's, `cabinKeep` protects a part.
- Always check a cockpit by turning the wheel: dispatch an ArrowRight keydown in `shot.mjs` with the cockpit camera on.
- `captured.js` loads lite files at start-up; `fullDetail(id)` swaps in the full car on computers, then `buildChanged()` rebuilds.
- A material you can't name: render each one in pink from Blender, no window.

## Open with David
- Which direction, and when GT3 and F1 cars come in.
- The Subaru's source and credit.
- iPad and computer frame rate.
- The Mustang's near-miss livery.
- Every guess listed in STATE.md.
