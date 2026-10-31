// Rims you can fit in the garage: real 3D wheels with spokes, a barrel, a lip,
// wheel nuts and a plain centre cap, sized to each car's own tyre. They swap
// only the rim: the car keeps its tyre and brakes (see buildCar). The spin
// axis is x, the rim's face looks along +x.

import * as THREE from 'three';

class Soup {
  constructor() { this.pos = []; this.idx = []; }
  // A skin through rings, each the same length.
  loft(rings, closed = true) {
    const base = this.pos.length / 3, m = rings[0].length;
    for (const r of rings) for (const p of r) this.pos.push(p[0], p[1], p[2]);
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < (closed ? m : m - 1); j++) {
        const k = (j + 1) % m, a = base + i * m + j, b = base + (i + 1) * m + j, c = base + (i + 1) * m + k, d = base + i * m + k;
        this.idx.push(a, b, c, a, c, d);
      }
    }
  }
  // A profile [x, radius] turned round the axle.
  lathe(profile, seg = 56) {
    const rings = profile.map(([x, r]) => Array.from({ length: seg }, (_, j) => {
      const a = (j / seg) * Math.PI * 2;
      return [x, r * Math.cos(a), r * Math.sin(a)];
    }));
    this.loft(rings);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

// One spoke from hub to rim. t runs 0 to 1 along it; `half` is its half width,
// `depth` how far out along the axle it sits, `twist` swings it round.
function spoke(s, { a, r0, r1, half, depth, thick, twist = () => 0 }) {
  const rings = [];
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const t = i / N, r = r0 + (r1 - r0) * t, h = half(t), x = depth(t), th = thick(t), ang = a + twist(t);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const sec = [[-h, 0], [-h * 0.82, th * 0.8], [-h * 0.5, th], [h * 0.5, th], [h * 0.82, th * 0.8], [h, 0], [h * 0.7, -th * 0.7], [-h * 0.7, -th * 0.7]];
    rings.push(sec.map(([w, d]) => [x + d, r * ca - w * sa, r * sa + w * ca]));
  }
  s.loft(rings);
}

// Each design as spokes. R: rim radius, w: rim width.
const DESIGNS = {
  five: (s, R, w, F) => { for (let i = 0; i < 5; i++) spoke(s, { a: (i / 5) * Math.PI * 2, ...F, half: (t) => R * (0.125 - 0.05 * t + 0.07 * t ** 4), thick: (t) => R * (0.075 - 0.02 * t) }); },
  six: (s, R, w, F) => { for (let i = 0; i < 6; i++) spoke(s, { a: (i / 6) * Math.PI * 2, ...F, half: (t) => R * (0.09 - 0.03 * t + 0.05 * t ** 4), thick: (t) => R * (0.07 - 0.02 * t) }); },
  ten: (s, R, w, F) => { for (let i = 0; i < 10; i++) spoke(s, { a: (i / 10) * Math.PI * 2, ...F, half: (t) => R * (0.05 - 0.012 * t + 0.03 * t ** 4), thick: (t) => R * 0.05 }); },
  split: (s, R, w, F) => {
    for (let i = 0; i < 5; i++) for (const d of [1, -1]) {
      spoke(s, { a: (i / 5) * Math.PI * 2 + d * 0.05, ...F, half: (t) => R * (0.05 - 0.012 * t + 0.015 * t ** 4), thick: (t) => R * 0.055, twist: (t) => d * 0.2 * t ** 1.4 });
    }
  },
  mesh: (s, R, w, F) => {
    for (let i = 0; i < 16; i++) for (const d of [1, -1]) {
      spoke(s, { a: (i / 16) * Math.PI * 2, ...F, depth: (t) => F.depth(t) + d * R * 0.012, half: () => R * 0.016, thick: () => R * 0.022, twist: (t) => d * 0.6 * (t - 0.5) });
    }
  },
  dish: (s, R, w, F) => { for (let i = 0; i < 5; i++) spoke(s, { a: (i / 5) * Math.PI * 2, ...F, half: (t) => R * (0.11 - 0.03 * t + 0.06 * t ** 3), thick: (t) => R * 0.07 }); },
};

const rimCache = new Map();

