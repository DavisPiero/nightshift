// Small effects, each switchable in Settings > Graphics: tyre smoke (spray
// in the wet), exhaust flames, skid marks and sparks. Particles are square points in the low-res render, so they
// read as chunky pixels like everything else.

import * as THREE from 'three';

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

const VERT = /* glsl */`
attribute float size;
attribute vec4 tint;
uniform float scale;
uniform float fogNear;
uniform float fogFar;
varying vec4 vTint;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // Capped, and faded right in front of the lens, so a puff of smoke
  // passing the camera never fills the screen with one big square.
  gl_PointSize = clamp(size * scale / -mv.z, 1.0, 14.0);
  float fog = smoothstep(fogNear, fogFar, -mv.z);
  float near = smoothstep(1.0, 3.5, -mv.z);
  vTint = vec4(tint.rgb, tint.a * (1.0 - fog) * near);
}`;
const FRAG = /* glsl */`
varying vec4 vTint;
void main() {
  if (vTint.a < 0.01) discard;
  gl_FragColor = vTint;
}`;

// A pool of particles drawn as one THREE.Points.
class Particles {
  constructor(max, additive) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);   // seconds left; <= 0 is free
    this.span = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.rgba = new Float32Array(max * 4);
    this.tint = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('tint', new THREE.BufferAttribute(this.tint, 4).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = { scale: { value: 300 }, fogNear: { value: 25 }, fogFar: { value: 200 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
  }

  spawn(x, y, z, vx, vy, vz, life, size, grow, r, g, b, a) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.life[i] = life; this.span[i] = life;
    this.size0[i] = size; this.grow[i] = grow;
    this.rgba.set([r, g, b, a], i * 4);
  }

  update(dt, gravity = 0, drag = 0, fadeIn = 0) {
    const k = Math.max(0, 1 - drag * dt);
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.tint[i * 4 + 3] = 0; this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const j = i * 3;
      this.vel[j] *= k; this.vel[j + 1] = this.vel[j + 1] * k - gravity * dt; this.vel[j + 2] *= k;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      if (this.pos[j + 1] < 0.02) { this.pos[j + 1] = 0.02; this.vel[j + 1] *= -0.3; }
      const t = 1 - this.life[i] / this.span[i]; // 0 new .. 1 dead
      const fade = (fadeIn > 0 ? Math.min(1, t / fadeIn) : 1) * (1 - t);
      this.size[i] = this.size0[i] + this.grow[i] * t;
      const q = i * 4;
      this.tint[q] = this.rgba[q]; this.tint[q + 1] = this.rgba[q + 1]; this.tint[q + 2] = this.rgba[q + 2];
      this.tint[q + 3] = this.rgba[q + 3] * fade;
    }
    this.upload();
  }

  upload() {
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true; a.size.needsUpdate = true; a.tint.needsUpdate = true;
  }

  clear() { this.life.fill(0); this.size.fill(0); this.tint.fill(0); this.upload(); }
}

