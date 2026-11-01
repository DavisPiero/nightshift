// Career bench: plays the Street stage in Node with a made-up player who
// finishes second on Normal, replaying the newest race whenever a level gate
// is in the way, spends about a fifth of each race's top prize on one-race
// upgrades, and buys the next car as soon as it can afford it. Prints how
// many races the career takes and when each car arrives, and checks the
// numbers stay in the range David asked for: "the career should take a while".
//   node tools/career-bench.mjs

import { EVENTS, ACTS, XP_TO, levelFor, eventLock, eventPay, cleared, bank } from '../src/career/career.js';
import { CARS } from '../src/vehicles/cars.js';
import { STARTER_TRACK } from '../src/world/starter-track.js';
import { UNDERGROUND_TRACK } from '../src/world/underground.js';
import { PARABOLICA_TRACK } from '../src/world/parabolica.js';
import { MOUNTAIN_TRACK } from '../src/world/mountain.js';
import { clock, DAY, call, contacts, priceOf, paid, VOUCHER_OFF } from '../src/career/contacts.js';
import { currentInvite, enterInvite, invitePay, stepUp, inviteWait } from '../src/career/invites.js';
import { QUESTS, checkQuest } from '../src/career/quests.js';
import { SCENES } from '../src/career/story.js';

let failed = 0;
const check = (ok, label) => { if (!ok) { failed++; console.log('  FAIL: ' + label); } };
const lap = { starter: 48, underground: 56, parabolica: 115, mountain: 100 }; // seconds, from the AI bench

// Every event must make sense on its track, and every story scene must exist.
for (const e of EVENTS) {
  const t = { starter: STARTER_TRACK, underground: UNDERGROUND_TRACK, parabolica: PARABOLICA_TRACK, mountain: MOUNTAIN_TRACK }[e.track];
  check(t, `${e.id}: no track ${e.track}`);
  check(!t.weathers || t.weathers.includes(e.weather), `${e.id}: ${e.track} has no ${e.weather}`);
  check(!t.times || t.times.includes(e.time), `${e.id}: ${e.track} has no ${e.time}`);
  for (const s of [e.before, e.after]) if (s) check(SCENES[s], `${e.id}: no scene ${s}`);
}
check(new Set(EVENTS.map((e) => e.id)).size === EVENTS.length, 'event ids must be different');

