// One picture of a car from eight sides, under bright work lights, to judge
// its shape. Saves the shots to review/turn/ (git-ignored) plus a contact sheet.
//   node tools/turnaround.mjs gtar-r35            all eight sides
//   node tools/turnaround.mjs gtar-r35 "red"      with a name on the file
//   node tools/turnaround.mjs cockpit gtar-r35    from the driver's seat

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'review/turn');
mkdirSync(OUT, { recursive: true });
const cockpit = process.argv[2] === 'cockpit';
const car = process.argv[cockpit ? 3 : 2] || 'gtar-r35', tag = process.argv[cockpit ? 4 : 3] || '';
const SIDES = [[0.6, 'front 3/4'], [0, 'front'], [-0.75, 'other 3/4'], [Math.PI / 2, 'side'], [2.5, 'rear 3/4'], [Math.PI, 'rear'], [-2.4, 'rear other'], [0.9, 'high']];
const bright = `(()=>{const g=nightshift;g.fixedTurn=0;document.querySelectorAll('.screen,#hud').forEach((e)=>{e.style.display='none';});
  g.scene?.traverse?.((o)=>{if(o.isLight){o.intensity*=1.7;}});
  const w=g.world?.scene||g.garage?.scene;w?.traverse?.((o)=>{if(o.isHemisphereLight)o.intensity=2.4;});
  g.orbitDrag(0,0);`;
let jobs;
if (cockpit) {
  jobs = [{ q: `device=computer&car=${car}&track=starter&time=dawn`, out: join(OUT, `${car}${tag}-cockpit.png`), wait: 7, size: '1280x720', js: `(()=>{const g=nightshift;if(g.cameras.mode!=='cockpit')g.nextCamera();if(g.cameras.mode!=='cockpit')g.nextCamera();return g.cameras.mode;})()`, after: 2 }];
} else {
  jobs = SIDES.map(([yaw, name], i) => ({ q: `screen=garage&car=${car}`, out: join(OUT, `${car}${tag}-${i}.png`), wait: i ? 2 : 4, size: '960x540',
    js: `${bright}nightshift.orbit={yaw:${yaw},pitch:${name === 'high' ? 0.8 : 0.1},dist:${name === 'high' ? 6 : 5.6}};return 1;})()` }));
}
execFileSync('node', [join(ROOT, 'tools/shot.mjs'), JSON.stringify(jobs)], { stdio: 'ignore' });
if (!cockpit) {
  const imgs = SIDES.map((_, i) => `<img src="${car}${tag}-${i}.png">`).join('');
  writeFileSync(join(OUT, 'sheet.html'), `<!doctype html><body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:338px;gap:2px">${imgs}<style>img{width:100%;display:block}</style>`);
  execFileSync('node', [join(ROOT, 'tools/shot.mjs'), JSON.stringify([{ page: 'review/turn/sheet.html', out: join(OUT, `${car}${tag}.png`), wait: 1, size: '1800x1020' }])], { stdio: 'ignore' });
}
console.log(join(OUT, `${car}${tag}${cockpit ? '-cockpit' : ''}.png`));
