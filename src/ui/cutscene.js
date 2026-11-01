// Story scenes: a pixel-art picture that drifts slowly, weather and neon moving
// on top of it, a face that blinks, and the words typed into a dialog box. Tap,
// click, Enter or Space moves on; Skip ends the scene. Pictures and faces are
// made by tools/story-art.mjs and live in assets/story/. Johnny has a sprite for
// each expression (tools/character-sprites.mjs, assets/story/johnny/), with a hop
// when it changes, and no blink. A line with `ask: 'racer'` stops for the form
// that makes your racer; even Skip stops there.

import { PEOPLE, SCENES } from '../career/story.js';
import { FLAGS, flagCanvas } from '../vehicles/flags.js';

const $ = (sel) => document.querySelector(sel);
const FACES = Object.keys(PEOPLE).filter((id) => !PEOPLE[id].sprite);
const MOODS = ['plain', 'talk', 'aside', 'flat', 'wrench-look', 'down', 'sorry', 'shock', 'think', 'calm', 'thumbs', 'laugh', 'wrench', 'worry', 'explain', 'angry', 'facepalm', 'sad', 'smug', 'wrench-grin'];
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
    this.skip = this.el.querySelector('.st-skip');
    this.form = this.el.querySelector('.st-racer');
    for (const id of FACES) for (const f of ['', '-blink']) { const i = new Image(); i.src = `assets/story/face-${id}${f}.png`; }
    for (const m of MOODS) { const i = new Image(); i.src = `assets/story/johnny/${m}.png`; }
    this.el.addEventListener('pointerdown', (e) => { if (!e.target.closest('.st-skip, .st-racer')) this.advance(); });
    this.skip.addEventListener('click', () => this.finish(true));
    this.buildForm();
    window.addEventListener('keydown', (e) => {
      if (this.el.hidden || !this.form.hidden) return;
      if (e.code === 'Escape') this.finish(true);
      else if (e.code === 'Enter' || e.code === 'Space') this.advance();
      else return;
      e.preventDefault(); e.stopPropagation(); e.nsCaptured = true;
    }, true);
  }

  play(id, done) {
    const s = SCENES[id];
    this.scene = s; this.done = done; this.n = -1; this.artId = null; this.mood = null;
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
    if (!this.form.hidden) return;
    if (this.shown < this.full?.length) { this.shown = this.full.length; this.text.textContent = this.full; return; }
    if (this.scene.lines[this.n]?.ask && !this.racer.name) { this.showForm(); return; }
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
    this.showFace(line, p);
    this.el.classList.toggle('end', art === 'tbc');
    this.full = this.words(line); this.shown = 0; this.typed = 0;
    this.text.textContent = '';
  }

  // Johnny's sprite: he slides in, then hops when his expression changes.
  // Anyone else's face slides in each line, as before.
  showFace(line, p) {
    const f = this.face, sprite = !!p?.sprite, first = this.spriteOn !== sprite || !this.mood;
    f.classList.toggle('sprite', sprite);
    this.spriteOn = sprite;
    if (!p) { this.mood = null; return; }
    if (!sprite) { this.mood = null; f.src = `assets/story/face-${line.who}.png`; f.classList.remove('in'); void f.offsetWidth; f.classList.add('in'); return; }
    const mood = line.mood || 'plain', changed = mood !== this.mood;
    this.mood = mood;
    if (!changed) return;
    f.src = `assets/story/${line.who}/${mood}.png`;
    f.classList.remove('in', 'hop'); void f.offsetWidth;
    f.classList.add(first ? 'in' : 'hop');
  }

  get racer() { return this.game.save.career.racer; }

  // A line's words, with your name and home put in.
  words(line) {
    const r = this.racer, f = FLAGS[r.flag];
    const text = (f === FLAGS.jp && line.local) || line.text;
    return text.replaceAll('{name}', r.name || 'kid').replaceAll('{home}', f?.home || 'somewhere');
  }

  // --- make your racer ---
  buildForm() {
    const form = this.form, name = form.querySelector('#racer-name'), sign = form.querySelector('.go'), grid = form.querySelector('#racer-flags');
    this.picked = '';
    const check = () => { sign.disabled = !(name.value.trim() && this.picked); };
    for (const [id, f] of Object.entries(FLAGS)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'flag'; b.title = f.name; b.setAttribute('aria-label', f.name);
      b.appendChild(flagCanvas(id, 84, 56));
      b.addEventListener('click', () => {
        this.picked = id;
        for (const o of grid.children) o.classList.toggle('on', o === b);
        this.game.audio.ui('select');
        check();
      });
      grid.appendChild(b);
    }
    name.addEventListener('input', check);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (sign.disabled) return;
      this.racer.name = name.value.trim();
      this.racer.flag = this.picked;
      this.game.saveNow();
      this.game.buildChanged();
      form.hidden = true;
      this.skip.hidden = false;
      this.game.audio.ui('confirm');
      this.advance();
    });
    form.addEventListener('keydown', (e) => e.stopPropagation()); // typing is not driving
  }

  showForm() {
    this.form.hidden = false;
    this.skip.hidden = true;
    this.form.querySelector('#racer-name').focus();
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
      if (next !== this.shown) {
        this.shown = next; this.text.textContent = this.full.slice(0, next);
        if (this.who && next % 3 === 0) this.game.audio.ui('voice', PEOPLE[this.who].voice ?? 0.5);
      }
    }
    this.blink -= dt;
    const blinks = this.who && !PEOPLE[this.who].sprite;
    if (blinks && this.blink < 0.12) this.face.src = `assets/story/face-${this.who}-blink.png`;
    if (this.blink < 0) { this.blink = 2 + Math.random() * 3.5; if (blinks) this.face.src = `assets/story/face-${this.who}.png`; }
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
        g.fillStyle = q.s > 0.9 ? 'rgba(255, 176, 0, 0.5)' : 'rgba(34, 216, 200, 0.5)';
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

  // skipped: Skip was pressed. A scene that makes your racer still stops there.
  finish(skipped = false) {
    const ask = this.scene?.lines.findIndex((l) => l.ask) ?? -1;
    if (skipped && ask >= 0 && !this.racer.name) {
      this.n = ask - 1; this.full = ''; this.shown = 0;
      this.advance();
      this.shown = this.full.length; this.text.textContent = this.full;
      this.showForm();
      return;
    }
    this.running = false;
    this.el.hidden = true;
    this.full = '';
    const d = this.done;
    this.done = null;
    d?.();
  }
}
