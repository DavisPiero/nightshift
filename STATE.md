# NIGHTSHIFT: state

_Last updated 2026-10-26, end of session 6 (Milestone 4 part 3, the world)._

## Where we are
Milestone 4 part 3 is built on branch `m4-world`, not merged. `main` (live) is still part 2.
It adds:
- Parabolica Street: a Monza-shaped Tokyo ring road (3.62 km), a park inside, a town outside
- time of day: Sunset, Night or Dawn (the Time box on the car pick)
- snow, a fourth weather
- weather patches: stretches of each track where the weather gets heavier
- the asset library: every prop is a named piece; `?library` shows each one

Bench and smoke test pass (four runs, now including Parabolica in snow at dawn).

## Next
- David plays the branch and signs off (or sends notes).
- Then Milestone 5 (a second full night circuit) or 6 (racing), David to choose.

## Open with David
- Sign off `m4-world` (not merged yet), or send notes after playing it.
- Which next: Milestone 5 (a second full night circuit) or 6 (racing)?
- Nothing else open: every earlier guess was confirmed on 2026-10-26 (see DECISIONS.md).

## Known rough edges
- Touch and controllers are untested on real devices.
- Parabolica Street is the heaviest track: about 190 draw calls (Starter 160). Untested on iPad.
- Japanese text needs the DotGothic16 font from Google; offline it falls back.
- White decals on a white car do not show (pick another decal colour).
- The GT wing reads as a dark slab from some angles.
