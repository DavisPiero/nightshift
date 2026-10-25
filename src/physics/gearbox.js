// Gear selection. Gear -1 is reverse, 0 is neutral, 1..n are forward gears.
// Automatic is the default; manual mode only changes gear when asked.
// The gearbox never touches forces: it just decides which ratio is engaged.

export class Gearbox {
  constructor(spec) {
    this.spec = spec;
    this.mode = 'auto';
    this.gear = 1;
    this.shiftTimer = 0;     // > 0 while a shift is in progress (power is cut)
    this.reverseHold = 0;    // time spent stopped with the brake held
    this.lastShift = 0;      // +1 or -1 for the most recent shift, read by audio
    this.shiftCount = 0;
  }

  get topGear() { return this.spec.gearRatios.length; }

  ratio(gear = this.gear) {
    if (gear === -1) return -this.spec.reverseRatio;
    if (gear === 0) return 0;
    return this.spec.gearRatios[gear - 1];
  }

  get shifting() { return this.shiftTimer > 0; }

  shiftTo(gear) {
    if (gear === this.gear) return false;
    if (gear < -1 || gear > this.topGear) return false;
    this.lastShift = gear > this.gear ? 1 : -1;
    this.gear = gear;
    this.shiftTimer = this.spec.shiftTime;
    this.shiftCount++;
    return true;
  }

  // rpmAt(gear) gives the engine speed the wheels would force in that gear.
  update(dt, controls, speedForward, rpmAt) {
    if (this.shiftTimer > 0) this.shiftTimer = Math.max(0, this.shiftTimer - dt);
    const stopped = Math.abs(speedForward) < 0.8;

    // Reverse and back, the same in both modes: hold brake at a standstill to
    // reverse, press throttle at a standstill to go forward again.
    if (this.gear >= 1 && stopped && controls.brake > 0.5 && controls.throttle < 0.1) {
      this.reverseHold += dt;
      if (this.reverseHold > 0.25) { this.shiftTo(-1); this.reverseHold = 0; }
      return;
    }
    this.reverseHold = 0;
    if (this.gear === -1) {
      if (stopped && controls.throttle > 0.5 && controls.brake < 0.1) this.shiftTo(1);
      return;
    }

    if (this.mode === 'manual') {
      if (controls.gearUp) this.shiftTo(Math.min(this.topGear, this.gear + 1));
      if (controls.gearDown) this.shiftTo(Math.max(1, this.gear - 1));
      return;
    }

    if (this.shifting) return;
    const s = this.spec;
    const t = controls.throttle;
    const upAt = 3600 + (s.autoUpshiftRpm - 3600) * t;
    if (this.gear < this.topGear && rpmAt(this.gear) > upAt) {
      this.shiftTo(this.gear + 1);
      return;
    }
    if (this.gear > 1) {
      // Drop a gear when the engine is bogging, or for a kickdown when the
      // driver floors it and the lower gear still has room to rev.
      const lower = rpmAt(this.gear - 1);
      const kickdown = t > 0.9 && lower < s.autoUpshiftRpm - 1500;
      if ((rpmAt(this.gear) < s.autoDownshiftRpm && lower < upAt - 800) || kickdown) {
        this.shiftTo(this.gear - 1);
      }
    }
  }
}
