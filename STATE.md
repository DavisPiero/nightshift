# NIGHTSHIFT: state

_Last updated 2026-10-26, end of session 4 (look pass from David's third notes)._

## Where we are
On branch `neon-underground`, not merged. `main` (live) is still Milestone 4 part 1.
This session built:
- neon Japan menus (turquoise frames, pink buttons, Japanese subtitles)
- new track pick and car pick layouts (list left, preview right, Continue / Race bottom right)
- the Underground, a Tokyo tunnel track with turquoise lights
- rebuilt car bodies from curves, and a third car: 2017 Nissani GT-Ar (R35)
- paint and glass that reflect the lights round the car
- a real garage room with a turntable
- the car and weather tag at the top left of the driving screen is gone

Bench and smoke test pass (now with the R35 and the Underground).

## Next
- David plays the branch and signs off (or sends notes).
- Then Milestone 4 part 2, the garage mods (see SPEC.md). The garage room now exists.
- Then part 3, the world (time of day goes in the new Time box on the car pick).

## Open with David
- Moths: there is no moth code since 2026-10-25 (commit b40a79b). If you still see dots
  round lamps, it may be an old cached page: reload with Shift held. Otherwise send a screenshot.
- Is the R35's name "2017 Nissani GT-Ar" OK? (It stays as a third car: David, 2026-10-26.)
- The Challenjer is modelled on your sheet (a 2015-style face) but keeps its 2009 name and figures. OK?
- Guesses to confirm: pink as the main action colour; the Underground has no rain;
  in the garage the headlights stay lit but the beams are off.
- Older, still open: the Feel panel values, the classes (R34 A 756, Challenjer B 635, R35 S 862).

## Known rough edges
- Touch and controllers are untested on real devices.
- The Japanese text in menus needs the DotGothic16 font from Google; offline it falls back.
- The car-pick preview sits partly behind the Spec panel on 4:3 screens.
