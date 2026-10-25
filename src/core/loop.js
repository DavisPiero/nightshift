// Fixed-step game loop. Physics always advances in 1/120 s steps, however
// fast or slow the screen refreshes, so the car handles the same on a 60 Hz
// iPad and a 144 Hz monitor. Rendering happens once per animation frame.

export const STEP = 1 / 120;
const MAX_STEPS = 12; // after a long stall, skip ahead instead of catching up

export class Loop {
  // useTimer drives frames with setTimeout instead of requestAnimationFrame;
  // headless Chrome (the smoke test) never fires animation frames.
  constructor(update, render, useTimer = false) {
    this.useTimer = useTimer;
    this.update = update;
    this.render = render;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this.stepsLastFrame = 0;
    this.fps = 0;
    this._frames = 0;
    this._fpsTime = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this._next();
  }

  _tick(now) {
    if (!this.running) return;
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < MAX_STEPS) {
      this.update(STEP);
      this.acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    this.stepsLastFrame = steps;
    this.render(dt, this.acc / STEP);
    this._frames++;
    this._fpsTime += dt;
    if (this._fpsTime >= 0.5) {
      this.fps = this._frames / this._fpsTime;
      this._frames = 0;
      this._fpsTime = 0;
    }
    this._next();
  }

  _next() {
    if (this.useTimer) setTimeout(() => this._tick(performance.now()), 16);
    else requestAnimationFrame(this._tick);
  }
}
