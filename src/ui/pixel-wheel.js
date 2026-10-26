// The loading wheel, drawn with chunky pixels. A plain script (not a
// module) so the start-up screen has it before the game's code loads.
//
// The wheel in index.html is a vector picture with three layers: the tyre
// (spins), the pink brake caliper (still) and the rim (spins). Each layer is
// turned into a picture once; every frame they are drawn, turned, into a
// small canvas that is shown stretched with square pixels.
// PixelWheel.mount(el) puts a spinning wheel inside `el`.
(function () {
  const RES = 56; // canvas pixels across
  const svg = document.querySelector('#boot .wheel-art');
  if (!svg) return;
  const layers = [];
  const ser = new XMLSerializer();
  const parts = [...svg.children].filter((c) => c.tagName !== 'defs');
  parts.forEach((part, i) => {
    const copy = svg.cloneNode(true);
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', RES * 2); copy.setAttribute('height', RES * 2);
    [...copy.children].filter((c) => c.tagName !== 'defs').forEach((c, j) => { if (j !== i) c.remove(); });
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ser.serializeToString(copy));
    layers.push({ img, spin: part.classList.contains('spin') });
  });

  const wheels = [];
  let running = false;
  function frame(now) {
    let any = false;
    for (const w of wheels) {
      if (!w.c.isConnected || !w.c.offsetParent) continue;
      any = true;
      const g = w.g;
      g.clearRect(0, 0, RES, RES);
      // Turn in steps of 9 degrees: quick, but jerky like an old console.
      const a = Math.floor(now / 1000 * 2 * 40) / 40 * Math.PI * 2;
      for (const l of layers) {
        if (!l.img.complete || !l.img.naturalWidth) continue;
        g.save();
        g.translate(RES / 2, RES / 2);
        if (l.spin) g.rotate(a);
        g.drawImage(l.img, -RES / 2, -RES / 2, RES, RES);
        g.restore();
      }
    }
    running = any;
    if (any) requestAnimationFrame(frame);
  }
  function wake() { if (!running) { running = true; requestAnimationFrame(frame); } }

  window.PixelWheel = {
    mount(el) {
      const c = document.createElement('canvas');
      c.width = c.height = RES;
      c.className = 'wheel-art pixel';
      el.prepend(c);
      wheels.push({ c, g: c.getContext('2d') });
      wake();
      return c;
    },
    wake,
  };
  // The start-up screen's own wheel.
  const boot = window.PixelWheel.mount(svg.parentNode);
  svg.style.display = 'none';
  boot.setAttribute('aria-hidden', 'true');
}());
