// Keeps a car between the barriers on either side of a TrackPath.
// The car's body is tested at eight points round its outline (four corners,
// the middle of each side, nose and tail), so any part of the body can touch
// a wall, and a hit off the car's centre turns it the way a real knock would.
// Returns { index, offset, impact, contact } so callers can reuse the track
// lookup (lap timing, resets) and play a sound or throw sparks on a hit.

// Body outline in car space, as [sideways (+ left), forward] fractions of
// the half width and half length. The corners are pulled in a little, like
// a real car's rounded bumpers.
const OUTLINE = [
  [0.92, 0.97], [-0.92, 0.97], [0.92, -0.97], [-0.92, -0.97],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

export function keepOnTrack(vehicle, track, hint) {
  const near = track.nearest(vehicle.x, vehicle.z, hint);
  const s = vehicle.spec;
  let impact = 0;
  let contact = null;
  // Two passes: one hit can push another point into the other wall in a
  // narrow spot, so settle a second time.
  for (let pass = 0; pass < 2; pass++) {
    const fx = Math.sin(vehicle.heading), fz = Math.cos(vehicle.heading);
    const lx = fz, lz = -fx;
    let worst = 0, worstPoint = null;
    for (const [a, b] of OUTLINE) {
      const rx = lx * a * s.halfWidth + fx * b * s.halfLength;
      const rz = lz * a * s.halfWidth + fz * b * s.halfLength;
      const px = vehicle.x + rx, pz = vehicle.z + rz;
      const p = track.nearest(px, pz, near.index);
      const over = Math.abs(p.offset) - track.wall;
      if (over > worst) { worst = over; worstPoint = { rx, rz, px, pz, i: p.index, side: Math.sign(p.offset) }; }
    }
    if (!worstPoint) break;
    const { i, side } = worstPoint;
    const nx = -side * track.leftX(i), nz = -side * track.leftZ(i); // back toward the road
    impact = Math.max(impact, vehicle.collide(nx, nz, worst, worstPoint.rx, worstPoint.rz));
    contact = { x: worstPoint.px, z: worstPoint.pz, nx, nz };
  }
  return { index: near.index, offset: near.offset, impact, contact };
}
