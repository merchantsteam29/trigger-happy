import * as THREE from 'three';

// Prop Hunt (host.js mode 'prophunt'): props (team 1) hide disguised as one of these; hunters
// (team 2) are blind for HIDE_MS, then search. Shared by the host (rules), game.js (your own
// disguise, third-person view) and remote.js (other players drawn as their prop).

export const HIDE_MS = 25000;
export const DISGUISES = ['crate', 'barrel', 'box', 'cone', 'tire'];
export const DISGUISE_NAME = { crate: 'Crate', barrel: 'Barrel', box: 'Box', cone: 'Traffic cone', tire: 'Tires' };
// [width, height] in meters: the hitbox and the camera height for each shape.
export const PROP_SIZE = { crate: [0.9, 0.9], barrel: [0.8, 1.05], box: [0.55, 0.5], cone: [0.5, 0.75], tire: [0.9, 0.5] };

// The disguise's hitbox, standing at pos.
export function disguiseBox(kind, pos) {
  const [w, h] = PROP_SIZE[kind] || PROP_SIZE.crate, r = w / 2;
  return { head: false, x0: pos.x - r, y0: pos.y, z0: pos.z - r, x1: pos.x + r, y1: pos.y + h, z1: pos.z + r };
}

const mat = (color, o = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o }); m.userData.shared = true; return m; };
const M = {
  wood: mat('#9a6a3a'), woodDark: mat('#5e3d1e'), red: mat('#b8322a', { roughness: 0.5, metalness: 0.3 }), band: mat('#3a3a3a', { metalness: 0.6, roughness: 0.4 }),
  card: mat('#c9a06a'), tape: mat('#e6d4a8'), orange: mat('#ff6a1a', { roughness: 0.5 }), white: mat('#f2f2f2'), rubber: mat('#1d1d1f', { roughness: 0.95 }),
};

function add(g, geo, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}

// A model of the disguise, origin at its base.
export function buildDisguise(kind) {
  const g = new THREE.Group();
  const [w, h] = PROP_SIZE[kind] || PROP_SIZE.crate;
  if (kind === 'barrel') {
    add(g, new THREE.CylinderGeometry(w / 2, w / 2, h, 16), M.red, 0, h / 2, 0);
    for (const y of [0.18, 0.5, 0.82]) add(g, new THREE.CylinderGeometry(w / 2 + 0.01, w / 2 + 0.01, 0.04, 16), M.band, 0, h * y, 0);
  } else if (kind === 'box') {
    add(g, new THREE.BoxGeometry(w, h, w), M.card, 0, h / 2, 0);
    add(g, new THREE.BoxGeometry(w + 0.005, 0.01, 0.08), M.tape, 0, h + 0.001, 0);
  } else if (kind === 'cone') {
    add(g, new THREE.BoxGeometry(w, 0.05, w), M.orange, 0, 0.025, 0);
    add(g, new THREE.CylinderGeometry(0.03, w * 0.36, h - 0.05, 14), M.orange, 0, 0.05 + (h - 0.05) / 2, 0);
    add(g, new THREE.CylinderGeometry(0.11, 0.16, 0.12, 14), M.white, 0, h * 0.52, 0);
  } else if (kind === 'tire') {
    for (const y of [0.13, 0.38]) {
      const t = add(g, new THREE.TorusGeometry(w * 0.34, w * 0.14, 8, 18), M.rubber, 0, y, 0);
      t.rotation.x = Math.PI / 2;
    }
  } else { // crate
    add(g, new THREE.BoxGeometry(w, h, w), M.wood, 0, h / 2, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, new THREE.BoxGeometry(0.08, h + 0.01, 0.08), M.woodDark, sx * (w / 2 - 0.035), h / 2, sz * (w / 2 - 0.035));
    for (const y of [0.04, h - 0.04]) add(g, new THREE.BoxGeometry(w + 0.01, 0.08, w + 0.01), M.woodDark, 0, y, 0);
  }
  return g;
}
