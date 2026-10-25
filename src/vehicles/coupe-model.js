// The Kaido R, built from code: a boxy late-90s Japanese coupe with flared
// arches, a squared-off bonnet, a short cabin, a rear wing and round
// tail lights. Original design; no real badges or bodywork.
//
// The body is "lofted": a cross-section shape is defined at points along the
// car's length and joined up with flat faces. The car faces +z, its left side
// is +x (it is right-hand drive, so the driver sits at -x).

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';

const lerp = (a, b, t) => a + (b - a) * t;

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

// Lower body profile keyframes along the car (z), interpolated between.
// [z, bottomY, sillW, shoulderY, shoulderW, topY, topW, crown]
const BODY_KEYS = [
  [-2.31, 0.30, 0.80, 0.72, 0.81, 0.88, 0.72, 0.00],
  [-2.22, 0.22, 0.86, 0.77, 0.88, 0.96, 0.80, 0.01],
  [-1.70, 0.20, 0.88, 0.77, 0.92, 0.98, 0.81, 0.01],
  [-1.00, 0.19, 0.87, 0.77, 0.89, 0.99, 0.78, 0.01],
  [0.00, 0.19, 0.86, 0.76, 0.87, 0.98, 0.76, 0.01],
  [0.85, 0.19, 0.86, 0.75, 0.87, 0.93, 0.79, 0.02],
  [1.35, 0.20, 0.87, 0.73, 0.91, 0.86, 0.81, 0.03],
  [1.95, 0.21, 0.86, 0.70, 0.88, 0.80, 0.80, 0.03],
  [2.18, 0.23, 0.84, 0.62, 0.85, 0.74, 0.78, 0.02],
  [2.27, 0.27, 0.79, 0.54, 0.80, 0.66, 0.72, 0.00],
];

const WHEEL_Z = [1.31, -1.31];
const ARCH_R = 0.43;
const ARCH_TOP = 0.68;

function bodyKey(z) {
  for (let i = 1; i < BODY_KEYS.length; i++) {
    if (z <= BODY_KEYS[i][0] + 1e-6) {
      const a = BODY_KEYS[i - 1], b = BODY_KEYS[i];
      const t = (z - a[0]) / (b[0] - a[0]);
      return a.map((v, k) => lerp(v, b[k], t));
    }
  }
  return BODY_KEYS[BODY_KEYS.length - 1];
}

function archHeight(z) {
  let y = 0;
  for (const c of WHEEL_Z) {
    const d = Math.abs(z - c);
    if (d < ARCH_R) y = Math.max(y, 0.3 + Math.sqrt(1 - (d / ARCH_R) ** 2) * (ARCH_TOP - 0.3));
  }
  return y;
}

function bodySections() {
  const zs = new Set(BODY_KEYS.map((k) => k[0]));
  for (const c of WHEEL_Z) for (let i = -4; i <= 4; i++) zs.add(+(c + i * ARCH_R / 4 * 0.999).toFixed(4));
  const sorted = [...zs].sort((a, b) => a - b);
  return sorted.map((z) => {
    const [, bottomY, sillW, shY, shW, topY, topW, crown] = bodyKey(z);
    const arch = archHeight(z);
    const flare = arch > 0 ? 0.025 : 0;
    const y0 = Math.max(bottomY, arch), y2 = Math.max(bottomY + 0.12, arch);
    return {
      z,
      pts: [[0, y0], [sillW - 0.05, y0], [sillW + flare * 0.5, y2], [shW + flare, Math.max(shY, y2 + 0.04)], [topW, topY], [0, topY + crown]],
    };
  });
}

// Cabin: [z, baseY, baseW, roofY, roofW]
const CABIN_KEYS = [
  [-1.08, 0.985, 0.76, 0.99, 0.74],
  [-0.52, 0.99, 0.78, 1.31, 0.62],
  [0.28, 0.975, 0.79, 1.34, 0.64],
  [0.93, 0.925, 0.80, 0.945, 0.78],
];

