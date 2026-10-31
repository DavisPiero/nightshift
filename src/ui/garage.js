// The Garage screen. A rail of tabs down the left (Paint, Decals, Wheels,
// Body, Engine, Chassis, Drive, Builds); each opens a small pop-up with its
// choices, and closing it gives the car the whole screen. Drag round the car
// to look at it, scroll or pinch to zoom. The build's ratings sit bottom
// right, against stock, with a dyno chart in the Engine pop-up. Every choice
// is fitted at once (parts are free until there is money in the game) to the
// build you race with; the Builds tab switches, names, copies and resets
// builds.

import { CARS, getCar } from '../vehicles/cars.js';
import { SLOTS, optionsFor } from '../vehicles/parts.js';
import { PALETTE, FINISHES, DECALS, DECAL_COLOURS, RIMS, RIM_COLOURS, CALIPER_COLOURS, RIDE } from '../vehicles/looks.js';
import { buildSpec } from '../vehicles/tuning.js';
import { garageCar, newBuild, MAX_BUILDS } from '../save/save.js';
import { drawRim } from '../vehicles/wheels.js';
import { fillStats } from './stats-view.js';

const $ = (sel) => document.querySelector(sel);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TABS = [
  ['paint', 'Paint'], ['decals', 'Decals'], ['wheels', 'Wheels'], ['body', 'Body'],
  ['engine', 'Engine'], ['chassis', 'Chassis'], ['drive', 'Drive'], ['builds', 'Builds'],
];
const SLOTS_BY_TAB = { body: ['bodykit', 'aero'], engine: ['intake', 'exhaust', 'ecu', 'induction'], chassis: ['tyres', 'brakes', 'suspension', 'weight'], drive: ['gearing', 'drivetrain'] };

export class Garage {
  constructor(game, screens) {
    this.game = game;
    this.screens = screens;
    this.tab = null; // the open pop-up, or none
    this.renaming = -1;
    this.resetArmed = -1;
    const tabs = $('#garage-tabs');
    tabs.innerHTML = TABS.map(([id, name]) => `<button class="tab" data-gtab="${id}">${name}</button>`).join('');
    for (const b of tabs.querySelectorAll('.tab')) b.addEventListener('click', () => (this.tab === b.dataset.gtab ? this.close() : this.show(b.dataset.gtab)));
    $('#garage-close').addEventListener('click', () => this.close());
    const step = (d) => {
      const i = CARS.findIndex((c) => c.id === screens.pick.car);
      screens.pickCar(CARS[(i + d + CARS.length) % CARS.length].id);
      this.renaming = -1;
      this.fill();
    };
    $('#garage-prev').addEventListener('click', () => step(-1));
    $('#garage-next').addEventListener('click', () => step(1));
    this.orbitControls($('#scr-garage'));
    window.addEventListener('resize', () => this.measure());
  }

  get car() { return getCar(this.screens.pick.car); }
  get entry() { return garageCar(this.game.save, this.car); }
  get build() { const e = this.entry; return e.builds[e.active]; }

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

