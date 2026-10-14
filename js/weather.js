import * as THREE from 'three';
import { raycast } from './physics.js';
import { thunder, rainLoop } from './audio.js';

// Weather: the host picks it per match (rule `weather`, 'random' rolls one each match) and sends
// the result as `wx` in the settings, so everyone sees the same sky. Rain and thunderstorms fall
// in a box around the camera (hidden under a roof); fog closes the view in; storms darken the map
// and flash lightning with thunder. Settings → Weather effects off keeps only the fog and light.

export const WEATHER = {
  clear: { name: 'Clear', icon: '☀️' },
  rain: { name: 'Rain', icon: '🌧️', far: 0.75, tint: ['#7d8794', '#1a1e26', 0.4], light: 0.75, drops: 1200, speed: 24 },
  fog: { name: 'Fog', icon: '🌫️', far: 0, fogFar: 38, near: 3, tint: ['#b8c0c8', '#2a2f3a', 0.6], light: 0.85 },
  storm: { name: 'Thunderstorm', icon: '⛈️', far: 0.55, tint: ['#3a4250', '#10131a', 0.6], light: 0.5, drops: 2000, speed: 32, lightning: true },
};
export const WEATHER_PICKS = [['random', 'Random each match'], ['clear', 'Clear'], ['rain', 'Rain'], ['fog', 'Fog'], ['storm', 'Thunderstorm']];
export function rollWeather() {
  const r = Math.random();
  return r < 0.55 ? 'clear' : r < 0.72 ? 'rain' : r < 0.87 ? 'fog' : 'storm';
}

const BOX = 36, HALF = BOX / 2, ABOVE = 14, BELOW = 8;

