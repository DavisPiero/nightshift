# NIGHTSHIFT: state

_Last updated 2026-10-25, end of session 3 (Milestone 4, part 1 of 3)._

## Where we are
Milestone 4 part 1 is signed off, merged to `main` and live. It adds:
- the Feel panel (F4)
- weight transfer you can see
- turbo lag, whistle and flutter
- audible gear changes
- controllers
- measured ratings (class, 1-1000 score, four 1-10 stats)
- the parts system (data and physics only, no garage screen for it yet)
- the second car, the 2009 Dodga Challenjer SRT8, with a V8 sound

The bench passes with new checks for dive, squat, ratings, parts and the Challenjer.

## Next
- **Part 2, the garage:**
  - a workshop scene with a turntable
  - tabs for paint (metallic, matte, decals), wheels, ride height, spoilers, body kits and performance parts
  - parts you can see on the car
  - a dyno screen and named builds
- **Part 3, the world:**
  - the asset library and a `?library` page
  - sunset, night and dawn
  - snow, plus fixed patches of heavier fog and rain
  - "Parabolica Street", a Monza-inspired street track at about 60% scale

## Open with David
- Try the Feel panel (F4) on both cars and send "Copy values" for anything you like.
- Does the Challenjer look and sound right? Is "2009 Dodga Challenjer SRT8" OK?
- Do the classes feel right (R34 A 756, Challenjer B 635)?
- Still guesses: the game is for Arlo; the R34 stays rear-drive (a four-wheel-drive conversion is a part).

## Known rough edges
- Touch controls are tested in emulation only, not on a real iPad. Controllers are untested
  with a real pad (no pad here).
- Handling 2.9 for the Challenjer is harsh on paper, but its bot lap is as quick as the R34's.
- The headless smoke test takes about 3 minutes.
