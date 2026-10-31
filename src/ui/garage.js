// The Garage screen: where you look at your cars and make them yours. A rail
// of tabs down the left (Paint, Decals, Wheels, Stance, Bonnet, My Cars); each
// opens a small pop-up with its choices, and closing it gives the car the whole
// screen. Drag round the car to look at it, scroll or pinch to zoom. Its
// ratings sit bottom right. Everything here is looks: nothing changes how a
// car drives.

import { getCar, carTitle } from '../vehicles/cars.js';
import { PALETTE, FINISHES, DECALS, DECAL_COLOURS, RIMS, RIM_COLOURS, CALIPER_COLOURS, RIDE } from '../vehicles/looks.js';
import { buildSpec } from '../vehicles/tuning.js';
import { carLook } from '../save/save.js';
import { drawRim } from '../vehicles/wheels.js';
import { fillStats } from './stats-view.js';

const $ = (sel) => document.querySelector(sel);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TABS = [['paint', 'Paint'], ['decals', 'Decals'], ['wheels', 'Wheels'], ['stance', 'Stance'], ['bonnet', 'Bonnet'], ['mine', 'My Cars']];

export class Garage {
  constructor(game, screens) {
    this.game = game;
    this.screens = screens;
    this.tab = null; // the open pop-up, or none
    const tabs = $('#garage-tabs');
    tabs.innerHTML = TABS.map(([id, name]) => `<button class="tab" data-gtab="${id}">${name}</button>`).join('');
    for (const b of tabs.querySelectorAll('.tab')) b.addEventListener('click', () => (this.tab === b.dataset.gtab ? this.close() : this.show(b.dataset.gtab)));
    $('#garage-close').addEventListener('click', () => this.close());
    const step = (d) => {
      const owned = game.save.garage.owned;
      const i = owned.indexOf(screens.pick.car);
      screens.pickCar(owned[(i + d + owned.length) % owned.length]);
      this.fill();
    };
    $('#garage-prev').addEventListener('click', () => step(-1));
    $('#garage-next').addEventListener('click', () => step(1));
    this.orbitControls($('#scr-garage'));
    window.addEventListener('resize', () => this.measure());
  }

  get car() { return getCar(this.screens.pick.car); }
  get look() { return carLook(this.game.save, this.car); }

  open() { this.close(); }

  show(tab) {
    this.tab = tab;
    this.game.garageTab = tab; // the camera moves to suit the tab
    this.game.orbitReset();
    for (const b of document.querySelectorAll('#garage-tabs .tab')) b.classList.toggle('on', b.dataset.gtab === tab);
    const pop = $('#garage-pop');
    pop.hidden = false;
    pop.classList.remove('pop'); void pop.offsetWidth; pop.classList.add('pop');
    $('#garage-pop-title').textContent = TABS.find(([id]) => id === tab)[1];
    this.fill(true);
    this.measure();
  }

  // Close the pop-up: the car gets the screen and the camera stands back.
  close() {
    this.tab = null;
    this.game.garageTab = null;
    this.game.orbitReset();
    for (const b of document.querySelectorAll('#garage-tabs .tab')) b.classList.remove('on');
    $('#garage-pop').hidden = true;
    this.fill();
    this.measure();
  }

  // How much of the screen's left side the rail and pop-up cover, so the
  // camera can keep the car in the space that is left.
  measure() {
    requestAnimationFrame(() => {
      const pop = $('#garage-pop'), rail = $('#garage-tabs');
      const el = pop.hidden ? rail : pop;
      this.game.garageInset = el.offsetParent ? el.getBoundingClientRect().right / window.innerWidth : 0;
    });
  }

