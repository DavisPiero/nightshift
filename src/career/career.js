// The career: levels, money and the ladder of events. Plain data and sums, no
// DOM, so tools/career-bench.mjs can run it in Node.
//
// Level 0-100 is Street, 100-150 GT3, 150-200 Formula and onwards (the GT3 and
// Formula cars do not exist yet, so the story stops at level 100 with "to be
// continued"). Each level needs a little more XP than the last.
//
// An event pays CR and XP by your place, scaled by the difficulty. A top three
// finish clears it and opens the next one (some need you ahead of Max). Replays pay 60%, so there is always
// something to do when a level or a car is out of reach; you can never lose
// money. The rivals race at the event's level, or just under your car's if
// that is higher: a better car helps, but never makes a race a walkover.

import { getDifficulty } from '../race/difficulty.js';

export const LEVEL_XP = (level) => 100 + 2 * level;              // XP from `level` to the next
export const XP_TO = (level) => 100 * level + level * (level - 1); // total XP to reach `level`

export function levelFor(xp) {
  let l = Math.floor((-99 + Math.sqrt(99 * 99 + 4 * Math.max(0, xp))) / 2);
  while (XP_TO(l + 1) <= xp) l++;
  while (l > 0 && XP_TO(l) > xp) l--;
  return l;
}

// How far through the current level: { level, into, need, share }.
export function levelInfo(xp) {
  const level = levelFor(xp), into = xp - XP_TO(level), need = LEVEL_XP(level);
  return { level, into, need, share: into / need };
}

const PLACE_PAY = [1, 0.8, 0.65, 0.5, 0.4, 0.3, 0.25, 0.2];
export const CLEARS = 3; // a top three finish clears an event

// The acts of the Street stage. `after` is a scene from story.js.
export const ACTS = [
  { id: 'clockoff', name: 'Clocking Off', jp: '退勤', blurb: 'The docks, after the last shift.' },
  { id: 'oldcountry', name: 'The Old Country', jp: '東京', blurb: 'Johnny takes you to the tunnels where he learned.' },
  { id: 'backhome', name: 'Back Home', jp: '帰郷', blurb: 'The harbor has heard about you now.' },
  { id: 'parabolica', name: 'The Ring', jp: '環状', blurb: 'The fastest street in the city, and someone with a clipboard.' },
  { id: 'lastrun', name: 'The Last Night Shift', jp: '最終', blurb: 'One more race with Max.' },
];

