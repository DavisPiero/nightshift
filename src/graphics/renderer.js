// Draws the scene at a low internal resolution, then one full-screen pass
// adds the colour grade, ordered dithering and a slight vignette before the
// image is stretched to the window with chunky (nearest) pixels.

import * as THREE from 'three';

const POST_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const POST_FRAG = /* glsl */`
uniform sampler2D tScene;
uniform vec2 resolution;
uniform float dither;
varying vec2 vUv;

float bayer4(vec2 p) {
  int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
  int i = x + y * 4;
  float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0 - 0.47;
  return 0.0;
}

void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  // Linear to display.
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  // Grade: green-teal shadows, warm highlights, a touch of extra contrast.
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c += vec3(-0.012, 0.010, 0.006) * (1.0 - l);
  c *= mix(vec3(0.96, 1.0, 0.97), vec3(1.05, 1.0, 0.9), smoothstep(0.35, 0.9, l));
  c = (c - 0.5) * 1.06 + 0.5;
  // Vignette.
  vec2 d = vUv - 0.5;
  c *= 1.0 - dot(d, d) * 0.55;
  // Ordered dither, then reduce to 6 bits per channel like old hardware.
  c += bayer4(gl_FragCoord.xy) * dither / 64.0;
  c = floor(c * 63.0 + 0.5) / 63.0;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export class RetroRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(1);
    this.gl.info.autoReset = false; // count the whole frame (scene + post), for the debug panel
    this.gl.shadowMap.enabled = false;
    this.gl.shadowMap.type = THREE.BasicShadowMap;
    this.target = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: true });
    this.target.texture.minFilter = THREE.NearestFilter;
    this.target.texture.magFilter = THREE.NearestFilter;
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.post = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: this.target.texture }, resolution: { value: new THREE.Vector2() }, dither: { value: 1 } },
      vertexShader: POST_VERT, fragmentShader: POST_FRAG, depthTest: false, depthWrite: false,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
    this.renderHeight = 480;
    this.width = 0; this.height = 0;
  }

  configure(preset) {
    this.renderHeight = preset.renderHeight;
    this.gl.shadowMap.enabled = preset.shadows;
    this.post.uniforms.dither.value = preset.dither ? 1 : 0;
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return; // hidden or not laid out yet; the next resize fixes it
    // Never render above the screen's real pixel count.
    const rh = Math.min(this.renderHeight, Math.round(h * Math.min(window.devicePixelRatio || 1, 2)));
    const rw = Math.round(rh * w / h);
    if (rw === this.width && rh === this.height) return;
    this.width = rw; this.height = rh;
    this.gl.setSize(rw, rh, false);
    this.target.setSize(rw, rh);
    this.post.uniforms.resolution.value.set(rw, rh);
  }

  render(scene, camera) {
    this.gl.info.reset();
    camera.aspect = this.width / this.height;
    camera.updateProjectionMatrix();
    this.gl.setRenderTarget(this.target);
    this.gl.render(scene, camera);
    this.gl.setRenderTarget(null);
    this.gl.render(this.postScene, this.postCam);
  }
}
