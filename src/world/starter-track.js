// The Starter Track: one closed loop through a harbour industrial estate.
// A long straight, a fast sweeper, an S-bend, a kink and one tight corner.
// Points are in metres, in driving order; the start line is on the straight.

export const STARTER_TRACK = {
  name: 'Starter Track',
  halfWidth: 6,     // 12 m of tarmac
  wall: 9.5,        // barriers 3.5 m beyond the road edge
  start: 30,        // sample index of the start line
  patches: [[430, 650], [1300, 1480]], // heavier weather: the sweeper, the back straight
  points: [
    [0, -170], [0, -60], [0, 60], [0, 180],           // main straight
    [20, 290], [100, 360], [215, 380], [320, 340],    // long sweeper
    [370, 255], [355, 165], [290, 120], [265, 50],    // S-bend
    [300, -20], [365, -70], [380, -160],              // kink
    [345, -235], [260, -255], [150, -265],            // back straight
    [70, -290], [20, -265],                           // tight corner onto the straight
  ],
};
