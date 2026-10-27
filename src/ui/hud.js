// Driving HUD: a pixel rev counter (a ring of chunky blocks) with the gear
// in the middle and the speed underneath, and a minimap top right (the
// track's outline, north up, with the car as an arrow). Both are drawn small
// on canvases and scaled up with square pixels, like the menus. Plus a debug
// panel (F3) with the physics numbers.

const SEGMENTS = 28;
const FONT = '"Jersey 10", ui-monospace, monospace';
const CYAN = '#3ff0e8', ORANGE = '#ff2e88', RED = '#ff3b3b', TEXT = '#eafcfb';

export class Hud {
  constructor(root) {
    this.el = root;
    this.canvas = root.querySelector('#tach');
    this.map = root.querySelector('#minimap');
    this.g = this.canvas.getContext('2d');
    this.debugEl = root.querySelector('#debug');
    this.debugOn = false;
    this.flash = 0;
    this.gearPop = 0;
    this.lastGear = null;
    this.units = 'kmh';
    this.shownKmh = 0;
  }

  show(on) { this.el.hidden = !on; }
  setTouch(on) { this.el.classList.toggle('touch', on); }

  toggleDebug() {
    this.debugOn = !this.debugOn;
    this.debugEl.hidden = !this.debugOn;
  }

  // A new track: draw its outline once, at a fixed zoom (about 200 m across
  // the map), so each frame only needs to show the part round the car.
  setTrack(path, start) {
    const pad = 80, K = 0.8; // px per metre
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < path.count; i++) { x0 = Math.min(x0, path.x[i]); x1 = Math.max(x1, path.x[i]); z0 = Math.min(z0, path.z[i]); z1 = Math.max(z1, path.z[i]); }
    const k = Math.min(K, 4000 / Math.max(x1 - x0, z1 - z0, 1));
    this.mapK = k;
    this.toMap = (x, z) => [pad + (x1 - x) * k, pad + (z1 - z) * k];
    const c = this.outline = document.createElement('canvas');
    c.width = Math.ceil((x1 - x0) * k + pad * 2); c.height = Math.ceil((z1 - z0) * k + pad * 2);
    const g = c.getContext('2d');
    g.lineJoin = 'round';
    const trace = () => {
      g.beginPath();
      for (let i = 0; i <= path.count; i += 2) { const [x, y] = this.toMap(path.x[i % path.count], path.z[i % path.count]); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.closePath();
    };
    g.strokeStyle = 'rgba(0, 0, 0, 0.6)'; g.lineWidth = 9; trace(); g.stroke();
    g.strokeStyle = '#2a8f92'; g.lineWidth = 6; trace(); g.stroke();
    g.strokeStyle = '#bff8f4'; g.lineWidth = 2; trace(); g.stroke();
    // The start line.
    const [sx, sy] = this.toMap(path.x[start], path.z[start]);
    g.fillStyle = '#fff'; g.fillRect(Math.round(sx) - 4, Math.round(sy) - 4, 8, 8);
  }

  // The map turns with the car, so up is always ahead and a bend to the
  // right looks like a bend to the right.
  drawMap(v) {
    if (!this.outline) return;
    const g = this.map.getContext('2d'), W = this.map.width, H = this.map.height;
    g.clearRect(0, 0, W, H);
    const [x, y] = this.toMap(v.x, v.z);
    g.save();
    g.translate(W / 2, H * 0.62); // the car sits low, so more of the road ahead shows
    g.rotate(v.heading);
    g.drawImage(this.outline, -x, -y);
    g.restore();
    g.save();
    g.translate(W / 2, H * 0.62);
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5.5, 6); g.lineTo(0, 3); g.lineTo(-5.5, 6); g.closePath();
    g.lineWidth = 2; g.strokeStyle = '#1e0010'; g.stroke();
    g.fillStyle = ORANGE; g.fill();
    g.restore();
  }

  draw(v, dt) {
    this.drawMap(v);
    const g = this.g, W = this.canvas.width, H = this.canvas.height;
    const s = v.spec;
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    const cx = W / 2, cy = H * 0.5, R = W * 0.46;
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;

    // Backing disc, notched by the blocks around it.
    g.fillStyle = 'rgba(6, 9, 12, 0.72)';
    g.beginPath(); g.arc(cx, cy, R - 3, 0, Math.PI * 2); g.fill();

    const lit = (v.rpm / s.limiterRpm) * SEGMENTS;
    const red = Math.round((s.redline / s.limiterRpm) * SEGMENTS) - 2;
    const shiftLight = v.rpm > s.autoUpshiftRpm - 400 && v.gearbox.mode === 'manual';
    this.flash = v.limiter || shiftLight ? (this.flash + dt * 16) % 2 : 0;
    for (let i = 0; i < SEGMENTS; i++) {
      const a = a0 + (a1 - a0) * (i + 0.5) / SEGMENTS;
      const on = i < Math.round(lit);
      const hot = i >= red, warm = i >= red - 5;
      let col = on ? (hot ? (this.flash > 1 ? TEXT : RED) : warm ? ORANGE : CYAN) : (hot ? '#3a1410' : '#12222a');
      const big = i % 4 === 0;
      const r0 = R - (big ? 12 : 9);
      g.save();
      g.translate(cx + Math.cos(a) * (r0 + R) / 2, cy + Math.sin(a) * (r0 + R) / 2);
      g.rotate(a);
      g.fillStyle = col;
      g.fillRect(-(R - r0) / 2, -2.5, R - r0, 5);
      g.restore();
    }
    // rpm numbers 1..7
    g.fillStyle = 'rgba(134, 163, 173, 0.9)';
    g.font = `12px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 1; k * 1000 <= s.limiterRpm; k++) {
      const a = a0 + (a1 - a0) * (k * 1000 / s.limiterRpm);
      g.fillText(String(k), Math.round(cx + Math.cos(a) * (R - 21)), Math.round(cy + Math.sin(a) * (R - 21)));
    }

    // Gear, with a short pop when it changes.
    const gear = v.gearbox.gear === -1 ? 'R' : v.gearbox.gear === 0 ? 'N' : String(v.gearbox.gear);
    if (gear !== this.lastGear) { this.gearPop = this.lastGear === null ? 0 : 1; this.lastGear = gear; }
    this.gearPop = Math.max(0, this.gearPop - dt * 5);
    const size = Math.round(46 + this.gearPop * 14);
    g.font = `${size}px ${FONT}`;
    g.fillStyle = '#0d5d68';
    g.fillText(gear, cx + 2, cy - 6 + 2);
    g.fillStyle = v.gearbox.shifting ? CYAN : TEXT;
    g.fillText(gear, cx, cy - 6);
    if (v.gearbox.mode === 'manual') {
      g.font = `12px ${FONT}`;
      g.fillStyle = CYAN;
      g.fillText('M', cx + 20, cy - 22);
    }

    // Speed, eased a touch so the digits do not flicker.
    const kmh = Math.abs(v.speedForward) * 3.6;
    this.shownKmh += (kmh - this.shownKmh) * Math.min(1, dt * 12);
    const shown = Math.round(this.units === 'mph' ? this.shownKmh / 1.609 : this.shownKmh);
    g.font = `30px ${FONT}`;
    g.fillStyle = '#5a0a30';
    g.fillText(String(shown), cx + 2, cy + 26 + 2);
    g.fillStyle = ORANGE;
    g.fillText(String(shown), cx, cy + 26);
    g.font = `11px ${FONT}`;
    g.fillStyle = 'rgba(134, 163, 173, 0.9)';
    g.fillText(this.units === 'mph' ? 'MPH' : 'KM/H', cx, cy + 44);
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
