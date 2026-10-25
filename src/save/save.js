// Saved game, in localStorage. Versioned, checked on load, and rebuilt from
// defaults if anything is missing or broken. Only plain data is stored,
// never Three.js objects or physics state.

const KEY = 'nightshift.save';
export const SAVE_VERSION = 1;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    platform: null,              // 'computer' | 'touch', null until chosen
    settings: {
      graphics: null,            // 'low' | 'medium' | 'high', null = pick from platform
      transmission: 'auto',
      assists: { steering: true, stability: true, drift: true },
      audio: { master: 0.8, engine: 1, effects: 0.8 },
      camera: 'chase',
    },
    garage: {
      selected: 'kaido-r',
      owned: ['kaido-r'],
      cars: { 'kaido-r': { paint: null, upgrades: {} } },
    },
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
    // Future versions migrate here before merging.
    const save = mergeChecked(defaultSave(), data);
    save.version = SAVE_VERSION;
    if (!['computer', 'touch', null].includes(save.platform)) save.platform = null;
    if (!['low', 'medium', 'high', null].includes(save.settings.graphics)) save.settings.graphics = null;
    if (!['auto', 'manual'].includes(save.settings.transmission)) save.settings.transmission = 'auto';
    if (!['chase', 'cockpit'].includes(save.settings.camera)) save.settings.camera = 'chase';
    return save;
  } catch {
    console.warn('NIGHTSHIFT: save was unreadable, starting fresh');
    return defaultSave();
  }
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage full or blocked */ }
}
