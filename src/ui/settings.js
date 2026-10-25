// Settings, in four tabs: Gameplay, Graphics, Audio, Controls. Each row reads
// and writes game.save.settings, then game.settingsChanged() saves and
// applies everything. Control hints live only here, in the Controls tab.

import { EFFECTS } from '../core/config.js';
import { DEFAULT_KEYS, KEY_LABELS, keyName } from '../input/keyboard.js';

const onOff = [[true, 'On'], [false, 'Off']];

export class Settings {
  constructor(game, body, tabs) {
    this.game = game;
    this.body = body;
    this.tabs = tabs;
    this.tab = 'gameplay';
    for (const b of tabs.querySelectorAll('.tab')) b.addEventListener('click', () => this.show(b.dataset.tab));
  }

  get s() { return this.game.save.settings; }
  open() { this.show(this.tab); }

  show(tab) {
    this.tab = tab;
    for (const b of this.tabs.querySelectorAll('.tab')) b.classList.toggle('on', b.dataset.tab === tab);
    this.body.innerHTML = '';
    this[tab]();
    [...this.body.children].forEach((c, i) => c.style.setProperty('--i', i));
    this.body.classList.remove('in'); void this.body.offsetWidth; this.body.classList.add('in');
    this.body.scrollTop = 0;
  }

  changed() { this.game.settingsChanged(); }

  // --- tabs ---
  gameplay() {
    const s = this.s;
    this.seg('Playing on', [['computer', 'Computer'], ['touch', 'iPad / Mobile']], () => this.game.save.platform, (v) => this.game.setPlatform(v),
      'Sets the controls and screen layout.');
    this.seg('Gearbox', [['auto', 'Automatic'], ['manual', 'Manual']], () => s.transmission, (v) => { s.transmission = v; },
      'Manual changes gear with the gear keys or the + and - buttons. Never needed to be quick.');
    this.seg('Steering assist', onOff, () => s.assists.steering, (v) => { s.assists.steering = v; }, 'Countersteers a little for you when the tail slides.');
    this.seg('Stability assist', onOff, () => s.assists.stability, (v) => { s.assists.stability = v; }, 'Stops the car spinning round.');
    this.seg('Drift assist', onOff, () => s.assists.drift, (v) => { s.assists.drift = v; }, 'Holds speed and angle once a drift starts.');
    this.seg('Speed in', [['kmh', 'km/h'], ['mph', 'mph']], () => s.units, (v) => { s.units = v; });
    this.seg('Camera', [['chase', 'Chase'], ['cockpit', 'Cockpit']], () => s.camera, (v) => { s.camera = v; });
    this.seg('Chase camera', [[0.8, 'Near'], [1, 'Normal'], [1.25, 'Far']], () => s.chaseDistance, (v) => { s.chaseDistance = v; });
    this.seg('Camera shake', onOff, () => s.shake, (v) => { s.shake = v; }, 'A little shake at speed and on bumps.');
  }

