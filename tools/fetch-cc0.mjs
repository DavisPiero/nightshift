// Fetches free CC0 models and textures from Poly Haven (polyhaven.com, no credit
// needed, credited in README.md anyway) and turns them into what the game loads:
//   assets/world/<id>.bin       a model: simplified, one part per material
//   assets/world/tex/<name>.jpg its pictures, and the photo textures, made small
// Originals are kept in GLB/cc0/ (git-ignored), so running it again is quick.
//   node tools/fetch-cc0.mjs [id ...]
// To add one: a line in MODELS (tris: the most triangles it may keep) or PHOTOS,
// then the asset in src/world/assets.js. Needs `npm install` (meshoptimizer).

import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier as Simplifier } from 'meshoptimizer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'GLB/cc0'), OUT = join(ROOT, 'assets/world');

export const MODELS = {
  concrete_road_barrier: { tris: 240 }, fire_hydrant: { tris: 420 }, exterior_aircon_unit: { tris: 360 },
  utility_box_02: { tris: 260 }, power_box_01: { tris: 320 }, old_tyre: { tris: 360 }, barrel_03: { tris: 320 },
  metal_trash_can: { tris: 420 }, boulder_01: { tris: 800 }, rock_face_01: { tris: 900 },
  covered_car: { tris: 2400 }, tool_cart: { tris: 1100 }, metal_tool_chest: { tris: 700 },
  fern_02: { tris: 1200, tex: 512 }, propane_tank: { tris: 300 }, trashbag: { tris: 300 },
};
// name in the game: [Poly Haven id, size in pixels, keep the normal map]
export const PHOTOS = {
  rock: ['rock_wall_10', 1024, true], soil: ['forest_ground_04', 1024, true], concrete: ['concrete_wall_008', 1024, false],
  sakura: ['sakura_bark', 512, true], cedar: ['japanese_cedar_bark', 512, true], pavement: ['concrete_pavement_02', 1024, false],
  tin: ['corrugated_iron_02', 512, true],
};

const api = async (path) => (await fetch(`https://api.polyhaven.com/${path}`, { headers: { 'User-Agent': 'nightshift-fetch' } })).json();
async function grab(url, to) {
  if (existsSync(to)) return to;
  mkdirSync(dirname(to), { recursive: true });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  writeFileSync(to, Buffer.from(await r.arrayBuffer()));
  return to;
}
const shrink = (from, name, size, quality = 72) => {
  const to = join(OUT, 'tex', name + '.jpg');
  execFileSync('sips', ['-Z', String(size), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), from, '--out', to], { stdio: 'ignore' });
  return basename(to);
};

// --- reading a glTF ---
const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
function nodeMatrix(n) {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1], [sx, sy, sz] = n.scale ?? [1, 1, 1], [tx, ty, tz] = n.translation ?? [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
}
function accessor(gltf, bin, i) {
  const a = gltf.accessors[i], v = gltf.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const start = (v.byteOffset ?? 0) + (a.byteOffset ?? 0), Type = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType];
  const size = Type.BYTES_PER_ELEMENT, stride = v.byteStride ?? n * size, out = new Array(a.count * n);
  const view = new DataView(bin.buffer, bin.byteOffset);
  const read = a.componentType === 5126 ? (o) => view.getFloat32(o, true) : a.componentType === 5125 ? (o) => view.getUint32(o, true) : (o) => view.getUint16(o, true);
  for (let e = 0; e < a.count; e++) for (let c = 0; c < n; c++) out[e * n + c] = read(start + e * stride + c * size);
  return out;
}

// Every mesh of the scene in its place, joined by material.
function soups(gltf, bin) {
  const bySlot = new Map();
  const visit = (i, parent) => {
    const node = gltf.nodes[i], m = mul(parent, nodeMatrix(node));
    for (const prim of gltf.meshes[node.mesh]?.primitives ?? []) {
      const s = bySlot.get(prim.material) ?? { pos: [], nor: [], uv: [], idx: [] };
      bySlot.set(prim.material, s);
      const pos = accessor(gltf, bin, prim.attributes.POSITION), nor = accessor(gltf, bin, prim.attributes.NORMAL), uv = accessor(gltf, bin, prim.attributes.TEXCOORD_0), idx = accessor(gltf, bin, prim.indices);
      const base = s.pos.length / 3;
      for (let v = 0; v < pos.length / 3; v++) {
        const [x, y, z] = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], [a, b, c] = [nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]];
        s.pos.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
        const nx = m[0] * a + m[4] * b + m[8] * c, ny = m[1] * a + m[5] * b + m[9] * c, nz = m[2] * a + m[6] * b + m[10] * c, l = Math.hypot(nx, ny, nz) || 1;
        s.nor.push(nx / l, ny / l, nz / l);
        s.uv.push(uv[v * 2], uv[v * 2 + 1]);
      }
      for (const k of idx) s.idx.push(base + k);
    }
    for (const c of node.children ?? []) visit(c, m);
  };
  for (const r of gltf.scenes[gltf.scene ?? 0].nodes) visit(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return bySlot;
}

