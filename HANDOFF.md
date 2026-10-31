# Hand-off: end of session 13 (2026-10-31)

## Repo state
- On `main`, everything committed and pushed: session 13 was signed off and `m6-car-foundry` is merged and deleted. `main` is the live site. Next work goes on a new branch; merge only when David signs off (he says "push" for merge everything and push).

## What comes next
1. If David brings notes from playing the live site (the iPad especially), take those first (use `/notes`).
2. Then the maps and environment rebuild he named as next. Plan it and wait for his go-ahead.

## How the foundry works
- `tools/foundry/make-car.sh <id>` runs it all. `Reference/Cars/<id>-sheet` is the sheet; `tools/foundry/cars/<id>.json` says where each view sits on it.
- `trace-sheet.py` measures outlines into `cars/<id>-trace.json` (committed, so the sheet is not needed to rebuild).
- `cars/<id with underscores>.py` is the blueprint: outlines, cuts, parts. `foundry.py` is its toolbox: `loft`, `boolean`, `gap`, `seam`, `pocket`, `panel`, `bar_path`, `wheel_set`.
- `build-car.py` writes `GLB/<id>.glb`, prints the score (`score.py`). `tools/capture-car.mjs` then takes it like any bought-in GLB; the recipe in `tools/car-recipes.mjs` just names slots.
- Name a Blender object `pop`, `kitstreet`, `kitwide` and recipe rules put it in those groups. `popups`, `dials`, `steeringAt`, `headLamp`, `kits` in a recipe switch those features on in `car-model.js`.
- Check material names before adding a rule: rules go by `material|object`, first match wins.

## Read first
`CLAUDE.md`, `STATE.md`, the last 10 lines of `DECISIONS.md`.

## Open with David
- See STATE.md: the session 13 guesses first, then the iPad frame rate.
