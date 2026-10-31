// Two cars touching. Each car is a box (its half width and half length, turned
// by its heading). A knock is shared between the two: the bump works on how fast
// they are closing, not on how fast they are going, so a tap from behind at 150
// km/h costs what a tap at 5 km/h costs, and the car in front gets the push.
// Side rubs slide, with almost no drag. Arcade numbers, no damage. No Three.js.
//
// Same turning rule as vehicle.js: a turn to the left (positive yaw rate) moves
// a point at r toward (rz, -rx).

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const BOUNCE = 0.3;     // how lively a bump is
const RUB = 0.06;       // drag between two cars sliding along each other
const SPIN = 0.45;      // share of the real turning kept: cars wobble, never spin out
const MAX_SPIN = 0.9;   // rad/s, the most one knock can add
const PART = 0.5;       // m/s: touching cars always ease apart, so they never stick

// The box of a car: centre, forward and left directions, half sizes.
const box = (v) => {
  const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
  return { x: v.x, z: v.z, fx, fz, lx: fz, lz: -fx, hl: v.spec.halfLength, hw: v.spec.halfWidth };
};

// How far a box reaches along a direction.
const reach = (b, nx, nz) => Math.abs(nx * b.fx + nz * b.fz) * b.hl + Math.abs(nx * b.lx + nz * b.lz) * b.hw;

// Do the two boxes overlap? Tries each box's two sides as the way to push them
// apart and keeps the shallowest. Returns { nx, nz, depth } (the normal points
// from a to b), or null.
export function overlap(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  let depth = Infinity, nx = 0, nz = 0;
  for (const [ax, az] of [[a.fx, a.fz], [a.lx, a.lz], [b.fx, b.fz], [b.lx, b.lz]]) {
    const gap = Math.abs(dx * ax + dz * az) - reach(a, ax, az) - reach(b, ax, az);
    if (gap >= 0) return null;
    if (-gap < depth) {
      const s = dx * ax + dz * az >= 0 ? 1 : -1;
      depth = -gap; nx = ax * s; nz = az * s;
    }
  }
  return { nx, nz, depth };
}

// The nearest point of a box to a spot, for where the two touch.
function nearestOn(b, x, z) {
  const dx = x - b.x, dz = z - b.z;
  const f = clamp(dx * b.fx + dz * b.fz, -b.hl, b.hl), l = clamp(dx * b.lx + dz * b.lz, -b.hw, b.hw);
  return [b.x + b.fx * f + b.lx * l, b.z + b.fz * f + b.lz * l];
}

// Settle two touching vehicles. Returns null if they are clear of each other,
// or { closing (m/s), x, z, nx, nz } with the normal pointing from a to b.
export function knock(va, vb) {
  const a = box(va), b = box(vb);
  const hit = overlap(a, b);
  if (!hit) return null;
  const { nx, nz, depth } = hit;
  const ma = va.spec.mass, mb = vb.spec.mass;

  // Push them apart, the lighter car moving further.
  const sa = depth * mb / (ma + mb), sb = depth * ma / (ma + mb);
  va.x -= nx * sa; va.z -= nz * sa;
  vb.x += nx * sb; vb.z += nz * sb;

  // Where they touch: half way between the two boxes' nearest points.
  const [ax, az] = nearestOn(a, (a.x + b.x) / 2, (a.z + b.z) / 2);
  const [bx, bz] = nearestOn(b, ax, az);
  const cx = (ax + bx) / 2, cz = (az + bz) / 2;
  // What a spin of 1 rad/s does to that point on each car.
  const pax = cz - va.z, paz = -(cx - va.x), pbx = cz - vb.z, pbz = -(cx - vb.x);
  // How fast the two points are closing, and sliding past each other.
  const rvx = vb.vx + vb.yawRate * pbx - va.vx - va.yawRate * pax;
  const rvz = vb.vz + vb.yawRate * pbz - va.vz - va.yawRate * paz;
  const vn = rvx * nx + rvz * nz;
  const out = { closing: Math.max(0, -vn), x: cx, z: cz, nx, nz };

  const rna = nx * pax + nz * paz, rnb = nx * pbx + nz * pbz;
  const shared = 1 / ma + 1 / mb + rna * rna / va.inertia + rnb * rnb / vb.inertia;
  // The bump itself, or if they have stopped closing, just a nudge apart.
  const j = (vn < 0 ? -(1 + BOUNCE) * vn : Math.max(0, PART - vn)) / shared;
  const tx = -nz, tz = nx;
  const vt = rvx * tx + rvz * tz;
  const jt = clamp(-vt / shared, -RUB * j, RUB * j); // never more than stops the slide
  const ix = nx * j + tx * jt, iz = nz * j + tz * jt;
  va.vx -= ix / ma; va.vz -= iz / ma;
  vb.vx += ix / mb; vb.vz += iz / mb;
  const turn = (v, p) => { v.yawRate += clamp(SPIN * p / v.inertia, -MAX_SPIN, MAX_SPIN); };
  turn(va, -(ix * pax + iz * paz));
  turn(vb, ix * pbx + iz * pbz);
  return out;
}
