# Hand-off: end of session 12 (2026-10-31)

## Repo state
- On `main`, clean, pushed and live. No other branches. David signed off the four GLB cars and the speed and effects block; `m6-speed-fx` is merged and deleted.
- Before starting work, make a branch: David's rule is that `main` is the live site.

## What comes next
1. David brings new notes to the next session. Take those first (use `/notes`).
2. Soften the blue lens spots and the hard white flare (David asked for this next round). Seen in the garage shot of the Mustank: dark blue spots on the floor behind the car, a hard white flare on its rear window. They come from lamps reflecting in the paint. Look in `drawBloom` and the ghosts in `src/graphics/renderer.js`, and in `setLens`, where `main.js` can pass a lower value for the garage. Keep the driving look.
3. Then the rest of the Visual Realism brief, in order, with the recommendations David has seen:
   - Parabolica Street: same road, surroundings replaced with blossom.
   - Mountain Edge: height is for looks only, physics stays flat; closed loop.
   - Old-Microsoft UI: overturns "No window title bars" in CLAUDE.md and SPEC.md; rewrite those with it.

## How captured cars work
- `tools/car-recipes.mjs`: one recipe per car (which material is paint, glass, lamps; what is dropped; axle positions; where the steering wheel and eye are; emblems to erase).
- `tools/capture-car.mjs`: GLB to `assets/cars/<id>.bin` and `assets/cars/tex/`. Needs `npm install` and `GLB/` (git-ignored). The game needs neither.
- `src/vehicles/captured.js` loads them at start-up (main.js waits for `carsReady`). `buildCar` uses them when a capture exists, otherwise the old curve body.
- A new car: add the GLB, write a recipe (`findSteering: true` lists steering wheel candidates), add its id to `IDS` in `captured.js`.

## Read first
`CLAUDE.md`, `STATE.md`, the last 10 lines of `DECISIONS.md`.

## Open with David
- Does anything about the four cars need changing? First thing to ask.
- The feel of the slower cars, drifts especially.
- Frame rate with the new bloom, and an iPad run with the new cars. Neither has been measured.
- Near-miss names, left-hand R35, hub pads, Mustang interior darkness (guesses).
- Older guesses in STATE.md.
