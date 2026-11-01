// Every track you can pick from Drive. Each has its centre-line definition
// and the TrackPath built from it (shared by the scenery, walls, minimap and
// later the checkpoints and AI).

import { TrackPath } from './track-path.js';
import { STARTER_TRACK } from './starter-track.js';
import { UNDERGROUND_TRACK } from './underground.js';
import { PARABOLICA_TRACK } from './parabolica.js';
import { MOUNTAIN_TRACK } from './mountain.js';

export const TRACKS = [
  {
    id: 'starter',
    name: 'Starter Track',
    blurb: 'A short, quick loop round the harbour estate.',
    corners: 5,
    jp: 'スターター',
    stage: 'street',
    def: STARTER_TRACK,
  },
  {
    id: 'underground',
    name: 'Underground',
    blurb: 'Expressway tunnels under Tokyo. Turquoise lights, narrow lanes, a tight junction loop.',
    corners: 7,
    jp: 'アンダーグラウンド',
    stage: 'street',
    def: UNDERGROUND_TRACK,
  },
  {
    id: 'parabolica',
    name: 'Parabolica Street',
    blurb: 'A city ring road lined with cherry blossom, shaped like Monza. Long straights, two chicanes, the Lesmos and the long Parabolica.',
    corners: 11,
    jp: 'パラボリカ通り',
    stage: 'street',
    def: PARABOLICA_TRACK,
  },
  {
    id: 'mountain',
    name: 'Yamagiri Pass',
    blurb: 'A mountain road through cedar forest. Three hairpins up, a ridge under the shrine gates, and a long fast drop home.',
    corners: 14,
    jp: '山霧峠',
    stage: 'street',
    def: MOUNTAIN_TRACK,
  },
];
for (const t of TRACKS) t.path = new TrackPath(t.def);

// Weathers a track allows (no rain or snow falls in a tunnel).
export function trackWeathers(t) { return t.def.weathers || ['clear', 'rain', 'fog', 'snow']; }

export function getTrack(id) {
  return TRACKS.find((t) => t.id === id) || TRACKS[0];
}
