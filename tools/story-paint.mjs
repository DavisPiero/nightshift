// The pictures painted in code for tools/story-art.mjs: three faces and two
// scenes. Hard flat shapes with dark outlines, then baked to a small palette.
// Runs in the page, so it is exported as text.

export const PAINT = String.raw`
window.paint = (id, blink) => {
  const face = id.startsWith('face');
  const W = face ? 170 : 480, H = face ? 200 : 270;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const INK = '#120e18';
  const P = (d, fill, ink = 0) => { const p = new Path2D(d); if (fill) { g.fillStyle = fill; g.fill(p); } if (ink) { g.strokeStyle = INK; g.lineWidth = ink; g.lineJoin = 'round'; g.stroke(p); } };
  const R = (x, y, w, h, f) => { g.fillStyle = f; g.fillRect(x, y, w, h); };
  const spots = (x0, y0, w, h, n, f, seed = 7) => { let s = seed; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; const x = x0 + s % w; s = (s * 16807) % 2147483647; const y = y0 + s % h; R(x, y, 1, 1, f); } };
  const clip = (d, fn) => { g.save(); g.clip(new Path2D(d)); fn(); g.restore(); };

  const HEAD = 'M56 62 C54 34 76 24 94 26 C114 28 122 46 120 66 C120 84 116 100 108 112 C102 122 92 128 84 128 C74 128 64 120 60 106 C57 94 56 78 56 62 Z';
  // A head turned a little to the right, lit from the right, with a cool edge
  // of neon on the left. o: skin colours and little differences between people.
  const head = (o) => {
    g.translate(84, 148); g.scale(1.1, 1.1); g.translate(-84, -134); // bigger than the shoulders: it's a face you are talking to
    P('M66 106 L62 150 Q84 164 108 148 L106 112 Z', o.skinD, 2);          // neck
    P('M52 72 C46 68 44 80 48 88 C50 94 56 94 58 90 Z', o.skin, 2);       // ear
    P('M52 76 C49 78 50 84 53 87', null); 
    P(HEAD, o.skin, 2.5);
    clip(HEAD, () => {
      P('M50 40 C56 90 60 110 90 132 L50 132 Z', o.skinD);                 // shadow side
      P('M50 50 C60 80 62 100 76 124 C66 116 58 100 56 80 Z', o.skinDD);
      P('M100 30 C116 40 118 60 116 82 C114 70 110 50 100 30 Z', o.skinL);  // the lit cheek and forehead
    });
    // Nose
    P('M96 72 C96 82 100 90 104 96 C100 100 94 100 91 97 C94 94 95 90 94 86', o.skinD);
    P('M97 74 C98 84 101 90 104 95', null);
    R(94, 96, 3, 1, o.skinDD); R(100, 96, 3, 1, o.skinDD);
    R(99, 84, 2, 7, o.skinL);
    // Eyes
    const eye = (x, y, w) => {
      if (blink) { R(x, y + 2, w, 2, INK); return; }
      P('M' + x + ' ' + (y + 3) + ' Q' + (x + w / 2) + ' ' + (y - 6) + ' ' + (x + w) + ' ' + (y + 2) + ' Q' + (x + w / 2) + ' ' + (y + 8) + ' ' + x + ' ' + (y + 3) + ' Z', '#f4f1e8', 1.4);
      R(x + w * 0.4, y - 2, 7, 8, o.eye);
      R(x + w * 0.4 + 2, y, 3, 4, INK);
      R(x + w * 0.4 + 4, y - 1, 2, 2, '#fff');
      R(x + w * 0.4, y - 3, 7, 1.5, INK);
    };
    eye(74, 70, 14); eye(102, 69, 13);
    // Brows
    P(o.browL, o.brow); P(o.browR, o.brow);
  };
  const rim = (d, col, w = 2) => { g.strokeStyle = col; g.lineWidth = w; g.stroke(new Path2D(d)); };

  if (id.startsWith('face-johnny')) {
    // Shoulders: navy work jacket, white tee, name patch.
    P('M2 200 C6 168 30 150 62 140 L108 140 C138 150 164 168 168 200 Z', '#1d2c4e', 2.5);
    P('M60 142 L84 186 L110 142 Q84 156 60 142 Z', '#e9e6dc', 2);
    P('M60 142 L38 150 L58 200 L80 200 L84 186 Z', '#2a3e6a', 2);
    P('M110 142 L134 150 L116 200 L92 200 L84 186 Z', '#2a3e6a', 2);
    P('M2 200 C6 168 30 150 40 148 L58 200 Z', '#142038');
    R(122, 172, 26, 12, '#d9d4c4'); R(122, 172, 26, 2, '#b02020'); R(125, 177, 20, 2, '#333');
    P('M22 176 L30 200 M146 164 L140 200', null);
    g.save();
    head({ skin: '#d6a074', skinD: '#ab7650', skinDD: '#7e5238', skinL: '#efc69a', eye: '#3a2618', brow: '#5a5560',
      browL: 'M72 62 Q80 56 90 62 L90 65 Q80 60 72 66 Z', browR: 'M100 62 Q108 56 118 60 L118 63 Q108 60 100 65 Z' });
    // Grey hair swept back, thin at the temples, grey at the sides.
    P('M52 72 C46 40 66 14 94 14 C120 14 130 36 124 66 C122 52 116 40 104 36 C92 40 80 38 72 36 C62 44 60 58 58 72 Z', '#57525e', 2.5);
    P('M60 34 C72 20 92 16 110 22 C96 22 76 26 66 38 Z', '#8d8896');
    P('M74 22 C86 18 100 18 112 24 C100 22 88 22 78 26 Z', '#b4b0ba');
    P('M52 72 C52 80 54 86 56 90 L60 82 L58 66 Z', '#a8a4ae');
    // Laughter lines, stubble, a warm crooked smile.
    R(70, 82, 12, 1, '#7e5238'); R(116, 80, 4, 1, '#7e5238'); R(66, 76, 5, 1, '#7e5238'); R(72, 50, 34, 1, '#ab7650'); R(76, 54, 26, 1, '#ab7650');
    P('M78 109 Q94 113 110 104 Q106 120 92 120 Q82 120 78 109 Z', '#5e2622', 1.6);
    P('M82 110 Q94 113 107 106 L105 110 Q94 115 84 113 Z', '#f4efe2');
    rim('M76 102 Q76 108 79 110', '#7e5238', 1.2); rim('M112 96 Q114 100 111 104', '#7e5238', 1.2);
    clip(HEAD, () => { spots(62, 100, 58, 28, 160, '#7a6a66'); });
    rim('M56 62 C56 78 57 94 60 106 C64 120 74 128 84 128', '#4ff0e0', 1.5);
    rim('M122 60 C120 84 116 100 108 112', '#ffa050', 1.5);
    g.restore();
    rim('M4 200 C8 170 30 152 60 142', '#4ff0e0', 1.5);
  } else if (id.startsWith('face-max')) {
    // Black race jacket with a pink stripe, collar up.
    P('M2 200 C6 170 30 152 62 142 L108 142 C138 152 164 170 168 200 Z', '#15151c', 2.5);
    P('M58 134 L44 158 L68 170 L84 150 Z', '#22222c', 2);
    P('M112 134 L126 158 L102 170 L84 150 Z', '#22222c', 2);
    P('M84 150 L80 200 L90 200 Z', '#3a3a48');
    P('M30 160 L22 200 L34 200 L42 156 Z', '#ff2e88'); P('M140 160 L148 200 L136 200 L128 156 Z', '#ff2e88');
    R(100, 176, 22, 9, '#ffe400'); R(103, 179, 16, 2, '#111');
    g.save();
    head({ skin: '#e8bd98', skinD: '#bd8a68', skinDD: '#8c6048', skinL: '#fbdcbc', eye: '#2f6fa8', brow: '#3a2a1c',
      browL: 'M72 66 L88 60 L90 64 L74 69 Z', browR: 'M100 62 L116 62 L118 65 L100 66 Z' });
    // Short sandy hair, sharp fringe.
    P('M54 70 C46 34 68 12 96 14 C124 14 132 40 122 66 L118 50 L108 54 L104 38 L92 50 L88 36 L76 48 L72 38 L62 54 Z', '#b98a3c', 2.5);
    P('M66 34 C76 20 96 16 112 24 L100 26 L96 34 L88 28 L80 38 L74 32 Z', '#e0b45c');
    P('M56 66 C50 46 58 30 70 22 C62 36 62 50 62 54 Z', '#8a6226');
    // The smirk, and a scar through the brow.
    P('M80 112 Q94 113 112 101 L113 105 Q98 120 81 115 Z', '#7a3530', 1.6);
    R(110, 60, 1, 7, '#bd8a68');
    rim('M56 62 C56 78 57 94 60 106 C64 120 74 128 84 128', '#ff2e88', 1.5);
    rim('M122 60 C120 84 116 100 108 112', '#ffe9b0', 1.5);
    g.restore();
    rim('M4 200 C8 172 30 154 60 144', '#ff2e88', 1.5);
  } else if (id.startsWith('face-aoi')) {
    // Grey suit, team lanyard, a headset, a clipboard held up.
    P('M2 200 C6 172 30 154 62 144 L108 144 C138 154 164 172 168 200 Z', '#3c424e', 2.5);
    P('M64 144 L84 180 L106 144 Q84 158 64 144 Z', '#efeee8', 2);
    P('M62 144 L46 160 L74 200 L84 180 Z', '#50586a', 2);
    P('M108 144 L124 160 L96 200 L84 180 Z', '#50586a', 2);
    rim('M70 148 L84 192 L100 148', '#ff2e88', 2);
    g.save();
    head({ skin: '#ecc8a8', skinD: '#c49876', skinDD: '#8e6a54', skinL: '#fce2c8', eye: '#201820', brow: '#15121a',
      browL: 'M72 65 Q80 61 90 64 L90 66 Q80 64 72 67 Z', browR: 'M100 64 Q108 60 118 63 L118 65 Q108 63 100 66 Z' });
    // Glasses.
    g.strokeStyle = INK; g.lineWidth = 2;
    g.strokeRect(71, 66, 20, 14); g.strokeRect(100, 65, 19, 14); R(91, 71, 9, 2, INK); 
    if (!blink) { R(74, 68, 5, 1, '#ffffff'); R(103, 67, 5, 1, '#ffffff'); }
    // A sharp black bob and a headset.
    P('M46 110 C36 50 56 12 94 12 C132 12 140 56 128 110 L114 112 C122 80 122 58 112 40 C96 46 74 44 64 38 C54 60 56 90 60 112 Z', '#16141c', 2.5);
    P('M66 24 C80 16 102 16 116 26 C102 20 82 22 70 30 Z', '#3a3650');
    rim('M42 74 C44 34 76 6 96 8 C128 8 138 46 132 76', '#c0c4cc', 3);
    R(36, 72, 10, 22, '#2a2a34'); R(36, 72, 10, 3, '#ff2e88');
    P('M42 94 Q46 112 76 112', null); rim('M42 94 Q48 112 80 110', '#2a2a34', 2);
    P('M88 111 Q100 113 110 109 Q100 118 90 114 Z', '#b0504e', 1.4);
    rim('M46 110 C36 60 50 22 80 14', '#4f8cff', 1.5);
    g.restore();
    rim('M4 200 C8 174 30 156 60 146', '#4f8cff', 1.5);
  } else if (id === 'contract') {
    const sky = g.createLinearGradient(0, 0, 0, 190);
    sky.addColorStop(0, '#0a0f2a'); sky.addColorStop(1, '#3a1a4a');
    R(0, 0, W, 190, sky);
    // The window: a city at night.
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let x = 0; x < W; x += 14 + rnd() * 18) {
      const h = 60 + rnd() * 110, w = 22 + rnd() * 30;
      R(x, 190 - h, w, h, '#0c1020');
      for (let y = 190 - h + 6; y < 186; y += 7) for (let wx = x + 4; wx < x + w - 4; wx += 6) if (rnd() < 0.4) R(wx, y, 3, 3, rnd() < 0.6 ? '#ffc060' : rnd() < 0.5 ? '#4ff0e0' : '#ff2e88');
    }
    R(0, 0, W, 8, '#14141e'); R(120, 0, 8, 190, '#14141e'); R(352, 0, 8, 190, '#14141e');
    R(0, 182, W, 10, '#14141e');
    // The desk.
    const desk = g.createLinearGradient(0, 192, 0, 270);
    desk.addColorStop(0, '#3a2418'); desk.addColorStop(1, '#1e120c');
    R(0, 192, W, 78, desk);
    for (let y = 196; y < 270; y += 11) R(0, y, W, 1, '#2a180e');
    // The contract, the pen, a car key.
    P('M180 262 L214 176 L340 176 L374 262 Z', '#efeadc', 2.5);
    P('M186 262 L218 180 L222 180 L194 262 Z', '#cfc8b6');
    g.font = 'bold 10px monospace'; g.fillStyle = '#111';
    g.fillText('GT3 DRIVER CONTRACT', 221, 192);
    for (let i = 0; i < 6; i++) { const y = 200 + i * 9, k = (y - 176) * 0.4; R(216 - k + 8, y, 126 + 2 * k - 16, 2, '#9a9484'); }
    R(236, 252, 90, 2, '#111');
    P('M366 214 L300 250 L296 256 L304 254 L370 218 Z', '#c0c4cc', 1.5);
    P('M366 214 L352 222 L356 226 L370 218 Z', '#ff2e88');
    P('M76 236 a14 11 0 1 0 28 0 a14 11 0 1 0 -28 0 Z', '#22222c', 2); R(102, 233, 34, 5, '#c0c4cc'); R(126, 238, 3, 5, '#c0c4cc'); R(133, 238, 3, 4, '#c0c4cc');
    const bake1 = bake(c, { colours: 48, dither: 0.5 });
    return bake1;
  } else {
    // To be continued: a road running to a low sun.
    const sky = g.createLinearGradient(0, 0, 0, 170);
    sky.addColorStop(0, '#06060f'); sky.addColorStop(0.6, '#2a0f3e'); sky.addColorStop(1, '#ff2e88');
    R(0, 0, W, 170, sky);
    g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(240, 170, 70, Math.PI, 0); g.fill();
    g.save(); g.beginPath(); g.arc(240, 170, 70, Math.PI, 0); g.clip();
    for (let i = 0; i < 6; i++) R(160, 118 + i * 9, 160, 2 + i, '#2a0f3e');
    g.restore();
    R(0, 170, W, 100, '#07050c');
    for (let i = 0; i < 12; i++) { const k = i / 11, y = 170 + 100 * k * k; R(0, y, W, 1, '#ff2e8866'); }
    for (let x = -14; x <= 14; x++) { g.strokeStyle = '#ff2e8866'; g.lineWidth = 1; g.beginPath(); g.moveTo(240 + x * 14, 170); g.lineTo(240 + x * 120, 270); g.stroke(); }
    return bake(c, { colours: 32, dither: 0.6 });
  }
  return bake(c, { colours: 28, dither: 0.15 });
};`;
