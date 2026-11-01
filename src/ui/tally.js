// The pay after a race, counted up: your place lands, the money runs up with
// ticks that climb, the XP fills the level bar (and any level gained flashes as it
// goes past), then it settles. It only shows what results() has already banked,
// so a press skips to the end and leaving early loses nothing.

import { levelInfo, cr } from '../career/career.js';

const $ = (sel) => document.querySelector(sel);
const CR_SECONDS = 1.1, XP_SECONDS = 1, WAIT = 0.45, GAP = 0.2;
const ease = (k) => 1 - (1 - k) ** 3;

export class Tally {
  constructor(audio) { this.audio = audio; this.frame = 0; }

  // pay: { cr, xp, xpFrom }, the XP you had before this race.
  start(pay) {
    this.stop();
    this.pay = pay;
    this.t = 0; this.last = performance.now();
    this.ticks = 0; this.level = levelInfo(pay.xpFrom).level; this.step = 0;
    const tick = (now) => {
      this.t += Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      if (this.draw()) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
    const skip = () => { this.t = 99; };
    this.skip = skip;
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);
  }

  stop() {
    cancelAnimationFrame(this.frame);
    if (this.skip) { window.removeEventListener('pointerdown', this.skip); window.removeEventListener('keydown', this.skip); this.skip = null; }
  }

  // One frame. False when it is all counted.
  draw() {
    const { cr: money, xp, xpFrom } = this.pay, t = this.t;
    const k1 = Math.min(1, Math.max(0, t - WAIT) / CR_SECONDS), k2 = Math.min(1, Math.max(0, t - WAIT - CR_SECONDS - GAP) / XP_SECONDS);
    const shown = Math.round(money * ease(k1) / 10) * 10, gained = Math.round(xp * ease(k2)), i = levelInfo(xpFrom + gained);
    $('#tl-cr').textContent = `+ ${cr(shown)}`;
    $('#tl-xp').textContent = `+ ${gained}`;
    $('#tl-level').textContent = `Level ${i.level}`;
    $('#tl-bar').style.width = `${Math.round(i.share * 100)}%`;
    if (i.level > this.level) { // a level gained: the bar flashes and starts again
      this.level = i.level;
      this.audio.ui('level');
      const up = $('#tl-up');
      up.hidden = false; up.classList.remove('pop'); void up.offsetWidth; up.classList.add('pop');
    }
    // A tick for every step of the running number, climbing as it goes.
    const steps = Math.floor(ease(k1) * 16) + Math.floor(ease(k2) * 12);
    if (steps > this.ticks && t < 90) { this.audio.ui('tick', (k1 < 1 ? k1 : k2)); this.ticks = steps; }
    if (k1 === 1 && this.step === 0) { this.step = 1; if (money) this.audio.ui('cash'); $('#tl-cr').classList.add('done'); }
    if (k2 === 1 && this.step === 1) { this.step = 2; if (xp) this.audio.ui('stamp'); $('#tl-xp').classList.add('done'); }
    if (this.step === 2) { this.stop(); return false; }
    return true;
  }
}
