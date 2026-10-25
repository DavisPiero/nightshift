// The car's class badge, its four 1-10 stats as pixel meters, and the real
// figures behind them. Given a `compare` spec (the stock car, in the garage)
// the meters also show what the build gained (green) or lost (red).

import { carStats } from '../vehicles/stats.js';

const DRIVES = { rwd: 'Rear-wheel drive', awd: 'Four-wheel drive', fwd: 'Front-wheel drive' };

export function fillStats(el, spec, units, compare = null) {
  const s = carStats(spec), b = compare ? carStats(compare) : null;
  const mph = units === 'mph';
  const meter = (v, was = v) => {
    const n = Math.round(v * 2), m = Math.round(was * 2); // 20 pips for 1..10, half steps
    return Array.from({ length: 20 }, (_, i) => {
      const cls = i < Math.min(n, m) ? (i >= 16 ? 'on hot' : 'on') : i < n ? 'on up' : i < m ? 'down' : '';
      return `<i class="${cls}" style="--p:${i}"></i>`;
    }).join('');
  };
  const rows = [
    ['Speed', 'speed', mph ? `${Math.round(s.top / 1.609)} MPH` : `${Math.round(s.top)} KM/H`],
    ['Accel', 'accel', `${(mph ? s.to60 : s.to100).toFixed(1)} S ${mph ? '0-60' : '0-100'}`],
    ['Handling', 'handling', `${s.grip.toFixed(2)} G`],
    ['Braking', 'braking', `${s.brake.toFixed(0)} M`],
  ];
  const diff = b && s.pi !== b.pi ? `<span class="delta ${s.pi > b.pi ? 'up' : 'down'}">${s.pi > b.pi ? '+' : ''}${s.pi - b.pi}</span>` : '';
  el.innerHTML = `<div class="rating"><span class="cls cls-${s.cls}">${s.cls}</span><span class="pi">${s.pi}</span>${diff}`
    + `<span class="muted">${s.hp} HP · ${s.mass} KG · ${DRIVES[spec.drivetrain] || ''}</span></div>`
    + rows.map(([k, key, real]) => `<div class="stat"><span class="k">${k}</span><span class="meter">${meter(s.stats[key], b ? b.stats[key] : s.stats[key])}</span><span class="v">${s.stats[key].toFixed(1)}</span><span class="real">${real}</span></div>`).join('');
}
