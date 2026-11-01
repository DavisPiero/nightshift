// Your phone: a flip phone that comes up on the right of the screen, opened from
// the button beside the Settings gear. It holds your mail (career/inbox.js), updates
// to the game (ui/notice.js) and your contacts (career/contacts.js): call someone
// and their answer opens like a message. Read by pointing at the display, or with
// the arrows (left and right swap Inbox and Contacts), Enter and Escape, or a
// gamepad. The bar along the top has Back and the bin; the bin always asks first.

import { buildPhone } from '../world/props-devices.js';
import { inbox, unread, bin } from '../career/inbox.js';
import { updateMail } from './notice.js';
import { contacts, contactNote, call } from '../career/contacts.js';

const $ = (sel) => document.querySelector(sel);
const WHITE = '#ffffff', AMBER = '#ffb000', TEAL = '#22d8c8', MUTED = '#bcc0c6', LINE = '#3b3e44', INK = '#08090b', BG = '#0d0e11';
const PX = '"Jersey 10", ui-monospace, monospace', DOT = 'bold 22px "DotGothic16", "Jersey 10", monospace';
const ROWS = 5, ROW_H = 74, TOP = 62, BAR = 54, CORNER = 66;
const YES = [40, 300, 170, 66], NO = [230, 300, 170, 66]; // x, y, width, height on the display
const RACE = [120, 410, 200, 66];
const TABS = [['inbox', 'Inbox', 0, 180], ['contacts', 'Contacts', 180, 194]]; // id, name, x, width in the top bar

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
    this.asking = null;   // the messages waiting on "are you sure?"
    this.sure = false;    // Yes is picked there
    this.onBin = false;   // the bin is picked in the top bar
    this.tab = 'inbox';
    this.calls = 0;       // counts up, so people say something different each time
    this.btn = $('#phone-btn');
    this.btn.addEventListener('click', () => this.open());
    stage.canvas.addEventListener('pointerdown', (e) => { if (this.game.device === this) this.point(e); });
    window.addEventListener('keydown', (e) => {
      if (this.game.device !== this) return;
      if (e.code === 'Escape') this.back();
      else if (e.code === 'Delete' || e.code === 'Backspace') this.askBin();
      else if (e.code === 'ArrowDown') this.nav(1);
      else if (e.code === 'ArrowUp') this.nav(-1);
      else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { if (this.reading || this.asking) this.nav(1); else this.swap(); }
      else if (e.code === 'Enter' || e.code === 'Space') this.press();
      else return;
      e.preventDefault(); e.stopPropagation(); e.nsCaptured = true;
    }, true);
  }

  get mail() { return inbox(this.game.save, updateMail(this.game.save)); }

  // What the list shows: messages, or the people you know.
  get rows() {
    if (this.tab === 'inbox') return this.mail;
    const save = this.game.save;
    return contacts(save.career).map((p) => ({ id: p.id, from: p.name, subject: contactNote(save, p.id), read: true, person: p.id }));
  }

  swap(tab = this.tab === 'inbox' ? 'contacts' : 'inbox') {
    if (tab === this.tab) return;
    this.tab = tab;
    this.pick = 0; this.top = 0; this.onBin = false;
    this.game.audio.ui('phone-key');
    this.draw();
  }

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
    this.pick = 0; this.top = 0; this.reading = null; this.asking = null; this.onBin = false; this.tab = 'inbox';
    this.draw();
    this.game.audio.ui('phone-open');
    this.stage.show(this.model, (a) => ({ x: a * 1.99 - 1.2, y: -0.42, z: 0, rx: -0.12, ry: -0.36, rz: 0.09, scale: 1.7 }));
    $('#phone-tip').hidden = true;
  }

  close() {
    this.game.device = null;
    this.game.audio.ui('phone-close');
    this.stage.hide();
    this.refresh();
  }

  // Down the list; one step past either end is the bin. Reading a message, or
  // on "are you sure?", the arrows swap between the two choices.
  nav(d) {
    if (this.asking) { this.sure = !this.sure; this.game.audio.ui('phone-key'); this.draw(); return; }
    if (this.reading) { this.onBin = !this.onBin; this.game.audio.ui('phone-key'); this.draw(); return; }
    const n = this.rows.length, bin = this.tab === 'inbox' ? 1 : 0; // the bin is one more stop, on the inbox
    if (!n) return;
    const at = (this.onBin ? n : this.pick) + d, next = (at + n + bin) % (n + bin);
    this.onBin = next === n;
    this.game.audio.ui('phone-key');
    if (this.onBin) { this.draw(); return; }
    this.pick = next;
    if (this.pick < this.top) this.top = this.pick;
    if (this.pick >= this.top + ROWS) this.top = this.pick - ROWS + 1;
    this.draw();
  }

  press() {
    if (this.asking) { this.answer(this.sure); return; }
    if (this.onBin) { this.askBin(); return; }
    if (this.reading?.race) { this.goRace(); return; }
    if (this.reading) { this.back(); return; }
    const m = this.rows[this.pick];
    if (!m) { this.close(); return; }
    if (m.person) { this.ring(m.person); return; }
    this.reading = m;
    if (!this.game.save.read.includes(m.id)) { this.game.save.read.push(m.id); this.game.saveNow(); }
    this.game.audio.ui('phone-key');
    this.draw();
  }

  // Call someone: it rings, then they answer.
  ring(id) {
    const audio = this.game.audio;
    this.game.audio.ui('phone-key');
    this.reading = { from: this.rows[this.pick].from, subject: 'Calling...', text: '', call: true };
    this.draw();
    audio.ui('phone-ring');
    clearTimeout(this.ringing);
    this.ringing = setTimeout(() => {
      if (!this.reading?.call || this.game.device !== this) return;
      this.reading = call(this.game.save, id, this.calls++);
      this.game.saveNow();
      audio.ui('phone-mail');
      this.draw();
    }, 1000);
  }

  // Sonny's Race button: over to his invite on the Career screen.
  goRace() {
    const screens = this.game.screens;
    this.close();
    screens.career.pick = 'invite';
    screens.open('career');
  }

  back() {
    if (!this.asking && !this.reading) { this.close(); return; }
    this.game.audio.ui('phone-key');
    if (this.asking) { this.asking = null; this.draw(); }
    else { this.reading = null; this.onBin = false; this.draw(); }
  }

  // The bin: the open message, or the whole inbox.
  askBin() {
    if (this.asking) return;
    if (this.tab !== 'inbox' || this.reading?.call) return;
    const list = this.reading ? [this.reading] : this.mail;
    if (!list.length) return;
    this.asking = list;
    this.sure = false; // No is picked to begin with
    this.game.audio.ui('select');
    this.draw();
  }

  answer(yes) {
    const list = this.asking;
    this.asking = null;
    if (!yes) { this.game.audio.ui('back'); this.draw(); return; }
    bin(this.game.save, list);
    this.game.saveNow();
    this.game.audio.ui('confirm');
    this.reading = null; this.onBin = false;
    this.pick = Math.max(0, Math.min(this.pick, this.mail.length - 1));
    this.top = Math.min(this.top, Math.max(0, this.mail.length - ROWS));
    this.draw();
    this.refresh();
  }

  point(e) {
    if (this.stage.touches(e.clientX, e.clientY, this.model.ok)) { this.close(); return; } // the amber button shuts it
    const p = this.stage.hit(e.clientX, e.clientY);
    if (!p) { if (!this.stage.touches(e.clientX, e.clientY)) this.close(); return; }
    const x = p.x * 440, y = p.y * 500, inside = ([a, b, w, h]) => x >= a && x <= a + w && y >= b && y <= b + h;
    if (this.asking) {
      if (inside(YES)) this.answer(true);
      else if (inside(NO)) this.answer(false);
      return;
    }
    if (y < BAR) {
      if (x > 440 - CORNER) this.askBin();
      else if (this.reading) { if (x < CORNER) this.back(); }
      else for (const [id, , a, w] of TABS) if (x >= a && x <= a + w) this.swap(id);
      return;
    }
    if (this.reading) { if (this.reading.race && inside(RACE)) this.goRace(); return; }
    this.onBin = false;
    const row = Math.floor((y - TOP) / ROW_H);
    if (row < 0 || row >= ROWS) return;
    this.pick = Math.min(this.rows.length - 1, this.top + row);
    if (this.pick >= 0) this.press();
  }

  draw() {
    const { g, canvas, texture } = this.model, W = canvas.width, H = canvas.height;
    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    if (this.reading) this.drawMail(g, W, H); else this.drawList(g, W, H);
    if (this.asking) this.drawAsk(g, W, H);
    texture.needsUpdate = true;
  }

  // A little bin in the top right of the bar.
  drawBin(g, W, ink) {
    const x = W - CORNER / 2, y = BAR / 2;
    if (this.onBin && !this.asking) { g.fillStyle = TEAL; g.fillRect(W - CORNER, 0, CORNER, BAR); ink = INK; }
    g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 3; g.lineJoin = 'round';
    g.fillRect(x - 13, y - 12, 26, 3);
    g.fillRect(x - 5, y - 16, 10, 3);
    g.beginPath(); g.moveTo(x - 10, y - 6); g.lineTo(x - 8, y + 15); g.lineTo(x + 8, y + 15); g.lineTo(x + 10, y - 6); g.closePath(); g.stroke();
    g.lineWidth = 2;
    for (const dx of [-3.5, 3.5]) { g.beginPath(); g.moveTo(x + dx, y - 2); g.lineTo(x + dx, y + 11); g.stroke(); }
  }

  drawAsk(g, W, H) {
    g.fillStyle = 'rgba(8, 9, 11, 0.86)'; g.fillRect(0, 0, W, H);
    g.fillStyle = WHITE; g.font = `38px ${PX}`; g.textAlign = 'center';
    wrap(g, 'Are you sure you want to delete?', W - 60).forEach((l, i) => g.fillText(l, W / 2, 190 + i * 42));
    for (const [[x, y, w, h], label, on] of [[YES, 'Yes', this.sure], [NO, 'No', !this.sure]]) {
      g.beginPath(); g.roundRect(x, y, w, h, 8);
      g.fillStyle = on ? AMBER : '#1b1d21'; g.fill();
      g.strokeStyle = on ? AMBER : LINE; g.lineWidth = 2; g.stroke();
      g.fillStyle = on ? INK : WHITE; g.fillText(label, x + w / 2, y + 46);
    }
    g.textAlign = 'left';
  }

  drawList(g, W, H) {
    const list = this.rows, unseen = this.mail.filter((m) => !m.read).length;
    g.fillStyle = '#1b1d21'; g.fillRect(0, 0, W, BAR);
    g.font = `38px ${PX}`;
    for (const [id, name, x, w] of TABS) {
      const on = id === this.tab;
      if (on) { g.fillStyle = BG; g.fillRect(x, 6, w, BAR - 6); g.fillStyle = TEAL; g.fillRect(x, BAR - 4, w, 4); }
      g.fillStyle = on ? WHITE : MUTED; g.fillText(name, x + 14, 40);
    }
    if (unseen) { g.fillStyle = AMBER; g.fillRect(118, 14, 34, 28); g.fillStyle = INK; g.font = `28px ${PX}`; g.textAlign = 'center'; g.fillText(String(unseen), 135, 37); g.textAlign = 'left'; }
    if (this.tab === 'inbox' && list.length) this.drawBin(g, W, WHITE);
    if (!list.length) { g.fillStyle = MUTED; g.font = DOT; g.fillText('Nothing yet.', 18, 110); return; }
    list.slice(this.top, this.top + ROWS).forEach((m, i) => {
      const y = TOP + i * ROW_H, on = this.top + i === this.pick && !this.onBin;
      if (on) { g.fillStyle = 'rgba(34, 216, 200, 0.16)'; g.fillRect(0, y, W, ROW_H); g.fillStyle = TEAL; g.fillRect(0, y, 5, ROW_H); }
      if (!m.read) { g.fillStyle = AMBER; g.fillRect(16, y + 14, 10, 10); }
      g.fillStyle = m.read ? MUTED : WHITE; g.font = `30px ${PX}`;
      g.fillText(m.from, 34, y + 28);
      g.fillStyle = m.read ? MUTED : WHITE; g.font = DOT;
      g.fillText(wrap(g, m.subject, W - 50)[0] ?? '', 34, y + 60);
      g.fillStyle = LINE; g.fillRect(0, y + ROW_H - 1, W, 1);
    });
  }

  drawMail(g, W) {
    const m = this.reading;
    g.fillStyle = '#1b1d21'; g.fillRect(0, 0, W, BAR);
    if (!this.onBin && !this.asking) { g.fillStyle = TEAL; g.fillRect(0, 0, CORNER - 12, BAR); }
    g.strokeStyle = !this.onBin && !this.asking ? INK : WHITE; g.lineWidth = 4; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(32, 14); g.lineTo(18, 27); g.lineTo(32, 40); g.stroke();
    g.lineCap = 'butt';
    g.fillStyle = WHITE; g.font = `38px ${PX}`; g.fillText(m.from, CORNER, 40);
    if (!m.call) this.drawBin(g, W, WHITE);
    g.fillStyle = TEAL; g.font = DOT; g.fillText(wrap(g, m.subject, W - 32)[0], 16, 90);
    g.fillStyle = WHITE;
    const lines = m.lines || wrap(g, m.text, W - 32);
    lines.slice(0, m.race ? 9 : 12).forEach((l, i) => g.fillText(l, 16, 130 + i * 30));
    if (m.race) {
      const [x, y, w, h] = RACE;
      g.fillStyle = AMBER; g.beginPath(); g.roundRect(x, y, w, h, 8); g.fill();
      g.fillStyle = INK; g.font = `44px ${PX}`; g.textAlign = 'center'; g.fillText('Race', x + w / 2, y + 48); g.textAlign = 'left';
    }
  }
}
