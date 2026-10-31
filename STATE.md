# NIGHTSHIFT: state

_Last updated 2026-10-31, session 14, on branch `m6-glb-vehicles`. Nothing from this session is committed or live yet. `main` is still session 13._

## Where we are
David's update brief (GLB vehicles, then environment), six phases, each checked by David.
- Phase 1, GLB import: built. Full cars keep every triangle (badges and inner glass faces removed), compressed. Lite files for iPad and parked cars. Panels are separate named meshes.
- In the game now: Subaro Impreza WRX STi Coupe (first car, replaces the Miata), Nissani Skyliner GT-R R34 (back), 1969 Fard Mustank Touring Car (replaces the 2012 car), Lamborgino Countash 5000 QV (new). Seven cars in all.
- Miata scrapped; old saves move to the Impreza (save version 4). Foundry unused, kept in `tools/foundry/`.

## Next
2. Physical modifications: widebody, street kit, wings on every car, on real geometry.
3. Finish integration: remove the old drawn-car code, keep the models' own engines.
4. Paint presets and shared materials (mirrors, lamps, glass).
5. Environment: trees, materials, geometry.
6. Remove the blue shimmer; acceleration zoom.

## Open with David
- Where did the Subaru GLB come from? No author or licence, and it must not go live until cleared.
- iPad frame rate never measured; iPads use the lite copy everywhere until it is.
- David's nine answers are taken as "yes to all" (see DECISIONS.md and the session 14 plan).
- Guesses to confirm (session 14): the Impreza's 146 hp and four-wheel drive; "Late 90s" instead of a year; the Countash's numbers (class A 825) and blurb; the near-miss names; the Mustank's seat position; the Impreza's red cam covers in the drawn engine bay.
- Guesses to confirm (older): the feel of the slower cars; left-hand R35; Aventadoro in class X; handbrake lever; mode tile pictures; Parabolica's gold lamps; sun glare strength; engine sounds; tips' wording; green gear and speed display; Map on teal; garage lens; rim sizes.

## Known rough edges
- The Mustank has no livery yet (Phase 4), and its real sponsor logos must be replaced first. Its round lamps come out amber.
- Cabin mirrors show as flat bright panels. Dials on the new cars do not move.
- Kits on the new cars change numbers only until Phase 2.
- The Skyline's own engine is left out; the game's drawn bay is used instead.
- Assets: 58 MB of car files, 7 cars. Textures are JPEG and PNG, not yet tighter.
- Touch and controllers untested on real devices. Parabolica Street is the heaviest track.
