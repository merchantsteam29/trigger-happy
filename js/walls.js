import * as THREE from 'three';
import { boxes, breakables } from './maps.js';

// Breakable walls: glass in building windows and wooden boards across some doorways (maps.js marks them
// with mat 'boards' and numbers them `brk` in build order, so every player has the same ids).
// The host keeps their health (HostLogic.damageWall: bullets, explosions, bots barging through)
// and lists the broken ones in each snapshot (`wb`). Clients take a broken board out of the
// collision boxes and hide its mesh; boards come back when the next match starts.

export const BOARD_HP = 220, GLASS_HP = 1; // glass: one shot shatters it
export const boardHp = (b) => (b.mat === 'glass' ? GLASS_HP : BOARD_HP);
const meshes = new Map(); // brk id -> mesh in this map's scene
let woodMat = null, darkMat = null, glassMat = null, frameMat = null;

export const boardById = (id) => breakables.find((b) => b.brk === id) || null;
export const boardCenter = (b) => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2];

// Planks for every board (called after the map's scene is built).
export function buildBoards(group) {
  meshes.clear();
  if (!woodMat) {
    woodMat = new THREE.MeshStandardMaterial({ color: '#8b5a2b', roughness: 0.85 });
    darkMat = new THREE.MeshStandardMaterial({ color: '#5e3b1a', roughness: 0.9 });
    glassMat = new THREE.MeshStandardMaterial({ color: '#bfe6ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.28, depthWrite: false });
    frameMat = new THREE.MeshStandardMaterial({ color: '#d8dde4', roughness: 0.6 });
    woodMat.userData.shared = darkMat.userData.shared = glassMat.userData.shared = frameMat.userData.shared = true; // kept when the map changes
  }
  for (const b of breakables) {
    const g = new THREE.Group();
    if (b.mat === 'glass') { // a pane in a thin frame
      const w = b.x1 - b.x0, h = b.y1 - b.y0, d = b.z1 - b.z0, alongX = w >= d, len = alongX ? w : d;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.03, h, alongX ? 0.03 : len), glassMat);
      pane.renderOrder = 2;
      g.add(pane);
      for (const y of [-h / 2, h / 2]) { const f = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.06, 0.06, alongX ? 0.06 : len), frameMat); f.position.y = y; g.add(f); }
      g.position.set(...boardCenter(b));
      g.visible = !b.broken;
      group.add(g);
      meshes.set(b.brk, g);
      continue;
    }
    const w = b.x1 - b.x0, h = b.y1 - b.y0, d = b.z1 - b.z0, alongX = w >= d;
    const len = alongX ? w : d, thick = (alongX ? d : w) * 0.7;
    const n = Math.max(1, Math.round(h / 0.3)), ph = h / n;
    for (let i = 0; i < n; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len + 0.08 : thick, ph * 0.84, alongX ? thick : len + 0.08), i % 3 === 1 ? darkMat : woodMat);
      plank.position.y = -h / 2 + ph * (i + 0.5);
      const tilt = Math.sin(b.brk * 7.3 + i * 3.1) * 0.035; // a little crooked
      if (alongX) plank.rotation.z = tilt; else plank.rotation.x = tilt;
      plank.castShadow = plank.receiveShadow = true;
      g.add(plank);
    }
    for (const s of [-1, 1]) { // battens holding the planks
      const bat = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.14 : thick + 0.05, h, alongX ? thick + 0.05 : 0.14), darkMat);
      if (alongX) bat.position.x = s * len * 0.3; else bat.position.z = s * len * 0.3;
      g.add(bat);
    }
    g.position.set(...boardCenter(b));
    g.visible = !b.broken;
    group.add(g);
    meshes.set(b.brk, g);
  }
}

// Breaks (or puts back) one board: collision box and mesh.
export function setBroken(b, broken) {
  if (!!b.broken !== broken) {
    b.broken = broken;
    const i = boxes.indexOf(b);
    if (broken && i >= 0) boxes.splice(i, 1);
    if (!broken && i < 0) boxes.push(b);
  }
  const m = meshes.get(b.brk);
  if (m) m.visible = !broken;
}

// The host's list of broken board ids (every snapshot): everything else stands.
export function applyBoards(ids) {
  const set = new Set(ids || []);
  for (const b of breakables) setBroken(b, set.has(b.brk));
}

// Runs fn with every board out of the collision boxes (bots' paths go through boards: they break them).
export function withoutBoards(fn) {
  const out = breakables.filter((b) => boxes.includes(b));
  for (const b of out) boxes.splice(boxes.indexOf(b), 1);
  try { return fn(); } finally { boxes.push(...out); }
}
