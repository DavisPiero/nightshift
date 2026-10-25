# NIGHTSHIFT: state

_Last updated 2026-10-25, end of session 1._

## Where we are
Milestones 1 and 2 are built on branch `first-drive`. They are not merged, so the live site
isn't up yet. You can drive the Kaido R around the Harbour Loop test road at night with the
keyboard, in either camera. It has an automatic gearbox, synthesised engine sound, a rev
counter HUD, a pause menu with settings and an F3 debug panel. `./tools/smoke.sh` and
`node tools/drive-bench.mjs` both pass.

## Next
1. Milestone 3: iPad touch controls (left joystick, right throttle/brake/handbrake, pause
   and camera buttons), tested in the browser's iPad emulation first, then on a real iPad.
2. Manual gearbox switch in Settings (the gearbox already supports it; there's no UI yet).

## Open with David
- Sign off on the first drive, so I can merge to `main` and the site goes live.
- How does the car feel? It's tuned by numbers so far (0-100 in 5.3 s, 264 km/h top
  speed, no spins with assists on). Feel needs your hands on it.
- How does the engine sound? It's measured but nobody has listened to it yet. If you
  have engine recordings we may use, they'd be better.
- Guesses awaiting confirmation: the game is for Arlo; repo name `nightshift`; the car is
  called "Kaido R"; the test road is "Harbour Loop"; the paint is off-white.

## Known rough edges
- The cockpit view works but is plain (dark dashboard block, simple wheel).
- Around 600 draw calls per frame, mostly the six parked cars and the lamps. Fine on a
  laptop (about 2 ms a frame); needs trimming before iPad testing.
- The scenery beyond the fences is sparse. That's planned for the full circuit (Milestone 5).
