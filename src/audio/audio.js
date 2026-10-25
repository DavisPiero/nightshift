// All game sound, made in code with Web Audio (no recordings yet).
//
// The engine is several layers, not one tone pitched up:
//  - two exhaust voices with a rich, low harmonic mix (a "low rpm" and a
//    "high rpm" voice, cross-faded by rpm), each through a filter that opens
//    with throttle, then soft distortion for grit;
//  - a pulse at crank speed that makes the note lumpy like a real engine;
//  - a sub-bass body that swells under load;
//  - intake roar (filtered noise) on throttle;
//  - crackles and a turbo blow-off when you lift off at high rpm.
// The car's update() feeds rpm, throttle and load. To switch to real engine
// recordings later, replace EngineVoice with a sample player that takes the
// same update() call.
//
// Browsers only allow sound after a tap or key press, so start() is called
// from the first one.

const CYLINDERS = 6;

function noiseBuffer(ctx, seconds = 2) {
  const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function softClip(amount) {
  const n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

// Harmonic recipe for an exhaust voice, relative to half the firing
// frequency (the half orders give the uneven burble of a real six).
function exhaustWave(ctx, amps) {
  const real = new Float32Array(amps.length + 1), imag = new Float32Array(amps.length + 1);
  amps.forEach((a, i) => { imag[i + 1] = a; real[i + 1] = a * 0.3 * ((i % 3) - 1); });
  return ctx.createPeriodicWave(real, imag);
}

class EngineVoice {
  constructor(ctx, out, noise) {
    this.ctx = ctx;
    const t = ctx.currentTime;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(out);

    const drive = ctx.createWaveShaper();
    drive.curve = softClip(2.2);
    drive.oversample = '2x';
    const post = ctx.createBiquadFilter(); // tame the fizz distortion adds
    post.type = 'lowpass'; post.frequency.value = 3200; post.Q.value = 0.5;
    drive.connect(post).connect(this.out);

    // Lumpy pulse: modulates the exhaust level at crank speed.
    this.lump = ctx.createGain();
    this.lump.gain.value = 1;
    this.lump.connect(drive);
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'triangle';
    this.lfoDepth = ctx.createGain();
    this.lfoDepth.gain.value = 0.25;
    this.lfo.connect(this.lfoDepth).connect(this.lump.gain);
    this.lfo.start(t);

    const voices = [
      // Low-rpm voice: heavy fundamental and half order, little top end.
      [1.0, 0.95, 0.55, 0.35, 0.18, 0.2, 0.08, 0.1, 0.04, 0.05],
      // High-rpm voice: more mid harmonics for a harder edge.
      [0.6, 1.0, 0.7, 0.6, 0.45, 0.4, 0.3, 0.28, 0.2, 0.18, 0.12, 0.1],
    ];
    this.layers = voices.map((amps) => {
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(exhaustWave(ctx, amps));
      // A second, slightly detuned copy thickens it (two exhaust banks).
      const osc2 = ctx.createOscillator();
      osc2.setPeriodicWave(exhaustWave(ctx, amps));
      osc2.detune.value = 7;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.Q.value = 1.6;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(filter); osc2.connect(filter);
      filter.connect(gain).connect(this.lump);
      osc.start(t); osc2.start(t);
      return { osc, osc2, filter, gain };
    });

    // Sub-bass body.
    this.sub = ctx.createOscillator();
    this.sub.type = 'sine';
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0;
    this.sub.connect(this.subGain).connect(this.out);
    this.sub.start(t);

    // Intake roar.
    this.intake = ctx.createBufferSource();
    this.intake.buffer = noise; this.intake.loop = true;
    this.intakeFilter = ctx.createBiquadFilter();
    this.intakeFilter.type = 'bandpass'; this.intakeFilter.Q.value = 0.9;
    this.intakeGain = ctx.createGain(); this.intakeGain.gain.value = 0;
    this.intake.connect(this.intakeFilter).connect(this.intakeGain).connect(this.out);
    this.intake.start(t);

    this.noise = noise;
    this.lastThrottle = 0;
    this.lastRpm = 0;
    this.popCooldown = 0;
  }

  update(dt, { rpm, throttle, load, redline, limiter }) {
    const ctx = this.ctx, t = ctx.currentTime, k = 0.03;
    const firing = rpm / 60 * CYLINDERS / 2;
    const base = firing / 2; // the waves are built on half the firing frequency
    const r = Math.min(1, Math.max(0, (rpm - 900) / (redline - 900)));
    const on = Math.max(0, load);

    // Cross-fade low and high voices with rpm.
    const [lo, hi] = this.layers;
    const loMix = Math.cos(r * Math.PI / 2), hiMix = Math.sin(r * Math.PI / 2);
    const level = 0.22 + 0.5 * throttle + 0.15 * r;
    for (const [L, mix, open] of [[lo, loMix, 5], [hi, hiMix, 7]]) {
      L.osc.frequency.setTargetAtTime(base, t, 0.012);
      L.osc2.frequency.setTargetAtTime(base, t, 0.012);
      // Filter opens with throttle: closed and muffled when coasting. The fixed
      // part keeps idle audible on small laptop and iPad speakers.
      L.filter.frequency.setTargetAtTime(base * (2.2 + open * (0.25 + 0.75 * throttle)) + 260, t, k);
      L.gain.gain.setTargetAtTime(mix * level, t, k);
    }
    this.lfo.frequency.setTargetAtTime(rpm / 60, t, 0.02);
    this.lfoDepth.gain.setTargetAtTime(0.32 - 0.22 * r, t, k);
    this.sub.frequency.setTargetAtTime(base, t, 0.012);
    this.subGain.gain.setTargetAtTime(0.18 + 0.32 * on, t, k);
    this.intakeFilter.frequency.setTargetAtTime(firing * 3.2 + 300, t, k);
    this.intakeGain.gain.setTargetAtTime(throttle * (0.05 + 0.22 * r), t, k);
    this.out.gain.setTargetAtTime(limiter ? 0.6 : 0.9, t, 0.01);

    // Lift off at high rpm: blow-off valve and a few exhaust crackles.
    this.popCooldown -= dt;
    if (this.lastThrottle > 0.7 && throttle < 0.3 && rpm > 4000) this.blowOff(r);
    if (throttle < 0.1 && rpm > 3800 && this.lastRpm > rpm && this.popCooldown <= 0 && Math.random() < 0.08) {
      this.crackle(0.25 + Math.random() * 0.3);
      this.popCooldown = 0.05 + Math.random() * 0.12;
    }
    this.lastThrottle = throttle;
    this.lastRpm = rpm;
  }

  burst(duration, filterType, freq, q, gain, freqEnd) {
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random()); src.stop(t + duration + 0.05);
  }

  crackle(v) { this.burst(0.05, 'bandpass', 500 + Math.random() * 500, 1.5, v * 0.7); }
  blowOff(r) { this.burst(0.45, 'bandpass', 2600, 2.5, 0.12 + r * 0.1, 900); }

  // A short drop in level as the clutch goes in.
  shift() {
    const g = this.out.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.35, t + 0.04);
    g.linearRampToValueAtTime(0.9, t + 0.2);
  }
}

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volumes = { master: 0.8, engine: 1, effects: 0.8 };
  }

  // Must be called from a tap or key press.
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.engineBus = ctx.createGain();
    this.fxBus = ctx.createGain();
    this.engineBus.connect(this.master);
    this.fxBus.connect(this.master);
    this.noise = noiseBuffer(ctx);
    this.engine = new EngineVoice(ctx, this.engineBus, this.noise);

    // Tyre squeal: two resonant noise bands.
    const sq = ctx.createBufferSource(); sq.buffer = this.noise; sq.loop = true;
    this.squealGain = ctx.createGain(); this.squealGain.gain.value = 0;
    this.squealFilters = [950, 1500].map((f) => {
      const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 9;
      sq.connect(b); b.connect(this.squealGain);
      return b;
    });
    this.squealGain.connect(this.fxBus);
    sq.start();

    // Wind and road rumble.
    const wn = ctx.createBufferSource(); wn.buffer = this.noise; wn.loop = true;
    this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'lowpass'; this.windFilter.frequency.value = 500;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    wn.connect(this.windFilter).connect(this.windGain).connect(this.fxBus);
    wn.start();

    this.applyVolumes();
  }

  setVolumes(v) { this.volumes = { ...this.volumes, ...v }; this.applyVolumes(); }
  setMuted(m) { this.muted = m; this.applyVolumes(); }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : this.volumes.master;
    this.engineBus.gain.value = this.volumes.engine;
    this.fxBus.gain.value = this.volumes.effects;
  }

  suspend() { this.ctx?.suspend(); }
  resume() { this.ctx?.resume(); }

  update(dt, v) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    this.engine.update(dt, {
      rpm: v.rpm, throttle: v.throttle, load: v.load,
      redline: v.spec.redline, limiter: v.limiter,
    });
    if (v.gearbox.shiftCount !== this._shifts) {
      if (this._shifts !== undefined) this.engine.shift();
      this._shifts = v.gearbox.shiftCount;
    }
    const slide = Math.max(v.rearSlide, v.frontSlide * 0.7);
    const squeal = v.speed > 4 ? Math.min(1, slide) * Math.min(1, v.speed / 15) : 0;
    this.squealGain.gain.setTargetAtTime(squeal * 0.22, t, 0.05);
    const wobble = 1 + Math.sin(t * 13) * 0.03;
    this.squealFilters[0].frequency.setTargetAtTime(900 * wobble + slide * 150, t, 0.05);
    this.squealFilters[1].frequency.setTargetAtTime(1450 * wobble + slide * 200, t, 0.05);
    const sp = Math.min(1, v.speed / 70);
    this.windGain.gain.setTargetAtTime(sp * sp * 0.25 + sp * 0.03, t, 0.1);
    this.windFilter.frequency.setTargetAtTime(300 + sp * 900, t, 0.1);
  }

  impact(speed) {
    if (!this.ctx || speed < 1.5) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const v = Math.min(1, speed / 15);
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 350 + v * 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25 + v * 0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25 + v * 0.3);
    src.connect(f).connect(g).connect(this.fxBus);
    src.start(t, Math.random()); src.stop(t + 0.7);
    // Metal scrape on top for hard hits.
    if (v > 0.3) {
      const s2 = ctx.createBufferSource(); s2.buffer = this.noise;
      const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = 2400; b.Q.value = 4;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.12 * v, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      s2.connect(b).connect(g2).connect(this.fxBus);
      s2.start(t, Math.random()); s2.stop(t + 0.5);
    }
  }
}
