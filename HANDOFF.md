# Hand-off: end of session 19 (2026-11-01)

## Repo state
- On `main`, everything committed and pushed; no other branches. `main` is the live site. Next work goes on a new branch. David's standing rule for these notes: when a part is finished and checked, merge and push it without asking.

## Read first
`CLAUDE.md`, `STATE.md`, the last 20 lines of `DECISIONS.md`, then this file.

## What comes next
Part 4 of David's fourth notes: spelled out under "Next" in `STATE.md`, with his answers in `DECISIONS.md`. He wants each part pushed when finished, without asking.

## How the environments work
- Road height: `heights` keys in a track's definition; `TrackPath.y`, `.grade`. `keepOnTrack` calls `settleOnRoad`, which sets `vehicle.roadY`, `.slope`, `.slopeSide`. After teleporting a car, call `settleOnRoad` before any camera snap. `placeOnRoad` (race-view.js) tips a body. Strips and walls in `scene-kit.js` follow the height by themselves; a Placer needs the y passed in.
- Sky bake: `skyBackdrop(farGroup, centre)` or `cityBackdrop`. `backdrop.userData.far` is the `FarBake`; `applyLook` bakes, `WeatherView.set` sets the haze. It must not be `transparent` in Three's eyes or it draws over the world.
- Trees: `crown()` and `limbs()` in `assets.js`, textures `Tex.leaves`, `blossom`, `cedarTier`, `cedarCard`. Crowns are `FrontSide`: double-sided flips the out-pointing normals and turns half the cards black.
- A world can have `update(dt, camera, v)` (Parabolica's petals) and `setSnow(on)` (the mountain's ground).
- Light on a hilly road: `roadGlow` in `mountain-scene.js`, not `place.pool`, which is flat.

## How the look works
- Colours, fonts, spacing: the list at the top of `styles/main.css`. Canvas drawings repeat a few of those values (`ui/hud.js`, `ui/screens.js`, `input/touch.js`).
- A new DotGothic16 element may need adding to the outline rule under the list (`--weight`).
- New update: new `id` and lines in `ui/notice.js`; it arrives as mail.

## How Part 3 works
- Career race: `raceLoad` -> `game.arrive()` -> `endArrive` -> `prepare` (the laptop) -> `lights` -> `go`. States `arrive`, `fading`, `laptop`; physics is not running in them. The laptop keeps your last camera.
- Upgrades: `raceSetup.upgrades`, applied by `fitUpgrades` (from `restartCar`, so a restart keeps them). `currentSpec` adds them; `specFor` never does, so ratings stay stock.
- NOS: `vehicle.nosLeft`, `controls.state.nos`. A new input for it means filling `nos` in that source's `read`.
- NOS force is `NOS_PUSH` to `NOS_PUSH_HELD` in `vehicle.js`; `vehicle.nosHeld` is how long this burn has run. `Shake.burn` and `shake.nos` are the camera side.
- Phone: `save.binned` holds deleted mail ids (`bin` in `inbox.js`). `asking` is "are you sure?", `onBin` means the bin is picked.
- Road: `Tex.road(width)` gives one tile of the road's width by 32 m as map and bump. Headlights: `Tex.headlightPattern` is projected by the spot light.
- Shop and Garage laptop: `ui/desk.js`, `Desk.sync(screen)` from `Screens.showEl`. `DeviceStage.pin(el, w, h)` lays `.desk-panel` over the display each frame. `desk.inset` feeds the lens shift. `game.room` picks the scene (garage or Dave's lot).
- New line for Dave: `career/dave.js`. Stand-in face: a branch in `tools/story-paint.mjs`, `node tools/story-art.mjs faces`.
- Analytics: `race/analytics.js`, its numbers are checked at the end of `tools/ai-bench.mjs`.
- `game.device` is whichever of the phone and laptop is up. Both have `nav`, `press` and a key listener. `DeviceStage` (world/props-devices.js) draws them; `stage.update` runs from `render`.
- A new mail: a line in `MAIL` in `career/inbox.js`, with `when(career)`.
- A new Johnny line: `j('mood', 'text')` in `story.js`. Moods are the list at the top of `tools/johnny-sprites.mjs`. `{name}` and `{home}` work in any line.

## How the racing works
- `Race.step`: slipstream, drivers, walls, then `knocks()` (`physics/knocks.js`). Drivers think every 0.1 to 0.24 s (`AIDriver.think`) and steer to `plan`, an offset across the road.
- A style is a line in `STYLES` in `ai-driver.js`; `pickField` hands them out.
- Set difficulty on `tools/ai-bench.mjs`: the hunter table at the end is the number to watch.
- `raceSetup.mode` is 'race', 'trial' or 'practice'. A Time Trial is `this.trial` in `main.js`, with no `Race`.
- Speed effects read `speedRush` in `cameras.js`; the audio has its own `roar` from speed.

## How the career works
- `src/career/career.js` has the events, levels and pay; `node tools/career-bench.mjs` proves them and checks every event fits its track.
- A new stage: add events and acts, set `tier` and `price` on cars in `cars.js`, take the "to be continued" out of `signed` in `story.js` and `LATER`.
- A new scene: add it to `SCENES` in `story.js`, name it as an event's `before` or `after`. A new picture: a line in `SHOTS` or a branch in `tools/story-paint.mjs`, then `node tools/story-art.mjs`, and an entry in `FX` in `cutscene.js`.
- A new car also needs `node tools/car-cards.mjs <id>`.
- `main.js` runs a race through `Race` (`buildRace`, `raceStep`); with `rivals: 0` it is plain free driving. Results and pay are in `screens.js` (`results`).
- Save version 6: `garage.cars[id] = { look }`, use `carLook(save, car)`. `career`: cr, xp, done, tracks, seen, difficulty, racer. Also `read`, `updateMail`.

## How cars work
- `GLB/<file>` goes in unchanged. A recipe in `tools/car-recipes.mjs` names slots by `material|node`. `node tools/capture-car.mjs <id>` writes `assets/cars/<id>.bin`, `<id>-lite.bin` (lod 2 iPad copy, lod 1 parked, which is also what rivals use) and `assets/cars/tex/`.
- Check the printed scale: near 1:1 means the recipe's `axles` fit. Helpers: `listIslands`, `findSteering`, `listCabinNear`. Always check a cockpit by turning the wheel.

## Open with David
Ask these first, then start Part 4.
1. Can Claude download free CC0 textures and tree models? His answers skipped this; everything is still drawn in code.
2. Does "race any map in my stage" also mean choosing the map in Career? It is Race, Time Trial and Practice for now.
3. How does Yamagiri Pass drive, and is 3 laps too long? Is sunset too dark without headlights?
4. Did the iPad hold up? This update is the heaviest yet.
5. Are the sprite sheets for Sonny and Dave ready (5 across, 4 down, on black)? Any for Max and Aoi?
6. Do NOS, the headlights, the pull-up, the cockpit and Dave's lines work for him? All guesses.
7. Is Hard too hard? The Subaru's source and near-miss art for the Mustank's livery. Older guesses are in `STATE.md`.

Part 4 changes a rule: Sonny's 500 CR entry means "you can never lose money" stops being true for that race type. Update SPEC.md point 9 then.
