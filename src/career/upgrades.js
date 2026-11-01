// One-race upgrades, bought on the laptop before a career race. Each lasts that
// race only (a restart keeps them), and nothing is permanent: the way to go
// faster for good is still a faster car. Plain data and sums, no DOM, so the
// benches can run it in Node.

export const NOS_SECONDS = 6; // how long a bottle lasts, held down

export const UPGRADES = [
  { id: 'nos', name: 'NOS', price: 1500, info: `${NOS_SECONDS} seconds of boost` },
  { id: 'engine', name: 'Engine map', price: 700, info: '8% more power', torque: 1.08 },
  { id: 'tyres', name: 'Sticky tyres', price: 500, info: '6% more grip', grip: 1.06 },
  { id: 'brakes', name: 'Hard brakes', price: 300, info: '10% more braking', brakes: 1.1 },
];

// A car's numbers with these upgrades on. fitted: { id: true }.
export function upgradedSpec(spec, fitted) {
  if (!fitted) return spec;
  const s = { ...spec };
  for (const u of UPGRADES) if (fitted[u.id]) {
    if (u.torque) s.torqueScale = (s.torqueScale ?? 1) * u.torque;
    if (u.grip) s.tireGrip *= u.grip;
    if (u.brakes) s.brakeForce *= u.brakes;
  }
  return s;
}

export const fittedCost = (fitted) => UPGRADES.reduce((sum, u) => sum + (fitted?.[u.id] ? u.price : 0), 0);
