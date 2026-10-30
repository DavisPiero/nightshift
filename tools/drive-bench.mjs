// Driving bench: runs the car physics headless and prints the numbers that
// say whether it feels right. Run it after any physics or car change:
//   node tools/drive-bench.mjs
// It exits with code 1 if a check fails (spins with assists on, a lap that
// can't be finished, and so on).

import { Vehicle, DEFAULT_ASSISTS } from '../src/physics/vehicle.js';
import { SKYLINER_R34 as CAR } from "../src/vehicles/cars.js";
import { TrackPath } from '../src/world/track-path.js';
import { STARTER_TRACK as TEST_ROAD } from '../src/world/starter-track.js';
import { keepOnTrack } from '../src/physics/walls.js';
import { applyWeather } from '../src/physics/weather.js';
import { CHALLENJER_SRT8, GTAR_R35, CARS } from '../src/vehicles/cars.js';
import { UNDERGROUND_TRACK } from '../src/world/underground.js';
import { PARABOLICA_TRACK } from '../src/world/parabolica.js';
import { carStats } from '../src/vehicles/stats.js';
import { applyParts } from '../src/vehicles/parts.js';

const DT = 1 / 120;
const NO_ASSISTS = { steering: false, stability: false, drift: false };
const controls = (o = {}) => ({ steer: 0, throttle: 0, brake: 0, handbrake: false, gearUp: false, gearDown: false, ...o });
const kmh = (v) => v.speed * 3.6;
const deg = (r) => (r * 180 / Math.PI).toFixed(0);
let failed = 0;
const check = (ok, label) => { if (!ok) { failed++; console.log('  FAIL: ' + label); } };