  // Drag on the scene to look round the car; scroll or pinch to zoom.
  orbitControls(screen) {
    const fingers = new Map();
    let spread = 0;
    const gap = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    screen.addEventListener('pointerdown', (e) => {
      if (e.target !== screen) return; // only on the scene, not the panels
      try { screen.setPointerCapture(e.pointerId); } catch { /* gone */ }
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) spread = gap();
    });
    screen.addEventListener('pointermove', (e) => {
      const f = fingers.get(e.pointerId);
      if (!f) return;
      if (fingers.size === 1) this.game.orbitDrag((e.clientX - f.x) / window.innerHeight, (e.clientY - f.y) / window.innerHeight);
      f.x = e.clientX; f.y = e.clientY;
      if (fingers.size === 2) { const g = gap(); if (spread > 0) this.game.orbitZoom(spread / g); spread = g; }
    });
    const lift = (e) => { fingers.delete(e.pointerId); spread = 0; };
    screen.addEventListener('pointerup', lift);
    screen.addEventListener('pointercancel', lift);
    screen.addEventListener('wheel', (e) => {
      if (e.target !== screen) return;
      e.preventDefault();
      this.game.orbitZoom(Math.exp(Math.max(-1, Math.min(1, e.deltaY / 300)) * 0.35));
    }, { passive: false });
  }

  // The look changed: show it, save it, refresh the screen.
  changed() {
    this.game.buildChanged();
    this.fill();
  }

  // `fresh`: a new tab, so its items slide in; otherwise (a choice was made)
  // the list just updates in place.
  fill(fresh = false) {
    const car = this.car;
    $('#garage-car-year').textContent = `${car.year} · ${car.code}`;
    $('#garage-car-name').textContent = `${car.make} ${car.model}`;
    const list = $('#garage-list');
    if (this.tab) {
      const keep = list.scrollTop;
      list.classList.toggle('calm', !fresh);
      list.innerHTML = '';
      this[this.tab](list);
      list.scrollTop = fresh ? 0 : keep;
      [...list.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 12)));
    }
    this.fillInfo();
  }

  // --- the ratings panel ---
  fillInfo() {
    fillStats($('#garage-stats'), buildSpec(this.car), this.game.save.settings.units);
  }

  // --- list helpers ---
  heading(list, text, note = '') {
    const h = document.createElement('h3');
    h.className = 'grp';
    h.innerHTML = `${esc(text)}${note ? `<span class="muted">${esc(note)}</span>` : ''}`;
    list.appendChild(h);
  }

  item(list, { name, sub = '', on = false, disabled = false, extra = '', onClick }) {
    const b = document.createElement('button');
    b.className = 'btn item opt' + (on ? ' on' : '');
    b.disabled = disabled;
    b.innerHTML = `${extra}<span class="txt"><span class="name">${esc(name)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>`;
    b.addEventListener('click', onClick);
    list.appendChild(b);
    return b;
  }

  swatches(list, colours, current, onPick) {
    const box = document.createElement('div');
    box.className = 'swatches';
    for (const [c, name] of colours) {
      const s = document.createElement('button');
      s.className = 'swatch' + (c === current ? ' on' : '') + (c === null ? ' stock' : '');
      if (c !== null) s.style.background = hex(c);
      s.title = name;
      s.setAttribute('aria-label', name);
      s.addEventListener('click', () => onPick(c));
      box.appendChild(s);
    }
    list.appendChild(box);
  }

  // --- tabs ---
  paint(list) {
    const l = this.look, car = this.car;
    this.heading(list, 'Finish');
    const seg = document.createElement('div');
    seg.className = 'seg';
    for (const [id, f] of Object.entries(FINISHES)) {
      const s = document.createElement('button');
      s.className = 'btn' + (l.finish === id ? ' on' : '');
      s.textContent = f.name;
      s.addEventListener('click', () => { l.finish = id; this.changed(); });
      seg.appendChild(s);
    }
    list.appendChild(seg);
    const named = [...car.paints.map((c, i) => [c, car.paintNames[i]]), ...PALETTE.filter(([c]) => !car.paints.includes(c))];
    this.heading(list, 'Colour', named.find(([c]) => c === l.paint)?.[1] || '');
    this.swatches(list, named, l.paint, (c) => { l.paint = c; this.changed(); });
  }

  decals(list) {
    const l = this.look;
    this.heading(list, 'Design');
    for (const [id, d] of Object.entries(DECALS)) {
      this.item(list, { name: d.name, sub: d.info || 'Clean paint', on: l.decal === id, onClick: () => { l.decal = id; this.changed(); } });
    }
    this.heading(list, 'Colour', DECAL_COLOURS.find(([c]) => c === l.decalColour)?.[1] || '');
    this.swatches(list, DECAL_COLOURS, l.decalColour, (c) => { l.decalColour = c; this.changed(); });
  }

  wheels(list) {
    const l = this.look;
    this.heading(list, 'Rims');
    const rimItem = (id, name) => {
      const it = this.item(list, {
        name, on: l.rim === id, extra: '<canvas class="rim" width="64" height="64"></canvas>',
        onClick: () => { l.rim = id; this.changed(); },
      });
      const cv = it.querySelector('canvas'), g = cv.getContext('2d');
      if (id) drawRim(cv, id, l.rimColour !== null ? hex(l.rimColour) : '#b8bcc0');
      else { g.fillStyle = '#0a0b0c'; g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.fill(); g.fillStyle = '#7fa7ab'; g.font = '14px "Jersey 10", monospace'; g.textAlign = 'center'; g.fillText('STOCK', 32, 37); }
    };
    rimItem(null, 'Stock wheels');
    for (const [id, r] of Object.entries(RIMS)) rimItem(id, r.name);
    this.heading(list, 'Rim colour', RIM_COLOURS.find(([c]) => c === l.rimColour)?.[1] || '');
    this.swatches(list, RIM_COLOURS, l.rimColour, (c) => { l.rimColour = c; this.changed(); });
    this.heading(list, 'Callipers', CALIPER_COLOURS.find(([c]) => c === l.caliper)?.[1] || '');
    this.swatches(list, CALIPER_COLOURS, l.caliper, (c) => { l.caliper = c; this.changed(); });
  }

  stance(list) {
    const l = this.look;
    this.heading(list, 'Ride height', 'looks only');
    for (const [id, r] of Object.entries(RIDE)) {
      this.item(list, {
        name: r.name, sub: r.info || 'Factory height', on: l.ride === id,
        onClick: () => {
          const from = RIDE[l.ride].drop;
          l.ride = id;
          this.changed();
          this.game.rideBounce(r.drop - from); // the body settles onto its new height
        },
      });
    }
  }

  // The bonnet stands open while this tab is up: nothing to fit, just a look.
  bonnet(list) {
    const c = this.car;
    this.heading(list, carTitle(c));
    const p = document.createElement('p');
    p.className = 'muted small note';
    p.textContent = c.blurb;
    list.appendChild(p);
  }

  mine(list) {
    const owned = this.game.save.garage.owned;
    this.heading(list, 'My Cars', `${owned.length} owned`);
    for (const id of owned) {
      const c = getCar(id);
      this.item(list, {
        name: `${c.make} ${c.model}`, sub: `${c.year} · ${c.code}`, on: id === this.car.id,
        extra: `<img class="thumb" src="assets/cars/cards/${id}.png" alt="">`,
        onClick: () => { this.screens.pickCar(id); this.fill(); },
      });
    }
    this.item(list, { name: 'Get another car', sub: 'To the shop', onClick: () => this.screens.open('shop') });
  }
}
