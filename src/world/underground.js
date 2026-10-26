// Underground: a loop of Tokyo-style expressway tunnel (think of the shield
// tunnels under Shinjuku). Long fast curves, a chicane where two bores meet,
// a tight junction loop and a long straight past the exits. Three lanes,
// tiled walls, a round ceiling and rows of turquoise lights.
// Points are in metres, in driving order; the start line is on the straight.

export const UNDERGROUND_TRACK = {
  name: 'Underground',
  theme: 'underground',
  halfWidth: 6.3,   // three lanes, 12.6 m of tarmac
  wall: 8.2,        // tunnel wall, beyond a walkway on each side
  start: 40,
  weathers: ['clear', 'fog'], // no rain or snow under the ground; fog is exhaust haze
  times: ['night'],           // no sky to see
  points: [
    [0, -260], [0, -130], [0, 0], [0, 130], [0, 260],      // main straight past the exits
    [25, 370], [100, 440], [210, 460], [320, 420],          // long right sweeper
    [390, 340], [410, 250],                                  // run down the east side
    [392, 175], [412, 115], [394, 55],                       // chicane where the bores meet
    [400, -20], [440, -90], [490, -150],                    // fast kink out to the junction
    [530, -230], [520, -320], [450, -365], [375, -335],     // the junction loop
    [310, -305], [230, -340], [150, -375],                  // back under the city
    [65, -395], [10, -345],                                 // tight left onto the straight
  ],
};
