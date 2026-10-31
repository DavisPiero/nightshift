// Keyboard source. Keys are on/off, so steering is eased in and out to feel
// like a thumbstick instead of snapping to full lock. Keys can be rebound in
// Settings > Controls; Escape always pauses, F3 opens the debug panel and F4 the Feel panel.

export const DEFAULT_KEYS = {
  throttle: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  handbrake: ['Space', ''],
  gearUp: ['KeyE', ''],
  gearDown: ['KeyQ', ''],
  camera: ['KeyC', ''],
  reset: ['KeyR', ''],
  pause: ['KeyP', ''],
};

// Shown in Settings, in this order.
export const KEY_LABELS = {
  throttle: 'Accelerate', brake: 'Brake / reverse', left: 'Steer left', right: 'Steer right',
  handbrake: 'Handbrake', gearUp: 'Gear up (manual)', gearDown: 'Gear down (manual)',
  camera: 'Change camera', reset: 'Back on track', pause: 'Pause',
};

const FIXED = { Escape: 'pause', F3: 'debug', F4: 'feel' };
const ACTIONS = ['camera', 'reset', 'pause', 'debug', 'feel'];

// "KeyW" -> "W", "ArrowUp" -> "Up", "Space" -> "Space".
export function keyName(code) {
  if (!code) return '-';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5);
  return code.replace('Left', ' L').replace('Right', ' R');
}

export class KeyboardSource {
  constructor(keys = DEFAULT_KEYS) {
    this.enabled = true;
    this.down = new Set();
    this.pressed = new Set(); // gear presses waiting to be read
    this.steer = 0;
    this.onAction = null;
    this.capture = null;      // set while Settings is waiting for a new key
    this.setKeys(keys);

    window.addEventListener('keydown', (e) => {
      if (this.capture) { e.preventDefault(); e.nsCaptured = true; const cb = this.capture; this.capture = null; cb(e.code); return; }
      if (e.target?.tagName === 'INPUT' && e.target.type === 'text') return; // typing a build name
      const name = FIXED[e.code] || this.byCode.get(e.code);
      if (!name) return;
      e.preventDefault();
      if (e.repeat) return;
      this.down.add(name);
      if (name === 'gearUp' || name === 'gearDown') this.pressed.add(name);
      if (ACTIONS.includes(name)) this.onAction?.(name);
    });
    window.addEventListener('keyup', (e) => {
      const name = FIXED[e.code] || this.byCode.get(e.code);
      if (name) this.down.delete(name);
    });
  }

  setKeys(keys) {
    this.keys = keys;
    this.byCode = new Map();
    for (const [name, codes] of Object.entries(keys)) for (const c of codes) if (c) this.byCode.set(c, name);
    this.down.clear();
  }

  // Wait for the next key press and hand its code to cb (Settings rebinding).
  listen(cb) { this.capture = cb; }

  read(dt) {
    const d = this.down;
    const target = (d.has('right') ? 1 : 0) - (d.has('left') ? 1 : 0);
    // Ease toward the target; return to centre faster than turning in.
    const rate = target === 0 || Math.sign(target) !== Math.sign(this.steer) ? 6 : 3.2;
    const diff = target - this.steer;
    this.steer += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
    const out = {
      steer: this.steer,
      throttle: d.has('throttle') ? 1 : 0,
      brake: d.has('brake') ? 1 : 0,
      handbrake: d.has('handbrake'),
      gearUp: this.pressed.has('gearUp'),
      gearDown: this.pressed.has('gearDown'),
    };
    this.pressed.clear();
    return out;
  }

  releaseAll() {
    this.down.clear();
    this.pressed.clear();
    this.steer = 0;
  }
}
