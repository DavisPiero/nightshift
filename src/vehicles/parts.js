// Upgrade parts, in the spirit of Forza: each slot has a few levels, and most
// parts trade one thing for another. A part is a small function that returns
// a changed copy of the car's numbers; nothing else knows how it works.
// Wings, body kits, big brakes, loud exhausts and stripped interiors also
// show on the model (car-model.js); paint, wheels and ride height are looks
// (looks.js).
//
// Rough real-world guides used for the numbers:
//  - intake/exhaust: +3-6% power each, exhausts shed 5-10 kg
//  - ECU remap: +6-10% on a turbo car (more boost), less on a big V8
//  - bigger turbo: +25-40% at the top, slower to spool (more lag)
//  - supercharger on a V8: +25-35% everywhere, ~20 kg
//  - weight: stripped interiors take 50-150 kg out
//  - semi-slick tyres: ~15% more grip, let go more suddenly
//  - big brake kits: ~20-30% more stopping power, a little less unsprung weight
//  - coilovers: less body roll, sharper turn-in, a bit more nervous
//  - short gears: quicker acceleration, lower top speed
//  - wings/aero: grip at speed, a little top speed lost to drag
//  - 4WD conversion: much better launches and traction, harder to drift

const scaleCurve = (curve, fn) => curve.map(([rpm, nm]) => [rpm, nm * fn(rpm)]);

