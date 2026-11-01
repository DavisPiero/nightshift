// The numbers on the laptop's Analytics tab: every driver on the grid, their car,
// how they drive, the predicted order and who is most likely to be trouble. No
// Three.js and no DOM, so tools/ai-bench.mjs can check the predictions against
// real races.

import { carStats } from '../vehicles/stats.js';

export const STYLE_NAMES = { aggressive: 'Aggressive', defensive: 'Defensive', reckless: 'Reckless', plain: 'Steady' };

// Laps come from the driver more than the car: `pi` is a car's rating, and the
// field is tuned to within about 40 points of each other. A reckless driver gives up
// corners for straights; those weigh about the same over a lap.
const PI_WEIGHT = 0.0009, STYLE_PACE = { aggressive: 0.006, defensive: -0.004, reckless: 0, plain: 0 };
const YOU_PACE = 0.95; // nothing is known about you, so the middle of the field

const TROUBLE = { aggressive: 1, reckless: 0.7, plain: 0.55, defensive: 0.45 };

// cars: the race's cars, the player's included. Returns a row for each, in the
// predicted order, with `trouble` true on the one rival to watch.
export function analyse(cars) {
  const rows = cars.map((c) => {
    const p = c.driver?.persona, stats = carStats(c.vehicle.spec), style = p?.style || 'plain';
    const pace = c.driver ? p.pace * (p.consistency * 0.04 + 0.96) : YOU_PACE;
    return {
      name: c.name, car: c.car, you: !c.driver, rival: !!c.rival, stats, hp: stats.hp, top: stats.top, pi: stats.pi,
      style: c.driver ? STYLE_NAMES[style] : '', aggression: p?.aggression ?? 0, styleId: style,
      score: pace + (stats.pi - 700) * PI_WEIGHT + (c.driver ? STYLE_PACE[style] ?? 0 : 0),
    };
  }).sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => { r.place = i + 1; });
  const you = rows.find((r) => r.you)?.place ?? 4;
  // Trouble: a hard driver who will be near you on the road. Max always is.
  let worst = null, most = -1;
  for (const r of rows) {
    if (r.you) continue;
    const near = 1 - Math.abs(r.place - you) / rows.length;
    const t = r.aggression * TROUBLE[r.styleId] * near + (r.rival ? 1 : 0);
    if (t > most) { most = t; worst = r; }
  }
  if (worst) worst.trouble = true;
  return { rows, trouble: worst };
}

// One line on why they are the one to watch.
export function troubleLine(r) {
  if (r.rival) return `${r.name}: wants you off the road, and has been told nothing about pity.`;
  return { aggressive: `${r.name}: dives for every gap. Leave room or lose a door.`,
    reckless: `${r.name}: all engine, no patience. Loose in the bends, gone on the straights.`,
    defensive: `${r.name}: covers the inside and never lets you by.` }[r.styleId] || `${r.name}: sits right where you want to be.`;
}