function simplify(s, ratio) {
  if (ratio >= 1) return s;
  const idx = Uint32Array.from(s.idx), pos = Float32Array.from(s.pos), attr = new Float32Array(s.pos.length / 3 * 5);
  for (let v = 0; v < s.pos.length / 3; v++) attr.set([s.nor[v * 3], s.nor[v * 3 + 1], s.nor[v * 3 + 2], s.uv[v * 2], s.uv[v * 2 + 1]], v * 5);
  const target = Math.max(36, Math.floor(idx.length * ratio / 3) * 3);
  let [kept] = Simplifier.simplifyWithAttributes(idx, pos, 3, attr, 5, [0.5, 0.5, 0.5, 1, 1], null, target, 0.08, []);
  // Seams can stop it short of the target: then shape alone decides.
  if (kept.length > target * 1.25) [kept] = Simplifier.simplifySloppy(idx, pos, 3, null, target, 0.25);
  const r = { pos: [], nor: [], uv: [], idx: [] }, map = new Map();
  for (const i of kept) {
    if (!map.has(i)) { map.set(i, r.pos.length / 3); r.pos.push(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]); r.nor.push(s.nor[i * 3], s.nor[i * 3 + 1], s.nor[i * 3 + 2]); r.uv.push(s.uv[i * 2], s.uv[i * 2 + 1]); }
    r.idx.push(map.get(i));
  }
  return r;
}

async function model(id, { tris, tex = 512 }) {
  const files = await api(`files/${id}`), g = files.gltf['1k'].gltf, dir = join(CACHE, id);
  const gltf = JSON.parse(readFileSync(await grab(g.url, join(dir, `${id}.gltf`)), 'utf8'));
  const inc = {};
  for (const [path, f] of Object.entries(g.include)) inc[path] = await grab(f.url, join(dir, path));
  const bin = readFileSync(inc[gltf.buffers[0].uri]);
  const all = soups(gltf, bin), total = [...all.values()].reduce((n, s) => n + s.idx.length / 3, 0);
  const parts = [], blobs = [];
  for (const [slot, full] of all) {
    const s = simplify(full, tris / total), m = gltf.materials[slot] ?? {};
    const picture = (ref, tag, size, q) => ref === undefined ? null : shrink(inc[decodeURI(gltf.images[gltf.textures[ref].source].uri)], `${id}-${slot}${tag}`, size, q);
    const map = picture(m.pbrMetallicRoughness?.baseColorTexture?.index, '', tex), normal = picture(m.normalTexture?.index, '-n', Math.round(tex / 2), 65);
    parts.push({ map, normal, cut: m.alphaMode === 'MASK', verts: s.pos.length / 3, index: s.idx.length });
    blobs.push(Float32Array.from(s.pos), Float32Array.from(s.nor), Float32Array.from(s.uv), Uint32Array.from(s.idx));
  }
  const head = new TextEncoder().encode(JSON.stringify({ parts })), pad = (4 - (head.length + 4) % 4) % 4;
  const buf = Buffer.concat([Buffer.from(new Uint32Array([head.length + pad]).buffer), Buffer.from(head), Buffer.alloc(pad, 32), ...blobs.map((b) => Buffer.from(b.buffer))]);
  writeFileSync(join(OUT, `${id}.bin`), buf);
  console.log(`${id.padEnd(26)} ${total} -> ${parts.reduce((n, p) => n + p.index / 3, 0)} tris, ${parts.length} part(s), ${(buf.length / 1024).toFixed(0)} KB`);
}

async function photo(name, [id, size, normal]) {
  const f = await api(`files/${id}`);
  shrink(await grab(f.Diffuse['2k'].jpg.url, join(CACHE, 'photo', `${id}.jpg`)), `photo-${name}`, size, 74);
  if (normal) shrink(await grab(f.nor_gl['2k'].jpg.url, join(CACHE, 'photo', `${id}-n.jpg`)), `photo-${name}-n`, Math.round(size / 2), 68);
  console.log(`${name.padEnd(10)} ${id}, ${(statSync(join(OUT, 'tex', `photo-${name}.jpg`)).size / 1024).toFixed(0)} KB`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await Simplifier.ready;
  mkdirSync(join(OUT, 'tex'), { recursive: true });
  const only = process.argv.slice(2), want = (k) => !only.length || only.includes(k);
  for (const [k, v] of Object.entries(PHOTOS)) if (want(k)) await photo(k, v);
  for (const [k, v] of Object.entries(MODELS)) if (want(k)) await model(k, v);
}
