// An AI driver. Each physics step it looks at its own car, the racing line
// and the cars round it, and returns the same control state a player makes
// (steer, throttle, brake, handbrake), so the physics never knows who is
// driving. Proved by tools/ai-bench.mjs.
//
// How it drives:
//  - Steering: "pure pursuit". It picks a point on the line some way ahead
//    (further the faster it goes) and turns the wheel by the angle that would
//    carry it there in an arc.
//  - Speed: the line's safe speed a little ahead, scaled by its pace. Over
//    it, brake (harder the further over); under it, throttle. It lifts if the
//    car starts to slide.
//  - Traffic: a car close ahead on the line and slower means pull out to the
//    side with more room and pass; if there is no room, sit behind it. A car
//    alongside pushes it over a little so they do not touch.
//  - Character: `pace` (0.85-1.0 of the line's speed), `aggression` (how
//    soon it dives for a gap), `consistency` (how rarely it brakes late).
//  - Catch-up: the race can nudge pace up or down a few percent (rubber
//    band) so the pack stays together for a casual game.
//  - Skill: the difficulty (difficulty.js) scales pace, how much of the
//    tyres it dares to use, and how often it makes mistakes.
//
// No Three.js; pure numbers.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Personalities for the field, from fast and tidy to slow and wild.
export const DRIVERS = [
  { name: 'Ren', pace: 0.97, aggression: 0.7, consistency: 0.95 },
  { name: 'Mika', pace: 0.95, aggression: 0.5, consistency: 0.9 },
  { name: 'Kaito', pace: 0.93, aggression: 0.85, consistency: 0.75 },
  { name: 'Sora', pace: 0.91, aggression: 0.35, consistency: 0.92 },
  { name: 'Haru', pace: 0.89, aggression: 0.6, consistency: 0.8 },
  { name: 'Yuki', pace: 0.87, aggression: 0.4, consistency: 0.85 },
  { name: 'Dee', pace: 0.95, aggression: 0.75, consistency: 0.85 },
  { name: 'Marco', pace: 0.9, aggression: 0.55, consistency: 0.9 },
];

// The rival of the story. Quick, clean and he never lets you past easily.
export const MAX = { name: 'Max', pace: 1, aggression: 0.9, consistency: 0.98, rival: true };

export class AIDriver {
  // line: a RacingLine. spec: the car's numbers (cars.js, after parts).
  // weatherGrip: the weather's grip scale (physics/weather.js).
  constructor(line, spec, persona = DRIVERS[0], { weatherGrip = 1, seed = 1, skill = {} } = {}) {
    this.line = line;
    this.spec = spec;
    this.persona = persona;
    this.skill = { pace: 1, grip: 0.78, brake: 1, mistakes: 1, ...skill };
    this.speeds = line.speeds({
      grip: spec.tireGrip * weatherGrip * this.skill.grip, // under the limit: the tyres give less than the number says once sliding
      brake: 6.5 * weatherGrip * this.skill.brake,
      top: 95,
      downforce: spec.downforce || 0,
    });
    this.shift = 0;        // sideways shift from the line (m), eased
    this.wantShift = 0;
    this.catchUp = 1;      // set by the race (rubber band)
    this.lapse = 0;        // seconds left of a late-braking mistake
    this.stuck = 0;        // seconds barely moving (the race may reset us)
    this.reversing = 0;    // seconds left backing out of a wall
    let s = seed >>> 0;
    this.rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    this.out = { steer: 0, throttle: 0, brake: 0, handbrake: false, gearUp: false, gearDown: false };
  }

