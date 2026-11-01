// The laptop you pull up on the left in the Shop and the Garage. The screen's
// real HTML (buttons, lists, sliders) stays as it is and is laid over the model's
// display by DeviceStage.pin, so it tilts and wobbles with the laptop. A button
// puts the laptop down, to leave the car the whole screen.

import { buildLaptop } from '../world/props-devices.js';

const $ = (sel) => document.querySelector(sel);
const LEAN = 0.09; // radians the laptop leans over to the left, so more of the scene shows
const PANELS = { shop: ['#shop-desk', 800, 500], garage: ['#garage-desk', 800, 500] };

export class Desk {
  constructor(game, stage) {
    this.game = game;
    this.stage = stage;
    this.model = null;
    this.at = null;      // the screen the laptop belongs to, or none
    this.up = false;
    this.onToggle = {};  // screen name -> called with true (up) or false (down)
    for (const b of document.querySelectorAll('[data-desk]')) b.addEventListener('click', () => this.toggle());
  }

  // Which screen is showing: lift the laptop for it, or put it away.
  sync(name) {
    if (name === this.at) return;
    if (this.at) this.lower();
    this.at = PANELS[name] ? name : null;
    if (this.at) this.lift();
  }

  // Keeps the same model at any shape of window: the display takes about half
  // the width, and the keyboard runs off the bottom of the screen.
  pose(a) {
    const scale = Math.min(1.14, a * 0.78), half = 1.65 * scale, H = 2.0;
    return { x: -a * H + half + 0.2, y: H - 0.44 - 2.1 * scale, z: 0, rx: 0.1, ry: 0.1, rz: LEAN, scale };
  }

  lift() {
    const [sel, w, h] = PANELS[this.at];
    this.model ??= buildLaptop();
    this.up = true;
    $(sel).hidden = false;
    this.stage.show(this.model, (a) => this.pose(a), { behind: true });
    this.stage.pin($(sel), w, h);
    this.label();
    this.onToggle[this.at]?.(true);
  }

  lower() {
    if (!this.up) return;
    this.up = false;
    $(PANELS[this.at][0]).hidden = true;
    this.stage.pin(null);
    this.stage.hide();
    this.label();
    this.onToggle[this.at]?.(false);
  }

  toggle() {
    if (!this.at) return;
    this.game.audio.ui(this.up ? 'back' : 'select');
    if (this.up) this.lower(); else this.lift();
  }

  label() { for (const b of document.querySelectorAll('[data-desk]')) b.textContent = this.up ? 'Put laptop down' : 'Pull up laptop'; }

  // How much of the window, from the left, the laptop covers: the camera keeps
  // the car in the rest.
  get inset() { return this.up ? this.stage.pinRight : 0; }
}
