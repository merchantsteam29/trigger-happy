import * as THREE from 'three';
import { movers } from './maps.js';

// Moving platforms (a map's `movers`: elevators and shuttling bridges). Each is a collision box
// that moves along its path on a fixed schedule from the host's clock, so every player and bot sees
// it in the same place without sending anything. Whoever stands on one is carried along (`carry`).
// maps.js creates them in setMapData; the client and the host both call updateMovers every frame.

// Where a mover is at time t (ms): it waits at each end for `pause` of its trip, easing in between.
export function moverOffset(m, t) {
  const p = m.pause, k = ((((t / 1000 + m.phase) % m.period) + m.period) % m.period) / m.period;
  let f;
  if (k < p) f = 0;
  else if (k < 0.5) f = (k - p) / (0.5 - p);
  else if (k < 0.5 + p) f = 1;
  else f = 1 - (k - 0.5 - p) / (0.5 - p);
  f = f * f * (3 - 2 * f); // ease
  return [m.d[0] * f, m.d[1] * f, m.d[2] * f];
}

// Moves every mover's box to time t.
export function updateMovers(t) {
  for (const m of movers) {
    const o = moverOffset(m, t), b = m.box, a = m.at;
    b.x0 = a[0] + o[0]; b.y0 = a[1] + o[1]; b.z0 = a[2] + o[2];
    b.x1 = a[3] + o[0]; b.y1 = a[4] + o[1]; b.z1 = a[5] + o[2];
    if (m.mesh) m.mesh.position.set((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
  }
}

// A body standing on a mover rides along from tPrev to tNow.
export function carry(body, tPrev, tNow) {
  const g = body.ground, m = g && g.mover;
  if (!m || tPrev === tNow) return;
  const a = moverOffset(m, tPrev), b = moverOffset(m, tNow);
  body.pos.x += b[0] - a[0]; body.pos.y += b[1] - a[1]; body.pos.z += b[2] - a[2];
}

// Meshes for the movers (hazard-yellow platforms), added to the map's scene group.
let mat = null, edge = null;
export function buildMovers(group) {
  if (!movers.length) return;
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color: '#f2c12e', roughness: 0.55, metalness: 0.3 });
    edge = new THREE.MeshStandardMaterial({ color: '#1b1b1f', roughness: 0.7 });
    mat.userData.shared = edge.userData.shared = true;
  }
  for (const m of movers) {
    const a = m.at, w = a[3] - a[0], h = a[4] - a[1], d = a[5] - a[2];
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    top.castShadow = top.receiveShadow = true;
    g.add(top);
    for (const s of [-1, 1]) { // black stripes on the edges
      const e = new THREE.Mesh(new THREE.BoxGeometry(w >= d ? w + 0.02 : 0.12, h + 0.02, w >= d ? 0.12 : d + 0.02), edge);
      if (w >= d) e.position.z = s * (d / 2 - 0.06); else e.position.x = s * (w / 2 - 0.06);
      g.add(e);
    }
    g.position.set((a[0] + a[3]) / 2, (a[1] + a[4]) / 2, (a[2] + a[5]) / 2);
    group.add(g);
    m.mesh = g;
  }
}
