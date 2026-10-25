// The garage: a lock-up workshop where the car sits on a turntable. Concrete
// block walls, a green epoxy floor, a half-open roller shutter, a workbench,
// a red tool chest, tyres, boxes and an old monitor (after David's
// garage.jpg), lit by two big light panels over the car, a turquoise tube
// along the back wall and a pink 夜勤 ("night shift") neon sign. It is its
// own scene: the car is moved into it for the Garage and car-pick screens.

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
  add(new THREE.BoxGeometry(0.6, 0.45, 0.5), card, -W / 2 + 0.6, 0.23, 2.6, 0.3);
  add(new THREE.BoxGeometry(0.45, 0.35, 0.4), card, -W / 2 + 0.55, 0.62, 2.55, -0.2);
  add(new THREE.BoxGeometry(0.5, 0.4, 0.5), card, W / 2 - 0.7, 0.2, 3.4, 0.6);
  add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12), new THREE.MeshLambertMaterial({ color: 0x1f4a6a }), -W / 2 + 0.5, 0.45, -0.2);
  add(new THREE.ConeGeometry(0.18, 0.5, 8), new THREE.MeshLambertMaterial({ map: Tex.cone() }), -3.6, 0.25, 3.9);

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

  return {
    scene, group, reflect,
    look: { reflectBg: 0x1a2222, ground: 0x24342c },
    // Camera spots: car left of the right-hand panel (Garage), or right of
    // the left-hand list (car pick).
    views: {
      garage: { pos: [4.2, 1.65, 5.1], look: [1.35, 0.45, 0.1], fov: 44 },
      setup: { pos: [-2.5, 2.0, 5.25], look: [-1.25, 0.3, 0.0], fov: 50 },
    },
  };
}
