// After the flag the car drives itself to a stop: a moment holding its line, then
// a flick into a slide that runs on along the road, the nose swinging side-on,
// until it stops. It drives through the same controls as anyone (vehicle.js does
// the slide), so the camera, smoke and sound follow by themselves. Proved on every
// track by tools/drive-bench.mjs. No Three.js.

const CRUISE = 0.7; // seconds after the line before it flicks

export class FinishDriver {
  // line: the track's RacingLine.
  constructor(line) {
    this.line = line;
    this.t = 0;
    this.stuck = 0;
    this.catchUp = 1;
    this.launch = 0;
    this.parked = false;
    this.side = 0;
    this.out = { steer: 0, throttle: 0, brake: 0, handbrake: false, gearUp: false, gearDown: false, park: null };
  }

  // Which way the road runs here, aimed a little back towards the middle.
  road(i, offset) {
    const t = this.line.track, at = t.headingAt(t.wrap(i + 8));
    return at - Math.max(-0.2, Math.min(0.2, offset * 0.06));
  }

  drive(v, near, others, dt) {
    const c = this.out, t = this.line.track;
    this.t += dt;
    if (this.parked || (this.t > CRUISE && !this.side && v.speed < 8)) {
      this.parked = true;
      c.park = null; c.steer = 0; c.throttle = 0; c.brake = 0; c.handbrake = true;
      return c;
    }
    const heading = this.road(near.index, near.offset);
    if (this.t < CRUISE) {
      const off = Math.atan2(Math.sin(heading - v.heading), Math.cos(heading - v.heading));
      c.steer = Math.max(-1, Math.min(1, -off * 2)); c.throttle = 0.3;
      return c;
    }
    // Nose towards the nearer kerb, so the tail swings out over the open road.
    this.side ||= near.offset > 0 ? 1 : -1;
    c.park = { heading, side: this.side };
    c.throttle = 0; c.brake = 0; c.handbrake = true;
    if (this.t > CRUISE + 0.3 && !v.drift) this.parked = true; // stopped, or a wall stopped it
    return c;
  }
}
