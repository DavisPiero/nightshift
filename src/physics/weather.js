// Weather as the tyres feel it. One table read by the physics, the bench,
// the race setup screen and the visuals (src/world/weather.js).
//  grip: multiplies tyre friction (braking and cornering)
//  slide: multiplies the grip left when a tyre is fully sideways
//  fogNear/fogFar: how far you can see (metres); null keeps the graphics preset
//  patch: inside a weather patch (fixed stretches of each track, see
//    TrackPath.patchAt) the weather gets heavier: these numbers take over,
//    eased in and out over 30 m so grip never snaps. Clear has no patches.

export const WEATHER = {
  clear: {
    name: 'Clear', grip: 1, slide: 1, fogNear: 25, fogFar: null,
    note: 'Dry road, full grip.',
  },
  rain: {
    name: 'Rain', grip: 0.74, slide: 0.9, fogNear: 18, fogFar: 150,
    patch: { grip: 0.66, slide: 0.86, fogFar: 85, fall: 2 },
    note: 'Wet road: about a quarter less grip. Brake early, the tail steps out sooner. Watch for downpours.',
  },
  fog: {
    name: 'Fog', grip: 0.93, slide: 0.97, fogNear: 6, fogFar: 70,
    patch: { grip: 0.93, slide: 0.97, fogFar: 32, fall: 1 },
    note: 'Thick fog and a damp road. You see much less ahead, and less still in the fog banks.',
  },
  snow: {
    name: 'Snow', grip: 0.68, slide: 0.86, fogNear: 12, fogFar: 125,
    patch: { grip: 0.62, slide: 0.82, fogFar: 60, fall: 2.5 },
    note: 'Snow on the road: grip is low and slides last longer. Gentle on the throttle, brake early.',
  },
};

// Grip for this weather, k of the way into a patch (0 outside, 1 inside).
export function applyWeather(vehicle, id, k = 0) {
  const w = WEATHER[id] || WEATHER.clear;
  const p = w.patch || w;
  vehicle.surface.grip = w.grip + (p.grip - w.grip) * k;
  vehicle.surface.slide = w.slide + (p.slide - w.slide) * k;
  return { ...w, grip: vehicle.surface.grip };
}
