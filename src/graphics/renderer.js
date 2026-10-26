// Draws the scene at a low internal resolution, then one full-screen pass
// adds the colour grade, ordered dithering and a slight vignette before the
// image is stretched to the window with chunky (nearest) pixels. On High a
// glow (bloom) is added first: the brightest parts of the image, blurred at
// a quarter size, laid back over it, so lamps, neon and tail lights bleed
// light like they do on film.

import * as THREE from 'three';

const POST_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const POST_FRAG = /* glsl */`
uniform sampler2D tScene, tBloom;
uniform vec2 resolution;
uniform float dither, bloom;
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
  c += texture2D(tBloom, vUv).rgb * bloom;
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
      uniforms: { tScene: { value: this.target.texture }, resolution: { value: new THREE.Vector2() }, dither: { value: 1 } },
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
