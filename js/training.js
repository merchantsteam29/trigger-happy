import * as THREE from 'three';
import { raycast, rayAABB } from './physics.js';
import { store } from './util.js';
import { sfx } from './audio.js';

// Training courses (Practice Range, pause menu → 🎯 Practice). Each run starts after a 3-second
// countdown; your best per course is saved (`trainBest`, synced between devices as a best) and
// posted to the Training leaderboard (leaderboard.js). Scores: hits or % (higher is better), or a
// time in ms (lower is better). The game asks `hit()` for each shot ray while a shooting course runs.

export const COURSES = {
  grid: { name: 'Gridshot', icon: '🎯', desc: '60 s · hit as many targets as you can', higher: true, unit: 'hits', max: 250 },
  flick: { name: 'Flick', icon: '⚡', desc: '30 s · one small target at a time, anywhere around you', higher: true, unit: 'hits', max: 120 },
  track: { name: 'Tracking', icon: '🔴', desc: '30 s · keep your crosshair on the moving target', higher: true, unit: '%', max: 100 },
  speed: { name: 'Speed run', icon: '⏱', desc: '20 targets downrange · clear them as fast as you can', higher: false, unit: 's', min: 4000, max: 600000 },
  move: { name: 'Movement', icon: '🏃', desc: 'Run, jump and slide through 10 rings in order', higher: false, unit: 's', min: 10000, max: 600000 },
};
export const COURSE_IDS = Object.keys(COURSES);

// A score as text: "87 hits", "64%", "12.34 s".
export function fmtScore(id, v) {
  const c = COURSES[id];
  if (!c || !v) return '–';
  return c.unit === 's' ? (v / 1000).toFixed(2) + ' s' : c.unit === '%' ? v + '%' : `${v} hits`;
}
// A score someone posted, or 0 if it's impossible.
export function cleanScore(id, v) {
  const c = COURSES[id], n = Math.round(Number(v) || 0);
  if (!c || n <= 0) return 0;
  if (c.unit === 's') return n >= c.min && n <= c.max ? n : 0;
  return Math.min(c.max, n);
}
export const isBetter = (id, a, b) => !!a && (!b || (COURSES[id].higher ? a > b : a < b));

// Your bests: { grid, flick, track, speed, move } (Gridshot was the old Aim trainer: `aimBest`).
export function trainBests() {
  const b = store.get('trainBest', {}), out = {};
  for (const id of COURSE_IDS) out[id] = cleanScore(id, b[id]);
  out.grid = Math.max(out.grid, cleanScore('grid', store.get('aimBest', 0)));
  return out;
}
// Saves a result if it's a new best; returns true if it was.
export function saveBest(id, v) {
  const b = trainBests();
  if (!isBetter(id, v, b[id])) return false;
  b[id] = v;
  store.set('trainBest', b);
  if (id === 'grid') store.set('aimBest', v);
  return true;
}

// Movement course: rings through the Practice Range (you start on the firing line at z 24).
// Four sit on the crates, so you have to jump up to them.
const RINGS = [
  [0, 1.2, 16], [-14, 2.3, -10.4], [-20, 1.1, -28], [-14, 2.3, -35.4], [0, 1.1, -50],
  [14, 2.3, -35.4], [20, 1.1, -22], [14, 2.3, -10.4], [6, 1.1, 4], [0, 1.2, 16],
];
const RING_R = 1.25;

const _v = new THREE.Vector3(), _e = new THREE.Vector3();

export class Training {
  constructor(game) { this.g = game; this.run = null; }

  get shooting() { return !!(this.run && this.run.go && this.run.id !== 'move' && this.run.id !== 'track'); }

  start(id) {
    if (!COURSES[id]) return;
    this.stop(true);
    const g = this.g, now = performance.now();
    if (!this.mats) {
      this.geo = new THREE.SphereGeometry(1, 18, 12);
      this.mat = new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff5a00', emissiveIntensity: 0.6, roughness: 0.4 });
      this.onMat = new THREE.MeshStandardMaterial({ color: '#3dff8a', emissive: '#18c95c', emissiveIntensity: 0.8, roughness: 0.4 });
      this.ringGeo = new THREE.TorusGeometry(RING_R, 0.09, 10, 40);
      this.ringNext = new THREE.MeshBasicMaterial({ color: '#ffd23a' });
      this.ringLater = new THREE.MeshBasicMaterial({ color: '#7fd8ff', transparent: true, opacity: 0.35 });
      this.mats = true;
    }
    const dur = { grid: 60000, flick: 30000, track: 30000, speed: 90000, move: 120000 }[id]; // speed / move: time allowed
    this.toStart(); // every course starts on the firing line, facing downrange
    this.run = { id, start: now + 3000, end: now + 3000 + dur, hits: 0, shots: 0, targets: [], yaw: 0, on: 0, all: 0, ring: 0 };
  }

