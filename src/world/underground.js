// Underground: a loop of Tokyo-style expressway tunnel (think of the shield
// tunnels under Shinjuku). A long fast curve, a chicane where two bores meet, a
// tight junction loop and two long straights. Three narrow lanes, tiled walls,
// a round ceiling and rows of turquoise lights. 1.46 km and 10 m wide (Arlo's
// notes, 2026-11-01). Radii in metres.

import { turtle } from './track-path.js';

export const UNDERGROUND_TRACK = {
  name: 'Underground',
  theme: 'underground',
  halfWidth: 5,     // three lanes, 10 m of tarmac
  wall: 6.6,        // tunnel wall, beyond a walkway on each side
  start: 160,
  weathers: ['clear', 'fog'], // no rain or snow under the ground; fog is exhaust haze
  times: ['night'],           // no sky to see
  patches: [[540, 700]],      // a bank of haze through the chicane
  points: turtle([0, -130], 0, [
    ['S', 300],                 // main straight past the exits
    ['L', 95, 105],             // long sweeper
    ['S', 70],
    ['R', 30, 70], ['L', 30, 70], // chicane where the bores meet
    ['S', 40],
    ['L', 60, 90], ['R', 35, 80], // fast kink out to the junction
    ['L', 130, 48],             // the junction loop
    ['R', 25, 80],
    ['S', 366],                 // back under the city
    ['L', 135, 62],             // tight left onto the straight
  ]),
};
