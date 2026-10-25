# Hand-off: end of session 1 (2026-10-25)

## Repo state
- Everything is on `main`, pushed to https://github.com/DavisPiero/nightshift, and live at
  https://davispiero.github.io/nightshift/. There are no other branches. The working tree is clean.
- `./tools/smoke.sh` passes. It covers the headless bot drive and the physics bench.

## Read first
1. `CLAUDE.md`: hard rules, how to run and check, code map.
2. `STATE.md`: where we are and the open questions.
3. `SPEC.md`: what makes it fun, the milestones, what we're not building.
4. `DECISIONS.md` when you need to know why something is the way it is. `BRIEF.md` is the full
   original brief, for detail on Milestone 3 (section 9, iPad).

## Next
Milestone 3: iPad touch controls. Add `src/input/touch.js` as another source for
`Controls` (left analogue joystick for steering; right buttons for throttle, brake/reverse
and handbrake; pause and camera buttons). Show it only when the platform is `touch`.
Remove the "touch controls arrive in the next build" note (`#touch-note`).
Test with the browser's iPad emulation, and say plainly that it hasn't been tested on a
real iPad until it has. Cut draw calls first (parked cars and lamps, about 600 now).

## Open questions for David
- How does the car feel when you drive it?
- How does the engine sound? Do you have engine recordings we're allowed to use?
- Please confirm or change these guesses: the game is for Arlo; the car is "Kaido R"; the
  road is "Harbour Loop"; the paint is off-white.