  // Back to the firing line, facing downrange (the Movement course keeps you there until GO).
  toStart() {
    const me = this.g.me;
    me.pos.set(0, 0, 24); me.vel.set(0, 0, 0); me.yaw = 0; me.pitch = 0;
  }

  stop(quiet = false) {
    const r = this.run;
    if (!r) return;
    for (const t of r.targets) this.g.scene.remove(t.mesh);
    this.run = null;
    if (quiet || !this.g.onCourseDone) return;
    const acc = r.shots ? Math.round((r.hits / r.shots) * 100) : 0;
    const time = Math.round(r.doneAt - r.start);
    const score = r.id === 'track' ? Math.round((r.on / Math.max(1, r.all)) * 100)
      : r.id === 'speed' || r.id === 'move' ? (r.doneAt ? time : 0) // 0: ran out of time
        : r.hits;
    this.g.onCourseDone(r.id, cleanScore(r.id, score) || 0, r.id === 'track' || r.id === 'move' ? null : acc);
  }

  ball(p, size) {
    const mesh = new THREE.Mesh(this.geo, this.mat);
    mesh.position.copy(p);
    mesh.scale.setScalar(0.01);
    this.g.scene.add(mesh);
    const t = { mesh, born: performance.now(), size, r: size + 0.02 };
    this.run.targets.push(t);
    return t;
  }

  // A spot in plain sight: yaw (around you), distance and height ranges.
  spot(yaw0, spreadYaw, d0, d1, h0, h1, gap = 1.5) {
    const me = this.g.me, eye = _e.set(me.pos.x, me.pos.y + me.eye, me.pos.z);
    for (let i = 0; i < 30; i++) {
      const yaw = yaw0 + (Math.random() - 0.5) * spreadYaw, d = d0 + Math.random() * (d1 - d0), h = h0 + Math.random() * (h1 - h0);
      const p = new THREE.Vector3(me.pos.x - Math.sin(yaw) * d, me.pos.y + h, me.pos.z - Math.cos(yaw) * d);
      const v = _v.copy(p).sub(eye), dl = v.length();
      if (raycast(eye.x, eye.y, eye.z, v.x / dl, v.y / dl, v.z / dl, dl - 0.5)) continue;
      if (this.blocked(eye, v.normalize(), dl)) continue; // not behind a practice dummy
      if (this.run.targets.some((t) => t.mesh.position.distanceTo(p) < gap)) continue;
      return p;
    }
    return null;
  }

  blocked(o, dir, dist) {
    for (const rp of this.g.remotes.values()) {
      if (!rp.alive) continue;
      for (const hb of rp.hitboxes()) if (rayAABB(o.x, o.y, o.z, dir.x, dir.y, dir.z, hb.x0 - 0.3, hb.y0 - 0.3, hb.z0 - 0.3, hb.x1 + 0.3, hb.y1 + 0.3, hb.z1 + 0.3, dist) >= 0) return true;
    }
    return false;
  }

