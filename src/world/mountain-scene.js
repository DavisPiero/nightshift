// Yamagiri Pass: the mountain is built round the road. The ground rises on the
// right (the inside of the loop, up to the peak) and falls away on the left to
// the valley, smooth wherever the road comes back near itself. Cedar forest:
// real trees by the road, three thousand pictures of trees behind them. A
// concrete lattice holds the cut slope, a white guard rail runs along the drop.
// Past the draw distance the ranges and the valley's lights are baked into the
// sky. Cold moonlight is this track's colour, the shrine's vermilion its accent.

import * as THREE from 'three';
import { Tex } from '../graphics/textures.js';
import { rng, strip, merge, placed, wallStrip } from './scene-kit.js';
import { Placer, sceneDetail } from './assets.js';
import { skyBackdrop, reflectSky } from './track-scene.js';
import { fbm } from './mountain.js';

const GRID = 5, MARGIN = 240, TILE = 24; // metres between ground points, how far it runs past the road, points to a tile
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Landmarks, in metres along the road.
const GATES = [1300, 1440], SHED = [650, 770], SHRINE = 1490, REST = 95, VIEW = [1150, 1290];

export function buildMountain(track, def) {
  const group = new THREE.Group(), place = new Placer(), r = rng(91);
  const hw = track.halfWidth, W = track.wall, n = track.count;
  const at = (k) => track.wrap(Math.round(k));
  const along = (k, off) => { const i = at(k); return [track.x[i] + track.leftX(i) * off, track.z[i] + track.leftZ(i) * off]; };
  const head = (k) => track.headingAt(at(k));
  const roadY = (k) => track.y[at(k)];
  const facing = (k, s) => head(k) + s * Math.PI / 2; // +z turned toward the road from side s

  // --- The ground ---
  const samples = [];
  for (let k = 0; k < n; k += 12) samples.push([track.x[k], track.z[k], track.y[k], k]);
  const poly = samples.map(([x, z]) => [x, z]);
  const inLoop = (x, z) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i], [xj, zj] = poly[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  };
  // Flat places cut into the hill for the rest stop and the shrine: x, z, radius, height.
  const pads = [[...along(REST, W + 22), 24, roadY(REST) - 0.1], [...along(SHRINE, W + 14), 15, roadY(SHRINE) + 0.1]];
  const groundAt = (x, z) => {
    let sum = 0, wt = 0, best = Infinity, hint = 0;
    for (const [sx, sz, sy, k] of samples) {
      const d2 = (sx - x) ** 2 + (sz - z) ** 2, w = 1 / (d2 + 30) ** 1.5;
      sum += w * sy; wt += w;
      if (d2 < best) { best = d2; hint = k; }
    }
    const near = track.nearest(x, z, hint), d = Math.abs(near.offset), roadH = track.y[near.index];
    const side = inLoop(x, z) ? 120 * (1 - Math.exp(-d / 150)) : -105 * (1 - Math.exp(-d / 160));
    const rough = (fbm(x * 0.011 + 2, z * 0.011 + 5) - 0.5) * 46 * Math.min(1, d / 60) + (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 8 * Math.min(1, d / 30);
    let h = roadH - 0.14 + (sum / wt + side + rough - roadH + 0.14) * smooth(W + 3.5, W + 26, d);
    for (const [px, pz, pr, py] of pads) h += (py - h) * (1 - smooth(pr, pr + 16, Math.hypot(x - px, z - pz))) * smooth(W + 3.6, W + 9, d);
    return h;
  };
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) { x0 = Math.min(x0, track.x[i]); x1 = Math.max(x1, track.x[i]); z0 = Math.min(z0, track.z[i]); z1 = Math.max(z1, track.z[i]); }
  x0 -= MARGIN; z0 -= MARGIN; x1 += MARGIN; z1 += MARGIN;
  const nx = Math.ceil((x1 - x0) / GRID) + 1, nz = Math.ceil((z1 - z0) / GRID) + 1;
  const H = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) H[j * nx + i] = groundAt(x0 + i * GRID, z0 + j * GRID);
  const heightAt = (x, z) => {
    const u = Math.max(0, Math.min(nx - 1.001, (x - x0) / GRID)), v = Math.max(0, Math.min(nz - 1.001, (z - z0) / GRID)), i = u | 0, j = v | 0, fu = u - i, fv = v - j;
    const a = H[j * nx + i], b = H[j * nx + i + 1], c = H[(j + 1) * nx + i], d = H[(j + 1) * nx + i + 1];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
  };
  const steep = (x, z) => Math.hypot(heightAt(x + 3, z) - heightAt(x - 3, z), heightAt(x, z + 3) - heightAt(x, z - 3)) / 6;

  // Cut into tiles, so the mountain behind you is not drawn. Normals come from
  // the whole height map, so tiles join without a seam. Rock where it is steep,
  // forest floor where it is not, snow swapped in for the weather.
  const groundMat = new THREE.MeshLambertMaterial({ map: Tex.soil(), vertexColors: true });
  const tiles = [];
  const soilA = new THREE.Color(0x3a4630), soilB = new THREE.Color(0x4a4030), rock = new THREE.Color(0x66645c), c = new THREE.Color();
  for (let tj = 0; tj < nz - 1; tj += TILE) for (let ti = 0; ti < nx - 1; ti += TILE) {
    const w = Math.min(TILE, nx - 1 - ti) + 1, d = Math.min(TILE, nz - 1 - tj) + 1;
    const pos = new Float32Array(w * d * 3), nor = new Float32Array(w * d * 3), uv = new Float32Array(w * d * 2), dry = new Float32Array(w * d * 3), white = new Float32Array(w * d * 3), idx = [];
    for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
      const gi = ti + i, gj = tj + j, p = (j * w + i), x = x0 + gi * GRID, z = z0 + gj * GRID;
      const y = H[gj * nx + gi];
      pos.set([x, y, z], p * 3);
      const dx = H[gj * nx + Math.min(nx - 1, gi + 1)] - H[gj * nx + Math.max(0, gi - 1)], dz = H[Math.min(nz - 1, gj + 1) * nx + gi] - H[Math.max(0, gj - 1) * nx + gi];
      const l = Math.hypot(dx, GRID * 2, dz);
      nor.set([-dx / l, GRID * 2 / l, -dz / l], p * 3);
      uv.set([x / 14, z / 14], p * 2);
      const slope = Math.hypot(dx, dz) / (GRID * 2);
      c.copy(soilA).lerp(soilB, fbm(x * 0.03, z * 0.03, 3)).lerp(rock, smooth(0.65, 1.05, slope + (fbm(x * 0.08, z * 0.08, 2) - 0.5) * 0.4));
      dry.set([c.r, c.g, c.b], p * 3);
      const s = 0.95 - smooth(0.9, 1.4, slope) * 0.45;
      white.set([s * 1.0, s * 1.02, s * 1.08], p * 3);
      if (i < w - 1 && j < d - 1) idx.push(p, p + w, p + 1, p + 1, p + w, p + w + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(dry.slice(), 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, groundMat);
    m.receiveShadow = true;
    m.userData = { dry, white };
    group.add(m);
    tiles.push(m);
  }

  // --- The road ---
  const roadMat = new THREE.MeshPhongMaterial({ ...Tex.road((hw + 0.5) * 2), color: 0xd8dadc, shininess: 0, specular: 0x000000 });
  const road = new THREE.Mesh(strip(track, -hw - 0.5, hw + 0.5, 0, { step: 1, uScale: 0.25, vScale: 0.25 }), roadMat);
  road.receiveShadow = true;
  group.add(road);
  const paint = (colour) => new THREE.MeshLambertMaterial({ color: colour, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  group.add(new THREE.Mesh(merge([strip(track, hw - 0.3, hw - 0.15, 0.012), strip(track, -hw + 0.15, -hw + 0.3, 0.012)]), paint(0xe2e4e0)));
  group.add(new THREE.Mesh(merge([strip(track, 0.09, 0.22, 0.012), strip(track, -0.22, -0.09, 0.012)]), paint(0xe8b030)));
  group.add(new THREE.Mesh(strip(track, -hw, hw, 0.013, { step: 1, from: def.start - 1, to: def.start + 1, closed: false, uScale: 0.5, vScale: 0.5 }), new THREE.MeshLambertMaterial({ map: Tex.chequer(), transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })));
  // Slow-down bars before the hairpins.
  const hairpins = [], bars = [];
  for (let k = 0, calm = 200; k < n; k++) {
    const hard = Math.abs(track.curvature[k]) > 1 / 40;
    if (hard && calm > 150) hairpins.push(k);
    calm = hard ? 0 : calm + 1;
  }
  for (const k of hairpins) for (let b = 0; b < 6; b++) bars.push(strip(track, -hw + 0.6, hw - 0.6, 0.013, { step: 1, from: track.wrap(k - 60 + b * 7), to: track.wrap(k - 60 + b * 7) + 2, closed: false, uScale: 0.5 }));
  if (bars.length) group.add(new THREE.Mesh(merge(bars), new THREE.MeshLambertMaterial({ map: Tex.slowBars(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })));
  // Gravel out to the rail, and a concrete gutter under the cut.
  const verge = new THREE.MeshLambertMaterial({ map: Tex.concrete(), color: 0x6a6a64 });
  group.add(new THREE.Mesh(merge([strip(track, hw + 0.5, W + 3.8, 0.02, { uScale: 0.3, vScale: 0.3 }), strip(track, -W - 3.8, -hw - 0.5, 0.02, { uScale: 0.3, vScale: 0.3 })]), verge));
  const gutter = new THREE.MeshLambertMaterial({ map: Tex.concrete(), color: 0xa0a098 });
  group.add(new THREE.Mesh(strip(track, -W + 0.6, -W + 0.05, 0.05, { uScale: 0.3, vScale: 0.3 }), gutter));

  // The cut slope on the right: a concrete lattice from the gutter up to where
  // the hill takes over.
  {
    const pos = [], uv = [], idx = [];
    let row = 0;
    for (let k = 0; k <= n; k += 3) {
      const i = at(k), [ax, az] = along(i, -W), [bx, bz] = along(i, -W - 3.2);
      const y0 = track.y[i], y1 = Math.max(y0 + 2.6, heightAt(bx, bz) + 0.4);
      pos.push(ax, y0, az, bx, y1, bz);
      uv.push(k / 4, 0, k / 4, (y1 - y0) / 4);
      if (row) { const a = (row - 1) * 2, b = row * 2; idx.push(a, a + 1, b, b, a + 1, b + 1); }
      row++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    group.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: Tex.lattice(), color: 0xb0b0a8, side: THREE.DoubleSide })));
  }
  // The white guard rail along the drop.
  const railMat = new THREE.MeshLambertMaterial({ map: Tex.guardRail(), side: THREE.DoubleSide });
  group.add(new THREE.Mesh(wallStrip(track, W + 0.05, 0.48, 0.82, 1, 0.2), railMat));
  for (let k = 0; k < n; k += 4) { const [x, z] = along(k, W + 0.12); place.add('rail-post-white', x, roadY(k), z); }

  // --- Lamps, signs, mirrors ---
  // Lamps thin out up the mountain; a pool of light painted down the road under each.
  const pools = [];
  const lampAt = (k) => {
    const [x, z] = along(k, W + 0.6), i = at(k);
    place.add('mountain-lamp', x, track.y[i], z, Math.atan2(-track.leftZ(i), track.leftX(i)));
    pools.push([k, 15, hw + 2.2]);
  };
  const lampSpots = new Set();
  for (let k = 40; k < n; k += 86) lampSpots.add(k);
  for (const k of hairpins) { lampSpots.add(track.wrap(k + 8)); lampSpots.add(track.wrap(k + 42)); }
  for (const k of lampSpots) if (k < SHED[0] - 10 || k > SHED[1] + 10) lampAt(k);
  for (let k = 0; k < n; k += 5) {
    const c = track.curvature[k];
    if (Math.abs(c) < 1 / 55) continue;
    const off = -Math.sign(c) * (W - 0.1);
    const [x, z] = along(k, off);
    place.add(c > 0 ? 'chevron-left' : 'chevron-right', x, roadY(k), z, head(k) + Math.PI);
  }
  for (const k of hairpins) {
    const mid = track.wrap(k + 28), c = track.curvature[mid], off = -Math.sign(c) * (W - 0.4);
    const [x, z] = along(mid, off);
    place.add('curve-mirror', x, roadY(mid), z, head(mid) + Math.PI + Math.sign(c) * 0.5);
    const [sx, sz] = along(k - 90, W - 0.3);
    place.add('sign-rockfall', sx, roadY(k - 90), sz, head(k - 90) + Math.PI);
  }

  // --- Landmarks ---
  // The start: a great red gate over the line, with the board under it.
  {
    const k = def.start + 5;
    const [x, z] = along(k, 0);
    place.add('torii', x, roadY(k), z, head(k), [1.05, 1.15, 1.2]);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.3), new THREE.MeshBasicMaterial({ map: Tex.ledBoard('山霧峠  START', 160, 22) }));
    board.position.set(x, roadY(k) + 5.9, z); board.rotation.y = head(k) + Math.PI;
    group.add(board);
    place.reflect(placed(new THREE.BoxGeometry(9, 1.3, 0.3), x, roadY(k) + 5.9, z, head(k)), 0xff9040);
  }
  // A thousand gates, near enough: red gates close together along the ridge,
  // lanterns on them, the road lit red between.
  const redPools = [];
  for (let k = GATES[0], g = 0; k < GATES[1]; k += 6, g++) {
    const [x, z] = along(k, 0), y = roadY(k);
    place.add('torii', x, y, z, head(k), 1);
    if (g % 2) continue;
    for (const s of [1, -1]) { const [lx, lz] = along(k, s * 5); place.glow(lx, y + 5.3, lz, [1, 0.36, 0.14], 2.4); }
    redPools.push([k, 9, hw + 0.6]);
    if (g % 4 === 0) { const l = new THREE.Vector3(x, y + 5.4, z); l.floor = y; place.lamps.push(l); }
  }
  group.add(roadGlow(track, redPools, 0x7a2010));
  // The shrine, on its shelf above the drop, stone lanterns up to it.
  {
    const [x, z] = along(SHRINE, W + 15);
    place.add('shrine', x, roadY(SHRINE) + 0.1, z, facing(SHRINE, 1) + Math.PI);
    for (let i = -3; i <= 3; i++) { const [lx, lz] = along(SHRINE + i * 7, W + 1.3); place.add('stone-lantern', lx, roadY(SHRINE + i * 7), lz, 0); }
    place.pool(x, z, 18, 18, 'warm', 0, roadY(SHRINE) + 0.1);
  }
  // The rest stop: a noodle bar, drinks machines, a few cars left for the night.
  {
    const [x, z] = along(REST, W + 25), y = roadY(REST);
    place.add('rest-house', x, y, z, facing(REST, 1) + Math.PI);
    for (let i = 0; i < 5; i++) { const [vx, vz] = along(REST - 26 - i * 1.1, W + 15); place.add(['vending-white', 'vending-blue', 'vending-red'][i % 3], vx, y, vz, facing(REST, 1) + Math.PI); }
    const parked = [0x40484e, 0x6a2620, 0x8c8a80];
    parked.forEach((col, i) => { const [cx, cz] = along(REST + 16 + i * 4, W + 11); place.add(i === 1 ? 'parked-challenjer' : 'parked-r34', cx, y, cz, head(REST) + Math.PI / 2, 1, col); });
  }
  // The rock shed: a concrete roof over the road, open on the drop side.
  {
    const roofH = 6.2, conc = new THREE.MeshLambertMaterial({ map: Tex.concrete(), color: 0x8a8a84 });
    const geos = [strip(track, -W - 1.2, W + 1.2, roofH, { step: 2, from: SHED[0], to: SHED[1], closed: false, uScale: 0.3, vScale: 0.3 }), strip(track, -W - 1.2, W + 1.2, roofH + 0.7, { step: 2, from: SHED[0], to: SHED[1], closed: false, uScale: 0.3, vScale: 0.3 })];
    group.add(new THREE.Mesh(merge(geos), new THREE.MeshLambertMaterial({ map: Tex.concrete(), color: 0x7a7a74, side: THREE.DoubleSide })));
    for (let k = SHED[0]; k <= SHED[1]; k += 5) {
      const [x, z] = along(k, W + 0.5), y = roadY(k);
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.7, roofH + 0.4, 0.9), conc);
      col.position.set(x, y + roofH / 2, z); col.rotation.y = head(k);
      group.add(col);
    }
    for (let k = SHED[0] + 8; k < SHED[1]; k += 16) {
      const [x, z] = along(k, 0), y = roadY(k);
      place.glow(x, y + roofH - 0.3, z, 'white', 1.4);
      pools.push([k, 13, hw + 1.4]);
      const l = new THREE.Vector3(x, y + roofH - 0.6, z); l.floor = y; place.lamps.push(l);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 1.8), new THREE.MeshBasicMaterial({ color: 0xe4ecff }));
      bar.position.set(x, y + roofH - 0.05, z); bar.rotation.y = head(k);
      group.add(bar);
    }
  }

  group.add(roadGlow(track, pools, 0x46566e));

  // --- The forest ---
  // Close to the road, real cedars; behind them, three crossed pictures of a
  // cedar, thousands of them; none on the bare rock, the pads or the view from
  // the ridge. Each picture a slightly different green.
  const seen = (k, lo, hi) => k >= lo && k <= hi;
  const onPad = (x, z, grow) => pads.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr + grow);
  const cedars = [], cards = [];
  const near2 = (x, z) => { let best = Infinity; for (const [sx, sz] of samples) best = Math.min(best, (sx - x) ** 2 + (sz - z) ** 2); return best; };
  const spacing = 6.5 / Math.sqrt(sceneDetail());
  for (let z = z0 + 4; z < z1 - 4; z += spacing) for (let x = x0 + 4; x < x1 - 4; x += spacing) {
    const px = x + (r() - 0.5) * spacing * 0.8, pz = z + (r() - 0.5) * spacing * 0.8;
    if (near2(px, pz) > 210 ** 2) continue;
    const near = track.nearest(px, pz), d = Math.abs(near.offset);
    if (d < W + 3.6 || onPad(px, pz, 3) || steep(px, pz) > 1.15) continue;
    if (fbm(px * 0.016 + 9, pz * 0.016 + 4, 3) < 0.34) continue; // clearings
    if (near.offset > 0 && seen(near.index, ...VIEW) && d < 90) continue;
    const y = heightAt(px, pz) - 0.4, s = 0.75 + r() * 0.5;
    if (d < W + 24 && cedars.length < 2600 * sceneDetail()) cedars.push([px, y, pz, r() * 6, s]);
    else cards.push([px, y, pz, r() * 6, s]);
  }
  for (const [x, y, z, ry, s] of cedars) place.add('cedar', x, y, z, ry, [s, s * (0.9 + r() * 0.3), s]);
  const shade = new THREE.Color(), tones = [];
  for (const [x, y, z, ry, s] of cards) {
    const v = 0.8 + r() * 0.5;
    tones.push(shade.setRGB(v * (0.85 + r() * 0.3), v, v * (0.9 + r() * 0.2)).getHex());
    place.add('cedar-card', x, y, z, ry, [s, s * (0.9 + r() * 0.3), s], tones[tones.length - 1]);
  }
  for (let k = 0; k < n; k += 3) for (const off of [W + 2.6, -(W + 4.4)]) {
    if (r() < 0.45) continue;
    if (Math.sign(off) < 0 && r() < 0.5) continue;
    const [x, z] = along(k, off + (r() - 0.5) * 1.6);
    if (near2(x, z) < (W + 1.5) ** 2) continue;
    place.add('fern', x, heightAt(x, z), z, r() * 6, 0.8 + r() * 0.7);
  }

  const { glows, reflect, lamps } = place.finish(group, { glowSize: 2 });
  const skies = [];
  reflect.add(reflectSky(skies));

  const backdrop = skyBackdrop(farRanges(r), [(x0 + x1) / 2, 80, (z0 + z1) / 2]);

  const cardMats = [Tex.cedarCard, Tex.cedarTier, Tex.leaves];
  return {
    group, lamps, glows, roadMat, backdrop, reflect, skies,
    snowy: [[verge, 0xc8ccd0], [gutter, 0xc8ccd0]],
    setSnow(on) {
      for (const m of tiles) { m.geometry.attributes.color.array.set(on ? m.userData.white : m.userData.dry); m.geometry.attributes.color.needsUpdate = true; }
      groundMat.map = on ? null : Tex.soil(); groundMat.needsUpdate = true;
      // Snow on the boughs: the same pictures, frosted pale.
      group.traverse((o) => { const m = o.material; if (o.isInstancedMesh && m?.map && cardMats.some((t) => t() === m.map)) m.color.setHex(on ? 0xc8d4e0 : 0xffffff); });
    },
    look: {
      fog: { clear: 0x0b1420, rain: 0x0c141c, fog: 0x1e2836, snow: 0x161e2a },
      hemi: [0x6a84b4, 0x161c26, 1.5],
      moon: 1.1,
      lamp: 0xc8dcff, lampPower: 120,
      skyGlow: 0x3a5a90,
      reflectBg: 0x0a1018,
      ground: 0x0c0e12,
    },
  };
}

