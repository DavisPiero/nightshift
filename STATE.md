# NIGHTSHIFT: state

_Last updated 2026-10-25, end of session 1._

## Where we are
Milestones 1 and 2 are signed off and live at https://davispiero.github.io/nightshift/
(repo DavisPiero/nightshift, everything on `main`). You can drive the Kaido R around the
Harbour Loop test road at night with the keyboard, in chase or cockpit view. It has an
automatic gearbox, synthesised engine sound, a rev counter HUD, a pause menu with settings
and an F3 debug panel. `./tools/smoke.sh` (which also runs the driving bench) passes.

## Next
1. Milestone 3: iPad touch controls (left joystick, right throttle/brake/handbrake, pause
   and camera buttons). Test them in the browser's iPad emulation first, then on a real iPad.
2. Before iPad testing, cut draw calls (about 600 now, mostly the parked cars and lamps).
3. A manual gearbox switch in Settings. The gearbox already supports manual; it just needs the setting.

## Open with David
- How does the car feel? So far it's tuned by numbers (0-100 in 5.3 s, 264 km/h top
  speed, no spins with assists on).
- How does the engine sound? It has been measured, but nobody has listened to it yet.
  Do you have engine recordings we're allowed to use?
- Still guesses until you confirm them: the game is for Arlo; the repo is called `nightshift`; the car is "Kaido R";
  the test road is "Harbour Loop"; the paint is off-white.

## Known rough edges
- The cockpit view is plain: a dark dashboard block and a simple steering wheel.
- The scenery beyond the fences is sparse. That's planned for the full circuit (Milestone 5).
- When the page has no size yet (a hidden tab), the renderer waits for the next resize.
