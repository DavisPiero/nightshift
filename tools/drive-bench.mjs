// Driving bench: runs the car physics headless and prints the numbers that
// say whether it feels right. Run it after any physics or car change:
//   node tools/drive-bench.mjs
// It exits with code 1 if a check fails (spins with assists on, a lap that
// can't be finished, and so on).

import { Vehicle, DEFAULT_ASSISTS } from '../src/physics/vehicle.js';
import { KAIDO_R } from '../src/vehicles/coupe-spec.js';
import { TrackPath } from '../src/world/track-path.js';
import { TEST_ROAD } from '../src/world/test-road.js';
import { keepOnTrack } from '../src/physics/walls.js';

const DT = 1 / 120;
const NO_ASSISTS = { steering: false, stability: false, drift: false };
const controls = (o = {}) => ({ steer: 0, throttle: 0, brake: 0, handbrake: false, gearUp: false, gearDown: false, ...o });
const kmh = (v) => v.speed * 3.6;
const deg = (r) => (r * 180 / Math.PI).toFixed(0);
let failed = 0;
const check = (ok, label) => { if (!ok) { failed++; console.log('  FAIL: ' + label); } };

function launch(target, assists = DEFAULT_ASSISTS) {
  const v = new Vehicle(KAIDO_R, assists);
  let t = 0;
  while (kmh(v) < target && t < 40) { v.step(DT, controls({ throttle: 1 })); t += DT; }
  return { v, t };
}

// Bring the car to a speed, then run a manoeuvre and record the worst slide.
function manoeuvre(startKmh, gearAssists, script, seconds) {
  const { v } = launch(startKmh, gearAssists);
  let maxBeta = 0, t = 0, spun = false;
  while (t < seconds) {
    v.step(DT, controls(script(t)));
    t += DT;
    const vl = v.vx * Math.sin(v.heading) + v.vz * Math.cos(v.heading);
    if (v.speed > 3) {
      const beta = Math.abs(Math.atan2(v.vx * Math.cos(v.heading) - v.vz * Math.sin(v.heading), vl));
      maxBeta = Math.max(maxBeta, beta);
      if (beta > Math.PI / 2) spun = true;
    }
  }
  return { maxBeta, spun, endKmh: kmh(v) };
}

console.log('Straight line');
const to100 = launch(100);
console.log(`  0-100 km/h: ${to100.t.toFixed(2)} s`);
check(to100.t > 4.5 && to100.t < 7.5, '0-100 should be 4.5-7.5 s');
{
  const v = new Vehicle(KAIDO_R);
  const gears = [];
  for (let t = 0; t < 60; t += DT) { v.step(DT, controls({ throttle: 1 })); if (gears[gears.length - 1] !== v.gearbox.gear) gears.push(v.gearbox.gear); }
  console.log(`  top speed after 60 s: ${kmh(v).toFixed(0)} km/h, gears used: ${gears.join(' ')}`);
  check(kmh(v) > 220 && kmh(v) < 290, 'top speed 220-290');
}
{
  const { v } = launch(100);
  const x0 = v.x, z0 = v.z;
  let t = 0;
  while (v.speed > 0.1 && t < 10) { v.step(DT, controls({ brake: 1 })); t += DT; }
  const d = Math.hypot(v.x - x0, v.z - z0);
  console.log(`  100-0 km/h braking: ${d.toFixed(1)} m in ${t.toFixed(2)} s`);
  check(d > 30 && d < 48, 'braking distance 30-48 m');
  let rev = 0;
  for (let k = 0; k < 360; k++) { v.step(DT, controls({ brake: 1 })); }
  rev = v.speedForward;
  console.log(`  hold brake at a stop for 3 s: gear ${v.gearbox.gear}, ${(rev * 3.6).toFixed(1)} km/h`);
  check(v.gearbox.gear === -1 && rev < -3, 'holding brake should reverse');
}