  update(now, dt) {
    const r = this.run, g = this.g;
    if (!r) return;
    if (g.rules.mode !== 'practice') { this.stop(true); return; }
    if (now < r.start) {
      const n = Math.ceil((r.start - now) / 1000);
      if (n !== r.cd) { r.cd = n; g.hud.say(String(n)); sfx.beep(0.4); }
      if (r.id === 'move') this.toStart();
      if (r.id === 'move' && !r.targets.length) for (const [x, y, z] of RINGS) {
        const mesh = new THREE.Mesh(this.ringGeo, this.ringLater);
        mesh.position.set(x, y, z);
        g.scene.add(mesh);
        r.targets.push({ mesh });
      }
      if (r.id === 'speed' && !r.targets.length) {
        for (let i = 0; i < 20; i++) { const p = this.spot(0, 1.3, 8, 55, 0.6, 3.4, 2.5); if (p) this.ball(p, 0.36); }
      }
      if (r.id === 'move') this.paintRings();
      return;
    }
    if (!r.go) { r.go = true; g.hud.say('GO!'); sfx.beep(0.7); }
    if (now >= r.end) { this.stop(); return; }
    for (const t of r.targets) if (t.size) t.mesh.scale.setScalar(t.size * Math.min(1, (now - t.born) / 120));
    switch (r.id) {
      case 'grid':
        while (r.targets.length < 4) { const p = this.spot(r.yaw, 1.6, 7, 22, 0.8, 3.4); if (!p) break; this.ball(p, 0.32); }
        break;
      case 'flick': {
        // One at a time, well away from where you're looking; gone after 1.6 s.
        const t = r.targets[0];
        if (t && now - t.born > 1600) { g.scene.remove(t.mesh); r.targets.length = 0; }
        for (let i = 0; i < 12 && !r.targets.length; i++) { // downrange, but away from your crosshair
          const yaw = r.yaw + (Math.random() - 0.5) * 2.6, off = Math.abs(Math.atan2(Math.sin(yaw - g.me.yaw), Math.cos(yaw - g.me.yaw)));
          if (off < 0.45) continue;
          const p = this.spot(yaw, 0.05, 8, 18, 0.5, 4.2);
          if (p) this.ball(p, 0.26);
        }
        break;
      }
      case 'track': {
        // A target that weaves smoothly 14 m in front of where you started.
        let t = r.targets[0];
        if (!t) {
          t = this.ball(new THREE.Vector3(), 0.42);
          t.c = new THREE.Vector3(g.me.pos.x - Math.sin(r.yaw) * 14, g.me.pos.y + 1.6, g.me.pos.z - Math.cos(r.yaw) * 14);
          t.ph = [Math.random() * 6, Math.random() * 6, Math.random() * 6];
        }
        const s = (now - r.start) / 1000, rx = Math.cos(r.yaw), rz = -Math.sin(r.yaw);
        const side = Math.sin(s * 0.9 + t.ph[0]) * 4 + Math.sin(s * 2.1 + t.ph[1]) * 1;
        const up = Math.sin(s * 1.3 + t.ph[2]) * 0.7;
        t.mesh.position.set(t.c.x + rx * side, t.c.y + up, t.c.z + rz * side);
        // On target: the crosshair ray passes through it (nothing in between).
        const cam = g.camera, o = cam.position, f = _v.set(0, 0, -1).applyQuaternion(cam.quaternion);
        const p = t.mesh.position, k = t.r;
        const hitT = rayAABB(o.x, o.y, o.z, f.x, f.y, f.z, p.x - k, p.y - k, p.z - k, p.x + k, p.y + k, p.z + k, 60);
        const wall = hitT >= 0 && raycast(o.x, o.y, o.z, f.x, f.y, f.z, hitT);
        const on = hitT >= 0 && !wall;
        r.all += dt; if (on) r.on += dt;
        t.mesh.material = on ? this.onMat : this.mat;
        break;
      }
      case 'speed':
        if (!r.targets.length && !r.doneAt) { r.doneAt = now; this.stop(); }
        break;
      case 'move': {
        const me = g.me, ring = r.targets[r.ring];
        if (ring && _v.set(me.pos.x, me.pos.y + 1.0, me.pos.z).distanceTo(ring.mesh.position) < RING_R + 0.15) {
          ring.mesh.visible = false;
          r.ring++;
          sfx.beep(r.ring === RINGS.length ? 0.9 : 0.55);
          if (r.ring === RINGS.length) { r.doneAt = now; this.stop(); return; }
          this.paintRings();
        }
        break;
      }
    }
  }

  paintRings() {
    const r = this.run;
    r.targets.forEach((t, i) => {
      t.mesh.material = i === r.ring ? this.ringNext : this.ringLater;
      const next = r.targets[i + 1];
      t.mesh.lookAt(next ? next.mesh.position : _v.set(0, 1.2, 24)); // faces the way you run
    });
  }

  // A shot ray during a shooting course: returns the distance if it hits a target (and removes
  // it), else -1. Counts the shot once per trigger pull (`shot()`).
  shot() { if (this.shooting) this.run.shots++; }
  hit(o, dir, maxT) {
    const r = this.run;
    if (!this.shooting) return -1;
    for (let k = 0; k < r.targets.length; k++) {
      const tp = r.targets[k].mesh.position, s = r.targets[k].r;
      const t = rayAABB(o.x, o.y, o.z, dir.x, dir.y, dir.z, tp.x - s, tp.y - s, tp.z - s, tp.x + s, tp.y + s, tp.z + s, maxT);
      if (t >= 0 && t < maxT) {
        r.hits++;
        this.g.scene.remove(r.targets[k].mesh);
        this.g.fx.burst(tp.clone(), null, '#ff9a3a', 10, 4, 0.06, 0.4);
        r.targets.splice(k, 1);
        return t;
      }
    }
    return -1;
  }

  // The bar at the top of the screen while a course runs.
  bar(now) {
    const r = this.run, c = COURSES[r.id];
    const head = `${c.icon} ${c.name.toUpperCase()}`;
    if (now < r.start) return `${head} · STARTING IN ${Math.ceil((r.start - now) / 1000)}`;
    const left = Math.max(0, Math.ceil((r.end - now) / 1000)), el = ((now - r.start) / 1000).toFixed(1);
    const acc = r.shots ? Math.round((r.hits / r.shots) * 100) : 0;
    switch (r.id) {
      case 'track': return `${head} · ${left}s · ON TARGET ${Math.round((r.on / Math.max(0.001, r.all)) * 100)}%`;
      case 'speed': return `${head} · ${el}s · ${r.targets.length} LEFT · ${acc}%`;
      case 'move': return `${head} · ${el}s · RING ${Math.min(RINGS.length, r.ring + 1)} / ${RINGS.length}`;
      default: return `${head} · ${left}s · ${r.hits} HITS · ${acc}%`;
    }
  }
}
