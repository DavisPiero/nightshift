// The garage: a lock-up workshop where the car sits on a turntable. Concrete
// block walls, a green epoxy floor, a half-open roller shutter, a workbench,
// a red tool chest, tyres, boxes and an old monitor (after David's
// garage.jpg), lit by two big light panels over the car, a turquoise tube
// along the back wall and a pink 夜勤 ("night shift") neon sign. Steel roof
// beams, yellow safety lines, a second bench with a vice, tools and a lamp,
// tools hung on the pegboard, an engine hoist, a tool cart, a jack and a
// creeper; a desk fan turns and one tube flickers now and then (update()).
// It is its own scene: the car is moved into it for the Garage and car-pick
// screens.

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';

const W = 10.5, D = 11, H = 3.8; // inside size: width (x), depth (z), height

export function buildGarage() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020405);
  scene.fog = new THREE.Fog(0x020405, 14, 40);
  const group = new THREE.Group();
  scene.add(group);
  const add = (geo, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // Floor: green epoxy, a little glossy so the lights and car show in it.
  const floorMat = new THREE.MeshStandardMaterial({ map: Tex.epoxy(), color: 0x7a9a86, roughness: 0.32, metalness: 0.0, envMapIntensity: 0.6 });
  const floor = add(new THREE.PlaneGeometry(W, D + 6), floorMat, 0, 0, 3);
  floor.rotation.x = -Math.PI / 2;
  // Apron outside the door: plain concrete.
  const apron = add(new THREE.PlaneGeometry(W + 8, 8), new THREE.MeshLambertMaterial({ map: Tex.concrete(), color: 0x5a5e5a }), 0, -0.005, D / 2 + 4);
  apron.rotation.x = -Math.PI / 2;

  // Walls: block work, cork board on the left, pegboard on the right.
  const blockMat = new THREE.MeshLambertMaterial({ map: Tex.blocks(), color: 0x8a9290 });
  const wall = (w, h, x, y, z, ry) => {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 3, uv.getY(i) * h / 3);
    return add(g, blockMat, x, y, z, ry);
  };
  wall(W, H, 0, H / 2, -D / 2, 0);               // back
  wall(D, H, -W / 2, H / 2, 0, Math.PI / 2);     // left
  wall(D, H, W / 2, H / 2, 0, -Math.PI / 2);     // right
  const ceil = add(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ color: 0x1a1e1e }), 0, H, 0);
  ceil.rotation.x = Math.PI / 2;
  // Front wall above the door, and the roller shutter, half up.
  const front = new THREE.MeshLambertMaterial({ map: Tex.blocks(), color: 0x4a5250, side: THREE.DoubleSide });
  add(new THREE.PlaneGeometry(W, 0.9), front, 0, H - 0.45, D / 2, Math.PI);
  const shutter = add(new THREE.PlaneGeometry(W - 0.6, 1.2), new THREE.MeshLambertMaterial({ map: Tex.shutter(), color: 0x6a7876, side: THREE.DoubleSide }), 0, H - 1.5, D / 2 - 0.05, Math.PI);
  shutter.material.map = Tex.shutter();
  add(new THREE.BoxGeometry(W - 0.4, 0.12, 0.18), new THREE.MeshLambertMaterial({ color: 0x2a3030 }), 0, H - 2.1, D / 2 - 0.05);
  for (const s of [1, -1]) add(new THREE.BoxGeometry(0.3, H, 0.4), new THREE.MeshLambertMaterial({ color: 0x3a4040 }), s * (W / 2 - 0.15), H / 2, D / 2);

  // Cork board with papers on the left wall; pegboard with tools on the right.
  const cork = add(new THREE.PlaneGeometry(3.2, 1.2), new THREE.MeshLambertMaterial({ map: Tex.cork() }), -W / 2 + 0.02, 2.1, -1.2, Math.PI / 2);
  cork.receiveShadow = false;
  add(new THREE.PlaneGeometry(3.4, 1.4), new THREE.MeshLambertMaterial({ map: Tex.pegboard() }), W / 2 - 0.02, 2.0, -1.6, -Math.PI / 2);

  // Workbench and shelf along the back wall, with a glowing old monitor.
  const wood = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a4042, roughness: 0.6, metalness: 0.5 });
  add(new THREE.BoxGeometry(3.0, 0.08, 0.8), wood, -2.2, 0.95, -D / 2 + 0.45);
  for (const x of [-3.6, -0.8]) for (const z of [-D / 2 + 0.15, -D / 2 + 0.75]) add(new THREE.BoxGeometry(0.06, 0.95, 0.06), steel, x, 0.47, z);
  add(new THREE.BoxGeometry(3.0, 0.05, 0.4), wood, -2.2, 1.9, -D / 2 + 0.22);
  add(new THREE.BoxGeometry(0.55, 0.45, 0.5), new THREE.MeshLambertMaterial({ color: 0x2a2c2a }), -1.4, 1.22, -D / 2 + 0.45);
  const crt = add(new THREE.PlaneGeometry(0.42, 0.32), new THREE.MeshBasicMaterial({ map: Tex.crt() }), -1.4, 1.24, -D / 2 + 0.71);
  crt.castShadow = false;
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.2 + (i % 2) * 0.1, 0.22, 0.2), new THREE.MeshLambertMaterial({ color: [0x3a5a8a, 0xa83a2a, 0x2a2a2a, 0xc8a040, 0x5a5a5a][i] }), -3.4 + i * 0.5, 2.03, -D / 2 + 0.22);

  // Red tool chest on the right, tyres stacked in the corner, boxes, a drum.
  const red = new THREE.MeshStandardMaterial({ color: 0x9a1a14, roughness: 0.45, metalness: 0.3 });
  add(new THREE.BoxGeometry(0.7, 1.1, 1.4), red, W / 2 - 0.45, 0.55, 1.6);
  add(new THREE.BoxGeometry(0.65, 0.5, 1.2), red, W / 2 - 0.45, 1.36, 1.6);
  for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.02, 0.03, 0.5), new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 1, roughness: 0.3 }), W / 2 - 0.81, 0.2 + i * 0.18, 1.6);
  const tyre = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14);
  const rubber = new THREE.MeshLambertMaterial({ color: 0x121314 });
  for (let i = 0; i < 4; i++) add(tyre, rubber, W / 2 - 0.6, 0.12 + i * 0.25, -D / 2 + 0.7, i * 0.4);
  for (let i = 0; i < 3; i++) add(tyre, rubber, W / 2 - 1.35, 0.12 + i * 0.25, -D / 2 + 0.6, i * 0.3);
  const card = new THREE.MeshLambertMaterial({ color: 0x9a7448 });
  add(new THREE.BoxGeometry(0.6, 0.45, 0.5), card, -W / 2 + 0.6, 0.23, 3.1, 0.3);
  add(new THREE.BoxGeometry(0.45, 0.35, 0.4), card, -W / 2 + 0.55, 0.62, 3.05, -0.2);
  add(new THREE.BoxGeometry(0.5, 0.4, 0.5), card, W / 2 - 0.7, 0.2, 3.4, 0.6);
  add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12), new THREE.MeshLambertMaterial({ color: 0x1f4a6a }), -W / 2 + 0.5, 0.45, -2.5);
  add(new THREE.ConeGeometry(0.18, 0.5, 8), new THREE.MeshLambertMaterial({ map: Tex.cone() }), -3.6, 0.25, 3.9);

  // --- Workshop: structure, a working bench, tools, lifting gear ---
  const yellow = new THREE.MeshLambertMaterial({ color: 0xc8a020 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x2a2e30, roughness: 0.55, metalness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 1, roughness: 0.25 });
  const black = new THREE.MeshLambertMaterial({ color: 0x141516 });
  // Roof beams (I-sections) across the room, with conduit along the walls.
  for (const z of [-3.6, 0, 3.6]) {
    add(new THREE.BoxGeometry(W, 0.06, 0.22), darkSteel, 0, H - 0.08, z);
    add(new THREE.BoxGeometry(W, 0.3, 0.04), darkSteel, 0, H - 0.25, z);
    add(new THREE.BoxGeometry(W, 0.06, 0.22), darkSteel, 0, H - 0.42, z);
  }
  for (const s of [1, -1]) add(new THREE.CylinderGeometry(0.03, 0.03, D - 0.6, 6).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x5a6060 }), s * (W / 2 - 0.08), H - 0.6, 0);
  // Yellow safety lines round the turntable and the work bay.
  const line = (w, d, x, z) => { const m = add(new THREE.PlaneGeometry(w, d), yellow, x, 0.004, z); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; };
  line(7.4, 0.08, 0, -3.7); line(7.4, 0.08, 0, 3.7); line(0.08, 7.4, -3.7, 0); line(0.08, 7.4, 3.7, 0);
  for (let i = 0; i < 6; i++) { const m = add(new THREE.PlaneGeometry(0.5, 0.08), yellow, -W / 2 + 0.6 + i * 0.25, 0.005, 4.6); m.rotation.set(-Math.PI / 2, 0, 0.8); }

  // A second bench on the left wall: a steel top, a vice, tools laid out,
  // a toolbox and a lamp on an arm with a warm light.
  const benchZ = 1.0, bx = -W / 2 + 0.45;
  add(new THREE.BoxGeometry(0.8, 0.06, 2.6), darkSteel, bx, 0.95, benchZ);
  add(new THREE.BoxGeometry(0.76, 0.6, 2.5), new THREE.MeshLambertMaterial({ color: 0x3a4a5a }), bx, 0.6, benchZ);
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.02, 0.025, 0.5), chrome, bx + 0.39, 0.82 - i * 0.18, benchZ - 0.6 + (i % 2) * 1.2);
  add(new THREE.BoxGeometry(0.22, 0.14, 0.18), new THREE.MeshLambertMaterial({ color: 0x2a4a7a }), bx + 0.1, 1.06, benchZ + 0.9); // vice
  add(new THREE.BoxGeometry(0.04, 0.12, 0.25), chrome, bx + 0.22, 1.1, benchZ + 0.9);
  for (let i = 0; i < 5; i++) { // spanners
    const w = add(new THREE.BoxGeometry(0.03, 0.012, 0.18 + i * 0.03), chrome, bx + 0.15 + i * 0.05, 0.985, benchZ - 0.2);
    w.rotation.y = 0.15;
  }
  for (const [c, z] of [[0xc82a1a, 0.15], [0xe8b020, 0.3], [0x1a5aa8, 0.45]]) { // screwdrivers
    const h = add(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 6).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: c }), bx + 0.05, 0.995, benchZ + z);
    const sh = add(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 4).rotateZ(Math.PI / 2), chrome, bx + 0.16, 0.995, benchZ + z);
    h.castShadow = sh.castShadow = false;
  }
  add(new THREE.BoxGeometry(0.4, 0.22, 0.25), new THREE.MeshStandardMaterial({ color: 0xb01a14, roughness: 0.5, metalness: 0.3 }), bx + 0.05, 1.09, benchZ - 0.85);
  add(new THREE.CylinderGeometry(0.06, 0.07, 0.18, 8), new THREE.MeshLambertMaterial({ color: 0xe8e2d0 }), bx + 0.2, 1.07, benchZ + 0.35); // mug
  const arm = add(new THREE.BoxGeometry(0.03, 0.03, 0.7), darkSteel, bx - 0.15, 1.6, benchZ + 0.2);
  arm.rotation.x = -0.6;
  add(new THREE.BoxGeometry(0.03, 0.6, 0.03), darkSteel, bx - 0.3, 1.25, benchZ - 0.05);
  const shade = add(new THREE.ConeGeometry(0.13, 0.16, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0x2a5a4a, side: THREE.DoubleSide }), bx - 0.05, 1.78, benchZ + 0.45);
  shade.castShadow = false;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0a0 }));
  bulb.position.set(bx - 0.05, 1.71, benchZ + 0.45);
  group.add(bulb);
  const benchLamp = new THREE.PointLight(0xffc880, 2.2, 3.2, 1.5);
  benchLamp.position.set(bx + 0.05, 1.6, benchZ + 0.45);
  scene.add(benchLamp);
  // A desk fan on the bench that turns.
  const fan = new THREE.Group();
  fan.position.set(bx + 0.1, 1.15, benchZ + 1.15);
  fan.rotation.y = Math.PI / 2 + 0.4;
  group.add(fan);
  fan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.03, 10), black));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), black); stem.position.y = 0.1; fan.add(stem);
  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 4, 18), chrome); cage.position.set(0, 0.24, 0.04); fan.add(cage);
  const blades = new THREE.Group(); blades.position.set(0, 0.24, 0.045); fan.add(blades);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.005), new THREE.MeshLambertMaterial({ color: 0x8aa8a0 })); b.position.y = 0.055; const g = new THREE.Group(); g.rotation.z = i * 2.094; g.add(b); blades.add(g); }

  // Tools hung on the pegboard on the right wall.
  const peg = W / 2 - 0.05;
  for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(0.02, 0.2 + i * 0.03, 0.035), chrome, peg, 2.15 - i * 0.015, -2.9 + i * 0.16);
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.03, 0.22, 0.06), new THREE.MeshLambertMaterial({ color: [0xc82a1a, 0xe8b020, 0x1a5aa8, 0x2a2a2a][i] }), peg, 1.6, -1.2 + i * 0.22);
  add(new THREE.TorusGeometry(0.22, 0.03, 6, 14).rotateY(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }), peg, 2.1, -0.6); // a hose coil

  // An engine hoist in the back corner: legs, a post, a boom and a hook.
  {
    const hx = -W / 2 + 1.3, hz = -D / 2 + 1.6;
    for (const s of [1, -1]) { const leg = add(new THREE.BoxGeometry(0.08, 0.08, 1.4), new THREE.MeshLambertMaterial({ color: 0xb02a1a }), hx + s * 0.35, 0.08, hz + 0.5); leg.rotation.y = s * 0.2; }
    add(new THREE.BoxGeometry(0.1, 1.9, 0.1), new THREE.MeshLambertMaterial({ color: 0xb02a1a }), hx, 0.95, hz);
    const boom = add(new THREE.BoxGeometry(0.09, 0.09, 1.5), new THREE.MeshLambertMaterial({ color: 0xb02a1a }), hx, 1.95, hz + 0.6);
    boom.rotation.x = -0.25;
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 4), chrome, hx, 1.95, hz + 1.3);
    add(new THREE.TorusGeometry(0.05, 0.012, 4, 8), chrome, hx, 1.62, hz + 1.3);
  }
  // A rolling tool cart, a trolley jack and a creeper on the floor.
  add(new THREE.BoxGeometry(0.8, 0.04, 0.5), red, 3.6, 0.85, -2.6);
  add(new THREE.BoxGeometry(0.8, 0.04, 0.5), red, 3.6, 0.45, -2.6);
  for (const x of [-0.37, 0.37]) for (const z of [-0.22, 0.22]) add(new THREE.BoxGeometry(0.03, 0.8, 0.03), darkSteel, 3.6 + x, 0.48, -2.6 + z);
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.12, 0.1, 0.12), new THREE.MeshLambertMaterial({ color: [0x3a5a8a, 0xc8a040, 0x2a2a2a, 0x5a5a5a][i] }), 3.35 + i * 0.17, 0.92, -2.6);
  const jack = add(new THREE.BoxGeometry(0.35, 0.14, 0.7), new THREE.MeshLambertMaterial({ color: 0xb02a1a }), -3.2, 0.09, 3.2, 0.5);
  jack.castShadow = true;
  const handle = add(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 5), darkSteel, -3.45, 0.4, 3.6, 0.5);
  handle.rotation.x = -0.9;
  add(new THREE.BoxGeometry(0.5, 0.05, 1.0), new THREE.MeshLambertMaterial({ color: 0x2a2c2e }), 3.9, 0.08, 3.4, -0.3);
  // A fire extinguisher by the door, a clock over the bench.
  add(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10), new THREE.MeshLambertMaterial({ color: 0xc81a14 }), W / 2 - 0.25, 0.75, 4.9);
  const clock = add(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe8e4d8 }), -W / 2 + 0.03, 2.75, benchZ);
  clock.castShadow = false;

  // The turntable: a dark steel disc with a turquoise ring of light.
  add(new THREE.CylinderGeometry(3.0, 3.05, 0.06, 40), new THREE.MeshStandardMaterial({ color: 0x15191a, roughness: 0.35, metalness: 0.6 }), 0, 0.03, 0);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.07, 48), new THREE.MeshBasicMaterial({ color: 0x4ff0e0 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.065;
  group.add(ring);

  // Lights you can see: two big panels over the car, the tube along the
  // back wall, and the neon sign.
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xe8f6f4 });
  for (const x of [-1.1, 1.1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 3.4), panelMat);
    p.rotation.x = Math.PI / 2; p.position.set(x, H - 0.02, 0);
    group.add(p);
    add(new THREE.BoxGeometry(1.12, 0.06, 3.52), new THREE.MeshLambertMaterial({ color: 0x2a2e2e }), x, H - 0.01, 0);
  }
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0x4ff0e0 });
  const tube = new THREE.Mesh(new THREE.BoxGeometry(W - 1.0, 0.05, 0.05), tubeMat);
  tube.position.set(0, H - 0.25, -D / 2 + 0.08);
  group.add(tube);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: Tex.neonSign(), transparent: true }));
  sign.position.set(1.6, 2.35, -D / 2 + 0.03);
  group.add(sign);

  // Real lights: soft cool panels, a turquoise wash from the back, a pink
  // kiss from the sign, a key light for the paint, and a dim fill.
  scene.add(new THREE.HemisphereLight(0x5a7a80, 0x1a2420, 0.45));
  for (const x of [-1.1, 1.1]) {
    const l = new THREE.PointLight(0xe8f4f2, 3.2, 9, 1.4);
    l.position.set(x, H - 0.3, 0);
    scene.add(l);
  }
  const back = new THREE.PointLight(0x4ff0e0, 7, 10, 1.4);
  back.position.set(0, H - 0.4, -D / 2 + 0.6);
  const pink = new THREE.PointLight(0xff3a8a, 4, 6, 1.6);
  pink.position.set(1.6, 2.3, -D / 2 + 0.8);
  const key = new THREE.SpotLight(0xfff2e0, 10, 20, 0.6, 0.6, 1.2);
  key.position.set(3.5, 3.2, 5.5);
  key.target.position.set(0, 0.5, 0);
  scene.add(back, pink, key, key.target);

  // What the paint reflects: the panels (long bright bars across the roof
  // and bonnet), the tube, the sign, the open door's dark street.
  const reflect = new THREE.Group();
  const rp = new THREE.MeshBasicMaterial({ color: 0xc8d8d6 });
  for (const x of [-1.1, 1.1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.6), rp);
    p.rotation.x = Math.PI / 2; p.position.set(x, H - 0.02, 0);
    reflect.add(p);
  }
  const rt = new THREE.Mesh(new THREE.BoxGeometry(W - 1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x4ff0e0 }));
  rt.position.copy(tube.position);
  reflect.add(rt);
  const rs = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.6), new THREE.MeshBasicMaterial({ color: 0xff3a8a }));
  rs.position.copy(sign.position);
  reflect.add(rs);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), new THREE.MeshBasicMaterial({ color: 0x1a2222, side: THREE.BackSide }));
  walls.position.y = H / 2;
  reflect.add(walls);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.6, 2.2), new THREE.MeshBasicMaterial({ color: 0x05080a }));
  door.position.set(0, 1.1, D / 2 - 0.1); door.rotation.y = Math.PI;
  reflect.add(door);

  // Life: the fan turns, and the back tube flickers now and then like an
  // old fluorescent.
  let t = 0, flick = 3;
  const update = (dt) => {
    t += dt;
    blades.rotation.z -= dt * 14;
    flick -= dt;
    const off = flick < 0.25 && flick > 0 && Math.sin(t * 90) > 0;
    tubeMat.color.setHex(off ? 0x1a3a38 : 0x4ff0e0);
    back.intensity = off ? 2 : 7;
    if (flick < 0) flick = 4 + Math.random() * 7;
  };

  return {
    scene, group, reflect, update,
    look: { reflectBg: 0x1a2222, ground: 0x24342c },
    // Camera spots, all looking at the car: the Garage screen shifts its lens
    // to keep the car clear of the tabs; the car pick sits it right of the list.
    views: {
      garage: { pos: [4.3, 1.75, 4.9], look: [0, 0.5, 0], fov: 50 },
      setup: { pos: [-2.9, 2.2, 5.1], look: [-1.2, 0.35, 0.0], fov: 54 },
      // Garage tabs: turn is the turntable angle to hold (none = keep turning).
      paint: { pos: [2.3, 2.5, 5.1], look: [0, 0.45, 0], fov: 56 },
      wheels: { pos: [3.3, 0.8, 3.5], look: [0.8, 0.4, 1.25], fov: 46, turn: 0 },
      body: { pos: [3.7, 2.4, 4.8], look: [0, 0.55, 0], fov: 54, turn: 4.1 },
      side: { pos: [2.6, 2.1, 5.1], look: [0, 0.45, 0], fov: 56, turn: 0.8 },
      // Engine: the nose turned toward you, looking down into the open bay.
      engine: { pos: [1.9, 2.6, 4.4], look: [0.5, 0.7, 1.4], fov: 48, turn: 0.35 },
    },
  };
}
