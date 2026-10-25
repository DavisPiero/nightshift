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
import { getCar } from './vehicles/cars.js';
import { buildSpec } from './vehicles/tuning.js';
import { carStats } from './vehicles/stats.js';
import { CAMERA_FEEL } from './cameras/cameras.js';
import { FeelPanel } from './ui/feel-panel.js';
import { GamepadSource } from './input/gamepad.js';
import { buildCar } from './vehicles/car-model.js';
import { getTrack, trackWeathers } from './world/tracks.js';
import { buildGarage } from './world/garage.js';
import { Reflections } from './graphics/reflections.js';
import { buildTrackScene, placeBackdrop } from './world/track-scene.js';
import { WeatherView } from './world/weather.js';
import { CameraManager } from './cameras/cameras.js';
import { GameAudio } from './audio/audio.js';
import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { loadSave, writeSave, activeBuild } from './save/save.js';

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

    // Reflections in the paint, and the garage (its own little scene).
    this.reflections = new Reflections();
    this.scene.environment = this.reflections.texture;
    this.garage = buildGarage();
    this.garage.scene.environment = this.reflections.texture;
    this.turntable = 0;

    // World
    this.lampLights = [];
    for (let i = 0; i < 8; i++) {
      const l = new THREE.PointLight(0xffa04a, 150, 30, 1.6);
      this.scene.add(l);
      this.lampLights.push(l);
    }
    this.weatherId = 'clear';
    this.loadTrack(URL_FLAGS.track || this.save.lastRace.track);
    this.weather = new WeatherView(this.scene, this.world);

    // The car
    this.carSpec = getCar(URL_FLAGS.car || this.save.garage.selected);
    this.vehicle = new Vehicle(this.currentSpec(), this.save.settings.assists);
    this.buildCarModel();
    this.trackIndex = this.trackInfo.def.start;
    this.lastOffset = 0;
    this.resetCar(this.trackInfo.def.start);

    this.cameras = new CameraManager(this.camera);
    this.cameras.set(this.save.settings.camera, this.carRef());

    // Systems
    this.effects = new Effects(this.scene);
    this.audio = new GameAudio();
    this.audio.setEngine(this.carSpec);
    this.audio.setMuted(URL_FLAGS.mute);
    this.effects.onPop = (s) => this.audio.pop(s);
    this.controls = new Controls();
    this.keyboard = this.controls.add(new KeyboardSource(this.save.settings.keys));
    this.touch = this.controls.add(new TouchSource(document.querySelector('#touch'), this.save.settings.touch));
    this.touch.onLayoutChange = () => this.saveNow();
    this.gamepad = this.controls.add(new GamepadSource());
    this.feel = new FeelPanel(this);
    Object.assign(CAMERA_FEEL, FeelPanel.cameraFeel(this.save));
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
    this.loop = new Loop((dt) => this.update(dt), (dt) => this.render(dt), URL_FLAGS.smoke || URL_FLAGS.shot);
    this.loop.start();

    const forced = URL_FLAGS.device === 'computer' || URL_FLAGS.device === 'touch' ? URL_FLAGS.device : null;
    if (forced || URL_FLAGS.smoke) {
      this.save.platform = forced || this.save.platform || 'computer';
      this.startRace({ track: this.trackInfo.id, weather: WEATHER[URL_FLAGS.weather] ? URL_FLAGS.weather : 'clear', car: this.carSpec.id });
    } else if (URL_FLAGS.screen) {
      this.save.platform = this.save.platform || 'computer';
      this.screens.reset('main');
      if (URL_FLAGS.screen !== 'main') this.screens.open(URL_FLAGS.screen);
    } else {
      this.screens.reset(this.save.platform ? 'main' : 'platform');
    }
    this.checkRotation();
  }

  carRef() { return { vehicle: this.vehicle, model: this.model }; }

  // Build the scenery for a track (and throw away the last one).
  loadTrack(id) {
    const info = getTrack(id);
    if (this.world && this.trackInfo === info) return;
    if (this.world) {
      this.scene.remove(this.world.group, this.world.backdrop);
      for (const g of [this.world.group, this.world.backdrop, this.world.reflect]) {
        g?.traverse((o) => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) m.dispose(); });
      }
    }
    this.trackInfo = info;
    this.track = info.path;
    this.world = buildTrackScene(this.track, info.def);
    this.scene.add(this.world.group, this.world.backdrop);
    const L = this.world.look;
    this.hemi.color.setHex(L.hemi[0]);
    this.hemi.groundColor.setHex(L.hemi[1]);
    this.moon.intensity = L.moon;
    for (const l of this.lampLights) { l.color.setHex(L.lamp); l.intensity = L.lampPower; }
    this.reflections.setWorld(this.world);
    if (!trackWeathers(info).includes(this.weatherId)) this.weatherId = 'clear';
    if (this.weather) { this.weather.world = this.world; if (this.preset) this.weather.set(this.weatherId, this.preset, this.save.settings.effects); }
    this.trackIndex = info.def.start;
    this.flyIndex = undefined;
    if (this.vehicle) this.resetCar(info.def.start);
  }

  // The numbers the car drives with: stock, plus the active build's parts
  // and ride height, plus Feel.
  currentSpec() {
    return buildSpec(this.carSpec, activeBuild(this.save, this.carSpec), this.save.settings.feel[this.carSpec.id]);
  }

  // Any car as its active build (no Feel settings): for menus and ratings.
  specFor(id) {
    const car = getCar(id);
    return buildSpec(car, activeBuild(this.save, car));
  }

  // Rating of the car as currently built.
  currentRating() { return carStats(this.specFor(this.carSpec.id)); }

  // Feel panel moved a slider: apply it now, save it shortly after.
  applyFeel() {
    this.vehicle.setSpec(this.currentSpec());
    Object.assign(CAMERA_FEEL, FeelPanel.cameraFeel(this.save));
    clearTimeout(this.feelSave);
    this.feelSave = setTimeout(() => this.saveNow(), 400);
  }

  buildCarModel() {
    const parent = this.model?.root.parent || this.scene;
    if (this.model) { this.model.root.removeFromParent(); this.model.dispose?.(); }
    this.model = buildCar(this.specFor(this.carSpec.id), activeBuild(this.save, this.carSpec).look);
    parent.add(this.model.root);
    this.audio?.setEngine(this.currentSpec());
  }

  // The garage changed the active build (parts or looks): drive with it and
  // show it.
  buildChanged() {
    this.vehicle.setSpec(this.currentSpec());
    this.buildCarModel();
    this.applyGraphics();
    this.saveNow();
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
    this.vehicle = new Vehicle(this.currentSpec(), this.save.settings.assists);
    this.buildCarModel();
    this.resetCar(this.trackInfo.def.start);
    this.applySettings();
  }


  previewWeather(id) {
    this.weatherId = id;
    this.weather.set(id, this.preset, this.save.settings.effects);
  }

  // --- driving ---
  startRace({ track, weather, car }) {
    this.save.lastRace = { track, weather };
    this.save.garage.selected = car;
    this.saveNow();
    this.loadTrack(track);
    this.showCar(car);
    this.weatherId = trackWeathers(this.trackInfo).includes(weather) ? weather : 'clear';
    applyWeather(this.vehicle, this.weatherId);
    this.applySettings();
    this.audio.start();
    this.applyAudio();
    this.screens.closeAll();
    this.state = 'driving';
    this.hud.show(true);
    this.hud.setTouch(this.save.platform === 'touch');
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
    if (c.takeAction('feel')) this.feel.toggle();
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
  // The Garage and car-pick screens show the car in the garage; everything
  // else shows it on the track.
  get inGarage() { return this.state === 'menu' && (this.menuView === 'garage' || this.menuView === 'setup'); }

  render(dt) {
    const v = this.vehicle;
    const root = this.model.root;
    const garage = this.inGarage;
    const scene = garage ? this.garage.scene : this.scene;
    if (root.parent !== scene) {
      scene.add(root);
      this.reflections.setWorld(garage ? this.garage : this.world);
    }
    this.model.setLights(!garage);
    if (garage) {
      // The turntable turns slowly, or swings round to show what a garage tab
      // is about (the wheels, the wing, the side).
      const view = this.garageView();
      this.turntable += dt * (this.menuView === 'garage' ? 0.1 : 0.05);
      const target = view.turn ?? ((this.menuView === 'garage' ? 2.4 : -0.65) + Math.sin(this.turntable) * (this.menuView === 'garage' ? 3.2 : 0.35));
      this.turnNow ??= target;
      const d = Math.atan2(Math.sin(target - this.turnNow), Math.cos(target - this.turnNow));
      this.turnNow += d * Math.min(1, dt * 3);
      root.position.set(0, 0.06, 0);
      root.rotation.y = this.fixedTurn ?? this.turnNow;
    } else {
      root.position.set(v.x, 0, v.z);
      root.rotation.y = v.heading;
    }
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
      if (garage) this.garageCamera(dt); else this.menuCamera(dt);
      this.model.setInterior(false);
      this.audio.update(dt, v, this.weatherId, garage ? 0 : 0.25);
    } else {
      if (this.state === 'driving') this.cameras.update(this.carRef(), dt);
      this.model.setInterior(this.cameras.mode === 'cockpit');
      this.audio.update(dt, v, this.weatherId, 1);
      this.hud.draw(v, dt);
    }
    const live = this.state === 'paused' ? 0 : dt;
    // The paint reflects what is round the car (redone every other frame).
    root.updateMatrixWorld();
    this.reflections.update(this.renderer.gl, root.position.x, 0.9, root.position.z, garage);
    if (!garage) {
      this.effects.renderHeight = this.renderer.height;
      this.effects.update(live, v, this.model, this.camera, near, this.weatherId);
      this.weather.update(live, this.camera, v);
      placeBackdrop(this.world.backdrop, this.camera);
    }
    this.renderer.render(scene, this.camera);

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

  // Which camera spot the garage scene uses: the car pick, or the garage's
  // current tab (several tabs share a spot).
  garageView() {
    const v = this.garage.views;
    if (this.menuView === 'setup') return v.setup;
    const t = this.garageTab;
    return t === 'wheels' ? v.wheels : t === 'body' ? v.body : ['engine', 'chassis', 'drive'].includes(t) ? v.side : t ? v.paint : v.garage;
  }

  // The garage camera glides between spots; the turntable does the rest.
  garageCamera(dt = 0) {
    const view = this.garageView();
    const k = this.camLook && dt ? Math.min(1, dt * 4) : 1;
    this.camPos = (this.camPos || new THREE.Vector3(...view.pos)).lerp(new THREE.Vector3(...view.pos), k);
    this.camLook = (this.camLook || new THREE.Vector3(...view.look)).lerp(new THREE.Vector3(...view.look), k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    // Narrower screens (an iPad is 4:3) get a wider lens, so they see as
    // much from side to side as a 16:9 screen does.
    const aspect = this.renderer.width / Math.max(1, this.renderer.height);
    const half = Math.tan((view.fov * Math.PI) / 360) * Math.max(1, 16 / 9 / aspect);
    this.camera.fov = Math.min(80, (Math.atan(half) * 360) / Math.PI);
    this.camera.near = 0.1;
    this.camera.updateProjectionMatrix();
  }

  // Behind the menus: a slow orbit round the parked car, or on the track
  // screen a fly-through of the track being looked at.
  menuCamera(dt) {
    const v = this.vehicle;
    this.attractAngle += dt * 0.12;
    if (this.menuView === 'tracks') {
      const t = this.track;
      this.flyIndex = ((this.flyIndex ?? this.trackInfo.def.start) + dt * 22) % t.count;
      const i = t.wrap(Math.floor(this.flyIndex)), j = t.wrap(i + 18);
      const side = Math.sin(this.attractAngle * 0.7) * 2.5;
      this.camera.position.set(t.x[i] + t.leftX(i) * side, this.trackInfo.def.theme === 'underground' ? 3.4 : 5.5, t.z[i] + t.leftZ(i) * side);
      this.camera.lookAt(t.x[j], 1.2, t.z[j]);
      this.camera.fov = 62;
      this.camera.updateProjectionMatrix();
      return;
    }
    const a = v.heading + 2.2 + Math.sin(this.attractAngle) * 0.9;
    const dist = 7.5, h = 1.6, lookY = 0.7;
    this.camera.position.set(v.x + Math.sin(a) * dist, h, v.z + Math.cos(a) * dist);
    this.camera.lookAt(v.x, lookY, v.z);
    this.camera.fov = 50;
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
