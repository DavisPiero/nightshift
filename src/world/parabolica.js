// Parabolica Street: a city ring road round a park, laid out like Monza at
// about 60% scale (3.4 km). Clockwise: the long main straight, a right-left
// chicane, the long Curva Grande, a left-right chicane, two right-handers
// (the Lesmos), the straight under the expressway, the fast Ascari wiggle,
// the back straight and the long Parabolica onto the main straight.
// The chicanes are opened up a little so they can be taken without stopping.
// Drawn as a turtle (see track-path.js); metres and degrees.

import { turtle } from './track-path.js';

export const PARABOLICA_TRACK = {
  name: 'Parabolica Street',
  theme: 'parabolica',
  halfWidth: 6.5,   // four lanes, 13 m of tarmac
  wall: 10,         // concrete blocks 3.5 m beyond the road edge (room to run wide)
  start: 200,
  patches: [[1880, 2100], [2420, 2700], [3250, 3550]], // under the expressway, the back straight, the main straight
  points: turtle([0, -200], 0, [
    ['S', 366],                                   // main straight (part one)
    ['R', 42, 36], ['S', 12], ['L', 42, 36],     // first chicane
    ['S', 85],
    ['R', 60, 220], ['S', 50], ['R', 50, 260], // Curva Grande
    ['S', 146],
    ['L', 38, 36], ['S', 10], ['R', 38, 36],     // second chicane
    ['S', 122],
    ['R', 50, 85],                                // Lesmo 1
    ['S', 134],
    ['R', 55, 67],                                // Lesmo 2
    ['S', 244], ['L', 8, 366], ['S', 244],       // under the expressway
    ['L', 30, 85], ['R', 45, 92], ['L', 15, 146], // Ascari
    ['S', 451],                                   // back straight
    ['R', 80, 110], ['R', 73, 183],               // Parabolica
    ['S', 468],                                   // main straight (part two)
  ]),
};
