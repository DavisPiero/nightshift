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
};
