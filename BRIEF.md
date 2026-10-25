# NIGHTSHIFT: original brief (condensed)

David's full brief from 2026-10-25, with every requirement kept and the wording tightened.
SPEC.md is the short working version; this is the reference.

## 1. Design philosophy
Accessible arcade driving, not a sim. Start and drive within seconds. Prioritise responsive,
forgiving controls; enjoyable acceleration; satisfying drifting; strong engine audio; night
atmosphere; a rewarding garage; a sense of speed. Believable weight but approachable: drift
without perfect technique, recover from mistakes without constant spins. No punishing damage.
Driving assists available later in Settings, but the default must be fun untouched.

## 2. Visual direction
An obscure early-2000s console street racer: low-poly, dark, warm lighting, imperfect textures.
Night street palette: dark asphalt, amber streetlights, deep shadows, dark green vegetation,
concrete grey, red tail lights, faded markings, fog, industrial buildings and fences.
No neon, cyberpunk or glossy modern look.
Garage: cramped workshop, concrete floor, block walls, roller doors, shelves, tools, tyres,
boxes, fluorescent yellow-green light, strong shadows; lived-in, not a showroom.
Rendering: low-poly geometry, restrained texture resolution, simple materials, selective
nearest filtering, fog, limited draw distance, subtle dither or grading, restrained post.
Not a pixelation filter over modern graphics.

## 3. Start-up and platform selection
Title screen: NIGHTSHIFT, atmospheric background, amber highlights, two choices:
Computer (keyboard and mouse, optional controller, desktop HUD) and iPad / Mobile (touch,
tablet HUD). Remember the choice (localStorage), changeable in Settings. It sets input, layout
and graphics defaults. One game, not two versions. Desktop first; iPad controls soon after.

## 4. Technology and architecture
HTML, CSS, JS modules, Three.js; a dev server; physics library or custom arcade dynamics;
localStorage. Modular folders (core, input, physics, vehicles, graphics, cameras, world,
racing, ai, garage, audio, save, ui), no empty modules for show. Fixed physics timestep,
separate from rendering. Unified input: steer -1..1, throttle 0..1, brake 0..1,
handbrake 0/1, gear up/down actions; physics never knows the input device.

## 5. First car
Original low-poly coupe inspired by the R32/R33/R34 GT-R: boxy and muscular, low and wide,
square bonnet, compact cabin, angular bumpers, broad rear shoulders, rear spoiler, period
wheels, round tail lights, angular headlights, dark windows. Built in Three.js code with
separate body, windows, wheels, rims, lights, spoiler, mirrors, exhaust, dashboard and simple
interior. Must look right from chase and cockpit. No real logos or exact bodywork.
Start values: RWD, ~1350 kg, ~280 hp, five gears, automatic by default, moderate grip,
slightly tail-happy, throaty engine. All configurable.

## 6. Arcade physics
Configurable: power, torque curve, rpm and redline, throttle response, engine braking,
gear ratios, final drive, mass, weight distribution, grip, steering angle, speed-sensitive
steering, suspension stiffness and damping, brakes, handbrake, drag, drivetrain.
Implement: acceleration, braking, reverse, steering, momentum, wheelspin, grip loss,
drifting, countersteer, wheel rotation, collisions, reset. Feel: responsive, manageable
weight, more stable at speed, easy drifts and countersteer, forgiving, good on keyboard and
touch. No random spins, no twitchy steering, same at any frame rate. Optional steering,
stability and drift assists, tuned for casual play by default.

## 7. Transmission
Automatic default (gear shown on HUD, audible shifts). Manual optional in Settings: gear
up/down inputs (E/Q on desktop), clear gear display, shift sounds, no impossible gears,
sensible reverse/neutral. On iPad, gear buttons appear only in manual mode, near the right
controls. Controller shifting if controllers are supported. Manual must never be required
to be competitive. Same physics for both modes.

## 8. Desktop controls
W/Up accelerate, S/Down brake and reverse, A/D or arrows steer, Space handbrake, C camera,
R reset, Esc pause, F3 debug; E/Q gears in manual. Configurable where practical; controller
where feasible. HUD: speed, rpm, gear, race timer, laps when relevant, pause.

