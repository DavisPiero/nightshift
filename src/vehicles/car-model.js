// The cars. A car with a capture (captured.js, made by tools/capture-car.mjs)
// is built from its real surfaces; the others are drawn from profile curves
// (see body.js), with lamps, grilles and vents laid on the surface. Paint is
// clear-coated and reflects the lights around the car
// (src/graphics/reflections.js), so even black paint shows its shape. No
// badges or logos.
//
// The car faces +z, its left side is +x. The body leans on its springs
// around a point near axle height, so it tips a little but never dips into
// the road. The cockpit (dashboard, wheel, seats) is part of the body and
// leans with it, so no gaps open between the cabin and the glass; the
// cockpit camera rides with the body but keeps most of the horizon level.

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';
import { Body, SLOT, flatShape, roundRect } from './body.js';
import { bonnetRange, buildEngineBay } from './engine-bay.js';
import { buildCabin } from './cabin.js';
import { captures, capturedParts, projectDecal, rimFit } from './captured.js';
import { rimGeometry } from './wheels.js';
import { FINISHES, RIDE, checkLook } from './looks.js';

const ROLL_CENTRE = 0.42; // m above the road

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

// Car paint in one of the finishes (looks.js): gloss, metallic and pearl
// are clear-coated; matte is not.
export function paintMaterial(color, finish = 'metallic') {
  const f = FINISHES[finish] || FINISHES.metallic;
  // A little wear (swirls, fine scratches, dirt) breaks up the reflections.
  const wear = Tex.wear();
  return new THREE.MeshPhysicalMaterial({
    color, metalness: f.metalness, roughness: f.roughness, clearcoat: f.clearcoat, clearcoatRoughness: f.clearcoat ? 0.5 : 0.07,
    clearcoatRoughnessMap: f.clearcoat ? wear : null,
    iridescence: f.iridescence, iridescenceIOR: 1.6, envMapIntensity: f.clearcoat ? 1.1 : 0.5,
  });
}

// The widebody's shape: the same car with blistered arches.
function wideDef(def) {
  const [f, r] = def.wheels.flare;
  return { ...def, wheels: { ...def.wheels, flare: [f + 0.05, r + 0.06] }, bulge: (def.bulge ?? 0.015) + 0.01 };
}

