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
  gold: [1, 0.78, 0.38],
  violet: [0.63, 0.45, 1],
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
  'led-streetlight': {
    name: 'LED streetlight', jp: 'LED街灯', group: 'Street',
    note: 'Tall modern lamp with a long arm and a flat white head, as on Tokyo ring roads. Parabolica Street.',
    kit: () => {
      const pole = lambert(0x4a4e54);
      return {
        parts: [
          part(new THREE.CylinderGeometry(0.1, 0.14, 9, 6), pole, { y: 4.5 }),
          part(new THREE.BoxGeometry(3.4, 0.12, 0.12), pole, { x: 1.6, y: 8.95 }),
          part(new THREE.BoxGeometry(0.9, 0.1, 0.35), basic(0xeef4ff), { x: 3.2, y: 8.88 }),
        ],
        glows: [[3.2, 8.7, 0, 'white']],
        pools: [[3.2, 0, 18, 18, 'white']],
        lamps: [[3.2, 8.5, 0]],
        reflect: [[new THREE.BoxGeometry(1.6, 0.3, 0.8), 0xeef4ff, 3.2, 8.9, 0]],
      };
    },
  },
  'gold-streetlight': {
    name: 'Gold streetlight', jp: '金色の街灯', group: 'Street',
    note: 'The LED lamp with a warm gold head and a gold pool. Parabolica Street.',
    kit: () => {
      const pole = lambert(0x2e2a36);
      return {
        parts: [
          part(new THREE.CylinderGeometry(0.1, 0.14, 9, 6), pole, { y: 4.5 }),
          part(new THREE.BoxGeometry(3.4, 0.12, 0.12), pole, { x: 1.6, y: 8.95 }),
          part(new THREE.BoxGeometry(0.9, 0.1, 0.35), basic(0xffe2a0), { x: 3.2, y: 8.88 }),
          part(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 6), pole, { y: 0.25 }),
        ],
        glows: [[3.2, 8.7, 0, 'gold']],
        pools: [[3.2, 0, 18, 18, 'gold']],
        lamps: [[3.2, 8.5, 0]],
        reflect: [[new THREE.BoxGeometry(1.6, 0.3, 0.8), 0xffd890, 3.2, 8.9, 0]],
      };
    },
  },
  lantern: {
    name: 'Paper lantern', jp: '提灯', group: 'Street',
    note: 'A glowing paper lantern on a short cord, hung in rows along shopfronts. Takes a colour.',
    kit: () => ({
      parts: [
        part(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8).scale(1, 1, 1), mat('lantern', () => new THREE.MeshBasicMaterial({ color: 0xffffff })), { y: 0.25, tint: true }),
        part(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 8), basic(0x141014), { y: 0.52 }),
        part(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 8), basic(0x141014), { y: -0.02 }),
      ],
    }),
    tint: 0xffb040,
  },
  'park-lamp': {
    name: 'Park lamp', jp: '公園灯', group: 'Street',
    note: 'A short post with a round globe, along the park paths.',
    kit: () => ({
      parts: [
        part(new THREE.CylinderGeometry(0.06, 0.09, 4, 6), lambert(0x2a3a34), { y: 2 }),
        part(new THREE.IcosahedronGeometry(0.26, 1), basic(0xfff0d8), { y: 4.15 }),
      ],
      glows: [[0, 4.15, 0, 'amber']],
      pools: [[0, 0, 9, 9, 'warm']],
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
    note: 'A dark broadleaf: a trunk that forks, a crown of three clumps (a lighter one on top). Scale it 0.8 to 1.5.',
    kit: () => {
      const leaf = lambert(0x1f3320, { flatShading: true }), top = lambert(0x2a4228, { flatShading: true }), bark = lambert(0x2a2018);
      return {
        parts: [
          part(new THREE.IcosahedronGeometry(2.3, 1).scale(1, 1.15, 1), leaf, { y: 5.0, shadow: true }),
          part(new THREE.IcosahedronGeometry(1.6, 0).scale(1, 0.9, 1), leaf, { x: 1.5, y: 4.2, z: 0.4, ry: 0.7, shadow: true }),
          part(new THREE.IcosahedronGeometry(1.5, 0), top, { x: -0.5, y: 6.7, z: -0.3, ry: 1.9 }),
          part(new THREE.CylinderGeometry(0.17, 0.3, 3.4, 6), bark, { y: 1.7 }),
          part(new THREE.CylinderGeometry(0.07, 0.12, 1.8, 5).translate(0, 0.9, 0), bark, { x: 0.15, y: 2.9, rx: 0.8, ry: 1.3 }),
        ],
      };
    },
  },
  sakura: {
    name: 'Cherry tree', jp: '桜', group: 'Nature',
    note: 'In blossom: a wide, layered pink crown on a crooked trunk that catches the lamp light. In the parks.',
    kit: () => {
      const pinkA = lambert(0xd88aa8, { flatShading: true }), pinkB = lambert(0xeaa6c0, { flatShading: true }), bark = lambert(0x3a2a24);
      return {
        parts: [
          part(new THREE.IcosahedronGeometry(2.5, 1).scale(1.3, 0.7, 1.3), pinkA, { y: 4.1, shadow: true }),
          part(new THREE.IcosahedronGeometry(1.7, 0).scale(1.2, 0.7, 1.2), pinkB, { x: 0.8, y: 5.2, z: -0.5, ry: 0.5 }),
          part(new THREE.IcosahedronGeometry(1.4, 0).scale(1.2, 0.75, 1.2), pinkA, { x: -1.9, y: 3.7, z: 0.9, ry: 1.2 }),
          part(new THREE.CylinderGeometry(0.16, 0.3, 3.2, 6), bark, { y: 1.6 }),
          part(new THREE.CylinderGeometry(0.07, 0.13, 2.0, 5).translate(0, 1.0, 0), bark, { x: -0.1, y: 2.6, rx: 0.9, ry: -2.0 }),
        ],
      };
    },
  },
  bush: {
    name: 'Bush', jp: '茂み', group: 'Nature',
    note: 'Two clumps. Usually placed squashed: 1.3 wide, 0.8 tall.',
    kit: () => ({
      parts: [
        part(new THREE.IcosahedronGeometry(1.1, 0), lambert(0x2c4426, { flatShading: true }), { y: 0.625 }),
        part(new THREE.IcosahedronGeometry(0.75, 0), lambert(0x34502c, { flatShading: true }), { x: 0.8, y: 0.5, z: 0.3, ry: 0.8 }),
      ],
    }),
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
  konbini: {
    name: 'Convenience store', jp: 'コンビニ', group: 'Buildings',
    note: 'Bright glass front with a band of stripes (no brand) and a white pool on the pavement. Faces +z.',
    kit: () => {
      const wall = lambert(0xc4c8c4);
      return {
        parts: [
          part(new THREE.BoxGeometry(14, 4.4, 10), wall, { y: 2.2 }),
          part(new THREE.PlaneGeometry(14, 4), mat('konbini', () => new THREE.MeshBasicMaterial({ map: Tex.konbini() })), { y: 2, z: 5.01 }),
          part(new THREE.BoxGeometry(14.4, 0.3, 10.4), roofMat(), { y: 4.55 }),
          part(new THREE.BoxGeometry(14.2, 0.5, 0.3), basic(0x1a8a6a), { y: 4.15, z: 5.1 }),
        ],
        pools: [[0, 8, 18, 8, 'white']],
        glows: [[-5, 4.2, 5.3, 'white'], [5, 4.2, 5.3, 'white']],
        lamps: [[0, 3.6, 7]],
        reflect: [[new THREE.BoxGeometry(14, 3.6, 0.3), 0xe8f4f0, 0, 2, 5.1]],
      };
    },
  },
  footbridge: {
    name: 'Footbridge', jp: '歩道橋', group: 'Buildings',
    note: 'A steel footbridge spanning 32 m across the road (along x), stairs down on one side. Parabolica Street.',
    kit: () => {
      const steel = lambert(0x4a6a8a), conc = mat('conc', () => new THREE.MeshLambertMaterial({ map: Tex.concrete() }));
      const parts = [
        part(new THREE.BoxGeometry(32, 0.6, 2.4), conc, { y: 5.6 }),
        part(new THREE.BoxGeometry(32, 1.1, 0.08), steel, { y: 6.45, z: 1.16 }),
        part(new THREE.BoxGeometry(32, 1.1, 0.08), steel, { y: 6.45, z: -1.16 }),
        part(new THREE.PlaneGeometry(6, 0.7), mat('fbsign', () => new THREE.MeshBasicMaterial({ map: Tex.roadSign([['歩道橋  FOOTBRIDGE', 10]], '#1d4f9a', 96, 12) })), { y: 5.05, z: -1.22, ry: Math.PI }),
      ];
      for (const sx of [-1, 1]) {
        for (const pz of [-0.9, 0.9]) parts.push(part(new THREE.BoxGeometry(0.35, 5.4, 0.35), steel, { x: sx * 13.5, y: 2.7, z: pz }));
        parts.push(part(new THREE.BoxGeometry(2, 0.35, 11.6), conc, { x: sx * 15, y: 2.8, z: 6.2, rx: 0.51 }));
        parts.push(part(new THREE.BoxGeometry(0.08, 1, 11.6), steel, { x: sx * 15 + 1, y: 3.4, z: 6.2, rx: 0.51 }));
      }
      return { parts, glows: [[-6, 5.2, -1.3, 'white'], [6, 5.2, -1.3, 'white']] };
    },
  },
  shop: {
    name: 'Shop building', jp: '店舗ビル', group: 'Buildings',
    note: 'Any size: a lit shopfront (or shutters) on the ground floor, tiled walls, windows above. Front faces the road.',
    block: shops,
    sample: [{ x: 0, z: 0, w: 16, d: 12, h: 13, rot: 0, tint: 0, seed: 1 }],
  },
  flats: {
    name: 'Block of flats', jp: 'マンション', group: 'Buildings',
    note: 'Any size: balconies and windows on every side, some lit.',
    block: flats,
    sample: [{ x: 0, z: 0, w: 20, d: 12, h: 30, rot: 0, seed: 1 }],
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

// Drinks vending machines in three colours.
[['white', 0xe0e4e8, 0], ['blue', 0x2a5ab0, 1], ['red', 0xc8283a, 2]].forEach(([name, colour, seed]) => {
  ASSETS['vending-' + name] = {
    name: `Vending machine (${name})`, jp: '自動販売機', group: 'Street',
    note: 'Lit drinks machine, front at +z. Stand them in twos and threes on the pavement.',
    kit: () => ({
      parts: [
        part(new THREE.BoxGeometry(1, 1.85, 0.75), lambert(colour), { y: 0.925 }),
        part(new THREE.PlaneGeometry(0.92, 1.8), mat('vend' + seed, () => new THREE.MeshBasicMaterial({ map: Tex.vending(seed) })), { y: 0.95, z: 0.38 }),
      ],
      pools: [[0, 1.4, 3, 2.6, 'white']],
      reflect: [[new THREE.BoxGeometry(0.9, 1.4, 0.2), 0xf4fbff, 0, 1.1, 0.4]],
    }),
  };
});

// Vertical neon signs that stick out from a shop wall (the board lies in
// the x-y plane, so it faces up and down the road; the wall is at -x).
const NEON = { pink: '#ff3a8a', teal: '#3ff0e8', amber: '#ffb02a', violet: '#a07aff', green: '#3aff8a' };
const NEON_GLOW = { pink: 'pink', teal: 'teal', amber: 'amber', violet: [0.63, 0.48, 1], green: [0.23, 1, 0.54] };
[['ramen', 'ラーメン', 'pink'], ['karaoke', 'カラオケ', 'teal'], ['izakaya', '居酒屋', 'amber'], ['hotel', 'ホテル', 'pink'], ['kissa', '喫茶', 'violet'], ['pharmacy', '薬', 'green'], ['bar', 'バー', 'pink'],
  ['pachinko', 'パチンコ', 'amber'], ['sushi', '寿司', 'violet'], ['club', 'クラブ', 'violet']].forEach(([id, text, c]) => {
  ASSETS['neon-' + id] = {
    name: `Neon sign: ${text}`, jp: 'ネオン', group: 'Signs',
    note: 'Sticks out from a shop wall at -x, high up, and faces along the road both ways.',
    kit: () => {
      const h = 1.1 * (32 * text.length + 16) / 32;
      const m = mat('neon' + id, () => new THREE.MeshBasicMaterial({ map: Tex.neonVertical(text, NEON[c]) }));
      const glows = [];
      for (let y = 0.6; y < h; y += 1.2) glows.push([0.6, 4 + y, 0.2, NEON_GLOW[c], 1.5], [0.6, 4 + y, -0.2, NEON_GLOW[c], 1.5]);
      return {
        parts: [
          part(new THREE.BoxGeometry(1.2, h + 0.1, 0.18), basic(0x0a080c), { x: 0.6, y: 4 + h / 2 }),
          part(new THREE.PlaneGeometry(1.1, h), m, { x: 0.6, y: 4 + h / 2, z: 0.1 }),
          part(new THREE.PlaneGeometry(1.1, h), m, { x: 0.6, y: 4 + h / 2, z: -0.1, ry: Math.PI }),
          part(new THREE.BoxGeometry(0.4, 0.1, 0.1), lambert(0x3a3a3a), { x: 0.2, y: 4 + h * 0.8 }),
        ],
        glows,
        reflect: [[new THREE.BoxGeometry(1.2, h, 0.4), new THREE.Color(NEON[c]).getHex(), 0.6, 4 + h / 2, 0]],
      };
    },
  };
});

// The ground pools' looks, shared by every track.
const POOL_TEX = { warm: () => Tex.lightPool(), cool: () => Tex.lightPool(), white: () => Tex.lightPoolWhite(), pink: () => Tex.lightPoolWhite(), gold: () => Tex.lightPoolWhite(), violet: () => Tex.lightPoolWhite() };
const POOL_COLOUR = { warm: 0xffffff, cool: 0x9adcc0, white: 0xc8d8ff, pink: 0xff4fa0, gold: 0xffc870, violet: 0x9a6aff };
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
    this.glowsBySize = new Map(); // halo size -> { pos, col }
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
    for (const [gx, gy, gz, c, size] of kit.glows || []) { v.set(gx, gy, gz).applyMatrix4(m); this.glow(v.x, v.y, v.z, c, size); }
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

  // Fake light that is not part of an asset. size: the halo's width
  // (the track's default when left out).
  glow(x, y, z, colour = 'amber', size = 0) {
    if (!this.glowsBySize.has(size)) this.glowsBySize.set(size, { pos: [], col: [] });
    const g = this.glowsBySize.get(size);
    g.pos.push(x, y, z);
    g.col.push(...(Array.isArray(colour) ? colour : GLOW[colour]));
  }
  pool(x, z, w, d = w, kind = 'warm', ry = 0) {
    (this.pools[kind] ||= []).push(placed(new THREE.PlaneGeometry(w, d), x, 0.03, z, ry, -Math.PI / 2));
  }
  reflect(geo, colour) {
    if (!this.reflectGeos.has(colour)) this.reflectGeos.set(colour, []);
    this.reflectGeos.get(colour).push(geo);
  }

  // Build everything into `group`. Returns the glow points (a list, so
  // Settings can hide them), the reflection group and the lamp spots.
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
    if (!this.glowsBySize.size) this.glow(0, -10, 0); // always one set of halos, even if empty
    const glows = [...this.glowsBySize].map(([size, { pos, col }]) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const points = new THREE.Points(geo, new THREE.PointsMaterial({ map: Tex.glow(), vertexColors: true, size: size || glowSize, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      points.renderOrder = 2;
      group.add(points);
      return points;
    });
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
// Roof furniture every building shares: a parapet round the edge, and a few
// boxes (air-con units, a stair or lift head) placed from the seed so the
// same building always gets the same roof.
function roofKit(b, out, { parapet = 0.9, units = 2, core = false } = {}) {
  const c = Math.cos(b.rot), sn = Math.sin(b.rot);
  const at = (lx, lz) => [b.x + lx * c + lz * sn, b.z - lx * sn + lz * c];
  for (const [len, lx, lz, ang] of [[b.w, 0, b.d / 2, 0], [b.w, 0, -b.d / 2, 0], [b.d, b.w / 2, 0, Math.PI / 2], [b.d, -b.w / 2, 0, Math.PI / 2]]) {
    const [x, z] = at(lx, lz);
    out.push(placed(new THREE.BoxGeometry(len + 0.3, parapet, 0.3), x, b.h + parapet / 2, z, b.rot + ang));
  }
  let k = (b.seed ?? 1) * 7.3 + b.w;
  const rnd = () => (k = (k * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < units; i++) {
    const w = 1.2 + rnd() * 1.6, d = 1 + rnd() * 1.2, h = 0.8 + rnd() * 0.8;
    const [x, z] = at((rnd() - 0.5) * (b.w - 4), (rnd() - 0.5) * (b.d - 4));
    out.push(placed(new THREE.BoxGeometry(w, h, d), x, b.h + h / 2, z, b.rot));
  }
  if (core) {
    const [x, z] = at(b.w * 0.2, -b.d * 0.15);
    out.push(placed(new THREE.BoxGeometry(4, 3, 4.5), x, b.h + 1.5, z, b.rot));
  }
}

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
    roofKit({ ...b, seed: Math.abs(b.x | 0) }, roofGeos, { parapet: 0.5, units: 2 });
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

// Shop buildings, merged by look. Each: { x, z, w, d, h, rot, tint (0-3),
// seed (1-4) }. The front (+z after rot) has a shopfront 4 m tall and rows
// of windows above; the other sides are plain tiles.
// A shop can take a palette: 'street' (the default greys and buffs) or
// 'neon' (Parabolica's violets, plums and golds). Awnings and the lit sign
// band over the shopfront come in the palette's colours too.
const SHOP_PALETTES = {
  street: { walls: [[150, 140, 122], [112, 116, 118], [138, 120, 108], [96, 100, 108]], awnings: [0x6a2a24, 0x2a4a5a, 0x7a6a3a, 0x3a3a40], bands: [0xffe0b0, 0xd8f0ff, 0xffd090] },
  neon: { walls: [[104, 78, 132], [126, 82, 116], [76, 64, 104], [140, 112, 78]], awnings: [0x8a1a5a, 0x4a2a7a, 0xb08a2a, 0x2a1a3a], bands: [0xff4f9a, 0xffc860, 0xa880ff] },
};
function shops(list, group, placer) {
  const walls = new Map(), fronts = [[], [], [], []], uppers = [[], [], []], roofs = [], awnings = new Map(), bands = new Map();
  const into = (map, key, g) => { if (!map.has(key)) map.set(key, []); map.get(key).push(g); };
  const face = (len, hgt, y0, b, ang, depth, u, v) => {
    const g = new THREE.PlaneGeometry(len, hgt);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
    return placed(g, b.x + Math.sin(ang) * depth, y0 + hgt / 2, b.z + Math.cos(ang) * depth, ang);
  };
  for (const b of list) {
    const fx = Math.sin(b.rot), fz = Math.cos(b.rot);
    // Front: shopfront, then floors above.
    const pal = b.palette || 'street', P = SHOP_PALETTES[pal];
    fronts[(b.seed - 1) % 4].push(face(b.w, 4, 0, b, b.rot, b.d / 2 + 0.02, b.w / 16, 1));
    if (b.h > 5) uppers[b.seed % 3].push(face(b.w, b.h - 4.6, 4.3, b, b.rot, b.d / 2 + 0.02, b.w / 8, (b.h - 4.6) / 12.8));
    const wk = pal + b.tint;
    into(walls, wk, face(b.w, b.h, 0, b, b.rot, b.d / 2, b.w / 4, b.h / 4));
    for (const [len, a] of [[b.d, Math.PI / 2], [b.w, Math.PI], [b.d, -Math.PI / 2]]) {
      const depth = Math.abs(a) === Math.PI / 2 ? b.w / 2 : b.d / 2;
      into(walls, wk, face(len, b.h, 0, b, b.rot + a, depth, len / 4, b.h / 4));
    }
    roofs.push(placed(new THREE.PlaneGeometry(b.w, b.d), b.x, b.h, b.z, b.rot, -Math.PI / 2));
    roofKit(b, roofs, { parapet: 0.8, units: 1 + (b.seed % 3) });
    // A sloping awning over the shopfront, and a lit sign band above it;
    // a stone cornice line between each floor.
    const aw = placed(new THREE.BoxGeometry(b.w - 0.6, 0.08, 1.6), b.x + fx * (b.d / 2 + 0.8), 3.75, b.z + fz * (b.d / 2 + 0.8), b.rot, 0.28);
    into(awnings, P.awnings[(b.seed + b.tint) % P.awnings.length], aw);
    into(bands, P.bands[(b.seed * 3 + b.tint) % P.bands.length], face(b.w - 1, 0.45, 4.05, b, b.rot, b.d / 2 + 0.05, 1, 1));
    for (let y = 4.6; y < b.h - 1; y += 3.2) into(walls, wk, placed(new THREE.BoxGeometry(b.w + 0.2, 0.18, 0.25), b.x + fx * (b.d / 2 + 0.1), y, b.z + fz * (b.d / 2 + 0.1), b.rot));
    // Light spilling out of the shopfront onto the pavement.
    placer.pool(b.x + fx * (b.d / 2 + 2.5), b.z + fz * (b.d / 2 + 2.5), b.w * 0.9, 5, b.seed % 2 ? 'pink' : 'warm', b.rot);
  }
  for (const [k, geos] of walls) {
    const tint = SHOP_PALETTES[k.slice(0, -1)].walls[Number(k.slice(-1))];
    group.add(new THREE.Mesh(merge(geos), mat('shopwall' + k, () => new THREE.MeshLambertMaterial({ map: Tex.tiles(tint) }))));
  }
  for (const [c, geos] of awnings) group.add(new THREE.Mesh(merge(geos), lambert(c)));
  for (const [c, geos] of bands) group.add(new THREE.Mesh(merge(geos), basic(c)));
  fronts.forEach((geos, i) => { if (geos.length) group.add(new THREE.Mesh(merge(geos), mat('shopfront' + i, () => new THREE.MeshBasicMaterial({ map: Tex.shopFront(i + 1), color: 0xcccccc })))); });
  uppers.forEach((geos, i) => { if (geos.length) group.add(new THREE.Mesh(merge(geos), litMat('floors' + i, Tex.floors(i + 1)))); });
  if (roofs.length) group.add(new THREE.Mesh(merge(roofs), roofMat()));
}

// Blocks of flats: balconies and windows all round. { x, z, w, d, h, rot, seed (1-3) }.
// b.crown: a colour for a lit band round the top (Parabolica's gold).
function flats(list, group, placer) {
  const sides = [[], [], []], roofs = [], crowns = new Map();
  for (const b of list) {
    [[b.w, 0], [b.d, Math.PI / 2], [b.w, Math.PI], [b.d, -Math.PI / 2]].forEach(([len, a], fi) => {
      const g = new THREE.PlaneGeometry(len, b.h);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 8, uv.getY(i) * b.h / 12.8);
      const depth = fi % 2 ? b.w / 2 : b.d / 2, ang = b.rot + a;
      sides[(b.seed - 1) % 3].push(placed(g, b.x + Math.sin(ang) * depth, b.h / 2, b.z + Math.cos(ang) * depth, ang));
    });
    roofs.push(placed(new THREE.PlaneGeometry(b.w, b.d), b.x, b.h, b.z, b.rot, -Math.PI / 2));
    roofKit(b, roofs, { parapet: 1.1, units: 3, core: true });
    // A water tank on legs.
    const c = Math.cos(b.rot), sn = Math.sin(b.rot), lx = -b.w * 0.25, lz = b.d * 0.15;
    roofs.push(placed(new THREE.CylinderGeometry(1.3, 1.3, 2.2, 8), b.x + lx * c + lz * sn, b.h + 2.4, b.z - lx * sn + lz * c));
    if (b.crown) {
      const band = [];
      roofKit({ ...b, h: b.h + 0.75, seed: 0 }, band, { parapet: 0.3, units: 0 });
      if (!crowns.has(b.crown)) crowns.set(b.crown, []);
      crowns.get(b.crown).push(...band);
      for (const [lx, lz] of [[b.w / 2, b.d / 2], [-b.w / 2, b.d / 2], [b.w / 2, -b.d / 2], [-b.w / 2, -b.d / 2]]) {
        placer.glow(b.x + lx * c + lz * sn, b.h + 1.2, b.z - lx * sn + lz * c, 'gold', 4);
      }
    }
  }
  for (const [col, geos] of crowns) group.add(new THREE.Mesh(merge(geos), basic(col)));
  sides.forEach((geos, i) => { if (geos.length) group.add(new THREE.Mesh(merge(geos), litMat('flats' + i, Tex.flats(i + 1)))); });
  if (roofs.length) group.add(new THREE.Mesh(merge(roofs), roofMat()));
}

// A wall whose lit windows glow but whose walls still take the light.
function litMat(key, tex) {
  return mat('lit' + key, () => new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.75 }));
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
