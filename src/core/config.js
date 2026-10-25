// Graphics presets. renderHeight is the internal resolution the scene is
// drawn at before being scaled up to the window (480 is PS2 territory).

export const GRAPHICS = {
  low:    { renderHeight: 360, shadows: false, lampLights: 3, drawDistance: 150, dither: true },
  medium: { renderHeight: 480, shadows: false, lampLights: 5, drawDistance: 210, dither: true },
  high:   { renderHeight: 720, shadows: true,  lampLights: 8, drawDistance: 280, dither: true },
};

export function defaultGraphicsFor(platform) {
  return platform === 'touch' ? 'low' : 'medium';
}

// URL switches for testing: ?mute silences sound, ?device=computer|touch
// skips the platform screen, ?smoke runs the automatic load-and-drive check.
const params = new URLSearchParams(location.search);
export const URL_FLAGS = {
  mute: params.has('mute') || params.has('smoke'),
  device: params.get('device'),
  smoke: params.has('smoke'),
  debug: params.has('debug'),
};
