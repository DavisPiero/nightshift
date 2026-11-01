# Hand-off: end of session 16 (2026-11-01)

## Repo state
- On `main`, everything committed and pushed; no other branches. `main` is the live site. Next work goes on a new branch; merge only when David signs off (he says "push" for merge everything and push).

## Read first
`CLAUDE.md`, `STATE.md`, the last 15 lines of `DECISIONS.md` (they include David's answers for Part 3).

## What comes next
1. Ask David how Part 1 drives, and if he has Arlo's reaction.
2. Part 3: story, phone and laptop. The brief is in `STATE.md` under Next; his answers are at the end of `DECISIONS.md`.
3. Use `/notes` for any new notes.

## How the look works
- Colours, fonts, spacing: the list at the top of `styles/main.css`. Canvas drawings repeat a few of those values (`ui/hud.js`, `ui/screens.js`, `input/touch.js`).
- A new DotGothic16 element may need adding to the outline rule under the list (`--weight`).
- New update: new `id` and lines in `ui/notice.js`.

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
- Save version 6: `garage.cars[id] = { look }`, use `carLook(save, car)`. `career`: cr, xp, done, tracks, seen, difficulty.

## How cars work
- `GLB/<file>` goes in unchanged. A recipe in `tools/car-recipes.mjs` names slots by `material|node`. `node tools/capture-car.mjs <id>` writes `assets/cars/<id>.bin`, `<id>-lite.bin` (lod 2 iPad copy, lod 1 parked, which is also what rivals use) and `assets/cars/tex/`.
- Check the printed scale: near 1:1 means the recipe's `axles` fit. Helpers: `listIslands`, `findSteering`, `listCabinNear`. Always check a cockpit by turning the wheel.

## Open with David
Everything under "Open with David" in STATE.md.
