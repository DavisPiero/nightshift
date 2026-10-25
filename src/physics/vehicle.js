// Arcade car physics. A "bicycle" model: one front and one rear tyre pair,
// each with a grip curve, plus engine, gearbox, brakes, drag and a few
// driving assists that keep it forgiving. No Three.js in here, so it can be
// run and measured in Node (see tools/drive-bench.mjs).
//
// Axes: the world is the x/z ground plane. heading 0 faces +z, and a larger
// heading turns the car to its left. Inside this file left is positive for
// steering and sideways speed; the controls use +1 = steer right.

import { Gearbox } from './gearbox.js';

const G = 9.81;
const AIR = 1.2;
const RPM_PER_RADS = 60 / (2 * Math.PI);

export const DEFAULT_ASSISTS = {
  steering: true,    // countersteers for you a little when the tail slides
  stability: true,   // stops spins past a set drift angle
  drift: true,       // holds speed and angle once a drift is going
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

function torqueAt(curve, rpm) {
  if (rpm <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    if (rpm <= curve[i][0]) {
      const [r0, t0] = curve[i - 1];
      const [r1, t1] = curve[i];
      return lerp(t0, t1, (rpm - r0) / (r1 - r0));
    }
  }
  return curve[curve.length - 1][1];
}

// Share of peak grip at a slip angle: rises to 1 at the peak, then fades to
// slideGrip when fully sideways. Signed so it always opposes the slip.
function gripCurve(alpha, peak, slide) {
  const x = Math.abs(alpha) / peak;
  const g = x < 1 ? x * (2 - x) : 1 - (1 - slide) * Math.min(1, (x - 1) / 2.5);
  return Math.sign(alpha) * g;
}

export class Vehicle {
  constructor(spec, assists = DEFAULT_ASSISTS) {
    this.setSpec(spec);
    this.assists = { ...assists };
    this.gearbox = new Gearbox(spec);
    // Road surface, set by the weather: grip multiplies tyre friction, slide
    // is the share of grip left when fully sideways (wet roads let go sooner).
    this.surface = { grip: 1, slide: 1 };
    this.reset(0, 0, 0);
  }

  // Swap in a changed spec (parts, Feel panel) without losing position or speed.
  setSpec(spec) {
    this.spec = spec;
    if (this.gearbox) this.gearbox.spec = spec;
    const L = spec.wheelbase;
    this.cgToFront = L * (1 - spec.frontWeight);
    this.cgToRear = L * spec.frontWeight;
    this.inertia = spec.mass * (L * L + 4 * spec.halfWidth * spec.halfWidth) / 12 * 1.6 * spec.yawInertiaScale;
  }

  reset(x, z, heading) {
    this.x = x; this.z = z; this.heading = heading;
    this.vx = 0; this.vz = 0; this.yawRate = 0;
    this.steerAngle = 0;
    this.throttle = 0;
    this.rpm = this.spec.idleRpm;
    this.spin = 0;            // rear wheelspin, 0..1
    this.boost = 0;           // turbo boost, 0..1
    this.aLong = 0; this.aLat = 0;
    this.frontWheelAngle = 0; this.rearWheelAngle = 0;
    this.pitch = 0; this.pitchVel = 0; this.roll = 0; this.rollVel = 0;
    this.slipAngle = 0;       // angle between heading and travel, rad
    this.rearSlide = 0;       // 0..1, how hard the rear tyres are sliding (for audio)
    this.frontSlide = 0;
    this.load = 0;            // engine load -1..1 for audio
    this.braking = 0;
    this.limiter = false;
    this.wallPivot = 0;       // yaw rate (rad/s) from leaning on a wall at low speed
    this.wallTimer = 0;
    this.gearbox.gear = 1;
    this.gearbox.shiftTimer = 0;
  }

  get speed() { return Math.hypot(this.vx, this.vz); }
  get forwardX() { return Math.sin(this.heading); }
  get forwardZ() { return Math.cos(this.heading); }
  get speedForward() { return this.vx * this.forwardX + this.vz * this.forwardZ; }

  wheelRpm(gear) {
    const ratio = Math.abs(this.gearbox.ratio(gear)) * this.spec.finalDrive;
    return Math.abs(this.speedForward) / this.spec.wheelRadius * ratio * RPM_PER_RADS;
  }

  step(dt, c) {
    const s = this.spec;
    const gb = this.gearbox;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const lx = fz, lz = -fx; // left of the car
    let vLong = this.vx * fx + this.vz * fz;
    let vLat = this.vx * lx + this.vz * lz;
    const speed = Math.hypot(vLong, vLat);
    const reversing = gb.gear === -1;

    gb.update(dt, c, vLong, (g) => this.wheelRpm(g));

    // In reverse the pedals swap: brake drives backwards, throttle brakes.
    const drive = reversing ? c.brake : c.throttle;
    const brake = reversing ? c.throttle : c.brake;
    this.throttle += (drive - this.throttle) * Math.min(1, s.throttleResponse * dt);
    this.braking = brake;

    // Body slip angle: how sideways the car is travelling.
    const beta = speed > 3 && vLong > 0 ? Math.atan2(vLat, vLong) : 0;
    this.slipAngle = beta;

    // Steering: less lock at speed. The steering assist adds countersteer
    // toward the direction of travel when the tail steps out.
    const kmh = speed * 3.6;
    const lock = lerp(s.maxSteer, s.highSpeedSteer, clamp(kmh / 200, 0, 1));
    let steerTarget = -c.steer * lock;
    if (this.assists.steering && Math.abs(beta) > 0.05) {
      steerTarget += clamp(beta * 0.75, -s.maxSteer, s.maxSteer);
    }
    steerTarget = clamp(steerTarget, -s.maxSteer, s.maxSteer);
    const ds = steerTarget - this.steerAngle;
    const maxDs = s.steerSpeed * dt;
    this.steerAngle += clamp(ds, -maxDs, maxDs);
    const delta = this.steerAngle;

    // Weight transfer from the last step's acceleration.
    const L = s.wheelbase;
    const a = this.cgToFront, b = this.cgToRear;
    const transfer = s.mass * clamp(this.aLong, -12, 12) * s.cgHeight / L;
    // Wings and body kits press the car down at speed (s.downforce is N per (m/s)²).
    const df = (s.downforce || 0) * speed * speed;
    const nFront = Math.max(0.2 * s.mass * G, s.mass * G * b / L - transfer) + df * 0.4;
    const nRear = Math.max(0.2 * s.mass * G, s.mass * G * a / L + transfer) + df * 0.6;

    // Turbo boost builds with revs and throttle, and takes a moment to come
    // in (lag). Without boost the engine makes `share` less torque.
    if (s.turbo) {
      const tb = s.turbo;
      const want = this.throttle * clamp((this.rpm - tb.spoolRpm) / 1300, 0, 1);
      this.boost += (want - this.boost) * Math.min(1, dt / (want > this.boost ? tb.lag : 0.12));
    } else this.boost = 0;
    const boostFactor = s.turbo ? 1 - s.turbo.share * (1 - this.boost) : 1;

    // Engine and drive force at the driven wheels.
    const ratio = Math.abs(gb.ratio()) * s.finalDrive;
    let coupled = Math.abs(vLong) / s.wheelRadius * ratio * RPM_PER_RADS;
    let driveForce = 0;
    let engineTorque = 0;
    if (ratio > 0 && !gb.shifting) {
      const rpmForTorque = Math.max(coupled, s.idleRpm);
      // The limiter follows the wheels, not wheelspin flare: spinning the
      // tyres must never cut the power (more power would launch slower).
      this.limiter = coupled >= s.limiterRpm || (this.rpm >= s.limiterRpm && this.spin < 0.2);
      const full = this.limiter ? 0 : torqueAt(s.torqueCurve, rpmForTorque) * (s.torqueScale ?? 1) * boostFactor;
      const drag = s.engineBraking * clamp(rpmForTorque / s.redline, 0, 1);
      engineTorque = this.throttle * full - (1 - this.throttle) * drag;
      // Pull away gently from a standstill instead of stalling.
      if (coupled < s.idleRpm * 1.5) engineTorque = Math.max(engineTorque, this.throttle * full);
      driveForce = engineTorque * ratio * s.drivetrainEfficiency / s.wheelRadius;
      if (vLong < -0.5 && !reversing) driveForce = Math.max(driveForce, 0);
    }
    if (reversing) driveForce = -driveForce;

    const muF = s.tireGrip * this.surface.grip;
    const muR = s.tireGrip * s.rearGripScale * this.surface.grip;
    const slideGrip = s.slideGrip * this.surface.slide;
    const rearCap = muR * nRear;
    const frontCap = muF * nFront;

    // Four-wheel drive sends part of the push to the front tyres.
    const fShare = s.drivetrain === 'awd' ? (s.frontTorqueShare ?? 0.35) : 0;
    let frontDrive = driveForce * fShare;
    driveForce -= frontDrive;
    if (Math.abs(frontDrive) > frontCap * 0.9) frontDrive = Math.sign(frontDrive) * frontCap * 0.9;

    // Wheelspin when the engine pushes harder than the rear tyres can take.
    let excess = 0;
    if (Math.abs(driveForce) > rearCap && this.throttle > 0.3) {
      excess = (Math.abs(driveForce) - rearCap) / rearCap;
      driveForce = Math.sign(driveForce) * rearCap * (1 - 0.08 * Math.min(1, excess));
    }
    this.spin += (clamp(excess, 0, 1) - this.spin) * Math.min(1, 6 * dt);

    // Brakes push against the direction of travel, never beyond grip (an
    // always-on anti-lock, because this is not a sim).
    let brakeFront = 0, brakeRear = 0;
    const dir = Math.sign(vLong) || 0;
    if (brake > 0 && Math.abs(vLong) > 0.05) {
      brakeFront = Math.min(brake * s.brakeForce * s.brakeFrontBias, muF * nFront * 0.95);
      brakeRear = Math.min(brake * s.brakeForce * (1 - s.brakeFrontBias), rearCap * 0.95);
    }
    if (c.handbrake && Math.abs(vLong) > 0.05) brakeRear += s.handbrakeForce;

    let fRearLong = driveForce - dir * brakeRear;
    const fFrontLong = frontDrive - dir * brakeFront;
    // Front tyres pulling the car have less left for turning.
    const frontLatShare = frontDrive ? Math.sqrt(Math.max(0.3, 1 - (frontDrive / frontCap) ** 2)) : 1;

    // Rear lateral grip shrinks while the tyres are busy pushing or locked.
    let rearLatCap = Math.sqrt(Math.max(0, rearCap * rearCap - fRearLong * fRearLong));
    rearLatCap = Math.max(rearLatCap, rearCap * 0.3);
    if (c.handbrake) rearLatCap = Math.min(rearLatCap, rearCap * s.handbrakeRearGrip);
    if (this.spin > 0) rearLatCap *= 1 - 0.35 * this.spin;
    if (Math.abs(fRearLong) > rearCap) fRearLong = Math.sign(fRearLong) * rearCap;

    // Tyre slip angles. Below walking pace the angles are meaningless, so the
    // speed used here has a floor.
    const vRef = Math.max(Math.abs(vLong), 2.5);
    const sgn = vLong >= 0 ? 1 : -1;
    const alphaF = Math.atan2(vLat + this.yawRate * a, vRef) - delta * sgn;
    const alphaR = Math.atan2(vLat - this.yawRate * b, vRef);
    // At walking pace the turned front wheels simply roll where they point
    // (the crawl blend below does that); their slip angle is not real, so
    // fade their sideways force out instead of letting it drag the car.
    const crawlTyre = clamp(1 - speed / 4, 0, 1);
    const latF = -muF * nFront * gripCurve(alphaF, s.slipPeak, slideGrip) * (1 - crawlTyre * 0.85) * frontLatShare;
    const latR = -rearLatCap * gripCurve(alphaR, s.slipPeak, slideGrip);
    this.frontSlide = clamp(Math.abs(alphaF) / s.slipPeak - 1, 0, 1);
    // How close the brakes are to locking (for the squeal of a hard stop).
    this.brakeGrip = brake > 0 ? clamp(brakeFront / (muF * nFront * 0.95), 0, 1) : 0;
    this.rearSlide = clamp(Math.max(Math.abs(alphaR) / s.slipPeak - 0.8, this.spin, c.handbrake && speed > 3 ? 0.7 : 0), 0, 1);

    // Air and rolling resistance.
    const dragF = 0.5 * AIR * s.dragCoefficient * s.frontalArea * speed * speed + s.rollingResistance * s.mass * G * Math.min(1, speed);
    // Lift-off: with no pedal pressed a real car slows noticeably (engine,
    // drivetrain, tyres). Physics alone undersells it, so add a little more.
    const coasting = drive < 0.05 && brake < 0.05 && !c.handbrake;
    const liftOff = coasting ? s.liftOffDrag * s.mass * clamp(Math.abs(vLong) / 3, 0, 1) : 0;

    const cosD = Math.cos(delta), sinD = Math.sin(delta);
    let fLong = fRearLong + fFrontLong * cosD - latF * sinD - Math.sign(vLong) * liftOff;
    let fLat = latR + latF * cosD + fFrontLong * sinD;
    if (speed > 0.01) {
      fLong -= dragF * vLong / speed;
      fLat -= dragF * vLat / speed;
    }
    let torque = (latF * cosD + fFrontLong * sinD) * a - latR * b;

    // Drift assist: keep the car moving through a slide instead of scrubbing
    // all its speed, and calm the rotation so the angle holds steady.
    const sliding = Math.abs(beta) > 0.12 && speed > 8;
    if (this.assists.drift && sliding) {
      const push = this.throttle * Math.min(1, Math.abs(beta) * 2) * s.mass * 2.2;
      fLong += push * Math.cos(beta);
      fLat += push * Math.sin(beta);
      torque -= this.yawRate * this.inertia * 1.2;
    }

    // Stability assist: past ~40° of slide, pull the nose back toward the
    // direction of travel so the car does not spin.
    if (this.assists.stability && speed > 4) {
      const limit = 0.7;
      const over = Math.abs(beta) - limit;
      if (over > 0) {
        torque += Math.sign(beta) * over * this.inertia * 25;
        // Damp rotation that is making the slide worse.
        if (Math.sign(this.yawRate) === -Math.sign(beta)) torque -= this.yawRate * this.inertia * 4;
      }
    }

    // Integrate in world space.
    const ax = (fLong * fx + fLat * lx) / s.mass;
    const az = (fLong * fz + fLat * lz) / s.mass;
    this.vx += ax * dt;
    this.vz += az * dt;
    this.yawRate += torque / this.inertia * dt;

    // At walking pace, blend toward simple rolling behaviour so the car parks
    // and pulls away without jitter.
    vLong = this.vx * fx + this.vz * fz;
    vLat = this.vx * lx + this.vz * lz;
    const crawl = clamp(1 - Math.hypot(vLong, vLat) / 4, 0, 1);
    if (crawl > 0) {
      const rollingYaw = vLong * Math.tan(delta) / L;
      this.yawRate = lerp(this.yawRate, rollingYaw, crawl);
      vLat *= 1 - crawl * Math.min(1, 10 * dt);
      // Stop dead instead of creeping when only the brake is held.
      if (brake > 0 && drive < 0.05 && Math.abs(vLong) < 0.3) vLong = 0;
      if (drive < 0.05 && !brake && Math.abs(vLong) < 0.15) vLong = 0;
      this.vx = vLong * fx + vLat * lx;
      this.vz = vLong * fz + vLat * lz;
      // Leaning on a wall at walking pace: pivot to run along it, so the
      // car never gets pinned nose-first (rolling tyres alone cannot turn it).
      if (this.wallTimer > 0 && (drive > 0.2 || brake > 0.2)) this.yawRate += this.wallPivot * crawl;
    }
    this.wallTimer = Math.max(0, this.wallTimer - dt);

    this.heading += this.yawRate * dt;
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Accelerations felt by the driver, smoothed (they drive weight transfer
    // and body roll).
    const k = Math.min(1, 8 * dt);
    this.aLong += ((fLong / s.mass) - this.aLong) * k;
    this.aLat += ((vLong * this.yawRate) - this.aLat) * k;

    // Engine speed: follows the wheels, revs up when spinning or when the
    // clutch is slipping at a standstill, falls to idle in neutral.
    coupled = this.wheelRpm(gb.gear);
    let target;
    if (gb.shifting || ratio === 0) {
      target = s.idleRpm + this.throttle * (s.redline - s.idleRpm) * 0.6;
    } else {
      const launch = s.idleRpm + this.throttle * 2600;
      target = Math.max(coupled * (1 + this.spin * 0.45), coupled < launch ? lerp(coupled, launch, Math.min(1, 1.3 - coupled / launch)) : 0, s.idleRpm);
    }
    const follow = gb.shifting ? 14 : 25;
    this.rpm += (target - this.rpm) * Math.min(1, follow * dt);
    if (this.limiter) this.rpm -= 250; // the limiter's stutter
    this.rpm = clamp(this.rpm, s.idleRpm * 0.9, s.limiterRpm + 50);
    const peak = torqueAt(s.torqueCurve, this.rpm);
    this.load = gb.shifting ? 0 : clamp(engineTorque / peak, -1, 1);

    // Wheel rotation for the model.
    const wheelRate = vLong / s.wheelRadius;
    this.frontWheelAngle += wheelRate * dt;
    if (!c.handbrake) this.rearWheelAngle += (wheelRate + Math.sign(drive) * this.spin * 25) * dt;

    // Body pitch and roll on stiff springs, for looks. Capped so the body
    // never tips far enough to touch the road.
    const kS = s.suspensionStiffness, kD = s.suspensionDamping;
    // The nose dives under braking and squats a little less under power.
    const squat = this.aLong > 0 ? (s.squatShare ?? 0.6) : 1;
    const pitchTarget = clamp(-this.aLong * s.pitchScale * squat, -s.maxPitch, s.maxPitch);
    // A gear change cuts the power for a moment: the nose nods.
    if (gb.shiftCount !== this.lastShiftCount) {
      if (this.lastShiftCount !== undefined && gb.lastShift > 0 && this.throttle > 0.5) this.pitchVel += s.shiftKick ?? 0.25;
      this.lastShiftCount = gb.shiftCount;
    }
    const rollTarget = clamp(this.aLat * s.rollScale, -s.maxRoll, s.maxRoll);
    this.pitchVel += ((pitchTarget - this.pitch) * kS - this.pitchVel * kD) * dt;
    this.pitch += this.pitchVel * dt;
    this.rollVel += ((rollTarget - this.roll) * kS - this.rollVel * kD) * dt;
    this.roll += this.rollVel * dt;
    this.pitch = clamp(this.pitch, -s.maxPitch * 1.3, s.maxPitch * 1.3);
    this.roll = clamp(this.roll, -s.maxRoll * 1.3, s.maxRoll * 1.3);
  }

  // Bounce off a wall. nx/nz is the wall normal pointing back toward the
  // road, depth how far the body has gone through it, and rx/rz where on the
  // body it touched (relative to the centre, world axes). Returns the impact
  // speed in m/s.
  collide(nx, nz, depth, rx = 0, rz = 0) {
    this.x += nx * depth;
    this.z += nz * depth;
    // Velocity of the touching point: the car's own plus its spin. A turn
    // to the left (positive yaw rate) moves a point at r toward (rz, -rx).
    const px = rz, pz = -rx;
    const pvx = this.vx + this.yawRate * px, pvz = this.vz + this.yawRate * pz;
    const vn = pvx * nx + pvz * nz;
    if (vn >= 0) return 0;
    // A proper impulse at the contact point, so an off-centre knock turns
    // the car. Low bounce: walls are steel barriers, not rubber.
    const restitution = 0.2;
    const rn = nx * px + nz * pz;
    const j = -(1 + restitution) * vn / (1 / this.spec.mass + rn * rn / this.inertia);
    this.vx += j * nx / this.spec.mass;
    this.vz += j * nz / this.spec.mass;
    this.yawRate += j * rn / this.inertia;
    // Friction along the wall, in proportion to how hard it was hit (so a
    // car sliding along the barrier keeps most of its speed). A gentle push
    // slides almost freely, so the car can never get pinned nose-first.
    const tx = -nz, tz = nx;
    const vt = this.vx * tx + this.vz * tz;
    const mu = 0.35 * clamp(-vn / 5, 0.1, 1);
    const dvt = Math.min(Math.abs(vt), mu * j / this.spec.mass);
    this.vx -= Math.sign(vt) * dvt * tx;
    this.vz -= Math.sign(vt) * dvt * tz;
    // Forgiving: settle the spin a hit causes, and turn the car a little to
    // run along the wall instead of nosing into it.
    this.yawRate = clamp(this.yawRate, -2.5, 2.5) * 0.7;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const into = fx * nx + fz * nz;
    if (into < 0) {
      const side = Math.sign(fx * -nz + fz * nx) || 1;
      this.yawRate += side * Math.min(1.0, -into * 1.6) * Math.min(1, -vn / 8);
      this.wallPivot = side * Math.min(1, -into * 1.6) * 0.9;
      this.wallTimer = 0.1;
    }
    return -vn;
  }
}
