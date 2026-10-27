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
- Art: realistic (since Milestone 6, 2026-10-28): physically based materials, smooth filtering, tone mapping. Low graphics keeps the old chunky-pixel look. Menus, HUD and VHS overlays stay retro on purpose.
  Neon Japan is the theme (David, 2026-10-26): each track has its own light colour (the
  Starter Track warm amber, the Underground turquoise, Parabolica Street pink neon under
  white lamps), with neon signs and Japanese text as accents. Cars have clear-coated paint that reflects the lights round them; the world
  stays matte.
- Cars are low-poly takes on real cars with near-miss names ("1999 Nissani Skyliner GT-R"):
  shapes like the real car, but no real badges, logos or exact real names.
- UI: neon Japan by way of an early-2000s street racer (David's Street-Spec logo, 2026-10-26):
  pixel fonts (Jersey 10 for titles, DotGothic16 for text), a chrome italic logo with a pink
  夜勤 stamp, italic titles, dark glass panels with thin frames, a vignette. No window title
  bars. Japanese text only on screen titles and in the world. Hot pink is the main action,
  turquoise is selected or focused (a bar and a wash, not a solid block). See SPEC.md, "Look
  of the menus". References: `Reference/User Interface`.
- Control hints appear only in Settings > Controls.
- Sound only from code or from recordings we are allowed to redistribute (credit them).
- `Reference/` holds David's reference images (`User Interface`, `Cars`, `Tracks`). It is
  git-ignored and never published.
- Work on a branch. Merge to `main` only when David signs off; `main` is the live site.

## How to run and check
- Play: `./run.sh` (opens http://localhost:8793). Add `?mute` when testing so no sound plays.
  `?device=computer` or `?device=touch` skips the menus and drives. `?weather=rain|fog` picks
  the weather, `?track=underground` the track, `?car=gtar-r35` the car, `?screen=tracks|setup|race|garage`
  opens a menu screen. `?debug` opens the F3 panel.
- Look at it without opening a window: `node tools/shot.mjs "screen=garage&car=gtar-r35" out.png`
  (headless Chrome; see the top of the file for several shots, sizes and running JavaScript).
- Smoke test (headless Chrome: computer/clear, iPad/rain, the R35 on the Underground, then
  Parabolica Street in snow at dawn; a bot drives for 20 s through both cameras, then the bench;
  about 7 minutes, so run it in the background): `./tools/smoke.sh`
- AI bench: `node tools/ai-bench.mjs` (about a minute). Run it after changing the AI, physics or a track.
- Driving bench (physics only, in Node: 0-100, braking, coasting, body lean, spins with/without
  assists, bot laps on every track in each weather and car, weather patches, ratings and parts,
  wall hits): `node tools/drive-bench.mjs`. Run it after any physics, car-spec or track change.
- New props go in the asset library (`src/world/assets.js`) and are placed through a `Placer`;
  check each one on the `?library` page.

## Code map
- `src/main.js` start-up, game states (menu, driving, paused), smoke-test bot
- `src/core/` fixed-step loop, graphics presets, effect list and URL switches
- `src/input/` the shared control state, keyboard (rebindable), touch (joystick, buttons, layout editor), gamepad
- `src/physics/` car physics (`vehicle.js`), gearbox, wall collisions, weather grip table (with weather patches)
- `src/vehicles/` car list with specs (`cars.js`), parts (`parts.js`), looks: paint, finish, decals, wheels, ride height (`looks.js`), the final-numbers pipeline (`tuning.js`), ratings (`stats.js`), car bodies from profile curves (`body.js`), each car's shape and details (`car-model.js`), the cabin seen from the driver's seat (`cabin.js`), the bonnet and engine bay (`engine-bay.js`)
- `src/world/` track centre-line maths and the turtle that draws tracks (`track-path.js`), the track list and points, the asset library and Placer (`assets.js`), shared scenery pieces (`scene-kit.js`), the harbour scenery and the city backdrop (`track-scene.js`), the Underground (`underground.js`, `underground-scene.js`), Parabolica Street (`parabolica.js`, `parabolica-scene.js`), the garage scene (`garage.js`), time of day (`time-of-day.js`), weather visuals and snow (`weather.js`)
- `src/graphics/` low-res renderer with colour grade, dither, bloom on High and the low sun's glare, painted textures, vector pictures turned into pixel bitmaps (`pixel-art.js`), effects (sprite smoke, spark streaks, skid marks), paint reflections (`reflections.js`), the sky dome shader (`sky.js`)
- `src/cameras/` chase and cockpit cameras, camera shake
- `src/audio/` engine, tyres, wind, impacts, backfires, rain and night ambience (`audio.js`), menu sounds (`ui-sounds.js`), all synthesised
- `src/race/` race AI, not in the game yet: the racing line (`racing-line.js`), AI drivers (`ai-driver.js`), the race manager: grid, countdown, laps, places (`race.js`)
- `src/ui/` screens (menus, Drive modes, race settings, loading into a race, pause), the start-up and loading boot text (`boot-log.js`, a plain script), loading tips (`tips.js`), the asset library page (`library.js`), the garage screen (`garage.js`), the ratings display (`stats-view.js`), settings tabs, HUD rev counter and minimap, debug panel (F3), Feel panel (F4)
- `src/save/` versioned localStorage save (version 3: up to 3 named builds per car; migrates 1 and 2)
- `tools/` smoke test, driving bench, AI bench (`ai-bench.mjs`: six AI cars race two laps on every track), headless screenshots (`shot.mjs`), the race loading stills (`loading-stills.sh`, writes `assets/loading/`)

## Out of scope (unless David asks)
Damage models, simulation-grade tyre or suspension physics, online play, licensed cars or
brands, open-world map, story mode.
