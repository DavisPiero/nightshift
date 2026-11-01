// Time Trial: endless laps against a ghost of your best lap. Times each lap
// from the line, records where the car is ten times a second, and keeps the
// recording of the best clean lap, saved per track and car (save.bestLaps).
// Going Back on track spoils the lap. No Three.js.

const EVERY = 0.1; // seconds between samples

// A saved lap: { time, pts: [x, z, heading, metres, ...] } rounded to stay small.
const round = (v, k) => Math.round(v * k) / k;

export class TimeTrial {
  // saved: this track and car's best lap from the save, if any. onBest(lap) is
  // called with a new best lap, to save it.
  constructor(track, start, saved, onBest) {
    this.track = track;
    this.start = start;
    this.onBest = onBest;
    this.best = saved?.time ?? Infinity;
    this.ghost = saved?.pts?.length ? saved.pts : null;
    this.last = null;
    this.newBest = 0;    // seconds left of the new best flash
    this.delta = null;   // ahead of (-) or behind (+) the ghost, seconds
    this.running = false;
    this.t = 0;
    this.rec = [];
    this.next = 0;
    this.clean = true;
  }

  // Where the car starts: a short run up to the line.
  get grid() { return this.track.wrap(this.start - 60); }

  // A new attempt from the run-up (the first lap, or Restart).
  begin() {
    this.index = this.grid;
    this.covered = -60;
    this.lap = -1;
    this.running = false;
    this.t = 0; this.rec = []; this.next = 0; this.clean = true; this.delta = null;
  }

  spoil() { this.clean = false; this.delta = null; }

  step(dt, v, index) {
    const n = this.track.count;
    let adv = index - this.index;
    if (adv < -n / 2) adv += n;
    if (adv > n / 2) adv -= n;
    this.covered += adv;
    this.index = index;
    this.newBest = Math.max(0, this.newBest - dt);
    const lap = Math.floor(this.covered / n);
    if (lap > this.lap) {
      if (this.running) this.finishLap();
      this.lap = lap;
      this.running = true;
      this.t = 0; this.rec = []; this.next = 0; this.clean = true; this.mark = 0;
    }
    if (!this.running) return;
    this.t += dt;
    if (this.t >= this.next) {
      this.next += EVERY;
      const metres = this.covered - this.lap * n;
      this.rec.push(round(v.x, 10), round(v.z, 10), round(v.heading, 100), Math.round(metres));
      if (this.ghost && this.clean) this.delta = this.t - this.ghostTime(metres);
    }
  }

  finishLap() {
    this.last = this.t;
    if (this.clean && this.t < this.best) {
      this.best = this.t;
      this.ghost = this.rec;
      this.newBest = 3;
      this.onBest?.({ time: round(this.t, 1000), pts: this.rec });
    }
  }

  // The ghost's time at a distance round the lap.
  ghostTime(metres) {
    const g = this.ghost;
    while (this.mark * 4 + 3 < g.length - 4 && g[this.mark * 4 + 7] < metres) this.mark++;
    while (this.mark > 0 && g[this.mark * 4 + 3] > metres) this.mark--;
    return this.mark * EVERY;
  }

  // Where the ghost is now: { x, z, heading }, or null before a lap starts.
  pose() {
    const g = this.ghost;
    if (!g || !this.running) return null;
    const f = this.t / EVERY, i = Math.floor(f), a = i * 4, b = a + 4;
    if (b + 2 >= g.length) return null; // it has finished; so should you
    const k = f - i;
    let dh = g[b + 2] - g[a + 2];
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    return { x: g[a] + (g[b] - g[a]) * k, z: g[a + 1] + (g[b + 1] - g[a + 1]) * k, heading: g[a + 2] + dh * k };
  }
}