  graphics() {
    const s = this.s;
    this.seg('Resolution', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], () => this.game.graphicsName, (v) => { s.graphics = v; },
      'Low is the intended chunky look and the fastest.');
    this.slider('Field of view', 50, 80, 1, () => s.fov, (v) => { s.fov = v; }, (v) => `${v}°`);
    this.heading('Effects');
    for (const [key, e] of Object.entries(EFFECTS)) {
      this.seg(e.label, onOff, () => s.effects[key], (v) => { s.effects[key] = v; }, e.hint);
    }
  }

  audio() {
    const a = this.s.audio;
    const pct = (v) => `${Math.round(v * 100)}`;
    this.slider('Master volume', 0, 1, 0.01, () => a.master, (v) => { a.master = v; }, pct);
    this.slider('Engine', 0, 1, 0.01, () => a.engine, (v) => { a.engine = v; }, pct);
    this.slider('Effects', 0, 1, 0.01, () => a.effects, (v) => { a.effects = v; }, pct, 'Tyres, wind, hits, exhaust pops.');
    this.slider('Ambience', 0, 1, 0.01, () => a.ambience, (v) => { a.ambience = v; }, pct, 'Rain and the hum of the night.');
  }

  controls() {
    const s = this.s;
    this.heading('Keyboard');
    for (const action of Object.keys(KEY_LABELS)) this.keyRow(action);
    this.fixedRow('Pause', 'Esc');
    this.fixedRow('Debug panel', 'F3');
    this.fixedRow('Feel panel (tune the handling)', 'F4');
    this.button('Keys', 'Reset to default', () => { s.keys = structuredClone(DEFAULT_KEYS); this.changed(); this.show('controls'); });

    this.heading('Touch screen');
    const t = s.touch;
    this.slider('Control size', 0.7, 1.4, 0.05, () => t.size, (v) => { t.size = v; }, (v) => `${Math.round(v * 100)}%`);
    this.slider('Opacity', 0.3, 1, 0.05, () => t.opacity, (v) => { t.opacity = v; }, (v) => `${Math.round(v * 100)}%`);
    this.slider('Steering sensitivity', 0.5, 1.6, 0.05, () => t.sensitivity, (v) => { t.sensitivity = v; }, (v) => `${Math.round(v * 100)}%`);
    this.slider('Dead zone', 0, 0.3, 0.01, () => t.deadZone, (v) => { t.deadZone = v; }, (v) => `${Math.round(v * 100)}%`,
      'How far the stick moves before the wheels turn.');
    this.seg('Steering response', [['smooth', 'Smooth'], ['linear', 'Linear']], () => t.response, (v) => { t.response = v; },
      'Smooth is gentle near the centre for small corrections.');
    this.seg('Joystick', [['floating', 'Floating'], ['fixed', 'Fixed']], () => t.stick, (v) => { t.stick = v; },
      'Floating centres wherever your thumb lands on the left side.');
    const row = this.row('Layout', 'Drag each control to where your thumbs want it.');
    const box = document.createElement('div'); box.className = 'seg';
    const edit = btn('Edit layout', () => this.game.editTouchLayout());
    const reset = btn('Reset', () => { this.game.touch.resetLayout(); });
    box.append(edit, reset);
    row.appendChild(box);
  }

  // --- row builders ---
  heading(text) {
    const h = document.createElement('h3');
    h.textContent = text;
    this.body.appendChild(h);
  }

  row(label, hint) {
    const r = document.createElement('div');
    r.className = 'row';
    const l = document.createElement('span');
    l.textContent = label;
    r.appendChild(l);
    this.body.appendChild(r);
    if (hint) {
      // Hints go under the control, so add them after it is placed.
      queueMicrotask(() => { const h = document.createElement('span'); h.className = 'hint'; h.textContent = hint; r.appendChild(h); });
    }
    return r;
  }

  seg(label, options, get, set, hint) {
    const r = this.row(label, hint);
    const box = document.createElement('div');
    box.className = 'seg';
    const sync = () => { for (const b of box.children) b.classList.toggle('on', b._v === get()); };
    for (const [v, text] of options) {
      const b = btn(text, () => { set(v); this.changed(); sync(); });
      b._v = v;
      box.appendChild(b);
    }
    sync();
    r.appendChild(box);
  }

  slider(label, min, max, step, get, set, fmt, hint) {
    const r = this.row(label, hint);
    const box = document.createElement('div');
    box.className = 'slider';
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min, max, step, value: get() });
    const out = document.createElement('output');
    out.textContent = fmt(get());
    input.addEventListener('input', () => { set(Number(input.value)); out.textContent = fmt(Number(input.value)); this.changed(); });
    box.append(input, out);
    r.appendChild(box);
  }

  button(label, text, onClick) {
    const r = this.row(label);
    const box = document.createElement('div'); box.className = 'seg';
    box.appendChild(btn(text, onClick));
    r.appendChild(box);
  }

  keyRow(action) {
    const keys = this.s.keys;
    const r = this.row(KEY_LABELS[action]);
    const box = document.createElement('div');
    box.className = 'keys';
    for (let slot = 0; slot < 2; slot++) {
      const k = document.createElement('button');
      k.className = 'key';
      k.textContent = keyName(keys[action][slot]);
      k.addEventListener('click', () => {
        k.classList.add('listening');
        k.textContent = 'Press a key';
        this.game.keyboard.listen((code) => {
          if (code !== 'Escape') {
            if (code === 'Backspace' || code === 'Delete') code = '';
            // A key can only do one thing: take it off anything else.
            for (const a of Object.keys(keys)) keys[a] = keys[a].map((c) => (c === code ? '' : c));
            keys[action][slot] = code;
            this.changed();
          }
          this.show('controls');
        });
      });
      box.appendChild(k);
    }
    r.appendChild(box);
  }

  fixedRow(label, key) {
    const r = this.row(label);
    const box = document.createElement('div');
    box.className = 'keys';
    const k = document.createElement('span');
    k.className = 'key fixed';
    k.textContent = key;
    box.appendChild(k);
    r.appendChild(box);
  }
}

function btn(text, onClick) {
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}
