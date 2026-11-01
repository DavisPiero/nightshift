// Dave's lot: the shop's scene, a yard behind a chain-link fence. A corrugated
// carport with strings of bulbs over the car, a site cabin with a lit window and
// a hand-painted sign, a container, stacked tyres, a drum with a fire in it, a
// tired old car, a drinks machine, bunting and boards with Dave's promises on
// them. Like the garage it is its own scene: the car is moved into it.

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';
import { Placer } from './assets.js';
import { rng } from './scene-kit.js';

const YARD = { x: 11, back: -9, front: 12 };

// A board painted by someone in a hurry.
function board(w, h, draw, bg = '#d8cfae') {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const r = rng(w * 7 + h);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(60,40,20,${r() * 0.1})`; g.fillRect(r() * w, r() * h, 2 + r() * 40, 1 + r() * 3); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildDealership() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060c);
  scene.fog = new THREE.Fog(0x05060c, 16, 46);
  const group = new THREE.Group();
  scene.add(group);
  const add = (geo, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const r = rng(314);
  const lambert = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3e4040, roughness: 0.7, metalness: 0.5 });
  const rust = lambert(0x5a3a2a), rubber = lambert(0x111214);

  // Ground: cracked concrete, oil where cars have stood.
  const conc = Tex.concrete().clone();
  conc.repeat.set(12, 10); conc.needsUpdate = true;
  const ground = add(new THREE.PlaneGeometry(60, 50), new THREE.MeshStandardMaterial({ map: conc, color: 0x77777a, roughness: 0.78, metalness: 0, envMapIntensity: 0.4 }), 0, 0, 0);
  ground.rotation.x = -Math.PI / 2;
  const stain = new THREE.MeshBasicMaterial({ map: Tex.blobShadow(), transparent: true, depthWrite: false, opacity: 0.75 });
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1 + r() * 3, 0.8 + r() * 2.4), stain);
    s.rotation.set(-Math.PI / 2, 0, r() * 6); s.position.set((r() - 0.5) * 18, 0.012 + i * 0.0004, -7 + r() * 16);
    group.add(s);
  }

  // The carport over the car: four rusty posts and a sagging tin roof.
  const roofY = 3.5, roofW = 9, roofD = 8;
  for (const x of [-1, 1]) for (const z of [-1, 1]) add(new THREE.BoxGeometry(0.14, roofY, 0.14), rust, x * roofW / 2, roofY / 2, z * roofD / 2);
  for (const z of [-1, 1]) add(new THREE.BoxGeometry(roofW + 0.3, 0.14, 0.14), rust, 0, roofY, z * roofD / 2);
  const tinTex = Tex.cladding([96, 90, 80]).clone();
  tinTex.repeat.set(3, 1); tinTex.needsUpdate = true;
  const tin = add(new THREE.PlaneGeometry(roofW + 0.8, roofD + 0.8), lambert(0x8a8478, { map: tinTex, side: THREE.DoubleSide }), 0, roofY + 0.14, 0);
  tin.rotation.x = -Math.PI / 2 + 0.05;

  // Strings of bulbs across the carport.
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.3, 1.1) }), wire = lambert(0x0c0c0c), bulb = new THREE.SphereGeometry(0.055, 8, 6);
  for (const z of [-2.6, 0, 2.6]) {
    const n = 11;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = (u - 0.5) * roofW, y = roofY - 0.1 - Math.sin(u * Math.PI) * 0.45;
      const b = new THREE.Mesh(bulb, bulbMat); b.position.set(x, y - 0.1, z); group.add(b);
      if (i < n) add(new THREE.BoxGeometry(roofW / n + 0.02, 0.012, 0.012), wire, x + roofW / n / 2, y, z).rotation.z = -Math.cos((u + 0.05) * Math.PI) * 0.12;
    }
  }

  // The site cabin at the back, with a lit window and Dave's sign on the roof.
  const clad = Tex.cladding([70, 86, 92]).clone();
  clad.repeat.set(4, 1); clad.needsUpdate = true;
  add(new THREE.BoxGeometry(7.6, 2.9, 3), lambert(0x83909a, { map: clad }), 3.2, 1.6, YARD.back + 0.8);
  add(new THREE.BoxGeometry(7.9, 0.14, 3.3), lambert(0x2a2c2e), 3.2, 3.1, YARD.back + 0.8);
  for (const x of [0, 6.4]) add(new THREE.BoxGeometry(0.3, 0.2, 3), lambert(0x1c1c1e), x, 0.1, YARD.back + 0.8);
  const front = YARD.back + 2.32;
  const pane = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.85) });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1), pane); win.position.set(1.8, 1.9, front); group.add(win);
  for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(2.14, 0.03, 0.03), lambert(0x101012), 1.8, 1.46 + i * 0.15, front + 0.02).castShadow = false;
  add(new THREE.BoxGeometry(1, 2.1, 0.06), lambert(0x4a5660), 4.8, 1.2, front);
  add(new THREE.BoxGeometry(0.1, 0.04, 0.06), steel, 4.45, 1.2, front + 0.05);
  for (const y of [0.3, 0.55, 0.8]) add(new THREE.BoxGeometry(1.1, 0.06, 0.34), steel, 4.8, y - 0.02, front + (0.8 - y) * 0.5 + 0.18);
  const sign = board(1024, 256, (g, w, h) => {
    g.fillStyle = '#b81e14'; g.font = 'bold 120px "Jersey 10", monospace'; g.fillText('DAVE\'S QUALITY CARS', w / 2, h * 0.38);
    g.fillStyle = '#1a2a60'; g.font = 'bold 72px "DotGothic16", "Jersey 10", monospace'; g.fillText('中古車  ·  NO REFUNDS', w / 2, h * 0.78);
  }, '#e8dfbc');
  const signM = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 1.65), new THREE.MeshLambertMaterial({ map: sign }));
  signM.position.set(3.2, 4.05, front - 0.5); group.add(signM);
  for (const x of [0.6, 5.8]) add(new THREE.BoxGeometry(0.08, 1.7, 0.08), steel, x, 3.95, front - 0.55);

  // Boards wired to the fence.
  const notice = (text, x, z, ry, bg, ink) => {
    const t = board(512, 256, (g, w, h) => { g.fillStyle = ink; g.font = 'bold 74px "Jersey 10", monospace'; text.split('\n').forEach((l, i, a) => g.fillText(l, w / 2, h * (0.5 + (i - (a.length - 1) / 2) * 0.36))); }, bg);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
    m.position.set(x, 1.5, z); m.rotation.set(0, ry, (r() - 0.5) * 0.08); group.add(m);
  };
  notice('CASH ONLY', -YARD.x + 0.1, -3, Math.PI / 2, '#e8c820', '#141414');
  notice('RUNS\n(MOSTLY)', -YARD.x + 0.1, 2.6, Math.PI / 2, '#d8d4c4', '#b01810');
  notice('NO WORRIES', -4.6, YARD.back + 0.12, 0, '#f0ece0', '#1a4a80');
  notice('ASK ABOUT\nTHE SMELL', YARD.x - 0.1, -1.2, -Math.PI / 2, '#d8d4c4', '#141414');

  // Chain-link round the yard, on steel posts.
  const fenceTex = Tex.fence().clone();
  fenceTex.repeat.set(30, 3); fenceTex.needsUpdate = true;
  const fenceMat = new THREE.MeshLambertMaterial({ map: fenceTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0x9a9a98 });
  const fence = (x, z, ry, len) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 3), fenceMat); m.position.set(x, 1.5, z); m.rotation.y = ry; group.add(m); };
  fence(0, YARD.back, 0, YARD.x * 2); fence(-YARD.x, 1.5, Math.PI / 2, 21); fence(YARD.x, 1.5, Math.PI / 2, 21);
  for (let i = -YARD.x; i <= YARD.x; i += 3) add(new THREE.CylinderGeometry(0.04, 0.04, 3.1, 6), steel, i, 1.55, YARD.back);
  for (let z = YARD.back; z <= YARD.front; z += 3) for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.04, 0.04, 3.1, 6), steel, s * YARD.x, 1.55, z);

  // Tyres, a drum with a fire in it, junk.
  const tyre = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14);
  for (const [x, z, n] of [[-8.6, -6.6, 5], [-7.8, -6.8, 3], [-8.2, -5.9, 4], [8.2, 2.5, 4], [8.8, 3.1, 2]]) for (let i = 0; i < n; i++) add(tyre, rubber, x + (r() - 0.5) * 0.06, 0.12 + i * 0.24, z + (r() - 0.5) * 0.06, r());
  add(new THREE.CylinderGeometry(0.33, 0.3, 0.95, 12, 1, true), lambert(0x4a2e22, { side: THREE.DoubleSide }), -6.4, 0.48, -5.8);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.glow(), color: 0xff8030, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flame.position.set(-6.4, 1.15, -5.8); flame.scale.set(1.3, 1.7, 1); group.add(flame);
  const fire = new THREE.PointLight(0xff7a28, 14, 11, 1.7);
  fire.position.set(-6.4, 1.4, -5.8); scene.add(fire);
  for (const [x, z, c] of [[-9.6, -3.6, 0x1f4a6a], [-9.7, -2.8, 0x8a2a1a], [9.6, 5.2, 0x2a2c2a]]) add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12), lambert(c), x, 0.45, z, r());
  add(new THREE.BoxGeometry(1.5, 0.12, 1.1), lambert(0x6a5238), 7.6, 0.08, -5.4, 0.3); // a pallet

  // A plastic chair with a mug beside it, in the right-hand corner: Dave's.
  const seat = lambert(0xd8d6cc);
  add(new THREE.BoxGeometry(0.46, 0.05, 0.46), seat, 6.2, 0.46, 5, -0.5);
  add(new THREE.BoxGeometry(0.46, 0.5, 0.05), seat, 6.32, 0.72, 4.8, -0.5);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) add(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 5), seat, 6.2 + x, 0.23, 5 + z);

  // Bunting from the cabin to the carport, every colour Dave could get cheap.
  const flagGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.17, 0, 0), new THREE.Vector3(0.17, 0, 0), new THREE.Vector3(0, -0.34, 0)]);
  flagGeo.setIndex([0, 2, 1]); flagGeo.computeVertexNormals();
  for (const [ax, az, bx, bz] of [[-0.6, YARD.back + 1.6, -roofW / 2, -roofD / 2], [7, YARD.back + 1.6, roofW / 2, -roofD / 2]]) {
    for (let i = 0; i < 12; i++) {
      const u = i / 11, f = new THREE.Mesh(flagGeo, lambert([0xc8281a, 0xe8c020, 0x2a6ac8, 0xe8e4d8][i % 4], { side: THREE.DoubleSide }));
      f.position.set(ax + (bx - ax) * u, 3.3 - Math.sin(u * Math.PI) * 0.5, az + (bz - az) * u);
      f.rotation.y = Math.atan2(bz - az, -(bx - ax)) + Math.PI;
      group.add(f);
    }
  }

  // From the library: a container, a drinks machine, a tired old car, the
  // pole with the wires, a floodlight, bins and cones.
  const place = new Placer();
  place.add('container', -7.2, 0, YARD.back + 1.7, 0, 1, 0x7a3a24);
  place.add('container', -7.2, 2.6, YARD.back + 1.7, 0.04, 1, 0x2a5070);
  place.add('vending-red', -2.4, 0, YARD.back + 0.8, 0);
  place.add('vending-white', -1.4, 0, YARD.back + 0.8, 0);
  place.add('parked-challenjer', 8.3, 0, -3.4, 0.2, 1, 0x4a4a3a);
  place.add('power-pole', -9.6, 0, YARD.back - 1.2, 0.2);
  place.add('floodlight', YARD.x - 1, 0, YARD.back + 1, -0.6);
  place.add('bin', 7.8, 0, -7, 0.4);
  place.add('cone', 3.4, 0, 3.4, 0.3);
  place.add('cone', -3.6, 0, 3.1, 1);
  place.finish(group, { glowSize: 2.2 });

  // The city past the fence: a few dark blocks with lit windows.
  for (let i = 0; i < 9; i++) {
    const w = 6 + r() * 7, h = 9 + r() * 18, x = -32 + i * 8 + r() * 3, m = new THREE.MeshBasicMaterial({ color: 0x0a0c14 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), m); b.position.set(x, h / 2, -26 - r() * 8); group.add(b);
    for (let k = 0; k < 12; k++) {
      const lit = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), new THREE.MeshBasicMaterial({ color: r() < 0.7 ? 0xd8b060 : 0x70c8c0, fog: false }));
      lit.position.set(x + (r() - 0.5) * (w - 1), 2 + r() * (h - 3), b.position.z + 3.02); group.add(lit);
    }
  }

  // Real lights: warm from the bulbs, one hard flood from the side, a cold
  // night sky over everything.
  scene.add(new THREE.HemisphereLight(0x48506a, 0x1a1712, 0.5));
  for (const z of [-2.2, 2.2]) { const l = new THREE.PointLight(0xffc27a, 16, 12, 1.4); l.position.set(0, roofY - 0.5, z); scene.add(l); }
  const key = new THREE.SpotLight(0xdce6ff, 26, 30, 0.5, 0.7, 1.2);
  key.position.set(8.5, 6, 8);
  key.target.position.set(0, 0.5, 0);
  scene.add(key, key.target);

  // What the paint reflects: the bulbs in bars, the lit window, a dark yard.
  const reflect = new THREE.Group();
  const bar = new THREE.MeshBasicMaterial({ color: 0xc89858 });
  for (const z of [-2.6, 0, 2.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(roofW, 0.12, 0.12), bar); p.position.set(0, roofY - 0.4, z); reflect.add(p); }
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ color: 0xc8a050 })); rw.position.set(1.8, 1.9, front); reflect.add(rw);
  const rf = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xbcc8e0 })); rf.position.set(8.5, 6, 8); reflect.add(rf);

  // Life: the fire in the drum, and one bulb that has seen better days.
  let t = 0;
  const update = (dt) => {
    t += dt;
    const f = 0.8 + Math.sin(t * 11) * 0.12 + Math.sin(t * 23 + 1) * 0.08 + Math.sin(t * 5.3) * 0.1;
    fire.intensity = 14 * f;
    flame.scale.set(1.2 + f * 0.2, 1.4 + f * 0.6, 1);
    flame.position.y = 1.1 + f * 0.1;
  };

  return {
    scene, group, reflect, update,
    look: { reflectBg: 0x0a0a0e, ground: 0x2a2a2a },
    bounds: { x: [-10, 10], y: [0.35, 3.1], z: [-7, 10] },
    views: { show: { pos: [4.4, 1.6, 6.8], look: [0, 0.55, 0], fov: 46, turn: 0.55 } },
  };
}