console.log('Handling (assists on / off)');
const tests = [
  ['handbrake turn at 70', 70, (t) => ({ steer: 1, handbrake: t < 0.6, throttle: t > 0.6 ? 0.7 : 0 }), 4],
  ['full lock + full throttle at 50', 50, () => ({ steer: 1, throttle: 1 }), 3],
  ['full lock at 150', 150, () => ({ steer: 1, throttle: 0.5 }), 2.5],
  ['lift off mid-corner at 110', 110, (t) => ({ steer: 0.6, throttle: t < 1 ? 1 : 0 }), 3],
  ['hold handbrake + full lock at 55', 55, (t) => ({ steer: -1, handbrake: t < 1.5, throttle: 1 }), 3.5],
  ['handbrake flick, then countersteer', 80, (t) => ({ steer: t < 0.5 ? 1 : -0.6, handbrake: t < 0.4, throttle: t > 0.5 ? 0.8 : 0 }), 4],
];
for (const [name, speed, script, secs] of tests) {
  const on = manoeuvre(speed, DEFAULT_ASSISTS, script, secs);
  const off = manoeuvre(speed, NO_ASSISTS, script, secs);
  console.log(`  ${name.padEnd(36)} on: max slide ${deg(on.maxBeta).padStart(3)}°${on.spun ? ' SPUN' : '     '} end ${on.endKmh.toFixed(0).padStart(3)} km/h | off: ${deg(off.maxBeta).padStart(3)}°${off.spun ? ' SPUN' : ''}`);
  check(!on.spun, name + ' should not spin with assists on');
  check(on.maxBeta < 1.25, name + ' should stay under ~70° of slide with assists on');
}

console.log('Lap of ' + TEST_ROAD.name);
function botLap(assists) {
  const track = new TrackPath(TEST_ROAD);
  const v = new Vehicle(KAIDO_R, assists);
  const s0 = TEST_ROAD.start;
  v.reset(track.x[s0], track.z[s0], track.headingAt(s0));
  let hint = s0, t = 0, hits = 0, travelled = 0, maxBeta = 0, worstHit = 0;
  while (t < 240 && travelled < track.count) {
    const look = Math.round(8 + v.speed * 0.5);
    const ti = track.wrap(hint + look);
    const dx = track.x[ti] - v.x, dz = track.z[ti] - v.z;
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    const ang = Math.atan2(dx * fz - dz * fx, dx * fx + dz * fz);
    let kmax = 0;
    for (let k = 0; k < 20 + v.speed * v.speed / 14; k += 2) kmax = Math.max(kmax, Math.abs(track.curvature[track.wrap(hint + k)]));
    const vmax = Math.sqrt(KAIDO_R.tireGrip * 9.81 * 0.85 / Math.max(kmax, 1e-4));
    const c = controls({
      steer: Math.max(-1, Math.min(1, -ang * 2.2)),
      throttle: v.speed < vmax - 1 ? 1 : 0,
      brake: v.speed > vmax + 2 ? 1 : 0,
    });
    v.step(DT, c);
    t += DT;
    const r = keepOnTrack(v, track, hint);
    if (r.impact > 1) { hits++; worstHit = Math.max(worstHit, r.impact); }
    let adv = r.index - hint;
    if (adv < -track.count / 2) adv += track.count;
    if (adv > track.count / 2) adv -= track.count;
    travelled += adv;
    hint = r.index;
    maxBeta = Math.max(maxBeta, Math.abs(v.slipAngle));
  }
  return { t, hits, worstHit, maxBeta, done: travelled >= track.count };
}
for (const [label, assists] of [['assists on', DEFAULT_ASSISTS], ['assists off', NO_ASSISTS]]) {
  const lap = botLap(assists);
  console.log(`  bot, ${label}: ${lap.done ? lap.t.toFixed(1) + ' s' : 'did not finish'}, wall hits ${lap.hits} (worst ${(lap.worstHit * 3.6).toFixed(0)} km/h), max slide ${deg(lap.maxBeta)}°`);
  if (label === 'assists on') check(lap.done && lap.hits === 0, 'bot should lap cleanly with assists on');
}

console.log(failed ? `BENCH FAIL (${failed})` : 'BENCH PASS');
process.exit(failed ? 1 : 0);
