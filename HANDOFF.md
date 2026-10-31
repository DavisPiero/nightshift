# Hand-off: session 14 (2026-10-31), mid-brief

## Repo state
- Branch `m6-glb-vehicles`, not committed. `main` is session 13, live. Merge only when David signs off (he says "push" for merge everything and push). The Impreza must not reach `main` until David clears its source.

## What comes next
Phase 2 of David's brief: physical modifications. See STATE.md.

## How cars work now
- `GLB/<file>` goes in unchanged. A recipe in `tools/car-recipes.mjs` names slots by `material|node`, first match wins. `node tools/capture-car.mjs <id>` writes `assets/cars/<id>.bin` (every triangle), `<id>-lite.bin` (lod 2 iPad copy, lod 1 parked) and `assets/cars/tex/`.
- Check the printed scale: near 1:1 (or 100, 0.01 for files in other units) means the recipe's `axles` fit. The Impreza came out 1.0002.
- Recipe helpers: `listIslands` prints paint islands, `findSteering` prints steering wheel candidates. `tyresOnly` when a rim material also holds other parts. `autoWheels` moves anything wholly inside a wheel to it. `bonnet.x` cuts the bonnet out of a one-skin body. `panels` names boxes; `cut: true` slices a fused body, otherwise whole islands move.
- A material you can't name: the per-material pink sheet from Blender (no window) is how the Countach was mapped.
- `captured.js` loads lite files at start-up; `fullDetail(id)` swaps in the full car on computers, then `buildChanged()` rebuilds.
- sips -Z also enlarges, and JPEG turns see-through pixels white: both are handled in `saveTexture`.

## Read first
`CLAUDE.md`, `STATE.md`, the last 10 lines of `DECISIONS.md`.