// Light painted down the road, following its hills: [metres, half length, half
// width] for each pool, soft to nothing at the edges.
function roadGlow(track, list, colour) {
  const pos = [], col = [], idx = [], c = new THREE.Color(colour), ACROSS = 6;
  for (const [k, len, wide] of list) {
    const base = pos.length / 3;
    for (let d = -len; d <= len; d++) {
      const i = track.wrap(k + d);
      for (let a = 0; a <= ACROSS; a++) {
        const s = a / ACROSS * 2 - 1, f = Math.max(0, 1 - Math.hypot(d / len, s)) ** 1.5;
        pos.push(track.x[i] + track.leftX(i) * s * wide, track.y[i] + 0.05, track.z[i] + track.leftZ(i) * s * wide);
        col.push(c.r * f, c.g * f, c.b * f);
        if (d < len && a < ACROSS) { const p = base + (d + len) * (ACROSS + 1) + a, n = ACROSS + 1; idx.push(p, p + 1, p + n, p + 1, p + n + 1, p + n); }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 }));
}

// What the bake sees from the mountain: ranges one behind the other, a valley
// with towns in it, and a thread of road lamps.
function farRanges(r) {
  const far = new THREE.Group();
  const size = 9000, seg = 180;
  const g = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const shape = (x, z) => {
    const d = Math.hypot(x, z);
    const ridge = 1 - Math.abs(fbm(x * 0.00062 + 4, z * 0.00062 + 1, 5) * 2 - 1);
    return smooth(700, 2600, d) * (ridge ** 2.2) * 620 + (fbm(x * 0.002, z * 0.002, 3) - 0.5) * 60 - 70;
  };
  for (let i = 0; i < p.count; i++) p.setY(i, shape(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  far.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x1a2430 })));
  const pos = [], col = [], warm = [1.6, 1.05, 0.55], cold = [1.3, 1.4, 1.7];
  for (let t = 0; t < 7; t++) {
    const a = r() * 6.3, d = 900 + r() * 1500, cx = Math.sin(a) * d, cz = Math.cos(a) * d, big = 40 + r() * 170;
    for (let i = 0; i < big * 6; i++) {
      const u = r() * 6.3, w = (r() ** 2) * (120 + big * 2.4), x = cx + Math.sin(u) * w, z = cz + Math.cos(u) * w * 0.7;
      pos.push(x, shape(x, z) + 4, z); col.push(...(r() < 0.75 ? warm : cold));
    }
  }
  for (let i = 0; i < 300; i++) { const u = i / 300, a = u * 9, x = Math.sin(a) * (800 + u * 1600), z = Math.cos(a * 0.7) * (900 + u * 1400); pos.push(x, shape(x, z) + 6, z); col.push(...warm); }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  far.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: true })));
  return far;
}
