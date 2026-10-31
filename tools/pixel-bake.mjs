// Turns a canvas into pixel art, inside the page: cuts it down to a small
// palette (median cut), with a light 4x4 ordered dither. Shared by the tools
// that make the car cards and the story art; injected into the page as text.
//   bake(canvas, { colours: 48, dither: 0.5, key: [255, 0, 255], lift: 1 }) -> data: URL
// `key`: pixels near that colour turn transparent.

export const BAKE = `
window.bake = (src, { colours = 48, dither = 0.5, key = null, gamma = 1, sat = 1 } = {}) => {
  const W = src.width, H = src.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, 0, 0);
  const im = g.getImageData(0, 0, W, H), d = im.data;
  const px = [];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
    if (key && Math.abs(d[i] - key[0]) + Math.abs(d[i + 1] - key[1]) + Math.abs(d[i + 2] - key[2]) < 150) { d[i + 3] = 0; continue; }
    d[i + 3] = 255;
    const l = 0.3 * d[i] + 0.6 * d[i + 1] + 0.1 * d[i + 2];
    for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, 255 * ((l + (d[i + k] - l) * sat) / 255) ** gamma));
    px.push([d[i], d[i + 1], d[i + 2]]);
  }
  let boxes = [px];
  while (boxes.length < colours) {
    let best = -1, axis = 0, size = 0;
    boxes.forEach((b, n) => {
      if (b.length < 2) return;
      for (let a = 0; a < 3; a++) {
        let lo = 255, hi = 0;
        for (const p of b) { if (p[a] < lo) lo = p[a]; if (p[a] > hi) hi = p[a]; }
        const s = (hi - lo) * Math.sqrt(b.length);
        if (s > size) { size = s; best = n; axis = a; }
      }
    });
    if (best < 0) break;
    const b = boxes[best].sort((p, q) => p[axis] - q[axis]);
    boxes.splice(best, 1, b.slice(0, b.length >> 1), b.slice(b.length >> 1));
  }
  const pal = boxes.filter((b) => b.length).map((b) => { const m = [0, 0, 0]; for (const p of b) for (let a = 0; a < 3; a++) m[a] += p[a]; return m.map((v) => Math.round(v / b.length)); });
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!d[i + 3]) continue;
    const t = (B[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * 40 * dither;
    let bd = 1e9, bp = pal[0];
    for (const p of pal) {
      const a = d[i] + t - p[0], b = d[i + 1] + t - p[1], e = d[i + 2] + t - p[2], v = a * a + b * b + e * e;
      if (v < bd) { bd = v; bp = p; }
    }
    d[i] = bp[0]; d[i + 1] = bp[1]; d[i + 2] = bp[2];
  }
  g.putImageData(im, 0, 0);
  return c.toDataURL('image/png');
};`;
