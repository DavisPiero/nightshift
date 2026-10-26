// Saved game, in localStorage. Versioned, checked on load, and rebuilt from
// defaults if anything is missing or broken. Only plain data is stored,
// never Three.js objects or physics state.

import { DEFAULT_KEYS } from '../input/keyboard.js';
import { DEFAULT_TOUCH } from '../input/touch.js';
import { DEFAULT_EFFECTS } from '../core/config.js';
import { checkLook, defaultLook } from '../vehicles/looks.js';

const KEY = 'nightshift.save';
export const SAVE_VERSION = 3;
export const MAX_BUILDS = 3;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    platform: null,              // 'computer' | 'touch', null until chosen
    settings: {
      // Gameplay
      transmission: 'auto',
      assists: { steering: true, stability: true, drift: true },
      units: 'kmh',              // 'kmh' | 'mph'
      camera: 'chase',
      chaseDistance: 1,          // 0.8 near, 1 normal, 1.25 far
      shake: true,
      // Graphics
      graphics: null,            // 'low' | 'medium' | 'high', null = Low
      effects: { ...DEFAULT_EFFECTS },
      fov: 62,
      feel: {},                  // Feel panel values per car id, plus 'camera'
      // Audio
      audio: { master: 0.8, engine: 1, effects: 0.8, ambience: 0.7 },
      // Controls
      keys: structuredClone(DEFAULT_KEYS),
      touch: structuredClone(DEFAULT_TOUCH),
    },
    garage: {
      selected: 'gtar-r35',
      owned: ['gtar-r35'],
      cars: {},                  // per car id: { active, builds: [{ name, parts, look }] }
    },
    lastRace: { track: 'starter', weather: 'clear', time: 'night' },
    bestLaps: {},
  };
}

// Copy values from `loaded` into `base` where the types match, so an old or
// damaged save can never put the game into a state it does not expect.
function mergeChecked(base, loaded) {
  if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) return base;
  for (const key of Object.keys(base)) {
    const b = base[key], l = loaded[key];
    if (l === undefined) continue;
    if (b === null) { if (typeof l === 'string' || typeof l === 'number' || l === null) base[key] = l; continue; }
    if (Array.isArray(b)) { if (Array.isArray(l)) base[key] = l.filter((x) => typeof x === 'string'); continue; }
    if (typeof b === 'object') {
      // Open-ended maps (per-car data, lap times) keep every entry.
      if (Object.keys(b).length === 0 || key === 'cars') base[key] = { ...b, ...(typeof l === 'object' && l ? l : {}) };
      else mergeChecked(b, l);
      continue;
    }
    if (typeof l === typeof b && !(typeof l === 'number' && !Number.isFinite(l))) base[key] = l;
  }
  return base;
}

export function loadSave() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  if (!raw) return defaultSave();
  try {
    const data = JSON.parse(raw);
    // Version 1 called the car "kaido-r".
    if (data?.version === 1 && data.garage?.cars?.['kaido-r']) {
      data.garage.cars = { 'skyliner-r34': data.garage.cars['kaido-r'] };
      data.garage.selected = 'skyliner-r34';
      data.garage.owned = ['skyliner-r34'];
    }
    const save = mergeChecked(defaultSave(), data);
    // Version 2 kept one paint and one set of parts per car: they become
    // that car's first build.
    for (const [id, c] of Object.entries(save.garage.cars)) {
      if (c && !Array.isArray(c.builds)) {
        save.garage.cars[id] = { active: 0, builds: [{ name: 'My build', parts: c.upgrades || {}, look: typeof c.paint === 'number' ? { paint: c.paint } : {} }] };
      }
    }
    // The touch camera and pause buttons moved to the top left (the minimap
    // took the top right); move them in saves that still had them there.
    const lay = save.settings.touch.layout;
    for (const [k, x] of [['camera', 0.86], ['pause', 0.95], ['camera', 0.12]]) if (lay?.[k]?.x === x && lay[k].y === 0.09) lay[k] = { ...DEFAULT_TOUCH.layout[k] };
    save.version = SAVE_VERSION;
    if (!['computer', 'touch', null].includes(save.platform)) save.platform = null;
    if (!['low', 'medium', 'high', null].includes(save.settings.graphics)) save.settings.graphics = null;
    if (!['auto', 'manual'].includes(save.settings.transmission)) save.settings.transmission = 'auto';
    if (!['chase', 'cockpit'].includes(save.settings.camera)) save.settings.camera = 'chase';
    if (!['kmh', 'mph'].includes(save.settings.units)) save.settings.units = 'kmh';
    if (!['clear', 'rain', 'fog', 'snow'].includes(save.lastRace.weather)) save.lastRace.weather = 'clear';
    if (!['sunset', 'night', 'dawn'].includes(save.lastRace.time)) save.lastRace.time = 'night';
    return save;
  } catch {
    console.warn('NIGHTSHIFT: save was unreadable, starting fresh');
    return defaultSave();
  }
}

// A car's garage entry, made or repaired as needed: its builds (each with a
// name, parts and a complete look) and which one is raced.
export function garageCar(save, car) {
  const cars = save.garage.cars;
  let c = cars[car.id];
  if (!c || !Array.isArray(c.builds) || !c.builds.length) c = cars[car.id] = { active: 0, builds: [newBuild(car, 'My build')] };
  // Repaired in place, so the garage can keep editing the same objects.
  c.builds = c.builds.slice(0, MAX_BUILDS).map((b, i) => {
    if (!b || typeof b !== 'object') b = {};
    if (!(typeof b.name === 'string' && b.name.trim())) b.name = `Build ${i + 1}`;
    b.name = b.name.slice(0, 20);
    if (!b.parts || typeof b.parts !== 'object') b.parts = {};
    b.look = Object.assign(b.look && typeof b.look === 'object' ? b.look : {}, checkLook(b.look, car));
    return b;
  });
  if (!(c.active >= 0 && c.active < c.builds.length)) c.active = 0;
  return c;
}

export function newBuild(car, name) {
  return { name, parts: {}, look: defaultLook(car) };
}

export function activeBuild(save, car) {
  const c = garageCar(save, car);
  return c.builds[c.active];
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage full or blocked */ }
}
