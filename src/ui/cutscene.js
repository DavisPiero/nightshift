// Story scenes: a pixel-art picture that drifts slowly, weather and neon moving
// on top of it, a face that blinks, and the words typed into a dialog box. Tap,
// click, Enter or Space moves on; Skip ends the scene. Pictures and faces are
// made by tools/story-art.mjs and live in assets/story/.

import { PEOPLE, SCENES } from '../career/story.js';

const $ = (sel) => document.querySelector(sel);
const FACES = Object.keys(PEOPLE);
const CPS = 46; // letters a second

// What moves over each picture.
const FX = { docks: 'mist', garage: 'dust', grid: 'rain', tokyo: 'lights', ring: 'lights', contract: 'dust', tbc: 'stars' };

export class Cutscene {
  constructor(game) {
    this.game = game;
    this.el = $('#story');
    this.art = this.el.querySelector('.st-art');
    this.fx = this.el.querySelector('.st-fx');
    this.face = this.el.querySelector('.st-face');
    this.nameEl = this.el.querySelector('.st-name');
    this.text = this.el.querySelector('.st-text');
    this.box = this.el.querySelector('.st-box');
    for (const id of FACES) for (const f of ['', '-blink']) { const i = new Image(); i.src = `assets/story/face-${id}${f}.png`; }
    this.el.addEventListener('pointerdown', (e) => { if (!e.target.closest('.st-skip')) this.advance(); });
    this.el.querySelector('.st-skip').addEventListener('click', () => this.finish());
    window.addEventListener('keydown', (e) => {
      if (this.el.hidden) return;
      if (e.code === 'Escape') this.finish();
      else if (e.code === 'Enter' || e.code === 'Space') this.advance();
      else return;
      e.preventDefault(); e.stopPropagation(); e.nsCaptured = true;
    }, true);
  }

  play(id, done) {
    const s = SCENES[id];
    this.scene = s; this.done = done; this.n = -1; this.artId = null;
    this.game.save.career.seen = [...new Set([...this.game.save.career.seen, id])];
    this.game.saveNow();
    this.el.hidden = false;
    this.parts = [];
    this.last = performance.now();
    this.blink = 3;
    this.running = true;
    requestAnimationFrame((t) => this.frame(t));
    this.advance();
  }

  // Finish the line being typed, or go to the next one.
  advance() {
    if (this.shown < this.full?.length) { this.shown = this.full.length; this.text.textContent = this.full; return; }
    this.n++;
    const line = this.scene.lines[this.n];
    if (!line) { this.finish(); return; }
    this.game.audio.ui('move');
    const art = line.art || (this.n === 0 ? this.scene.art : this.artId);
    if (art !== this.artId) this.setArt(art);
    const p = PEOPLE[line.who];
    this.who = line.who || null;
    this.box.classList.toggle('tell', !p);
    this.nameEl.hidden = !p;
    this.nameEl.textContent = p ? p.name : '';
    this.face.hidden = !p;
    if (p) { this.face.src = `assets/story/face-${line.who}.png`; this.face.classList.remove('in'); void this.face.offsetWidth; this.face.classList.add('in'); }
    this.el.classList.toggle('end', art === 'tbc');
    this.full = line.text; this.shown = 0; this.typed = 0;
    this.text.textContent = '';
  }

  setArt(id) {
    this.artId = id;
    this.art.style.backgroundImage = `url(assets/story/${id}.png)`;
    this.art.classList.remove('drift'); void this.art.offsetWidth; this.art.classList.add('drift');
    this.fxKind = FX[id] || null;
    this.parts = [];
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.shown < this.full.length) {
      this.typed += dt * CPS;
      const next = Math.min(this.full.length, Math.floor(this.typed));
      if (next !== this.shown) { this.shown = next; this.text.textContent = this.full.slice(0, next); }
    }
    this.blink -= dt;
    if (this.who && this.blink < 0.12) this.face.src = `assets/story/face-${this.who}-blink.png`;
    if (this.blink < 0) { this.blink = 2 + Math.random() * 3.5; if (this.who) this.face.src = `assets/story/face-${this.who}.png`; }
    this.drawFx(dt);
    requestAnimationFrame((t) => this.frame(t));
  }

  // Square-pixel weather over the picture.
  drawFx(dt) {
    const g = this.fx.getContext('2d'), W = this.fx.width, H = this.fx.height, k = this.fxKind;
    g.clearRect(0, 0, W, H);
    if (!k) return;
    const want = { rain: 90, mist: 14, dust: 24, lights: 8, stars: 40 }[k];
    while (this.parts.length < want) this.parts.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random(), p: Math.random() * 6 });
    for (const q of this.parts) {
      if (k === 'rain') {
        q.y += dt * 420 * q.s; q.x -= dt * 120 * q.s;
        g.fillStyle = 'rgba(190, 225, 255, 0.45)';
        g.fillRect(q.x | 0, q.y | 0, 1, 5 + (q.s * 4 | 0));
      } else if (k === 'mist') {
        q.x += dt * 8 * q.s;
        g.fillStyle = 'rgba(190, 215, 225, 0.05)';
        g.fillRect(q.x | 0, (q.y * 0.5 + H * 0.45) | 0, 90 * q.s | 0, 5);
      } else if (k === 'dust') {
        q.x += dt * 5 * q.s; q.y -= dt * 3 * q.s; q.p += dt * 2;
        g.fillStyle = `rgba(255, 220, 170, ${0.15 + Math.sin(q.p) * 0.12})`;
        g.fillRect(q.x | 0, q.y | 0, 1, 1);
      } else if (k === 'lights') {
        q.x += dt * 260 * q.s;
        g.fillStyle = q.s > 0.9 ? 'rgba(255, 60, 140, 0.5)' : 'rgba(80, 240, 230, 0.5)';
        g.fillRect(q.x | 0, (q.y * 0.15 + 8) | 0, 26 * q.s | 0, 1);
      } else {
        q.p += dt * 2.5;
        g.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(q.p) * 0.3})`;
        g.fillRect(q.x | 0, q.y | 0, 1, 1);
      }
      if (q.x > W + 100) q.x = -100;
      if (q.x < -100) q.x = W + 100;
      if (q.y > H) q.y = -10;
      if (q.y < -10) q.y = H;
    }
  }

  finish() {
    this.running = false;
    this.el.hidden = true;
    this.full = '';
    const d = this.done;
    this.done = null;
    d?.();
  }
}
