// All game sound, made in code with Web Audio (no recordings yet).
//
// The engine is several layers, not one tone pitched up:
//  - two exhaust voices with a rich, low harmonic mix (a "low rpm" and a
//    "high rpm" voice, cross-faded by rpm), each through a filter that opens
//    with throttle, then soft distortion for grit;
//  - a pulse at crank speed that makes the note lumpy like a real engine;
//  - a sub-bass body that swells under load;
//  - intake roar (filtered noise) on throttle;
//  - exhaust rasp: noise chopped at firing speed, for the grit of a real
//    exhaust under load;
//  - a turbo blow-off when you lift off at high rpm, and backfires (a crack,
//    a low bang and an echo, timed by graphics/effects.js so they line up
//    with the flames);
//  - gear changes: a mechanical clack, the note cutting and coming back
//    with a bark on the way up, a throttle blip on the way down;
//  - a rev limiter that bounces (the sound chops) rather than just quietens.
// Ambience: rain on the road and roof, and a low night hum.
// The car's update() feeds rpm, throttle and load. To switch to real engine
// recordings later, replace EngineVoice with a sample player that takes the
// same update() call.
//
// Menu sounds are in ui-sounds.js; they go round the world sounds, so the
// pause menu can hush the car and still click.
//
// Browsers only allow sound after a tap or key press, so start() is called
// from the first one.

import { playUi } from './ui-sounds.js';

// Each car's engine has a profile (spec.sound): cylinders, how lumpy it
// burbles (a cross-plane V8 lopes, a straight six is smooth), how dark it is,
// how much sub-bass and how much top-end rasp.
const DEFAULT_SOUND = { cylinders: 6, burble: 0.2, pitch: 1, sub: 1, rasp: 1 };

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

