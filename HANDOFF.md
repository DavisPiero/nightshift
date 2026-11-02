# Hand-off: end of session 21 (2026-11-02)

## Repo state
- On `main`, everything committed and pushed; no other branches. `main` is the live site. Next work goes on a new branch.

## Read first
`CLAUDE.md`, `STATE.md`, the last 20 lines of `DECISIONS.md`, then this file.

## What comes next
Nothing is queued. Start with what David and Arlo find playing this update.

## How session 21 works
- Drift: `drift.mix` 0..1 is its share of the car, `free` in `step` is the tyres'. `drift.angle` is the eased slide. Times are at the top of `vehicle.js`. The drive bench's `jolt` must stay under 8.
- Roll-up: `Game.arrive` before everything; `raceLoad` always calls it. `raceView.clearLane` and `showAll`. The laptop comes only if `raceSetup.event`.
- CC0: `tools/fetch-cc0.mjs` to `assets/world/`; `worldReady` in `models.js`; `found()` in `assets.js`; `modelMesh` for hand-built scenes; `Tex.photo(name)`. `rockOnSteeps` in `mountain-scene.js`.
- Home tiles are `assets/loading/*.jpg`: re-run `tools/loading-stills.sh` after a look change.
- `tools/shot.mjs`: a job with `same: true` stays on the page, for a sequence.

## How Part 4 works
- Testing sound: headless Chrome never lets an AudioContext start (`ctx.resume()` hangs forever). Render in an `OfflineAudioContext` on `review/blank.html` instead.
- Drift: `vehicle.drift`, set in `checkDrift`, moved in `stepDrift`, which takes over from the tyre forces. Angles are at the top of `vehicle.js`. `c.park` is the finish's version of it.
- Finish: `FinishDriver` replaces the player's driver after the flag (`takeover`). `driver.parked` ends the wait. `cameras.finish(true)` swings the camera. `ui/tally.js` shows what `results()` already banked.
- Warm tyres: `race.warm`, `v.launchLeft`, `v.burnout` (smoke at a standstill).
- Fight for P1: `race.hunt` from `difficulty.js`; `driver.huntGoal`, eased into `driver.hunt`.
- Sound: a new one-off is a function in `FX` in `audio/sfx.js`; play it with `audio.fx(name, v)` in the world or `audio.ui(name)` in the menus. `pick(kind, n)` picks a version without repeats. `audio/rivals.js` owns the rival voices. `EngineVoice.dispose()` stops one properly.
- Contacts: `CONTACTS` in `career/contacts.js`, met when a scene id is in `career.seen` (`dave-lot` is set by opening the Shop). `call()` returns a message the phone shows. `clock.now()`, never `Date.now()`, so `?hours=` works.
- Invites: `currentInvite(career)` is worked out from `career.sonny.since`; add a race to `RACES`. An invite is event-shaped with `invite: true`. Career's `pick` is `'invite'`.
- Jobs: a line in `QUESTS` in `career/quests.js`, `done(r)` looks at the finished race.
- Prices: always `priceOf(save, car)`, and `paid(save, deal)` after buying.
- Same world: `Reflections.sampleRoad` is the look down at the road. Sprites: `tools/character-sprites.mjs`; `blobs: true` for a sheet with poses too close for columns.
- A sprite person: `sprite: true` and `voice` in `PEOPLE`; images in `assets/story/<id>/`. Dave's moods are `DAVE_MOODS`.

## How the environments work
- Road height: `heights` keys in a track's definition; `TrackPath.y`, `.grade`. `keepOnTrack` calls `settleOnRoad`, which sets `vehicle.roadY`, `.slope`, `.slopeSide`. After teleporting a car, call `settleOnRoad` before any camera snap. `placeOnRoad` (race-view.js) tips a body. Strips and walls in `scene-kit.js` follow the height by themselves; a Placer needs the y passed in.
- Sky bake: `skyBackdrop(farGroup, centre)` or `cityBackdrop`. `backdrop.userData.far` is the `FarBake`; `applyLook` bakes, `WeatherView.set` sets the haze. It must not be `transparent` in Three's eyes or it draws over the world.
- Trees: `crown()` and `limbs()` in `assets.js`, textures `Tex.leaves`, `blossom`, `cedarTier`, `cedarCard`. Crowns are `FrontSide`: double-sided flips the out-pointing normals and turns half the cards black.
- A world can have `update(dt, camera, v)` (Parabolica's petals) and `setSnow(on)` (the mountain's ground).
- Smoke test: a race on the mountain gets 120 to 237 m against its 200 m limit (traffic; the same on the old main in session 21), so it often fails with nothing wrong. A narrow miss there is not a broken game, but look before assuming so.
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
- New line for Dave: `[mood, words]` in `career/dave.js`. Sonny's stand-in face: a branch in `tools/story-paint.mjs`, `node tools/story-art.mjs faces`.
- Analytics: `race/analytics.js`, its numbers are checked at the end of `tools/ai-bench.mjs`.
- `game.device` is whichever of the phone and laptop is up. Both have `nav`, `press` and a key listener. `DeviceStage` (world/props-devices.js) draws them; `stage.update` runs from `render`.
- A new mail: a line in `MAIL` in `career/inbox.js`, with `when(career)`.
- A new Johnny line: `j('mood', 'text')` in `story.js`. Moods are the lists at the top of `tools/character-sprites.mjs`. `{name}` and `{home}` work in any line.

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
Ask these first.
1. How do the new drift, warm tyres, the fight for P1, the finishes and the sounds feel and sound? Nobody here can feel or hear them.
2. Does High run smoothly? Has it been tried on a real iPad?
3. Sprite sheets for Sonny, Max and Aoi?
4. Is 15% for Dave's jobs right? Other guesses are in `STATE.md`.
