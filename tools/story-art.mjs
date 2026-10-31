// The story art in assets/story/. Backgrounds are real scenes from the game,
// drawn small (480x270) and baked to a tight palette; the contract and the last
// picture, and the faces, are painted here in code. Re-run after changing a
// track, or to change a face.
//   node tools/story-art.mjs          everything
//   node tools/story-art.mjs faces    just the painted pictures and faces

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BAKE } from './pixel-bake.mjs';
import { PAINT } from './story-paint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets/story');
const only = process.argv[2];

const scene = (setup, over = '') => `(()=>{${BAKE}
  const g=nightshift;
  document.querySelectorAll('.screen,#hud,#wallet,#touch').forEach((e)=>{e.style.display='none';});
  ${setup}
  return new Promise((res)=>setTimeout(()=>{
    g.save.settings.graphics='high'; g.applyGraphics();
    g.renderer.renderHeight=270; g.renderer.width=0; g.renderer.resize();
    setTimeout(()=>{ for(let i=0;i<4;i++) g.render(0.03);
      const c=document.createElement('canvas'); c.width=g.renderer.canvas.width; c.height=g.renderer.canvas.height;
      const x=c.getContext('2d'); x.drawImage(g.renderer.canvas,0,0); ${over}
      res(bake(c,{colours:64,dither:0.7,sat:1.3,gamma:0.8})); },900);
  },1500));
})()`;

const SHOTS = {
  // The harbor's cranes, painted against the sky: two gantries and a container.
  docks: { q: 'screen=tracks&track=starter&time=dawn', setup: 'g.flyIndex=20;', over: `
    const crane=(cx,k)=>{ x.fillStyle='#0a0c14'; const b=(a,y,w,h)=>x.fillRect(cx+a*k,y*k+40,w*k,h*k);
      b(-30,10,6,90); b(30,10,6,90); b(-70,0,180,6); b(-30,-30,4,32); b(32,-30,4,32); b(-30,-32,66,4); b(-10,6,1.5,34); b(-22,38,26,12);
      for(let i=-30;i<30;i+=10){ x.fillRect(cx+i*k,(60+((i+30)/10)%2*14)*k+40,16*k,1.5*k); } };
    crane(120,0.9); crane(310,0.62); crane(420,0.45);
  ` },
  tokyo: { q: 'screen=tracks&track=underground', setup: 'g.flyIndex=420;' },
  ring: { q: 'screen=tracks&track=parabolica&time=sunset', setup: 'g.flyIndex=40;' },
  garage: { q: 'screen=garage&car=impreza-gc8', setup: 'g.fixedTurn=2.3;g.orbit={yaw:0.5,pitch:0.1,dist:5.2};' },
  grid: { q: 'device=computer&race&track=starter&weather=rain&mute', setup: 'g.save.settings.camera="chase";' },
};

const jobs = [];
if (only !== 'faces') for (const [id, s] of Object.entries(SHOTS)) {
  jobs.push({ q: s.q, out: join(ROOT, 'review/story-last.png'), wait: 6, size: '960x540', js: scene(s.setup, s.over), saveData: join(OUT, `${id}.png`), after: 0.2 });
}
mkdirSync(join(ROOT, 'review'), { recursive: true });
writeFileSync(join(ROOT, 'review/blank.html'), '<!doctype html><body>');
const painted = { contract: 0, tbc: 0, 'face-johnny': 0, 'face-johnny-blink': 1, 'face-max': 0, 'face-max-blink': 1, 'face-aoi': 0, 'face-aoi-blink': 1 };
for (const [id, blink] of Object.entries(painted)) {
  jobs.push({ page: 'review/blank.html', out: join(ROOT, 'review/story-last.png'), wait: 0.1, js: `(()=>{${BAKE}${PAINT}return paint(${JSON.stringify(id)},${!!blink});})()`, saveData: join(OUT, `${id}.png`), after: 0.1 });
}
console.log(execFileSync('node', [join(ROOT, 'tools/shot.mjs'), JSON.stringify(jobs)], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n').filter((l) => !l.startsWith('saved')).join('\n'));
