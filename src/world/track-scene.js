// Builds the 3D road and its surroundings from a TrackPath: tarmac, faded
// markings, kerbs, barriers, streetlights with pools of amber light, fences,
// warehouses, a container yard, a petrol station, power lines, trees, parked
// cars and a far-off city glow. Lamps are mostly fake (a glowing head and a
// light pool painted on the road); only the few nearest the car get a real
// light. Repeated things are instanced or merged into a few meshes, which
// keeps draw calls low enough for an iPad.

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';
import { buildCar, bakeStatic } from '../vehicles/car-model.js';
import { SKYLINER_R34, CHALLENJER_SRT8 } from '../vehicles/cars.js';
import { rng, strip, merge, wallStrip, placed, instanced } from './scene-kit.js';
import { buildUnderground } from './underground-scene.js';

export function buildTrackScene(track, def) {
  if (def.theme === 'underground') return buildUnderground(track, def);
  const group = new THREE.Group();
  const hw = track.halfWidth;
  const r = rng(42);
  const glowPoints = [];   // lamp halos, drawn as one set of points
  const poolGeos = [];     // amber light pools on the ground
  const coolPoolGeos = []; // fluorescent pools (petrol station, vending machines)

  // Ground: a big dark plane under everything.
  const grassTex = Tex.grass();
  grassTex.repeat.set(200, 200);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ map: grassTex, color: 0x6a7a62 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(190, -0.02, 50);
  ground.receiveShadow = true;
  group.add(ground);

  // Tarmac. Phong, so rain can make it shiny (see world/weather.js).
  const asphalt = Tex.asphalt();
  const roadMat = new THREE.MeshPhongMaterial({ map: asphalt, shininess: 0, specular: 0x000000 });
  const road = new THREE.Mesh(strip(track, -hw - 0.6, hw + 0.6, 0, { step: 1, uScale: 0.25, vScale: 0.25 }), roadMat);
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
  const lineGeos = [];
  for (const s of [1, -1]) lineGeos.push(strip(track, s * (hw - 0.45), s * (hw - 0.3), 0.012, { step: 2 }));
  for (let k = 0; k < track.count; k += 9) lineGeos.push(strip(track, -0.08, 0.08, 0.012, { step: 1, from: k, to: k + 4, closed: false }));
  group.add(new THREE.Mesh(merge(lineGeos), paintMat));
  // Chequered start line.
  const startMat = new THREE.MeshLambertMaterial({ map: Tex.chequer(), transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  group.add(new THREE.Mesh(strip(track, -hw, hw, 0.013, { step: 1, from: def.start - 1, to: def.start + 1, closed: false, uScale: 0.5, vScale: 0.5 }), startMat));

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
  group.add(new THREE.Mesh(merge([1, -1].map((s) => wallStrip(track, s * track.wall, 0.45, 0.8, 2))), railMat));
  const posts = [];
  for (const s of [1, -1]) for (let k = 0; k < track.count; k += 4) posts.push([track.x[k] + track.leftX(k) * s * (track.wall + 0.1), 0.4, track.z[k] + track.leftZ(k) * s * (track.wall + 0.1)]);
  group.add(instanced(new THREE.BoxGeometry(0.12, 0.8, 0.12), new THREE.MeshLambertMaterial({ color: 0x5a5c5a }), posts));
  const m4 = new THREE.Matrix4();

  // Chevron boards on the outside of the tight corners, facing the traffic.
  const chevGeo = new THREE.PlaneGeometry(1.1, 0.7);
  const chevMats = [1, -1].map((dir) => new THREE.MeshLambertMaterial({ map: Tex.chevron(dir), side: THREE.DoubleSide }));
  const chevBy = [[], []];
  for (let k = 0; k < track.count; k += 5) {
    const c = track.curvature[k];
    if (Math.abs(c) < 1 / 70) continue;
    const s = -Math.sign(c); // outside of the bend
    const off = s * (track.wall + 0.25);
    chevBy[c > 0 ? 0 : 1].push([track.x[k] + track.leftX(k) * off, 1.15, track.z[k] + track.leftZ(k) * off, track.headingAt(k) + Math.PI]);
  }
  chevBy.forEach((list, i) => { if (list.length) group.add(instanced(chevGeo, chevMats[i], list)); });

  // Chain-link fence further out on both sides.
  const fenceTex = Tex.fence();
  const fenceMat = new THREE.MeshLambertMaterial({ map: fenceTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0x9a9e98 });
  group.add(new THREE.Mesh(merge([1, -1].map((s) => wallStrip(track, s * (track.wall + 4), 0, 2.4, 4, 2.5))), fenceMat));

  // Streetlights every ~40 m, alternating sides, arm over the road.
  const lamps = [];
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3e4244 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffc070 });
  const poleList = [], armList = [], headList = [];
  let flip = 1;
  for (let k = 10; k < track.count; k += 40) {
    flip = -flip;
    const lx = track.leftX(k), lz = track.leftZ(k);
    const off = flip * (hw + 1.6);
    const px = track.x[k] + lx * off, pz = track.z[k] + lz * off;
    const ry = Math.atan2(lz * flip, -lx * flip); // arm points over the road
    const ax = Math.cos(ry), az = -Math.sin(ry);   // the arm's direction in the world
    poleList.push([px, 3.75, pz, ry]);
    armList.push([px + ax * 1.15, 7.4, pz + az * 1.15, ry]);
    headList.push([px + ax * 2.2, 7.3, pz + az * 2.2, ry]);
    const hx = px + ax * 2.2, hz = pz + az * 2.2;
    glowPoints.push(hx, 7.1, hz);
    poolGeos.push(placed(new THREE.PlaneGeometry(17, 17), hx, 0.02, hz, 0, -Math.PI / 2));
    lamps.push(new THREE.Vector3(hx, 6.9, hz));
  }
  group.add(instanced(new THREE.CylinderGeometry(0.09, 0.12, 7.5, 6), poleMat, poleList));
  group.add(instanced(new THREE.BoxGeometry(2.4, 0.1, 0.1), poleMat, armList));
  group.add(instanced(new THREE.BoxGeometry(0.7, 0.16, 0.32), headMat, headList));

  // Start gantry over the line, with a lit board.
  {
    const k = def.start;
    const lx = track.leftX(k), lz = track.leftZ(k);
    const ry = track.headingAt(k);
    const gm = new THREE.MeshLambertMaterial({ color: 0x34383a });
    for (const s of [1, -1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.4, 0.3), gm);
      leg.position.set(track.x[k] + lx * s * (hw + 1.2), 3.2, track.z[k] + lz * s * (hw + 1.2));
      group.add(leg);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry((hw + 1.2) * 2, 0.5, 0.4), gm);
    beam.position.set(track.x[k], 6.2, track.z[k]);
    beam.rotation.y = ry; // a box's long side lies across the road at the road's heading
    group.add(beam);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.1), new THREE.MeshBasicMaterial({ map: Tex.sign('START', '#ff8b2b', '#120a04') }));
    board.position.set(track.x[k], 5.5, track.z[k]);
    board.rotation.y = ry + Math.PI; // faces the cars coming up to the line
    group.add(board);
  }

  // --- Beyond the fence ---
  const placedSpots = [];
  const clear = (x, z, rad) => {
    const near = track.nearest(x, z);
    if (Math.abs(near.offset) < track.wall + 6 + rad) return false;
    // Also keep clear of the road further along (the loop folds back on itself).
    for (let i = 0; i < track.count; i += 6) if (Math.hypot(track.x[i] - x, track.z[i] - z) < track.wall + 6 + rad) return false;
    for (const p of placedSpots) if (Math.hypot(p[0] - x, p[1] - z) < p[2] + rad + 2) return false;
    return true;
  };
  const along = (k, s, dist) => [track.x[k] + track.leftX(k) * s * dist, track.z[k] + track.leftZ(k) * s * dist];

  // Petrol station on the outside of the main straight: a canopy lit with
  // cold fluorescent tubes, pumps, a small shop and a tall price sign.
  {
    const k = 260;
    const [x, z] = along(k, -1, track.wall + 22);
    const ry = track.headingAt(k);
    placedSpots.push([x, z, 22]);
    const st = new THREE.Group();
    st.position.set(x, 0, z);
    st.rotation.y = ry;
    group.add(st);
    const steel = new THREE.MeshLambertMaterial({ color: 0x6c7270 });
    const white = new THREE.MeshLambertMaterial({ color: 0xc8ccc6 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(16, 0.7, 10), white);
    canopy.position.set(0, 5.2, 0);
    st.add(canopy);
    const tubes = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshBasicMaterial({ map: Tex.tubes(), color: 0xd8f0dc }));
    tubes.rotation.x = Math.PI / 2;
    tubes.position.set(0, 4.84, 0);
    st.add(tubes);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(16.05, 0.18, 10.05), new THREE.MeshBasicMaterial({ color: 0x1f6f7a }));
    stripe.position.set(0, 5.35, 0);
    st.add(stripe);
    for (const [px, pz] of [[-6, -3.5], [6, -3.5], [-6, 3.5], [6, 3.5]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5, 0.35), steel);
      post.position.set(px, 2.5, pz);
      st.add(post);
    }
    const pumpMat = new THREE.MeshLambertMaterial({ color: 0x8a2a20 });
    const screen = new THREE.MeshBasicMaterial({ color: 0x6a8a5a });
    for (const px of [-3, 3]) for (const pz of [-1.2, 1.2]) {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.7, 0.5), pumpMat);
      pump.position.set(px, 0.85, pz);
      st.add(pump);
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), screen);
      sc.position.set(px, 1.35, pz + (pz > 0 ? 0.26 : -0.26));
      if (pz < 0) sc.rotation.y = Math.PI;
      st.add(sc);
    }
    const island = new THREE.Mesh(new THREE.BoxGeometry(9, 0.2, 1.4), new THREE.MeshLambertMaterial({ map: Tex.concrete() }));
    island.position.set(0, 0.1, 0);
    st.add(island);
    // The shop behind, with a bright window and a vending machine.
    const shop = new THREE.Mesh(new THREE.BoxGeometry(12, 3.6, 6), new THREE.MeshLambertMaterial({ map: Tex.blocks() }));
    shop.position.set(0, 1.8, -11);
    st.add(shop);
    const shopWin = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.8), new THREE.MeshBasicMaterial({ map: Tex.shopWindow() }));
    shopWin.position.set(-1, 1.6, -7.98);
    st.add(shopWin);
    const vend = new THREE.Mesh(new THREE.BoxGeometry(1, 1.9, 0.8), new THREE.MeshBasicMaterial({ color: 0xd8dcd0 }));
    vend.position.set(4.8, 0.95, -7.5);
    st.add(vend);
    // Price sign on a tall post (no brand).
    const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), steel);
    signPost.position.set(9.5, 3.5, 4.5);
    st.add(signPost);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3, 0.4), new THREE.MeshBasicMaterial({ map: Tex.priceSign() }));
    sign.position.set(9.5, 7.5, 4.5);
    st.add(sign);
    st.updateMatrixWorld(true);
    // Cold light on the forecourt; a warm glow at the shop window.
    const at = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyMatrix4(st.matrixWorld);
    const c1 = at(0, 0);
    coolPoolGeos.push(placed(new THREE.PlaneGeometry(26, 20), c1.x, 0.03, c1.z, ry, -Math.PI / 2));
    const w1 = at(-1, -6.5);
    poolGeos.push(placed(new THREE.PlaneGeometry(9, 5), w1.x, 0.03, w1.z, ry, -Math.PI / 2));
    const sgn = at(9.5, 4.5);
    glowPoints.push(sgn.x, 7.5, sgn.z);
    // A forecourt slab.
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(30, 26), new THREE.MeshLambertMaterial({ map: Tex.concrete(), color: 0x6a6a66 }));
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(0, 0.015, -3);
    st.add(slab);
    lamps.push(new THREE.Vector3(c1.x, 4.6, c1.z)); // a real light under the canopy when close
  }

  // Container yard by the harbour, outside the long sweeper.
  const containers = [], containerCols = [];
  const contTints = [0x6a2a20, 0x2a4a5a, 0x5a5a4a, 0x7a5a2a, 0x3a5a3a, 0x8a8a84];
  for (let k = 520; k < 820; k += 14) {
    for (let row = 0; row < 3; row++) {
      if (r() < 0.25) continue;
      const [x, z] = along(k, -1, track.wall + 16 + row * 4);
      if (!clear(x, z, 4)) continue;
      const stack = 1 + ((r() * 3) | 0);
      for (let h = 0; h < stack; h++) {
        containers.push([x + (r() - 0.5) * 0.4, 1.3 + h * 2.6, z, track.headingAt(k) + (r() - 0.5) * 0.06]);
        containerCols.push(contTints[(r() * contTints.length) | 0]);
      }
    }
    placedSpots.push([...along(k, -1, track.wall + 20), 7]);
  }
  const contTex = Tex.container();
  group.add(instanced(new THREE.BoxGeometry(2.45, 2.6, 6.1), new THREE.MeshLambertMaterial({ map: contTex }), containers, containerCols));
  // Two tall yard floodlights over the containers.
  for (const k of [590, 750]) {
    const [x, z] = along(k, -1, track.wall + 9);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 14, 6), poleMat);
    mast.position.set(x, 7, z);
    group.add(mast);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.6), headMat);
    head.position.set(x, 14, z);
    head.rotation.y = track.headingAt(k);
    group.add(head);
    glowPoints.push(x, 13.8, z);
    const [px, pz] = along(k, -1, track.wall + 18);
    poolGeos.push(placed(new THREE.PlaneGeometry(26, 26), px, 0.03, pz, 0, -Math.PI / 2));
    lamps.push(new THREE.Vector3(x, 13.6, z));
  }

  // Warehouses, merged by look: about a dozen draw calls for all of them.
  const buildingTints = [[70, 78, 80], [84, 82, 72], [58, 66, 62], [92, 88, 80]];
  const buildings = [];
  const addBuilding = (x, z, w, d, h, rot) => {
    const rad = Math.hypot(w, d) / 2;
    if (!clear(x, z, rad)) return;
    placedSpots.push([x, z, rad]);
    buildings.push({ x, z, w, d, h, rot, tint: (r() * 4) | 0, lit: r() < 0.6, door: r() < 0.45 });
  };
  for (let k = 0; k < track.count; k += 22) {
    for (const s of [1, -1]) {
      if (r() < 0.25) continue;
      const w = 14 + r() * 26, d = 12 + r() * 18, h = 5 + r() * 9;
      const dist = track.wall + 10 + d / 2 + r() * 14;
      const [x, z] = along(k, s, dist);
      addBuilding(x, z, w, d, h, track.headingAt(k) + Math.PI / 2);
    }
  }
  // A big industrial block filling the middle of the loop.
  for (let i = 0; i < 40; i++) {
    const x = 60 + r() * 260, z = -200 + r() * 520;
    addBuilding(x, z, 20 + r() * 30, 16 + r() * 24, 7 + r() * 10, (r() < 0.5 ? 0 : Math.PI / 2) + 0.35);
  }
  const wallGeos = [[], [], [], []], roofGeos = [], doorGeos = [], winGeos = [[], [], []], lampGeos = [];
  for (const b of buildings) {
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
        poolGeos.push(placed(new THREE.PlaneGeometry(7, 5), ox + fx * 2.4, 0.03, oz + fz * 2.4, ang, -Math.PI / 2));
        glowPoints.push(ox + fx * 0.3, dh + 0.45, oz + fz * 0.3);
      }
    }
  }
  wallGeos.forEach((geos, i) => {
    if (!geos.length) return;
    const tex = Tex.cladding(buildingTints[i]);
    const mesh = new THREE.Mesh(merge(geos), new THREE.MeshLambertMaterial({ map: tex }));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  });
  if (roofGeos.length) group.add(new THREE.Mesh(merge(roofGeos), new THREE.MeshLambertMaterial({ color: 0x2a2e2e })));
  if (doorGeos.length) group.add(new THREE.Mesh(merge(doorGeos), new THREE.MeshLambertMaterial({ map: Tex.shutter(), color: 0xaab0aa })));
  winGeos.forEach((geos, i) => { if (geos.length) group.add(new THREE.Mesh(merge(geos), new THREE.MeshBasicMaterial({ map: Tex.windows(i + 1) }))); });
  if (lampGeos.length) group.add(new THREE.Mesh(merge(lampGeos), new THREE.MeshBasicMaterial({ color: 0xd8c890 })));

  // Wheelie bins and pallets by the buildings, cones along the verge.
  const bins = [], cones = [];
  for (const b of buildings) {
    if (r() < 0.5) continue;
    const ang = b.rot, fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang);
    for (let i = 0; i < 2 + r() * 3; i++) bins.push([b.x + fx * (b.d / 2 + 0.8) + sx * (b.w * 0.25 + i * 0.9), 0.55, b.z + fz * (b.d / 2 + 0.8) + sz * (b.w * 0.25 + i * 0.9), ang]);
  }
  for (let k = 0; k < track.count; k += 37) {
    if (r() < 0.5) continue;
    const s = r() < 0.5 ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      const [x, z] = along(track.wrap(k + i * 2), s, track.wall + 1.2); // behind the barrier
      cones.push([x, 0.32, z, r() * 6]);
    }
  }
  group.add(instanced(new THREE.BoxGeometry(0.7, 1.1, 0.7), new THREE.MeshLambertMaterial({ color: 0x2a3a2c }), bins));
  group.add(instanced(new THREE.ConeGeometry(0.2, 0.64, 6), new THREE.MeshLambertMaterial({ map: Tex.cone() }), cones));

  // Power lines on the outside of the back straight: poles and sagging wires.
  {
    const polesP = [], wire = [];
    let prev = null;
    for (let k = 1520; k < 1880; k += 30) {
      const [x, z] = along(k, -1, track.wall + 9);
      polesP.push([x, 5, z, track.headingAt(k)]);
      const tops = [-0.9, 0, 0.9].map((o) => [x + track.leftX(k) * o, 9.4, z + track.leftZ(k) * o]);
      if (prev) {
        for (let w = 0; w < 3; w++) {
          const a = prev[w], b = tops[w];
          for (let t = 0; t < 6; t++) {
            const t0 = t / 6, t1 = (t + 1) / 6;
            const sag = (u) => -Math.sin(u * Math.PI) * 0.9;
            wire.push(a[0] + (b[0] - a[0]) * t0, a[1] + sag(t0), a[2] + (b[2] - a[2]) * t0, a[0] + (b[0] - a[0]) * t1, a[1] + sag(t1), a[2] + (b[2] - a[2]) * t1);
          }
        }
      }
      prev = tops;
    }
    group.add(instanced(new THREE.CylinderGeometry(0.14, 0.18, 10, 6), new THREE.MeshLambertMaterial({ color: 0x3a3028 }), polesP));
    group.add(instanced(new THREE.BoxGeometry(2.2, 0.12, 0.12), new THREE.MeshLambertMaterial({ color: 0x3a3028 }), polesP.map(([x, , z, ry]) => [x, 9.3, z, ry + Math.PI / 2])));
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    group.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x1a1c1c })));
  }

  // Trees and bushes (instanced, low-poly), dark green.
  const treeSpots = [], bushSpots = [];
  for (let k = 0; k < track.count; k += 7) {
    for (const s of [1, -1]) {
      const dist = track.wall + 6 + r() * 30;
      const x = track.x[k] + track.leftX(k) * s * dist + (r() - 0.5) * 6;
      const z = track.z[k] + track.leftZ(k) * s * dist + (r() - 0.5) * 6;
      if (!clear(x, z, 2)) continue;
      if (r() < 0.45) { treeSpots.push([x, z, 0.8 + r() * 0.7]); placedSpots.push([x, z, 2]); }
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

  // Parked cars on the verge and at the petrol station, in muted colours,
  // baked into one set of meshes.
  const parkedColours = [0x40484e, 0x6a2620, 0x8c8a80, 0x23303a, 0x4a4436, 0x5a5e60];
  const parked = [];
  const park = (x, z, ry, n) => {
    const car = buildCar(n % 3 === 1 ? CHALLENJER_SRT8 : SKYLINER_R34, parkedColours[n % parkedColours.length], { simple: true });
    car.root.position.set(x, 0, z);
    car.root.rotation.y = ry;
    parked.push(car.root);
  };
  for (let n = 0, k = 140; n < 7; n++, k = (k + 260 + ((r() * 60) | 0)) % track.count) {
    if (Math.abs(track.curvature[k]) > 1 / 120) continue;
    const s = n % 2 ? 1 : -1;
    const [x, z] = along(k, s, track.wall + 2.2);
    park(x, z, track.headingAt(k) + (r() < 0.5 ? 0 : Math.PI), n);
  }
  {
    const k = 260, ry = track.headingAt(k);
    for (let i = 0; i < 3; i++) {
      const [x, z] = along(track.wrap(k + 14 + i * 3), -1, track.wall + 9);
      park(x, z, ry + Math.PI / 2, i + 2);
    }
  }
  group.add(bakeStatic(parked));

  // Light pools and halos, one draw call each.
  const poolMat = new THREE.MeshBasicMaterial({ map: Tex.lightPool(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 });
  if (poolGeos.length) group.add(new THREE.Mesh(merge(poolGeos), poolMat));
  const coolMat = new THREE.MeshBasicMaterial({ map: Tex.lightPool(), color: 0x9adcc0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 });
  if (coolPoolGeos.length) group.add(new THREE.Mesh(merge(coolPoolGeos), coolMat));
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPoints, 3));
  const glows = new THREE.Points(glowGeo, new THREE.PointsMaterial({ map: Tex.glow(), color: 0xffa850, size: 3.4, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glows.renderOrder = 2;
  group.add(glows);

  // Far away: a ring of city blocks with a few lit windows and a low amber
  // glow in the sky, so the horizon is not an empty black. It is a backdrop:
  // drawn first, behind everything, and moved with the camera (see
  // placeBackdrop) so it always sits just inside the view distance.
  const backdrop = new THREE.Group();
  {
    const bg = { fog: false, depthWrite: false, depthTest: false };
    const sky = new THREE.Mesh(new THREE.CylinderGeometry(900, 900, 260, 24, 1, true), new THREE.MeshBasicMaterial({ map: Tex.skyGlow(), side: THREE.BackSide, ...bg }));
    sky.position.y = 80;
    sky.renderOrder = -11;
    backdrop.add(sky);
    const blocks = [];
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + r() * 0.05;
      const d = 700 + r() * 120;
      const h = 20 + r() * 60;
      blocks.push(placed(new THREE.BoxGeometry(25 + r() * 40, h, 25 + r() * 30), Math.sin(a) * d, h / 2, Math.cos(a) * d, a));
    }
    const skyline = new THREE.Mesh(merge(blocks), new THREE.MeshBasicMaterial({ map: Tex.skyline(), ...bg }));
    skyline.renderOrder = -10;
    backdrop.add(skyline);
    backdrop.traverse((o) => { o.frustumCulled = false; });
  }

  // What the car's paint reflects: the lamp heads, the bright canopy, and
  // the amber glow of the city low in the sky.
  const reflect = new THREE.Group();
  {
    reflect.add(instanced(new THREE.BoxGeometry(1.4, 0.5, 0.8), new THREE.MeshBasicMaterial({ color: 0xffc070 }), headList));
    reflect.add(new THREE.Mesh(merge(lamps.map((L) => placed(new THREE.BoxGeometry(1.6, 0.4, 1.6), L.x, L.y + 0.4, L.z))), new THREE.MeshBasicMaterial({ color: 0xffd8a0 })));
    const sky = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 120, 16, 1, true), new THREE.MeshBasicMaterial({ map: Tex.skyGlow(), side: THREE.BackSide, fog: false }));
    sky.position.y = 40;
    sky.userData.follow = true; // kept centred on the car (see reflections.js)
    reflect.add(sky);
  }

  return {
    group, lamps, glows: [glows], roadMat, backdrop, reflect,
    look: {
      fog: { clear: 0x0b1012, rain: 0x0d1418, fog: 0x1a2226 },
      hemi: [0x3a4a58, 0x141810, 1.0],
      moon: 0.35,
      lamp: 0xffa04a, lampPower: 150,
      reflectBg: 0x0a0f12,
      ground: 0x101214,
    },
  };
}

// Keep the far backdrop centred on the camera and just inside its far plane.
export function placeBackdrop(backdrop, camera) {
  backdrop.position.set(camera.position.x, 0, camera.position.z);
  backdrop.scale.setScalar((camera.far * 0.85) / 900);
}
