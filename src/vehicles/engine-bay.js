// The bonnet and what is under it. The bonnet is its own panel, hinged at
// the windscreen end, so the garage can lift it on the Engine tab; under it
// sits an engine bay built from the car's engine and the parts fitted to it:
// the airbox or open filters (intake), cast or tubular manifolds (exhaust),
// the ECU box (tune), and the turbos or supercharger (induction). When a
// part is changed the new one drops into place, so you see it go in.
//
// Car space: +z forward, +x left, heights from the road (see body.js).

import * as THREE from 'three';

// Where the bonnet runs: from just in front of the windscreen to just behind
// the nose.
export function bonnetRange(B, def) {
  return [Math.max(...def.screen) + 0.04, B.z1 - 0.2];
}

// Each car's engine: layout, cam cover colour, plenum colour.
const ENGINES = {
  'skyliner-r34': { layout: 'inline', covers: 0xa01818, plenum: 0x2a2c2e }, // the famous red cam cover
  'gtar-r35': { layout: 'v', covers: 0x1c1d20, plenum: 0x8c949a },
  'challenjer-srt8': { layout: 'v', covers: 0xd2561a, plenum: 0x1c1d20 },  // orange cam covers
};

export function buildEngineBay({ B, def, spec, mats }) {
  const [z0, z1] = bonnetRange(B, def);
  const zc = (z0 + z1) / 2, len = z1 - z0;
  const ex = (z) => B.width(z) * 0.86; // where the bonnet meets the fenders
  const top = (z) => B.hood(z) - 0.03;  // keep everything under the closed bonnet
  const floor = 0.6;
  const eng = ENGINES[spec.id] || ENGINES['gtar-r35'];
  const parts = spec.parts || {};

  const metal = new THREE.MeshStandardMaterial({ color: 0x3a3e42, roughness: 0.55, metalness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.8, metalness: 0.2 });
  const covers = new THREE.MeshStandardMaterial({ color: eng.covers, roughness: 0.45, metalness: 0.3 });
  const plenum = new THREE.MeshStandardMaterial({ color: eng.plenum, roughness: 0.35, metalness: 0.7 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb8bec2, roughness: 0.25, metalness: 1, envMapIntensity: 1.2 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x4a3a32, roughness: 0.85, metalness: 0.4 });
  const blued = new THREE.MeshStandardMaterial({ color: 0x5a6aa8, roughness: 0.2, metalness: 1, envMapIntensity: 1.3 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb01818, roughness: 0.5 });
  const filter = new THREE.MeshStandardMaterial({ color: 0x1a4aa8, roughness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: 0xd8dcd0, roughness: 0.5, transparent: true, opacity: 0.85 });
  const led = new THREE.MeshBasicMaterial({ color: 0x3ff0e8 });
  const loom = new THREE.MeshStandardMaterial({ color: 0xff2e88, roughness: 0.5 });

  const bay = new THREE.Group();
  bay.visible = false; // only drawn while the bonnet is up
  const mk = (geo, mat, x, y, z, parent = bay) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, parent) => mk(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const cyl = (r0, r1, h, mat, x, y, z, parent, seg = 12) => mk(new THREE.CylinderGeometry(r0, r1, h, seg), mat, x, y, z, parent);

  // The bay's liner: dark walls inside the fenders, a firewall, a front
  // panel and a floor, all facing in, following the bonnet line.
  {
    const pos = [], n = 10;
    const zAt = (i) => z0 + (len * i) / n;
    for (const s of [1, -1]) for (let i = 0; i < n; i++) {
      const za = zAt(i), zb = zAt(i + 1);
      const xa = s * (ex(za) - 0.01), xb = s * (ex(zb) - 0.01);
      const q = [[xa, floor, za], [xb, floor, zb], [xb, top(zb) + 0.02, zb], [xa, top(za) + 0.02, za]];
      const tri = s > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
      for (const k of tri) pos.push(...q[k]);
    }
    for (const [z, f] of [[z0 + 0.005, 1], [z1 - 0.005, -1]]) {
      const w = ex(z) - 0.01, h = top(z) + 0.02;
      const q = [[-w, floor, z], [w, floor, z], [w, h, z], [-w, h, z]];
      const tri = f > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
      for (const k of tri) pos.push(...q[k]);
    }
    const w = ex(zc);
    const fl = [[-w, floor, z0], [w, floor, z0], [w, floor, z1], [-w, floor, z1]];
    for (const k of [0, 2, 1, 0, 3, 2]) pos.push(...fl[k]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    bay.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.9, side: THREE.DoubleSide })));
  }

  // The engine, set back toward the firewall (front-mid, as these cars are).
  const ez = z0 + len * 0.42, eh = Math.min(top(ez), top(ez + 0.3)) - 0.02;
  const blockTop = eh - 0.1;
  box(0.62, blockTop - floor, 0.78, metal, 0, (floor + blockTop) / 2, ez);
  if (eng.layout === 'v') {
    for (const s of [1, -1]) {
      const c = box(0.2, 0.07, 0.74, covers, s * 0.2, blockTop + 0.035, ez);
      c.rotation.z = s * 0.45;
    }
    box(0.22, 0.09, 0.62, plenum, 0, blockTop + 0.045, ez); // the plenum between the banks
  } else {
    box(0.26, 0.08, 0.82, covers, 0.06, blockTop + 0.04, ez);
    for (let i = 0; i < 6; i++) box(0.05, 0.03, 0.05, dark, 0.06, blockTop + 0.095, ez - 0.32 + i * 0.128); // coil packs
    box(0.12, 0.08, 0.7, plenum, -0.16, blockTop + 0.02, ez);
  }
  // Always there: radiator at the front, battery, coolant bottle, strut tops.
  box(ex(z1) * 1.7, Math.max(0.12, top(z1 - 0.06) - floor - 0.04), 0.06, dark, 0, floor + (top(z1 - 0.06) - floor - 0.04) / 2, z1 - 0.06);
  const batX = -(ex(z0 + 0.25) - 0.18);
  box(0.2, 0.17, 0.16, dark, batX, floor + 0.09, z0 + 0.22);
  box(0.03, 0.02, 0.03, red, batX + 0.06, floor + 0.185, z0 + 0.2);
  cyl(0.06, 0.06, 0.13, white, ex(z0 + 0.3) - 0.14, floor + 0.07, z0 + 0.35);
  for (const s of [1, -1]) cyl(0.07, 0.08, 0.05, metal, s * (ex(ez) - 0.12), Math.min(top(ez) - 0.03, floor + 0.3), ez);

  // The parts that change, each in its own group so a new one can drop in.
  const slots = {};
  const group = (id) => { const g = new THREE.Group(); bay.add(g); slots[id] = g; return g; };

  // Intake: the stock airbox, a cone filter, or twin pods behind a heat shield.
  {
    const g = group('intake'), x = ex(z1 - 0.3) - 0.2, z = z1 - 0.3, y = floor + 0.1;
    const kind = parts.intake || 'stock';
    if (kind === 'stock') {
      box(0.26, 0.14, 0.3, dark, x, y + 0.02, z, g);
      cyl(0.04, 0.04, 0.3, dark, x - 0.15, y + 0.05, z - 0.2, g).rotation.z = Math.PI / 2;
    } else {
      const pods = kind === 'race' ? 2 : 1;
      for (let i = 0; i < pods; i++) {
        const c = cyl(0.07, 0.05, 0.16, filter, x - i * 0.17, y + 0.02, z, g, 14);
        c.rotation.x = Math.PI / 2;
        cyl(0.035, 0.035, 0.24, steel, x - i * 0.17, y + 0.03, z - 0.18, g).rotation.x = Math.PI / 2;
      }
      if (kind === 'race') box(0.42, 0.12, 0.02, mats.carbon, x - 0.08, y + 0.04, z - 0.12, g);
    }
  }

  // Exhaust: cast iron manifolds, or a fan of steel (sport) or heat-blued
  // titanium (race) primaries down the side of the block.
  {
    const g = group('exhaust'), kind = parts.exhaust || 'stock';
    const sides = eng.layout === 'v' ? [1, -1] : [1];
    for (const s of sides) {
      const x = s * 0.36;
      if (kind === 'stock') box(0.06, 0.1, 0.6, iron, x, blockTop - 0.08, ez, g);
      else for (let i = 0; i < (eng.layout === 'v' ? 4 : 6); i++) {
        const n = eng.layout === 'v' ? 4 : 6, zz = ez - 0.28 + (i * 0.56) / (n - 1);
        const p = cyl(0.018, 0.018, 0.2, kind === 'race' ? blued : steel, x + s * 0.04, blockTop - 0.09, zz, g, 8);
        p.rotation.z = s * 0.9;
      }
    }
  }

  // Tune: the ECU box; remapped, it grows a turquoise light (and on Stage 2
  // a pink wiring loom).
  {
    const g = group('ecu'), kind = parts.ecu || 'stock';
    const x = -(ex(z0 + 0.5) - 0.14), z = z0 + 0.52;
    box(0.14, 0.04, 0.1, dark, x, floor + 0.04, z, g);
    if (kind !== 'stock') box(0.025, 0.01, 0.025, led, x + 0.04, floor + 0.065, z + 0.03, g);
    if (kind === 'stage2') {
      const c = cyl(0.012, 0.012, 0.5, loom, x + 0.18, floor + 0.07, z + 0.05, g, 6);
      c.rotation.z = Math.PI / 2 - 0.2;
    }
  }

  // Induction: the car's own turbos (small), bigger ones, twins, or a
  // supercharger on top for a car that had none.
  {
    const g = group('induction'), kind = parts.induction || 'stock';
    const turbo = (x, z, r) => {
      const t = mk(new THREE.TorusGeometry(r, r * 0.55, 8, 14), kind === 'stock' ? metal : steel, x, blockTop - 0.02, z, g);
      t.rotation.y = Math.PI / 2;
      cyl(r * 0.5, r * 0.5, r * 1.6, steel, x, blockTop - 0.02, z, g, 10).rotation.z = Math.PI / 2;
    };
    const hasTurbo = !!spec.turbo;
    if (kind === 'super') {
      box(0.3, 0.1, 0.5, steel, 0, blockTop + 0.12, ez, g);
      cyl(0.06, 0.06, 0.04, dark, 0, blockTop + 0.12, ez + 0.28, g).rotation.x = Math.PI / 2; // the pulley
    } else if (hasTurbo) {
      const r = kind === 'stock' ? 0.06 : 0.085;
      const twin = kind === 'twin' || kind === 'tt' || eng.layout === 'v';
      if (twin) for (const s of [1, -1]) turbo(s * (ex(ez + 0.25) - 0.16), ez + 0.28, r);
      else turbo(ex(ez + 0.25) - 0.16, ez + 0.28, r);
    }
  }

  // The bonnet itself, hinged at its back edge.
  const hinge = new THREE.Group();
  hinge.position.set(0, B.hood(z0), z0);
  const geo = B.bonnetGeometry(z0, z1);
  geo.translate(0, -B.hood(z0), -z0);
  hinge.add(new THREE.Mesh(geo, mats.paint));
  hinge.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.8, side: THREE.BackSide })));

  return { bay, hinge, slots, range: [z0, z1] };
}
