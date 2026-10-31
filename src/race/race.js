// A race: a grid, a countdown, laps, positions, a finish. Holds every car
// (the player's and the AI's) and steps the AI drivers, the walls and the
// knocks between cars. Run by the game and tools/ai-bench.mjs. No Three.js,
// so it runs in Node.
//
// Each car: { id, name, vehicle, driver (an AIDriver, or null for the
// player), ... }. The race adds its progress: lap, index, lap times, place.
//
// Flow: 'grid' (cars placed, held) -> 'countdown' (3 s of lights) ->
// 'racing' -> 'finished' (when the player, or in the bench the leader,
// crosses the line after the last lap; the rest carry on to the line).

import { keepOnTrack } from '../physics/walls.js';
import { applyWeather } from '../physics/weather.js';

export const COUNTDOWN = 3; // seconds of lights before the start

export class Race {
  constructor(track, line, cars, { laps = 3, weather = 'clear', band = { slow: 0.04, push: 0.04 }, takeover = null } = {}) {
    this.track = track;
    this.line = line;
    this.laps = laps;
    this.weather = weather;
    this.band = band;         // the rubber band (difficulty.js)
    this.takeover = takeover; // makes a driver for the player's car after the flag
    this.cars = cars.map((c) => ({ ...c, isPlayer: !c.driver, lap: 0, index: 0, offset: 0, covered: 0, lapStart: 0, lapTimes: [], best: Infinity, done: false, place: 0, finishTime: 0, hits: 0, resets: 0 }));
    this.player = this.cars.find((c) => c.isPlayer) || null;
    this.playerHit = null;    // the player's last wall hit, for sparks and sound
    this.playerKnock = 0;     // the hardest knock from another car this step
    this.wrongWay = 0;        // seconds the player has been going the wrong way
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
    this.playerHit = null; this.playerKnock = 0;
    if (this.state === 'countdown') {
      this.clock -= dt;
      if (this.clock <= 0) { this.state = 'racing'; this.t = 0; for (const c of this.cars) c.lapStart = 0; }
    }
    if (this.state === 'racing' || this.state === 'finished') this.t += dt;

    // Rubber band: AI cars well ahead of the player ease off, cars well behind
    // push, by as much as the difficulty allows, in full at 300 m.
    const player = this.player;
    if (player && !player.done) for (const c of this.cars) if (c.driver && !c.done) {
      const d = Math.max(-1, Math.min(1, (player.covered - c.covered) / 300));
      c.driver.catchUp = 1 + d * (d > 0 ? this.band.push : this.band.slow);
    }
    const others = this.cars.map((c) => ({ x: c.vehicle.x, z: c.vehicle.z, speed: c.vehicle.speed, index: c.index, offset: c.offset }));
    this.cars.forEach((c, n) => {
      const v = c.vehicle;
      let ctl;
      if (c.driver) ctl = c.driver.drive(v, c, others.filter((_, m) => m !== n), dt);
      else ctl = playerControls || { steer: 0, throttle: 0, brake: 0, handbrake: false };
      if (held) ctl = { ...ctl, steer: 0, throttle: 0, brake: 0.4 }; // held on the line (a harder brake would select reverse)
      if (c.done && c.driver) c.driver.catchUp = 0.6; // a cool-down lap after the flag
      v.step(dt, ctl);
      const r = keepOnTrack(v, this.track, c.index);
      if (r.impact > 1) c.hits++;
      if (c.isPlayer && r.impact > 0) this.playerHit = r;
      this.progress(c, r);
      // Heavier weather in the track's patches: a little less grip, eased.
      if (this.weather !== 'clear') applyWeather(v, this.weather, this.track.patchAt(c.index));
      // Stuck or turned round for a while: back onto the line, facing on.
      if (held && c.driver) c.driver.stuck = 0; // waiting on the grid is not being stuck
      if (c.driver && c.driver.stuck > 3) this.recover(c);
    });
    if (player && this.state === 'racing') {
      const back = Math.cos(player.vehicle.heading - this.track.headingAt(player.index)) < -0.3 && player.vehicle.speed > 2;
      this.wrongWay = back ? this.wrongWay + dt : 0;
    }
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
        if (this.state === 'racing' && (!this.player || c.isPlayer)) this.state = 'finished';
        // The player's car drives itself after the flag.
        if (c.isPlayer && this.takeover) c.driver = this.takeover(c);
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
      const ia = va.collide(-nx, -nz, depth, nx * va.spec.halfWidth, nz * va.spec.halfWidth);
      const ib = vb.collide(nx, nz, depth, -nx * vb.spec.halfWidth, -nz * vb.spec.halfWidth);
      if (cs[a].isPlayer) this.playerKnock = Math.max(this.playerKnock, ia);
      if (cs[b].isPlayer) this.playerKnock = Math.max(this.playerKnock, ib);
    }
  }

  // Places: more ground covered is further ahead; finishers by time.
  rank() {
    this.order = [...this.cars].sort((a, b) => (a.done !== b.done ? (a.done ? -1 : 1) : a.done ? a.finishTime - b.finishTime : b.covered - a.covered));
    this.order.forEach((c, k) => { c.place = k + 1; });
  }

  // Put a car back on the racing line a few metres back, pointing the right way.
  recover(c) {
    const t = this.track, i = t.wrap(c.index - 5);
    const [x, z, o] = this.line.point(i);
    c.vehicle.reset(x, z, t.headingAt(i));
    c.index = i; c.offset = o; c.resets++;
    if (c.driver) c.driver.stuck = 0;
    applyWeather(c.vehicle, this.weather);
  }

  // The car just ahead of or behind c, and the gap in seconds (roughly: the
  // road between them at the speed c is going).
  gap(c, step) {
    const o = this.order[c.place - 1 + step];
    if (!o) return null;
    return { name: o.name, seconds: Math.abs(o.covered - c.covered) / Math.max(12, c.vehicle.speed) };
  }

  // For a results screen: place, name, total time, best lap. Anyone still on
  // the road gets an estimate from their pace so far.
  results() {
    const whole = this.laps * this.track.count;
    return this.order.map((c) => ({ place: c.place, id: c.id, name: c.name, car: c.car, player: c.isPlayer, done: c.done, time: c.done ? c.finishTime : this.t * whole / Math.max(1, c.covered), best: c.best }));
  }
}
