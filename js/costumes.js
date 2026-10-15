import * as THREE from 'three';

// Costumes: a whole new look on the same skeleton. The normal body (torso, head, pelvis) is hidden
// and replaced by these parts, and the arms / legs / hands / feet get the costume's materials.
// Hitboxes, animations, emotes and poses don't change: every costume keeps the normal player's size.
//
// Bone spaces (see remote.js): `hips` (pelvis box 0.44×0.2×0.26 at 0), `spine` (torso 0.5×0.56×0.28
// centered at y 0.3, shoulders at x ±0.27, y 0.53), `head` (in the neck: head cube 0.28 centered at
// y 0.15). The front is −Z. `team` is the player's color material (their team color in team modes):
// every costume shows it somewhere so friend and foe stay easy to tell apart.

// Who can get each one: price (shop), `handout` (only the owner gives it out: 🎁 Give in the Mod
// Panel), `rank` (reaching that ranked division), `owner` (the owner's own, shown only on the verified owner).
const HANDOUT = 'Giveaway only: the owner hands it out';
const rankHow = (d) => `Reach ${d} in ranked`;
export const COSTUME_ITEMS = [
  { id: 'none', name: 'No costume', free: true, icon: '🙂', desc: 'Your normal soldier.' },
  // Shop
  { id: 'skeleton', name: 'Skeleton', price: 900, icon: '💀', desc: 'Bones that glow a little in the dark.' },
  { id: 'samurai', name: 'Cyber Samurai', price: 1200, icon: '⛩', desc: 'Black armor with neon lines and a glowing visor.' },
  { id: 'astrocat', name: 'Astronaut Cat', price: 1000, icon: '🐱', desc: 'A cat in a space suit and a bubble helmet.' },
  { id: 'llama', name: 'Party Llama', price: 900, icon: '🦙', desc: 'Fluffy, with a party hat.' },
  { id: 'junkbot', name: 'Junk Robot', price: 1000, icon: '🤖', desc: 'Built from spare parts. One big eye, one small.' },
  { id: 'lavagolem', name: 'Lava Golem', price: 1100, icon: '🌋', desc: 'Rock with glowing orange cracks.' },
  { id: 'icegolem', name: 'Ice Golem', price: 1100, icon: '🧊', desc: 'Ice crystals and a frosty crown.' },
  { id: 'banana', name: 'Banana', price: 800, icon: '🍌', desc: 'A whole banana suit. Your face pokes out.' },
  { id: 'ninja', name: 'Ninja', price: 900, icon: '🥷', desc: 'All black with a headband in your color.' },
  { id: 'mummy', name: 'Mummy', price: 900, icon: '🧟', desc: 'Wrapped in bandages, one eye peeking out.' },
  { id: 'diver', name: 'Deep Sea Diver', price: 1100, icon: '🤿', desc: 'Brass helmet with a round window.' },
  // Giveaways (game-inspired)
  { id: 'impostor', name: 'Impostor', reward: true, handout: true, how: HANDOUT, icon: '🫘', desc: 'A bean-shaped astronaut in your color.' },
  { id: 'bugknight', name: 'Bug Knight', reward: true, handout: true, how: HANDOUT, icon: '🐞', desc: 'A tiny horned mask and a dark cloak.' },
  { id: 'cubehero', name: 'Cube Hero', reward: true, handout: true, how: HANDOUT, icon: '🧪', desc: 'Jumpsuit, spring boots and a portal device on the back.' },
  { id: 'bloodmachine', name: 'Blood Machine', reward: true, handout: true, how: HANDOUT, icon: '🩸', desc: 'A slim blue machine with one yellow light and metal wings.' },
  { id: 'hellwalker', name: 'Hellwalker', reward: true, handout: true, how: HANDOUT, icon: '🔥', desc: 'Heavy green armor, a horned helmet and a spiked shield.' },
  // Ranked division armor (ranked.js DIVISIONS)
  { id: 'rk_contender', name: 'Contender Armor', reward: true, rank: 'contender', how: rankHow('Contender'), icon: '◆', desc: 'Earned by reaching Contender.' },
  { id: 'rk_veteran', name: 'Veteran Armor', reward: true, rank: 'veteran', how: rankHow('Veteran'), icon: '⬢', desc: 'Earned by reaching Veteran.' },
  { id: 'rk_elite', name: 'Elite Armor', reward: true, rank: 'elite', how: rankHow('Elite'), icon: '✦', desc: 'Earned by reaching Elite.' },
  { id: 'rk_master', name: 'Master Armor', reward: true, rank: 'master', how: rankHow('Master'), icon: '✷', desc: 'Earned by reaching Master.' },
  { id: 'rk_legend', name: 'Legend Armor', reward: true, rank: 'legend', how: rankHow('Legend'), icon: '♛', desc: 'Earned by reaching Legend.' },
  // The owner's
  { id: 'gigachad', name: 'GIGACHAD', reward: true, owner: true, how: 'Only the game owner has this one', icon: '👑', desc: 'Solid gold, with a crown and a cape.' },
];
const RANK_COLOR = { contender: '#5fc46a', veteran: '#4aa8ff', elite: '#b36bff', master: '#ff8a3a', legend: '#ff3a6a' };

