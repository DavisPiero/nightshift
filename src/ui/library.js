// The asset library page (?library): every prop a track can place, one at a
// time, turning on a patch of tarmac under the game's own night light and
// renderer. A list on the left, the asset's details on the right. Drag to
// turn it, scroll to zoom, arrow keys to step through the list.
// ?library&asset=<id> opens on one asset.

import * as THREE from 'three';
import { GRAPHICS } from '../core/config.js';
import { RetroRenderer } from '../graphics/renderer.js';
import { Reflections } from '../graphics/reflections.js';
import { Tex } from '../graphics/textures.js';
import { ASSETS, libraryGroups, previewAsset } from '../world/assets.js';

const $ = (sel) => document.querySelector(sel);

export function startLibrary(flags) {
  const renderer = new RetroRenderer($('#view'));
  renderer.configure({ ...GRAPHICS.medium, shadows: false });
  window.addEventListener('resize', () => renderer.resize());

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1012, 25, 220);
  scene.background = scene.fog.color;
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 400);
  const sky = new THREE.HemisphereLight(0x3a4a58, 0x141810, 1.3);
  scene.add(sky);
  const moon = new THREE.DirectionalLight(0x8090b0, 0.35);
  moon.position.set(-40, 80, -30);
  scene.add(moon);
  const lights = [];
  for (let i = 0; i < 4; i++) {
    const l = new THREE.PointLight(0xffa04a, 150, 30, 1.6);
    scene.add(l);
    lights.push(l);
  }
  // A patch of tarmac to stand on.
  const tex = Tex.asphalt().clone();
  tex.repeat.set(20, 20);
  tex.needsUpdate = true;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshLambertMaterial({ map: tex }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  scene.add(ground);
  const reflections = new Reflections();
  scene.environment = reflections.texture;

  // The list, grouped.
  const list = $('#library-list');
  const ids = [];
  for (const [group, members] of libraryGroups()) {
    const h = document.createElement('h3');
    h.className = 'grp';
    h.textContent = group;
    list.appendChild(h);
    for (const id of members) {
      const a = ASSETS[id];
      const b = document.createElement('button');
      b.className = 'btn item opt';
      b.dataset.asset = id;
      b.innerHTML = `<span class="txt"><span class="name">${a.name}</span><span class="jp">${a.jp || ''}</span></span><span class="meta">${id}</span>`;
      b.addEventListener('click', () => show(id));
      list.appendChild(b);
      ids.push(id);
    }
  }

  let current = null, radius = 5, centre = new THREE.Vector3(), turn = 0.55, tilt = 0.32, zoom = 1, dragging = null;
  function show(id) {
    if (!ASSETS[id]) id = ids[0];
    if (current) {
      scene.remove(current.group);
      current.group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    }
    current = { id, ...previewAsset(id) };
    scene.add(current.group);
    reflections.setWorld({ reflect: current.reflect, look: { reflectBg: 0x0b1012 } });
    // Frame what is solid (not the light pools or halos).
    const box = new THREE.Box3();
    let tris = 0, calls = 0;
    current.group.traverse((o) => {
      if (!o.isMesh) return;
      calls++;
      const g = o.geometry;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      if (!o.material.transparent || o.material.alphaTest) box.expandByObject(o);
    });
    if (box.isEmpty()) box.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1));
    box.getCenter(centre);
    radius = Math.max(1.2, box.getSize(new THREE.Vector3()).length() / 2);
    zoom = 1;
    current.lamps.forEach((p, i) => { if (lights[i]) lights[i].position.copy(p); });
    lights.forEach((l, i) => { l.visible = i < current.lamps.length; });
    for (const b of list.querySelectorAll('.item')) b.classList.toggle('on', b.dataset.asset === id);
    list.querySelector('.item.on')?.scrollIntoView({ block: 'nearest' });
    const a = ASSETS[id];
    const size = box.getSize(new THREE.Vector3());
    const kind = a.block ? 'Any size (recipe)' : a.object ? 'Whole object, baked' : 'Kit, instanced';
    $('#library-info').innerHTML = `<div class="ttl"><span>Asset</span><span class="jp">素材</span></div>`
      + `<div class="info-name"><span class="name">${a.name}</span><span class="jp">${a.jp || ''}</span></div>`
      + (a.note ? `<p class="muted small">${a.note}</p>` : '')
      + `<dl><dt>Name</dt><dd>${id}</dd><dt>Group</dt><dd>${a.group}</dd><dt>Kind</dt><dd>${kind}</dd>`
      + `<dt>Size</dt><dd>${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} m</dd>`
      + `<dt>Pieces</dt><dd>${calls} (${Math.round(tris)} triangles)</dd>`
      + `<dt>Lights</dt><dd>${current.lamps.length ? current.lamps.length + ' real' : 'none'}, ${current.glows.reduce((n, g) => n + g.geometry.attributes.position.count, 0)} halos</dd></dl>`;
    history.replaceState(null, '', `?library&asset=${id}`);
  }

  // Drag to turn, wheel to zoom, arrows to step through the list.
  const view = $('#view');
  view.addEventListener('pointerdown', (e) => { dragging = [e.clientX, e.clientY, turn, tilt]; view.setPointerCapture(e.pointerId); });
  view.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    turn = dragging[2] - (e.clientX - dragging[0]) * 0.01;
    tilt = Math.max(0.02, Math.min(1.3, dragging[3] + (e.clientY - dragging[1]) * 0.006));
  });
  view.addEventListener('pointerup', () => { dragging = null; });
  view.addEventListener('wheel', (e) => { zoom = Math.max(0.35, Math.min(3, zoom * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: true });
  // L: a work light, to see dark pieces properly (the game's night is dim).
  let work = !!flags.worklight;
  const setWork = () => { sky.intensity = work ? 5 : 1.3; sky.color.setHex(work ? 0x9aa8b8 : 0x3a4a58); };
  setWork();
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyL') { work = !work; setWork(); return; }
    if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp') return;
    e.preventDefault();
    const i = ids.indexOf(current.id) + (e.code === 'ArrowDown' ? 1 : -1);
    show(ids[(i + ids.length) % ids.length]);
  });

  $('#scr-library').hidden = false;
  $('#scr-library').classList.add('in');
  show(flags.asset || ids[0]);

  let last = performance.now();
  const frame = () => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!dragging && !flags.shot) turn += dt * 0.15;
    // Sit the asset left of centre-right, clear of the two panels.
    const d = radius * 3.6 * zoom;
    camera.position.set(centre.x + Math.sin(turn) * Math.cos(tilt) * d, centre.y + Math.sin(tilt) * d, centre.z + Math.cos(turn) * Math.cos(tilt) * d);
    camera.lookAt(centre);
    reflections.update(renderer.gl, centre.x, Math.max(0.9, centre.y), centre.z);
    renderer.render(scene, camera);
  };
  if (flags.shot) setInterval(frame, 33); // headless screenshots have no animation frames
  else renderer.gl.setAnimationLoop(frame);
}
