// The asset library: every prop a track can place, by name. Each asset is a
// small kit in its own space (standing at the origin; +z is forward along
// the road, +x is to the left of the traffic): its meshes, plus the fake
// light that goes with it (glow halos, light pools painted on the ground,
// spots where a real light may be lent when the car is close, and the
// bright bits the car's paint reflects).
//
// A track never builds props itself. It asks a Placer to put "streetlight"
// here and "tree" there; the Placer turns every placement of the same
// asset into one instanced mesh per part, so a thousand trees cost two draw
// calls. The ?library page (src/ui/library.js) shows each asset on its own.
//
// Three kinds of asset:
//  kit(opts)      the usual: parts that are instanced
//  object(opts)   a whole Object3D, baked together with the rest of its kind
//                 (parked cars, which come from the car builder)
//  block(list)    things of many sizes made from one recipe (warehouses,
//                 shop rows), merged by look; `sample` is what the library shows

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';
import { buildCar, bakeStatic } from '../vehicles/car-model.js';
import { SKYLINER_R34, CHALLENJER_SRT8 } from '../vehicles/cars.js';
import { merge, placed } from './scene-kit.js';

// Materials are shared by every placement (and every track).
const matCache = new Map();
function mat(key, make) {
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}
const lambert = (color, extra = {}) => mat('l' + color.toString(16) + JSON.stringify(extra), () => new THREE.MeshLambertMaterial({ color, ...extra }));
const basic = (color) => mat('b' + color.toString(16), () => new THREE.MeshBasicMaterial({ color }));

// A part: a geometry moved into the asset's own space.
function part(geo, material, { x = 0, y = 0, z = 0, ry = 0, rx = 0, tint = false, shadow = false } = {}) {
  return { geo: placed(geo, x, y, z, ry, rx), mat: material, tint, shadow };
}

// Colours of the fake light, as 0..1 RGB.
export const GLOW = {
  amber: [1, 0.659, 0.314],
  red: [1, 0.2, 0.12],
  green: [0.2, 0.9, 0.45],
  white: [0.86, 0.92, 1],
  pink: [1, 0.25, 0.6],
  teal: [0.31, 0.94, 0.88],
};

