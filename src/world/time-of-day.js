// Time of day: Sunset, Night or Dawn. It changes only the light (sky, fog
// colour, the sky light, the low sun or the moon, how strong the lamps look),
// never the physics. Night is each track's own look, unchanged; Sunset and
// Dawn tint it. The street lamps stay on at both, so it is still a night game,
// just at the edges of the night.

import { Tex } from '../graphics/textures.js';

export const TIMES = {
  sunset: {
    name: 'Sunset', jp: '夕暮れ', clock: '18:40',
    fog: 0x3c2a3e, fogMix: 0.8,            // distance fades to dusky violet
    hemi: [0x9a7aa0, 0x3a2a22], hemiPower: 1.25,
    sun: { colour: 0xff9a58, power: 1.3, dir: [-80, 22, 18] }, // low in the west
    lamps: 0.8, glow: 0.85,
    reflectBg: 0x4a3046,
    sky: [[0, '#16163a'], [0.45, '#3e2c58'], [0.72, '#a8506a'], [0.86, '#f08a4a'], [0.93, '#ffb060'], [1, '#3a2018']],
  },
  night: { name: 'Night', jp: '夜', clock: '02:00' },
  dawn: {
    name: 'Dawn', jp: '夜明け', clock: '05:10',
    fog: 0x46586a, fogMix: 0.78,           // cold blue-grey haze
    hemi: [0x8aa2c0, 0x2a3036], hemiPower: 1.2,
    sun: { colour: 0xffc4a0, power: 0.85, dir: [80, 18, -30] }, // low in the east
    lamps: 0.7, glow: 0.75,
    reflectBg: 0x4a5a6c,
    sky: [[0, '#14223e'], [0.45, '#3a5476'], [0.74, '#8aa0b4'], [0.87, '#f0c09a'], [0.93, '#ffd6a8'], [1, '#30343a']],
  },
};

export const TIME_IDS = Object.keys(TIMES);
const NIGHT_SUN = { colour: 0x8090b0, dir: [-40, 80, -30] };

// Times a track allows (a tunnel has no sky).
export function trackTimes(t) { return t.def.times || TIME_IDS; }

function mixHex(a, b, k) {
  const ch = (c, s) => (c >> s) & 255;
  const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * k);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

// A track's own (night) look, as it is at this time.
export function timeLook(base, id) {
  const t = TIMES[id] || TIMES.night;
  const look = { ...base, sun: { colour: NIGHT_SUN.colour, power: base.moon, dir: NIGHT_SUN.dir }, lampScale: 1, glow: 1, sky: Tex.skyGlow() };
  if (!t.sky) return look;
  look.fog = Object.fromEntries(Object.entries(base.fog).map(([w, c]) => [w, mixHex(c, t.fog, t.fogMix)]));
  look.hemi = [t.hemi[0], t.hemi[1], (base.hemi[2] ?? 1) * t.hemiPower];
  look.sun = { ...t.sun };
  look.lampScale = t.lamps;
  look.glow = t.glow;
  look.reflectBg = t.reflectBg;
  look.sky = Tex.skyGradient(id, t.sky);
  look.skyTop = parseInt(t.sky[0][1].slice(1), 16); // overhead, above the sky band
  return look;
}
