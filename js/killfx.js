import * as THREE from 'three';

// Kill effects: a cosmetic (slot `killfx` in missions.js COSMETICS) that plays where your victim
// stood when you get a kill. Everyone in the match sees it (it rides along with your cosmetics).
// Drawn with the shared particle / tracer pools in effects.js, so it costs no extra draw calls.

export const KILL_FX_ITEMS = [
  { id: 'none', name: 'None', free: true, icon: '✖️', desc: 'No kill effect' },
  { id: 'confetti', name: 'Confetti', price: 200, icon: '🎉', desc: 'A party popper of colored paper' },
  { id: 'hearts', name: 'Love Bomb', price: 200, icon: '💖', desc: 'Pink hearts float up' },
  { id: 'pixels', name: 'Pixel Burst', price: 250, icon: '👾', desc: 'Breaks into floating neon pixels' },
  { id: 'lightning', name: 'Lightning', price: 300, icon: '⚡', desc: 'A bolt from the sky strikes them' },
  { id: 'ember', name: 'Ember Burst', price: 300, icon: '🔥', desc: 'A rising column of fire and sparks' },
  { id: 'spirit', name: 'Spirit', price: 350, icon: '👻', desc: 'Their ghost drifts up and away' },
  { id: 'jackpot', name: 'Jackpot', price: 400, icon: '🪙', desc: 'A fountain of gold coins' },
  { id: 'blackhole', name: 'Black Hole', price: 500, icon: '🌀', desc: 'Everything gets sucked into a void' },
  { id: 'sakura', name: 'Sakura Burst', price: 350, icon: '🌸', desc: 'Cherry blossom petals swirl around' },
  { id: 'angel', name: 'Angel Wings', price: 450, icon: '😇', desc: 'A halo and wings float up' },
  { id: 'gigachad', name: 'GIGACHAD', reward: true, owner: true, how: 'Only the game owner has this one', icon: '♛', desc: 'A golden crown rises in a burst of gold and purple' },
];

const _v = new THREE.Vector3();
const rnd = (a) => (Math.random() - 0.5) * a;
const pick = (a) => a[(Math.random() * a.length) | 0];

