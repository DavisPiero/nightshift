// Saved game, in localStorage. Versioned, checked on load, and rebuilt from
// defaults if anything is missing or broken. Only plain data is stored,
// never Three.js objects or physics state.

import { DEFAULT_KEYS } from '../input/keyboard.js';
import { DEFAULT_TOUCH } from '../input/touch.js';
import { DEFAULT_EFFECTS } from '../core/config.js';
import { checkLook } from '../vehicles/looks.js';

const KEY = 'nightshift.save';
export const SAVE_VERSION = 6;

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
      selected: 'impreza-gc8',
      owned: ['impreza-gc8'],
      cars: {},                  // per car id: { look }
    },
    career: {
      cr: 0,                     // money
      xp: 0,                     // experience; the level comes from it (career.js)
      difficulty: 'normal',      // the last difficulty picked
      done: {},                  // per event id: best place
      tracks: ['starter'],       // tracks played, so open in Race
      seen: [],                  // story scenes already shown
    },
    lastRace: { track: 'starter', weather: 'clear', time: 'night', laps: 3, difficulty: 'normal', rivals: 7 },
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
    // Cars that have left the game (David, 2026-10-31): the Impreza takes over.
    for (const gone of ['miata-na', 'gtar-r35', 'aventadoro-sv']) {
      if (save.garage.selected === gone) save.garage.selected = 'impreza-gc8';
      save.garage.owned = [...new Set(save.garage.owned.map((id) => (id === gone ? 'impreza-gc8' : id)))];
      delete save.garage.cars[gone];
      delete save.settings.feel[gone];
    }
    // Version 6 is the career (David, 2026-10-31): everyone starts again with
    // the Impreza. Builds and parts are gone; each car keeps the look of the
    // build it was racing, for when you buy it.
    if (data.version < SAVE_VERSION) {
      for (const [id, c] of Object.entries(save.garage.cars)) {
        const b = c?.builds?.[c.active] || c?.builds?.[0];
        save.garage.cars[id] = { look: c?.look || b?.look || {} };
      }
      save.garage.selected = 'impreza-gc8';
      save.garage.owned = ['impreza-gc8'];
      save.lastRace.track = 'starter';
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

// A car's look, made or repaired as needed. Repaired in place, so the garage
// can keep editing the same object.
export function carLook(save, car) {
  const cars = save.garage.cars;
  const c = cars[car.id] && typeof cars[car.id] === 'object' ? cars[car.id] : (cars[car.id] = {});
  c.look = Object.assign(c.look && typeof c.look === 'object' ? c.look : {}, checkLook(c.look, car));
  return c.look;
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage full or blocked */ }
}
