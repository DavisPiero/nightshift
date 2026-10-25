// The car, built from code: a low-poly take on a 1999 R34 Skyline GT-R.
// Wide flared arches, a long square bonnet with a vent, angular headlights,
// a big lower intake, fender ducts behind the front wheels, a short cabin,
// a tall rear wing and four round tail lights. No badges or logos.
//
// The body is "lofted": a cross-section shape is defined at points along the
// car's length and joined up with flat faces. The car faces +z, its left side
// is +x (it is right-hand drive, so the driver sits at -x).
//
// The body leans on its springs around a point near axle height (like a real
// car), so it tips a little but never dips into the road. The cockpit
// (dashboard, wheel, seats) does not lean, so the driver's view stays level.

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';

const lerp = (a, b, t) => a + (b - a) * t;
const ROLL_CENTRE = 0.42; // m above the road

// Join cross-sections (each a list of [x, y] points on the car's +x half,
// from the bottom centre round to the top centre) into a mirrored, flat-shaded
// mesh. materialFor(segment, band) picks a material index for each strip.
function loft(sections, materialFor, { capStart = true, capEnd = true } = {}) {
  const pos = [];
  const groups = [];
  let current = -1, start = 0;
  const pushTri = (a, b, c, m) => {
    if (m !== current) {
      if (current >= 0) groups.push([start, pos.length / 3 - start, current]);
      current = m; start = pos.length / 3;
    }
    pos.push(...a, ...b, ...c);
  };
  const ring = (s, side) => s.pts.map(([x, y]) => [x * side, y, s.z]);
  for (const side of [1, -1]) {
    for (let k = 0; k < sections.length - 1; k++) {
      const A = ring(sections[k], side), B = ring(sections[k + 1], side);
      for (let j = 0; j < A.length - 1; j++) {
        const m = materialFor(k, j);
        // Wind faces outward on both halves.
        if (side === 1) { pushTri(A[j], A[j + 1], B[j + 1], m); pushTri(A[j], B[j + 1], B[j], m); }
        else { pushTri(A[j], B[j + 1], A[j + 1], m); pushTri(A[j], B[j], B[j + 1], m); }
      }
    }
  }
  const cap = (s, facing, m) => {
    const R = ring(s, 1), Lr = ring(s, -1);
    const cy = s.pts.reduce((t, p) => t + p[1], 0) / s.pts.length;
    const c = [0, cy, s.z];
    for (const [pts, side] of [[R, 1], [Lr, -1]]) {
      for (let j = 0; j < pts.length - 1; j++) {
        const flip = (facing * side) > 0;
        if (flip) pushTri(c, pts[j + 1], pts[j], m); else pushTri(c, pts[j], pts[j + 1], m);
      }
    }
  };
  // Caps ask for band -1.
  if (capStart) cap(sections[0], -1, materialFor(-1, -1));
  if (capEnd) cap(sections[sections.length - 1], 1, materialFor(sections.length, -1));
  if (current >= 0) groups.push([start, pos.length / 3 - start, current]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  for (const [s, c, m] of groups) g.addGroup(s, c, m);
  g.computeVertexNormals();
  return g;
}

// Body profile helpers. Every car has a shape (see SHAPES at the bottom):
// lower-body keyframes along its length, cabin keyframes, wheel and arch
// positions, and a details() function for its lights, grille and so on.
// Body keys: [z, bottomY, sillW, shoulderY, shoulderW, topY, topW, crown]
// Cabin keys: [z, baseY, baseW, roofY, roofW]

function bodyKey(sh, z) {
  const K = sh.body;
  for (let i = 1; i < K.length; i++) {
    if (z <= K[i][0] + 1e-6) {
      const a = K[i - 1], b = K[i];
      const t = (z - a[0]) / (b[0] - a[0]);
      return a.map((v, k) => lerp(v, b[k], t));
    }
  }
  return K[K.length - 1];
}

function archHeight(sh, z) {
  let y = 0;
  for (const c of sh.wheelZ) {
    const d = Math.abs(z - c);
    if (d < sh.archR) y = Math.max(y, 0.3 + Math.sqrt(1 - (d / sh.archR) ** 2) * (sh.archTop - 0.3));
  }
  return y;
}

// How much the arch flare bulges out at this z (0..1), wider than the arch itself.
function flareAt(sh, z) {
  let f = 0;
  for (const c of sh.wheelZ) f = Math.max(f, 1 - Math.min(1, Math.abs(z - c) / (sh.archR + 0.35)));
  return Math.min(1, f * 1.6);
}

function bodySections(sh) {
  const zs = new Set(sh.body.map((k) => k[0]));
  const z0 = sh.body[0][0], z1 = sh.body[sh.body.length - 1][0];
  for (const c of sh.wheelZ) for (let i = -6; i <= 6; i++) zs.add(+(c + i * (sh.archR + 0.3) / 6 * 0.999).toFixed(4));
  const sorted = [...zs].filter((z) => z >= z0 && z <= z1).sort((a, b) => a - b);
  return sorted.map((z) => {
    const [, bottomY, sillW, shY, shW, topY, topW, crown] = bodyKey(sh, z);
    const arch = archHeight(sh, z);
    const fl = flareAt(sh, z) * sh.flare;
    const y0 = Math.max(bottomY, arch), y2 = Math.max(bottomY + 0.12, arch);
    return {
      z,
      pts: [[0, y0], [sillW - 0.05, y0], [sillW + fl * 0.6, y2], [shW + fl, Math.max(shY - 0.1, y2 + 0.04)], [shW + fl * 0.4, shY], [topW, topY], [0, topY + crown]],
    };
  });
}

// Light cone for the headlight beams: bright at the lamp, fading to nothing.
function beamGeometry(length, radius) {
  const g = new THREE.ConeGeometry(radius, length, 10, 1, true);
  g.translate(0, -length / 2, 0);
  g.rotateX(-Math.PI / 2); // tip at the lamp, opening toward +z
  const col = [];
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = 1 - Math.min(1, p.getZ(i) / length);
    const c = 0.045 * t * t; // faint: both faces add up, and the grade brightens darks

    col.push(c, c * 0.95, c * 0.8);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export function buildCar(spec, paintColor = spec.paint, { simple = false } = {}) {
  const sh = SHAPES[spec.id] || SHAPES['skyliner-r34'];
  const CABIN_KEYS = sh.cabin;
  const root = new THREE.Group();
  root.name = spec.id;
  const sway = new THREE.Group();   // leans and pitches about the roll centre
  sway.position.y = ROLL_CENTRE;
  root.add(sway);
  const body = new THREE.Group();
  body.position.y = -ROLL_CENTRE;
  sway.add(body);
  const cockpit = new THREE.Group(); // stays level with the road
  root.add(cockpit);

  const paint = new THREE.MeshPhongMaterial({ color: paintColor, shininess: 70, specular: 0x4a4a44, flatShading: true });
  const trim = new THREE.MeshLambertMaterial({ color: 0x252728, flatShading: true });
  const black = new THREE.MeshLambertMaterial({ color: 0x0b0b0c });
  const carbon = new THREE.MeshPhongMaterial({ color: 0x161718, shininess: 40, specular: 0x333333, flatShading: true });
  const under = new THREE.MeshBasicMaterial({ color: 0x050505 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x0a0f12, shininess: 90, specular: 0x777777, transparent: true, opacity: 0.84, flatShading: true });
  const chrome = new THREE.MeshPhongMaterial({ color: 0x8a8c8e, shininess: 80, specular: 0xaaaaaa });
  const plate = new THREE.MeshLambertMaterial({ color: 0xe6e4da });
  const headlight = new THREE.MeshBasicMaterial({ color: 0xfff1cf });
  const lampInner = new THREE.MeshPhongMaterial({ color: 0x3a3e42, shininess: 90, specular: 0x999999 });
  const tail = new THREE.MeshBasicMaterial({ color: 0x8a0d08 });
  const tailRing = new THREE.MeshBasicMaterial({ color: 0x4a0604 });
  const reverseLight = new THREE.MeshBasicMaterial({ color: 0x777777 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xc86a10 });
  const interior = new THREE.MeshLambertMaterial({ color: 0x2a2b2d });
  const dashMat = new THREE.MeshLambertMaterial({ color: 0x0f1012, flatShading: true });
  const seatMat = new THREE.MeshLambertMaterial({ color: 0x232426 });
  const seatInsert = new THREE.MeshLambertMaterial({ color: 0x2c3036 });

  // Lower body: band 0 is the underside, band 1 the dark sill, the rest paint.
  // The flat top between the windscreen and the rear glass is left open
  // (material 3 draws nothing): the cabin sits there, and a lid at waist
  // height would hide the dashboard and wheel from the driver's seat.
  const secs = bodySections(sh);
  const open = new THREE.MeshBasicMaterial({ visible: false });
  const lower = new THREE.Mesh(
    loft(secs, (k, j) => {
      if (j === 5 && k >= 0 && secs[k].z >= CABIN_KEYS[0][0] - 0.01 && secs[k + 1].z <= CABIN_KEYS[CABIN_KEYS.length - 1][0] + 0.01) return 3;
      return j === 0 ? 2 : j === 1 ? 1 : 0;
    }),
    [paint, trim, under, open],
  );
  body.add(lower);

  // Cabin: rear glass, roof, windscreen on top; C-pillar, side glass, side glass on the sides.
  const cabinSecs = CABIN_KEYS.map(([z, by, bw, ry, rw]) => ({ z, pts: [[0, ry], [rw, ry], [bw, by]] }));
  const cabinMats = [[1, 0], [0, 1], [1, 1]]; // [top, side] per segment: 0 paint, 1 glass
  const cabin = new THREE.Mesh(
    loft(cabinSecs.map((s) => ({ ...s, pts: [...s.pts].reverse() })), (k, j) => cabinMats[k][j === 0 ? 1 : 0], { capStart: false, capEnd: false }),
    [paint, glass],
  );
  body.add(cabin);

  const box = (w, h, d, mat, x, y, z, parent = body) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // Solid core so nothing shows through the wheel arches.
  box(sh.core[0], 0.42, sh.core[1], black, 0, 0.42, 0);

  // A-pillars (solid, so they also show from inside the car), running from
  // the windscreen base up to the roof.
  {
    const [zr, , , ry, rw] = CABIN_KEYS[CABIN_KEYS.length - 2];
    const [zb, by, bw] = CABIN_KEYS[CABIN_KEYS.length - 1];
    const len = Math.hypot(ry - by, zb - zr);
    for (const s of [1, -1]) {
      const p = box(0.07, len, 0.07, paint, s * ((rw + bw) / 2 + 0.005), (ry + by) / 2, (zr + zb) / 2);
      p.rotation.x = -(Math.PI / 2 - Math.atan2(ry - by, zb - zr));
      p.rotation.z = s * 0.2;
    }
    // Black window surround along the doors.
    const [zc, cy, cw] = CABIN_KEYS[1];
    for (const s of [1, -1]) box(0.012, 0.03, Math.abs(zb - zc), trim, s * (cw + 0.005), cy, (zb + zc) / 2);
  }

  const mats = { paint, trim, black, carbon, chrome, plate, headlight, lampInner, tail, tailRing, reverseLight, amber };
  const { exhausts } = sh.details({ box, body, mats });

  // --- Cockpit (does not lean). Right-hand drive: the driver sits at -x. ---
  const dx = sh.driverX;
  cockpit.position.set(0, sh.cockpitOffset[0], sh.cockpitOffset[1]);
  let steeringWheel = new THREE.Group(), needles = [];
  if (!simple) {
    // Dashboard: a top slab under the windscreen, a face toward the cabin,
    // and a hooded binnacle over the driver's gauges.
    // Seen from the seat: the wheel at the bottom, the gauges through the top
    // of the wheel, the dash top low enough to leave the road clear.
    const dashTop = box(1.52, 0.05, 0.3, dashMat, 0, 0.92, 0.77, cockpit);
    dashTop.rotation.x = -0.06;
    box(1.52, 0.26, 0.04, dashMat, 0, 0.79, 0.61, cockpit);  // face toward the cabin
    box(1.52, 0.1, 0.18, dashMat, 0, 0.62, 0.52, cockpit);   // knee roll
    const hood = box(0.48, 0.035, 0.18, dashMat, dx, 0.965, 0.64, cockpit);
    hood.rotation.x = -0.15;
    for (const s of [1, -1]) box(0.03, 0.08, 0.16, dashMat, dx + s * 0.23, 0.925, 0.65, cockpit);
    // Gauges: tach and speedo faces with needles that move.
    const faceTex = Tex.gauges();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.15), new THREE.MeshBasicMaterial({ map: faceTex, color: 0xb8b8b8 }));
    face.position.set(dx, 0.86, 0.585);
    face.rotation.set(0.15, Math.PI, 0);
    cockpit.add(face);
    const needleMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a });
    for (const gx of [0.1, -0.1]) {
      const pivot = new THREE.Group();
      pivot.position.set(dx + gx, 0.86, 0.58);
      pivot.rotation.set(0.15, Math.PI, 0);
      const needle = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.05), needleMat);
      needle.position.y = 0.022;
      pivot.add(needle);
      cockpit.add(pivot);
      needles.push(pivot);
    }
    // Centre stack: a small amber display and three little gauges on top.
    const mfd = box(0.2, 0.09, 0.02, new THREE.MeshBasicMaterial({ color: 0x9a5a14 }), 0.02, 0.82, 0.585, cockpit);
    mfd.rotation.x = -0.15;
    for (const gx of [-0.06, 0.02, 0.1]) {
      const g = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), new THREE.MeshBasicMaterial({ color: 0x2a2018 }));
      g.position.set(gx, 0.95, 0.66); g.rotation.set(1.2, Math.PI, 0);
      cockpit.add(g);
    }
    box(0.22, 0.24, 0.4, interior, 0.02, 0.6, 0.25, cockpit);  // console
    const shifter = box(0.03, 0.12, 0.03, trim, 0.02, 0.78, 0.15, cockpit);
    shifter.rotation.x = 0.2;
    box(0.05, 0.04, 0.05, black, 0.02, 0.85, 0.16, cockpit);
    // Door cards and the inside of the roof and pillars.
    for (const s of [1, -1]) box(0.04, 0.42, 1.3, interior, s * sh.doorX, 0.78, -0.05, cockpit);
    const liner = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.85), interior);
    liner.rotation.x = Math.PI / 2;
    liner.position.set(0, 1.315, -0.12);
    cockpit.add(liner);
    // Rear-view mirror and sun visors.
    box(0.22, 0.06, 0.02, black, 0, 1.24, 0.5, cockpit);
    box(0.2, 0.045, 0.005, chrome, 0, 1.24, 0.489, cockpit);
    for (const s of [1, -1]) { const v = box(0.4, 0.02, 0.16, interior, s * 0.38, 1.3, 0.38, cockpit); v.rotation.x = -0.15; }
    // Bucket seats.
    for (const s of [1, -1]) {
      box(0.5, 0.12, 0.5, seatMat, s * 0.38, 0.52, -0.25, cockpit);
      const back = box(0.5, 0.66, 0.12, seatMat, s * 0.38, 0.86, -0.55, cockpit);
      back.rotation.x = -0.18;
      const ins = box(0.26, 0.5, 0.02, seatInsert, s * 0.38, 0.86, -0.485, cockpit);
      ins.rotation.x = -0.18;
      for (const w of [1, -1]) { const bol = box(0.07, 0.5, 0.16, seatMat, s * 0.38 + w * 0.22, 0.9, -0.52, cockpit); bol.rotation.x = -0.18; }
    }
    box(1.4, 0.06, 0.4, interior, 0, 0.99, -0.9, cockpit); // parcel shelf

    // Steering wheel on a column, in front of the driver, not inside the dash.
    // Tilted like a real one: the top leans away from the driver.
    const column = new THREE.Group();
    column.position.set(dx, 0.8, 0.5);
    column.rotation.x = 0.45;
    cockpit.add(column);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 6), trim);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = 0.03;
    column.add(shaft);
    steeringWheel = new THREE.Group();
    steeringWheel.position.z = -0.08;
    column.add(steeringWheel);
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 5, 16), new THREE.MeshPhongMaterial({ color: 0x3a3c40, specular: 0x333333, shininess: 30, flatShading: true }));
    steeringWheel.add(rimMesh);
    for (const a of [0, Math.PI, Math.PI * 1.5]) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.015), trim);
      sp.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0);
      sp.rotation.z = a;
      steeringWheel.add(sp);
    }
    steeringWheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 8).rotateX(Math.PI / 2), trim));
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.022), new THREE.MeshBasicMaterial({ color: 0xff8b2b }));
    mark.position.y = 0.18;
    steeringWheel.add(mark); // top-centre stripe so you can see the wheel turn
  }

  // Wheels: five-spoke rims, sitting under the flared arches.
  const tyreMat = new THREE.MeshLambertMaterial({ map: Tex.tire(), color: 0x8a8a8a });
  const rimMat = new THREE.MeshLambertMaterial({ map: Tex.rim() });
  const WR = spec.wheelRadius;
  const wheelGeo = new THREE.CylinderGeometry(WR, WR, sh.tyreWidth, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  const [WZf, WZr] = sh.wheelZ, WX = sh.wheelX;
  for (const [x, z, front] of [[WX, WZf, true], [-WX, WZf, true], [WX, WZr, false], [-WX, WZr, false]]) {
    const steer = new THREE.Group();
    steer.position.set(x, WR, z);
    root.add(steer);
    // After rotating the cylinder its top cap faces -x and its bottom cap +x.
    const spin = new THREE.Mesh(wheelGeo, [tyreMat, x > 0 ? tyreMat : rimMat, x > 0 ? rimMat : tyreMat]);
    steer.add(spin);
    wheels.push({ steer, spin, front });
  }

  // Glow sprites so lights read from a distance.
  const glowTex = Tex.glow();
  const sprites = [];
  const sprite = (color, size, x, y, z) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    body.add(s);
    sprites.push(s);
    return s;
  };
  const [hx, hy, hz] = sh.headLamp, [tx, ty, tz] = sh.tailLamp;
  const headGlows = simple ? [] : [sprite(0xfff0c8, 0.9, hx, hy, hz), sprite(0xfff0c8, 0.9, -hx, hy, hz)];
  const tailGlows = simple ? [] : [-tx, tx].map((x) => sprite(0xff2010, 0.7, x, ty, tz));

  // Headlight beams: faint cones of light in the night air.
  const beams = [];
  if (!simple) {
    const beamMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beamGeo = beamGeometry(16, 2.6);
    for (const s of [1, -1]) {
      const b = new THREE.Mesh(beamGeo, beamMat);
      b.position.set(s * hx, hy, hz - 0.08);
      b.rotation.x = 0.07;
      b.renderOrder = 2;
      body.add(b);
      beams.push(b);
    }
  }

  // Headlight: a real spot light from the nose.
  let lamp = null;
  if (!simple) {
    lamp = new THREE.SpotLight(0xfff0d0, 120, 70, 0.42, 0.55, 1.3);
    lamp.position.set(0, 0.7, hz - 0.3);
    lamp.target.position.set(0, -0.6, 22);
    root.add(lamp, lamp.target);
  }

  // Blob shadow (always on; real shadows are a Graphics setting).
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 5.0), new THREE.MeshBasicMaterial({ map: Tex.blobShadow(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  blob.renderOrder = 1;
  root.add(blob);

  // The body and cockpit are dozens of small boxes; merge the ones that never
  // move into one mesh per material (materials stay shared, so paint and
  // brake lights still change). The wheel, needles and beams stay separate.
  mergeChildren(body, new Set(beams));
  mergeChildren(cockpit);

  root.traverse((o) => { if (o.isMesh && o !== blob) o.castShadow = true; });
  for (const b of beams) b.castShadow = false;

  let glowOn = true, beamsOn = true, inside = false;
  const tach = needles[0], speedo = needles[1];
  return {
    root, body, sway, cockpit, steeringWheel, wheels, exhausts,
    // Where the driver's eyes are, in car space.
    cockpitEye: new THREE.Vector3(dx, 1.17 + sh.cockpitOffset[0], -0.08 + sh.cockpitOffset[1]),
    headGlows,
    setPaint(color) { paint.color.set(color); },
    setGlow(on) { glowOn = on; for (const s of sprites) s.visible = on; this.setInterior(inside); },
    setBeams(on) { beamsOn = on; for (const b of beams) b.visible = on && !inside; },
    // From the driver's seat the headlight sprites and beams would fog the
    // windscreen, so hide them.
    setInterior(on) {
      inside = on;
      for (const s of headGlows) s.visible = glowOn && !on;
      for (const b of beams) b.visible = beamsOn && !on;
    },
    update(v) {
      for (const w of wheels) {
        if (w.front) w.steer.rotation.y = v.steerAngle;
        w.spin.rotation.x = w.front ? v.frontWheelAngle : v.rearWheelAngle;
      }
      steeringWheel.rotation.z = -v.steerAngle * 6;
      sway.rotation.x = v.pitch;
      sway.rotation.z = v.roll;
      if (tach) {
        tach.rotation.z = 2.3 - (v.rpm / v.spec.limiterRpm) * 4.6;
        speedo.rotation.z = 2.3 - Math.min(1, Math.abs(v.speedForward) * 3.6 / 300) * 4.6;
      }
      const brake = v.braking > 0.05 && v.speed > 0.2;
      tail.color.setHex(brake ? 0xff3020 : 0x8a0d08);
      for (const g of tailGlows) { g.material.opacity = brake ? 1 : 0.4; g.scale.setScalar(brake ? 1.1 : 0.6); }
      reverseLight.color.setHex(v.gearbox.gear === -1 ? 0xffffff : 0x777777);
    },
    dispose() {
      root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    },
  };
}

// Merge a group's direct mesh children (in the group's own space) into one
// mesh per material. Child groups and anything in `keep` are left alone.
function mergeChildren(group, keep = new Set()) {
  const byMat = new Map();
  for (const o of [...group.children]) {
    if (!o.isMesh || !o.visible || keep.has(o)) continue;
    o.updateMatrix();
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    const mats = Array.isArray(o.material) ? o.material : null;
    const groups = mats && g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
    for (const gr of groups) {
      const m = mats ? mats[gr.materialIndex ?? 0] : o.material;
      if (!m.visible) continue;
      if (!byMat.has(m)) byMat.set(m, { pos: [], nor: [], uv: [] });
      const t = byMat.get(m);
      const p = g.attributes.position.array, n = g.attributes.normal.array, u = g.attributes.uv?.array;
      const end = Math.min(gr.start + gr.count, g.attributes.position.count);
      for (let i = gr.start; i < end; i++) {
        t.pos.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
        t.nor.push(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]);
        if (u) t.uv.push(u[i * 2], u[i * 2 + 1]); else t.uv.push(0, 0);
      }
    }
    g.dispose();
    group.remove(o);
  }
  for (const [m, t] of byMat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(t.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(t.uv, 2));
    group.add(new THREE.Mesh(g, m));
  }
}

// Bake cars into a few static meshes, one per look (material colour and
// texture), for parked cars: hundreds of draw calls become about a dozen.
export function bakeStatic(roots) {
  const byLook = new Map();
  for (const root of roots) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      if (!g.attributes.normal) g.computeVertexNormals();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const groups = g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
      for (const gr of groups) {
        // Boxes carry six face groups even with a single material.
        const m = Array.isArray(o.material) ? mats[gr.materialIndex ?? 0] : o.material;
        if (!m.visible) continue;
        const look = `${m.type}|${m.color?.getHexString()}|${m.map?.uuid}|${m.transparent}|${m.opacity}`;
        if (!byLook.has(look)) byLook.set(look, { m, pos: [], nor: [], uv: [] });
        const t = byLook.get(look);
        const p = g.attributes.position.array, n = g.attributes.normal.array, u = g.attributes.uv?.array;
        const end = Math.min(gr.start + gr.count, g.attributes.position.count);
        for (let i = gr.start; i < end; i++) {
          t.pos.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
          t.nor.push(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]);
          if (u) t.uv.push(u[i * 2], u[i * 2 + 1]); else t.uv.push(0, 0);
        }
      }
      g.dispose();
    });
  }
  const out = new THREE.Group();
  for (const { m, pos, nor, uv } of byLook.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    out.add(new THREE.Mesh(g, m));
  }
  return out;
}

