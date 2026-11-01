// The laptop: before a career race it comes up on the right of the screen, with
// two tabs like a browser. Upgrades buys one-race upgrades (career/upgrades.js);
// Analytics reads the field (race/analytics.js). Race starts the countdown from
// either, and is picked to begin with, so one press goes straight to the lights.

import { buildLaptop } from '../world/props-devices.js';
import { UPGRADES } from '../career/upgrades.js';
import { cr } from '../career/career.js';
import { analyse, troubleLine } from '../race/analytics.js';
import { keyName } from '../input/keyboard.js';

const WHITE = '#ffffff', AMBER = '#ffb000', TEAL = '#22d8c8', MUTED = '#bcc0c6', LINE = '#3b3e44', INK = '#08090b', BG = '#0d0e11', TITANIUM = '#8d9198';
const PX = '"Jersey 10", ui-monospace, monospace', DOT = 'bold 24px "DotGothic16", "Jersey 10", monospace';
const TOP = 92, ROW_H = 92, RACE_Y = 494, BAR = 72;
const TABS = [['upgrades', 'Upgrades', 16, 214], ['analytics', 'Analytics', 238, 226]]; // id, name, x, width
const COLUMNS = { place: 34, name: 62, car: 214, hp: 636, top: 738, pi: 830, style: 860 }; // on Analytics