// spec: the car as built (its parts set flags like wing, kit, bigBrakes).
// look: paint, finish, decal, wheels and ride height (looks.js), or just a
// paint colour.
export function buildCar(spec, look = spec.paint, { simple = false } = {}) {
  const sh = SHAPES[spec.id] || SHAPES['skyliner-r34'];
  look = checkLook(typeof look === 'number' ? { paint: look } : look, spec);
  const cap = captures(spec.id); // the car's captured surfaces, if it has them (captured.js)
  const wide = spec.kit === 'wide' && !cap;
  if (cap) sh.capDef ??= cap.def;
  const B = cap ? (sh.capBody ??= new Body(cap.def)) : wide ? (sh.wideBody ??= new Body(wideDef(sh.def))) : (sh.body ??= new Body(sh.def));
  const def = cap ? cap.def : sh.def;
  const drop = RIDE[look.ride].drop;
  const root = new THREE.Group();
  root.name = spec.id;
  const sway = new THREE.Group();   // leans and pitches about the roll centre
  sway.position.y = ROLL_CENTRE;
  root.add(sway);
  const body = new THREE.Group();
  body.position.y = -ROLL_CENTRE - drop;
  sway.add(body);
  const cockpit = new THREE.Group(); // the cabin, inside the body
  body.add(cockpit);

  const paint = paintMaterial(look.paint, look.finish);
  const trim = new THREE.MeshStandardMaterial({ color: 0x141516, roughness: 0.55, metalness: 0.2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.9, metalness: 0 });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.32, metalness: 0.35 });
  const under = new THREE.MeshBasicMaterial({ color: 0x040404 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1216, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.88, envMapIntensity: 2.2 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd4d8dc, roughness: 0.16, metalness: 1, envMapIntensity: 1.4 });
  const plate = new THREE.MeshLambertMaterial({ color: 0xe6e4da });
  const headlight = new THREE.MeshBasicMaterial({ color: 0xfff4dc });
  const lampInner = new THREE.MeshStandardMaterial({ color: 0x0d0f11, roughness: 0.3, metalness: 0.6, envMapIntensity: 0.8 }); // dark lamp housings
  const lens = new THREE.MeshPhysicalMaterial({ color: 0x20262a, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12, envMapIntensity: 0.5 });
  const tail = new THREE.MeshBasicMaterial({ color: 0x8a0d08 });
  const tailRing = new THREE.MeshBasicMaterial({ color: 0x3a0503 });
  const reverseLight = new THREE.MeshBasicMaterial({ color: 0x777777 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xc86a10 });
  // The cabin's own materials are in cabin.js.

  // The body shell: one smooth mesh, paint / trim / underside / glass.
  const shellMats = [];
  shellMats[SLOT.paint] = paint; shellMats[SLOT.trim] = trim; shellMats[SLOT.under] = under; shellMats[SLOT.glass] = glass;
  const bonnet = simple ? null : cap ? cap.lid : bonnetRange(B, def); // its own panel, so it can open
  if (!cap) body.add(new THREE.Mesh(B.geometry({ bonnet }), shellMats));

  const add = (geo, mat, parent = body) => { const m = new THREE.Mesh(geo, mat); parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, parent = body) => {
    const m = add(new THREE.BoxGeometry(w, h, d), mat, parent);
    m.position.set(x, y, z);
    return m;
  };
  // Solid core so nothing shows through the wheel arches.
  if (!cap) box(sh.core[0], 0.4, sh.core[1], black, 0, 0.44, sh.core[2] ?? 0);

  const mats = { paint, trim, black, carbon, chrome, plate, headlight, lampInner, lens, tail, tailRing, reverseLight, amber, glass };
  const tip = 1 + ((spec.exhaustVolume ?? 1) - 1) * 0.7; // louder exhausts, bigger tips
  let exhausts, popups = null;
  if (cap) {
    // Captured cars carry their own lamps, mirrors, grilles and exhausts. They
    // go in a group of their own: already one mesh per part, nothing to merge.
    Object.assign(mats, { metal: new THREE.MeshStandardMaterial({ color: 0x8a8e92, roughness: 0.35, metalness: 0.9 }), under: under });
    const shell = new THREE.Group();
    body.add(shell);
    for (const m of capturedParts(cap, simple ? 1 : 0, mats, 'body')) shell.add(m);
    if (simple) {
      for (const m of capturedParts(cap, 1, mats, 'lid')) shell.add(m);
      if (mats.lampF) mats.lampF.emissiveIntensity = 0.05; // parked: lights off
      if (mats.lampR) mats.lampR.emissiveIntensity = 0.1;
    }
    exhausts = (cap.exhausts || []).map(([x, y, z]) => new THREE.Vector3(x, y, z));
    // Pop-up headlamps: lids, housings and lamps on one hinge across the car.
    if (cap.popups) {
      popups = new THREE.Group();
      popups.position.set(0, ...cap.popups.pivot);
      for (const m of capturedParts(cap, simple ? 1 : 0, mats, 'pop')) { m.position.set(0, -cap.popups.pivot[0], -cap.popups.pivot[1]); popups.add(m); }
      body.add(popups);
    }
  } else ({ exhausts } = sh.details({ B, box, add, body, mats, spec, tip }));
  if (!cap || !cap.ownWing) {
    if (!cap) bodyKit({ B, box, spec, mats, sh });
    else if (cap.kits && !simple && spec.kit) for (const m of capturedParts(cap, 0, mats, spec.kit === 'wide' ? 'kitWide' : 'kitStreet')) body.add(m);
    if (spec.wing === 'gt') gtWing({ B, box, mats }, cap?.kits ? 0.74 : 1);
  }
  if (look.decal !== 'none') (cap ? capturedDecals : decals)({ B, add, look, sh, bonnet, cap });

  // The bonnet and engine bay. Anything laid on top of the bonnet (vents,
  // scoops, stripes) moves to the bonnet so it lifts with it.
  let bay = null;
  if (bonnet) {
    bay = buildEngineBay({ B, def, spec, mats, lid: cap ? cap.lid : null });
    body.add(bay.bay, bay.hinge);
    const lid = cap ? capturedParts(cap, 0, mats, 'lid') : [];
    // Its underside, seen when it lifts: the same panel, dark, facing inwards.
    if (cap) { const inside = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.8, side: THREE.BackSide }); for (const m of [...lid]) lid.push(new THREE.Mesh(m.geometry, inside)); }
    for (const m of lid) body.add(m);
    body.updateMatrixWorld(true);
    for (const m of lid) bay.hinge.attach(m); // stays where it is, but lifts with the hinge
    if (popups) bay.hinge.attach(popups);
    const c = new THREE.Vector3();
    for (const m of [...body.children]) {
      if (!m.isMesh) continue;
      m.geometry.computeBoundingBox();
      m.geometry.boundingBox.getCenter(c).applyMatrix4(m.matrix);
      if (c.z > bonnet[0] + 0.02 && c.z < bonnet[1] - 0.02 && Math.abs(c.x) < B.width(c.z) * 0.8 && c.y > B.hood(c.z) - 0.05) bay.hinge.attach(m);
    }
  }

  // --- Cockpit. The driver sits at driverX. ---
  const dx = sh.driverX;
  let steeringWheel = new THREE.Group(), needles = [], dome = null;
  if (cap) {
    if (!simple) ({ steeringWheel, needles, dome } = capturedCabin(cockpit, cap, mats));
  } else {
    cockpit.position.set(0, sh.cockpitOffset[0], sh.cockpitOffset[1]);
    if (!simple) ({ wheel: steeringWheel, needles, dome } = buildCabin(cockpit, { dx, sh, spec, mats, B }));
  }

  // Wheels: tyre, a rim face with open spokes, and a brake disc and calliper
  // behind it (they steer but do not spin).
  const WR = spec.wheelRadius, TW = sh.tyreWidth + (wide ? 0.03 : 0);
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const tyreMat = new THREE.MeshStandardMaterial({ map: Tex.tire(), color: 0x9a9a9a, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x161617, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ map: Tex.rimFace(look.rim || sh.rim.style, look.rimColour !== null ? hex(look.rimColour) : sh.rim.color), transparent: true, alphaTest: 0.5, metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, metalness: 0.8, roughness: 0.4, side: THREE.BackSide });
  const discMat = new THREE.MeshStandardMaterial({ color: 0x55585a, metalness: 0.9, roughness: 0.35 });
  const caliperMat = new THREE.MeshStandardMaterial({ color: look.caliper ?? (spec.bigBrakes ? 0xb01818 : sh.rim.caliper), roughness: 0.45, metalness: 0.3 });
  const big = spec.bigBrakes ? 1.22 : 1; // big brake kit: bigger discs and callipers
  const treadGeo = new THREE.CylinderGeometry(WR, WR, TW, 22, 1, true).rotateZ(Math.PI / 2);
  const sideGeo = new THREE.RingGeometry(WR * 0.74, WR, 22).rotateY(Math.PI / 2);
  const faceGeo = new THREE.CircleGeometry(WR * 0.76, 22).rotateY(Math.PI / 2);
  const barrelGeo = new THREE.CylinderGeometry(WR * 0.74, WR * 0.74, TW * 0.9, 18, 1, true).rotateZ(Math.PI / 2);
  const discGeo = new THREE.CircleGeometry(WR * 0.6 * big, 18).rotateY(Math.PI / 2);
  const rimTint = cap && look.rimColour !== null ? new THREE.MeshStandardMaterial({ color: look.rimColour, metalness: 0.75, roughness: 0.3 }) : null;
  const wheels = [];
  let rimBody = null;
  const [WZf, WZr] = def.wheels.z, WX = sh.wheelX + (wide ? 0.045 : 0);
  const capWheels = !!cap && !simple; // a captured car keeps its tyres and brakes whatever rim it wears
  const wheelSpots = cap ? [[cap.wheels[0].c[0], cap.wheels[0].c[2], true], [-cap.wheels[0].c[0], cap.wheels[0].c[2], true], [cap.wheels[2].c[0], cap.wheels[2].c[2], false], [-cap.wheels[2].c[0], cap.wheels[2].c[2], false]]
    : [[WX, WZf, true], [-WX, WZf, true], [WX, WZr, false], [-WX, WZr, false]];
  for (const [x, z, front] of wheelSpots) {
    const out = Math.sign(x);
    const steer = new THREE.Group();
    const wr = cap ? cap.wheels[front ? 0 : 2].r : WR;
    steer.position.set(x + (cap?.kits && spec.kit === 'wide' ? Math.sign(x) * 0.035 : 0), wr, z);
    root.add(steer);
    const spin = new THREE.Group();
    steer.add(spin);
    if (capWheels) {
      // The captured wheel: the left one of its axle, turned round for the
      // right. Spinning parts on `spin`, the brake on `steer`.
      const axle = front ? 'F' : 'R';
      const wmats = { ...mats, tyre: wallMat, caliper: caliperMat, disc: discMat };
      if (look.rimColour !== null) wmats.rim = rimTint;
      const place = (parent) => (m) => { if (out < 0) m.rotation.y = Math.PI; parent.add(m); };
      capturedParts(cap, 0, wmats, `spin${axle}`, look.rim ? ['rim', 'metal'] : null).forEach(place(spin));
      capturedParts(cap, 0, wmats, `hub${axle}`).forEach(place(steer));
      if (look.rim) {
        const fit = rimFit(cap, front), g = rimGeometry(look.rim, fit.R, fit.w);
        rimBody ??= new THREE.MeshStandardMaterial({ color: look.rimColour ?? 0xb8bcc0, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide, envMapIntensity: 1.3 });
        place(spin)(new THREE.Mesh(g.rim, rimBody));
        place(spin)(new THREE.Mesh(g.nuts, mats.metal));
      }
      wheels.push({ steer, spin, front });
      continue;
    }
    if (cap) spin.scale.setScalar(wr / WR);
    spin.add(new THREE.Mesh(treadGeo, tyreMat));
    for (const s of [1, -1]) {
      const w = new THREE.Mesh(sideGeo, wallMat);
      w.position.x = s * TW / 2;
      if (s < 0) w.rotation.y = Math.PI;
      spin.add(w);
    }
    spin.add(new THREE.Mesh(barrelGeo, barrelMat));
    const face = new THREE.Mesh(faceGeo, rimMat);
    face.position.x = out * (TW / 2 - 0.035);
    if (out < 0) face.rotation.y = Math.PI;
    spin.add(face);
    if (!simple) {
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.x = out * (TW / 2 - 0.09);
      if (out < 0) disc.rotation.y = Math.PI;
      steer.add(disc);
      // The calliper straddles the disc, clear of the rim face and inside
      // the barrel, so the two never fight over the same pixels (flicker).
      const cal = new THREE.Mesh(new THREE.BoxGeometry(0.05, WR * 0.3 * big, WR * 0.42 * big), caliperMat);
      cal.position.set(out * (TW / 2 - 0.078), WR * 0.36 * big, front ? -WR * 0.16 : WR * 0.16);
      cal.rotation.x = front ? -0.5 : 0.5;
      steer.add(cal);
    }
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
  const [hx, hy, hz] = cap?.headLamp ?? sh.headLamp, [tx, ty, tz] = cap?.tailLamp ?? sh.tailLamp;
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

  // Headlight: a real spot light from the nose. Brake lights: a red light
  // behind the car that washes the road when you brake.
  let lamp = null, brakeLamp = null;
  if (!simple) {
    lamp = new THREE.SpotLight(0xfff0d0, 120, 70, 0.42, 0.55, 1.3);
    lamp.position.set(0, 0.7, hz - 0.3);
    lamp.target.position.set(0, -0.6, 22);
    root.add(lamp, lamp.target);
    brakeLamp = new THREE.PointLight(0xff2a14, 0, 7, 1.8);
    brakeLamp.position.set(0, ty, tz - 0.5);
    root.add(brakeLamp);
  }

  // Blob shadow (always on; real shadows are a Graphics setting).
  const L = B.z1 - B.z0;
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.3, L + 0.4), new THREE.MeshBasicMaterial({ map: Tex.blobShadow(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(0, 0.02, (B.z0 + B.z1) / 2);
  blob.renderOrder = 1;
  root.add(blob);

  // Merge the parts that never move into one mesh per material (materials
  // stay shared, so paint and brake lights still change).
  mergeChildren(body, new Set(beams));
  mergeChildren(cockpit);

  root.traverse((o) => { if (o.isMesh && o !== blob) o.castShadow = true; });
  for (const b of beams) b.castShadow = false;

  let glowOn = true, beamsOn = true, inside = false, lightsOn = true;
  let bonnetOpen = false, bonnetAngle = 0, popAngle = 0;
  const drops = []; // parts dropping into the engine bay
  const tach = needles[0], speedo = needles[1];
  return {
    root, body, sway, cockpit, steeringWheel, wheels, exhausts,
    engineRear: !!def.engineLid,
    // Where the driver's eyes are, in the body's space (so they lean and
    // drop with it).
    cockpitEye: cap ? new THREE.Vector3(...cap.eye) : new THREE.Vector3(dx * (sh.cabinScale ?? 1), 1.17 * (sh.cabinScale ?? 1) + sh.cockpitOffset[0], -0.08 * (sh.cabinScale ?? 1) + sh.cockpitOffset[1]),
    headGlows,
    setPaint(color) { paint.color.set(color); },
    // Lift the bonnet (the garage's Engine tab). `now`: no animation.
    setBonnet(open, now = false) {
      bonnetOpen = open && !!bay;
      if (now) bonnetAngle = bonnetOpen ? -0.95 : 0;
    },
    // A part was just fitted: it drops into the bay.
    fitPart(slot) {
      const g = bay?.slots[slot];
      if (g) drops.push({ g, t: 0 });
    },
    setGlow(on) { glowOn = on; for (const s of sprites) s.visible = on; this.setInterior(inside); },
    setBeams(on) { beamsOn = on; this.setInterior(inside); },
    // Lights off in the garage (parked, engine off).
    setLights(on) { lightsOn = on; if (lamp) lamp.visible = on; this.setInterior(inside); },
    // From the driver's seat the headlight sprites and beams would fog the
    // windscreen, so hide them.
    setInterior(on) {
      inside = on;
      for (const s of headGlows) s.visible = glowOn && !on && lightsOn;
      for (const s of tailGlows) s.visible = glowOn && lightsOn;
      for (const b of beams) b.visible = beamsOn && !on && lightsOn;
      if (dome) dome.intensity = on ? 1.4 : 0; // the little light in the roof
    },
    update(v, dt = 0) {
      if (bay) {
        // The bonnet swings up on its hinge, easing in and out.
        bonnetAngle += ((bonnetOpen ? -0.95 : 0) - bonnetAngle) * Math.min(1, dt * 5);
        bay.hinge.rotation.x = bonnetAngle * bay.dir;
        bay.bay.visible = bonnetAngle < -0.02;
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.t += dt;
          const k = Math.min(1, d.t / 0.45);
          // Drops in from above and settles with a small bounce.
          const ease = 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
          d.g.position.y = (1 - ease) * 0.45;
          d.g.scale.setScalar(0.7 + 0.3 * Math.min(1, ease));
          if (k >= 1) { d.g.position.y = 0; d.g.scale.setScalar(1); drops.splice(i, 1); }
        }
      }
      if (popups) {
        popAngle += ((lightsOn ? cap.popups.lift : 0) - popAngle) * Math.min(1, dt * 4);
        popups.rotation.x = -popAngle;
      }
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
      // Brake lights and headlamps are brighter than white, for the bloom.
      if (brake) tail.color.setRGB(3.2, 0.1, 0.05); else tail.color.setHex(lightsOn ? 0x8a0d08 : 0x3a0806);
      if (mats.lampR) mats.lampR.emissiveIntensity = brake ? 3.5 : lightsOn ? 0.7 : 0.12;
      if (mats.lampF) mats.lampF.emissiveIntensity = lightsOn ? 2.6 : 0.08;
      for (const g of tailGlows) { g.material.opacity = brake ? 1 : 0.4; g.scale.setScalar(brake ? 1.1 : 0.6); }
      if (brakeLamp) brakeLamp.intensity = lightsOn ? (brake ? 6 : 0.8) : 0;
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
      if (!m || !m.visible) continue;
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
    const mesh = new THREE.Mesh(g, m);
    if (m.transparent) mesh.renderOrder = 1; // glass after the body behind it
    group.add(mesh);
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
        const m = Array.isArray(o.material) ? mats[gr.materialIndex ?? 0] : o.material;
        if (!m || !m.visible) continue;
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

// ---------------------------------------------------------------------------
// Shared detail pieces.

// A round lamp on a flat end of the car: a coloured disc in a ring.
function roundLamp(add, mats, x, y, z, r, facing, lit, ringMat = mats.tailRing) {
  const ring = add(new THREE.CircleGeometry(r * 1.22, 18), ringMat);
  ring.position.set(x, y, z + facing * 0.004);
  if (facing < 0) ring.rotation.y = Math.PI;
  const disc = add(new THREE.CircleGeometry(r, 18), lit);
  disc.position.set(x, y, z + facing * 0.008);
  if (facing < 0) disc.rotation.y = Math.PI;
  return disc;
}

// Door mirrors at the front of the side windows: a black sail on the door
// top where the glass starts, a short stalk, a rounded body-colour housing,
// the glass facing back. Every piece overlaps the next, so nothing floats.
function mirror(add, mats, B, z, s = 1) {
  const [bx, by] = B.section(z).p[8];
  const housing = new THREE.ExtrudeGeometry(new THREE.Shape(roundRect(0, 0, 0.17 * s, 0.095 * s, 0.035 * s).map(([x, y]) => new THREE.Vector2(x, y))),
    { depth: 0.05 * s, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 4 });
  housing.translate(0, 0, -0.025 * s);
  for (const side of [1, -1]) {
    const x = side * (bx + 0.085 * s), y = by + 0.065 * s;
    const sail = add(new THREE.BoxGeometry(0.05, 0.06, 0.12), mats.black);
    sail.position.set(side * (bx - 0.005), by + 0.02, z + 0.02);
    const stalk = add(new THREE.BoxGeometry(0.07 * s, 0.03, 0.04), mats.black);
    stalk.position.set(side * (bx + 0.03 * s), by + 0.045 * s, z + 0.01);
    const shell = add(housing, mats.paint);
    shell.position.set(x, y, z); shell.rotation.y = side * 0.12;
    const glass = add(new THREE.PlaneGeometry(0.15 * s, 0.075 * s), mats.chrome);
    glass.position.set(x - side * 0.004, y, z - 0.04 * s); glass.rotation.y = Math.PI + side * 0.12;
  }
}

// An exhaust tip pointing backwards; returns where the flames come out.
function exhaust(add, mats, x, y, z, r = 0.05, len = 0.18) {
  const pipe = add(new THREE.CylinderGeometry(r, r * 0.92, len, 14, 1, true), mats.chrome);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(x, y, z);
  const inner = add(new THREE.CircleGeometry(r * 0.85, 12), mats.black);
  inner.position.set(x, y, z - len * 0.35);
  inner.rotation.y = Math.PI;
  return new THREE.Vector3(x, y, z - len / 2 - 0.04);
}

// ---------------------------------------------------------------------------
// The R34 (1999 Skyline GT-R): square shoulders, flat bonnet with a vent,
// angular lamps, blistered arches, a tall wing and four round tail lights.
function r34Details({ B, add, box, mats: m, spec, tip }) {
  const zf = B.z1, zr = B.z0;
  // Angular headlights across the front corners, a slim grille between.
  add(B.decal(2.02, zf - 0.015, 5.5, (z) => 8.6 - (z - 2.02) * 1.2, { nz: 6, nt: 5 }), m.lampInner);
  add(B.decal(2.12, zf - 0.02, 6.0, 7.6, { lift: 0.007, nz: 4, nt: 3 }), m.headlight);
  add(B.decal(2.02, 2.2, 5.6, 6.2, { lift: 0.007 }), m.amber);
  for (const s of [1, -1]) {
    add(flatShape([[s * 0.33, 0.655], [s * 0.7, 0.625], [s * 0.71, 0.575], [s * 0.35, 0.595]], zf, 1, 0.004), m.lampInner);
    add(flatShape([[s * 0.52, 0.638], [s * 0.68, 0.622], [s * 0.69, 0.585], [s * 0.53, 0.6]], zf, 1, 0.007), m.headlight);
    add(flatShape([[s * 0.36, 0.645], [s * 0.49, 0.635], [s * 0.5, 0.6], [s * 0.37, 0.61]], zf, 1, 0.007), m.headlight);
  }
  add(flatShape(roundRect(0, 0.6, 0.62, 0.07, 0.015), zf, 1), m.black);
  add(flatShape(roundRect(0, 0.4, 1.0, 0.18, 0.03), zf, 1), m.black);
  add(flatShape(roundRect(0, 0.4, 0.05, 0.18, 0.01), zf, 1, 0.007), m.paint);
  for (const s of [1, -1]) add(flatShape(roundRect(s * 0.66, 0.36, 0.22, 0.09, 0.02), zf, 1), m.black);
  add(flatShape(roundRect(0, 0.53, 0.4, 0.09, 0.01), zf, 1, 0.006), m.plate);
  const lip = box(1.6, 0.03, 0.2, m.carbon, 0, 0.215, zf - 0.08);
  lip.rotation.x = 0.03;
  // Carbon vent on the bonnet, and the fender ducts behind the front wheels.
  add(B.decal(1.28, 1.62, 10.4, 12, { lift: 0.006 }), m.carbon);
  for (let i = 0; i < 4; i++) add(B.decal(1.32 + i * 0.075, 1.35 + i * 0.075, 10.6, 12, { lift: 0.009, nz: 1 }), m.black);
  for (let i = 0; i < 3; i++) add(B.decal(0.66, 0.86, 4.35 + i * 0.32, 4.5 + i * 0.32, { lift: 0.005, nz: 2, nt: 1 }), m.black);
  // Sides: door handles and a carbon skirt.
  add(B.decal(-0.05, 0.08, 5.15, 5.4, { lift: 0.006, nz: 1, nt: 1 }), m.black);
  for (const s of [1, -1]) box(0.05, 0.06, 2.1, m.carbon, s * 0.86, 0.22, 0);
  // Rear: four round tail lights, plate, valance, diffuser, one big exhaust.
  const tails = [];
  for (const x of [-0.64, -0.42, 0.42, 0.64]) tails.push(roundLamp(add, m, x, 0.76, zr, 0.088, -1, m.tail));
  for (const s of [1, -1]) add(flatShape(roundRect(s * 0.2, 0.76, 0.1, 0.05, 0.01), zr, -1, 0.006), m.reverseLight);
  add(flatShape(roundRect(0, 0.56, 0.5, 0.11, 0.01), zr, -1, 0.006), m.plate);
  add(flatShape(roundRect(0, 0.36, 1.4, 0.1, 0.02), zr, -1), m.black);
  const diff = box(1.1, 0.03, 0.3, m.carbon, 0, 0.23, zr + 0.12);
  diff.rotation.x = -0.12;
  for (const x of [-0.3, 0, 0.3]) box(0.02, 0.08, 0.26, m.carbon, x, 0.26, zr + 0.12);
  const ex = [exhaust(add, m, -0.5, 0.28, zr - 0.02, 0.06 * tip, 0.2)];
  if (!spec.wing) r34Wing({ box, m, zr });
  mirror(add, m, B, 0.74);
  return { exhausts: ex, tails };
}

// The Miata (1990 MX-5): a small, round-nosed roadster. Pop-up headlights
// (open, because the lights are on), amber indicators low in the nose, a low
// mouth, a bonnet with soft bulges over the wings, oval tail lights, a plate
// between them, one exhaust and a black soft top (def.softTop).
function miataDetails({ B, add, box, mats: m, spec, tip }) {
  const zf = B.z1, zr = B.z0;
  // Nose: a low, wide mouth with a thin lip, amber indicators in the corners.
  add(flatShape(roundRect(0, 0.33, 0.92, 0.1, 0.035), zf, 1), m.black);
  add(flatShape(roundRect(0, 0.4, 0.5, 0.05, 0.015), zf, 1, 0.006), m.trim);
  for (const s of [1, -1]) {
    add(flatShape(roundRect(s * 0.58, 0.45, 0.2, 0.075, 0.025), zf, 1, 0.004), m.lampInner);
    add(flatShape(roundRect(s * 0.58, 0.45, 0.17, 0.05, 0.02), zf, 1, 0.007), m.amber);
    add(flatShape(roundRect(s * 0.24, 0.47, 0.1, 0.05, 0.015), zf, 1, 0.005), m.lampInner);
  }
  const lip = box(1.4, 0.02, 0.14, m.carbon, 0, 0.27, zf - 0.05);
  lip.rotation.x = 0.04;
  // Pop-up headlights, raised: a black bucket, the lamp facing forward, the
  // body-colour lid tipped up behind it.
  for (const s of [1, -1]) {
    const x = s * 0.5, y = B.hood(1.58) + 0.02;
    const bucket = add(new THREE.CylinderGeometry(0.085, 0.085, 0.11, 14), m.black);
    bucket.rotation.x = Math.PI / 2; bucket.position.set(x, y + 0.07, 1.58);
    const disc = add(new THREE.CircleGeometry(0.07, 14), m.headlight);
    disc.position.set(x, y + 0.07, 1.58 + 0.058);
    const lid = box(0.19, 0.012, 0.15, m.paint, x, y + 0.14, 1.52);
    lid.rotation.x = -0.35;
  }
  // The bonnet's two soft bulges over the front wings, and a door handle.
  for (const s of [1, -1]) add(B.decal(1.25, 1.72, s > 0 ? 7.2 : 4.8, s > 0 ? 8.2 : 5.8, { lift: 0.004, sides: [s], nz: 4, nt: 1 }), m.paint);
  add(B.decal(-0.05, 0.1, 5.2, 5.4, { lift: 0.006, nz: 1, nt: 1 }), m.black);
  for (const s of [1, -1]) box(0.04, 0.05, 1.5, m.carbon, s * 0.78, 0.2, 0);
  // Tail: a wide oval lamp each side (two round lenses), a dark plate panel,
  // reverse lamps, a lip under the bumper and one exhaust on the left.
  const tails = [];
  for (const s of [1, -1]) {
    add(flatShape(roundRect(s * 0.66, 0.74, 0.34, 0.12, 0.05), zr, -1, 0.003), m.tailRing);
    tails.push(roundLamp(add, m, s * 0.58, 0.74, zr, 0.052, -1, m.tail));
    tails.push(roundLamp(add, m, s * 0.74, 0.74, zr, 0.052, -1, m.tail));
  }
  add(flatShape(roundRect(0, 0.66, 0.5, 0.13, 0.02), zr, -1, 0.004), m.black);
  add(flatShape(roundRect(0, 0.66, 0.4, 0.085, 0.01), zr, -1, 0.007), m.plate);
  add(flatShape(roundRect(0, 0.4, 1.2, 0.09, 0.03), zr, -1), m.black);
  const ex = [exhaust(add, m, 0.5, 0.3, zr - 0.02, 0.035 * tip, 0.16)];
  mirror(add, m, B, 0.56, 0.9);
  return { exhausts: ex, tails };
}

// The R34's tall stock wing on two uprights, with endplates and a small flap.
function r34Wing({ box, m, zr }) {
  for (const s of [1, -1]) { const up = box(0.05, 0.22, 0.14, m.paint, s * 0.58, 1.1, zr + 0.25); up.rotation.x = -0.12; }
  const wing = box(1.56, 0.04, 0.3, m.paint, 0, 1.22, zr + 0.2);
  wing.rotation.x = 0.07;
  const flap = box(1.5, 0.03, 0.08, m.paint, 0, 1.255, zr + 0.06);
  flap.rotation.x = -0.4;
  for (const s of [1, -1]) box(0.02, 0.13, 0.36, m.paint, s * 0.78, 1.22, zr + 0.18);
}

// The R35 (2017 GT-R): long low bonnet, swept lamps that run back over the
// front wheels, a big trapezoid grille, the shark-gill vent behind the
// front wheel, a high fastback roof, round quad tail lights in the body
// colour, a wing on the boot edge and four titanium pipes.
function r35Details({ B, add, box, mats: m, spec, tip }) {
  const zf = B.z1, zr = B.z0;
  // Headlights: a chrome-backed lamp that sweeps back over the fender, an
  // L-shaped running light along its inner and lower edge.
  add(B.decal(1.9, zf - 0.01, (z) => 5.4 + (z - 1.9) * 0.6, (z) => 8.9 - (z - 1.9) * 2.6, { nz: 8, nt: 5 }), m.lampInner);
  add(B.decal(2.05, zf - 0.015, (z) => 6.2 + (z - 2.05) * 0.4, (z) => 7.4 - (z - 2.05) * 1.6, { lift: 0.007, nz: 5, nt: 3 }), m.headlight);
  add(B.decal(1.95, 2.3, (z) => 5.45 + (z - 1.9) * 0.6, (z) => 5.65 + (z - 1.9) * 0.6, { lift: 0.008, nz: 6, nt: 1 }), m.headlight);
  add(B.decal(1.9, zf - 0.01, (z) => 5.3 + (z - 1.9) * 0.6, (z) => 9.0 - (z - 1.9) * 2.6, { lift: 0.011, nz: 8, nt: 5 }), m.lens);
  // On the nose: swept lamp units at the top corners, each with an L of
  // running light and three small projectors.
  for (const s of [1, -1]) {
    add(flatShape([[s * 0.3, 0.665], [s * 0.66, 0.645], [s * 0.7, 0.59], [s * 0.36, 0.585]], zf, 1, 0.004), m.lampInner);
    add(flatShape([[s * 0.4, 0.6], [s * 0.66, 0.6], [s * 0.67, 0.588], [s * 0.4, 0.59]], zf, 1, 0.007), m.headlight);
    add(flatShape([[s * 0.64, 0.64], [s * 0.665, 0.638], [s * 0.668, 0.59], [s * 0.645, 0.59]], zf, 1, 0.007), m.headlight);
    for (const x of [0.43, 0.5, 0.57]) { const p = add(new THREE.CircleGeometry(0.018, 10), m.headlight); p.position.set(s * x, 0.628, zf + 0.008); }
  }
  // The big trapezoid grille with a chrome frame, two bars, no badge.
  add(flatShape([[-0.33, 0.555], [0.33, 0.555], [0.4, 0.25], [-0.4, 0.25]], zf, 1, 0.003), m.chrome);
  add(flatShape([[-0.3, 0.535], [0.3, 0.535], [0.37, 0.27], [-0.37, 0.27]], zf, 1, 0.006), m.black);
  for (const y of [0.45, 0.36]) add(flatShape(roundRect(0, y, 0.66, 0.012, 0.004), zf, 1, 0.009), m.trim);
  // Side intakes in the bumper, each with a strip of running light.
  for (const s of [1, -1]) {
    add(flatShape([[s * 0.47, 0.43], [s * 0.64, 0.47], [s * 0.68, 0.24], [s * 0.45, 0.24]].map(([x, y]) => [x, y]), zf, 1, 0.005), m.black);
    add(flatShape(roundRect(s * 0.6, 0.36, 0.025, 0.15, 0.008), zf, 1, 0.008), m.headlight);
  }
  const split = box(1.52, 0.025, 0.16, m.carbon, 0, 0.175, zf - 0.06);
  split.rotation.x = 0.02;
  // Two small nostrils on the bonnet.
  for (const s of [1, -1]) add(B.decal(1.66, 1.78, 10.5, 10.85, { lift: 0.006, sides: [s], nz: 2, nt: 1 }), m.black);
  // The shark-gill vent behind the front wheel, and the crease that runs
  // from it down the door.
  add(B.decal(0.8, 0.93, (z) => 3.9 + (z - 0.8) * 2.0, (z) => 4.9 + (z - 0.8) * 1.5, { lift: 0.006, nz: 3, nt: 2 }), m.black);
  add(B.decal(-0.7, 0.8, (z) => 4.88 + (z - 0.8) * 0.4, (z) => 4.93 + (z - 0.8) * 0.4, { lift: 0.004, nz: 6, nt: 1 }), m.trim);
  add(B.decal(-0.15, -0.02, 5.6, 5.85, { lift: 0.006, nz: 1, nt: 1 }), m.chrome);
  // Black side skirts.
  for (const s of [1, -1]) box(0.05, 0.07, 2.2, m.trim, s * 0.9, 0.2, 0);
  // Rear: quad round tail lights with dark centres in a body-colour panel.
  const tails = [];
  for (const x of [-0.68, -0.45, 0.45, 0.68]) {
    tails.push(roundLamp(add, m, x, 0.86, zr, 0.085, -1, m.tail));
    const c = add(new THREE.CircleGeometry(0.038, 14), m.tailRing);
    c.position.set(x, 0.86, zr - 0.011); c.rotation.y = Math.PI;
  }
  add(flatShape(roundRect(0, 0.62, 0.5, 0.11, 0.01), zr, -1, 0.006), m.plate);
  add(flatShape(roundRect(0, 0.4, 1.56, 0.16, 0.03), zr, -1), m.black);
  for (const s of [1, -1]) add(flatShape(roundRect(s * 0.25, 0.47, 0.12, 0.04, 0.01), zr, -1, 0.007), m.reverseLight);
  const diff = box(1.3, 0.03, 0.3, m.carbon, 0, 0.3, zr + 0.13);
  diff.rotation.x = -0.15;
  for (const x of [-0.36, -0.12, 0.12, 0.36]) box(0.02, 0.09, 0.26, m.carbon, x, 0.33, zr + 0.13);
  const ex = [];
  for (const x of [-0.7, -0.56, 0.56, 0.7]) ex.push(exhaust(add, m, x, 0.36, zr - 0.02, 0.05 * Math.min(tip, 1.25), 0.16));
  // Wing on the boot edge.
  if (!spec.wing) {
    for (const s of [1, -1]) { const up = box(0.05, 0.1, 0.16, m.paint, s * 0.55, 1.11, zr + 0.22); up.rotation.x = -0.2; }
    const wing = box(1.5, 0.03, 0.24, m.paint, 0, 1.16, zr + 0.17);
    wing.rotation.x = 0.1;
    for (const s of [1, -1]) box(0.015, 0.07, 0.24, m.paint, s * 0.76, 1.15, zr + 0.17);
  }
  mirror(add, m, B, 0.66);
  return { exhausts: ex, tails };
}

// The Challenjer (after the Challenger SRT8 sheet): a long flat bonnet with
// a central scoop and two vents, four round lamps in a full-width black
// grille, slab sides, a short glasshouse, a full-width tail-light band, a
// ducktail and two big pipes.
function challenjerDetails({ B, add, box, mats: m, tip }) {
  const zf = B.z1, zr = B.z0;
  // Full-width grille with the four lamps set into it.
  add(flatShape(roundRect(0, 0.72, 1.66, 0.24, 0.03), zf, 1, 0.003), m.black);
  for (const y of [0.66, 0.72, 0.78]) add(flatShape(roundRect(0, y, 0.6, 0.01, 0.003), zf, 1, 0.006), m.trim);
  add(flatShape(roundRect(0, 0.855, 1.66, 0.025, 0.01), zf, 1, 0.006), m.paint);
  for (const s of [1, -1]) {
    for (const [x, r] of [[0.68, 0.082], [0.48, 0.075]]) {
      add(flatShape(roundRect(s * x, 0.72, r * 2.5, r * 2.5, r * 1.2, 4), zf, 1, 0.005), m.chrome);
      add(flatShape(roundRect(s * x, 0.72, r * 2.2, r * 2.2, r * 1.1, 4), zf, 1, 0.008), m.lampInner);
      const halo = add(new THREE.RingGeometry(r * 0.78, r * 0.95, 20), m.headlight);
      halo.position.set(s * x, 0.72, zf + 0.012);
      const core = add(new THREE.CircleGeometry(r * 0.42, 14), m.headlight);
      core.position.set(s * x, 0.72, zf + 0.012);
    }
    add(flatShape(roundRect(s * 0.74, 0.42, 0.06, 0.12, 0.02), zf, 1, 0.006), m.headlight); // running lights
  }
  add(flatShape(roundRect(0, 0.42, 1.2, 0.15, 0.04), zf, 1), m.black);
  add(flatShape(roundRect(0, 0.56, 0.42, 0.1, 0.01), zf, 1, 0.007), m.plate);
  const chin = box(1.72, 0.04, 0.18, m.black, 0, 0.26, zf - 0.06);
  chin.rotation.x = 0.04;
  // Bonnet: a raised central scoop, open at the front, and two heat vents.
  const scoop = add(new THREE.BoxGeometry(0.5, 0.06, 0.62), m.paint);
  scoop.position.set(0, B.hood(1.95) + 0.02, 1.95);
  scoop.rotation.x = 0.03;
  const mouth = add(new THREE.PlaneGeometry(0.42, 0.04), m.black);
  mouth.position.set(0, B.hood(2.26) + 0.035, 2.265);
  for (const s of [1, -1]) {
    add(B.decal(1.55, 1.95, 8.6, 9.4, { lift: 0.006, sides: [s], nz: 2, nt: 2 }), m.black);
    for (let i = 0; i < 4; i++) add(B.decal(1.58 + i * 0.1, 1.61 + i * 0.1, 8.65, 9.35, { lift: 0.009, sides: [s], nz: 1, nt: 1 }), m.trim);
  }
  // Sides: markers, handles, the fuel cap on the right rear quarter.
  add(B.decal(2.18, 2.3, 4.6, 5.0, { lift: 0.006, nz: 1, nt: 1 }), m.amber);
  add(B.decal(-2.4, -2.28, 4.6, 5.0, { lift: 0.006, nz: 1, nt: 1 }), m.tail);
  add(B.decal(0.05, 0.2, 5.45, 5.7, { lift: 0.006, nz: 1, nt: 1 }), m.chrome);
  add(B.decal(-1.98, -1.82, 5.2, 5.75, { lift: 0.006, sides: [-1], nz: 2, nt: 2 }), m.chrome);
  for (const s of [1, -1]) box(0.05, 0.07, 2.5, m.trim, s * 0.94, 0.24, 0.05);
  // Rear: a full-width band of tail light with a lit ring inside it,
  // reverse lights in the middle, a ducktail, bumper and two big pipes.
  add(flatShape(roundRect(0, 0.88, 1.66, 0.15, 0.03), zr, -1, 0.003), m.black);
  const tails = [];
  for (const s of [1, -1]) {
    tails.push(add(flatShape(roundRect(s * 0.44, 0.88, 0.7, 0.1, 0.03), zr, -1, 0.006), m.tailRing));
    tails.push(add(flatShape(roundRect(s * 0.44, 0.88, 0.66, 0.025, 0.01), zr, -1, 0.009), m.tail));
  }
  add(flatShape(roundRect(0, 0.88, 0.14, 0.08, 0.01), zr, -1, 0.008), m.reverseLight);
  add(flatShape(roundRect(0, 0.62, 0.5, 0.11, 0.01), zr, -1, 0.006), m.plate);
  add(flatShape(roundRect(0, 0.36, 1.6, 0.12, 0.03), zr, -1), m.black);
  const duck = box(1.62, 0.035, 0.14, m.paint, 0, B.hood(zr + 0.08) + 0.03, zr + 0.08);
  duck.rotation.x = -0.28;
  const ex = [];
  for (const s of [1, -1]) ex.push(exhaust(add, m, s * 0.58, 0.33, zr - 0.02, 0.07 * tip, 0.18));
  mirror(add, m, B, 0.8, 1.1);
  return { exhausts: ex, tails };
}

// The Aventadoro (after the Aventador SV sheet): a low wedge with the cabin
// pushed forward, Y-shaped lamps front and back, huge black intakes in the
// nose and behind the doors, a louvred engine lid, a hexagonal exhaust in a
// black mesh tail, and the SV's big fixed wing.
function aventadoroDetails({ B, add, box, mats: m, spec, tip }) {
  const zf = B.z1, zr = B.z0;
  // Headlamps on top of the front wings: a dark wedge, a Y of running
  // light (a long arm along the top, a short one slanting down).
  add(B.decal(1.78, zf - 0.04, (z) => 7.05 + (z - 1.78) * 0.5, (z) => 8.55 - (z - 1.78) * 0.4, { nz: 6, nt: 4 }), m.lampInner);
  add(B.decal(1.82, zf - 0.07, (z) => 7.7 + (z - 1.82) * 0.25, (z) => 7.82 + (z - 1.82) * 0.25, { lift: 0.008, nz: 6, nt: 1 }), m.headlight);
  add(B.decal(2.05, zf - 0.06, (z) => 7.25 + (z - 2.05) * 1.6, (z) => 7.37 + (z - 2.05) * 1.6, { lift: 0.008, nz: 4, nt: 1 }), m.headlight);
  add(B.decal(1.78, zf - 0.04, (z) => 7.0 + (z - 1.78) * 0.5, (z) => 8.6 - (z - 1.78) * 0.4, { lift: 0.011, nz: 6, nt: 4 }), m.lens);
  // Nose: two big intakes either side of a body-colour blade, a carbon lip.
  for (const s of [1, -1]) {
    add(flatShape([[s * 0.2, 0.36], [s * 0.66, 0.4], [s * 0.7, 0.16], [s * 0.24, 0.16]], zf, 1, 0.004), m.black);
    for (const y of [0.3, 0.23]) add(flatShape(roundRect(s * 0.45, y, 0.38, 0.012, 0.004), zf, 1, 0.007), m.trim);
  }
  add(flatShape(roundRect(0, 0.26, 0.3, 0.07, 0.02), zf, 1, 0.006), m.black);
  const lip = box(1.86, 0.025, 0.24, m.carbon, 0, 0.13, zf - 0.08);
  lip.rotation.x = 0.03;
  // Two ducts on the bonnet.
  for (const s of [1, -1]) add(B.decal(1.55, 2.05, 10.45, 10.75, { lift: 0.006, sides: [s], nz: 3, nt: 1 }), m.black);
  // Sides: the big intake behind the door, the shoulder scoop over it,
  // carbon sills.
  add(B.decal(-1.0, -0.3, (z) => 4.3 + (z + 1.0) * 0.6, (z) => 5.9, { lift: 0.006, nz: 5, nt: 3 }), m.black);
  for (let i = 0; i < 3; i++) add(B.decal(-0.95 + i * 0.2, -0.88 + i * 0.2, 4.6, 5.8, { lift: 0.009, nz: 1, nt: 2 }), m.trim);
  add(B.decal(-1.25, -0.72, 7.1, 7.9, { lift: 0.006, nz: 3, nt: 2 }), m.black);
  for (const s of [1, -1]) box(0.06, 0.08, 2.0, m.carbon, s * 0.97, 0.15, 0.02);
  // Engine lid: louvres across it.
  // A dark engine cover with body-colour ribs across it, as on the sheet.
  add(B.decal(-2.1, -1.5, 9.6, 12, { lift: 0.006, nz: 6, nt: 3 }), m.black);
  for (let i = 0; i < 5; i++) add(B.decal(-2.04 + i * 0.12, -2.0 + i * 0.12, 9.8, 12, { lift: 0.009, nz: 1, nt: 3 }), m.paint);
  // Tail: a black mesh panel, the Y-shaped lamps either side, a hexagonal
  // exhaust with two pipes in the middle, a deep diffuser.
  // Body colour above, black mesh below with two big vents either side of the exhaust.
  add(flatShape(roundRect(0, 0.47, 1.62, 0.3, 0.04), zr, -1, 0.003), m.black);
  for (const s of [1, -1]) {
    add(flatShape(roundRect(s * 0.55, 0.5, 0.42, 0.2, 0.03), zr, -1, 0.005), m.carbon);
    for (let i = 0; i < 4; i++) add(flatShape(roundRect(s * 0.55, 0.43 + i * 0.05, 0.4, 0.008, 0.002), zr, -1, 0.007), m.trim);
  }
  add(flatShape(roundRect(0, 0.66, 1.62, 0.025, 0.01), zr, -1, 0.005), m.carbon);
  const tails = [];
  for (const s of [1, -1]) {
    tails.push(add(flatShape([[s * 0.4, 0.86], [s * 0.84, 0.82], [s * 0.84, 0.79], [s * 0.4, 0.83]], zr, -1, 0.008), m.tail));
    tails.push(add(flatShape([[s * 0.6, 0.83], [s * 0.66, 0.83], [s * 0.76, 0.66], [s * 0.7, 0.66]], zr, -1, 0.008), m.tail));
    tails.push(add(flatShape([[s * 0.66, 0.83], [s * 0.72, 0.83], [s * 0.62, 0.68], [s * 0.56, 0.68]], zr, -1, 0.008), m.tail));
  }
  const hex = Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3) * 0.2, 0.52 + Math.sin(i * Math.PI / 3) * 0.12]);
  add(flatShape(hex, zr, -1, 0.009), m.carbon);
  add(flatShape(roundRect(0, 0.76, 0.34, 0.08, 0.01), zr, -1, 0.006), m.plate);
  const ex = [];
  for (const x of [-0.08, 0.08]) ex.push(exhaust(add, m, x, 0.52, zr - 0.02, 0.06 * Math.min(tip, 1.25), 0.14));
  const diff = box(1.5, 0.03, 0.42, m.carbon, 0, 0.24, zr + 0.18);
  diff.rotation.x = -0.2;
  for (const x of [-0.6, -0.3, 0.3, 0.6]) box(0.02, 0.12, 0.38, m.carbon, x, 0.28, zr + 0.18);
  // The sheet's car has no fixed wing (the wing is a part you can fit).
  if (false) {
    const z = zr + 0.2, y = B.hood(z);
    for (const s of [1, -1]) { const st = box(0.04, 0.26, 0.1, m.carbon, s * 0.4, y + 0.11, z); st.rotation.x = 0.2; }
    const blade = box(1.86, 0.03, 0.3, m.carbon, 0, y + 0.25, z - 0.06);
    blade.rotation.x = 0.1;
    for (const s of [1, -1]) box(0.012, 0.1, 0.32, m.carbon, s * 0.93, y + 0.24, z - 0.06);
  }
  mirror(add, m, B, 0.45, 0.95);
  return { exhausts: ex, tails };
}

// The Mustank (after the Shelby GT500 sheet): a long bonnet with a big heat
// extractor, a gaping trapezoid grille between slim angry lamps, a fastback,
// three upright bars of tail light each side, four pipes and a lip wing.
function mustankDetails({ B, add, box, mats: m, spec, tip }) {
  const zf = B.z1, zr = B.z0;
  // Grille: a big black trapezoid with a frame, a few honeycomb bars, no
  // badge; a wide lower intake; a carbon splitter.
  add(flatShape([[-0.44, 0.74], [0.44, 0.74], [0.48, 0.42], [-0.48, 0.42]], zf, 1, 0.003), m.trim);
  add(flatShape([[-0.41, 0.72], [0.41, 0.72], [0.45, 0.44], [-0.45, 0.44]], zf, 1, 0.006), m.black);
  for (const y of [0.5, 0.58, 0.66]) add(flatShape(roundRect(0, y, 0.8, 0.008, 0.003), zf, 1, 0.009), m.trim);
  add(flatShape(roundRect(0, 0.31, 1.1, 0.13, 0.03), zf, 1, 0.005), m.black);
  for (const s of [1, -1]) add(flatShape(roundRect(s * 0.66, 0.36, 0.16, 0.12, 0.02), zf, 1, 0.005), m.black);
  const split = box(1.74, 0.025, 0.22, m.carbon, 0, 0.19, zf - 0.07);
  split.rotation.x = 0.03;
  // Lamps: slim, angled, with three LED bars, wrapping onto the wing tops.
  for (const s of [1, -1]) {
    add(flatShape([[s * 0.47, 0.76], [s * 0.74, 0.735], [s * 0.76, 0.65], [s * 0.5, 0.68]], zf, 1, 0.005), m.lampInner);
    for (const x of [0.56, 0.62, 0.68]) add(flatShape([[s * x, 0.745], [s * (x + 0.025), 0.742], [s * (x + 0.02), 0.69], [s * (x - 0.005), 0.693]], zf, 1, 0.008), m.headlight);
  }
  add(B.decal(2.12, zf - 0.02, 7.55, 8.35, { nz: 3, nt: 2 }), m.lampInner);
  add(B.decal(2.12, zf - 0.02, 7.5, 8.4, { lift: 0.009, nz: 3, nt: 2 }), m.lens);
  // Bonnet: the big centre heat extractor with louvres, two side vents.
  add(B.decal(1.25, 1.8, 11.15, 12, { lift: 0.006, nz: 4, nt: 2 }), m.black);
  for (let i = 0; i < 5; i++) add(B.decal(1.3 + i * 0.1, 1.33 + i * 0.1, 11.2, 12, { lift: 0.009, nz: 1, nt: 2 }), m.trim);
  for (const s of [1, -1]) add(B.decal(1.65, 1.98, 9.3, 9.95, { lift: 0.006, sides: [s], nz: 2, nt: 1 }), m.black);
  // Sides: a vent behind the front wheel, a handle, black sills.
  add(B.decal(0.86, 1.12, 5.2, 6.2, { lift: 0.006, nz: 3, nt: 2 }), m.black);
  for (let i = 0; i < 3; i++) add(B.decal(0.9 + i * 0.075, 0.93 + i * 0.075, 5.25, 6.15, { lift: 0.009, nz: 1, nt: 1 }), m.trim);
  add(B.decal(0.1, 0.24, 5.55, 5.75, { lift: 0.006, nz: 1, nt: 1 }), m.chrome);
  for (const s of [1, -1]) box(0.05, 0.07, 2.3, m.trim, s * 0.94, 0.22, 0.1);
  // Tail: three upright bars of light each side in black housings, a black
  // centre panel, the plate, a diffuser and four pipes.
  const tails = [];
  for (const s of [1, -1]) {
    add(flatShape(roundRect(s * 0.6, 0.9, 0.38, 0.17, 0.03), zr, -1, 0.004), m.black);
    for (const x of [0.48, 0.6, 0.72]) tails.push(add(flatShape(roundRect(s * x, 0.9, 0.06, 0.13, 0.015), zr, -1, 0.008), m.tail));
  }
  add(flatShape(roundRect(0, 0.9, 0.62, 0.1, 0.02), zr, -1, 0.004), m.black);
  add(flatShape(roundRect(0, 0.66, 0.5, 0.11, 0.01), zr, -1, 0.006), m.plate);
  add(flatShape(roundRect(0, 0.38, 1.6, 0.14, 0.03), zr, -1), m.black);
  const diff = box(1.2, 0.03, 0.3, m.carbon, 0, 0.27, zr + 0.13);
  diff.rotation.x = -0.15;
  const ex = [];
  for (const x of [-0.7, -0.56, 0.56, 0.7]) ex.push(exhaust(add, m, x, 0.35, zr - 0.02, 0.048 * Math.min(tip, 1.25), 0.16));
  // The GT500's own fixed wing: a carbon blade on two stands near the deck
  // edge, with small endplates, spanning nearly the full width (sheet).
  if (!spec.wing) {
    const z = zr + 0.28, y = B.hood(z);
    for (const s of [1, -1]) {
      const st = box(0.035, 0.2, 0.1, m.carbon, s * 0.52, y + 0.09, z + 0.02);
      st.rotation.x = 0.2;
    }
    const blade = box(1.78, 0.022, 0.3, m.carbon, 0, y + 0.2, z - 0.04);
    blade.rotation.x = 0.14;
    box(1.78, 0.045, 0.014, m.carbon, 0, y + 0.215, z - 0.19).rotation.x = 0.14;
    for (const s of [1, -1]) box(0.012, 0.1, 0.34, m.carbon, s * 0.89, y + 0.2, z - 0.04);
  }
  mirror(add, m, B, 0.84, 1.05);
  return { exhausts: ex, tails };
}

// Body kits: a deep splitter, side skirts and a finned diffuser (the
// widebody also gets its blistered arches from wideDef).
function bodyKit({ B, box, spec, mats: m, sh }) {
  if (!spec.kit) return;
  const zf = B.z1, zr = B.z0, [wf, wr] = sh.def.wheels.z, r = sh.def.wheels.r;
  const lip = box(B.width(zf - 0.1) * 2 - 0.05, 0.03, 0.26, m.carbon, 0, B.sill(zf - 0.1) - 0.03, zf - 0.04);
  lip.rotation.x = 0.04;
  const len = (wf - r) - (wr + r) - 0.1, mid = ((wf - r) + (wr + r)) / 2;
  for (const s of [1, -1]) box(0.08, 0.09, len, m.carbon, s * (B.width(mid) + B.flare(mid) - 0.01), B.sill(mid) - 0.01, mid);
  const diff = box(B.width(zr + 0.2) * 1.5, 0.03, 0.4, m.carbon, 0, B.sill(zr + 0.2) - 0.02, zr + 0.18);
  diff.rotation.x = -0.18;
  for (let i = -2; i <= 2; i++) box(0.02, 0.11, 0.36, m.carbon, i * 0.22, B.sill(zr + 0.2) + 0.02, zr + 0.18);
}

// A big GT wing on swan-neck stands, with endplates.
function gtWing({ B, box, mats: m }, k = 1) {
  const z = B.z0 + 0.3, y = B.hood(z), W = 1.72 * (k < 1 ? 0.92 : 1);
  for (const s of [1, -1]) {
    const st = box(0.03, 0.34 * k, 0.12, m.carbon, s * 0.45, y + 0.17 * k, z + 0.04);
    st.rotation.x = 0.25;
  }
  const blade = box(W, 0.025, 0.32 * k, m.carbon, 0, y + 0.36 * k, z - 0.06);
  blade.rotation.x = 0.12;
  const gurney = box(W, 0.05, 0.015, m.carbon, 0, y + 0.37 * k, z - 0.06 - 0.17 * k);
  gurney.rotation.x = 0.12;
  for (const s of [1, -1]) box(0.012, 0.12 * k, 0.36 * k, m.carbon, s * W / 2, y + 0.35 * k, z - 0.06);
}

// Decals laid on the body: twin stripes over the top, a side stripe, a race
// number roundel on the doors, or a 走り屋 sticker on the rear quarters.
function decals({ B, add, look, sh, bonnet }) {
  const def = sh.def;
  const colour = new THREE.MeshStandardMaterial({ color: look.decalColour, roughness: 0.35, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 });
  const [wf, wr] = def.wheels.z, r = def.wheels.r;
  if (look.decal === 'stripes') {
    // Over the bonnet, roof and boot, but not over the glass.
    // (Split at the bonnet's front edge, so the bonnet's piece lifts with it.)
    const cuts = [def.rearGlass, def.screen, ...(bonnet ? [[bonnet[1], bonnet[1]]] : [])].map(([a, b]) => [Math.min(a, b), Math.max(a, b)]).sort((a, b) => a[0] - b[0]);
    let from = B.z0 + 0.02;
    for (const [a, b] of [...cuts, [B.z1 - 0.02, B.z1]]) {
      if (a - from > 0.05) add(B.decal(from, a, 10.85, 11.45, { lift: 0.006, nz: Math.ceil((a - from) / 0.08), nt: 1 }), colour);
      from = b;
    }
  } else if (look.decal === 'side') {
    add(B.decal(B.z0 + 0.15, B.z1 - 0.15, 5.25, 5.5, { lift: 0.006, nz: 60, nt: 1 }), colour);
  } else {
    const number = look.decal === 'number';
    const map = number ? Tex.roundel(look.decalColour) : Tex.sticker('走り屋');
    const mat = new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.4, roughness: 0.4, color: number ? 0xffffff : look.decalColour, polygonOffset: true, polygonOffsetFactor: -2 });
    if (number) {
      const zc = (wf - r + (wr + r)) / 2 + 0.25;
      add(B.decal(zc - 0.24, zc + 0.24, 3.0, 5.2, { lift: 0.007, nz: 6, nt: 6, uv: true }), mat);
    } else {
      const z0 = wr + r + 0.08;
      add(B.decal(z0, z0 + 0.2, 3.4, 5.6, { lift: 0.007, nz: 3, nt: 6, uv: true }), mat);
    }
  }
}

