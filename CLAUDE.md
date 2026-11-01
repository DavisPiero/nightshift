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
- Art: realistic (since Milestone 6, 2026-10-28): physically based materials and tone mapping, drawn a little pixelated on Medium and High (David, 2026-10-31). Low graphics keeps the old chunky-pixel look. Story pictures stay pixel art.
  Neon Japan is the theme (David, 2026-10-26): each track has its own light colour (the
  Starter Track warm amber, the Underground turquoise, Parabolica Street pink neon and cherry
  blossom under white lamps, Yamagiri Pass cold moonlight with red shrine gates), with neon signs and Japanese text as accents. Cars have clear-coated paint that reflects the lights round them; the world
  stays matte.
- Cars have near-miss names ("Nissani Skyliner") and no real badges, logos or exact real names; the real
  make and model live in each recipe's `identity`. Every car comes from a GLB in `GLB/` (git-ignored, David's
  call 2026-10-31; replaces the reference-sheet foundry, which stays on the shelf in `tools/foundry/`).
  `tools/capture-car.mjs` turns a GLB into `assets/cars/`: it removes badges but never simplifies the full-detail
  car, and never touches the GLB. Inspect every model and name it for what it actually is, not what it was meant
  to replace. Authors are credited in README.md. The Impreza's source is unknown: David chose to publish it
  anyway (2026-10-31); add its credit to README.md once he knows it.
- UI (David, 2026-11-01): black and titanium base; white, amber and teal for all colour; no pink. Clean, not pixelated, with layouts from his racing-game references and none of their colours. Fonts stay: Jersey 10 for titles and numbers, DotGothic16 for text, always bold and thickened. Every colour, font and size lives in the list at the top of `styles/main.css`: change them there, never on a screen. See SPEC.md, "Look of the menus". References: `Reference/User Interface`.
- Career is the main mode: Street, GT3, then Formula. Cars cost CR in the shop, every track in your stage is open to race (David, 2026-11-01), and the only way to go faster for good is a faster car: no permanent parts. One-race upgrades are bought on the laptop before a career race (`src/career/upgrades.js`). The garage is looks only. GT3 and Formula have no cars yet, so the story ends at level 100 with "to be continued".
- Control hints appear only in Settings > Controls. One exception (David, 2026-11-01): the laptop's NOS row names its key.
- Sound only from code or from recordings we are allowed to redistribute (credit them).
- `Reference/` holds David's reference images (`User Interface`, `Cars`, `Tracks`). It is
  git-ignored and never published.
- Work on a branch. Merge to `main` only when David signs off; `main` is the live site.

