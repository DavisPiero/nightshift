// Every track you can pick from Drive. Each has its centre-line definition
// and the TrackPath built from it (shared by the scenery, walls, minimap and
// later the checkpoints and AI).

import { TrackPath } from './track-path.js';
import { STARTER_TRACK } from './starter-track.js';
import { UNDERGROUND_TRACK } from './underground.js';

export const TRACKS = [
  {
    id: 'starter',
    name: 'Starter Track',
    blurb: 'A night loop round the harbour estate.',
    corners: 6,
    jp: 'スターター',
    def: STARTER_TRACK,
  },
  {
    id: 'underground',
    name: 'Underground',
    blurb: 'Expressway tunnels under Tokyo. Turquoise lights, long fast curves, a tight junction loop.',
    corners: 9,
    jp: 'アンダーグラウンド',
    def: UNDERGROUND_TRACK,
  },
];
for (const t of TRACKS) t.path = new TrackPath(t.def);

// Weathers a track allows (no rain falls in a tunnel).
export function trackWeathers(t) { return t.def.weathers || ['clear', 'rain', 'fog']; }

export function getTrack(id) {
  return TRACKS.find((t) => t.id === id) || TRACKS[0];
}