// --- The R34: angular lamps, slim grille, big lower intake, bonnet vent,
// fender ducts, four round tail lights, tall wing, diffuser. ---
function r34Details({ box, body, mats: m }) {
  // --- Front end ---
  for (const s of [1, -1]) {
    // Angular headlight: a wedge that narrows toward the grille.
    const housing = box(0.4, 0.11, 0.06, m.lampInner, s * 0.54, 0.665, 2.2);
    housing.rotation.x = -0.4; housing.rotation.y = s * 0.12; housing.rotation.z = s * -0.08;
    const lens = box(0.17, 0.07, 0.02, m.headlight, s * 0.62, 0.665, 2.235);
    lens.rotation.x = -0.4; lens.rotation.y = s * 0.12;
    const lens2 = box(0.12, 0.06, 0.02, m.headlight, s * 0.44, 0.655, 2.245);
    lens2.rotation.x = -0.4; lens2.rotation.y = s * 0.1;
    box(0.4, 0.018, 0.07, m.trim, s * 0.54, 0.722, 2.19).rotation.x = -0.4; // brow
    box(0.12, 0.04, 0.03, m.amber, s * 0.7, 0.53, 2.255);                   // indicator
    // Brake duct each side of the main intake.
    box(0.2, 0.1, 0.05, m.black, s * 0.62, 0.37, 2.262);
    box(0.2, 0.012, 0.055, m.trim, s * 0.62, 0.36, 2.263);
  }
  // Slim grille between the lamps, with one body-colour bar (no badge).
  box(0.5, 0.075, 0.05, m.black, 0, 0.64, 2.225);
  box(0.5, 0.018, 0.055, m.paint, 0, 0.645, 2.229);
  // Big lower intake with a dark mesh and a centre bar.
  box(0.86, 0.17, 0.05, m.black, 0, 0.42, 2.262);
  box(0.86, 0.015, 0.056, m.trim, 0, 0.43, 2.264);
  box(0.06, 0.17, 0.056, m.paint, 0, 0.42, 2.266);
  box(0.42, 0.1, 0.02, m.plate, 0, 0.555, 2.272);           // plate on the bumper
  const lip = box(1.62, 0.035, 0.18, m.carbon, 0, 0.235, 2.2); // splitter
  lip.rotation.x = 0.03;
  // Carbon vent on the bonnet.
  const vent = box(0.62, 0.02, 0.36, m.carbon, 0, 0.87, 1.45);
  vent.rotation.x = 0.12;
  for (let i = 0; i < 4; i++) box(0.58, 0.012, 0.02, m.black, 0, 0.885 - i * 0.004, 1.33 + i * 0.08).rotation.x = 0.12;
  // Fender ducts behind the front wheels (the GT-R's side vents).
  for (const s of [1, -1]) {
    for (let i = 0; i < 3; i++) box(0.012, 0.025, 0.2, m.black, s * 0.905, 0.6 - i * 0.05, 0.78);
  }

  // --- Sides ---
  for (const s of [1, -1]) {
    box(0.06, 0.07, 2.2, m.carbon, s * 0.88, 0.235, 0.0);   // side skirt
    box(0.005, 0.025, 0.12, m.black, s * 0.885, 0.8, 0.05); // door handle
    box(0.005, 0.012, 3.6, m.trim, s * 0.9, 0.69, 0.05).visible = false; // reserved for a stripe mod
  }

  // --- Rear: four round tail lights, boot lid, wing, diffuser, exhaust ---
  box(1.36, 0.02, 0.03, m.black, 0, 0.88, -2.31);            // boot lid shut line
  const tailGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.04, 14);
  for (const x of [-0.66, -0.43, 0.43, 0.66]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.03, 14), m.tailRing);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.78, -2.318);
    body.add(ring);
    const t = new THREE.Mesh(tailGeo, m.tail);
    t.rotation.x = Math.PI / 2;
    t.position.set(x, 0.78, -2.33);
    body.add(t);
    const chromeRing = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.01, 4, 14), m.chrome);
    chromeRing.position.set(x, 0.78, -2.351);
    body.add(chromeRing);
  }
  for (const s of [1, -1]) box(0.11, 0.05, 0.02, m.reverseLight, s * 0.2, 0.78, -2.33);
  box(0.5, 0.11, 0.02, m.plate, 0, 0.56, -2.33);
  box(1.5, 0.05, 0.1, m.trim, 0, 0.3, -2.27);                // rear valance
  const diff = box(1.1, 0.04, 0.3, m.carbon, 0, 0.215, -2.17); // diffuser
  diff.rotation.x = -0.12;
  for (const x of [-0.3, 0, 0.3]) box(0.02, 0.08, 0.28, m.carbon, x, 0.24, -2.18);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 10, 1, true), m.chrome);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(-0.5, 0.27, -2.3);
  body.add(pipe);
  const pipeIn = new THREE.Mesh(new THREE.CircleGeometry(0.052, 10), m.black);
  pipeIn.position.set(-0.5, 0.27, -2.39);
  pipeIn.rotation.y = Math.PI;
  body.add(pipeIn);

  // Tall wing on two uprights, with endplates and a small flap.
  for (const s of [1, -1]) {
    const up = box(0.05, 0.22, 0.14, m.paint, s * 0.58, 1.08, -2.06);
    up.rotation.x = -0.12;
  }
  const wing = box(1.56, 0.04, 0.3, m.paint, 0, 1.2, -2.1);
  wing.rotation.x = 0.07;
  const flap = box(1.5, 0.03, 0.08, m.paint, 0, 1.235, -2.24);
  flap.rotation.x = -0.4;
  for (const s of [1, -1]) box(0.02, 0.13, 0.36, m.paint, s * 0.78, 1.2, -2.12);

  // Mirrors.
  for (const s of [1, -1]) {
    box(0.1, 0.03, 0.05, m.black, s * 0.85, 0.99, 0.74);
    box(0.15, 0.09, 0.07, m.paint, s * 0.92, 1.01, 0.72);
    box(0.13, 0.07, 0.005, m.chrome, s * 0.92, 1.01, 0.682);
  }
  return { exhausts: [new THREE.Vector3(-0.5, 0.27, -2.42)] };
}

