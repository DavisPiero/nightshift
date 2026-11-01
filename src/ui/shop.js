// The shop: Dave's lot. A laptop on the left (ui/desk.js) filters by stage (Street,
// GT3, Formula) and by brand, with a wall of car cards and the picked car's numbers
// and Buy button. The picked car stands on the lot in front of you: drag to walk
// round it. Dave leans in his cabin window and talks. A stage that your level has not
// reached stays locked. Nothing here spends money without a yes in a pop-up.

import * as THREE from 'three';
import { CARS, TIERS, carTitle } from '../vehicles/cars.js';
import { levelFor, cr } from '../career/career.js';
import { buildSpec } from '../vehicles/tuning.js';
import { fillStats } from './stats-view.js';
import { carCard, lockedCard } from './car-cards.js';
import { daveOnCar, daveOnLife } from '../career/dave.js';

const $ = (sel) => document.querySelector(sel);
const _at = new THREE.Vector3();
const CHAT_SECONDS = 9; // how long he lets a thought sit before the next one
const BLINKS = ['plain', 'flat', 'bored', 'aside', 'think']; // faces close enough to his shut-eyed one

export class Shop {
  constructor(game, screens) {
    this.game = game;
    this.screens = screens;
    this.tier = 'street';
    this.brand = null; // null: every brand
    this.picked = CARS.find((c) => c.price)?.id;
    this.said = 0;
    screens.garage.orbitControls($('#scr-shop'));
  }

  get level() { return levelFor(this.game.save.career.xp); }
  owned(id) { return this.game.save.garage.owned.includes(id); }

  open() {
    this.fill();
    this.say();
  }

  // Something about the car in front of him, then a bit about himself, until
  // you leave. He only talks while the Shop is the open screen.
  say(onCar = true) {
    clearTimeout(this.chat);
    if (this.screens.top && this.screens.top !== 'shop') return;
    this.said++;
    this.talk(onCar ? daveOnCar(this.picked, this.said) : daveOnLife(this.said));
    this.chat = setTimeout(() => this.say(this.said % 3 === 0), CHAT_SECONDS * 1000);
  }

  // His words in the bubble, his face in the window, and a blink now and then
  // when the face he is pulling has open eyes to shut.
  talk({ mood, text }) {
    $('#dave-say').textContent = text;
    const lot = this.game.lot;
    lot?.setDave(mood);
    clearTimeout(this.blinkAt);
    if (!BLINKS.includes(mood)) return;
    const blink = () => {
      this.blinkAt = setTimeout(() => {
        lot?.setDave('shut');
        this.blinkAt = setTimeout(() => { lot?.setDave(mood); blink(); }, 130);
      }, 2200 + Math.random() * 3200);
    };
    blink();
  }

  // His bubble hangs under the window he is in, wherever that is on screen, and
  // stays on the screen when the view swings away.
  place(at, camera) {
    const el = $('#dave-say'), p = _at.copy(at).project(camera), W = window.innerWidth, H = window.innerHeight;
    const x = (p.x + 1) / 2 * W, y = (1 - p.y) / 2 * H, w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(8, Math.min(W - w - 8, x - w / 2)), top = Math.max(70, Math.min(H - h - 8, y + 6));
    el.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
    el.style.setProperty('--tail', `${Math.max(14, Math.min(w - 14, x - left)).toFixed(1)}px`);
  }

  // The car on the lot follows the card you pick. Leaving, the game goes back
  // to the car you own (Screens.showEl).
  look(id) {
    this.picked = id;
    this.game.showCar(id);
    this.game.orbitReset();
    this.fill();
    this.say();
  }

  fill() {
    const tiers = $('#shop-tiers');
    tiers.innerHTML = '';
    for (const t of TIERS) {
      const b = document.createElement('button');
      const shut = this.level < t.level;
      b.className = `tier${t.id === this.tier ? ' on' : ''}${shut ? ' shut' : ''}`;
      b.innerHTML = `<span>${t.name}</span>${shut ? `<small>Level ${t.level}</small>` : ''}`;
      b.addEventListener('click', () => { this.tier = t.id; this.brand = null; this.fill(); });
      tiers.appendChild(b);
    }
    const cars = CARS.filter((c) => c.tier === this.tier);
    const brands = $('#shop-brands');
    brands.innerHTML = '';
    for (const name of [null, ...new Set(cars.map((c) => c.make))]) {
      const b = document.createElement('button');
      b.className = `brand-tab${name === this.brand ? ' on' : ''}`;
      b.textContent = name || 'All brands';
      b.addEventListener('click', () => { this.brand = name; this.fill(); });
      brands.appendChild(b);
    }
    const grid = $('#shop-grid');
    grid.innerHTML = '';
    const shown = cars.filter((c) => !this.brand || c.make === this.brand).sort((a, b) => a.price - b.price);
    if (!shown.some((c) => c.id === this.picked)) this.picked = shown[0]?.id;
    if (this.picked) this.game.showCar(this.picked);
    for (const c of shown) {
      const card = carCard(c, { owned: this.owned(c.id), on: c.id === this.picked });
      card.addEventListener('click', () => this.look(c.id));
      grid.appendChild(card);
    }
    if (!shown.length) for (let i = 0; i < 4; i++) grid.appendChild(lockedCard('To be continued'));
    this.fillInfo();
  }

  fillInfo() {
    const el = $('#shop-info');
    const c = CARS.find((x) => x.id === this.picked && x.tier === this.tier);
    if (!c) {
      const t = TIERS.find((x) => x.id === this.tier);
      el.innerHTML = `<div class="ttl"><span>${t.name}</span></div><p class="big-note">To be continued</p><p class="muted small">${t.name} opens at level ${t.level}. The cars are still on the way.</p>`;
      return;
    }
    const money = this.game.save.career.cr, have = this.owned(c.id);
    el.innerHTML = `<div class="ttl"><span>${c.make}</span></div>`
      + `<div class="car-name"><span class="sub">${c.year} · ${c.code}</span><span class="name">${c.model}</span></div>`
      + `<p class="muted small">${c.blurb}</p><div class="stats"></div><div class="shop-buy"></div>`;
    fillStats(el.querySelector('.stats'), buildSpec(c), this.game.save.settings.units);
    const buy = document.createElement('button');
    buy.className = 'btn go pri';
    if (have) { buy.textContent = 'Owned'; buy.disabled = true; buy.classList.remove('pri'); }
    else {
      buy.textContent = cr(c.price);
      if (money < c.price) { buy.classList.remove('pri'); buy.classList.add('poor'); }
      buy.addEventListener('click', () => this.ask(c));
    }
    el.querySelector('.shop-buy').appendChild(buy);
  }

  ask(c) {
    const money = this.game.save.career.cr;
    if (money < c.price) {
      this.game.audio.ui('nope');
      this.screens.window('Not enough CR', `The ${c.model} costs ${cr(c.price)}. You have ${cr(money)}. Win some races.`, [['OK']]);
      return;
    }
    this.screens.window('Buy this car?', `${carTitle(c)} for ${cr(c.price)}. You would have ${cr(money - c.price)} left.`, [
      ['Buy it', () => this.buy(c), true], ['Not yet'],
    ]);
  }

  buy(c) {
    const save = this.game.save;
    save.career.cr -= c.price;
    save.garage.owned.push(c.id);
    this.game.audio.ui('cash');
    this.screens.pickCar(c.id);
    this.game.saveNow();
    this.screens.wallet();
    this.fill();
    this.screens.window('It\'s yours', `The ${c.model} is in your garage, and it's the car you'll race next.`, [['Nice']]);
  }
}
