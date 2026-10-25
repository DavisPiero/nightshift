// Building blocks shared by every track's scenery: strips and walls that
// follow the centre line, merging many small pieces into one mesh, and
// instancing. Each track's look lives in its own file and uses these.

import * as THREE from 'three';

export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// A flat strip following the track between two offsets from the centre line.
export function strip(track, inner, outer, y, { step = 2, uScale = 1, vScale = 1, from = 0, to = track.count, closed = true } = {}) {
  const pos = [], uv = [], idx = [];
  let n = 0;
  const last = closed && from === 0 && to === track.count ? to : to - 1;
  for (let k = from; k <= last; k += step) {
    const i = track.wrap(k);
    const lx = track.leftX(i), lz = track.leftZ(i);
    const d = k; // metres travelled (1 sample per metre)
    pos.push(track.x[i] + lx * inner, y, track.z[i] + lz * inner);
    pos.push(track.x[i] + lx * outer, y, track.z[i] + lz * outer);
    uv.push(0, d * vScale, (outer - inner) * uScale, d * vScale);
    if (n > 0) {
      const a = (n - 1) * 2, b = n * 2;
      // Wind so the face points up whichever side of the centre line it is on.
      if (outer > inner) idx.push(a, b + 1, a + 1, a, b, b + 1);
      else idx.push(a, a + 1, b + 1, a, b + 1, b);
    }
    n++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Join several small geometries (same attributes) into one, to save draw calls.
export function merge(geos) {
  const pos = [], uv = [], idx = [];
  let base = 0;
  for (const g of geos) {
    pos.push(...g.attributes.position.array);
    uv.push(...g.attributes.uv.array);
    for (const i of g.index.array) idx.push(i + base);
    base += g.attributes.position.count;
    g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  m.setIndex(idx);
  m.computeVertexNormals();
  return m;
}

// A vertical band following the track at one offset (barriers, fences).
export function wallStrip(track, offset, y0, y1, step = 4, uScale = 0.5, facingIn = true) {
  const pos = [], uv = [], idx = [];
  let n = 0;
  for (let k = 0; k <= track.count; k += step) {
    const i = track.wrap(k);
    const x = track.x[i] + track.leftX(i) * offset, z = track.z[i] + track.leftZ(i) * offset;
    pos.push(x, y0, z, x, y1, z);
    uv.push(k * uScale, 0, k * uScale, (y1 - y0) * uScale);
    if (n > 0) {
      const a = (n - 1) * 2, b = n * 2;
      const inward = (offset > 0) === facingIn;
      if (inward) idx.push(a, b, b + 1, a, b + 1, a + 1); else idx.push(a, b + 1, b, a, a + 1, b + 1);
    }
    n++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A geometry placed in the world, ready to merge.
export function placed(geo, x, y, z, rotY = 0, rotX = 0) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, 0, 'YXZ')), new THREE.Vector3(1, 1, 1));
  return geo.applyMatrix4(m);
}

// One instanced mesh from a list of [x, y, z, rotY, sx, sy, sz] (and colours).
export function instanced(geo, mat, list, colours) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  mesh.count = list.length;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  list.forEach(([x, y, z, ry = 0, sx = 1, sy = 1, sz = 1], i) => {
    e.set(0, ry, 0); q.setFromEuler(e); p.set(x, y, z); sc.set(sx, sy, sz);
    mesh.setMatrixAt(i, m4.compose(p, q, sc));
    if (colours) mesh.setColorAt(i, new THREE.Color(colours[i]));
  });
  return mesh;
}
