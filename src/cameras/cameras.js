// Camera manager. Each camera type gets the car (physics + model) every
// frame and places the shared Three.js camera. New types (bumper, replay,
// garage orbit) can be added to TYPES later.

import * as THREE from 'three';

const damp = (k, dt) => 1 - Math.exp(-k * dt);
const _v = new THREE.Vector3();

class ChaseCamera {
  constructor() {
    this.distance = 6.2;
    this.height = 2.1;
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.fov = 62;
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
    const dist = this.distance + speedK * 0.6;
    const tx = v.x - Math.sin(this.yaw) * dist;
    const tz = v.z - Math.cos(this.yaw) * dist;
    const ty = this.height + speedK * 0.2;
    // Position follows the car exactly (the lag is in the yaw), so the car
    // stays the same size on screen at any speed.
    this.pos.x = tx;
    this.pos.z = tz;
    this.pos.y = snap ? ty : this.pos.y + (ty - this.pos.y) * damp(4, dt);
    const cam = car.camera;
    cam.position.copy(this.pos);
    cam.lookAt(v.x + Math.sin(v.heading) * 2.5, 0.9, v.z + Math.cos(v.heading) * 2.5);
    // Wider view at speed, eased so it never jumps.
    const fov = 62 + speedK * 12;
    this.fov += (fov - this.fov) * damp(2, dt);
    cam.fov = this.fov;
    cam.near = 0.1;
  }
}

class CockpitCamera {
  constructor() { this.look = 0; this.fov = 70; }
  snap(car) { this.look = 0; this.update(car, 1); }

  update(car, dt) {
    const v = car.vehicle;
    const model = car.model;
    const cam = car.camera;
    model.body.updateWorldMatrix(true, false);
    _v.copy(model.cockpitEye).applyMatrix4(model.body.matrixWorld);
    cam.position.copy(_v);
    // Glance a little into the turn.
    const target = v.steerAngle * 0.4;
    this.look += (target - this.look) * damp(4, dt);
    const yaw = v.heading + this.look;
    cam.lookAt(_v.x + Math.sin(yaw) * 10, _v.y - 0.55 + v.pitch * -4, _v.z + Math.cos(yaw) * 10);
    cam.rotateZ(-v.roll * 0.6);
    const fov = 70 + Math.min(1, v.speed / 60) * 8;
    this.fov += (fov - this.fov) * damp(2, dt);
    cam.fov = this.fov;
    cam.near = 0.05;
  }
}

const TYPES = { chase: ChaseCamera, cockpit: CockpitCamera };
export const CAMERA_ORDER = ['chase', 'cockpit'];

export class CameraManager {
  constructor(camera) {
    this.camera = camera;
    this.cams = Object.fromEntries(Object.entries(TYPES).map(([k, C]) => [k, new C()]));
    this.mode = 'chase';
  }

  set(mode, car) {
    this.mode = mode;
    this.cams[mode].snap({ ...car, camera: this.camera });
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
