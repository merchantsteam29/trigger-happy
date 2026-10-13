import * as THREE from 'three';
import { spawns } from './maps.js';
import { raycast } from './physics.js';
import { activeHolidays } from './holidays.js';

// Halloween event (holidays.js, Oct 24–31): glowing jack-o'-lanterns around every map and a
// spookier sky. Shooting one smashes it and counts toward the Pumpkin Smasher achievement
// (stat 'pumpkins'). They're local to each player: everyone gets their own set to smash.

export const halloweenOn = (now = Date.now()) => activeHolidays(now).some((h) => h.id === 'halloween');
const MAX = 10, R = 0.34;

// Small deterministic random, so a map's pumpkins sit in the same spots for the whole match.
function rng(seed) {
  let s = 0;
  for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const MAT = {
  skin: new THREE.MeshStandardMaterial({ color: '#ff7a12', roughness: 0.55, emissive: '#5a1d00', emissiveIntensity: 0.6 }),
  stem: new THREE.MeshStandardMaterial({ color: '#3f6a1d', roughness: 0.9 }),
  glow: new THREE.MeshBasicMaterial({ color: '#ffd34a' }),
};
for (const m of Object.values(MAT)) m.userData.shared = true;

function pumpkin() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 14, 10), MAT.skin);
  body.scale.set(1.15, 0.85, 1.15);
  body.position.y = R * 0.85;
  g.add(body);
  for (let i = 0; i < 6; i++) { // ridges
    const rib = new THREE.Mesh(new THREE.SphereGeometry(R * 0.98, 10, 8), MAT.skin);
    rib.scale.set(0.35, 0.88, 1.12);
    rib.rotation.y = (i / 6) * Math.PI;
    rib.position.y = R * 0.85;
    g.add(rib);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.14, 6), MAT.stem);
  stem.position.y = R * 1.65;
  stem.rotation.z = 0.25;
  g.add(stem);
  // Carved face, glowing from inside (facing +Z)
  const z = R * 1.12;
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.09, 3), MAT.glow);
    eye.position.set(sx * 0.12, R * 1.0, z);
    eye.rotation.x = Math.PI / 2;
    g.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.04), MAT.glow);
  mouth.position.set(0, R * 0.62, z - 0.02);
  g.add(mouth);
  for (const sx of [-0.08, 0.08]) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.04), MAT.skin);
    tooth.position.set(sx, R * 0.66, z);
    g.add(tooth);
  }
  return g;
}

export class Pumpkins {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.list = []; // { mesh, p: Vector3 (center), alive }
    scene.add(this.group);
  }

  clear() {
    for (const k of this.list) this.group.remove(k.mesh);
    this.list = [];
  }

  // New map (or match): scatter pumpkins near the spawn points, sitting on the ground.
  place(mapId, seed = '') {
    this.clear();
    this.on = halloweenOn();
    if (!this.on || !spawns.length) return;
    const rand = rng(mapId + seed);
    const pool = spawns.slice();
    for (let i = 0; i < MAX && pool.length; i++) {
      const s = pool.splice((rand() * pool.length) | 0, 1)[0];
      const a = rand() * Math.PI * 2, d = 1.6 + rand() * 1.8;
      const x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
      const down = raycast(x, s.y + 2, z, 0, -1, 0, 6);
      if (!down || raycast(s.x, s.y + 0.5, s.z, Math.cos(a), 0, Math.sin(a), d)) continue; // no floor, or behind a wall
      const y = s.y + 2 - down.t;
      if (Math.abs(y - s.y) > 1.5) continue;
      const mesh = pumpkin();
      mesh.position.set(x, y, z);
      mesh.rotation.y = Math.atan2(s.x - x, s.z - z); // face the spawn point
      this.group.add(mesh);
      this.list.push({ mesh, p: new THREE.Vector3(x, y + R * 0.85, z), alive: true });
    }
  }

  // Nearest pumpkin a ray hits before maxT: { k, t } or null.
  ray(o, d, maxT) {
    let best = null;
    for (const k of this.list) {
      if (!k.alive) continue;
      const ox = o.x - k.p.x, oy = o.y - k.p.y, oz = o.z - k.p.z;
      const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - R * R * 1.3;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < maxT && (!best || t < best.t)) best = { k, t };
    }
    return best;
  }

  smash(k) {
    if (!k.alive) return false;
    k.alive = false;
    this.group.remove(k.mesh);
    return true;
  }

  get left() { return this.list.filter((k) => k.alive).length; }
}

// A spookier sky: fog and background pulled toward a dusky purple.
export function spookySky(scene) {
  if (!halloweenOn()) return;
  const dusk = new THREE.Color('#2a1640');
  if (scene.background && scene.background.isColor) scene.background.lerp(dusk, 0.35);
  if (scene.fog) scene.fog.color.lerp(dusk, 0.35);
}
