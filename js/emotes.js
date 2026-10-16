import * as THREE from 'three';

// Emotes: B opens the bar, 1–5 picks one (game.js). Everyone else sees your character do it
// (remote.js) with an emoji bubble over your head. Sent as an 'fx' message; 3 s cooldown.
export const EMOTES = [
  { id: 'wave', icon: '👋', name: 'Wave' },
  { id: 'dance', icon: '💃', name: 'Dance' },
  { id: 'salute', icon: '🫡', name: 'Salute' },
  { id: 'laugh', icon: '😂', name: 'Laugh' },
  { id: 'flex', icon: '💪', name: 'Flex' },
];
export const EMOTE_IDS = EMOTES.map((e) => e.id);
export const EMOTE_TIME = 2.6;
export const EMOTE_COOLDOWN = 3;

// Where the hands go during an emote, in the body's own space (x right, y up, -z forward), or
// null to keep the normal pose. t: seconds since it started.
export function emoteHand(id, side, t) {
  if (id === 'wave') return side > 0 ? [0.38, 1.8 + Math.sin(t * 9) * 0.04, -0.1 + Math.sin(t * 9) * 0.16] : [-0.3, 1.0, 0.04]; // other hand on the hip
  if (id === 'salute') return side > 0 ? [0.1, 1.66, -0.2] : [-0.27, 0.86, 0.02]; // other arm straight down: attention
  if (id === 'dance') return [side * 0.34, 1.45 + Math.sin(t * 8 + (side > 0 ? 0 : Math.PI)) * 0.32, -0.22 + Math.cos(t * 8 + (side > 0 ? 0 : Math.PI)) * 0.08];
  if (id === 'flex') return [side * 0.44, 1.62 + Math.sin(t * 6 + (side > 0 ? 0 : Math.PI)) * 0.07, 0.02]; // one arm pumps, then the other
  if (id === 'laugh') return [side * 0.16, 1.0 + Math.abs(Math.sin(t * 14)) * 0.04, -0.24];
  return null;
}

// The rest of the body during an emote (added to the normal pose): bounce `y`, turn `yaw`, lean forward
// `bend`, lean sideways `roll`, hips `hipX`, head nod `neck` and tilt `neckZ`. t: seconds since it started.
export function emoteBody(id, t) {
  const o = { y: 0, yaw: 0, bend: 0, roll: 0, hipX: 0, neck: 0, neckZ: 0 };
  if (id === 'wave') { o.roll = -0.06; o.neckZ = -0.14; o.neck = -0.05; o.y = Math.abs(Math.sin(t * 4.5)) * 0.015; }
  else if (id === 'dance') { const s = Math.sin(t * 4); o.y = Math.abs(Math.sin(t * 8)) * 0.09; o.yaw = s * 0.45; o.hipX = s * 0.07; o.roll = -s * 0.1; o.neck = Math.sin(t * 8) * 0.1; o.neckZ = s * 0.15; }
  else if (id === 'salute') { const k = Math.min(1, t / 0.18); o.bend = -0.08 * k; o.neck = -0.08 * k; o.y = 0.02 * k; } // snaps to attention
  else if (id === 'laugh') { o.bend = 0.22 + Math.sin(t * 3) * 0.15; o.neck = -0.22 + Math.abs(Math.sin(t * 14)) * 0.06; o.y = Math.abs(Math.sin(t * 14)) * 0.015; o.roll = Math.sin(t * 2) * 0.05; } // doubled over, shaking
  else if (id === 'flex') { const f = Math.sin(t * 6); o.y = Math.max(0, f) * 0.03; o.yaw = Math.sin(t * 1.5) * 0.35; o.bend = -0.06; o.roll = f * 0.05; } // shows off both sides
  return o;
}

// The emoji bubble over someone's head.
const cache = new Map();
export function emoteBubble(icon) {
  let tex = cache.get(icon);
  if (!tex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(15,10,30,0.82)';
    g.beginPath(); g.arc(64, 60, 54, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(52, 108); g.lineTo(64, 126); g.lineTo(76, 108); g.fill();
    g.font = '64px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(icon, 64, 64);
    tex = new THREE.CanvasTexture(c);
    cache.set(icon, tex);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(0.55, 0.55, 1);
  s.renderOrder = 10;
  return s;
}