export const ASSETS = {
  // --- Street ---
  streetlight: {
    name: 'Streetlight', jp: '街灯', group: 'Street',
    note: 'Sodium lamp on an arm over the road, with an amber pool of light. Starter Track.',
    kit: () => {
      const pole = lambert(0x3e4244);
      return {
        parts: [
          part(new THREE.CylinderGeometry(0.09, 0.12, 7.5, 6), pole, { y: 3.75 }),
          part(new THREE.BoxGeometry(2.4, 0.1, 0.1), pole, { x: 1.15, y: 7.4 }),
          part(new THREE.BoxGeometry(0.7, 0.16, 0.32), basic(0xffc070), { x: 2.2, y: 7.3 }),
        ],
        glows: [[2.2, 7.1, 0, 'amber']],
        pools: [[2.2, 0, 17, 17, 'warm']],
        lamps: [[2.2, 6.9, 0]],
        reflect: [[new THREE.BoxGeometry(1.4, 0.5, 0.8), 0xffc070, 2.2, 7.3, 0], [new THREE.BoxGeometry(1.6, 0.4, 1.6), 0xffd8a0, 2.2, 7.3, 0]],
      };
    },
  },
  floodlight: {
    name: 'Yard floodlight', jp: '投光器', group: 'Street',
    note: 'A tall mast lighting a yard 9 m to its right.',
    kit: () => ({
      parts: [
        part(new THREE.CylinderGeometry(0.15, 0.2, 14, 6), lambert(0x3e4244), { y: 7 }),
        part(new THREE.BoxGeometry(1.6, 0.4, 0.6), basic(0xffc070), { y: 14 }),
      ],
      glows: [[0, 13.8, 0, 'amber']],
      pools: [[-9, 0, 26, 26, 'warm']],
      lamps: [[0, 13.6, 0]],
    }),
  },
  'rail-post': {
    name: 'Guard rail post', jp: 'ガードレール支柱', group: 'Street',
    kit: () => ({ parts: [part(new THREE.BoxGeometry(0.12, 0.8, 0.12), lambert(0x5a5c5a), { y: 0.4 })] }),
  },
  'chevron-left': {
    name: 'Chevron board (left)', jp: '矢印板', group: 'Street',
    note: 'On the outside of a bend that turns left.',
    kit: () => ({ parts: [part(new THREE.PlaneGeometry(1.1, 0.7), mat('chev1', () => new THREE.MeshLambertMaterial({ map: Tex.chevron(1), side: THREE.DoubleSide })), { y: 1.15 })] }),
  },
  'chevron-right': {
    name: 'Chevron board (right)', jp: '矢印板', group: 'Street',
    kit: () => ({ parts: [part(new THREE.PlaneGeometry(1.1, 0.7), mat('chev-1', () => new THREE.MeshLambertMaterial({ map: Tex.chevron(-1), side: THREE.DoubleSide })), { y: 1.15 })] }),
  },
  cone: {
    name: 'Traffic cone', jp: 'コーン', group: 'Street',
    kit: () => ({ parts: [part(new THREE.ConeGeometry(0.2, 0.64, 6), mat('cone', () => new THREE.MeshLambertMaterial({ map: Tex.cone() })), { y: 0.32 })] }),
  },
  bin: {
    name: 'Wheelie bin', jp: 'ゴミ箱', group: 'Street',
    kit: () => ({ parts: [part(new THREE.BoxGeometry(0.7, 1.1, 0.7), lambert(0x2a3a2c), { y: 0.55 })] }),
  },
  'power-pole': {
    name: 'Power pole', jp: '電柱', group: 'Street',
    note: 'Wooden pole with a cross-arm; the wires are strung by the track.',
    kit: () => {
      const wood = lambert(0x3a3028);
      return { parts: [part(new THREE.CylinderGeometry(0.14, 0.18, 10, 6), wood, { y: 5 }), part(new THREE.BoxGeometry(2.2, 0.12, 0.12), wood, { y: 9.3 })] };
    },
  },
  container: {
    name: 'Shipping container', jp: 'コンテナ', group: 'Street',
    note: 'Takes a colour per placement. Stack them 2.6 m apart.',
    kit: () => ({ parts: [part(new THREE.BoxGeometry(2.45, 2.6, 6.1), mat('cont', () => new THREE.MeshLambertMaterial({ map: Tex.container() })), { y: 1.3, tint: true })] }),
    tint: 0x6a2a20,
  },

  // --- Nature ---
  tree: {
    name: 'Tree', jp: '木', group: 'Nature',
    note: 'A dark, round broadleaf. Scale it 0.8 to 1.5.',
    kit: () => ({
      parts: [
        part(new THREE.IcosahedronGeometry(2.6, 0).scale(1, 1.35, 1), lambert(0x1f3320, { flatShading: true }), { y: 5.2, shadow: true }),
        part(new THREE.CylinderGeometry(0.2, 0.28, 3, 5), lambert(0x2a2018), { y: 1.5 }),
      ],
    }),
  },
  bush: {
    name: 'Bush', jp: '茂み', group: 'Nature',
    note: 'Usually placed squashed: 1.3 wide, 0.8 tall.',
    kit: () => ({ parts: [part(new THREE.IcosahedronGeometry(1.1, 0), lambert(0x2c4426, { flatShading: true }), { y: 0.625 })] }),
  },

  // --- Buildings ---
  'petrol-station': {
    name: 'Petrol station', jp: 'ガソリンスタンド', group: 'Buildings',
    note: 'Canopy with cold tubes, pumps, a shop and a price sign. No brand. Starter Track.',
    kit: () => {
      const steel = lambert(0x6c7270), white = lambert(0xc8ccc6);
      const conc = mat('conc', () => new THREE.MeshLambertMaterial({ map: Tex.concrete() }));
      const parts = [
        part(new THREE.BoxGeometry(16, 0.7, 10), white, { y: 5.2 }),
        part(new THREE.PlaneGeometry(14, 8), mat('tubes', () => new THREE.MeshBasicMaterial({ map: Tex.tubes(), color: 0xd8f0dc })), { y: 4.84, rx: Math.PI / 2 }),
        part(new THREE.BoxGeometry(16.05, 0.18, 10.05), basic(0x1f6f7a), { y: 5.35 }),
        part(new THREE.BoxGeometry(9, 0.2, 1.4), conc, { y: 0.1 }),
        part(new THREE.BoxGeometry(12, 3.6, 6), mat('blocks', () => new THREE.MeshLambertMaterial({ map: Tex.blocks() })), { y: 1.8, z: -11 }),
        part(new THREE.PlaneGeometry(7, 1.8), mat('shopwin', () => new THREE.MeshBasicMaterial({ map: Tex.shopWindow() })), { x: -1, y: 1.6, z: -7.98 }),
        part(new THREE.BoxGeometry(1, 1.9, 0.8), basic(0xd8dcd0), { x: 4.8, y: 0.95, z: -7.5 }),
        part(new THREE.BoxGeometry(0.4, 7, 0.4), steel, { x: 9.5, y: 3.5, z: 4.5 }),
        part(new THREE.BoxGeometry(2.6, 3, 0.4), mat('price', () => new THREE.MeshBasicMaterial({ map: Tex.priceSign() })), { x: 9.5, y: 7.5, z: 4.5 }),
        part(new THREE.PlaneGeometry(30, 26), mat('slab', () => new THREE.MeshLambertMaterial({ map: Tex.concrete(), color: 0x6a6a66 })), { y: 0.015, z: -3, rx: -Math.PI / 2 }),
      ];
      for (const [px, pz] of [[-6, -3.5], [6, -3.5], [-6, 3.5], [6, 3.5]]) parts.push(part(new THREE.BoxGeometry(0.35, 5, 0.35), steel, { x: px, y: 2.5, z: pz }));
      for (const px of [-3, 3]) for (const pz of [-1.2, 1.2]) {
        parts.push(part(new THREE.BoxGeometry(0.8, 1.7, 0.5), lambert(0x8a2a20), { x: px, y: 0.85, z: pz }));
        parts.push(part(new THREE.PlaneGeometry(0.4, 0.25), basic(0x6a8a5a), { x: px, y: 1.35, z: pz + (pz > 0 ? 0.26 : -0.26), ry: pz < 0 ? Math.PI : 0 }));
      }
      return {
        parts,
        glows: [[9.5, 7.5, 4.5, 'amber']],
        pools: [[0, 0, 26, 20, 'cool'], [-1, -6.5, 9, 5, 'warm']],
        lamps: [[0, 4.6, 0]],
        reflect: [[new THREE.BoxGeometry(14, 0.3, 8), 0xd8f0dc, 0, 4.8, 0]],
      };
    },
  },
  warehouse: {
    name: 'Warehouse', jp: '倉庫', group: 'Buildings',
    note: 'Any size: cladding in four tints, a roller door each end, a lit high window on most.',
    block: warehouses,
    sample: [{ x: 0, z: 0, w: 22, d: 16, h: 9, rot: 0, tint: 0, lit: true, door: true }],
  },

  // --- Vehicles ---
  'parked-r34': {
    name: 'Parked Skyliner', jp: '駐車車両', group: 'Vehicles',
    note: 'A simple, baked R34 in a muted colour (pick one per placement).',
    object: (colour = 0x40484e) => buildCar(SKYLINER_R34, colour, { simple: true }).root,
  },
  'parked-challenjer': {
    name: 'Parked Challenjer', jp: '駐車車両', group: 'Vehicles',
    object: (colour = 0x6a2620) => buildCar(CHALLENJER_SRT8, colour, { simple: true }).root,
  },

  // --- Tunnel ---
  'jet-fan': {
    name: 'Jet fan', jp: 'ジェットファン', group: 'Tunnel',
    note: 'Hangs under a tunnel roof, pointing along the road.',
    kit: () => {
      const end = new THREE.CircleGeometry(0.52, 10);
      return {
        parts: [
          part(new THREE.CylinderGeometry(0.55, 0.55, 3.2, 10, 1, true).rotateX(Math.PI / 2), lambert(0x5a6466, { side: THREE.DoubleSide })),
          { geo: merge([placed(end.clone(), 0, 0, 1.58), placed(end.clone(), 0, 0, -1.58, Math.PI)]), mat: basic(0x050707) },
        ],
      };
    },
    lift: 3,
  },
  'hydrant-lamp': {
    name: 'Hydrant lamp', jp: '消火栓', group: 'Tunnel',
    note: 'Red lamp over a hose cabinet, on a tunnel wall (the wall is at +x).',
    kit: () => ({
      parts: [
        part(new THREE.BoxGeometry(0.12, 0.22, 0.22), basic(0xff2a1e), { y: 2.5 }),
        part(new THREE.BoxGeometry(0.2, 1.0, 0.8), lambert(0x8a1a16), { x: -0.04, y: 1.2 }),
      ],
      glows: [[0, 2.5, 0, 'red']],
      reflect: [[new THREE.BoxGeometry(0.3, 0.3, 0.3), 0xff3020, 0, 2.5, 0]],
    }),
  },
  'exit-sign': {
    name: 'Emergency exit', jp: '非常口', group: 'Tunnel',
    note: 'Green running-man sign over a door, on a tunnel wall (facing +x).',
    kit: () => {
      const m = mat('exit', () => new THREE.MeshBasicMaterial({ map: Tex.exitSign() }));
      return {
        parts: [{ geo: merge([placed(new THREE.PlaneGeometry(1.0, 0.5), 0, 2.9, 0, Math.PI / 2), placed(new THREE.PlaneGeometry(1.0, 2.0), 0, 1.1, 0, Math.PI / 2)]), mat: m }],
        glows: [[0.2, 2.9, 0, 'green']],
      };
    },
  },
};

