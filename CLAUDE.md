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
- Art: low-poly, small nearest-filtered textures, fog, no full-screen pixelate filter.
  Neon Japan is the theme (David, 2026-10-26): each track has its own light colour (the
  Starter Track warm amber, the Underground turquoise), with neon signs and Japanese text as
  accents. Cars have clear-coated paint that reflects the lights round them; the world
  stays matte.
- Cars are low-poly takes on real cars with near-miss names ("1999 Nissani Skyliner GT-R"):
  shapes like the real car, but no real badges, logos or exact real names.
- UI: neon Japan pixel style (Jersey 10 for titles, DotGothic16 for text, thin turquoise
  frames that glow, window title bars, katakana under the English, scanlines). Hot pink is
  the main action, turquoise is selected or focused. References: `Reference/User Interface`.
- Control hints appear only in Settings > Controls.
- Sound only from code or from recordings we are allowed to redistribute (credit them).
- `Reference/` holds David's reference images (`User Interface`, `Cars`, `Tracks`). It is
  git-ignored and never published.
- Work on a branch. Merge to `main` only when David signs off; `main` is the live site.

## How to run and check
- Play: `./run.sh` (opens http://localhost:8793). Add `?mute` when testing so no sound plays.
  `?device=computer` or `?device=touch` skips the menus and drives. `?weather=rain|fog` picks
  the weather, `?track=underground` the track, `?car=gtar-r35` the car, `?screen=tracks|setup|garage`
  opens a menu screen. `?debug` opens the F3 panel.
- Look at it without opening a window: `node tools/shot.mjs "screen=garage&car=gtar-r35" out.png`
  (headless Chrome; see the top of the file for several shots, sizes and running JavaScript).
- Smoke test (headless Chrome: computer/clear, iPad/rain, then the R35 on the Underground; a
  bot drives for 20 s through both cameras, then the bench): `./tools/smoke.sh`
- Driving bench (physics only, in Node: 0-100, braking, coasting, body lean, spins with/without
  assists, bot laps in each weather and car, ratings and parts, wall hits): `node tools/drive-bench.mjs`. Run it after any
  physics or car-spec change.

## Code map
- `src/main.js` start-up, game states (menu, driving, paused), smoke-test bot
- `src/core/` fixed-step loop, graphics presets, effect list and URL switches
- `src/input/` the shared control state, keyboard (rebindable), touch (joystick, buttons, layout editor), gamepad
- `src/physics/` car physics (`vehicle.js`), gearbox, wall collisions, weather grip table
- `src/vehicles/` car list with specs (`cars.js`), parts (`parts.js`), looks: paint, finish, decals, wheels, ride height (`looks.js`), the final-numbers pipeline (`tuning.js`), ratings (`stats.js`), car bodies from profile curves (`body.js`), each car's shape and details (`car-model.js`)
- `src/world/` track centre-line maths, the track list and points, shared scenery pieces (`scene-kit.js`), the harbour scenery (`track-scene.js`), the Underground (`underground.js`, `underground-scene.js`), the garage scene (`garage.js`), weather visuals
- `src/graphics/` low-res renderer with colour grade and dither, painted textures, effects (particles, skid marks), paint reflections (`reflections.js`)
- `src/cameras/` chase and cockpit cameras, camera shake
- `src/audio/` engine, tyres, wind, impacts, exhaust pops, rain and night ambience (all synthesised)
- `src/ui/` screens (menus, pause), the garage screen (`garage.js`), the ratings display (`stats-view.js`), settings tabs, HUD rev counter, debug panel (F3), Feel panel (F4)
- `src/save/` versioned localStorage save (version 3: up to 3 named builds per car; migrates 1 and 2)
- `tools/` smoke test, driving bench, headless screenshots (`shot.mjs`)

## Out of scope (unless David asks)
Damage models, simulation-grade tyre or suspension physics, online play, licensed cars or
brands, open-world map, story mode.
