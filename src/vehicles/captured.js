// Cars captured from detailed models (tools/capture-car.mjs). Each file in
// assets/cars holds the car's real surfaces, already sorted into the game's
// own materials, simplified, and fitted to the car's axles; plus the measured
// body curves (`def`) that kits, wings and the engine bay read, and where its
// wheels, driver and exhausts are. Loaded once at start-up, before any car is
// built, so buildCar can stay simple. A car with no file keeps its drawn body.
//
// Car space, like body.js: +z forward, +x left, heights from the road.

import * as THREE from 'three';
import { MeshoptDecoder } from '../../vendor/meshopt_decoder.js';

const IDS = ['impreza-gc8', 'skyliner-r34', 'challenjer-srt8', 'mustank-gt500', 'gtar-r35', 'countach-qv', 'aventadoro-sv'];
const POS_SCALE = 1 / 8000;
const CARS = new Map();

async function read(file) {
  const res = await fetch(new URL(`../../assets/cars/${file}.bin`, import.meta.url));
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  const len = new DataView(buf).getUint32(0, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, len)));
  const base = 4 + len;
  await MeshoptDecoder.ready;
  head.parts = head.parts.map((p) => {
    const raw = new Uint8Array(p.verts * 16), index = new Uint32Array(p.indices);
    MeshoptDecoder.decodeVertexBuffer(raw, p.verts, 16, new Uint8Array(buf, base + p.vb, p.vbLen));
    MeshoptDecoder.decodeIndexBuffer(new Uint8Array(index.buffer), p.indices, 4, new Uint8Array(buf, base + p.ib, p.ibLen));
    const v = new DataView(raw.buffer), pos = new Float32Array(p.verts * 3), nor = new Float32Array(p.verts * 3), uv = p.uvMin ? new Float32Array(p.verts * 2) : null;
    for (let i = 0; i < p.verts; i++) {
      for (let c = 0; c < 3; c++) {
        pos[i * 3 + c] = v.getInt16(i * 16 + c * 2, true) * POS_SCALE;
        nor[i * 3 + c] = v.getInt16(i * 16 + 6 + c * 2, true) / 32767;
      }
      if (uv) for (let c = 0; c < 2; c++) uv[i * 2 + c] = p.uvMin[c] + v.getUint16(i * 16 + 12 + c * 2, true) / 65535 * p.uvSpan[c];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    g.computeBoundingSphere();
    return { ...p, geometry: g };
  });
  return head;
}

// The light file of every car comes first: that is enough to show or drive
// any car, and parked cars use it. lod 2, the iPad copy, stands in as lod 0
// until `fullDetail` swaps in the real thing.
async function load(id) {
  const head = await read(`${id}-lite`);
  if (!head) return;
  for (const p of head.parts) if (p.lod === 2) p.lod = 0;
  if (head.engineRear) head.def.engineLid = head.lid;
  // Where the lamps' glows go: the middle of each lamp sheet, one side.
  const middle = (slots) => {
    const box = new THREE.Box3(), v = new THREE.Vector3();
    for (const p of head.parts) if (slots.includes(p.slot) && p.lod === 0) {
      const a = p.geometry.attributes.position;
      for (let i = 0; i < a.count; i += 3) { v.fromBufferAttribute(a, i); if (v.x > 0.3) box.expandByPoint(v); }
    }
    if (box.isEmpty()) return null;
    box.getCenter(v);
    return [v.x, v.y, v.z];
  };
  head.headLamp ??= middle(['lightF']) ?? [0.6, 0.72, head.def.width.at(-1)[0] - 0.1];
  head.tailLamp = middle(['tail', 'lightR']) ?? [0.6, 0.9, head.def.width[0][0] + 0.05];
  CARS.set(id, head);
}

// Start-up waits for this (see main.js), so captures() is ready for buildCar.
export const carsReady = Promise.all(IDS.map((id) => load(id).catch((e) => console.error(`car ${id} failed to load`, e))));

// Every triangle of one car. Resolves true once it has arrived, the first
// time; the caller then rebuilds the car.
export async function fullDetail(id) {
  const cap = CARS.get(id);
  if (!cap || cap.full) return false;
  cap.full = true;
  const head = await read(id).catch(() => null);
  if (!head) { cap.full = false; return false; }
  for (const p of cap.parts) if (p.lod === 0) p.geometry.dispose();
  cap.parts = [...cap.parts.filter((p) => p.lod !== 0), ...head.parts];
  delete cap.fitF; delete cap.fitR;
  return true;
}

export const captures = (id) => CARS.get(id) || null;

