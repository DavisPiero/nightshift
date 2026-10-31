// Menu screens: first-visit platform choice, home (Career, Race, Shop, Garage,
// the gear for Settings), track pick, car pick, race settings, results, pause.
// Plain DOM. Screens stack, so Back (or Escape) always returns to where you
// came from, e.g. Settings opened from the pause menu goes back to it.

import { getCar } from '../vehicles/cars.js';
import { TRACKS, trackWeathers } from '../world/tracks.js';
import { WEATHER } from '../physics/weather.js';
import { TIMES, trackTimes } from '../world/time-of-day.js';
import { Settings } from './settings.js';
import { fillStats } from './stats-view.js';
import { Garage } from './garage.js';
import { Shop } from './shop.js';
import { CareerScreen } from './career-screen.js';
import { Cutscene } from './cutscene.js';
import { carCard } from './car-cards.js';
import { TIPS } from './tips.js';
import { clock } from './hud.js';
import { DIFFICULTY } from '../race/difficulty.js';
import { levelInfo, eventPay, racePay, bank, cleared, cr, CLEARS, EVENTS } from '../career/career.js';
import { carStats } from '../vehicles/stats.js';

const $ = (sel) => document.querySelector(sel);

export class Screens {
  constructor(game) {
    this.game = game;
    this.stack = [];
    this.settings = new Settings(game, $('#settings-body'), $('#scr-settings .tabs'));

    for (const b of document.querySelectorAll('[data-platform]')) {
      b.addEventListener('click', () => game.choosePlatform(b.dataset.platform));
    }
    for (const b of document.querySelectorAll('[data-go]')) b.addEventListener('click', () => this.open(b.dataset.go));
    for (const b of document.querySelectorAll('[data-back]')) b.addEventListener('click', () => this.back());

    $('#pause-resume').addEventListener('click', () => game.resume());
    $('#pause-track').addEventListener('click', () => { game.backOnTrack(); game.resume(); });
    $('#pause-restart').addEventListener('click', () => game.restart());
    $('#pause-settings').addEventListener('click', () => this.open('settings'));
    $('#pause-main').addEventListener('click', () => game.toMain());
    $('#pause-button').addEventListener('click', () => game.pauseGame());
    $('#race-go').addEventListener('click', () => this.raceLoad());
    $('#tracks-go').addEventListener('click', () => this.open('setup'));
    $('#setup-go').addEventListener('click', () => { if (this.afterCar === 'back') this.back(); else this.open('race'); });
    $('#res-go').addEventListener('click', () => this.resultsDone());
    $('#res-again').addEventListener('click', () => { this.closeAll(); game.restart(); });

    this.garage = new Garage(game, this);
    this.shop = new Shop(game, this);
    this.career = new CareerScreen(game, this);
    this.cutscene = new Cutscene(game);
    this.menuSounds();
    // The race loading screen has the same boot text as the start-up screen.
    window.BootLog?.mount($('#race-load .rl-wheel'));

    // Keyboard: Escape goes back; arrows move between buttons.
    window.addEventListener('keydown', (e) => {
      const top = this.top;
      if (!top || game.state === 'driving' || e.nsCaptured) return;
      if (e.code === 'Escape' && top !== 'pause' && top !== 'platform' && top !== 'main' && top !== 'results') {
        e.preventDefault();
        if (top === 'garage' && this.garage.tab) this.garage.close(); // a pop-up closes first
        else this.back();
        game.controls.actions.delete('pause'); // this Escape only meant Back
        return;
      }
      if (e.code === 'ArrowDown' || e.code === 'ArrowUp' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        const list = [...this.el(top).querySelectorAll('button:not([hidden]), input')].filter((b) => b.offsetParent);
        if (!list.length) return;
        if (document.activeElement?.type === 'range' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) return;
        e.preventDefault();
        const i = list.indexOf(document.activeElement);
        const d = e.code === 'ArrowDown' || e.code === 'ArrowRight' ? 1 : -1;
        list[(i + d + list.length) % list.length].focus();
      }
    });

    const last = game.save.lastRace;
    this.pick = { track: game.trackInfo.id, weather: last.weather, time: game.timeId, car: game.carSpec.id, laps: last.laps, rivals: last.rivals, difficulty: last.difficulty };
    this.buildTracks();
    this.buildConditions();
  }

