// The cabin seen from the driver's seat: a moulded dashboard with a hooded
// binnacle and round vents, door cards with armrests and pulls, bucket seats
// with bolsters, a centre console with the gear lever and handbrake, pedals,
// the headliner with a dome light. Shapes are drawn as side profiles and
// extruded with rounded (bevelled) edges, so the cabin is as smooth as the
// body round it rather than a stack of boxes.
//
// Cockpit space: +z forward, +x the car's left, y up from the floor line.
// The driver sits at dx (negative = right-hand drive).

// The dash face toward the driver (its surface, bevel included), where the
// gauges, vents and radio sit.
const FACE = 0.552;

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';

// A side profile [[z, y], ...] extruded across the car (x), centred on x0.
function extrudeX(points, width, x0 = 0, bevel = 0.012) {
  const s = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  // Shape x -> car z, extrusion -> car x.
  g.rotateY(-Math.PI / 2);
  g.translate(x0 + width / 2 - bevel, 0, 0);
  return g;
}

// A front-on outline [[x, y], ...] extruded `depth` along z.
function extrudeZ(points, depth, bevel = 0.01) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.002, depth - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -depth / 2 + bevel);
  return g;
}

// A rounded rectangle outline centred on 0, 0.
function rounded(w, h, r, seg = 3) {
  const pts = [];
  const c = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5]];
  for (const [x, y, a0] of c) for (let i = 0; i <= seg; i++) {
    const a = a0 + (i / seg) * Math.PI / 2;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  return pts;
}

// Height of the inside of the body's shell (roof, glass, bonnet) above the
// point x, z in body space: the section's top line at that width.
function shellTop(B, z, x) {
  const { p } = B.section(z);
  const ax = Math.abs(x);
  for (let i = 7; i < p.length - 1; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[i + 1];
    if (ax <= x0 && ax >= x1) return y0 + (y1 - y0) * ((ax - x0) / (x1 - x0 || 1));
  }
  return ax > p[7][0] ? p[7][1] : p[p.length - 1][1];
}

// Lower any part up by the roof (headliner, visors, mirror, dome light,
// pillars) that would poke through the roof or the glass, so it sits just
// inside the shell on every car (the cabin is shared; the shells are not).
function fitInside(cockpit, B) {
  const off = cockpit.position, box = new THREE.Box3(), v = new THREE.Vector3();
  cockpit.matrixWorld.identity(); // measure in the cockpit's own space
  for (const c of cockpit.children) {
    if (c.isLight) continue;
    c.updateMatrixWorld(true);
    box.setFromObject(c, true);
    if (box.isEmpty() || box.min.y < 0.9) continue; // roof-level parts only; the dash and seats keep their places
    // Measured a little inside the part's edges (a wide liner's corners sit
    // under the curve of the roof's edge), and never moved more than a few
    // centimetres, so nothing drops into the driver's view.
    let over = 0;
    const cx = (box.min.x + box.max.x) / 2, hx = (box.max.x - box.min.x) * 0.35;
    for (const x of [cx - hx, cx + hx]) for (const z of [box.min.z, box.max.z]) {
      v.set(x, box.max.y, z).add(off);
      if (v.z < B.z0 || v.z > B.z1) continue;
      over = Math.max(over, v.y - (shellTop(B, v.z, v.x) - 0.015));
    }
    if (over > 0) c.position.y -= Math.min(over, 0.06);
  }
}

