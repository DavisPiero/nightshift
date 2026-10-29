# Hand-off: end of session 10 (2026-10-30)

## Repo state
- Everything is merged into `main` and pushed (David: "push without asking"); no open branches.
- Driving bench and smoke test pass (smoke run before the final docs-only commits).
- Milestone 6 is now the **realism overhaul** (racing is parked). `AUDIT.md` lists every model and its gaps.

## Read first
`CLAUDE.md`, `STATE.md`, `AUDIT.md`, then the last 25 lines of `DECISIONS.md`. References: `Reference/Cars` (R35, Challenger, Aventador, Miata sheets), `Reference/Realism` (five screenshots), `Reference/User Interface/noticeboard-win98.jpg`.

## How the new pieces fit
- Renderer: `graphics/renderer.js`. Medium/High (`smooth: true` in `core/config.js`) draw at 720/1080 lines with 4x MSAA, linear filtering, ACES in the post shader, no dither. Speed blur and lens fringing live in the same shader (`setLens`, switches in `EFFECTS`). Low keeps the chunky look. `textures.js setSmoothTextures` flips texture filtering.
- Miata: `cars.js MIATA_NA`, `car-model.js SHAPES['miata-na']` + `miataDetails`, `body.js def.softTop`, `cabin.js sh.cabinScale` (cabin scaled 0.9). First and default car in `save.js`.
- Classes: thresholds in `vehicles/stats.js` (S 850, X 950).
- UI: zoomed heading-up minimap (`ui/hud.js`), boot text (`ui/boot-log.js`), notice board (`ui/notice.js`, `#notice`, styles at the end of `main.css`).

## Next
1. Rebuild R35, R34 (still hidden), Challenjer, Mustank bodies and cockpits to the realism standard; check the Miata properly (pop-up lids in cockpit view, pale roof in the garage).
2. Environment: roads, buildings, terrain, garage; headlight pools, wet roads, sun raise.
3. Effects: ambient occlusion, exposure adaptation, lens dirt, flame/smoke/spark upgrades.
4. Balance pass (separate commits): real-world figures are in DECISIONS.md.
5. Racing (old Milestone 6) after that.

## Open with David
- Send the Mustang reference sheet.
- Guesses to confirm: the Miata's name, numbers and paints; the notice board wording; fringing strength; the Aventadoro keeping its SV name with the LP 700-4 rear; Medium as default (untested on iPad).
- Whether to correct stats to real-world figures (it changes feel).