// --- The Challenjer (2009 Challenger SRT8): a long flat bonnet with twin
// scoops, four round lamps in a full-width black grille, a slab-sided body,
// a fastback roof, a full-width tail-light bar, a ducktail lip, twin pipes. ---
function challenjerDetails({ box, body, mats: m }) {
  const roundLamp = (x, y, z, r, mat) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 14), mat);
    l.rotation.x = Math.PI / 2; l.position.set(x, y, z); body.add(l);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.005, 0.01, 4, 14), m.chrome);
    ring.position.set(x, y, z + 0.02); body.add(ring);
  };
  // Front: deep full-width grille with the four lamps set into it.
  box(1.64, 0.24, 0.06, m.black, 0, 0.73, 2.49);
  box(1.64, 0.02, 0.07, m.paint, 0, 0.86, 2.49);          // body-colour brow over the grille
  for (const s of [1, -1]) {
    roundLamp(s * 0.66, 0.73, 2.51, 0.085, m.headlight);
    roundLamp(s * 0.46, 0.73, 2.51, 0.07, m.headlight);
    box(0.1, 0.03, 0.03, m.amber, s * 0.72, 0.52, 2.515);  // parking light
    box(0.14, 0.05, 0.03, m.headlight, s * 0.62, 0.4, 2.505); // fog light
  }
  for (let i = -2; i <= 2; i++) box(0.012, 0.2, 0.065, m.trim, i * 0.12, 0.73, 2.495); // grille bars
  box(1.2, 0.13, 0.05, m.black, 0, 0.42, 2.505);           // lower intake
  box(0.42, 0.1, 0.02, m.plate, 0, 0.56, 2.52);
  const chin = box(1.7, 0.04, 0.16, m.black, 0, 0.27, 2.45);
  chin.rotation.x = 0.04;
  // Twin bonnet scoops, open at the front.
  for (const s of [1, -1]) {
    const scoop = box(0.28, 0.05, 0.5, m.paint, s * 0.3, 0.965, 1.65);
    scoop.rotation.x = 0.04;
    box(0.24, 0.035, 0.02, m.black, s * 0.3, 0.975, 1.905);
  }
  // Sides: door handle, front side marker, a sharp body crease.
  for (const s of [1, -1]) {
    box(0.005, 0.025, 0.14, m.black, s * 0.945, 0.86, 0.35);
    box(0.006, 0.035, 0.08, m.amber, s * 0.94, 0.66, 2.2);
    box(0.006, 0.012, 4.4, m.trim, s * 0.952, 0.8, 0).visible = false; // reserved for a stripe mod
  }
  // Rear: a full-width tail-light bar, reverse lights in the middle, a
  // ducktail lip, bumper, diffuser shape and two pipes.
  box(1.66, 0.16, 0.04, m.black, 0, 0.86, -2.505);
  for (const s of [1, -1]) box(0.68, 0.1, 0.03, m.tail, s * 0.43, 0.86, -2.52);
  box(0.18, 0.1, 0.03, m.reverseLight, 0, 0.86, -2.52);
  const lipR = box(1.6, 0.04, 0.14, m.paint, 0, 1.0, -2.44);
  lipR.rotation.x = -0.25;
  box(0.5, 0.11, 0.02, m.plate, 0, 0.62, -2.52);
  box(1.7, 0.06, 0.1, m.trim, 0, 0.32, -2.47);
  const ex = [];
  for (const s of [1, -1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 10, 1, true), m.chrome);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(s * 0.56, 0.3, -2.5);
    body.add(pipe);
    ex.push(new THREE.Vector3(s * 0.56, 0.3, -2.6));
  }
  // Mirrors.
  for (const s of [1, -1]) {
    box(0.1, 0.03, 0.05, m.black, s * 0.92, 1.06, 0.82);
    box(0.15, 0.1, 0.07, m.paint, s * 0.99, 1.08, 0.8);
    box(0.13, 0.08, 0.005, m.chrome, s * 0.99, 1.08, 0.762);
  }
  return { exhausts: ex };
}

