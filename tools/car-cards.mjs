// The pictures on the car cards: every car from one camera, in one light, on no
// background, baked to the same small palette. Saves assets/cars/cards/<id>.png.
// Re-run after adding a car or changing its stock look.
//   node tools/car-cards.mjs [car-id]

import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BAKE } from './pixel-bake.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IDS = process.argv[2] ? [process.argv[2]] : ['impreza-gc8', 'skyliner-r34', 'challenjer-srt8', 'mustank-gt500', 'countach-qv'];
const js = `(()=>{${BAKE}
  const g=nightshift;
  document.querySelectorAll('.screen,#hud,#wallet').forEach((e)=>{e.style.display='none';});
  const s=g.garage.scene;
  s.traverse((o)=>{ if(o.isMesh||o.isSprite){ let p=o,mine=false; while(p){ if(p===g.model.root) mine=true; p=p.parent; } if(!mine) o.visible=false; } if(o.isLight) o.intensity*=2.2; if(o.isHemisphereLight) o.intensity=3; });
  s.background=null; s.fog=null;
  g.fixedTurn=0; g.orbit={yaw:0.62,pitch:0.14,dist:3.75};
  g.model.setLights(false);
  return new Promise((res)=>setTimeout(()=>{
    for(let i=0;i<20;i++) g.render(0.05);
    g.loop.stop?.();
    const W=360,H=180, gl=g.renderer.gl, cam=g.camera;
    const rt=new g.renderer.target.constructor(W,H,{depthBuffer:true});
    g.garageCamera(0); cam.clearViewOffset(); cam.aspect=W/H; cam.updateProjectionMatrix();
    g.model.root.rotation.y=0; s.updateMatrixWorld(true);
    gl.setRenderTarget(rt); gl.setClearColor(0,0); gl.clear(); gl.render(s,cam);
    const px=new Uint8Array(W*H*4); gl.readRenderTargetPixels(rt,0,0,W,H,px); gl.setRenderTarget(null);
    const c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d'), im=x.createImageData(W,H);
    for(let y=0;y<H;y++) im.data.set(px.subarray((H-1-y)*W*4,(H-y)*W*4),y*W*4);
    x.putImageData(im,0,0);
    res(bake(c,{colours:40,dither:0.25,gamma:0.55,sat:1.2}));
  },2500));
})()`;
const jobs = IDS.map((id) => ({ q: `screen=garage&car=${id}`, out: join(ROOT, 'review/card-last.png'), wait: 6, size: '640x340', js, saveData: join(ROOT, `assets/cars/cards/${id}.png`), after: 0.2 }));
console.log(execFileSync('node', [join(ROOT, 'tools/shot.mjs'), JSON.stringify(jobs)], { encoding: 'utf8' }).split('\n').filter((l) => !l.startsWith('saved')).join('\n'));
