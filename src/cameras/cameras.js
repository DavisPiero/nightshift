// Camera manager. Each camera type gets the car (physics + model) every
// frame and places the shared Three.js camera. New types (bumper, replay,
// garage orbit) can be added to TYPES later.

import * as THREE from 'three';

const damp = (k, dt) => 1 - Math.exp(-k * dt);
const _v = new THREE.Vector3();
const _t = new THREE.Vector3();

// Shared options from Settings.
const OPTIONS = { distance: 1, fov: 62, shake: true };

// A little shake: road buzz that grows with speed, plus a kick on wall hits.
class Shake {
  constructor() { this.kick = 0; this.t = 0; }
  bump(impact) { this.kick = Math.min(1, this.kick + impact / 12); }
  offset(v, dt, scale) {
    this.t += dt;
    this.kick = Math.max(0, this.kick - dt * 3);
    if (!OPTIONS.shake) return [0, 0];
    const buzz = Math.min(1, v.speed / 70) ** 2 * 0.012 + v.rearSlide * 0.008 + this.kick * 0.09;
    return [
      (Math.sin(this.t * 37.1) + Math.sin(this.t * 23.3)) * 0.5 * buzz * scale,
      (Math.sin(this.t * 41.7) + Math.sin(this.t * 29.9)) * 0.5 * buzz * scale,
    ];
  }
}

class ChaseCamera {
  constructor(shake) {
    this.distance = 6.2;
    this.height = 2.1;
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.fov = 62;
    this.shake = shake;
  }

  snap(car) {
    this.yaw = car.vehicle.heading;
    this.update(car, 1, true);
  }

  update(car, dt, snap = false) {
    const v = car.vehicle;
    // Follow mostly the car's heading, but lean toward where it is actually
    // travelling so a drift shows the car sideways on screen.
    let aim = v.heading;
    if (v.speed > 4 && v.speedForward > 0) aim = v.heading + v.slipAngle * 0.55;
    let d = aim - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += snap ? d : d * damp(4.5, dt);

    const speedK = Math.min(1, v.speed / 60);
    const dist = (this.distance + speedK * 0.6) * OPTIONS.distance;
    const tx = v.x - Math.sin(this.yaw) * dist;
    const tz = v.z - Math.cos(this.yaw) * dist;
    const ty = (this.height + speedK * 0.2) * (0.6 + 0.4 * OPTIONS.distance);
    // Position follows the car exactly (the lag is in the yaw), so the car
    // stays the same size on screen at any speed.
    this.pos.x = tx;
    this.pos.z = tz;
    this.pos.y = snap ? ty : this.pos.y + (ty - this.pos.y) * damp(4, dt);
    const cam = car.camera;
    const [sx, sy] = this.shake.offset(v, dt, 1);
    cam.position.copy(this.pos);
    cam.position.y += sy;
    cam.lookAt(v.x + Math.sin(v.heading) * 2.5 + sx, 0.9, v.z + Math.cos(v.heading) * 2.5);
    // Wider view at speed, eased so it never jumps.
    const fov = OPTIONS.fov + speedK * 12;
    this.fov += (fov - this.fov) * damp(2, dt);
    cam.fov = this.fov;
    cam.near = 0.1;
  }
}

// From the driver's seat. The eye rides with the body's height but not its
// lean: the horizon stays level so the road is always easy to read.
class CockpitCamera {
  constructor(shake) { this.look = 0; this.fov = 66; this.shake = shake; }
  snap(car) { this.look = 0; this.update(car, 1); }

  update(car, dt) {
    const v = car.vehicle;
    const model = car.model;
    const cam = car.camera;
    model.root.updateWorldMatrix(true, false);
    _v.copy(model.cockpitEye).applyMatrix4(model.root.matrixWorld);
    // A sliver of the body's pitch, for a sense of weight; no roll at all.
    _v.y += v.pitch * 0.4;
    cam.position.copy(_v);
    const [sx, sy] = this.shake.offset(v, dt, 0.35);
    cam.position.y += sy;
    // Glance a little into the turn.
    const target = v.steerAngle * 0.35;
    this.look += (target - this.look) * damp(4, dt);
    const yaw = v.heading + this.look;
    _t.set(_v.x + Math.sin(yaw) * 10 + sx, _v.y - 0.75 + v.pitch * -1.5, _v.z + Math.cos(yaw) * 10);
    cam.up.set(0, 1, 0);
    cam.lookAt(_t);
    const fov = OPTIONS.fov + 4 + Math.min(1, v.speed / 60) * 6;
    this.fov += (fov - this.fov) * damp(2, dt);
    cam.fov = this.fov;
    cam.near = 0.04;
  }
}

const TYPES = { chase: ChaseCamera, cockpit: CockpitCamera };
export const CAMERA_ORDER = ['chase', 'cockpit'];

export class CameraManager {
  constructor(camera) {
    this.camera = camera;
    this.shake = new Shake();
    this.cams = Object.fromEntries(Object.entries(TYPES).map(([k, C]) => [k, new C(this.shake)]));
    this.mode = 'chase';
  }

  configure(o) { Object.assign(OPTIONS, o); }
  bump(impact) { this.shake.bump(impact); }

  set(mode, car) {
    this.mode = mode;
    this.cams[mode].snap({ ...car, camera: this.camera });
    this.camera.updateProjectionMatrix();
  }

  next(car) {
    const i = CAMERA_ORDER.indexOf(this.mode);
    this.set(CAMERA_ORDER[(i + 1) % CAMERA_ORDER.length], car);
    return this.mode;
  }

  update(car, dt) {
    this.cams[this.mode].update({ ...car, camera: this.camera }, dt);
    this.camera.updateProjectionMatrix();
  }
}
