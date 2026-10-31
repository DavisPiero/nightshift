// AI bench: six AI drivers race two laps on every track, in Node (no
// browser). Checks the ground work for racing against AI (src/race/): that
// every car finishes and rarely needs putting back on the road (at most
// twice in two laps of six-car traffic).
//   node tools/ai-bench.mjs

import { Vehicle } from '../src/physics/vehicle.js';
import { applyWeather } from '../src/physics/weather.js';
import { TrackPath } from '../src/world/track-path.js';
import { STARTER_TRACK } from '../src/world/starter-track.js';
import { UNDERGROUND_TRACK } from '../src/world/underground.js';
import { PARABOLICA_TRACK } from '../src/world/parabolica.js';
import { CARS } from '../src/vehicles/cars.js';
import { RacingLine } from '../src/race/racing-line.js';
import { AIDriver, DRIVERS } from '../src/race/ai-driver.js';
import { Race } from '../src/race/race.js';
import { DIFFICULTY } from '../src/race/difficulty.js';
import { pickField, makeDriver, tunedSpec } from '../src/race/opponents.js';
import { carStats } from '../src/vehicles/stats.js';

const DT = 1 / 120;
let failed = 0;
const check = (ok, label) => { if (!ok) { failed++; console.log('  FAIL: ' + label); } };
const fmt = (t) => (Number.isFinite(t) ? t.toFixed(1) + ' s' : '-');

for (const def of [STARTER_TRACK, UNDERGROUND_TRACK, PARABOLICA_TRACK]) {
  for (const weather of ['clear', 'rain']) {
    if (weather === 'rain' && def.weathers && !def.weathers.includes('rain')) continue;
    const track = new TrackPath(def);
    const t0 = performance.now();
    const line = new RacingLine(track);
    const lineMs = performance.now() - t0;
    const cars = DRIVERS.map((p, n) => {
      const spec = CARS[n % CARS.length];
      const vehicle = new Vehicle(spec);
      const grip = applyWeather(vehicle, weather).grip;
      return { id: `${p.name}`, name: `${p.name} (${spec.model})`, vehicle, driver: new AIDriver(line, spec, p, { weatherGrip: grip, seed: n + 1 }) };
    });
    const race = new Race(track, line, cars, { laps: 2, weather });
    race.grid(def.start);
    race.go();
    let t = 0;
    while (t < 600 && !race.cars.every((c) => c.done)) { race.step(DT); t += DT; }
    console.log(`${def.name}, ${weather} (line ${lineMs.toFixed(0)} ms)`);
    for (const r of race.results()) {
      const c = race.cars.find((x) => x.id === r.id);
      console.log(`  ${String(r.place).padStart(2)}. ${r.name.padEnd(36)} ${r.done ? fmt(r.time).padStart(8) : '  did not finish'}  best ${fmt(r.best)}  walls ${c.hits}  put back ${c.resets}`);
      check(r.done, `${r.name} should finish on ${def.name} (${weather})`);
      check(c.resets <= 2, `${r.name} should rarely need putting back (${c.resets})`);
    }
  }
}

// Rivals tuned to a level: every car body should reach it, up and down.
console.log('Tuning');
for (const pi of [500, 650, 840]) {
  const got = CARS.map((c) => carStats(tunedSpec(c, pi)).pi);
  console.log(`  level ${pi}: ${got.join(', ')}`);
  check(got.every((g) => Math.abs(g - pi) < 25), `every car should tune to about ${pi}`);
}

// The field on each difficulty, alone (no rubber band): lap times must step up.
for (const def of [STARTER_TRACK, PARABOLICA_TRACK]) {
  console.log(`${def.name}: seven cars at level 510 and 800, median best lap`);
  const track = new TrackPath(def), line = new RacingLine(track);
  for (const pi of [510, 800]) {
    let last = Infinity;
    for (const [id, d] of Object.entries(DIFFICULTY)) {
      const cars = pickField({ count: 7, pi, difficulty: id, seed: 3 }).map((r, n) => ({ id: r.id, name: r.name, vehicle: new Vehicle(r.spec), driver: makeDriver(line, r, id, 1, n + 1) }));
      const race = new Race(track, line, cars, { laps: 2, band: { slow: 0, push: 0 } });
      race.grid(def.start);
      race.go();
      let t = 0;
      while (t < 400 && !race.cars.every((c) => c.done)) { race.step(DT); t += DT; }
      const bests = race.cars.map((c) => c.best).sort((a, b) => a - b), mid = bests[3];
      const resets = race.cars.reduce((a, c) => a + c.resets, 0), hits = race.cars.reduce((a, c) => a + c.hits, 0);
      console.log(`  ${String(pi).padStart(3)} ${d.name.padEnd(10)} ${fmt(mid).padStart(8)}  fastest ${fmt(bests[0])}  slowest ${fmt(bests[6])}  walls ${hits}  put back ${resets}`);
      check(race.cars.every((c) => c.done), `${d.name} on ${def.name}: every car should finish`);
      check(mid < last + 1, `${d.name} should be quicker than the difficulty below it`);
      check(resets <= 10, `${d.name}: rarely put back (${resets})`);
      last = mid;
    }
  }
}
if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nAll AI checks passed.');
