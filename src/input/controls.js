// One control state for the car, whatever is driving it. Keyboard, touch
// and (later) gamepad sources each fill in their own state; this merges them.
// Physics only ever sees: steer -1..1 (+1 = right), throttle 0..1,
// brake 0..1, handbrake true/false, gearUp / gearDown (one step each press).
// Menu actions (camera, reset, pause, debug) arrive as one-shot "actions".

export class Controls {
  constructor() {
    this.sources = [];
    this.state = { steer: 0, throttle: 0, brake: 0, handbrake: false, gearUp: false, gearDown: false };
    this.actions = new Set();
  }

  add(source) {
    this.sources.push(source);
    source.onAction = (name) => this.actions.add(name);
    return source;
  }

  // Called once per physics step.
  poll(dt) {
    const s = this.state;
    s.steer = 0; s.throttle = 0; s.brake = 0; s.handbrake = false; s.gearUp = false; s.gearDown = false;
    for (const src of this.sources) {
      if (!src.enabled) continue;
      const v = src.read(dt);
      if (Math.abs(v.steer) > Math.abs(s.steer)) s.steer = v.steer;
      s.throttle = Math.max(s.throttle, v.throttle);
      s.brake = Math.max(s.brake, v.brake);
      s.handbrake = s.handbrake || v.handbrake;
      s.gearUp = s.gearUp || v.gearUp;
      s.gearDown = s.gearDown || v.gearDown;
    }
    return s;
  }

  takeAction(name) {
    const had = this.actions.has(name);
    this.actions.delete(name);
    return had;
  }

  // Drop everything held, e.g. when the page loses focus or the game pauses,
  // so nothing stays stuck on.
  releaseAll() {
    for (const src of this.sources) src.releaseAll?.();
    this.actions.clear();
  }
}