  // A small window with buttons: [label, action, main?].
  window(title, text, buttons) {
    const root = $('#dialog');
    root.innerHTML = `<section class="nw nw-mid"><header><span>${title}</span></header><div class="nb"><p>${text}</p></div><footer></footer></section>`;
    const foot = root.querySelector('footer');
    const close = () => { root.hidden = true; window.removeEventListener('keydown', key, true); };
    const key = (e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); e.nsCaptured = true; close(); if (e.key === 'Enter') buttons[0][1]?.(); } };
    for (const [label, act, main] of buttons) {
      const b = document.createElement('button');
      b.className = `nok${main ? ' pri' : ''}`;
      b.textContent = label;
      b.addEventListener('click', () => { close(); act?.(); });
      foot.appendChild(b);
    }
    root.hidden = false;
    window.addEventListener('keydown', key, true);
  }

  story(id, done) { this.cutscene.play(id, done); }

  // Money and level, top right on the menus.
  wallet() {
    const c = this.game.save.career, i = levelInfo(c.xp);
    $('#w-level').textContent = i.level;
    $('#w-xp').style.width = `${Math.round(i.share * 100)}%`;
    $('#w-cr').textContent = cr(c.cr);
    const next = this.career.next(), done = EVENTS.every((e) => cleared(c, e));
    $('#tile-career').textContent = done ? 'To be continued' : c.seen.includes('intro') ? `Next: ${next.name}` : 'Start your story';
  }

  // Every button makes a sound that says what kind of thing it did (see
  // audio/ui-sounds.js); moving between buttons ticks.
  menuSounds() {
    const audio = this.game.audio;
    const kindOf = (b) => {
      if (b.dataset.sound) return b.dataset.sound;
      if (b.matches('[data-back], .back')) return 'back';
      if (b.id === 'race-go' || b.id === 'career-go') return 'race';
      if (b.matches('#tracks-go, #setup-go, #career-go, #res-go, .tile, [data-platform]')) return 'confirm';
      if (b.id === 'garage-close') return 'close';
      if (b.matches('.grail .tab')) return b.classList.contains('on') ? 'close' : 'tab';
      if (b.matches('.swatch')) return 'paint';
      if (b.matches('.tabs .tab, .seg .btn, .key, .row .btn')) return 'toggle';
      return 'select';
    };
    document.addEventListener('click', (e) => {
      const b = e.target.closest('button, .swatch');
      if (b && !b.closest('#touch') && this.game.state !== 'driving') audio.ui(kindOf(b));
    }, true);
    let last = 0;
    const tick = (e) => {
      const b = e.target.closest?.('button, .swatch');
      if (!b || b.disabled || this.game.state === 'driving' || performance.now() - last < 45) return;
      last = performance.now();
      audio.ui('move');
    };
    document.addEventListener('focusin', (e) => { if (!e.target.matches(':focus-visible')) return; tick(e); });
    document.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse' && e.target.closest('button, .swatch') && !e.target.closest('button, .swatch').contains(e.relatedTarget)) tick(e); });
  }

  el(name) { return $(`#scr-${name}`); }
  get top() { return this.stack[this.stack.length - 1]; }

  // Show a screen on top of the stack.
  open(name) {
    if (this.top) this.hideEl(this.top);
    this.stack.push(name);
    this.showEl(name);
  }

  // Replace the whole stack (e.g. back to the main menu).
  reset(name) {
    for (const n of this.stack) this.hideEl(n, true);
    this.stack = name ? [name] : [];
    if (name) this.showEl(name);
  }

  back() {
    if (this.stack.length <= 1) return;
    this.hideEl(this.stack.pop());
    this.showEl(this.top);
  }

  closeAll() { this.reset(null); $('#wallet').hidden = true; }

  // A car that is not yours cannot stay picked (it can on a test address).
  showOwnedCar() {
    const g = this.game.save.garage;
    if (!new URLSearchParams(location.search).has('car') && !g.owned.includes(this.pick.car)) this.pickCar(g.owned[0]);
  }

  unlocked(id) { return this.game.save.career.tracks.includes(id); }

  showEl(name) {
    const el = this.el(name);
    if (name === 'tracks') { this.afterCar = null; if (!this.unlocked(this.pick.track) && !new URLSearchParams(location.search).has('track')) this.pick.track = 'starter'; this.game.loadTrack(this.pick.track); this.buildTracks(); this.fillTracks(); }
    if (name === 'setup') { this.buildCars(); this.fillSetup(); }
    if (name === 'race') this.fillRace(true);
    if (name === 'garage') this.garage.open();
    else this.game.garageTab = null;
    if (name === 'shop') this.shop.open();
    if (name === 'career') this.career.open();
    if (name === 'main') this.showOwnedCar();
    this.wallet();
    $('#wallet').hidden = !['main', 'career', 'shop', 'garage', 'tracks', 'setup', 'race'].includes(name);
    if (name === 'settings') this.settings.open();
    if (name === 'pause') el.style.zIndex = 8;
    el.hidden = false;
    el.classList.remove('out', 'in');
    void el.offsetWidth; // restart the entrance animation
    el.classList.add('in');
    // Number the items so they arrive one after another.
    el.querySelectorAll('.stack, .list, .choices').forEach((list) => [...list.children].forEach((c, i) => c.style.setProperty('--i', i)));
    this.game.onScreen(name);
    const first = el.querySelector('.list .on') || el.querySelector('.btn.pri, .btn');
    if (first && matchMedia('(hover: hover)').matches) first.focus({ preventScroll: true });
  }

  hideEl(name, now = false) {
    const el = this.el(name);
    if (now) { el.hidden = true; el.classList.remove('in', 'out'); return; }
    el.classList.remove('in');
    el.classList.add('out');
    setTimeout(() => { if (el.classList.contains('out')) { el.hidden = true; el.classList.remove('out'); } }, 150);
  }

  // A car was picked (in the list or the garage): show it and remember it.
  pickCar(id) {
    this.pick.car = id;
    this.game.save.garage.selected = id;
    this.game.saveNow();
    this.game.showCar(id);
  }

  // Loading into a race: a still of the track, the wheel bottom left, a tip.
  // The race is set up behind it, and it stays at least long enough to read.
  raceLoad(given) {
    const pick = given || { ...this.pick };
    const t = TRACKS.find((x) => x.id === pick.track) || TRACKS[0];
    const career = this.game.save.career;
    if (!career.tracks.includes(t.id)) career.tracks.push(t.id); // playing a track unlocks it for Race
    const el = $('#race-load');
    el.querySelector('.rl-still').style.backgroundImage = `url(assets/loading/${t.id}.jpg)`;
    el.querySelector('.rl-k').textContent = pick.event ? t.name : 'Next race';
    el.querySelector('.rl-name').textContent = pick.event?.name || t.name;
    el.querySelector('.rl-sub').textContent = `${pick.rivals ? `${pick.laps} laps · ${DIFFICULTY[pick.difficulty].name} · ` : ''}${(t.path.length / 1000).toFixed(2)} km · ${TIMES[pick.time].clock} ${TIMES[pick.time].name} · ${WEATHER[pick.weather].name}`;
    this.tip = ((this.tip ?? Math.floor(Math.random() * TIPS.length)) + 1) % TIPS.length;
    el.querySelector('.rl-tt').textContent = TIPS[this.tip];
    el.classList.remove('done');
    el.hidden = false;
    window.BootLog?.wake();
    const shown = performance.now();
    // Two frames so the screen is up before the heavy work starts.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.game.startRace(pick, true);
      const wait = Math.max(0, 5500 - (performance.now() - shown));
      setTimeout(() => {
        this.game.go();
        el.classList.add('done');
        setTimeout(() => { el.hidden = true; }, 420);
      }, wait);
    }));
  }

  // --- after a race: the order, the pay, what opened up ---
  results(race, setup) {
    const game = this.game, career = game.save.career, r = race.player, e = setup.event;
    const beatMax = !e?.beat || r.place < race.cars.find((c) => c.rival).place;
    let pay, clearedNow = false;
    if (e) {
      const first = !cleared(career, e);
      clearedNow = first && r.place <= CLEARS && beatMax;
      pay = eventPay(e, r.place, setup.difficulty, first && beatMax);
      if (clearedNow || (cleared(career, e) && r.place < career.done[e.id])) career.done[e.id] = r.place;
      if (clearedNow) this.career.pick = null; // on to the next race
    } else pay = racePay(setup.laps, setup.pi, r.place, setup.difficulty, setup.rivals);
    const got = bank(career, pay);
    game.saveNow();
    this.after = clearedNow && e.after && !career.seen.includes(e.after) ? e.after : null;
    this.resultsEvent = e;

    $('#res-title').textContent = e ? e.name : 'Results';
    const list = $('#res-list');
    list.innerHTML = race.results().map((c) => `<div class="res-row${c.player ? ' me' : ''}"><span class="p">${c.place}</span><span class="n">${c.name}</span><span class="c">${c.car || ''}</span><span class="t">${clock(c.time)}</span><span class="b">${Number.isFinite(c.best) ? clock(c.best) : '-'}</span></div>`).join('');
    const i = levelInfo(career.xp);
    const note = !e ? '' : clearedNow ? '<p class="res-ok">Race cleared</p>' : e.beat && !beatMax && r.place <= CLEARS ? '<p class="res-no">You have to beat Max</p>' : r.place > CLEARS && !cleared(career, e) ? `<p class="res-no">Top ${CLEARS} to clear it</p>` : '';
    $('#res-pay').innerHTML = `<p class="res-place">P${r.place}<small>of ${race.cars.length}</small></p>${note}`
      + `<dl><dt>Money</dt><dd>+ ${cr(got.cr)}</dd><dt>XP</dt><dd>+ ${got.xp}</dd></dl>`
      + `<div class="res-level"><span>Level ${i.level}</span><span class="w-bar"><i style="width:${Math.round(i.share * 100)}%"></i></span></div>`
      + (got.levelAfter > got.levelBefore ? `<p class="res-ok">Level up!</p>` : '');
    this.reset('results');
    $('#wallet').hidden = true;
    game.audio.ui('cash');
  }

  resultsDone() {
    const scene = this.after, e = this.resultsEvent;
    const leave = () => this.game.toMain(e ? 'career' : 'tracks');
    if (scene) this.story(scene, leave); else leave();
  }

  // --- Drive: tracks. A list of long rectangles; picking one loads it so
  // it flies past behind the menu, with its details on the right. ---
  buildTracks() {
    const list = $('#track-list');
    list.innerHTML = '';
    TRACKS.forEach((t, n) => {
      const b = document.createElement('button');
      b.className = 'btn item';
      b.dataset.track = t.id;
      b.disabled = !this.unlocked(t.id);
      b.innerHTML = `<span class="num">${String(n + 1).padStart(2, '0')}</span><canvas width="72" height="40"></canvas>`
        + `<span class="txt"><span class="name">${t.name}</span><span class="sub">${b.disabled ? 'Play it in the career to unlock it' : `${(t.path.length / 1000).toFixed(2)} KM · ${t.corners} corners`}</span></span>`;
      drawMap(b.querySelector('canvas'), t, 3);
      const choose = () => { if (this.pick.track !== t.id) { this.pick.track = t.id; this.game.loadTrack(t.id); this.fillTracks(); } };
      b.addEventListener('click', choose);
      b.addEventListener('focus', choose);
      b.addEventListener('dblclick', () => this.open('setup'));
      list.appendChild(b);
    });
  }

  fillTracks() {
    const t = TRACKS.find((x) => x.id === this.pick.track) || TRACKS[0];
    for (const b of document.querySelectorAll('#track-list .item')) b.classList.toggle('on', b.dataset.track === t.id);
    const ws = trackWeathers(t).map((id) => WEATHER[id].name).join(' · ');
    const el = $('#track-info');
    el.innerHTML = `<div class="ttl"><span>Track data</span></div>`
      + `<canvas width="240" height="150"></canvas>`
      + `<div class="info-name"><span class="name">${t.name}</span><span class="jp">${t.jp || ''}</span></div>`
      + `<p class="muted small">${t.blurb}</p>`
      + `<dl><dt>Length</dt><dd>${(t.path.length / 1000).toFixed(2)} km</dd><dt>Corners</dt><dd>${t.corners}</dd>`
      + `<dt>Lanes</dt><dd>${t.def.halfWidth > 6.4 ? 4 : t.def.halfWidth > 6.2 ? 3 : 2}</dd><dt>Weather</dt><dd>${ws}</dd>`
      + `<dt>Time</dt><dd>${trackTimes(t).map((id) => TIMES[id].name).join(' · ')}</dd></dl>`;
    drawMap(el.querySelector('canvas'), t, 4);
  }

  // --- pick a car: the cards you own ---
  buildCars() {
    const list = $('#car-list'), owned = this.game.save.garage.owned;
    list.innerHTML = '';
    for (const id of owned) {
      const c = getCar(id);
      const b = carCard(c, { owned: true, on: id === this.pick.car });
      b.addEventListener('click', () => { if (this.pick.car !== id) { this.pickCar(id); this.buildCars(); this.fillSetup(); } });
      list.appendChild(b);
    }
  }

  // Race settings: weather and time as tiles. Picking one shows it on the
  // track behind the menu at once.
  buildConditions() {
    const list = $('#weather-list');
    list.innerHTML = '';
    for (const [id, w] of Object.entries(WEATHER)) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.dataset.weather = id;
      b.innerHTML = `<canvas class="ico" width="16" height="16"></canvas><span>${w.name}</span>`;
      drawWeatherIcon(b.querySelector('canvas'), id);
      b.addEventListener('click', () => { this.pick.weather = id; this.fillRace(); this.game.previewWeather(id); });
      list.appendChild(b);
    }
    const times = $('#time-list');
    times.innerHTML = '';
    for (const [id, t] of Object.entries(TIMES)) {
      const b = document.createElement('button');
      b.className = 'btn time';
      b.dataset.time = id;
      b.innerHTML = `<span class="v">${t.clock}</span><span>${t.name}</span>`;
      b.addEventListener('click', () => { this.pick.time = id; this.fillRace(); this.game.previewTime(id); });
      times.appendChild(b);
    }
    const choice = (where, key, opts) => {
      const box = $(where);
      box.innerHTML = '';
      for (const [v, label, info] of opts) {
        const b = document.createElement('button');
        b.className = 'btn';
        b.dataset.v = v;
        b.title = info || '';
        b.textContent = label;
        b.addEventListener('click', () => { this.pick[key] = v; this.fillRace(); });
        box.appendChild(b);
      }
    };
    choice('#laps-list', 'laps', [1, 3, 5, 10].map((n) => [n, String(n)]));
    choice('#rivals-list', 'rivals', [[0, 'None', 'Just you and the road'], [3, '3'], [7, '7']]);
    choice('#diff-list', 'difficulty', Object.entries(DIFFICULTY).map(([id, d]) => [id, d.name, d.info]));
  }

  fillSetup() {
    const car = getCar(this.pick.car);
    $('#setup-car-year').textContent = `${car.year} · ${car.code}`;
    $('#setup-car-name').textContent = `${car.make} ${car.model}`;
    fillStats($('#setup-stats'), this.game.specFor(car.id), this.game.save.settings.units);
  }

  // `entering`: the screen just opened, so show the chosen weather and time
  // on the track behind it.
  fillRace(entering = false) {
    const t = TRACKS.find((x) => x.id === this.pick.track) || TRACKS[0];
    const allowed = trackWeathers(t), times = trackTimes(t);
    if (!allowed.includes(this.pick.weather)) this.pick.weather = 'clear';
    if (!times.includes(this.pick.time)) this.pick.time = times.includes('night') ? 'night' : times[0];
    for (const b of document.querySelectorAll('#weather-list .btn')) {
      b.hidden = !allowed.includes(b.dataset.weather);
      b.classList.toggle('on', b.dataset.weather === this.pick.weather);
    }
    for (const b of document.querySelectorAll('#time-list .btn')) {
      b.hidden = !times.includes(b.dataset.time);
      b.classList.toggle('on', b.dataset.time === this.pick.time);
    }
    for (const [where, key] of [['#laps-list', 'laps'], ['#rivals-list', 'rivals'], ['#diff-list', 'difficulty']]) {
      for (const b of document.querySelectorAll(`${where} .btn`)) b.classList.toggle('on', b.dataset.v === String(this.pick[key]));
    }
    $('#weather-note').textContent = WEATHER[this.pick.weather].note;
    if (entering) { this.game.previewTime(this.pick.time); this.game.previewWeather(this.pick.weather); }
    const car = getCar(this.pick.car), r = carStats(this.game.specFor(car.id));
    const rivals = this.pick.rivals ? `${this.pick.rivals} on ${DIFFICULTY[this.pick.difficulty].name}, ${this.pick.laps} lap${this.pick.laps > 1 ? 's' : ''}` : 'Free drive';
    const el = $('#race-info');
    el.innerHTML = `<div class="ttl"><span>Race</span></div>`
      + `<canvas width="240" height="150"></canvas>`
      + `<div class="info-name"><span class="name">${t.name}</span></div>`
      + `<dl><dt>Car</dt><dd>${car.make} ${car.model}</dd><dt>Class</dt><dd><span class="cls cls-${r.cls} mini">${r.cls}</span> ${r.pi}</dd>`
      + `<dt>Rivals</dt><dd>${rivals}</dd><dt>Weather</dt><dd>${WEATHER[this.pick.weather].name}</dd><dt>Time</dt><dd>${TIMES[this.pick.time].clock} · ${TIMES[this.pick.time].name}</dd></dl>`;
    drawMap(el.querySelector('canvas'), t, 4);
  }

  drawMap(canvas, t, line) { drawMap(canvas, t, line); }
}

