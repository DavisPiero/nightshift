// The rival cars on screen. The Race holds their physics; this builds a lighter
// model for each (the parked copy) and moves it. The player's car is drawn by
// the game as usual. The ghost in a Time Trial is a see-through parked copy.

import * as THREE from 'three';
import { buildCar } from '../vehicles/car-model.js';

// A car body on the road: where it is, and how the hill tips it.
export function placeOnRoad(root, v) {
  root.position.set(v.x, v.roadY, v.z);
  root.rotation.set(-Math.atan(v.slope), v.heading, Math.atan(v.slopeSide), 'YXZ');
}

export class RaceView {
  constructor(scene) {
    this.scene = scene;
    this.rivals = [];
  }

  setup(cars, lights = true) {
    this.clear();
    for (const c of cars) {
      if (c.isPlayer) continue;
      const model = buildCar(c.vehicle.spec, c.look, { simple: true });
      model.setLights(lights);
      this.scene.add(model.root);
      this.rivals.push({ car: c, model });
    }
  }

  update(dt) {
    for (const { car, model } of this.rivals) {
      const v = car.vehicle;
      placeOnRoad(model.root, v);
      model.update(v, dt);
    }
  }

  clear() {
    for (const { model } of this.rivals) { model.root.removeFromParent(); model.dispose?.(); }
    this.rivals = [];
  }
}

// The Time Trial ghost: the player's car, see-through and teal. Its materials
// are copies, so nothing else turns see-through with it.
export class GhostView {
  constructor(scene) { this.scene = scene; this.model = null; }

  setup(spec, look) {
    this.clear();
    const m = this.model = buildCar(spec, look, { simple: true });
    m.setLights(false);
    m.root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false;
      o.material = new THREE.MeshBasicMaterial({ color: 0x22d8c8, transparent: true, opacity: 0.2, depthWrite: false });
    });
    m.root.visible = false;
    this.scene.add(m.root);
  }

  // pose: { x, z, heading }, or null to hide it.
  update(pose) {
    if (!this.model) return;
    this.model.root.visible = !!pose;
    if (!pose) return;
    this.model.root.position.set(pose.x, pose.y ?? 0, pose.z);
    this.model.root.rotation.y = pose.heading;
  }

  clear() {
    if (!this.model) return;
    this.model.root.removeFromParent();
    this.model.dispose?.();
    this.model = null;
  }
}