// Dark tyre marks: a ring buffer of thin quads on the road.
class SkidMarks {
  constructor(max = 900) {
    this.max = max;
    this.pos = new Float32Array(max * 4 * 3);
    this.alpha = new Float32Array(max * 4);
    const idx = [];
    for (let i = 0; i < max; i++) { const b = i * 4; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying float vA; void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(0.02,0.02,0.02,vA); }',
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6,
    });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.next = 0;
    this.last = [null, null];
  }

  // Lay a segment for wheel w from its last point to (x, z).
  mark(w, x, z, side, strength) {
    const last = this.last[w];
    this.last[w] = { x, z };
    if (!last || strength <= 0) return;
    const dx = x - last.x, dz = z - last.z, l = Math.hypot(dx, dz);
    if (l < 0.05 || l > 3) return;
    const nx = -dz / l * 0.12, nz = dx / l * 0.12;
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    const p = this.pos, b = i * 12;
    p.set([last.x + nx, 0.012, last.z + nz, last.x - nx, 0.012, last.z - nz, x + nx, 0.012, z + nz, x - nx, 0.012, z - nz], b);
    this.alpha.fill(Math.min(0.55, strength * 0.6), i * 4, i * 4 + 4);
    const a = this.mesh.geometry.attributes;
    a.position.needsUpdate = true; a.alpha.needsUpdate = true;
  }

  lift(w) { this.last[w] = null; }
  clear() { this.alpha.fill(0); this.mesh.geometry.attributes.alpha.needsUpdate = true; this.last = [null, null]; }
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.on = {};
    this.smoke = new Particles(500, false);
    this.fire = new Particles(160, true);
    this.sparks = new Particles(260, true);
    this.skids = new SkidMarks();
    scene.add(this.smoke.points, this.fire.points, this.sparks.points, this.skids.mesh);
    this.onPop = null;
    this.popTimer = 0;
    this.popGap = 0;
    this.lastThrottle = 0;
    this.lastShift = 0;
    this.smokeAcc = 0;
    this.time = 0;
  }

  setEnabled(fx) {
    this.on = { ...fx };
    this.smoke.points.visible = true; // also carries rain spray
    this.fire.points.visible = !!fx.flames;
    this.sparks.points.visible = !!fx.sparks;
    this.skids.mesh.visible = !!fx.skids;
  }

  reset() {
    for (const p of [this.smoke, this.fire, this.sparks]) p.clear();
    this.skids.clear();
    this.popTimer = 0;
  }

  // A wall hit: sparks scraping off the contact point.
  hit(contact, impact, v) {
    if (!contact || !this.on.sparks) return;
    // Scraping touches the wall every physics step: a trickle, not a burst.
    const n = impact < 1.5 ? (v.speed > 4 && Math.random() < 0.4 ? 1 : 0) : Math.min(40, 4 + impact * 3);
    for (let i = 0; i < n; i++) {
      const sp = 2 + Math.random() * (3 + impact * 0.6);
      // Along the car's travel, bouncing off the wall.
      const tx = v.vx * 0.5 + contact.nx * sp * 0.6 + (Math.random() - 0.5) * 3;
      const tz = v.vz * 0.5 + contact.nz * sp * 0.6 + (Math.random() - 0.5) * 3;
      this.sparks.spawn(contact.x, 0.35 + Math.random() * 0.4, contact.z, tx, 1 + Math.random() * 3, tz,
        0.25 + Math.random() * 0.35, 0.06, -0.04, 1, 0.75 + Math.random() * 0.2, 0.35, 1);
    }
  }

  update(dt, v, model, camera, nearLamps, weather) {
    const scale = this.scaleFor(camera);
    for (const p of [this.smoke, this.fire, this.sparks]) {
      p.uniforms.scale.value = scale;
      p.uniforms.fogNear.value = this.scene.fog.near;
      p.uniforms.fogFar.value = this.scene.fog.far;
    }
    if (dt <= 0) return;
    this.time += dt;
    const wet = weather === 'rain';
    model.root.updateMatrixWorld(true);

    // Rear wheels: smoke when sliding or spinning, spray when wet.
    const slide = Math.max(v.rearSlide - 0.25, v.spin) * Math.min(1, v.speed / 6);
    for (let w = 0; w < 2; w++) {
      const wheel = model.wheels[2 + w];
      wheel.steer.getWorldPosition(_v);
      const marking = this.on.skids && !wet && (v.rearSlide > 0.45 || v.spin > 0.35) && v.speed > 2;
      if (marking) this.skids.mark(w, _v.x, _v.z, 0, Math.min(1, v.rearSlide + v.spin));
      else this.skids.lift(w);
    }
    this.smokeAcc += dt;
    if (this.smokeAcc > 1 / 60) {
      this.smokeAcc = 0;
      for (let w = 0; w < 2; w++) {
        model.wheels[2 + w].steer.getWorldPosition(_v);
        if (wet && v.speed > 8) {
          // Spray behind each rear wheel, lighter and faster than smoke.
          const k = Math.min(1, v.speed / 40);
          for (let i = 0; i < 2; i++) this.smoke.spawn(_v.x, 0.2, _v.z, -v.vx * 0.15 + (Math.random() - 0.5) * 1.5, 0.8 + Math.random(), -v.vz * 0.15 + (Math.random() - 0.5) * 1.5,
            0.35 + Math.random() * 0.25, 0.25, 0.9 * k, 0.55, 0.6, 0.62, 0.25 * k);
        } else if (this.on.smoke && slide > 0.05) {
          const a = Math.min(0.55, slide * 0.7);
          this.smoke.spawn(_v.x + (Math.random() - 0.5) * 0.3, 0.25, _v.z + (Math.random() - 0.5) * 0.3,
            v.vx * 0.25 + (Math.random() - 0.5) * 1.2, 0.5 + Math.random() * 0.6, v.vz * 0.25 + (Math.random() - 0.5) * 1.2,
            1.4 + Math.random() * 1.2, 0.35, 2.4, 0.62, 0.63, 0.62, a);
        }
      }
    }
    this.smoke.update(dt, -0.25, 1.4, 0.08);

    // Exhaust pops: lifting off at high revs, and on fast upshifts.
    this.popTimer -= dt; this.popGap -= dt;
    if (this.lastThrottle > 0.6 && v.throttle < 0.25 && v.rpm > 4500) this.popTimer = 0.35 + Math.random() * 0.4;
    if (v.gearbox.shiftCount !== this.lastShift) {
      if (v.gearbox.lastShift > 0 && v.rpm > 5200 && this.lastThrottle > 0.8) this.popTimer = Math.max(this.popTimer, 0.12);
      this.lastShift = v.gearbox.shiftCount;
    }
    this.lastThrottle = v.throttle;
    if (this.popTimer > 0 && this.popGap <= 0 && v.rpm > 2800) {
      this.popGap = 0.05 + Math.random() * 0.12;
      const strength = 0.5 + Math.random() * 0.5;
      this.onPop?.(strength);
      if (this.on.flames) {
        _v.copy(model.exhaust);
        model.body.localToWorld(_v);
        _w.set(Math.sin(v.heading), 0, Math.cos(v.heading));
        for (let i = 0; i < 9; i++) {
          const blue = i < 3;
          const sp = 3 + Math.random() * 4;
          this.fire.spawn(_v.x, _v.y, _v.z, v.vx - _w.x * sp + (Math.random() - 0.5), (Math.random() - 0.3) * 0.8, v.vz - _w.z * sp + (Math.random() - 0.5),
            0.06 + Math.random() * 0.08, blue ? 0.12 : 0.2 * strength, -0.1, blue ? 0.4 : 1, blue ? 0.55 : 0.5 + Math.random() * 0.3, blue ? 1 : 0.12, 1);
        }
      }
    }
    this.fire.update(dt, 0, 2);
    this.sparks.update(dt, 9, 0.6);
  }

  // Point size in render pixels for 1 m at 1 m away.
  scaleFor(camera) {
    const h = this.renderHeight || 360;
    return h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  }
}