// slot -> { label, tab, options: [{ id, name, info, apply(spec) }] }
export const SLOTS = {
  intake: {
    label: 'Intake', tab: 'engine',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'sport', name: 'Sport intake', info: '+4% power', apply: (s) => { s.torqueCurve = scaleCurve(s.torqueCurve, () => 1.04); } },
      { id: 'race', name: 'Race intake', info: '+8% power up high, a touch less low down',
        apply: (s) => { s.torqueCurve = scaleCurve(s.torqueCurve, (r) => (r > 4000 ? 1.09 : 0.99)); } },
    ],
  },
  exhaust: {
    label: 'Exhaust', tab: 'engine',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'sport', name: 'Sport exhaust', info: '+4% power, louder, -5 kg', apply: (s) => { s.torqueCurve = scaleCurve(s.torqueCurve, () => 1.04); s.mass -= 5; s.exhaustVolume = 1.25; s.pops = 1.3; } },
      { id: 'race', name: 'Straight-through', info: '+7% power, very loud, more pops, -9 kg',
        apply: (s) => { s.torqueCurve = scaleCurve(s.torqueCurve, () => 1.07); s.mass -= 9; s.exhaustVolume = 1.5; s.pops = 1.8; } },
    ],
  },
  ecu: {
    label: 'Engine tune', tab: 'engine',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'stage1', name: 'Stage 1 remap', info: '+7% power, revs 200 higher',
        apply: (s) => { s.torqueCurve = scaleCurve(s.torqueCurve, () => (s.turbo ? 1.08 : 1.05)); s.redline += 200; s.limiterRpm += 200; s.autoUpshiftRpm += 200; } },
      { id: 'stage2', name: 'Stage 2 remap', info: '+13% power, revs 400 higher',
        apply: (s) => { s.torqueCurve = scaleCurve(s.torqueCurve, () => (s.turbo ? 1.15 : 1.09)); s.redline += 400; s.limiterRpm += 400; s.autoUpshiftRpm += 400; } },
    ],
  },
  induction: {
    label: 'Turbo / supercharger', tab: 'engine',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'big', name: 'Big turbo', info: '+28% power at the top, more lag, louder flutter', turboOnly: true,
        apply: (s) => {
          s.torqueCurve = scaleCurve(s.torqueCurve, (r) => (r < 3500 ? 0.97 : 1.28));
          s.turbo = { ...s.turbo, spoolRpm: s.turbo.spoolRpm + 700, lag: s.turbo.lag * 1.5, share: 0.4 };
        } },
      { id: 'twin', name: 'Twin big turbos', info: '+40% power at the top, lots of lag', turboOnly: true,
        apply: (s) => {
          s.torqueCurve = scaleCurve(s.torqueCurve, (r) => (r < 4000 ? 0.9 : 1.4));
          s.turbo = { ...s.turbo, spoolRpm: s.turbo.spoolRpm + 1500, lag: s.turbo.lag * 2.4, share: 0.5 };
          s.mass += 12;
        } },
      { id: 'super', name: 'Supercharger', info: '+30% power everywhere, +20 kg, a whine', naOnly: true,
        apply: (s) => { s.torqueCurve = scaleCurve(s.torqueCurve, () => 1.3); s.mass += 20; s.whine = true; } },
      { id: 'tt', name: 'Twin-turbo kit', info: '+45% power up high, lag, +35 kg', naOnly: true,
        apply: (s) => {
          s.torqueCurve = scaleCurve(s.torqueCurve, (r) => (r < 3500 ? 1.0 : 1.45));
          s.turbo = { spoolRpm: 3200, lag: 0.6, share: 0.35 };
          s.mass += 35;
        } },
    ],
  },
  weight: {
    label: 'Weight reduction', tab: 'chassis',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'street', name: 'Street', info: '-55 kg: spare wheel, sound deadening', apply: (s) => { s.mass -= 55; } },
      { id: 'race', name: 'Stripped', info: '-140 kg: no rear seats, thin glass', apply: (s) => { s.mass -= 140; s.stripped = true; } },
    ],
  },
  tyres: {
    label: 'Tyres', tab: 'chassis',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'sport', name: 'Sport', info: '+7% grip', apply: (s) => { s.tireGrip *= 1.07; } },
      { id: 'semi', name: 'Semi-slick', info: '+16% grip, but lets go more suddenly',
        apply: (s) => { s.tireGrip *= 1.16; s.slideGrip *= 0.9; s.slipPeak *= 0.9; } },
      { id: 'drift', name: 'Drift', info: '-8% grip, the tail slides easily and holds a drift',
        apply: (s) => { s.tireGrip *= 0.92; s.rearGripScale = Math.max(0.96, s.rearGripScale - 0.1); s.slideGrip = Math.min(0.95, s.slideGrip * 1.12); } },
    ],
  },
  brakes: {
    label: 'Brakes', tab: 'chassis',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'sport', name: 'Sport pads and discs', info: '+15% stopping power', apply: (s) => { s.brakeForce *= 1.15; } },
      { id: 'race', name: 'Big brake kit', info: '+28% stopping power, -4 kg', apply: (s) => { s.brakeForce *= 1.28; s.mass -= 4; s.bigBrakes = true; } },
    ],
  },
  suspension: {
    label: 'Suspension', tab: 'chassis',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'sport', name: 'Sport springs', info: 'less lean, +3% grip, sharper turn-in',
        apply: (s) => { s.rollScale *= 0.6; s.tireGrip *= 1.03; s.steerSpeed *= 1.08; } },
      { id: 'race', name: 'Coilovers', info: 'barely leans, +6% grip, quick and a bit nervous',
        apply: (s) => { s.rollScale *= 0.35; s.pitchScale *= 0.6; s.tireGrip *= 1.06; s.steerSpeed *= 1.16; s.yawInertiaScale *= 0.92; s.coilovers = true; } },
    ],
  },
  gearing: {
    label: 'Gearing', tab: 'drivetrain',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'short', name: 'Close-ratio gears', info: 'quicker acceleration and snappier shifts, lower top speed',
        apply: (s) => { s.finalDrive *= 1.1; s.shiftTime *= 0.6; } },
      { id: 'long', name: 'Long final drive', info: 'higher top speed, slower off the line', apply: (s) => { s.finalDrive *= 0.88; } },
    ],
  },
  drivetrain: {
    label: 'Drivetrain', tab: 'drivetrain',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'awd', name: 'Four-wheel drive', info: 'big launches and traction, harder to drift, +60 kg',
        apply: (s) => { s.drivetrain = 'awd'; s.frontTorqueShare = 0.35; s.mass += 60; } },
    ],
  },
  aero: {
    label: 'Rear wing', tab: 'body',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'none', name: 'No wing', info: 'less drag, less grip at speed', apply: (s) => { s.downforce *= 0.3; s.dragCoefficient -= 0.01; s.wing = 'none'; } },
      { id: 'gt', name: 'GT wing', info: 'lots of grip at speed, a little more drag',
        apply: (s) => { s.downforce += 0.9; s.dragCoefficient += 0.025; s.wing = 'gt'; } },
    ],
  },
  bodykit: {
    label: 'Body kit', tab: 'body',
    options: [
      { id: 'stock', name: 'Stock' },
      { id: 'street', name: 'Street kit', info: 'lip, skirts and diffuser: a little downforce',
        apply: (s) => { s.downforce += 0.3; s.kit = 'street'; } },
      { id: 'wide', name: 'Widebody', info: 'wider track, +5% grip, more drag, +15 kg',
        apply: (s) => { s.trackWidth += 0.08; s.halfWidth += 0.05; s.tireGrip *= 1.05; s.dragCoefficient += 0.02; s.mass += 15; s.kit = 'wide'; } },
    ],
  },
};

export const TABS = { engine: 'Engine', chassis: 'Chassis', drivetrain: 'Drivetrain', body: 'Body' };

// Which options this car can fit (turbo parts on turbo cars, superchargers on the rest).
export function optionsFor(car, slot) {
  return SLOTS[slot].options.filter((o) => !(o.turboOnly && !car.turbo) && !(o.naOnly && car.turbo));
}

// A changed copy of the car with the build's parts fitted. Unknown slots or
// parts are ignored, so an old save can never break a car.
export function applyParts(base, parts = {}) {
  const s = structuredClone(base);
  s.downforce = s.downforce ?? 0;
  for (const [slot, id] of Object.entries(parts)) {
    const opt = SLOTS[slot]?.options.find((o) => o.id === id);
    if (opt?.apply && !(opt.turboOnly && !base.turbo) && !(opt.naOnly && base.turbo)) opt.apply(s);
  }
  return s;
}
