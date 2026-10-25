// NIGHTSHIFT start-up: builds the world, the car and the systems, and runs
// the game states: menus (main, drive, garage, settings), driving and paused.

import * as THREE from 'three';
import { GRAPHICS, defaultGraphicsFor, URL_FLAGS } from './core/config.js';
import { Loop } from './core/loop.js';
import { RetroRenderer } from './graphics/renderer.js';
import { Effects } from './graphics/effects.js';
import { Controls } from './input/controls.js';
import { KeyboardSource } from './input/keyboard.js';
import { TouchSource } from './input/touch.js';
import { Vehicle } from './physics/vehicle.js';
import { keepOnTrack } from './physics/walls.js';
import { applyWeather, WEATHER } from './physics/weather.js';
import { getCar, carTitle } from './vehicles/cars.js';
import { buildCar } from './vehicles/car-model.js';
import { getTrack } from './world/tracks.js';
import { buildTrackScene, placeBackdrop } from './world/track-scene.js';
import { WeatherView } from './world/weather.js';
import { CameraManager } from './cameras/cameras.js';
import { GameAudio } from './audio/audio.js';
import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { loadSave, writeSave } from './save/save.js';

class Game {
  constructor() {
    this.save = loadSave();
    this.state = 'menu';
    this.menuView = 'main';

    // Rendering
    this.renderer = new RetroRenderer(document.querySelector('#view'));
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0b1012, 25, 210);
    this.scene.background = this.scene.fog.color;
    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 400);

    // Night lighting: dim sky, faint moonlight, amber lamps near the car.
    this.hemi = new THREE.HemisphereLight(0x3a4a58, 0x141810, 1.3);
    this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0x8090b0, 0.35);
    this.moon.position.set(-40, 80, -30);
    this.moon.shadow.mapSize.set(1024, 1024);
    Object.assign(this.moon.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 200 });
    this.scene.add(this.moon, this.moon.target);

    // World
    this.trackInfo = getTrack(this.save.lastRace.track);
    this.track = this.trackInfo.path;
    this.world = buildTrackScene(this.track, this.trackInfo.def);
    this.scene.add(this.world.group, this.world.backdrop);
    this.lampLights = [];
    for (let i = 0; i < 8; i++) {
      const l = new THREE.PointLight(0xffa04a, 150, 30, 1.6);
      this.scene.add(l);
      this.lampLights.push(l);
    }
    this.weatherId = 'clear';
    this.weather = new WeatherView(this.scene, this.world);

    // The car
    this.carSpec = getCar(this.save.garage.selected);
    this.vehicle = new Vehicle(this.carSpec, this.save.settings.assists);
    this.buildCarModel();
    this.trackIndex = this.trackInfo.def.start;
    this.lastOffset = 0;
    this.resetCar(this.trackInfo.def.start);

    this.cameras = new CameraManager(this.camera);
    this.cameras.set(this.save.settings.camera, this.carRef());

    // Systems
    this.effects = new Effects(this.scene);
    this.audio = new GameAudio();
    this.audio.setMuted(URL_FLAGS.mute);
    this.effects.onPop = (s) => this.audio.pop(s);
    this.controls = new Controls();
    this.keyboard = this.controls.add(new KeyboardSource(this.save.settings.keys));
    this.touch = this.controls.add(new TouchSource(document.querySelector('#touch'), this.save.settings.touch));
    this.touch.onLayoutChange = () => this.saveNow();
    this.hud = new Hud(document.querySelector('#hud'));
    this.screens = new Screens(this);
    if (URL_FLAGS.debug) this.hud.toggleDebug();
    document.querySelector('#layout-done').addEventListener('click', () => this.editTouchLayout(false));
    document.querySelector('#layout-reset').addEventListener('click', () => this.touch.resetLayout());

    this.applySettings();
    window.addEventListener('resize', () => { this.renderer.resize(); this.checkRotation(); });
    // Never leave a key held down when the window loses focus.
    window.addEventListener('blur', () => { this.controls.releaseAll(); if (this.state === 'driving') this.pauseGame(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.controls.releaseAll(); this.audio.suspend(); if (this.state === 'driving') this.pauseGame(); }
      else if (this.state !== 'paused') this.audio.resume();
    });
    // Sound needs a tap or key press before the browser allows it.
    const unlock = () => { this.audio.start(); this.applyAudio(); };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);

    this.attractAngle = 0;
    this.loop = new Loop((dt) => this.update(dt), (dt) => this.render(dt), URL_FLAGS.smoke);
    this.loop.start();

    const forced = URL_FLAGS.device === 'computer' || URL_FLAGS.device === 'touch' ? URL_FLAGS.device : null;
    if (forced || URL_FLAGS.smoke) {
      this.save.platform = forced || this.save.platform || 'computer';
      this.startRace({ track: this.trackInfo.id, weather: WEATHER[URL_FLAGS.weather] ? URL_FLAGS.weather : 'clear', car: this.carSpec.id });
    } else {
      this.screens.reset(this.save.platform ? 'main' : 'platform');
    }
    this.checkRotation();
  }

  carRef() { return { vehicle: this.vehicle, model: this.model }; }

  buildCarModel() {
    if (this.model) { this.scene.remove(this.model.root); this.model.dispose?.(); }
    const paint = this.save.garage.cars[this.carSpec.id]?.paint ?? this.carSpec.paint;
    this.model = buildCar(this.carSpec, paint);
    this.scene.add(this.model.root);
  }

  get graphicsName() {
    if (URL_FLAGS.smoke) return 'low'; // keeps the headless check quick
    return this.save.settings.graphics || defaultGraphicsFor(this.save.platform);
  }

  saveNow() { writeSave(this.save); }

  // --- settings ---
  settingsChanged() {
    this.applySettings();
    this.saveNow();
  }

  applySettings() {
    const s = this.save.settings;
    this.vehicle.assists = { ...s.assists };
    this.vehicle.gearbox.mode = s.transmission;
    this.keyboard.setKeys(s.keys);
    this.touch.setSettings(s.touch);
    this.touch.setManual(s.transmission === 'manual');
    this.hud.units = s.units;
    this.cameras.configure({ distance: s.chaseDistance, fov: s.fov, shake: s.shake });
    if (this.cameras.mode !== s.camera) this.cameras.set(s.camera, this.carRef());
    this.applyAudio();
    this.applyGraphics();
  }

  applyAudio() {
    this.audio.setVolumes(this.save.settings.audio);
  }

  applyGraphics() {
    const fx = this.save.settings.effects;
    const preset = { ...GRAPHICS[this.graphicsName], shadows: fx.shadows && !URL_FLAGS.smoke, dither: fx.dither };
    this.preset = preset;
    this.renderer.configure(preset);
    this.camera.far = preset.drawDistance + 30;
    this.moon.castShadow = preset.shadows;
    this.model.root.traverse((o) => { if (o.isMesh) o.castShadow = preset.shadows; });
    this.lampLights.forEach((l, i) => { l.visible = i < preset.lampLights; });
    this.effects.setEnabled(fx);
    this.model.setBeams?.(fx.beams);
    this.model.setGlow?.(fx.glow);
    for (const g of this.world.glows) g.visible = fx.glow;
    this.weather.set(this.weatherId, preset, fx);
  }

  setPlatform(p) {
    this.save.platform = p;
    this.saveNow();
    this.applyGraphics();
    this.hud.setTouch(p === 'touch');
    if (this.state === 'driving') this.touch.show(p === 'touch');
    this.checkRotation();
  }

  choosePlatform(p) {
    this.setPlatform(p);
    this.screens.reset('main');
  }

  editTouchLayout(on = true) {
    document.querySelector('#layout-bar').hidden = !on;
    document.querySelector('#scr-settings').style.visibility = on ? 'hidden' : '';
    this.touch.edit(on);
    if (!on) this.saveNow();
  }

  // Lock to landscape on touch screens: say so when the iPad is upright.
  checkRotation() {
    const upright = this.save.platform === 'touch' && window.innerHeight > window.innerWidth;
    document.querySelector('#rotate-note').hidden = !upright;
    if (upright && this.state === 'driving') this.pauseGame();
  }

  // --- menus ---
  onScreen(name) {
    if (['main', 'garage', 'tracks', 'setup', 'platform'].includes(name)) this.menuView = name;
  }

  showCar(id) {
    if (id === this.carSpec.id) return;
    this.carSpec = getCar(id);
    this.vehicle = new Vehicle(this.carSpec, this.save.settings.assists);
    this.buildCarModel();
    this.resetCar(this.trackInfo.def.start);
    this.applySettings();
  }

  setPaint(color) { this.model.setPaint(color); }

  previewWeather(id) {
    this.weatherId = id;
    this.weather.set(id, this.preset, this.save.settings.effects);
  }

  // --- driving ---
  startRace({ track, weather, car }) {
    this.save.lastRace = { track, weather };
    this.save.garage.selected = car;
    this.saveNow();
    this.showCar(car);
    this.weatherId = weather;
    applyWeather(this.vehicle, weather);
    this.applySettings();
    this.audio.start();
    this.applyAudio();
    this.screens.closeAll();
    this.state = 'driving';
    this.hud.show(true);
    this.hud.setTouch(this.save.platform === 'touch');
    this.hud.setCar(`${carTitle(this.carSpec)} · <b>${WEATHER[weather].name}</b>`);
    this.touch.show(this.save.platform === 'touch');
    this.restartCar();
    this.audio.resume();
  }

  restartCar() {
    this.controls.releaseAll();
    this.resetCar(this.trackInfo.def.start);
    this.effects.reset();
    this.cameras.set(this.cameras.mode, this.carRef());
  }

  pauseGame() {
    if (this.state !== 'driving' || this.smoke) return;
    this.state = 'paused';
    this.controls.releaseAll();
    this.touch.show(false);
    this.screens.reset('pause');
    this.audio.suspend();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'driving';
    this.screens.closeAll();
    this.controls.releaseAll();
    this.touch.show(this.save.platform === 'touch');
    this.audio.resume();
  }

  restart() {
    this.restartCar();
    this.resume();
  }

  toMain() {
    this.screens.reset('main');
    this.hud.show(false);
    this.touch.show(false);
    this.state = 'menu';
    this.restartCar();
    this.audio.resume();
  }

  nextCamera() {
    this.save.settings.camera = this.cameras.next(this.carRef());
    this.saveNow();
  }

  // Put the car back on the road, facing the right way.
  resetCar(index = this.trackIndex) {
    const t = this.track;
    const i = t.wrap(index);
    this.vehicle.reset(t.x[i], t.z[i], t.headingAt(i));
    applyWeather(this.vehicle, this.weatherId);
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
      const input = this.smoke ? this.smoke.input(dt, this) : c.poll(dt);
      this.vehicle.step(dt, input);
      const r = keepOnTrack(this.vehicle, this.track, this.trackIndex);
      this.trackIndex = r.index;
      this.lastOffset = r.offset;
      if (r.impact > 0) {
        this.audio.impact(r.impact);
        this.effects.hit(r.contact, r.impact, this.vehicle);
        this.cameras.bump(r.impact);
      }
    } else if (this.state === 'paused') {
      if (c.takeAction('pause') && this.screens.top === 'pause') this.resume();
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
    this.model.update(v, dt);

    // Real lights only on the lamps nearest the car.
    const n = this.preset.lampLights;
    const near = this.world.lamps
      .map((p) => [p, (p.x - v.x) ** 2 + (p.z - v.z) ** 2])
      .sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < n; i++) this.lampLights[i].position.copy(near[i][0]);
    this.moon.position.set(v.x - 40, 80, v.z - 30);
    this.moon.target.position.set(v.x, 0, v.z);

    if (this.state === 'menu') {
      this.menuCamera(dt);
      this.model.setInterior(false);
      this.audio.update(dt, v, this.weatherId, 0.25);
    } else {
      if (this.state === 'driving') this.cameras.update(this.carRef(), dt);
      this.model.setInterior(this.cameras.mode === 'cockpit');
      this.audio.update(dt, v, this.weatherId, 1);
      this.hud.draw(v, dt);
    }
    const live = this.state === 'paused' ? 0 : dt;
    this.effects.renderHeight = this.renderer.height;
    this.effects.update(live, v, this.model, this.camera, near, this.weatherId);
    this.weather.update(live, this.camera, v);
    placeBackdrop(this.world.backdrop, this.camera);
    this.renderer.render(this.scene, this.camera);

    if (this.hud.debugOn) {
      const info = this.renderer.gl.info.render;
      this.hud.drawDebug(v, {
        fps: this.loop.fps, steps: this.loop.stepsLastFrame,
        width: this.renderer.width, height: this.renderer.height, preset: this.graphicsName,
        calls: info.calls, tris: info.triangles, controls: this.controls.state,
        trackIndex: this.trackIndex, offset: this.lastOffset, weather: this.weatherId,
      });
    }
    if (this.smoke) this.smoke.frame(this);
  }

  // Slow orbits round the parked car behind the menus; closer in the garage.
  menuCamera(dt) {
    const v = this.vehicle;
    this.attractAngle += dt * 0.12;
    let a, dist, h, lookY, fov, side = 0;
    if (this.menuView === 'garage') {
      a = v.heading + this.attractAngle; // a slow turn, about one lap a minute
      dist = 7.4; h = 1.9; lookY = 0.55; fov = 44;
      side = -1.6; // car sits left of the stats panel
    } else {
      a = v.heading + 2.2 + Math.sin(this.attractAngle) * 0.9;
      dist = 7.5; h = 1.6; lookY = 0.7; fov = 50;
    }
    const cx = v.x + Math.sin(a) * dist, cz = v.z + Math.cos(a) * dist;
    this.camera.position.set(cx, h, cz);
    // Shift the aim sideways so the car is not hidden behind a panel.
    const rx = Math.cos(a), rz = -Math.sin(a);
    this.camera.lookAt(v.x - rx * side, lookY, v.z - rz * side);
    this.camera.fov = fov;
    this.camera.near = 0.1;
    this.camera.updateProjectionMatrix();
  }
}

