# NIGHTSHIFT: spec

## What makes it good
1. **In the car within seconds.** Drive, track, car, race settings, Race: four taps, each
   screen remembering your last pick (David asked for the race settings screen, 2026-10-26).
2. **Driving that forgives.** The car has weight and slides, but assists catch spins,
   countersteer for you a little and hold a drift once it starts. A kid with a keyboard
   or an iPad should be able to drift on the first lap and never spin into a wall by accident.
3. **It sounds like a real engine.** Deep, layered, reacts to throttle, gear changes and
   lift-off. Never a mosquito.
4. **Night atmosphere, neon Japan.** Each track has its own light: amber lamps round the
   harbour, turquoise strips in the Tokyo tunnels. Fog, rain, red tail lights, Japanese signs
   and road markings. Low-poly and pixel, like an obscure early-2000s console racer.
5. **Menus that feel like a game.** See "Look of the menus" below. Lists on the left, the
   thing you pick on the right, the primary button bottom right; every button has its sound.
6. **Cars worth looking at.** Each car is recognisably its real cousin from any angle, and its
   paint shines with the lights round it, so even a black car shows its shape.
7. **A garage worth coming back to**: a lock-up workshop with the car on a turntable; paint
   and (later) upgrades that visibly and noticeably change the car.
8. **Cruising is allowed.** Timed laps will come, but you are never forced to race.

## Look of the menus
The one style sheet for every screen (fix for "it still looks like Courtside", 2026-10-26).
- Logo: NIGHTSHIFT in chrome (white to grey with a dark band), leaning forward, with a pink
  夜勤 stamp. After the Street-Spec logo in `Reference/`.
- Fonts: Jersey 10 for titles and buttons, DotGothic16 for text. Titles lean (skewed).
- Panels: dark glass, a thin pale frame, a light top edge, faint scanlines. A panel's label is
  small italic capitals with a pink tick and a thin rule under it. No fake window title bars.
- Buttons: dark with a light top edge. Main action solid hot pink. Selected: a turquoise bar
  on the left and a turquoise wash. Hover or focus: a turquoise outline, nudged right.
- Behind every menu: the 3D scene with a vignette.
- Japanese: on screen titles and in the world only, never on buttons or rows.
- Motion: quick and stepped. Lists slide in when a screen or tab opens, never on every click.
- Banned: solid turquoise blocks, window-button icons, glossy gradients outside the logo and
  pink buttons, control hints outside Settings > Controls.

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
   bounce, sky, particles, engine sound, cockpit, touch pedals. **Built, waiting for sign-off.**
   Look pass (David's third notes, 2026-10-26): neon Japan menus, new track and car pick
   layouts, the Underground track, rebuilt car bodies and a third car (R35), paint
   reflections, the garage room. **Done, signed off 2026-10-26.**
5. Night circuit: a second, full track.
6. Racing: checkpoints, countdown, lap timing, results. Restart already exists.
7. Garage extras: in-game currency and prices for parts (later).
8. Saving and settings: the rest (most of it is done in 3).
9. Polish and release.

## Not building
- Damage, fuel, tyre wear, or anything that punishes casual play.
- A simulator: no clutch pedal, no tyre temperatures, no setup sheets.
- Cyberpunk clutter (holograms, chrome everywhere) or a glossy modern look in the world.
  Shine is for the cars' paint and glass.
- Real badges, logos or exact real car names (near-miss names are fine).
- AI opponents before Milestone 6 is done (only the shared track data they will use).
- Online play.
