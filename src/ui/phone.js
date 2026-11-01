// Your phone: a flip phone that comes up on the right of the screen, opened from
// the button beside the Settings gear. It holds your mail (career/inbox.js) and
// updates to the game (ui/notice.js). Read by pointing at the display, or with
// the arrows, Enter and Escape, or a gamepad.

import { buildPhone } from '../world/props-devices.js';
import { inbox, unread } from '../career/inbox.js';
import { updateMail } from './notice.js';

const $ = (sel) => document.querySelector(sel);
const WHITE = '#ffffff', AMBER = '#ffb000', TEAL = '#22d8c8', MUTED = '#bcc0c6', LINE = '#3b3e44', INK = '#08090b', BG = '#0d0e11';
const PX = '"Jersey 10", ui-monospace, monospace', DOT = 'bold 22px "DotGothic16", "Jersey 10", monospace';
const ROWS = 5, ROW_H = 74, TOP = 62;

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

export class Phone {
  constructor(game, stage) {
    this.game = game;
    this.stage = stage;
    this.model = null;
    this.pick = 0;
    this.reading = null;
    this.top = 0;
    this.btn = $('#phone-btn');
    this.btn.addEventListener('click', () => this.open());
    stage.canvas.addEventListener('pointerdown', (e) => { if (this.game.device === this) this.point(e); });
    window.addEventListener('keydown', (e) => {
      if (this.game.device !== this) return;
      if (e.code === 'Escape') this.back();
      else if (e.code === 'ArrowDown' || e.code === 'ArrowRight') this.nav(1);
      else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') this.nav(-1);
      else if (e.code === 'Enter' || e.code === 'Space') this.press();
      else return;
      e.preventDefault(); e.stopPropagation(); e.nsCaptured = true;
    }, true);
  }

  get mail() { return inbox(this.game.save, updateMail(this.game.save)); }

  // The dot on the button, and "You got mail" when something new came in.
  refresh() {
    const n = unread(this.game.save, updateMail(this.game.save)), dot = this.btn.querySelector('.ph-dot'), tip = $('#phone-tip');
    dot.hidden = !n;
    dot.textContent = n;
    tip.hidden = !n;
  }

  open() {
    if (this.game.device) return;
    this.model ??= buildPhone();
    this.game.device = this;
    this.pick = 0; this.top = 0; this.reading = null;
    this.draw();
    this.stage.show(this.model, (a) => ({ x: a * 1.99 - 1.2, y: -0.42, z: 0, rx: -0.12, ry: -0.36, rz: 0.09, scale: 1.7 }));
    $('#phone-tip').hidden = true;
  }

  close() {
    this.game.device = null;
    this.stage.hide();
    this.refresh();
  }

  nav(d) {
    if (this.reading) return;
    const n = this.mail.length;
    if (!n) return;
    this.pick = (this.pick + d + n) % n;
    if (this.pick < this.top) this.top = this.pick;
    if (this.pick >= this.top + ROWS) this.top = this.pick - ROWS + 1;
    this.game.audio.ui('move');
    this.draw();
  }

  press() {
    if (this.reading) { this.back(); return; }
    const m = this.mail[this.pick];
    if (!m) { this.close(); return; }
    this.reading = m;
    if (!this.game.save.read.includes(m.id)) { this.game.save.read.push(m.id); this.game.saveNow(); }
    this.game.audio.ui('select');
    this.draw();
  }

  back() {
    this.game.audio.ui('back');
    if (this.reading) { this.reading = null; this.draw(); } else this.close();
  }

  point(e) {
    const p = this.stage.hit(e.clientX, e.clientY);
    if (!p) { if (!this.stage.touches(e.clientX, e.clientY)) this.close(); return; }
    if (this.reading) { this.back(); return; }
    const row = Math.floor((p.y * 500 - TOP) / ROW_H);
    if (row < 0 || row >= ROWS) return;
    this.pick = Math.min(this.mail.length - 1, this.top + row);
    if (this.pick >= 0) this.press();
  }

  draw() {
    const { g, canvas, texture } = this.model, W = canvas.width, H = canvas.height;
    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    if (this.reading) this.drawMail(g, W, H); else this.drawList(g, W, H);
    texture.needsUpdate = true;
  }

  drawList(g, W, H) {
    const list = this.mail, n = list.filter((m) => !m.read).length;
    g.fillStyle = n ? AMBER : '#1b1d21'; g.fillRect(0, 0, W, 54);
    g.fillStyle = n ? INK : WHITE; g.font = `38px ${PX}`;
    g.fillText(n ? 'You got mail' : 'Inbox', 16, 40);
    g.textAlign = 'right'; g.fillText(String(list.length), W - 16, 40); g.textAlign = 'left';
    if (!list.length) { g.fillStyle = MUTED; g.font = DOT; g.fillText('Nothing yet.', 18, 110); return; }
    list.slice(this.top, this.top + ROWS).forEach((m, i) => {
      const y = TOP + i * ROW_H, on = this.top + i === this.pick;
      if (on) { g.fillStyle = 'rgba(34, 216, 200, 0.16)'; g.fillRect(0, y, W, ROW_H); g.fillStyle = TEAL; g.fillRect(0, y, 5, ROW_H); }
      if (!m.read) { g.fillStyle = AMBER; g.fillRect(16, y + 14, 10, 10); }
      g.fillStyle = m.read ? MUTED : WHITE; g.font = `30px ${PX}`;
      g.fillText(m.from, 34, y + 28);
      g.fillStyle = m.read ? MUTED : WHITE; g.font = DOT;
      g.fillText(wrap(g, m.subject, W - 50)[0], 34, y + 60);
      g.fillStyle = LINE; g.fillRect(0, y + ROW_H - 1, W, 1);
    });
  }

  drawMail(g, W) {
    const m = this.reading;
    g.fillStyle = '#1b1d21'; g.fillRect(0, 0, W, 54);
    g.fillStyle = WHITE; g.font = `38px ${PX}`; g.fillText(m.from, 16, 40);
    g.fillStyle = TEAL; g.font = DOT; g.fillText(wrap(g, m.subject, W - 32)[0], 16, 90);
    g.fillStyle = WHITE;
    const lines = m.lines || wrap(g, m.text, W - 32);
    lines.slice(0, 12).forEach((l, i) => g.fillText(l, 16, 130 + i * 30));
  }
}
