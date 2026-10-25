// Car bodies from profile curves. Each car is described the way a designer
// draws it: a plan (half width along the length), side-view lines (sill,
// shoulder, bonnet and roof heights), wheel arches and a few shape numbers.
// From those, a cross-section is made at every 5 cm along the car and the
// sections are joined into one smooth mesh per side, with the glass, trim
// and paint picked per band. Small parts (lamps, vents, grilles) are laid on
// the surface like decals, so they follow its curves.
//
// The car faces +z; its left side is +x. Heights are from the road.

import * as THREE from 'three';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };

// Smooth curve through [z, value] keys (monotone cubic: no overshoot, so a
// flat bonnet stays flat). Outside the keys it holds the end values.
export function curve(keys) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
  const d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  if (n > 1) { m[0] = d[0]; m[n - 1] = d[n - 2]; }
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x) => {
    if (n === 1 || x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

const PTS = 13; // points per half cross-section, bottom centre to top centre

// Material slots the body uses.
export const SLOT = { paint: 0, trim: 1, under: 2, glass: 3 };

export class Body {
  constructor(def) {
    this.def = def;
    this.width = curve(def.width);
    this.sill = curve(def.sill);
    this.belt = curve(def.belt);
    this.hood = curve(def.hood);
    this.roofC = curve(def.roof);
    this.roofW = curve(def.roofW);
    this.z0 = def.width[0][0];
    this.z1 = def.width[def.width.length - 1][0];
    this.roofSpan = [def.roof[0][0], def.roof[def.roof.length - 1][0]];
  }

  roof(z) { return z < this.roofSpan[0] || z > this.roofSpan[1] ? -1 : this.roofC(z); }

  // Height of the wheel-arch opening at z (0 away from the wheels).
  arch(z) {
    const { z: wz, r, top } = this.def.wheels;
    let y = 0;
    for (const c of wz) {
      const d = Math.abs(z - c);
      if (d < r) y = Math.max(y, 0.12 + Math.sqrt(1 - (d / r) ** 2) * (top - 0.12));
    }
    return y;
  }

  // How much the arch blisters out at z, 0..1 (wider than the opening).
  flare(z) {
    const { z: wz, r, flare } = this.def.wheels;
    let f = 0;
    wz.forEach((c, i) => {
      const d = Math.abs(z - c) / (r + 0.3);
      if (d < 1) f = Math.max(f, (flare[i] ?? flare) * smooth((1 - d) * 1.6));
    });
    return f;
  }

  // The 13 [x, y] points of the left half of the section at z, and how far
  // the greenhouse is risen there (0 = bonnet or boot, 1 = cabin).
  section(z) {
    const def = this.def;
    const w = this.width(z), sill = this.sill(z), belt = this.belt(z), H = this.hood(z);
    const ya = this.arch(z), fl = this.flare(z), bulge = def.bulge ?? 0.015;
    const crown = def.crown ?? 0.05;
    const tuck = def.tuck ?? 0.06; // how far the lower body tucks under
    const p = [
      [0, sill - 0.02],
      [w - tuck - 0.05, Math.max(sill, ya)],
      [w - tuck * 0.4 + fl * 0.3, Math.max(sill + 0.07, ya + 0.015)],
      [w + fl * 0.85 + bulge * 0.6, Math.max(lerp(sill, belt, 0.3), ya + 0.04)],
      [w + fl + bulge, Math.max(lerp(sill, belt, 0.62), ya + 0.07)],
      [w + fl * 0.6 + bulge * 0.4 - 0.005, Math.max(belt - 0.06, ya + 0.09)],
      [w + fl * 0.3 - 0.02, belt],
      [w * 0.95 + fl * 0.15 - 0.03, belt + (def.fenderRise ?? 0.012)],
    ];
    // Bonnet / boot: an arc from the fender top to the centre line.
    const ex = w * 0.86, ey = Math.min(H - crown, belt + 0.02);
    const hoodPts = [1, 0.72, 0.47, 0.23, 0].map((f) => [ex * f, lerp(H, ey, f * f)]);
    // Cabin: window base, glass top, roof edge, roof, centre.
    const R = this.roof(z);
    const c = R < 0 ? 0 : smooth((R - H) / 0.16);
    let cab = hoodPts;
    if (c > 0) {
      const rw = this.roofW(z), bw = w * (def.baseW ?? 0.93);
      const by = belt + 0.025;
      const rc = def.roofCrown ?? 0.045;
      cab = [
        [bw, by],
        [lerp(bw, rw, 0.88) + 0.012, lerp(by, R - rc, 0.9)],
        [rw, R - rc],
        [rw * 0.52, R - rc * 0.28],
        [0, R],
      ];
    }
    for (let k = 0; k < 5; k++) p.push([lerp(hoodPts[k][0], cab[k][0], c), lerp(hoodPts[k][1], cab[k][1], c)]);
    return { p, c };
  }

  // Point on the left half at (z, t), t along the section 0..12, with x
  // optionally mirrored. Returns a Vector3.
  point(z, t, side = 1) {
    const { p } = this.section(z);
    const i = Math.max(0, Math.min(PTS - 2, Math.floor(t))), f = t - i;
    return new THREE.Vector3(lerp(p[i][0], p[i + 1][0], f) * side, lerp(p[i][1], p[i + 1][1], f), z);
  }

  normal(z, t, side = 1) {
    const e = 0.01;
    const a = this.point(z, t, side);
    const dz = this.point(z + e, t, side).sub(this.point(z - e, t, side));
    const dt = this.point(z, Math.min(12, t + 0.05), side).sub(this.point(z, Math.max(0, t - 0.05), side));
    const n = new THREE.Vector3().crossVectors(dt, dz).normalize();
    if (n.dot(new THREE.Vector3(a.x, a.y - 0.6, 0)) < 0) n.negate();
    return n;
  }

  // Ring positions along the car: every 5 cm, plus the keys.
  zs() {
    const out = [];
    for (let z = this.z0; z < this.z1 - 1e-6; z += 0.05) out.push(z);
    out.push(this.z1);
    return out;
  }

  inRanges(z, ranges) { return (ranges || []).some(([a, b]) => z >= Math.min(a, b) && z <= Math.max(a, b)); }

  // The body mesh: both halves and the end caps, with material groups. The
  // section is cut into panels (sill, side, fender top, glass, roof) that do
  // not share vertices, so the shoulder line and window edges stay crisp
  // while each panel is smooth.
  geometry() {
    const def = this.def;
    const zs = this.zs();
    const secs = zs.map((z) => this.section(z));
    const panels = def.panels || [[0, 2], [2, 6], [6, 8], [8, 10], [10, 12]];
    const pos = [], tris = [[], [], [], []];
    const slot = (k, j) => {
      const zm = (zs[k] + zs[k + 1]) / 2, c = Math.min(secs[k].c, secs[k + 1].c);
      if (j === 0) return SLOT.under;
      if (j === 1) return def.sillTrim ? SLOT.trim : SLOT.paint;
      if (j === 8) return c > 0.5 && this.inRanges(zm, def.windows) ? SLOT.glass : (c > 0.5 && this.inRanges(zm, def.pillarsBlack) ? SLOT.trim : SLOT.paint);
      if (j === 9) return c > 0.5 && this.inRanges(zm, def.windows) ? SLOT.trim : SLOT.paint;
      if (j >= 10) return this.inRanges(zm, [def.screen, def.rearGlass]) ? SLOT.glass : SLOT.paint;
      return SLOT.paint;
    };
    for (const side of [1, -1]) {
      for (const [p0, p1] of panels) {
        const cols = p1 - p0 + 1, base = pos.length / 3;
        zs.forEach((z, k) => { for (let j = p0; j <= p1; j++) pos.push(secs[k].p[j][0] * side, secs[k].p[j][1], z); });
        const vid = (k, j) => base + k * cols + (j - p0);
        for (let k = 0; k < zs.length - 1; k++) {
          for (let j = p0; j < p1; j++) {
            const a = vid(k, j), b = vid(k, j + 1), c = vid(k + 1, j + 1), d = vid(k + 1, j);
            const list = tris[slot(k, j)];
            if (side > 0) list.push(a, b, c, a, c, d); else list.push(a, c, b, a, d, c);
          }
        }
      }
    }
    // End caps, flat, with their own vertices so they shade flat.
    for (const [k, facing] of [[0, -1], [zs.length - 1, 1]]) {
      const ring = [...secs[k].p.map(([x, y]) => [x, y]), ...secs[k].p.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
      const cy = ring.reduce((t, q) => t + q[1], 0) / ring.length;
      const base = pos.length / 3;
      pos.push(0, cy, zs[k]);
      for (const [x, y] of ring) pos.push(x, y, zs[k]);
      for (let i = 0; i < ring.length - 1; i++) {
        if (facing > 0) tris[SLOT.paint].push(base, base + 1 + i, base + 2 + i);
        else tris[SLOT.paint].push(base, base + 2 + i, base + 1 + i);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const idx = [];
    tris.forEach((list, m) => { g.addGroup(idx.length, list.length, m); idx.push(...list); });
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // A patch laid on the surface over z0..z1, from t0 to t1 along the
  // section (each may be a function of z for slanted shapes), lifted by
  // `lift` so it sits just above the paint. Both sides unless one is given.
  decal(z0, z1, t0, t1, { lift = 0.004, sides = [1, -1], nz = 6, nt = 4, uv = false } = {}) {
    const T0 = typeof t0 === 'function' ? t0 : () => t0, T1 = typeof t1 === 'function' ? t1 : () => t1;
    const pos = [], idx = [], uvs = [];
    for (const side of sides) {
      const base = pos.length / 3;
      for (let a = 0; a <= nz; a++) {
        const z = lerp(z0, z1, a / nz);
        for (let b = 0; b <= nt; b++) {
          const t = lerp(T0(z), T1(z), b / nt);
          const p = this.point(z, t, side).add(this.normal(z, t, side).multiplyScalar(lift));
          pos.push(p.x, p.y, p.z);
          // Texture reads the right way round from either side of the car.
          uvs.push(side > 0 ? 1 - a / nz : a / nz, b / nt);
        }
      }
      for (let a = 0; a < nz; a++) for (let b = 0; b < nt; b++) {
        const i = base + a * (nt + 1) + b, j = i + nt + 1;
        if (side > 0) idx.push(i, j, j + 1, i, j + 1, i + 1); else idx.push(i, j + 1, j, i, i + 1, j + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // Wind toward the outside whichever way the patch was given.
    const n = g.attributes.normal, p = g.attributes.position;
    const mid = Math.floor(n.count / (sides.length * 2));
    const out = new THREE.Vector3(p.getX(mid), p.getY(mid) - 0.6, 0);
    if (new THREE.Vector3(n.getX(mid), n.getY(mid), n.getZ(mid)).dot(out) < 0) {
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i += 3) { const s = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = s; }
      g.computeVertexNormals();
    }
    return g;
  }

  // The outline of the end of the car (front if facing > 0), as [x, y] for
  // the full width: for drawing grilles and lamps on the nose and tail.
  endRing(facing) {
    const k = facing > 0 ? this.z1 : this.z0;
    const { p } = this.section(k);
    return { z: k, pts: p };
  }
}

// A flat shape on the nose or tail (facing +1 front, -1 rear), from a list
// of [x, y] points, pushed out by `out` metres.
export function flatShape(points, z, facing, out = 0.004) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ShapeGeometry(s);
  if (facing < 0) g.rotateY(Math.PI).scale(-1, 1, 1);
  g.translate(0, 0, z + facing * out);
  if (facing < 0) { // the mirror flipped the winding back; turn it outward again
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    g.computeVertexNormals();
  }
  return g;
}

// A rounded rectangle outline (for flatShape), centred on cx, cy.
export function roundRect(cx, cy, w, h, r, seg = 3) {
  const pts = [];
  const corners = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5]];
  for (const [x, y, a0] of corners) for (let i = 0; i <= seg; i++) {
    const a = a0 + (i / seg) * Math.PI / 2;
    pts.push([cx + x + Math.cos(a) * r, cy + y + Math.sin(a) * r]);
  }
  return pts;
}
