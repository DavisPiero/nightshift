# Hand-off: end of session 2 (2026-10-25)

## Repo state
- Milestone 3 work was built on `m3-ipad-and-polish`, then merged to `main` and pushed
  (David asked for it to be merged and pushed without a further sign-off). The branch is deleted.
- `node tools/drive-bench.mjs` passes. `./tools/smoke.sh` now loads the game twice
  (computer/clear, iPad/rain). See STATE.md for how long it takes.

## Read first
1. `CLAUDE.md`: hard rules (car-name and UI rules changed this session), code map.
2. `STATE.md`: where we are and the questions for David.
3. `SPEC.md` (milestones were rewritten) and `DECISIONS.md` (15 new lines this session).

## What changed, briefly
- Physics: lean capped at ~3° around a roll centre; lift-off slowing; eight-point body
  collisions with a contact impulse; low-speed wall pivot; front tyre force fades at walking pace.
- New: `src/input/touch.js`, `src/ui/screens.js`, `src/ui/settings.js`, `src/graphics/effects.js`,
  `src/world/weather.js`, `src/physics/weather.js`, `src/vehicles/cars.js` (was coupe-spec),
  `src/vehicles/car-model.js` (was coupe-model), `src/vehicles/stats.js`, `src/world/tracks.js`,
  `src/world/starter-track.js` (was test-road).
- The save is now version 2; version 1 saves migrate (the car id kaido-r becomes skyliner-r34).

## Next
Get David's notes from a real iPad first. Then Milestone 6 (racing).

## Open questions for David
See STATE.md, "Open with David".
