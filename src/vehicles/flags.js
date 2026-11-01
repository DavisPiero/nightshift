// Home flags: where your racer is from. Each draws itself on a 2D canvas, so the
// same picture serves the racer form and the sticker on the doors. `home` is how
// Johnny says it. Plain flat shapes, no emblems.

const stripes = (g, w, h, across, ...cols) => cols.forEach((c, i) => {
  g.fillStyle = c;
  if (across) g.fillRect(0, h * i / cols.length, w, h / cols.length + 1);
  else g.fillRect(w * i / cols.length, 0, w / cols.length + 1, h);
});
const nordic = (g, w, h, bg, cross, inner) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const bar = (c, t) => { g.fillStyle = c; g.fillRect(w * 0.36 - t / 2, 0, t, h); g.fillRect(0, h / 2 - t / 2, w, t); };
  bar(cross, h * 0.26);
  if (inner) bar(inner, h * 0.13);
};
const star = (g, x, y, r, c = '#ffffff', n = 5) => {
  g.fillStyle = c; g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r * 0.42 : r; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.closePath(); g.fill();
};
const disc = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
// The Union flag, in the box (x, y, w, h).
const union = (g, x, y, w, h) => {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#16275f'; g.fillRect(x, y, w, h);
  const line = (c, t) => { g.strokeStyle = c; g.lineWidth = t; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke(); };
  line('#ffffff', h * 0.2); line('#c8102e', h * 0.08);
  g.fillStyle = '#ffffff'; g.fillRect(x + w / 2 - h * 0.17, y, h * 0.34, h); g.fillRect(x, y + h / 2 - h * 0.17, w, h * 0.34);
  g.fillStyle = '#c8102e'; g.fillRect(x + w / 2 - h * 0.1, y, h * 0.2, h); g.fillRect(x, y + h / 2 - h * 0.1, w, h * 0.2);
  g.restore();
};

