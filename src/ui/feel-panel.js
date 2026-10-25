// The Feel panel (F4): sliders for how the car drives and how the camera
// moves, applied live while you drive and saved on this device per car.
// "Copy values" puts them on the clipboard so they can be made permanent in
// src/vehicles/cars.js.

import { FEEL } from '../vehicles/tuning.js';
import { CAMERA_FEEL } from '../cameras/cameras.js';

const CAMERA_DEFAULTS = { ...CAMERA_FEEL };

export class FeelPanel {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.id = 'feel';
    this.el.className = 'pnl';
    this.el.hidden = true;
    document.body.appendChild(this.el);
    // Keys typed into the panel must not drive the car or pause the game.
    this.el.addEventListener('keydown', (e) => e.stopPropagation());
  }

  get open() { return !this.el.hidden; }

  toggle() {
    this.el.hidden = !this.el.hidden;
    if (this.open) this.render();
  }

  // Saved values for the current car (and the shared camera ones).
  store() {
    const all = this.game.save.settings.feel;
    const id = this.game.carSpec.id;
    all[id] = all[id] || {};
    all.camera = all.camera || {};
    return { car: all[id], camera: all.camera };
  }

  render() {
    const g = this.game;
    const { car, camera } = this.store();
    const spec = g.vehicle.spec;
    this.el.innerHTML = `<h3>Feel <span class="muted">${g.carSpec.model}</span></h3><p class="muted small">Drag while you drive. Saved on this device.</p>`;
    const list = document.createElement('div');
    list.className = 'feel-list';
    for (const f of FEEL) {
      const now = f.camera ? (camera[f.key] ?? CAMERA_FEEL[f.key]) : (car[f.key] ?? spec[f.key] ?? f.def);
      const row = document.createElement('label');
      row.className = 'feel-row';
      const changed = f.camera ? camera[f.key] !== undefined : car[f.key] !== undefined;
      row.innerHTML = `<span class="${changed ? 'on' : ''}">${f.label}</span><input type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${now}"><output>${fmt(now)}</output>`;
      const input = row.querySelector('input'), out = row.querySelector('output');
      input.addEventListener('input', () => {
        const v = Number(input.value);
        (f.camera ? camera : car)[f.key] = v;
        out.textContent = fmt(v);
        row.firstChild.className = 'on';
        g.applyFeel();
      });
      list.appendChild(row);
    }
    this.el.appendChild(list);
    const bar = document.createElement('div');
    bar.className = 'seg';
    const btn = (text, fn) => { const b = document.createElement('button'); b.className = 'btn small'; b.textContent = text; b.addEventListener('click', fn); bar.appendChild(b); return b; };
    const copy = btn('Copy values', async () => {
      const text = JSON.stringify({ car: g.carSpec.id, ...this.store() }, null, 1);
      try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; } catch { copy.textContent = 'Copy failed'; console.log(text); }
      setTimeout(() => { copy.textContent = 'Copy values'; }, 1500);
    });
    btn('Reset', () => {
      const all = g.save.settings.feel;
      delete all[g.carSpec.id];
      all.camera = {};
      g.applyFeel();
      this.render();
    });
    btn('Close', () => this.toggle());
    this.el.appendChild(bar);
  }

  // Camera values: defaults with any saved ones on top.
  static cameraFeel(save) {
    return { ...CAMERA_DEFAULTS, ...(save.settings.feel?.camera || {}) };
  }
}

const fmt = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''));