// The ground pools' looks, shared by every track.
const POOL_TEX = { warm: () => Tex.lightPool(), cool: () => Tex.lightPool(), white: () => Tex.lightPoolWhite(), pink: () => Tex.lightPoolWhite() };
const POOL_COLOUR = { warm: 0xffffff, cool: 0x9adcc0, white: 0xc8d8ff, pink: 0xff4fa0 };
function poolMat(kind) {
  return mat('pool-' + kind, () => new THREE.MeshBasicMaterial({ map: POOL_TEX[kind](), color: POOL_COLOUR[kind], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 }));
}

const kitCache = new Map();
function kitFor(id) {
  if (!kitCache.has(id)) kitCache.set(id, ASSETS[id].kit());
  return kitCache.get(id);
}

// Collects placements, then builds them all at once (see finish()).
export class Placer {
  constructor() {
    this.items = new Map();   // asset id -> [matrix, colour]
    this.objects = [];        // baked whole objects (parked cars)
    this.blocks = new Map();  // asset id -> list of block specs
    this.glowPos = []; this.glowCol = [];
    this.pools = {};          // kind -> geometries
    this.lamps = [];          // where real lights may go (THREE.Vector3)
    this.reflectGeos = new Map(); // colour -> geometries for the reflections
  }

  // Put an asset down. scale: a number or [sx, sy, sz]. colour: for assets
  // that take one (containers, parked cars).
  add(id, x, y, z, ry = 0, scale = 1, colour) {
    const a = ASSETS[id];
    if (!a) throw new Error('No asset called ' + id);
    const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(...s));
    if (a.object) {
      const o = a.object(colour);
      o.position.set(x, y, z); o.rotation.y = ry; o.scale.set(...s);
      this.objects.push(o);
      return;
    }
    if (!this.items.has(id)) this.items.set(id, []);
    this.items.get(id).push([m, colour]);
    const kit = kitFor(id);
    const v = new THREE.Vector3();
    for (const [gx, gy, gz, c] of kit.glows || []) { v.set(gx, gy, gz).applyMatrix4(m); this.glow(v.x, v.y, v.z, c); }
    for (const [px, pz, w, d, kind] of kit.pools || []) { v.set(px, 0, pz).applyMatrix4(m); this.pool(v.x, v.z, w * s[0], d * s[2], kind, ry); }
    for (const [lx, ly, lz] of kit.lamps || []) this.lamps.push(new THREE.Vector3(lx, ly, lz).applyMatrix4(m));
    for (const [geo, c, rx, ryy, rz] of kit.reflect || []) {
      if (!this.reflectGeos.has(c)) this.reflectGeos.set(c, []);
      this.reflectGeos.get(c).push(geo.clone().translate(rx, ryy, rz).applyMatrix4(m));
    }
  }

  // Things of many sizes (warehouses): the asset's block recipe builds them.
  block(id, spec) {
    if (!this.blocks.has(id)) this.blocks.set(id, []);
    this.blocks.get(id).push(spec);
  }

  // Fake light that is not part of an asset.
  glow(x, y, z, colour = 'amber') {
    this.glowPos.push(x, y, z);
    this.glowCol.push(...(Array.isArray(colour) ? colour : GLOW[colour]));
  }
  pool(x, z, w, d = w, kind = 'warm', ry = 0) {
    (this.pools[kind] ||= []).push(placed(new THREE.PlaneGeometry(w, d), x, 0.03, z, ry, -Math.PI / 2));
  }
  reflect(geo, colour) {
    if (!this.reflectGeos.has(colour)) this.reflectGeos.set(colour, []);
    this.reflectGeos.get(colour).push(geo);
  }

  // Build everything into `group`. Returns the glow points (so Settings can
  // hide them), the reflection group and the lamp spots.
  finish(group, { glowSize = 3.4 } = {}) {
    for (const [id, list] of this.items) {
      for (const p of kitFor(id).parts) {
        const mesh = new THREE.InstancedMesh(p.geo, p.mat, list.length);
        list.forEach(([m, c], i) => {
          mesh.setMatrixAt(i, m);
          if (p.tint) mesh.setColorAt(i, new THREE.Color(c ?? ASSETS[id].tint ?? 0xffffff));
        });
        mesh.castShadow = p.shadow;
        mesh.computeBoundingSphere();
        group.add(mesh);
      }
    }
    for (const [id, list] of this.blocks) ASSETS[id].block(list, group, this);
    if (this.objects.length) group.add(bakeStatic(this.objects));
    for (const [kind, geos] of Object.entries(this.pools)) if (geos.length) group.add(new THREE.Mesh(merge(geos), poolMat(kind)));
    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(this.glowPos, 3));
    glowGeo.setAttribute('color', new THREE.Float32BufferAttribute(this.glowCol, 3));
    const glows = new THREE.Points(glowGeo, new THREE.PointsMaterial({ map: Tex.glow(), vertexColors: true, size: glowSize, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glows.renderOrder = 2;
    group.add(glows);
    const reflect = new THREE.Group();
    for (const [c, geos] of this.reflectGeos) reflect.add(new THREE.Mesh(mergeAny(geos), basic(c)));
    return { glows, reflect, lamps: this.lamps };
  }
}

// Merge geometries that may lack uvs (reflection boxes only need positions).
function mergeAny(geos) {
  for (const g of geos) if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return merge(geos.map((g) => (g.index ? g : indexed(g))));
}
function indexed(g) {
  g.setIndex([...Array(g.attributes.position.count).keys()]);
  return g;
}

// --- Block recipes ---

// Warehouses, merged by look: about a dozen draw calls for all of them.
// Each: { x, z, w, d, h, rot, tint (0-3), lit, door }.
const BUILDING_TINTS = [[70, 78, 80], [84, 82, 72], [58, 66, 62], [92, 88, 80]];
function warehouses(list, group, placer) {
  const wallGeos = [[], [], [], []], roofGeos = [], doorGeos = [], winGeos = [[], [], []], lampGeos = [];
  for (const b of list) {
    const faces = [[b.w, 0], [b.d, Math.PI / 2], [b.w, Math.PI], [b.d, -Math.PI / 2]];
    faces.forEach(([len, a], fi) => {
      const g = new THREE.PlaneGeometry(len, b.h);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 8, uv.getY(i) * b.h / 8);
      const depth = fi % 2 ? b.w / 2 : b.d / 2;
      const ang = b.rot + a;
      wallGeos[b.tint].push(placed(g, b.x + Math.sin(ang) * depth, b.h / 2, b.z + Math.cos(ang) * depth, ang));
    });
    roofGeos.push(placed(new THREE.PlaneGeometry(b.w, b.d), b.x, b.h, b.z, b.rot, -Math.PI / 2));
    for (const side of [0, Math.PI]) {
      const ang = b.rot + side;
      const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang);
      const dh = Math.min(4.5, b.h * 0.6), dw = Math.min(6, b.w * 0.4);
      const ox = b.x + fx * (b.d / 2 + 0.03) - sx * b.w * 0.2, oz = b.z + fz * (b.d / 2 + 0.03) - sz * b.w * 0.2;
      doorGeos.push(placed(new THREE.PlaneGeometry(dw, dh), ox, dh / 2, oz, ang));
      if (b.lit) winGeos[Math.abs(b.x | 0) % 3].push(placed(new THREE.PlaneGeometry(b.w * 0.6, 2), b.x + fx * (b.d / 2 + 0.04), b.h - 1.8, b.z + fz * (b.d / 2 + 0.04), ang));
      // A dim lamp over the door, with a small warm pool below it.
      lampGeos.push(placed(new THREE.BoxGeometry(0.4, 0.15, 0.2), ox + fx * 0.1, dh + 0.5, oz + fz * 0.1, ang));
      if (b.door) {
        placer.pool(ox + fx * 2.4, oz + fz * 2.4, 7, 5, 'warm', ang);
        placer.glow(ox + fx * 0.3, dh + 0.45, oz + fz * 0.3);
      }
    }
  }
  wallGeos.forEach((geos, i) => {
    if (!geos.length) return;
    const mesh = new THREE.Mesh(merge(geos), mat('clad' + i, () => new THREE.MeshLambertMaterial({ map: Tex.cladding(BUILDING_TINTS[i]) })));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  });
  if (roofGeos.length) group.add(new THREE.Mesh(merge(roofGeos), roofMat()));
  if (doorGeos.length) group.add(new THREE.Mesh(merge(doorGeos), mat('shutter', () => new THREE.MeshLambertMaterial({ map: Tex.shutter(), color: 0xaab0aa }))));
  winGeos.forEach((geos, i) => { if (geos.length) group.add(new THREE.Mesh(merge(geos), mat('win' + i, () => new THREE.MeshBasicMaterial({ map: Tex.windows(i + 1) })))); });
  if (lampGeos.length) group.add(new THREE.Mesh(merge(lampGeos), basic(0xd8c890)));
}

// Flat roofs: one material, so snow can whiten every roof at once.
export function roofMat() { return lambert(0x2a2e2e); }

// Everything in the library, grouped, for the ?library page.
export function libraryGroups() {
  const groups = new Map();
  for (const [id, a] of Object.entries(ASSETS)) {
    if (!groups.has(a.group)) groups.set(a.group, []);
    groups.get(a.group).push(id);
  }
  return groups;
}

// One asset on its own, for the library page: placed at the origin.
export function previewAsset(id) {
  const a = ASSETS[id];
  const group = new THREE.Group();
  const placer = new Placer();
  if (a.block) for (const s of a.sample) placer.block(id, s);
  else placer.add(id, 0, a.lift || 0, 0, 0, 1, a.tint);
  const out = placer.finish(group);
  return { group, ...out };
}
