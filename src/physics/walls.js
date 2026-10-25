// Keeps a car between the barriers on either side of a TrackPath.
// Returns { index, offset, impact } so callers can reuse the track lookup
// (lap timing, resets) and play a sound on a hard hit.

export function keepOnTrack(vehicle, track, hint) {
  const near = track.nearest(vehicle.x, vehicle.z, hint);
  const i = near.index;
  // How far the car's corners stick out sideways depends on its angle to the road.
  const rel = vehicle.heading - track.headingAt(i);
  const s = vehicle.spec;
  const extent = Math.abs(s.halfWidth * Math.cos(rel)) + Math.abs(s.halfLength * Math.sin(rel)) * 0.85;
  const limit = track.wall - extent;
  let impact = 0;
  if (Math.abs(near.offset) > limit) {
    const side = Math.sign(near.offset); // +1 = past the left wall
    const nx = -side * track.leftX(i), nz = -side * track.leftZ(i);
    impact = vehicle.collide(nx, nz, Math.abs(near.offset) - limit);
  }
  return { index: i, offset: near.offset, impact };
}
