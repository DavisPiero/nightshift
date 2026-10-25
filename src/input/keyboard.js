// Keyboard source. Keys are on/off, so steering is eased in and out to feel
// like a thumbstick instead of snapping to full lock.

export const DEFAULT_KEYS = {
  throttle: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  handbrake: ['Space'],
  gearUp: ['KeyE'],
  gearDown: ['KeyQ'],
  camera: ['KeyC'],
  reset: ['KeyR'],
  pause: ['Escape', 'KeyP'],
  debug: ['F3'],
};

const ACTIONS = ['camera', 'reset', 'pause', 'debug'];

export class KeyboardSource {
  constructor(keys = DEFAULT_KEYS) {
    this.keys = keys;
    this.enabled = true;
    this.down = new Set();
    this.pressed = new Set(); // gear presses waiting to be read
    this.steer = 0;
    this.onAction = null;
    this.byCode = new Map();
    for (const [name, codes] of Object.entries(keys)) for (const c of codes) this.byCode.set(c, name);

    window.addEventListener('keydown', (e) => {
      const name = this.byCode.get(e.code);
      if (!name) return;
      e.preventDefault();
      if (e.repeat) return;
      this.down.add(name);
      if (name === 'gearUp' || name === 'gearDown') this.pressed.add(name);
      if (ACTIONS.includes(name)) this.onAction?.(name);
    });
    window.addEventListener('keyup', (e) => {
      const name = this.byCode.get(e.code);
      if (name) this.down.delete(name);
    });
  }

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
