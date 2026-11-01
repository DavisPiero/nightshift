// The laptop: before a career race it comes up on the right of the screen. Buy
// one-race upgrades (career/upgrades.js), then Race starts the countdown. Race
// is picked to begin with, so one press goes straight to the lights.

import { buildLaptop } from '../world/props-devices.js';
import { UPGRADES } from '../career/upgrades.js';
import { cr } from '../career/career.js';
import { keyName } from '../input/keyboard.js';

const WHITE = '#ffffff', AMBER = '#ffb000', TEAL = '#22d8c8', MUTED = '#bcc0c6', LINE = '#3b3e44', INK = '#08090b', BG = '#0d0e11', TITANIUM = '#8d9198';
const PX = '"Jersey 10", ui-monospace, monospace', DOT = 'bold 24px "DotGothic16", "Jersey 10", monospace';
const TOP = 104, ROW_H = 92, RACE_Y = 494;

export class Laptop {
  constructor(game, stage) {
    this.game = game;
    this.stage = stage;
    this.model = null;
    stage.canvas.addEventListener('pointerdown', (e) => { if (this.game.device === this) this.point(e); });
    window.addEventListener('keydown', (e) => {
      if (this.game.device !== this) return;
      if (e.code === 'Escape') this.go();
      else if (e.code === 'ArrowDown' || e.code === 'ArrowRight') this.nav(1);
      else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') this.nav(-1);
      else if (e.code === 'Enter' || e.code === 'Space') this.press();
      else return;
      e.preventDefault(); e.stopPropagation(); e.nsCaptured = true;
    }, true);
  }

  open(fitted, done) {
    this.model ??= buildLaptop();
    this.fitted = fitted;
    this.done = done;
    this.pick = UPGRADES.length; // Race
    this.game.device = this;
    this.draw();
    this.stage.show(this.model, (a) => ({ x: Math.max(1.05, a * 1.99 - 2.15), y: -0.72, z: 0, rx: 0.34, ry: -0.5, rz: 0.03, scale: 0.86 }));
  }

  nav(d) {
    const n = UPGRADES.length + 1;
    this.pick = (this.pick + d + n) % n;
    this.game.audio.ui('move');
    this.draw();
  }

  press() {
    const u = UPGRADES[this.pick];
    if (!u) { this.go(); return; }
    const c = this.game.save.career, audio = this.game.audio;
    if (this.fitted[u.id]) { // changed your mind: money back until you race
      delete this.fitted[u.id];
      c.cr += u.price;
      audio.ui('back');
    } else if (c.cr >= u.price) {
      this.fitted[u.id] = true;
      c.cr -= u.price;
      audio.ui('cash');
    } else audio.ui('back');
    this.game.saveNow();
    this.draw();
  }

  go() {
    this.game.device = null;
    this.game.audio.ui('confirm');
    const d = this.done;
    this.done = null;
    this.stage.hide();
    d?.();
  }

  point(e) {
    const p = this.stage.hit(e.clientX, e.clientY);
    if (!p) return;
    const y = p.y * 640;
    if (y >= RACE_Y) { this.pick = UPGRADES.length; this.press(); return; }
    const row = Math.floor((y - TOP) / ROW_H);
    if (row >= 0 && row < UPGRADES.length) { this.pick = row; this.press(); }
  }

  // What the NOS row calls its button: the one exception to the rule about
  // control hints (David, 2026-11-01).
  nosButton() {
    if (this.game.save.platform === 'touch') return 'the NOS button';
    const key = this.game.save.settings.keys.nos?.find(Boolean);
    return key ? keyName(key).replace(' L', '').replace(' R', '') : 'unset';
  }

  draw() {
    const { g, canvas, texture } = this.model, W = canvas.width, H = canvas.height;
    const c = this.game.save.career;
    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.fillStyle = '#1b1d21'; g.fillRect(0, 0, W, 86);
    g.fillStyle = WHITE; g.font = `60px ${PX}`; g.fillText('Race prep', 28, 62);
    g.textAlign = 'right'; g.fillStyle = AMBER; g.fillText(cr(c.cr), W - 28, 62); g.textAlign = 'left';
    UPGRADES.forEach((u, i) => {
      const y = TOP + i * ROW_H, on = this.pick === i, have = !!this.fitted[u.id], poor = !have && c.cr < u.price;
      if (have) { g.fillStyle = 'rgba(34, 216, 200, 0.16)'; g.fillRect(16, y, W - 32, ROW_H - 10); }
      g.strokeStyle = on ? WHITE : have ? TEAL : LINE; g.lineWidth = on ? 3 : 1.5;
      g.strokeRect(16, y, W - 32, ROW_H - 10);
      g.fillStyle = poor ? TITANIUM : WHITE; g.font = `48px ${PX}`; g.fillText(u.name, 36, y + 42);
      g.fillStyle = poor ? TITANIUM : MUTED; g.font = DOT;
      g.fillText(u.id === 'nos' ? `${u.info}, on ${this.nosButton()}` : u.info, 36, y + 72);
      g.textAlign = 'right';
      g.fillStyle = have ? TEAL : poor ? TITANIUM : AMBER; g.font = `46px ${PX}`;
      g.fillText(have ? 'Fitted' : cr(u.price), W - 36, y + 54);
      g.textAlign = 'left';
    });
    const on = this.pick === UPGRADES.length;
    g.fillStyle = on ? AMBER : '#3b3e44';
    g.beginPath(); g.moveTo(W - 340, RACE_Y + 18); g.lineTo(W - 16, RACE_Y + 18); g.lineTo(W - 40, H - 22); g.lineTo(W - 364, H - 22); g.closePath(); g.fill();
    g.fillStyle = on ? INK : WHITE; g.font = `68px ${PX}`; g.textAlign = 'center';
    g.fillText('Race', W - 190, RACE_Y + 92);
    g.textAlign = 'left'; g.fillStyle = MUTED; g.font = DOT;
    g.fillText('For this race only.', 28, RACE_Y + 80);
    texture.needsUpdate = true;
  }
}
