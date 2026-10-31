// The Career screen: the acts and their races down the left, the picked race
// on the right with its track, its pay, the difficulty and your car. The story
// scenes (cutscene.js) play round the races, once each.

import { ACTS, EVENTS, cleared, eventLock, eventPay, fieldLevel, levelFor, cr } from '../career/career.js';
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
  get event() { return EVENTS.find((e) => e.id === this.pick); }

  // The first race not yet cleared.
  next() { return EVENTS.find((e) => !cleared(this.career, e)) || EVENTS[EVENTS.length - 1]; }

  open() {
    const c = this.career;
    if (!this.pick || eventLock(c, this.event)) this.pick = this.next().id;
    this.fillList();
    this.fillInfo();
    this.game.loadTrack(this.event.track);
    if (!c.seen.includes('intro')) this.screens.story('intro');
  }

  fillList() {
    const list = $('#career-list'), c = this.career;
    list.innerHTML = '';
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
    const level = fieldLevel(e, rating.pi), diff = c.difficulty;
    const pay = eventPay(e, 1, diff, !cleared(c, e));
    const short = rating.pi < e.pi - 60;
    const el = $('#career-info');
    el.innerHTML = `<div class="ttl"><span>${ACTS[e.act].name}</span></div>`
      + `<div class="info-name"><span class="name">${e.name}</span></div>`
      + `<canvas width="240" height="150"></canvas>`
      + `<dl><dt>Track</dt><dd>${t.name}, ${e.laps} laps</dd><dt>Conditions</dt><dd>${WEATHER[e.weather].name}, ${TIMES[e.time].name}</dd>`
      + `<dt>Rivals</dt><dd><span class="cls cls-${classFor(level)} mini">${classFor(level)}</span> ${level}${e.rival ? ' and Max' : ''}</dd>`
      + `<dt>Your car</dt><dd><span class="cls cls-${rating.cls} mini">${rating.cls}</span> ${rating.pi} ${car.model}</dd>`
      + `<dt>A win pays</dt><dd>${cr(pay.cr)}, ${pay.xp} XP</dd></dl>`
      + (short ? '<p class="warn">Your car is well below this field. The shop can help.</p>' : '')
      + (e.beat ? '<p class="warn">You have to finish ahead of Max.</p>' : '')
      + `<div class="seg diff">${Object.entries(DIFFICULTY).map(([id, d]) => `<button class="btn${id === diff ? ' on' : ''}" data-diff="${id}" title="${d.info}">${d.name}</button>`).join('')}</div>`
      + `<p class="muted small">${DIFFICULTY[diff].info}</p>`;
    this.screens.drawMap(el.querySelector('canvas'), t, 4);
    for (const b of el.querySelectorAll('[data-diff]')) b.addEventListener('click', () => { c.difficulty = b.dataset.diff; this.game.saveNow(); this.fillInfo(); });
  }

  go() {
    const e = this.event;
    const start = () => this.screens.raceLoad({ track: e.track, weather: e.weather, time: e.time, laps: e.laps, car: this.screens.pick.car, difficulty: this.career.difficulty, rivals: 7, event: e, pi: fieldLevel(e, this.game.currentRatingOf(this.screens.pick.car).pi) });
    if (e.before && !this.career.seen.includes(e.before)) this.screens.story(e.before, start);
    else start();
  }
}
