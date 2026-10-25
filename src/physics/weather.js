// Weather as the tyres feel it. One table read by the physics, the bench,
// the race setup screen and the visuals (src/world/weather.js).
//  grip: multiplies tyre friction (braking and cornering)
//  slide: multiplies the grip left when a tyre is fully sideways
//  fogNear/fogFar: how far you can see (metres); null keeps the graphics preset

export const WEATHER = {
  clear: {
    name: 'Clear', grip: 1, slide: 1, fogNear: 25, fogFar: null,
    note: 'Dry road, full grip.',
  },
  rain: {
    name: 'Rain', grip: 0.74, slide: 0.9, fogNear: 18, fogFar: 150,
    note: 'Wet road: about a quarter less grip. Brake early, the tail steps out sooner.',
  },
  fog: {
    name: 'Fog', grip: 0.93, slide: 0.97, fogNear: 6, fogFar: 70,
    note: 'Thick fog and a damp road. You see much less ahead.',
  },
};

export function applyWeather(vehicle, id) {
  const w = WEATHER[id] || WEATHER.clear;
  vehicle.surface.grip = w.grip;
  vehicle.surface.slide = w.slide;
  return w;
}