const career = { cr: 0, xp: 0, done: {}, tracks: [], seen: [], difficulty: 'normal' };
const shop = [...CARS].filter((c) => c.price).sort((a, b) => a.price - b.price);
let races = 0, seconds = 0, spent = 0;
const log = [];
for (let guard = 0; guard < 2000; guard++) {
  const next = EVENTS.find((e) => !cleared(career, e));
  if (!next) break;
  const lock = eventLock(career, next);
  const n = EVENTS.indexOf(next);
  const e = lock ? EVENTS[n - 1] : next; // level gate: replay the last race
  const first = !cleared(career, e);
  const place = 2;
  const parts = Math.min(career.cr, Math.round(e.cr * 0.2)); // the laptop, before the race
  career.cr -= parts; spent += parts;
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
console.log(`\nStreet: ${races} races, ${hours.toFixed(1)} hours, level ${levelFor(career.xp)}, CR ${career.cr} left, CR ${spent} on upgrades, ${shop.length} cars unbought (${ACTS.length} acts, ${EVENTS.length} events; level 100 needs ${XP_TO(100)} XP)`);
check(EVENTS.every((e) => cleared(career, e)), 'the career should be finishable');
check(hours > 3 && hours < 9, 'Street should take between 3 and 9 hours');
check(!shop.length, 'every Street car should be affordable by the end');

// When each track first turns up, by level.
{
  const first = {};
  for (const e of EVENTS) first[e.track] ??= e.level;
  console.log('First race on each track, by level:', Object.entries(first).map(([t, l]) => `${t} ${l}`).join(', '));
  check(Object.values(first).every((l) => l <= 25), 'every track should turn up by level 25');
}

// Favours, invites and jobs, on the clock.
{
  const save = { garage: { owned: ['impreza-gc8'] }, career: { cr: 5000, xp: 0, done: { 'first-run': 1, 'under-city': 2 }, seen: ['intro'], difficulty: 'normal', racer: { name: 'A' }, favours: {}, sonny: { since: 0, used: -1 }, quest: 0, vouchers: 0 } };
  const c = save.career, base = Date.now();
  clock.skew = 0;
  const car = CARS.find((x) => x.id === 'mustank-gt500'), other = CARS.find((x) => x.id === 'countach-qv');
  check(contacts(c).length === 1, 'only Johnny at the start');
  check(priceOf(save, car).pct === 0, 'no deal before a favour');
  c.favours.johnny = { at: base, type: 'american' };
  check(priceOf(save, car).price === 49500 && priceOf(save, other).pct === 0, 'Johnny: 10% off one type only');
  call(save, 'johnny');
  check(c.favours.johnny.at === base, 'one favour every 24 hours');
  clock.skew = DAY + 1000;
  check(priceOf(save, car).pct === 0, 'the deal ends after 24 hours');
  call(save, 'johnny');
  check(c.favours.johnny.at > base, 'a new favour after 24 hours');
  clock.skew = 0;
  c.favours = {};

  check(!currentInvite(c), 'no invite before you meet Sonny');
  c.sonny.since = base; c.seen.push('meet-sonny');
  const inv = currentInvite(c), top = EVENTS.find((e) => e.id === 'under-city');
  check(inv.cr === top.cr * 2 && inv.entry === 500, 'an invite is about twice your top event, CR 500 to enter');
  check(inv.difficulty === stepUp('normal') && inv.difficulty === 'hard', 'one difficulty up');
  check(stepUp('impossible') === 'impossible', 'there is nothing above Impossible');
  check(invitePay(inv, 3).cr > 0 && invitePay(inv, 4).cr === 0, 'podium or nothing');
  enterInvite(c, inv);
  check(c.cr === 4500 && !currentInvite(c), 'one try');
  check(inviteWait(c) > 0 && inviteWait(c) <= DAY, 'the next one comes within a day');
  clock.skew = DAY + 1000;
  const next = currentInvite(c);
  check(next && next.id !== inv.id, 'a new invite every 24 hours');
  clock.skew = 2 * DAY + 1000;
  check(currentInvite(c).id !== next.id, 'an unraced invite expires at the next mark');
  const seen = new Set(); for (let n = 0; n < 8; n++) { clock.skew = n * DAY + 1000; seen.add(currentInvite(c)?.track); }
  check(seen.has('mountain'), 'Yamagiri Pass is in the invites');
  clock.skew = 0;

  c.seen.push('dave-lot');
  check(!checkQuest(c, { track: 'underground', weather: 'clear', place: 1, hits: 0, difficulty: 'normal' }), 'a job only counts when its turn comes');
  let n = 0;
  for (const r of [{ track: 'starter', weather: 'clear', place: 2, hits: 3, difficulty: 'easy' }, { track: 'starter', weather: 'rain', place: 1, hits: 3, difficulty: 'easy' }, { track: 'underground', weather: 'clear', place: 1, hits: 0, difficulty: 'easy' }, { track: 'starter', weather: 'clear', place: 3, hits: 0, difficulty: 'easy' }, { track: 'starter', weather: 'fog', place: 1, hits: 2, difficulty: 'easy' }, { track: 'mountain', weather: 'clear', place: 1, hits: 2, difficulty: 'easy' }, { track: 'parabolica', weather: 'clear', place: 1, hits: 2, difficulty: 'easy' }, { track: 'starter', weather: 'clear', place: 1, hits: 2, difficulty: 'hard' }]) if (checkQuest(c, r)) n++;
  check(n === QUESTS.length && c.vouchers === QUESTS.length, 'every job can be done, one voucher each');
  const deal = priceOf(save, car);
  check(deal.pct === VOUCHER_OFF && deal.who === 'Dave', 'a voucher is 15% off any car');
  paid(save, deal);
  check(c.vouchers === QUESTS.length - 1, 'a voucher is spent once');
  const seenWith = c.vouchers; c.vouchers = 0; c.favours.johnny = { at: base, type: 'american' }; c.vouchers = seenWith;
  check(priceOf(save, car).pct === VOUCHER_OFF, 'the best deal applies, not both');
}
if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log('All career checks passed.');
