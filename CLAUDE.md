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
- Cars are low-poly takes on real cars with near-miss names ("1999 Nissani Skyliner GT-R"):
  shapes like the real car, but no real badges, logos or exact real names.
- UI: chunky pixel style (Jersey 10 font, notched corners, bevelled buttons). Orange is the
  main action, cyan is selected or focused. Flat colours, no glow; cyan stays out of the 3D world.
- Control hints appear only in Settings > Controls.
- Sound only from code or from recordings we are allowed to redistribute (credit them).
- `Reference/` holds David's reference images. It is git-ignored and never published.
- Work on a branch. Merge to `main` only when David signs off; `main` is the live site.

## How to run and check
- Play: `./run.sh` (opens http://localhost:8793). Add `?mute` when testing so no sound plays.
  `?device=computer` or `?device=touch` skips the menus and drives. `?weather=rain|fog` picks
  the weather. `?debug` opens the F3 panel.
- Smoke test (headless Chrome, computer/clear then iPad/rain; a bot drives for 20 s through
  both cameras, then the bench): `./tools/smoke.sh`
- Driving bench (physics only, in Node: 0-100, braking, coasting, body lean, spins with/without
  assists, bot laps in each weather, wall hits): `node tools/drive-bench.mjs`. Run it after any
  physics or car-spec change.

## Code map
- `src/main.js` start-up, game states (menu, driving, paused), smoke-test bot
- `src/core/` fixed-step loop, graphics presets, effect list and URL switches
- `src/input/` the shared control state, keyboard (rebindable), touch (joystick, buttons, layout editor)
- `src/physics/` car physics (`vehicle.js`), gearbox, wall collisions, weather grip table
- `src/vehicles/` car list with specs (`cars.js`), the car model built in code, measured stats
- `src/world/` track centre-line maths, the track list and points, scenery, weather visuals
- `src/graphics/` low-res renderer with colour grade and dither, painted textures, effects (particles, skid marks)
- `src/cameras/` chase and cockpit cameras, camera shake
- `src/audio/` engine, tyres, wind, impacts, exhaust pops, rain and night ambience (all synthesised)
- `src/ui/` screens (menus, garage, pause), settings tabs, HUD rev counter and debug panel
- `src/save/` versioned localStorage save (version 2; migrates version 1)
- `tools/` smoke test and driving bench

## Out of scope (unless David asks)
Damage models, simulation-grade tyre or suspension physics, online play, licensed cars or
brands, open-world map, story mode.