// fx: the Effects instance (effects.js); pos: the victim's chest
export function playKillFx(fx, id, pos) {
  const P = (p, v, col, size, life, g = 9) => fx.particle(p, v, col, size, life, g);
  switch (id) {
    case 'confetti': {
      const cols = ['#ff4a6a', '#ffd23a', '#3ad1ff', '#7ce03a', '#c86bff', '#ffffff'];
      for (let i = 0; i < 46; i++) P(pos, _v.set(rnd(7), 4 + Math.random() * 5, rnd(7)), pick(cols), 0.08, 1.8, 7);
      break;
    }
    case 'hearts':
      for (let i = 0; i < 24; i++) P(_v.set(pos.x + rnd(1), pos.y + rnd(1), pos.z + rnd(1)).clone(), new THREE.Vector3(rnd(1.2), 1 + Math.random() * 1.5, rnd(1.2)), pick(['#ff5f9e', '#ff2f6a', '#ffb3d1']), 0.11, 1.8, -0.6);
      break;
    case 'pixels':
      for (let i = 0; i < 34; i++) P(_v.set(pos.x + rnd(0.7), pos.y + rnd(1.6), pos.z + rnd(0.7)).clone(), new THREE.Vector3(rnd(2.5), Math.random() * 1.5, rnd(2.5)), pick(['#00f0ff', '#ff2fd8', '#39ff6a', '#ffe14a']), 0.14, 1.4, 0);
      break;
    case 'lightning': {
      // a jagged bolt from high above down to them, a flash and sparks
      let a = new THREE.Vector3(pos.x + rnd(4), pos.y + 16, pos.z + rnd(4));
      for (let i = 1; i <= 7; i++) {
        const b = i === 7 ? pos.clone() : a.clone().lerp(pos, 1 / (8 - i)).add(_v.set(rnd(1.6), 0, rnd(1.6)));
        fx.tracer(a, b, '#7fb8ff', { life: 0.5, w: 0.16 });
        fx.tracer(a, b, '#ffffff', { life: 0.4, w: 0.06 });
        a = b;
      }
      fx.flashAt(pos, '#bcd8ff', 40, 0.18);
      for (let i = 0; i < 20; i++) P(pos, _v.set(rnd(8), Math.random() * 6, rnd(8)), pick(['#ffffff', '#9fd0ff']), 0.05, 0.5, 12);
      break;
    }
    case 'ember':
      for (let i = 0; i < 40; i++) P(_v.set(pos.x + rnd(0.8), pos.y - 0.8 + Math.random() * 0.6, pos.z + rnd(0.8)).clone(), new THREE.Vector3(rnd(1.2), 2.5 + Math.random() * 3, rnd(1.2)), pick(['#ffe28a', '#ff8a1a', '#ff4a12']), 0.12, 1.0, -2);
      fx.flashAt(pos, '#ff8a3a', 14, 0.3);
      break;
    case 'spirit':
      for (let i = 0; i < 30; i++) {
        const h = Math.random() * 1.8;
        P(_v.set(pos.x + rnd(0.5) * (1 - h / 2), pos.y - 0.9 + h, pos.z + rnd(0.5) * (1 - h / 2)).clone(), new THREE.Vector3(rnd(0.3), 1.6, rnd(0.3)), pick(['#eef4ff', '#cfe0ff', '#ffffff']), 0.16, 2.0, -0.2);
      }
      break;
    case 'jackpot':
      for (let i = 0; i < 36; i++) P(pos, _v.set(rnd(4), 6 + Math.random() * 4, rnd(4)), pick(['#ffd23a', '#ffb020', '#fff0a8']), 0.11, 1.6, 14);
      fx.flashAt(pos, '#ffd23a', 10, 0.25);
      break;
    case 'blackhole':
      // particles start on a shell and fall into the middle, then a dark pop
      for (let i = 0; i < 44; i++) {
        const d = new THREE.Vector3(rnd(2), rnd(2), rnd(2)).normalize();
        P(pos.clone().addScaledVector(d, 1.8), d.clone().multiplyScalar(-2.6), pick(['#2a0a4a', '#7a2aff', '#c86bff', '#000000']), 0.1, 0.7, 0);
      }
      setTimeout(() => { for (let i = 0; i < 18; i++) P(pos, _v.set(rnd(9), rnd(9), rnd(9)), pick(['#c86bff', '#1a0030']), 0.07, 0.4, 0); fx.flashAt(pos, '#a050ff', 16, 0.15); }, 650);
      break;
    case 'sakura':
      // petals spiral outwards and drift down slowly
      for (let i = 0; i < 44; i++) {
        const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.6;
        P(_v.set(pos.x + Math.cos(a) * r, pos.y + rnd(1.4), pos.z + Math.sin(a) * r).clone(), new THREE.Vector3(-Math.sin(a) * 2.2 + Math.cos(a) * 0.6, 0.6 + Math.random(), Math.cos(a) * 2.2 + Math.sin(a) * 0.6), pick(['#ffc2dc', '#ff9ac8', '#ffffff', '#ffb3d1']), 0.09, 2.2, 1.2);
      }
      break;
    case 'angel': {
      // a ring of light (halo) and two wings of feathers rising together
      for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; P(_v.set(pos.x + Math.cos(a) * 0.32, pos.y + 0.75, pos.z + Math.sin(a) * 0.32).clone(), new THREE.Vector3(0, 1.1, 0), '#fff3a0', 0.07, 1.8, 0); }
      for (const s of [-1, 1]) for (let i = 0; i < 16; i++) {
        const t = i / 15, wx = s * (0.15 + t * 0.85), wy = 0.2 + Math.sin(t * Math.PI) * 0.45 - t * 0.2;
        P(_v.set(pos.x + wx, pos.y + wy, pos.z + rnd(0.15)).clone(), new THREE.Vector3(s * 0.2, 1.1, 0), pick(['#ffffff', '#f2f4ff', '#e6ecff']), 0.1, 1.8, 0);
      }
      fx.flashAt(pos, '#fff6cc', 12, 0.3);
      break;
    }
    case 'gigachad': {
      // the owner's: a golden crown made of light rises, gold and purple burst out, a big flash
      const top = new THREE.Vector3(pos.x, pos.y + 0.5, pos.z);
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; P(_v.set(top.x + Math.cos(a) * 0.4, top.y, top.z + Math.sin(a) * 0.4).clone(), new THREE.Vector3(0, 1.4, 0), '#ffd23a', 0.09, 1.6, 0); } // the crown's band
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; for (let h = 0; h < 4; h++) P(_v.set(top.x + Math.cos(a) * 0.4 * (1 - h * 0.12), top.y + 0.08 + h * 0.08, top.z + Math.sin(a) * 0.4 * (1 - h * 0.12)).clone(), new THREE.Vector3(0, 1.4, 0), h === 3 ? '#d0122a' : '#fff0a8', 0.08, 1.6, 0); } // its points, red gems on top
      for (let i = 0; i < 40; i++) P(pos, _v.set(rnd(9), 3 + Math.random() * 6, rnd(9)), pick(['#ffd23a', '#fff0a8', '#b36bff', '#7a2aff']), 0.1, 1.5, 10);
      fx.flashAt(pos, '#ffd23a', 30, 0.35);
      break;
    }
    default:
  }
}