export function buildCoupe(paintColor = 0xd8d2bf) {
  const root = new THREE.Group();
  root.name = 'coupe';
  const body = new THREE.Group(); // rolls and pitches on the suspension
  root.add(body);

  const paint = new THREE.MeshPhongMaterial({ color: paintColor, shininess: 70, specular: 0x4a4a44, flatShading: true });
  const trim = new THREE.MeshLambertMaterial({ color: 0x2b2d2e, flatShading: true });
  const black = new THREE.MeshLambertMaterial({ color: 0x0b0b0c });
  const under = new THREE.MeshBasicMaterial({ color: 0x050505 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x0a0f12, shininess: 90, specular: 0x777777, transparent: true, opacity: 0.86, flatShading: true });
  const chrome = new THREE.MeshPhongMaterial({ color: 0x8a8c8e, shininess: 80, specular: 0xaaaaaa });
  const plate = new THREE.MeshLambertMaterial({ color: 0xe6e4da });
  const headlight = new THREE.MeshBasicMaterial({ color: 0xfff1cf });
  const tail = new THREE.MeshBasicMaterial({ color: 0x8a0d08 });
  const reverseLight = new THREE.MeshBasicMaterial({ color: 0x777777 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xc86a10 });
  const interior = new THREE.MeshLambertMaterial({ color: 0x2a2b2d });
  const seatMat = new THREE.MeshLambertMaterial({ color: 0x232426 });

  // Lower body: band 0 is the underside, band 1 the dark sill, the rest paint.
  const lower = new THREE.Mesh(
    loft(bodySections(), (k, j) => (j === 0 ? 2 : j === 1 ? 1 : 0)),
    [paint, trim, under],
  );
  body.add(lower);

  // Cabin: rear glass, roof, windscreen on top; C-pillar, side glass, side glass on the sides.
  const cabinSecs = CABIN_KEYS.map(([z, by, bw, ry, rw]) => ({ z, pts: [[0, ry], [rw, ry], [bw, by]] }));
  const cabinMats = [[1, 0], [0, 1], [1, 1]]; // [top, side] per segment: 0 paint, 1 glass
  const cabin = new THREE.Mesh(
    loft(cabinSecs.map((s) => ({ ...s, pts: [...s.pts].reverse() })), (k, j) => {
      // Points were reversed: band 0 is the side, band 1 the top.
      return cabinMats[k][j === 0 ? 1 : 0];
    }, { capStart: false, capEnd: false }),
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
  box(1.30, 0.42, 4.3, black, 0, 0.42, 0);

  // A-pillars (solid, so they also show from inside the car).
  for (const s of [1, -1]) {
    const p = box(0.07, 0.77, 0.07, paint, s * 0.72, 1.13, 0.605);
    p.rotation.x = -1.0;
    p.rotation.z = s * 0.2;
  }
  // Headliner and inside of the C-pillars, seen from the cockpit.
  const liner = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.82), interior);
  liner.rotation.x = Math.PI / 2;
  liner.position.set(0, 1.3, -0.12);
  body.add(liner);

  // Front end: angular headlights, dark grille, bumper intake, fog and corner lights.
  for (const s of [1, -1]) {
    const hl = box(0.36, 0.09, 0.05, headlight, s * 0.53, 0.66, 2.215);
    hl.rotation.x = -0.35;
    hl.rotation.y = s * 0.08;
    box(0.36, 0.02, 0.06, trim, s * 0.53, 0.715, 2.2).rotation.x = -0.35;
    box(0.14, 0.05, 0.03, amber, s * 0.66, 0.5, 2.255);
    box(0.13, 0.06, 0.03, headlight, s * 0.5, 0.36, 2.262);
  }
  box(0.62, 0.08, 0.05, black, 0, 0.64, 2.225);
  box(0.62, 0.012, 0.055, chrome, 0, 0.665, 2.226);
  box(0.82, 0.12, 0.05, black, 0, 0.37, 2.255);
  box(1.56, 0.04, 0.12, trim, 0, 0.255, 2.2); // front lip
  box(0.5, 0.11, 0.02, plate, 0, 0.49, 2.272);

  // Rear: four round tail lights on a dark panel, reverse lights, plate, exhaust.
  box(1.32, 0.17, 0.03, black, 0, 0.76, -2.315);
  const tailGeo = new THREE.CylinderGeometry(0.083, 0.083, 0.04, 12);
  const tailMeshes = [];
  for (const x of [-0.63, -0.43, 0.43, 0.63]) {
    const t = new THREE.Mesh(tailGeo, tail);
    t.rotation.x = Math.PI / 2;
    t.position.set(x, 0.76, -2.33);
    body.add(t);
    tailMeshes.push(t);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.011, 4, 12), chrome);
    ring.position.set(x, 0.76, -2.351);
    body.add(ring);
  }
  for (const s of [1, -1]) box(0.12, 0.05, 0.02, reverseLight, s * 0.18, 0.76, -2.335);
  box(0.5, 0.11, 0.02, plate, 0, 0.53, -2.33);
  box(1.5, 0.05, 0.1, trim, 0, 0.29, -2.27); // rear valance
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.22, 8, 1, true), chrome);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(-0.52, 0.27, -2.3);
  body.add(pipe);
  const pipeIn = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), black);
  pipeIn.position.set(-0.52, 0.27, -2.39);
  pipeIn.rotation.y = Math.PI;
  body.add(pipeIn);

  // Rear wing on two uprights.
  for (const s of [1, -1]) box(0.05, 0.16, 0.12, paint, s * 0.56, 1.04, -2.05);
  const wing = box(1.52, 0.04, 0.27, paint, 0, 1.13, -2.08);
  wing.rotation.x = 0.06;
  for (const s of [1, -1]) box(0.02, 0.1, 0.3, paint, s * 0.76, 1.12, -2.08);

  // Mirrors.
  for (const s of [1, -1]) {
    box(0.1, 0.03, 0.05, black, s * 0.84, 0.98, 0.78);
    box(0.14, 0.09, 0.07, paint, s * 0.9, 1.0, 0.76);
    const face = box(0.12, 0.07, 0.005, chrome, s * 0.9, 1.0, 0.722);
    face.rotation.y = 0;
  }

  // Door handle hints and a side indicator.
  for (const s of [1, -1]) {
    box(0.005, 0.025, 0.12, black, s * 0.885, 0.79, 0.05);
    box(0.005, 0.03, 0.06, amber, s * 0.89, 0.7, 1.85);
  }

  // Cockpit: dash, gauges, steering wheel, seats.
  box(1.5, 0.1, 0.36, interior, 0, 0.88, 0.64);
  box(1.5, 0.3, 0.06, interior, 0, 0.74, 0.8);
  const hood = box(0.42, 0.07, 0.14, interior, -0.38, 0.955, 0.54); // binnacle
  hood.rotation.x = -0.2;
  const gauges = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.14), new THREE.MeshBasicMaterial({ map: Tex.gauges(), color: 0x999999 }));
  gauges.position.set(-0.38, 0.92, 0.47);
  gauges.rotation.y = Math.PI;
  gauges.rotation.x = 0.15;
  body.add(gauges);
  box(0.2, 0.22, 0.4, interior, 0, 0.7, 0.35); // centre console
  for (const s of [1, -1]) {
    box(0.48, 0.12, 0.5, seatMat, s * 0.38, 0.55, -0.25);
    const back = box(0.48, 0.62, 0.12, seatMat, s * 0.38, 0.86, -0.53);
    back.rotation.x = -0.18;
  }
  box(1.4, 0.06, 0.4, interior, 0, 0.98, -0.88); // parcel shelf

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(-0.38, 0.9, 0.38);
  wheelPivot.rotation.x = -0.42;
  body.add(wheelPivot);
  const steeringWheel = new THREE.Group();
  wheelPivot.add(steeringWheel);
  const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.019, 5, 14), new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
  steeringWheel.add(rimMesh);
  for (const a of [0, Math.PI * 0.5, Math.PI]) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.015), trim);
    sp.position.set(Math.cos(a + Math.PI) * 0.08, Math.sin(a + Math.PI) * 0.08, 0);
    sp.rotation.z = a;
    steeringWheel.add(sp);
  }
  steeringWheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8).rotateX(Math.PI / 2), trim));

  // Wheels: tyre with a five-spoke face on the outside.
  const tyreMat = new THREE.MeshLambertMaterial({ map: Tex.tire(), color: 0x8a8a8a });
  const rimMat = new THREE.MeshLambertMaterial({ map: Tex.rim() });
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [x, z, front] of [[0.76, 1.31, true], [-0.76, 1.31, true], [0.76, -1.31, false], [-0.76, -1.31, false]]) {
    const steer = new THREE.Group();
    steer.position.set(x, 0.32, z);
    root.add(steer);
    // After rotating the cylinder its top cap faces -x and its bottom cap +x.
    const spin = new THREE.Mesh(wheelGeo, [tyreMat, x > 0 ? tyreMat : rimMat, x > 0 ? rimMat : tyreMat]);
    steer.add(spin);
    wheels.push({ steer, spin, front });
  }

  // Glow sprites so lights read from a distance.
  const glowTex = Tex.glow();
  const sprite = (color, size, x, y, z) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    body.add(s);
    return s;
  };
  const headGlows = [sprite(0xfff0c8, 0.9, 0.53, 0.66, 2.32), sprite(0xfff0c8, 0.9, -0.53, 0.66, 2.32)];
  const tailGlows = [-0.53, 0.53].map((x) => sprite(0xff2010, 0.7, x, 0.76, -2.42));

  // Blob shadow (always on; real shadows are a High setting extra).
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 5.0), new THREE.MeshBasicMaterial({ map: Tex.blobShadow(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  blob.renderOrder = 1;
  root.add(blob);

  root.traverse((o) => { if (o.isMesh && o !== blob) { o.castShadow = true; } });

  return {
    root, body, steeringWheel, wheels,
    // Where the driver's eyes are, in car space.
    cockpitEye: new THREE.Vector3(-0.38, 1.19, -0.02),
    headGlows,
    setPaint(color) { paint.color.set(color); },
    update(v) {
      for (const w of wheels) {
        if (w.front) w.steer.rotation.y = v.steerAngle;
        w.spin.rotation.x = w.front ? v.frontWheelAngle : v.rearWheelAngle;
      }
      steeringWheel.rotation.z = -v.steerAngle * 6;
      body.rotation.x = v.pitch;
      body.rotation.z = v.roll;
      const brake = v.braking > 0.05 && v.speed > 0.2;
      tail.color.setHex(brake ? 0xff3020 : 0x8a0d08);
      for (const g of tailGlows) { g.material.opacity = brake ? 1 : 0.4; g.scale.setScalar(brake ? 1.1 : 0.6); }
      reverseLight.color.setHex(v.gearbox.gear === -1 ? 0xffffff : 0x777777);
    },
  };
}
