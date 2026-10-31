# NIGHTSHIFT: state

_Last updated 2026-10-31, end of session 13. Work is on branch `m6-car-foundry`, not merged: waiting for David's sign-off. `main` is still the old live site._

## Where we are
Milestone 6, the realism overhaul. On the branch:
- Car foundry (`tools/foundry/`): a reference sheet goes in, a detailed car comes out through the same capture as the bought-in cars. `./tools/foundry/make-car.sh <id>`.
- The Miata rebuilt with it: outside, cabin, working pop-ups, moving dials. 99% match to the sheet's outline.
- Garage rims are real 3D wheels on every car; the car keeps its tyres and brakes. The four bought-in car files are unchanged.
- The Miata's body kits and wing are real parts.
- Menus and the driving HUD in the old Microsoft look. CLAUDE.md and SPEC.md rewritten to match.
- Garage lens softened.

## Next
1. David judges the Miata, the rims and the UI on a real iPad, then signs off.
2. Rebuilding the maps and environment assets (David: next, replaces Parabolica remake and Mountain Edge in the old order).
3. Later: real kits on the other four cars through the same parts system; the R34 through the foundry when it is wanted.

Also not done: exhaust flame/smoke/spark upgrades, ambient occlusion, exposure adaptation, headlight pools and wet roads, the sun raise. Racing is parked until after this.

## Open with David
- Not measured: frame rate on a real iPad with everything together.
- Guesses to confirm (session 13): the cabin's look (the sheet barely shows it); pop-ups down in the garage and up when driving; pink kept on main buttons; the Map on Windows teal; the green gear and speed display; the shape of the Street and Widebody kits; the amount the garage lens is softened; the wheel size of the six rims against each car.
- Guesses to confirm (older): the feel of the slower cars, drifts especially; near-miss names; left-hand R35; hub pads; Mustang interior darkness; the Aventadoro in class X; the handbrake lever's look; the mode tiles' pictures; Parabolica's gold lamps; the sun glare's strength; the R34 still hidden; engine sounds; tips' wording.

## Known rough edges
- Foundry: a new car still takes a working session (trace, blueprint, parts). Sheets show little interior; one or two cabin pictures would help.
- The Miata's front wheel sits about 11 cm further back than on the sheet, because the sheet's wheelbase is longer than the game's physics.
- Parked cars and the hidden R34 still use the old flat wheel.
- Bought-in cars: dials do not move; body kits change only the numbers; the GT wing is not seen on the Mustank or Challenjer; about 14 MB to load in all.
- The Aventadoro's engine bay is the front-engine layout turned round.
- Touch and controllers are untested on real devices. Parabolica Street is the heaviest track.
- White decals on a white car do not show.