export const FLAGS = {
  jp: { name: 'Japan', home: 'Japan', draw(g, w, h) { stripes(g, w, h, true, '#ffffff'); disc(g, w / 2, h / 2, h * 0.3, '#bc002d'); } },
  us: { name: 'United States', home: 'the States', draw(g, w, h) {
    stripes(g, w, h, true, ...Array.from({ length: 13 }, (_, i) => (i % 2 ? '#ffffff' : '#b22234')));
    g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, w * 0.42, h * 7 / 13);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) star(g, w * (0.05 + x * 0.08), h * (0.07 + y * 0.125), h * 0.035);
  } },
  gb: { name: 'United Kingdom', home: 'the UK', draw(g, w, h) { union(g, 0, 0, w, h); } },
  ie: { name: 'Ireland', home: 'Ireland', draw(g, w, h) { stripes(g, w, h, false, '#169b62', '#ffffff', '#ff883e'); } },
  nl: { name: 'Netherlands', home: 'the Netherlands', draw(g, w, h) { stripes(g, w, h, true, '#ae1c28', '#ffffff', '#21468b'); } },
  be: { name: 'Belgium', home: 'Belgium', draw(g, w, h) { stripes(g, w, h, false, '#000000', '#fae042', '#ed2939'); } },
  de: { name: 'Germany', home: 'Germany', draw(g, w, h) { stripes(g, w, h, true, '#000000', '#dd0000', '#ffce00'); } },
  fr: { name: 'France', home: 'France', draw(g, w, h) { stripes(g, w, h, false, '#002395', '#ffffff', '#ed2939'); } },
  it: { name: 'Italy', home: 'Italy', draw(g, w, h) { stripes(g, w, h, false, '#009246', '#ffffff', '#ce2b37'); } },
  es: { name: 'Spain', home: 'Spain', draw(g, w, h) { stripes(g, w, h, true, '#c60b1e', '#ffc400', '#ffc400', '#c60b1e'); } },
  pt: { name: 'Portugal', home: 'Portugal', draw(g, w, h) { g.fillStyle = '#ff0000'; g.fillRect(0, 0, w, h); g.fillStyle = '#006600'; g.fillRect(0, 0, w * 0.4, h); disc(g, w * 0.4, h / 2, h * 0.18, '#ffcc00'); } },
  se: { name: 'Sweden', home: 'Sweden', draw(g, w, h) { nordic(g, w, h, '#006aa7', '#fecc00'); } },
  no: { name: 'Norway', home: 'Norway', draw(g, w, h) { nordic(g, w, h, '#ba0c2f', '#ffffff', '#00205b'); } },
  fi: { name: 'Finland', home: 'Finland', draw(g, w, h) { nordic(g, w, h, '#ffffff', '#003580'); } },
  dk: { name: 'Denmark', home: 'Denmark', draw(g, w, h) { nordic(g, w, h, '#c60c30', '#ffffff'); } },
  pl: { name: 'Poland', home: 'Poland', draw(g, w, h) { stripes(g, w, h, true, '#ffffff', '#dc143c'); } },
  at: { name: 'Austria', home: 'Austria', draw(g, w, h) { stripes(g, w, h, true, '#ed2939', '#ffffff', '#ed2939'); } },
  ca: { name: 'Canada', home: 'Canada', draw(g, w, h) { stripes(g, w, h, false, '#d80621', '#ffffff', '#ffffff', '#d80621'); star(g, w / 2, h / 2, h * 0.26, '#d80621', 7); } },
  mx: { name: 'Mexico', home: 'Mexico', draw(g, w, h) { stripes(g, w, h, false, '#006847', '#ffffff', '#ce1126'); disc(g, w / 2, h / 2, h * 0.09, '#8a5a2b'); } },
  br: { name: 'Brazil', home: 'Brazil', draw(g, w, h) {
    g.fillStyle = '#009c3b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffdf00'; g.beginPath(); g.moveTo(w * 0.5, h * 0.1); g.lineTo(w * 0.92, h / 2); g.lineTo(w * 0.5, h * 0.9); g.lineTo(w * 0.08, h / 2); g.closePath(); g.fill();
    disc(g, w / 2, h / 2, h * 0.21, '#002776');
  } },
  au: { name: 'Australia', home: 'Australia', draw(g, w, h) { g.fillStyle = '#00247d'; g.fillRect(0, 0, w, h); union(g, 0, 0, w / 2, h / 2); star(g, w * 0.25, h * 0.75, h * 0.11, '#ffffff', 7); for (const [x, y] of [[0.75, 0.2], [0.75, 0.8], [0.64, 0.45], [0.86, 0.4]]) star(g, w * x, h * y, h * 0.06, '#ffffff', 7); } },
  nz: { name: 'New Zealand', home: 'New Zealand', draw(g, w, h) { g.fillStyle = '#00247d'; g.fillRect(0, 0, w, h); union(g, 0, 0, w / 2, h / 2); for (const [x, y] of [[0.75, 0.2], [0.75, 0.8], [0.66, 0.46], [0.84, 0.42]]) star(g, w * x, h * y, h * 0.06, '#cc142b'); } },
  cn: { name: 'China', home: 'China', draw(g, w, h) { g.fillStyle = '#de2910'; g.fillRect(0, 0, w, h); star(g, w * 0.17, h * 0.27, h * 0.16, '#ffde00'); for (const [x, y] of [[0.33, 0.1], [0.39, 0.22], [0.39, 0.38], [0.33, 0.48]]) star(g, w * x, h * y, h * 0.05, '#ffde00'); } },
  kr: { name: 'South Korea', home: 'Korea', draw(g, w, h) {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    disc(g, w / 2, h / 2, h * 0.24, '#cd2e3a');
    g.fillStyle = '#0047a0'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.24, 0.15 * Math.PI, 1.15 * Math.PI); g.fill();
    g.fillStyle = '#000000';
    for (const [x, y, a] of [[0.17, 0.25, 1], [0.83, 0.75, 1], [0.83, 0.25, -1], [0.17, 0.75, -1]]) { g.save(); g.translate(w * x, h * y); g.rotate(a * 0.98); for (let i = -1; i <= 1; i++) g.fillRect(-h * 0.13, i * h * 0.06 - h * 0.02, h * 0.26, h * 0.04); g.restore(); }
  } },
  in: { name: 'India', home: 'India', draw(g, w, h) { stripes(g, w, h, true, '#ff9933', '#ffffff', '#138808'); g.strokeStyle = '#000080'; g.lineWidth = h * 0.025; g.beginPath(); g.arc(w / 2, h / 2, h * 0.12, 0, Math.PI * 2); g.stroke(); disc(g, w / 2, h / 2, h * 0.025, '#000080'); } },
  th: { name: 'Thailand', home: 'Thailand', draw(g, w, h) { stripes(g, w, h, true, '#a51931', '#f4f5f8', '#2d2a4a', '#2d2a4a', '#f4f5f8', '#a51931'); } },
  id: { name: 'Indonesia', home: 'Indonesia', draw(g, w, h) { stripes(g, w, h, true, '#ff0000', '#ffffff'); } },
  za: { name: 'South Africa', home: 'South Africa', draw(g, w, h) {
    stripes(g, w, h, true, '#e03c31', '#001489');
    g.fillStyle = '#ffffff'; g.fillRect(0, h * 0.34, w, h * 0.32);
    g.strokeStyle = '#ffffff'; g.lineWidth = h * 0.34; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.45, h / 2); g.lineTo(0, h); g.stroke();
    g.strokeStyle = '#007749'; g.lineWidth = h * 0.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.45, h / 2); g.lineTo(0, h); g.moveTo(w * 0.45, h / 2); g.lineTo(w, h / 2); g.stroke();
    g.fillStyle = '#000000'; g.beginPath(); g.moveTo(0, h * 0.2); g.lineTo(w * 0.27, h / 2); g.lineTo(0, h * 0.8); g.closePath(); g.fill();
  } },
};

// A flag drawn into a canvas of this size.
export function flagCanvas(id, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  (FLAGS[id] || FLAGS.jp).draw(c.getContext('2d'), w, h);
  return c;
}