// Each car's proportions. The driver sits at driverX (negative = right-hand
// drive); cockpitOffset moves the whole cockpit [up, forward] to fit.
const SHAPES = {
  'skyliner-r34': {
    body: [
      [-2.30, 0.31, 0.80, 0.74, 0.80, 0.90, 0.72, 0.00],
      [-2.22, 0.22, 0.85, 0.79, 0.87, 0.99, 0.80, 0.01],
      [-1.75, 0.20, 0.86, 0.79, 0.88, 1.00, 0.82, 0.01],
      [-1.00, 0.19, 0.86, 0.78, 0.86, 1.00, 0.79, 0.01],
      [0.00, 0.19, 0.85, 0.77, 0.85, 0.99, 0.77, 0.01],
      [0.80, 0.19, 0.85, 0.76, 0.86, 0.95, 0.80, 0.02],
      [1.35, 0.20, 0.86, 0.74, 0.87, 0.88, 0.81, 0.035],
      [1.95, 0.21, 0.85, 0.71, 0.86, 0.82, 0.80, 0.035],
      [2.20, 0.22, 0.83, 0.64, 0.84, 0.75, 0.77, 0.02],
      [2.30, 0.25, 0.78, 0.55, 0.79, 0.67, 0.71, 0.00],
    ],
    cabin: [
      [-1.12, 0.995, 0.78, 1.0, 0.76],
      [-0.55, 1.0, 0.79, 1.32, 0.63],
      [0.25, 0.985, 0.80, 1.345, 0.65],
      [0.90, 0.945, 0.81, 0.96, 0.79],
    ],
    wheelZ: [1.34, -1.33], wheelX: 0.79, tyreWidth: 0.25,
    archR: 0.45, archTop: 0.71, flare: 0.05, // the GT-R's blistered arches
    core: [1.30, 4.3],
    driverX: -0.38, cockpitOffset: [0, 0], doorX: 0.77,
    headLamp: [0.54, 0.66, 2.33], tailLamp: [0.55, 0.78, -2.44],
    details: r34Details,
  },
  'challenjer-srt8': {
    body: [
      [-2.51, 0.34, 0.86, 0.80, 0.88, 0.98, 0.84, 0.00],
      [-2.42, 0.25, 0.92, 0.86, 0.95, 1.02, 0.88, 0.00],
      [-1.90, 0.22, 0.93, 0.86, 0.96, 1.03, 0.89, 0.01],
      [-1.00, 0.21, 0.93, 0.85, 0.94, 1.03, 0.86, 0.01],
      [0.00, 0.21, 0.93, 0.85, 0.93, 1.02, 0.84, 0.01],
      [0.95, 0.21, 0.93, 0.85, 0.94, 0.99, 0.88, 0.02],
      [1.60, 0.22, 0.93, 0.85, 0.95, 0.98, 0.90, 0.03],
      [2.20, 0.24, 0.92, 0.82, 0.94, 0.96, 0.90, 0.02],
      [2.42, 0.27, 0.90, 0.72, 0.92, 0.92, 0.88, 0.00],
      [2.51, 0.33, 0.86, 0.62, 0.88, 0.86, 0.84, 0.00],
    ],
    cabin: [
      [-1.35, 1.02, 0.86, 1.03, 0.84],
      [-0.75, 1.03, 0.86, 1.43, 0.70],
      [0.20, 1.02, 0.86, 1.45, 0.72],
      [0.98, 0.99, 0.87, 1.00, 0.86],
    ],
    wheelZ: [1.52, -1.43], wheelX: 0.83, tyreWidth: 0.27,
    archR: 0.47, archTop: 0.76, flare: 0.015,
    core: [1.44, 4.8],
    driverX: 0.4, cockpitOffset: [0.06, 0.08], doorX: 0.83,
    headLamp: [0.56, 0.73, 2.58], tailLamp: [0.6, 0.86, -2.6],
    details: challenjerDetails,
  },
};
