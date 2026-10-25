// Every car in the game. Names are close cousins of real cars (no real
// badges or logos); the shapes are low-poly takes on the real thing.
// Every number is a starting value for tuning, not a rule. Upgrades will
// later produce a modified copy of a spec; physics only ever reads it.

export const SKYLINER_R34 = {
  id: 'skyliner-r34',
  make: 'Nissani',
  model: 'Skyliner GT-R',
  code: 'R34',
  year: 1999,
  blurb: 'Twin-turbo straight six, square shoulders, four round tail lights.',

  // Body and mass
  mass: 1540,                 // kg
  wheelbase: 2.665,           // m
  frontWeight: 0.55,          // share of weight on the front axle at rest
  cgHeight: 0.48,             // m, drives weight transfer under braking and acceleration
  trackWidth: 1.50,           // m, left to right wheel centres
  halfWidth: 0.9,             // m, body half width, used for wall collisions
  halfLength: 2.3,            // m, body half length
  yawInertiaScale: 1.0,       // multiplies a box estimate of yaw inertia

  // Engine
  idleRpm: 900,
  redline: 7500,
  limiterRpm: 7600,
  // Torque in N·m at each rpm, on full boost. About 335 hp at 6800 rpm (a
  // lightly tuned RB26; the factory claimed 280 PS, real ones made more).
  torqueCurve: [
    [800, 215], [2000, 300], [3000, 385], [4400, 425],
    [5500, 412], [6800, 352], [7600, 285],
  ],
  throttleResponse: 11,       // how quickly the throttle opens (per second)
  engineBraking: 120,         // N·m of drag at redline with the throttle closed
  engineInertia: 0.22,        // how fast rpm can change when the clutch is slipping
  // Twin turbos: below spoolRpm, and until boost builds, torque drops by `share`.
  turbo: { spoolRpm: 2600, lag: 0.35, share: 0.3 },
  // Engine sound: six cylinders in a line, smooth and rising (see audio.js).
  sound: { cylinders: 6, burble: 0.2, pitch: 1, sub: 1, rasp: 1 },

  // Gearbox (reverse is gear -1). The real car has six; five keep the auto calm.
  gearRatios: [3.21, 1.93, 1.30, 1.00, 0.76],
  reverseRatio: 3.3,
  finalDrive: 4.11,
  drivetrainEfficiency: 0.85,
  // The real GT-R is four-wheel drive. Rear drive keeps it easy to drift (a
  // deliberate liberty, see DECISIONS.md).
  drivetrain: 'rwd',
  shiftTime: 0.18,            // s of power cut while changing gear
  autoUpshiftRpm: 7000,       // at full throttle; lower at part throttle
  autoDownshiftRpm: 3000,

  // Wheels and tyres
  wheelRadius: 0.33,
  tireGrip: 1.05,             // friction coefficient, front and rear
  rearGripScale: 1.08,        // above 1 keeps it stable when coasting; throttle still frees the tail
  slipPeak: 0.16,             // rad, slip angle where the tyre grips hardest
  slideGrip: 0.82,            // share of grip left when fully sideways

  // Steering
  maxSteer: 0.58,             // rad at parking speed
  highSpeedSteer: 0.11,       // rad at 200 km/h
  steerSpeed: 3.2,            // how fast the front wheels turn (rad/s)

  // Brakes
  brakeForce: 16500,          // N total
  brakeFrontBias: 0.65,
  handbrakeForce: 4600,       // N on the rear wheels
  handbrakeRearGrip: 0.38,    // rear grip share with the handbrake on

  // Air, rolling and lift-off
  dragCoefficient: 0.34,
  frontalArea: 1.95,
  downforce: 0.25,            // N per (m/s)² from the stock wing and lip
  rollingResistance: 0.015,
  liftOffDrag: 0.6,           // m/s² of extra slowing with no pedal pressed (arcade, keeps lift-off honest)

  // Suspension (body roll and pitch are for looks). Lean stays small; the
  // nose dives visibly under braking and squats under power, then settles
  // with a little bounce. All of these can be tried live in the Feel panel (F4).
  suspensionStiffness: 45,
  suspensionDamping: 7.5,
  rollScale: 0.004,           // rad of roll per m/s² sideways (about 2° in a hard corner)
  pitchScale: 0.0055,         // rad of pitch per m/s² (dive under braking)
  squatShare: 0.6,            // squat under power, as a share of the dive
  shiftKick: 0.25,            // the nod of the nose on each upshift
  maxRoll: 0.055,             // rad, about 3°
  maxPitch: 0.05,             // rad, about 3°

  // Looks
  paint: 0xd8d2bf,
  paints: [0xd8d2bf, 0x1f4fa8, 0x8e9396, 0x161718, 0x7a1414],
  paintNames: ['Pearl White', 'Bayside Blue', 'Sonic Silver', 'Black Pearl', 'Active Red'],
};

