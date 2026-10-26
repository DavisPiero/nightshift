// How the weather looks: fog distance and colour, falling rain or snow, a
// darker shinier wet road, snow lying on the ground and roofs, and (with Wet
// reflections on) streaks of lamp light reflected in the road. Inside a
// weather patch the fog closes in and more rain or snow falls. The grip side
// lives in src/physics/weather.js.

import * as THREE from 'three';
import { WEATHER } from '../physics/weather.js';
import { Tex } from '../graphics/textures.js';

const DROPS = 2800;   // rain: 1400 normally, all of them in a downpour
const FLAKES = 3500;  // snow: 1400 normally, all of them in a flurry
const BOX = 22;       // rain and snow fall in a box this far round the camera

const LOOKS = {
  clear: { fog: 0x0b1012, hemi: 1.3, road: 0xffffff, shine: 0, spec: 0x000000 },
  rain: { fog: 0x0d1418, hemi: 1.15, road: 0x8a8e94, shine: 60, spec: 0x3a3630 },
  fog: { fog: 0x1a2226, hemi: 1.45, road: 0xd8dade, shine: 8, spec: 0x0c0c0c },
  snow: { fog: 0x1a2026, hemi: 1.6, road: 0xb4b8be, shine: 24, spec: 0x26282c },
};

export class WeatherView {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.id = 'clear';
    this.k = 0; // how far into a weather patch, eased

