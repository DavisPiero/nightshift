// Game controller source, through the browser's Gamepad API (Xbox,
// PlayStation and most others in the "standard" layout). Polled every
// physics step; it only reports what it sees, like every other source.
//
// Driving: left stick steers, right trigger accelerates, left trigger brakes
// and reverses, A / Cross is the handbrake, B / Circle shifts up and
// X / Square down (manual), Y / Triangle changes camera, Start pauses.
// Menus: d-pad or stick moves between buttons, A presses, B goes back.

const DEAD = 0.12;
const BTN = { a: 0, b: 1, x: 2, y: 3, lt: 6, rt: 7, start: 9, up: 12, down: 13, left: 14, right: 15 };

export class GamepadSource {
  constructor() {
    this.enabled = true;
    this.onAction = null;
    this.prev = new Set();
    this.steer = 0;
    this.connected = false;
    this.lastNav = 0;
    window.addEventListener('gamepadconnected', () => { this.connected = true; });
    window.addEventListener('gamepaddisconnected', () => { this.connected = !!this.pad(); this.releaseAll(); });
    // Menus get polled on animation frames, since physics may be paused.
    const menuLoop = () => { this.menus(); requestAnimationFrame(menuLoop); };
    requestAnimationFrame(menuLoop);
  }

  pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  read(dt) {
    const p = this.pad();
    const idle = { steer: 0, throttle: 0, brake: 0, handbrake: false, gearUp: false, gearDown: false };
    if (!p) return idle;
    const down = (i) => !!p.buttons[i]?.pressed;
    const value = (i) => p.buttons[i]?.value ?? 0;
    const pressed = (i) => down(i) && !this.prev.has(i);
    let x = p.axes[0] || 0;
    // Dead zone, then a gentle curve so small corrections stay small.
    x = Math.abs(x) < DEAD ? 0 : Math.sign(x) * ((Math.abs(x) - DEAD) / (1 - DEAD)) ** 1.5;
    this.steer += (x - this.steer) * Math.min(1, 20 * dt);
    const out = {
      steer: this.steer,
      throttle: value(BTN.rt),
      brake: value(BTN.lt),
      handbrake: down(BTN.a),
      gearUp: pressed(BTN.b),
      gearDown: pressed(BTN.x),
    };
    if (pressed(BTN.y)) this.onAction?.('camera');
    if (pressed(BTN.start)) this.onAction?.('pause');
    this.remember(p);
    return out;
  }

  remember(p) {
    this.prev.clear();
    p.buttons.forEach((b, i) => { if (b.pressed) this.prev.add(i); });
  }

  // Menu navigation: move focus between visible buttons, press, go back.
  menus() {
    const game = window.nightshift;
    const p = this.pad();
    if (!p || !game || game.state === 'driving') return;
    const now = performance.now();
    const down = (i) => !!p.buttons[i]?.pressed;
    const fresh = (i) => down(i) && !this.prev.has(i);
    const top = game.screens.top;
    if (top) {
      const root = document.querySelector(`#scr-${top}`);
      const list = [...root.querySelectorAll('button, input')].filter((b) => b.offsetParent && !b.disabled);
      const y = p.axes[1] || 0, xa = p.axes[0] || 0;
      const dir = down(BTN.down) || down(BTN.right) || y > 0.6 || xa > 0.6 ? 1 : down(BTN.up) || down(BTN.left) || y < -0.6 || xa < -0.6 ? -1 : 0;
      if (dir && now - this.lastNav > 180 && list.length) {
        this.lastNav = now;
        const i = list.indexOf(document.activeElement);
        list[(i + dir + list.length) % list.length].focus();
      }
      if (fresh(BTN.a) && document.activeElement?.click) document.activeElement.click();
      if (fresh(BTN.b)) {
        if (top === 'pause') game.resume();
        else game.screens.back();
      }
      if (fresh(BTN.start) && top === 'pause') game.resume();
    }
    this.remember(p);
  }

  releaseAll() { this.steer = 0; this.prev.clear(); }
}
