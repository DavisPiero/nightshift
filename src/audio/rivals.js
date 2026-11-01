// The other cars, heard from yours. The nearest few each get a real EngineVoice
// (the same one as your car, with their own car's sound), placed left or right of
// you, fading and dulling with distance, and bent in pitch as they close or drop
// back. Rivals going past whoosh. Fewer voices on an iPad.

import { EngineVoice } from './audio.js';
import { playFx } from './sfx.js';

const HEAR = 110;      // metres: further off than this, nothing
const RETHINK = 0.25;  // seconds between deciding who is nearest
const SOUND_SPEED = 343, DOPPLER = 2.5; // the bend is pushed a little, or you would barely hear it

const voiceCount = () => (navigator.maxTouchPoints > 1 ? 2 : 3);

export class RivalSounds {
  constructor(ctx, out, noise) {
    this.ctx = ctx;
    this.noise = noise;
    this.out = out;
    this.slots = Array.from({ length: voiceCount() }, () => this.slot());
    this.wait = 0;
    this.passed = new Map();
  }

  slot() {
    const { ctx, out } = this, gain = ctx.createGain(), dull = ctx.createBiquadFilter(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    gain.gain.value = 0;
    dull.type = 'lowpass'; dull.frequency.value = 6000;
    dull.connect(gain);
    if (pan) gain.connect(pan).connect(out); else gain.connect(out);
    return { gain, dull, pan, car: null, voice: null, profile: null };
  }

  silence() {
    if (!this.live) return;
    this.live = false;
    const t = this.ctx.currentTime;
    for (const s of this.slots) { s.gain.gain.setTargetAtTime(0, t, 0.1); s.car = null; }
    this.passed.clear();
  }

  // Hand the nearest cars to the voices; a car that keeps its voice is not disturbed.
  assign(cars, me) {
    const near = cars.filter((c) => !c.isPlayer).map((c) => ({ c, d: Math.hypot(c.vehicle.x - me.x, c.vehicle.z - me.z) }))
      .filter((n) => n.d < HEAR).sort((a, b) => a.d - b.d).slice(0, this.slots.length).map((n) => n.c);
    for (const s of this.slots) if (s.car && !near.includes(s.car)) s.car = null;
    for (const c of near) {
      if (this.slots.some((s) => s.car === c)) continue;
      const s = this.slots.find((x) => !x.car);
      s.car = c;
      const sound = c.vehicle.spec.sound;
      if (s.profile !== sound) { // this car sounds different: a new voice
        s.voice?.dispose();
        s.voice = new EngineVoice(this.ctx, s.dull, this.noise, sound);
        s.profile = sound;
      }
    }
  }

  // cars: everyone in the race (or nothing). me: your Vehicle.
  update(dt, cars, me) {
    if (!cars) { this.silence(); return; }
    this.live = true;
    this.wait -= dt;
    if (this.wait <= 0) { this.wait = RETHINK; this.assign(cars, me); }
    const t = this.ctx.currentTime, fx = Math.sin(me.heading), fz = Math.cos(me.heading);
    for (const s of this.slots) {
      if (!s.car) { s.gain.gain.setTargetAtTime(0, t, 0.15); continue; }
      const v = s.car.vehicle, dx = v.x - me.x, dz = v.z - me.z, d = Math.max(1, Math.hypot(dx, dz));
      const side = (dx * fz - dz * fx) / d, along = (dx * fx + dz * fz) / d; // +1 left of you, +1 ahead of you
      const closing = ((v.vx - me.vx) * dx + (v.vz - me.vz) * dz) / -d;
      const bend = SOUND_SPEED / (SOUND_SPEED - Math.max(-120, Math.min(120, closing * DOPPLER)));
      s.voice.update(dt, { rpm: v.rpm * bend, throttle: v.throttle, load: v.load, redline: v.spec.redline, limiter: v.limiter, boost: v.boost, turbo: !!v.spec.turbo, whine: !!v.spec.whine, loud: v.spec.exhaustVolume ?? 1 });
      s.gain.gain.setTargetAtTime(0.4 / (1 + (d / 16) ** 2) * (1 - 0.25 * Math.max(0, -along)), t, 0.06);
      s.dull.frequency.setTargetAtTime(700 + 7000 / (1 + d / 9), t, 0.08);
      s.pan?.pan.setTargetAtTime(-side * 0.85, t, 0.05);
    }
    // Someone going past, close, at a real difference in speed.
    for (const c of cars) {
      if (c.isPlayer) continue;
      const v = c.vehicle, dx = v.x - me.x, dz = v.z - me.z, along = dx * fx + dz * fz, was = this.passed.get(c) ?? along;
      this.passed.set(c, along);
      if (Math.sign(along) === Math.sign(was) || Math.abs(along) > 8) continue;
      const side = dx * fz - dz * fx, gap = Math.abs(v.speed - me.speed);
      if (Math.abs(side) < 7 && gap > 3 && me.speed > 10) playFx(this.ctx, this.out, this.noise, 'whoosh', Math.min(1, gap / 20), Math.max(-1, Math.min(1, -side / 5)));
    }
  }
}