// ---------- helpers ----------
const mats = new Map();
function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o }));
  return mats.get(k);
}
const glow = (color, i = 1.6) => mat(color, { emissive: color, emissiveIntensity: i });
function add(g, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  g.add(o);
  return o;
}
const box = (g, m, sx, sy, sz, x, y, z, rx, ry, rz) => add(g, new THREE.BoxGeometry(sx, sy, sz), m, x, y, z, rx, ry, rz);
const ball = (g, m, r, x, y, z) => add(g, new THREE.SphereGeometry(r, 14, 10), m, x, y, z);
const cyl = (g, m, r0, r1, h, x, y, z, rx = 0, ry = 0, rz = 0, s = 14) => add(g, new THREE.CylinderGeometry(r0, r1, h, s), m, x, y, z, rx, ry, rz);
const cone = (g, m, r, h, x, y, z, rx = 0, ry = 0, rz = 0, s = 10) => add(g, new THREE.ConeGeometry(r, h, s), m, x, y, z, rx, ry, rz);
// A plain torso / pelvis / head block in one material (most costumes start from these).
const torso = (g, m, w = 0.5, h = 0.56, d = 0.28) => box(g, m, w, h, d, 0, 0.3, 0);
const shoulders = (g, m, w = 0.17, h = 0.11, d = 0.25) => { for (const s of [-1, 1]) box(g, m, w, h, d, s * 0.27, 0.53, 0); };
const pelvis = (g, m) => box(g, m, 0.44, 0.2, 0.26, 0, 0, 0);
const belt = (g, m) => box(g, m, 0.46, 0.06, 0.28, 0, 0.07, 0);
const headBlock = (g, m, s = 0.28) => box(g, m, s, s, s, 0, 0.15, 0);