// Words onto lines that fit.
function wrap(g, text, width) {
  const lines = [];
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > width && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export class Laptop {
  constructor(game, stage) {
    this.game = game;
    this.stage = stage;
    this.model = null;
    stage.canvas.addEventListener('pointerdown', (e) => { if (this.game.device === this) this.point(e); });
    window.addEventListener('keydown', (e) => {
      if (this.game.device !== this) return;
      if (e.code === 'Escape') this.go();
      else if (e.code === 'ArrowDown') this.nav(1);
      else if (e.code === 'ArrowUp') this.nav(-1);
      else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft' || e.code === 'Tab') this.side();
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
    this.tab = 'upgrades';
    this.data = null;
    this.game.device = this;
    this.draw();
    this.stage.show(this.model, (a) => ({ x: Math.max(1.05, a * 1.99 - 2.12), y: -0.92, z: 0, rx: 0.2, ry: -0.2, rz: 0.01, scale: Math.min(1.04, a * 0.62) }));
  }

  // The other tab.
  side() {
    this.tab = this.tab === 'upgrades' ? 'analytics' : 'upgrades';
    this.game.audio.ui('move');
    this.draw();
  }

  nav(d) {
    if (this.tab === 'analytics') return;
    const n = UPGRADES.length + 1;
    this.pick = (this.pick + d + n) % n;
    this.game.audio.ui('move');
    this.draw();
  }

  press() {
    const u = this.tab === 'upgrades' ? UPGRADES[this.pick] : null;
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
    const y = p.y * 640, x = p.x * 1024;
    if (y < BAR) {
      for (const [id, , at, w] of TABS) if (x >= at && x <= at + w && id !== this.tab) this.side();
      return;
    }
    if (y >= RACE_Y) { if (x > 600) { this.pick = UPGRADES.length; this.press(); } return; }
    if (this.tab !== 'upgrades') return;
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
    // The tab strip, like a browser: the open tab joins the page below it.
    g.fillStyle = '#1b1d21'; g.fillRect(0, 0, W, BAR);
    for (const [id, name, x, w] of TABS) {
      const on = this.tab === id;
      g.fillStyle = on ? BG : '#26282d';
      g.beginPath(); g.moveTo(x, BAR); g.lineTo(x + 12, 14); g.lineTo(x + w - 12, 14); g.lineTo(x + w, BAR); g.closePath(); g.fill();
      g.fillStyle = on ? WHITE : MUTED; g.font = `46px ${PX}`; g.textAlign = 'center';
      g.fillText(name, x + w / 2, 58);
    }
    g.textAlign = 'right'; g.fillStyle = AMBER; g.font = `52px ${PX}`; g.fillText(cr(c.cr), W - 28, 56); g.textAlign = 'left';
    if (this.tab === 'analytics') this.drawAnalytics(g, W, H);
    else this.drawUpgrades(g, W, H);
    // Race, from either tab.
    const race = this.pick === UPGRADES.length || this.tab !== 'upgrades';
    g.fillStyle = race ? AMBER : '#3b3e44';
    g.beginPath(); g.moveTo(W - 340, RACE_Y + 18); g.lineTo(W - 16, RACE_Y + 18); g.lineTo(W - 40, H - 22); g.lineTo(W - 364, H - 22); g.closePath(); g.fill();
    g.fillStyle = race ? INK : WHITE; g.font = `68px ${PX}`; g.textAlign = 'center';
    g.fillText('Race', W - 190, RACE_Y + 92);
    g.textAlign = 'left';
    texture.needsUpdate = true;
  }

  drawAnalytics(g, W) {
    this.data ??= analyse(this.game.race.cars);
    const { rows, trouble } = this.data, units = this.game.hud.units === 'mph';
    const T = COLUMNS, Y = 98, H = 46;
    g.fillStyle = MUTED; g.font = 'bold 19px "DotGothic16", "Jersey 10", monospace';
    g.fillText('Predicted', 16, Y - 4); g.fillText('Car', T.car, Y - 4);
    g.textAlign = 'right'; g.fillText('Power', T.hp, Y - 4); g.fillText(units ? 'Top mph' : 'Top km/h', T.top, Y - 4); g.fillText('Rating', T.pi, Y - 4); g.textAlign = 'left';
    g.fillText('Style', T.style, Y - 4);
    rows.forEach((r, i) => {
      const y = Y + 6 + i * H;
      if (r.you || r.trouble) { g.beginPath(); g.roundRect(16, y, W - 32, H - 5, 8); }
      if (r.you) { g.fillStyle = 'rgba(255, 176, 0, 0.15)'; g.fill(); }
      if (r.trouble) { g.strokeStyle = WHITE; g.lineWidth = 2; g.stroke(); }
      const ink = r.you ? AMBER : WHITE, b = y + 32;
      g.fillStyle = ink; g.font = `38px ${PX}`;
      g.textAlign = 'right'; g.fillText(String(r.place), T.place + 12, b); g.textAlign = 'left';
      g.fillText(r.name.slice(0, 12), T.name, b);
      g.font = 'bold 21px "DotGothic16", "Jersey 10", monospace'; g.fillStyle = r.you ? AMBER : MUTED;
      g.fillText(r.car, T.car, b - 2);
      g.fillStyle = ink; g.font = `34px ${PX}`; g.textAlign = 'right';
      g.fillText(`${r.hp} hp`, T.hp, b); g.fillText(String(Math.round(units ? r.top / 1.609 : r.top)), T.top, b); g.fillText(String(r.pi), T.pi, b);
      g.textAlign = 'left'; g.fillStyle = r.trouble ? WHITE : TEAL; g.font = 'bold 21px "DotGothic16", "Jersey 10", monospace';
      g.fillText(r.style, T.style, b - 2);
    });
    if (!trouble) return;
    g.fillStyle = WHITE; g.font = `38px ${PX}`; g.fillText('Most trouble', 16, RACE_Y + 30);
    g.fillStyle = MUTED; g.font = 'bold 21px "DotGothic16", "Jersey 10", monospace';
    wrap(g, troubleLine(trouble), 610).slice(0, 2).forEach((l, i) => g.fillText(l, 16, RACE_Y + 62 + i * 28));
  }

  drawUpgrades(g, W) {
    const c = this.game.save.career;
    UPGRADES.forEach((u, i) => {
      const y = TOP + i * ROW_H, on = this.pick === i, have = !!this.fitted[u.id], poor = !have && c.cr < u.price;
      g.beginPath(); g.roundRect(16, y, W - 32, ROW_H - 10, 10);
      if (have) { g.fillStyle = 'rgba(34, 216, 200, 0.16)'; g.fill(); }
      g.strokeStyle = on ? WHITE : have ? TEAL : LINE; g.lineWidth = on ? 3 : 1.5;
      g.stroke();
      g.fillStyle = poor ? TITANIUM : WHITE; g.font = `48px ${PX}`; g.fillText(u.name, 36, y + 42);
      g.fillStyle = poor ? TITANIUM : MUTED; g.font = DOT;
      g.fillText(u.id === 'nos' ? `${u.info}, on ${this.nosButton()}` : u.info, 36, y + 72);
      g.textAlign = 'right';
      g.fillStyle = have ? TEAL : poor ? TITANIUM : AMBER; g.font = `46px ${PX}`;
      g.fillText(have ? 'Fitted' : cr(u.price), W - 36, y + 54);
      g.textAlign = 'left';
    });
    g.fillStyle = MUTED; g.font = DOT;
    g.fillText('For this race only.', 28, RACE_Y + 80);
  }
}
