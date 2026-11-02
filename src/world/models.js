// Models from the free CC0 library, made small by tools/fetch-cc0.mjs. Start-up
// waits for them (main.js), so a kit can ask for one straight away.

import * as THREE from 'three';
import { photosReady } from '../graphics/textures.js';

const IDS = ['concrete_road_barrier', 'fire_hydrant', 'exterior_aircon_unit', 'utility_box_02', 'power_box_01', 'old_tyre', 'barrel_03', 'metal_trash_can', 'boulder_01', 'rock_face_01', 'covered_car', 'tool_cart', 'metal_tool_chest', 'fern_02', 'propane_tank', 'trashbag'];

const MODELS = new Map();
const url = (path) => new URL(`../../assets/world/${path}`, import.meta.url).href;

const loader = new THREE.TextureLoader();
function picture(file, srgb) {
  const t = loader.load(url(`tex/${file}`));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.flipY = false; // glTF pictures run top to bottom
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

async function load(id) {
  const r = await fetch(url(`${id}.bin`));
  if (!r.ok) throw new Error(`${id}: ${r.status}`);
  const buf = await r.arrayBuffer(), size = new Uint32Array(buf, 0, 1)[0];
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, size)));
  let at = 4 + size;
  const take = (Type, n) => { const a = new Type(buf, at, n); at += n * Type.BYTES_PER_ELEMENT; return a; };
  MODELS.set(id, head.parts.map((p) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(take(Float32Array, p.verts * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(take(Float32Array, p.verts * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(take(Float32Array, p.verts * 2), 2));
    g.setIndex(new THREE.BufferAttribute(take(Uint32Array, p.index), 1));
    const mat = new THREE.MeshLambertMaterial({ map: p.map && picture(p.map, true), normalMap: p.normal && picture(p.normal, false) });
    if (p.cut) { mat.alphaTest = 0.5; mat.side = THREE.DoubleSide; }
    return { geo: g, mat, tint: false, shadow: true };
  }));
}

export const worldReady = Promise.all([photosReady, ...IDS.map((id) => load(id).catch((e) => console.error(`model ${id} failed to load`, e)))]);

// A model's parts, for a kit. Empty if its file failed to load.
export const modelParts = (id) => MODELS.get(id) ?? [];

// One model as an Object3D, for a scene built by hand (the garage).
export function modelMesh(id, x, y, z, ry = 0, scale = 1) {
  const g = new THREE.Group();
  for (const p of modelParts(id)) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = m.receiveShadow = true; g.add(m); }
  g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(scale);
  return g;
}
