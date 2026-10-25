// The numbers physics actually drives with: the stock car, then the parts
// fitted in the current build (src/vehicles/parts.js), then any Feel panel
// settings on top. Physics only ever sees the result.

import { applyParts } from './parts.js';
import { RIDE } from './looks.js';

// Feel panel sliders. Each one edits a car-spec number; `camera` ones edit
// the camera instead. Ranges are wide on purpose: this is for finding taste.
export const FEEL = [
  { key: 'torqueScale', label: 'Power', min: 0.6, max: 1.6, step: 0.05, def: 1 },
  { key: 'throttleResponse', label: 'Throttle response', min: 4, max: 20, step: 0.5 },
  { key: 'brakeForce', label: 'Brakes', min: 8000, max: 26000, step: 500 },
  { key: 'liftOffDrag', label: 'Lift-off slowing', min: 0, max: 2, step: 0.05 },
  { key: 'tireGrip', label: 'Grip', min: 0.8, max: 1.4, step: 0.01 },
  { key: 'rearGripScale', label: 'Rear grip (lower slides more)', min: 0.9, max: 1.2, step: 0.01 },
  { key: 'handbrakeRearGrip', label: 'Handbrake slide (lower slides more)', min: 0.15, max: 0.6, step: 0.01 },
  { key: 'steerSpeed', label: 'Steering speed', min: 1.5, max: 6, step: 0.1 },
  { key: 'rollScale', label: 'Body lean', min: 0, max: 0.012, step: 0.0005 },
  { key: 'pitchScale', label: 'Brake dive', min: 0, max: 0.012, step: 0.0005 },
  { key: 'squatShare', label: 'Launch squat', min: 0, max: 1.5, step: 0.05, def: 0.6 },
  { key: 'shiftKick', label: 'Gear-change nod', min: 0, max: 0.8, step: 0.05, def: 0.25 },
  { key: 'suspensionDamping', label: 'Settle (lower bounces more)', min: 3, max: 15, step: 0.5 },
  { key: 'speedFov', label: 'Camera: speed widening', min: 0, max: 30, step: 1, camera: true },
  { key: 'gLag', label: 'Camera: pull on accel/brake', min: 0, max: 2, step: 0.05, camera: true },
  { key: 'shakeScale', label: 'Camera: shake', min: 0, max: 2, step: 0.05, camera: true },
];

// base: a car from cars.js. build: { parts: { slot: partId }, look }. feel: { key: value }.
export function buildSpec(base, build, feel = {}) {
  const s = applyParts(base, build?.parts || {});
  // A lower car has a lower centre of gravity: a little less weight transfer.
  const drop = RIDE[build?.look?.ride]?.drop || 0;
  s.rideDrop = drop;
  s.cgHeight -= drop * 0.8;
  for (const f of FEEL) if (!f.camera && feel[f.key] !== undefined) s[f.key] = feel[f.key];
  // Lean and dive limits follow their strength, so the body never touches the road.
  if (feel.rollScale !== undefined) s.maxRoll = Math.min(0.09, feel.rollScale * 13.75);
  if (feel.pitchScale !== undefined) s.maxPitch = Math.min(0.07, feel.pitchScale * 9);
  return s;
}
