// Career bench: plays the Street stage in Node with a made-up player who
// finishes second on Normal, replaying the newest race whenever a level gate
// is in the way, and buys the next car as soon as it can afford it. Prints how
// many races the career takes and when each car arrives, and checks the
// numbers stay in the range David asked for: "the career should take a while".
//   node tools/career-bench.mjs

import { EVENTS, ACTS, XP_TO, levelFor, eventLock, eventPay, cleared, bank } from '../src/career/career.js';
import { CARS } from '../src/vehicles/cars.js';
import { STARTER_TRACK } from '../src/world/starter-track.js';
import { UNDERGROUND_TRACK } from '../src/world/underground.js';
import { PARABOLICA_TRACK } from '../src/world/parabolica.js';
import { SCENES } from '../src/career/story.js';

let failed = 0;
const check = (ok, label) => { if (!ok) { failed++; console.log('  FAIL: ' + label); } };
const lap = { starter: 75, underground: 90, parabolica: 115 }; // seconds, from the AI bench

// Every event must make sense on its track, and every story scene must exist.
for (const e of EVENTS) {
  const t = { starter: STARTER_TRACK, underground: UNDERGROUND_TRACK, parabolica: PARABOLICA_TRACK }[e.track];
  check(t, `${e.id}: no track ${e.track}`);
  check(!t.weathers || t.weathers.includes(e.weather), `${e.id}: ${e.track} has no ${e.weather}`);
  check(!t.times || t.times.includes(e.time), `${e.id}: ${e.track} has no ${e.time}`);
  for (const s of [e.before, e.after]) if (s) check(SCENES[s], `${e.id}: no scene ${s}`);
}
check(new Set(EVENTS.map((e) => e.id)).size === EVENTS.length, 'event ids must be different');

const career = { cr: 0, xp: 0, done: {}, tracks: [], seen: [], difficulty: 'normal' };
const shop = [...CARS].filter((c) => c.price).sort((a, b) => a.price - b.price);
let races = 0, seconds = 0;
const log = [];
for (let guard = 0; guard < 2000; guard++) {
  const next = EVENTS.find((e) => !cleared(career, e));
  if (!next) break;
  const lock = eventLock(career, next);
  const n = EVENTS.indexOf(next);
  const e = lock ? EVENTS[n - 1] : next; // level gate: replay the last race
  const first = !cleared(career, e);
  const place = 2;
  bank(career, eventPay(e, place, 'normal', first));
  if (first) career.done[e.id] = place;
  races++; seconds += lap[e.track] * e.laps + 60;
  if (first) log.push(`  ${String(n + 1).padStart(2)}. ${e.name.padEnd(26)} act ${e.act + 1}, race ${String(races).padStart(3)}, level ${String(levelFor(career.xp)).padStart(3)}, CR ${career.cr}`);
  while (shop.length && career.cr >= shop[0].price) {
    const c = shop.shift();
    career.cr -= c.price;
    log.push(`      bought the ${c.model} for CR ${c.price} at race ${races}, level ${levelFor(career.xp)}`);
  }
}
console.log(log.join('\n'));
const hours = seconds / 3600;
console.log(`\nStreet: ${races} races, ${hours.toFixed(1)} hours, level ${levelFor(career.xp)}, CR ${career.cr} left, ${shop.length} cars unbought (${ACTS.length} acts, ${EVENTS.length} events; level 100 needs ${XP_TO(100)} XP)`);
check(EVENTS.every((e) => cleared(career, e)), 'the career should be finishable');
check(hours > 3 && hours < 9, 'Street should take between 3 and 9 hours');
check(!shop.length, 'every Street car should be affordable by the end');
if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log('All career checks passed.');
