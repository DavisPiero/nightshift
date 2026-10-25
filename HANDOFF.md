# Hand-off: end of session 3 (2026-10-25)

## Repo state
- Milestone 4 part 1 was signed off and merged to `main` (live). No other branches.
- The bench and smoke test pass.
- Bench baseline from before this session (R34): 0-100 5.58 s, top speed 272 km/h,
  braking 38.0 m, coast 61 km/h, bot lap 78.3 s. Now: 0-100 5.61 s (turbo lag), top speed
  277 km/h, braking 38.0 m, coast 61 km/h, bot lap 78.2 s; rain lap 88.2 s; Challenjer lap 78.6 s.

## Read first
`CLAUDE.md`, `STATE.md`, then `DECISIONS.md` (12 new lines this session).

## How the new pieces fit
- `src/vehicles/parts.js`: slots and options; each option's `apply` edits a copy of the spec.
  `tab` says which garage tab it belongs in (engine, chassis, drivetrain, body).
- `src/vehicles/tuning.js`: `buildSpec(car, build, feel)` is the only place final numbers are made.
- `src/vehicles/stats.js`: `carStats(spec)` runs the physics and returns the class, score and stats (cached).
- Saved parts live in `save.garage.cars[id].upgrades` for now. Part 2 turns that into named builds (save version 3).
- `src/vehicles/car-model.js`: a shared builder plus `SHAPES[carId]` (profile, cabin, wheels,
  lamps, a `details()` function). Add a car by adding a spec in `cars.js` and a shape here.
- Visual flags set by parts and not drawn yet: `wing`, `kit`, `rideDrop`, `bigBrakes`, `stripped`. Part 2 draws them.

## Next
Milestone 4 part 2: the garage (see STATE.md).