// Track outline for the card, drawn small and scaled up with square pixels.
function drawMap(canvas, t, line = 4) {
  const g = canvas.getContext('2d');
  const p = t.path;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < p.count; i++) { x0 = Math.min(x0, p.x[i]); x1 = Math.max(x1, p.x[i]); z0 = Math.min(z0, p.z[i]); z1 = Math.max(z1, p.z[i]); }
  const W = canvas.width, H = canvas.height, pad = 8;
  const k = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (z1 - z0));
  const ox = (W - (x1 - x0) * k) / 2, oz = (H - (z1 - z0) * k) / 2;
  const at = (i) => [Math.round(ox + (x1 - p.x[i]) * k), Math.round(oz + (z1 - p.z[i]) * k)];
  g.clearRect(0, 0, W, H);
  g.strokeStyle = '#11535a'; g.lineWidth = line + 2; g.lineJoin = 'miter';
  g.beginPath();
  for (let i = 0; i <= p.count; i += 4) { const [x, y] = at(i % p.count); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
  g.closePath(); g.stroke();
  g.strokeStyle = '#3ff0e8'; g.lineWidth = Math.max(1, line - 2); g.stroke();
  const [sx, sy] = at(t.def.start);
  g.fillStyle = '#ff2e88'; g.fillRect(sx - 3, sy - 3, 6, 6);
}

