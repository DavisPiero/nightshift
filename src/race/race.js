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

import { keepOnTrack, settleOnRoad } from '../physics/walls.js';
import { applyWeather } from '../physics/weather.js';
import { knock } from '../physics/knocks.js';
import { LAUNCH_SECONDS } from '../physics/vehicle.js';

export const COUNTDOWN = 3; // seconds of lights before the start
const WARM_SECONDS = 2;    // hold the throttle this long in the lights for warm tyres at their best
const HUNT_RANGE = 130;    // metres behind you that rivals come after you when you lead

export class Race {
  constructor(track, line, cars, { laps = 3, weather = 'clear', band = { slow: 0.04, push: 0.04 }, takeover = null, hunt = 0.7 } = {}) {
    this.track = track;
    this.line = line;
    this.laps = laps;
    this.weather = weather;
    this.band = band;         // the rubber band (difficulty.js)
    this.takeover = takeover; // makes a driver for the player's car after the flag
    this.hunt = hunt;         // how hard rivals fight to take P1 back (difficulty.js)
    this.warm = 0;            // 0..1, how warm the player's tyres got in the lights
    this.cars = cars.map((c) => ({ ...c, isPlayer: !c.driver, lap: 0, index: 0, offset: 0, covered: 0, lapStart: 0, lapTimes: [], best: Infinity, done: false, place: 0, finishTime: 0, hits: 0, resets: 0 }));
    this.player = this.cars.find((c) => c.isPlayer) || null;
    this.playerHit = null;    // the player's last wall hit, for sparks and sound
    this.playerKnock = 0;     // the hardest knock from another car this step
    this.playerContact = null; // where it was, for sparks
    this.otherHit = null;     // the hardest knock between other cars this step, for its sound
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
      settleOnRoad(c.vehicle, t, { index: i, along: 0 });
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
    this.playerHit = null; this.playerKnock = 0; this.playerContact = null; this.otherHit = null;
    if (this.state === 'countdown') {
      this.clock -= dt;
      if (this.clock <= 0) {
        this.state = 'racing'; this.t = 0;
        for (const c of this.cars) c.lapStart = 0;
        if (this.player) this.player.vehicle.launchLeft = LAUNCH_SECONDS * this.warm;
      }
    }
    if (this.state === 'racing' || this.state === 'finished') this.t += dt;

    // Rubber band: AI cars well ahead of the player ease off, cars well behind
    // push, by as much as the difficulty allows, in full at 300 m.
    const player = this.player;
    if (player && !player.done) for (const c of this.cars) if (c.driver && !c.done) {
      const d = Math.max(-1, Math.min(1, (player.covered - c.covered) / 300));
      c.driver.catchUp = 1 + d * (d > 0 ? this.band.push : this.band.slow);
      // You took P1: whoever is close behind comes after it.
      const back = player.covered - c.covered;
      c.driver.huntGoal = this.state === 'racing' && player.place === 1 && back > 0 && back < HUNT_RANGE ? this.hunt : 0;
    }
    const others = this.cars.map((c) => ({ x: c.vehicle.x, z: c.vehicle.z, speed: c.vehicle.speed, index: c.index, offset: c.offset }));
    this.slipstream(others);
    this.cars.forEach((c, n) => {
      const v = c.vehicle;
      let ctl;
      if (c.driver) ctl = c.driver.drive(v, c, others.filter((_, m) => m !== n), dt);
      else ctl = playerControls || { steer: 0, throttle: 0, brake: 0, handbrake: false };
      // Throttle held in the lights: the tyres spin up on the spot and warm through.
      const revving = held && c.isPlayer && this.state === 'countdown' && ctl.throttle > 0.5;
      if (revving) { this.warm = Math.min(1, this.warm + dt / WARM_SECONDS); ctl = { ...ctl, steer: 0, brake: 0, handbrake: false, nos: false }; }
      else if (held) ctl = { ...ctl, steer: 0, throttle: 0, brake: 0.4, nos: false }; // held on the line (a harder brake would select reverse)
      else if (c.driver && !c.done && this.t < c.driver.launch) ctl = { ...ctl, steer: 0, throttle: 0, brake: 0 }; // still reacting to the lights
      if (c.done && c.driver) c.driver.catchUp = 0.6; // a cool-down lap after the flag
      const [hx, hz, hh] = [v.x, v.z, v.heading];
      v.step(dt, ctl);
      v.burnout = revving;
      if (revving) {
        v.x = hx; v.z = hz; v.heading = hh; v.vx = v.vz = v.yawRate = 0;
        v.rpm += (v.spec.redline * 0.74 - v.rpm) * Math.min(1, 7 * dt);
        v.spin = 0.85; v.rearSlide = 0.9; v.load = 1;
      }
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

  // Tucked in behind another car the air is easier: less drag the closer you
  // are, up to 30 m back. The player gets it too.
  slipstream(all) {
    const n = this.track.count;
    this.cars.forEach((c, k) => {
      let best = 0;
      all.forEach((o, m) => {
        if (m === k) return;
        let gap = o.index - c.index;
        if (gap < 0) gap += n;
        if (gap > 30 || Math.abs(o.offset - c.offset) > 1.5 || o.speed < 15) return;
        best = Math.max(best, 1 - gap / 30);
      });
      c.vehicle.draft = best;
    });
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

  // Cars that touch share the knock (physics/knocks.js). A car's own wall
  // check runs again afterwards, in case the knock pushed it through a wall.
  knocks() {
    const cs = this.cars;
    for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) {
      const va = cs[a].vehicle, vb = cs[b].vehicle;
      if ((cs[a].isPlayer && cs[a].done) || (cs[b].isPlayer && cs[b].done)) continue; // nobody hits you once you are parked
      if (Math.abs(vb.x - va.x) > 7 || Math.abs(vb.z - va.z) > 7) continue;
      const hit = knock(va, vb);
      if (!hit) continue;
      if ((cs[a].isPlayer || cs[b].isPlayer) && hit.closing > this.playerKnock) {
        this.playerKnock = hit.closing;
        this.playerContact = hit;
      } else if (!cs[a].isPlayer && !cs[b].isPlayer && hit.closing > (this.otherHit?.closing ?? 1)) this.otherHit = { closing: hit.closing, x: va.x, z: va.z };
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
    settleOnRoad(c.vehicle, t, { index: i, along: 0 });
    c.index = i; c.offset = o; c.resets++;
    if (c.driver) c.driver.stuck = 0;
    applyWeather(c.vehicle, this.weather);
  }

  // For a results screen: place, name, total time, best lap. Anyone still on
  // the road gets an estimate from their pace so far.
  results() {
    const whole = this.laps * this.track.count;
    return this.order.map((c) => ({ place: c.place, id: c.id, name: c.name, car: c.car, player: c.isPlayer, done: c.done, time: c.done ? c.finishTime : this.t * whole / Math.max(1, c.covered), best: c.best }));
  }
}
