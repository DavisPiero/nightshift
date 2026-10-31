// The shop: filter by stage (Street, GT3, Formula) and by brand, a wall of car
// cards, the picked car's numbers on the left with the Buy button. A stage that
// your level has not reached stays locked. Nothing here spends money without a
// yes in a pop-up.

import { CARS, TIERS, carTitle } from '../vehicles/cars.js';
import { levelFor, cr } from '../career/career.js';
import { buildSpec } from '../vehicles/tuning.js';
import { fillStats } from './stats-view.js';
import { carCard, lockedCard } from './car-cards.js';

const $ = (sel) => document.querySelector(sel);

export class Shop {
  constructor(game, screens) {
    this.game = game;
    this.screens = screens;
    this.tier = 'street';
    this.brand = null; // null: every brand
    this.picked = CARS.find((c) => c.price)?.id;
  }

  get level() { return levelFor(this.game.save.career.xp); }
  owned(id) { return this.game.save.garage.owned.includes(id); }

  open() { this.fill(); }

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
    for (const c of shown) {
      const card = carCard(c, { owned: this.owned(c.id), on: c.id === this.picked });
      card.addEventListener('click', () => { this.picked = c.id; this.fill(); });
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
      + `<div class="stamp-brand">${c.make}</div>`
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
