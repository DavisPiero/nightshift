// A closed road described by a centre line. The same samples feed the road
// mesh, the walls, the reset position, and later the checkpoints, lap timing
// and AI racing lines. No Three.js here, so physics tests can use it in Node.

const SPACING = 1; // metres between samples

function catmull(p0, p1, p2, p3, t) {
  // Centripetal Catmull-Rom would be safer on uneven spacing; uniform is fine
  // for hand-placed points that are roughly evenly spread.
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export class TrackPath {
  // points: [[x, z], ...] in driving order. halfWidth: half the tarmac width.
  // wall: distance from the centre line to the barriers.
  constructor({ points, halfWidth, wall, patches = [] }) {
    this.halfWidth = halfWidth;
    this.wall = wall;
    this.patches = patches; // [[from, to], ...] metres along: heavier weather

    // Dense pass along the spline, then resample at even spacing.
    const dense = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
      for (let k = 0; k < 40; k++) {
        const t = k / 40;
        dense.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]);
      }
    }
    let total = 0;
    const cum = [0];
    for (let i = 1; i <= dense.length; i++) {
      const a = dense[i - 1], b = dense[i % dense.length];
      total += Math.hypot(b[0] - a[0], b[1] - a[1]);
      cum.push(total);
    }
    this.length = total;
    const count = Math.round(total / SPACING);
    this.count = count;
    this.x = new Float32Array(count); this.z = new Float32Array(count);
    this.tx = new Float32Array(count); this.tz = new Float32Array(count);
    this.dist = new Float32Array(count);
    this.curvature = new Float32Array(count);
    let j = 0;
    for (let i = 0; i < count; i++) {
      const d = i * total / count;
      while (cum[j + 1] < d) j++;
      const a = dense[j], b = dense[(j + 1) % dense.length];
      const f = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
      this.x[i] = a[0] + (b[0] - a[0]) * f;
      this.z[i] = a[1] + (b[1] - a[1]) * f;
      this.dist[i] = d;
    }
    for (let i = 0; i < count; i++) {
      const p = (i - 1 + count) % count, q = (i + 1) % count;
      let dx = this.x[q] - this.x[p], dz = this.z[q] - this.z[p];
      const l = Math.hypot(dx, dz) || 1;
      this.tx[i] = dx / l; this.tz[i] = dz / l;
    }
    for (let i = 0; i < count; i++) {
      const q = (i + 1) % count;
      // Signed curvature: positive bends to the left.
      const cross = this.tx[i] * this.tz[q] - this.tz[i] * this.tx[q];
      this.curvature[i] = -cross / SPACING;
    }
  }

  // Left of travel at sample i (heading convention: left of +z is +x).
  leftX(i) { return this.tz[i]; }
  leftZ(i) { return -this.tx[i]; }

  // Heading angle (0 = facing +z) along the road at sample i.
  headingAt(i) { return Math.atan2(this.tx[i], this.tz[i]); }

  wrap(i) { return ((i % this.count) + this.count) % this.count; }

  // How far into a weather patch sample i is: 0 outside, 1 well inside,
  // easing over the first and last 30 m.
  patchAt(i) {
    let k = 0;
    for (const [a, b] of this.patches) {
      const d = this.wrap(i - a), len = this.wrap(b - a);
      if (d > len) continue;
      k = Math.max(k, Math.min(1, d / 30, (len - d) / 30));
    }
    return k;
  }

  // Closest centre-line sample. A hint (last known index) makes it a short
  // local search; without one it scans the whole track.
  nearest(x, z, hint = -1) {
    let best = -1, bestD = Infinity;
    if (hint >= 0) {
      for (let k = -40; k <= 40; k++) {
        const i = this.wrap(hint + k);
        const d = (this.x[i] - x) ** 2 + (this.z[i] - z) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      }
      if (bestD < 30 * 30) return this._result(best, x, z);
    }
    for (let i = 0; i < this.count; i++) {
      const d = (this.x[i] - x) ** 2 + (this.z[i] - z) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    return this._result(best, x, z);
  }

  _result(i, x, z) {
    const dx = x - this.x[i], dz = z - this.z[i];
    return {
      index: i,
      offset: dx * this.leftX(i) + dz * this.leftZ(i), // + is left of centre
      along: dx * this.tx[i] + dz * this.tz[i],
    };
  }
}

// Draw a closed road like a turtle: from [x, z] facing `heading`, follow a
// list of pieces: ['S', metres] straight on, ['R', degrees, radius] turn
// right, ['L', degrees, radius] turn left. Returns points every few metres
// for TrackPath. Any small gap left between the end and the start is spread
// along the whole loop, so the pieces need only add up roughly.
export function turtle([x0, z0], heading, pieces, step = 10) {
  let x = x0, z = z0, h = heading;
  const pts = [[x, z]];
  const dist = [0];
  let s = 0;
  const go = (len, turn) => {
    const n = Math.max(1, Math.ceil(len / step));
    for (let i = 0; i < n; i++) {
      const d = len / n;
      h += turn / n / 2;
      x += Math.sin(h) * d; z += Math.cos(h) * d;
      h += turn / n / 2;
      s += d;
      pts.push([x, z]); dist.push(s);
    }
  };
  for (const [kind, a, r] of pieces) {
    if (kind === 'S') go(a, 0);
    else {
      const rad = (a * Math.PI) / 180;
      go(rad * r, kind === 'R' ? -rad : rad); // right turns lower the heading
    }
  }
  const ex = x - x0, ez = z - z0;
  pts.pop(); dist.pop(); // the last point is the first one again
  return pts.map(([px, pz], i) => [px - ex * (dist[i] / s), pz - ez * (dist[i] / s)]);
}
