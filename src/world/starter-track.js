// The Starter Track: one short closed loop through a harbour industrial estate,
// made for slow cars: long open corners you can stay flat through, a quick
// right-left, a back straight and one tight corner onto the main straight.
// 1.2 km and 9 m wide (Arlo's notes, 2026-11-01). Radii in metres.

import { turtle } from './track-path.js';

export const STARTER_TRACK = {
  name: 'Starter Track',
  halfWidth: 4.5,   // 9 m of tarmac
  wall: 7,          // barriers 2.5 m beyond the road edge
  start: 130,       // sample index of the start line
  patches: [[270, 450], [830, 1050]], // heavier weather: the sweeper, the back straight
  points: turtle([0, -130], 0, [
    ['S', 260],                 // main straight
    ['L', 130, 85],             // long sweeper
    ['S', 30],
    ['R', 40, 90], ['L', 65, 75], // the right-left
    ['S', 90],
    ['L', 85, 70],              // onto the back straight
    ['S', 240],                 // back straight
    ['L', 120, 58],             // tight corner onto the straight
  ]),
};
