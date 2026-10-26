// Touch source (iPad / phone). Left: an analogue joystick for steering.
// Right: throttle, brake / reverse and handbrake, all holdable at once.
// Top: camera and pause. Gear buttons appear only with the manual gearbox.
//
// Every finger is tracked by its pointer id and captured by the control it
// first touched, so sliding off a button keeps it held until the finger
// lifts, and a cancelled touch (a system gesture, rotation, focus loss)
// always lets go. Positions are saved as fractions of the screen, so the
// layout survives rotation and different screen sizes; the layout editor
// lets the player drag each control where they want it.

export const DEFAULT_TOUCH = {
  size: 1,               // scale for every control
  opacity: 0.8,
  sensitivity: 1,        // steering gain
  deadZone: 0.08,        // share of the stick radius that does nothing
  response: 'smooth',    // 'smooth' (gentle near the centre) or 'linear'
  stick: 'floating',     // 'floating' (centres where you touch) or 'fixed'
  layout: {
    stick: { x: 0.15, y: 0.7 },
    throttle: { x: 0.9, y: 0.66 },
    brake: { x: 0.76, y: 0.76 },
    handbrake: { x: 0.77, y: 0.5 },
    gearUp: { x: 0.91, y: 0.36 },
    gearDown: { x: 0.81, y: 0.3 },
    camera: { x: 0.15, y: 0.09 },  // top left: the minimap has the top right
    pause: { x: 0.04, y: 0.09 },
  },
};

// Pedals and the handbrake lever, drawn as pictures (SVG): brushed metal
// plates with rubber ridges that tip down when pressed.
const metal = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4e9ec"/><stop offset="0.45" stop-color="#9aa3a8"/><stop offset="1" stop-color="#5d666b"/></linearGradient>`;
const ridges = (x, y, w, h, n) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * (h / n) + 1}" width="${w}" height="${h / n - 3}" rx="1.5" fill="#15181a"/><rect x="${x}" y="${y + i * (h / n) + 1}" width="${w}" height="1" fill="#3a4044"/>`).join('');
const ART = {
  throttle: `<svg viewBox="0 0 62 75">${'<defs>' + metal('mg') + '</defs>'}<rect x="3" y="2" width="56" height="71" rx="7" fill="#1a1d1f"/><rect x="5" y="3" width="52" height="68" rx="6" fill="url(#mg)"/>${ridges(11, 9, 40, 56, 8)}</svg>`,
  brake: `<svg viewBox="0 0 59 52">${'<defs>' + metal('mb') + '</defs>'}<rect x="2" y="2" width="55" height="48" rx="8" fill="#1a1d1f"/><rect x="4" y="3" width="51" height="45" rx="7" fill="url(#mb)"/><rect x="9" y="8" width="41" height="35" rx="4" fill="#15181a"/>${ridges(12, 11, 35, 29, 5).replaceAll('#15181a', '#24282b')}</svg>`,
  handbrake: `<svg viewBox="0 0 52 38"><path d="M10 31 L38 9" stroke="#15181a" stroke-width="9" stroke-linecap="round"/><path d="M10 31 L38 9" stroke="#8d969b" stroke-width="5" stroke-linecap="round"/><path d="M26 18.5 L38 9" stroke="#1f2325" stroke-width="7" stroke-linecap="round"/><circle cx="40" cy="7.5" r="3" fill="#ff2e88"/><rect x="4" y="30" width="16" height="5" rx="2" fill="#2a2f32"/></svg>`,
};

