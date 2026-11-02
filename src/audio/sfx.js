// One-off sounds, all made in code, with several versions of each so the ear
// never hears the same crash twice: walls, cars touching, the handbrake, a rival
// going past, the phone and laptop, the till, people talking. `v` is 0..1, how hard.

import { tone, hiss } from './ui-sounds.js';

const rand = (a, b) => a + Math.random() * (b - a);
const last = {};
// One of n versions, never the same one twice running.
function pick(kind, n) {
  let i = Math.floor(Math.random() * n);
  if (i === last[kind]) i = (i + 1) % n;
  last[kind] = i;
  return i;
}

// Struck metal: partials that do not line up, each ringing out on its own.
function metal(ctx, out, freqs, { t = 0, dur = 0.3, peak = 0.1 }) {
  for (const f of freqs) tone(ctx, out, { type: 'sine', f0: f * rand(0.98, 1.02), f1: f * 0.97, t, dur: dur * rand(0.6, 1), peak: peak * rand(0.5, 1), lp: 9000 });
}

// The weight of a hit: a low drop and a dull burst.
function body(ctx, out, noise, v, f0 = 120) {
  tone(ctx, out, { type: 'sine', f0: f0 * rand(0.85, 1.15), f1: 42, dur: 0.14 + v * 0.2, peak: 0.3 + v * 0.55, lp: 600 });
  hiss(ctx, out, noise, { dur: 0.1 + v * 0.18, peak: 0.2 + v * 0.5, type: 'lowpass', f0: 500 + v * 900, f1: 180, q: 0.7 });
}

const crunch = (ctx, out, noise, v, n = 5) => {
  for (let i = 0; i < n; i++) hiss(ctx, out, noise, { t: i * rand(0.012, 0.03), dur: rand(0.015, 0.05), peak: (0.1 + v * 0.22) * rand(0.5, 1), f0: rand(800, 3200), q: rand(1, 4) });
};

