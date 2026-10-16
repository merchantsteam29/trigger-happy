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
  if (id === 'wave') return side > 0 ? [0.36, 1.78 + Math.sin(t * 9) * 0.04, -0.08 + Math.sin(t * 9) * 0.14] : null;
  if (id === 'salute') return side > 0 ? [0.1, 1.66, -0.2] : null;
  if (id === 'dance') return [side * 0.32, 1.45 + Math.sin(t * 8 + (side > 0 ? 0 : Math.PI)) * 0.3, -0.22];
  if (id === 'flex') return [side * 0.44, 1.62 + Math.sin(t * 6) * 0.04, 0.02];
  if (id === 'laugh') return [side * 0.16, 1.0 + Math.abs(Math.sin(t * 14)) * 0.04, -0.24];
  return null;
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
