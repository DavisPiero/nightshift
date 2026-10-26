# NIGHTSHIFT: state

_Last updated 2026-10-26, end of session 7 (David's fourth notes)._

## Where we are
- `m4-world` (the world) is signed off and merged into `main` locally. **`main` is not pushed
  yet**: the push was blocked here, so David pushes it (see HANDOFF.md).
- Branch `m4-notes` holds all of David's fourth notes, built in one session, not merged:
  - menus: new look, race settings screen, loading screens;
  - garage: pop-ups, orbit and zoom, the bonnet and engine bay;
  - driving: minimap, wall bounce, shift jolt;
  - looks: sky, bloom on High, particles, cockpit;
  - sound: engine sound, menu sounds, crickets gone;
  - touch: pedals, no double-tap zoom;
  - the R34 is hidden.
- Bench passes (with a new wall-grind test). Smoke test: see HANDOFF.md.

## Next
- David plays `m4-notes`, then signs it off or sends notes.
- Then Milestone 6 (racing), as David chose.

## Open with David
- Push `main` (one command, in HANDOFF.md).
- Sign off `m4-notes`.
- Guesses to confirm:
  - the new menu look, which was built without a mock first;
  - the engine sounds, which nobody has heard yet;
  - the cockpit, how far toward the references;
  - the tips' wording;
  - the minimap's size;
  - the race loading screen's 2.6 s minimum.

## Known rough edges
- Touch and controllers are untested on real devices, including the double-tap fix.
- Engine and menu sounds were checked to play without errors, not by ear.
- The engine bays are simple boxes and cylinders; the R35 bonnet underside is a flat panel.
- Parabolica Street is the heaviest track (about 190 draw calls). Untested on iPad.
- White decals on a white car do not show. The GT wing reads as a dark slab from some angles.
