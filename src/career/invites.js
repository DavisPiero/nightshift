// Sonny's invites: the most coveted street races. One every 24 real hours from the
// day you meet him, gone at the next 24-hour mark whether you raced it or not. CR 500
// to enter, one try, one difficulty up from yours, podium or nothing, about twice
// your top event. An invite is worked out from the hour you met him, so nothing is
// stored but that hour and the last one you used. No DOM.

import { clock, DAY } from './contacts.js';
import { EVENTS, cleared } from './career.js';
import { DIFFICULTY, getDifficulty } from '../race/difficulty.js';

export const ENTRY = 500;
const PODIUM = [1, 0.7, 0.5]; // of the purse, by place. Off the podium, nothing.

const TRACK_NAMES = { mountain: 'Yamagiri Pass', parabolica: 'Parabolica Street', underground: 'Underground', starter: 'Starter Track' };
// Yamagiri Pass is at home here: half of them go up the mountain.
const RACES = [
  { name: 'Shrine Gate Midnight', track: 'mountain', laps: 2, time: 'night', weather: 'clear', line: 'BIG one big one BIG ONE. The gates at midnight. Everybody who is anybody. Are you anybody?' },
  { name: 'Parabolica After Dark', track: 'parabolica', laps: 3, time: 'night', weather: 'clear', line: 'The Ring! No cameras! Nobody saw me tell you this! Everybody knows!' },
  { name: 'Moon Run', track: 'mountain', laps: 2, time: 'night', weather: 'fog', line: 'Fog on the pass, you can\'t see a thing, it\'s PERFECT, I\'ve had four coffees.' },
  { name: 'The Under Club', track: 'underground', laps: 5, time: 'night', weather: 'clear', line: 'Tunnels! Members only! You\'re a member now! I made you a member!' },
  { name: 'Snow Line', track: 'mountain', laps: 2, time: 'night', weather: 'snow', line: 'Snow on the mountain. Nobody sensible is going. Great news: neither of us is sensible.' },
  { name: 'Harbor Lights Invitational', track: 'starter', laps: 5, time: 'night', weather: 'rain', line: 'Wet docks, big money, I know a guy, the guy knows a guy, the guy is me.' },
  { name: 'First Light Hill Climb', track: 'mountain', laps: 2, time: 'dawn', weather: 'clear', line: 'Dawn! Up the hill! Before the police wake up! I haven\'t slept since Tuesday!' },
  { name: 'Sakura Sprint', track: 'parabolica', laps: 3, time: 'dawn', weather: 'clear', line: 'Blossom, dawn, money. Three of my favourite things. Four with coffee.' },
];

const met = (career) => career.sonny.since;
const windowNow = (career) => Math.floor((clock.now() - met(career)) / DAY);

// The next difficulty up from yours.
export function stepUp(id) {
  const ids = Object.keys(DIFFICULTY), n = ids.indexOf(id);
  return ids[Math.min(ids.length - 1, Math.max(0, n) + 1)];
}

// The furthest event you have cleared: what "your top event" means.
const topEvent = (career) => [...EVENTS].reverse().find((e) => cleared(career, e)) || EVENTS[0];

// This window's invite, or null if you have used it or have not met him.
export function currentInvite(career) {
  if (!met(career)) return null;
  const n = windowNow(career);
  if (career.sonny.used === n) return null;
  const race = RACES[(n * 5 + 2) % RACES.length], top = topEvent(career), difficulty = stepUp(career.difficulty);
  return {
    ...race, id: `invite-${n}`, window: n, invite: true, trackName: TRACK_NAMES[race.track],
    entry: ENTRY, difficulty, expires: met(career) + (n + 1) * DAY,
    level: top.level, pi: top.pi + 15, cr: top.cr * 2, xp: top.xp * 2,
  };
}

// How long until the next one.
export const inviteWait = (career) => (met(career) ? met(career) + (windowNow(career) + 1) * DAY - clock.now() : 0);

// Pay the entry and use the invite: there is no second try from here.
export function enterInvite(career, inv) {
  career.cr -= inv.entry;
  career.sonny.used = inv.window;
}

export function invitePay(inv, place) {
  const k = (PODIUM[place - 1] ?? 0) * getDifficulty(inv.difficulty).pay;
  return { cr: Math.round(inv.cr * k / 10) * 10, xp: Math.round(inv.xp * k) };
}
