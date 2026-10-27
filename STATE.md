# NIGHTSHIFT: state

_Last updated 2026-10-28, session 9 (realism overhaul, on branch `m6-realism`, not merged)._

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

## Now: Milestone 6 = realism overhaul (branch `m6-realism`)
- Done: audit (`AUDIT.md`), smooth renderer on Medium/High (default Medium), reference images in `Reference/Realism/`.
- Next: Stage 2 cars and cockpits (R34, R35, Challenjer now; Mustank, Aventadoro, Miata when sheets arrive), then world, lighting, post effects, balancing (separate commits), UI.
- Racing is parked until after this.

## Open with David
- Send: Mustang, Aventador and Miata reference sheets, and the notice-board reference image.
- Guesses to confirm (this session):
  - the new cars' names, years, colours and numbers; the Aventadoro landing in class X;
  - the handbrake lever's look; the mode tiles' pictures (track stills);
  - Parabolica's lamps turning gold (they were white by an earlier decision);
  - the cabin layout (two-tone grey, red seat inserts in the Aventadoro), the dome light's strength;
  - the sun glare's strength.
- Older guesses still open: the menu look, engine sounds, the minimap's size, the tips' wording.

## Known rough edges
- Touch and controllers are untested on real devices.
- The new cars are first passes: the Aventadoro's bonnet ducts are dark slabs, the engine bay
  under its rear lid is the front-engine layout turned round.
- Parabolica Street is still the heaviest track. Untested on iPad.
- White decals on a white car do not show. The GT wing reads as a dark slab from some angles.
