// Small textures painted in code at low resolution, with nearest-neighbour
// magnification so they read as chunky texels up close, like a PS2 game.

import { flagCanvas } from '../vehicles/flags.js';
import * as THREE from 'three';

// Seeded random so textures look the same on every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Textures that are nearest-filtered for the chunky look; the realistic
// graphics levels switch them to smooth filtering (and back).
const chunky = new Set();
let smoothOn = false;
export function setSmoothTextures(on) {
  smoothOn = on;
  for (const t of chunky) { t.magFilter = on ? THREE.LinearFilter : THREE.NearestFilter; t.anisotropy = on ? 8 : 2; t.needsUpdate = true; }
}

function canvasTexture(size, paint, { repeat = [1, 1], nearest = true, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = size[0]; c.height = size[1];
  const g = c.getContext('2d');
  paint(g, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (nearest) { chunky.add(t); t.magFilter = smoothOn ? THREE.LinearFilter : THREE.NearestFilter; }
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 2;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Everything is drawn again one tile up and down, so the road joins itself.
function paintRoad(g, w, h) {
  noise(g, w, h, [52, 52, 54], 20, 7);
  const r = rng(71);
  const wrapped = (draw) => { for (const y of [-h, 0, h]) { g.save(); g.translate(0, y); draw(); g.restore(); } };
  const blot = (x, y, rx, ry, colour) => {
    const f = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    f.addColorStop(0, colour); f.addColorStop(1, colour.replace(/[\d.]+\)$/, '0)'));
    wrapped(() => { g.save(); g.translate(x, y); g.scale(rx, ry); g.fillStyle = f; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore(); });
  };
  // Broad blotches, so no two stretches read the same.
  for (let i = 0; i < 70; i++) blot(r() * w, r() * h, 30 + r() * 90, 50 + r() * 190, r() < 0.5 ? 'rgba(18,18,20,0.14)' : 'rgba(96,96,92,0.09)');
  // Stones in the tarmac.
  for (let i = 0; i < 16000; i++) {
    const v = r();
    g.fillStyle = v < 0.5 ? `rgba(14,14,16,${0.25 + r() * 0.4})` : `rgba(${120 + r() * 70 | 0},${120 + r() * 70 | 0},${116 + r() * 66 | 0},${0.12 + r() * 0.3})`;
    g.fillRect(r() * w | 0, r() * h | 0, 1 + (r() * 2 | 0), 1 + (r() * 2 | 0));
  }
  // Rubber laid down by the wheels: two dark lanes of long streaks.
  for (const lane of [0.33, 0.67]) for (let i = 0; i < 130; i++) {
    const x = (lane + (r() + r() - 1) * 0.075) * w, y = r() * h, l = 90 + r() * 300;
    g.strokeStyle = `rgba(10,10,12,${0.05 + r() * 0.09})`; g.lineWidth = 1.5 + r() * 5;
    wrapped(() => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 7, y + l); g.stroke(); });
  }
  // Dust along both kerbs.
  for (const [x0, x1] of [[0, w * 0.1], [w, w * 0.9]]) {
    const f = g.createLinearGradient(x0, 0, x1, 0);
    f.addColorStop(0, 'rgba(112,106,92,0.34)'); f.addColorStop(1, 'rgba(112,106,92,0)');
    g.fillStyle = f; g.fillRect(Math.min(x0, x1), 0, w * 0.1, h);
  }
  // Patches of newer, darker tarmac with a tar edge.
  for (const [x, y, pw, ph] of [[0.1, 0.1, 0.32, 0.17], [0.58, 0.62, 0.3, 0.1]]) {
    g.fillStyle = 'rgba(19,19,21,0.3)'; g.fillRect(x * w, y * h, pw * w, ph * h);
    g.strokeStyle = 'rgba(6,6,7,0.5)'; g.lineWidth = 2.5; g.strokeRect(x * w, y * h, pw * w, ph * h);
  }
  // Tar seams: a wandering line down the road, and one joint across it.
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [x0, width] of [[0.5, 4], [0.84, 3], [0.18, 2.5]]) {
    const a = r() * 6, b = r() * 6, at = (y) => (x0 + Math.sin(y / h * Math.PI * 2 + a) * 0.014 + Math.sin(y / h * Math.PI * 6 + b) * 0.006) * w;
    g.strokeStyle = 'rgba(6,6,7,0.7)'; g.lineWidth = width;
    g.beginPath(); g.moveTo(at(0), 0);
    for (let y = 8; y <= h; y += 8) g.lineTo(at(y) + (r() - 0.5) * 1.8, y);
    g.stroke();
  }
  g.strokeStyle = 'rgba(6,6,7,0.65)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, h * 0.46); for (let x = 12; x <= w; x += 12) g.lineTo(x, h * 0.46 + (r() - 0.5) * 3); g.stroke();
  // Oil down the middle.
  for (let i = 0; i < 26; i++) blot(w * (0.5 + (r() - 0.5) * 0.12), r() * h, 5 + r() * 14, 10 + r() * 40, 'rgba(8,8,10,0.22)');
}

function noise(g, w, h, base, spread, seed, alpha = 1) {
  const r = rng(seed);
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    const n = (r() - 0.5) * spread;
    img.data[i * 4] = Math.max(0, Math.min(255, base[0] + n));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + n));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + n));
    img.data[i * 4 + 3] = 255 * alpha;
  }
  g.putImageData(img, 0, 0);
}

const cache = new Map();
function cached(name, make) {
  if (!cache.has(name)) cache.set(name, make());
  return cache.get(name);
}

// Far towers: many small windows on a dark wall. Seen only through the sky bake.
function farWindows(lit, wall, seed) {
  return canvasTexture([256, 256], (g, w, h) => {
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    const r = rng(seed);
    for (let y = 2; y < h; y += 6) {
      const row = r();
      for (let x = 2; x < w; x += 5) {
        const k = r() * (row < 0.2 ? 0.45 : 1.15);
        const on = lit.find(([p]) => k < p);
        if (on) { g.fillStyle = on[1]; g.fillRect(x, y, 3, 4); }
      }
    }
  }, { nearest: false });
}

// One window: aluminium frame, dark glass or a lit room behind a curtain.
function paintWindow(g, r, x, y, w, h, glow, litChance = 0.26) {
  const lit = r() < litChance, warm = r() < 0.72, curtain = r(), pink = r() < 0.05;
  if (lit) {
    const f = g.createLinearGradient(0, y, 0, y + h);
    if (pink) { f.addColorStop(0, '#ff90b8'); f.addColorStop(1, '#c04a7a'); } else if (warm) { f.addColorStop(0, '#ffdca0'); f.addColorStop(1, '#c89050'); } else { f.addColorStop(0, '#dcecf0'); f.addColorStop(1, '#88a8b0'); }
    g.fillStyle = f; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(40,24,14,0.35)'; g.fillRect(x, y, w * curtain * 0.5, h);       // curtain drawn part way
    g.fillStyle = 'rgba(40,24,14,0.5)'; g.fillRect(x + w * 0.6, y + h * (0.4 + r() * 0.3), w * 0.25, h); // something in the room
  } else if (!glow) {
    const f = g.createLinearGradient(0, y, 0, y + h);
    f.addColorStop(0, '#2a3440'); f.addColorStop(1, '#0c1014');
    g.fillStyle = f; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(160,190,220,0.08)'; g.beginPath(); g.moveTo(x + w * 0.2, y); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.2, y + h); g.lineTo(x, y + h); g.fill();
  }
  if (!glow) {
    g.strokeStyle = '#8c9094'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
    g.fillStyle = '#8c9094'; g.fillRect(x + w / 2 - 1, y, 2, h);
  } else if (lit) { g.fillStyle = '#000'; g.fillRect(x + w / 2 - 1, y, 2, h); }
}

