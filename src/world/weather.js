// How the weather looks: fog distance and colour, falling rain, a darker
// shinier wet road, and (with Wet reflections on) streaks of lamp light
// reflected in the road. The grip side lives in src/physics/weather.js.

import * as THREE from 'three';
import { WEATHER } from '../physics/weather.js';
import { Tex } from '../graphics/textures.js';

const DROPS = 1400;
const BOX = 22; // rain falls in a box this far round the camera

const LOOKS = {
  clear: { fog: 0x0b1012, hemi: 1.3, road: 0xffffff, shine: 0, spec: 0x000000 },
  rain: { fog: 0x0d1418, hemi: 1.15, road: 0x8a8e94, shine: 60, spec: 0x3a3630 },
  fog: { fog: 0x1a2226, hemi: 1.45, road: 0xd8dade, shine: 8, spec: 0x0c0c0c },
};

export class WeatherView {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.id = 'clear';

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
    fog.color.setHex(look.fog);
    fog.near = w.fogNear;
    fog.far = w.fogFar ? Math.min(preset.drawDistance, w.fogFar) : preset.drawDistance;
    this.scene.background = fog.color;
    const hemi = this.scene.children.find((o) => o.isHemisphereLight);
    if (hemi) hemi.intensity = look.hemi;
    const road = this.world.roadMat;
    if (road) {
      road.color.setHex(look.road);
      road.shininess = look.shine;
      road.specular.setHex(look.spec);
    }
    this.rain.visible = this.id === 'rain';
    if (this.world.backdrop) this.world.backdrop.visible = this.id !== 'fog'; // fog hides the distance
    this.reflect = this.id === 'rain' && fx.reflections;
    for (const s of this.streaks) s.visible = this.reflect;
    this.wind = this.id === 'rain' ? 2.2 : 0;
  }

  update(dt, camera, v) {
    this.time += dt;
    const cx = camera.position.x, cz = camera.position.z;
    if (this.rain.visible) {
      const fall = 17 * dt;
      for (let i = 0; i < DROPS; i++) {
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
      this.rain.geometry.attributes.position.needsUpdate = true;
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
