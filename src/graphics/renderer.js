// Draws the scene, then one full-screen pass adds the colour grade, a faint
// dither pattern and a slight vignette. The realistic looks draw into a
// brighter-than-white image, so a lamp can really outshine the wall behind it.
// Their glow (bloom) is the bright parts of that image spread by a real lens
// response: on High an actual convolution (the image and the lens's response
// are multiplied in the frequency domain, FFT passes below), on Medium a chain
// of shrinking blurs weighted to match. The same light catches the lens: dirt
// on the glass and faint blue reflections.

import * as THREE from 'three';
import { setSmoothTextures } from './textures.js';

const POST_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const POST_FRAG = /* glsl */`
uniform sampler2D tScene, tBloom, tFft, tGhost, tDirt, tMask;
uniform vec2 resolution;
uniform float dither, bloom, fft, filmic, blurK, aberr, lensK, maskOn;
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
  // In the cockpit the cabin stays sharp: only what is seen out of the glass
  // blurs, and no tap may pull the dashboard into the view outside.
  float inCabin = maskOn > 0.0 ? step(0.5, texture2D(tMask, vUv).r) : 0.0;
  if ((blurK > 0.0 || aberr > 0.0) && inCabin < 0.5) {
    // Speed blur: taps pulled toward the middle of the screen (stronger at the
    // edges, so the road ahead stays readable), with the red and blue
    // channels split a hair towards the corners.
    vec2 ab = rd * aberr * (0.0005 + edge * 0.0032);
    c = vec3(0.0);
    float n = blurK > 0.0 ? 7.0 : 1.0, sum = 0.0;
    for (int i = 0; i < 7; i++) {
      if (float(i) >= n) break;
      float t = float(i) / 6.0;
      vec2 uv = vUv - rd * blurK * 0.09 * t * (0.3 + edge * 3.0);
      float w = maskOn > 0.0 ? 1.0 - texture2D(tMask, uv).r : 1.0;
      c += w * vec3(texture2D(tScene, uv + ab).r, texture2D(tScene, uv).g, texture2D(tScene, uv - ab).b);
      sum += w;
    }
    c = sum > 0.01 ? c / sum : texture2D(tScene, vUv).rgb;
  } else c = texture2D(tScene, vUv).rgb;
  vec3 glow = texture2D(tBloom, vUv).rgb * bloom;
  if (fft > 0.0) glow += texture2D(tFft, vUv).rgb * fft;
  c += glow;
  if (lensK > 0.0) {
    // Dirt on the lens only shows where strong light crosses it.
    c += glow * texture2D(tDirt, vUv).rgb * lensK * 1.6;
    // Blue reflections: the bright parts, mirrored through the middle of the
    // screen at a few sizes, fading out towards the edges of each.
    vec3 g = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      float k = i == 0 ? 1.0 : i == 1 ? 0.55 : 1.7;
      vec2 p = (0.5 - vUv) * k;
      g += texture2D(tGhost, p + 0.5).rgb * (1.0 - smoothstep(0.12, 0.5, length(p)));
    }
    c += g * vec3(0.16, 0.34, 1.0) * lensK * 0.07;
  }
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

// Bloom: keep what is brighter than white (softly), never so bright that one
// hot pixel flashes.
const BRIGHT_FRAG = /* glsl */`
uniform sampler2D tScene, tMask;
uniform float maskOn;
varying vec2 vUv;
void main() {
  vec3 c = min(texture2D(tScene, vUv).rgb, vec3(14.0));
  float l = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * smoothstep(0.7, 1.25, l), 1.0);
  // From the driver's seat, only light from outside flares the lens: not
  // a mirror or a screen in the cabin.
  if (maskOn > 0.0) gl_FragColor.rgb *= 1.0 - texture2D(tMask, vUv).r;
}`;
// Shrinking: a wide average of five taps.
const DOWN_FRAG = /* glsl */`
uniform sampler2D tSrc;
uniform vec2 texel;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 0.5;
  for (int i = 0; i < 4; i++) {
    vec2 o = vec2(i < 2 ? -1.0 : 1.0, mod(float(i), 2.0) * 2.0 - 1.0);
    c += texture2D(tSrc, vUv + o * texel).rgb * 0.125;
  }
  gl_FragColor = vec4(c, 1.0);
}`;
// Growing back, added onto the level above: a soft tent of four taps.
const UP_FRAG = /* glsl */`
uniform sampler2D tSrc;
uniform vec2 texel;
uniform float weight;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv + texel * vec2(-1.0, 0.0)).rgb + texture2D(tSrc, vUv + texel * vec2(1.0, 0.0)).rgb
    + texture2D(tSrc, vUv + texel * vec2(0.0, -1.0)).rgb + texture2D(tSrc, vUv + texel * vec2(0.0, 1.0)).rgb;
  gl_FragColor = vec4(c * 0.25 * weight, 1.0);
}`;

// One step of a fast Fourier transform along x (dir 0) or y (dir 1). A texel
// holds two complex numbers, so red + green i and blue can go through at once.
const FFT_FRAG = /* glsl */`
uniform sampler2D tSrc;
uniform vec2 size;
uniform float dir, span, sign;
varying vec2 vUv;
vec2 mulc(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
void main() {
  float n = dir < 0.5 ? size.x : size.y;
  float index = floor(dir < 0.5 ? vUv.x * size.x : vUv.y * size.y);
  float evenIndex = floor(index / span) * (span * 0.5) + mod(index, span * 0.5);
  vec2 a = dir < 0.5 ? vec2(evenIndex + 0.5, gl_FragCoord.y) : vec2(gl_FragCoord.x, evenIndex + 0.5);
  vec2 b = dir < 0.5 ? vec2(evenIndex + n * 0.5 + 0.5, gl_FragCoord.y) : vec2(gl_FragCoord.x, evenIndex + n * 0.5 + 0.5);
  vec4 even = texture2D(tSrc, a / size), odd = texture2D(tSrc, b / size);
  float t = sign * 6.28318530718 * (index / span);
  vec2 w = vec2(cos(t), sin(t));
  gl_FragColor = vec4(even.xy + mulc(w, odd.xy), even.zw + mulc(w, odd.zw));
}`;
// Multiply two transformed images: the convolution itself.
const MUL_FRAG = /* glsl */`
uniform sampler2D tSrc, tKernel;
varying vec2 vUv;
vec2 mulc(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
void main() {
  vec4 s = texture2D(tSrc, vUv), k = texture2D(tKernel, vUv);
  gl_FragColor = vec4(mulc(s.xy, k.xy), mulc(s.zw, k.xy));
}`;
// Bright image into the transform's square, with a margin so light leaving one
// side does not come back on the other.
const PAD = 0.75;
const PADIN_FRAG = /* glsl */`
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) / ${PAD.toFixed(2)} + 0.5;
  bool inside = p.x > 0.0 && p.x < 1.0 && p.y > 0.0 && p.y < 1.0;
  gl_FragColor = inside ? vec4(texture2D(tSrc, p).rgb, 0.0) : vec4(0.0);
}`;
const PADOUT_FRAG = /* glsl */`
uniform sampler2D tSrc;
uniform float scale;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tSrc, (vUv - 0.5) * ${PAD.toFixed(2)} + 0.5);
  gl_FragColor = vec4(max(c.xyz * scale, 0.0), 1.0);
}`;

const FFT_W = 512, FFT_H = 256;

// A lens's response to a point of light: a tight core, a long soft skirt and
// faint six-pointed rays. Sums to 1, centre at the corner (the transform wraps).
function lensKernel(aspect) {
  const data = new Float32Array(FFT_W * FFT_H * 4);
  let sum = 0;
  for (let y = 0; y < FFT_H; y++) for (let x = 0; x < FFT_W; x++) {
    const dx = (x < FFT_W / 2 ? x : x - FFT_W) / (FFT_W * PAD) * aspect, dy = (y < FFT_H / 2 ? y : y - FFT_H) / (FFT_H * PAD);
    const r = Math.hypot(dx, dy) + 0.0035;
    let v = Math.pow(r, -2.1) * Math.exp(-r * 3.2);
    const a = Math.atan2(dy, dx);
    for (let i = 0; i < 3; i++) {
      const off = Math.abs(Math.sin(a - 0.26 - (i * Math.PI) / 3)) * r;
      v += 900 * Math.exp(-off * 520) * Math.exp(-r * 9) * r;
    }
    data[(y * FFT_W + x) * 4] = v;
    sum += v;
  }
  for (let i = 0; i < data.length; i += 4) data[i] /= sum;
  return data;
}

// Smudges and specks on the lens, painted once in code.
function dirtTexture() {
  const c = document.createElement('canvas');
  c.width = 960; c.height = 540;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  let seed = 90210;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const blot = (x, y, r, a) => {
    const f = g.createRadialGradient(x, y, 0, x, y, r);
    f.addColorStop(0, `rgba(255,255,255,${a})`);
    f.addColorStop(0.7, `rgba(255,255,255,${a * 0.5})`);
    f.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = f;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) blot(rnd() * 960, rnd() * 540, 50 + rnd() * 130, 0.05 + rnd() * 0.06); // greasy smears
  for (let i = 0; i < 300; i++) blot(rnd() * 960, rnd() * 540, 1 + rnd() * rnd() * 9, 0.12 + rnd() * 0.3); // dust
  const t = new THREE.CanvasTexture(c);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  return t;
}

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
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.maskTarget = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
    const fx = (fragmentShader, uniforms, extra = {}) => new THREE.ShaderMaterial({ uniforms, vertexShader: POST_VERT, fragmentShader, depthTest: false, depthWrite: false, ...extra });
    this.bright = fx(BRIGHT_FRAG, { tScene: { value: this.target.texture }, tMask: { value: this.maskTarget.texture }, maskOn: { value: 0 } });
    this.down = fx(DOWN_FRAG, { tSrc: { value: null }, texel: { value: new THREE.Vector2() } });
    this.up = fx(UP_FRAG, { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, weight: { value: 1 } }, { blending: THREE.AdditiveBlending, transparent: true });
    this.levels = [];     // the shrinking chain, 1/2 size downward
    this.white = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    this.noDraw = new THREE.MeshBasicMaterial({ visible: false });
    this.black = new THREE.Color(0);
    Object.assign(this.post.uniforms, {
      tBloom: { value: null }, tFft: { value: null }, tGhost: { value: null }, tDirt: { value: null }, tMask: { value: this.maskTarget.texture },
      bloom: { value: 0 }, fft: { value: 0 }, lensK: { value: 0 }, maskOn: { value: 0 },
    });
    this.bloomMode = null; // null, 'chain' or 'fft'
    this.bloomOn = false;
    this.fftAspect = 0;
    this.renderHeight = 480;
    this.width = 0; this.height = 0;
  }

  configure(preset) {
    this.renderHeight = preset.renderHeight;
    const smooth = !!preset.smooth;
    const f = smooth ? THREE.LinearFilter : THREE.NearestFilter;
    this.target.texture.minFilter = f; this.target.texture.magFilter = f;
    this.target.samples = smooth ? 4 : 0;
    // Brighter than white needs a floating-point image; fall back if the
    // device cannot draw into one (the look still works, lamps just clip).
    const c = this.gl.getContext();
    const floatOk = !!c.getExtension('EXT_color_buffer_float');
    const halfOk = floatOk || !!c.getExtension('EXT_color_buffer_half_float');
    this.target.texture.type = smooth && halfOk ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.target.dispose();
    this.target.texture.needsUpdate = true;
    this.post.uniforms.filmic.value = smooth ? 1 : 0;
    this.lens = smooth;
    setSmoothTextures(smooth);
    this.canvas.style.imageRendering = smooth ? 'auto' : 'pixelated';
    this.gl.shadowMap.enabled = preset.shadows;
    this.post.uniforms.dither.value = preset.dither ? 1 : 0;
    this.bloomMode = smooth && halfOk && preset.bloom ? (preset.bloom === 'fft' && floatOk ? 'fft' : 'chain') : null;
    this.bloomOn = !!this.bloomMode;
    if (this.bloomOn && !this.post.uniforms.tDirt.value) this.post.uniforms.tDirt.value = dirtTexture();
    this.width = 0; // rebuild the sized targets
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
    this.maskTarget.setSize(Math.ceil(rw / 2), Math.ceil(rh / 2));
    for (const t of this.levels) t.dispose();
    this.levels = [];
    if (!this.bloomOn) return;
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, type: THREE.HalfFloatType };
    for (let i = 1; i <= 6; i++) this.levels.push(new THREE.WebGLRenderTarget(Math.max(2, rw >> i), Math.max(2, rh >> i), opts));
    const u = this.post.uniforms;
    u.tBloom.value = this.levels[0].texture;
    u.tGhost.value = this.levels[2].texture;
    if (this.bloomMode === 'fft') this.setupFft(rw / rh);
  }

  // The transform's buffers, and the lens response in frequency form (taken
  // once, and again if the window's shape changes).
  setupFft(aspect) {
    if (!this.fftA) {
      const o = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, type: THREE.FloatType };
      this.fftA = new THREE.WebGLRenderTarget(FFT_W, FFT_H, o);
      this.fftB = new THREE.WebGLRenderTarget(FFT_W, FFT_H, o);
      this.kernelSpec = new THREE.WebGLRenderTarget(FFT_W, FFT_H, o);
      this.fftOut = new THREE.WebGLRenderTarget(FFT_W >> 1, FFT_H >> 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, type: THREE.HalfFloatType });
      const fx = (fragmentShader, uniforms) => new THREE.ShaderMaterial({ uniforms, vertexShader: POST_VERT, fragmentShader, depthTest: false, depthWrite: false });
      this.fftPass = fx(FFT_FRAG, { tSrc: { value: null }, size: { value: new THREE.Vector2(FFT_W, FFT_H) }, dir: { value: 0 }, span: { value: 2 }, sign: { value: -1 } });
      this.mulPass = fx(MUL_FRAG, { tSrc: { value: null }, tKernel: { value: this.kernelSpec.texture } });
      this.padIn = fx(PADIN_FRAG, { tSrc: { value: null } });
      this.padOut = fx(PADOUT_FRAG, { tSrc: { value: null }, scale: { value: 1 } });
      this.post.uniforms.tFft.value = this.fftOut.texture;
    }
    if (Math.abs(aspect - this.fftAspect) < 0.01) return;
    this.fftAspect = aspect;
    const tex = new THREE.DataTexture(lensKernel(aspect), FFT_W, FFT_H, THREE.RGBAFormat, THREE.FloatType);
    tex.minFilter = tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    this.quad.material = this.copy ??= new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null } }, vertexShader: POST_VERT, fragmentShader: 'uniform sampler2D tSrc; varying vec2 vUv; void main() { gl_FragColor = texture2D(tSrc, vUv); }', depthTest: false, depthWrite: false });
    this.copy.uniforms.tSrc.value = tex;
    this.gl.setRenderTarget(this.fftA);
    this.gl.render(this.quadScene, this.postCam);
    const done = this.transform(this.fftA, this.fftB, -1);
    this.copy.uniforms.tSrc.value = done.texture;
    this.quad.material = this.copy;
    this.gl.setRenderTarget(this.kernelSpec);
    this.gl.render(this.quadScene, this.postCam);
    this.gl.setRenderTarget(null);
    tex.dispose();
  }

  // A 2D transform of `a` (sign -1 forward, +1 back), using `b` as scratch.
  // Returns whichever holds the result.
  transform(a, b, sign) {
    const u = this.fftPass.uniforms;
    u.sign.value = sign;
    this.quad.material = this.fftPass;
    for (const [dir, n] of [[0, FFT_W], [1, FFT_H]]) {
      for (let span = 2; span <= n; span *= 2) {
        u.dir.value = dir; u.span.value = span; u.tSrc.value = a.texture;
        this.gl.setRenderTarget(b);
        this.gl.render(this.quadScene, this.postCam);
        [a, b] = [b, a];
      }
    }
    return a;
  }

  // Speed blur, lens fringing, bloom and lens dirt (realistic looks only).
  // `blur` 0..1 is how strong the speed blur is; each has its own switch.
  // `cabin`: the car's root in the cockpit view, to keep the cabin sharp.
  setLens({ blur = 0, aberration = false, bloom = true, dirt = true, cabin = null }) {
    const u = this.post.uniforms;
    u.blurK.value = this.lens ? blur : 0;
    u.aberr.value = this.lens && aberration ? 1 : 0;
    const on = this.bloomOn && bloom;
    this.bloomLive = on;
    u.bloom.value = on ? (this.bloomMode === 'fft' ? 0.14 : 0.55) : 0;
    u.fft.value = on && this.bloomMode === 'fft' ? 1.7 : 0;
    u.lensK.value = on && dirt ? 1 : 0;
    this.cabin = this.lens && (blur > 0 || on) ? cabin : null;
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
    this.drawMask(scene, camera);
    if (this.bloomLive) this.drawBloom();
    this.gl.setRenderTarget(null);
    this.gl.render(this.postScene, this.postCam);
  }

  // White where the car's solid parts are (not its glass), seen from the
  // driver's seat: one quick extra draw of the car alone.
  drawMask(scene, camera) {
    const u = this.post.uniforms;
    const root = this.cabin;
    u.maskOn.value = root ? 1 : 0;
    this.bright.uniforms.maskOn.value = u.maskOn.value;
    if (!root) return;
    const list = root.userData.maskList ??= (() => {
      const l = [];
      root.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        if (mats.every((m) => m.transparent)) return;
        o.layers.enable(1);
        l.push(o);
      });
      return l;
    })();
    const saved = list.map((o) => o.material);
    list.forEach((o) => { o.material = Array.isArray(o.material) ? o.material.map((m) => (m.transparent ? this.noDraw : this.white)) : this.white; });
    const bg = scene.background;
    scene.background = null;
    camera.layers.set(1);
    const clear = this.gl.getClearColor(new THREE.Color()), alpha = this.gl.getClearAlpha();
    this.gl.setClearColor(0x000000, 1);
    this.gl.setRenderTarget(this.maskTarget);
    this.gl.clear();
    this.gl.render(scene, camera);
    this.gl.setClearColor(clear, alpha);
    camera.layers.set(0);
    scene.background = bg;
    list.forEach((o, i) => { o.material = saved[i]; });
  }

  drawBloom() {
    const pass = (mat, out, clear = true) => {
      this.quad.material = mat;
      this.gl.setRenderTarget(out);
      this.gl.autoClear = clear;
      this.gl.render(this.quadScene, this.postCam);
      this.gl.autoClear = true;
    };
    const L = this.levels;
    pass(this.bright, L[0]);
    // Shrink, then grow back, each step adding its wider, fainter glow: the
    // weights give a long soft tail like a real lens's.
    for (let i = 1; i < L.length; i++) {
      this.down.uniforms.tSrc.value = L[i - 1].texture;
      this.down.uniforms.texel.value.set(1 / L[i - 1].width, 1 / L[i - 1].height);
      pass(this.down, L[i]);
    }
    if (this.bloomMode === 'fft') {
      // The real convolution, from the bright image at quarter size.
      this.padIn.uniforms.tSrc.value = L[1].texture;
      pass(this.padIn, this.fftA);
      const f = this.transform(this.fftA, this.fftB, -1);
      const other = f === this.fftA ? this.fftB : this.fftA;
      this.mulPass.uniforms.tSrc.value = f.texture;
      pass(this.mulPass, other);
      const r = this.transform(other, f, 1);
      this.padOut.uniforms.tSrc.value = r.texture;
      this.padOut.uniforms.scale.value = 1 / (FFT_W * FFT_H);
      pass(this.padOut, this.fftOut);
    }
    const W = [0.8, 0.8, 0.75, 0.7, 0.65];
    for (let i = L.length - 1; i > 0; i--) {
      this.up.uniforms.tSrc.value = L[i].texture;
      this.up.uniforms.texel.value.set(1 / L[i].width, 1 / L[i].height);
      this.up.uniforms.weight.value = W[i - 1];
      pass(this.up, L[i - 1], false);
    }
  }
}
