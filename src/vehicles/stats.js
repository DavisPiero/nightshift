// Garage numbers, measured by running the real physics for a moment (so they
// always match how the car drives, and upgrades will change them too).

import { Vehicle } from '../physics/vehicle.js';

const cache = new Map();

export function carStats(spec) {
  if (cache.has(spec)) return cache.get(spec);
  let peak = 0;
  for (const [rpm, nm] of spec.torqueCurve) peak = Math.max(peak, nm * rpm / 7127); // hp
  const v = new Vehicle(spec);
  const c = { steer: 0, throttle: 1, brake: 0, handbrake: false, gearUp: false, gearDown: false };
  const dt = 1 / 120;
  let t = 0, to60 = 0, to100 = 0;
  while (t < 70) {
    v.step(dt, c); t += dt;
    const k = v.speed * 3.6;
    if (!to60 && k >= 96.6) to60 = t;
    if (!to100 && k >= 100) to100 = t;
    if (t > 20 && t % 5 < dt && v.aLong < 0.05) break;
  }
  const s = { hp: Math.round(peak), to60, to100, top: v.speed * 3.6, grip: spec.tireGrip };
  cache.set(spec, s);
  return s;
}
