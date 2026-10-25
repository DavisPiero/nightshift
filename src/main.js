// NIGHTSHIFT start-up: builds the world, the car and the systems, and runs
// the title screen, driving and pause states.

import * as THREE from 'three';
import { GRAPHICS, defaultGraphicsFor, URL_FLAGS } from './core/config.js';
import { Loop } from './core/loop.js';
import { RetroRenderer } from './graphics/renderer.js';
import { Controls } from './input/controls.js';
import { KeyboardSource } from './input/keyboard.js';
import { Vehicle } from './physics/vehicle.js';
import { keepOnTrack } from './physics/walls.js';
import { KAIDO_R } from './vehicles/coupe-spec.js';
import { buildCoupe } from './vehicles/coupe-model.js';
import { TrackPath } from './world/track-path.js';
import { TEST_ROAD } from './world/test-road.js';
import { buildTrackScene } from './world/track-scene.js';
import { CameraManager } from './cameras/cameras.js';
import { GameAudio } from './audio/audio.js';
import { Hud } from './ui/hud.js';
import { Menus } from './ui/menus.js';
import { loadSave, writeSave } from './save/save.js';

const FOG_COLOUR = 0x0b1012;

class Game {
  constructor() {
    this.save = loadSave();
    this.state = 'title';

    // Rendering
    this.renderer = new RetroRenderer(document.querySelector('#view'));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(FOG_COLOUR);
    this.scene.fog = new THREE.Fog(FOG_COLOUR, 25, 210);
    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 400);

