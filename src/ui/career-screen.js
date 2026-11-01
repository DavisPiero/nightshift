// The Career screen: the acts and their races down the left, the picked race
// on the right with its track, its pay, the difficulty and your car. The story
// scenes (cutscene.js) play round the races, once each.

import { ACTS, EVENTS, cleared, eventLock, eventPay, fieldLevel, cr } from '../career/career.js';
import { currentInvite, enterInvite, invitePay } from '../career/invites.js';
import { clock, hoursLeft } from '../career/contacts.js';
import { LATER } from '../career/story.js';
import { DIFFICULTY } from '../race/difficulty.js';
import { getTrack } from '../world/tracks.js';
import { WEATHER } from '../physics/weather.js';
import { TIMES } from '../world/time-of-day.js';
import { getCar } from '../vehicles/cars.js';
import { classFor } from '../vehicles/stats.js';

const $ = (sel) => document.querySelector(sel);

export class CareerScreen {
  constructor(game, screens) {
    this.game = game;
    this.screens = screens;
    this.pick = null;
    $('#career-go').addEventListener('click', () => this.go());
    $('#career-car').addEventListener('click', () => { this.screens.afterCar = 'back'; this.screens.open('setup'); });
  }

  get career() { return this.game.save.career; }
  get event() { return this.pick === 'invite' ? currentInvite(this.career) : EVENTS.find((e) => e.id === this.pick); }

  // The first race not yet cleared.
  next() { return EVENTS.find((e) => !cleared(this.career, e)) || EVENTS[EVENTS.length - 1]; }

  open() {
    const c = this.career;
    if (!this.event || (!this.event.invite && eventLock(c, this.event))) this.pick = this.next().id;
    this.fillList();
    this.fillInfo();
    this.game.loadTrack(this.event.track);
    // An old save has a story but no racer: Johnny asks now.
    if (!c.seen.includes('intro')) this.screens.story('intro');
    else if (!c.racer.name) this.screens.story('paperwork');
    // After Under the City, a small man with a large coffee.
    else if (cleared(c, EVENTS.find((e) => e.id === 'under-city')) && !c.seen.includes('meet-sonny')) {
      this.screens.story('meet-sonny', () => { c.sonny.since = clock.now(); this.game.saveNow(); this.fillList(); this.fillInfo(); });
    }
  }

  fillList() {
    const list = $('#career-list'), c = this.career;
    list.innerHTML = '';
    const inv = currentInvite(c);
    if (inv) {
      const h = document.createElement('h3');
      h.className = 'grp';
      h.innerHTML = `Sonny's invite<span class="jp">招待</span>`;
      const b = document.createElement('button');
      b.className = `btn item ev${this.pick === 'invite' ? ' on' : ''}`;
      b.innerHTML = `<span class="ev-mark">!</span><span class="txt"><span class="name">${inv.name}</span><span class="sub">${getTrack(inv.track).name} · ${inv.laps} laps · ${hoursLeft(inv.expires - clock.now())} left</span></span>`;
      b.addEventListener('click', () => { this.pick = 'invite'; this.game.loadTrack(inv.track); this.fillList(); this.fillInfo(); });
      list.append(h, b);
    }
    ACTS.forEach((a, n) => {
      const h = document.createElement('h3');
      h.className = 'grp';
      h.innerHTML = `${a.name}<span class="jp">${a.jp}</span>`;
      list.appendChild(h);
      for (const e of EVENTS.filter((x) => x.act === n)) {
        const lock = eventLock(c, e), place = c.done[e.id];
        const b = document.createElement('button');
        b.className = `btn item ev${e.id === this.pick ? ' on' : ''}`;
        b.disabled = !!lock;
        b.innerHTML = `<span class="ev-mark">${place ? `P${place}` : lock ? '' : '>'}</span>`
          + `<span class="txt"><span class="name">${e.name}</span><span class="sub">${lock ? (lock.startsWith('Reach') ? lock : 'Locked') : `${getTrack(e.track).name} · ${e.laps} laps`}</span></span>`
          + (e.rival ? '<span class="ev-max">MAX</span>' : '');
        b.addEventListener('click', () => { this.pick = e.id; this.game.loadTrack(e.track); this.fillList(); this.fillInfo(); });
        list.appendChild(b);
      }
    });
    for (const l of LATER) {
      const h = document.createElement('h3');
      h.className = 'grp shut';
      h.innerHTML = `${l.name}<span class="muted">Level ${l.level}. ${l.blurb}</span>`;
      list.appendChild(h);
    }
  }