    // Rain: short line streaks, slanted a little by the wind.
    this.drops = new Float32Array(DROPS * 3);
    for (let i = 0; i < DROPS; i++) this.drops.set([(Math.random() - 0.5) * BOX * 2, Math.random() * 14, (Math.random() - 0.5) * BOX * 2], i * 3);
    this.linePos = new Float32Array(DROPS * 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9aa8b0, transparent: true, opacity: 0.32, depthWrite: false }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);

    // Snow: soft dots drifting down and swaying.
    this.flakes = new Float32Array(FLAKES * 4); // x, y, z, sway phase
    for (let i = 0; i < FLAKES; i++) this.flakes.set([(Math.random() - 0.5) * BOX * 2, Math.random() * 14, (Math.random() - 0.5) * BOX * 2, Math.random() * 6.3], i * 4);
    this.flakePos = new Float32Array(FLAKES * 3);
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(this.flakePos, 3).setUsage(THREE.DynamicDrawUsage));
    this.snow = new THREE.Points(fg, new THREE.PointsMaterial({ map: Tex.glow(), color: 0xe8eef4, size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false }));
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    scene.add(this.snow);

    // Lamp reflections: a stretched streak of light on the road under each
    // of the nearest lamps, turned to face the camera.
    const streakMat = new THREE.MeshBasicMaterial({ map: Tex.reflection(), color: 0xffa85a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -5 });
    const streakGeo = new THREE.PlaneGeometry(1.6, 12);
    streakGeo.rotateX(-Math.PI / 2);
    streakGeo.translate(0, 0, 6); // starts under the lamp, runs toward the camera
    this.streaks = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(streakGeo, streakMat);
      m.visible = false;
      m.renderOrder = 1;
      scene.add(m);
      this.streaks.push(m);
    }
    this.wind = 0;
    this.time = 0;
  }

  set(id, preset, fx) {
    this.id = WEATHER[id] ? id : 'clear';
    const w = WEATHER[this.id], look = LOOKS[this.id];
    const fog = this.scene.fog;
    fog.color.setHex(this.world.look?.fog?.[this.id] ?? look.fog);
    fog.near = w.fogNear;
    this.fogFar = w.fogFar ? Math.min(preset.drawDistance, w.fogFar) : preset.drawDistance;
    this.patchFar = w.patch ? Math.min(this.fogFar, w.patch.fogFar) : this.fogFar;
    fog.far = this.fogFar + (this.patchFar - this.fogFar) * this.k;
    this.world.backdrop?.userData.sky?.set(this.world.look, this.id, !!preset.skyDetail, fog.color.getHex());
    // Overhead is the top of the sky, unless fog hides the sky altogether.
    const top = this.world.look?.skyTop;
    this.scene.background = top !== undefined && this.id !== 'fog' ? new THREE.Color(top) : fog.color;
    const hemi = this.scene.children.find((o) => o.isHemisphereLight);
    if (hemi) hemi.intensity = look.hemi * (this.world.look?.hemi?.[2] ?? 1);
    const road = this.world.roadMat;
    if (road) {
      road.color.setHex(look.road);
      road.shininess = look.shine;
      road.specular.setHex(look.spec);
    }
    this.rain.visible = this.id === 'rain';
    this.snow.visible = this.id === 'snow';
    this.fall = w.patch?.fall ?? 1;
    // Snow lies on the ground, verges and roofs (each world lists what can
    // take it, with the white it turns).
    for (const [m, white] of this.world.snowy || []) {
      if (!m.userData.dry) {
        m.userData.dry = { color: m.color.getHex(), map: m.map };
        // Snow texture repeated like the texture it covers (none: plain white).
        if (m.map) { m.userData.snowMap = Tex.snow().clone(); m.userData.snowMap.repeat.copy(m.map.repeat); m.userData.snowMap.needsUpdate = true; }
      }
      const snowy = this.id === 'snow';
      m.color.setHex(snowy ? white : m.userData.dry.color);
      const map = snowy ? (m.userData.snowMap ?? null) : m.userData.dry.map;
      if (m.map !== map) { m.map = map; m.needsUpdate = true; }
    }
    if (this.world.backdrop) this.world.backdrop.visible = this.id !== 'fog'; // fog hides the distance
    this.reflect = this.id === 'rain' && fx.reflections;
    for (const s of this.streaks) { s.visible = this.reflect; s.material.color.setHex(this.world.look?.lamp ?? 0xffa85a); }
    this.wind = this.id === 'rain' ? 2.2 : this.id === 'snow' ? 0.8 : 0;
  }

  // patch: how far into a weather patch the car is (0..1).
  update(dt, camera, v, patch = 0) {
    this.time += dt;
    this.k += (patch - this.k) * Math.min(1, dt * 1.5);
    this.scene.fog.far = this.fogFar + (this.patchFar - this.fogFar) * this.k;
    const heavy = 1 + (this.fall - 1) * this.k; // 1 normally, up to `fall` in a patch
    const cx = camera.position.x, cz = camera.position.z;
    if (this.rain.visible) {
      const n = Math.min(DROPS, Math.round(1400 * heavy));
      const fall = 17 * dt;
      for (let i = 0; i < n; i++) {
        const j = i * 3;
        let x = this.drops[j], y = this.drops[j + 1] - fall, z = this.drops[j + 2];
        if (y < 0) { y += 14; x = (Math.random() - 0.5) * BOX * 2; z = (Math.random() - 0.5) * BOX * 2; }
        this.drops[j + 1] = y;
        // Drops live in camera-relative space so the box follows you; the
        // car's speed adds streak slant so rain rushes past at speed.
        const px = cx + x, pz = cz + z, py = y;
        const k = i * 6;
        this.linePos[k] = px; this.linePos[k + 1] = py; this.linePos[k + 2] = pz;
        this.linePos[k + 3] = px + this.wind * 0.04 - v.vx * 0.02; this.linePos[k + 4] = py + 0.5; this.linePos[k + 5] = pz - v.vz * 0.02;
      }
      this.rain.geometry.setDrawRange(0, n * 2);
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    if (this.snow.visible) {
      const n = Math.min(FLAKES, Math.round(1400 * heavy));
      const fall = 1.7 * dt;
      for (let i = 0; i < n; i++) {
        const j = i * 4;
        let x = this.flakes[j], y = this.flakes[j + 1] - fall, z = this.flakes[j + 2];
        // The box follows the camera: flakes that drift out wrap round, so
        // driving through the snow streams it past you.
        x -= v.vx * dt; z -= v.vz * dt;
        if (y < 0) y += 14;
        if (x < -BOX) x += BOX * 2; else if (x > BOX) x -= BOX * 2;
        if (z < -BOX) z += BOX * 2; else if (z > BOX) z -= BOX * 2;
        this.flakes[j] = x; this.flakes[j + 1] = y; this.flakes[j + 2] = z;
        const sway = Math.sin(this.time * 1.3 + this.flakes[j + 3]) * 0.4;
        const k = i * 3;
        this.flakePos[k] = cx + x + sway + this.wind * y * 0.05; this.flakePos[k + 1] = y; this.flakePos[k + 2] = cz + z + sway * 0.6;
      }
      this.snow.geometry.setDrawRange(0, n);
      this.snow.geometry.attributes.position.needsUpdate = true;
    }
    if (this.reflect) {
      const lamps = this.world.lamps
        .map((p) => [p, (p.x - cx) ** 2 + (p.z - cz) ** 2])
        .sort((a, b) => a[1] - b[1]);
      this.streaks.forEach((s, i) => {
        const L = lamps[i]?.[0];
        if (!L) { s.visible = false; return; }
        s.visible = true;
        s.position.set(L.x, 0.02, L.z);
        // Reflections always run from the light toward whoever is looking.
        s.rotation.y = Math.atan2(cx - L.x, cz - L.z);
        s.material.opacity = 0.75 + Math.sin(this.time * 3 + i) * 0.08;
      });
    }
  }
}