export class EngineVoice {
  constructor(ctx, out, noise, sound = DEFAULT_SOUND) {
    this.ctx = ctx;
    this.sound = { ...DEFAULT_SOUND, ...sound };
    const v8 = this.sound.cylinders >= 8;
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

    const voices = v8 ? [
      // V8 low voice: a strong half order (the lope) under a fat fundamental.
      [1.0, 0.8, 0.75, 0.3, 0.35, 0.12, 0.15, 0.05, 0.06, 0.03],
      // V8 high voice: a hoarse, less sharp top end than the six.
      [0.7, 1.0, 0.6, 0.5, 0.35, 0.28, 0.2, 0.14, 0.1, 0.08],
    ] : [
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

    // Exhaust rasp: noise through a band, its level chopped by a square wave
    // at firing speed.
    const rasp = ctx.createBufferSource(); rasp.buffer = noise; rasp.loop = true;
    this.raspFilter = ctx.createBiquadFilter(); this.raspFilter.type = 'bandpass'; this.raspFilter.Q.value = 1.4;
    this.raspGain = ctx.createGain(); this.raspGain.gain.value = 0;
    this.raspChop = ctx.createGain(); this.raspChop.gain.value = 0.5;
    this.raspOsc = ctx.createOscillator(); this.raspOsc.type = 'square';
    const chopDepth = ctx.createGain(); chopDepth.gain.value = 0.5;
    this.raspOsc.connect(chopDepth).connect(this.raspChop.gain);
    rasp.connect(this.raspFilter).connect(this.raspChop).connect(this.raspGain).connect(drive);
    rasp.start(t, 0.3); this.raspOsc.start(t);

    // Turbo whistle (rises with boost) and supercharger whine.
    this.whistle = ctx.createOscillator();
    this.whistle.type = 'sine';
    this.whistleGain = ctx.createGain(); this.whistleGain.gain.value = 0;
    this.whistle.connect(this.whistleGain).connect(this.out);
    this.whistle.start(t);

    this.noise = noise;
    this.lastThrottle = 0;
    this.lastRpm = 0;
    this.dip = 0;          // > 0 just after a gear change
    this.bark = 0;         // > 0 as the power comes back after an upshift
    this.blip = 0;         // > 0 during a downshift's throttle blip
    this.chop = 0;         // the rev limiter's bounce
  }

  update(dt, { rpm, throttle, load, redline, limiter, boost = 0, turbo = false, whine = false, loud = 1 }) {
    const ctx = this.ctx, t = ctx.currentTime, k = 0.03;
    const S = this.sound;
    const firing = rpm / 60 * S.cylinders / 2;
    const base = firing / 2; // the waves are built on half the firing frequency
    const r = Math.min(1, Math.max(0, (rpm - 900) / (redline - 900)));
    const on = Math.max(0, load);

    // Cross-fade low and high voices with rpm.
    const [lo, hi] = this.layers;
    const loMix = Math.cos(r * Math.PI / 2), hiMix = Math.sin(r * Math.PI / 2);
    // A downshift blips the throttle; the power comes back with a bark after
    // an upshift.
    this.blip = Math.max(0, this.blip - dt / 0.18);
    this.bark = Math.max(0, this.bark - dt / 0.25);
    throttle = Math.max(throttle, this.blip * 0.8);
    const level = 0.22 + 0.5 * throttle + 0.15 * r + this.bark * 0.2;
    for (const [L, mix0, open0] of [[lo, loMix, 5], [hi, hiMix, 7]]) {
      const mix = L === hi ? mix0 * S.rasp : mix0;
      const open = open0 * S.pitch;
      L.osc.frequency.setTargetAtTime(base, t, 0.012);
      L.osc2.frequency.setTargetAtTime(base, t, 0.012);
      // Filter opens with throttle: closed and muffled when coasting. The fixed
      // part keeps idle audible on small laptop and iPad speakers.
      L.filter.frequency.setTargetAtTime(base * (2.2 + open * (0.25 + 0.75 * throttle)) + 260, t, k);
      L.gain.gain.setTargetAtTime(mix * level, t, k);
    }
    // The lope: a V8 pulses once every two turns of the crank.
    this.lfo.frequency.setTargetAtTime(rpm / 60 / (S.cylinders >= 8 ? 2 : 1), t, 0.02);
    this.lfoDepth.gain.setTargetAtTime((0.32 - 0.22 * r) * (0.6 + S.burble), t, k);
    this.sub.frequency.setTargetAtTime(base, t, 0.012);
    this.subGain.gain.setTargetAtTime((0.18 + 0.32 * on) * S.sub, t, k);
    this.intakeFilter.frequency.setTargetAtTime(firing * 3.2 + 300, t, k);
    this.intakeGain.gain.setTargetAtTime(throttle * (0.05 + 0.22 * r), t, k);
    this.raspOsc.frequency.setTargetAtTime(firing, t, 0.012);
    this.raspFilter.frequency.setTargetAtTime(900 + firing * 4, t, k);
    this.raspGain.gain.setTargetAtTime((0.04 + 0.16 * on * throttle) * S.rasp, t, k);
    // A gear change dips the note for a moment; this is applied here
    // (rather than scheduled once) so the steady level cannot override it.
    this.dip = Math.max(0, this.dip - dt / 0.2);
    // On the limiter the ignition cuts in and out: the sound chops.
    this.chop = limiter ? (this.chop + dt * 17) % 1 : 0;
    const bounce = limiter ? (this.chop < 0.45 ? 0.35 : 1) : 1;
    this.out.gain.setTargetAtTime(0.9 * bounce * loud * (1 - 0.7 * this.dip) * (1 + this.bark * 0.25), t, 0.006);

    // Turbo: a whistle that rises with boost; a supercharger whines with revs.
    if (turbo) {
      this.whistle.frequency.setTargetAtTime(1600 + 3800 * boost, t, 0.05);
      this.whistleGain.gain.setTargetAtTime(boost * throttle * 0.035, t, 0.05);
    } else if (whine) {
      this.whistle.frequency.setTargetAtTime(rpm / 60 * 9, t, 0.02);
      this.whistleGain.gain.setTargetAtTime(throttle * (0.01 + 0.03 * r), t, 0.05);
    } else this.whistleGain.gain.setTargetAtTime(0, t, 0.05);

    // Lift off on boost: the blow-off valve and the chatter of turbo flutter.
    if (turbo && this.lastThrottle > 0.7 && throttle < 0.3 && boost > 0.4) {
      this.blowOff(r);
      this.flutter(boost);
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

  // A backfire: a sharp crack, a low bang that drops in pitch, and a quiet
  // echo off the buildings a moment later. Sometimes a double "pa-pap".
  crackle(v) {
    const ctx = this.ctx, t = ctx.currentTime;
    const bang = (at, s) => {
      this.burstAt(at, 0.018, 'highpass', 1800 + Math.random() * 1500, 0.7, s * 0.9);
      this.burstAt(at, 0.06, 'bandpass', 420 + Math.random() * 380, 1.2, s * 0.7);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(95 + Math.random() * 30, at);
      o.frequency.exponentialRampToValueAtTime(38, at + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(s * 0.9, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.14);
      o.connect(g).connect(this.out);
      o.start(at); o.stop(at + 0.16);
      this.burstAt(at + 0.07 + Math.random() * 0.04, 0.12, 'lowpass', 700, 0.6, s * 0.18); // the echo
    };
    bang(t, v);
    if (Math.random() < 0.3) bang(t + 0.045 + Math.random() * 0.03, v * 0.6);
  }

  burstAt(at, duration, filterType, freq, q, gain) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + duration);
    src.connect(f).connect(g).connect(this.out);
    src.start(at, Math.random()); src.stop(at + duration + 0.05);
  }
  blowOff(r) { this.burst(0.45, 'bandpass', 2600, 2.5, 0.12 + r * 0.1, 900); }

  // Turbo flutter: a fast chatter of air as the throttle shuts on boost.
  flutter(boost) {
    const ctx = this.ctx, t = ctx.currentTime, len = 0.35 + boost * 0.25;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.value = 0;
    const rate = 17 + Math.random() * 5;
    for (let i = 0; i < len * rate; i++) {
      const at = t + i / rate, a = 0.22 * boost * (1 - i / (len * rate));
      g.gain.setValueAtTime(a, at);
      g.gain.setValueAtTime(a * 0.15, at + 0.5 / rate);
    }
    g.gain.setValueAtTime(0, t + len);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random()); src.stop(t + len + 0.05);
  }

  // A gear change: the gearbox clacks (two quick metal clicks and a thud),
  // the note cuts; going up, the power comes back with a bark (and a turbo
  // car chuffs a little air); going down, the throttle blips.
  shift(up, turbo = false) {
    const t = this.ctx.currentTime;
    this.dip = 1;
    this.burstAt(t, 0.025, 'bandpass', 2300, 3, 0.16);
    this.burstAt(t + 0.03, 0.03, 'bandpass', 1300, 3, 0.12);
    this.burstAt(t, 0.09, 'lowpass', 170, 0.7, up ? 0.4 : 0.3);
    if (up) {
      setTimeout(() => { this.bark = 1; }, 140);
      if (turbo) this.burst(0.18, 'bandpass', 3200, 2, 0.06, 1400);
    } else this.blip = 1;
  }
}

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volumes = { master: 0.8, engine: 1, effects: 0.8, ambience: 0.7 };
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
    this.world = ctx.createGain(); // everything but the menu sounds
    this.world.connect(this.master);
    this.engineBus = ctx.createGain();
    this.fxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.uiBus = ctx.createGain();
    this.engineBus.connect(this.world);
    this.fxBus.connect(this.world);
    this.ambBus.connect(this.world);
    this.uiBus.connect(this.master);
    this.engineLevel = ctx.createGain(); // lowered behind the menus
    this.engineLevel.connect(this.engineBus);
    this.noise = noiseBuffer(ctx);
    this.engine = new EngineVoice(ctx, this.engineLevel, this.noise, this.sound);

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

