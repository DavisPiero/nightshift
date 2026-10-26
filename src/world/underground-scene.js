// Builds the Underground track: a Tokyo-style expressway tunnel. Three lanes
// of dark tarmac with Japanese road markings, raised walkways, tiled walls
// with a teal foot, a round concrete ceiling, two endless rows of turquoise
// lights, jet fans, red hydrant lamps, green exit signs, blue direction
// boards and an amber message board. Closed in, so there is no sky.
// Like the harbour, only the nearest few lights are real; the rest of the
// light is painted on (washes on the road and walls).

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';
import { merge, placed, instanced, strip } from './scene-kit.js';
import { Placer } from './assets.js';

const TEAL = 0x4ff0e0;     // the tunnel lights
const ROOF_Y = 7.4;        // ceiling height at the centre
const SPRING_Y = 4.2;      // where the walls start to curve over

// A band following the track between two points of the cross-section
// ([offset from centre, height]), facing into the tunnel. u runs 0..1 from
// A to B (or uA..uB); v runs along the track.
function ribbon(track, A, B, { step = 2, uA = 0, uB = 1, vScale = 0.25 } = {}) {
  const pos = [], uv = [], idx = [];
  let n = 0;
  for (let k = 0; k <= track.count; k += step) {
    const i = track.wrap(k);
    const lx = track.leftX(i), lz = track.leftZ(i);
    pos.push(track.x[i] + lx * A[0], A[1], track.z[i] + lz * A[0]);
    pos.push(track.x[i] + lx * B[0], B[1], track.z[i] + lz * B[0]);
    uv.push(uA, k * vScale, uB, k * vScale);
    n++;
  }
  // Pick the winding that faces the middle of the tunnel.
  const p = (j) => new THREE.Vector3(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
  const a = p(0), b = p(1), c = p(2);
  const normal = new THREE.Vector3().crossVectors(c.clone().sub(a), b.clone().sub(a)); // as the unflipped winding below
  const mid = new THREE.Vector3(track.x[0], 3.5, track.z[0]);
  const flip = normal.dot(mid.sub(a.clone().add(b).multiplyScalar(0.5))) < 0;
  for (let s = 1; s < n; s++) {
    const a0 = (s - 1) * 2, b0 = s * 2;
    if (flip) idx.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0);
    else idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A point on the ceiling arch, from angle t (0 = left spring line, PI = right).
function arch(W, t) { return [W * Math.cos(t), SPRING_Y + (ROOF_Y - SPRING_Y) * Math.sin(t)]; }

export function buildUnderground(track, def) {
  const group = new THREE.Group();
  const hw = track.halfWidth, W = track.wall;
  const place = new Placer(); // props from the asset library
  const lamps = [];
  const at = (k, off, y = 0) => new THREE.Vector3(track.x[k] + track.leftX(k) * off, y, track.z[k] + track.leftZ(k) * off);
  const reflect = new THREE.Group(); // bright things the car's paint reflects

  // Tarmac, with a cold sheen so the lights catch it.
  const roadMat = new THREE.MeshPhongMaterial({ map: Tex.asphalt(), color: 0x9aa4aa, shininess: 0, specular: 0x000000 });
  const road = new THREE.Mesh(strip(track, -hw - 0.5, hw + 0.5, 0, { step: 1, uScale: 0.25, vScale: 0.25 }), roadMat);
  road.receiveShadow = true;
  group.add(road);

  // Walkways: a raised concrete ledge each side, up to the wall.
  const concMat = new THREE.MeshLambertMaterial({ map: Tex.concrete(), color: 0x7a8486 });
  const walk = [];
  for (const s of [1, -1]) {
    walk.push(ribbon(track, [s * (hw + 0.5), 0], [s * (hw + 0.5), 0.2], { vScale: 0.3, uB: 0.1 }));
    walk.push(ribbon(track, [s * (hw + 0.5), 0.2], [s * W, 0.2], { vScale: 0.3, uB: 0.4 }));
  }
  group.add(new THREE.Mesh(merge(walk), concMat));

  // Walls (tiles) and the arched ceiling (concrete rings).
  const wallMat = new THREE.MeshLambertMaterial({ map: Tex.tunnelWall() });
  group.add(new THREE.Mesh(merge([1, -1].map((s) => ribbon(track, [s * W, 0.2], [s * W, SPRING_Y], { vScale: 0.25, uB: 1 }))), wallMat));
  const roofMat = new THREE.MeshLambertMaterial({ map: Tex.tunnelRoof(), color: 0x9aa2a2 });
  const roof = [];
  const N = 12;
  for (let j = 0; j < N; j++) {
    const t0 = (j / N) * Math.PI, t1 = ((j + 1) / N) * Math.PI;
    roof.push(ribbon(track, arch(W, t0), arch(W, t1), { step: 3, uA: j * 0.5, uB: (j + 1) * 0.5, vScale: 1 / 3 }));
  }
  group.add(new THREE.Mesh(merge(roof), roofMat));

  // Cable trays along the top of each wall.
  const trayMat = new THREE.MeshLambertMaterial({ color: 0x2a3234 });
  group.add(new THREE.Mesh(merge([1, -1].flatMap((s) => [
    ribbon(track, [s * (W - 0.35), 3.7], [s * W, 3.7], { step: 3 }),
    ribbon(track, [s * (W - 0.35), 3.55], [s * (W - 0.35), 3.7], { step: 3 }),
  ])), trayMat));

  // --- Lights ---
  // Two rows of fixtures up on the arch, nearly continuous.
  const fixGeo = new THREE.BoxGeometry(0.28, 0.12, 2.0);
  const fixMat = new THREE.MeshBasicMaterial({ color: TEAL });
  const fixList = [];
  const [fixOff, fixY] = arch(W, 0.33);
  for (let k = 0; k < track.count; k += 2.5) {
    const i = Math.floor(k);
    for (const s of [1, -1]) {
      const p = at(i, s * (fixOff - 0.1), fixY);
      fixList.push([p.x, p.y, p.z, track.headingAt(i)]);
    }
  }
  const fixtures = instanced(fixGeo, fixMat, fixList);
  group.add(fixtures);
  // For the reflections, a lighter copy: one long bar per three fixtures.
  reflect.add(instanced(new THREE.BoxGeometry(0.4, 0.2, 6.5), new THREE.MeshBasicMaterial({ color: 0x9ffff6 }), fixList.filter((f, i) => i % 6 < 2)));

  // Painted light: a wash down each wall under the fixtures, and along each
  // side of the road.
  const washMat = new THREE.MeshBasicMaterial({ map: Tex.wash(), color: TEAL, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 });
  const washes = [];
  for (const s of [1, -1]) washes.push(ribbon(track, [s * (W - 0.02), SPRING_Y - 0.1], [s * (W - 0.02), 0.6], { step: 2, vScale: 1 }));
  group.add(new THREE.Mesh(merge(washes), washMat));
  const floorWash = new THREE.MeshBasicMaterial({ map: Tex.wash(), color: 0x2fa8a0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3 });
  const floor = [];
  for (const s of [1, -1]) {
    floor.push(ribbon(track, [s * (W - 0.05), 0.21], [s * (hw + 0.5), 0.21], { step: 2, vScale: 1 }));
    floor.push(ribbon(track, [s * (hw + 0.5), 0.015], [s * (hw - 3.5), 0.015], { step: 2, vScale: 1, uA: 0.35 }));
  }
  group.add(new THREE.Mesh(merge(floor), floorWash));

  // Real lights for the nearest few, alternating sides.
  let side = 1;
  for (let k = 0; k < track.count; k += 22) {
    side = -side;
    lamps.push(at(k, side * fixOff * 0.85, fixY - 0.4));
  }

  // --- Paint on the road ---
  const paintMat = new THREE.MeshLambertMaterial({ color: 0xe8ece6, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const lines = [];
  for (const s of [1, -1]) lines.push(strip(track, s * (hw - 0.35), s * (hw - 0.2), 0.012, { step: 2 }));
  const laneW = (hw * 2) / 3;
  for (const off of [-laneW / 2, laneW / 2]) {
    for (let k = 0; k < track.count; k += 15) lines.push(strip(track, off - 0.08, off + 0.08, 0.012, { step: 1, from: k, to: k + 6, closed: false }));
  }
  group.add(new THREE.Mesh(merge(lines), paintMat));
  // Yellow no-overtaking line along the inside of the junction loop? Kept
  // simple: a solid yellow strip just inside each edge line.
  const yellowMat = new THREE.MeshLambertMaterial({ color: 0xd8a420, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  group.add(new THREE.Mesh(merge([1, -1].map((s) => strip(track, s * (hw - 0.6), s * (hw - 0.5), 0.012, { step: 2 }))), yellowMat));

  // Before each hard corner: "速度落せ" (slow down) in every lane, then
  // red and white slow bars.
  const wordGeo = new THREE.PlaneGeometry(2.2, 7.2);
  const wordMat = new THREE.MeshLambertMaterial({ map: Tex.roadWords('速度落せ'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const barMat = new THREE.MeshLambertMaterial({ map: Tex.slowBars(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const words = [], bars = [];
  let calm = 0;
  for (let k = 0; k < track.count; k++) {
    const hard = Math.abs(track.curvature[k]) > 1 / 55;
    if (hard && calm > 80) {
      const kw = track.wrap(k - 85);
      for (const lane of [-1, 0, 1]) {
        const p = at(kw, lane * laneW);
        words.push(placed(wordGeo.clone(), p.x, 0.014, p.z, track.headingAt(kw) + Math.PI, -Math.PI / 2));
      }
      for (let b = 0; b < 6; b++) {
        const kb = track.wrap(k - 60 + b * 5);
        bars.push(strip(track, -hw + 0.6, hw - 0.6, 0.013, { step: 1, from: kb, to: kb + 2, closed: false, uScale: 0.5 }));
      }
    }
    calm = hard ? 0 : calm + 1;
  }
  if (words.length) group.add(new THREE.Mesh(merge(words), wordMat));
  if (bars.length) group.add(new THREE.Mesh(merge(bars), barMat));

  // Start line and an overhead message board saying where it is.
  const startMat = new THREE.MeshLambertMaterial({ map: Tex.chequer(), transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  group.add(new THREE.Mesh(strip(track, -hw, hw, 0.013, { step: 1, from: def.start - 1, to: def.start + 1, closed: false, uScale: 0.5, vScale: 0.5 }), startMat));

  // --- Hanging and wall-mounted things ---
  const steel = new THREE.MeshLambertMaterial({ color: 0x3a4244 });
  // Overhead boards: a frame hung from the roof, a board facing the traffic.
  const board = (k, off, w, h, map, y = 5.4) => {
    const p = at(k, off, y);
    const ry = track.headingAt(k) + Math.PI;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, color: 0xb8c4c8 }));
    b.position.copy(p); b.rotation.y = ry;
    group.add(b);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.12), steel);
    back.position.copy(p); back.rotation.y = ry; back.translateZ(-0.08);
    group.add(back);
    for (const sx of [-w / 3, w / 3]) {
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.08, ROOF_Y - y, 0.08), steel);
      rod.position.copy(p); rod.rotation.y = ry; rod.translateX(sx); rod.position.y = y + (ROOF_Y - y) / 2 + h / 4;
      group.add(rod);
    }
    return b;
  };
  board(def.start + 8, 0, 6.4, 1.2, Tex.ledBoard('スタート  START', 128, 24), 5.9);
  // Direction boards before the chicane and the junction loop.
  const signAt = [
    [980, Tex.roadSign([['新宿  中央環状', 15], ['SHINJUKU', 11], ['↑ C2', 12]], '#1d4f9a')],
    [1450, Tex.roadSign([['出口  EXIT', 16], ['渋谷  SHIBUYA', 12], ['500m', 11]], '#16774a')],
    [2150, Tex.roadSign([['湾岸線  WANGAN', 14], ['羽田  HANEDA', 12], ['↑', 12]], '#1d4f9a')],
  ];
  for (const [k, map] of signAt) if (k < track.count) board(k, -laneW * 0.5, 4.6, 1.7, map);
  board(Math.min(track.count - 1, 1800), 0, 4.8, 0.9, Tex.ledBoard('速度注意  事故多発'), 5.8);

  // Jet fans in pairs under the crown of the roof.
  for (let k = 120; k < track.count; k += 170) {
    for (const s of [1, -1]) {
      const p = at(k, s * 2.4, ROOF_Y - 1.0);
      place.add('jet-fan', p.x, p.y, p.z, track.headingAt(k));
    }
  }

  // Red fire-hydrant lamps on the left wall every 50 m, green exit signs on
  // the right wall every 200 m.
  for (let k = 25; k < track.count; k += 50) {
    const p = at(k, W - 0.08);
    place.add('hydrant-lamp', p.x, 0, p.z, track.headingAt(k));
  }
  for (let k = 110; k < track.count; k += 200) {
    const p = at(k, -(W - 0.04));
    place.add('exit-sign', p.x, 0, p.z, track.headingAt(k));
  }

  // Small halos round the red and green lamps; the lamps' bright bits join
  // the reflections.
  const built = place.finish(group, { glowSize: 1.4 });
  reflect.add(...built.reflect.children);

  return {
    group, lamps, glows: built.glows, roadMat,
    backdrop: new THREE.Group(), // nothing to see beyond the walls
    reflect,
    look: {
      fog: { clear: 0x04181a, fog: 0x0f2e30, rain: 0x04181a },
      hemi: [0x2f7a7c, 0x061010, 1.0],
      moon: 0,
      lamp: TEAL, lampPower: 110,
      reflectBg: 0x082224,
      ground: 0x0a1416,
    },
  };
}
