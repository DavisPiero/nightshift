// Menu screens: first-visit platform choice, main menu (Drive, Garage,
// Settings), track pick, race setup (weather and car), garage, pause.
// Plain DOM. Screens stack, so Back (or Escape) always returns to where you
// came from, e.g. Settings opened from the pause menu goes back to it.

import { CARS, getCar, carTitle } from '../vehicles/cars.js';
import { carStats } from '../vehicles/stats.js';
import { TRACKS } from '../world/tracks.js';
import { WEATHER } from '../physics/weather.js';
import { Settings } from './settings.js';

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
    $('#pause-restart').addEventListener('click', () => game.restart());
    $('#pause-settings').addEventListener('click', () => this.open('settings'));
    $('#pause-main').addEventListener('click', () => game.toMain());
    $('#pause-button').addEventListener('click', () => game.pauseGame());
    $('#race-go').addEventListener('click', () => game.startRace(this.pick));

    // Car pickers in the race setup and the garage.
    const step = (d, where) => {
      const i = CARS.findIndex((c) => c.id === this.pick.car);
      this.pick.car = CARS[(i + d + CARS.length) % CARS.length].id;
      game.save.garage.selected = this.pick.car;
      game.saveNow();
      if (where === 'garage') this.fillGarage(); else this.fillSetup();
      game.showCar(this.pick.car);
    };
    $('#car-prev').addEventListener('click', () => step(-1, 'setup'));
    $('#car-next').addEventListener('click', () => step(1, 'setup'));
    $('#garage-prev').addEventListener('click', () => step(-1, 'garage'));
    $('#garage-next').addEventListener('click', () => step(1, 'garage'));

    // Keyboard: Escape goes back; arrows move between buttons.
    window.addEventListener('keydown', (e) => {
      const top = this.top;
      if (!top || game.state === 'driving' || e.nsCaptured) return;
      if (e.code === 'Escape' && top !== 'pause' && top !== 'platform' && top !== 'main') {
        e.preventDefault();
        this.back();
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

    this.pick = { track: game.save.lastRace.track, weather: game.save.lastRace.weather, car: game.save.garage.selected };
    this.buildTracks();
    this.buildWeather();
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

  closeAll() { this.reset(null); }

  showEl(name) {
    const el = this.el(name);
    if (name === 'setup') this.fillSetup();
    if (name === 'garage') this.fillGarage();
    if (name === 'settings') this.settings.open();
    if (name === 'pause') el.style.zIndex = 8;
    el.hidden = false;
    el.classList.remove('out', 'in');
    void el.offsetWidth; // restart the entrance animation
    el.classList.add('in');
    // Number the items so they arrive one after another.
    el.querySelectorAll('.stack, .cards, .choices').forEach((list) => [...list.children].forEach((c, i) => c.style.setProperty('--i', i)));
    this.game.onScreen(name);
    const first = el.querySelector('.btn.pri, .btn');
    if (first && matchMedia('(hover: hover)').matches) first.focus({ preventScroll: true });
  }

  hideEl(name, now = false) {
    const el = this.el(name);
    if (now) { el.hidden = true; el.classList.remove('in', 'out'); return; }
    el.classList.remove('in');
    el.classList.add('out');
    setTimeout(() => { if (el.classList.contains('out')) { el.hidden = true; el.classList.remove('out'); } }, 150);
  }

  // --- Drive: tracks ---
  buildTracks() {
    const list = $('#track-list');
    list.innerHTML = '';
    for (const t of TRACKS) {
      const b = document.createElement('button');
      b.className = 'btn pnl card';
      b.innerHTML = `<canvas width="150" height="85"></canvas><span class="name">${t.name}</span><span class="sub">${t.blurb}</span><span class="meta"><span>${(t.path.length / 1000).toFixed(2)} KM</span><span>${t.corners} CORNERS</span></span>`;
      drawMap(b.querySelector('canvas'), t);
      b.addEventListener('click', () => { this.pick.track = t.id; this.open('setup'); });
      list.appendChild(b);
    }
  }

  // --- Drive: weather and car ---
  buildWeather() {
    const list = $('#weather-list');
    list.innerHTML = '';
    for (const [id, w] of Object.entries(WEATHER)) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.dataset.weather = id;
      b.innerHTML = `<canvas class="ico" width="16" height="16"></canvas><span>${w.name}</span>`;
      drawWeatherIcon(b.querySelector('canvas'), id);
      b.addEventListener('click', () => { this.pick.weather = id; this.fillSetup(); this.game.previewWeather(id); });
      list.appendChild(b);
    }
  }

  fillSetup() {
    const t = TRACKS.find((x) => x.id === this.pick.track) || TRACKS[0];
    $('#setup-title').textContent = t.name;
    for (const b of document.querySelectorAll('#weather-list .btn')) b.classList.toggle('on', b.dataset.weather === this.pick.weather);
    $('#weather-note').textContent = WEATHER[this.pick.weather].note;
    const car = getCar(this.pick.car);
    $('#setup-car-year').textContent = `${car.year} · ${car.code}`;
    $('#setup-car-name').textContent = `${car.make} ${car.model}`;
    fillStats($('#setup-stats'), car, this.game.save.settings.units);
    const one = CARS.length < 2;
    $('#car-prev').disabled = one; $('#car-next').disabled = one;
  }

  // --- Garage ---
  fillGarage() {
    const car = getCar(this.pick.car);
    $('#garage-car-year').textContent = `${car.year} · ${car.code}`;
    $('#garage-car-name').textContent = `${car.make} ${car.model}`;
    $('#garage-blurb').textContent = car.blurb;
    fillStats($('#garage-stats'), car, this.game.save.settings.units);
    const box = $('#garage-paints');
    box.innerHTML = '';
    const saved = this.game.save.garage.cars[car.id] || (this.game.save.garage.cars[car.id] = { paint: null, upgrades: {} });
    const current = saved.paint ?? car.paint;
    car.paints.forEach((p, i) => {
      const b = document.createElement('button');
      b.className = 'swatch' + (p === current ? ' on' : '');
      b.style.background = '#' + p.toString(16).padStart(6, '0');
      b.title = car.paintNames[i];
      b.addEventListener('click', () => {
        saved.paint = p;
        this.game.saveNow();
        this.game.setPaint(p);
        this.fillGarage();
      });
      box.appendChild(b);
    });
    $('#garage-paint-name').textContent = car.paintNames[car.paints.indexOf(current)] || '';
    $('#garage-prev').disabled = CARS.length < 2; $('#garage-next').disabled = CARS.length < 2;
  }
}

const DRIVES = { rwd: 'Rear-wheel drive', awd: 'Four-wheel drive', fwd: 'Front-wheel drive' };

// A row of stats with a pixel meter each.
function fillStats(el, car, units) {
  const s = carStats(car);
  const mph = units === 'mph';
  const rows = [
    ['Power', `${s.hp} HP`, s.hp / 500],
    ['Weight', `${car.mass} KG`, car.mass / 2000],
    [mph ? '0-60' : '0-100', `${(mph ? s.to60 : s.to100).toFixed(1)} S`, 1 - (s.to100 - 3) / 6],
    ['Top', mph ? `${Math.round(s.top / 1.609)} MPH` : `${Math.round(s.top)} KM/H`, (s.top - 150) / 200],
    ['Grip', s.grip.toFixed(2), (s.grip - 0.7) / 0.6],
    ['Drive', car.drivetrain.toUpperCase(), null],
  ];
  el.innerHTML = rows.map(([k, v, f]) => {
    if (f === null) return `<div class="stat"><span class="k">${k}</span><span class="muted">${DRIVES[car.drivetrain] || ''}</span><span class="v">${v}</span></div>`;
    const n = Math.round(Math.max(0.05, Math.min(1, f)) * 12);
    const pips = Array.from({ length: 12 }, (_, i) => `<i class="${i < n ? (i >= 10 ? 'on hot' : 'on') : ''}" style="--p:${i}"></i>`).join('');
    return `<div class="stat"><span class="k">${k}</span><span class="meter">${pips}</span><span class="v">${v}</span></div>`;
  }).join('');
}

// Track outline for the card, drawn small and scaled up with square pixels.
function drawMap(canvas, t) {
  const g = canvas.getContext('2d');
  const p = t.path;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < p.count; i++) { x0 = Math.min(x0, p.x[i]); x1 = Math.max(x1, p.x[i]); z0 = Math.min(z0, p.z[i]); z1 = Math.max(z1, p.z[i]); }
  const W = canvas.width, H = canvas.height, pad = 8;
  const k = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (z1 - z0));
  const ox = (W - (x1 - x0) * k) / 2, oz = (H - (z1 - z0) * k) / 2;
  const at = (i) => [Math.round(ox + (x1 - p.x[i]) * k), Math.round(oz + (z1 - p.z[i]) * k)];
  g.fillStyle = '#050a0d'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#1a7f8e'; g.lineWidth = 4; g.lineJoin = 'miter';
  g.beginPath();
  for (let i = 0; i <= p.count; i += 4) { const [x, y] = at(i % p.count); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
  g.closePath(); g.stroke();
  g.strokeStyle = '#3fd6e6'; g.lineWidth = 2; g.stroke();
  const [sx, sy] = at(t.def.start);
  g.fillStyle = '#ff8b2b'; g.fillRect(sx - 3, sy - 3, 6, 6);
}

function drawWeatherIcon(canvas, id) {
  const g = canvas.getContext('2d');
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const C = '#3fd6e6', O = '#ff8b2b', W = '#c9d8dc';
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
  } else {
    for (const [y, a, b] of [[4, 2, 13], [7, 4, 15], [10, 1, 11], [13, 5, 14]]) for (let x = a; x < b; x++) px(x, y, x % 5 === 0 ? C : W);
  }
}