## How to run and check
- Play: `./run.sh` (opens http://localhost:8793). Add `?mute` when testing so no sound plays.
  `?device=computer` or `?device=touch` skips the menus and drives. `?weather=rain|fog` picks
  the weather, `?track=underground` the track, `?car=countach-qv` the car, `?screen=tracks|setup|race|garage|shop|career`
  opens a menu screen, `?race` (with `?device`) races seven AI cars, `&difficulty=hard` picks how hard, `?mode=trial|practice` (with `?device`) picks the session. `?debug` opens the F3 panel.
- Look at it without opening a window: `node tools/shot.mjs "screen=garage&car=countach-qv" out.png`
  (headless Chrome; see the top of the file for several shots, sizes and running JavaScript).
- Smoke test (headless Chrome: computer/clear, iPad/rain, the Countash on the Underground,
  Parabolica Street in snow at dawn, a race on Yamagiri Pass in the rain, then a race against seven AI cars; a bot drives for 20 s
  through both cameras, then the career and driving benches; about 8 minutes, so run it in the
  background): `./tools/smoke.sh`
- AI bench: `node tools/ai-bench.mjs` (about 5 minutes: races, rival tuning, lap times per difficulty). Run it after changing the AI, physics or a track.
- Career bench: `node tools/career-bench.mjs` (a second). Run it after changing pay, prices, levels or events.
- Driving bench (physics only, in Node: 0-100, braking, coasting, body lean, spins with/without
  assists, bot laps on every track in each weather and car, weather patches, ratings and parts,
  wall hits): `node tools/drive-bench.mjs`. Run it after any physics, car-spec or track change.
- Art: car cards `node tools/car-cards.mjs [id]` (one camera, one light, baked to pixels, in `assets/cars/cards/`); story art `node tools/story-art.mjs` (real game scenes baked to pixels, faces painted in `tools/story-paint.mjs`, in `assets/story/`); Johnny `node tools/johnny-sprites.mjs` (cuts David's sheet into `assets/story/johnny/`).
- Look at a car from every side: `node tools/turnaround.mjs countach-qv` (add `cockpit` first for the driver's seat), saved in `review/turn/`. Recapture cars: `npm install`, then `node tools/capture-car.mjs`.
- Add a car: put the GLB in `GLB/`, write a recipe in `tools/car-recipes.mjs` (`findSteering` and `listIslands` help), `node tools/capture-car.mjs <id>`. It prints the scale: near 1:1 means the axles are right.
- New props go in the asset library (`src/world/assets.js`) and are placed through a `Placer`;
  check each one on the `?library` page. Anything too far away to move as you drive goes in the sky bake (`skyBackdrop` in `track-scene.js`), not the world.

## Code map
- `src/main.js` start-up, game states (menu, driving, paused), smoke-test bot
- `src/core/` fixed-step loop, graphics presets, effect list and URL switches
- `src/input/` the shared control state, keyboard (rebindable), touch (joystick, buttons, layout editor), gamepad
- `src/physics/` car physics (`vehicle.js`), gearbox, wall collisions, two cars touching (`knocks.js`), weather grip table (with weather patches)
- `src/vehicles/` car list with specs, prices and tiers (`cars.js`), looks: paint, finish, decals, wheels, ride height (`looks.js`), home flags (`flags.js`), Feel on top of a car's numbers (`tuning.js`), ratings (`stats.js`), car bodies from profile curves (`body.js`), each car's shape and details (`car-model.js`), cars from GLBs (`captured.js`, files in `assets/cars/`: `<id>-lite.bin` loads at start-up, `<id>.bin` with every triangle replaces it on computers), real 3D rims (`wheels.js`), the cabin seen from the driver's seat (`cabin.js`), the bonnet and engine bay (`engine-bay.js`)
- `src/world/` track centre-line maths, road height and the turtle that draws tracks (`track-path.js`), the track list and points, the asset library and Placer (`assets.js`), the phone and laptop models on their own canvas (`props-devices.js`), shared scenery pieces (`scene-kit.js`), the harbour scenery and the city backdrop (`track-scene.js`), the Underground (`underground.js`, `underground-scene.js`), Parabolica Street (`parabolica.js`, `parabolica-scene.js`), Yamagiri Pass (`mountain.js`, `mountain-scene.js`), the garage scene (`garage.js`), Dave's lot (`dealership.js`), time of day (`time-of-day.js`), weather visuals and snow (`weather.js`)
- `src/graphics/` renderer with colour grade, dither, bloom (FFT convolution on High, a blur chain on Medium), speed blur with a cockpit mask and the low sun's glare, painted textures, vector pictures turned into pixel bitmaps (`pixel-art.js`), effects (sprite smoke, spark streaks, skid marks), paint reflections (`reflections.js`), the sky dome shader (`sky.js`), far scenery baked into the sky (`far-bake.js`)
- `src/cameras/` chase and cockpit cameras, camera shake, `speedRush` (the one number for how fast it should feel)
- `src/audio/` engine, tyres, wind, impacts, backfires, rain and night ambience (`audio.js`), menu sounds (`ui-sounds.js`), all synthesised
- `src/race/` the racing line (`racing-line.js`), AI drivers (`ai-driver.js`), the four difficulties (`difficulty.js`), picking and tuning the rivals (`opponents.js`), the race manager: grid, countdown, laps, places, slipstream (`race.js`), Time Trial timing and its ghost (`ghost.js`), the laptop's Analytics (`analytics.js`), the rival cars and ghost on screen (`race-view.js`)
- `src/career/` levels, pay and the events (`career.js`), the story scenes (`story.js`), one-race upgrades (`upgrades.js`), the mail on your phone (`inbox.js`), Dave's talk (`dave.js`)
- `src/ui/` screens (home, race settings, results, loading into a race, pause), the Career screen (`career-screen.js`), the shop (`shop.js`), car cards (`car-cards.js`), story scenes and the make-your-racer form (`cutscene.js`), the phone (`phone.js`), the pre-race laptop (`laptop.js`), the Shop and Garage laptop, HTML laid over the model (`desk.js`), the start-up and loading boot text (`boot-log.js`, a plain script), loading tips (`tips.js`), what is new in each update, sent as mail (`notice.js`: new id each update), the asset library page (`library.js`), the garage screen (`garage.js`), the ratings display (`stats-view.js`), settings tabs, HUD rev counter, minimap, race sheet and Time Trial panel, debug panel (F3), Feel panel (F4)
- `src/save/` versioned localStorage save (version 6: career, owned cars, one look per car; migrates 1 to 5)
- `tools/` the foundry (`foundry/`: sheet tracer, builder, score, one blueprint per car in `foundry/cars/`), car capture (`capture-car.mjs`, each car's recipe in `car-recipes.mjs`), eight-angle car pictures (`turnaround.mjs`), smoke test, driving bench, AI bench (`ai-bench.mjs`), career bench (`career-bench.mjs`), art (`car-cards.mjs`, `story-art.mjs`, `story-paint.mjs`, `pixel-bake.mjs`, `johnny-sprites.mjs`), headless screenshots (`shot.mjs`), the race loading stills (`loading-stills.sh`, writes `assets/loading/`)

## Out of scope (unless David asks)
Damage models, simulation-grade tyre or suspension physics, online play, licensed cars or
brands, open-world map, story mode.
