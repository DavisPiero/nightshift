// Draws the scene at a low internal resolution, then one full-screen pass
// adds the colour grade, a faint dither pattern and a slight vignette before the
// image is stretched to the window with chunky (nearest) pixels. On High a
// glow (bloom) is added first: the brightest parts of the image, blurred at
// a quarter size, laid back over it, so lamps, neon and tail lights bleed
// light like they do on film.

import * as THREE from 'three';
import { setSmoothTextures } from './textures.js';

const POST_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const POST_FRAG = /* glsl */`
uniform sampler2D tScene, tBloom;
uniform vec2 resolution;
uniform float dither, bloom, filmic, blurK, aberr;
uniform vec2 sunUv;
uniform float glare;
uniform vec3 glareCol;
varying vec2 vUv;

// How much of the sun is open sky (bright) rather than behind a building
// or the car's roof (dark): a few taps round where it is on screen.
float sunOpen() {
  vec2 px = 3.0 / resolution;
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 o = i == 0 ? vec2(0.0) : vec2(i == 1 ? 1.0 : i == 2 ? -1.0 : 0.0, i == 3 ? 1.0 : i == 4 ? -1.0 : 0.0);
    vec3 c = texture2D(tScene, clamp(sunUv + o * px, 0.001, 0.999)).rgb;
    s += max(c.r, max(c.g, c.b));
  }
  return smoothstep(0.42, 0.8, s / 5.0);
}

float bayer4(vec2 p) {
  int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
  int i = x + y * 4;
  float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0 - 0.47;
  return 0.0;
}

void main() {
  vec3 c;
  vec2 rd = vUv - 0.5;
  float edge = dot(rd, rd);
  if (blurK > 0.0 || aberr > 0.0) {
    // Speed blur: taps pulled toward the middle of the screen (stronger at the
    // edges, so the road ahead stays readable), with the red and blue
    // channels split a hair towards the corners.
    vec2 ab = rd * aberr * (0.0007 + edge * 0.0045);
    c = vec3(0.0);
    float n = blurK > 0.0 ? 7.0 : 1.0;
    for (int i = 0; i < 7; i++) {
      if (float(i) >= n) break;
      float t = float(i) / 6.0;
      vec2 uv = vUv - rd * blurK * 0.09 * t * (0.3 + edge * 3.0);
      c += vec3(texture2D(tScene, uv + ab).r, texture2D(tScene, uv).g, texture2D(tScene, uv - ab).b);
    }
    c /= n;
  } else c = texture2D(tScene, vUv).rgb;
  c += texture2D(tBloom, vUv).rgb * bloom;
  // Driving into a low sun: a hot core, a wide warm veil over everything,
  // a thin horizontal streak and a few faint lens ghosts across the screen.
  if (glare > 0.0) {
    float k = glare * sunOpen();
    vec2 asp = vec2(resolution.x / resolution.y, 1.0);
    vec2 d = (vUv - sunUv) * asp;
    float r = length(d);
    float g = exp(-r * 10.0) * 0.7 + exp(-r * 2.4) * 0.22 + exp(-abs(d.y) * 70.0) * exp(-abs(d.x) * 2.2) * 0.14;
    for (int i = 0; i < 3; i++) {
      float f = float(i) * 0.55 + 0.45;
      vec2 gp = 0.5 + (0.5 - sunUv) * f;
      float gr = length((vUv - gp) * asp);
      float size = 0.035 + float(i) * 0.02;
      g += (1.0 - smoothstep(size * 0.6, size, gr)) * 0.035;
    }
    c = mix(c, c * glareCol * 1.35, 0.12 * k);
    c += glareCol * g * k;
  }
  // Filmic tone mapping (ACES fit) for the realistic looks: bright lamps and
  // sun roll off to white instead of clipping.
  if (filmic > 0.0) {
    vec3 x = c * 0.9;
    c = mix(c, clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0), filmic);
  }
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
  // A faint ordered pattern, the same on all three channels. No rounding to
  // fewer bits: rounding each channel on its own broke soft glows (lamp
  // halos, tail-light spill) into pink and blue dots (David, twice).
  c += bayer4(gl_FragCoord.xy) * dither / 110.0;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

// Bloom: keep what is brighter than a threshold, then blur it one way and
// the other.
const BRIGHT_FRAG = /* glsl */`
uniform sampler2D tScene;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * smoothstep(0.55, 1.2, l), 1.0);
}`;
const BLUR_FRAG = /* glsl */`
uniform sampler2D tSrc;
uniform vec2 step;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
  c += (texture2D(tSrc, vUv + step * 1.38).rgb + texture2D(tSrc, vUv - step * 1.38).rgb) * 0.316;
  c += (texture2D(tSrc, vUv + step * 3.23).rgb + texture2D(tSrc, vUv - step * 3.23).rgb) * 0.07;
  gl_FragColor = vec4(c, 1.0);
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
      uniforms: {
        tScene: { value: this.target.texture }, resolution: { value: new THREE.Vector2() }, dither: { value: 1 }, filmic: { value: 0 }, blurK: { value: 0 }, aberr: { value: 0 },
        sunUv: { value: new THREE.Vector2() }, glare: { value: 0 }, glareCol: { value: new THREE.Color() },
      },
      vertexShader: POST_VERT, fragmentShader: POST_FRAG, depthTest: false, depthWrite: false,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
    const soft = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.bloomA = new THREE.WebGLRenderTarget(4, 4, soft);
    this.bloomB = new THREE.WebGLRenderTarget(4, 4, soft);
    this.bright = new THREE.ShaderMaterial({ uniforms: { tScene: { value: this.target.texture } }, vertexShader: POST_VERT, fragmentShader: BRIGHT_FRAG, depthTest: false, depthWrite: false });
    this.blur = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, step: { value: new THREE.Vector2() } }, vertexShader: POST_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bright);
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.post.uniforms.tBloom = { value: this.bloomA.texture };
    this.post.uniforms.bloom = { value: 0 };
    this.bloomOn = false;
    this.renderHeight = 480;
    this.width = 0; this.height = 0;
  }

  configure(preset) {
    this.renderHeight = preset.renderHeight;
    const smooth = !!preset.smooth;
    const f = smooth ? THREE.LinearFilter : THREE.NearestFilter;
    this.target.texture.minFilter = f; this.target.texture.magFilter = f;
    this.target.samples = smooth ? 4 : 0;
    this.target.texture.needsUpdate = true;
    this.post.uniforms.filmic.value = smooth ? 1 : 0;
    this.lens = smooth;
    setSmoothTextures(smooth);
    this.canvas.style.imageRendering = smooth ? 'auto' : 'pixelated';
    this.gl.shadowMap.enabled = preset.shadows;
    this.post.uniforms.dither.value = preset.dither ? 1 : 0;
    this.bloomOn = !!preset.bloom;
    this.post.uniforms.bloom.value = this.bloomOn ? 0.9 : 0;
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
    const bw = Math.max(1, Math.round(rw / 4)), bh = Math.max(1, Math.round(rh / 4));
    this.bloomA.setSize(bw, bh); this.bloomB.setSize(bw, bh);
    this.blurStep = [1 / bw, 1 / bh];
  }

  // Speed blur and lens fringing (realistic looks only). `blur`
  // 0..1 is how fast the car is going; each effect has its own switch.
  setLens({ blur = 0, aberration = false }) {
    const u = this.post.uniforms;
    u.blurK.value = this.lens ? blur : 0;
    u.aberr.value = this.lens && aberration ? 1 : 0;
  }

  // The low sun's glare: where it is on screen (0..1), how strong, its colour.
  setGlare(x, y, amount, colour) {
    const u = this.post.uniforms;
    u.sunUv.value.set(x, y);
    u.glare.value = amount;
    if (colour !== undefined) u.glareCol.value.setHex(colour).convertSRGBToLinear();
  }

  render(scene, camera) {
    this.gl.info.reset();
    camera.aspect = this.width / this.height;
    camera.updateProjectionMatrix();
    this.gl.setRenderTarget(this.target);
    this.gl.render(scene, camera);
    if (this.bloomOn) {
      const pass = (mat, out) => { this.quad.material = mat; this.gl.setRenderTarget(out); this.gl.render(this.quadScene, this.postCam); };
      pass(this.bright, this.bloomA);
      for (const [src, out, dx, dy] of [[this.bloomA, this.bloomB, 1, 0], [this.bloomB, this.bloomA, 0, 1], [this.bloomA, this.bloomB, 2, 0], [this.bloomB, this.bloomA, 0, 2]]) {
        this.blur.uniforms.tSrc.value = src.texture;
        this.blur.uniforms.step.value.set(dx * this.blurStep[0], dy * this.blurStep[1]);
        pass(this.blur, out);
      }
    }
    this.gl.setRenderTarget(null);
    this.gl.render(this.postScene, this.postCam);
  }
}
