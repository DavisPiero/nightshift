// Reflections in the car's paint and glass. A small cube camera sits on the
// car and photographs a stripped-down copy of the surroundings: just the
// bright things (lamp heads, tunnel lights, garage light panels) on a plain
// background, plus a dark ground. That costs a handful of draw calls, so it
// can be redone every other frame, and the lights slide over the paint as
// you drive past them. Black paint stops being a black hole.
//
// Every world (track or garage) supplies its own `reflect` group of bright
// things and a `look.reflectBg` colour; see setWorld(). At sunset and dawn a
// sky dome adds the warm horizon and the sun itself, so the paint catches
// the low light as you drive into it.
//
// So that the car is lit by the same light as the road under it, a small camera
// looks straight down at the real road beside the car a few times a second. What
// it sees becomes the ground in the reflections and a soft panel of the same light
// overhead: under an amber lamp the car is amber, in a turquoise tunnel it is
// turquoise, and it changes as you drive from pool to pool. Only the car uses
// these reflections, so the world's own look is untouched.

import * as THREE from 'three';

const PROBE = 8;       // pixels across the look at the road
const OVERHEAD = 1.5;  // how much of the road's light also comes from above
const _lit = new THREE.Color();

export class Reflections {
  constructor() {
    this.target = new THREE.WebGLCubeRenderTarget(64, { type: THREE.HalfFloatType });
    this.camera = new THREE.CubeCamera(0.2, 220, this.target);
    this.scene = new THREE.Scene();
    this.scene.add(this.camera);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x0a0c0c }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
    const dome = new THREE.SphereGeometry(150, 24, 12);
    dome.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(dome.attributes.position.count * 3), 3));
    this.sky = new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
    // Overhead: the road's light coming from above too.
    this.over = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, fog: false }));
    this.over.rotation.x = Math.PI / 2;
    this.scene.add(this.over);
    this.probe = new THREE.WebGLRenderTarget(PROBE, PROBE, { depthBuffer: true });
    this.probeCam = new THREE.OrthographicCamera(-3.5, 3.5, 3.5, -3.5, 0.5, 9);
    this.probeCam.up.set(0, 0, 1);
    this.pixels = new Uint8Array(PROBE * PROBE * 4);
    this.lit = new THREE.Color(0);
    this.current = null;
    this.frame = 0;
    this.every = 2; // frames between updates
  }

  get texture() { return this.target.texture; }

  // Show this world's bright things in the reflections.
  setWorld(world) {
    if (this.current) this.scene.remove(this.current);
    this.current = world.reflect || null;
    if (this.current) this.scene.add(this.current);
    const bg = new THREE.Color(world.look?.reflectBg ?? 0x0b1012);
    this.scene.background = bg;
    this.scene.fog = new THREE.Fog(bg, 30, 180);
    this.ground.material.color.setHex(world.look?.ground ?? 0x0a0c0c);
    this.ground.visible = world.look?.reflectGround !== false;
    this.over.material.color.setHex(0);
    this.lit.setHex(0);
    this.setSky(world.look, bg);
    this.frame = 0;
  }

  // Colour the dome: the background everywhere, then (if the sun is up) a
  // warm glow along the horizon toward it and the sun's bright disc.
  setSky(look, bg) {
    const sunUp = (look?.glare ?? 0) > 0;
    this.sky.visible = sunUp;
    if (!sunUp) return;
    const sun = new THREE.Vector3(...look.sun.dir).normalize();
    const sc = new THREE.Color(look.sun.colour);
    const p = this.sky.geometry.attributes.position, col = this.sky.geometry.attributes.color;
    const d = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      d.fromBufferAttribute(p, i).normalize();
      const toward = Math.max(0, d.dot(sun));
      const low = 1 - Math.min(1, Math.abs(d.y - 0.08) / 0.45);
      c.copy(bg).lerp(sc, low * (0.25 + toward * 0.6));
      const hot = toward ** 24 * 6 * look.glare;
      col.setXYZ(i, c.r + sc.r * hot, c.g + sc.g * hot, c.b + sc.b * hot);
    }
    col.needsUpdate = true;
  }

  // A look at the road beside the car (see the top of the file). hide: the car.
  // The first look at a new place snaps; after that it eases.
  sampleRoad(gl, world, hide, x, y, z) {
    if (this.frame % 8) return;
    const cam = this.probeCam, auto = gl.shadowMap.autoUpdate;
    cam.position.set(x, y + 5, z);
    cam.lookAt(x, y, z);
    cam.updateMatrixWorld();
    hide.visible = false;
    gl.shadowMap.autoUpdate = false;
    gl.setRenderTarget(this.probe);
    gl.render(world, cam);
    gl.readRenderTargetPixels(this.probe, 0, 0, PROBE, PROBE, this.pixels);
    gl.setRenderTarget(null);
    gl.shadowMap.autoUpdate = auto;
    hide.visible = true;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < this.pixels.length; i += 4) { r += this.pixels[i]; g += this.pixels[i + 1]; b += this.pixels[i + 2]; }
    const k = 1 / (PROBE * PROBE * 255);
    _lit.setRGB(r * k, g * k, b * k);
    this.lit.lerp(_lit, this.lit.r + this.lit.g + this.lit.b ? 0.3 : 1);
    this.ground.visible = true;
    this.ground.material.color.copy(this.lit);
    this.over.material.color.copy(this.lit).multiplyScalar(OVERHEAD);
  }

  // Re-take the reflection from where the car is (every few frames, or now).
  update(gl, x, y, z, force = false) {
    if (!force && this.frame++ % this.every) return;
    this.camera.position.set(x, y, z);
    this.ground.position.set(x, y - 0.9, z);
    this.over.position.set(x, y + 9, z);
    this.sky.position.set(x, y, z);
    this.current?.traverse((o) => { if (o.userData.follow) o.position.set(x, y + o.userData.follow, z); });
    this.camera.updateMatrixWorld();
    this.camera.update(gl, this.scene);
  }
}
