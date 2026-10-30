# NIGHTSHIFT: state

_Last updated 2026-10-31, session 12 (cars captured; speed and effects merged and live)._

## Where we are
- David's fifth notes are built and pushed to `main` (live), as he asked ("push it without
  asking me"):
  - the multicoloured dots round lamps and tail lights: fixed at the cause (the dither);
  - touch: a real handbrake lever; pedals and the loading wheel with chunky pixels;
  - race loading screen stays 5.5 s;
  - Drive opens a mode screen: Single Player Race (works), Multiplayer and Career (greyed);
  - sunset and dawn: a strong low sun, its glow in the paint, glare when you face it;
  - cockpit: rebuilt cabin, a dome light, leans with the body (no gaps when turning);
  - callipers no longer flicker; door mirrors no longer float;
  - two new cars: Lamborgino Aventadoro SV (class X) and Fard Mustank Shelbi GT-500 (S);
  - Parabolica Street in purple, pink and gold, its town built in ordered blocks;
  - better trees, buildings and fences everywhere; a busier, living garage;
  - race AI written and benched, not shown in the game.
- Driving bench, AI bench and smoke test pass.

## Now: Milestone 6 = realism overhaul (merged to `main` as it goes)
- Session 12: four cars rebuilt from David's GLBs and renamed to match: GT-Ar Aimgane Type 2, Challenjer SRT Super Stok, Aventadoro SVJ, 2012 Mustank Shelbi. Real bodies, real interiors, own wheels, turning steering wheels. Authors credited in the README. Physics untouched.
- Signed off and live: slower acceleration, convolution bloom, lens dirt and blue reflections, motion blur with a cockpit mask, less fringing.
- Next, from David's Visual Realism brief, in this order: (1) Parabolica Street remade with blossom; (2) the Mountain Edge track; (3) old-Microsoft UI.
- Not measured yet: frame rate with the new bloom, and any run on a real iPad.
- Also not done: Miata and R34 still on the old curve bodies (no GLB), exhaust flame/smoke/spark upgrades, ambient occlusion, exposure adaptation, headlight pools and wet roads, the sun raise.
- Racing is parked until after this.

## Open with David
- Sent (done): the Mustang sheet.
- Guesses: the Miata's name (Mazdo), numbers and paint names; the notice board's wording; fringing strength; the R34 is still hidden.
- Guesses to confirm (speed and effects): the amount of slowing; bloom, dirt and blue reflection strengths; blur starting at 140 km/h.
- Guesses to confirm (session 12): the new near-miss names (Aimgane, Super Stok, SVJ); R35 now left-hand drive; the plain pad on each steering hub; the Mustang's interior darkened to 42%.
- Guesses to confirm (session 10):
  - the new cars' names, years, colours and numbers; the Aventadoro landing in class X;
  - the handbrake lever's look; the mode tiles' pictures (track stills);
  - Parabolica's lamps turning gold (they were white by an earlier decision);
  - the cabin layout (two-tone grey, red seat inserts in the Aventadoro), the dome light's strength;
  - the sun glare's strength.
- Older guesses still open: the menu look, engine sounds, the minimap's size, the tips' wording.

## Known rough edges
- Captured cars: dials do not move; body kit parts change only the numbers on them; bonnet undersides are plain; the old engine bay sits under the bonnet. No iPad test yet of the bigger cars (82k to 142k triangles).
- Touch and controllers are untested on real devices.
- The new cars are first passes: the Aventadoro's bonnet ducts are dark slabs, the engine bay
  under its rear lid is the front-engine layout turned round.
- Parabolica Street is still the heaviest track. Untested on iPad.
- White decals on a white car do not show. The GT wing reads as a dark slab from some angles.
