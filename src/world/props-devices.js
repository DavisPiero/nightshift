// The phone and the laptop: real 3D models on their own see-through canvas over
// the game, so they can sit on any screen. Each has a live picture on its display
// (a 2D canvas) and a hinge that opens as it comes up. ui/phone.js and
// ui/laptop.js draw the pictures and handle the presses.
//
// Screens are read by pointing: DeviceStage.hit turns a click into a place on
// the display, 0..1 across and down.

import * as THREE from 'three';

const TITANIUM = 0x8d9198, DARK = 0x1a1c20, BLACK = 0x0b0c0e;
const std = (color, metalness = 0.3, roughness = 0.5) => new THREE.MeshStandardMaterial({ color, metalness, roughness });

// A slab with rounded corners, lying in x-y, `d` thick, front face at z = d/2.
function slab(w, h, d, r, bevel = 0.012) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -d / 2 + bevel);
  return g;
}

function display(px, py) {
  const canvas = document.createElement('canvas');
  canvas.width = px; canvas.height = py;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture, g: canvas.getContext('2d') };
}

// An old flip phone. Stands on its hinge end when closed. The group's origin is
// the hinge; `hinge.rotation.x` opens it, 0 flat open.
export function buildPhone() {
  const root = new THREE.Group(), shell = std(TITANIUM, 0.75, 0.38), dark = std(DARK, 0.3, 0.55), key = std(0x2b2e33, 0.2, 0.42);
  const W = 1.02, H = 1.3, D = 0.13;
  // Bottom half, with the keypad.
  const base = new THREE.Mesh(slab(W, H, D, 0.12), shell);
  base.position.set(0, -H / 2, 0);
  const inner = new THREE.Mesh(slab(W - 0.08, H - 0.1, 0.02, 0.09, 0.004), dark);
  inner.position.set(0, -H / 2 - 0.01, D / 2 + 0.002);
  root.add(base, inner);
  const keys = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.03, 8, 24), std(TITANIUM, 0.8, 0.3));
  ring.position.set(0, -0.3, D / 2 + 0.03);
  const ok = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.04, 16), std(0xffb000, 0.2, 0.4));
  ok.rotation.x = Math.PI / 2; ok.position.set(0, -0.3, D / 2 + 0.03);
  keys.add(ring, ok);
  for (const x of [-0.33, 0.33]) { const k = new THREE.Mesh(slab(0.2, 0.09, 0.04, 0.03, 0.006), key); k.position.set(x, -0.26, D / 2 + 0.03); keys.add(k); }
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const k = new THREE.Mesh(slab(0.23, 0.12, 0.045, 0.04, 0.008), key);
    k.position.set((c - 1) * 0.285, -0.55 - r * 0.165, D / 2 + 0.03);
    keys.add(k);
  }
  root.add(keys);

  // The hinge, and the top half that swings on it.
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, W - 0.2, 14), shell);
  barrel.rotation.z = Math.PI / 2;
  root.add(barrel);
  const hinge = new THREE.Group();
  root.add(hinge);
  const lid = new THREE.Mesh(slab(W, H, D * 0.8, 0.12), shell);
  lid.position.set(0, H / 2, 0);
  const bezel = new THREE.Mesh(slab(W - 0.1, H - 0.14, 0.02, 0.08, 0.004), std(BLACK, 0.2, 0.3));
  bezel.position.set(0, H / 2, D * 0.4 + 0.002);
  const speaker = new THREE.Mesh(slab(0.26, 0.03, 0.02, 0.012, 0.003), std(0x000000));
  speaker.position.set(0, H - 0.11, D * 0.4 + 0.014);
  const d = display(440, 500);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.91), new THREE.MeshBasicMaterial({ map: d.texture, toneMapped: false }));
  screen.position.set(0, H / 2 - 0.03, D * 0.4 + 0.016);
  const stub = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.32, 4, 10), dark);
  stub.position.set(W / 2 - 0.1, H + 0.14, -0.03);
  hinge.add(lid, bezel, speaker, screen, stub);
  return { root, hinge, screen, ...d, open: 0.22, shut: 2.9 };
}

// A chunky laptop. The origin is the hinge; the keyboard comes toward you.
export function buildLaptop() {
  const root = new THREE.Group(), shell = std(0x131417, 0.25, 0.62), edge = std(TITANIUM, 0.8, 0.35), keyM = std(0x0f1012, 0.15, 0.6);
  const W = 3.3, Dp = 2.2, T = 0.11;
  const deck = new THREE.Mesh(slab(W, Dp, T, 0.1), shell);
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, -T / 2, Dp / 2);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.02, 0.03), edge);
  trim.position.set(0, -0.09, Dp + 0.005);
  root.add(deck, trim);
  // The keys: one instanced box.
  const box = new THREE.BoxGeometry(0.19, 0.03, 0.17), keys = new THREE.InstancedMesh(box, keyM, 14 * 5);
  const m = new THREE.Matrix4();
  let n = 0;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) { m.makeTranslation((c - 6.5) * 0.215, 0.012, 0.28 + r * 0.205); keys.setMatrixAt(n++, m); }
  keys.instanceMatrix.needsUpdate = true;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.008, 0.5), std(0x24262b, 0.4, 0.4));
  pad.position.set(0, 0.002, 1.68);
  root.add(keys, pad);
  // The lid, on its hinge.
  const hinge = new THREE.Group();
  root.add(hinge);
  const lid = new THREE.Mesh(slab(W, 2.1, 0.08, 0.1), shell);
  lid.position.set(0, 1.05, 0);
  const d = display(1024, 640);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.06, 1.91), new THREE.MeshBasicMaterial({ map: d.texture, toneMapped: false }));
  screen.position.set(0, 1.05, 0.044);
  hinge.add(lid, screen);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 10), edge);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = -0.01;
  root.add(bar);
  return { root, hinge, screen, ...d, open: -0.12, shut: -1.6 };
}

