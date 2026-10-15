// Victory poses: a cosmetic (slot `pose` in missions.js COSMETICS). When a match ends, the MVP
// steps onto a stage and does their pose while the MVP card is up (game.js `startStage`), so
// everyone sees it. The model is a RemotePlayer driven by `setPose` (remote.js).
//
// poseHand(id, side, t): where a hand goes, in the body's own space (x right, y up, -z forward,
// feet at 0), or null for the normal pose. poseBody(id, t): { y, yaw, bend, hipX } offsets.

import * as THREE from 'three';

export const POSE_ITEMS = [
  { id: 'cheer', name: 'Cheer', free: true, icon: '🙌', desc: 'Both arms up, bouncing' },
  { id: 'flex', name: 'Flex', price: 200, icon: '💪', desc: 'Show off those arms' },
  { id: 'fingerguns', name: 'Finger Guns', price: 200, icon: '👉', desc: 'Pew pew' },
  { id: 'dab', name: 'Dab', price: 250, icon: '😎', desc: 'The classic' },
  { id: 'heart', name: 'Heart Hands', price: 250, icon: '🫶', desc: 'Love to the lobby' },
  { id: 'bow', name: 'Take a Bow', price: 300, icon: '🙇', desc: 'A gracious winner' },
  { id: 'floss', name: 'Floss', price: 350, icon: '🕺', desc: 'Arms swinging side to side' },
  { id: 'spin', name: 'Spin Jump', price: 400, icon: '🤸', desc: 'Jumps and spins in the air' },
  { id: 'levitate', name: 'Levitate', price: 500, icon: '🧘', desc: 'Floats up and slowly turns' },
  { id: 'pushups', name: 'Push-ups', price: 400, icon: '🏋', desc: 'Drops down and does push-ups' },
  { id: 'guitar', name: 'Guitar Solo', price: 450, icon: '🎸', desc: 'Shreds on a guitar' },
  { id: 'throne', name: 'Throne', reward: true, owner: true, how: 'Only the game owner has this one', icon: '👑', desc: 'Sits on a golden throne' },
];
export const POSE_IDS = POSE_ITEMS.map((p) => p.id);

export function poseHand(id, side, t) {
  switch (id) {
    case 'cheer': return [side * 0.32, 1.98 + Math.sin(t * 7 + (side > 0 ? 0 : 1.5)) * 0.07, -0.04];
    case 'flex': return [side * 0.44, 1.62 + Math.sin(t * 5) * 0.03, 0.02];
    case 'fingerguns': return [side * 0.22, 1.38 + Math.max(0, Math.sin(t * 9)) * 0.06, -0.52];
    case 'dab': return side > 0 ? [0.58, 1.78, -0.12] : [0.04, 1.62, -0.26];
    case 'heart': return [side * 0.05, 1.56 + Math.sin(t * 3) * 0.02, -0.38];
    case 'bow': return side > 0 ? [0.14, 1.05, -0.32] : [-0.2, 0.95, 0.12];
    case 'floss': { const s = Math.sin(t * 7); return [s * 0.34 + side * 0.08, 0.98, (s > 0 ? -1 : 1) * side * 0.18]; }
    case 'spin': return [side * 0.3, 1.95, 0];
    case 'levitate': return [side * 0.48, 1.25 + Math.sin(t * 2) * 0.04, -0.12];
    case 'pushups': { const b = poseBody('pushups', t); return [side * 0.28, 1.38, 0.05 - b.y]; } // hands on the floor (body lying face down)
    case 'guitar': return side > 0 ? [0.1, 1.08 + Math.abs(Math.sin(t * 16)) * 0.06, -0.24] : [-0.46, 1.28, -0.22]; // strumming / on the neck
    case 'throne': return [side * 0.36, 0.78, -0.12]; // on the armrests
    default: return null;
  }
}

