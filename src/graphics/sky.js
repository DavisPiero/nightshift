// The sky: one dome drawn behind everything, painted by a small shader.
// A gradient from the horizon (the fog colour, so distant things melt into
// it) up to the zenith, the city's glow low down in the track's light
// colour, the sun or moon with its halo, drifting clouds lit from the sun's
// side (pink and gold at sunset, peach at dawn) or from below by the city at
// night, and stars on clear nights. On High there are more cloud layers and
// a finer, mackerel-like texture in them (after David's sunset references).
// Rain and snow close the sky over with low, dark cloud; fog hides it.

import * as THREE from 'three';

const VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */`
uniform vec3 zenith, mid, horizon, ground, glow, sunColor, cloudDark, cloudLit;
uniform vec3 sunDir;
uniform float sunSize, sunHalo, glowAmt, cover, cloudAmt, stars, time, detail;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= 3.0 + detail * 2.0) break;
    v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  // The gradient: horizon, a band of mid colour, the zenith overhead.
  vec3 col = mix(horizon, mid, smoothstep(0.0, 0.28, h));
  col = mix(col, zenith, smoothstep(0.22, 0.85, h));
  col = mix(col, ground, smoothstep(0.0, -0.12, h));
  // The city glow low down.
  col += glow * glowAmt * exp(-max(h, 0.0) * 9.0) * step(-0.05, h);
  // Sun or moon: a wide halo, a tight glow and the disc.
  float sd = max(dot(d, sunDir), 0.0);
  col += sunColor * (pow(sd, 6.0) * 0.35 + pow(sd, 48.0) * 0.6) * sunHalo;
  col = mix(col, sunColor * 1.6, smoothstep(cos(sunSize), cos(sunSize * 0.8), sd));
  // Stars, only high up.
  vec2 sp = floor(d.xz / max(h, 0.05) * 90.0 + d.y * 40.0);
  float star = step(0.9965, hash(sp)) * smoothstep(0.12, 0.4, h) * stars;
  col += vec3(0.85, 0.9, 1.0) * star * (0.5 + 0.5 * hash(sp + 3.0));
  // Clouds on a flat layer overhead, thinning toward the horizon.
  if (h > -0.02 && cloudAmt > 0.0) {
    vec2 uv = d.xz / (h + 0.12) * 1.3 + vec2(time * 0.012, time * 0.004);
    float n = fbm(uv);
    // High: a fine ripple through the cloud, like a mackerel sky.
    n += (noise(uv * 9.0 + n * 3.0) - 0.5) * 0.18 * detail;
    float a = smoothstep(cover, cover + 0.22, n) * smoothstep(-0.02, 0.18, h) * cloudAmt;
    // Lit on the side facing the sun, and a little from below by the city.
    float lit = pow(max(dot(normalize(vec3(d.x, 0.15, d.z)), sunDir), 0.0), 2.0) * 0.8 + (1.0 - smoothstep(0.0, 0.5, h)) * 0.35;
    vec3 cc = mix(cloudDark, cloudLit, clamp(lit + (n - cover) * 0.8, 0.0, 1.0));
    col = mix(col, cc, a);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const C = (hex) => new THREE.Color(hex);

// The colours for each time of day. Night takes its glow from the track.
const SKIES = {
  night: {
    zenith: 0x020409, mid: 0x08101c, ground: 0x050608,
    sun: 0xb8c6e0, sunSize: 0.022, sunHalo: 0.22, glowAmt: 0.55,
    cloudDark: 0x06080c, cloudLit: 0x2a2630, cover: 0.5, cloudAmt: 0.85, stars: 1,
  },
  sunset: {
    zenith: 0x231a52, mid: 0x7a3f86, ground: 0x1a1018,
    sun: 0xffa25a, sunSize: 0.05, sunHalo: 1.0, glowAmt: 0.25,
    cloudDark: 0x5a3060, cloudLit: 0xffa0b8, cover: 0.4, cloudAmt: 0.95, stars: 0,
    horizon: 0xff7a52,
  },
  dawn: {
    zenith: 0x16264c, mid: 0x5a6e9c, ground: 0x181c24,
    sun: 0xffd2a8, sunSize: 0.045, sunHalo: 0.8, glowAmt: 0.15,
    cloudDark: 0x4a5272, cloudLit: 0xffc8a8, cover: 0.45, cloudAmt: 0.9, stars: 0.15,
    horizon: 0xf2b894,
  },
};

export function buildSky() {
  const uniforms = {
    zenith: { value: C(0) }, mid: { value: C(0) }, horizon: { value: C(0) }, ground: { value: C(0) },
    glow: { value: C(0) }, sunColor: { value: C(0) }, cloudDark: { value: C(0) }, cloudLit: { value: C(0) },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunSize: { value: 0.03 }, sunHalo: { value: 0.5 }, glowAmt: { value: 0.5 }, cover: { value: 0.5 },
    cloudAmt: { value: 1 }, stars: { value: 1 }, time: { value: 0 }, detail: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  mesh.renderOrder = -11;
  mesh.frustumCulled = false;
  return {
    mesh,
    // look: the track's look at this time (time-of-day.js), weather: its id,
    // high: the High graphics preset (more cloud detail).
    set(look, weather, high, fogHex) {
      const s = SKIES[look.time] || SKIES.night;
      const u = uniforms;
      u.zenith.value.setHex(s.zenith); u.mid.value.setHex(s.mid); u.ground.value.setHex(s.ground);
      // The horizon is the fog colour (so the far city melts into it), warmed
      // by the time of day's own horizon colour where there is one.
      u.horizon.value.setHex(fogHex);
      if (s.horizon) u.horizon.value.lerp(C(s.horizon), 0.75);
      u.glow.value.setHex(look.skyGlow ?? 0x8a5a30);
      u.sunColor.value.setHex(s.sun);
      u.sunDir.value.set(...look.sun.dir).normalize();
      u.sunSize.value = s.sunSize; u.sunHalo.value = s.sunHalo; u.glowAmt.value = s.glowAmt;
      u.cloudDark.value.setHex(s.cloudDark); u.cloudLit.value.setHex(s.cloudLit);
      u.cover.value = s.cover; u.cloudAmt.value = s.cloudAmt; u.stars.value = s.stars;
      u.detail.value = high ? 1 : 0;
      // Rain and snow: low cloud closes over, no stars, the sun hidden.
      if (weather === 'rain' || weather === 'snow') {
        u.cover.value = 0.18; u.cloudAmt.value = 1; u.stars.value = 0; u.sunHalo.value *= 0.25; u.sunSize.value = 0;
        u.cloudDark.value.lerp(C(fogHex), 0.6); u.cloudLit.value.lerp(C(fogHex), 0.7);
        u.zenith.value.lerp(C(fogHex), 0.5); u.mid.value.lerp(C(fogHex), 0.7);
      }
    },
    update(dt) { uniforms.time.value += dt; },
  };
}
