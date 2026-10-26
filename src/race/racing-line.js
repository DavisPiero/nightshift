// The racing line for a track, worked out once when the track loads: where
// on the road to be at every metre, and how fast it is safe to go there.
// AI drivers follow it (ai-driver.js). Pure maths on a TrackPath, no
// Three.js, so the bench can run it in Node.
//
// 1. The line: an elastic band pulled tight round the circuit. Each point
//    may slide sideways across the road (keeping the car's width clear of
//    the edges) and keeps being pulled toward the middle of its neighbours,
//    which straightens it: it ends up out-in-out through the corners.
// 2. The speeds: in a corner the grip limits speed to sqrt(grip·g / curve);
//    then a pass backwards from every corner says where braking must start.

const G = 9.81;

export class RacingLine {
  // track: a TrackPath. margin: metres kept clear of the road's edge (half
  // a car and a little more).
  constructor(track, { margin = 1.4, iterations = 400, reach = 7 } = {}) {
    this.track = track;
    const n = this.count = track.count;
    const room = Math.max(0, track.halfWidth - margin);
    this.room = room;
    const off = this.offset = new Float32Array(n);
    const px = new Float32Array(n), pz = new Float32Array(n);
    const place = (i) => {
      px[i] = track.x[i] + track.leftX(i) * off[i];
      pz[i] = track.z[i] + track.leftZ(i) * off[i];
    };
    for (let i = 0; i < n; i++) place(i);
    // Pull the band tight. The step shrinks so it settles instead of
    // shaking; reach is how many metres either side each point looks.
    for (let it = 0; it < iterations; it++) {
      const k = 0.6 * (1 - it / iterations) + 0.1;
      for (let i = 0; i < n; i++) {
        const a = track.wrap(i - reach), b = track.wrap(i + reach);
        const mx = (px[a] + px[b]) / 2 - track.x[i], mz = (pz[a] + pz[b]) / 2 - track.z[i];
        const want = mx * track.leftX(i) + mz * track.leftZ(i);
        off[i] = Math.max(-room, Math.min(room, off[i] + (want - off[i]) * k));
        place(i);
      }
    }
    this.x = px; this.z = pz;
    // Curvature of the line itself, from points a few metres apart.
    const curve = this.curvature = new Float32Array(n);
    for (let i = 0; i < n; i++) curve[i] = curvature3(px, pz, track.wrap(i - 4), i, track.wrap(i + 4));
    // Light smoothing so one odd point does not make a phantom corner.
    const tmp = Float32Array.from(curve);
    for (let i = 0; i < n; i++) curve[i] = (tmp[track.wrap(i - 1)] + tmp[i] * 2 + tmp[track.wrap(i + 1)]) / 4;
    this.ds = new Float32Array(n);
    for (let i = 0; i < n; i++) { const j = track.wrap(i + 1); this.ds[i] = Math.hypot(px[j] - px[i], pz[j] - pz[i]) || 1; }
  }

  // Safe speeds (m/s) along the line for a car: `grip` is its tyre grip
  // times the weather's, `brake` its usable deceleration (m/s²), `top` its
  // top speed. Returns a Float32Array, one per metre.
  speeds({ grip = 1, brake = 8, top = 80, downforce = 0 } = {}) {
    const n = this.count, v = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const k = Math.abs(this.curvature[i]);
      // Downforce adds grip with speed; a simple fixed bonus is near enough.
      const mu = grip * (1 + downforce * 0.25);
      v[i] = Math.min(top, k > 1e-5 ? Math.sqrt(mu * G / k) : top);
    }
    // Backwards (twice round, as the circuit is a loop): you can only arrive
    // at a point as fast as you can still slow down for the next one.
    for (let pass = 0; pass < 2; pass++) {
      for (let i = n - 1; i >= 0; i--) {
        const j = (i + 1) % n;
        v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * brake * this.ds[i]));
      }
    }
    return v;
  }

  // The line's point at sample i (wrapped), with an extra sideways shift.
  point(i, shift = 0) {
    const t = this.track, k = t.wrap(Math.round(i));
    const o = Math.max(-t.halfWidth + 1.1, Math.min(t.halfWidth - 1.1, this.offset[k] + shift));
    return [t.x[k] + t.leftX(k) * o, t.z[k] + t.leftZ(k) * o, o];
  }
}

// Signed curvature (1/radius) through three points; positive bends left,
// as TrackPath's.
function curvature3(px, pz, a, b, c) {
  const ax = px[b] - px[a], az = pz[b] - pz[a];
  const bx = px[c] - px[b], bz = pz[c] - pz[b];
  const cx = px[c] - px[a], cz = pz[c] - pz[a];
  const cross = ax * bz - az * bx;
  const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz), lc = Math.hypot(cx, cz);
  if (la * lb * lc < 1e-6) return 0;
  return (-2 * cross) / (la * lb * lc);
}
