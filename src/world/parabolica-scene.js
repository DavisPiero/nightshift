// Parabolica Street: a Tokyo ring road at night, closed for racing. Inside
// the loop is a park (dark trees, cherry blossom, round park lamps); outside
// it, shops with lit fronts and neon signs, blocks of flats, vending
// machines, a convenience store, power poles and their wires. The road is
// four lanes with an orange centre line, lit white by tall LED lamps, between
// concrete blocks with catch fences. Footbridges cross the straights and an
// elevated expressway crosses over the back of the circuit. Pink is this
// track's light (the neon); the lamps are cool white.
// Every prop comes from the asset library (assets.js).

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';
import { rng, strip, merge, wallStrip, placed } from './scene-kit.js';
import { Placer, roofMat } from './assets.js';
import { cityBackdrop, reflectSky } from './track-scene.js';

const NEONS = ['neon-ramen', 'neon-karaoke', 'neon-izakaya', 'neon-hotel', 'neon-kissa', 'neon-pharmacy', 'neon-bar'];
const VENDING = ['vending-white', 'vending-blue', 'vending-red'];
const IN = -1, OUT = 1; // the park is inside the clockwise loop (right of travel)

export function buildParabolica(track, def) {
  const group = new THREE.Group();
  const place = new Placer();
  const r = rng(77);
  const hw = track.halfWidth, W = track.wall;
  const at = (k) => track.wrap(Math.round(k));
  const along = (k, s, dist) => { const i = at(k); return [track.x[i] + track.leftX(i) * s * dist, track.z[i] + track.leftZ(i) * s * dist]; };
  const head = (k) => track.headingAt(at(k));
  const facing = (k, s) => head(k) - s * Math.PI / 2; // +z of an asset turned to face the road from side s

  // Keep things off the road (the loop comes back near itself in places)
  // and off each other.
  const spots = [];
  const near = (x, z) => Math.abs(track.nearest(x, z).offset);
  const clear = (x, z, rad, gap = W + 5) => {
    if (near(x, z) < gap + rad) return false;
    for (const p of spots) if (Math.hypot(p[0] - x, p[1] - z) < p[2] + rad) return false;
    return true;
  };

  // --- Ground: the city outside, the park inside ---
  const cityTex = Tex.asphalt().clone();
  cityTex.repeat.set(300, 300); cityTex.needsUpdate = true;
  const city = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ map: cityTex, color: 0x5a5c62 }));
  city.rotation.x = -Math.PI / 2;
  city.position.set(300, -0.05, 600);
  group.add(city);
  const parkShape = new THREE.Shape();
  for (let k = 0; k < track.count; k += 4) {
    const [x, z] = along(k, IN, W + 5);
    if (k === 0) parkShape.moveTo(x, -z); else parkShape.lineTo(x, -z);
  }
  const parkGeo = new THREE.ShapeGeometry(parkShape).rotateX(-Math.PI / 2);
  const grassTex = Tex.grass().clone();
  grassTex.repeat.set(0.125, 0.125); grassTex.needsUpdate = true;
  const park = new THREE.Mesh(parkGeo, new THREE.MeshLambertMaterial({ map: grassTex, color: 0x5a6a58 }));
  park.position.y = 0.02;
  park.receiveShadow = true;
  group.add(park);

  // --- Road ---
  const roadMat = new THREE.MeshPhongMaterial({ map: Tex.asphalt(), color: 0xe8e8ec, shininess: 0, specular: 0x000000 });
  const road = new THREE.Mesh(strip(track, -W, W, 0, { step: 1, uScale: 0.25, vScale: 0.25 }), roadMat);
  road.receiveShadow = true;
  group.add(road);

  // Paint: white edge lines, dashed lane lines, a double orange centre line.
  const white = new THREE.MeshLambertMaterial({ color: 0xe0e4e0, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const orange = new THREE.MeshLambertMaterial({ color: 0xe0901a, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const lines = [];
  for (const s of [1, -1]) lines.push(strip(track, s * (hw - 0.35), s * (hw - 0.2), 0.012, { step: 2 }));
  for (const off of [-hw / 2, hw / 2]) for (let k = 0; k < track.count; k += 12) lines.push(strip(track, off - 0.07, off + 0.07, 0.012, { step: 1, from: k, to: k + 5, closed: false }));
  group.add(new THREE.Mesh(merge(lines), white));
  group.add(new THREE.Mesh(merge([strip(track, 0.1, 0.24, 0.012, { step: 2 }), strip(track, -0.24, -0.1, 0.012, { step: 2 })]), orange));
  // Start line.
  const startMat = new THREE.MeshLambertMaterial({ map: Tex.chequer(), transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  group.add(new THREE.Mesh(strip(track, -hw, hw, 0.013, { step: 1, from: def.start - 1, to: def.start + 1, closed: false, uScale: 0.5, vScale: 0.5 }), startMat));
  // "Slow down" in each lane, then red and white bars, before the hard corners.
  const wordGeo = new THREE.PlaneGeometry(2.0, 6.6);
  const wordMat = new THREE.MeshLambertMaterial({ map: Tex.roadWords('速度落せ'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const barMat = new THREE.MeshLambertMaterial({ map: Tex.slowBars(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const words = [], bars = [];
  let calm = 0;
  for (let k = 0; k < track.count; k++) {
    const hard = Math.abs(track.curvature[k]) > 1 / 75;
    if (hard && calm > 120) {
      const kw = track.wrap(k - 95);
      for (const lane of [-0.75, -0.25, 0.25, 0.75]) {
        const [x, z] = along(kw, 1, lane * hw);
        words.push(placed(wordGeo.clone(), x, 0.014, z, head(kw) + Math.PI, -Math.PI / 2));
      }
      for (let b = 0; b < 6; b++) bars.push(strip(track, -hw + 0.6, hw - 0.6, 0.013, { step: 1, from: track.wrap(k - 70 + b * 6), to: track.wrap(k - 70 + b * 6) + 2, closed: false, uScale: 0.5 }));
    }
    calm = hard ? 0 : calm + 1;
  }
  if (words.length) group.add(new THREE.Mesh(merge(words), wordMat));
  if (bars.length) group.add(new THREE.Mesh(merge(bars), barMat));
  // Red and white kerbs on the inside of the hard corners.
  const kerbMat = [new THREE.MeshLambertMaterial({ color: 0x9a2018 }), new THREE.MeshLambertMaterial({ color: 0xc8c4b8 })];
  const kerbGeos = [[], []];
  for (let k = 0; k < track.count; k += 3) {
    const c = track.curvature[k];
    if (Math.abs(c) < 1 / 90) continue;
    const s = Math.sign(c);
    kerbGeos[(k / 3) % 2].push(strip(track, s * (hw - 0.1), s * (hw + 1.0), 0.03, { step: 1, from: k, to: k + 3, closed: false }));
  }
  kerbGeos.forEach((geos, i) => { if (geos.length) group.add(new THREE.Mesh(merge(geos), kerbMat[i])); });

  // --- Edges: concrete blocks, catch fences, pavements ---
  const blockMat = new THREE.MeshLambertMaterial({ map: Tex.barrier() });
  group.add(new THREE.Mesh(merge([1, -1].map((s) => wallStrip(track, s * W, 0, 1.0, 2, 0.5))), blockMat));
  group.add(new THREE.Mesh(merge([1, -1].map((s) => strip(track, s * W, s * (W + 0.6), 1.0, { step: 2 }))), new THREE.MeshLambertMaterial({ color: 0x9a9890 })));
  const fenceMat = new THREE.MeshLambertMaterial({ map: Tex.fence(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0x8a9096 });
  group.add(new THREE.Mesh(merge([1, -1].map((s) => wallStrip(track, s * (W + 0.3), 1.0, 3.6, 4, 2.5))), fenceMat));
  for (const s of [1, -1]) for (let k = 0; k < track.count; k += 6) {
    const [x, z] = along(k, s, W + 0.3);
    place.add('rail-post', x, 0, z, head(k), [1, 4.5, 1]);
  }
  const pavement = new THREE.MeshLambertMaterial({ map: Tex.concrete(), color: 0x7c7c7a });
  for (const s of [1, -1]) group.add(new THREE.Mesh(strip(track, s * (W + 0.6), s * (W + 5), 0.12, { step: 2, uScale: 0.3, vScale: 0.3 }), pavement));

  // --- Lamps: tall LED lamps every 34 m, alternating sides ---
  let flip = 1;
  for (let k = 8; k < track.count; k += 34) {
    flip = -flip;
    const lx = track.leftX(k), lz = track.leftZ(k);
    const off = flip * (W + 1.4);
    place.add('led-streetlight', track.x[k] + lx * off, 0, track.z[k] + lz * off, Math.atan2(lz * flip, -lx * flip));
  }

  // --- Landmarks first, so the town is built round them ---
  // Footbridges over the straights.
  for (const k of [3300, 2560, 1780]) {
    const [x, z] = along(k, 1, 0);
    place.add('footbridge', x, 0, z, head(k));
    for (const s of [1, -1]) { const [px, pz] = along(k + 6, s, 17); spots.push([px, pz, 9]); }
  }
  // The elevated expressway, crossing over the back of the circuit.
  const viaduct = buildViaduct(track, 2000, place, spots);
  group.add(viaduct);
  // Start gantry with a lit board.
  {
    const k = def.start + 6, ry = head(k);
    const steel = new THREE.MeshLambertMaterial({ color: 0x34383e });
    for (const s of [1, -1]) {
      const [x, z] = along(k, s, W + 0.9);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.2, 0.4), steel);
      leg.position.set(x, 3.6, z);
      group.add(leg);
    }
    const [cx, cz] = along(k, 1, 0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry((W + 0.9) * 2, 0.6, 0.5), steel);
    beam.position.set(cx, 7, cz); beam.rotation.y = ry;
    group.add(beam);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.4), new THREE.MeshBasicMaterial({ map: Tex.ledBoard('パラボリカ  START', 160, 22) }));
    board.position.set(cx, 6.1, cz); board.rotation.y = ry + Math.PI;
    group.add(board);
    place.reflect(placed(new THREE.BoxGeometry(10, 1.4, 0.3), cx, 6.1, cz, ry), 0xffb02a);
  }
  // Blue direction boards over the road on gantries.
  for (const [k, lines] of [[2440, [['首都高  入口', 13], ['EXPRESSWAY', 10], ['↑ 1 km', 11]]], [3150, [['パラボリカ', 14], ['PARABOLICA', 10], ['← 公園', 11]]], [880, [['渋谷  新宿', 14], ['SHIBUYA', 10], ['→', 11]]]]) {
    roadSign(group, track, k, Tex.roadSign(lines, '#1d4f9a'), W);
  }

  // --- Outside: the town ---
  // A row of shops along the pavement, flats behind; neon on some fronts,
  // vending machines in front of others.
  const shops = [];
  for (let k = 0; k < track.count;) {
    const w = 10 + r() * 9, d = 10 + r() * 6, h = 7 + r() * 14;
    const dist = W + 5.5 + d / 2;
    const [x, z] = along(k + w / 2, OUT, dist);
    if (clear(x, z, Math.min(w, d) / 2, W + 4)) {
      const rot = facing(k + w / 2, OUT);
      const b = { x, z, w, d, h, rot, tint: (r() * 4) | 0, seed: 1 + ((r() * 4) | 0) };
      place.block('shop', b);
      shops.push([k, w, b]);
      spots.push([x, z, Math.min(w, d) / 2 + 1]);
    }
    k += Math.round(w + (r() < 0.15 ? 8 : 0.5));
  }
  for (const [k, w, b] of shops) {
    const roll = r();
    if (roll < 0.55) {
      // A neon sign at the front corner, sticking out over the pavement.
      const [x, z] = along(k + (r() < 0.5 ? 1.5 : w - 1.5), OUT, W + 5.4);
      place.add(NEONS[(r() * NEONS.length) | 0], x, Math.max(0, Math.min(3, b.h - 10)), z, head(k) + Math.PI);
    } else if (roll < 0.8) {
      // Two or three vending machines by the door.
      const n = 2 + ((r() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const [x, z] = along(k + 2 + i * 1.05, OUT, W + 4.4);
        place.add(VENDING[(r() * 3) | 0], x, 0.12, z, facing(k, OUT));
      }
    }
  }
  // Flats behind the shops.
  for (let k = 0; k < track.count; k += 26) {
    if (r() < 0.3) continue;
    const w = 16 + r() * 14, d = 12 + r() * 8, h = 18 + r() * 26;
    const [x, z] = along(k, OUT, W + 34 + d / 2 + r() * 20);
    if (!clear(x, z, Math.max(w, d) / 2, W + 26)) continue;
    place.block('flats', { x, z, w, d, h, rot: facing(k, OUT) + (r() - 0.5) * 0.1, seed: 1 + ((r() * 3) | 0) });
    spots.push([x, z, Math.max(w, d) / 2]);
  }
  // Two convenience stores, lit up on corners.
  for (const k of [520, 2860]) {
    const [x, z] = along(k, OUT, W + 11);
    place.add('konbini', x, 0, z, facing(k, OUT));
  }
  // Power poles along the pavement on the town side, wires between.
  {
    const wire = [];
    let prev = null;
    for (let k = 0; k < track.count; k += 32) {
      const [x, z] = along(k, OUT, W + 4.6);
      if (!clear(x, z, 0.5, W + 3)) { prev = null; continue; }
      place.add('power-pole', x, 0, z, head(k)); // cross-arm across the road
      const tops = [-0.9, 0, 0.9].map((o) => { const t = at(k); return [x + track.leftX(t) * o, 9.4, z + track.leftZ(t) * o]; });
      if (prev && Math.hypot(prev[1][0] - x, prev[1][2] - z) < 40) {
        for (let w = 0; w < 3; w++) {
          const a = prev[w], b = tops[w];
          for (let t = 0; t < 6; t++) {
            const t0 = t / 6, t1 = (t + 1) / 6, sag = (u) => -Math.sin(u * Math.PI) * 0.8;
            wire.push(a[0] + (b[0] - a[0]) * t0, a[1] + sag(t0), a[2] + (b[2] - a[2]) * t0, a[0] + (b[0] - a[0]) * t1, a[1] + sag(t1), a[2] + (b[2] - a[2]) * t1);
          }
        }
      }
      prev = tops;
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    group.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x18181c })));
  }

  // --- Inside: the park ---
  // A hedge along the fence, round lamps along a path, and trees: mostly
  // dark broadleaves, with clumps of cherry blossom.
  for (let k = 0; k < track.count; k += 3) {
    if (r() < 0.3) continue;
    const [x, z] = along(k, IN, W + 6 + r() * 1.5);
    if (near(x, z) > W + 5) place.add('bush', x, 0, z, r() * 6, [1.3 * (0.9 + r() * 0.5), 0.8 * (0.9 + r() * 0.5), 1.3 * (0.9 + r() * 0.5)]);
  }
  for (let k = 20; k < track.count; k += 45) {
    const [x, z] = along(k, IN, W + 10);
    if (clear(x, z, 0.5, W + 9)) place.add('park-lamp', x, 0, z, 0);
  }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < track.count; i++) { x0 = Math.min(x0, track.x[i]); x1 = Math.max(x1, track.x[i]); z0 = Math.min(z0, track.z[i]); z1 = Math.max(z1, track.z[i]); }
  const poly = [];
  for (let k = 0; k < track.count; k += 8) poly.push([track.x[k], track.z[k]]);
  let blossom = 0;
  for (let i = 0; i < 2600; i++) {
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    if (!inside(poly, x, z)) continue;
    const d = near(x, z);
    if (d < W + 8 || d > W + 130) continue; // a deep belt of trees, open lawns in the middle
    const cherry = Math.sin(x * 0.013) * Math.cos(z * 0.011) > 0.55; // they grow in clumps
    place.add(cherry ? 'sakura' : 'tree', x, 0, z, r() * 6, 0.8 + r() * 0.6);
    if (cherry) blossom++;
  }
  // Blossom on the town side too, a few in front of the flats.
  for (let k = 100; k < track.count; k += 160) {
    const [x, z] = along(k, OUT, W + 26);
    if (clear(x, z, 2, W + 20)) place.add('sakura', x, 0, z, r() * 6, 0.9);
  }

  const { glows, reflect, lamps } = place.finish(group);

  const skies = [];
  const backdrop = cityBackdrop(r, skies, { count: 90, minH: 30, maxH: 140, windows: Tex.skylineNeon() });
  reflect.add(reflectSky(skies));
  reflect.add(viaduct.userData.reflect);

  return {
    group, lamps, glows, roadMat, backdrop, reflect, skies,
    snowy: [[park.material, 0xb8c0c8], [pavement, 0xc8ccd0], [city.material, 0x9a9ea4], [roofMat(), 0xc4cad0]],
    look: {
      fog: { clear: 0x0e0c16, rain: 0x10121a, fog: 0x201e2c, snow: 0x181a24 },
      hemi: [0x4a4268, 0x141018, 1.0],
      moon: 0.3,
      lamp: 0xdfe6ff, lampPower: 125,
      reflectBg: 0x140c1a,
      ground: 0x0e0e12,
    },
  };
}

// Point in polygon (x, z).
function inside(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

// A blue direction board over the road on a steel gantry.
function roadSign(group, track, k, map, W) {
  const ry = track.headingAt(k);
  const at = (off, y) => new THREE.Vector3(track.x[k] + track.leftX(k) * off, y, track.z[k] + track.leftZ(k) * off);
  const steel = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
  for (const s of [1, -1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.6, 0.3), steel);
    leg.position.copy(at(s * (W + 0.9), 3.8));
    group.add(leg);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry((W + 0.9) * 2, 0.4, 0.4), steel);
  beam.position.copy(at(0, 7.4)); beam.rotation.y = ry;
  group.add(beam);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.0), new THREE.MeshBasicMaterial({ map, color: 0xb8c4c8 }));
  board.position.copy(at(-2.5, 6.2)); board.rotation.y = ry + Math.PI;
  group.add(board);
}

// The elevated expressway: a concrete deck 9 m up on round piers, crossing
// the circuit at sample k at an angle, with sodium lamps along its parapets.
// Piers stand clear of the road.
function buildViaduct(track, k, place, spots) {
  const g = new THREE.Group();
  const ang = track.headingAt(k) + 1.2; // about 70 degrees across
  const dx = Math.sin(ang), dz = Math.cos(ang);
  const cx = track.x[k], cz = track.z[k];
  const len = 700, wide = 18, y = 9;
  const conc = new THREE.MeshLambertMaterial({ map: Tex.concrete(), color: 0x8a8c90 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(wide, 1.4, len), conc);
  deck.position.set(cx, y, cz); deck.rotation.y = ang;
  g.add(deck);
  const parapets = [];
  for (const s of [-1, 1]) parapets.push(placed(new THREE.BoxGeometry(0.4, 1.3, len), cx + dz * s * (wide / 2 - 0.2), y + 1.35, cz - dx * s * (wide / 2 - 0.2), ang));
  g.add(new THREE.Mesh(merge(parapets), conc));
  const piers = [];
  for (let d = -len / 2 + 15; d < len / 2; d += 30) {
    const px = cx + dx * d, pz = cz + dz * d;
    if (Math.abs(track.nearest(px, pz).offset) < track.wall + 4) continue;
    for (const s of [-1, 1]) piers.push(placed(new THREE.CylinderGeometry(0.9, 1.1, y - 0.7, 8), px + dz * s * 5, (y - 0.7) / 2, pz - dx * s * 5));
    spots.push([px, pz, 9]);
  }
  for (const p of piers) if (!p.attributes.uv) p.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2));
  g.add(new THREE.Mesh(merge(piers), conc));
  // Sodium lamps on the parapets, and a glow off the deck's edge.
  const reflect = new THREE.Group();
  for (let d = -len / 2 + 10; d < len / 2; d += 25) {
    for (const s of [-1, 1]) {
      const lx = cx + dx * d + dz * s * (wide / 2 - 0.2), lz = cz + dz * d - dx * s * (wide / 2 - 0.2);
      place.glow(lx, y + 3.2, lz, 'amber', 2.2);
    }
  }
  const lampBar = new THREE.Mesh(new THREE.BoxGeometry(wide, 0.4, len), new THREE.MeshBasicMaterial({ color: 0xffb060 }));
  lampBar.position.set(cx, y + 3.2, cz); lampBar.rotation.y = ang; lampBar.scale.set(1, 1, 1);
  reflect.add(lampBar);
  g.userData.reflect = reflect;
  return g;
}