// Decals on a captured body, projected straight on (see captured.js).
function capturedDecals({ add, look, cap }) {
  const def = cap.def, [wf, wr] = def.wheels.z, r = def.wheels.r;
  const number = look.decal === 'number', kanji = look.decal === 'kanji';
  const map = number ? Tex.roundel(look.decalColour) : kanji ? Tex.sticker('走り屋') : stripeTexture(look.decal);
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  const mat = new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.4, roughness: 0.35, metalness: 0.1, color: number ? 0xffffff : look.decalColour, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
  if (look.decal === 'stripes') {
    // Twin stripes over everything that faces up, front to back.
    const test = (x, y, z, nx, ny) => Math.abs(x) < 0.42 && ny > 0.4 && y > 0.7;
    add(projectDecal(cap, test, (x) => [x / 0.84 + 0.5, 0.5]), mat);
    add(projectDecal(cap, test, (x) => [x / 0.84 + 0.5, 0.5], 0.004, 'lid'), mat); // lifts with the bonnet
  } else if (look.decal === 'side') {
    const y0 = 0.5, h = 0.2;
    add(projectDecal(cap, (x, y, z, nx) => Math.abs(nx) > 0.4 && y > y0 - 0.05 && y < y0 + h + 0.05, (x, y) => [0.5, (y - y0) / h]), mat);
  } else {
    const zc = number ? (wf - r + (wr + r)) / 2 + 0.25 : wr + r + 0.18;
    const size = number ? 0.48 : 0.34, yc = 0.62;
    for (const s of [1, -1]) {
      add(projectDecal(cap, (x, y, z, nx) => x * s > 0.3 && nx * s > 0.4 && Math.abs(z - zc) < size * 0.6 && Math.abs(y - yc) < size * 0.6,
        (x, y, z) => [0.5 + (s > 0 ? -1 : 1) * (z - zc) / size, (y - yc) / size + 0.5]), mat);
    }
  }
}