export class DeviceStage {
  constructor(canvas) {
    this.canvas = canvas;
    this.model = null;
    this.t = 0;
    this.ray = new THREE.Raycaster();
  }

  // Made on first use: most sessions may never open either one.
  setup() {
    if (this.renderer) return;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 16 / 9, 0.1, 40);
    this.camera.position.set(0, 0, 8);
    // Something soft for the metal to reflect: a dim room with a bright top.
    const room = new THREE.Scene();
    room.background = new THREE.Color(0x0c0d10);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5.2) }));
    lamp.position.set(0, 4, 0);
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.3, 0.5) }));
    side.position.set(-5, 0, 2);
    room.add(lamp, side);
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(room).texture;
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(-2, 3, 5);
    this.scene.add(key, new THREE.HemisphereLight(0x8a93a0, 0x101114, 0.6));
    this.size();
    window.addEventListener('resize', () => this.size());
  }

  size() {
    const W = window.innerWidth, H = window.innerHeight;
    this.renderer.setSize(W, H, false);
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.place?.();
  }

  // pose(aspect) gives where it sits: { x, y, z, rx, ry, rz, scale }.
  show(device, pose) {
    this.setup();
    if (this.model) this.scene.remove(this.holder);
    this.model = device;
    this.holder = new THREE.Group();
    this.holder.add(device.root);
    this.scene.add(this.holder);
    this.pose = pose;
    this.place = () => { const p = this.pose(this.camera.aspect); this.at = p; this.holder.scale.setScalar(p.scale); this.holder.rotation.set(p.rx, p.ry, p.rz); };
    this.place();
    this.k = 0; this.closing = false; this.done = null;
    this.canvas.hidden = false;
    device.hinge.rotation.x = device.shut;
    device.texture.needsUpdate = true;
  }

  hide(done) {
    if (!this.model) { done?.(); return; }
    this.closing = true;
    this.done = done;
  }

  // Comes up from below with a small overshoot, opening as it comes.
  update(dt) {
    const m = this.model;
    if (!m) return;
    this.t += dt;
    this.k = Math.max(0, Math.min(1, this.k + dt * (this.closing ? -4.5 : 2.6)));
    const k = this.k, u = 1 - (1 - k) ** 3, over = Math.sin(k * Math.PI) * 0.04;
    const p = this.at, H = Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
    // Held in a hand: a slow sway with a little tremble on top.
    const t = this.t, sway = (a, b, c) => Math.sin(t * a) + Math.sin(t * b + 1.3) * 0.5 + Math.sin(t * c + 2.1) * 0.18;
    this.holder.position.set(p.x + sway(1.1, 2.3, 7.1) * 0.012, p.y - (1 - u) * (H * 2.4) + over + sway(1.4, 2.9, 8.3) * 0.016, p.z);
    this.holder.rotation.set(p.rx + sway(1.2, 2.6, 7.7) * 0.012, p.ry + sway(0.9, 2.1, 6.7) * 0.016, p.rz + sway(1.3, 2.7, 7.3) * 0.009);
    const open = Math.max(0, Math.min(1, (k - 0.35) / 0.65));
    m.hinge.rotation.x = m.shut + (m.open - m.shut) * (1 - (1 - open) ** 2);
    this.renderer.render(this.scene, this.camera);
    if (this.closing && k <= 0) {
      this.scene.remove(this.holder);
      this.model = null;
      this.canvas.hidden = true;
      const d = this.done; this.done = null;
      d?.();
    }
  }

  // Where a click at (x, y) in the window lands on the display, or null.
  hit(x, y) {
    if (!this.model) return null;
    this.ray.setFromCamera({ x: (x / window.innerWidth) * 2 - 1, y: 1 - (y / window.innerHeight) * 2 }, this.camera);
    const h = this.ray.intersectObject(this.model.screen)[0];
    return h ? { x: h.uv.x, y: 1 - h.uv.y } : null;
  }

  // Did a click land on the model at all?
  touches(x, y) {
    if (!this.model) return false;
    this.ray.setFromCamera({ x: (x / window.innerWidth) * 2 - 1, y: 1 - (y / window.innerHeight) * 2 }, this.camera);
    return this.ray.intersectObject(this.model.root, true).length > 0;
  }
}
