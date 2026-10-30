# Hand-off: end of session 11 (2026-10-30)

## Repo state
- Everything is merged into `main` and pushed ("push it"); no open branches. Driving bench passes; the game loads headless with no errors. The 7-minute smoke test was not run this session (only the Mustank's looks changed).
- Session 11 did one thing: the Mustank's body, from `Reference/Cars/mustang-gt500-sheet.webp` (reshape in `car-model.js SHAPES['mustank-gt500']`, own wing and fender vent in `mustankDetails`, black stripes as its default look via `stripes` on the car spec and `looks.js defaultLook`).

## Read first
`CLAUDE.md`, `STATE.md`, `AUDIT.md`, the last 10 lines of `DECISIONS.md`. Sheets in `Reference/Cars` (R35, Challenger, Aventador, Miata, Mustang).

## How to look at a car headlessly
`tools/shot.mjs` with `--js`: set `nightshift.fixedTurn=0`, brighten the garage lights, hide `.screen`, call `nightshift.orbitDrag(0,0)` then set `nightshift.orbit = {yaw,pitch,dist}`. (The scratch helper was deleted; worth turning into `tools/turnaround.mjs`.) Note the garage is dark; judge shape with the lights raised.

## Next (in this order)
1. Mustank: nose is a flat tall face, sides plain, cockpit not redone.
2. R35 and Challenjer: bodies and cockpits to the Miata standard (R35 and Challenjer sheets exist).
3. R34: no sheet; build from knowledge, show David, unhide it (`ALL_CARS` in `cars.js`).
4. Effects: ambient occlusion (baked on Medium, real on High), exposure adaptation, lens dirt, flame/smoke/spark, headlight pools, wet roads, higher sun.
5. World: start with Underground roads, buildings, trees; show David before other tracks.
6. Stat corrections: a separate balance pass (figures in DECISIONS.md).

## Open with David
- Stats: apply real-world figures where far off (R35 0-100, Mustang power and top speed), or leave? Not answered.
- Order of work (cars, effects, world) assumed, not confirmed. Is "sun raise" a higher sun at sunrise/sunset?
- R34 reference sheet, if he has one.
- Older guesses: Miata's name/numbers/paints, notice board wording, fringing strength, Aventadoro keeping its SV name, Medium default on iPad, black stripes as the Mustank's default.
