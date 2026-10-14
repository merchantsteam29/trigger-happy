// Victory poses: a cosmetic (slot `pose` in missions.js COSMETICS). When a match ends, the MVP
// steps onto a stage and does their pose while the MVP card is up (game.js `startStage`), so
// everyone sees it. The model is a RemotePlayer driven by `setPose` (remote.js).
//
// poseHand(id, side, t): where a hand goes, in the body's own space (x right, y up, -z forward,
// feet at 0), or null for the normal pose. poseBody(id, t): { y, yaw, bend, hipX } offsets.

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
    default: return null;
  }
}

export function poseBody(id, t) {
  const out = { y: 0, yaw: 0, bend: 0, hipX: 0 };
  if (id === 'cheer') out.y = Math.abs(Math.sin(t * 7)) * 0.07;
  else if (id === 'dab') { out.bend = 0.25; out.yaw = -0.25; }
  else if (id === 'bow') out.bend = Math.min(1, Math.max(0, Math.sin(Math.min(Math.PI, t * 1.6)))) * 0.75;
  else if (id === 'floss') out.hipX = -Math.sin(t * 7) * 0.08;
  else if (id === 'spin') { const ph = (t * 3.4) % (Math.PI * 2); out.y = Math.max(0, Math.sin(ph)) * 0.65; out.yaw = ph < Math.PI ? (ph / Math.PI) * Math.PI * 2 : 0; } // one full turn per jump
  else if (id === 'levitate') { out.y = Math.min(1, t * 0.8) * 0.45 + Math.sin(t * 2) * 0.06; out.yaw = t * 0.7; }
  return out;
}
