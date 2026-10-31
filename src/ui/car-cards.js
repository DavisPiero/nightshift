// The car card: the same picture, type and layout everywhere a car is shown
// (the shop, the car pick). The pictures come from tools/car-cards.mjs, all
// from one camera on one background, so a wall of cards always looks like a set.

import { carStats } from '../vehicles/stats.js';
import { buildSpec } from '../vehicles/tuning.js';
import { cr } from '../career/career.js';

export function carCard(car, { owned = false, on = false, foot = null } = {}) {
  const r = carStats(buildSpec(car));
  const b = document.createElement('button');
  b.className = `card${on ? ' on' : ''}${owned ? ' owned' : ''}`;
  b.dataset.car = car.id;
  b.innerHTML = `<span class="c-name">${car.model}</span><span class="c-sub">${car.year} ${car.make}</span>`
    + `<img class="c-art" src="assets/cars/cards/${car.id}.png" alt="" draggable="false">`
    + `<span class="c-foot"><span class="c-tag t-${car.tier}">${car.tier === 'street' ? 'Street' : car.tier}</span>`
    + `<span class="c-price">${foot ?? (owned ? 'Owned' : cr(car.price))}</span><span class="cls cls-${r.cls} mini">${r.cls}</span><span class="c-pi">${r.pi}</span></span>`;
  return b;
}

// An empty card for a car still to come.
export function lockedCard(text) {
  const b = document.createElement('div');
  b.className = 'card locked';
  b.innerHTML = `<span class="c-name">?</span><span class="c-sub">${text}</span><span class="c-art lock"></span><span class="c-foot"><span class="c-tag">Locked</span></span>`;
  return b;
}
