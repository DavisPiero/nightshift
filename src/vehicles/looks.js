// How a car looks, apart from its parts: paint colour and finish, a decal,
// the wheels and the ride height. A build (see save.js) holds one `look`.
// Ride height is the one look that touches the physics: a lower car has a
// lower centre of gravity (see tuning.js). Everything else is paint.

// Paint colours anyone can pick, as well as each car's own factory colours.
export const PALETTE = [
  [0xeeeeea, 'Chalk White'], [0xb8bcc0, 'Silver'], [0x5e6366, 'Gun Grey'], [0x111214, 'Night Black'],
  [0x8a1418, 'Crimson'], [0xd8261e, 'Signal Red'], [0xe0561a, 'Sunset Orange'], [0xe8b81e, 'Taxi Yellow'],
  [0x7ec81e, 'Lime'], [0x1e6a3a, 'Racing Green'], [0x1a8c8a, 'Teal'], [0x3ff0e8, 'Neon Turquoise'],
  [0x1d3f7a, 'Midnight Blue'], [0x2a6ad8, 'Electric Blue'], [0x5a2a8a, 'Purple'], [0xff2e88, 'Hot Pink'],
];

// Finishes set the paint material (see paintMaterial in car-model.js).
export const FINISHES = {
  gloss:    { name: 'Gloss',    metalness: 0.08, roughness: 0.32, clearcoat: 1, iridescence: 0 },
  metallic: { name: 'Metallic', metalness: 0.4,  roughness: 0.4,  clearcoat: 1, iridescence: 0 },
  pearl:    { name: 'Pearl',    metalness: 0.25, roughness: 0.3,  clearcoat: 1, iridescence: 0.7 },
  matte:    { name: 'Matte',    metalness: 0.05, roughness: 0.85, clearcoat: 0, iridescence: 0 },
};

// Decals, laid on the body so they follow its curves (see car-model.js).
export const DECALS = {
  none:    { name: 'None' },
  stripes: { name: 'Twin stripes', info: 'over the bonnet, roof and boot' },
  side:    { name: 'Side stripe', info: 'along both sides' },
  number:  { name: 'Race number', info: 'a roundel on each door' },
  kanji:   { name: '走り屋 sticker', info: '"street racer", on the rear quarters' },
};
export const DECAL_COLOURS = [[0xf2f2ee, 'White'], [0x111214, 'Black'], [0xd8261e, 'Red'], [0xe8b81e, 'Yellow'], [0x3ff0e8, 'Turquoise'], [0xff2e88, 'Pink']];

// Wheel faces (painted in textures.js) and colours.
export const RIMS = {
  five:  { name: 'Five-spoke' },
  six:   { name: 'Six-spoke' },
  ten:   { name: 'Ten-spoke' },
  split: { name: 'Split five' },
  mesh:  { name: 'Mesh' },
  dish:  { name: 'Deep dish' },
};
export const RIM_COLOURS = [[null, 'Stock'], [0xc8ccd0, 'Silver'], [0x2a2b2d, 'Black'], [0xb89a4a, 'Bronze'], [0xe8e8e4, 'White'], [0xd8261e, 'Red']];
export const CALIPER_COLOURS = [[null, 'Stock'], [0xb01818, 'Red'], [0xc89a2a, 'Gold'], [0x1a6ad8, 'Blue'], [0x3ff0e8, 'Turquoise'], [0x2a2b2d, 'Black']];

// Ride height: how far the body drops (m). Slammed needs coilovers.
export const RIDE = {
  stock:   { name: 'Stock', drop: 0 },
  low:     { name: 'Low', drop: 0.03, info: '3 cm down' },
  slammed: { name: 'Slammed', drop: 0.06, info: '6 cm down, needs coilovers' },
};

// A look with every field filled in. null colours mean "the car's own".
export function defaultLook(car) {
  return { paint: car?.paint ?? 0xeeeeea, finish: 'metallic', decal: car?.stripes ? 'stripes' : 'none', decalColour: car?.stripes ?? 0xf2f2ee, rim: null, rimColour: null, caliper: null, ride: 'stock' };
}

// Fill in anything missing or unknown, so an old save can never break a car.
export function checkLook(look, car) {
  const d = defaultLook(car);
  const l = { ...d, ...(look && typeof look === 'object' ? look : {}) };
  if (typeof l.paint !== 'number') l.paint = d.paint;
  if (!FINISHES[l.finish]) l.finish = d.finish;
  if (!DECALS[l.decal]) l.decal = 'none';
  if (typeof l.decalColour !== 'number') l.decalColour = d.decalColour;
  if (l.rim !== null && !RIMS[l.rim]) l.rim = null;
  if (l.rimColour !== null && typeof l.rimColour !== 'number') l.rimColour = null;
  if (l.caliper !== null && typeof l.caliper !== 'number') l.caliper = null;
  if (!RIDE[l.ride]) l.ride = 'stock';
  return l;
}
