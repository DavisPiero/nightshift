// Driving HUD: a round rev dial at the bottom centre (a ring of blocks with the
// gear in the middle and the speed underneath, white into amber) and a minimap
// top right, only the track, straight on the picture and fading at its edge
// (see #minimap in the style sheet). Plus a debug panel (F3) with the physics
// numbers. In a race: your place and lap in a box at the top, an F1-style timing
// sheet on the left (place, who moved, name, gap, last lap), rival dots on the
// map, the start lights in the middle. In a Time Trial: the clock, the gap to
// the ghost, last and best. Canvas colours are the style sheet's.

import { NOS_SECONDS } from '../career/upgrades.js';

const SEGMENTS = 28;
const FONT = '"Jersey 10", ui-monospace, monospace';
const WHITE = '#ffffff', AMBER = '#ffb000', TEAL = '#22d8c8', TITANIUM = '#8d9198', DIM = '#34373c', INK = '#08090b';
const DIAL = 3; // the dial is 132 units across, drawn three times finer

// 1:23.4
export const clock = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

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
    this.race = null;
    this.tick = 0;
    this.rh = root.querySelector('#race-hud');
    this.rows = root.querySelector('#tw-rows');
    this.rt = root.querySelector('#race-top');
    this.tt = root.querySelector('#trial-hud');
    this.trial = null;
    this.mapRange = 500;
    this.big = root.querySelector('#race-big');
    this.wrong = root.querySelector('#race-wrong');
    this.goClock = 0;
    this.nosEl = root.querySelector('#nos');
    this.nosBar = root.querySelector('#nos i');
  }

  // The NOS gauge: only when you have some.
  setNos(on) { this.nosEl.hidden = !on; }

  // The race to show, or null for free driving.
  // A word across the screen for a moment: Final lap.
  callout(text) { this.calloutText = text; this.calloutClock = 2; }

  setRace(race) {
    this.race = race;
    this.rh.hidden = !race;
    this.rt.hidden = !race;
    this.big.textContent = '';
    this.calloutClock = 0;
    this.wrong.hidden = true;
    this.goClock = 0;
    this.finished = false;
    this.moved = new Map(); // per car: where it was, which way it went, for how long
    this.rows.innerHTML = '';
    if (!race) return;
    this.rowEls = race.cars.map(() => {
      const li = document.createElement('li');
      li.innerHTML = '<span class="p"></span><i class="m"></i><span class="n"></span><span class="g"></span><span class="l"></span>';
      this.rows.appendChild(li);
      return li;
    });
  }

  // The Time Trial to show, or null.
  setTrial(trial) {
    this.trial = trial;
    this.tt.hidden = !trial;
  }

  // The lights every frame, the sheet ten times a second.
  drawRace(dt) {
    const r = this.race, p = r.player;
    const lights = r.lights;
    if (r.state === 'countdown' && lights <= 3 && lights > 0) { this.big.textContent = lights; this.big.className = 'on'; this.goClock = 0.9; }
    else if (r.state === 'racing' && this.goClock > 0) { this.big.textContent = 'GO'; this.big.className = 'on go'; this.goClock -= dt; }
    else if (r.state === 'finished' && !this.finished) { this.finished = true; this.big.textContent = 'FINISH'; this.big.className = 'on go'; this.goClock = 2.4; }
    else if (r.state === 'finished' && this.goClock > 0) this.goClock -= dt;
    else if (this.calloutClock > 0) { this.calloutClock -= dt; this.big.textContent = this.calloutText; this.big.className = 'on word'; }
    else { this.big.textContent = ''; this.big.className = ''; }
    this.wrong.hidden = r.wrongWay < 1.5;
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 0.1;
    const going = r.state === 'racing' || r.state === 'finished';
    const set = (el, text) => { if (el.textContent !== text) el.textContent = text; };
    const pos = this.rt.querySelector('#rt-pos'), place = p.place || r.cars.indexOf(p) + 1, was = Number(pos.textContent);
    if (r.state === 'racing' && place !== was) { pos.classList.remove('up', 'down'); void pos.offsetWidth; pos.classList.add(place < was ? 'up' : 'down'); }
    set(pos, String(place));
    set(this.rt.querySelector('#rt-of'), `/${r.cars.length}`);
    set(this.rt.querySelector('#rt-lap'), String(Math.min(p.lap + 1, r.laps)));
    set(this.rt.querySelector('#rt-laps'), `/${r.laps}`);
    set(this.rh.querySelector('#rh-time'), clock(going ? r.t - p.lapStart : 0));
    set(this.rh.querySelector('#rh-best'), Number.isFinite(p.best) ? clock(p.best) : '--:--.-');
    const fastest = Math.min(...r.cars.map((c) => c.best)), lead = r.order[0];
    r.order.forEach((c, n) => {
      const li = this.rowEls[n], [pos, mark, name, gap, last] = li.children;
      const m = this.moved.get(c) || { at: c.place, dir: 0, left: 0 };
      if (going && c.place !== m.at) { m.dir = c.place < m.at ? 1 : -1; m.left = 4; }
      m.at = c.place;
      m.left -= 0.1;
      this.moved.set(c, m);
      li.className = `${c.isPlayer ? 'me' : ''}${c.rival ? ' rival' : ''}`;
      set(pos, String(c.place));
      mark.className = `m${m.left > 0 ? (m.dir > 0 ? ' up' : ' down') : ''}`;
      set(name, c.name);
      set(gap, n === 0 ? 'Leader' : c.done ? 'Finished' : `+${((lead.covered - c.covered) / Math.max(12, c.vehicle.speed)).toFixed(1)}`);
      const lap = c.lapTimes[c.lapTimes.length - 1];
      set(last, lap ? clock(lap) : '');
      last.classList.toggle('fast', !!lap && c.best === fastest);
    });
  }

  drawTrial(dt) {
    const t = this.trial, $ = (id) => this.tt.querySelector(id);
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 0.1;
    $('#tt-time').textContent = clock(t.t);
    $('#tt-last').textContent = t.last ? clock(t.last) : '--:--.-';
    $('#tt-best').textContent = Number.isFinite(t.best) ? clock(t.best) : '--:--.-';
    const d = $('#tt-delta'), ok = t.running && t.delta !== null && t.t > 1;
    d.textContent = ok ? `${t.delta > 0 ? '+' : '-'}${Math.abs(t.delta).toFixed(1)}` : t.clean ? '' : 'Lap not counted';
    d.className = `tt-delta${ok ? (t.delta > 0 ? ' behind' : ' ahead') : ''}`;
    $('#tt-new').hidden = t.newBest <= 0;
  }

  show(on) { this.el.hidden = !on; }
  setTouch(on) { this.el.classList.toggle('touch', on); }

  toggleDebug() {
    this.debugOn = !this.debugOn;
    this.debugEl.hidden = !this.debugOn;
  }

  // How many metres the map shows, top to bottom (Settings > Map zoom).
  setMapRange(metres) {
    if (metres === this.mapRange) return;
    this.mapRange = metres;
    if (this.mapPath) this.setTrack(...this.mapPath);
  }

  // A new track: draw its outline once, at a fixed zoom, so each frame only
  // needs to show the part round the car.
  setTrack(path, start) {
    this.mapPath = [path, start];
    const pad = 240, K = this.map.height / this.mapRange; // px per metre
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < path.count; i++) { x0 = Math.min(x0, path.x[i]); x1 = Math.max(x1, path.x[i]); z0 = Math.min(z0, path.z[i]); z1 = Math.max(z1, path.z[i]); }
    const k = Math.min(K, 8000 / Math.max(x1 - x0, z1 - z0, 1));
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
    g.strokeStyle = 'rgba(0, 0, 0, 0.65)'; g.lineWidth = 17; trace(); g.stroke();
    g.strokeStyle = WHITE; g.lineWidth = 9; trace(); g.stroke();
    // The start line.
    const [sx, sy] = this.toMap(path.x[start], path.z[start]);
    g.fillStyle = INK; g.fillRect(sx - 11, sy - 11, 22, 22);
    g.fillStyle = WHITE; g.fillRect(sx - 7, sy - 7, 14, 14);
  }

  // The map turns with the car, so up is always ahead and a bend to the
  // right looks like a bend to the right.
  drawMap(v) {
    if (!this.outline) return;
    const g = this.map.getContext('2d'), W = this.map.width, H = this.map.height;
    g.clearRect(0, 0, W, H);
    const [x, y] = this.toMap(v.x, v.z);
    g.save();
    g.translate(W / 2, H * 0.72); // the car sits low, so most of the map is the road ahead
    g.save();
    g.rotate(v.heading);
    g.drawImage(this.outline, -x, -y);
    g.restore();
    g.beginPath(); g.moveTo(0, -24); g.lineTo(18, 20); g.lineTo(0, 10); g.lineTo(-18, 20); g.closePath();
    g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
    g.fillStyle = AMBER; g.fill();
    // Rivals, turned with the map. Max is teal.
    if (this.race) {
      const c = Math.cos(v.heading), n = Math.sin(v.heading);
      for (const o of this.race.cars) {
        if (o.isPlayer) continue;
        const [ox, oy] = this.toMap(o.vehicle.x, o.vehicle.z);
        const dx = ox - x, dy = oy - y;
        const px = dx * c - dy * n, py = dx * n + dy * c;
        g.beginPath(); g.arc(px, py, 11, 0, Math.PI * 2);
        g.fillStyle = o.rival ? TEAL : WHITE; g.fill();
        g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
      }
    }
    g.restore();
  }

  draw(v, dt) {
    this.drawMap(v);
    if (!this.nosEl.hidden) { this.nosBar.style.width = `${(v.nosLeft / NOS_SECONDS) * 100}%`; this.nosEl.classList.toggle('on', v.nosOn); }
    if (this.race) this.drawRace(dt);
    if (this.trial) this.drawTrial(dt);
    const g = this.g, W = 132, H = 132;
    const s = v.spec;
    g.setTransform(DIAL, 0, 0, DIAL, 0, 0);
    g.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.5, R = W * 0.46;
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;

    // Backing: a thin titanium ring round a black face.
    g.fillStyle = 'rgba(8, 9, 11, 0.96)';
    g.beginPath(); g.arc(cx, cy, R + 2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = TITANIUM; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, R + 2, 0, Math.PI * 2); g.stroke();

    const lit = (v.rpm / s.limiterRpm) * SEGMENTS;
    const red = Math.round((s.redline / s.limiterRpm) * SEGMENTS) - 2;
    const shiftLight = v.rpm > s.autoUpshiftRpm - 400 && v.gearbox.mode === 'manual';
    this.flash = v.limiter || shiftLight ? (this.flash + dt * 16) % 2 : 0;
    for (let i = 0; i < SEGMENTS; i++) {
      const a = a0 + (a1 - a0) * (i + 0.5) / SEGMENTS;
      const on = i < Math.round(lit), hot = i >= red;
      const r0 = R - (i % 4 === 0 ? 10 : 7), r1 = R - 2;
      g.strokeStyle = on ? (hot ? (this.flash > 1 ? WHITE : AMBER) : WHITE) : (hot ? 'rgba(255, 176, 0, 0.3)' : DIM);
      g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
    }
    // rpm numbers 1..7
    g.fillStyle = TITANIUM;
    g.font = `12px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 1; k * 1000 <= s.limiterRpm; k++) {
      const a = a0 + (a1 - a0) * (k * 1000 / s.limiterRpm);
      g.fillText(String(k), cx + Math.cos(a) * (R - 18), cy + Math.sin(a) * (R - 18));
    }

    // Gear, with a short pop when it changes.
    const gear = v.gearbox.gear === -1 ? 'R' : v.gearbox.gear === 0 ? 'N' : String(v.gearbox.gear);
    if (gear !== this.lastGear) { this.gearPop = this.lastGear === null ? 0 : 1; this.lastGear = gear; }
    this.gearPop = Math.max(0, this.gearPop - dt * 5);
    g.font = `${Math.round(46 + this.gearPop * 14)}px ${FONT}`;
    g.fillStyle = v.gearbox.shifting ? TITANIUM : AMBER;
    g.fillText(gear, cx, cy - 8);
    if (v.gearbox.mode === 'manual') {
      g.font = `12px ${FONT}`;
      g.fillStyle = TEAL;
      g.fillText('M', cx + 20, cy - 22);
    }

    // Speed, eased a touch so the digits do not flicker.
    const kmh = Math.abs(v.speedForward) * 3.6;
    this.shownKmh += (kmh - this.shownKmh) * Math.min(1, dt * 12);
    const shown = Math.round(this.units === 'mph' ? this.shownKmh / 1.609 : this.shownKmh);
    g.font = `26px ${FONT}`;
    g.fillStyle = WHITE;
    g.fillText(String(shown), cx, cy + 25);
    g.font = `11px ${FONT}`;
    g.fillStyle = TITANIUM;
    g.fillText(this.units === 'mph' ? 'MPH' : 'KM/H', cx, cy + 41);
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
