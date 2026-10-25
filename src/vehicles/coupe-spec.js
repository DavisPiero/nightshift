// The first car: a fictional late-90s rear-drive Japanese coupe ("Kaido R").
// Every number here is a starting value for tuning, not a rule. Upgrades will
// later produce a modified copy of this object; physics only ever reads it.

export const KAIDO_R = {
  id: 'kaido-r',
  name: 'Kaido R',

  // Body and mass
  mass: 1350,                 // kg
  wheelbase: 2.62,            // m
  frontWeight: 0.53,          // share of weight on the front axle at rest
  cgHeight: 0.48,             // m, drives weight transfer under braking and acceleration
  trackWidth: 1.50,           // m, left to right wheel centres
  halfWidth: 0.9,             // m, used for wall collisions
  halfLength: 2.3,
  yawInertiaScale: 1.0,       // multiplies a box estimate of yaw inertia

  // Engine
  idleRpm: 900,
  redline: 7500,
  limiterRpm: 7600,
  // Torque in N·m at each rpm. About 280 hp at 6800 rpm.
  torqueCurve: [
    [800, 190], [2000, 255], [3000, 315], [4400, 360],
    [5500, 348], [6800, 293], [7600, 240],
  ],
  throttleResponse: 9,        // how quickly the throttle opens (per second)
  engineBraking: 55,          // N·m of drag at redline with the throttle closed
  engineInertia: 0.22,        // how fast rpm can change when the clutch is slipping

  // Gearbox (reverse is gear -1)
  gearRatios: [3.21, 1.93, 1.30, 1.00, 0.76],
  reverseRatio: 3.3,
  finalDrive: 4.11,
  drivetrainEfficiency: 0.85,
  drivetrain: 'rwd',
  shiftTime: 0.18,            // s of power cut while changing gear
  autoUpshiftRpm: 7000,       // at full throttle; lower at part throttle
  autoDownshiftRpm: 3000,

  // Wheels and tyres
  wheelRadius: 0.32,
  tireGrip: 1.05,             // friction coefficient, front and rear
  rearGripScale: 1.08,        // above 1 keeps it stable when coasting; throttle still frees the tail
  slipPeak: 0.16,             // rad, slip angle where the tyre grips hardest
  slideGrip: 0.82,            // share of grip left when fully sideways

  // Steering
  maxSteer: 0.58,             // rad at parking speed
  highSpeedSteer: 0.11,       // rad at 200 km/h
  steerSpeed: 3.2,            // how fast the front wheels turn (rad/s)

  // Brakes
  brakeForce: 14500,          // N total
  brakeFrontBias: 0.65,
  handbrakeForce: 4200,       // N on the rear wheels
  handbrakeRearGrip: 0.38,    // rear grip share with the handbrake on

  // Air and rolling
  dragCoefficient: 0.34,
  frontalArea: 1.95,
  rollingResistance: 0.012,

  // Suspension (visual body roll and pitch for now)
  suspensionStiffness: 38,
  suspensionDamping: 7,
  rollScale: 0.022,           // rad of roll per m/s² sideways
  pitchScale: 0.012,

  // Looks
  paint: 0xd8d2bf,
};
