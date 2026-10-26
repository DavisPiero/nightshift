# Hand-off: end of session 7 (2026-10-26)

## Repo state
- `main`: `m4-world` merged and pushed (live on GitHub Pages). `m4-world` is deleted.
- Branch `m4-notes` (from main): David's fourth notes, committed in steps, **not merged**.
- Bench passes, including a new test: steered into a wall, the car touches it 3% of the time
  after the first hit (was 85%).

## Read first
`CLAUDE.md`, `STATE.md`, then the last 20 lines of `DECISIONS.md` and "Look of the menus" in SPEC.md.

## How the new pieces fit
- Menus: `index.html` + `styles/main.css`. Race settings is `#scr-race` (screens.js
  `buildConditions` / `fillRace`); Race opens `#race-load` (`Screens.raceLoad`), which calls
  `game.startRace(pick, true)` (state `loading`, car held) and later `game.go()`.
- Start-up loading: `#boot` in index.html (an SVG wheel); main.js fades it after the first
  frame. The race loading screen copies the wheel with its own ids.
- Garage: `ui/garage.js` (tab rail, `#garage-pop`, `orbitControls`) calls
  `game.orbitDrag/orbitZoom/orbitReset`; main.js `garageCamera` follows the orbit and shifts
  the lens (`setViewOffset`) by `garageInset`. Ride bounce: `game.rideBounce(d)`.
- Bonnet and engine bay: `vehicles/engine-bay.js`. `Body.geometry({ bonnet })` leaves the
  bonnet out; `bonnetGeometry` makes it. `model.setBonnet(open)`, `model.fitPart(slot)`.
  `buildSpec` now copies `parts` onto the spec so the model can show them.
- Sky: `graphics/sky.js`, a shader dome in each track's backdrop
  (`backdrop.userData.sky`), set from `WeatherView.set` (time from `look.time`, glow from
  `look.skyGlow`). Bloom: `renderer.js`, on when the preset has `bloom`.
- Particles: `graphics/effects.js`: `Particles` are sprites from a painted sheet, `Streaks`
  are sparks.
- Sound: `audio/ui-sounds.js` (menu sounds, hooked in `Screens.menuSounds`); `audio.js` has a
  `world` gain so pause hushes the car but menus still click (`hush`).
- Minimap: `ui/hud.js` `setTrack` / `drawMap`.
- Loading stills: `./tools/loading-stills.sh` (re-run after changing how a track looks).

## Next
1. David plays `m4-notes`, then signs it off or sends notes.
2. Milestone 6: racing (checkpoints, countdown, lap timing, results).

## Open with David
- Sign off `m4-notes`.
- Confirm the guesses listed in STATE.md.