export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.kind = 'clear';
    this.base = null;
    this.rain = null;
    this.flashLight = new THREE.AmbientLight('#dfe8ff', 0);
    this.flash = 0; this.nextBolt = 0; this.roofT = 0; this.roofed = false; this.opacity = 0;
  }

  // The map's scene was just built: remember its own fog, sky and lights.
  mapBuilt(group) {
    const f = this.scene.fog;
    this.base = {
      near: f ? f.near : 0, far: f ? f.far : 300, fog: f ? f.color.clone() : null,
      bg: this.scene.background && this.scene.background.isColor ? this.scene.background.clone() : null,
      lights: [], night: false, group,
    };
    group.traverse((o) => { if (o.isLight) this.base.lights.push([o, o.intensity]); });
    const lum = this.base.bg ? this.base.bg.r * 0.3 + this.base.bg.g * 0.59 + this.base.bg.b * 0.11 : 1;
    this.base.night = lum < 0.2;
    group.add(this.flashLight);
    this.set(this.kind, true);
  }

  // drops: 0..1 particle amount (graphics quality); fx: rain and lightning on (setting)
  set(kind, force = false, { drops = this.dropScale ?? 1, fx = this.fx ?? true } = {}) {
    if (!WEATHER[kind]) kind = 'clear';
    if (!force && kind === this.kind && drops === this.dropScale && fx === this.fx) return;
    this.kind = kind; this.dropScale = drops; this.fx = fx;
    const b = this.base;
    if (!b) return;
    const w = WEATHER[kind], f = this.scene.fog;
    if (f) {
      f.near = w.near ?? b.near;
      f.far = w.fogFar ? Math.min(b.far, w.fogFar) : w.far ? b.far * w.far : b.far;
      f.color.copy(b.fog);
      if (w.tint) f.color.lerp(new THREE.Color(b.night ? w.tint[1] : w.tint[0]), w.tint[2]);
    }
    if (b.bg) {
      this.scene.background = b.bg.clone();
      if (w.tint) this.scene.background.lerp(new THREE.Color(b.night ? w.tint[1] : w.tint[0]), w.tint[2]);
      this.bg0 = this.scene.background.clone();
    }
    for (const [l, i] of b.lights) l.intensity = i * (w.light || 1);
    this.flash = 0; this.flashLight.intensity = 0;
    this.nextBolt = performance.now() + 3000 + Math.random() * 5000;
    if (this.rain) { this.scene.remove(this.rain); this.rain.geometry.dispose(); this.rain.material.dispose(); this.rain = null; }
    const n = Math.round((w.drops || 0) * drops);
    if (n && fx) this.makeRain(n, w.speed);
    rainLoop(n && fx ? (kind === 'storm' ? 1 : 0.6) : 0);
  }

  makeRain(n, speed) {
    const pos = new Float32Array(n * 6);
    this.vel = speed;
    this.wind = [speed * 0.06, speed * 0.03];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: this.base.night ? '#7d8aa8' : '#c4d4e6', transparent: true, opacity: 0, depthWrite: false });
    this.rain = new THREE.LineSegments(geo, mat);
    this.rain.frustumCulled = false;
    this.rain.userData.seeded = false;
    this.scene.add(this.rain);
    this.opacity = 0;
  }

  seed(i, cam, y) {
    const p = this.rain.geometry.attributes.position.array, k = i * 6;
    const x = cam.x + (Math.random() - 0.5) * BOX, z = cam.z + (Math.random() - 0.5) * BOX;
    const len = 0.5 + Math.random() * 0.4;
    p[k] = x; p[k + 1] = y; p[k + 2] = z;
    p[k + 3] = x - this.wind[0] * len / this.vel; p[k + 4] = y + len; p[k + 5] = z - this.wind[1] * len / this.vel;
  }

  update(dt, cam, now = performance.now()) {
    if (this.rain) {
      const n = this.rain.geometry.attributes.position.count / 2;
      if (!this.rain.userData.seeded) { for (let i = 0; i < n; i++) this.seed(i, cam, cam.y - BELOW + Math.random() * (ABOVE + BELOW)); this.rain.userData.seeded = true; }
      const p = this.rain.geometry.attributes.position.array;
      const dy = this.vel * dt, dx = this.wind[0] * dt, dz = this.wind[1] * dt;
      for (let i = 0; i < n; i++) {
        const k = i * 6;
        p[k] += dx; p[k + 3] += dx; p[k + 1] -= dy; p[k + 4] -= dy; p[k + 2] += dz; p[k + 5] += dz;
        if (p[k + 1] < cam.y - BELOW || Math.abs(p[k] - cam.x) > HALF || Math.abs(p[k + 2] - cam.z) > HALF) this.seed(i, cam, cam.y + ABOVE * (0.6 + Math.random() * 0.4));
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
      // Under a roof: the rain fades out (and sounds muffled).
      if ((this.roofT -= dt) <= 0) {
        this.roofT = 0.25;
        this.roofed = !!raycast(cam.x, cam.y + 0.2, cam.z, 0, 1, 0, 40);
        rainLoop(this.kind === 'storm' ? 1 : 0.6, this.roofed);
      }
      this.opacity += ((this.roofed ? 0 : 0.5) - this.opacity) * Math.min(1, dt * 4);
      this.rain.material.opacity = this.opacity;
    }
    if (WEATHER[this.kind].lightning && this.fx && now >= this.nextBolt) {
      this.nextBolt = now + 6000 + Math.random() * 10000;
      this.flash = 1;
      this.boltAt = now;
      const far = Math.random();
      thunder(0.5 + (1 - far) * 0.5, 0.3 + far * 2);
    }
    if (this.flash > 0) {
      const t = (now - this.boltAt) / 1000;
      // two quick flickers, then fade
      const k = t < 0.06 ? 1 : t < 0.12 ? 0.25 : t < 0.2 ? 0.8 : Math.max(0, 0.8 - (t - 0.2) * 2.5);
      this.flashLight.intensity = k * (this.base.night ? 2.5 : 4);
      if (this.bg0) this.scene.background.copy(this.bg0).lerp(new THREE.Color('#dfe6f5'), k * 0.5);
      if (t > 0.55) { this.flash = 0; this.flashLight.intensity = 0; if (this.bg0) this.scene.background.copy(this.bg0); }
    }
  }

  stop() { rainLoop(0); }
}
