import * as THREE from 'three';
import { M, box, rbox, cyl, cylX, cylY, ring, sphere } from './modelkit.js';

// Gun skins: a weapon's whole model changes (not just its colors, that's wraps in camos.js). Damage,
// speed and accuracy never change. Each skin belongs to one weapon; you can wear one per weapon
// (cos.skins: a list of skin ids, see missions.js). Built by models.js buildGun:
//   base     build another weapon's model instead (the old Laser Rifle on the assault rifle)
//   recolor  keep the model, swap its materials (gold)
//   build    keep the weapon's anchors and moving parts, replace every mesh with your own
// Who gets each: price (shop), `handout` (the owner gives it out), `owner` (the owner's own, shown
// only on the verified owner). Skins keep their own colors: wraps don't change them.

const HANDOUT = 'Giveaway only: the owner hands it out';
export const SKIN_ITEMS = [
  { id: 'none', name: 'No skin', free: true, icon: '🔫', desc: 'The normal model.' },
  { id: 'toyblaster', gun: 'ar', name: 'Toy Blaster', price: 800, icon: '🧸', desc: 'Orange and blue plastic with a foam-dart barrel.' },
  { id: 'laserrifle', gun: 'ar', name: 'Laser Rifle', price: 900, icon: '🔷', desc: 'The old Laser Rifle\'s white sci-fi body with glowing cyan coils.' },
  { id: 'pumpkin', gun: 'rocket', name: 'Pumpkin Launcher', price: 900, icon: '🎃', desc: 'A carved pumpkin tube with a vine strap.' },
  { id: 'golddeagle', gun: 'handcannon', name: 'Golden Deagle', price: 1000, icon: '🥇', desc: 'Solid gold with black grips.' },
  { id: 'fish', gun: 'knife', name: 'Fish', price: 700, icon: '🐟', desc: 'Slap them with a fish.' },
  { id: 'energyblade', gun: 'knife', name: 'Energy Blade', price: 1000, icon: '⚔', desc: 'A glowing energy blade on a metal hilt.' },
  { id: 'coinrevolver', gun: 'revolver', name: 'Marksman Revolver', reward: true, handout: true, how: HANDOUT, icon: '🪙', desc: 'A blue machine revolver with a coin on top (goes with Blood Machine).' },
  { id: 'shieldsaw', gun: 'shotgun', name: 'Shield Saw Shotgun', reward: true, handout: true, how: HANDOUT, icon: '🪚', desc: 'Green armor plating and a saw blade under the barrel (goes with Hellwalker).' },
  { id: 'gigachad', gun: 'ar', name: 'GIGACHAD Rifle', reward: true, owner: true, how: 'Only the game owner has this one', icon: '👑', desc: 'Solid gold with a crown and red gems.' },
];
export const skinItem = (id) => SKIN_ITEMS.find((s) => s.id === id && s.gun) || null;
// The skin someone wears on weapon `gun` (from their list), or null.
export const skinFor = (skins, gun) => (Array.isArray(skins) ? skins.map(skinItem).find((s) => s && s.gun === gun) : null) || null;

const mats = new Map();
const mat = (color, o = {}) => { const k = color + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o })); return mats.get(k); };
const glow = (color, i = 1.8) => mat(color, { emissive: color, emissiveIntensity: i });

// recolor skins: which of the model's materials become what
const GOLD = mat('#f2c033', { metalness: 0.35, roughness: 0.25, emissive: '#4a3000', emissiveIntensity: 0.6 }), DGOLD = mat('#b8860b', { metalness: 0.35, roughness: 0.35 });
// Everything gold except glass, lenses and lights; the darkest parts (grips, rubber) go deep gold.
const KEEP = () => new Set([M.lens, M.glass, M.reticle, M.dot, M.glow, M.led, M.cyan, M.tube]);
const toGold = (grips = mat('#141414')) => (m) => {
  if (KEEP().has(m) || !m.color) return m;
  const c = m.color, lum = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
  return m === M.poly || m === M.rubber ? grips : lum < 0.02 ? DGOLD : GOLD;
};

