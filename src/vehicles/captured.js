// Cars captured from detailed models (tools/capture-car.mjs). Each file in
// assets/cars holds the car's real surfaces, already sorted into the game's
// own materials, simplified, and fitted to the car's axles; plus the measured
// body curves (`def`) that kits, wings and the engine bay read, and where its
// wheels, driver and exhausts are. Loaded once at start-up, before any car is
// built, so buildCar can stay simple. A car with no file keeps its drawn body.
//
// Car space, like body.js: +z forward, +x left, heights from the road.

import * as THREE from 'three';

const IDS = ['gtar-r35', 'challenjer-srt8', 'aventadoro-sv', 'mustank-gt500'];
const POS_SCALE = 1 / 8000;
const CARS = new Map();

async function load(id) {
  const res = await fetch(new URL(`../../assets/cars/${id}.bin`, import.meta.url));
  if (!res.ok) return;
  const buf = await res.arrayBuffer();
  const len = new DataView(buf).getUint32(0, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, len)));
  const base = 4 + len;
  head.parts = head.parts.map((p) => {
    const g = new THREE.BufferGeometry();
    const pos = Float32Array.from(new Int16Array(buf, base + p.pos, p.verts * 3), (v) => v * POS_SCALE);
    const nor = Float32Array.from(new Int16Array(buf, base + p.nor, p.verts * 3), (v) => v / 32767);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (p.uv !== undefined) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(buf, base + p.uv, p.verts * 2), 2));
    g.setIndex(new THREE.BufferAttribute(p.big ? new Uint32Array(buf, base + p.idx, p.indices) : new Uint16Array(buf, base + p.idx, p.indices), 1));
    g.computeBoundingSphere();
    return { ...p, geometry: g };
  });
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
  head.headLamp = middle(['lightF']) ?? [0.6, 0.72, head.def.width.at(-1)[0] - 0.1];
  head.tailLamp = middle(['tail', 'lightR']) ?? [0.6, 0.9, head.def.width[0][0] + 0.05];
  CARS.set(id, head);
}

// Start-up waits for this (see main.js), so captures() is ready for buildCar.
export const carsReady = Promise.all(IDS.map((id) => load(id).catch(() => {})));

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

// The mesh parts of a car, in `lod` 0 (full) or 1 (parked cars), by group.
// mats: the game's shared materials by slot.
export function capturedParts(cap, lod, mats, group) {
  const out = [];
  for (const p of cap.parts) {
    if (p.lod !== lod || p.group !== group) continue;
    let mat = mats[p.slot];
    if (!mat) {
      const key = `own:${p.name}:${p.tex}`;
      mat = mats[key] ??= p.slot === 'lightF' ? (mats.lampF = lampMaterial(p, 0xffffff, 1.3))
        : p.slot === 'lightR' ? (mats.lampR = lampMaterial(p, 0xff3a2a, 1)) : ownMaterial(p);
    }
    const m = new THREE.Mesh(p.geometry, mat);
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
