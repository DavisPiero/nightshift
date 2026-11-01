// The people in your phone. Someone is in your contacts once you have met them,
// and some can do you a favour: Johnny knows people who sell cars, one call every
// 24 real hours; Sonny sends race invites (invites.js); Dave has jobs (quests.js).
// Plain data and sums, no DOM, so tools/career-bench.mjs can run it.

import { CARS } from '../vehicles/cars.js';
import { currentInvite, inviteWait } from './invites.js';
import { currentQuest } from './quests.js';

export const DAY = 24 * 3600 * 1000;
// Real time, with a switch to skip ahead when testing (?hours=25).
export const clock = { skew: 0, now() { return Date.now() + this.skew; } };

const HOUR = 3600 * 1000;
export const hoursLeft = (ms) => `${Math.max(1, Math.ceil(ms / HOUR))} h`;

// The kinds of car Johnny can get a deal on.
export const CAR_TYPES = { japanese: 'Japanese', american: 'American', italian: 'Italian' };
const JOHNNY_OFF = 10; // percent
export const VOUCHER_OFF = 15; // Dave's, on any one car

const seen = (id) => (c) => c.seen.includes(id);

export const CONTACTS = [
  { id: 'johnny', name: 'Johnny', met: seen('intro') },
  { id: 'dave', name: 'Dave', met: seen('dave-lot') },
  { id: 'sonny', name: 'Sonny', met: seen('meet-sonny') },
  { id: 'max', name: 'Max', met: seen('meet-max'), lines: ['New phone who.', 'I said I\'d learn your name. I didn\'t say I\'d pick up.', 'Busy. Go practise.', 'If this is about the tunnels, no.'] },
  { id: 'aoi', name: 'Aoi Tachibana', met: seen('meet-aoi'), lines: ['This number is for telemetry.', 'Your last sector was untidy. That is all.', 'I\'ll call when there is something to say.'] },
];

export const contacts = (career) => CONTACTS.filter((p) => p.met(career));

const johnnyWait = (career) => Math.max(0, (career.favours.johnny?.at ?? -DAY) + DAY - clock.now());
const dealLive = (career) => johnnyWait(career) > 0 ? career.favours.johnny.type : null;

// The kinds that still have a car you do not own.
const typesToBuy = (save) => Object.keys(CAR_TYPES).filter((t) => CARS.some((c) => c.origin === t && c.price && !save.garage.owned.includes(c.id)));

// The small print under a name in the list.
export function contactNote(save, id) {
  const c = save.career;
  if (id === 'johnny') {
    const deal = dealLive(c);
    if (deal) return `${JOHNNY_OFF}% off ${CAR_TYPES[deal]}, ${hoursLeft(johnnyWait(c))} left`;
    return typesToBuy(save).length ? 'Favour ready' : '';
  }
  if (id === 'sonny') {
    const inv = currentInvite(c);
    return inv ? `${inv.name}, ${hoursLeft(inv.expires - clock.now())} left` : `Next invite in ${hoursLeft(inviteWait(c))}`;
  }
  if (id === 'dave') {
    if (c.vouchers) return `${c.vouchers} voucher${c.vouchers > 1 ? 's' : ''}, ${VOUCHER_OFF}% off`;
    return currentQuest(c)?.name ?? '';
  }
  return '';
}

// Call someone: what they say, as a message for the phone. Johnny's favour is
// done by the call itself. `race`: the message has a Race button.
export function call(save, id, n = 0) {
  const c = save.career, p = CONTACTS.find((x) => x.id === id);
  const msg = (subject, text, more = {}) => ({ id: `call-${id}`, from: p.name, subject, text, read: true, call: true, ...more });
  if (id === 'johnny') {
    const deal = dealLive(c);
    if (deal) return msg('Already sorted', `Already called in my favour, ${c.racer.name || 'kid'}. ${JOHNNY_OFF}% off anything ${CAR_TYPES[deal]} at Dave's. Ring me in ${hoursLeft(johnnyWait(c))}.`);
    const types = typesToBuy(save);
    if (!types.length) return msg('Nothing to sort', 'You own everything he\'s got. Go and drive one.');
    const type = types[Math.floor(Math.random() * types.length)];
    c.favours.johnny = { at: clock.now(), type };
    return msg('Favour', `Rang a man about a man. ${JOHNNY_OFF}% off anything ${CAR_TYPES[type]} at Dave's, for 24 hours. Don't tell him I know his real name.`);
  }
  if (id === 'sonny') {
    const inv = currentInvite(c);
    if (inv) return { ...inviteMail(inv), read: true, call: true };
    return msg('...', `Nothing yet nothing yet NOTHING YET. I'll have one in ${hoursLeft(inviteWait(c))}. Have you tried coffee? Have you tried more coffee?`);
  }
  if (id === 'dave') {
    if (c.vouchers) return msg('Your voucher', `That voucher's good, mate. ${VOUCHER_OFF}% off any car on the lot. Doesn't expire. Neither do I, apparently.`);
    const q = currentQuest(c);
    return q ? msg(q.name, q.ask) : msg('No more jobs', 'That\'s every job I\'ve got, mate. Might have to do some work myself. Might not.');
  }
  return msg('...', p.lines[n % p.lines.length]);
}

// An invite as mail: Sonny's voice, all the facts.
export const inviteMail = (inv) => ({
  id: inv.id, from: 'Sonny', subject: inv.name, race: true,
  text: `${inv.line} ${inv.trackName}, ${inv.laps} laps. CR ${inv.entry} to enter. One try. Podium or nothing. ${hoursLeft(inv.expires - clock.now())} left.`,
});

// What a car costs you today, and whose deal it is: the best one, never both.
export function priceOf(save, car) {
  const c = save.career, deal = dealLive(c) === car.origin ? JOHNNY_OFF : 0, voucher = c.vouchers ? VOUCHER_OFF : 0;
  const pct = Math.max(deal, voucher);
  return { price: Math.round(car.price * (1 - pct / 100) / 50) * 50, pct, who: !pct ? null : voucher >= deal ? 'Dave' : 'Johnny' };
}

// Paid: a voucher used is gone.
export function paid(save, deal) { if (deal.who === 'Dave') save.career.vouchers--; }