    // Night lighting: dim sky, faint moonlight, amber lamps near the car.
    this.scene.add(new THREE.HemisphereLight(0x3a4a58, 0x141810, 1.3));
    this.moon = new THREE.DirectionalLight(0x8090b0, 0.35);
    this.moon.position.set(-40, 80, -30);
    this.moon.shadow.mapSize.set(1024, 1024);
    Object.assign(this.moon.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 200 });
    this.scene.add(this.moon, this.moon.target);

    // World
    this.track = new TrackPath(TEST_ROAD);
    const world = buildTrackScene(this.track, TEST_ROAD);
    this.scene.add(world.group);
    this.lampSpots = world.lamps;
    this.lampLights = [];
    for (let i = 0; i < 8; i++) {
      const l = new THREE.PointLight(0xffa04a, 150, 28, 1.6);
      this.scene.add(l);
      this.lampLights.push(l);
    }

    // The car
    this.vehicle = new Vehicle(KAIDO_R, this.save.settings.assists);
    this.vehicle.gearbox.mode = this.save.settings.transmission;
    this.model = buildCoupe(this.save.garage.cars['kaido-r']?.paint ?? KAIDO_R.paint);
    this.scene.add(this.model.root);
    this.headlight = new THREE.SpotLight(0xfff0d0, 120, 70, 0.42, 0.55, 1.3);
    this.headlight.position.set(0, 0.7, 2.0);
    this.headlight.target.position.set(0, -0.6, 22);
    this.model.root.add(this.headlight, this.headlight.target);
    this.trackIndex = TEST_ROAD.start;
    this.lastOffset = 0;
    this.resetCar(TEST_ROAD.start);

    this.cameras = new CameraManager(this.camera);
    this.cameras.set(this.save.settings.camera, this.carRef());

    // Systems
    this.audio = new GameAudio();
    this.audio.setVolumes(this.save.settings.audio);
    this.audio.setMuted(URL_FLAGS.mute);
    this.controls = new Controls();
    this.keyboard = this.controls.add(new KeyboardSource());
    this.hud = new Hud(document.querySelector('#hud'));
    this.menus = new Menus(this);
    if (URL_FLAGS.debug) this.hud.toggleDebug();

    this.applyGraphics();
    window.addEventListener('resize', () => this.renderer.resize());
    // Never leave a key held down when the window loses focus.
    window.addEventListener('blur', () => { this.controls.releaseAll(); if (this.state === 'driving') this.pauseGame(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.controls.releaseAll(); this.audio.suspend(); if (this.state === 'driving') this.pauseGame(); }
    });
    // Title screen: any key starts (once a platform is chosen).
    window.addEventListener('keydown', (e) => {
      if (this.state === 'title' && this.save.platform && !document.querySelector('#title-ready').hidden && (e.code === 'Enter' || e.code === 'Space')) this.startDriving();
    });

    this.attractAngle = 0;
    this.loop = new Loop((dt) => this.update(dt), (dt) => this.render(dt), URL_FLAGS.smoke);
    this.loop.start();

    const forced = URL_FLAGS.device === 'computer' || URL_FLAGS.device === 'touch' ? URL_FLAGS.device : null;
    if (forced || URL_FLAGS.smoke) {
      this.save.platform = forced || this.save.platform || 'computer';
      this.startDriving();
      // Sound still needs a key press or tap before the browser allows it.
      const unlock = () => { this.audio.start(); window.removeEventListener('keydown', unlock); window.removeEventListener('pointerdown', unlock); };
      if (!URL_FLAGS.mute) { window.addEventListener('keydown', unlock); window.addEventListener('pointerdown', unlock); }
    } else {
      this.menus.showTitle(this.save.platform);
    }
  }

  carRef() { return { vehicle: this.vehicle, model: this.model }; }

  get graphicsName() {
    if (URL_FLAGS.smoke) return 'low'; // keeps the headless check quick
    return this.save.settings.graphics || defaultGraphicsFor(this.save.platform);
  }

  applyGraphics() {
    const preset = GRAPHICS[this.graphicsName];
    this.preset = preset;
    this.renderer.configure(preset);
    this.scene.fog.far = preset.drawDistance;
    this.camera.far = preset.drawDistance + 20;
    this.moon.castShadow = preset.shadows;
    this.model.root.traverse((o) => { if (o.isMesh) o.castShadow = preset.shadows; });
    this.lampLights.forEach((l, i) => { l.visible = i < preset.lampLights; });
  }

  // --- menu callbacks ---
  choosePlatform(p) {
    this.save.platform = p;
    writeSave(this.save);
    this.applyGraphics();
    this.startDriving();
  }

  setPlatform(p) {
    this.save.platform = p;
    writeSave(this.save);
    this.applyGraphics();
    this.menus.showTouchNote(p === 'touch');
  }

  setGraphics(name) {
    this.save.settings.graphics = name;
    writeSave(this.save);
    this.applyGraphics();
  }

  setVolume(v) {
    this.save.settings.audio.master = v;
    this.audio.setVolumes({ master: v });
    writeSave(this.save);
  }

  startDriving() {
    this.audio.start();
    if (!URL_FLAGS.mute) this.audio.setMuted(false);
    this.menus.hideTitle();
    this.state = 'driving';
    this.hud.show(true);
    this.menus.showTouchNote(this.save.platform === 'touch');
    this.controls.releaseAll();
    this.cameras.set(this.cameras.mode, this.carRef());
  }

  pauseGame() {
    if (this.state !== 'driving' || this.smoke) return;
    this.state = 'paused';
    this.controls.releaseAll();
    this.menus.showPause(true);
    this.audio.suspend();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'driving';
    this.menus.showPause(false);
    this.controls.releaseAll();
    this.audio.resume();
  }

  toTitle() {
    this.menus.showPause(false);
    this.hud.show(false);
    this.menus.showTouchNote(false);
    this.state = 'title';
    this.resetCar(TEST_ROAD.start);
    this.menus.showTitle(this.save.platform);
  }

  nextCamera() {
    this.save.settings.camera = this.cameras.next(this.carRef());
    writeSave(this.save);
  }

  // Put the car back on the road, facing the right way.
  resetCar(index = this.trackIndex) {
    const t = this.track;
    const i = t.wrap(index);
    this.vehicle.reset(t.x[i], t.z[i], t.headingAt(i));
    this.trackIndex = i;
    if (this.cameras) this.cameras.set(this.cameras.mode, this.carRef());
  }

  // --- per physics step ---
  update(dt) {
    const c = this.controls;
    if (c.takeAction('debug')) this.hud.toggleDebug();
    if (this.state === 'driving') {
      if (c.takeAction('pause')) { this.pauseGame(); return; }
      if (c.takeAction('camera')) this.nextCamera();
      if (c.takeAction('reset')) this.resetCar();
      const input = this.smoke ? this.smoke.input(dt, this) : c.poll(dt);
      this.vehicle.step(dt, input);
      const r = keepOnTrack(this.vehicle, this.track, this.trackIndex);
      this.trackIndex = r.index;
      this.lastOffset = r.offset;
      if (r.impact > 0) this.audio.impact(r.impact);
    } else if (this.state === 'paused') {
      if (c.takeAction('pause')) this.resume();
      c.actions.clear();
    } else {
      c.actions.clear();
    }
  }

  // --- per screen frame ---
  render(dt) {
    const v = this.vehicle;
    const root = this.model.root;
    root.position.set(v.x, 0, v.z);
    root.rotation.y = v.heading;
    this.model.update(v);

    // Real lights only on the lamps nearest the car.
    const n = this.preset.lampLights;
    const near = this.lampSpots
      .map((p) => [p, (p.x - v.x) ** 2 + (p.z - v.z) ** 2])
      .sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < n; i++) this.lampLights[i].position.copy(near[i][0]);
    this.moon.position.set(v.x - 40, 80, v.z - 30);
    this.moon.target.position.set(v.x, 0, v.z);

    if (this.state === 'title') {
      // Slow orbit around the parked car behind the title.
      this.attractAngle += dt * 0.12;
      const a = v.heading + 2.2 + Math.sin(this.attractAngle) * 0.9;
      this.camera.position.set(v.x + Math.sin(a) * 7.5, 1.6, v.z + Math.cos(a) * 7.5);
      this.camera.lookAt(v.x, 0.7, v.z);
      this.camera.fov = 50;
      this.camera.near = 0.1;
    } else {
      this.cameras.update(this.carRef(), dt);
      // The headlight glow sprites would fog the windscreen from inside.
      for (const s of this.model.headGlows) s.visible = this.cameras.mode !== 'cockpit';
      this.audio.update(dt, v);
      this.hud.draw(v, dt);
    }
    this.renderer.render(this.scene, this.camera);

    if (this.hud.debugOn) {
      const info = this.renderer.gl.info.render;
      this.hud.drawDebug(v, {
        fps: this.loop.fps, steps: this.loop.stepsLastFrame,
        width: this.renderer.width, height: this.renderer.height, preset: this.graphicsName,
        calls: info.calls, tris: info.triangles, controls: this.controls.state,
        trackIndex: this.trackIndex, offset: this.lastOffset,
      });
    }
    if (this.smoke) this.smoke.frame(this);
  }
}

