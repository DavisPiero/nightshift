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
//  - Traffic, like a person: it looks up a few times a second, not every
//    step, so it reacts a moment late. Catching a car, it picks a side (the
//    inside of the next corner if there is room) and commits for a couple of
//    seconds. Alongside a car it keeps its lane and leaves a car's width. With
//    a car closing from behind it may make one move to cover the inside. If
//    a crash is coming it brakes.
//  - Style, hidden from the player and picked at random (opponents.js):
//    aggressive brakes late and dives, defensive covers the inside and rarely
//    errs, reckless has more power and less corner speed.
//  - Character: `pace`, `aggression` (how soon it goes for a gap),
//    `consistency` (how rarely it brakes late), and a little form that changes
//    each lap, so no two laps are the same.
//  - Hunting: when you take P1 the cars close behind you go for it: they look
//    further for a gap, brake later, swerve harder, and err more for it.
//  - Catch-up: the race can nudge pace up or down a few percent (rubber
//    band) so the pack stays together for a casual game.
//  - Skill: the difficulty (difficulty.js) scales pace, how much of the
//    tyres it dares to use, how close the field is and how often it errs.
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

// The three hidden styles. brake and grip: how much of the car it uses going
// into a corner. dive: how early it goes for a gap. defend: how often it covers
// the inside. swerve: how quickly it moves across the road (m/s). errs: mistakes.
// power: extra engine (opponents.js).
export const STYLES = {
  plain: { brake: 1, grip: 1, dive: 1, defend: 0.5, swerve: 2.6, errs: 1, power: 1 },
  aggressive: { brake: 1.12, grip: 1.01, dive: 1.35, defend: 0.5, swerve: 3.2, errs: 1.5, power: 1 },
  defensive: { brake: 0.98, grip: 1, dive: 0.8, defend: 1.5, swerve: 2.4, errs: 0.6, power: 1 },
  reckless: { brake: 1, grip: 0.96, dive: 1.1, defend: 0.2, swerve: 2.6, errs: 1, power: 1.08 },
};

const CLEAR = 2.35; // metres between two cars' middles to pass side by side

export class AIDriver {
  // line: a RacingLine. spec: the car's numbers (cars.js, after parts).
  // weatherGrip: the weather's grip scale (physics/weather.js).
  constructor(line, spec, persona = DRIVERS[0], { weatherGrip = 1, seed = 1, skill = {} } = {}) {
    this.line = line;
    this.spec = spec;
    this.persona = persona;
    this.style = STYLES[persona.style] || STYLES.plain;
    this.skill = { pace: 1, grip: 0.78, brake: 1, mistakes: 1, spread: 1, ...skill };
    this.speeds = line.speeds({
      grip: spec.tireGrip * weatherGrip * this.skill.grip * this.style.grip, // under the limit: the tyres give less than the number says once sliding
      brake: 6.5 * weatherGrip * this.skill.brake * this.style.brake,
      top: 95,
      downforce: spec.downforce || 0,
    });
    this.pace = 1 - (1 - persona.pace) * this.skill.spread; // the field closes up on the harder difficulties
    this.shift = 0;        // sideways shift from the line (m), eased
    this.plan = null;      // where on the road it wants to be (offset, m), or null for the line
    this.pass = null;      // the overtake it has committed to: { dir, off, until }
    this.cover = null;     // a move to cover the inside: { off, until }
    this.coolDown = 0;     // seconds before it may cover again
    this.follow = null;    // a car it must not hit: { speed, gap }
    this.outside = false;  // alongside with no room: give way a little
    this.thinkIn = 0;      // seconds until it next looks up
    this.t = 0;
    this.wander = 0; this.wanderTo = 0; // a little of its own line, never the same twice
    this.form = 1; this.formLap = -1;   // how it is going this lap
    this.catchUp = 1;      // set by the race (rubber band)
    this.huntGoal = 0;     // set by the race: you hold P1 and this car is close behind
    this.hunt = 0;         // eased: braver, quicker across the road, a little faster
    this.lapse = 0;        // seconds left of a late-braking mistake
    this.stuck = 0;        // seconds barely moving (the race may reset us)
    this.reversing = 0;    // seconds left backing out of a wall
    let s = seed >>> 0;
    this.rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    this.launch = 0.12 + this.rand() * 0.28 * (2 - persona.consistency) * (this.skill.mistakes > 0.8 ? 1.3 : 0.8); // reaction to the lights
    this.out = { steer: 0, throttle: 0, brake: 0, handbrake: false, gearUp: false, gearDown: false };
  }

  // The next real corner: which way it bends (+1 left) and how far off, or null.
  cornerAhead(i) {
    const track = this.line.track;
    for (let d = 15; d < 130; d += 5) {
      const c = track.curvature[track.wrap(i + d)];
      if (Math.abs(c) > 1 / 130) return { side: Math.sign(c), at: d };
    }
    return null;
  }

