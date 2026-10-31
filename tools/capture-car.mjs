// Turns a detailed GLB of a car into the game's own compact car file. The GLB
// is only the source: this sorts its parts into the game's materials (paint,
// glass, lamps...), throws away badges and logos, finds the wheels, scales the
// car so its axles sit where the physics has them, stands it on the road,
// finds the bonnet panel, measures the body (src/vehicles/captured.js uses
// that for kits, wings and the engine bay), and simplifies everything for
// browsers. Output: assets/cars/<id>.bin and any textures it needs.
//
//   node tools/capture-car.mjs            all cars in tools/car-recipes.mjs
//   node tools/capture-car.mjs gtar-r35   one car
//
// Needs `npm install` (meshoptimizer) and the GLBs in GLB/ (git-ignored).
// The game itself needs neither: it only reads assets/cars/.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier as Simplifier } from 'meshoptimizer';
import { RECIPES } from './car-recipes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets/cars');
const POS_SCALE = 8000; // positions are stored as whole 1/8000ths of a metre

// --- Reading a GLB --------------------------------------------------------

function readGlb(path) {
  const b = readFileSync(path);
  const jsonLen = b.readUInt32LE(12);
  const j = JSON.parse(b.slice(20, 20 + jsonLen).toString());
  const bin = 20 + jsonLen + 8;
  const accessor = (i) => {
    const a = j.accessors[i], v = j.bufferViews[a.bufferView];
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const size = { 5126: 4, 5125: 4, 5123: 2, 5122: 2, 5121: 1, 5120: 1 }[a.componentType];
    const stride = v.byteStride || size * comps;
    const base = bin + (v.byteOffset || 0) + (a.byteOffset || 0);
    const out = new Float64Array(a.count * comps);
    const rd = { 5126: (o) => b.readFloatLE(o), 5125: (o) => b.readUInt32LE(o), 5123: (o) => b.readUInt16LE(o), 5122: (o) => b.readInt16LE(o), 5121: (o) => b.readUInt8(o), 5120: (o) => b.readInt8(o) }[a.componentType];
    for (let i2 = 0; i2 < a.count; i2++) for (let c = 0; c < comps; c++) out[i2 * comps + c] = rd(base + i2 * stride + c * size);
    return out;
  };
  const image = (i) => {
    const im = j.images[i], v = j.bufferViews[im.bufferView];
    return { data: b.slice(bin + (v.byteOffset || 0), bin + (v.byteOffset || 0) + v.byteLength), mime: im.mimeType };
  };
  return { j, accessor, image };
}

