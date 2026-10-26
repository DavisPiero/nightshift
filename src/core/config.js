// Graphics presets. renderHeight is the internal resolution the scene is
// drawn at before being scaled up to the window (480 is PS2 territory).

export const GRAPHICS = {
  low:    { renderHeight: 360, shadows: false, lampLights: 4, drawDistance: 170, dither: true },
  medium: { renderHeight: 480, shadows: false, lampLights: 6, drawDistance: 220, dither: true },
  high:   { renderHeight: 720, shadows: true,  lampLights: 8, drawDistance: 280, dither: true },
};

// Low by default on every device: it is the look, not just the fast option.
export function defaultGraphicsFor() {
  return 'low';
}

// Effects that can be switched on and off in Settings > Graphics.
export const EFFECTS = {
  smoke: { label: 'Tyre smoke', hint: 'Smoke from sliding and spinning tyres.' },
  flames: { label: 'Exhaust flames', hint: 'Flames and pops from the exhaust when you lift off at high revs.' },
  skids: { label: 'Skid marks', hint: 'Dark marks left on the road by sliding tyres.' },
  sparks: { label: 'Sparks', hint: 'Sparks when the car scrapes a barrier.' },
  beams: { label: 'Headlight beams', hint: 'Visible beams of light from the headlights.' },
  glow: { label: 'Lamp glow', hint: 'Soft halos round lamps and lights.' },
  reflections: { label: 'Wet reflections', hint: 'Lamps reflected in the road when it rains.' },
  dither: { label: 'Dither', hint: 'The fine pixel pattern of an old console.' },
  shadows: { label: 'Shadows', hint: 'Real shadows from the moon. Slower, best on a computer.' },
};
export const DEFAULT_EFFECTS = {
  smoke: true, flames: true, skids: true, sparks: true,
  beams: true, glow: true, reflections: true, dither: true, shadows: false,
};

// URL switches for testing: ?mute silences sound, ?device=computer|touch
// skips the menus and drives straight away, ?weather=rain|fog picks the
// weather, ?time=sunset|night|dawn the time of day, ?track=underground picks the track, ?car=<id> the car,
// ?screen=tracks|setup|garage opens a menu screen, ?library opens the asset
// library (&asset=<id> picks one, &worklight lights it up), ?smoke runs the automatic
// load-and-drive check and ?shot runs the loop on a timer for headless
// screenshots (tools/shot.sh).
const params = new URLSearchParams(location.search);
export const URL_FLAGS = {
  mute: params.has('mute') || params.has('smoke'),
  device: params.get('device'),
  weather: params.get('weather'),
  time: params.get('time'),
  smoke: params.has('smoke'),
  debug: params.has('debug'),
  track: params.get('track'),
  car: params.get('car'),
  screen: params.get('screen'),
  shot: params.has('shot'),
  library: params.has('library'),
  asset: params.get('asset'),
  worklight: params.has('worklight'),
};