  // Looks up from the road, a few times a second: who is round me, what now?
  think(v, near, others) {
    const line = this.line, track = line.track, p = this.persona, st = this.style, hunt = this.hunt;
    const i = near.index, speed = v.speed, hw = track.halfWidth, edge = hw - 1.2;
    const lineOff = line.offset[i];
    let ahead = null, behind = null, beside = null;
    for (const o of others) {
      let gap = o.index - i;
      if (gap < -track.count / 2) gap += track.count;
      if (gap > track.count / 2) gap -= track.count;
      const side = o.offset - near.offset;
      if (Math.abs(gap) < 5.5 && Math.abs(side) < 3) {
        if (!beside || Math.abs(side) < Math.abs(beside.side)) beside = { o, gap, side };
      } else if (gap > 0 && gap < 12 + speed * (0.5 + p.aggression * 0.5) * st.dive * (1 + hunt * 0.6) && Math.abs(side) < CLEAR) {
        if (!ahead || gap < ahead.gap) ahead = { o, gap, side };
      } else if (gap < 0 && gap > -(8 + speed * 0.7)) {
        if (!behind || gap > behind.gap) behind = { o, gap, side };
      }
    }
    this.plan = null; this.outside = false; this.follow = null;
    if (this.pass && this.t > this.pass.until) this.pass = null;
    if (this.cover && this.t > this.cover.until) this.cover = null;
    const corner = this.cornerAhead(i);

    if (beside) {
      // Alongside: hold a lane, a car's width off them, and never turn in.
      const off = beside.side > 0 ? Math.min(near.offset, beside.o.offset - CLEAR) : Math.max(near.offset, beside.o.offset + CLEAR);
      this.plan = clamp(off, -edge, edge);
      this.outside = Math.abs(off) > edge || (corner && corner.at < 50 && Math.sign(near.offset - beside.o.offset) === -corner.side && p.aggression + hunt * 0.5 < 0.8);
      this.cover = null;
    } else if (this.pass) {
      this.plan = clamp(this.pass.off, -edge, edge);
      if (ahead) this.pass.off = ahead.o.offset + this.pass.dir * CLEAR;
    } else if (ahead && speed > ahead.o.speed - 0.5) {
      // Catching someone: the inside of the corner if there is room, otherwise
      // the side with more road. Commit to it.
      const fits = (dir) => (dir > 0 ? hw - ahead.o.offset : hw + ahead.o.offset) > CLEAR + 1.2;
      const want = corner && corner.at < 90 ? corner.side : (ahead.o.offset > 0 ? -1 : 1);
      const dir = fits(want) ? want : fits(-want) ? -want : 0;
      if (dir) {
        this.pass = { dir, off: ahead.o.offset + dir * CLEAR, until: this.t + 1.4 + this.rand() + p.aggression };
        this.plan = clamp(this.pass.off, -edge, edge);
      }
    } else if (this.cover) {
      this.plan = this.cover.off;
    } else if (behind && behind.o.speed > speed - 1 && corner && this.coolDown <= 0 && this.rand() < st.defend * 0.4) {
      // Someone is coming: one move to cover the inside, then hold it.
      this.cover = { off: corner.side * Math.min(edge, Math.abs(lineOff) + 1.5), until: this.t + 2.2 };
      this.coolDown = 5 + this.rand() * 3;
      this.plan = this.cover.off;
    }
    // A car right in front that it will not clear in time: slow down for it.
    if (ahead) {
      const closing = speed - ahead.o.speed, room = ahead.gap - 5.5;
      const inLane = Math.abs(ahead.side) < 2 && !(this.pass && Math.abs(near.offset - ahead.o.offset) > 1.9);
      if (inLane && (room < 2 || (closing > 0 && room / closing < (this.pass ? 0.55 : 0.9) - hunt * 0.2))) this.follow = { speed: ahead.o.speed, gap: room };
    }
  }

  // v: this car's Vehicle. near: { index, offset } from keepOnTrack or
  // track.nearest. others: the other cars, each { x, z, speed, index,
  // offset }. Returns the control state for this step.
  drive(v, near, others, dt) {
    const line = this.line, track = line.track, p = this.persona, c = this.out;
    const i = near.index;
    const speed = v.speed;
    this.t += dt;
    this.coolDown -= dt;

    // Traffic: a few times a second, with a person's reaction.
    this.thinkIn -= dt;
    if (this.thinkIn <= 0) {
      this.thinkIn = 0.1 + this.rand() * 0.14;
      this.think(v, near, others);
      if (this.rand() < 0.03) this.wanderTo = (this.rand() - 0.5) * 0.8 * (2 - p.consistency);
    }
    if (near.lap !== undefined && near.lap !== this.formLap) { // a new lap, a different feel for it
      this.formLap = near.lap;
      this.form = 1 + (this.rand() - 0.5) * 0.02 * (2 - p.consistency) * (this.skill.mistakes + 0.3);
    }
    this.wander += (this.wanderTo - this.wander) * Math.min(1, dt * 0.6);
    this.hunt += (this.huntGoal - this.hunt) * Math.min(1, dt * 1.5);

    // --- Steering: pure pursuit to a point ahead on the (shifted) line ---
    const look = 5 + speed * 0.42;
    const want = (this.plan === null ? 0 : this.plan - line.offset[track.wrap(Math.round(i + look))]) + this.wander;
    const rate = this.style.swerve * (1 + this.hunt * 0.3) * dt;
    this.shift += clamp(want - this.shift, -rate, rate);
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
    if (this.lapse <= 0 && this.rand() < (1 - p.consistency) * 0.04 * this.skill.mistakes * this.style.errs * (1 + this.hunt) * dt) this.lapse = 1.5; // brakes late into the next corner
    this.lapse -= dt;
    const pace = this.pace * this.skill.pace * this.form * this.catchUp * (this.lapse > 0 ? 1.08 : 1) * (this.outside ? 0.97 : 1) * (1 + this.hunt * 0.035);
    let target = this.speeds[track.wrap(i + 3 + Math.round(speed * 0.15))] * pace;
    if (this.follow) target = Math.min(target, Math.max(4, this.follow.speed - 0.5 + this.follow.gap * 0.5));
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