// White bands on clear: u across the car (twin stripes) or v up the side.
const stripeTextures = {};
function stripeTexture(kind) {
  if (stripeTextures[kind]) return stripeTextures[kind];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  if (kind === 'stripes') { g.fillRect(14, 0, 42, 128); g.fillRect(72, 0, 42, 128); } else g.fillRect(0, 44, 128, 40);
  return (stripeTextures[kind] = new THREE.CanvasTexture(c));
}

// A captured cabin: the source's own interior, a steering wheel that turns,
// and the dome light. The interior is part of the shell's meshes (group
// 'body'); only the wheel is apart, on a pivot at the column.
function capturedCabin(cockpit, cap, mats) {
  const steeringWheel = new THREE.Group();
  if (cap.steering) {
    const { c, axis } = cap.steering;
    const pivot = new THREE.Group();
    pivot.position.set(...c);
    pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...axis));
    pivot.add(steeringWheel);
    cockpit.add(pivot);
    const inverse = pivot.quaternion.clone().invert();
    for (const m of capturedParts(cap, 0, mats, 'steering')) {
      m.position.set(...c).negate().applyQuaternion(inverse);
      m.quaternion.copy(inverse);
      steeringWheel.add(m);
    }
  }
  // A plain padded cover on the hub, where the real car has its badge.
  if (cap.steering?.padR) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(cap.steering.padR, cap.steering.padR * 1.04, 0.016, 28).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.62 }));
    pad.position.z = -cap.steering.hub - 0.006;
    steeringWheel.add(pad);
  }
  // Dials a foundry car leaves room for: the gauge picture with real needles.
  const needles = [];
  if (cap.dials) {
    const { c, r, gap } = cap.dials;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(gap * 2 + r * 2, r * 2.6), new THREE.MeshBasicMaterial({ map: Tex.gauges(), color: 0xe4e8e8 }));
    face.rotation.y = Math.PI;
    face.position.set(...c);
    cockpit.add(face);
    const needleMat = new THREE.MeshBasicMaterial({ color: 0xff4a2a, side: THREE.DoubleSide });
    for (const s of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(c[0] + s * (gap + r) * 0.4375, c[1], c[2] - 0.004);
      pivot.rotation.y = Math.PI;
      const needle = new THREE.Mesh(new THREE.PlaneGeometry(0.005, r * 0.9), needleMat);
      needle.position.y = r * 0.4;
      pivot.add(needle);
      cockpit.add(pivot);
      needles.push(pivot);
    }
  }
  const dome = new THREE.PointLight(0xffe6c0, 0, 1.9, 1.4);
  dome.position.set(0, 1.15, 0);
  cockpit.add(dome);
  return { steeringWheel, needles, dome };
}