// The rim's body and its wheel nuts, as two geometries.
export function rimGeometry(style, R, w) {
  const key = `${style}:${R.toFixed(3)}:${w.toFixed(3)}`;
  if (rimCache.has(key)) return rimCache.get(key);
  const out = w / 2, s = new Soup(), deep = style === 'dish', lipIn = deep ? R * 0.74 : R * 0.9;
  // The barrel, from the lip back into the wheel. A deep dish steps in far.
  const lip = [[out - 0.008, R + 0.006], [out, R + 0.002], [out + 0.001, R - 0.006], [out - 0.004, R - 0.012]];
  if (deep) s.lathe([...lip, [out - 0.008, R - 0.02], [-out * 0.02, lipIn + 0.012], [-out * 0.1, lipIn], [-out * 0.2, R * 0.9], [-out, R * 0.92], [-out - 0.004, R * 0.97]], 64);
  else s.lathe([...lip, [out - 0.024, R * 0.93], [out * 0.5, lipIn], [-out * 0.2, R * 0.87], [-out, R * 0.9], [-out - 0.004, R * 0.96]], 64);
  const hub = R * 0.24, faceHub = deep ? -out * 0.14 : out * 0.34, faceRim = deep ? -out * 0.02 : out * 0.78;
  const F = { r0: hub * 0.8, r1: lipIn + 0.006, depth: (t) => faceHub + (faceRim - faceHub) * t ** 1.3 };
  DESIGNS[style](s, R, w, F);
  // Hub and a plain centre cap (no badge).
  const fh = faceHub + R * 0.05;
  s.lathe([[fh + 0.012, 0.0001], [fh + 0.012, hub * 0.42], [fh + 0.008, hub * 0.5], [fh, hub * 0.53], [fh - 0.002, hub * 0.82], [fh - 0.012, hub], [fh - 0.05, hub]], 32);
  const nuts = new Soup(), nutR = R * 0.012 + 0.008;
  const count = style === 'six' ? 6 : 5, step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const a = (i + 0.5) * step, y = Math.cos(a) * hub * 0.72, z = Math.sin(a) * hub * 0.72;
    const ring = (x, r) => Array.from({ length: 6 }, (_, j) => { const b = (j / 6) * Math.PI * 2; return [x, y + r * Math.cos(b), z + r * Math.sin(b)]; });
    nuts.loft([ring(fh - 0.004, nutR), ring(fh + 0.012, nutR), ring(fh + 0.016, nutR * 0.7), ring(fh + 0.0165, 0.0001)]);
  }
  const g = { rim: s.geometry(), nuts: nuts.geometry() };
  rimCache.set(key, g);
  return g;
}

// A rim's picture for the garage list: its real shape, drawn face-on from the
// model, nearest parts last, lit from above left.
export function drawRim(canvas, style, colour = '#b8bcc0') {
  const g = canvas.getContext('2d'), W = canvas.width, c = W / 2, R = 0.5, scale = (c - 2) / (R + 0.01);
  const { rim, nuts } = rimGeometry(style, R, 0.5);
  const base = new THREE.Color(colour), L = new THREE.Vector3(0.75, 0.45, -0.45).normalize();
  const tris = [], a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3();
  for (const [geo, tone] of [[rim, 1], [nuts, 0.5]]) {
    const P = geo.attributes.position, I = geo.index;
    for (let t = 0; t < I.count; t += 3) {
      a.fromBufferAttribute(P, I.getX(t)); b.fromBufferAttribute(P, I.getX(t + 1)); d.fromBufferAttribute(P, I.getX(t + 2));
      n.copy(b).sub(a).cross(d.clone().sub(a)).normalize();
      if (n.x < 0) n.negate();
      const lit = (0.22 + 0.95 * Math.max(0, n.dot(L)) ** 1.4) * tone;
      tris.push({ x: (a.x + b.x + d.x) / 3, p: [a.z, a.y, b.z, b.y, d.z, d.y], lit });
    }
  }
  tris.sort((p, q) => p.x - q.x);
  g.clearRect(0, 0, W, W);
  g.fillStyle = '#0a0b0c'; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
  const col = new THREE.Color();
  for (const t of tris) {
    col.copy(base).multiplyScalar(t.lit);
    const hex = `#${col.getHexString()}`;
    g.fillStyle = hex; g.strokeStyle = hex; g.lineWidth = 0.4;
    g.beginPath();
    g.moveTo(c + t.p[0] * scale, c - t.p[1] * scale); g.lineTo(c + t.p[2] * scale, c - t.p[3] * scale); g.lineTo(c + t.p[4] * scale, c - t.p[5] * scale);
    g.closePath(); g.fill(); g.stroke();
  }
}
