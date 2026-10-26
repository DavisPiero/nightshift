// A race: a grid, a countdown, laps, positions, a finish. Holds every car
// (the player's and the AI's) and steps the AI drivers, the walls and the
// knocks between cars. Not in the game yet: the ground work for Milestone 6,
// run by tools/ai-bench.mjs. No Three.js, so it runs in Node.
//
// Each car: { id, name, vehicle, driver (an AIDriver, or null for the
// player), ... }. The race adds its progress: lap, index, lap times, place.
//
// Flow: 'grid' (cars placed, held) -> 'countdown' (3 s of lights) ->
// 'racing' -> 'finished' (when the player, or in the bench the leader,
// crosses the line after the last lap; the rest finish their lap).

import { keepOnTrack } from '../physics/walls.js';

export const COUNTDOWN = 3; // seconds of lights before the start

export class Race {
  constructor(track, line, cars, { laps = 3 } = {}) {
    this.track = track;
    this.line = line;
    this.laps = laps;
    this.cars = cars.map((c) => ({ ...c, lap: 0, index: 0, offset: 0, covered: 0, lapStart: 0, lapTimes: [], best: Infinity, done: false, place: 0, finishTime: 0, hits: 0, resets: 0 }));
    this.state = 'grid';
    this.t = 0;          // race clock, from the green light
    this.clock = 0;      // countdown clock
    this.order = [...this.cars];
  }

  // Line the cars up behind the start line in pairs, 8 m between rows, the
  // fastest (first in the list) at the front.
  grid(start) {
    const t = this.track, hw = t.halfWidth;
    this.cars.forEach((c, n) => {
      const row = Math.floor(n / 2), side = n % 2 ? -1 : 1;
      const i = t.wrap(start - 6 - row * 8);
      const o = side * hw * 0.45;
      c.vehicle.reset(t.x[i] + t.leftX(i) * o, t.z[i] + t.leftZ(i) * o, t.headingAt(i));
      c.index = i; c.offset = o; c.covered = -(6 + row * 8);
    });
    this.start = start;
    this.state = 'grid';
  }

  go() { this.state = 'countdown'; this.clock = COUNTDOWN; }

  // The lights: 3, 2, 1 during the countdown, then 0 (green).
  get lights() { return this.state === 'countdown' ? Math.ceil(this.clock) : 0; }

  // One physics step. playerControls: the player's control state (or none).
  step(dt, playerControls) {
    const held = this.state === 'grid' || this.state === 'countdown';
    if (this.state === 'countdown') {
      this.clock -= dt;
      if (this.clock <= 0) { this.state = 'racing'; this.t = 0; for (const c of this.cars) c.lapStart = 0; }
    }
    if (this.state === 'racing' || this.state === 'finished') this.t += dt;

    // Rubber band: AI cars well ahead of the player ease off a little, cars
    // well behind push a little, at most 4% either way.
    const player = this.cars.find((c) => !c.driver);
    if (player) for (const c of this.cars) if (c.driver && !c.done) c.driver.catchUp = 1 + Math.max(-0.04, Math.min(0.04, (player.covered - c.covered) / 300 * 0.04));
    const others = this.cars.map((c) => ({ x: c.vehicle.x, z: c.vehicle.z, speed: c.vehicle.speed, index: c.index, offset: c.offset }));
    this.cars.forEach((c, n) => {
      const v = c.vehicle;
      let ctl;
      if (c.driver) ctl = c.driver.drive(v, c, others.filter((_, m) => m !== n), dt);
      else ctl = playerControls || { steer: 0, throttle: 0, brake: 0, handbrake: false };
      if (held) ctl = { ...ctl, brake: 1 }; // held on the line (revving is allowed)
      if (c.done && c.driver) c.driver.catchUp = 0.6; // a cool-down lap after the flag
      v.step(dt, ctl);
      const r = keepOnTrack(v, this.track, c.index);
      if (r.impact > 1) c.hits++;
      this.progress(c, r);
      // Stuck or turned round for a while: back onto the line, facing on.
      if (held && c.driver) c.driver.stuck = 0; // waiting on the grid is not being stuck
      if (c.driver && c.driver.stuck > 3) this.recover(c);
    });
    this.knocks();
    this.rank();
  }

  // Track how far round each car is, and count laps at the start line.
  progress(c, r) {
    const n = this.track.count;
    let adv = r.index - c.index;
    if (adv < -n / 2) adv += n;
    if (adv > n / 2) adv -= n;
    c.covered += adv;
    c.index = r.index; c.offset = r.offset;
    if (this.state !== 'racing' && this.state !== 'finished') return;
    const lapsDone = Math.floor(c.covered / n);
    if (lapsDone > c.lap && !c.done) {
      const time = this.t - c.lapStart;
      c.lapTimes.push(time); c.best = Math.min(c.best, time);
      c.lap = lapsDone; c.lapStart = this.t;
      if (c.lap >= this.laps) {
        c.done = true; c.finishTime = this.t;
        if (this.state === 'racing') this.state = 'finished';
      }
    }
  }

  // Cars that touch push each other apart, like a knock off a wall but
  // shared between the two (circles about a car's width; enough for a
  // casual game, no damage).
  knocks() {
    const cs = this.cars;
    for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) {
      const va = cs[a].vehicle, vb = cs[b].vehicle;
      const dx = vb.x - va.x, dz = vb.z - va.z, d = Math.hypot(dx, dz);
      const reach = (va.spec.halfWidth + vb.spec.halfWidth) * 1.05;
      if (d >= reach || d < 1e-3) continue;
      // Only when they really overlap end to end too (cars are long).
      const fa = Math.abs(dx * Math.sin(va.heading) + dz * Math.cos(va.heading));
      if (fa > va.spec.halfLength + vb.spec.halfLength * 0.6) continue;
      const nx = dx / d, nz = dz / d, depth = (reach - d) / 2;
      va.collide(-nx, -nz, depth, nx * va.spec.halfWidth, nz * va.spec.halfWidth);
      vb.collide(nx, nz, depth, -nx * vb.spec.halfWidth, -nz * vb.spec.halfWidth);
    }
  }

  // Places: more ground covered is further ahead; finishers by time.
  rank() {
    this.order = [...this.cars].sort((a, b) => (a.done && b.done ? a.finishTime - b.finishTime : b.covered - a.covered));
    this.order.forEach((c, k) => { c.place = k + 1; });
  }

  // Put a car back on the racing line a few metres back, pointing the right way.
  recover(c) {
    const t = this.track, i = t.wrap(c.index - 5);
    const [x, z, o] = this.line.point(i);
    c.vehicle.reset(x, z, t.headingAt(i));
    c.index = i; c.offset = o; c.driver.stuck = 0; c.resets++;
  }

  // For a results screen: place, name, total time, best lap.
  results() {
    return this.order.map((c) => ({ place: c.place, id: c.id, name: c.name, done: c.done, time: c.done ? c.finishTime : null, best: c.best }));
  }
}
