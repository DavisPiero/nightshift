// The rival cars on screen. The Race holds their physics; this builds a lighter
// model for each (the parked copy) and moves it. The player's car is drawn by
// the game as usual.

import { buildCar } from '../vehicles/car-model.js';

export class RaceView {
  constructor(scene) {
    this.scene = scene;
    this.rivals = [];
  }

  setup(cars) {
    this.clear();
    for (const c of cars) {
      if (c.isPlayer) continue;
      const model = buildCar(c.vehicle.spec, c.look, { simple: true });
      model.setLights(true);
      this.scene.add(model.root);
      this.rivals.push({ car: c, model });
    }
  }

  update(dt) {
    for (const { car, model } of this.rivals) {
      const v = car.vehicle;
      model.root.position.set(v.x, 0, v.z);
      model.root.rotation.y = v.heading;
      model.update(v, dt);
    }
  }

  clear() {
    for (const { model } of this.rivals) { model.root.removeFromParent(); model.dispose?.(); }
    this.rivals = [];
  }
}
