# Hand-off: end of session 5 (2026-10-26)

## Repo state
- Signed off and merged to `main` (live). No other branches.
- Bench passes (new checks: an old save carries into a build; slammed lowers the centre of
  gravity). Smoke test passes. R34 baseline unchanged.

## Read first
`CLAUDE.md`, `STATE.md`, then the last 6 lines of `DECISIONS.md`.

## How the new pieces fit
- A build is `{ name, parts: { slot: partId }, look }` (save.js). `garageCar(save, car)` repairs
  a car's entry in place and returns `{ active, builds }`; `activeBuild()` is the one raced.
- `src/vehicles/looks.js`: palettes, finishes, decals, rims, ride height, `checkLook()`.
- `buildSpec(car, build, feel)` (tuning.js) applies parts, then ride height (lowers cgHeight).
- `buildCar(spec, look)` (car-model.js) reads part flags on the built spec (`wing`, `kit`,
  `bigBrakes`, `stripped`, `exhaustVolume`) and the look. The widebody is a second `Body` made
  by `wideDef()`. Decals use `Body.decal(..., { uv: true })` for textured ones.
- `Game.buildChanged()` re-specs the car, rebuilds the model, saves. The garage screen
  (src/ui/garage.js) edits the active build and calls it. `game.garageTab` picks the camera
  spot in `garage.views`.
- `fillStats(el, spec, units, compare)` (stats-view.js) draws ratings, with gains/losses
  against `compare`.

## Next
Milestone 4 part 3 (the world).