// Based on the 2009 Challenger SRT8: 6.1 L Hemi V8 (425 hp at 6200 rpm,
// 569 N·m at 4800), 1885 kg, five-speed automatic (3.59/2.19/1.41/1.00/0.83,
// 3.06 final drive), Brembo brakes, 245/45R20 tyres. Heavy, nose-heavy and
// soft: a huge shove in a straight line, lazy in the bends, the tail steps
// out when you lean on the torque.
export const CHALLENJER_SRT8 = {
  id: 'challenjer-srt8',
  make: 'Dodga',
  model: 'Challenjer SRT8',
  code: 'LC',
  year: 2009,
  blurb: 'A 6.1-litre V8 muscle car. Big shove, big weight, big sound.',

  mass: 1885,
  wheelbase: 2.946,
  frontWeight: 0.57,
  cgHeight: 0.52,
  trackWidth: 1.6,
  halfWidth: 0.96,
  halfLength: 2.51,
  yawInertiaScale: 1.2,       // a long, heavy car: slow to rotate

  idleRpm: 700,
  redline: 6200,
  limiterRpm: 6400,
  torqueCurve: [
    [700, 400], [1500, 470], [2500, 520], [3500, 548],
    [4800, 569], [5600, 545], [6200, 505], [6400, 470],
  ],
  throttleResponse: 10,
  engineBraking: 150,
  engineInertia: 0.3,
  sound: { cylinders: 8, burble: 0.75, pitch: 0.85, sub: 1.5, rasp: 0.7 },

  gearRatios: [3.59, 2.19, 1.41, 1.00, 0.83],
  reverseRatio: 3.16,
  finalDrive: 3.06,
  drivetrainEfficiency: 0.84,
  drivetrain: 'rwd',
  shiftTime: 0.16,
  autoUpshiftRpm: 5900,
  autoDownshiftRpm: 2400,

  wheelRadius: 0.354,
  tireGrip: 1.04,
  rearGripScale: 1.07,        // still spins its tyres at launch: muscle-car smoke
  slipPeak: 0.17,
  slideGrip: 0.84,

  maxSteer: 0.55,
  highSpeedSteer: 0.1,
  steerSpeed: 2.7,

  brakeForce: 18500,
  brakeFrontBias: 0.66,
  handbrakeForce: 5200,
  handbrakeRearGrip: 0.36,

  dragCoefficient: 0.36,
  frontalArea: 2.25,
  rollingResistance: 0.015,
  liftOffDrag: 0.6,
  downforce: 0.05,

  suspensionStiffness: 38,
  suspensionDamping: 6.5,
  rollScale: 0.005,           // softer than the R34
  pitchScale: 0.0065,
  squatShare: 0.8,            // muscle cars squat hard
  shiftKick: 0.3,
  maxRoll: 0.065,
  maxPitch: 0.055,

  paint: 0x1d1f22,
  paints: [0x1d1f22, 0xb8461e, 0x8c1a1a, 0xc8c8c2, 0x2b4a7a],
  paintNames: ['Brilliant Black', 'Hemi Orange', 'Inferno Red', 'Bright Silver', 'Deep Water Blue'],
};

export const CARS = [SKYLINER_R34, CHALLENJER_SRT8];

export function getCar(id) {
  return CARS.find((c) => c.id === id) || CARS[0];
}

// "1999 Nissani Skyliner GT-R (R34)"
export function carTitle(c) {
  return `${c.year} ${c.make} ${c.model}${c.code ? ` (${c.code})` : ''}`;
}
