// Driving HUD: two little old-desktop windows. A rev counter with a block
// progress bar, the gear and the speed on a black display, and a minimap top
// right on the classic teal desktop (the track's outline, with the car as an
// arrow). Both are drawn small on canvases and scaled up with square pixels,
// like the menus. Plus a debug panel (F3) with the physics numbers.

const SEGMENTS = 28;
const FONT = '"Jersey 10", ui-monospace, monospace';
const PINK = '#ff2e88', LCD = '#39ff6a', LCD_DIM = '#0f4a22';
const FACE = '#c0c0c0', NAVY = '#000080';

// A window on a canvas: grey with a raised edge and a navy title bar. Returns
// nothing; the space inside starts 15 down, 4 in.
function drawWindow(g, W, H, title) {
  g.fillStyle = FACE; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff'; g.fillRect(0, 0, W - 1, 1); g.fillRect(0, 0, 1, H - 1);
  g.fillStyle = '#0a0a0a'; g.fillRect(0, H - 1, W, 1); g.fillRect(W - 1, 0, 1, H);
  g.fillStyle = '#808080'; g.fillRect(1, H - 2, W - 2, 1); g.fillRect(W - 2, 1, 1, H - 2);
  const bar = g.createLinearGradient(3, 0, W - 3, 0);
  bar.addColorStop(0, NAVY); bar.addColorStop(1, '#1084d0');
  g.fillStyle = bar; g.fillRect(3, 3, W - 6, 10);
  g.fillStyle = '#fff'; g.font = `11px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(title, 6, 8);
}

// A sunken box, like a list field.
function sunken(g, x, y, w, h, fill) {
  g.fillStyle = '#808080'; g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h);
  g.fillStyle = '#fff'; g.fillRect(x, y + h - 1, w, 1); g.fillRect(x + w - 1, y, 1, h);
  g.fillStyle = fill; g.fillRect(x + 1, y + 1, w - 2, h - 2);
}

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
    g.strokeStyle = '#004848'; g.lineWidth = 9; trace(); g.stroke();
    g.strokeStyle = '#c0c0c0'; g.lineWidth = 6; trace(); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 2; trace(); g.stroke();
    // The start line.
    const [sx, sy] = this.toMap(path.x[start], path.z[start]);
    g.fillStyle = '#fff'; g.fillRect(Math.round(sx) - 4, Math.round(sy) - 4, 8, 8);
  }

  // The map turns with the car, so up is always ahead and a bend to the
  // right looks like a bend to the right.
  drawMap(v) {
    if (!this.outline) return;
    const g = this.map.getContext('2d'), W = this.map.width, H = this.map.height;
    drawWindow(g, W, H, 'Map');
    const X = 4, Y = 15, MW = W - 8, MH = H - 19;
    sunken(g, X, Y, MW, MH, '#008080');
    const [x, y] = this.toMap(v.x, v.z);
    g.save();
    g.beginPath(); g.rect(X + 1, Y + 1, MW - 2, MH - 2); g.clip();
    g.save();
    g.translate(W / 2, Y + MH * 0.62); // the car sits low, so more of the road ahead shows
    g.rotate(v.heading);
    g.drawImage(this.outline, -x, -y);
    g.restore();
    g.translate(W / 2, Y + MH * 0.62);
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5.5, 6); g.lineTo(0, 3); g.lineTo(-5.5, 6); g.closePath();
    g.lineWidth = 2; g.strokeStyle = '#1e0010'; g.stroke();
    g.fillStyle = PINK; g.fill();
    g.restore();
  }

  draw(v, dt) {
    this.drawMap(v);
    const g = this.g, W = this.canvas.width, H = this.canvas.height;
    const s = v.spec;
    g.imageSmoothingEnabled = false;
    drawWindow(g, W, H, 'Rev counter');

    // The revs: a progress bar of blocks, with the last ones red.
    const bx = 4, by = 15, bw = W - 8, bh = 13;
    sunken(g, bx, by, bw, bh, '#fff');
    const lit = (v.rpm / s.limiterRpm) * SEGMENTS;
    const red = Math.round((s.redline / s.limiterRpm) * SEGMENTS) - 2;
    const shiftLight = v.rpm > s.autoUpshiftRpm - 400 && v.gearbox.mode === 'manual';
    this.flash = v.limiter || shiftLight ? (this.flash + dt * 16) % 2 : 0;
    const step = (bw - 4) / SEGMENTS;
    for (let i = 0; i < SEGMENTS; i++) {
      const on = i < Math.round(lit), hot = i >= red;
      if (!on && !hot) continue;
      g.fillStyle = on ? (hot ? (this.flash > 1 ? '#fff' : '#d00000') : NAVY) : '#f0c8c8';
      g.fillRect(Math.round(bx + 2 + i * step), by + 2, Math.max(2, Math.floor(step) - 1), bh - 4);
    }

    // The display: gear on the left, speed on the right, in lit green.
    const dx = 4, dy = 30, dw = W - 8, dh = H - 34;
    sunken(g, dx, dy, dw, dh, '#050805');
    const gear = v.gearbox.gear === -1 ? 'R' : v.gearbox.gear === 0 ? 'N' : String(v.gearbox.gear);
    if (gear !== this.lastGear) { this.gearPop = this.lastGear === null ? 0 : 1; this.lastGear = gear; }
    this.gearPop = Math.max(0, this.gearPop - dt * 5);
    g.textBaseline = 'middle'; g.textAlign = 'center';
    g.font = `${Math.round(46 + this.gearPop * 10)}px ${FONT}`;
    g.fillStyle = v.gearbox.shifting ? LCD_DIM : LCD;
    g.fillText(gear, dx + 22, dy + dh / 2 - 1);
    if (v.gearbox.mode === 'manual') {
      g.font = `12px ${FONT}`;
      g.fillStyle = LCD;
      g.fillText('M', dx + 42, dy + 9);
    }

    // Speed, eased a touch so the digits do not flicker.
    const kmh = Math.abs(v.speedForward) * 3.6;
    this.shownKmh += (kmh - this.shownKmh) * Math.min(1, dt * 12);
    const shown = Math.round(this.units === 'mph' ? this.shownKmh / 1.609 : this.shownKmh);
    g.textAlign = 'right';
    g.font = `40px ${FONT}`;
    g.fillStyle = LCD;
    g.fillText(String(shown), dx + dw - 6, dy + dh / 2 - 6);
    g.font = `11px ${FONT}`;
    g.fillStyle = '#20a040';
    g.fillText(this.units === 'mph' ? 'MPH' : 'KM/H', dx + dw - 6, dy + dh - 8);
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