function paintFloors(g, w, h, seed, glow) {
  const r = rng(seed * 47), wall = ['#6e6a66', '#58606a', '#7a6e62'][seed % 3];
  g.fillStyle = glow ? '#000' : wall; g.fillRect(0, 0, w, h);
  if (!glow) { const n = rng(seed); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${n() < 0.5 ? '0,0,0' : '255,255,255'},${n() * 0.05})`; g.fillRect(n() * w, n() * h, 2 + n() * 18, 1 + n() * 3); } }
  for (let fy = 0; fy < 4; fy++) for (let bx = 0; bx < 4; bx++) {
    const x = bx * 64, y = fy * 64;
    paintWindow(g, r, x + 9, y + 10, 46, 38, glow);
    if (glow) { r(); r(); continue; }
    g.fillStyle = '#a0a09a'; g.fillRect(x + 6, y + 49, 52, 4); // sill
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 6, y + 53, 52, 2);
    const stain = r();
    if (stain < 0.5) { const f = g.createLinearGradient(0, y + 55, 0, y + 64); f.addColorStop(0, 'rgba(0,0,0,0.28)'); f.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = f; g.fillRect(x + 10 + stain * 30, y + 55, 8, 9); }
    if (r() < 0.3) { g.fillStyle = '#b8b8b0'; g.fillRect(x + 42, y + 34, 14, 12); g.fillStyle = '#44464a'; g.beginPath(); g.arc(x + 49, y + 40, 4.5, 0, 6.3); g.fill(); } // air-con
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y, 64, 2); // floor line
  }
}

function paintFlats(g, w, h, seed, glow) {
  const r = rng(seed * 53);
  g.fillStyle = glow ? '#000' : ['#8a8680', '#76787e', '#92887a'][seed % 3]; g.fillRect(0, 0, w, h);
  for (let fy = 0; fy < 4; fy++) for (let bx = 0; bx < 2; bx++) {
    const x = bx * 128, y = fy * 64;
    if (!glow) { g.fillStyle = '#3a3a3e'; g.fillRect(x + 4, y + 4, 120, 44); }
    paintWindow(g, r, x + 10, y + 7, 62, 40, glow, 0.3);
    paintWindow(g, r, x + 80, y + 7, 38, 40, glow, 0.2);
    if (glow) { r(); r(); continue; }
    g.fillStyle = '#b4b2a8'; g.fillRect(x, y + 34, 128, 4);                 // the rail
    for (let i = 2; i < 128; i += 5) { g.fillStyle = '#6a6a68'; g.fillRect(x + i, y + 38, 1.6, 18); }
    g.fillStyle = 'rgba(190,190,184,0.5)'; g.fillRect(x, y + 38, 128, 18);
    if (r() < 0.45) for (let i = 0; i < 6; i++) { g.fillStyle = ['#d8d4cc', '#6a7a9a', '#a85a5a', '#e0d8a0'][(r() * 4) | 0]; g.fillRect(x + 14 + i * 13 + r() * 3, y + 14, 9, 18 + r() * 10); } // washing
    g.fillStyle = '#c8c6bc'; g.fillRect(x, y + 56, 128, 8);                 // the slab's edge
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, y + 62, 128, 2);
    g.fillStyle = '#6a6a68'; g.fillRect(x + 125, y, 3, 56);                 // divider
  }
}

const SHOP_NAMES = ['ラーメン', '薬局', '書店', '喫茶', '居酒屋', '花屋', '酒', '寿司', '麺処', 'カフェ', '文具', '果物', '時計', '定食', '焼鳥', '古本'];
function paintShops(g, w, h, seed) {
  const r = rng(seed * 59), bay = w / 4;
  g.fillStyle = '#1c1c20'; g.fillRect(0, 0, w, h);
  for (let n = 0; n < 4; n++) {
    const x = n * bay + 6, sw = bay - 12, top = 62;
    const band = ['#c0283a', '#1a5a98', '#20785a', '#c07818', '#e8e0cc', '#2a2a30'][(r() * 6) | 0];
    if (r() < 0.2) { // shuttered for the night
      g.fillStyle = '#6a7074'; g.fillRect(x, top, sw, h - top);
      g.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = top; y < h; y += 7) g.fillRect(x, y, sw, 2);
      g.fillStyle = 'rgba(30,30,34,0.6)'; for (let i = 0; i < 3; i++) g.fillRect(x + r() * sw * 0.8, top + 30 + r() * 80, 20 + r() * 40, 6 + r() * 26); // old posters and paint
    } else {
      const f = g.createLinearGradient(0, top, 0, h);
      f.addColorStop(0, ['#fff4dc', '#eef6fa', '#ffe8f0', '#e4fbf0'][(seed + n) % 4]); f.addColorStop(1, '#a8947a');
      g.fillStyle = f; g.fillRect(x, top, sw, h - top);
      for (let sy = top + 16; sy < h - 40; sy += 34) { // shelves of goods
        g.fillStyle = 'rgba(70,50,36,0.8)'; g.fillRect(x + 6, sy + 22, sw - 12, 4);
        for (let i = x + 8; i < x + sw - 12;) { const gw = 6 + r() * 12, gh = 8 + r() * 13; g.fillStyle = ['#c0503a', '#3a7ac0', '#d8a83a', '#4a9a5a', '#a04a8a', '#e8e0d0'][(r() * 6) | 0]; g.fillRect(i, sy + 22 - gh, gw, gh); i += gw + 1 + r() * 3; }
      }
      const dx = x + sw * (0.3 + r() * 0.3);
      g.fillStyle = 'rgba(30,34,38,0.75)'; g.fillRect(dx, top + 6, 56, h - top - 6); // the door
      g.strokeStyle = '#bcc0c4'; g.lineWidth = 3; g.strokeRect(dx, top + 6, 56, h - top - 6);
      g.fillStyle = '#bcc0c4'; for (let px = x + sw / 3; px < x + sw - 8; px += sw / 3) g.fillRect(px, top, 3, h - top);
    }
    // The sign over the front.
    g.fillStyle = band; g.fillRect(x, 6, sw, top - 10);
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x, 6, sw, 3);
    g.fillStyle = band === '#e8e0cc' ? '#1c1c20' : '#fff6e4';
    g.font = 'bold 40px "DotGothic16", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(SHOP_NAMES[(seed * 5 + n * 3 + (r() * 3 | 0)) % SHOP_NAMES.length], x + sw / 2, 33);
  }
}

// Leaves, needles and blossom: many small dabs on a clear canvas, for the cards
// trees are made of. Painted large and filtered smoothly.
function clump(g, w, h, colours, dabs, size, seed, shape = () => 1) {
  const r = rng(seed);
  for (let i = 0; i < dabs; i++) {
    const a = r() * Math.PI * 2, d = r() ** 0.8, x = 0.5 + Math.cos(a) * d * 0.48, y = 0.5 + Math.sin(a) * d * 0.48; // thinning to a ragged edge
    if (r() > shape(x, y)) continue;
    g.fillStyle = colours[(r() * colours.length) | 0];
    g.save(); g.translate(x * w, y * h); g.rotate(r() * 6.3);
    g.beginPath(); g.ellipse(0, 0, size * (0.5 + r()), size * (0.25 + r() * 0.4), 0, 0, 6.3); g.fill();
    g.restore();
  }
}
const clear = (size, paint) => canvasTexture(size, paint, { nearest: false });

export const Tex = {
  // A clump of broadleaf leaves, lit from above.
  leaves: () => cached('leaves', () => clear([256, 256], (g, w, h) => {
    clump(g, w, h, ['#16261a', '#1c3220', '#223a24'], 2600, 7, 11);
    clump(g, w, h, ['#2e4c2c', '#3a5a34', '#4a6c3c'], 900, 5, 12, (x, y) => (1 - y) * 1.2);
  })),
  // A branch of cherry blossom: pale, dense, a little darker underneath.
  blossom: () => cached('blossom', () => clear([256, 256], (g, w, h) => {
    clump(g, w, h, ['#b8688c', '#c87a9c', '#a85a80'], 2400, 6, 21);
    clump(g, w, h, ['#eeb0c8', '#f6c4d6', '#e8a0bc'], 2200, 4.5, 22, (x, y) => 1.15 - y * 0.6);
    clump(g, w, h, ['#ffe6ee', '#fff4f6'], 500, 2.6, 23, (x, y) => 1 - y * 0.8);
  })),
  // One skirt of a cedar: needles hanging in points from the top edge.
  cedarTier: () => cached('cedartier', () => clear([256, 128], (g, w, h) => {
    const r = rng(31);
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, drop = 0.35 + 0.62 * (0.5 + 0.5 * Math.sin(x / w * Math.PI * 18 + Math.sin(x * 0.05) * 2)) * (0.6 + r() * 0.4), y = r() * drop * h;
      const v = 20 + (1 - y / h) * 26 + r() * 16;
      g.strokeStyle = `rgb(${v * 0.62 | 0},${v * 1.02 | 0},${v * 0.7 | 0})`; g.lineWidth = 1 + r() * 1.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + 6 + r() * 10); g.stroke();
    }
  })),
  // A whole cedar, for the forest behind the road: a tall dark spire.
  cedarCard: () => cached('cedarcard', () => clear([256, 768], (g, w, h) => {
    const r = rng(33);
    g.fillStyle = '#17110c'; g.fillRect(w * 0.48, h * 0.1, w * 0.04, h * 0.9);
    for (let i = 0; i < 5200; i++) {
      const t = r() ** 0.8, y = (0.02 + t * 0.84) * h, half = (0.03 + t * 0.44) * w * (0.75 + 0.25 * Math.sin(t * 60)), x = w / 2 + (r() * 2 - 1) * half;
      const v = 14 + r() * 20 + (x < w / 2 ? 8 : 0);
      g.strokeStyle = `rgb(${v * 0.62 | 0},${v | 0},${v * 0.72 | 0})`; g.lineWidth = 1.5 + r() * 2.4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x - w / 2) * 0.12 + (r() - 0.5) * 3, y + 9 + r() * 14); g.stroke();
    }
  })),
  bark: () => cached('bark', () => canvasTexture([64, 128], (g, w, h) => {
    noise(g, w, h, [66, 52, 42], 26, 41);
    const r = rng(42);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '18,12,8' : '110,92,76'},${0.3 + r() * 0.4})`; g.lineWidth = 1 + r() * 2; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 12 + r() * 30); g.stroke(); }
  }, { nearest: false })),
  // The forest floor and bare rock under the mountain's colours (a grey that
  // the ground's own colours tint).
  soil: () => cached('soil', () => canvasTexture([512, 512], (g, w, h) => {
    noise(g, w, h, [170, 170, 170], 46, 51);
    const r = rng(52);
    for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '30,30,30' : '235,235,235'},${0.05 + r() * 0.16})`; const s = 2 + r() * 12; g.beginPath(); g.ellipse(r() * w, r() * h, s, s * (0.3 + r() * 0.7), r() * 3, 0, 6.3); g.fill(); }
  }, { nearest: false })),
  // The concrete lattice held against a cut slope (法枠), mossy and stained.
  lattice: () => cached('lattice', () => canvasTexture([256, 256], (g, w, h) => {
    noise(g, w, h, [46, 56, 42], 24, 61);
    const r = rng(62), n = 2, cell = w / n;
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,88,48' : '24,30,22'},0.35)`; g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 8, 2 + r() * 6, 0, 0, 6.3); g.fill(); }
    for (let i = 0; i <= n; i++) {
      g.fillStyle = '#8c8c84'; g.fillRect(i * cell - 14, 0, 28, h); g.fillRect(0, i * cell - 14, w, 28);
      g.fillStyle = 'rgba(30,30,28,0.45)'; g.fillRect(i * cell + 10, 0, 5, h); g.fillRect(0, i * cell + 10, w, 5);
    }
    for (let i = 0; i < 90; i++) { const x = r() * w, y = r() * h; g.strokeStyle = 'rgba(24,22,18,0.3)'; g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 20 + r() * 60); g.stroke(); }
  }, { nearest: false })),
  // A white guard rail: one corrugated beam, grubby along the bottom.
  guardRail: () => cached('guardrail', () => canvasTexture([64, 32], (g, w, h) => {
    const f = g.createLinearGradient(0, 0, 0, h);
    for (const [t, c] of [[0, '#d8d8d0'], [0.24, '#f2f2ea'], [0.42, '#8e8e88'], [0.5, '#c8c8c0'], [0.58, '#8e8e88'], [0.76, '#e6e6de'], [1, '#a8a498']]) f.addColorStop(t, c);
    g.fillStyle = f; g.fillRect(0, 0, w, h);
    const r = rng(71);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(80,66,50,${r() * 0.18})`; g.fillRect(r() * w, h * 0.5 + r() * h * 0.5, 1 + r() * 8, 2 + r() * 6); }
  }, { nearest: false })),
  // Fallen petals: a pale scatter for pavements and the road's edge.
  petals: () => cached('petals', () => clear([512, 512], (g, w, h) => {
    const r = rng(81), C = ['#f2b4cc', '#f8cfdc', '#e89ab8', '#fff0f4'];
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, drift = 0.5 + 0.5 * Math.sin(x * 0.0123 + 1) * Math.sin(y * 0.0123 + 2); // the wind heaps them
      if (r() > drift * drift + 0.08) continue;
      g.fillStyle = C[(r() * 4) | 0];
      g.save(); g.translate(x, y); g.rotate(r() * 6.3); g.beginPath(); g.ellipse(0, 0, 2.4 + r() * 1.8, 1.4 + r(), 0, 0, 6.3); g.fill(); g.restore();
    }
  })),
  // A sign: white with a red border, black text.
  warnSign: (text) => cached('warn' + text, () => canvasTexture([128, 128], (g, w, h) => {
    g.fillStyle = '#f0e8a8'; g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 4); g.fillRect(-46, -46, 92, 92); g.strokeStyle = '#141414'; g.lineWidth = 6; g.strokeRect(-40, -40, 80, 80); g.restore();
    g.fillStyle = '#141414'; g.font = 'bold 30px "DotGothic16", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text.slice(0, 2), w / 2, h * 0.4); g.fillText(text.slice(2), w / 2, h * 0.64);
  }, { nearest: false })),
  // Surface wear for car paint, as a roughness multiplier (dark = glossy,
  // light = dull): faint swirls, a few fine scratches and dirty patches.
  wear: () => cached('wear', () => canvasTexture([128, 128], (g, w, h) => {
    const r = rng(77);
    g.fillStyle = '#262626'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { // soft dirt and swirl patches
      const x = r() * w, y = r() * h, rad = 4 + r() * 14, a = 0.04 + r() * 0.08;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.lineWidth = 0.6;
    for (let i = 0; i < 40; i++) { // fine scratches
      const x = r() * w, y = r() * h, a = r() * Math.PI, l = 3 + r() * 12;
      g.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.4})`;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  }, { nearest: false, srgb: false })),

  asphalt: () => cached('asphalt', () => canvasTexture([64, 64], (g, w, h) => {
    noise(g, w, h, [50, 50, 52], 10, 1);
    const r = rng(7);
    g.fillStyle = 'rgba(20,20,22,0.5)';
    for (let i = 0; i < 18; i++) g.fillRect(r() * w | 0, r() * h | 0, 1 + (r() * 3 | 0), 1);
    g.fillStyle = 'rgba(90,90,88,0.35)';
    for (let i = 0; i < 30; i++) g.fillRect(r() * w | 0, r() * h | 0, 1, 1);
  })),

  // What the headlights throw on the road, seen from the lamp: two pools that
  // overlap in the middle, brightest just under a clean top edge.
  headlightPattern: () => cached('headlightPattern', () => {
    const t = canvasTexture([256, 256], (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      g.save();
      g.beginPath(); g.moveTo(0, h * 0.5); g.lineTo(w * 0.5, h * 0.5); g.lineTo(w * 0.58, h * 0.44); g.lineTo(w, h * 0.44); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.clip();
      for (const [x, y, rx, ry, a] of [[0.4, 0.52, 0.34, 0.24, 0.62], [0.6, 0.52, 0.34, 0.24, 0.62], [0.5, 0.53, 0.5, 0.42, 0.2], [0.5, 0.52, 0.13, 0.09, 0.42]]) {
        const f = g.createRadialGradient(0, 0, 0, 0, 0, 1), c = `255,${238 + 17 * a | 0},${214 + 40 * a | 0}`;
        f.addColorStop(0, `rgba(${c},${a})`); f.addColorStop(0.55, `rgba(${c},${a * 0.55})`); f.addColorStop(1, `rgba(${c},0)`);
        g.save(); g.translate(x * w, y * h); g.scale(rx * w, ry * h); g.fillStyle = f; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
      }
      g.restore();
    }, { nearest: false });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }),

  // A whole road: one tile is the width of the tarmac and 32 m long, so it can
  // have dark wheel lanes, dusty edges, tar seams and patches. `width` in metres.
  road: (width) => {
    const paint = cached('road', () => canvasTexture([512, 1024], paintRoad));
    const tile = (t, srgb) => { const c = t.clone(); c.repeat.set(4 / width, 1 / 8); c.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; c.needsUpdate = true; chunky.add(c); return c; };
    return { map: tile(paint, true), bumpMap: tile(paint, false), bumpScale: 1.6 };
  },

  // Lying snow: off-white with faint blue hollows and grey slush specks.
  snow: () => cached('snow', () => canvasTexture([64, 64], (g, w, h) => {
    noise(g, w, h, [214, 220, 226], 18, 61);
    const r = rng(62);
    g.fillStyle = 'rgba(150,170,195,0.35)';
    for (let i = 0; i < 40; i++) g.fillRect(r() * w | 0, r() * h | 0, 2 + (r() * 4 | 0), 1 + (r() * 2 | 0));
    g.fillStyle = 'rgba(110,112,116,0.4)';
    for (let i = 0; i < 25; i++) g.fillRect(r() * w | 0, r() * h | 0, 1, 1);
  })),

  // Concrete pavement / kerb with slab joints.
  concrete: () => cached('concrete', () => canvasTexture([64, 64], (g, w, h) => {
    noise(g, w, h, [104, 104, 98], 26, 2);
    g.fillStyle = 'rgba(40,40,38,0.6)';
    g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h);
    const r = rng(3);
    g.fillStyle = 'rgba(60,62,55,0.4)';
    for (let i = 0; i < 6; i++) g.fillRect(r() * w | 0, r() * h | 0, 2 + r() * 6 | 0, 2 + r() * 4 | 0);
  })),

  grass: () => cached('grass', () => canvasTexture([32, 32], (g, w, h) => {
    noise(g, w, h, [28, 40, 24], 22, 4);
  })),

  // Corrugated metal cladding for warehouses.
  cladding: (tint = [70, 78, 80]) => cached('clad' + tint, () => canvasTexture([256, 256], (g, w, h) => {
    noise(g, w, h, tint, 16, 5);
    // Ribs of the steel sheet, a seam every few metres.
    for (let x = 0; x < w; x += 16) {
      const f = g.createLinearGradient(x, 0, x + 16, 0);
      f.addColorStop(0, 'rgba(0,0,0,0.34)'); f.addColorStop(0.3, 'rgba(255,255,255,0.1)'); f.addColorStop(0.7, 'rgba(0,0,0,0.04)'); f.addColorStop(1, 'rgba(0,0,0,0.3)');
      g.fillStyle = f; g.fillRect(x, 0, 16, h);
    }
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, h * 0.5, w, 2);
    const r = rng(9);
    for (let i = 0; i < 40; i++) { // rust and rain down the sheets
      const x = r() * w, y = r() * h * 0.8, l = 30 + r() * 120;
      const f = g.createLinearGradient(0, y, 0, y + l), rust = r() < 0.6 ? '86,50,28' : '20,20,20';
      f.addColorStop(0, `rgba(${rust},${0.1 + r() * 0.3})`); f.addColorStop(1, `rgba(${rust},0)`);
      g.fillStyle = f; g.fillRect(x, y, 2 + r() * 9, l);
    }
  })),

  // Concrete block wall.
  blocks: () => cached('blocks', () => canvasTexture([64, 64], (g, w, h) => {
    noise(g, w, h, [120, 122, 112], 18, 6);
    g.fillStyle = 'rgba(50,50,45,0.55)';
    for (let y = 0; y < h; y += 8) {
      g.fillRect(0, y, w, 1);
      const off = (y / 8) % 2 ? 8 : 0;
      for (let x = off; x < w; x += 16) g.fillRect(x, y, 1, 8);
    }
  })),

  // Chain-link fence (transparent).
  fence: () => cached('fence', () => canvasTexture([16, 16], (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,155,150,0.9)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h);
    g.stroke();
  })),

  // Warm pool of light painted on the road under each lamp.
  lightPool: () => cached('pool', () => canvasTexture([64, 64], (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,170,80,0.55)');
    grad.addColorStop(0.45, 'rgba(255,140,60,0.22)');
    grad.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }, { nearest: false })),

  // Soft dark blob under the car.
  blobShadow: () => cached('blob', () => canvasTexture([32, 64], (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, h / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.85)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }, { nearest: false })),

  // A glow sprite for lamps and lights.
  glow: () => cached('glow', () => canvasTexture([128, 128], (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    // A long soft fall, so it never ends in a visible edge however bright it is.
    for (let i = 0; i <= 12; i++) { const k = i / 12; grad.addColorStop(k, `rgba(255,255,255,${(((Math.exp(-k * k * 9) - Math.exp(-9)) / (1 - Math.exp(-9))) * (1 - k) ** 0.5).toFixed(4)})`); }
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }, { nearest: false })),

  // Five-spoke wheel face.
  rim: () => cached('rim', () => canvasTexture([32, 32], (g, w, h) => {
    g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9a9c9e';
    g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a2a2c';
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + Math.PI / 5;
      g.beginPath();
      g.moveTo(16 + Math.cos(a - 0.38) * 5, 16 + Math.sin(a - 0.38) * 5);
      g.lineTo(16 + Math.cos(a - 0.3) * 12, 16 + Math.sin(a - 0.3) * 12);
      g.lineTo(16 + Math.cos(a + 0.3) * 12, 16 + Math.sin(a + 0.3) * 12);
      g.lineTo(16 + Math.cos(a + 0.38) * 5, 16 + Math.sin(a + 0.38) * 5);
      g.fill();
    }
    g.fillStyle = '#c4c6c8';
    g.beginPath(); g.arc(16, 16, 3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#6a6c6e'; g.lineWidth = 1;
    g.beginPath(); g.arc(16, 16, 13.5, 0, Math.PI * 2); g.stroke();
  })),

  // Tyre sidewall and tread.
  tire: () => cached('tire', () => canvasTexture([16, 16], (g, w, h) => {
    noise(g, w, h, [24, 24, 25], 8, 8);
    g.fillStyle = 'rgba(0,0,0,0.5)';
    for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 2, h);
  })),

  // Lit office windows on a dark wall (a few lit, most dark).
  windows: (seed = 1) => cached('win' + seed, () => canvasTexture([256, 128], (g, w, h) => {
    g.fillStyle = '#16191a'; g.fillRect(0, 0, w, h);
    const r = rng(seed * 31);
    for (let x = 8; x < w; x += 32) {
      for (let y = 12; y < h; y += 48) {
        const lit = r() < 0.2;
        const f = g.createLinearGradient(0, y, 0, y + 28);
        if (lit) { const c = r() < 0.5 ? ['#f0d08a', '#a88a4a'] : ['#c8e0d0', '#7a9a8a']; f.addColorStop(0, c[0]); f.addColorStop(1, c[1]); } else { f.addColorStop(0, '#141a1e'); f.addColorStop(1, '#090b0c'); }
        g.fillStyle = f; g.fillRect(x, y, 20, 28);
        g.fillStyle = '#26292a'; g.fillRect(x + 9, y, 2, 28);
      }
    }
  })),

  // Gauge face for the dashboard.
  // The driver's two dials, backlit like a real car's at night: white ticks
  // and numbers on black, a red zone on the rev counter (left).
  gauges: () => cached('gauges2', () => canvasTexture([128, 64], (g, w, h) => {
    g.fillStyle = '#050607'; g.fillRect(0, 0, w, h);
    for (const [cx, n, redFrom] of [[36, 8, 7], [92, 7, 99]]) {
      g.strokeStyle = '#2a3034'; g.lineWidth = 2;
      g.beginPath(); g.arc(cx, 34, 26, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i <= n * 2; i++) {
        const a = Math.PI * 0.75 + (i / (n * 2)) * Math.PI * 1.5;
        const major = i % 2 === 0, r0 = major ? 18 : 21;
        g.strokeStyle = i / 2 >= redFrom ? '#ff3a2a' : '#e8eef0'; g.lineWidth = major ? 2 : 1;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, 34 + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * 24, 34 + Math.sin(a) * 24); g.stroke();
        if (major) {
          g.fillStyle = i / 2 >= redFrom ? '#ff3a2a' : '#dfe6e8';
          g.font = '7px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(String(n === 8 ? i / 2 : (i / 2) * 40), cx + Math.cos(a) * 13, 34 + Math.sin(a) * 13);
        }
      }
    }
    g.fillStyle = '#7a8a90'; g.font = '5px monospace'; g.textAlign = 'center';
    g.fillText('x1000r/min', 36, 50); g.fillText('km/h', 92, 50);
  }, { nearest: false })),

  // The radio's little amber display.
  radio: () => cached('radio', () => canvasTexture([64, 24], (g, w, h) => {
    g.fillStyle = '#0a0806'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffb347'; g.font = '11px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('FM 88.1', w / 2, h / 2 + 1);
  }, { nearest: false })),

  // Garage door slats.
  shutter: () => cached('shutter', () => canvasTexture([32, 32], (g, w, h) => {
    noise(g, w, h, [62, 70, 70], 10, 11);
    for (let y = 0; y < h; y += 4) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, w, 1);
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, y + 2, w, 1);
    }
  })),

  // Worn chequers for the start line.
  chequer: () => cached('chequer', () => canvasTexture([16, 16], (g, w, h) => {
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
      g.fillStyle = ((x + y) / 4) % 2 ? '#1c1c1c' : '#b8b4a8';
      g.fillRect(x, y, 4, 4);
    }
    const r = rng(21);
    g.fillStyle = 'rgba(60,60,60,0.5)';
    for (let i = 0; i < 20; i++) g.fillRect(r() * w | 0, r() * h | 0, 1, 1);
  })),

  // Black and white corner chevrons pointing left (dir 1) or right (-1).
  chevron: (dir = 1) => cached('chev' + dir, () => canvasTexture([32, 20], (g, w, h) => {
    g.fillStyle = '#141414'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8d4c8';
    for (let k = 0; k < 3; k++) {
      const x0 = 4 + k * 9;
      for (let y = 0; y < h - 4; y++) {
        const t = Math.abs(y - (h - 4) / 2);
        const x = dir > 0 ? x0 + t * 0.6 : w - (x0 + t * 0.6) - 3;
        g.fillRect(x | 0, y + 2, 3, 1);
      }
    }
  })),

  // A lit board with a word on it, in a chunky pixel font.
  sign: (text, fg, bg) => cached('sign' + text + fg, () => canvasTexture([96, 20], (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1);
    g.font = '18px "Jersey 10", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 1);
  })),

  // Fluorescent tubes under the petrol station canopy.
  tubes: () => cached('tubes', () => canvasTexture([32, 16], (g, w, h) => {
    g.fillStyle = '#3a423c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2fff4';
    for (let x = 3; x < w; x += 8) g.fillRect(x, 2, 2, h - 4);
  })),

  // Shop window: shelves, a bright counter, a figure.
  shopWindow: () => cached('shopwin', () => canvasTexture([48, 16], (g, w, h) => {
    g.fillStyle = '#d8dcc0'; g.fillRect(0, 0, w, h);
    const r = rng(31);
    for (let y = 3; y < h - 2; y += 4) for (let x = 1; x < w - 1; x++) {
      if (r() < 0.7) { g.fillStyle = ['#6a5a3a', '#8a3a2a', '#3a5a6a', '#9a8a4a'][(r() * 4) | 0]; g.fillRect(x, y, 1, 2); }
    }
    g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, w, 1); g.fillRect(16, 0, 1, h); g.fillRect(32, 0, 1, h);
  })),

  // Tall price sign: three rows of amber digits on black (no brand).
  priceSign: () => cached('price', () => canvasTexture([16, 20], (g, w, h) => {
    g.fillStyle = '#0d0d0d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f6f7a'; g.fillRect(0, 0, w, 4);
    g.fillStyle = '#ffb04a';
    for (const y of [7, 11, 15]) for (const x of [2, 5, 8, 11]) g.fillRect(x, y, 2, 3);
  })),

  // Shipping container: corrugated steel, painted per instance.
  container: () => cached('container', () => canvasTexture([32, 32], (g, w, h) => {
    noise(g, w, h, [200, 200, 196], 22, 41);
    for (let x = 0; x < w; x += 3) {
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, 0, 1, h);
    }
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
    g.fillStyle = 'rgba(80,40,20,0.4)';
    const r = rng(43);
    for (let i = 0; i < 6; i++) g.fillRect(r() * w | 0, h - 8 + r() * 6 | 0, 1, 4);
  })),

  // Traffic cone: orange with a white band.
  cone: () => cached('cone', () => canvasTexture([8, 8], (g, w, h) => {
    g.fillStyle = '#c4501a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8d4c8'; g.fillRect(0, 3, w, 2);
  })),

  // The night sky: black overhead, a low amber city glow at the horizon.
  skyGlow: () => cached('skyglow', () => canvasTexture([4, 64], (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#05080a');
    grad.addColorStop(0.55, '#0a0f12');
    grad.addColorStop(0.82, '#2a2016');
    grad.addColorStop(0.9, '#3a2a18');
    grad.addColorStop(1, '#1a1612');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }, { nearest: false })),

  // Any other sky (sunset, dawn): a vertical gradient from [offset, colour] stops, top first.
  skyGradient: (key, stops) => cached('sky-' + key, () => canvasTexture([4, 64], (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    for (const [o, c] of stops) grad.addColorStop(o, c);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }, { nearest: false })),

  // Far city blocks: dark with a scatter of lit windows.
  skyline: () => cached('skyline', () => farWindows([[0.1, '#8a6a3c'], [0.13, '#74848a']], '#10151a', 51)),

  // A far city at night with more lit windows, some pink and white.
  skylineNeon: () => cached('skylineneon', () => farWindows([[0.09, '#9a8460'], [0.13, '#98a4b4'], [0.145, '#b04a74']], '#100f18', 52)),

  // A streak of lamp light reflected in a wet road: bright at the lamp,
  // fading toward the viewer, soft at the sides.
  reflection: () => cached('reflection', () => canvasTexture([16, 64], (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const along = 1 - y / h; // 1 at the lamp end (top of the texture)
      const side = 1 - Math.abs(x - w / 2 + 0.5) / (w / 2);
      const shimmer = 0.7 + 0.3 * Math.sin(y * 1.7) * Math.sin(y * 0.6);
      const a = Math.pow(along, 1.4) * side * side * shimmer;
      const i = (y * w + x) * 4;
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = a * 200;
    }
    g.putImageData(img, 0, 0);
  }, { nearest: false })),

  // --- Parabolica Street (Tokyo city ring road) ---

  // Small square facade tiles, the beige and grey of Tokyo mid-rises.
  tiles: (tint = [150, 140, 120]) => cached('tiles' + tint, () => canvasTexture([128, 128], (g, w, h) => {
    noise(g, w, h, tint, 14, 71);
    g.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = 0; i < w; i += 16) { g.fillRect(i, 0, 2, h); g.fillRect(0, i, w, 2); }
    const r = rng(72);
    for (let i = 0; i < 18; i++) { // grime under the sills
      const x = r() * w, y = r() * h, l = 16 + r() * 50, f = g.createLinearGradient(0, y, 0, y + l);
      f.addColorStop(0, 'rgba(30,26,22,0.4)'); f.addColorStop(1, 'rgba(30,26,22,0)');
      g.fillStyle = f; g.fillRect(x, y, 3 + r() * 12, l);
    }
  })),

  // Upper floors: tile 8 m wide by four floors, painted window by window. The
  // Glow versions are the same picture with only the light in it.
  floors: (seed = 1) => cached('floors' + seed, () => canvasTexture([256, 256], (g, w, h) => paintFloors(g, w, h, seed, false), { nearest: false })),
  floorsGlow: (seed = 1) => cached('floorsg' + seed, () => canvasTexture([256, 256], (g, w, h) => paintFloors(g, w, h, seed, true), { nearest: false })),

  // Flats: the same, each floor a balcony.
  flats: (seed = 1) => cached('flats' + seed, () => canvasTexture([256, 256], (g, w, h) => paintFlats(g, w, h, seed, false), { nearest: false })),
  flatsGlow: (seed = 1) => cached('flatsg' + seed, () => canvasTexture([256, 256], (g, w, h) => paintFlats(g, w, h, seed, true), { nearest: false })),

  // A row of four small shops, 16 m by 4 m: lit shelves, doors, a sign over each.
  shopFront: (seed = 1) => cached('shopfront' + seed, () => canvasTexture([1024, 256], (g, w, h) => paintShops(g, w, h, seed), { nearest: false })),

  // Vertical neon sign: characters stacked in glowing tubes on a dark board.
  neonVertical: (text, colour = '#ff3a8a') => cached('neonv' + text + colour, () => canvasTexture([32, 32 * text.length + 16], (g, w, h) => {
    g.fillStyle = '#0a080c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = colour; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold 24px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif`;
    [...text].forEach((ch, i) => {
      const y = 22 + i * 32;
      g.lineJoin = 'round';
      g.strokeStyle = colour; g.globalAlpha = 0.35; g.lineWidth = 6; g.strokeText(ch, w / 2, y);
      g.globalAlpha = 1; g.lineWidth = 2.5; g.strokeText(ch, w / 2, y);
      g.strokeStyle = '#fff4fa'; g.lineWidth = 1; g.strokeText(ch, w / 2, y);
    });
  }, { nearest: false })),

  // Drinks vending machine front: lit rows of cans and bottles, buttons, slot.
  vending: (seed = 1) => cached('vending' + seed, () => canvasTexture([16, 32], (g, w, h) => {
    const r = rng(seed * 61);
    g.fillStyle = ['#e8ecf0', '#2a5ab0', '#c8283a'][seed % 3]; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4fbff'; g.fillRect(1, 2, w - 2, 16);
    for (let y = 3; y < 17; y += 4) for (let x = 2; x < w - 2; x += 2) {
      g.fillStyle = ['#d83a2a', '#2a6ad8', '#e8c83a', '#3aa85a', '#f0f0f0', '#8a4a2a'][(r() * 6) | 0];
      g.fillRect(x, y, 1, 2);
      g.fillStyle = '#3ae86a'; g.fillRect(x, y + 3, 1, 1); // the little lit buttons
    }
    g.fillStyle = '#101214'; g.fillRect(2, 21, 7, 2); g.fillRect(3, 26, 10, 4);
  })),

  // Convenience store front: bright glass, shelves, a band of colour stripes
  // on top (no brand). 64 x 16 texels for 14 m x 4 m.
  konbini: () => cached('konbini', () => canvasTexture([64, 16], (g, w, h) => {
    g.fillStyle = '#f4f8f6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1a8a6a'; g.fillRect(0, 0, w, 2);
    g.fillStyle = '#f0a020'; g.fillRect(0, 2, w, 1);
    g.fillStyle = '#2a5ab8'; g.fillRect(0, 3, w, 1);
    const r = rng(63);
    for (let y = 6; y < h - 1; y += 3) for (let x = 1; x < w - 1; x++) {
      if (x > 26 && x < 34) continue; // the door
      if (r() < 0.75) { g.fillStyle = ['#d8583a', '#3a8ad8', '#e8c83a', '#4aa86a', '#c84a9a'][(r() * 5) | 0]; g.fillRect(x, y, 1, 2); }
    }
    g.fillStyle = '#8a9a9a'; for (let x = 0; x < w; x += 8) g.fillRect(x, 4, 1, h - 4);
    g.fillStyle = '#c8dcd8'; g.fillRect(27, 5, 7, h - 5);
  })),

  // Concrete barrier blocks: weathered white with red bands, joints between.
  barrier: () => cached('barrier', () => canvasTexture([32, 16], (g, w, h) => {
    noise(g, w, h, [178, 176, 168], 20, 64);
    g.fillStyle = '#a82a2a';
    for (let x = 0; x < w; x += 16) g.fillRect(x + 2, 4, 6, 8);
    g.fillStyle = 'rgba(30,30,30,0.6)'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 1, h);
    g.fillStyle = 'rgba(40,40,40,0.4)'; g.fillRect(0, h - 3, w, 3); // road grime
  }, { repeat: [1, 1] })),

  // --- Underground (Tokyo tunnel) ---

  // Tunnel wall: pale glazed panels with dark joints, grimier toward the
  // road, and a painted teal band at the bottom. One tile is 4 m x 4 m.
  tunnelWall: () => cached('tunnelwall', () => canvasTexture([64, 64], (g, w, h) => {
    noise(g, w, h, [150, 160, 160], 14, 61);
    const grime = g.createLinearGradient(0, 0, 0, h);
    grime.addColorStop(0, 'rgba(10,20,20,0)');
    grime.addColorStop(0.7, 'rgba(10,20,20,0.15)');
    grime.addColorStop(1, 'rgba(10,20,20,0.55)');
    g.fillStyle = grime; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(20,30,32,0.75)';
    for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 1);
    g.fillStyle = '#1d5a5e'; g.fillRect(0, h - 12, w, 12);   // teal band at the foot
    g.fillStyle = '#d8dcd4'; g.fillRect(0, h - 13, w, 1);
  })),

  // Ceiling: bare concrete rings with joints and bolt pockets. One tile is 3 m.
  tunnelRoof: () => cached('tunnelroof', () => canvasTexture([32, 32], (g, w, h) => {
    noise(g, w, h, [62, 66, 66], 16, 62);
    g.fillStyle = 'rgba(10,12,12,0.7)';
    g.fillRect(0, 0, 1, h); g.fillRect(w / 2, 0, 1, h);
    g.fillRect(0, 0, w, 1);
    g.fillStyle = 'rgba(10,12,12,0.5)';
    for (const x of [6, 22]) for (let y = 4; y < h; y += 8) g.fillRect(x, y, 2, 2);
  })),

  // A light pool painted in white, to be tinted by the material.
  lightPoolWhite: () => cached('poolw', () => canvasTexture([64, 64], (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.6)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }, { nearest: false })),

  // A wash of light across a strip: bright along one edge (u = 0), fading out.
  wash: () => cached('wash', () => canvasTexture([32, 4], (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }, { nearest: false })),

  // Words painted on the road, stacked and stretched like Japanese road
  // markings (read from the bottom as you drive up to them).
  roadWords: (text) => cached('roadwords' + text, () => canvasTexture([32, 32 * text.length], (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#f4f6f2';
    g.font = `bold 30px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    [...text].forEach((ch, i) => g.fillText(ch, w / 2, 16 + i * 32));
  }, { srgb: true })),

  // Square dots across the lane before a hard corner, white and red.
  slowBars: () => cached('slowbars', () => canvasTexture([16, 16], (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let x = 0; x < w; x += 4) { g.fillStyle = (x / 4) % 2 ? '#c2262a' : '#eef0ea'; g.fillRect(x, 4, 3, 8); }
  })),

  // Overhead direction board: white text on blue or green, pixel sharp.
  // lines: [[text, size], ...]
  roadSign: (lines, bg = '#1d4f9a', w = 128, h = 48) => cached('rsign' + lines.join() + bg, () => canvasTexture([w, h], (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8eef0'; g.fillRect(2, 2, w - 4, 1); g.fillRect(2, h - 3, w - 4, 1); g.fillRect(2, 2, 1, h - 4); g.fillRect(w - 3, 2, 1, h - 4);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let y = 6;
    const total = lines.reduce((t, [, sz]) => t + sz, 0);
    y = (h - total) / 2;
    for (const [text, size] of lines) {
      g.font = `bold ${size}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif`;
      g.fillText(text, w / 2, y + size / 2 + 1);
      y += size;
    }
  })),

  // Amber LED message board: dot-matrix text on black.
  ledBoard: (text, w = 96, h = 20) => cached('led' + text, () => canvasTexture([w, h], (g) => {
    g.fillStyle = '#050505'; g.fillRect(0, 0, w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const t = c.getContext('2d');
    t.fillStyle = '#fff'; t.font = `bold 15px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif`;
    t.textAlign = 'center'; t.textBaseline = 'middle';
    t.fillText(text, w / 2, h / 2 + 1);
    const img = t.getImageData(0, 0, w, h).data;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const on = img[(y * w + x) * 4 + 3] > 90;
      g.fillStyle = on ? '#ffb02a' : '#1a1206';
      if (on || (x + y) % 2 === 0) g.fillRect(x, y, 1, 1);
    }
  })),

  // Green emergency exit sign: a running figure and a door.
  exitSign: () => cached('exitsign', () => canvasTexture([24, 12], (g, w, h) => {
    g.fillStyle = '#1fae5a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8fff0';
    g.fillRect(15, 2, 6, 8); g.fillStyle = '#1fae5a'; g.fillRect(16, 3, 4, 7);
    g.fillStyle = '#e8fff0';
    g.fillRect(6, 2, 2, 2); g.fillRect(5, 4, 3, 3); g.fillRect(3, 5, 2, 1); g.fillRect(8, 5, 3, 1);
    g.fillRect(4, 7, 2, 3); g.fillRect(7, 7, 2, 2); g.fillRect(9, 8, 2, 1);
  })),

  // A wheel face with open spokes (transparent between them, so the brake
  // disc shows through). style: five, ten or split (five split spokes).
  rimFace: (style = 'five', color = '#a8acae') => cached('rimface' + style + color, () => canvasTexture([64, 64], (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const c = w / 2;
    g.fillStyle = color;
    const lip = style === 'dish' ? 21 : 26; // a deep dish has a wide lip
    g.beginPath(); g.arc(c, c, 31, 0, Math.PI * 2); g.arc(c, c, lip, 0, Math.PI * 2, true); g.fill();
    if (style === 'mesh') {
      // Cross-laced mesh: thin spokes both ways round, like a BBS.
      g.strokeStyle = color; g.lineWidth = 2;
      for (let i = 0; i < 12; i++) for (const d of [1, -1]) {
        const a = (i / 12) * Math.PI * 2;
        g.beginPath(); g.moveTo(c + Math.cos(a) * 9, c + Math.sin(a) * 9); g.lineTo(c + Math.cos(a + d * 0.5) * 27, c + Math.sin(a + d * 0.5) * 27); g.stroke();
      }
    } else {
      const spokes = style === 'ten' ? 10 : style === 'six' ? 6 : 5;
      const pairs = style === 'split' ? [-0.13, 0.13] : [0];
      const wid = style === 'ten' ? 0.1 : style === 'split' ? 0.07 : style === 'six' ? 0.14 : style === 'dish' ? 0.16 : 0.2;
      const reach = style === 'dish' ? lip + 1 : 27;
      for (let i = 0; i < spokes; i++) for (const o of pairs) {
        const a = (i / spokes) * Math.PI * 2 + o;
        g.beginPath();
        g.moveTo(c + Math.cos(a - wid * 1.6) * 8, c + Math.sin(a - wid * 1.6) * 8);
        g.lineTo(c + Math.cos(a - wid) * reach, c + Math.sin(a - wid) * reach);
        g.lineTo(c + Math.cos(a + wid) * reach, c + Math.sin(a + wid) * reach);
        g.lineTo(c + Math.cos(a + wid * 1.6) * 8, c + Math.sin(a + wid * 1.6) * 8);
        g.fill();
      }
    }
    g.beginPath(); g.arc(c, c, 9, 0, Math.PI * 2); g.fill(); // hub
    g.fillStyle = 'rgba(0,0,0,0.45)';
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.6; g.fillRect(c + Math.cos(a) * 5 - 1, c + Math.sin(a) * 5 - 1, 2, 2); }
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.arc(c, c, 30, Math.PI * 1.1, Math.PI * 1.5); g.arc(c, c, 28, Math.PI * 1.5, Math.PI * 1.1, true); g.fill();
  })),

  // Race number roundel: a disc in the decal colour with a dark number.
  roundel: (colour = 0xf2f2ee) => cached('roundel' + colour, () => canvasTexture([64, 64], (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#' + colour.toString(16).padStart(6, '0');
    g.beginPath(); g.arc(w / 2, h / 2, 30, 0, Math.PI * 2); g.fill();
    const dark = (colour >> 16) + ((colour >> 8) & 255) + (colour & 255) > 300;
    g.fillStyle = dark ? '#111214' : '#f2f2ee';
    g.font = 'bold 34px "Jersey 10", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('08', w / 2, h / 2 + 2);
  })),

  // Your home flag on clear, ready to lay on a door.
  flag: (id) => cached('flag' + id, () => canvasTexture([128, 128], (g, w) => {
    const h = Math.round(w * 2 / 3), c = flagCanvas(id, w - 8, h - 8);
    g.clearRect(0, 0, w, w);
    g.drawImage(c, 4, (w - h) / 2 + 4);
  }, { nearest: false })),

  // A vertical sticker of Japanese text, white (tinted by the material).
  sticker: (text) => cached('sticker' + text, () => canvasTexture([32, 32 * text.length], (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#fff';
    g.font = `bold 28px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    [...text].forEach((ch, i) => g.fillText(ch, w / 2, 16 + i * 32));
  })),

  // --- Garage ---

  // Green epoxy floor, scuffed, with a painted yellow line.
  epoxy: () => cached('epoxy', () => canvasTexture([64, 64], (g, w, h) => {
    noise(g, w, h, [96, 112, 100], 10, 71);
    const r = rng(72);
    g.fillStyle = 'rgba(30,40,30,0.25)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 40; i++) g.fillRect(r() * w | 0, r() * h | 0, 2 + (r() * 6 | 0), 1);
  }, { repeat: [2, 3] })),

  cork: () => cached('cork', () => canvasTexture([64, 24], (g, w, h) => {
    noise(g, w, h, [150, 110, 60], 30, 73);
    const r = rng(74);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = r() < 0.7 ? '#d8d8d0' : '#e8d870';
      const x = r() * (w - 10) | 0, y = r() * (h - 9) | 0;
      g.fillRect(x, y, 6 + (r() * 5 | 0), 6 + (r() * 3 | 0));
      g.fillStyle = '#c02020'; g.fillRect(x + 2, y, 1, 1);
    }
    g.fillStyle = '#5a4020'; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
  })),

  pegboard: () => cached('pegboard', () => canvasTexture([64, 28], (g, w, h) => {
    g.fillStyle = '#7a6a50'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a3e2c';
    for (let y = 2; y < h; y += 3) for (let x = 2; x < w; x += 3) g.fillRect(x, y, 1, 1);
    // Spanners, a hammer and pliers hanging up.
    g.fillStyle = '#b8bcc0';
    for (let i = 0; i < 6; i++) g.fillRect(4 + i * 3, 4, 1, 8 + i);
    g.fillStyle = '#c03020'; g.fillRect(30, 4, 2, 12); g.fillStyle = '#9a9ea2'; g.fillRect(27, 3, 8, 3);
    g.fillStyle = '#2a5a9a'; g.fillRect(42, 6, 2, 10); g.fillRect(46, 6, 2, 10); g.fillStyle = '#9a9ea2'; g.fillRect(42, 3, 6, 4);
    g.fillStyle = '#d8a020'; g.fillRect(54, 5, 6, 9);
  })),

  // An old monitor showing a green-on-black readout.
  crt: () => cached('crt', () => canvasTexture([32, 24], (g, w, h) => {
    g.fillStyle = '#04140c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5ae88a';
    const r = rng(75);
    for (let y = 3; y < h - 2; y += 3) g.fillRect(3, y, 6 + (r() * 20 | 0), 1);
    g.fillStyle = 'rgba(90,232,138,0.12)';
    for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1);
  })),

  // The neon sign: 夜勤 ("night shift") in pink tubes, NIGHTSHIFT under it.
  neonSign: () => cached('neon', () => canvasTexture([128, 64], (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold 40px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif`;
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,40,130,0.35)'; g.lineWidth = 7; g.strokeText('夜勤', w / 2, 24);
    g.strokeStyle = '#ff3a8a'; g.lineWidth = 3; g.strokeText('夜勤', w / 2, 24);
    g.strokeStyle = '#ffd0e8'; g.lineWidth = 1; g.strokeText('夜勤', w / 2, 24);
    g.font = '14px "Jersey 10", monospace';
    g.fillStyle = '#4ff0e0'; g.fillText('N I G H T S H I F T', w / 2, 54);
  }, { nearest: false })),
};
