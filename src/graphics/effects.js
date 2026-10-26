// Small effects, each switchable in Settings > Graphics: tyre smoke (spray
// in the wet), exhaust flames, skid marks and sparks. In the spirit of PS2
// racers: smoke and flames are soft painted sprites (puffs of cloud that
// turn and swell as they fade, a hot glow for flames), and sparks are thin
// bright streaks that stretch with their speed, not squares.

import * as THREE from 'three';

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

const VERT = /* glsl */`
attribute float size;
attribute vec4 tint;
attribute vec2 spin; // angle, sprite tile
uniform float scale;
uniform float fogNear;
uniform float fogFar;
uniform float maxSize;
varying vec4 vTint;
varying vec2 vSpin;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(size * scale / -mv.z, 1.0, maxSize);
  // Faded right in front of the lens, so smoke passing the camera never
  // fills the screen.
  float fog = smoothstep(fogNear, fogFar, -mv.z);
  float near = smoothstep(0.8, 4.0, -mv.z);
  vTint = vec4(tint.rgb, tint.a * (1.0 - fog) * near);
  vSpin = spin;
}`;
const FRAG = /* glsl */`
uniform sampler2D map;
uniform float tiles; // sprites per row in the map
varying vec4 vTint;
varying vec2 vSpin;
void main() {
  if (vTint.a < 0.01) discard;
  vec2 p = gl_PointCoord - 0.5;
  float c = cos(vSpin.x), s = sin(vSpin.x);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) discard;
  float t = floor(vSpin.y + 0.5);
  vec2 cell = vec2(mod(t, tiles), floor(t / tiles));
  vec4 tex = texture2D(map, (cell + p) / tiles);
  tex.a *= smoothstep(0.5, 0.3, length(p - 0.5)); // always round, never a square
  gl_FragColor = vec4(vTint.rgb * tex.rgb, vTint.a * tex.a);
}`;

