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
  // Torque in N·m at each rpm. About 320 hp at 6800 rpm (a lightly tuned RB26).
  torqueCurve: [
    [800, 200], [2000, 280], [3000, 360], [4400, 400],
    [5500, 390], [6800, 335], [7600, 270],
  ],
  throttleResponse: 9,        // how quickly the throttle opens (per second)
  engineBraking: 120,         // N·m of drag at redline with the throttle closed
  engineInertia: 0.22,        // how fast rpm can change when the clutch is slipping

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
  rollingResistance: 0.015,
  liftOffDrag: 0.6,           // m/s² of extra slowing with no pedal pressed (arcade, keeps lift-off honest)

  // Suspension (body roll and pitch are for looks; kept small so it reads stiff)
  suspensionStiffness: 60,
  suspensionDamping: 11,
  rollScale: 0.004,           // rad of roll per m/s² sideways (about 2° in a hard corner)
  pitchScale: 0.0035,
  maxRoll: 0.055,             // rad, about 3°
  maxPitch: 0.035,            // rad, about 2°

  // Looks
  paint: 0xd8d2bf,
  paints: [0xd8d2bf, 0x1f4fa8, 0x8e9396, 0x161718, 0x7a1414],
  paintNames: ['Pearl White', 'Bayside Blue', 'Sonic Silver', 'Black Pearl', 'Active Red'],
};

export const CARS = [SKYLINER_R34];

export function getCar(id) {
  return CARS.find((c) => c.id === id) || CARS[0];
}

// "1999 Nissani Skyliner GT-R (R34)"
export function carTitle(c) {
  return `${c.year} ${c.make} ${c.model}${c.code ? ` (${c.code})` : ''}`;
}