  // The build changed: drive with it, show it, save it, refresh the screen.
  changed() {
    const b = this.build;
    if (b.look.ride === 'slammed' && b.parts.suspension !== 'race') b.look.ride = 'low';
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

  // --- the ratings panel (build name, ratings against stock) and the dyno ---
  fillInfo() {
    const car = this.car, b = this.build, units = this.game.save.settings.units;
    $('#garage-build-name').textContent = b.name;
    const spec = buildSpec(car, b);
    fillStats($('#garage-stats'), spec, units, car);
    const dyno = $('#garage-dyno');
    dyno.hidden = this.tab !== 'engine';
    if (!dyno.hidden) drawDyno(dyno.querySelector('canvas'), car, spec);
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
    b.innerHTML = `${extra}<span class="txt"><span class="name">${esc(name)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>${on ? '<span class="meta">FITTED</span>' : ''}`;
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

  // A slot's options as items (only the ones this car can fit).
  slot(list, id) {
    const b = this.build, car = this.car;
    const opts = optionsFor(car, id);
    if (opts.length < 2) return;
    this.heading(list, SLOTS[id].label);
    for (const o of opts) {
      this.item(list, {
        name: o.name, sub: o.info || 'As it left the factory', on: (b.parts[id] || 'stock') === o.id,
        onClick: () => {
          if (o.id === 'stock') delete b.parts[id]; else b.parts[id] = o.id;
          this.game.fitSlot = id; // an engine part drops into the open bay
          this.changed();
        },
      });
    }
  }

  // --- tabs ---
  paint(list) {
    const b = this.build, car = this.car;
    this.heading(list, 'Finish');
    const seg = document.createElement('div');
    seg.className = 'seg';
    for (const [id, f] of Object.entries(FINISHES)) {
      const s = document.createElement('button');
      s.className = 'btn' + (b.look.finish === id ? ' on' : '');
      s.textContent = f.name;
      s.addEventListener('click', () => { b.look.finish = id; this.changed(); });
      seg.appendChild(s);
    }
    list.appendChild(seg);
    const named = [...car.paints.map((c, i) => [c, car.paintNames[i]]), ...PALETTE.filter(([c]) => !car.paints.includes(c))];
    this.heading(list, 'Colour', named.find(([c]) => c === b.look.paint)?.[1] || '');
    this.swatches(list, named, b.look.paint, (c) => { b.look.paint = c; this.changed(); });
  }

  decals(list) {
    const b = this.build;
    this.heading(list, 'Design');
    for (const [id, d] of Object.entries(DECALS)) {
      this.item(list, { name: d.name, sub: d.info || 'Clean paint', on: b.look.decal === id, onClick: () => { b.look.decal = id; this.changed(); } });
    }
    this.heading(list, 'Colour', DECAL_COLOURS.find(([c]) => c === b.look.decalColour)?.[1] || '');
    this.swatches(list, DECAL_COLOURS, b.look.decalColour, (c) => { b.look.decalColour = c; this.changed(); });
  }

  wheels(list) {
    const b = this.build;
    this.heading(list, 'Rims');
    const rimItem = (id, name) => {
      const it = this.item(list, {
        name, on: b.look.rim === id, extra: '<canvas class="rim" width="64" height="64"></canvas>',
        onClick: () => { b.look.rim = id; this.changed(); },
      });
      const cv = it.querySelector('canvas'), g = cv.getContext('2d');
      if (id) drawRim(cv, id, b.look.rimColour !== null ? hex(b.look.rimColour) : '#b8bcc0');
      else { g.fillStyle = '#0a0b0c'; g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.fill(); g.fillStyle = '#7fa7ab'; g.font = '14px "Jersey 10", monospace'; g.textAlign = 'center'; g.fillText('STOCK', 32, 37); }
    };
    rimItem(null, 'Stock wheels');
    for (const [id, r] of Object.entries(RIMS)) rimItem(id, r.name);
    this.heading(list, 'Rim colour', RIM_COLOURS.find(([c]) => c === b.look.rimColour)?.[1] || '');
    this.swatches(list, RIM_COLOURS, b.look.rimColour, (c) => { b.look.rimColour = c; this.changed(); });
    this.heading(list, 'Callipers', CALIPER_COLOURS.find(([c]) => c === b.look.caliper)?.[1] || '');
    this.swatches(list, CALIPER_COLOURS, b.look.caliper, (c) => { b.look.caliper = c; this.changed(); });
  }

  body(list) {
    const b = this.build;
    this.slot(list, 'bodykit');
    this.slot(list, 'aero');
    this.heading(list, 'Ride height', 'a lower car leans less');
    for (const [id, r] of Object.entries(RIDE)) {
      const needs = id === 'slammed' && b.parts.suspension !== 'race';
      this.item(list, {
        name: r.name, sub: needs ? 'Fit coilovers first (Chassis)' : r.info || 'Factory height', on: b.look.ride === id, disabled: needs,
        onClick: () => {
          const from = RIDE[b.look.ride].drop;
          b.look.ride = id;
          this.changed();
          this.game.rideBounce(r.drop - from); // the body settles onto its new height
        },
      });
    }
  }

  engine(list) { for (const s of SLOTS_BY_TAB.engine) this.slot(list, s); }
  chassis(list) { for (const s of SLOTS_BY_TAB.chassis) this.slot(list, s); }
  drive(list) { for (const s of SLOTS_BY_TAB.drive) this.slot(list, s); }

  builds(list) {
    const e = this.entry, car = this.car;
    this.heading(list, 'Builds', `up to ${MAX_BUILDS}; the one marked RACING is the one you drive`);
    e.builds.forEach((b, i) => {
      const card = document.createElement('div');
      card.className = 'build pnl' + (i === e.active ? ' on' : '');
      const fitted = Object.keys(b.parts).length;
      if (this.renaming === i) {
        card.innerHTML = `<input type="text" maxlength="20" value="${esc(b.name)}" aria-label="Build name"><div class="seg"><button class="btn pri small" data-act="save">Save name</button></div>`;
        const input = card.querySelector('input');
        const done = () => { b.name = input.value.trim().slice(0, 20) || b.name; this.renaming = -1; this.changed(); };
        card.querySelector('[data-act=save]').addEventListener('click', done);
        input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') done(); ev.stopPropagation(); });
        setTimeout(() => { input.focus(); input.select(); }, 0);
      } else {
        const spec = buildSpec(car, b);
        card.innerHTML = `<div class="build-top"><span class="name">${esc(b.name)}</span>${i === e.active ? '<span class="racing">RACING</span>' : ''}</div>`
          + `<span class="sub">${fitted ? `${fitted} part${fitted > 1 ? 's' : ''}` : 'Stock parts'} · ${FINISHES[b.look.finish].name} · ${spec.mass} kg</span>`
          + `<div class="seg">${i === e.active ? '' : '<button class="btn small pri" data-act="use">Race this</button>'}`
          + '<button class="btn small" data-act="rename">Rename</button>'
          + (e.builds.length < MAX_BUILDS ? '<button class="btn small" data-act="copy">Copy</button>' : '')
          + `<button class="btn small" data-act="reset">${this.resetArmed === i ? 'Sure?' : 'Reset'}</button>`
          + (e.builds.length > 1 ? '<button class="btn small" data-act="delete">Delete</button>' : '') + '</div>';
        const act = (name, fn) => card.querySelector(`[data-act=${name}]`)?.addEventListener('click', fn);
        act('use', () => { e.active = i; this.changed(); });
        act('rename', () => { this.renaming = i; this.fill(); });
        act('copy', () => { e.builds.push(structuredClone({ ...b, name: `${b.name} copy`.slice(0, 20) })); this.changed(); });
        act('reset', () => {
          if (this.resetArmed !== i) { this.resetArmed = i; this.fill(); return; } // press twice: it throws the build away
          this.resetArmed = -1;
          e.builds[i] = { ...newBuild(car, b.name) };
          this.changed();
        });
        act('delete', () => { e.builds.splice(i, 1); if (e.active > i) e.active--; e.active = Math.min(e.active, e.builds.length - 1); this.changed(); });
      }
      list.appendChild(card);
    });
    if (e.builds.length < MAX_BUILDS) {
      this.item(list, { name: '+ New build', sub: 'Starts from stock', onClick: () => { e.builds.push(newBuild(car, `Build ${e.builds.length + 1}`)); e.active = e.builds.length - 1; this.changed(); } });
    }
  }
}

// The dyno: power (pink) and torque (turquoise) against revs, the build
// bright and stock faint behind it, with the peaks written underneath.
function drawDyno(canvas, stock, spec) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  const pad = { l: 6, r: 6, t: 8, b: 22 };
  g.clearRect(0, 0, W, H);
  const curves = [stock, spec].map((s) => s.torqueCurve.map(([rpm, nm]) => ({ rpm, nm: nm * (s.torqueScale ?? 1), hp: nm * (s.torqueScale ?? 1) * rpm / 7127 })));
  const maxRpm = Math.max(...curves.flat().map((p) => p.rpm));
  const maxV = Math.max(...curves.flat().map((p) => Math.max(p.nm, p.hp))) * 1.08;
  const X = (rpm) => pad.l + (rpm / maxRpm) * (W - pad.l - pad.r);
  const Y = (v) => H - pad.b - (v / maxV) * (H - pad.t - pad.b);
  g.strokeStyle = 'rgba(63,240,232,0.12)'; g.lineWidth = 1;
  for (let r = 1000; r < maxRpm; r += 1000) { g.beginPath(); g.moveTo(X(r) + 0.5, pad.t); g.lineTo(X(r) + 0.5, H - pad.b); g.stroke(); }
  const line = (pts, key, colour, width) => {
    g.strokeStyle = colour; g.lineWidth = width; g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(X(p.rpm), Y(p[key])) : g.moveTo(X(p.rpm), Y(p[key]))));
    g.stroke();
  };
  line(curves[0], 'nm', 'rgba(63,240,232,0.3)', 2); line(curves[0], 'hp', 'rgba(255,46,136,0.3)', 2);
  line(curves[1], 'nm', '#3ff0e8', 3); line(curves[1], 'hp', '#ff2e88', 3);
  const peak = (pts, k) => pts.reduce((a, p) => (p[k] > a[k] ? p : a));
  const ph = peak(curves[1], 'hp'), pt = peak(curves[1], 'nm');
  g.font = '15px "Jersey 10", monospace'; g.textBaseline = 'bottom';
  g.fillStyle = '#ff2e88'; g.textAlign = 'left'; g.fillText(`${Math.round(ph.hp)} HP @ ${ph.rpm}`, pad.l, H - 2);
  g.fillStyle = '#3ff0e8'; g.textAlign = 'right'; g.fillText(`${Math.round(pt.nm)} N·M @ ${pt.rpm}`, W - pad.r, H - 2);
}