// Automatic check (?smoke): drives a lap with a simple bot and prints the
// result into <pre id="smoke"> for tools/smoke.sh to read.
class SmokeTest {
  constructor() { this.t = 0; this.frames = 0; this.maxKmh = 0; this.done = false; this.travelled = 0; this.lastIndex = -1; this.hits = 0; }
  input(dt, game) {
    this.t += dt;
    const v = game.vehicle, track = game.track, i = game.trackIndex;
    const ti = track.wrap(i + Math.round(8 + v.speed * 0.5));
    const dx = track.x[ti] - v.x, dz = track.z[ti] - v.z;
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    const ang = Math.atan2(dx * fz - dz * fx, dx * fx + dz * fz);
    let k = 0;
    for (let j = 0; j < 20 + v.speed * v.speed / 14; j += 2) k = Math.max(k, Math.abs(track.curvature[track.wrap(i + j)]));
    const vmax = Math.sqrt(9 / Math.max(k, 1e-4));
    if (this.lastIndex >= 0) {
      let adv = i - this.lastIndex;
      if (adv < -track.count / 2) adv += track.count;
      this.travelled += adv;
    }
    this.lastIndex = i;
    this.maxKmh = Math.max(this.maxKmh, v.speed * 3.6);
    if (this.t > 1 && this.t < 1.05 && game.cameras.mode === 'chase') game.nextCamera();
    if (this.t > 3 && this.t < 3.05 && game.cameras.mode === 'cockpit') game.nextCamera();
    return { steer: Math.max(-1, Math.min(1, -ang * 2.2)), throttle: v.speed < vmax - 1 ? 1 : 0, brake: v.speed > vmax + 2 ? 1 : 0, handbrake: false, gearUp: false, gearDown: false };
  }
  frame(game) {
    this.frames++;
    if (this.done || (this.t < 20 && this.frames < 4000)) return;
    this.done = true;
    const ok = this.maxKmh > 80 && this.travelled > 300 && this.frames > 30;
    const out = document.createElement('pre');
    out.id = 'smoke';
    out.textContent = [
      `frames ${this.frames}, sim time ${this.t.toFixed(1)} s`,
      `top speed ${this.maxKmh.toFixed(0)} km/h, distance ${this.travelled} m, gear ${game.vehicle.gearbox.gear}`,
      `render ${game.renderer.width}x${game.renderer.height} (${game.graphicsName})`,
      ok ? 'SMOKE PASS' : 'SMOKE FAIL',
    ].join('\n');
    document.body.appendChild(out);
  }
}

window.addEventListener('error', (e) => {
  if (!URL_FLAGS.smoke) return;
  const out = document.createElement('pre');
  out.id = 'smoke';
  out.textContent = 'SMOKE FAIL: ' + e.message;
  document.body.appendChild(out);
});

const game = new Game();
if (URL_FLAGS.smoke) game.smoke = new SmokeTest();
window.nightshift = game; // handy from the browser console
