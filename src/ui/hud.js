// Driving HUD: a segmented rev counter with the gear in the middle and the
// speed underneath, drawn on a small canvas like an old console racer.
// Plus a debug panel (F3) with the physics numbers.

const SEGMENTS = 32;

export class Hud {
  constructor(root) {
    this.el = root;
    this.canvas = root.querySelector('#tach');
    this.g = this.canvas.getContext('2d');
    this.debugEl = root.querySelector('#debug');
    this.debugOn = false;
    this.flash = 0;
  }

  show(on) { this.el.hidden = !on; }

  toggleDebug() {
    this.debugOn = !this.debugOn;
    this.debugEl.hidden = !this.debugOn;
  }

  draw(v, dt) {
    const g = this.g, W = this.canvas.width, H = this.canvas.height;
    const s = v.spec;
    g.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.55, R = W * 0.42;
    const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
    const lit = Math.round((v.rpm / s.limiterRpm) * SEGMENTS);
    const red = Math.round((s.redline / s.limiterRpm) * SEGMENTS) - 2;
    this.flash = v.limiter ? (this.flash + dt * 18) % 2 : 0;
    for (let i = 0; i < SEGMENTS; i++) {
      const a = a0 + (a1 - a0) * (i + 0.5) / SEGMENTS;
      const len = i % 4 === 0 ? 14 : 10;
      const on = i < lit;
      g.strokeStyle = on
        ? (i >= red ? (this.flash > 1 ? '#ff6a40' : '#e0301c') : '#f2a640')
        : (i >= red ? 'rgba(160,40,30,0.45)' : 'rgba(200,190,170,0.18)');
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * (R - len), cy + Math.sin(a) * (R - len));
      g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      g.stroke();
    }
    // rpm numbers 1..7
    g.fillStyle = 'rgba(230,220,200,0.55)';
    g.font = 'bold 12px "DIN Condensed", "Arial Narrow", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 1; k <= 7; k++) {
      const a = a0 + (a1 - a0) * (k * 1000 / s.limiterRpm);
      g.fillText(String(k), cx + Math.cos(a) * (R - 26), cy + Math.sin(a) * (R - 26));
    }
    const gear = v.gearbox.gear === -1 ? 'R' : v.gearbox.gear === 0 ? 'N' : String(v.gearbox.gear);
    g.fillStyle = v.gearbox.shifting ? '#9a8a70' : '#f4e8d0';
    g.font = 'italic bold 52px "DIN Condensed", "Arial Narrow", sans-serif';
    g.fillText(gear, cx, cy - 4);
    const kmh = Math.round(Math.abs(v.speedForward) * 3.6);
    g.fillStyle = '#f2a640';
    g.font = 'italic bold 40px "DIN Condensed", "Arial Narrow", sans-serif';
    g.fillText(String(kmh).padStart(3, ' '), cx, cy + R * 0.78);
    g.fillStyle = 'rgba(230,220,200,0.6)';
    g.font = 'bold 11px "DIN Condensed", "Arial Narrow", sans-serif';
    g.fillText('KM/H', cx, cy + R * 0.78 + 24);
  }

  drawDebug(v, info) {
    if (!this.debugOn) return;
    const deg = (r) => (r * 180 / Math.PI).toFixed(1);
    this.debugEl.textContent = [
      `fps        ${info.fps.toFixed(0)}  (${info.steps} physics steps)`,
      `render     ${info.width}x${info.height}  ${info.preset}  calls ${info.calls}  tris ${info.tris}`,
      `speed      ${(v.speed * 3.6).toFixed(1)} km/h   fwd ${(v.speedForward * 3.6).toFixed(1)}`,
      `rpm        ${v.rpm.toFixed(0)}  gear ${v.gearbox.gear}${v.gearbox.shifting ? ' (shifting)' : ''}  ${v.gearbox.mode}`,
      `throttle   ${v.throttle.toFixed(2)}  brake ${v.braking.toFixed(2)}  load ${v.load.toFixed(2)}`,
      `steer      in ${info.controls.steer.toFixed(2)}  wheels ${deg(v.steerAngle)}°`,
      `slide      ${deg(v.slipAngle)}°  rear ${v.rearSlide.toFixed(2)}  front ${v.frontSlide.toFixed(2)}  spin ${v.spin.toFixed(2)}`,
      `g          long ${(v.aLong / 9.81).toFixed(2)}  lat ${(v.aLat / 9.81).toFixed(2)}`,
      `track      sample ${info.trackIndex}  offset ${info.offset.toFixed(1)} m`,
      `pos        ${v.x.toFixed(1)}, ${v.z.toFixed(1)}  heading ${deg(v.heading)}°`,
      `assists    ${Object.entries(v.assists).filter(([, on]) => on).map(([k]) => k).join(', ') || 'off'}`,
    ].join('\n');
  }
}