## 9. iPad
Landscape. Left: virtual analogue joystick (visible base, moving thumb, smooth -1..1,
returns to centre, adjustable size, position, sensitivity, dead zone and response, reliable
multitouch, stable when the finger leaves the area, handles pause, touch cancel and
rotation). Not a wheel or left/right buttons; not over-sensitive. Right: large holdable
throttle, separate brake/reverse, independent handbrake; all usable at once with steering.
Gear buttons only in manual. Camera and pause buttons; reset in the pause menu. Keep the
centre clear; respect safe areas and sizes; adjustable size, position, sensitivity, opacity,
saved. No stuck inputs after release, focus loss or pause. No scrolling or text selection.
Test in emulation and on a real iPad; say which tests were actually done.

## 10. Cameras
Chase: above and behind, smooth, configurable distance and height, good road view, subtle
speed FOV, restrained movement. Cockpit: inside, dashboard and steering wheel visible and
turning with input, view through the windscreen. A camera manager that can take more types.

## 11. Night street circuit
One complete loop through suburban roads and industrial estates: long straights, sweepers,
at least one tight corner, markings, start/finish line, barriers, vegetation, trees, bushes,
industrial buildings, fences, streetlights, some parked cars and props. Built from a
reusable centre line or spline that also drives collision, checkpoints, timing and future AI
lines. Atmosphere over size. Good for cruising and for timed laps.

## 12. Engine audio
A modified Japanese performance coupe: deep and satisfying, never a mosquito or a toy.
Responds to rpm, throttle, load, gear, speed, acceleration and shifts. Prefer legal real
recordings: layered, rpm-dependent, cross-faded between rpm ranges, throttle-dependent
volume, shift effects, tyre squeal, collision sounds. Not one sample pitched up. If no
recordings, a layered synthesised version that is easy to replace. Master, engine and
effects volume. Start audio after user interaction. Test on desktop and iPad.

## 13. Garage
3D industrial garage (see section 2), orbiting camera to inspect the car. First: paint,
engine upgrade, tyre upgrade, suspension upgrade, one visual mod. Upgrades must really change
looks or performance. Architecture ready for wheels, spoilers, body kits, tint, underglow,
headlights, exhausts, decals, ride height, detailed tuning. Simple to use on desktop and iPad.

## 14. Racing
Solo time trial first: countdown, timer, checkpoints, laps, finish, best lap, restart,
pause/resume. Architecture for AI later (shared track data and racing lines), not built now.
Free driving always available.

## 15. Saving
localStorage, versioned, validated, recovers from corruption, plain data only. Save:
platform, selected and owned cars, paint, upgrades, tuning, transmission, assists, graphics,
audio, iPad layout and sensitivity, best laps, unlocks, currency if any. Same progress on
both platforms.

## 16. Performance and testing
Low/Medium/High presets, render resolution, pixel-ratio cap, shadow quality, draw distance,
few real-time lights, reused geometry, small textures, optional post, performance readout.
Test: keyboard, auto and manual, both cameras, audio, acceleration and braking, drifting and
recovery, collisions and reset, checkpoints and laps, garage, save and load, iPad joystick,
simultaneous touches, rotation and layout, low graphics. Never claim an untested feature works.

## 17. Workflow
Same as David's other games: GitHub repo with Pages, work on a branch, merge on sign-off.
Keep README, a state file (STATE.md), CHANGELOG and .gitignore up to date. Never commit
secrets or force-push.

## 18. Milestones
1 Foundation. 2 Desktop driving (playable). 3 iPad controls (before the full environment).
4 Transmission and audio. 5 Night circuit. 6 Racing system. 7 Garage. 8 Saving and settings.
9 Polish and release. Every milestone leaves the game working.

## Success for the first build
Launches in a browser; Computer or iPad choice; desktop players drive the coupe with
forgiving physics; both cameras; playable night test road; engine audio follows rpm and
throttle; automatic by default; manual can be switched on in Settings; iPad joystick
steering; independent throttle, brake and handbrake; reliable multitouch; architecture ready
for more cars, AI, customisation, events and progress; verified on GitHub with docs.