    // Wet tyres hiss instead of squealing.
    const hs = ctx.createBufferSource(); hs.buffer = this.noise; hs.loop = true;
    this.hissFilter = ctx.createBiquadFilter(); this.hissFilter.type = 'highpass'; this.hissFilter.frequency.value = 2500;
    this.hissGain = ctx.createGain(); this.hissGain.gain.value = 0;
    hs.connect(this.hissFilter).connect(this.hissGain).connect(this.fxBus);
    hs.start(0, 0.5);

    // Rain: a wash of filtered noise plus a patter of drops.
    const rn = ctx.createBufferSource(); rn.buffer = this.noise; rn.loop = true;
    const rf = ctx.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 1800; rf.Q.value = 0.4;
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0;
    rn.connect(rf).connect(this.rainGain).connect(this.ambBus);
    rn.start(0, 1);

    // Night hum: a faint low drone.
    this.hum = ctx.createOscillator(); this.hum.type = 'sine'; this.hum.frequency.value = 55;
    this.humGain = ctx.createGain(); this.humGain.gain.value = 0;
    this.hum.connect(this.humGain).connect(this.ambBus);
    this.hum.start();

    this.applyVolumes();
  }

  // Pick the engine sound for a car (rebuilds the engine voice if sound is running).
  setEngine(spec) {
    this.sound = spec.sound;
    if (!this.ctx || !this.engine) return;
    const old = this.engine;
    old.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    setTimeout(() => old.out.disconnect(), 300);
    this.engine = new EngineVoice(this.ctx, this.engineLevel, this.noise, this.sound);
  }

  setVolumes(v) { this.volumes = { ...this.volumes, ...v }; this.applyVolumes(); }
  setMuted(m) { this.muted = m; this.applyVolumes(); }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : this.volumes.master;
    this.engineBus.gain.value = this.volumes.engine;
    this.fxBus.gain.value = this.volumes.effects;
    this.ambBus.gain.value = this.volumes.ambience;
    this.uiBus.gain.value = this.volumes.effects;
  }

  // A menu sound (see ui-sounds.js for the kinds).
  ui(kind) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    playUi(this.ctx, this.uiBus, this.noise, kind);
  }

  // Paused: the car and the world go quiet, the menu sounds still play.
  hush(on) {
    if (!this.ctx) return;
    this.world.gain.setTargetAtTime(on ? 0 : 1, this.ctx.currentTime, 0.03);
  }

  suspend() { this.ctx?.suspend(); }
  resume() { this.ctx?.resume(); }

  // level: 1 when driving, lower behind the menus. weather: 'clear' | 'rain' |
  // 'fog' | 'snow'. patch: 0..1, how far into a downpour (louder rain).
  update(dt, v, weather = 'clear', level = 1, patch = 0) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    this.engineLevel.gain.setTargetAtTime(level, t, 0.3);
    const wet = weather === 'rain' || weather === 'snow';
    const raining = weather === 'rain';
    this.engine.update(dt, {
      rpm: v.rpm, throttle: v.throttle, load: v.load,
      redline: v.spec.redline, limiter: v.limiter,
      boost: v.boost, turbo: !!v.spec.turbo, whine: !!v.spec.whine, loud: v.spec.exhaustVolume ?? 1,
    });
    if (v.gearbox.shiftCount !== this._shifts) {
      if (this._shifts !== undefined && v.gearbox.gear > 0) this.engine.shift(v.gearbox.lastShift > 0, !!v.spec.turbo);
      this._shifts = v.gearbox.shiftCount;
    }
    const slide = Math.max(v.rearSlide, v.frontSlide * 0.7);
    // Squeal when sliding, and when braking right at the limit at speed.
    const hardStop = v.brakeGrip > 0.85 && v.speed > 12 ? (v.brakeGrip - 0.85) * 4 : 0;
    const squeal = v.speed > 4 ? Math.min(1, Math.max(slide, hardStop)) * Math.min(1, v.speed / 15) : 0;
    this.squealGain.gain.setTargetAtTime(squeal * (wet ? 0.07 : 0.22) * level, t, 0.05);
    this.hissGain.gain.setTargetAtTime(wet ? Math.min(1, v.speed / 30) * 0.12 * level : 0, t, 0.1);
    this.rainGain.gain.setTargetAtTime(raining ? 0.16 * (1 + patch * 0.8) : 0, t, 0.5);
    this.humGain.gain.setTargetAtTime(0.025, t, 0.5);
    if (raining && Math.random() < dt * 9 * (1 + patch)) this.drop();
    const wobble = 1 + Math.sin(t * 13) * 0.03;
    this.squealFilters[0].frequency.setTargetAtTime(900 * wobble + slide * 150, t, 0.05);
    this.squealFilters[1].frequency.setTargetAtTime(1450 * wobble + slide * 200, t, 0.05);
    const sp = Math.min(1, v.speed / 70);
    this.windGain.gain.setTargetAtTime((sp * sp * 0.25 + sp * 0.03) * level, t, 0.1);
    this.windFilter.frequency.setTargetAtTime(300 + sp * 900, t, 0.1);
  }

  // One exhaust pop (strength 0..1), timed by the flames effect.
  pop(strength) {
    if (!this.engine || this.ctx.state !== 'running') return;
    this.engine.crackle(0.3 + strength * 0.4);
  }

  drop() {
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500 + Math.random() * 3000; f.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05 + Math.random() * 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(f).connect(g).connect(this.ambBus);
    src.start(t, Math.random()); src.stop(t + 0.05);
  }

  impact(speed) {
    if (!this.ctx || speed < 1.5) return;
    const ctx = this.ctx, t = ctx.currentTime;
    // Scraping along a wall touches it every physics step: one sound at a time.
    if (t - (this.lastImpact || 0) < 0.12 && speed < (this.lastImpactSpeed || 0) * 1.5) return;
    this.lastImpact = t; this.lastImpactSpeed = speed;
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
