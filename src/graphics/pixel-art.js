// Turns a vector picture (SVG) into a small bitmap, so it can be shown
// stretched with square pixels like the rest of the interface (the touch
// pedals, the handbrake). `scale` is bitmap pixels per SVG unit.

export function pixelSvg(svg, scale = 1) {
  const vb = /viewBox="([\d.\s-]+)"/.exec(svg)[1].split(/\s+/).map(Number);
  const w = Math.max(1, Math.round(vb[2] * scale)), h = Math.max(1, Math.round(vb[3] * scale));
  const src = svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL());
    };
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
  });
}
