# Hand-off: end of session 12 (2026-10-31)

## Repo state
- The four GLB cars and the speed and effects block are merged into `main`, pushed and live. David signed off. Driving, AI benches and smoke test passed on the branch before merging; `m6-speed-fx` is deleted.
- Session 12: the four GLB cars are in the game, captured rather than drawn. David's answers: rename the cars to match the GLBs, credit the authors in the README, "use the models how you want", do all the models.

## How captured cars work
- `tools/car-recipes.mjs`: one recipe per car (which material is paint, glass, lamps; what is dropped; axle positions; where the steering wheel and eye are; emblems to erase).
- `tools/capture-car.mjs`: GLB to `assets/cars/<id>.bin` and `assets/cars/tex/`. Needs `npm install` and `GLB/` (git-ignored). The game needs neither.
- `src/vehicles/captured.js` loads them at start-up (main.js waits for `carsReady`). `buildCar` uses them when a capture exists, otherwise the old curve body.
- `node tools/turnaround.mjs <id>` and `node tools/turnaround.mjs cockpit <id>` show a car; both save in `review/turn/`.
- A new car: add the GLB, write a recipe (`findSteering: true` lists steering wheel candidates), add its id to `IDS` in `captured.js`.

## Read first
`CLAUDE.md`, `STATE.md`, the last 10 lines of `DECISIONS.md`. David's Visual Realism brief is in the session 12 kickoff; its remaining parts are listed in STATE.md, with the recommendations he has seen:
- Mountain Edge: height is for looks only, physics stays flat; closed loop.
- Parabolica: same road, surroundings replaced.
- UI: overturns the "no window title bars" rule in CLAUDE.md and SPEC.md; rewrite those with it.

## Open with David
- The feel of the slower cars, drifts especially; frame rate with the new bloom.
- Does anything about the four cars need changing? First thing to ask.
- Near-miss names, left-hand R35, hub pads, Mustang interior darkness (guesses).
- An iPad run with the new cars.
- Older guesses in STATE.md.
