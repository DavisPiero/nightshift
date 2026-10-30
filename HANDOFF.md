# Hand-off: end of session 12 (2026-10-30)

## Repo state
- Everything is merged into `main` and pushed ("push without asking"); no open branches. Driving bench and smoke test pass.
- Session 12: the four GLB cars are in the game, captured rather than drawn. David's answers: rename the cars to match the GLBs, credit the authors in the README, "use the models how you want", do all the models.

## How captured cars work
- `tools/car-recipes.mjs`: one recipe per car (which material is paint, glass, lamps; what is dropped; axle positions; where the steering wheel and eye are; emblems to erase).
- `tools/capture-car.mjs`: GLB to `assets/cars/<id>.bin` and `assets/cars/tex/`. Needs `npm install` and `GLB/` (git-ignored). The game needs neither.
- `src/vehicles/captured.js` loads them at start-up (main.js waits for `carsReady`). `buildCar` uses them when a capture exists, otherwise the old curve body.
- `node tools/turnaround.mjs <id>` and `node tools/turnaround.mjs cockpit <id>` show a car; both save in `review/turn/`.
- A new car: add the GLB, write a recipe (`findSteering: true` lists steering wheel candidates), add its id to `IDS` in `captured.js`.

## Read first
`CLAUDE.md`, `STATE.md`, the last 10 lines of `DECISIONS.md`. David's Visual Realism brief is in the session 12 kickoff; its remaining parts are listed in STATE.md, with the recommendations he has seen:
- Acceleration: about 30% longer to 100 km/h, cut fading with speed so top speeds hold, rating scale moved by the same amount so classes stay.
- Motion blur: the code runs on m/s (90 to 288 km/h, not 25 to 80 as the log said). Start at 140, full at 280, about 60% strength, cabin masked out.
- Bloom: the scene target is 8-bit, so bright lights clip; it needs a half-float target first. Bloom is High only today. Real convolution on High on computers, a matched cheaper version on Medium.
- Mountain Edge: height is for looks only, physics stays flat; closed loop.
- Parabolica: same road, surroundings replaced.
- UI: overturns the "no window title bars" rule in CLAUDE.md and SPEC.md; rewrite those with it.

## Open with David
- Does anything about the four cars need changing? First thing to ask.
- Near-miss names, left-hand R35, hub pads, Mustang interior darkness (guesses).
- An iPad run with the new cars.
- Older guesses in STATE.md.
