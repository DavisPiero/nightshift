// Builds the 3D road and its surroundings from a TrackPath: tarmac, faded
// markings, kerbs, barriers, streetlights with pools of amber light, fences,
// warehouses, trees and parked cars. Lamps are mostly fake (a glowing head
// and a light pool painted on the road); only the few nearest the car get a
// real light, which keeps it fast on an iPad.

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';
import { buildCoupe } from '../vehicles/coupe-model.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// A flat strip following the track between two offsets from the centre line.
function strip(track, inner, outer, y, { step = 2, uScale = 1, vScale = 1, from = 0, to = track.count, closed = true } = {}) {
  const pos = [], uv = [], idx = [];
  let n = 0;
  const last = closed && from === 0 && to === track.count ? to : to - 1;
  for (let k = from; k <= last; k += step) {
    const i = track.wrap(k);
    const lx = track.leftX(i), lz = track.leftZ(i);
    const d = k; // metres travelled (1 sample per metre)
    pos.push(track.x[i] + lx * inner, y, track.z[i] + lz * inner);
    pos.push(track.x[i] + lx * outer, y, track.z[i] + lz * outer);
    uv.push(0, d * vScale, (outer - inner) * uScale, d * vScale);
    if (n > 0) {
      const a = (n - 1) * 2, b = n * 2;
      // Wind so the face points up whichever side of the centre line it is on.
      if (outer > inner) idx.push(a, b + 1, a + 1, a, b, b + 1);
      else idx.push(a, a + 1, b + 1, a, b + 1, b);
    }
    n++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Join several small geometries (same attributes) into one, to save draw calls.
function merge(geos) {
  const pos = [], uv = [], idx = [];
  let base = 0;
  for (const g of geos) {
    pos.push(...g.attributes.position.array);
    uv.push(...g.attributes.uv.array);
    for (const i of g.index.array) idx.push(i + base);
    base += g.attributes.position.count;
    g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  m.setIndex(idx);
  m.computeVertexNormals();
  return m;
}

// A vertical band following the track at one offset (barriers, fences).
function wallStrip(track, offset, y0, y1, step = 4, uScale = 0.5, facingIn = true) {
  const pos = [], uv = [], idx = [];
  let n = 0;
  for (let k = 0; k <= track.count; k += step) {
    const i = track.wrap(k);
    const x = track.x[i] + track.leftX(i) * offset, z = track.z[i] + track.leftZ(i) * offset;
    pos.push(x, y0, z, x, y1, z);
    uv.push(k * uScale, 0, k * uScale, (y1 - y0) * uScale);
    if (n > 0) {
      const a = (n - 1) * 2, b = n * 2;
      const inward = (offset > 0) === facingIn;
      if (inward) idx.push(a, b, b + 1, a, b + 1, a + 1); else idx.push(a, b + 1, b, a, a + 1, b + 1);
    }
    n++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildTrackScene(track, def) {
  const group = new THREE.Group();
  const hw = track.halfWidth;
  const r = rng(42);

  // Ground: a big dark plane under everything.
  const grassTex = Tex.grass();
  grassTex.repeat.set(200, 200);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ map: grassTex, color: 0x6a7a62 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(190, -0.02, 50);
  ground.receiveShadow = true;
  group.add(ground);

  // Tarmac.
  const asphalt = Tex.asphalt();
  const road = new THREE.Mesh(strip(track, -hw - 0.6, hw + 0.6, 0, { step: 1, uScale: 0.25, vScale: 0.25 }), new THREE.MeshLambertMaterial({ map: asphalt }));
  road.receiveShadow = true;
  group.add(road);

  // Concrete verges out to the barriers.
  const conc = Tex.concrete();
  const vergeMat = new THREE.MeshLambertMaterial({ map: conc, color: 0x8a8a84 });
  for (const s of [1, -1]) {
    const v = new THREE.Mesh(strip(track, s * (hw + 0.6), s * (track.wall + 0.5), 0.01, { step: 2, uScale: 0.3, vScale: 0.3 }), vergeMat);
    v.receiveShadow = true;
    group.add(v);
  }

  // Faded paint: dashed centre line, solid edge lines, start line.
  const paintMat = new THREE.MeshLambertMaterial({ color: 0xb8b29a, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const s of [1, -1]) group.add(new THREE.Mesh(strip(track, s * (hw - 0.45), s * (hw - 0.3), 0.012, { step: 2 }), paintMat));
  const dashGeos = [];
  for (let k = 0; k < track.count; k += 9) dashGeos.push(strip(track, -0.08, 0.08, 0.012, { step: 1, from: k, to: k + 4, closed: false }));
  group.add(new THREE.Mesh(merge(dashGeos), paintMat));
  const startMat = new THREE.MeshLambertMaterial({ color: 0xa8a498, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  group.add(new THREE.Mesh(strip(track, -hw, hw, 0.013, { step: 1, from: def.start - 1, to: def.start + 1, closed: false }), startMat));

  // Red and white kerbs on the inside of tight corners.
  const kerbMat = [new THREE.MeshLambertMaterial({ color: 0x8a2018 }), new THREE.MeshLambertMaterial({ color: 0xb8b4a8 })];
  const kerbGeos = [[], []];
  for (let k = 0; k < track.count; k += 3) {
    const c = track.curvature[k];
    if (Math.abs(c) < 1 / 80) continue;
    const side = Math.sign(c); // inside of the bend
    kerbGeos[(k / 3) % 2].push(strip(track, side * (hw - 0.1), side * (hw + 0.9), 0.03, { step: 1, from: k, to: k + 3, closed: false }));
  }
  kerbGeos.forEach((geos, i) => { if (geos.length) group.add(new THREE.Mesh(merge(geos), kerbMat[i])); });

  // Barriers: steel guard rail on posts, both sides.
  const railMat = new THREE.MeshLambertMaterial({ color: 0x8c908c, side: THREE.DoubleSide });
  for (const s of [1, -1]) {
    group.add(new THREE.Mesh(wallStrip(track, s * track.wall, 0.45, 0.8, 2), railMat));
  }
  const postGeo = new THREE.BoxGeometry(0.12, 0.8, 0.12);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x5a5c5a });
  const posts = [];
  for (const s of [1, -1]) for (let k = 0; k < track.count; k += 4) posts.push([track.x[k] + track.leftX(k) * s * (track.wall + 0.1), track.z[k] + track.leftZ(k) * s * (track.wall + 0.1)]);
  const postMesh = new THREE.InstancedMesh(postGeo, postMat, posts.length);
  const m4 = new THREE.Matrix4();
  posts.forEach(([x, z], i) => { m4.makeTranslation(x, 0.4, z); postMesh.setMatrixAt(i, m4); });
  group.add(postMesh);

  // Chain-link fence further out on both sides.
  const fenceTex = Tex.fence();
  const fenceMat = new THREE.MeshLambertMaterial({ map: fenceTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0x9a9e98 });
  fenceTex.repeat.set(1, 1);
  for (const s of [1, -1]) group.add(new THREE.Mesh(wallStrip(track, s * (track.wall + 4), 0, 2.4, 4, 2.5), fenceMat));

  // Streetlights every ~40 m, alternating sides, arm over the road.
  const lamps = [];
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3e4244 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffc070 });
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 7.5, 6);
  const armGeo = new THREE.BoxGeometry(2.4, 0.1, 0.1);
  const headGeo = new THREE.BoxGeometry(0.7, 0.16, 0.32);
  const poolGeo = new THREE.PlaneGeometry(16, 16);
  const poolMat = new THREE.MeshBasicMaterial({ map: Tex.lightPool(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 });
  const glowMat = new THREE.SpriteMaterial({ map: Tex.glow(), color: 0xffa850, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  let flip = 1;
  for (let k = 10; k < track.count; k += 40) {
    flip = -flip;
    const lx = track.leftX(k), lz = track.leftZ(k);
    const off = flip * (hw + 1.6);
    const px = track.x[k] + lx * off, pz = track.z[k] + lz * off;
    const lamp = new THREE.Group();
    lamp.position.set(px, 0, pz);
    lamp.rotation.y = Math.atan2(lz * flip, -lx * flip); // arm points over the road
    const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 3.75; lamp.add(pole);
    const arm = new THREE.Mesh(armGeo, poleMat); arm.position.set(1.15, 7.4, 0); lamp.add(arm);
    const head = new THREE.Mesh(headGeo, headMat); head.position.set(2.2, 7.3, 0); lamp.add(head);
    const glow = new THREE.Sprite(glowMat); glow.position.set(2.2, 7.1, 0); glow.scale.set(3.2, 3.2, 1); lamp.add(glow);
    group.add(lamp);
    const hx = px - lx * flip * 2.2, hz = pz - lz * flip * 2.2;
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(hx, 0.02, hz);
    group.add(pool);
    lamps.push(new THREE.Vector3(hx, 6.9, hz));
  }

  // Scenery beyond the fence: warehouses, trees, bushes, parked cars.
  const buildingTints = [[70, 78, 80], [84, 82, 72], [58, 66, 62], [92, 88, 80]];
  const buildings = [];
  const placed = [];
  const clear = (x, z, rad) => {
    const near = track.nearest(x, z);
    if (Math.abs(near.offset) < track.wall + 6 + rad) return false;
    // Also keep clear of the road further along (the loop folds back on itself).
    for (let i = 0; i < track.count; i += 6) if (Math.hypot(track.x[i] - x, track.z[i] - z) < track.wall + 6 + rad) return false;
    for (const p of placed) if (Math.hypot(p[0] - x, p[1] - z) < p[2] + rad + 2) return false;
    return true;
  };
  for (let k = 0; k < track.count; k += 26) {
    for (const s of [1, -1]) {
      if (r() < 0.35) continue;
      const w = 14 + r() * 26, d = 12 + r() * 18, h = 5 + r() * 9;
      const dist = track.wall + 10 + d / 2 + r() * 14;
      const x = track.x[k] + track.leftX(k) * s * dist, z = track.z[k] + track.leftZ(k) * s * dist;
      const rad = Math.hypot(w, d) / 2;
      if (!clear(x, z, rad)) continue;
      placed.push([x, z, rad]);
      buildings.push({ x, z, w, d, h, rot: track.headingAt(k) + Math.PI / 2, tint: buildingTints[(r() * 4) | 0], lit: r() < 0.4 });
    }
  }
  for (const b of buildings) {
    const tex = Tex.cladding(b.tint).clone();
    tex.needsUpdate = true;
    tex.repeat.set(b.w / 8, b.h / 8);
    const wallMat = new THREE.MeshLambertMaterial({ map: tex });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x2a2e2e });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]);
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.rotation.y = b.rot;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    // Roller door and a strip of office windows on some.
    const doorMat = new THREE.MeshLambertMaterial({ map: Tex.shutter(), color: 0xaab0aa });
    for (const side of [1, -1]) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(6, b.w * 0.4), Math.min(4.5, b.h * 0.6)), doorMat);
      door.position.set(b.x, Math.min(4.5, b.h * 0.6) / 2, b.z);
      door.rotation.y = b.rot + (side > 0 ? 0 : Math.PI);
      door.translateZ(b.d / 2 + 0.02);
      door.translateX(-b.w * 0.2);
      group.add(door);
      if (b.lit) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(b.w * 0.6, 2), new THREE.MeshBasicMaterial({ map: Tex.windows((b.x * 7 + b.z) | 0) }));
        win.position.set(b.x, b.h - 1.8, b.z);
        win.rotation.y = b.rot + (side > 0 ? 0 : Math.PI);
        win.translateZ(b.d / 2 + 0.03);
        group.add(win);
      }
    }
    // A dim lamp over the door.
    const lampBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.2), new THREE.MeshBasicMaterial({ color: 0xd8c890 }));
    lampBox.position.set(b.x, Math.min(4.5, b.h * 0.6) + 0.5, b.z);
    lampBox.rotation.y = b.rot;
    lampBox.translateZ(b.d / 2 + 0.1);
    lampBox.translateX(-b.w * 0.2);
    group.add(lampBox);
  }

  // Trees and bushes (instanced, low-poly), dark green.
  const treeSpots = [], bushSpots = [];
  for (let k = 0; k < track.count; k += 7) {
    for (const s of [1, -1]) {
      const dist = track.wall + 6 + r() * 30;
      const x = track.x[k] + track.leftX(k) * s * dist + (r() - 0.5) * 6;
      const z = track.z[k] + track.leftZ(k) * s * dist + (r() - 0.5) * 6;
      if (!clear(x, z, 2)) continue;
      if (r() < 0.45) { treeSpots.push([x, z, 0.8 + r() * 0.7]); placed.push([x, z, 2]); }
      else if (r() < 0.6) bushSpots.push([x, z, 0.7 + r() * 0.8]);
    }
  }
  // Hedge just behind the fence.
  for (let k = 0; k < track.count; k += 3) {
    for (const s of [1, -1]) {
      if (r() < 0.4) continue;
      const dist = track.wall + 5 + r() * 1.5;
      bushSpots.push([track.x[k] + track.leftX(k) * s * dist, track.z[k] + track.leftZ(k) * s * dist, 0.9 + r() * 0.6]);
    }
  }
  const leaf = new THREE.MeshLambertMaterial({ color: 0x1f3320, flatShading: true });
  const leafLight = new THREE.MeshLambertMaterial({ color: 0x2c4426, flatShading: true });
  const trunk = new THREE.MeshLambertMaterial({ color: 0x2a2018 });
  const crownGeo = new THREE.IcosahedronGeometry(2.6, 0);
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.28, 3, 5);
  const bushGeo = new THREE.IcosahedronGeometry(1.1, 0);
  const crowns = new THREE.InstancedMesh(crownGeo, leaf, treeSpots.length);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunk, treeSpots.length);
  const q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  treeSpots.forEach(([x, z, s], i) => {
    q.setFromEuler(new THREE.Euler(0, r() * 6, 0));
    sc.set(s, s * (1.1 + r() * 0.5), s);
    p.set(x, 3 * s + 2.2 * s, z);
    m4.compose(p, q, sc); crowns.setMatrixAt(i, m4);
    p.set(x, 1.5 * s, z); sc.set(s, s, s);
    m4.compose(p, q, sc); trunks.setMatrixAt(i, m4);
  });
  const bushes = new THREE.InstancedMesh(bushGeo, leafLight, bushSpots.length);
  bushSpots.forEach(([x, z, s], i) => {
    q.setFromEuler(new THREE.Euler(0, r() * 6, 0));
    sc.set(s * 1.3, s * 0.8, s * 1.3);
    p.set(x, s * 0.5, z);
    m4.compose(p, q, sc); bushes.setMatrixAt(i, m4);
  });
  crowns.castShadow = true;
  group.add(crowns, trunks, bushes);

  // A few parked cars on the verge, in muted colours.
  const parkedColours = [0x40484e, 0x6a2620, 0x8c8a80, 0x23303a, 0x4a4436];
  for (let n = 0, k = 140; n < 6; n++, k = (k + 290 + ((r() * 60) | 0)) % track.count) {
    if (Math.abs(track.curvature[k]) > 1 / 120) continue;
    const car = buildCoupe(parkedColours[n % parkedColours.length]);
    const s = n % 2 ? 1 : -1;
    const dist = track.wall + 2.2;
    car.root.position.set(track.x[k] + track.leftX(k) * s * dist, 0, track.z[k] + track.leftZ(k) * s * dist);
    car.root.rotation.y = track.headingAt(k) + (r() < 0.5 ? 0 : Math.PI);
    car.root.traverse((o) => { if (o.isSprite) o.visible = false; });
    group.add(car.root);
  }

  return { group, lamps };
}