export function poseBody(id, t) {
  const out = { y: 0, yaw: 0, bend: 0, hipX: 0, pitch: 0, foot: null }; // foot: [x, y, z] added to both feet (root space)
  if (id === 'cheer') out.y = Math.abs(Math.sin(t * 7)) * 0.07;
  else if (id === 'dab') { out.bend = 0.25; out.yaw = -0.25; }
  else if (id === 'bow') out.bend = Math.min(1, Math.max(0, Math.sin(Math.min(Math.PI, t * 1.6)))) * 0.75;
  else if (id === 'floss') out.hipX = -Math.sin(t * 7) * 0.08;
  else if (id === 'spin') { const ph = (t * 3.4) % (Math.PI * 2); out.y = Math.max(0, Math.sin(ph)) * 0.65; out.yaw = ph < Math.PI ? (ph / Math.PI) * Math.PI * 2 : 0; } // one full turn per jump
  else if (id === 'levitate') { out.y = Math.min(1, t * 0.8) * 0.45 + Math.sin(t * 2) * 0.06; out.yaw = t * 0.7; }
  else if (id === 'pushups') { const k = Math.min(1, t * 2); out.pitch = -Math.PI / 2 * k; out.y = (0.34 + Math.sin(t * 5) * 0.11) * k; }
  else if (id === 'guitar') { out.bend = -0.15 + Math.abs(Math.sin(t * 8)) * 0.08; out.y = Math.abs(Math.sin(t * 8)) * 0.03; }
  else if (id === 'throne') { out.y = -0.36; out.foot = [0, 0.36, -0.34]; } // sitting: hips down, feet stay on the floor in front
  return out;
}

// Props for some poses (remote.js setPose): a guitar held across the body, the owner's golden throne.
export function poseProp(id) {
  const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o });
  const box = (g, mat, sx, sy, sz, x, y, z, rz = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); b.position.set(x, y, z); b.rotation.z = rz; g.add(b); return b; };
  if (id === 'guitar') { // carried by the spine
    const g = new THREE.Group(), red = m('#d8202a'), black = m('#141414'), wood = m('#6a3a1a');
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16), red); body.rotation.x = Math.PI / 2; body.position.set(0.04, 0.18, -0.2); g.add(body);
    box(g, black, 0.06, 0.06, 0.06, 0.04, 0.18, -0.24);
    box(g, wood, 0.045, 0.5, 0.025, -0.2, 0.36, -0.22, 1.15); // the neck, up to the left hand
    box(g, black, 0.08, 0.1, 0.03, -0.42, 0.47, -0.22, 1.15); // head
    return { g, bone: 'spine' };
  }
  if (id === 'throne') { // stands on the ground behind them (root)
    const g = new THREE.Group(); g.position.y = 0.36; // the body sits 0.36 lower (poseBody); the throne stays on the floor
    const gold = m('#f5c533', { metalness: 0.35, roughness: 0.3, emissive: '#4a3000', emissiveIntensity: 0.5 }), red = m('#8a0f1e', { roughness: 0.8 });
    box(g, gold, 0.8, 0.12, 0.6, 0, 0.5, 0.05); box(g, red, 0.7, 0.04, 0.5, 0, 0.58, 0.05); // seat and cushion
    box(g, gold, 0.8, 1.3, 0.1, 0, 1.0, 0.36); box(g, red, 0.6, 1.0, 0.02, 0, 1.0, 0.3); // back
    for (const s of [-1, 1]) { box(g, gold, 0.1, 0.3, 0.6, s * 0.4, 0.68, 0.05); box(g, gold, 0.1, 0.5, 0.1, s * 0.4, 0.25, -0.2); box(g, gold, 0.1, 0.5, 0.1, s * 0.4, 0.25, 0.3); }
    for (let i = -2; i <= 2; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), gold); c.position.set(i * 0.16, 1.73, 0.36); g.add(c); } // crown points on top
    return { g, bone: 'root' };
  }
  return null;
}
