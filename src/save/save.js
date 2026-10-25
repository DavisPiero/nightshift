// Saved game, in localStorage. Versioned, checked on load, and rebuilt from
// defaults if anything is missing or broken. Only plain data is stored,
// never Three.js objects or physics state.

import { DEFAULT_KEYS } from '../input/keyboard.js';
import { DEFAULT_TOUCH } from '../input/touch.js';
import { DEFAULT_EFFECTS } from '../core/config.js';

const KEY = 'nightshift.save';
export const SAVE_VERSION = 2;

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
      // Audio
      audio: { master: 0.8, engine: 1, effects: 0.8, ambience: 0.7 },
      // Controls
      keys: structuredClone(DEFAULT_KEYS),
      touch: structuredClone(DEFAULT_TOUCH),
    },
    garage: {
      selected: 'skyliner-r34',
      owned: ['skyliner-r34'],
      cars: { 'skyliner-r34': { paint: null, upgrades: {} } },
    },
    lastRace: { track: 'starter', weather: 'clear' },
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
    save.version = SAVE_VERSION;
    if (!['computer', 'touch', null].includes(save.platform)) save.platform = null;
    if (!['low', 'medium', 'high', null].includes(save.settings.graphics)) save.settings.graphics = null;
    if (!['auto', 'manual'].includes(save.settings.transmission)) save.settings.transmission = 'auto';
    if (!['chase', 'cockpit'].includes(save.settings.camera)) save.settings.camera = 'chase';
    if (!['kmh', 'mph'].includes(save.settings.units)) save.settings.units = 'kmh';
    if (!['clear', 'rain', 'fog'].includes(save.lastRace.weather)) save.lastRace.weather = 'clear';
    return save;
  } catch {
    console.warn('NIGHTSHIFT: save was unreadable, starting fresh');
    return defaultSave();
  }
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage full or blocked */ }
}
