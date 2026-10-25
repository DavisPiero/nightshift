// Small textures painted in code at low resolution, with nearest-neighbour
// magnification so they read as chunky texels up close, like a PS2 game.

import * as THREE from 'three';

// Seeded random so textures look the same on every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvasTexture(size, paint, { repeat = [1, 1], nearest = true, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = size[0]; c.height = size[1];
  const g = c.getContext('2d');
  paint(g, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (nearest) t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 2;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
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

export const Tex = {
  asphalt: () => cached('asphalt', () => canvasTexture([64, 64], (g, w, h) => {
    noise(g, w, h, [50, 50, 52], 10, 1);
    const r = rng(7);
    g.fillStyle = 'rgba(20,20,22,0.5)';
    for (let i = 0; i < 18; i++) g.fillRect(r() * w | 0, r() * h | 0, 1 + (r() * 3 | 0), 1);
    g.fillStyle = 'rgba(90,90,88,0.35)';
    for (let i = 0; i < 30; i++) g.fillRect(r() * w | 0, r() * h | 0, 1, 1);
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
  cladding: (tint = [70, 78, 80]) => cached('clad' + tint, () => canvasTexture([64, 64], (g, w, h) => {
    noise(g, w, h, tint, 14, 5);
    for (let x = 0; x < w; x += 4) {
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, 0, 1, h);
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 2, 0, 1, h);
    }
    const r = rng(9);
    g.fillStyle = 'rgba(80,50,30,0.35)'; // rust streaks
    for (let i = 0; i < 5; i++) g.fillRect(r() * w | 0, h - 20 + r() * 10 | 0, 1, 10 + r() * 10 | 0);
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
  glow: () => cached('glow', () => canvasTexture([32, 32], (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
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
  windows: (seed = 1) => cached('win' + seed, () => canvasTexture([64, 32], (g, w, h) => {
    g.fillStyle = '#16191a'; g.fillRect(0, 0, w, h);
    const r = rng(seed * 31);
    for (let x = 2; x < w; x += 8) {
      for (let y = 4; y < h; y += 12) {
        const lit = r() < 0.18;
        g.fillStyle = lit ? (r() < 0.5 ? '#d9b46a' : '#a9c4a0') : '#0b0d0e';
        g.fillRect(x, y, 5, 6);
      }
    }
  })),

  // Gauge face for the dashboard.
  gauges: () => cached('gauges', () => canvasTexture([64, 32], (g, w, h) => {
    g.fillStyle = '#060606'; g.fillRect(0, 0, w, h);
    for (const cx of [18, 46]) {
      g.strokeStyle = '#c87a2a'; g.lineWidth = 1;
      g.beginPath(); g.arc(cx, 17, 12, Math.PI * 0.75, Math.PI * 2.25); g.stroke();
      g.fillStyle = '#e89a3a';
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * 0.75 + i / 8 * Math.PI * 1.5;
        g.fillRect(cx + Math.cos(a) * 10 | 0, 17 + Math.sin(a) * 10 | 0, 1, 1);
      }
    }
  })),

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

  // Far city blocks: dark with a scatter of lit windows.
  skyline: () => cached('skyline', () => canvasTexture([32, 64], (g, w, h) => {
    g.fillStyle = '#0d1114'; g.fillRect(0, 0, w, h);
    const r = rng(51);
    for (let y = 2; y < h; y += 3) for (let x = 1; x < w; x += 3) {
      if (r() < 0.16) { g.fillStyle = r() < 0.8 ? '#8a6a3a' : '#7a8a8a'; g.fillRect(x, y, 1, 1); }
    }
  }, { repeat: [2, 2] })),

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
    g.beginPath(); g.arc(c, c, 31, 0, Math.PI * 2); g.arc(c, c, 26, 0, Math.PI * 2, true); g.fill(); // lip
    const spokes = style === 'ten' ? 10 : 5;
    const pairs = style === 'split' ? [-0.13, 0.13] : [0];
    const wid = style === 'ten' ? 0.1 : style === 'split' ? 0.07 : 0.2;
    for (let i = 0; i < spokes; i++) for (const o of pairs) {
      const a = (i / spokes) * Math.PI * 2 + o;
      g.beginPath();
      g.moveTo(c + Math.cos(a - wid * 1.6) * 8, c + Math.sin(a - wid * 1.6) * 8);
      g.lineTo(c + Math.cos(a - wid) * 27, c + Math.sin(a - wid) * 27);
      g.lineTo(c + Math.cos(a + wid) * 27, c + Math.sin(a + wid) * 27);
      g.lineTo(c + Math.cos(a + wid * 1.6) * 8, c + Math.sin(a + wid * 1.6) * 8);
      g.fill();
    }
    g.beginPath(); g.arc(c, c, 9, 0, Math.PI * 2); g.fill(); // hub
    g.fillStyle = 'rgba(0,0,0,0.45)';
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.6; g.fillRect(c + Math.cos(a) * 5 - 1, c + Math.sin(a) * 5 - 1, 2, 2); }
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.arc(c, c, 30, Math.PI * 1.1, Math.PI * 1.5); g.arc(c, c, 28, Math.PI * 1.5, Math.PI * 1.1, true); g.fill();
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