  fillInfo() {
    const e = this.event, c = this.career, t = getTrack(e.track);
    const car = getCar(this.screens.pick.car), rating = this.game.currentRatingOf(car.id);
    const level = fieldLevel(e, rating.pi), diff = e.invite ? e.difficulty : c.difficulty;
    const pay = e.invite ? invitePay(e, 1) : eventPay(e, 1, diff, !cleared(c, e));
    const short = rating.pi < e.pi - 60;
    const el = $('#career-info');
    el.innerHTML = `<div class="ttl"><span>${e.invite ? 'Sonny\'s invite' : ACTS[e.act].name}</span></div>`
      + `<div class="info-name"><span class="name">${e.name}</span></div>`
      + `<canvas width="480" height="300"></canvas>`
      + `<dl><dt>Track</dt><dd>${t.name}, ${e.laps} laps</dd><dt>Conditions</dt><dd>${WEATHER[e.weather].name}, ${TIMES[e.time].name}</dd>`
      + `<dt>Rivals</dt><dd><span class="cls cls-${classFor(level)} mini">${classFor(level)}</span> ${level}${e.rival ? ' and Max' : ''}</dd>`
      + `<dt>Your car</dt><dd><span class="cls cls-${rating.cls} mini">${rating.cls}</span> ${rating.pi} ${car.model}</dd>`
      + `<dt>A win pays</dt><dd>${cr(pay.cr)}, ${pay.xp} XP</dd></dl>`
      + (short ? '<p class="warn">Your car is well below this field. The shop can help.</p>' : '')
      + (e.beat ? '<p class="warn">You have to finish ahead of Max.</p>' : '')
      + (e.invite ? `<p class="warn">${cr(e.entry)} to enter. One try. Podium or nothing. ${DIFFICULTY[diff].name}, one step up from yours.</p>`
        : `<div class="seg diff">${Object.entries(DIFFICULTY).map(([id, d]) => `<button class="btn${id === diff ? ' on' : ''}" data-diff="${id}" title="${d.info}">${d.name}</button>`).join('')}</div>`
        + `<p class="muted small">${DIFFICULTY[diff].info}</p>`);
    this.screens.drawMap(el.querySelector('canvas'), t, 4);
    for (const b of el.querySelectorAll('[data-diff]')) b.addEventListener('click', () => { c.difficulty = b.dataset.diff; this.game.saveNow(); this.fillInfo(); });
  }

  go() {
    const e = this.event;
    if (!e) return;
    const start = () => this.screens.raceLoad({ track: e.track, weather: e.weather, time: e.time, laps: e.laps, car: this.screens.pick.car, difficulty: e.difficulty ?? this.career.difficulty, rivals: 7, event: e, pi: fieldLevel(e, this.game.currentRatingOf(this.screens.pick.car).pi) });
    if (e.invite) {
      const c = this.career;
      if (c.cr < e.entry) { this.game.audio.ui('nope'); this.screens.window('Not enough CR', `Sonny wants ${cr(e.entry)} to get you in. You have ${cr(c.cr)}.`, [['OK']]); return; }
      this.screens.window('One try', `${cr(e.entry)} to enter, no refunds. Quit and it's gone. Podium or nothing.`, [
        ['Pay and race', () => { enterInvite(c, e); this.game.saveNow(); this.screens.wallet(); this.game.audio.ui('cash'); this.pick = null; start(); }, true], ['Not yet'],
      ]);
      return;
    }
    if (e.before && !this.career.seen.includes(e.before)) this.screens.story(e.before, start);
    else start();
  }
}
