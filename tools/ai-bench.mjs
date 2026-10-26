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
    const race = new Race(track, line, cars, { laps: 2 });
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
if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nAll AI checks passed.');