  // v: this car's Vehicle. near: { index, offset } from keepOnTrack or
  // track.nearest. others: the other cars, each { x, z, speed, index,
  // offset }. Returns the control state for this step.
  drive(v, near, others, dt) {
    const line = this.line, track = line.track, p = this.persona, c = this.out;
    const i = near.index;
    const speed = v.speed;

    // --- Traffic: decide which side of the line to be on ---
    this.wantShift = 0;
    let follow = null; // a car ahead we cannot pass yet
    for (const o of others) {
      let gap = o.index - i;
      if (gap < -track.count / 2) gap += track.count;
      if (gap > track.count / 2) gap -= track.count;
      const side = o.offset - near.offset;
      if (gap > 0 && gap < 12 + speed * (0.4 + p.aggression * 0.4) && Math.abs(side) < 2.4 && speed > o.speed - 1) {
        // Ahead, in our lane, and we are as fast or faster: pull out to the
        // side with more room from the edge.
        const room = (o.offset > 0 ? o.offset + track.halfWidth : track.halfWidth - o.offset);
        const dir = o.offset > line.offset[i] ? -1 : 1;
        if (room > 3.6) this.wantShift = dir * clamp(2.6 - Math.abs(side) + 1.2, 1.2, 3.2);
        else follow = { o, gap };
      } else if (Math.abs(gap) < 5 && Math.abs(side) < 2.2) {
        // Alongside: lean away so we do not rub.
        this.wantShift += -Math.sign(side || 1) * 0.9;
      }
    }
    this.shift += clamp(this.wantShift - this.shift, -2.2 * dt, 2.2 * dt); // about 2 m/s sideways

    // --- Steering: pure pursuit to a point ahead on the (shifted) line ---
    const look = 5 + speed * 0.42;
    const [tx, tz] = line.point(i + look, this.shift);
    const dx = tx - v.x, dz = tz - v.z;
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    const ahead = dx * fx + dz * fz, left = dx * fz - dz * fx;
    const ang = Math.atan2(left, ahead);
    const dist = Math.max(3, Math.hypot(dx, dz));
    const wheel = Math.atan((2 * this.spec.wheelbase * Math.sin(ang)) / dist); // the road-wheel angle wanted
    // The car has less lock the faster it goes (vehicle.js), so ask for the
    // angle as a share of the lock it has now.
    const lock = this.spec.maxSteer + (this.spec.highSpeedSteer - this.spec.maxSteer) * clamp(speed * 3.6 / 200, 0, 1);
    c.steer = clamp(-wheel / lock, -1, 1);

    // --- Speed ---
    if (this.lapse <= 0 && this.rand() < (1 - p.consistency) * 0.04 * this.skill.mistakes * dt) this.lapse = 1.5; // brakes late into the next corner
    this.lapse -= dt;
    const pace = p.pace * this.skill.pace * this.catchUp * (this.lapse > 0 ? 1.08 : 1);
    let target = this.speeds[track.wrap(i + 3 + Math.round(speed * 0.15))] * pace;
    if (follow) target = Math.min(target, Math.max(4, follow.o.speed - 0.5 + follow.gap * 0.15));
    const over = speed - target;
    if (over > 0.8) { c.throttle = 0; c.brake = clamp(over / 5, 0.15, 1); }
    else { c.brake = 0; c.throttle = clamp(0.35 - over / 3, 0, 1); }
    // Sliding: ease off so it does not spin (the assists catch the rest).
    if (Math.abs(v.slipAngle) > 0.18) c.throttle *= 0.4;
    c.handbrake = false;

    // Stuck (wanting to go but not moving) or facing the wrong way: count
    // it, so the race can put the car back on the line.
    const wrongWay = Math.cos(v.heading - track.headingAt(i)) < -0.2;
    this.stuck = ((speed < 1.5 && target > 5) || wrongWay) ? this.stuck + dt : 0;
    // Nose in a wall: back out for a moment with the wheel the other way
    // (holding the brake at a standstill reverses), then try again.
    if (this.stuck > 1.6 && !wrongWay && this.reversing <= 0) this.reversing = 1.2;
    if (this.reversing > 0) {
      this.reversing -= dt;
      c.throttle = 0; c.brake = 1; c.steer = -c.steer;
    }
    return c;
  }
}
