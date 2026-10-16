import * as THREE from 'three';

// Weapon charms: a cosmetic (slot `charm` in missions.js COSMETICS). A little keychain hanging off
// the back of every gun you hold, in first person (viewmodel.js) and for everyone else (remote.js).
// It's placed from the gun's size, so it fits any gun, and swings as you move and fire.

export const CHARM_ITEMS = [
  { id: 'none', name: 'None', free: true, icon: '✖️', desc: 'No charm' },
  { id: 'dice', name: 'Lucky Die', price: 100, icon: '🎲', desc: 'Roll with it' },
  { id: 'eightball', name: '8-Ball', price: 120, icon: '🎱', desc: 'Signs point to yes' },
  { id: 'heart', name: 'Heart', price: 150, icon: '❤️', desc: 'Love from the lobby' },
  { id: 'duck', name: 'Rubber Duck', price: 150, icon: '🦆', desc: 'Squeak' },
  { id: 'pumpkin', name: 'Pumpkin', price: 150, icon: '🎃', desc: 'Spooky season, all year' },
  { id: 'star', name: 'Gold Star', price: 200, icon: '⭐', desc: 'For a job well done' },
  { id: 'bullet', name: 'Golden Bullet', price: 200, icon: '🔸', desc: 'One shot, one charm' },
  { id: 'skull', name: 'Skull', price: 250, icon: '💀', desc: 'For the tryhards' },
  { id: 'gem', name: 'Diamond', price: 300, icon: '💎', desc: 'Sparkles in the light' },
  { id: 'shield', name: 'Mod Shield', reward: true, staff: true, how: 'Only moderators have this one', icon: '🛡', desc: 'A little silver shield with a blue badge' },
  { id: 'crown', name: 'Crown', reward: true, owner: true, how: 'Only the game owner has this one', icon: '👑', desc: 'A little golden crown with a red gem' },
];
export const CHARM_IDS = CHARM_ITEMS.map((c) => c.id);

let mats = null;
const mat = (k) => {
  if (!mats) {
    const m = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
    mats = {
      chain: m('#b8bcc4', { metalness: 0.9, roughness: 0.3 }), white: m('#f2f2f2'), black: m('#151515'), red: m('#e0283c'),
      yellow: m('#ffd21f'), orange: m('#ff7a12'), green: m('#3a8f2a'), gold: m('#ffc634', { metalness: 0.8, roughness: 0.25 }),
      silver: m('#d8e0ea', { metalness: 0.8, roughness: 0.25 }), blue: m('#2f6ad8', { metalness: 0.3, roughness: 0.35, emissive: '#0a2a6a', emissiveIntensity: 0.4 }),
      brass: m('#d4a23a', { metalness: 0.85, roughness: 0.3 }), gem: m('#7fe9ff', { metalness: 0.2, roughness: 0.05, emissive: '#1a6f88', emissiveIntensity: 0.4 }),
    };
  }
  return mats[k];
};
const add = (g, geo, m, x, y, z) => { const o = new THREE.Mesh(geo, mat(m)); o.position.set(x, y, z); g.add(o); return o; };

