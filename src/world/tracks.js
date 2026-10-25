// Every track you can pick from Drive. Each has its centre-line definition
// and the TrackPath built from it (shared by the scenery, walls, minimap and
// later the checkpoints and AI).

import { TrackPath } from './track-path.js';
import { STARTER_TRACK } from './starter-track.js';

export const TRACKS = [
  {
    id: 'starter',
    name: 'Starter Track',
    blurb: 'A night loop round the harbour estate.',
    corners: 6,
    def: STARTER_TRACK,
  },
];
for (const t of TRACKS) t.path = new TrackPath(t.def);

export function getTrack(id) {
  return TRACKS.find((t) => t.id === id) || TRACKS[0];
}