function launch(target, assists = DEFAULT_ASSISTS) {
  const v = new Vehicle(CAR, assists);
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
  const v = new Vehicle(CAR);
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

{
  // Lift off completely: the car must slow down noticeably, not freewheel.
  const { v } = launch(100);
  for (let t = 0; t < 8; t += DT) v.step(DT, controls());
  console.log(`  coast from 100 km/h, nothing pressed, 8 s: ${kmh(v).toFixed(0)} km/h`);
  check(kmh(v) > 50 && kmh(v) < 70, 'coasting from 100 should be at 50-70 km/h after 8 s');
}
{
  // Body lean in a hard corner, for looks: small, never enough to touch the road.
  const { v } = launch(100);
  let roll = 0, dive = 0, squat = 0;
  for (let t = 0; t < 5; t += DT) { v.step(DT, controls({ steer: 0.6, throttle: 1 })); roll = Math.max(roll, Math.abs(v.roll)); }
  for (let t = 0; t < 2; t += DT) { v.step(DT, controls({ brake: 1 })); dive = Math.max(dive, v.pitch); }
  const l = new Vehicle(CAR);
  for (let t = 0; t < 1.5; t += DT) { l.step(DT, controls({ throttle: 1 })); squat = Math.max(squat, -l.pitch); }
  const d = (r) => (r * 180 / Math.PI).toFixed(1);
  console.log(`  body: roll ${d(roll)}° in a hard corner, dive ${d(dive)}° braking, squat ${d(squat)}° launching`);
  check(roll < 0.065, 'roll under ~3.5°');
  check(dive > 0.035 && dive < 0.07, 'brake dive should be visible: 2-4°');
  check(squat > 0.007 && squat < 0.05, 'launch squat should be visible: 0.4-3°');
}

{
  // Pulling away at full lock (a U-turn, or off a wall) must not bog down.
  const v = new Vehicle(CAR);
  for (let t = 0; t < 1.5; t += DT) v.step(DT, controls({ throttle: 1, steer: 1 }));
  const straight = launch(0).v; for (let t = 0; t < 1.5; t += DT) straight.step(DT, controls({ throttle: 1 }));
  console.log(`  1.5 s from a standstill: ${kmh(v).toFixed(0)} km/h at full lock, ${kmh(straight).toFixed(0)} km/h straight`);
  check(kmh(v) > kmh(straight) * 0.6, 'full lock should pull away nearly as well as straight');
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
function botLap(assists, weather = 'clear', car = CAR, def = TEST_ROAD) {
  const track = new TrackPath(def);
  const v = new Vehicle(car, assists);
  applyWeather(v, weather);
  const s0 = def.start;
  v.reset(track.x[s0], track.z[s0], track.headingAt(s0));
  let hint = s0, t = 0, hits = 0, travelled = 0, maxBeta = 0, worstHit = 0, gripStep = 0, lastGrip = v.surface.grip, minGrip = 1;
  while (t < 240 && travelled < track.count) {
    // Weather patches: grip eases down and back up again.
    const grip = applyWeather(v, weather, weather === 'clear' ? 0 : track.patchAt(hint)).grip;
    gripStep = Math.max(gripStep, Math.abs(grip - lastGrip));
    lastGrip = grip; minGrip = Math.min(minGrip, grip);
    const look = Math.round(8 + v.speed * 0.5);
    const ti = track.wrap(hint + look);
    const dx = track.x[ti] - v.x, dz = track.z[ti] - v.z;
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    const ang = Math.atan2(dx * fz - dz * fx, dx * fx + dz * fz);
    let kmax = 0;
    for (let k = 0; k < 20 + v.speed * v.speed / 14; k += 2) kmax = Math.max(kmax, Math.abs(track.curvature[track.wrap(hint + k)]));
    const vmax = Math.sqrt(car.tireGrip * grip * 9.81 * 0.85 / Math.max(kmax, 1e-4));
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
  return { t, hits, worstHit, maxBeta, gripStep, minGrip, done: travelled >= track.count };
}
for (const [label, assists] of [['assists on', DEFAULT_ASSISTS], ['assists off', NO_ASSISTS]]) {
  const lap = botLap(assists);
  console.log(`  bot, ${label}: ${lap.done ? lap.t.toFixed(1) + ' s' : 'did not finish'}, wall hits ${lap.hits} (worst ${(lap.worstHit * 3.6).toFixed(0)} km/h), max slide ${deg(lap.maxBeta)}°`);
  if (label === 'assists on') check(lap.done && lap.hits === 0, 'bot should lap cleanly with assists on');
}

console.log('Weather');
{
  // Rain: longer braking, and the bot (driving to the lower grip) still laps
  // cleanly with assists on.
  for (const id of ['rain', 'fog']) {
    const v = new Vehicle(CAR);
    applyWeather(v, id);
    while (kmh(v) < 100) v.step(DT, controls({ throttle: 1 }));
    const x0 = v.x, z0 = v.z;
    let t = 0;
    while (v.speed > 0.1 && t < 10) { v.step(DT, controls({ brake: 1 })); t += DT; }
    const d = Math.hypot(v.x - x0, v.z - z0);
    const lap = botLap(DEFAULT_ASSISTS, id);
    console.log(`  ${id}: 100-0 braking ${d.toFixed(1)} m, bot lap ${lap.done ? lap.t.toFixed(1) + ' s' : 'did not finish'}, wall hits ${lap.hits}, max slide ${deg(lap.maxBeta)}°`);
    if (id === 'rain') check(d > 45, 'braking in the rain should take longer than in the dry');
    check(lap.done && lap.hits === 0, `bot should lap cleanly in ${id} with assists on`);
  }
}

console.log('Second car and ratings');
{
  const lap = botLap(DEFAULT_ASSISTS, 'clear', CHALLENJER_SRT8);
  console.log(`  ${CHALLENJER_SRT8.model} bot lap: ${lap.done ? lap.t.toFixed(1) + ' s' : 'did not finish'}, wall hits ${lap.hits}, max slide ${deg(lap.maxBeta)}°`);
  check(lap.done && lap.hits === 0, 'the Challenjer should lap cleanly with assists on');
  const fmt = (r) => `${r.cls} ${r.pi} (speed ${r.stats.speed}, accel ${r.stats.accel}, handling ${r.stats.handling}, braking ${r.stats.braking})`;
  const r34 = carStats(CAR), ch = carStats(CHALLENJER_SRT8);
  console.log(`  ratings: ${CAR.model} ${fmt(r34)}; ${CHALLENJER_SRT8.model} ${fmt(ch)}`);
  check(r34.cls === 'A' && ch.cls === 'B', 'stock classes: the R34 is A, the Challenjer is B');
  const r35 = carStats(GTAR_R35), lap35 = botLap(DEFAULT_ASSISTS, 'clear', GTAR_R35);
  console.log(`  ${GTAR_R35.model} (R35) bot lap: ${lap35.done ? lap35.t.toFixed(1) + ' s' : 'did not finish'}, wall hits ${lap35.hits}, max slide ${deg(lap35.maxBeta)}°; rating ${fmt(r35)}`);
  check(lap35.done && lap35.hits === 0, 'the R35 should lap cleanly with assists on');
  check(r35.cls === 'S', 'stock class: the R35 is S');
  const off35 = botLap(NO_ASSISTS, 'clear', GTAR_R35);
  console.log(`  R35 assists off: ${off35.done ? off35.t.toFixed(1) + ' s' : 'did not finish'}, wall hits ${off35.hits}, max slide ${deg(off35.maxBeta)}°`);
  // Every part must move the stats the way its description says.
  const with_ = (parts, car = CAR) => carStats(applyParts(car, parts)).stats;
  const up = (a, b, k) => a[k] > b[k];
  const base = r34.stats;
  check(up(with_({ induction: 'big' }), base, 'accel'), 'a big turbo should raise acceleration');
  check(up(with_({ tyres: 'semi' }), base, 'handling'), 'semi-slicks should raise handling');
  check(up(with_({ brakes: 'race' }), base, 'braking'), 'a big brake kit should raise braking');
  check(up(with_({ gearing: 'short' }), base, 'accel') && up(base, with_({ gearing: 'short' }), 'speed'), 'short gears: more acceleration, less top speed');
  check(up(with_({ aero: 'gt' }), base, 'handling') && up(base, with_({ aero: 'gt' }), 'speed'), 'a GT wing: more handling, less top speed');
  check(up(with_({ induction: 'super' }, CHALLENJER_SRT8), ch.stats, 'accel'), 'a supercharger should raise acceleration');
}

console.log('Lap of ' + UNDERGROUND_TRACK.name);
for (const car of [CAR, ...CARS]) {
  const lap = botLap(DEFAULT_ASSISTS, 'clear', car, UNDERGROUND_TRACK);
  console.log(`  ${car.model}: ${lap.done ? lap.t.toFixed(1) + ' s' : 'did not finish'}, wall hits ${lap.hits} (worst ${lap.worstHit.toFixed(0)} km/h), max slide ${deg(lap.maxBeta)}°`);
  check(lap.done && lap.hits === 0, car.model + ' should lap the Underground cleanly with assists on');
}
{
  const lap = botLap(DEFAULT_ASSISTS, 'fog', CAR, UNDERGROUND_TRACK);
  console.log(`  ${CAR.model} in the haze: ${lap.done ? lap.t.toFixed(1) + ' s' : 'did not finish'}, wall hits ${lap.hits}`);
  check(lap.done && lap.hits === 0, 'the Underground in fog should lap cleanly');
}

console.log('Lap of ' + PARABOLICA_TRACK.name);
{
  const t = new TrackPath(PARABOLICA_TRACK);
  let tight = Infinity;
  for (let i = 0; i < t.count; i++) tight = Math.min(tight, 1 / Math.max(1e-6, Math.abs(t.curvature[i])));
  console.log(`  ${(t.length / 1000).toFixed(2)} km, tightest corner radius ${tight.toFixed(0)} m`);
  check(t.length > 3200 && t.length < 3700, 'Parabolica Street should be about 3.4 km (Monza at 60%)');
}
for (const car of [CAR, ...CARS]) {
  const lap = botLap(DEFAULT_ASSISTS, 'clear', car, PARABOLICA_TRACK);
  console.log(`  ${car.model}: ${lap.done ? lap.t.toFixed(1) + ' s' : 'did not finish'}, wall hits ${lap.hits} (worst ${lap.worstHit.toFixed(0)} km/h), max slide ${deg(lap.maxBeta)}°`);
  check(lap.done && lap.hits === 0, car.model + ' should lap Parabolica Street cleanly with assists on');
}

console.log('Snow and weather patches');
{
  const stop = (id) => {
    const v = new Vehicle(CAR);
    applyWeather(v, id);
    while (kmh(v) < 100) v.step(DT, controls({ throttle: 1 }));
    const x0 = v.x, z0 = v.z;
    let t = 0;
    while (v.speed > 0.1 && t < 12) { v.step(DT, controls({ brake: 1 })); t += DT; }
    return Math.hypot(v.x - x0, v.z - z0);
  };
  const dRain = stop('rain'), dSnow = stop('snow');
  console.log(`  100-0 braking: rain ${dRain.toFixed(1)} m, snow ${dSnow.toFixed(1)} m`);
  check(dSnow > dRain, 'braking on snow should take longer than in the rain');
  for (const def of [TEST_ROAD, UNDERGROUND_TRACK, PARABOLICA_TRACK]) {
    for (const weather of def.weathers || ['rain', 'fog', 'snow']) {
      if (weather === 'clear') continue;
      for (const car of [CAR, ...CARS]) {
        const lap = botLap(DEFAULT_ASSISTS, weather, car, def);
        console.log(`  ${def.name}, ${weather}, ${car.model}: ${lap.done ? lap.t.toFixed(1) + ' s' : 'did not finish'}, wall hits ${lap.hits}, grip down to ${lap.minGrip.toFixed(2)}, biggest grip step ${lap.gripStep.toFixed(4)}`);
        check(lap.done && lap.hits === 0, `${car.model} should lap ${def.name} cleanly in ${weather} with assists on`);
        check(lap.gripStep < 0.01, 'grip should ease in and out of a weather patch, never snap');
        if (weather !== 'fog') check(lap.minGrip < applyWeather(new Vehicle(car), weather).grip - 0.04, `a ${weather} patch on ${def.name} should take some grip away`);
      }
    }
  }
}

console.log('Garage builds and save');
{
  // The save code reads the page address and storage; give it stand-ins.
  globalThis.location ??= { search: '' };
  const old = { version: 2, garage: { selected: 'skyliner-r34', cars: { 'skyliner-r34': { paint: 0x1f4fa8, upgrades: { tyres: 'semi' } } } } };
  globalThis.localStorage = { getItem: () => JSON.stringify(old), setItem() {} };
  const { loadSave, activeBuild } = await import('../src/save/save.js');
  const { buildSpec } = await import('../src/vehicles/tuning.js');
  const save = loadSave(), b = activeBuild(save, CAR);
  console.log(`  version 2 save -> version ${save.version}: build "${b.name}", parts ${JSON.stringify(b.parts)}, paint #${b.look.paint.toString(16)}`);
  check(save.version === 3 && b.parts.tyres === 'semi' && b.look.paint === 0x1f4fa8, 'an old save should carry its paint and parts into a build');
  const slammed = buildSpec(CAR, { parts: { suspension: 'race' }, look: { ride: 'slammed' } });
  const stockRide = buildSpec(CAR, { parts: { suspension: 'race' }, look: { ride: 'stock' } });
  console.log(`  slammed: centre of gravity ${stockRide.cgHeight.toFixed(3)} -> ${slammed.cgHeight.toFixed(3)} m`);
  check(slammed.cgHeight < stockRide.cgHeight, 'a slammed car should sit lower');
  const full = carStats(buildSpec(CAR, { parts: { bodykit: 'wide', aero: 'gt', tyres: 'semi', suspension: 'race', brakes: 'race' } }));
  console.log(`  R34 with grip parts: ${full.cls} ${full.pi}`);
}

console.log('Walls');
{
  // Drive into the barrier at an angle: no part of the body may end up
  // through it, and the car must come off it still moving.
  const track = new TrackPath(TEST_ROAD);
  for (const [angle, speed] of [[0.35, 60], [0.8, 90], [1.4, 50]]) {
    const v = new Vehicle(CAR);
    const s0 = TEST_ROAD.start;
    v.reset(track.x[s0], track.z[s0], track.headingAt(s0) + angle);
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    v.vx = fx * speed / 3.6; v.vz = fz * speed / 3.6;
    let hint = s0, worst = 0, hit = 0;
    let grazeKmh = 0, awayKmh = 0;
    // Two seconds pressing into the wall, then get away: steer off it, or
    // for a head-on hit hold brake to reverse first, as a player would.
    const headOn = angle > 1;
    for (let t = 0; t < (headOn ? 6.5 : 5); t += DT) {
      const away = headOn && t < 3.5 ? { brake: 1, steer: -1 } : { throttle: 1, steer: 1 };
      v.step(DT, controls(t < 2 ? { throttle: 0.5 } : away));
      if (t < 2 && t + DT >= 2) grazeKmh = kmh(v);
      if (t > 2) awayKmh = Math.max(awayKmh, kmh(v));
      const r = keepOnTrack(v, track, hint);
      hint = r.index;
      hit = Math.max(hit, r.impact);
      const hx = Math.sin(v.heading), hz = Math.cos(v.heading);
      for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const p = track.nearest(v.x + hz * a * CAR.halfWidth * 0.92 + hx * b * CAR.halfLength * 0.97, v.z - hx * a * CAR.halfWidth * 0.92 + hz * b * CAR.halfLength * 0.97, hint);
        worst = Math.max(worst, Math.abs(p.offset) - track.wall);
      }
    }
    console.log(`  into the wall at ${deg(angle)}°, ${speed} km/h: hit ${(hit * 3.6).toFixed(0)} km/h, deepest ${(worst * 100).toFixed(1)} cm through, ${grazeKmh.toFixed(0)} km/h after 2 s, up to ${awayKmh.toFixed(0)} km/h getting away`);
    check(hit > 0, 'the wall test should actually hit the wall');
    check(worst < 0.05, 'no corner of the car should end up through the wall');
    if (angle < 0.5) check(grazeKmh > 30, 'a glancing hit should keep most of the speed');
    check(awayKmh > 15, 'the car should drive away from the wall');
  }
  // Steering into the wall at speed: the car bounces off rather than riding
  // along it grinding (David, 2026-10-26).
  {
    const v = new Vehicle(CAR);
    const s0 = TEST_ROAD.start;
    v.reset(track.x[s0], track.z[s0], track.headingAt(s0) + 0.2);
    v.vx = Math.sin(v.heading) * 80 / 3.6; v.vz = Math.cos(v.heading) * 80 / 3.6;
    let hint = s0, touching = 0, steps = 0, first = -1, t = 0;
    for (; t < 4; t += DT) {
      v.step(DT, controls({ throttle: 1, steer: -1 }));
      const r = keepOnTrack(v, track, hint);
      hint = r.index;
      if (first < 0 && r.impact > 0) first = t;
      if (first >= 0) {
        steps++;
        // Any corner of the body within 5 cm of the barrier counts as touching.
        const hx = Math.sin(v.heading), hz = Math.cos(v.heading);
        let near = -Infinity;
        for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const p = track.nearest(v.x + hz * a * CAR.halfWidth * 0.92 + hx * b * CAR.halfLength * 0.97, v.z - hx * a * CAR.halfWidth * 0.92 + hz * b * CAR.halfLength * 0.97, hint);
          near = Math.max(near, Math.abs(p.offset) - track.wall);
        }
        if (near > -0.05) touching++;
      }
    }
    const share = touching / Math.max(1, steps);
    console.log(`  steering into the wall at 80 km/h: against it ${(share * 100).toFixed(0)}% of the time after the first hit, ${kmh(v).toFixed(0)} km/h after 4 s`);
    check(first >= 0, 'the grind test should reach the wall');
    check(share < 0.5, 'a car steered into the wall should bounce off, not grind along it');
  }
}

console.log(failed ? `BENCH FAIL (${failed})` : 'BENCH PASS');
process.exit(failed ? 1 : 0);