// The charm on its chain, hanging down from (0, 0, 0). Sizes in meters (gun scale).
export function buildCharm(id) {
  if (!id || id === 'none' || !CHARM_IDS.includes(id)) return null;
  const g = new THREE.Group(), s = 0.028;
  add(g, new THREE.CylinderGeometry(0.0025, 0.0025, 0.035, 5), 'chain', 0, -0.0175, 0);
  add(g, new THREE.TorusGeometry(0.006, 0.0018, 5, 10), 'chain', 0, -0.037, 0);
  const y = -0.04 - s;
  if (id === 'dice') {
    const d = add(g, new THREE.BoxGeometry(s * 1.6, s * 1.6, s * 1.6), 'white', 0, y, 0); d.rotation.set(0.4, 0.6, 0.2);
    for (const [px, py] of [[0.4, 0.4], [-0.4, -0.4], [0, 0]]) add(d, new THREE.SphereGeometry(s * 0.17, 6, 4), 'black', px * s, py * s, s * 0.8);
  } else if (id === 'eightball') {
    add(g, new THREE.SphereGeometry(s * 0.9, 14, 10), 'black', 0, y, 0);
    add(g, new THREE.CircleGeometry(s * 0.4, 12), 'white', 0, y + s * 0.15, s * 0.88);
  } else if (id === 'heart') {
    add(g, new THREE.SphereGeometry(s * 0.55, 10, 8), 'red', -s * 0.4, y + s * 0.25, 0);
    add(g, new THREE.SphereGeometry(s * 0.55, 10, 8), 'red', s * 0.4, y + s * 0.25, 0);
    const c = add(g, new THREE.ConeGeometry(s * 0.88, s * 1.2, 12), 'red', 0, y - s * 0.45, 0); c.rotation.z = Math.PI;
  } else if (id === 'duck') {
    add(g, new THREE.SphereGeometry(s * 0.8, 12, 8), 'yellow', 0, y - s * 0.2, 0).scale.set(1, 0.8, 1.2);
    add(g, new THREE.SphereGeometry(s * 0.5, 10, 8), 'yellow', 0, y + s * 0.6, -s * 0.4);
    const b = add(g, new THREE.ConeGeometry(s * 0.2, s * 0.5, 8), 'orange', 0, y + s * 0.55, -s * 0.95); b.rotation.x = -Math.PI / 2;
  } else if (id === 'pumpkin') {
    add(g, new THREE.SphereGeometry(s * 0.85, 12, 8), 'orange', 0, y, 0).scale.set(1.15, 0.85, 1.15);
    add(g, new THREE.CylinderGeometry(s * 0.12, s * 0.15, s * 0.4, 6), 'green', 0, y + s * 0.85, 0);
  } else if (id === 'star') {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? s * 0.45 : s * 1.1; if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: s * 0.35, bevelEnabled: false }); geo.center();
    add(g, geo, 'gold', 0, y, 0);
  } else if (id === 'bullet') {
    add(g, new THREE.CylinderGeometry(s * 0.35, s * 0.35, s * 1.3, 10), 'brass', 0, y + s * 0.2, 0);
    add(g, new THREE.ConeGeometry(s * 0.35, s * 0.8, 10), 'gold', 0, y - s * 0.85, 0).rotation.z = Math.PI;
  } else if (id === 'skull') {
    add(g, new THREE.SphereGeometry(s * 0.8, 12, 10), 'white', 0, y + s * 0.15, 0);
    add(g, new THREE.BoxGeometry(s * 0.9, s * 0.45, s * 0.8), 'white', 0, y - s * 0.6, 0);
    for (const x of [-0.32, 0.32]) add(g, new THREE.SphereGeometry(s * 0.22, 8, 6), 'black', x * s, y + s * 0.1, -s * 0.66);
  } else if (id === 'shield') {
    const sh = new THREE.Shape(); // a flat top, curving down to a point
    sh.moveTo(-s * 0.8, s * 0.7);
    sh.lineTo(s * 0.8, s * 0.7);
    sh.quadraticCurveTo(s * 0.8, -s * 0.5, 0, -s * 1.1);
    sh.quadraticCurveTo(-s * 0.8, -s * 0.5, -s * 0.8, s * 0.7);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: s * 0.25, bevelEnabled: false }); geo.center();
    add(g, geo, 'silver', 0, y, 0);
    add(g, new THREE.CylinderGeometry(s * 0.32, s * 0.32, s * 0.3, 6), 'blue', 0, y + s * 0.05, 0).rotation.x = Math.PI / 2;
  } else if (id === 'crown') {
    add(g, new THREE.CylinderGeometry(s * 0.8, s * 0.7, s * 0.5, 12), 'gold', 0, y, 0);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(g, new THREE.ConeGeometry(s * 0.18, s * 0.6, 4), 'gold', Math.cos(a) * s * 0.65, y + s * 0.5, Math.sin(a) * s * 0.65); }
    add(g, new THREE.SphereGeometry(s * 0.2, 8, 6), 'red', 0, y, -s * 0.78);
  } else if (id === 'gem') {
    add(g, new THREE.OctahedronGeometry(s * 0.95), 'gem', 0, y, 0).scale.set(0.8, 1.2, 0.8);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  g.userData.swing = { a: 0, b: 0, va: 0, vb: 0 };
  return g;
}

// Hangs a charm off the left side (the side you see in first person), toward the back, of a gun model (removing any old one). Returns it (or null).
const _box = new THREE.Box3(), _part = new THREE.Box3(), _m = new THREE.Matrix4(), _inv = new THREE.Matrix4();
export function attachCharm(gun, id) {
  if (gun.userData.charm) { gun.remove(gun.userData.charm); gun.userData.charm = null; }
  if (!gun.userData.charmBox) gun.userData.charmBox = measure(gun); // measured once, right after it's built (before hands are added)
  const c = buildCharm(id);
  if (!c) return null;
  const b = gun.userData.charmBox, len = b.max.z - b.min.z;
  c.position.set(b.min.x - 0.004, b.min.y + (b.max.y - b.min.y) * 0.62, b.max.z - len * 0.3);
  gun.add(c);
  gun.userData.charm = c;
  return c;
}
// The gun's size in its own space (each part measured relative to the gun, so a gun already held at
// an angle doesn't look bigger than it is).
function measure(gun) {
  gun.updateWorldMatrix(true, true);
  _inv.copy(gun.matrixWorld).invert();
  _box.makeEmpty();
  gun.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _box.union(_part.copy(o.geometry.boundingBox).applyMatrix4(_m.multiplyMatrices(_inv, o.matrixWorld)));
  });
  return _box.clone();
}

// A little pendulum: it swings with the gun's movement (push: how hard it was jolted), settling over time.
export function swingCharm(c, dt, pushA = 0, pushB = 0) {
  if (!c) return;
  const s = c.userData.swing;
  s.va += (-s.a * 40 - s.va * 2.2) * dt + pushA;
  s.vb += (-s.b * 40 - s.vb * 2.2) * dt + pushB;
  s.a += s.va * dt; s.b += s.vb * dt;
  s.a = Math.max(-1, Math.min(1, s.a)); s.b = Math.max(-1, Math.min(1, s.b));
  c.rotation.set(s.b, 0, s.a);
}
