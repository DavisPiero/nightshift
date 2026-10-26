// Menu sounds, made in code. Each kind of action has its own voice, so the
// ear learns them: a soft tick when moving between buttons, a bright blip to
// pick something, a falling blip to go back, a rising run to move on, a
// revving chord and whoosh to start a race, a ratchet clack to fit a part, a
// spray hiss for paint, a pop when a garage pop-up opens. A little random
// pitch keeps repeats from sounding like a machine gun.

const env = (g, t, peak, attack, release) => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
};

function tone(ctx, out, { type = 'square', f0, f1 = f0, t = 0, dur = 0.08, peak = 0.1, lp = 4000 }) {
  const at = ctx.currentTime + t;
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
  const g = ctx.createGain();
  env(g, at, peak, 0.004, dur);
  o.connect(f).connect(g).connect(out);
  o.start(at); o.stop(at + dur + 0.05);
}

function hiss(ctx, out, noise, { t = 0, dur = 0.1, peak = 0.1, type = 'bandpass', f0 = 3000, f1 = f0, q = 1 }) {
  const at = ctx.currentTime + t;
  const s = ctx.createBufferSource(); s.buffer = noise;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const g = ctx.createGain();
  env(g, at, peak, 0.005, dur);
  s.connect(f).connect(g).connect(out);
  s.start(at, Math.random()); s.stop(at + dur + 0.05);
}

export function playUi(ctx, out, noise, kind) {
  const r = 1 + (Math.random() - 0.5) * 0.06;
  switch (kind) {
    case 'move':
      tone(ctx, out, { type: 'triangle', f0: 1900 * r, dur: 0.025, peak: 0.035 });
      break;
    case 'select':
      tone(ctx, out, { f0: 880 * r, f1: 1320 * r, dur: 0.06, peak: 0.06, lp: 3000 });
      break;
    case 'back':
      tone(ctx, out, { f0: 700 * r, f1: 420 * r, dur: 0.08, peak: 0.06, lp: 2200 });
      break;
    case 'confirm':
      for (const [i, f] of [523, 659, 988].entries()) tone(ctx, out, { f0: f * r, t: i * 0.045, dur: 0.07, peak: 0.07, lp: 3500 });
      break;
    case 'race':
      // A low revving chord under a whoosh, like an engine catching.
      for (const f of [110, 165, 220]) tone(ctx, out, { type: 'sawtooth', f0: f, f1: f * 2.2, dur: 0.45, peak: 0.07, lp: 1400 });
      hiss(ctx, out, noise, { dur: 0.5, peak: 0.12, f0: 600, f1: 5000, q: 0.8 });
      break;
    case 'fit':
      // A ratchet: three quick clacks and a low thunk.
      for (let i = 0; i < 3; i++) hiss(ctx, out, noise, { t: i * 0.035, dur: 0.02, peak: 0.14, f0: 2400 * r, q: 6 });
      tone(ctx, out, { type: 'sine', f0: 140, f1: 70, t: 0.11, dur: 0.12, peak: 0.16, lp: 800 });
      break;
    case 'paint':
      hiss(ctx, out, noise, { dur: 0.16, peak: 0.07, type: 'highpass', f0: 5000 * r, f1: 3500 * r, q: 0.7 });
      break;
    case 'tab':
      tone(ctx, out, { type: 'sine', f0: 320 * r, f1: 760 * r, dur: 0.07, peak: 0.1, lp: 2000 });
      break;
    case 'close':
      tone(ctx, out, { type: 'sine', f0: 700 * r, f1: 300 * r, dur: 0.07, peak: 0.08, lp: 2000 });
      break;
    case 'toggle':
      tone(ctx, out, { type: 'square', f0: 1200 * r, dur: 0.018, peak: 0.05, lp: 2500 });
      tone(ctx, out, { type: 'square', f0: 1600 * r, t: 0.03, dur: 0.018, peak: 0.04, lp: 2500 });
      break;
    case 'nope':
      tone(ctx, out, { type: 'square', f0: 140, dur: 0.12, peak: 0.06, lp: 600 });
      break;
  }
}
