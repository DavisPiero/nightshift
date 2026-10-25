# NIGHTSHIFT: state

_Last updated 2026-10-25, end of session 2._

## Where we are
Milestone 3 (iPad controls plus David's first-drive notes) is built and merged to `main`
(live at https://davispiero.github.io/nightshift/). You pick Drive, the Starter Track, the
weather and the car, then Race (free driving for now). The car is the 1999 Nissani Skyliner
GT-R (R34) with a real cockpit. Touch controls work in the browser's iPad emulation.
Menus are in the Courtside pixel style. Settings come in four tabs. Rain and fog change grip.
Effects can be switched on and off. The track has a lot more in it. The bench passes.

## Next
1. Try it on a real iPad: touch feel, layout, speed (about 100 draw calls now, was ~600).
2. Milestone 6 racing: countdown, checkpoints, lap timer, results (Restart exists already).
3. Engine sound, if recordings turn up (Milestone 4).

## Open with David
- How do the lean, the lift-off slowing and the cockpit feel now? (Lift-off: 100 km/h
  drops to about 60 after 8 s; lean is about 3°.)
- Is the cyan and orange right? Is the Jersey 10 font right, or would you like a different
  pixel font from Courtside's?
- Guesses still unconfirmed: the game is for Arlo; the R34 stays rear-drive (the real
  one is four-wheel drive); "Race" means free driving until lap timing exists; rain takes
  about a quarter of the grip away.
- How does the engine sound? Do you have recordings we're allowed to use?

## Known rough edges
- Touch controls have only been tested in browser emulation, not on a real iPad.
- The headless smoke test is slow now, a few minutes (software rendering of a much fuller scene).
- The pixel font loads from Google Fonts; offline it falls back to a plain monospace font.