// Automatic check (?smoke): drives with a simple bot and prints the result
// into <pre id="smoke"> for tools/smoke.sh to read. With &device=touch it
// also checks the touch controls are on screen.
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
    const vmax = Math.sqrt(9 * v.surface.grip / Math.max(k, 1e-4));
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
    const touchOk = game.save.platform !== 'touch' || (!document.querySelector('#touch').hidden && document.querySelectorAll('#touch .tc').length >= 5);
    const ok = this.maxKmh > 80 && this.travelled > 300 && this.frames > 30 && touchOk;
    const out = document.createElement('pre');
    out.id = 'smoke';
    out.textContent = [
      `frames ${this.frames}, sim time ${this.t.toFixed(1)} s, platform ${game.save.platform}, weather ${game.weatherId}`,
      `top speed ${this.maxKmh.toFixed(0)} km/h, distance ${this.travelled} m, gear ${game.vehicle.gearbox.gear}`,
      `render ${game.renderer.width}x${game.renderer.height} (${game.graphicsName}), draw calls ${game.renderer.gl.info.render.calls}`,
      game.save.platform === 'touch' ? `touch controls ${touchOk ? 'shown' : 'MISSING'}` : 'keyboard',
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

// Start once the pixel font is ready (canvas text and signs use it), or
// after a moment without it if it cannot load (offline).
const fontReady = URL_FLAGS.smoke ? Promise.resolve()
  : Promise.race([document.fonts?.load('20px "Jersey 10"') ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);
fontReady.catch(() => {}).finally(() => {
  const game = new Game();
  if (URL_FLAGS.smoke) game.smoke = new SmokeTest();
  window.nightshift = game; // handy from the browser console
});
