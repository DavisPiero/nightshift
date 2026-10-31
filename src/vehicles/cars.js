// Every car in the game. Names are close cousins of real cars (no real
// badges or logos). The numbers here are physics; how a car looks is in
// car-model.js and, for captured cars, assets/cars.
// Every number is a starting value for tuning, not a rule. Upgrades will
// later produce a modified copy of a spec; physics only ever reads it.

export const SKYLINER_R34 = {
  id: 'skyliner-r34',
  accelScale: 0.7,            // gentler power delivery (see vehicle.js)
  make: 'Nissani',
  model: 'Skyliner GT-R',
  code: 'R34',
  year: 2002,
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
  accelScale: 0.68,            // gentler power delivery (see vehicle.js)
  make: 'Dodga',
  model: 'Challenjer SRT Super Stok',
  code: 'LC',
  year: 2020,
  blurb: 'A wide-arched V8 muscle car. Big shove, big weight, big sound.',

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

// Based on the 2017 GT-R (R35): 3.8 L twin-turbo V6 (565 PS at 6800 rpm,
// 633 N·m from 3300 to 5800), 1752 kg, six-speed twin-clutch gearbox
// (4.06/2.30/1.59/1.25/1.00/0.80, 3.70 final drive), four-wheel drive that
// sends most of the torque to the rear. Brutal off the line and very
// stable; it still slides if you ask it to.
export const GTAR_R35 = {
  id: 'gtar-r35',
  accelScale: 0.75,            // gentler power delivery (see vehicle.js)
  make: 'Nissani',
  model: 'GT-Ar Aimgane Type 2',
  code: 'R35',
  year: 2017,
  blurb: 'Twin-turbo V6 and four-wheel drive. Fast everywhere, calm at the limit.',

  mass: 1752,
  wheelbase: 2.78,
  frontWeight: 0.54,
  cgHeight: 0.46,
  trackWidth: 1.6,
  halfWidth: 0.95,
  halfLength: 2.355,
  yawInertiaScale: 1.1,

  idleRpm: 950,
  redline: 7000,
  limiterRpm: 7100,
  torqueCurve: [
    [900, 260], [2000, 450], [3300, 633], [4500, 633],
    [5800, 633], [6800, 580], [7100, 520],
  ],
  throttleResponse: 12,
  engineBraking: 130,
  engineInertia: 0.22,
  turbo: { spoolRpm: 2600, lag: 0.25, share: 0.3 },
  sound: { cylinders: 6, burble: 0.3, pitch: 1.08, sub: 1.1, rasp: 1.25 },

  gearRatios: [4.06, 2.3, 1.59, 1.25, 1.0, 0.8],
  reverseRatio: 3.38,
  finalDrive: 3.7,
  drivetrainEfficiency: 0.84,
  drivetrain: 'awd',
  frontTorqueShare: 0.3,
  shiftTime: 0.08,            // twin-clutch: barely a pause
  autoUpshiftRpm: 6800,
  autoDownshiftRpm: 3200,

  wheelRadius: 0.35,
  tireGrip: 1.12,
  rearGripScale: 1.06,
  slipPeak: 0.15,
  slideGrip: 0.84,

  maxSteer: 0.56,
  highSpeedSteer: 0.1,
  steerSpeed: 3.2,

  brakeForce: 20500,
  brakeFrontBias: 0.64,
  handbrakeForce: 4800,
  handbrakeRearGrip: 0.4,

  dragCoefficient: 0.26,
  frontalArea: 2.1,
  downforce: 0.32,
  rollingResistance: 0.015,
  liftOffDrag: 0.6,

  suspensionStiffness: 50,
  suspensionDamping: 8,
  rollScale: 0.0035,
  pitchScale: 0.005,
  squatShare: 0.5,
  shiftKick: 0.15,
  maxRoll: 0.05,
  maxPitch: 0.045,

  paint: 0xe8e6e0,
  paints: [0xe8e6e0, 0x8e9396, 0x101114, 0x1d3f7a, 0x8a1418, 0xc96a1a],
  paintNames: ['Pearl White', 'Gun Metal', 'Meteor Black', 'Bayside Blue', 'Vibrant Red', 'Katsura Orange'],
};

// Based on the 2016 Aventador SV (David's reference sheet): 6.5 L V12
// behind the seats (750 PS at 8400 rpm, 690 N·m at 5500), 1525 kg dry, about
// 1700 kg ready to drive, a seven-speed single-clutch robot (ISR), four-wheel
// drive that keeps most of the torque at the back. Shrieks to 8500 rpm; the
// gear changes thump. Huge grip, a big fixed wing.
export const AVENTADORO_SV = {
  id: 'aventadoro-sv',
  accelScale: 0.76,            // gentler power delivery (see vehicle.js)
  make: 'Lamborgino',
  model: 'Aventadoro SVJ',
  code: 'LP750',
  year: 2019,
  blurb: 'A V12 behind your head and a wing on the back. Loud, wide, very fast.',

  mass: 1700,
  wheelbase: 2.7,
  frontWeight: 0.43,          // mid-engined: the weight sits behind you
  cgHeight: 0.42,
  trackWidth: 1.7,
  halfWidth: 1.01,
  halfLength: 2.42,
  yawInertiaScale: 0.95,

  idleRpm: 1000,
  redline: 8500,
  limiterRpm: 8600,
  torqueCurve: [
    [1000, 300], [2500, 470], [4000, 600], [5500, 690],
    [7000, 670], [8400, 630], [8600, 600],
  ],
  throttleResponse: 15,
  engineBraking: 150,
  engineInertia: 0.2,
  sound: { cylinders: 12, burble: 0.35, pitch: 1.25, sub: 0.9, rasp: 1.45 },

  gearRatios: [3.91, 2.44, 1.81, 1.46, 1.19, 0.97, 0.84],
  reverseRatio: 2.92,
  finalDrive: 3.24,
  drivetrainEfficiency: 0.85,
  drivetrain: 'awd',
  frontTorqueShare: 0.25,
  shiftTime: 0.1,             // a quick robot, with a kick
  autoUpshiftRpm: 8300,
  autoDownshiftRpm: 4200,

  wheelRadius: 0.355,
  tireGrip: 1.16,
  rearGripScale: 1.08,
  slipPeak: 0.14,
  slideGrip: 0.85,

  maxSteer: 0.55,
  highSpeedSteer: 0.1,
  steerSpeed: 3.4,

  brakeForce: 22000,
  brakeFrontBias: 0.6,
  handbrakeForce: 4600,
  handbrakeRearGrip: 0.42,

  dragCoefficient: 0.33,
  frontalArea: 2.05,
  downforce: 0.55,            // the SV's wing
  rollingResistance: 0.015,
  liftOffDrag: 0.6,

  suspensionStiffness: 58,
  suspensionDamping: 9,
  rollScale: 0.0028,
  pitchScale: 0.0042,
  squatShare: 0.4,
  shiftKick: 0.35,
  maxRoll: 0.04,
  maxPitch: 0.04,

  paint: 0xc8141a,
  paints: [0xc8141a, 0xe8c21a, 0x6aa82a, 0x101114, 0xe8e8e4, 0x2a4ea8],
  paintNames: ['Rosso Mars', 'Giallo Orion', 'Verde Ithaca', 'Nero Aldebaran', 'Bianco Isis', 'Blu Nethuns'],
};

// Based on the 2020 Mustang Shelby GT500 (David's reference sheet): 5.2 L
// supercharged V8 (771 PS at 7300 rpm, 847 N·m at 5000), 1916 kg, a
// seven-speed twin-clutch, rear-wheel drive. Enormous shove; it wants to
// light the rear tyres in every gear.
export const MUSTANK_GT500 = {
  id: 'mustank-gt500',
  accelScale: 0.53,            // gentler power delivery (see vehicle.js)
  make: 'Fard',
  model: 'Mustank Touring Car',
  code: '#18',
  year: 1969,
  blurb: 'A 1969 fastback built for the track. A huge V8 and the most power here.',

  mass: 1916,
  wheelbase: 2.72,
  frontWeight: 0.56,
  cgHeight: 0.5,
  trackWidth: 1.62,
  halfWidth: 0.96,
  halfLength: 2.41,
  yawInertiaScale: 1.1,

  idleRpm: 750,
  redline: 7500,
  limiterRpm: 7600,
  torqueCurve: [
    [750, 420], [2000, 640], [3500, 790], [5000, 847],
    [6000, 820], [7300, 740], [7600, 690],
  ],
  throttleResponse: 12,
  engineBraking: 150,
  engineInertia: 0.26,
  sound: { cylinders: 8, burble: 0.65, pitch: 0.95, sub: 1.4, rasp: 0.95 },

  gearRatios: [3.2, 2.47, 1.73, 1.31, 1.0, 0.8, 0.63],
  reverseRatio: 3.0,
  finalDrive: 3.73,
  drivetrainEfficiency: 0.84,
  drivetrain: 'rwd',
  shiftTime: 0.08,            // twin-clutch
  autoUpshiftRpm: 7200,
  autoDownshiftRpm: 3000,

  wheelRadius: 0.355,
  tireGrip: 1.1,
  rearGripScale: 1.16,        // 771 PS through the back: smoke on demand, but it stays catchable
  slipPeak: 0.16,
  slideGrip: 0.84,

  maxSteer: 0.55,
  highSpeedSteer: 0.1,
  steerSpeed: 3.0,

  brakeForce: 21500,
  brakeFrontBias: 0.64,
  handbrakeForce: 5000,
  handbrakeRearGrip: 0.38,

  dragCoefficient: 0.37,
  frontalArea: 2.2,
  downforce: 0.2,
  rollingResistance: 0.015,
  liftOffDrag: 0.6,

  suspensionStiffness: 46,
  suspensionDamping: 7.5,
  rollScale: 0.004,
  pitchScale: 0.0055,
  squatShare: 0.65,
  shiftKick: 0.25,
  maxRoll: 0.055,
  maxPitch: 0.05,

  paint: 0xb81418,
  paints: [0xb81418, 0x1a3a8a, 0x101114, 0xe8e8e4, 0x8e9396, 0xd85a14],
  paintNames: ['Race Red', 'Velocity Blue', 'Shadow Black', 'Oxford White', 'Carbonized Grey', 'Twister Orange'],
};

// The entry car, from David's GLB: a late-1990s Impreza WRX STi two-door (GC8;
// the exact year and version can't be told from the model, so no year is
// claimed). The numbers are NOT the real car's 280 PS: it keeps the old
// starter's power for its weight, so it stays the car to learn in. Rear-biased
// four-wheel drive, like the R35.
export const IMPREZA_GC8 = {
  id: 'impreza-gc8',
  accelScale: 0.78,            // gentler power delivery (see vehicle.js)
  make: 'Subaro',
  model: 'Impreza WRX STi Coupe',
  code: 'GC8',
  year: 'Late 90s',
  blurb: 'Two doors, gold wheels, all four driven. The car to learn in.',

  mass: 1250,
  wheelbase: 2.52,
  frontWeight: 0.54,
  cgHeight: 0.47,
  trackWidth: 1.48,
  halfWidth: 0.86,
  halfLength: 2.17,
  yawInertiaScale: 1.0,

  idleRpm: 900,
  redline: 6800,
  limiterRpm: 7000,
  torqueCurve: [
    [900, 91], [2000, 136], [3000, 154], [4000, 164],
    [5500, 172], [6500, 160], [7000, 139],
  ],
  throttleResponse: 12,
  engineBraking: 70,
  engineInertia: 0.16,
  sound: { cylinders: 4, burble: 0.3, pitch: 1.05, sub: 0.85, rasp: 1.1 },

  gearRatios: [3.14, 1.89, 1.33, 1.0, 0.81],
  reverseRatio: 3.48,
  finalDrive: 4.1,
  drivetrainEfficiency: 0.86,
  drivetrain: 'awd',
  frontTorqueShare: 0.3,
  shiftTime: 0.2,
  autoUpshiftRpm: 6500,
  autoDownshiftRpm: 2800,

  wheelRadius: 0.305,
  tireGrip: 1.02,
  rearGripScale: 1.09,
  slipPeak: 0.17,
  slideGrip: 0.84,

  maxSteer: 0.58,
  highSpeedSteer: 0.12,
  steerSpeed: 3.0,

  brakeForce: 10500,
  brakeFrontBias: 0.62,
  handbrakeForce: 3000,
  handbrakeRearGrip: 0.4,

  dragCoefficient: 0.34,
  frontalArea: 1.7,
  downforce: 0.05,
  rollingResistance: 0.015,
  liftOffDrag: 0.6,

  suspensionStiffness: 38,
  suspensionDamping: 7,
  rollScale: 0.0045,
  pitchScale: 0.006,
  squatShare: 0.6,
  shiftKick: 0.2,
  maxRoll: 0.06,
  maxPitch: 0.055,

  paint: 0x17307f,
  paints: [0x17307f, 0xe8e6e0, 0x101114, 0x8e9396, 0x8a1418],
  paintNames: ['Rally Blue', 'Pure White', 'Black Mica', 'Cool Grey', 'Deep Red'],
};

// From David's GLB, a Countach 5000 QV (the model year is not certain, so 1985,
// the first). 5.2 L V12 behind the cabin, about 455 hp, 1490 kg, rear-wheel
// drive. The Aventadoro's chassis numbers with the older car's size and power.
export const COUNTACH_QV = {
  ...AVENTADORO_SV,
  id: 'countach-qv',
  accelScale: 0.76,
  make: 'Lamborgino',
  model: 'Countash 5000 QV',
  code: 'QV',
  year: 1985,
  blurb: 'A wedge, a wing and twelve cylinders. All drama, no driver aids in the styling.',
  mass: 1490,
  wheelbase: 2.5,
  trackWidth: 1.62,
  halfWidth: 0.98,
  halfLength: 2.1,
  redline: 7500,
  limiterRpm: 7700,
  autoUpshiftRpm: 7100,
  torqueCurve: [[900, 300], [2500, 410], [4000, 470], [5200, 500], [6500, 475], [7000, 440], [7700, 370]],
  drivetrain: 'rwd',
  tireGrip: 1.0,
  downforce: 0.3,
  paint: 0xd8261e,
  paints: [0xd8261e, 0xe8e8e4, 0x111214, 0xe8b81e],
  paintNames: ['Rosso', 'Bianco', 'Nero', 'Giallo'],
};

// The cars you can pick.
export const CARS = [IMPREZA_GC8, SKYLINER_R34, CHALLENJER_SRT8, MUSTANK_GT500, GTAR_R35, COUNTACH_QV, AVENTADORO_SV];
export const ALL_CARS = CARS;

export function getCar(id) {
  return CARS.find((c) => c.id === id) || CARS[0];
}

// "1999 Nissani Skyliner GT-R (R34)"
export function carTitle(c) {
  return `${c.year} ${c.make} ${c.model}${c.code ? ` (${c.code})` : ''}`;
}
