# Hand-off: end of session 16 (2026-11-01)

## Repo state
- On `main`, everything committed and pushed; no other branches. `main` is the live site. Next work goes on a new branch (`m7-story`); merge only when David signs off (he says "push" for merge everything and push).
- Benches at the end: career 50 races, 5.3 hours; driving bench pass; AI bench pass; smoke test passes all five runs.

## Read first
`CLAUDE.md`, `STATE.md`, the last 20 lines of `DECISIONS.md`, then this file.

## What comes next: Part 3 of Arlo's notes
Plan it first (`/kickoff`), then build. The earlier plan named these new files: `tools/johnny-sprites.mjs`, `assets/story/johnny/`, `src/ui/phone.js`, `src/ui/laptop.js`, `src/world/props-devices.js`, `src/career/upgrades.js`.

David's brief:
- **Johnny.** A retired mechanic who moved from America to Japan. He never says where he was born. His dream is to engineer and own his own racing team, and he thinks you have talent. The game now takes place in Japan, so "one long flight", "The Old Country", the Ohio and Yokohama lines all go.
- **His sprite.** Sheet: `Reference/Characters/johnny-sprite-sheet.webp`, 1536 x 1024, 5 across, 4 down, 20 expressions on black (the black must come out; the dark shirt and goggles must not; poses are not lined up in their cells, so line them up). Pixelate it a TINY bit more. A little bounce when his expression changes. Pick an expression per line.
- **The player.** Backstory: just data analysis, turned racer. Drop the dock work and rewrite the story to fit (David's words). Before the first race, make your racer: name and nationality, worked into the story (Johnny asks). Your name shows in his lines and on the race sheet. Home flag is a paint option. Existing saves keep their progress.
- **The ending.** Aoi offers the seat; you sign only with Johnny as your engineer; that starts his team.
- **Phone.** A small button next to the Settings gear. An old-school flip phone pulls up on the right of the screen, slightly tilted and 3D, a real model. Inbox and notifications such as updates. "You got mail" lives here.
- **Pre-race, career only.** A 3 s scene of you pulling up to the race, skippable, fades to your cockpit. A laptop (a real model) comes up on the right-hand side; you can't switch camera yet. Buy one-race upgrades, then the countdown, then you can use them and switch camera.
- **Upgrades.** One buy per race, kept on a restart, career only. NOS is the best at 1000 CR, on Shift, a limited amount; also a speed boost and better handling. Earlier guesses: NOS about 6 s, Engine map 700 CR +8% power, Sticky tyres 500 CR +6% grip, Hard brakes 300 CR +10% braking. NOS needs a touch and a gamepad button too, through `controls.js`. The laptop's NOS row may name its key (one exception to the hints rule).
- Must skip with one press: the spec wants to be in the car within seconds. Rebalance pay with upgrades in (Street is 5.3 hours; the target was about 6). Redo the docks and grid story art (old Starter Track). Change the hard rule "no performance parts" to "no permanent parts" in `CLAUDE.md` and `SPEC.md`.
- GT3: not yet (David).

## Open with David
Everything under "Open with David" in `STATE.md`. Also for Part 3: are the Max and Aoi faces staying until he brings sheets like Johnny's?

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