function drawWeatherIcon(canvas, id) {
  const g = canvas.getContext('2d');
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const C = '#3ff0e8', O = '#ff2e88', W = '#c9d8dc';
  if (id === 'clear') {
    // A crescent moon and two stars.
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const a = (x - 8) ** 2 + (y - 8) ** 2 < 30, b = (x - 11) ** 2 + (y - 6) ** 2 < 24;
      if (a && !b) px(x, y, O);
    }
    px(13, 12, W); px(2, 3, W); px(3, 2, W);
  } else if (id === 'rain') {
    for (let x = 3; x < 13; x++) for (let y = 3; y < 7; y++) if ((x - 8) ** 2 / 25 + (y - 5) ** 2 / 4 < 1) px(x, y, W);
    for (const [x, y] of [[4, 9], [8, 10], [12, 9], [6, 13], [10, 13]]) { px(x, y, C); px(x - 1, y + 1, C); }
  } else if (id === 'snow') {
    // Two pixel snowflakes.
    for (const [cx, cy, c] of [[5, 5, W], [11, 11, O]]) {
      for (let d = -2; d <= 2; d++) { px(cx + d, cy, c); px(cx, cy + d, c); }
      for (const [dx, dy] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) px(cx + dx, cy + dy, c);
    }
    px(12, 3, W); px(3, 12, C);
  } else {
    for (const [y, a, b] of [[4, 2, 13], [7, 4, 15], [10, 1, 11], [13, 5, 14]]) for (let x = a; x < b; x++) px(x, y, x % 5 === 0 ? C : W);
  }
}
