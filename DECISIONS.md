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
