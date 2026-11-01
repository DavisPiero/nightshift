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
   harbour, turquoise strips in the Tokyo tunnels, cherry blossom under white lamps on Parabolica Street, moonlight and red shrine gates on Yamagiri Pass. Fog, rain, red tail lights, Japanese signs
   and road markings. Realistic and a little pixelated on Medium and High; chunky pixels on Low.
5. **Menus that feel like a racing game.** See "Look of the menus" below. Lists on the left, the
   thing you pick on the right, the main button bottom right; every button has its sound.
6. **Cars worth looking at.** Each car is recognisably its real cousin from any angle, and its
   paint shines with the lights round it, so even a black car shows its shape.
7. **A garage worth coming back to**: a lock-up workshop with the car on a turntable, where you
   look at the cars you own and make them yours. Looks only: nothing there changes how a car drives.
8. **Three ways to drive.** The race settings screen has a dropdown: Race; Time Trial, endless laps
   against a ghost of your best lap, saved per track and car; Practice, just you and the road.
9. **A career worth finishing.** From the docks to the top: Street (levels 0-100), GT3 (100-150),
   Formula (150-200 and on). Every race pays, you can never lose money, and cars cost real effort
   (about 60 races and 6 hours to finish Street). Told in short pixel-art scenes.
10. **A moment before the lights.** Career only: a short scene of you pulling up (one press skips it),
   a laptop over whichever camera you had on (one press goes on), then the countdown. It has two
   tabs: Upgrades, and Analytics (every driver, their car and numbers, their style, who is most likely
   to be trouble, the predicted standings). NOS is the best of them, on Shift, a touch button and the right bumper: 30% more speed,
   climbing to 35% if you hold it, with blue fire, a roar and camera shake.

## The story
It all takes place in Japan. You are a data analyst who times the street races after work. Johnny, a
retired mechanic who moved here from America and never says where he was born, thinks you have talent:
he lends you an Impreza and asks your name and nationality for the race sheet. His dream is to engineer
and own his own racing team. Max, named after the champ, is the rival. Johnny takes you to the Tokyo
tunnels where he learned; then the harbor; then the Ring, where Aoi Tachibana, a GT3 scout, is watching.
Beat Max at level 100. Aoi offers the seat; you sign only with Johnny as your engineer, and that starts
his team. To be continued.

## Look of the menus
One look for every screen (David, 2026-11-01). The list at the top of `styles/main.css` is the
whole look: change a colour or a font there, once.
- Colour: black and titanium for the base; white, amber and teal for everything else. No pink.
  Amber is the main action and you. Teal is what is picked and good news. Colours from the
  world (neon, paint) stay in the world.
- Fonts: Jersey 10 for titles and numbers, DotGothic16 for text, bold and thickened because it is thin.
- Panels: near-black with a thin titanium edge. A bar along the top of each screen: Back, the name,
  your level and money.
- Layouts from David's references, not their colours: Automobilista's picture tiles with a name band
  on the home screen and its setup panels, Forza's car strip and stats, thin line meters.
- Cards: every car on dark, the same picture, name, price, class and rating. Picked has a teal edge.
- The main button is amber, leans like the logo, bottom right. One on a screen.
- Logo: NIGHTSHIFT in chrome, leaning forward, with an amber 夜勤 stamp.
- HUD: a round rev dial at the bottom centre, white into amber. The map is only the track, straight
  on the picture, about 500 m (Settings > Map zoom). In a race: your place and lap in a box at the top
  (David, 2026-11-01), and the F1-style sheet on the left: place, who moved, name, gap to the leader,
  last lap; your row amber, the fastest lap teal.
- Behind the menus: the 3D scene, except the plain screens (Career, Settings).
- Shop and Garage: everything sits on a real laptop pulled up on the left, the car stands in the rest of the screen, and the laptop can be put down. The Shop is Dave's lot; Dave leans in his open cabin window talking rubbish, his bubble hanging under it.
- Japanese: on screen titles and in the world only, never on buttons or rows.
- Motion: quick and smooth. Lists slide in when a screen or tab opens, never on every click.
- Banned: control hints outside Settings > Controls, except the laptop's NOS row.
- Phone: the small button beside the gear. An old flip phone, a real model, tilted, on the right: inbox and updates. A bar along the top has Back and the bin; the bin always asks first.

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
   Arlo's fourth notes (2026-11-01), in three parts: (1) feel, road, headlights, phone bin. **Done.**
   (2) Analytics, laptops in Shop and Garage, Dave's lot. **Done.** (3) Quick fixes, Parabolica in blossom, Yamagiri Pass,
   trackside models, far scenery baked into the sky. **Done.** (4) Contacts, favours, Sonny, quests. **Next.**
7. GT3 and Formula: their cars, circuits and story. Needs models from David.
8. Saving and settings: the rest (most of it is done in 3).
9. Polish and release.

## Not building
- Damage, fuel, tyre wear, or anything that punishes casual play.
- A simulator: no clutch pedal, no tyre temperatures, no setup sheets.
- Cyberpunk clutter (holograms, chrome everywhere) or a glossy modern look in the world.
  Shine is for the cars' paint and glass.
- Real badges, logos or exact real car names (near-miss names are fine).
- Permanent parts (scrapped, David, 2026-10-31). Faster for good means a faster car; upgrades last one race.
- Multiplayer.
- Online play.
