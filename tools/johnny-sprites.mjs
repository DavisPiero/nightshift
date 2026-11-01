// Johnny's expressions. Cuts David's sheet (Reference/Characters/
// johnny-sprite-sheet.webp: 5 across, 4 down, on black) into assets/story/johnny/:
// the black round him goes (the dark shirt and goggles stay, because only black
// reached from outside him is removed), every pose is lined up on the shoulders
// and goggles of the first, and each is drawn a little coarser than the sheet.
//   node tools/johnny-sprites.mjs
// Runs in headless Chrome through tools/shot.mjs, like the other story art.

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets/story/johnny');

// In sheet order, left to right, top to bottom.
export const MOODS = [
  'plain', 'talk', 'aside', 'flat', 'wrench-look',
  'down', 'sorry', 'shock', 'think', 'calm',
  'thumbs', 'laugh', 'wrench', 'worry', 'explain',
  'angry', 'facepalm', 'sad', 'smug', 'wrench-grin',
];

const PIXEL = 2;    // sheet pixels to one sprite pixel: close to the sheet itself
const BLACK = 16;   // brightest colour (of r, g, b) still counted as the backdrop

const page = (n) => `(async () => {
  const img = new Image(); img.src = '/Reference/Characters/johnny-sprite-sheet.webp'; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;
  const lit = (x, y) => { const i = (y * W + x) * 4; return Math.max(d[i], d[i + 1], d[i + 2]) > ${BLACK}; };

  // The rows and columns: runs of lit pixels with black gaps between them.
  const runs = (len, hit, gap) => { const out = []; let start = -1, dark = 0;
    for (let i = 0; i < len; i++) { if (hit(i)) { if (start < 0) start = i; dark = 0; } else if (start >= 0 && ++dark >= gap) { out.push([start, i - dark]); start = -1; } }
    if (start >= 0) out.push([start, len - 1]); return out; };
  const rows = runs(H, (y) => { for (let x = 0; x < W; x += 2) if (lit(x, y)) return true; return false; }, 6);
  if (rows.length !== 4) throw new Error('rows ' + rows.length);
  const cells = [];
  for (const [y0, y1] of rows) {
    const cols = runs(W, (x) => { for (let y = y0; y <= y1; y++) if (lit(x, y)) return true; return false; }, 10);
    if (cols.length !== 5) throw new Error('cols ' + cols.length);
    for (const [x0, x1] of cols) cells.push({ x0, y0, x1, y1 });
  }

  // One cell, on its own: flood the black in from the edges, leave the rest.
  const cut = ({ x0, y0, x1, y1 }) => {
    const w = x1 - x0 + 21, h = y1 - y0 + 11, out = new Uint8ClampedArray(w * h * 4), bg = new Uint8Array(w * h);
    const dark = (x, y) => { const X = x0 - 10 + x, Y = y0 - 10 + y; return X < 0 || Y < 0 || X >= W || Y >= H || !lit(X, Y); };
    const stack = [];
    for (let x = 0; x < w; x++) stack.push([x, 0]);
    for (let y = 0; y < h; y++) stack.push([0, y], [w - 1, y]);
    while (stack.length) { const [x, y] = stack.pop(); if (x < 0 || y < 0 || x >= w || y >= h) continue; const k = y * w + x; if (bg[k] || !dark(x, y)) continue; bg[k] = 1; stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = x0 - 10 + x, Y = y0 - 10 + y; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const i = (Y * W + X) * 4, o = (y * w + x) * 4;
      out[o] = d[i]; out[o + 1] = d[i + 1]; out[o + 2] = d[i + 2]; out[o + 3] = bg[y * w + x] ? 0 : 255;
    }
    return { w, h, px: out };
  };

  const poses = cells.map(cut);
  // Line up on the lower half: shoulders and goggles stay, only the head moves.
  const ref = poses[0], grey = (p, x, y) => { if (x < 0 || y < 0 || x >= p.w || y >= p.h) return -1; const i = (y * p.w + x) * 4; return p.px[i + 3] ? p.px[i] * 0.3 + p.px[i + 1] * 0.6 + p.px[i + 2] * 0.1 : -1; };
  const score = (p, dx, dy, step) => { let s = 0, n = 0;
    for (let y = Math.floor(ref.h * 0.56); y < ref.h - 14; y += step) for (let x = 20; x < ref.w * 0.72; x += step) {
      const a = grey(ref, x, y), b = grey(p, x - dx, y - dy);
      if (a < 0 && b < 0) continue; s += a < 0 || b < 0 ? 90 : Math.abs(a - b); n++; }
    return s / Math.max(1, n); };
  const fit = (p) => { let best = [0, 0], low = Infinity;
    for (let dy = -40; dy <= 40; dy += 4) for (let dx = -90; dx <= 90; dx += 4) { const s = score(p, dx, dy, 5); if (s < low) { low = s; best = [dx, dy]; } }
    const [bx, by] = best; low = Infinity;
    for (let dy = by - 4; dy <= by + 4; dy++) for (let dx = bx - 4; dx <= bx + 4; dx++) { const s = score(p, dx, dy, 2); if (s < low) { low = s; best = [dx, dy]; } }
    return best; };
  const shifts = poses.map((p, i) => (i ? fit(p) : [0, 0]));

  // Every pose must reach the bottom edge, so cut at the highest bottom.
  const bottom = Math.min(...poses.map((p, i) => { let last = 0; for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.px[(y * p.w + x) * 4 + 3]) { last = Math.max(last, y); break; } return last + shifts[i][1]; }));
  const left = Math.min(...poses.map((p, i) => shifts[i][0])), right = Math.max(...poses.map((p, i) => shifts[i][0] + p.w));
  const top = Math.min(...shifts.map((s) => s[1]));
  const sw = right - left, sh = bottom - top, tw = Math.round(sw / ${PIXEL}), th = Math.round(sh / ${PIXEL});

  // Average each coarse pixel of what is solid, and keep it hard-edged.
  const p = poses[${n}], [dx, dy] = shifts[${n}], o = document.createElement('canvas'); o.width = tw; o.height = th;
  const x = o.getContext('2d'), im = x.createImageData(tw, th);
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
    let r = 0, g2 = 0, b = 0, a = 0, all = 0;
    for (let sy = Math.floor(ty * ${PIXEL}); sy < (ty + 1) * ${PIXEL}; sy++) for (let sx = Math.floor(tx * ${PIXEL}); sx < (tx + 1) * ${PIXEL}; sx++) {
      const X = sx + left - dx, Y = sy + top - dy; all++;
      if (X < 0 || Y < 0 || X >= p.w || Y >= p.h) continue;
      const i = (Y * p.w + X) * 4; if (p.px[i + 3]) { r += p.px[i]; g2 += p.px[i + 1]; b += p.px[i + 2]; a++; }
    }
    const i = (ty * tw + tx) * 4;
    if (a * 2 >= all) { const q = (v) => Math.round(v / a / 6) * 6; im.data[i] = q(r); im.data[i + 1] = q(g2); im.data[i + 2] = q(b); im.data[i + 3] = 255; }
  }
  x.putImageData(im, 0, 0);
  return o.toDataURL('image/png');
})()`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(join(ROOT, 'review'), { recursive: true });
writeFileSync(join(ROOT, 'review/blank.html'), '<!doctype html><body>');
const jobs = MOODS.map((m, n) => ({ page: 'review/blank.html', out: join(ROOT, 'review/story-last.png'), wait: 0.1, js: page(n), saveData: join(OUT, `${m}.png`), after: 0.05 }));
console.log(execFileSync('node', [join(ROOT, 'tools/shot.mjs'), JSON.stringify(jobs)], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n').filter((l) => !l.startsWith('saved')).join('\n'));