// Sprite sheets, painted once on a canvas. Smoke: four puffs, each a heap of
// soft blobs with a lit top and a darker underside. Glow: one hot round spot.
function spriteSheet(kind) {
  const N = kind === 'smoke' ? 2 : 1, S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S * N;
  const g = c.getContext('2d');
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let t = 0; t < N * N; t++) {
    const ox = (t % N) * S, oy = Math.floor(t / N) * S;
    if (kind === 'glow') {
      const grad = g.createRadialGradient(ox + S / 2, oy + S / 2, 0, ox + S / 2, oy + S / 2, S / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.25, 'rgba(255,255,255,0.75)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.18)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(ox, oy, S, S);
      continue;
    }
    for (let k = 0; k < 22; k++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * S * 0.17;
      const x = ox + S / 2 + Math.cos(a) * d, y = oy + S / 2 + Math.sin(a) * d;
      const rad = S * (0.1 + r() * 0.14);
      const shade = Math.round(200 + (S / 2 - (y - oy)) / S * 90 + r() * 30); // lighter on top
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(${shade},${shade},${shade},0.22)`);
      grad.addColorStop(1, `rgba(${shade},${shade},${shade},0)`);
      g.fillStyle = grad; g.fillRect(ox, oy, S, S);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, tiles: N };
}

// A pool of sprites drawn as one THREE.Points.
class Particles {
  constructor(max, { additive = false, sheet, maxSize = 120 } = {}) {
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
    this.spin = new Float32Array(max * 2);
    this.turn = new Float32Array(max);
    this.tiles = sheet.tiles;
    this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('tint', new THREE.BufferAttribute(this.tint, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('spin', new THREE.BufferAttribute(this.spin, 2).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = { scale: { value: 300 }, fogNear: { value: 25 }, fogFar: { value: 200 }, maxSize: { value: maxSize }, map: { value: sheet.tex }, tiles: { value: sheet.tiles } };
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
    this.spin[i * 2] = Math.random() * Math.PI * 2;
    this.spin[i * 2 + 1] = Math.floor(Math.random() * this.tiles * this.tiles);
    this.turn[i] = (Math.random() - 0.5) * 1.6;
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
      // Ease in, then fade out slowly (smoke thins away rather than popping).
      const fade = (fadeIn > 0 ? Math.min(1, t / fadeIn) : 1) * (1 - t) * (1 - t * 0.4);
      this.size[i] = this.size0[i] + this.grow[i] * Math.sqrt(t);
      this.spin[i * 2] += this.turn[i] * dt;
      const q = i * 4;
      this.tint[q] = this.rgba[q]; this.tint[q + 1] = this.rgba[q + 1]; this.tint[q + 2] = this.rgba[q + 2];
      this.tint[q + 3] = this.rgba[q + 3] * fade;
    }
    this.upload();
  }

  upload() {
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true; a.size.needsUpdate = true; a.tint.needsUpdate = true; a.spin.needsUpdate = true;
  }

  clear() { this.life.fill(0); this.size.fill(0); this.tint.fill(0); this.upload(); }
}

// Sparks: thin streaks, each drawn from where it is back along its path, so
// a fast spark is a long scratch of light. Hot white-yellow, cooling to
// orange as they fall.
class Streaks {
  constructor(max) {
    this.max = max;
    this.p = new Float32Array(max * 3);
    this.v = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.span = new Float32Array(max);
    this.pos = new Float32Array(max * 6);
    this.col = new Float32Array(max * 8);
    this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('tint', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({
      vertexShader: 'attribute vec4 tint; varying vec4 vT; void main(){ vT = tint; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec4 vT; void main(){ if (vT.a < 0.01) discard; gl_FragColor = vT; }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.lines = new THREE.LineSegments(g, m);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 3;
    this.points = this.lines; // shown and hidden like the sprite pools
  }

  spawn(x, y, z, vx, vy, vz, life) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.p.set([x, y, z], i * 3);
    this.v.set([vx, vy, vz], i * 3);
    this.life[i] = life; this.span[i] = life;
  }

  update(dt, gravity, drag) {
    const k = Math.max(0, 1 - drag * dt);
    for (let i = 0; i < this.max; i++) {
      const j = i * 3, o = i * 6, c = i * 8;
      if (this.life[i] <= 0) { this.col[c + 3] = this.col[c + 7] = 0; continue; }
      this.life[i] -= dt;
      this.v[j] *= k; this.v[j + 1] = this.v[j + 1] * k - gravity * dt; this.v[j + 2] *= k;
      this.p[j] += this.v[j] * dt; this.p[j + 1] += this.v[j + 1] * dt; this.p[j + 2] += this.v[j + 2] * dt;
      if (this.p[j + 1] < 0.02) { this.p[j + 1] = 0.02; this.v[j + 1] *= -0.4; this.v[j] *= 0.7; this.v[j + 2] *= 0.7; }
      const t = 1 - this.life[i] / this.span[i];
      const tail = 0.03; // seconds of path behind the head
      this.pos.set([this.p[j], this.p[j + 1], this.p[j + 2], this.p[j] - this.v[j] * tail, this.p[j + 1] - this.v[j + 1] * tail, this.p[j + 2] - this.v[j + 2] * tail], o);
      const a = 1 - t;
      this.col.set([1, 0.95 - t * 0.4, 0.75 - t * 0.6, a, 1, 0.55 - t * 0.3, 0.15, a * 0.3], c);
    }
    const at = this.lines.geometry.attributes;
    at.position.needsUpdate = true; at.tint.needsUpdate = true;
  }

  clear() { this.life.fill(0); this.col.fill(0); this.lines.geometry.attributes.tint.needsUpdate = true; }
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
    this.smoke = new Particles(420, { sheet: spriteSheet('smoke'), maxSize: 260 });
    this.fire = new Particles(160, { additive: true, sheet: spriteSheet('glow'), maxSize: 60 });
    this.sparks = new Streaks(300);
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
      this.sparks.spawn(contact.x, 0.3 + Math.random() * 0.45, contact.z, tx, 1 + Math.random() * 3.5, tz, 0.2 + Math.random() * 0.4);
    }
  }

  update(dt, v, model, camera, nearLamps, weather) {
    const scale = this.scaleFor(camera);
    for (const p of [this.smoke, this.fire]) {
      p.uniforms.scale.value = scale;
      p.uniforms.fogNear.value = this.scene.fog.near;
      p.uniforms.fogFar.value = this.scene.fog.far;
    }
    if (dt <= 0) return;
    this.time += dt;
    const wet = weather === 'rain' || weather === 'snow'; // spray (or slush), no skid marks
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
    if (this.smokeAcc > 1 / 45) {
      this.smokeAcc = 0;
      for (let w = 0; w < 2; w++) {
        model.wheels[2 + w].steer.getWorldPosition(_v);
        if (wet && v.speed > 8) {
          // Spray behind each rear wheel, lighter and faster than smoke.
          const k = Math.min(1, v.speed / 40);
          for (let i = 0; i < 2; i++) this.smoke.spawn(_v.x, 0.2, _v.z, -v.vx * 0.15 + (Math.random() - 0.5) * 1.5, 0.8 + Math.random(), -v.vz * 0.15 + (Math.random() - 0.5) * 1.5,
            0.35 + Math.random() * 0.25, 0.5, 1.4 * k, 0.6, 0.64, 0.68, 0.3 * k);
        } else if (this.on.smoke && slide > 0.05) {
          const a = Math.min(0.5, slide * 0.6);
          this.smoke.spawn(_v.x + (Math.random() - 0.5) * 0.3, 0.3, _v.z + (Math.random() - 0.5) * 0.3,
            v.vx * 0.25 + (Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.6, v.vz * 0.25 + (Math.random() - 0.5) * 1.2,
            1.4 + Math.random() * 1.2, 0.6, 3.0, 0.64, 0.65, 0.67, a);
        }
      }
    }
    this.smoke.update(dt, -0.25, 1.4, 0.08);

    // Exhaust pops: lifting off at high revs, and on fast upshifts.
    this.popTimer -= dt; this.popGap -= dt;
    if (this.lastThrottle > 0.6 && v.throttle < 0.25 && v.rpm > 4500) this.popTimer = (0.35 + Math.random() * 0.4) * (v.spec.pops ?? 1);
    if (v.gearbox.shiftCount !== this.lastShift) {
      if (v.gearbox.lastShift > 0 && v.rpm > 5200 && this.lastThrottle > 0.8) this.popTimer = Math.max(this.popTimer, 0.12);
      this.lastShift = v.gearbox.shiftCount;
    }
    this.lastThrottle = v.throttle;
    if (this.popTimer > 0 && this.popGap <= 0 && v.rpm > 2800) {
      this.popGap = 0.05 + Math.random() * 0.12;
      const strength = 0.5 + Math.random() * 0.5;
      this.onPop?.(strength);
      if (this.on.flames) for (const pipe of model.exhausts) {
        _v.copy(pipe);
        model.body.localToWorld(_v);
        _w.set(Math.sin(v.heading), 0, Math.cos(v.heading));
        for (let i = 0; i < 9; i++) {
          const blue = i < 3;
          const sp = 3 + Math.random() * 4;
          this.fire.spawn(_v.x, _v.y, _v.z, v.vx - _w.x * sp + (Math.random() - 0.5), (Math.random() - 0.3) * 0.8, v.vz - _w.z * sp + (Math.random() - 0.5),
            0.06 + Math.random() * 0.08, blue ? 0.22 : 0.4 * strength, -0.15, blue ? 0.4 : 1, blue ? 0.55 : 0.5 + Math.random() * 0.3, blue ? 1 : 0.12, 1);
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
