// Yamagiri Pass: a mountain road in cedar forest, in the spirit of a Japanese
// touge. It climbs through esses and three hairpins, runs along a high ridge
// under the shrine's red gates, and drops back in fast sweepers to the rest
// stop. 2.6 km, 9 m wide, hairpins no tighter than 27 m so eight cars get round.
// The road circles the mountain clockwise, so the rock is on your right and the
// drop on your left. The mountain is built round the road (mountain-scene.js).
// No Three.js here.

import { turtle } from './track-path.js';

const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, z, octaves = 4) {
  let v = 0, a = 0.5;
  for (let i = 0; i < octaves; i++) { v += a * noise(x, z); x = x * 2.03 + 17.1; z = z * 2.03 + 9.2; a *= 0.5; }
  return v;
}

export const MOUNTAIN_TRACK = {
  name: 'Yamagiri Pass',
  theme: 'mountain',
  halfWidth: 4.5,
  wall: 6,
  start: 120,
  heights: [[0, 12], [130, 14], [420, 38], [900, 84], [1290, 112], [1540, 108], [2000, 62], [2440, 14]],
  patches: [[1120, 1420], [2050, 2300]], // mist on the ridge and in the last sweepers
  points: turtle([0, 0], 0, [
    ['S', 170],                                 // the straight past the rest stop
    ['L', 28, 180], ['R', 46, 120], ['L', 30, 140], // climbing esses
    ['S', 80],
    ['R', 172, 27],                             // first hairpin
    ['S', 120], ['L', 24, 200], ['S', 60],
    ['L', 168, 28],                             // second hairpin
    ['S', 110], ['R', 38, 140], ['L', 22, 160],
    ['R', 150, 30],                             // third hairpin
    ['S', 90], ['L', 40, 110], ['R', 40, 120],
    ['S', 150],                                 // the ridge, under the gates
    ['R', 70, 90], ['S', 120], ['R', 46, 120], ['L', 40, 100], ['S', 90],
    ['R', 96, 70], ['S', 76], ['L', 30, 90], ['R', 90, 96],
  ]),
};
