// Far scenery baked into the sky. Everything too far away to move as you drive
// (the city, the ranges and the valley lights) is drawn once into a cube and
// then shown as part of the sky dome: any amount of detail for the cost of one
// mesh, and it melts into the horizon like the sky does. It is baked again when
// the time of day changes; weather only changes the haze in front of it.

import * as THREE from 'three';

const VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */`
uniform samplerCube map;
uniform vec3 hazeColor;
uniform float haze;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec4 c = textureCube(map, d);
  float band = 1.0 - smoothstep(0.02, 0.34, d.y);
  gl_FragColor = vec4(mix(c.rgb, hazeColor * c.a, haze * band), c.a);
}`;

export class FarBake {
  // far: a group holding the far scenery. centre: where it is seen from.
  constructor(far, centre, size = 1024) {
    this.scene = new THREE.Scene();
    this.scene.add(far);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.scene.add(this.hemi, this.sun);
    this.scene.fog = new THREE.Fog(0, 500, 3400);
    this.target = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    this.camera = new THREE.CubeCamera(5, 6000, this.target);
    this.camera.position.set(...centre);
    this.scene.add(this.camera);
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.target.texture }, hazeColor: { value: new THREE.Color(0) }, haze: { value: 0.1 } },
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, premultipliedAlpha: true, // not transparent: it must draw before the world
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(880, 32, 16), this.material);
    this.mesh.renderOrder = -10;
    this.mesh.frustumCulled = false;
    this.far = far;
  }

  // look: the track's look at this time of day (time-of-day.js).
  bake(gl, look) {
    const clear = new THREE.Color(), alpha = gl.getClearAlpha();
    gl.getClearColor(clear);
    gl.setClearColor(0x000000, 0);
    this.hemi.color.setHex(look.hemi[0]); this.hemi.groundColor.setHex(look.hemi[1]); this.hemi.intensity = look.hemi[2] ?? 1;
    this.sun.color.setHex(look.sun.colour); this.sun.intensity = look.sun.power;
    this.sun.position.set(...look.sun.dir);
    this.scene.fog.color.setHex(look.fog.clear);
    this.camera.update(gl, this.scene);
    gl.setClearColor(clear, alpha);
    this.baseHaze = look.time === 'night' ? 0.12 : 0.42;
  }

  // Rain and snow thicken what is in front of the far scenery.
  setHaze(color, weather) {
    this.material.uniforms.hazeColor.value.copy(color);
    this.material.uniforms.haze.value = weather === 'rain' || weather === 'snow' ? 0.85 : this.baseHaze ?? 0.12;
  }

  dispose() {
    this.target.dispose();
    this.far.traverse((o) => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) m.dispose(); });
  }
}