// ---------- the costumes ----------
// Each gets (parts, team) with parts = { hips, spine, head } groups, and returns limb materials.
const BUILD = {
  skeleton({ hips, spine, head }, team) {
    const bone = mat('#ece6d6', { emissive: '#3a3a30', emissiveIntensity: 0.6 }), dark = mat('#141416');
    torso(spine, dark, 0.46, 0.54, 0.26);
    for (let i = 0; i < 4; i++) box(spine, bone, 0.38 - i * 0.03, 0.035, 0.03, 0, 0.46 - i * 0.08, -0.14);
    box(spine, bone, 0.05, 0.5, 0.03, 0, 0.3, -0.145); // breastbone
    box(spine, bone, 0.05, 0.54, 0.03, 0, 0.3, 0.145); // spine
    shoulders(spine, bone, 0.15, 0.08, 0.2);
    pelvis(hips, dark); box(hips, bone, 0.4, 0.12, 0.2, 0, -0.02, 0); belt(hips, team);
    headBlock(head, bone, 0.27);
    for (const s of [-1, 1]) box(head, dark, 0.07, 0.07, 0.02, s * 0.065, 0.18, -0.13);
    cone(head, dark, 0.025, 0.05, 0, 0.11, -0.135, Math.PI, 0, 0, 3);
    box(head, dark, 0.15, 0.025, 0.02, 0, 0.06, -0.135);
    for (let i = -2; i <= 2; i++) box(head, bone, 0.012, 0.03, 0.022, i * 0.03, 0.06, -0.14);
    return { arm: bone, leg: bone, hand: bone, foot: bone };
  },
  samurai({ hips, spine, head }, team) {
    const armor = mat('#16141a', { roughness: 0.35, metalness: 0.4 }), neon = glow('#29f0ff', 1.8), red = glow('#ff2d75', 1.2);
    torso(spine, armor, 0.5, 0.56, 0.3);
    for (let i = 0; i < 3; i++) box(spine, armor, 0.46, 0.06, 0.34, 0, 0.12 + i * 0.1, 0); // plates
    box(spine, neon, 0.03, 0.4, 0.01, -0.12, 0.33, -0.172); box(spine, neon, 0.03, 0.4, 0.01, 0.12, 0.33, -0.172);
    box(spine, team, 0.12, 0.12, 0.01, 0, 0.42, -0.172); // chest crest in your color
    for (const s of [-1, 1]) { box(spine, armor, 0.22, 0.05, 0.3, s * 0.3, 0.55, 0, 0, 0, s * -0.35); box(spine, neon, 0.2, 0.012, 0.31, s * 0.3, 0.52, 0, 0, 0, s * -0.35); }
    pelvis(hips, armor); for (const s of [-1, 1]) box(hips, armor, 0.2, 0.22, 0.04, s * 0.11, -0.08, -0.14);
    belt(hips, red);
    headBlock(head, armor, 0.29);
    box(head, neon, 0.24, 0.045, 0.02, 0, 0.17, -0.15); // visor
    box(head, armor, 0.36, 0.04, 0.34, 0, 0.29, 0, 0.12, 0, 0); // brim
    for (const s of [-1, 1]) box(head, neon, 0.03, 0.16, 0.02, s * 0.06, 0.38, -0.12, 0, 0, s * -0.5); // crest
    return { arm: armor, leg: armor, hand: mat('#0d0c10'), foot: armor };
  },
  astrocat({ hips, spine, head }, team) {
    const suit = mat('#f2f4f7'), grey = mat('#9aa1ab'), fur = mat('#f0a04a'), glass = mat('#cfeaff', { transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
    torso(spine, suit, 0.5, 0.56, 0.3);
    box(spine, grey, 0.36, 0.42, 0.14, 0, 0.32, 0.2); // backpack
    box(spine, team, 0.1, 0.1, 0.01, 0.13, 0.42, -0.155); // mission patch
    box(spine, grey, 0.16, 0.08, 0.01, -0.1, 0.25, -0.155); // control panel
    shoulders(spine, suit);
    pelvis(hips, suit); belt(hips, grey);
    headBlock(head, fur, 0.24);
    for (const s of [-1, 1]) cone(head, fur, 0.05, 0.09, s * 0.08, 0.31, -0.01, 0, 0, 0, 4);
    for (const s of [-1, 1]) box(head, mat('#1a1a1a'), 0.04, 0.05, 0.02, s * 0.05, 0.17, -0.12);
    box(head, mat('#ff8fb0'), 0.04, 0.025, 0.02, 0, 0.12, -0.125);
    for (const s of [-1, 1]) for (const d of [-1, 1]) box(head, mat('#3a2a1e'), 0.08, 0.006, 0.006, s * 0.13, 0.11 + d * 0.015, -0.12, 0, 0, d * 0.15);
    ball(head, glass, 0.22, 0, 0.17, 0).castShadow = false; // bubble helmet
    cyl(head, grey, 0.19, 0.19, 0.04, 0, 0.0, 0);
    return { arm: suit, leg: suit, hand: grey, foot: grey };
  },
  llama({ hips, spine, head }, team) {
    const wool = mat('#efe2c4', { roughness: 0.95 }), dark = mat('#5a4636');
    torso(spine, wool, 0.5, 0.56, 0.3);
    for (const [x, y] of [[-0.15, 0.5], [0.15, 0.5], [0, 0.55], [-0.2, 0.2], [0.2, 0.2]]) ball(spine, wool, 0.09, x, y, -0.1);
    box(spine, team, 0.52, 0.16, 0.32, 0, 0.1, 0); // party blanket in your color
    shoulders(spine, wool);
    pelvis(hips, wool); belt(hips, mat('#ff5fb4'));
    headBlock(head, wool, 0.26);
    box(head, wool, 0.16, 0.12, 0.12, 0, 0.09, -0.17); // snout
    box(head, dark, 0.08, 0.03, 0.02, 0, 0.11, -0.232);
    for (const s of [-1, 1]) { box(head, mat('#111'), 0.04, 0.04, 0.02, s * 0.08, 0.2, -0.135); box(head, wool, 0.05, 0.12, 0.04, s * 0.1, 0.33, 0.02, 0, 0, s * 0.25); }
    cone(head, mat('#3fd0ff'), 0.07, 0.18, 0.02, 0.36, -0.04, 0, 0, -0.2); // party hat
    ball(head, mat('#ffd23f'), 0.025, 0.0, 0.45, -0.04);
    return { arm: wool, leg: wool, hand: dark, foot: dark };
  },
  junkbot({ hips, spine, head }, team) {
    const steel = mat('#8d939a', { metalness: 0.6, roughness: 0.4 }), rust = mat('#9a5a2e', { roughness: 0.9 }), dark = mat('#2b2f36'), eye = glow('#7dffb0', 1.4);
    torso(spine, steel, 0.5, 0.56, 0.3);
    box(spine, rust, 0.2, 0.24, 0.02, -0.12, 0.2, -0.155); box(spine, team, 0.16, 0.12, 0.02, 0.12, 0.42, -0.155);
    for (const [x, y] of [[-0.2, 0.52], [0.2, 0.52], [-0.2, 0.08], [0.2, 0.08]]) cyl(spine, dark, 0.02, 0.02, 0.02, x, y, -0.16, Math.PI / 2);
    box(spine, rust, 0.18, 0.12, 0.26, -0.28, 0.53, 0); box(spine, steel, 0.16, 0.1, 0.24, 0.28, 0.53, 0);
    pelvis(hips, dark); belt(hips, rust);
    headBlock(head, steel, 0.28);
    cyl(head, dark, 0.07, 0.07, 0.03, -0.05, 0.17, -0.145, Math.PI / 2); cyl(head, eye, 0.05, 0.05, 0.02, -0.05, 0.17, -0.158, Math.PI / 2);
    cyl(head, eye, 0.025, 0.025, 0.02, 0.08, 0.2, -0.148, Math.PI / 2);
    box(head, dark, 0.14, 0.03, 0.02, 0.03, 0.07, -0.145);
    cyl(head, steel, 0.01, 0.01, 0.16, 0.06, 0.37, 0); cyl(head, mat('#c0c4c8', { metalness: 0.8 }), 0.03, 0.03, 0.03, 0.06, 0.46, 0, 0, 0, 0, 6); // bolt antenna
    return { arm: rust, leg: steel, hand: dark, foot: dark };
  },
  lavagolem({ hips, spine, head }, team) {
    const rock = mat('#2e2624', { roughness: 0.95 }), lava = glow('#ff6a1a', 2.2);
    torso(spine, rock, 0.52, 0.56, 0.3);
    for (const [x, y, r] of [[-0.1, 0.4, 0.5], [0.08, 0.22, -0.7], [0.15, 0.45, 0.3], [-0.14, 0.15, -0.2]]) box(spine, lava, 0.16, 0.02, 0.01, x, y, -0.152, 0, 0, r);
    for (const s of [-1, 1]) { box(spine, rock, 0.2, 0.15, 0.28, s * 0.29, 0.55, 0); box(spine, lava, 0.12, 0.015, 0.01, s * 0.29, 0.55, -0.142, 0, 0, s * 0.4); }
    pelvis(hips, rock); belt(hips, team);
    headBlock(head, rock, 0.27);
    for (const s of [-1, 1]) box(head, lava, 0.06, 0.03, 0.02, s * 0.06, 0.18, -0.136);
    box(head, lava, 0.12, 0.015, 0.02, 0, 0.07, -0.136);
    box(head, rock, 0.18, 0.06, 0.2, 0.02, 0.3, 0, 0, 0.3, 0.1);
    return { arm: rock, leg: rock, hand: lava, foot: rock };
  },
  icegolem({ hips, spine, head }, team) {
    const ice = mat('#a9dcff', { roughness: 0.15, metalness: 0.1, emissive: '#2a6a9a', emissiveIntensity: 0.4 }), deep = mat('#5aa8e6', { roughness: 0.2 });
    torso(spine, ice, 0.5, 0.56, 0.3);
    box(spine, deep, 0.3, 0.3, 0.02, 0, 0.32, -0.155, 0, 0, 0.785);
    for (const s of [-1, 1]) { box(spine, ice, 0.18, 0.12, 0.26, s * 0.28, 0.53, 0); for (let i = 0; i < 3; i++) cone(spine, deep, 0.035, 0.16 - i * 0.03, s * (0.24 + i * 0.05), 0.65, 0.02 - i * 0.04, 0, 0, s * -0.3, 5); }
    pelvis(hips, ice); belt(hips, team);
    headBlock(head, ice, 0.27);
    for (const s of [-1, 1]) box(head, glow('#e8fbff', 2), 0.06, 0.03, 0.02, s * 0.06, 0.18, -0.136);
    for (let i = -2; i <= 2; i++) cone(head, deep, 0.025, 0.12 - Math.abs(i) * 0.025, i * 0.06, 0.34 - Math.abs(i) * 0.015, 0, 0, 0, 0, 5); // crown
    return { arm: ice, leg: ice, hand: deep, foot: deep };
  },
  banana({ hips, spine, head }, team) {
    const peel = mat('#ffd93b'), tip = mat('#5a4a1e'), skin = mat('#d6a682');
    torso(spine, peel, 0.48, 0.6, 0.3);
    box(spine, peel, 0.42, 0.3, 0.26, 0, 0.72, 0); // the banana goes up around your head...
    box(spine, tip, 0.1, 0.06, 0.1, 0, 0.9, 0.04); // ...to its stalk
    for (const s of [-1, 1]) box(spine, mat('#f2c12e'), 0.02, 0.8, 0.31, s * 0.12, 0.45, 0);
    box(spine, team, 0.2, 0.06, 0.02, 0, 0.12, -0.155); // a sticker in your color
    pelvis(hips, peel); belt(hips, mat('#f2c12e'));
    // Your face pokes out of the front.
    headBlock(head, skin, 0.22);
    for (const s of [-1, 1]) box(head, mat('#1a1a1a'), 0.035, 0.035, 0.02, s * 0.05, 0.17, -0.11);
    box(head, mat('#a33'), 0.07, 0.02, 0.02, 0, 0.1, -0.11);
    return { arm: peel, leg: peel, hand: mat('#f2c12e'), foot: tip };
  },
  ninja({ hips, spine, head }, team) {
    const cloth = mat('#141518', { roughness: 0.95 }), wrap = mat('#26282d');
    torso(spine, cloth);
    box(spine, wrap, 0.52, 0.06, 0.3, 0, 0.3, 0, 0, 0, 0.6); // sash across the chest
    box(spine, wrap, 0.04, 0.5, 0.04, 0.12, 0.33, 0.17, 0, 0, 0.5); // sword on the back
    box(spine, mat('#9aa1a8', { metalness: 0.7 }), 0.12, 0.03, 0.06, 0.25, 0.6, 0.17, 0, 0, 0.5);
    shoulders(spine, cloth);
    pelvis(hips, cloth); belt(hips, wrap);
    headBlock(head, cloth, 0.28);
    box(head, mat('#d6a682'), 0.24, 0.05, 0.02, 0, 0.17, -0.142); // eye slit
    for (const s of [-1, 1]) box(head, mat('#111'), 0.03, 0.02, 0.01, s * 0.06, 0.17, -0.153);
    box(head, team, 0.3, 0.04, 0.3, 0, 0.24, 0); // headband in your color
    for (const s of [-1, 1]) box(head, team, 0.03, 0.14, 0.02, s * 0.03, 0.18, 0.16, 0.2, 0, s * 0.4);
    return { arm: cloth, leg: cloth, hand: wrap, foot: wrap };
  },
  mummy({ hips, spine, head }, team) {
    const wrapA = mat('#e8dfc6', { roughness: 0.95 }), wrapB = mat('#cfc3a2', { roughness: 0.95 });
    torso(spine, wrapA);
    for (let i = 0; i < 7; i++) box(spine, wrapB, 0.52, 0.035, 0.3, 0, 0.06 + i * 0.075, 0, 0, 0, (i % 2 ? 0.12 : -0.12));
    shoulders(spine, wrapA);
    pelvis(hips, wrapA); belt(hips, team);
    headBlock(head, wrapA, 0.28);
    for (let i = 0; i < 4; i++) box(head, wrapB, 0.3, 0.03, 0.3, 0, 0.04 + i * 0.07, 0, 0, 0, i % 2 ? 0.1 : -0.1);
    box(head, mat('#111'), 0.07, 0.04, 0.02, 0.06, 0.17, -0.142); // one eye peeking out
    ball(head, glow('#ffe14a', 1.2), 0.015, 0.06, 0.17, -0.145);
    return { arm: wrapA, leg: wrapA, hand: wrapB, foot: wrapB };
  },
  diver({ hips, spine, head }, team) {
    const canvas = mat('#4a5a6a', { roughness: 0.9 }), brass = mat('#c8963a', { metalness: 0.75, roughness: 0.35 }), glass = mat('#9fd8ff', { roughness: 0.05, emissive: '#1a4a6a', emissiveIntensity: 0.6 });
    torso(spine, canvas);
    box(spine, brass, 0.54, 0.12, 0.32, 0, 0.52, 0); // brass collar
    for (const s of [-1, 1]) cyl(spine, brass, 0.06, 0.06, 0.34, s * 0.09, 0.32, 0.19); // air tanks
    box(spine, team, 0.42, 0.06, 0.3, 0, 0.15, 0);
    shoulders(spine, brass, 0.14, 0.08, 0.22);
    pelvis(hips, canvas); belt(hips, mat('#2b2f36'));
    ball(head, brass, 0.2, 0, 0.15, 0); // the helmet
    cyl(head, brass, 0.1, 0.1, 0.05, 0, 0.15, -0.18, Math.PI / 2);
    cyl(head, glass, 0.08, 0.08, 0.02, 0, 0.15, -0.205, Math.PI / 2);
    for (const s of [-1, 1]) cyl(head, glass, 0.045, 0.045, 0.02, s * 0.19, 0.15, -0.02, 0, 0, Math.PI / 2);
    cyl(head, brass, 0.04, 0.04, 0.08, 0, 0.36, 0);
    return { arm: canvas, leg: canvas, hand: mat('#2b2f36'), foot: brass };
  },
  impostor({ hips, spine, head }, team) {
    // A bean in your color: one rounded body from the hips to the top of the head, with a visor.
    const visor = mat('#9fe4ff', { roughness: 0.1, metalness: 0.3, emissive: '#2a6a8a', emissiveIntensity: 0.5 });
    const bean = add(spine, new THREE.CapsuleGeometry(0.27, 0.42, 6, 16), team, 0, 0.42, 0);
    bean.scale.set(1, 1, 0.8);
    box(spine, team, 0.3, 0.4, 0.14, 0, 0.36, 0.24); // backpack
    pelvis(hips, team);
    const v = add(head, new THREE.CapsuleGeometry(0.075, 0.16, 4, 12), visor, 0, 0.1, -0.2, 0, 0, Math.PI / 2);
    v.scale.set(1, 1, 0.6);
    return { arm: team, leg: team, hand: team, foot: team };
  },
  bugknight({ hips, spine, head }, team) {
    const cloak = mat('#1b2236', { roughness: 0.95 }), mask = mat('#f4f1ea', { roughness: 0.5 }), black = mat('#08080a');
    cyl(spine, cloak, 0.18, 0.3, 0.6, 0, 0.28, 0, 0, 0, 0, 8); // cloak
    box(spine, team, 0.08, 0.06, 0.02, 0, 0.5, -0.2); // clasp in your color
    pelvis(hips, cloak);
    box(head, mask, 0.24, 0.27, 0.24, 0, 0.13, 0).scale.set(1, 1, 1);
    ball(head, mask, 0.13, 0, 0.2, 0);
    for (const s of [-1, 1]) {
      box(head, black, 0.06, 0.1, 0.02, s * 0.05, 0.12, -0.122);
      cone(head, mask, 0.03, 0.2, s * 0.1, 0.38, 0, 0, 0, s * -0.35, 6); // horns
    }
    return { arm: cloak, leg: black, hand: black, foot: black };
  },
  cubehero({ hips, spine, head }, team) {
    const top = mat('#f2f2f2'), suit = mat('#e8742a'), boot = mat('#d8dde3', { metalness: 0.4 }), blue = glow('#3fa9ff', 1.8), skin = mat('#d6a682');
    torso(spine, top);
    for (const s of [-1, 1]) box(spine, suit, 0.08, 0.12, 0.3, s * 0.18, 0.05, 0, 0, 0, s * 0.6); // sleeves tied at the waist
    box(spine, mat('#f8f8f8'), 0.22, 0.34, 0.12, 0, 0.32, 0.2); // the portal device on the back
    cyl(spine, blue, 0.07, 0.07, 0.02, 0, 0.36, 0.265, Math.PI / 2);
    cyl(spine, mat('#ff8a1a', { emissive: '#ff8a1a', emissiveIntensity: 1.4 }), 0.03, 0.03, 0.02, 0, 0.22, 0.265, Math.PI / 2);
    shoulders(spine, skin, 0.14, 0.08, 0.2);
    pelvis(hips, suit); belt(hips, team);
    headBlock(head, skin, 0.26);
    for (const s of [-1, 1]) box(head, mat('#1a1a1a'), 0.04, 0.04, 0.02, s * 0.06, 0.17, -0.13);
    box(head, mat('#2a1a10'), 0.3, 0.1, 0.3, 0, 0.28, 0.02); box(head, mat('#2a1a10'), 0.08, 0.2, 0.08, 0, 0.12, 0.17); // hair and ponytail
    return { arm: skin, leg: suit, hand: skin, foot: boot };
  },
  bloodmachine({ hips, spine, head }, team) {
    const blue = mat('#2f5fc8', { metalness: 0.65, roughness: 0.35 }), steel = mat('#1c2433', { metalness: 0.6, roughness: 0.4 }), blood = mat('#7a0a12', { roughness: 0.5 }), eye = glow('#ffd23f', 2.4);
    torso(spine, blue, 0.42, 0.56, 0.24);
    box(spine, steel, 0.3, 0.24, 0.02, 0, 0.36, -0.13);
    box(spine, team, 0.08, 0.08, 0.02, 0.1, 0.12, -0.13);
    for (const [x, y] of [[-0.12, 0.2], [0.14, 0.44], [-0.05, 0.5]]) box(spine, blood, 0.09, 0.05, 0.01, x, y, -0.145, 0, 0, x * 3);
    const wing = mat('#b4bfd0', { metalness: 0.55, roughness: 0.35 });
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) box(spine, wing, 0.07, 0.38 - i * 0.05, 0.015, s * (0.12 + i * 0.08), 0.5 - i * 0.04, 0.15 + i * 0.01, 0.15, 0, s * (0.9 + i * 0.22)); // wing panels
    shoulders(spine, steel, 0.14, 0.09, 0.2);
    pelvis(hips, steel); belt(hips, blue);
    box(head, blue, 0.22, 0.26, 0.24, 0, 0.14, 0);
    box(head, steel, 0.2, 0.12, 0.02, 0, 0.17, -0.125);
    box(head, eye, 0.05, 0.05, 0.02, 0, 0.17, -0.135); // the one yellow light
    return { arm: steel, leg: blue, hand: steel, foot: steel };
  },
  hellwalker({ hips, spine, head }, team) {
    const olive = mat('#4a5a2c', { roughness: 0.6, metalness: 0.3 }), dark = mat('#22261a', { roughness: 0.7, metalness: 0.3 }), steel = mat('#6a6e72', { metalness: 0.7, roughness: 0.35 }), eye = glow('#ff2a1a', 2);
    torso(spine, olive, 0.5, 0.56, 0.3);
    box(spine, dark, 0.44, 0.24, 0.02, 0, 0.38, -0.155); box(spine, dark, 0.3, 0.2, 0.02, 0, 0.14, -0.155);
    for (const s of [-1, 1]) { box(spine, olive, 0.22, 0.14, 0.3, s * 0.3, 0.56, 0, 0, 0, s * -0.2); box(spine, team, 0.04, 0.12, 0.31, s * 0.36, 0.55, 0, 0, 0, s * -0.2); }
    // Spiked shield on the back
    cyl(spine, steel, 0.22, 0.22, 0.04, 0, 0.32, 0.18, Math.PI / 2, 0, 0, 16);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cone(spine, dark, 0.025, 0.08, Math.cos(a) * 0.22, 0.32 + Math.sin(a) * 0.22, 0.18, 0, 0, a - Math.PI / 2, 4); }
    cone(spine, dark, 0.04, 0.1, 0, 0.32, 0.23, Math.PI / 2, 0, 0, 6);
    for (let i = 0; i < 4; i++) add(spine, new THREE.TorusGeometry(0.035, 0.01, 4, 8), steel, -0.31, 0.46 - i * 0.05, -0.06, 0, Math.PI / 2 * (i % 2), 0); // chain
    pelvis(hips, dark); belt(hips, olive);
    headBlock(head, olive, 0.29);
    box(head, dark, 0.26, 0.1, 0.02, 0, 0.16, -0.148);
    for (const s of [-1, 1]) { box(head, eye, 0.06, 0.015, 0.01, s * 0.055, 0.16, -0.16); cone(head, dark, 0.035, 0.14, s * 0.15, 0.29, 0.02, 0, 0, s * -0.6, 5); } // eye slits and horn ridges
    box(head, dark, 0.04, 0.06, 0.26, 0, 0.31, 0);
    return { arm: olive, leg: dark, hand: dark, foot: dark };
  },
  gigachad({ hips, spine, head }, team) {
    const gold = mat('#f5c533', { metalness: 0.35, roughness: 0.3, emissive: '#3a2a00', emissiveIntensity: 0.6 }), deep = mat('#c08a16', { metalness: 0.35, roughness: 0.35 }), gem = mat('#d0213a', { emissive: '#600010', emissiveIntensity: 0.8 });
    torso(spine, gold, 0.52, 0.56, 0.3);
    box(spine, deep, 0.36, 0.3, 0.02, 0, 0.38, -0.155);
    ball(spine, gem, 0.035, 0, 0.4, -0.16);
    for (const s of [-1, 1]) box(spine, gold, 0.22, 0.14, 0.3, s * 0.3, 0.56, 0, 0, 0, s * -0.25);
    const cape = box(spine, mat('#8a0f1e'), 0.5, 0.82, 0.02, 0, 0.18, 0.17, 0.1, 0, 0); cape.castShadow = false;
    box(spine, team, 0.5, 0.04, 0.025, 0, 0.58, 0.165); // cape clasp in your color
    pelvis(hips, gold); belt(hips, deep);
    headBlock(head, gold, 0.29);
    box(head, mat('#111'), 0.22, 0.05, 0.02, 0, 0.17, -0.148);
    cyl(head, gold, 0.17, 0.17, 0.06, 0, 0.33, 0, 0, 0, 0, 16);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cone(head, gold, 0.035, 0.1, Math.cos(a) * 0.15, 0.4, Math.sin(a) * 0.15, 0, 0, 0, 4); }
    ball(head, gem, 0.03, 0, 0.34, -0.17);
    return { arm: gold, leg: deep, hand: gold, foot: deep };
  },
};
// Ranked armor: one design tinted with the division's color, with more on it the higher the division.
for (const [div, color] of Object.entries(RANK_COLOR)) {
  const tier = Object.keys(RANK_COLOR).indexOf(div); // 0..4
  BUILD['rk_' + div] = ({ hips, spine, head }, team) => {
    const plate = mat(color, { metalness: 0.55, roughness: 0.35 }), dark = mat('#20232a', { metalness: 0.4, roughness: 0.5 }), shine = glow(color, 0.8 + tier * 0.4);
    torso(spine, dark, 0.5, 0.56, 0.3);
    box(spine, plate, 0.44, 0.3, 0.02, 0, 0.38, -0.155);
    box(spine, team, 0.44, 0.04, 0.02, 0, 0.21, -0.155);
    for (const s of [-1, 1]) box(spine, plate, 0.2 + tier * 0.01, 0.12 + tier * 0.01, 0.3, s * 0.29, 0.55, 0, 0, 0, s * -0.2);
    if (tier >= 1) box(spine, shine, 0.06, 0.06, 0.02, 0, 0.42, -0.168, 0, 0, 0.785); // emblem
    if (tier >= 3) { const c = box(spine, plate, 0.46, 0.7, 0.02, 0, 0.24, 0.17, 0.08); c.castShadow = false; } // cape
    pelvis(hips, dark); belt(hips, plate);
    headBlock(head, dark, 0.29);
    box(head, plate, 0.3, 0.1, 0.3, 0, 0.27, 0);
    box(head, shine, 0.22, 0.03, 0.02, 0, 0.16, -0.148); // visor
    if (tier >= 2) box(head, plate, 0.04, 0.12, 0.24, 0, 0.36, 0); // crest
    if (tier >= 4) for (let i = -2; i <= 2; i++) cone(head, shine, 0.025, 0.1, i * 0.06, 0.4, 0, 0, 0, 0, 4); // Legend: a crown of light
    return { arm: dark, leg: dark, hand: plate, foot: plate };
  };
}

// Builds a costume's parts into new groups. Returns { hips, spine, head, mats } or null (no costume).
export function buildCostume(id, team) {
  const b = BUILD[id];
  if (!b) return null;
  const parts = { hips: new THREE.Group(), spine: new THREE.Group(), head: new THREE.Group() };
  const m = b(parts, team);
  return { ...parts, mats: m };
}
export const costumeItem = (id) => COSTUME_ITEMS.find((c) => c.id === id) || null;