// Base sizes in CSS pixels before the size setting.
const BUTTONS = {
  throttle: { label: 'GAS', w: 112, h: 136, cls: 'gas pedal' },
  brake: { label: 'BRAKE', w: 118, h: 104, cls: 'brake pedal' },
  handbrake: { label: 'HAND', w: 104, h: 76, cls: 'small lever' },
  gearUp: { label: '+', w: 70, h: 62, manual: true },
  gearDown: { label: '-', w: 70, h: 62, manual: true },
  camera: { label: 'CAM', w: 74, h: 52, cls: 'small', action: 'camera' },
  pause: { label: 'II', w: 56, h: 52, cls: 'small', action: 'pause' },
};
const STICK_R = 78;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export class TouchSource {
  constructor(root, settings) {
    this.root = root;
    this.enabled = false;
    this.onAction = null;
    this.onLayoutChange = null;
    this.settings = settings;
    this.held = new Set();
    this.pressed = new Set();
    this.fingers = new Map();      // pointerId -> control name
    this.stickId = null;
    this.stickVec = 0;             // raw -1..1
    this.steer = 0;                // eased output
    this.manual = false;
    this.editing = false;
    this.els = {};
    this.build();
    window.addEventListener('resize', () => this.place());
    // iOS pinch-zoom gestures would otherwise scale the page.
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  }

  build() {
    const r = this.root;
    r.innerHTML = '';
    this.zone = document.createElement('div');
    this.zone.className = 'zone';
    r.appendChild(this.zone);
    this.base = document.createElement('div');
    this.base.className = 'stick-base';
    this.thumb = document.createElement('div');
    this.thumb.className = 'stick-thumb';
    this.base.appendChild(this.thumb);
    r.appendChild(this.base);
    for (const [name, b] of Object.entries(BUTTONS)) {
      const el = document.createElement('div');
      el.className = `tc pad ${b.cls || ''}`;
      if (ART[name]) el.innerHTML = `${ART[name]}<span class="cap">${b.label}</span>`;
      else el.textContent = b.label;
      el.dataset.name = name;
      r.appendChild(el);
      this.els[name] = el;
      el.addEventListener('pointerdown', (e) => this.press(e, name));
    }
    this.zone.addEventListener('pointerdown', (e) => this.stickDown(e));
    this.base.addEventListener('pointerdown', (e) => { if (this.editing) this.dragStart(e, 'stick'); });
    // Move, lift and cancel are watched on the window so a captured finger
    // is never lost, whatever it slides over.
    window.addEventListener('pointermove', (e) => this.move(e));
    for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, (e) => this.lift(e));
    this.place();
  }

  // Apply size, opacity and positions. Keeps every control inside the safe
  // area and on screen.
  place() {
    const s = this.settings;
    const W = window.innerWidth, H = window.innerHeight;
    const safe = safeInsets();
    this.root.style.opacity = this.editing ? 1 : s.opacity;
    const put = (el, pos, w, h) => {
      const x = clamp(pos.x * W, safe.l + w / 2 + 8, W - safe.r - w / 2 - 8);
      const y = clamp(pos.y * H, safe.t + h / 2 + 8, H - safe.b - h / 2 - 8);
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      return [x, y];
    };
    for (const [name, b] of Object.entries(BUTTONS)) {
      const el = this.els[name];
      const w = b.w * s.size, h = b.h * s.size;
      el.style.width = `${w}px`; el.style.height = `${h}px`;
      el.style.setProperty('--s', s.size);
      el.hidden = !!b.manual && !this.manual && !this.editing;
      put(el, s.layout[name], w, h);
    }
    const R = STICK_R * s.size;
    this.base.style.width = this.base.style.height = `${R * 2}px`;
    this.thumb.style.width = this.thumb.style.height = `${R * 0.9}px`;
    this.home = put(this.base, s.layout.stick, R * 2, R * 2);
    if (this.stickId === null) this.centre = this.home;
    this.radius = R;
  }

  setSettings(settings) { this.settings = settings; this.place(); }
  setManual(on) { this.manual = on; this.place(); }
  show(on) { this.root.hidden = !on; this.enabled = on; if (!on) this.releaseAll(); else this.place(); }

  // --- driving ---
  press(e, name) {
    e.preventDefault();
    if (this.editing) { this.dragStart(e, name); return; }
    capture(e);
    this.fingers.set(e.pointerId, name);
    const b = BUTTONS[name];
    if (b.action) this.onAction?.(b.action);
    else if (name === 'gearUp' || name === 'gearDown') this.pressed.add(name);
    else this.held.add(name);
    this.els[name].classList.add('held');
    navigator.vibrate?.(6);
  }

  stickDown(e) {
    e.preventDefault();
    if (this.editing || this.stickId !== null) return;
    capture(e);
    this.stickId = e.pointerId;
    this.fingers.set(e.pointerId, 'stick');
    this.centre = this.settings.stick === 'floating' ? [e.clientX, e.clientY] : this.home;
    this.base.style.left = `${this.centre[0]}px`;
    this.base.style.top = `${this.centre[1]}px`;
    this.base.classList.add('live');
    this.stickAt(e.clientX);
  }

  stickAt(x) {
    const dx = clamp((x - this.centre[0]) / this.radius, -1, 1);
    this.stickVec = dx;
    this.thumb.style.transform = `translate(calc(-50% + ${dx * this.radius * 0.75}px), -50%)`;
  }

  move(e) {
    if (this.drag && e.pointerId === this.drag.id) { this.dragMove(e); return; }
    if (e.pointerId === this.stickId) this.stickAt(e.clientX);
  }

  lift(e) {
    if (this.drag && e.pointerId === this.drag.id) { this.dragEnd(); return; }
    const name = this.fingers.get(e.pointerId);
    if (!name) return;
    this.fingers.delete(e.pointerId);
    if (name === 'stick') this.stickRelease();
    else {
      // Another finger may still hold the same button.
      if (![...this.fingers.values()].includes(name)) { this.held.delete(name); this.els[name].classList.remove('held'); }
    }
  }

  stickRelease() {
    this.stickId = null;
    this.stickVec = 0;
    this.centre = this.home;
    this.base.style.left = `${this.home[0]}px`;
    this.base.style.top = `${this.home[1]}px`;
    this.base.classList.remove('live');
    this.thumb.style.transform = 'translate(-50%, -50%)';
  }

  read(dt) {
    const s = this.settings;
    let x = this.stickVec;
    const m = Math.abs(x);
    // Dead zone, then the response curve, then sensitivity.
    let v = m <= s.deadZone ? 0 : (m - s.deadZone) / (1 - s.deadZone);
    if (s.response === 'smooth') v = v * v * (1.6 - 0.6 * v); // gentle in the middle, full at the edge
    v = clamp(v * s.sensitivity, 0, 1) * Math.sign(x);
    // A little easing so a flick never snaps the wheels.
    this.steer += (v - this.steer) * Math.min(1, 16 * dt);
    if (Math.abs(this.steer) < 0.002) this.steer = 0;
    const out = {
      steer: this.steer,
      throttle: this.held.has('throttle') ? 1 : 0,
      brake: this.held.has('brake') ? 1 : 0,
      handbrake: this.held.has('handbrake'),
      gearUp: this.pressed.has('gearUp'),
      gearDown: this.pressed.has('gearDown'),
    };
    this.pressed.clear();
    return out;
  }

  releaseAll() {
    this.held.clear();
    this.pressed.clear();
    this.fingers.clear();
    this.steer = 0;
    for (const el of Object.values(this.els)) el.classList.remove('held');
    this.stickRelease();
  }

  // --- layout editor ---
  edit(on) {
    this.editing = on;
    this.releaseAll();
    this.root.classList.toggle('editing', on);
    this.root.hidden = !on && !this.enabled;
    this.place();
  }

  resetLayout() {
    this.settings.layout = structuredClone(DEFAULT_TOUCH.layout);
    this.place();
    this.onLayoutChange?.();
  }

  dragStart(e, name) {
    e.preventDefault();
    capture(e);
    const el = name === 'stick' ? this.base : this.els[name];
    el.classList.add('dragging');
    const rect = el.getBoundingClientRect();
    this.drag = { id: e.pointerId, name, el, ox: e.clientX - (rect.left + rect.width / 2), oy: e.clientY - (rect.top + rect.height / 2) };
  }

  dragMove(e) {
    const d = this.drag;
    const W = window.innerWidth, H = window.innerHeight;
    this.settings.layout[d.name] = { x: clamp((e.clientX - d.ox) / W, 0, 1), y: clamp((e.clientY - d.oy) / H, 0, 1) };
    this.place();
  }

  dragEnd() {
    this.drag.el.classList.remove('dragging');
    this.drag = null;
    this.onLayoutChange?.();
  }
}

function capture(e) {
  try { e.target.setPointerCapture(e.pointerId); } catch { /* already released */ }
}

// The screen's safe-area insets (notch, home bar), read from CSS.
let probe = null;
function safeInsets() {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
}