const E = (act, id, name, track, laps, level, pi, extra = {}) => ({ act, id, name, track, laps, level, pi, weather: 'clear', time: 'night', ...extra });
export const EVENTS = [
  E(0, 'first-run', 'After the Last Shift', 'starter', 3, 0, 490, { before: 'intro', after: 'first-run' }),
  E(0, 'dock-road', 'Dock Road Sprint', 'starter', 3, 2, 495),
  E(0, 'containers', 'Container Alley', 'starter', 3, 4, 505, { weather: 'fog' }),
  E(0, 'johnnys-bet', 'Johnny\'s Bet', 'starter', 3, 7, 515, { time: 'sunset', after: 'johnnys-story' }),
  E(0, 'harbor-kings', 'Harbor Kings', 'starter', 3, 10, 530, { weather: 'rain', rival: true, before: 'meet-max', after: 'max-laughs' }),
  E(1, 'first-tokyo', 'First Night in Tokyo', 'underground', 3, 14, 560, { before: 'to-tokyo' }),
  E(1, 'turquoise', 'Turquoise Mile', 'underground', 3, 18, 590),
  E(1, 'junction', 'Junction Loop', 'underground', 3, 22, 610, { weather: 'fog' }),
  E(1, 'old-line', 'Johnny\'s Old Line', 'underground', 5, 26, 630, { after: 'old-line' }),
  E(1, 'under-city', 'Under the City', 'underground', 5, 30, 650, { rival: true, beat: true, before: 'max-in-tokyo', after: 'max-beaten-once' }),
  E(2, 'wet-docks', 'Rain on the Docks', 'starter', 5, 35, 670, { weather: 'rain', before: 'back-home' }),
  E(2, 'snow-night', 'Snow Night', 'starter', 3, 40, 690, { weather: 'snow' }),
  E(2, 'tunnel-vision', 'Tunnel Vision', 'underground', 5, 44, 700, { weather: 'fog' }),
  E(2, 'dawn-patrol', 'Dawn Patrol', 'starter', 5, 48, 720, { time: 'dawn' }),
  E(2, 'double-shift', 'Double Shift', 'underground', 5, 52, 735),
  E(2, 'maxs-invite', 'Max\'s Invite', 'starter', 5, 56, 750, { rival: true, time: 'sunset', before: 'max-calls', after: 'the-ring' }),
  E(3, 'long-straight', 'The Long Straight', 'parabolica', 3, 60, 765),
  E(3, 'two-chicanes', 'Two Chicanes', 'parabolica', 3, 65, 775),
  E(3, 'park-sunset', 'Sunset at the Park', 'parabolica', 5, 70, 785, { time: 'sunset', after: 'clipboard' }),
  E(3, 'wet-lesmos', 'Wet Lesmos', 'parabolica', 3, 74, 795, { weather: 'rain' }),
  E(3, 'watching', 'The Scout Is Watching', 'parabolica', 5, 80, 805, { before: 'meet-aoi' }),
  E(4, 'neon-ring', 'Ring of Neon', 'parabolica', 5, 85, 815),
  E(4, 'snow-ring', 'Snow on the Ring', 'parabolica', 3, 90, 825, { weather: 'snow', after: 'johnnys-talk' }),
  E(4, 'last-shift', 'The Last Night Shift', 'parabolica', 5, 100, 840, { rival: true, beat: true, before: 'last-night', after: 'signed' }),
];
EVENTS.forEach((e, n) => {
  const k = n / (EVENTS.length - 1);
  e.cr = Math.round((1500 + 6500 * k) / 50) * 50;
  e.xp = Math.round((250 + 450 * k) / 10) * 10;
});

export const getEvent = (id) => EVENTS.find((e) => e.id === id);
export const cleared = (career, e) => career.done[e.id] >= 1 && career.done[e.id] <= CLEARS;

// Why an event is shut, or null if you can race it.
export function eventLock(career, e) {
  const n = EVENTS.indexOf(e);
  if (n > 0 && !cleared(career, EVENTS[n - 1])) return 'Finish in the top three in the last race first';
  if (levelFor(career.xp) < e.level) return `Reach level ${e.level}`;
  return null;
}

// The level the rivals race at, for a car rated `pi`.
export const fieldLevel = (e, pi) => Math.max(e.pi, pi - 30);

export function eventPay(e, place, difficulty, first) {
  const k = (PLACE_PAY[place - 1] ?? 0.2) * getDifficulty(difficulty).pay * (first ? 1 : 0.6);
  const bonus = first && place <= CLEARS ? 1.5 : 1; // first time you clear it
  return { cr: Math.round(e.cr * k * bonus / 10) * 10, xp: Math.round(e.xp * k * bonus) };
}

// A race outside the career pays less, and more for longer and quicker races.
export function racePay(laps, pi, place, difficulty, rivals) {
  if (!rivals) return { cr: 0, xp: 0 };
  const k = (PLACE_PAY[place - 1] ?? 0.2) * getDifficulty(difficulty).pay * (laps / 3) * (pi / 500);
  return { cr: Math.round(800 * k / 10) * 10, xp: Math.round(120 * k) };
}

// Bank the pay. Returns what changed, for the results screen.
export function bank(career, pay) {
  const before = levelFor(career.xp);
  career.cr += pay.cr; career.xp += pay.xp;
  return { ...pay, levelBefore: before, levelAfter: levelFor(career.xp) };
}

// Fastest way to show money.
export const cr = (n) => `CR ${Math.round(n).toLocaleString('en-US')}`;
