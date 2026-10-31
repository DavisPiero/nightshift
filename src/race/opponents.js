// Picks the field for a race. Every rival uses one of the game's car bodies,
// quietly tuned to a target rating, so a grid looks varied (a Countash next to
// an Impreza) while everyone is at about the same level. No Three.js.

import { CARS } from '../vehicles/cars.js';
import { buildSpec } from '../vehicles/tuning.js';
import { carStats } from '../vehicles/stats.js';
import { getDifficulty } from './difficulty.js';
import { AIDriver, DRIVERS, MAX } from './ai-driver.js';
import { PALETTE, defaultLook } from '../vehicles/looks.js';

const tuned = new Map();

// A copy of a car tuned to about `target` (1-1000): power first, then grip.
export function tunedSpec(car, target) {
  target = Math.round(target / 10) * 10; // close enough, and it can be remembered
  const key = `${car.id}:${target}`;
  if (tuned.has(key)) return tuned.get(key);
  const base = buildSpec(car);
  let lo = 0.5, hi = 1.8, best = base, gap = Infinity;
  for (let i = 0; i < 9 && gap > 8; i++) { // halve the range: a bigger k always rates higher
    const k = (lo + hi) / 2;
    const s = structuredClone(base);
    s.torqueScale = (base.torqueScale ?? 1) * k ** 2.2;
    s.tireGrip = base.tireGrip * k ** 0.5;
    s.brakeForce = base.brakeForce * k ** 0.5;
    const pi = carStats(s).pi;
    if (Math.abs(pi - target) < gap) { gap = Math.abs(pi - target); best = s; }
    if (pi < target) lo = k; else hi = k;
  }
  tuned.set(key, best);
  return best;
}

// The field, best first. count: how many rivals. pi: the level they race at.
// rival: true puts Max on the grid. Returns [{ id, name, spec, persona, look }].
export function pickField({ count, pi, difficulty, rival = false, seed = 1 }) {
  let s = seed >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const d = getDifficulty(difficulty);
  const people = shuffle([...DRIVERS]).slice(0, count);
  if (rival) people[0] = MAX;
  people.sort((a, b) => b.pace - a.pace);
  const bodies = [];
  while (bodies.length < count) bodies.push(...shuffle([...CARS]));
  return people.map((persona, n) => {
    const car = bodies[n];
    const spread = (count > 1 ? 0.5 - n / (count - 1) : 0) * 40; // the front of the grid a little quicker
    const base = tunedSpec(car, pi + spread + (persona.rival ? 15 : 0));
    const spec = d.edge === 1 ? base : { ...base, tireGrip: base.tireGrip * d.edge };
    const look = { ...defaultLook(car), paint: persona.rival ? 0x111214 : PALETTE[Math.floor(rand() * PALETTE.length)][0], finish: rand() < 0.5 ? 'gloss' : 'metallic', decal: persona.rival ? 'stripes' : 'none', decalColour: 0xff2e88 };
    return { id: persona.name, name: persona.name, car: `${car.make} ${car.model}`, spec, persona, look };
  });
}

// One AI driver per picked rival.
export function makeDriver(line, r, difficulty, weatherGrip, seed) {
  return new AIDriver(line, r.spec, r.persona, { weatherGrip, seed, skill: getDifficulty(difficulty).skill });
}
