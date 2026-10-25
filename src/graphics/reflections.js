// Reflections in the car's paint and glass. A small cube camera sits on the
// car and photographs a stripped-down copy of the surroundings: just the
// bright things (lamp heads, tunnel lights, garage light panels) on a plain
// background, plus a dark ground. That costs a handful of draw calls, so it
// can be redone every other frame, and the lights slide over the paint as
// you drive past them. Black paint stops being a black hole.
//
// Every world (track or garage) supplies its own `reflect` group of bright
// things and a `look.reflectBg` colour; see setWorld().

import * as THREE from 'three';

export class Reflections {
  constructor() {
    this.target = new THREE.WebGLCubeRenderTarget(64, { type: THREE.HalfFloatType });
    this.camera = new THREE.CubeCamera(0.2, 220, this.target);
    this.scene = new THREE.Scene();
    this.scene.add(this.camera);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x0a0c0c }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
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
    this.frame = 0;
  }

  // Re-take the reflection from where the car is (every few frames, or now).
  update(gl, x, y, z, force = false) {
    if (!force && this.frame++ % this.every) return;
    this.camera.position.set(x, y, z);
    this.ground.position.set(x, 0, z);
    this.current?.traverse((o) => { if (o.userData.follow) o.position.set(x, o.position.y, z); });
    this.camera.updateMatrixWorld();
    this.camera.update(gl, this.scene);
  }
}
