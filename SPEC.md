# NIGHTSHIFT: spec

## What makes it good
1. **In the car within seconds.** Career, Race: two taps to the next race. Or Race, track, car, race
   settings, Race: four taps, each screen remembering your last pick.
2. **Driving that forgives.** The car has weight and slides, but assists catch spins,
   countersteer for you a little and hold a drift once it starts. A kid with a keyboard
   or an iPad should be able to drift on the first lap and never spin into a wall by accident.
3. **It sounds like a real engine.** Deep, layered, reacts to throttle, gear changes and
   lift-off. Never a mosquito.
4. **Night atmosphere, neon Japan.** Each track has its own light: amber lamps round the
   harbour, turquoise strips in the Tokyo tunnels. Fog, rain, red tail lights, Japanese signs
   and road markings. Realistic and a little pixelated on Medium and High; chunky pixels on Low.
5. **Menus that feel like a game.** See "Look of the menus" below. Lists on the left, the
   thing you pick on the right, the primary button bottom right; every button has its sound.
6. **Cars worth looking at.** Each car is recognisably its real cousin from any angle, and its
   paint shines with the lights round it, so even a black car shows its shape.
7. **A garage worth coming back to**: a lock-up workshop with the car on a turntable, where you
   look at the cars you own and make them yours. Looks only: nothing there changes how a car drives.
8. **Cruising is allowed.** Race mode with no rivals is free driving.
9. **A career worth finishing.** From the docks to the top: Street (levels 0-100), GT3 (100-150),
   Formula (150-200 and on). Every race pays, you can never lose money, and cars cost real effort
   (about 50 races and 6 hours to finish Street). Told in short pixel-art scenes.

## The story
Your shift at the docks ends at 4 AM. Johnny, a middle-aged garage owner born in Yokohama who moved
to America for the love of cars, lends you an Impreza. Max, named after the champ, is the rival.
Johnny takes you back to the Tokyo tunnels where he learned; then home; then the Ring, where Aoi
Tachibana, a GT3 scout, is watching. Beat Max at level 100 and sign. To be continued.

## Look of the menus
The one style sheet for every screen: a mix of the old Microsoft desktop and David's racing-game
references (2026-10-31). The bevels and pixel fonts of the first; the layout and colour of the second.
- Logo: NIGHTSHIFT in chrome, leaning forward, with a pink 夜勤 stamp, as before.
- Fonts: Jersey 10 for titles and buttons, DotGothic16 for text, same sizes as before.
- Windows: grey (#c0c0c0) with a raised edge and a dark title bar running out to teal.
- Screen names: a black tag with a pink edge. Full-page screens sit on a teal desk.
- Cards: every car is a white card with the same picture (one camera, one light), name, price,
  class and rating. Used wherever a car is picked. What you picked has a yellow box.
- Buttons: grey and raised, pressed in when held, a dotted box on focus. A toggle that is on
  stays pressed in on a fine grey-and-white check. Main action solid hot pink.
- Lists: a white sunken box; rows are flat, the picked one black with a yellow edge.
- Meters are block progress bars. Tips are pale yellow tooltips.
- HUD: a round rev dial at the bottom centre, ring of blocks with gear and speed inside, in the
  same grey, green and red; and a teal map with no frame, its corners fading out (David, 2026-10-31).
  In a race, a strip along the top: place, lap, lap time, best lap, the gaps to the cars either side.
- Behind the menus: the 3D scene, except the desk screens (Career, Shop, Settings).
- Japanese: on screen titles and in the world only, never on buttons or rows.
- Motion: quick and stepped. Lists slide in when a screen or tab opens, never on every click.
- Banned: control hints outside Settings > Controls.

## Milestones
1. Foundation: loop, platform screen. **Done.**
2. Desktop driving: coupe, physics, keyboard, two cameras, debug, test road. **Done, signed off 2026-10-25.**
3. iPad controls, plus David's first-drive notes: touch controls, physics fixes (lean,
   lift-off, collisions), pixel menus, settings in four tabs, weather, effects, a fuller
   track, the R34 and a proper cockpit. **In progress.** (This pulled in parts of 5, 7 and 8.)
4. Feel, garage and world (David's second notes), in three parts: (1) feel pass, Feel
   panel, ratings, parts, controllers, the Challenjer. **Done, signed off 2026-10-25.** (2) The
   garage: workshop, visual and performance mods, dyno, named builds. **Done, signed off
   2026-10-26.** (3) Asset library,
   time of day, snow, weather patches, a Monza-inspired street track (Parabolica Street).
   **Done, signed off 2026-10-26.** (4) David's fourth notes: menu restyle, race settings
   screen, loading screens, garage pop-ups and orbit, bonnet and engine bay, minimap, wall
   bounce, sky, particles, engine sound, cockpit, touch pedals. **Done, signed off 2026-10-26.**
   Look pass (David's third notes, 2026-10-26): neon Japan menus, new track and car pick
   layouts, the Underground track, rebuilt car bodies and a third car (R35), paint
   reflections, the garage room. **Done, signed off 2026-10-26.**
5. Night circuit: a second, full track.
6. Realism overhaul (M6, started 2026-10-28; GLB cars done, 2026-10-31). Then the career (2026-10-31):
   racing, four difficulties, money and levels, the shop, the story. **Street stage done.**
7. GT3 and Formula: their cars, circuits and story. Needs models from David.
8. Saving and settings: the rest (most of it is done in 3).
9. Polish and release.

## Not building
- Damage, fuel, tyre wear, or anything that punishes casual play.
- A simulator: no clutch pedal, no tyre temperatures, no setup sheets.
- Cyberpunk clutter (holograms, chrome everywhere) or a glossy modern look in the world.
  Shine is for the cars' paint and glass.
- Real badges, logos or exact real car names (near-miss names are fine).
- Performance parts or upgrades (scrapped, David, 2026-10-31). Faster means a faster car.
- Multiplayer.
- Online play.
