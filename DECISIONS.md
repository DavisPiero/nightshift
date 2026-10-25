# Decisions

One line each, newest last.

- 2026-10-25: No Vite or build step; plain ES modules with Three.js r170 vendored. Matches David's other games on GitHub Pages; nothing to build before publishing.
- 2026-10-25: Custom arcade physics instead of a physics library. Easier to tune for forgiving drifts and identical at any frame rate.
- 2026-10-25: Physics is a bicycle model (one front and one rear tyre pair) with three assists (steering, stability, drift), all on by default.
- 2026-10-25: Rear tyres grip 8% more than the fronts so the car is calm when coasting; throttle and handbrake are what free the tail.
- 2026-10-25: Engine sound synthesised in code (layered harmonics, crank pulse, sub-bass, intake noise) until we have recordings we may redistribute. Built so a sample player can replace it.
- 2026-10-25: The scene is drawn at 360/480/720 lines (Low/Medium/High) and scaled up with square pixels, plus a colour grade and 6-bit dither. The retro look also comes from low-poly models and tiny textures.
- 2026-10-25: Only the few lamps nearest the car get real lights; every lamp has a painted light pool on the road. Keeps iPads fast.
- 2026-10-25: Walls are the track's own centre-line data (distance from centre), not separate collision meshes. Same data will drive checkpoints and AI.
- 2026-10-25: The car is right-hand drive (Japanese), so the cockpit camera sits on the right.
- 2026-10-25: Holding brake at a standstill selects reverse; holding throttle at a standstill selects first. Same in auto and manual.
- 2026-10-25: STATE.md replaces the brief's PROJECT_STATUS.md (David's usual state file).
- 2026-10-25: Repo DavisPiero/nightshift, public, GitHub Pages from main.
- 2026-10-25: The smoke test runs its loop on a timer and at Low graphics, because headless Chrome never fires animation frames.
- 2026-10-25: Assists must keep a held handbrake at full lock under ~70° of slide; checked by the bench.
- 2026-10-25: First drive signed off and merged; GitHub Pages serves main.
- 2026-10-25: Cars are modelled on real cars with near-miss names ("Nissani Skyliner"), no logos. David's call; replaces "original designs only".
- 2026-10-25: The R34 stays rear-drive (the real one is four-wheel drive) so it is still easy to drift.
- 2026-10-25: Body lean capped at about 3° and pivots near axle height, so the body never dips into the road.
- 2026-10-25: Lift-off: the auto box holds a gear when coasting, stronger engine braking, plus 0.6 m/s² of arcade drag. 100 km/h becomes about 60 after 8 s (was 86).
- 2026-10-25: Walls test eight points round the body and push back with a real impulse at the contact point; light pushes slide freely so the car can never be pinned.
- 2026-10-25: At walking pace the front tyres' sideways force fades out; it was dragging the car when pulling away at full lock.
- 2026-10-25: The cockpit camera never rolls with the body: the horizon stays level.
- 2026-10-25: UI in Courtside's pixel style (Jersey 10 from Google Fonts), orange for the main action, cyan for selection.
- 2026-10-25: Weather is one table (grip, slide, fog) read by physics, bench, menus and visuals. Rain grip 0.74, fog 0.93.
- 2026-10-25: "Race" means free driving on the chosen track until lap timing exists (Milestone 6).
- 2026-10-25: Low resolution (360 lines) is the default on every device.
- 2026-10-25: Lamps, buildings, parked cars and props are instanced or merged; parked cars are baked into one set of meshes.
- 2026-10-25: Touch controls save positions as screen fractions and are placed by dragging in Settings, not by hand-tuned numbers.
- 2026-10-25: Exhaust pops are timed by the flames effect and played by audio, so sound and flame always match.