const SKINS = {
  laserrifle: { base: 'laser' },
  golddeagle: { recolor: () => toGold() },
  gigachad: {
    recolor: () => toGold(mat('#7a0a14', { roughness: 0.5 })), // red grips
    extra(g) { // a crown on top and red gems down the side
      const gem = mat('#d0122a', { emissive: '#600010', emissiveIntensity: 0.9, roughness: 0.2 });
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const c = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 4), GOLD); c.position.set(Math.cos(a) * 0.02, 0.15, -0.02 + Math.sin(a) * 0.02); g.add(c); }
      cylY(g, GOLD, 0.024, 0.014, 0, 0.13, -0.02, 12);
      for (const z of [-0.15, -0.3, -0.45]) for (const s of [-1, 1]) sphere(g, gem, 0.007, s * 0.04, 0.07, z, 8, 6);
    },
  },
  toyblaster: {
    build(g) {
      const orange = mat('#ff8a1a', { roughness: 0.4 }), blue = mat('#2f7fe0', { roughness: 0.4 }), yellow = mat('#ffd23a', { roughness: 0.5 }), foam = mat('#f4f4f4', { roughness: 0.9 });
      rbox(g, orange, 0.08, 0.11, 0.42, 0, 0.06, -0.08); // body
      box(g, blue, 0.03, 0.05, 0.3, 0, 0.13, -0.08); // top fin
      cyl(g, blue, 0.03, 0.34, 0, 0.07, -0.44, 14); // barrel
      cyl(g, orange, 0.036, 0.04, 0, 0.07, -0.6, 14); // muzzle ring
      cyl(g, foam, 0.018, 0.05, 0, 0.07, -0.63, 10); cyl(g, mat('#ff3a3a'), 0.019, 0.02, 0, 0.07, -0.665, 10); // foam dart poking out
      cylX(g, yellow, 0.05, 0.09, 0, 0.0, -0.18, 14); // drum
      rbox(g, blue, 0.04, 0.12, 0.05, 0, -0.06, 0.06, -0.25); // grip
      box(g, yellow, 0.02, 0.04, 0.05, 0, -0.01, -0.02); // trigger guard
      for (const y of [0.0, 0.08]) box(g, blue, 0.03, 0.025, 0.24, 0, y, 0.22); // open stock
      rbox(g, orange, 0.05, 0.12, 0.04, 0, 0.04, 0.34);
    },
  },
  pumpkin: {
    build(g) {
      const pk = mat('#f07a12', { roughness: 0.7 }), ridge = mat('#c85a0a', { roughness: 0.7 }), stem = mat('#4f7a2a', { roughness: 0.8 }), black = mat('#120804'), fire = glow('#ffb23a', 1.6);
      cyl(g, pk, 0.085, 0.9, 0, 0.09, -0.2, 16); // tube
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; box(g, ridge, 0.012, 0.012, 0.88, Math.cos(a) * 0.084, 0.09 + Math.sin(a) * 0.084, -0.2); }
      // The pumpkin at the front: round, ribbed, with a carved glowing face and a stem
      const head = new THREE.Group(); head.position.set(0, 0.09, -0.62); g.add(head);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rib = sphere(head, i % 2 ? pk : ridge, 0.1, Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0, 12, 10); rib.scale.set(0.75, 0.75, 0.85); }
      ring(head, black, 0.06, 0.008, 0, 0, -0.085, 18);
      for (const s of [-1, 1]) {
        for (const z of [-0.03, 0.04]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.035, 3), fire); e.rotation.set(0, s * Math.PI / 2, 0); e.position.set(s * 0.125, 0.03, z); head.add(e); } // eyes
        box(head, fire, 0.008, 0.018, 0.09, s * 0.125, -0.035, 0.005); // grin
      }
      cyl(head, stem, 0.012, 0.05, 0, 0.13, 0.0, 8); head.children[head.children.length - 1].rotation.x = 0.2;
      cyl(g, stem, 0.018, 0.08, 0, 0.18, 0.24, 8); // stem at the back
      for (let i = 0; i < 4; i++) box(g, stem, 0.01, 0.01, 0.08, Math.sin(i) * 0.06, 0.02 - i * 0.02, -0.4 + i * 0.12, 0, 0.6, 0); // vine strap
      rbox(g, mat('#4a2a10'), 0.05, 0.13, 0.06, 0, -0.05, 0.0, -0.2); // grip
      rbox(g, mat('#4a2a10'), 0.05, 0.12, 0.06, 0, -0.03, -0.3);
    },
  },
  fish: {
    build(g) {
      const scale = mat('#ff8a3a', { roughness: 0.4, metalness: 0.1 }), belly = mat('#ffd9a8', { roughness: 0.6 }), fin = mat('#ff5a1a', { roughness: 0.5 }), eye = mat('#111');
      const body = sphere(g, scale, 0.05, 0, 0, -0.14, 14, 10); body.scale.set(0.7, 1, 2.8);
      const b2 = sphere(g, belly, 0.045, 0, -0.012, -0.14, 12, 8); b2.scale.set(0.66, 0.7, 2.6);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), fin); tail.rotation.set(-Math.PI / 2, 0, Math.PI / 4); tail.scale.set(0.3, 1, 1); tail.position.set(0, 0, 0.04); g.add(tail);
      box(g, fin, 0.006, 0.04, 0.08, 0, 0.05, -0.14); // back fin
      for (const s of [-1, 1]) { sphere(g, mat('#fff'), 0.012, s * 0.03, 0.015, -0.26, 8, 6); sphere(g, eye, 0.007, s * 0.038, 0.015, -0.265, 6, 4); }
      box(g, mat('#c8402a'), 0.03, 0.006, 0.02, 0, -0.012, -0.285); // mouth
    },
  },
  energyblade: {
    build(g) {
      const hilt = mat('#b8bec6', { metalness: 0.6, roughness: 0.3 }), dark = mat('#2a2d33'), core = new THREE.MeshBasicMaterial({ color: '#e8fbff' }), aura = new THREE.MeshBasicMaterial({ color: '#3fb8ff', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
      cyl(g, hilt, 0.02, 0.16, 0, 0, 0.02, 12);
      for (let i = 0; i < 4; i++) cyl(g, dark, 0.021, 0.012, 0, 0, -0.02 + i * 0.03, 12);
      cyl(g, dark, 0.024, 0.02, 0, 0, -0.065, 12);
      box(g, glow('#ff3a3a', 2), 0.008, 0.01, 0.01, 0.02, 0.012, 0.0); // power button
      cyl(g, core, 0.01, 0.42, 0, 0, -0.29, 10); // the blade
      cyl(g, aura, 0.02, 0.44, 0, 0, -0.29, 12).castShadow = false;
    },
  },
  coinrevolver: {
    build(g) {
      const blue = mat('#2f5fc8', { metalness: 0.35, roughness: 0.3 }), steel = mat('#4a5262', { metalness: 0.4, roughness: 0.35 }), yellow = glow('#ffcf3a', 1.2), coin = mat('#f2c033', { metalness: 0.4, roughness: 0.25, emissive: '#4a3000', emissiveIntensity: 0.5 });
      rbox(g, blue, 0.045, 0.06, 0.13, 0, 0.042, -0.02); // frame
      cyl(g, steel, 0.02, 0.24, 0, 0.06, -0.19, 12); // barrel
      box(g, blue, 0.02, 0.03, 0.22, 0, 0.085, -0.18); // top strap
      for (const z of [-0.1, -0.2]) box(g, yellow, 0.022, 0.006, 0.03, 0, 0.1, z); // lights
      const c = g.getObjectByName('cyl'); // the cylinder still spins when you shoot
      if (c) { cyl(c, steel, 0.036, 0.066, 0, 0, 0, 14); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(c, yellow, 0.006, 0.006, 0.068, Math.cos(a) * 0.036, Math.sin(a) * 0.036, 0); } }
      rbox(g, steel, 0.046, 0.12, 0.056, 0, -0.05, 0.045, -0.35); // grip
      box(g, blue, 0.012, 0.04, 0.018, 0, 0.075, 0.045, 0.6); // hammer
      const k = cylY(g, coin, 0.022, 0.006, 0, 0.13, 0.0, 16); k.rotation.x = 0.4; // the coin, ready to flip
    },
  },
  shieldsaw: {
    build(g) {
      const green = mat('#556b2f', { metalness: 0.3, roughness: 0.5 }), steel = mat('#8a8e92', { metalness: 0.5, roughness: 0.3 }), dark = mat('#262a1e', { roughness: 0.6 });
      rbox(g, green, 0.08, 0.09, 0.36, 0, 0.06, -0.06); // receiver
      for (const s of [-1, 1]) cyl(g, steel, 0.02, 0.5, s * 0.022, 0.08, -0.45, 12); // twin barrels
      box(g, green, 0.08, 0.02, 0.44, 0, 0.115, -0.38); // top plate
      const pump = g.getObjectByName('pump');
      rbox(pump || g, dark, 0.07, 0.06, 0.14, 0, 0.02, pump ? 0 : -0.32);
      // The saw blade under the barrels
      const saw = new THREE.Group(); saw.position.set(0, -0.02, -0.5); saw.rotation.y = Math.PI / 2; g.add(saw);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.012, 20), steel); disc.rotation.x = Math.PI / 2; saw.add(disc);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, t = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 3), dark); t.position.set(Math.cos(a) * 0.088, Math.sin(a) * 0.088, 0); t.rotation.z = a - Math.PI / 2; saw.add(t); }
      cylY(g, dark, 0.012, 0.06, 0, 0.0, -0.5);
      rbox(g, dark, 0.05, 0.12, 0.05, 0, -0.05, 0.06, -0.3); // grip
      rbox(g, green, 0.06, 0.1, 0.24, 0, 0.04, 0.24); // stock
      box(g, glow('#ff3a1a', 1.4), 0.082, 0.01, 0.04, 0, 0.09, 0.02); // a red light
    },
  },
};

// Called by buildGun: the model to build for `key` with skin `sk` ({ base } swaps the builder).
export const skinBase = (sk) => (sk && SKINS[sk.id] && SKINS[sk.id].base) || null;
// After the weapon's own builder ran: replace / recolor its meshes. Returns the spec to finish with.
export function applySkin(g, sk, spec) {
  const def = sk && SKINS[sk.id];
  if (!def) return spec;
  if (def.recolor) {
    const swap = def.recolor();
    g.traverse((o) => { if (o.isMesh) o.material = swap(o.material); });
    if (def.extra) def.extra(g);
    return spec;
  }
  if (def.build) {
    // Keep groups and anchor points (reload / slide animations, hands, muzzle); drop the meshes.
    const meshes = [];
    g.traverse((o) => { if (o.isMesh) meshes.push(o); });
    for (const m of meshes) m.parent.remove(m);
    def.build(g);
    // No iron sights or muzzle devices on top of a skin (optics you picked still go on)
    return spec ? { ...spec, irons: null, folded: null, device: null } : spec;
  }
  return spec;
}