// Builds the cabin into `cockpit`. Returns the steering wheel (it turns),
// the gauge needles, and the dome light.
export function buildCabin(cockpit, { dx, sh, spec, mats, B }) {
  const { trim, black, chrome } = mats;
  const stripped = spec.stripped;
  // Two-tone plastics, faintly lit so the shapes read at night.
  const upper = new THREE.MeshLambertMaterial({ color: 0x232527, emissive: 0x060807 });
  const lower = new THREE.MeshLambertMaterial({ color: stripped ? 0x4a5054 : 0x3c3e40, emissive: 0x070908 });
  const cloth = new THREE.MeshLambertMaterial({ color: 0x2c2d30, emissive: 0x040505 });
  const insert = new THREE.MeshLambertMaterial({ color: sh.seatColour ?? 0x3a3e46, emissive: 0x050506 });
  const hoodMat = upper.clone(); hoodMat.side = THREE.DoubleSide;
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = cockpit) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // Dashboard: one moulded piece from the foot of the windscreen, over a
  // rounded lip, down the face to the knee roll.
  add(extrudeX([[0.92, 0.94], [0.8, 0.972], [0.68, 0.978], [0.6, 0.965], [0.575, 0.935], [0.585, 0.78], [0.57, 0.7], [0.5, 0.66], [0.47, 0.6], [0.52, 0.55], [0.92, 0.55]], 1.5, 0, 0.02), upper);
  // A lighter lower half below a shut line.
  add(extrudeX([[0.6, 0.77], [0.585, 0.72], [0.53, 0.68], [0.5, 0.6], [0.53, 0.56], [0.6, 0.56]], 1.46, 0, 0.012), lower);

  // Binnacle: a hood arching over the driver's gauges, out from the face.
  const hood = new THREE.CylinderGeometry(0.25, 0.25, 0.13, 12, 1, true, Math.PI * 0.58, Math.PI * 0.84);
  hood.rotateX(Math.PI / 2);
  hood.scale(1, 0.38, 1);
  add(hood, hoodMat, dx, 0.87, FACE - 0.065);
  const face = add(new THREE.PlaneGeometry(0.44, 0.2), new THREE.MeshBasicMaterial({ map: Tex.gauges(), color: 0xe4e8e8 }), dx, 0.865, FACE - 0.004);
  face.rotation.set(0.05, Math.PI, 0);
  const needles = [];
  const needleMat = new THREE.MeshBasicMaterial({ color: 0xff4a2a });
  for (const gx of [0.124, -0.096]) {
    const pivot = new THREE.Group();
    pivot.position.set(dx + gx, 0.865, FACE - 0.01);
    pivot.rotation.set(0.05, Math.PI, 0);
    const needle = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.07), needleMat);
    needle.position.y = 0.03;
    pivot.add(needle);
    cockpit.add(pivot);
    needles.push(pivot);
  }

  // Round air vents in the dash face: a chrome-ringed bezel, dark louvres.
  const ringGeo = new THREE.TorusGeometry(0.038, 0.008, 4, 14);
  const ventGeo = new THREE.CircleGeometry(0.036, 14);
  for (const vx of [0.66, 0.13, -0.09, -0.66]) {
    if (Math.abs(vx - dx) < 0.27) continue; // the binnacle is there
    const r = add(ringGeo, trim, vx, 0.83, FACE - 0.006); r.rotation.y = Math.PI;
    const v = add(ventGeo, black, vx, 0.83, FACE - 0.002); v.rotation.y = Math.PI;
    for (const ly of [-0.016, 0, 0.016]) add(new THREE.BoxGeometry(0.06, 0.005, 0.01), trim, vx, 0.83 + ly, FACE - 0.008);
  }
  // The radio in the middle of the dash.
  add(new THREE.BoxGeometry(0.2, 0.075, 0.01), new THREE.MeshBasicMaterial({ map: Tex.radio(), color: 0xc8c8c8 }), 0.02, 0.74, FACE + 0.006);
  add(new THREE.BoxGeometry(0.24, 0.1, 0.012), black, 0.02, 0.74, FACE + 0.012);
  // Defrost grilles along the top of the dash.
  for (const gx of [-0.3, 0, 0.3]) add(new THREE.BoxGeometry(0.22, 0.004, 0.035), black, gx, 0.994, 0.8);

  // Centre console: a tunnel from the dash back between the seats, with
  // the gear lever in a leather boot and the handbrake.
  add(extrudeX([[0.56, 0.68], [0.3, 0.6], [-0.4, 0.58], [-0.42, 0.5], [0.56, 0.5]], 0.24, 0.02, 0.02), lower);
  add(new THREE.ConeGeometry(0.045, 0.07, 8), black, 0.02, 0.63, 0.18);
  const lever = add(new THREE.CylinderGeometry(0.009, 0.011, 0.14, 6), chrome, 0.02, 0.69, 0.17);
  lever.rotation.x = 0.18;
  add(new THREE.SphereGeometry(0.026, 10, 8), black, 0.02, 0.76, 0.185);
  const hb = add(new THREE.BoxGeometry(0.035, 0.03, 0.24), trim, 0.02 - Math.sign(dx || -1) * 0.07, 0.62, -0.12);
  hb.rotation.x = 0.25;
  add(new THREE.BoxGeometry(0.04, 0.035, 0.08), black, 0.02 - Math.sign(dx || -1) * 0.07, 0.65, -0.21).rotation.x = 0.25;

  // Door cards: the panel, a darker top with the window sill, an armrest,
  // a chrome pull and a speaker grille low down.
  const card = rounded(1.15, 0.42, 0.04);
  for (const s of [1, -1]) {
    const x = s * sh.doorX;
    const p = add(extrudeZ(card, 0.04, 0.008), lower, x, 0.78, -0.05);
    p.rotation.y = Math.PI / 2;
    const sill = add(new THREE.BoxGeometry(0.07, 0.04, 1.2), upper, x - s * 0.02, 0.98, -0.05);
    sill.rotation.z = s * 0.15;
    add(extrudeX([[0.18, 0.8], [-0.3, 0.8], [-0.33, 0.77], [-0.3, 0.74], [0.18, 0.75]], 0.08, x - s * 0.05, 0.012), upper);
    add(new THREE.BoxGeometry(0.012, 0.02, 0.1), chrome, x - s * 0.03, 0.87, 0.18);
    const g = add(new THREE.CircleGeometry(0.06, 12), black, x - s * 0.022, 0.65, 0.3);
    g.rotation.y = -s * Math.PI / 2;
  }

  // A-pillars, trimmed, from the dash up to the roof.
  for (const s of [1, -1]) {
    const a = new THREE.Vector3(s * 0.74, 0.95, 0.86), b = new THREE.Vector3(s * 0.64, 1.3, 0.32);
    const pillar = new THREE.Mesh(extrudeZ(rounded(0.07, 0.045, 0.015), a.distanceTo(b), 0.006), upper);
    pillar.position.copy(a).add(b).multiplyScalar(0.5);
    pillar.lookAt(b); // not yet parented, so this is in cockpit space
    cockpit.add(pillar);
  }

  // Headliner, mirror, and the dome light.
  const ly = sh.linerY ?? 1.315;
  const liner = add(new THREE.PlaneGeometry(1.25, 0.85), lower, 0, ly, -0.12);
  liner.rotation.x = Math.PI / 2;
  add(extrudeZ(rounded(0.24, 0.065, 0.02), 0.03, 0.008), black, 0, ly - 0.075, 0.5);
  add(new THREE.BoxGeometry(0.21, 0.05, 0.004), chrome, 0, ly - 0.075, 0.484);
  add(new THREE.BoxGeometry(0.015, 0.06, 0.015), black, 0, ly - 0.03, 0.5);
  add(extrudeZ(rounded(0.16, 0.07, 0.02), 0.02, 0.006), upper, 0, ly - 0.012, 0.08).rotation.x = Math.PI / 2;
  const lens = add(new THREE.PlaneGeometry(0.11, 0.04), new THREE.MeshBasicMaterial({ color: 0xfff0d4 }), 0, ly - 0.024, 0.08);
  lens.rotation.x = Math.PI / 2;
  // The dome light: off until you sit in the car (setInterior). It is always
  // in the scene so turning it on never rebuilds the shaders.
  const dome = new THREE.PointLight(0xffe6c0, 0, 1.9, 1.4);
  dome.position.set(0, ly - 0.1, 0.02);
  cockpit.add(dome);

  // Bucket seats: a cushion and a back with rounded edges, raised bolsters,
  // a cloth insert, a headrest. Stripped cars keep only the driver's seat.
  const back = rounded(0.5, 0.6, 0.1);
  const head = rounded(0.26, 0.17, 0.06);
  for (const s of [1, -1]) {
    if (stripped && Math.sign(s) !== Math.sign(dx)) continue;
    const x = s * 0.38;
    add(extrudeX([[0.0, 0.47], [-0.45, 0.47], [-0.47, 0.55], [-0.42, 0.58], [0.0, 0.6], [0.04, 0.56]], 0.5, x, 0.03), cloth);
    for (const w of [1, -1]) add(extrudeX([[0.02, 0.58], [-0.42, 0.6], [-0.42, 0.66], [-0.05, 0.64]], 0.08, x + w * 0.21, 0.02), cloth);
    const seat = new THREE.Group();
    seat.position.set(x, 0.56, -0.5);
    seat.rotation.x = -0.18;
    cockpit.add(seat);
    add(extrudeZ(back, 0.12, 0.03), cloth, 0, 0.3, -0.02, seat);
    add(extrudeZ(rounded(0.24, 0.42, 0.06), 0.02, 0.006), insert, 0, 0.28, 0.05, seat);
    for (const w of [1, -1]) {
      const bol = add(extrudeZ(rounded(0.09, 0.46, 0.04), 0.15, 0.02), cloth, w * 0.215, 0.27, 0.05, seat);
      bol.rotation.y = -w * 0.25;
    }
    add(extrudeZ(head, 0.1, 0.03), cloth, 0, 0.68, -0.02, seat);
  }
  if (!stripped) add(new THREE.BoxGeometry(1.4, 0.06, 0.4), lower, 0, 0.99, -0.9); // parcel shelf

  // Pedals in the footwell.
  for (const [px, w] of [[0.1, 0.06], [0, 0.09], [-0.1, 0.05]]) {
    const pd = add(extrudeZ(rounded(w, 0.08, 0.012), 0.012, 0.003), chrome, dx + px, 0.5, 0.62);
    pd.rotation.x = -0.5;
  }

  // Steering wheel on a column, tilted like a real one: a thick rim with
  // a leather grip, three spokes, a padded hub, a top-centre stripe.
  const column = new THREE.Group();
  column.position.set(dx, 0.8, 0.5);
  column.rotation.x = 0.45;
  cockpit.add(column);
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.2, 8), upper);
  shroud.rotation.x = Math.PI / 2;
  shroud.position.z = 0.04;
  column.add(shroud);
  const wheel = new THREE.Group();
  wheel.position.z = -0.08;
  column.add(wheel);
  const leather = new THREE.MeshPhongMaterial({ color: 0x26282c, emissive: 0x050606, specular: 0x2a2a2a, shininess: 24 });
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.027, 8, 32), leather));
  for (const a of [0, Math.PI, Math.PI * 1.5]) {
    const sp = new THREE.Mesh(extrudeZ([[0, -0.022], [0.15, -0.014], [0.15, 0.014], [0, 0.022]], 0.018, 0.004), trim);
    sp.rotation.z = a;
    wheel.add(sp);
  }
  wheel.add(new THREE.Mesh(extrudeZ(rounded(0.13, 0.1, 0.035), 0.05, 0.015), leather));
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), chrome);
  hub.position.z = -0.027; hub.rotation.y = Math.PI;
  wheel.add(hub);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 0.058), new THREE.MeshBasicMaterial({ color: 0xff8b2b }));
  mark.position.y = 0.18;
  wheel.add(mark); // so you can see the wheel turn

  fitInside(cockpit, B);
  return { wheel, needles, dome };
}
