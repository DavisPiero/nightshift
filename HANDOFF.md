# Hand-off: end of session 4 (2026-10-26)

## Repo state
- Signed off and merged to `main` (live). No other branches.
- Bench passes. Baseline unchanged for the R34 (0-100 5.61 s, top 277 km/h, braking 38.0 m,
  coast 61 km/h, lap 78.3 s). New: R35 lap 74.3 s (S 862); Underground laps R34 93.5 s,
  R35 88.8 s, Challenjer 93.8 s, all clean.
- Smoke test runs three loads now (computer/clear, iPad/rain, R35/Underground).

## Read first
`CLAUDE.md` (art and UI rules changed this session), `STATE.md`, then the last 11 lines of `DECISIONS.md`.

## How the new pieces fit
- `src/vehicles/body.js`: `Body(def)` turns profile curves into the shell (`geometry()`),
  answers "where is the surface at (z, t)" (`point`, `normal`), and makes decals that follow
  it (`decal`). `flatShape` draws on the flat nose and tail. t runs 0..12 round the section:
  0-2 underside and sill, 2-6 side, 6 shoulder line, 7-8 fender top, 8-12 bonnet or glasshouse.
- `src/vehicles/car-model.js`: `SHAPES[carId]` holds each car's `def` (curves, wheels,
  windows, glass ranges) and a `details()` function. Add a car: a spec in `cars.js`, a shape here.
- `src/graphics/reflections.js`: a 64 px cube camera on the car photographs `world.reflect`
  (bright things only) every other frame; it is `scene.environment`, so every Standard or
  Physical material reflects it. Each world supplies `reflect` and `look.reflectBg`.
- Worlds (`buildTrackScene`, `buildGarage`) return `{ group, lamps, glows, roadMat, backdrop,
  reflect, look }`. `look` sets fog per weather, the hemisphere light, the moon and the lamp colour.
  `Game.loadTrack(id)` swaps the scenery.
- `src/world/garage.js` is its own scene. `Game.render` moves the car into it when the menu
  view is `garage` or `setup`; camera spots are in `views`.
- `tools/shot.mjs`: headless screenshots in seconds. `fixedTurn` on the game and
  `garage.views` can be set from `--js` to shoot a car from fixed angles.

## Next
Milestone 4 part 2 (garage mods).