// Each car's shape. The driver sits at driverX (negative = right-hand
// drive); cockpitOffset moves the whole cockpit [up, forward] to fit.
// Body keys are [z, value], rear to front (see body.js).
const SHAPES = {
  'miata-na': {
    def: {
      width: [[-1.98, 0.7], [-1.9, 0.78], [-1.5, 0.83], [-0.8, 0.835], [0, 0.83], [0.8, 0.835], [1.4, 0.83], [1.85, 0.78], [1.98, 0.68]],
      sill: [[-1.98, 0.3], [-1.85, 0.21], [-1.4, 0.17], [1.5, 0.17], [1.85, 0.19], [1.98, 0.24]],
      belt: [[-1.98, 0.74], [-1.85, 0.8], [-1.2, 0.8], [-0.3, 0.78], [0.4, 0.74], [1.0, 0.7], [1.6, 0.65], [1.85, 0.62], [1.98, 0.55]],
      hood: [[-1.98, 0.78], [-1.88, 0.86], [-1.6, 0.89], [-1.0, 0.87], [-0.6, 0.84], [0.3, 0.8], [0.8, 0.78], [1.3, 0.72], [1.7, 0.66], [1.9, 0.62], [1.98, 0.56]],
      roof: [[-1.0, 0.9], [-0.75, 1.07], [-0.4, 1.19], [0, 1.215], [0.3, 1.17], [0.55, 1.0], [0.8, 0.8]],
      roofW: [[-1.0, 0.62], [-0.4, 0.6], [0.3, 0.6], [0.8, 0.72]],
      wheels: { z: [1.13, -1.135], r: 0.36, top: 0.6, flare: [0.02, 0.03] },
      windows: [[0.72, -0.5]], pillarsBlack: [[-0.5, -1.0]],
      screen: [0.8, 0.3], rearGlass: [-0.8, -1.0],
      crown: 0.03, baseW: 0.93, tuck: 0.05, sillTrim: true, fenderRise: 0.035, bulge: 0.02, roofCrown: 0.04,
      softTop: true,
    },
    wheelX: 0.7, tyreWidth: 0.19,
    rim: { style: 'five', color: '#b8bcbe', caliper: 0x2a2c2e },
    core: [1.2, 3.0],
    driverX: 0.37, cockpitOffset: [-0.02, -0.06], doorX: 0.84, linerY: 1.25, cabinScale: 0.9,
    headLamp: [0.5, 0.7, 1.62], tailLamp: [0.6, 0.72, -1.96],
    details: miataDetails,
  },
  'skyliner-r34': {
    def: {
      width: [[-2.3, 0.79], [-2.22, 0.855], [-1.75, 0.882], [-1.0, 0.868], [0, 0.858], [0.8, 0.862], [1.35, 0.874], [1.95, 0.866], [2.2, 0.838], [2.3, 0.78]],
      sill: [[-2.3, 0.33], [-2.18, 0.22], [-1.7, 0.2], [1.9, 0.2], [2.2, 0.21], [2.3, 0.25]],
      belt: [[-2.3, 0.84], [-2.2, 0.88], [-1.5, 0.885], [0, 0.835], [1.2, 0.79], [1.95, 0.745], [2.2, 0.7], [2.3, 0.64]],
      hood: [[-2.3, 0.9], [-2.22, 0.985], [-1.75, 1.0], [-1.25, 1.0], [0.9, 0.95], [1.35, 0.9], [1.95, 0.835], [2.2, 0.77], [2.3, 0.68]],
      roof: [[-1.3, 0.99], [-1.0, 1.12], [-0.55, 1.315], [-0.2, 1.345], [0.25, 1.34], [0.55, 1.2], [0.94, 0.95]],
      roofW: [[-1.3, 0.78], [-0.6, 0.64], [0.25, 0.65], [0.94, 0.8]],
      wheels: { z: [1.34, -1.33], r: 0.43, top: 0.7, flare: [0.04, 0.05] },
      windows: [[0.86, -0.42], [-0.5, -0.86]], pillarsBlack: [[-0.42, -0.5]],
      screen: [0.95, 0.3], rearGlass: [-0.52, -1.32],
      crown: 0.025, baseW: 0.94, tuck: 0.05, sillTrim: true, roofCrown: 0.035,
    },
    wheelX: 0.79, tyreWidth: 0.25,
    rim: { style: 'five', color: '#a8acae', caliper: 0x7a1814 },
    core: [1.3, 4.0],
    driverX: -0.38, cockpitOffset: [0, 0], doorX: 0.77,
    headLamp: [0.54, 0.66, 2.33], tailLamp: [0.53, 0.76, -2.4],
    details: r34Details,
  },
  'gtar-r35': {
    def: {
      width: [[-2.355, 0.8], [-2.3, 0.875], [-2.15, 0.925], [-1.6, 0.948], [-0.6, 0.93], [0.4, 0.922], [1.4, 0.935], [1.95, 0.92], [2.2, 0.875], [2.31, 0.8], [2.355, 0.72]],
      sill: [[-2.355, 0.34], [-2.2, 0.24], [-1.8, 0.185], [1.9, 0.175], [2.25, 0.165], [2.355, 0.19]],
      belt: [[-2.355, 0.92], [-2.2, 0.98], [-1.6, 0.975], [-0.6, 0.925], [0.5, 0.885], [1.3, 0.865], [1.9, 0.815], [2.2, 0.76], [2.355, 0.68]],
      hood: [[-2.355, 0.97], [-2.25, 1.03], [-1.9, 1.045], [-1.25, 1.05], [0.8, 0.955], [1.4, 0.9], [1.9, 0.845], [2.2, 0.78], [2.355, 0.7]],
      roof: [[-1.95, 1.03], [-1.6, 1.14], [-1.1, 1.285], [-0.55, 1.36], [-0.1, 1.37], [0.25, 1.335], [0.55, 1.19], [0.86, 0.96]],
      roofW: [[-1.95, 0.72], [-1.4, 0.63], [-0.5, 0.6], [0.2, 0.6], [0.86, 0.75]],
      wheels: { z: [1.39, -1.39], r: 0.44, top: 0.76, flare: [0.025, 0.045] },
      windows: [[0.74, -1.15]],
      screen: [0.87, 0.22], rearGlass: [-0.85, -1.95],
      crown: 0.045, baseW: 0.91, tuck: 0.06, sillTrim: true, fenderRise: 0.02, bulge: 0.02,
    },
    wheelX: 0.82, tyreWidth: 0.27,
    rim: { style: 'ten', color: '#3a3c3f', caliper: 0x8a6a2a },
    core: [1.42, 4.0],
    driverX: -0.38, cockpitOffset: [0.04, -0.02], doorX: 0.82, linerY: 1.33,
    headLamp: [0.6, 0.66, 2.3], tailLamp: [0.56, 0.86, -2.42],
    details: r35Details,
  },
  'challenjer-srt8': {
    def: {
      width: [[-2.51, 0.86], [-2.42, 0.93], [-2.0, 0.955], [-1.2, 0.95], [0, 0.94], [1.2, 0.95], [2.2, 0.945], [2.42, 0.925], [2.51, 0.885]],
      sill: [[-2.51, 0.37], [-2.35, 0.27], [-1.9, 0.22], [1.95, 0.22], [2.4, 0.24], [2.51, 0.27]],
      belt: [[-2.51, 0.97], [-2.3, 1.0], [-1.5, 0.99], [0, 0.955], [1.2, 0.93], [2.2, 0.91], [2.42, 0.895], [2.51, 0.87]],
      hood: [[-2.51, 1.0], [-2.4, 1.045], [-1.6, 1.06], [-1.4, 1.06], [0.95, 1.05], [1.6, 1.025], [2.3, 0.995], [2.45, 0.965], [2.51, 0.91]],
      roof: [[-1.5, 1.06], [-1.2, 1.22], [-0.85, 1.39], [-0.55, 1.445], [0.05, 1.45], [0.35, 1.38], [0.7, 1.2], [1.0, 1.05]],
      roofW: [[-1.5, 0.8], [-0.9, 0.69], [0, 0.68], [0.4, 0.69], [1.0, 0.82]],
      wheels: { z: [1.52, -1.43], r: 0.46, top: 0.82, flare: [0.015, 0.03] },
      windows: [[0.88, -0.52], [-0.6, -1.2]], pillarsBlack: [[-0.52, -0.6]],
      screen: [1.0, 0.36], rearGlass: [-0.86, -1.5],
      crown: 0.03, baseW: 0.92, tuck: 0.05, sillTrim: true, fenderRise: 0.025, roofCrown: 0.03,
    },
    wheelX: 0.83, tyreWidth: 0.27,
    rim: { style: 'split', color: '#2a2b2d', caliper: 0xb01818 },
    core: [1.44, 4.6],
    driverX: 0.4, cockpitOffset: [0.06, 0.08], doorX: 0.83, linerY: 1.33,
    headLamp: [0.58, 0.72, 2.56], tailLamp: [0.6, 0.88, -2.56],
    details: challenjerDetails,
  },
  'aventadoro-sv': {
    def: {
      width: [[-2.42, 0.86], [-2.35, 0.95], [-2.0, 1.0], [-1.3, 1.01], [-0.6, 0.965], [0.2, 0.935], [1.0, 0.95], [1.5, 0.955], [2.0, 0.93], [2.3, 0.87], [2.42, 0.8]],
      sill: [[-2.42, 0.36], [-2.3, 0.22], [-1.8, 0.15], [1.9, 0.13], [2.3, 0.13], [2.42, 0.15]],
      belt: [[-2.42, 0.86], [-2.2, 0.9], [-1.6, 0.9], [-0.8, 0.86], [0, 0.8], [0.8, 0.74], [1.6, 0.67], [2.2, 0.55], [2.42, 0.44]],
      hood: [[-2.42, 0.9], [-2.3, 0.97], [-1.9, 0.98], [-1.2, 0.97], [0.75, 0.84], [1.4, 0.75], [2.0, 0.63], [2.3, 0.53], [2.42, 0.45]],
      roof: [[-1.95, 0.97], [-1.4, 1.04], [-0.9, 1.1], [-0.45, 1.13], [-0.05, 1.13], [0.3, 1.06], [0.6, 0.96], [0.86, 0.85]],
      roofW: [[-1.95, 0.72], [-1.2, 0.62], [-0.4, 0.58], [0.3, 0.58], [0.86, 0.76]],
      wheels: { z: [1.36, -1.34], r: 0.42, top: 0.74, flare: [0.03, 0.06] },
      windows: [[0.72, -0.72]],
      screen: [0.86, 0.3], rearGlass: [-0.75, -1.25],
      crown: 0.04, baseW: 0.9, tuck: 0.07, sillTrim: true, fenderRise: 0.03, bulge: 0.025, roofCrown: 0.03,
      engineLid: [-2.15, -1.3], // mid-engined: the Engine tab lifts the lid behind the cabin
    },
    wheelX: 0.87, tyreWidth: 0.3,
    rim: { style: 'six', color: '#26282a', caliper: 0xc89a2a },
    core: [1.5, 4.2],
    driverX: 0.38, cockpitOffset: [-0.2, -0.06], doorX: 0.86, linerY: 1.31, seatColour: 0x5a1a1a,
    headLamp: [0.62, 0.53, 2.3], tailLamp: [0.66, 0.82, -2.43],
    details: aventadoroDetails,
  },
  'mustank-gt500': {
    def: {
      // After David's GT500 sheet (2026-10-30): long low bonnet, short deck, a
      // fastback roof set well back, broad hips, a nose that dips to a lip.
      width: [[-2.41, 0.8], [-2.33, 0.9], [-2.0, 0.965], [-1.25, 0.985], [-0.2, 0.95], [0.9, 0.955], [1.6, 0.96], [2.1, 0.93], [2.3, 0.86], [2.41, 0.76]],
      sill: [[-2.41, 0.4], [-2.28, 0.27], [-1.8, 0.2], [1.9, 0.19], [2.3, 0.17], [2.41, 0.2]],
      belt: [[-2.41, 1.04], [-2.3, 1.06], [-1.7, 1.05], [-0.6, 1.0], [0.6, 0.97], [1.5, 0.93], [2.2, 0.86], [2.41, 0.76]],
      hood: [[-2.41, 1.04], [-2.3, 1.08], [-1.9, 1.09], [-1.65, 1.07], [0.95, 1.03], [1.5, 0.99], [2.0, 0.92], [2.3, 0.84], [2.41, 0.7]],
      roof: [[-1.8, 1.08], [-1.5, 1.17], [-1.0, 1.3], [-0.45, 1.375], [0, 1.385], [0.35, 1.34], [0.7, 1.2], [1.05, 1.03]],
      roofW: [[-1.8, 0.76], [-1.0, 0.68], [-0.2, 0.66], [0.4, 0.68], [1.05, 0.82]],
      wheels: { z: [1.47, -1.25], r: 0.44, top: 0.8, flare: [0.03, 0.05] },
      windows: [[0.9, -0.2], [-0.3, -1.25]], pillarsBlack: [[-0.2, -0.3]],
      screen: [1.05, 0.38], rearGlass: [-1.25, -1.8],
      crown: 0.05, baseW: 0.91, tuck: 0.05, sillTrim: true, fenderRise: 0.03, bulge: 0.025, roofCrown: 0.03,
    },
    wheelX: 0.83, tyreWidth: 0.29,
    rim: { style: 'five', color: '#1c1d1f', caliper: 0xb01818 },
    core: [1.44, 4.4],
    driverX: 0.4, cockpitOffset: [0.02, 0.1], doorX: 0.84, linerY: 1.32,
    headLamp: [0.62, 0.71, 2.38], tailLamp: [0.6, 0.9, -2.42],
    details: mustankDetails,
  },
};
