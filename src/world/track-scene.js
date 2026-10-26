// Builds the 3D road and its surroundings from a TrackPath: tarmac, faded
// markings, kerbs, barriers, streetlights with pools of amber light, fences,
// warehouses, a container yard, a petrol station, power lines, trees, parked
// cars and a far-off city glow. Lamps are mostly fake (a glowing head and a
// light pool painted on the road); only the few nearest the car get a real
// light. Repeated things are instanced or merged into a few meshes, which
// keeps draw calls low enough for an iPad.

import * as THREE from 'three';
import { buildSky } from '../graphics/sky.js';
import { Tex } from '../graphics/textures.js';
import { rng, strip, merge, wallStrip, placed } from './scene-kit.js';
import { Placer, roofMat } from './assets.js';
import { buildUnderground } from './underground-scene.js';
import { buildParabolica } from './parabolica-scene.js';

export function buildTrackScene(track, def) {
  if (def.theme === 'underground') return buildUnderground(track, def);
  if (def.theme === 'parabolica') return buildParabolica(track, def);
  const group = new THREE.Group();
  const hw = track.halfWidth;
  const r = rng(42);
  const place = new Placer(); // every prop, from the asset library

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
  for (const s of [1, -1]) for (let k = 0; k < track.count; k += 4) place.add('rail-post', track.x[k] + track.leftX(k) * s * (track.wall + 0.1), 0, track.z[k] + track.leftZ(k) * s * (track.wall + 0.1));

  // Chevron boards on the outside of the tight corners, facing the traffic.
  for (let k = 0; k < track.count; k += 5) {
    const c = track.curvature[k];
    if (Math.abs(c) < 1 / 70) continue;
    const off = -Math.sign(c) * (track.wall + 0.25); // outside of the bend
    place.add(c > 0 ? 'chevron-left' : 'chevron-right', track.x[k] + track.leftX(k) * off, 0, track.z[k] + track.leftZ(k) * off, track.headingAt(k) + Math.PI);
  }

  // Chain-link fence further out on both sides.
  const fenceTex = Tex.fence();
  const fenceMat = new THREE.MeshLambertMaterial({ map: fenceTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0x9a9e98 });
  group.add(new THREE.Mesh(merge([1, -1].map((s) => wallStrip(track, s * (track.wall + 4), 0, 2.4, 4, 2.5))), fenceMat));

  // Streetlights every ~40 m, alternating sides, arm over the road.
  let flip = 1;
  for (let k = 10; k < track.count; k += 40) {
    flip = -flip;
    const lx = track.leftX(k), lz = track.leftZ(k);
    const off = flip * (hw + 1.6);
    place.add('streetlight', track.x[k] + lx * off, 0, track.z[k] + lz * off, Math.atan2(lz * flip, -lx * flip)); // arm points over the road
  }

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

  // Petrol station on the outside of the main straight.
  {
    const k = 260;
    const [x, z] = along(k, -1, track.wall + 22);
    placedSpots.push([x, z, 22]);
    place.add('petrol-station', x, 0, z, track.headingAt(k));
  }

  // Container yard by the harbour, outside the long sweeper.
  const contTints = [0x6a2a20, 0x2a4a5a, 0x5a5a4a, 0x7a5a2a, 0x3a5a3a, 0x8a8a84];
  for (let k = 520; k < 820; k += 14) {
    for (let row = 0; row < 3; row++) {
      if (r() < 0.25) continue;
      const [x, z] = along(k, -1, track.wall + 16 + row * 4);
      if (!clear(x, z, 4)) continue;
      const stack = 1 + ((r() * 3) | 0);
      for (let h = 0; h < stack; h++) {
        const jx = (r() - 0.5) * 0.4, ry = track.headingAt(k) + (r() - 0.5) * 0.06;
        place.add('container', x + jx, h * 2.6, z, ry, 1, contTints[(r() * contTints.length) | 0]);
      }
    }
    placedSpots.push([...along(k, -1, track.wall + 20), 7]);
  }
  // Two tall yard floodlights over the containers.
  for (const k of [590, 750]) {
    const [x, z] = along(k, -1, track.wall + 9);
    place.add('floodlight', x, 0, z, track.headingAt(k));
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
  for (const b of buildings) place.block('warehouse', b);

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
  for (const b of bins) place.add('bin', b[0], 0, b[2], b[3]);
  for (const c of cones) place.add('cone', c[0], 0, c[2], c[3]);

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
    for (const [x, , z, ry] of polesP) place.add('power-pole', x, 0, z, ry);
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
  for (const [x, z, s] of treeSpots) place.add('tree', x, 0, z, r() * 6, [s, s * (0.9 + r() * 0.2), s]);
  for (const [x, z, s] of bushSpots) place.add('bush', x, 0, z, r() * 6, [s * 1.3, s * 0.8, s * 1.3]);

  // Parked cars on the verge and at the petrol station, in muted colours.
  const parkedColours = [0x40484e, 0x6a2620, 0x8c8a80, 0x23303a, 0x4a4436, 0x5a5e60];
  const park = (x, z, ry, n) => place.add(n % 3 === 1 ? 'parked-challenjer' : 'parked-r34', x, 0, z, ry, 1, parkedColours[n % parkedColours.length]);
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

  // Build every placed prop, its light pools and halos.
  const { glows, reflect, lamps } = place.finish(group);

  const skies = []; // sky materials, repainted for the time of day
  const backdrop = cityBackdrop(r, skies);

  // What the car's paint reflects: the lamp heads, the bright canopy (from
  // the assets), and the amber glow of the city low in the sky.
  reflect.add(reflectSky(skies));

  return {
    group, lamps, glows, roadMat, backdrop, reflect, skies,
    snowy: [[ground.material, 0xb8c0c8], [vergeMat, 0xc8ccd0], [roofMat(), 0xc4cad0]],
    look: {
      fog: { clear: 0x0b1012, rain: 0x0d1418, fog: 0x1a2226, snow: 0x161c22 },
      hemi: [0x3a4a58, 0x141810, 1.0],
      moon: 0.35,
      lamp: 0xffa04a, lampPower: 150,
      skyGlow: 0xa86a30, // the harbour's amber, low in the sky
      reflectBg: 0x0a0f12,
      ground: 0x101214,
    },
  };
}

// Far away: the sky dome (graphics/sky.js) and a ring of city blocks with
// lit windows, so the horizon is never an empty black. It is a backdrop:
// drawn first, behind everything, and moved with the camera (see
// placeBackdrop) so it always sits just inside the view distance. The sky is
// repainted for the time and weather through backdrop.userData.sky.
export function cityBackdrop(r, skies, { count = 70, minH = 20, maxH = 80, windows = Tex.skyline() } = {}) {
  const backdrop = new THREE.Group();
  const bg = { fog: false, depthWrite: false, depthTest: false };
  const sky = buildSky();
  backdrop.add(sky.mesh);
  backdrop.userData.sky = sky;
  const blocks = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.05;
    const d = 700 + r() * 120;
    const h = minH + r() * (maxH - minH);
    blocks.push(placed(new THREE.BoxGeometry(25 + r() * 40, h, 25 + r() * 30), Math.sin(a) * d, h / 2, Math.cos(a) * d, a));
  }
  const skyline = new THREE.Mesh(merge(blocks), new THREE.MeshBasicMaterial({ map: windows, ...bg }));
  skyline.renderOrder = -10;
  backdrop.add(skyline);
  backdrop.traverse((o) => { o.frustumCulled = false; });
  return backdrop;
}

// The sky the car's paint reflects, kept centred on the car.
export function reflectSky(skies) {
  const sky = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 120, 16, 1, true), new THREE.MeshBasicMaterial({ map: Tex.skyGlow(), side: THREE.BackSide, fog: false }));
  skies.push(sky.material);
  sky.position.y = 40;
  sky.userData.follow = true; // kept centred on the car (see reflections.js)
  return sky;
}

// Keep the far backdrop centred on the camera and just inside its far plane.
export function placeBackdrop(backdrop, camera) {
  backdrop.position.set(camera.position.x, 0, camera.position.z);
  backdrop.scale.setScalar((camera.far * 0.85) / 900);
}