const FX = {
  // Into a wall or barrier.
  wall(ctx, out, noise, v) {
    body(ctx, out, noise, v);
    if (v < 0.25) { hiss(ctx, out, noise, { dur: 0.02, peak: 0.14, f0: rand(1500, 3000), q: 2 }); return; }
    const m = rand(0.85, 1.15);
    switch (pick('wall', 5)) {
      case 0: crunch(ctx, out, noise, v, 7); break;
      case 1: metal(ctx, out, [410 * m, 687 * m, 1130 * m, 1510 * m], { dur: 0.3 + v * 0.3, peak: 0.08 + v * 0.1 }); break;
      case 2: // the guard rail flexes and hums
        metal(ctx, out, [140 * m, 233 * m, 377 * m], { dur: 0.5 + v * 0.3, peak: 0.12 + v * 0.14 }); crunch(ctx, out, noise, v, 3); break;
      case 3: // bits of trim rattling
        for (let i = 0; i < 8; i++) hiss(ctx, out, noise, { t: rand(0, 0.28), dur: 0.012, peak: 0.1 + v * 0.1, type: 'highpass', f0: rand(2200, 5000), q: 1 });
        crunch(ctx, out, noise, v, 3); break;
      default: // something small and glassy goes
        crunch(ctx, out, noise, v, 4);
        for (let i = 0; i < 6; i++) tone(ctx, out, { type: 'triangle', f0: rand(3000, 7500), t: rand(0.02, 0.2), dur: 0.03, peak: 0.03 + v * 0.03, lp: 11000 });
    }
  },
  // Two cars touching: sheet metal and plastic, duller than a wall.
  knock(ctx, out, noise, v) {
    body(ctx, out, noise, v * 0.8, 150);
    const m = rand(0.85, 1.2);
    if (v < 0.2) { metal(ctx, out, [320 * m, 510 * m], { dur: 0.09, peak: 0.08 }); return; }
    switch (pick('knock', 4)) {
      case 0: metal(ctx, out, [262 * m, 391 * m, 611 * m], { dur: 0.18 + v * 0.15, peak: 0.1 + v * 0.1 }); break;
      case 1: metal(ctx, out, [190 * m, 347 * m, 480 * m, 905 * m], { dur: 0.14 + v * 0.1, peak: 0.09 + v * 0.1 }); crunch(ctx, out, noise, v, 2); break;
      case 2: crunch(ctx, out, noise, v, 5); break;
      default: hiss(ctx, out, noise, { dur: 0.16, peak: 0.12 + v * 0.12, f0: rand(1800, 2800), f1: 900, q: 3 }); metal(ctx, out, [300 * m, 455 * m], { dur: 0.12, peak: 0.09 }); // a side-swipe
    }
  },
  // The lever: a ratchet you can hear from inside the car.
  ratchet(ctx, out, noise) {
    const f = rand(1800, 2600);
    for (let i = 0; i < 4; i++) hiss(ctx, out, noise, { t: i * 0.028, dur: 0.012, peak: 0.13, f0: f, q: 7 });
    tone(ctx, out, { type: 'sine', f0: 200, f1: 110, t: 0.1, dur: 0.05, peak: 0.08, lp: 800 });
  },
  // The tail letting go.
  // A kerb under the tyres.
  kerb(ctx, out, noise, v) {
    hiss(ctx, out, noise, { dur: 0.03, peak: 0.1 + v * 0.14, type: 'lowpass', f0: 340, q: 1 });
    tone(ctx, out, { type: 'sine', f0: rand(72, 96), dur: 0.03, peak: 0.1 + v * 0.12, lp: 300 });
  },
  // A car going past. v: how close, pan: -1 left to 1 right.
  whoosh(ctx, out, noise, v, pan = 0) {
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan; p.connect(out); }
    const to = p || out, f = rand(380, 620), dur = rand(0.4, 0.6);
    hiss(ctx, to, noise, { dur: dur * 0.5, peak: 0.2 + v * 0.3, f0: f, f1: f * 3.2, q: 1.2 });
    hiss(ctx, to, noise, { t: dur * 0.4, dur: dur * 0.6, peak: 0.2 + v * 0.3, f0: f * 3, f1: f * 0.7, q: 1.2 });
    if (p) setTimeout(() => p.disconnect(), 1500);
  },
  // NOS opening.
  nos(ctx, out, noise) {
    hiss(ctx, out, noise, { dur: 0.4, peak: 0.2, type: 'highpass', f0: rand(2600, 3400), f1: 1500, q: 0.7 });
    tone(ctx, out, { type: 'sine', f0: 90, f1: 55, dur: 0.25, peak: 0.3, lp: 400 });
  },

  // --- things in your hands ---
  // The phone flips open: plastic, a hinge that snaps home, a little tune.
  'phone-open'(ctx, out, noise) {
    hiss(ctx, out, noise, { dur: 0.1, peak: 0.05, f0: 1400, f1: 3200, q: 1 });
    hiss(ctx, out, noise, { t: 0.16, dur: 0.015, peak: 0.2, f0: rand(2400, 3000), q: 3 });
    tone(ctx, out, { type: 'sine', f0: 200, f1: 120, t: 0.16, dur: 0.05, peak: 0.12, lp: 900 });
    const [a, b] = [[880, 1319], [988, 1175], [784, 1175]][pick('phone', 3)];
    tone(ctx, out, { type: 'square', f0: a, t: 0.24, dur: 0.05, peak: 0.03, lp: 2600 });
    tone(ctx, out, { type: 'square', f0: b, t: 0.3, dur: 0.07, peak: 0.03, lp: 2600 });
  },
  'phone-close'(ctx, out, noise) {
    hiss(ctx, out, noise, { dur: 0.05, peak: 0.05, f0: 2800, f1: 1200, q: 1 });
    hiss(ctx, out, noise, { t: 0.06, dur: 0.02, peak: 0.26, f0: rand(1500, 2100), q: 2 });
    tone(ctx, out, { type: 'sine', f0: 170, f1: 90, t: 0.06, dur: 0.07, peak: 0.2, lp: 700 });
  },
  // The keypad's two tones, a different key each time.
  'phone-key'(ctx, out) {
    const lo = [697, 770, 852, 941][Math.floor(Math.random() * 4)], hi = [1209, 1336, 1477][Math.floor(Math.random() * 3)];
    tone(ctx, out, { type: 'sine', f0: lo, dur: 0.06, peak: 0.05, lp: 4000 });
    tone(ctx, out, { type: 'sine', f0: hi, dur: 0.06, peak: 0.05, lp: 4000 });
  },
  // Calling someone: two rings down the line.
  'phone-ring'(ctx, out) {
    for (const at of [0, 0.5]) for (const f of [440, 480]) tone(ctx, out, { type: 'sine', f0: f, t: at, dur: 0.34, peak: 0.035, lp: 2000 });
  },
  // A message arriving.
  'phone-mail'(ctx, out) {
    const m = [[1319, 1568, 2093], [1175, 1760], [1568, 1319, 1568]][pick('mail', 3)];
    m.forEach((f, i) => tone(ctx, out, { type: 'square', f0: f, t: i * 0.09, dur: 0.07, peak: 0.03, lp: 3000 }));
  },
  // The lid coming up: a stiff hinge, then the keys settling.
  'laptop-open'(ctx, out, noise) {
    for (let i = 0; i < 6; i++) hiss(ctx, out, noise, { t: i * rand(0.03, 0.05), dur: 0.02, peak: 0.05, f0: rand(500, 1100), q: 5 });
    tone(ctx, out, { type: 'sine', f0: 130, f1: 80, t: 0.3, dur: 0.07, peak: 0.1, lp: 500 });
    tone(ctx, out, { type: 'sine', f0: 660, t: 0.36, dur: 0.1, peak: 0.02, lp: 1800 });
    tone(ctx, out, { type: 'sine', f0: 990, t: 0.44, dur: 0.16, peak: 0.02, lp: 1800 });
  },
  'laptop-close'(ctx, out, noise) {
    hiss(ctx, out, noise, { dur: 0.1, peak: 0.05, f0: 900, f1: 500, q: 1 });
    tone(ctx, out, { type: 'sine', f0: 150, f1: 70, t: 0.1, dur: 0.1, peak: 0.24, lp: 500 });
    hiss(ctx, out, noise, { t: 0.1, dur: 0.02, peak: 0.1, f0: 1400, q: 2 });
  },
  'laptop-key'(ctx, out, noise) {
    hiss(ctx, out, noise, { dur: 0.012, peak: 0.1, f0: rand(1800, 3400), q: 2 });
    tone(ctx, out, { type: 'sine', f0: rand(140, 220), dur: 0.02, peak: 0.05, lp: 500 });
  },
  // Paying: the till, then the keys handed over.
  buy(ctx, out, noise) {
    for (const [i, f] of [1568, 2093].entries()) tone(ctx, out, { type: 'triangle', f0: f, t: i * 0.08, dur: 0.2, peak: 0.09, lp: 7000 });
    hiss(ctx, out, noise, { t: 0.2, dur: 0.05, peak: 0.12, f0: 1700, q: 2 });
    tone(ctx, out, { type: 'sine', f0: 120, f1: 70, t: 0.2, dur: 0.1, peak: 0.16, lp: 500 });
    for (let i = 0; i < 9; i++) tone(ctx, out, { type: 'triangle', f0: rand(3200, 6400), t: 0.42 + rand(0, 0.4), dur: 0.03, peak: 0.02, lp: 11000 });
  },
  // One sound of someone talking; v sets how deep their voice is.
  voice(ctx, out, noise, v) {
    const f = (130 + v * 240) * rand(0.86, 1.2);
    tone(ctx, out, { type: 'square', f0: f, f1: f * rand(0.8, 1.15), dur: rand(0.03, 0.06), peak: 0.016, lp: 900 });
  },
  // A screen sliding in.
  swish(ctx, out, noise) {
    hiss(ctx, out, noise, { dur: 0.13, peak: 0.022, f0: rand(900, 1400), f1: rand(2600, 3400), q: 0.8 });
  },
};

export const hasFx = (kind) => kind in FX;
export const playFx = (ctx, out, noise, kind, v = 1, pan = 0) => FX[kind](ctx, out, noise, v, pan);
