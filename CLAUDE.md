# NIGHTSHIFT: project rules

A casual night-time street racing game in the browser (Three.js), made for Arlo. David
directs and makes the look, sound and feel calls. See SPEC.md for what makes it fun and
what we are not building, STATE.md for where we are, DECISIONS.md for why things are the
way they are, HANDOFF.md for how the last session ended. BRIEF.md is the original long brief.

## Hard rules
- No build step. Plain ES modules, Three.js vendored in `vendor/` (pinned r170). The game
  must run from `./run.sh` and from GitHub Pages (https://davispiero.github.io/nightshift/).
- One game for both platforms. Computer and iPad share the car, physics, world and save;
  only input, HUD layout and graphics defaults differ.
- Every input (keyboard, touch, gamepad) feeds `src/input/controls.js`. Physics never
  knows where a control came from.
- Physics runs at a fixed 1/120 s step and never imports Three.js (so the bench can run it in Node).
- Automatic gearbox is the default. Manual is optional and must never be needed to be quick.
- Art: low-poly, small nearest-filtered textures, fog, warm amber lamps, dark greens and
  concrete greys. No neon/cyberpunk, no glossy modern look, no full-screen pixelate filter.
- Original car designs only: no real badges, logos or copied bodywork.
- Sound only from code or from recordings we are allowed to redistribute (credit them).
- `Reference/` holds David's reference images. It is git-ignored and never published.
- Work on a branch. Merge to `main` only when David signs off; `main` is the live site.

## How to run and check
- Play: `./run.sh` (opens http://localhost:8793). Add `?mute` when testing so no sound plays.
  `?device=computer` or `?device=touch` skips the title screen. `?debug` opens the F3 panel.
- Smoke test (headless Chrome, a bot drives for 20 s through both cameras, then the bench):
  `./tools/smoke.sh`
- Driving bench (physics only, in Node: 0-100, braking, spins with/without assists, bot lap):
  `node tools/drive-bench.mjs`. Run it after any physics or car-spec change.

## Code map
- `src/main.js` start-up, game states (title, driving, paused), smoke-test bot
- `src/core/` fixed-step loop, graphics presets and URL switches
- `src/input/` the shared control state and the keyboard (touch comes next)
- `src/physics/` car physics (`vehicle.js`), gearbox, wall collisions
- `src/vehicles/` car specs (numbers to tune) and the car model built in code
- `src/world/` track centre-line maths, the test road's points, building the scenery
- `src/graphics/` low-res renderer with colour grade and dither, painted textures
- `src/cameras/` chase and cockpit cameras
- `src/audio/` engine, tyres, wind, impacts (all synthesised)
- `src/ui/` HUD rev counter and debug panel, title and pause menus
- `src/save/` versioned localStorage save
- `tools/` smoke test and driving bench

## Out of scope (unless David asks)
Damage models, simulation-grade tyre or suspension physics, online play, licensed cars or
brands, open-world map, story mode.