const textures = new Map();
function texture(file) {
  if (!textures.has(file)) {
    const t = new THREE.TextureLoader().load(new URL(`../../assets/cars/tex/${file}`, import.meta.url).href);
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false; // glTF texture coordinates
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    textures.set(file, t);
  }
  return textures.get(file);
}

// A part keeping its source file's own look: its colour, texture and finish.
function ownMaterial(p) {
  const blend = p.alpha === 'BLEND', mask = p.alpha === 'MASK';
  const [r, g, b, a] = p.color;
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(r, g, b), metalness: Math.min(p.metal, 0.7), roughness: Math.max(p.rough, 0.25), side: p.double ? THREE.DoubleSide : THREE.FrontSide,
    transparent: blend, opacity: blend ? a : 1, alphaTest: mask ? 0.5 : 0, depthWrite: !blend, envMapIntensity: 0.6,
  });
  if (p.tex) m.map = texture(p.tex);
  return m;
}

// Lamp sheets glow by themselves: the texture lit by its own colours.
function lampMaterial(p, tint, strength) {
  return new THREE.MeshStandardMaterial({
    map: p.tex ? texture(p.tex) : null, color: 0xffffff, emissive: tint, emissiveMap: p.tex ? texture(p.tex) : null, emissiveIntensity: strength,
    roughness: 0.25, metalness: 0.2, envMapIntensity: 1.2,
  });
}

// How big a new rim should be on this axle: as wide as the car's own rim, and
// most of the tyre's width.
export function rimFit(cap, front) {
  const axle = front ? 'F' : 'R';
  const key = `fit${axle}`;
  if (cap[key]) return cap[key];
  let R = 0;
  for (const p of cap.parts) {
    if (p.lod !== 0 || p.slot !== 'rim' || p.group !== `spin${axle}`) continue;
    const a = p.geometry.attributes.position, rs = [];
    for (let i = 0; i < a.count; i++) rs.push(Math.hypot(a.getY(i), a.getZ(i)));
    rs.sort((x, y) => x - y);
    R = Math.max(R, rs[Math.floor((rs.length - 1) * 0.95)]);
  }
  return (cap[key] = { R, w: cap.wheels[front ? 0 : 2].w * 0.8 });
}

// The mesh parts of a car, in `lod` 0 (full) or 1 (parked cars), by group.
// mats: the game's shared materials by slot. `skip`: slots to leave out.
export function capturedParts(cap, lod, mats, group, skip = null) {
  const out = [];
  for (const p of cap.parts) {
    if (p.lod !== lod || p.group !== group || skip?.includes(p.slot)) continue;
    let mat = mats[p.slot];
    if (!mat) {
      const key = `own:${p.name}:${p.tex}`;
      mat = mats[key] ??= p.slot === 'lightF' ? (mats.lampF = lampMaterial(p, 0xffffff, 1.3))
        : p.slot === 'lightR' ? (mats.lampR = lampMaterial(p, 0xff3a2a, 1)) : ownMaterial(p);
    }
    const m = new THREE.Mesh(p.geometry, mat);
    m.name = p.panel ?? ''; // bumperF, wing and so on: see `panels` in tools/car-recipes.mjs
    if (mat.transparent) m.renderOrder = 1;
    out.push(m);
  }
  return out;
}

// Decals on a captured body. A decal is a copy of the paint triangles it
// touches, laid a hair above the paint, with its picture projected straight
// on by `uvOf(x, y, z)` -> [u, v] or null. Pictures must fade to transparent
// outside 0..1.
export function projectDecal(cap, test, uvOf, lift = 0.004, group = 'body') {
  const pos = [], nor = [], uv = [];
  const a = new THREE.Vector3(), n = new THREE.Vector3();
  for (const p of cap.parts) {
    if (p.lod !== 0 || p.slot !== 'paint' || p.group !== group) continue;
    const P = p.geometry.attributes.position, N = p.geometry.attributes.normal, X = p.geometry.index;
    for (let t = 0; t < X.count; t += 3) {
      const ids = [X.getX(t), X.getX(t + 1), X.getX(t + 2)];
      let hit = false;
      for (const i of ids) {
        a.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i);
        if (test(a.x, a.y, a.z, n.x, n.y, n.z)) { hit = true; break; }
      }
      if (!hit) continue;
      for (const i of ids) {
        a.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i).normalize();
        pos.push(a.x + n.x * lift, a.y + n.y * lift, a.z + n.z * lift);
        nor.push(n.x, n.y, n.z);
        uv.push(...uvOf(a.x, a.y, a.z));
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
