// Car ratings. The four 1-10 stats come from running the real physics for a
// moment (top speed, 0-100, 100-0) or from the grip numbers it drives with,
// so every part fitted moves them honestly and a new car rates itself.
// They combine into a 1-1000 score and a class:
//   D below 400, C 400-549, B 550-699, A 700-799, S 800-899, X 900 and up.

import { Vehicle } from '../physics/vehicle.js';

export const CLASSES = [['X', 900], ['S', 800], ['A', 700], ['B', 550], ['C', 400], ['D', 0]];
export const classFor = (pi) => CLASSES.find(([, min]) => pi >= min)[0];

// How each stat maps to 1..10 (raw value at 1, raw value at 10).
const RANGES = {
  speed: [150, 350],       // top speed, km/h
  accel: [9, 2.5],         // 0-100 km/h, s (lower is better), blended with 80-160 below
  roll: [16, 4],           // 80-160 km/h, s: the shove once moving (power and gearing)
  braking: [50, 28],       // 100-0 km/h, m (lower is better)
  handling: [0.8, 1.2],    // effective grip x agility (see below)
};
const WEIGHTS = { speed: 0.25, accel: 0.3, handling: 0.3, braking: 0.15 };

const cache = new Map();
const unit = (v, [lo, hi]) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));

export function carStats(spec) {
  const key = JSON.stringify(spec);
  if (cache.has(key)) return cache.get(key);
  let peak = 0;
  for (const [rpm, nm] of spec.torqueCurve) peak = Math.max(peak, nm * rpm / 7127 * (spec.torqueScale ?? 1)); // hp
  const dt = 1 / 120;
  const c = { steer: 0, throttle: 1, brake: 0, handbrake: false, gearUp: false, gearDown: false };

  // Straight line: 0-60 mph, 0-100 km/h and top speed.
  const v = new Vehicle(spec);
  let t = 0, to60 = 0, to100 = 0, at80 = 0, to160 = 0, last = 0;
  while (t < 90) {
    v.step(dt, c); t += dt;
    const k = v.speed * 3.6;
    if (!to60 && k >= 96.6) to60 = t;
    if (!to100 && k >= 100) to100 = t;
    if (!at80 && k >= 80) at80 = t;
    if (!to160 && k >= 160) to160 = t;
    if (t > 20 && Math.floor(t) !== Math.floor(t - dt)) { if (k - last < 0.3) break; last = k; }
  }
  const top = v.speed * 3.6;

  // Braking from 100.
  const b = new Vehicle(spec);
  while (b.speed * 3.6 < 100) b.step(dt, c);
  const x0 = b.x, z0 = b.z;
  for (let i = 0; i < 1200 && b.speed > 0.1; i++) b.step(dt, { ...c, throttle: 0, brake: 1 });
  const brake = Math.hypot(b.x - x0, b.z - z0);

  // Handling: tyre grip plus downforce at 120 km/h, times how eagerly the
  // car turns in for its weight (steering speed, mass, how slow it is to rotate).
  const aero = (spec.downforce || 0) * 33.3 * 33.3 / (spec.mass * 9.81);
  const grip = spec.tireGrip * Math.min(1, spec.rearGripScale) * (1 + aero);
  const agility = (spec.steerSpeed / 3.2) * Math.pow(1500 / spec.mass, 0.3) / Math.sqrt(spec.yawInertiaScale);
  const handling = grip * Math.sqrt(agility);

  const roll = to160 ? to160 - at80 : 30;
  const raw = { speed: top, accel: to100, braking: brake, handling };
  const stats = {};
  let sum = 0;
  for (const k of Object.keys(WEIGHTS)) {
    let u = unit(raw[k], RANGES[k]);
    if (k === 'accel') u = (u + unit(roll, RANGES.roll)) / 2;
    stats[k] = Math.round((1 + 9 * u) * 10) / 10;
    sum += WEIGHTS[k] * u;
  }
  const pi = Math.max(1, Math.min(1000, Math.round(100 + 900 * Math.pow(sum, 0.7))));
  const s = { hp: Math.round(peak), mass: Math.round(spec.mass), to60, to100, roll, top, brake, grip, stats, pi, cls: classFor(pi) };
  cache.set(key, s);
  return s;
}