const mul = (a, c) => {
  const r = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) for (let l = 0; l < 4; l++) r[k * 4 + i] += a[l * 4 + i] * c[k * 4 + l];
  return r;
};
const local = (n) => {
  if (n.matrix) return n.matrix;
  const t = n.translation || [0, 0, 0], [x, y, z, w] = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
  return [(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
    2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
    2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1];
};

// Every triangle soup of the file in world space, with its material and node.
function primitives(glb) {
  const { j, accessor } = glb, out = [];
  const walk = (i, m) => {
    const n = j.nodes[i], w = mul(m, local(n));
    if (n.mesh != null) for (const pr of j.meshes[n.mesh].primitives) {
      const P = accessor(pr.attributes.POSITION), N = pr.attributes.NORMAL != null ? accessor(pr.attributes.NORMAL) : null;
      const U = pr.attributes.TEXCOORD_0 != null ? accessor(pr.attributes.TEXCOORD_0) : null;
      const X = pr.indices != null ? accessor(pr.indices) : Float64Array.from({ length: P.length / 3 }, (_, k) => k);
      const count = P.length / 3, pos = new Float64Array(count * 3), nor = new Float64Array(count * 3);
      for (let k = 0; k < count; k++) {
        const x = P[k * 3], y = P[k * 3 + 1], z = P[k * 3 + 2];
        pos[k * 3] = w[0] * x + w[4] * y + w[8] * z + w[12];
        pos[k * 3 + 1] = w[1] * x + w[5] * y + w[9] * z + w[13];
        pos[k * 3 + 2] = w[2] * x + w[6] * y + w[10] * z + w[14];
        if (N) {
          const a = N[k * 3], c = N[k * 3 + 1], d = N[k * 3 + 2];
          const nx = w[0] * a + w[4] * c + w[8] * d, ny = w[1] * a + w[5] * c + w[9] * d, nz = w[2] * a + w[6] * c + w[10] * d;
          const l = Math.hypot(nx, ny, nz) || 1;
          nor[k * 3] = nx / l; nor[k * 3 + 1] = ny / l; nor[k * 3 + 2] = nz / l;
        }
      }
      out.push({ node: n.name || '', material: pr.material, pos, nor, uv: U, idx: X, hasNormals: !!N });
    }
    (n.children || []).forEach((c) => walk(c, w));
  };
  j.scenes[j.scene || 0].nodes.forEach((i) => walk(i, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
  return out;
}

// --- Building parts -------------------------------------------------------

// A growing mesh. Vertices are kept as they came (seams and all), so the
// file's own normals and texture coordinates survive.
class Soup {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; }
  get tris() { return this.idx.length / 3; }
  add(prim, triTest, xform) {
    const map = new Map();
    const v = (i) => {
      if (map.has(i)) return map.get(i);
      const k = this.pos.length / 3;
      const p = [prim.pos[i * 3], prim.pos[i * 3 + 1], prim.pos[i * 3 + 2]], n = [prim.nor[i * 3], prim.nor[i * 3 + 1], prim.nor[i * 3 + 2]];
      if (xform) xform(p, n);
      this.pos.push(...p); this.nor.push(...n);
      this.uv.push(prim.uv ? prim.uv[i * 2] : 0, prim.uv ? prim.uv[i * 2 + 1] : 0);
      map.set(i, k);
      return k;
    };
    for (let t = 0; t < prim.idx.length; t += 3) {
      const a = prim.idx[t], b = prim.idx[t + 1], c = prim.idx[t + 2];
      if (triTest && !triTest(a, b, c)) continue;
      this.idx.push(v(a), v(b), v(c));
    }
  }
}

function fixNormals(s) {
  // Files without normals: smooth ones from the faces, joined by position.
  const key = (i) => `${Math.round(s.pos[i * 3] * 2000)},${Math.round(s.pos[i * 3 + 1] * 2000)},${Math.round(s.pos[i * 3 + 2] * 2000)}`;
  const acc = new Map();
  for (let t = 0; t < s.idx.length; t += 3) {
    const [a, b, c] = [s.idx[t], s.idx[t + 1], s.idx[t + 2]];
    const ax = s.pos[b * 3] - s.pos[a * 3], ay = s.pos[b * 3 + 1] - s.pos[a * 3 + 1], az = s.pos[b * 3 + 2] - s.pos[a * 3 + 2];
    const bx = s.pos[c * 3] - s.pos[a * 3], by = s.pos[c * 3 + 1] - s.pos[a * 3 + 1], bz = s.pos[c * 3 + 2] - s.pos[a * 3 + 2];
    const n = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
    for (const i of [a, b, c]) { const k = key(i); const e = acc.get(k) || [0, 0, 0]; e[0] += n[0]; e[1] += n[1]; e[2] += n[2]; acc.set(k, e); }
  }
  for (let i = 0; i < s.pos.length / 3; i++) {
    const e = acc.get(key(i)); if (!e) continue;
    const l = Math.hypot(...e) || 1;
    s.nor[i * 3] = e[0] / l; s.nor[i * 3 + 1] = e[1] / l; s.nor[i * 3 + 2] = e[2] / l;
  }
}

// Simplify to `ratio` of the triangles, holding shape (and normals) to
// within `error`, a fraction of the part's size.
function simplify(s, ratio, error = 0.002) {
  if (ratio >= 1 || s.idx.length < 60) return s;
  const idx = Uint32Array.from(s.idx), pos = Float32Array.from(s.pos), nor = Float32Array.from(s.nor);
  const target = Math.max(12, Math.floor(idx.length * ratio / 3) * 3);
  const [out] = Simplifier.simplifyWithAttributes(idx, pos, 3, nor, 3, [0.6, 0.6, 0.6], null, target, error, []);
  const r = new Soup(), map = new Map();
  for (const i of out) {
    if (!map.has(i)) {
      map.set(i, r.pos.length / 3);
      r.pos.push(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]);
      r.nor.push(s.nor[i * 3], s.nor[i * 3 + 1], s.nor[i * 3 + 2]);
      r.uv.push(s.uv[i * 2], s.uv[i * 2 + 1]);
    }
    r.idx.push(map.get(i));
  }
  return r;
}

// Islands of triangles that share corners (by position).
function islands(s) {
  const n = s.pos.length / 3, parent = new Int32Array(n).map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const seen = new Map();
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(s.pos[i * 3] * 2000)},${Math.round(s.pos[i * 3 + 1] * 2000)},${Math.round(s.pos[i * 3 + 2] * 2000)}`;
    if (seen.has(k)) parent[find(i)] = find(seen.get(k)); else seen.set(k, i);
  }
  for (let t = 0; t < s.idx.length; t += 3) { parent[find(s.idx[t + 1])] = find(s.idx[t]); parent[find(s.idx[t + 2])] = find(s.idx[t]); }
  const groups = new Map();
  for (let t = 0; t < s.idx.length; t += 3) {
    const r = find(s.idx[t]);
    if (!groups.has(r)) groups.set(r, { tris: [], min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] });
    const g = groups.get(r); g.tris.push(t);
    for (const i of [s.idx[t], s.idx[t + 1], s.idx[t + 2]]) for (let c = 0; c < 3; c++) { g.min[c] = Math.min(g.min[c], s.pos[i * 3 + c]); g.max[c] = Math.max(g.max[c], s.pos[i * 3 + c]); }
  }
  return [...groups.values()];
}

function take(s, tris) {
  const r = new Soup(), map = new Map();
  for (const t of tris) for (let k = 0; k < 3; k++) {
    const i = s.idx[t + k];
    if (!map.has(i)) {
      map.set(i, r.pos.length / 3);
      r.pos.push(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]);
      r.nor.push(s.nor[i * 3], s.nor[i * 3 + 1], s.nor[i * 3 + 2]);
      r.uv.push(s.uv[i * 2], s.uv[i * 2 + 1]);
    }
    r.idx.push(map.get(i));
  }
  return r;
}

// Copy a texture out of the GLB, smaller. Alpha survives only as PNG.
function saveTexture(glb, texIndex, id, name, keepAlpha, size) {
  const { data, mime } = glb.image(glb.j.textures[texIndex].source);
  const tmp = join(tmpdir(), `cap-${process.pid}.${mime.split('/')[1]}`);
  writeFileSync(tmp, data);
  const file = `${id}-${name}.${keepAlpha ? 'png' : 'jpg'}`;
  const args = ['-Z', String(size), '-s', 'format', keepAlpha ? 'png' : 'jpeg'];
  if (!keepAlpha) args.push('-s', 'formatOptions', '72');
  execFileSync('sips', [...args, tmp, '--out', join(OUT, 'tex', file)], { stdio: 'ignore' });
  return file;
}

// --- One car --------------------------------------------------------------

function capture(R) {
  const glb = readGlb(join(ROOT, 'GLB', R.glb));
  const { j } = glb;
  const prims = primitives(glb);
  const rule = (p) => {
    const name = `${j.materials[p.material]?.name || ''}|${p.node}`;
    for (const r of R.rules) if (r[0].test(name)) return r;
    return null;
  };
  // 1. Which part is which.
  const unknown = new Map();
  for (const p of prims) {
    p.rule = rule(p);
    p.slot = p.rule ? p.rule[1] : 'asis';
    if (p.slot === 'wheel-sort') { p.slot = 'tyre'; p.sort = true; } // rim and tyre in one material: split by radius
    if (!p.rule) unknown.set(j.materials[p.material]?.name, (unknown.get(j.materials[p.material]?.name) || 0) + p.idx.length / 3);
  }
  if (unknown.size) console.log('  kept as they are:', [...unknown].map(([k, v]) => `${k} (${v})`).join(', '));

  // 2. Wheels: the tyres' four clusters give centres and size. Corners of
  // the car are found from the tyres themselves.
  const raw = [[], [], [], []]; // +x+z, -x+z, +x-z, -x-z
  let cx = 0, cz = 0, n = 0;
  const tyres = prims.filter((p) => p.slot === 'tyre' || p.slot === 'rim');
  for (const p of tyres) for (let i = 0; i < p.pos.length; i += 3) { cx += p.pos[i]; cz += p.pos[i + 2]; n++; }
  cx /= n; cz /= n;
  for (const p of tyres) for (let i = 0; i < p.pos.length; i += 3) raw[(p.pos[i] > cx ? 0 : 1) + (p.pos[i + 2] > cz ? 0 : 2)].push(i < 0 ? 0 : [p.pos[i], p.pos[i + 1], p.pos[i + 2]]);
  const boxes = raw.map((pts) => {
    const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
    for (const q of pts) for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], q[c]); max[c] = Math.max(max[c], q[c]); }
    return { min, max, c: min.map((v, c) => (v + max[c]) / 2), r: (max[1] - min[1]) / 2 };
  });
  const measuredBase = (boxes[0].c[2] + boxes[1].c[2]) / 2 - (boxes[2].c[2] + boxes[3].c[2]) / 2;
  const [zf, zr] = R.axles;
  const sign = R.flip ? -1 : 1;
  const s = (zf - zr) / Math.abs(measuredBase);
  const groundY = Math.min(...boxes.map((b) => b.min[1]));
  const zMid = (boxes[0].c[2] + boxes[1].c[2] + boxes[2].c[2] + boxes[3].c[2]) / 4;
  const xMid = (boxes[0].c[0] + boxes[1].c[0] + boxes[2].c[0] + boxes[3].c[0]) / 4;
  const xf = (p, nor) => {
    const x = (p[0] - xMid) * s * sign, y = (p[1] - groundY) * s, z = (p[2] - zMid) * s * sign + (zf + zr) / 2;
    p[0] = x; p[1] = y; p[2] = z;
    if (nor) { nor[0] *= sign; nor[2] *= sign; }
  };
  const wheelAt = boxes.map((b) => { const p = [...b.c]; xf(p); return { c: p, r: b.r * s, w: (b.max[0] - b.min[0]) * s }; });

  // 3. Sort triangles into parts.
  const groupOf = (slot) => ['rim', 'tyre'].includes(slot) ? 'spin' : ['disc', 'caliper'].includes(slot) ? 'hub' : slot === 'drop' ? null : 'body';
  const parts = new Map();
  const partFor = (key, info) => { if (!parts.has(key)) parts.set(key, { ...info, soup: new Soup() }); return parts.get(key); };
  const pbr = (mi) => {
    const m = j.materials[mi] || {}, b = m.pbrMetallicRoughness || {};
    return { color: b.baseColorFactor || [1, 1, 1, 1], metal: b.metallicFactor ?? 1, rough: b.roughnessFactor ?? 1, alpha: m.alphaMode || 'OPAQUE', texIndex: b.baseColorTexture?.index ?? null, double: !!m.doubleSided, name: m.name };
  };
  // Wheels near a corner of the car, measured on the file's own numbers.
  const cornerOf = (p, i) => {
    let best = 0, d = 1e18;
    boxes.forEach((b, k) => { const e = (p.pos[i * 3] - b.c[0]) ** 2 + (p.pos[i * 3 + 1] - b.c[1]) ** 2 + (p.pos[i * 3 + 2] - b.c[2]) ** 2; if (e < d) { d = e; best = k; } });
    return best;
  };
  for (const p of prims) {
    const opts = p.rule?.[2] || {};
    const group = opts.group || groupOf(p.slot);
    if (!group) continue;
    const m = pbr(p.material);
    if (!p.hasNormals) { const t = new Soup(); t.add(p); fixNormals(t); p.nor = Float64Array.from(t.nor); }
    if (group === 'spin' || group === 'hub') {
      // One wheel of each axle, in its own space around its centre. The car's
      // left wheels are the ones captured; the right ones are that wheel
      // turned round in the game.
      for (const [corner, axle] of [[0, 'F'], [2, 'R']]) {
        const b = boxes[corner];
        const localise = (q, nor) => {
          q[0] = (q[0] - b.c[0]) * s * sign; q[1] = (q[1] - b.c[1]) * s; q[2] = (q[2] - b.c[2]) * s * sign;
          if (nor) { nor[0] *= sign; nor[2] *= sign; }
        };
        const radial = (a, c, d) => Math.hypot((p.pos[a * 3 + 1] + p.pos[c * 3 + 1] + p.pos[d * 3 + 1]) / 3 - b.c[1], (p.pos[a * 3 + 2] + p.pos[c * 3 + 2] + p.pos[d * 3 + 2]) / 3 - b.c[2]) / b.r;
        if (p.sort) {
          const rimR = R.rimRatio ?? 0.74;
          partFor(`${group}${axle}:rim:${m.name}`, { slot: 'rim', group: group + axle, m }).soup.add(p, (a, c, d) => cornerOf(p, a) === corner && radial(a, c, d) < rimR, localise);
          partFor(`${group}${axle}:tyre:`, { slot: 'tyre', group: group + axle, m }).soup.add(p, (a, c, d) => cornerOf(p, a) === corner && radial(a, c, d) >= rimR, localise);
        } else {
          const key = `${group}${axle}:${p.slot}:${p.slot === 'rim' || p.slot === 'tyre' ? m.name : ''}`;
          partFor(key, { slot: p.slot, group: group + axle, m, opts }).soup.add(p, (a) => cornerOf(p, a) === corner, localise);
        }
      }
      continue;
    }
    // Split by end of the car where a slot asks for it (lamp atlases).
    const key = `${group}:${p.slot}:${p.slot === 'asis' || opts.keepTex ? m.name : ''}${opts.ends ? ':' : ''}`;
    if (opts.ends) {
      // A rear lamp sheet can also carry things low down (exhaust tips).
      const low = (a) => (p.pos[a * 3 + 1] - groundY) * s < (opts.tailMinY ?? 0);
      partFor(`${key}F`, { slot: `${p.slot}F`, group, m, opts }).soup.add(p, (a) => (p.pos[a * 3 + 2] - zMid) * sign > 0, xf);
      partFor(`${key}R`, { slot: `${p.slot}R`, group, m, opts }).soup.add(p, (a) => (p.pos[a * 3 + 2] - zMid) * sign <= 0 && !low(a), xf);
      if (opts.tailMinY) partFor(`${key}L`, { slot: 'asis', group, m, opts }).soup.add(p, (a) => (p.pos[a * 3 + 2] - zMid) * sign <= 0 && low(a), xf);
    } else partFor(key, { slot: p.slot, group, m, opts }).soup.add(p, null, xf);
  }

  // 4. Glass: only the outward faces, so you can see out from the driver's seat.
  for (const part of parts.values()) if (part.slot === 'glass') {
    const q = part.soup, keep = [];
    for (let t = 0; t < q.idx.length; t += 3) {
      const a = q.idx[t], b = q.idx[t + 1], c = q.idx[t + 2];
      const ax = q.pos[b * 3] - q.pos[a * 3], ay = q.pos[b * 3 + 1] - q.pos[a * 3 + 1], az = q.pos[b * 3 + 2] - q.pos[a * 3 + 2];
      const bx = q.pos[c * 3] - q.pos[a * 3], by = q.pos[c * 3 + 1] - q.pos[a * 3 + 1], bz = q.pos[c * 3 + 2] - q.pos[a * 3 + 2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const mx = (q.pos[a * 3] + q.pos[b * 3] + q.pos[c * 3]) / 3, my = (q.pos[a * 3 + 1] + q.pos[b * 3 + 1] + q.pos[c * 3 + 1]) / 3, mz = (q.pos[a * 3 + 2] + q.pos[b * 3 + 2] + q.pos[c * 3 + 2]) / 3;
      if (nx * mx + ny * (my - 0.8) + nz * (mz - (zf + zr) / 2) > 0) keep.push(t);
    }
    part.soup = take(q, keep);
  }

  // Small emblems inside a part: `erase` lists spheres [x, y, z, r].
  for (const [key, part] of parts) for (const [ex, ey, ez, er] of R.erase || []) {
    if (part.group !== 'body') continue;
    const q = part.soup, keep = [];
    const list = islands(q);
    for (const g of list) {
      const c = g.min.map((v, i) => (v + g.max[i]) / 2), size = Math.max(...g.max.map((v, i) => v - g.min[i]));
      if (Math.hypot(c[0] - ex, c[1] - ey, c[2] - ez) < er && size < er * 2.2) { console.log('   erased', part.slot, part.m.name, g.tris.length); continue; }
      keep.push(...g.tris);
    }
    part.soup = take(q, keep);
  }

  // 5. Measure the body: the curves kits, wings and the engine bay read.
  const shell = [...parts.values()].filter((p) => p.group === 'body' && /^(paint|paint2)/.test(p.slot)).map((p) => p.soup);
  const glassS = [...parts.values()].filter((p) => p.slot === 'glass').map((p) => p.soup);
  const samples = (list, fn) => { for (const q of list) for (let i = 0; i < q.pos.length; i += 3) fn(q.pos[i], q.pos[i + 1], q.pos[i + 2]); };
  let z0 = 1e9, z1 = -1e9;
  samples(shell, (x, y, z) => { z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
  const glassZ = [1e9, -1e9]; const roofZ = [];
  samples(glassS, (x, y, z) => { if (Math.abs(x) < 0.3) { glassZ[0] = Math.min(glassZ[0], z); glassZ[1] = Math.max(glassZ[1], z); } });
  const stations = []; for (let z = z0; z < z1; z += 0.2) stations.push(z); stations.push(z1);
  const measure = stations.map((z) => {
    const near = []; samples(shell, (x, y, zz) => { if (Math.abs(zz - z) < 0.12) near.push([Math.abs(x), y]); });
    const ng = []; samples(glassS, (x, y, zz) => { if (Math.abs(zz - z) < 0.12) ng.push([Math.abs(x), y]); });
    if (near.length < 4) return null;
    const ys = near.map((q) => q[1]);
    const mid = near.filter((q) => q[0] < 0.45).map((q) => q[1]);
    const top = Math.max(...(mid.length ? mid : ys));
    const low = near.filter((q) => q[1] < 0.9).map((q) => q[0]).sort((a, b) => a - b);
    return { z, w: low.length ? low[Math.floor(low.length * 0.97)] : 0.7, sill: Math.max(0.1, Math.min(...ys)), top, roof: ng.length ? Math.max(top, ...ng.map((q) => q[1])) : top };
  }).filter(Boolean);
  const rise = Math.max(...measure.map((q) => q.roof));
  const cabin = measure.filter((q) => q.roof > 1.0 && q.z < glassZ[1] + 0.05 && q.z > glassZ[0] - 0.05);
  const key = (f) => measure.map((q) => [+q.z.toFixed(3), +f(q).toFixed(3)]);
  const def = {
    width: key((q) => q.w), sill: key((q) => q.sill),
    hood: key((q) => (q.z > glassZ[0] && q.z < glassZ[1] ? Math.min(q.top, 1.02) : q.top)),
    belt: key((q) => Math.min(q.top, 0.98)),
    roof: cabin.map((q) => [+q.z.toFixed(3), +q.roof.toFixed(3)]),
    roofW: cabin.map((q) => [+q.z.toFixed(3), +(q.w * 0.75).toFixed(3)]),
    wheels: { z: [zf, zr], r: wheelAt[0].r + 0.04, top: wheelAt[0].r * 2 + 0.02, flare: [0, 0] },
    windows: [], pillarsBlack: [],
    screen: [+glassZ[1].toFixed(3), +(glassZ[1] - 0.5).toFixed(3)], rearGlass: [+glassZ[0].toFixed(3), +(glassZ[0] + 0.3).toFixed(3)],
  };

  // 6. The bonnet (or a mid-engined car's lid): the biggest island of paint
  // in the box the recipe gives, its own panel so it can lift.
  let lid = null;
  if (R.bonnet) {
    const paint = [...parts.values()].find((p) => p.slot === 'paint' && p.group === 'body');
    const list = islands(paint.soup);
    if (R.listIslands) for (const g of list.sort((a, b) => b.tris.length - a.tris.length).slice(0, 14)) console.log('   island', g.tris.length, g.min.map((v) => +v.toFixed(2)).join(' '), '..', g.max.map((v) => +v.toFixed(2)).join(' '));
    const [bz0, bz1] = R.bonnet.z, minY = R.bonnet.y ?? 0.7;
    const inBox = list.filter((g) => g.min[2] > bz0 && g.max[2] < bz1 && g.min[1] > minY).sort((a, b) => b.tris.length - a.tris.length);
    const big = inBox[0];
    // The panel, and anything small sitting on it (vents, scoops).
    const hit = big ? inBox.filter((g) => g === big || (g.min[0] > big.min[0] && g.max[0] < big.max[0] && g.min[2] > big.min[2] && g.max[2] < big.max[2])) : [];
    if (hit.length) {
      const tris = hit.flatMap((g) => g.tris), inSet = new Set(tris), rest = [];
      for (let t = 0; t < paint.soup.idx.length; t += 3) if (!inSet.has(t)) rest.push(t);
      const lidSoup = take(paint.soup, tris);
      paint.soup = take(paint.soup, rest);
      parts.set('lid', { slot: 'paint', group: 'lid', m: paint.m, opts: { double: true }, soup: lidSoup });
      let a = 1e9, b = -1e9;
      for (const g of hit) { a = Math.min(a, g.min[2]); b = Math.max(b, g.max[2]); }
      lid = [+a.toFixed(3), +b.toFixed(3)];
    } else console.log('   no bonnet island found');
  }

  if (R.findSteering) {
    // Help for writing a recipe: interior islands the size of a steering wheel.
    for (const part of parts.values()) {
      if (part.group !== 'body' || part.slot !== 'asis') continue;
      for (const g of islands(part.soup)) {
        const size = g.min.map((v, c) => g.max[c] - v), c = g.min.map((v, k) => (v + g.max[k]) / 2);
        if (size[0] > 0.26 && size[0] < 0.46 && size[1] > 0.2 && c[1] > 0.6 && c[1] < 1.15 && Math.abs(c[0]) > 0.2 && Math.abs(c[0]) < 0.6) console.log('   wheel?', part.m.name.slice(-22), g.tris.length, 'centre', c.map((v) => +v.toFixed(3)).join(' '), 'size', size.map((v) => +v.toFixed(3)).join(' '));
      }
    }
  }

  // 7. Steering wheel: the interior island the recipe points at (`findSteering`
  // lists candidates). Its axis is the direction it is thinnest in.
  let steering = null;
  if (R.steering) {
    let best = null;
    for (const [k, part] of parts) {
      if (part.group !== 'body' || part.slot !== 'asis') continue;
      for (const g of islands(part.soup)) {
        const c = g.min.map((v, i) => (v + g.max[i]) / 2), d = Math.hypot(c[0] - R.steering[0], c[1] - R.steering[1], c[2] - R.steering[2]);
        if (!best || d < best.d) best = { d, g, part, c, k };
      }
    }
    const { g, part, c } = best, q = part.soup;
    // Spread of the island's corners, then the direction of least spread:
    // repeatedly apply (trace - spread) so the smallest direction wins.
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const t of g.tris) for (let e = 0; e < 3; e++) {
      const i = q.idx[t + e], v = [q.pos[i * 3] - c[0], q.pos[i * 3 + 1] - c[1], q.pos[i * 3 + 2] - c[2]];
      for (let a2 = 0; a2 < 3; a2++) for (let b2 = 0; b2 < 3; b2++) C[a2][b2] += v[a2] * v[b2];
    }
    const tr = C[0][0] + C[1][1] + C[2][2];
    let ax = [0, 0.3, 1];
    for (let it = 0; it < 200; it++) {
      const n = [0, 1, 2].map((r) => tr * ax[r] - C[r][0] * ax[0] - C[r][1] * ax[1] - C[r][2] * ax[2]);
      const l = Math.hypot(...n); ax = n.map((v) => v / l);
    }
    if (ax[2] < 0) ax = ax.map((v) => -v); // pointing forward, along the column
    const inSet = new Set(g.tris), rest = [];
    for (let t = 0; t < q.idx.length; t += 3) if (!inSet.has(t)) rest.push(t);
    // The badge on the hub goes under a plain pad (see capturedCabin); here
    // is how far the hub stands out towards the driver, and everything near
    // the axis takes its picture from plain hub just outside it.
    const wheel = take(q, g.tris);
    const off = (i) => { const d = [wheel.pos[i * 3] - c[0], wheel.pos[i * 3 + 1] - c[1], wheel.pos[i * 3 + 2] - c[2]]; const along = d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2]; return Math.hypot(d[0] - along * ax[0], d[1] - along * ax[1], d[2] - along * ax[2]); };
    const badgeR = R.badgeR ?? 0.05;
    let plain = null;
    for (let i = 0; i < wheel.pos.length / 3; i++) { const r = off(i); if (r > badgeR + 0.005 && r < badgeR + 0.03) { plain = i; break; } }
    if (plain !== null) for (let i = 0; i < wheel.pos.length / 3; i++) if (off(i) <= badgeR) { wheel.uv[i * 2] = wheel.uv[plain * 2]; wheel.uv[i * 2 + 1] = wheel.uv[plain * 2 + 1]; }
    parts.set('steering', { ...part, group: 'steering', soup: wheel });
    part.soup = take(q, rest);
    let hub = 0;
    for (let i = 0; i < wheel.pos.length / 3; i++) if (off(i) <= badgeR) hub = Math.max(hub, -((wheel.pos[i * 3] - c[0]) * ax[0] + (wheel.pos[i * 3 + 1] - c[1]) * ax[1] + (wheel.pos[i * 3 + 2] - c[2]) * ax[2]));
    steering = { c: c.map((v) => +v.toFixed(4)), axis: ax.map((v) => +v.toFixed(4)), found: g.tris.length, hub: +hub.toFixed(4), padR: R.padR ?? 0 };
  }

  // 8. Simplify and write.
  mkdirSync(join(OUT, 'tex'), { recursive: true });
  const header = { id: R.id, source: R.credit, def, lid, wheels: wheelAt, steering, eye: R.eye, needles: R.needles, exhausts: R.exhausts, popups: R.popups, headLamp: R.headLamp, ownWing: !!R.ownWing, engineRear: !!R.engineRear, parts: [] };
  const blobs = [];
  let offset = 0, total = 0;
  const push = (arr) => { const pad = (4 - (offset % 4)) % 4; if (pad) { blobs.push(Buffer.alloc(pad)); offset += pad; } const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); blobs.push(b); const at = offset; offset += b.length; return at; };
  const texNames = new Map();
  const write = (part, lod) => {
    const ratio = part.opts?.ratio ?? R.ratio?.[part.slot.replace(/[FR]$/, '')] ?? (part.group.startsWith('spin') ? 0.5 : 1);
    const q = lod ? simplify(part.soup, Math.min(1, ratio * 0.14), 0.03) : simplify(part.soup, ratio, ratio < 0.3 ? 0.02 : 0.004);
    if (!q.idx.length) return;
    const pos = new Int16Array(q.pos.length), nor = new Int16Array(q.nor.length);
    for (let i = 0; i < q.pos.length; i++) { pos[i] = Math.round(q.pos[i] * POS_SCALE); nor[i] = Math.round(q.nor[i] * 32767); }
    const big = q.pos.length / 3 > 65535;
    const idx = big ? Uint32Array.from(q.idx) : Uint16Array.from(q.idx);
    const useTex = part.m.texIndex != null && part.opts?.tex !== false && !NO_TEX.has(part.slot);
    let tex = null;
    if (useTex) {
      const k = part.m.texIndex;
      if (!texNames.has(k)) texNames.set(k, saveTexture(glb, k, R.id, `t${texNames.size}`, part.m.alpha !== 'OPAQUE', part.opts?.texSize ?? 1024));
      tex = texNames.get(k);
    }
    const uv = useTex ? Float32Array.from(q.uv) : null;
    const info = {
      slot: part.slot, group: part.group, lod, name: part.m.name, tex,
      color: part.m.color.map((v, i) => +(i < 3 ? v * (part.opts?.tint ?? 1) : v).toFixed(3)), metal: part.m.metal, rough: part.m.rough, alpha: part.m.alpha, double: !!(part.m.double || part.opts?.double),
      verts: q.pos.length / 3, indices: q.idx.length, big,
    };
    info.pos = push(pos); info.nor = push(nor); info.idx = push(idx); if (uv) info.uv = push(uv);
    header.parts.push(info);
    total += q.tris;
  };
  const lod1 = (p) => (p.group === 'body' || p.group === 'lid' || p.group === 'pop') && !NO_LOD1.has(p.slot);
  let lodTotal = 0;
  for (const part of parts.values()) {
    write(part, 0);
    if (lod1(part)) { const b = total; write(part, 1); lodTotal += total - b; total = b; }
  }
  const json = Buffer.from(JSON.stringify(header));
  const pad = Buffer.alloc((4 - ((json.length + 4) % 4)) % 4, 32);
  const len = Buffer.alloc(4); len.writeUInt32LE(json.length + pad.length);
  writeFileSync(join(OUT, `${R.id}.bin`), Buffer.concat([len, json, pad, ...blobs]));
  console.log(`  ${R.id}: scale ${s.toFixed(5)}, ${total} triangles (parked version ${lodTotal}), ${(offset / 1e6).toFixed(2)} MB, length ${(z1 - z0).toFixed(2)} m, tall ${rise.toFixed(2)} m, tyre radius ${wheelAt[0].r.toFixed(3)}/${wheelAt[2].r.toFixed(3)} m, track ${wheelAt[0].c[0].toFixed(3)}, lid ${lid}, steering ${steering?.found ?? '-'}`);
  const bySlot = {};
  for (const p of header.parts) if (!p.lod) bySlot[p.slot] = (bySlot[p.slot] || 0) + p.indices / 3;
  console.log('   ', Object.entries(bySlot).map(([k, v]) => `${k} ${v}`).join(', '));
}

const NO_TEX = new Set(['tyre', 'paint', 'paint2', 'glass', 'trim', 'carbon', 'chrome', 'under', 'tail', 'amber', 'lens', 'black', 'metal', 'caliper', 'plate']);
const NO_LOD1 = new Set(['asis', 'engine', 'interior', 'lens']);

await Simplifier.ready;
const only = process.argv[2];
for (const R of RECIPES) if (!only || only === R.id) { console.log(R.id); capture(R); }
