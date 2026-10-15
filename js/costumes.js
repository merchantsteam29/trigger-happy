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
  { id: 'dino', name: 'Dino', price: 1000, icon: '🦖', desc: 'An inflatable T-rex with tiny arms and spikes in your color.' },
  { id: 'shark', name: 'Shark', price: 1000, icon: '🦈', desc: 'Your face peeks out of the shark\'s mouth.' },
  { id: 'astronaut', name: 'Astronaut', price: 1100, icon: '👨‍🚀', desc: 'A classic space suit with a gold visor.' },
  { id: 'chicken', name: 'Chicken', price: 900, icon: '🐔', desc: 'Flaps its wings when you emote.' },
  { id: 'toaster', name: 'Toaster Bot', price: 1000, icon: '🍞', desc: 'A walking toaster. Toast pops up when you emote.' },
  { id: 'icecream', name: 'Ice Cream Cone', price: 900, icon: '🍦', desc: 'A waffle cone body, and your head is the scoop.' },
  // Styles: another look for a costume
  { id: 'goldskeleton', name: 'Gold Skeleton', price: 1400, icon: '💀', desc: 'A Skeleton style: solid gold bones.' },
  { id: 'neonninja', name: 'Neon Ninja', price: 1300, icon: '🥷', desc: 'A Ninja style: glowing pink edges.' },
  { id: 'shadowsamurai', name: 'Shadow Samurai', price: 1500, icon: '⛩', desc: 'A Cyber Samurai style: red neon.' },
  { id: 'darkastronaut', name: 'Dark Astronaut', price: 1400, icon: '🌑', desc: 'An Astronaut style: a black suit and a purple visor.' },
  // Giveaways (game-inspired)
  { id: 'impostor', name: 'Impostor', reward: true, handout: true, how: HANDOUT, icon: '🫘', desc: 'A bean-shaped astronaut in your color.' },
  { id: 'bugknight', name: 'Bug Knight', reward: true, handout: true, how: HANDOUT, icon: '🐞', desc: 'A white horned mask, a ragged cloak and a nail on the back.' },
  { id: 'cubehero', name: 'Cube Hero', reward: true, handout: true, how: HANDOUT, icon: '🧪', desc: 'Jumpsuit, spring boots and a portal device on the back.' },
  { id: 'bloodmachine', name: 'Blood Machine', reward: true, handout: true, how: HANDOUT, icon: '🩸', desc: 'A slim blue machine with one yellow light and metal wings.' },
  { id: 'hellwalker', name: 'Hellwalker', reward: true, handout: true, how: HANDOUT, icon: '🔥', desc: 'Green armor, a gold visor and a spiked shield saw.' },
  { id: 'spartan', name: 'Spartan', reward: true, handout: true, how: HANDOUT, icon: '🪖', desc: 'Big green armor and a wide gold visor.' },
  { id: 'freddy', name: 'Freddy Bear', reward: true, handout: true, how: HANDOUT, icon: '🐻', desc: 'A brown animatronic bear with a top hat and bow tie.' },
  { id: 'bountyhunter', name: 'Bounty Hunter', reward: true, handout: true, how: HANDOUT, icon: '🛰', desc: 'Orange power suit, round shoulders, a green visor and an arm cannon.' },
  { id: 'vaultkid', name: 'Vault Kid', reward: true, handout: true, how: HANDOUT, icon: '☢', desc: 'A blue jumpsuit with yellow stripes and a big number on the back.' },
  { id: 'assassin', name: 'Hooded Assassin', reward: true, handout: true, how: HANDOUT, icon: '🗡', desc: 'White hood and robes with a red sash.' },
  { id: 'grinskeleton', name: 'Grin Skeleton', reward: true, handout: true, how: HANDOUT, icon: '😁', desc: 'A blue hoodie, a big skull grin and one glowing blue eye.' },
  { id: 'blocksteve', name: 'Block Steve', reward: true, handout: true, how: HANDOUT, icon: '⛏', desc: 'A blocky hero in a teal shirt and blue jeans.' },
  { id: 'puffball', name: 'Pink Puffball', reward: true, handout: true, how: HANDOUT, icon: '🩷', desc: 'A round pink puffball with red feet.' },
  { id: 'jellybean', name: 'Jelly Bean Racer', reward: true, handout: true, how: HANDOUT, icon: '🫘', desc: 'A squishy bean in your color with a goofy face.' },
  { id: 'creeper', name: 'Creeper Suit', reward: true, handout: true, how: HANDOUT, icon: '🟩', desc: 'Green pixel blocks and that famous frown.' },
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
  skeleton({ hips, spine, head }, team, pal = {}) { // pal: a style's colors (Gold Skeleton)
    const bone = mat(pal.bone || '#ece6d6', { emissive: pal.glow || '#3a3a30', emissiveIntensity: 0.6, ...(pal.shiny ? { metalness: 0.35, roughness: 0.3 } : {}) }), dark = mat(pal.dark || '#141416');
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
  samurai({ hips, spine, head }, team, pal = {}) { // pal: Shadow Samurai's red neon
    const armor = mat(pal.armor || '#16141a', { roughness: 0.35, metalness: 0.4 }), neon = glow(pal.neon || '#29f0ff', 1.8), red = glow(pal.red || '#ff2d75', 1.2);
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
  ninja({ hips, spine, head }, team, pal = {}) { // pal.neon: Neon Ninja's glowing edges
    const cloth = mat('#141518', { roughness: 0.95 }), wrap = mat('#26282d');
    torso(spine, cloth);
    if (pal.neon) { // glowing edges down the sides, across the shoulders and around the head
      const n = glow(pal.neon, 2);
      for (const s of [-1, 1]) { box(spine, n, 0.015, 0.56, 0.3, s * 0.255, 0.3, 0); box(spine, n, 0.2, 0.015, 0.3, s * 0.15, 0.585, 0); }
      for (const s of [-1, 1]) box(head, n, 0.012, 0.29, 0.29, s * 0.145, 0.15, 0);
      box(head, n, 0.29, 0.012, 0.29, 0, 0.297, 0);
    }
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
    // A crewmate in your color: one bean from the hips to the top of the head, a big visor, a backpack.
    const visor = mat('#8fd8f0', { roughness: 0.1, metalness: 0.3, emissive: '#2a6a8a', emissiveIntensity: 0.5 }), shine = mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 });
    const bean = add(spine, new THREE.CapsuleGeometry(0.28, 0.44, 6, 18), team, 0, 0.42, 0);
    bean.scale.set(1, 1, 0.85);
    add(spine, new THREE.CapsuleGeometry(0.1, 0.22, 4, 10), team, 0, 0.36, 0.25).scale.set(1.3, 1, 0.8); // backpack
    pelvis(hips, team);
    const v = add(head, new THREE.CapsuleGeometry(0.09, 0.2, 4, 14), visor, 0, 0.1, -0.21, 0, 0, Math.PI / 2);
    v.scale.set(1, 1, 0.6);
    box(head, shine, 0.1, 0.025, 0.02, 0.05, 0.14, -0.262); // the visor's shine
    return { arm: team, leg: team, hand: team, foot: team };
  },
  bugknight({ hips, spine, head }, team) {
    // Hollow Knight vibe: a tall white mask with two big black eyes and two horns, a ragged grey-blue cloak, a nail on the back.
    const cloak = mat('#3a4258', { roughness: 0.95 }), mask = mat('#f6f3ec', { roughness: 0.45 }), black = mat('#050507'), nail = mat('#c9ced6', { metalness: 0.6, roughness: 0.3 });
    cyl(spine, cloak, 0.2, 0.33, 0.62, 0, 0.28, 0, 0, 0, 0, 10);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cone(spine, cloak, 0.06, 0.12, Math.cos(a) * 0.29, -0.06, Math.sin(a) * 0.29, Math.PI, 0, 0, 3); } // ragged hem
    box(spine, team, 0.08, 0.06, 0.02, 0, 0.52, -0.21); // clasp in your color
    box(spine, nail, 0.035, 0.62, 0.02, 0.1, 0.36, 0.24, 0, 0, 0.35); box(spine, black, 0.1, 0.03, 0.03, 0.2, 0.62, 0.24, 0, 0, 0.35); // the nail
    pelvis(hips, cloak);
    add(head, new THREE.CapsuleGeometry(0.13, 0.12, 6, 16), mask, 0, 0.16, 0); // the mask
    for (const s of [-1, 1]) {
      add(head, new THREE.CapsuleGeometry(0.035, 0.05, 4, 10), black, s * 0.055, 0.13, -0.115).scale.set(1, 1, 0.4); // big black eyes
      cone(head, mask, 0.035, 0.18, s * 0.09, 0.38, 0, 0, 0, s * -0.25, 8);
      cone(head, mask, 0.03, 0.1, s * 0.13, 0.48, 0, 0, 0, s * -0.7, 8); // horns curving out
    }
    return { arm: cloak, leg: black, hand: black, foot: black };
  },
  cubehero({ hips, spine, head }, team) {
    // Portal vibe: white tank top, orange jumpsuit with the sleeves tied at the waist, long-fall boots, a portal device.
    const top = mat('#f2f2f2'), suit = mat('#e8742a'), boot = mat('#d8dde3', { metalness: 0.4 }), blue = glow('#3fa9ff', 2), orange = glow('#ff8a1a', 1.8), skin = mat('#d6a682'), black = mat('#1a1a1a'), dev = mat('#f8f8f8', { roughness: 0.3 });
    torso(spine, skin, 0.48, 0.56, 0.27);
    box(spine, top, 0.5, 0.44, 0.29, 0, 0.24, 0); // tank top
    for (const s of [-1, 1]) box(spine, suit, 0.09, 0.14, 0.31, s * 0.17, 0.04, 0, 0, 0, s * 0.6); // sleeves tied at the waist
    // Portal device on the back: white body, black stripe, prongs and a glowing blue tip
    const d = new THREE.Group(); d.position.set(0, 0.36, 0.22); d.rotation.z = 0.5; spine.add(d);
    box(d, dev, 0.14, 0.34, 0.12, 0, 0, 0); box(d, black, 0.145, 0.06, 0.125, 0, 0.04, 0);
    for (const s of [-1, 1]) box(d, black, 0.02, 0.1, 0.02, s * 0.04, 0.21, 0);
    cyl(d, blue, 0.035, 0.035, 0.06, 0, 0.2, 0);
    cyl(spine, blue, 0.06, 0.06, 0.01, -0.13, 0.42, -0.15, Math.PI / 2); cyl(spine, orange, 0.06, 0.06, 0.01, 0.13, 0.42, -0.15, Math.PI / 2); // portal badges
    pelvis(hips, suit); belt(hips, team);
    headBlock(head, skin, 0.26);
    for (const s of [-1, 1]) box(head, black, 0.04, 0.04, 0.02, s * 0.06, 0.17, -0.13);
    box(head, mat('#3a2414'), 0.3, 0.1, 0.3, 0, 0.28, 0.02); box(head, mat('#3a2414'), 0.08, 0.22, 0.08, 0, 0.12, 0.17); // hair and ponytail
    return { arm: skin, leg: suit, hand: skin, foot: boot };
  },
  bloodmachine({ hips, spine, head }, team) {
    // ULTRAKILL vibe: bright blue armor over a grey frame, a rounded head with one yellow eye, a yellow core,
    // four blade wings sweeping out and down from the back with glowing edges, and blood.
    const blue = mat('#2f6fe0', { metalness: 0.3, roughness: 0.35 }), frame = mat('#4a5262', { metalness: 0.3, roughness: 0.5 }), dark = mat('#20242c', { roughness: 0.6 });
    const blood = mat('#9a0a14', { roughness: 0.35 }), eye = glow('#ffd23f', 2.6), edge = glow('#ffcf3a', 1.6), wing = mat('#c4ccd8', { metalness: 0.3, roughness: 0.3 });
    torso(spine, frame, 0.42, 0.56, 0.24);
    box(spine, blue, 0.46, 0.24, 0.27, 0, 0.42, 0); // chest armor
    for (let i = 0; i < 3; i++) box(spine, blue, 0.3 - i * 0.03, 0.05, 0.25, 0, 0.24 - i * 0.07, 0); // ab segments
    cyl(spine, eye, 0.035, 0.035, 0.02, 0, 0.42, -0.142, Math.PI / 2); // yellow core
    box(spine, team, 0.08, 0.035, 0.02, 0, 0.06, -0.125); // your color
    for (const [x, y, r] of [[-0.14, 0.46, 0.4], [0.12, 0.3, -0.3], [-0.06, 0.18, 0.9]]) box(spine, blood, 0.1, 0.05, 0.01, x, y, -0.142, 0, 0, r);
    for (const s of [-1, 1]) box(spine, blue, 0.18, 0.12, 0.26, s * 0.27, 0.54, 0); // shoulder plates
    box(spine, dark, 0.3, 0.2, 0.06, 0, 0.42, 0.15); // wing mount
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const w = new THREE.Group(); w.position.set(s * 0.13, 0.52 - i * 0.07, 0.18); w.rotation.set(-0.25, s * 0.35, s * (1.45 + i * 0.22)); spine.add(w);
      const len = 0.62 - i * 0.07;
      box(w, wing, 0.08, len, 0.016, 0, len / 2, 0); // blade
      box(w, edge, 0.014, len, 0.019, s * 0.045, len / 2, 0); // glowing edge
      cone(w, wing, 0.04, 0.1, 0, len + 0.04, 0, 0, 0, 0, 4); // pointed tip
    }
    pelvis(hips, frame); belt(hips, blue);
    ball(head, blue, 0.15, 0, 0.16, 0).scale.set(0.95, 1.1, 1); // rounded head
    box(head, dark, 0.15, 0.17, 0.04, 0, 0.15, -0.125); // face plate
    cyl(head, eye, 0.04, 0.04, 0.03, 0, 0.17, -0.148, Math.PI / 2); // the one yellow eye
    return { arm: blue, leg: blue, hand: frame, foot: dark };
  },
  hellwalker({ hips, spine, head }, team) {
    // DOOM vibe: green armor plates, a rounded helmet with a gold visor, a spiked shield saw and a chain.
    const olive = mat('#556b2f', { roughness: 0.55, metalness: 0.35 }), dark = mat('#262a1e', { roughness: 0.7, metalness: 0.3 }), steel = mat('#6a6e72', { metalness: 0.7, roughness: 0.35 }), visor = mat('#ffbf3a', { metalness: 0.25, roughness: 0.15, emissive: '#8a5200', emissiveIntensity: 0.9 });
    torso(spine, dark, 0.5, 0.56, 0.3);
    box(spine, olive, 0.46, 0.26, 0.04, 0, 0.4, -0.15); // chest plate
    for (let i = 0; i < 3; i++) box(spine, olive, 0.32, 0.05, 0.03, 0, 0.18 - i * 0.065, -0.15); // ab plates
    for (const s of [-1, 1]) { box(spine, olive, 0.24, 0.15, 0.32, s * 0.3, 0.56, 0, 0, 0, s * -0.2); box(spine, team, 0.04, 0.13, 0.33, s * 0.37, 0.55, 0, 0, 0, s * -0.2); }
    cyl(spine, steel, 0.22, 0.22, 0.04, 0, 0.32, 0.18, Math.PI / 2, 0, 0, 16); // shield saw
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; cone(spine, dark, 0.025, 0.09, Math.cos(a) * 0.23, 0.32 + Math.sin(a) * 0.23, 0.18, 0, 0, a - Math.PI / 2, 4); }
    cone(spine, dark, 0.04, 0.1, 0, 0.32, 0.23, Math.PI / 2, 0, 0, 6);
    for (let i = 0; i < 4; i++) add(spine, new THREE.TorusGeometry(0.035, 0.01, 4, 8), steel, -0.31, 0.46 - i * 0.05, -0.06, 0, Math.PI / 2 * (i % 2), 0); // chain
    pelvis(hips, dark); belt(hips, olive);
    ball(head, olive, 0.165, 0, 0.16, 0).scale.set(1, 1.05, 1); // rounded helmet
    box(head, visor, 0.24, 0.1, 0.06, 0, 0.17, -0.13); // the gold visor
    box(head, olive, 0.05, 0.1, 0.3, 0, 0.3, 0); // crest
    for (const s of [-1, 1]) box(head, dark, 0.04, 0.12, 0.12, s * 0.16, 0.13, -0.02); // cheek guards
    box(head, dark, 0.16, 0.05, 0.05, 0, 0.06, -0.15); // mouth guard
    return { arm: olive, leg: dark, hand: dark, foot: dark };
  },
  spartan({ hips, spine, head }, team) {
    // Halo vibe: big green armor, a rounded helmet with a wide gold visor, black undersuit.
    const green = mat('#5c6e3a', { roughness: 0.45, metalness: 0.4 }), under = mat('#2a2d30', { roughness: 0.8 }), visor = mat('#ffbf3a', { metalness: 0.25, roughness: 0.15, emissive: '#8a5200', emissiveIntensity: 0.9 });
    torso(spine, under, 0.48, 0.56, 0.28);
    box(spine, green, 0.5, 0.3, 0.33, 0, 0.4, -0.01); // chest armor
    box(spine, green, 0.38, 0.12, 0.3, 0, 0.16, -0.01);
    box(spine, team, 0.06, 0.06, 0.02, -0.15, 0.48, -0.18); // a light in your color
    for (const s of [-1, 1]) box(spine, green, 0.24, 0.16, 0.34, s * 0.3, 0.55, 0, 0, 0, s * -0.12);
    box(spine, green, 0.28, 0.3, 0.1, 0, 0.36, 0.19); // back pack
    pelvis(hips, under); for (const s of [-1, 1]) box(hips, green, 0.18, 0.18, 0.05, s * 0.11, -0.06, -0.14); belt(hips, green);
    ball(head, green, 0.165, 0, 0.16, 0).scale.set(1, 1.05, 1.08);
    add(head, new THREE.CapsuleGeometry(0.065, 0.16, 4, 14), visor, 0, 0.17, -0.135, 0, 0, Math.PI / 2).scale.set(1, 1, 0.55); // wide gold visor
    box(head, green, 0.12, 0.07, 0.06, 0, 0.05, -0.15); // chin
    return { arm: under, leg: green, hand: under, foot: green };
  },
  freddy({ hips, spine, head }, team) {
    // FNAF vibe: a brown animatronic bear with a tan belly and snout, round ears, blue eyes, black top hat and bow tie.
    const fur = mat('#7a4a22', { roughness: 0.8 }), tan = mat('#c9925a', { roughness: 0.8 }), black = mat('#0d0d0f', { roughness: 0.4 }), eye = glow('#4ab0ff', 1.6), white = mat('#f4f4f4');
    torso(spine, fur, 0.52, 0.56, 0.3);
    box(spine, tan, 0.32, 0.36, 0.02, 0, 0.26, -0.155); // belly
    for (const s of [-1, 1]) cone(spine, black, 0.05, 0.08, s * 0.06, 0.53, -0.16, Math.PI / 2, 0, s * Math.PI / 2, 3); // bow tie
    ball(spine, black, 0.025, 0, 0.53, -0.165);
    shoulders(spine, fur);
    pelvis(hips, fur); belt(hips, tan);
    headBlock(head, fur, 0.29);
    box(head, tan, 0.2, 0.1, 0.08, 0, 0.08, -0.17); // snout
    ball(head, black, 0.03, 0, 0.12, -0.215); // nose
    for (const s of [-1, 1]) {
      ball(head, white, 0.035, s * 0.065, 0.2, -0.14); ball(head, eye, 0.018, s * 0.065, 0.2, -0.17); // blue eyes
      cyl(head, fur, 0.055, 0.055, 0.04, s * 0.13, 0.33, 0, Math.PI / 2); cyl(head, tan, 0.03, 0.03, 0.045, s * 0.13, 0.33, 0, Math.PI / 2); // round ears
    }
    cyl(head, black, 0.09, 0.09, 0.16, 0, 0.38, 0); cyl(head, black, 0.13, 0.13, 0.02, 0, 0.3, 0); cyl(head, team, 0.092, 0.092, 0.03, 0, 0.33, 0); // top hat, band in your color
    return { arm: fur, leg: fur, hand: tan, foot: fur };
  },
  bountyhunter({ hips, spine, head }, team) {
    // Metroid vibe: an orange-red power suit, huge round yellow shoulders, a red helmet with a green visor, an arm cannon.
    const red = mat('#c63a1a', { metalness: 0.45, roughness: 0.35 }), yellow = mat('#f2b01a', { metalness: 0.45, roughness: 0.35 }), visor = glow('#3aff7a', 1.2), dark = mat('#2a2a2e', { metalness: 0.4 });
    torso(spine, red, 0.48, 0.56, 0.3);
    box(spine, yellow, 0.34, 0.14, 0.02, 0, 0.38, -0.155); box(spine, team, 0.1, 0.06, 0.02, 0, 0.22, -0.155);
    for (const s of [-1, 1]) { ball(spine, yellow, 0.16, s * 0.3, 0.55, 0); cyl(spine, red, 0.165, 0.165, 0.04, s * 0.3, 0.55, 0, 0, 0, Math.PI / 2, 16); } // big round shoulders
    // Arm cannon along the right shoulder / gun side
    cyl(spine, dark, 0.07, 0.07, 0.28, 0.3, 0.42, -0.14, Math.PI / 2); cyl(spine, yellow, 0.075, 0.075, 0.05, 0.3, 0.42, -0.26, Math.PI / 2); cyl(spine, glow('#ff9a3a', 1.6), 0.04, 0.04, 0.02, 0.3, 0.42, -0.29, Math.PI / 2);
    pelvis(hips, red); belt(hips, yellow);
    ball(head, red, 0.16, 0, 0.16, 0).scale.set(1, 1.05, 1.05);
    box(head, visor, 0.2, 0.08, 0.06, 0, 0.17, -0.135); // green visor
    box(head, yellow, 0.06, 0.06, 0.2, 0, 0.3, 0.02); // helmet ridge
    return { arm: red, leg: yellow, hand: red, foot: red };
  },
  creeper({ hips, spine, head }, team) {
    // Minecraft vibe: green pixel blocks all over and the frowning black face.
    const greens = ['#4caf3c', '#5fc44a', '#3c8f30', '#6ad254'].map((c) => mat(c, { roughness: 0.9 })), black = mat('#0a0a0a');
    let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const pixels = (g, w, h, d, cx, cy, n) => { // a block made of pixel squares
      box(g, greens[0], w, h, d, cx, cy, 0);
      for (let i = 0; i < n; i++) { const fx = (Math.floor(rnd() * 4) - 1.5) * (w / 4), fy = (Math.floor(rnd() * 4) - 1.5) * (h / 4), m = greens[1 + Math.floor(rnd() * 3)]; box(g, m, w / 4, h / 4, 0.01, cx + fx, cy + fy, -d / 2 - 0.004); box(g, m, w / 4, h / 4, 0.01, cx - fx, cy - fy, d / 2 + 0.004); }
    };
    pixels(spine, 0.46, 0.56, 0.28, 0, 0.3, 10);
    pelvis(hips, greens[2]); belt(hips, team);
    pixels(head, 0.29, 0.29, 0.29, 0, 0.15, 6);
    for (const s of [-1, 1]) box(head, black, 0.07, 0.07, 0.02, s * 0.065, 0.2, -0.152); // eyes
    box(head, black, 0.07, 0.1, 0.02, 0, 0.11, -0.152); for (const s of [-1, 1]) box(head, black, 0.035, 0.07, 0.02, s * 0.05, 0.07, -0.152); // the frown
    return { arm: greens[0], leg: greens[0], hand: greens[2], foot: greens[2] };
  },
  dino({ hips, spine, head }, team) {
    // An inflatable T-rex: green with a light belly, back spikes, a tail, tiny arms and a big toothy head.
    const green = mat('#4caf50', { roughness: 0.55 }), belly = mat('#d7e8a0', { roughness: 0.6 }), white = mat('#fafafa'), black = mat('#111');
    torso(spine, green, 0.52, 0.58, 0.3);
    box(spine, belly, 0.32, 0.42, 0.02, 0, 0.26, -0.155);
    for (let i = 0; i < 4; i++) cone(spine, team, 0.05, 0.1, 0, 0.55 - i * 0.14, 0.16, -0.6, 0, 0, 4); // back spikes in your color
    for (const s of [-1, 1]) box(spine, green, 0.06, 0.05, 0.12, s * 0.12, 0.4, -0.2, 0.4); // tiny arms
    pelvis(hips, green);
    cone(hips, green, 0.14, 0.55, 0, -0.05, 0.36, -1.9, 0, 0, 8); // tail
    headBlock(head, green, 0.29);
    box(head, green, 0.24, 0.13, 0.16, 0, 0.12, -0.2); // snout
    for (let i = -3; i <= 3; i++) cone(head, white, 0.012, 0.03, i * 0.03, 0.045, -0.27, Math.PI, 0, 0, 3); // teeth
    for (const s of [-1, 1]) { box(head, white, 0.05, 0.05, 0.02, s * 0.08, 0.22, -0.15); box(head, black, 0.025, 0.03, 0.02, s * 0.08, 0.22, -0.16); }
    return { arm: green, leg: green, hand: green, foot: green };
  },
  shark({ hips, spine, head }, team) {
    // A shark suit: your face peeks out of the open mouth.
    const grey = mat('#6a8aa8', { roughness: 0.6 }), white = mat('#f2f4f6'), skin = mat('#d6a682'), black = mat('#111');
    torso(spine, grey, 0.5, 0.56, 0.3);
    box(spine, white, 0.34, 0.44, 0.02, 0, 0.26, -0.155);
    box(spine, grey, 0.04, 0.26, 0.22, 0, 0.62, 0.12, -0.4); // dorsal fin
    for (const s of [-1, 1]) box(spine, grey, 0.2, 0.04, 0.12, s * 0.3, 0.3, 0.02, 0, 0, s * 0.5); // side fins
    box(spine, team, 0.5, 0.04, 0.31, 0, 0.08, 0);
    pelvis(hips, grey);
    const tail = new THREE.Group(); tail.position.set(0, -0.02, 0.2); hips.add(tail);
    box(tail, grey, 0.08, 0.1, 0.28, 0, 0, 0.12, -0.3); box(tail, grey, 0.04, 0.3, 0.1, 0, 0.08, 0.28, -0.3);
    headBlock(head, skin, 0.22); // your face
    for (const s of [-1, 1]) box(head, black, 0.035, 0.035, 0.02, s * 0.05, 0.16, -0.11);
    box(head, grey, 0.32, 0.12, 0.32, 0, 0.32, 0); box(head, grey, 0.3, 0.06, 0.3, 0, -0.02, 0); // the shark's head around it
    for (const s of [-1, 1]) box(head, grey, 0.05, 0.3, 0.3, s * 0.155, 0.15, 0);
    for (let i = -3; i <= 3; i++) { cone(head, white, 0.014, 0.04, i * 0.04, 0.245, -0.15, Math.PI, 0, 0, 3); cone(head, white, 0.014, 0.04, i * 0.04, 0.025, -0.15, 0, 0, 0, 3); } // teeth
    for (const s of [-1, 1]) box(head, black, 0.03, 0.03, 0.02, s * 0.13, 0.33, -0.16); // shark eyes
    return { arm: grey, leg: grey, hand: white, foot: grey };
  },
  astronaut({ hips, spine, head }, team, pal = {}) {
    // A classic space suit: white, a gold visor, a life-support pack and a flag patch in your color. (pal: Dark Astronaut)
    const suit = mat(pal.suit || '#f2f4f7'), grey = mat(pal.grey || '#9aa1ab'), visor = mat(pal.visor || '#ffbf3a', { metalness: 0.25, roughness: 0.15, emissive: pal.visorGlow || '#8a5200', emissiveIntensity: 0.9 });
    torso(spine, suit, 0.52, 0.56, 0.3);
    box(spine, grey, 0.4, 0.46, 0.16, 0, 0.32, 0.22); // life-support pack
    box(spine, team, 0.1, 0.07, 0.01, -0.13, 0.44, -0.155); // flag patch
    box(spine, grey, 0.16, 0.1, 0.03, 0.08, 0.26, -0.16); for (const [x, c] of [[0.04, '#ff3a3a'], [0.08, '#3aff7a'], [0.12, '#3a9aff']]) box(spine, glow(c, 1.2), 0.025, 0.025, 0.01, x, 0.27, -0.178); // chest controls
    shoulders(spine, suit);
    pelvis(hips, suit); belt(hips, grey);
    ball(head, suit, 0.18, 0, 0.16, 0);
    add(head, new THREE.CapsuleGeometry(0.1, 0.12, 4, 14), visor, 0, 0.16, -0.12, 0, 0, Math.PI / 2).scale.set(1, 1, 0.6); // gold visor
    cyl(head, grey, 0.17, 0.17, 0.05, 0, 0.0, 0);
    return { arm: suit, leg: suit, hand: grey, foot: grey };
  },
  chicken({ hips, spine, head }, team) {
    // A chicken suit: white feathers, red comb, yellow beak, wings that flap when you emote.
    const white = mat('#f6f4ee', { roughness: 0.9 }), red = mat('#d8262d'), beak = mat('#f2b01a'), black = mat('#111');
    torso(spine, white, 0.52, 0.56, 0.32);
    const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.position.set(s * 0.26, 0.48, 0.02); spine.add(w); box(w, white, 0.05, 0.36, 0.26, s * 0.02, -0.16, 0); box(w, team, 0.052, 0.06, 0.26, s * 0.02, -0.32, 0); return w; }); // wing tips in your color
    for (let i = -1; i <= 1; i++) box(spine, white, 0.06, 0.2, 0.04, i * 0.07, 0.15, 0.2, -0.6 + Math.abs(i) * 0.2, 0, i * 0.3); // tail feathers
    pelvis(hips, white);
    headBlock(head, white, 0.27);
    cone(head, beak, 0.05, 0.12, 0, 0.13, -0.19, -Math.PI / 2, 0, 0, 4);
    box(head, red, 0.04, 0.08, 0.03, 0, 0.05, -0.15); // wattle
    for (let i = -1; i <= 1; i++) ball(head, red, 0.04, 0, 0.32 + (i === 0 ? 0.03 : 0), i * 0.05); // comb
    for (const s of [-1, 1]) box(head, black, 0.035, 0.035, 0.02, s * 0.07, 0.19, -0.137);
    return {
      arm: white, leg: beak, hand: white, foot: beak,
      anim(dt, r) { const f = r.emoteT > 0 ? Math.sin(performance.now() / 45) * 0.7 + 0.5 : 0; wings.forEach((w, i) => { w.rotation.z += ((i ? 1 : -1) * f - w.rotation.z) * Math.min(1, dt * 18); }); },
    };
  },
  toaster({ hips, spine, head }, team) {
    // A walking toaster: chrome body with a lever, a little screen face, and toast that pops up when you emote.
    const chrome = mat('#d4d9e0', { metalness: 0.3, roughness: 0.25 }), dark = mat('#2a2d33'), bread = mat('#d9a35a', { roughness: 0.9 }), crust = mat('#8a5a2a'), face = glow('#7dffb0', 1.4);
    torso(spine, chrome, 0.5, 0.56, 0.32);
    box(spine, dark, 0.05, 0.14, 0.04, 0.27, 0.36, 0); box(spine, dark, 0.08, 0.04, 0.06, 0.29, 0.43, 0); // lever
    box(spine, team, 0.1, 0.04, 0.01, -0.12, 0.12, -0.165); for (const x of [-0.04, 0.0, 0.04]) cyl(spine, dark, 0.018, 0.018, 0.01, 0.08 + x, 0.12, -0.165, Math.PI / 2); // dials
    pelvis(hips, chrome);
    headBlock(head, chrome, 0.28);
    box(head, dark, 0.2, 0.12, 0.02, 0, 0.15, -0.142);
    for (const s of [-1, 1]) box(head, face, 0.035, 0.035, 0.01, s * 0.05, 0.17, -0.153);
    box(head, face, 0.07, 0.015, 0.01, 0, 0.12, -0.153);
    for (const s of [-1, 1]) box(head, dark, 0.22, 0.01, 0.05, 0, 0.292, s * 0.06); // slots
    const toast = new THREE.Group(); head.add(toast);
    for (const s of [-1, 1]) { box(toast, bread, 0.18, 0.12, 0.035, 0, 0.27, s * 0.06); box(toast, crust, 0.19, 0.02, 0.04, 0, 0.33, s * 0.06); }
    return {
      arm: chrome, leg: chrome, hand: dark, foot: dark,
      anim(dt, r) { const want = r.emoteT > 0 ? 0.13 + Math.abs(Math.sin(performance.now() / 160)) * 0.05 : 0; toast.position.y += (want - toast.position.y) * Math.min(1, dt * 14); },
    };
  },
  icecream({ hips, spine, head }, team) {
    // An ice cream cone: a waffle cone body, and your head is the scoop, with sprinkles and a cherry.
    const waffle = mat('#d8a056', { roughness: 0.85 }), line = mat('#a8702e'), scoop = mat('#ff9ac8', { roughness: 0.6 }), cherry = mat('#d0122a', { roughness: 0.3 }), black = mat('#2a1a1a');
    cone(spine, waffle, 0.3, 0.9, 0, 0.13, 0, Math.PI, 0, 0, 16); // the cone, point down
    for (const y of [0.4, 0.25, 0.1, -0.05]) { const rr = 0.3 * (y + 0.32) / 0.9 + 0.005; add(spine, new THREE.TorusGeometry(rr, 0.008, 4, 20), line, 0, y, 0, Math.PI / 2); } // waffle rings
    cyl(spine, scoop, 0.3, 0.29, 0.08, 0, 0.56, 0, 0, 0, 0, 16); // drips at the rim
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ball(spine, scoop, 0.06, Math.cos(a) * 0.27, 0.5, Math.sin(a) * 0.27); }
    box(spine, team, 0.3, 0.06, 0.02, 0, 0.36, -0.2); // a paper band in your color
    pelvis(hips, waffle);
    ball(head, scoop, 0.19, 0, 0.15, 0);
    const colors = ['#ffd23f', '#3aa8ff', '#3bd16f', '#ffffff', '#b36bff'];
    for (let i = 0; i < 14; i++) { const a = i * 2.4, y = 0.2 + (i % 4) * 0.035; box(head, mat(colors[i % 5]), 0.035, 0.01, 0.01, Math.cos(a) * 0.15, y, Math.sin(a) * 0.15, 0, a, 0.6); }
    ball(head, cherry, 0.05, 0, 0.36, 0); box(head, mat('#4f7a2a'), 0.01, 0.08, 0.01, 0.02, 0.42, 0, 0, 0, -0.3);
    for (const s of [-1, 1]) ball(head, black, 0.025, s * 0.06, 0.17, -0.175);
    box(head, black, 0.07, 0.015, 0.01, 0, 0.1, -0.18);
    return { arm: scoop, leg: waffle, hand: scoop, foot: line };
  },
  vaultkid({ hips, spine, head }, team) {
    // Fallout vibe: a blue jumpsuit with yellow trim, a yellow number on the back, a wrist computer.
    const blue = mat('#2a5cb8', { roughness: 0.7 }), yellow = mat('#f2c12e', { roughness: 0.6 }), skin = mat('#d6a682'), hair = mat('#5a3a1e'), dark = mat('#2a2d33');
    torso(spine, blue);
    box(spine, yellow, 0.05, 0.56, 0.01, 0, 0.3, -0.142); // zip stripe down the front
    box(spine, yellow, 0.5, 0.04, 0.29, 0, 0.56, 0); // yellow collar
    box(spine, yellow, 0.26, 0.2, 0.01, 0, 0.32, 0.142); // the number patch on the back...
    for (const x of [-0.075, 0, 0.075]) box(spine, blue, 0.025, 0.12, 0.012, x, 0.32, 0.145); // ...with "111" on it
    box(spine, team, 0.1, 0.05, 0.01, 0.13, 0.46, -0.142); // a name patch in your color
    shoulders(spine, blue);
    box(spine, mat('#4a5a3a'), 0.12, 0.1, 0.14, -0.33, 0.36, -0.05); box(spine, glow('#7dff6a', 1.2), 0.08, 0.05, 0.01, -0.33, 0.37, -0.122); // wrist computer
    pelvis(hips, blue); belt(hips, dark);
    headBlock(head, skin, 0.27);
    for (const s of [-1, 1]) box(head, mat('#1a1a1a'), 0.04, 0.04, 0.02, s * 0.06, 0.17, -0.137);
    box(head, mat('#b5462a'), 0.08, 0.02, 0.02, 0, 0.09, -0.137);
    box(head, hair, 0.3, 0.09, 0.3, 0, 0.3, 0.01); box(head, hair, 0.3, 0.14, 0.05, 0, 0.22, 0.13);
    return { arm: blue, leg: blue, hand: dark, foot: dark };
  },
  assassin({ hips, spine, head }, team) {
    // Assassin's Creed vibe: white hood with a beak tip and a shadowed face, white robes, red sash, leather straps.
    const white = mat('#ecebe6', { roughness: 0.85 }), red = mat('#b01e24', { roughness: 0.7 }), leather = mat('#5a3a22', { roughness: 0.8 }), shadow = mat('#0a0a0c'), steel = mat('#c9ced6', { metalness: 0.5, roughness: 0.3 });
    torso(spine, white);
    box(spine, white, 0.42, 0.5, 0.05, 0, 0.0, -0.13, -0.1); // robe skirt front
    box(spine, white, 0.42, 0.5, 0.05, 0, 0.0, 0.13, 0.1);
    box(spine, leather, 0.06, 0.6, 0.02, 0.08, 0.3, -0.145, 0, 0, 0.5); // chest strap
    for (let i = 0; i < 3; i++) box(spine, steel, 0.03, 0.08, 0.015, -0.04 + i * 0.05, 0.4 - i * 0.06, -0.15, 0, 0, 0.5); // throwing knives
    shoulders(spine, white);
    box(spine, steel, 0.02, 0.02, 0.12, -0.32, 0.25, -0.16); // the hidden blade, peeking
    pelvis(hips, white); box(hips, red, 0.47, 0.12, 0.29, 0, 0.07, 0); box(hips, leather, 0.1, 0.1, 0.3, 0, 0.07, 0); box(hips, team, 0.06, 0.06, 0.02, 0, 0.07, -0.155); // red sash, buckle in your color
    headBlock(head, shadow, 0.26); // the face in shadow
    box(head, white, 0.32, 0.3, 0.06, 0, 0.17, 0.13); for (const s of [-1, 1]) box(head, white, 0.04, 0.3, 0.3, s * 0.16, 0.17, 0);
    box(head, white, 0.32, 0.06, 0.32, 0, 0.32, 0);
    cone(head, white, 0.07, 0.12, 0, 0.3, -0.17, -Math.PI / 2 - 0.5, 0, 0, 4); // the hood's beak
    for (const s of [-1, 1]) box(head, mat('#ffe9b0', { emissive: '#ffd23a', emissiveIntensity: 0.4 }), 0.03, 0.012, 0.01, s * 0.05, 0.15, -0.135); // eyes in the shadow
    return { arm: white, leg: white, hand: leather, foot: leather };
  },
  grinskeleton({ hips, spine, head }, team) {
    // Undertale vibe: a blue hoodie with fur trim, a white shirt, black shorts, pink slippers, a big round skull grinning,
    // one eye glowing blue.
    const hoodie = mat('#3a7ad8', { roughness: 0.85 }), fur = mat('#f2f2f2', { roughness: 0.95 }), skull = mat('#f6f4ec', { roughness: 0.5 }), black = mat('#0a0a0a'), eye = glow('#3ad8ff', 2.6);
    torso(spine, mat('#f2f2f2'), 0.46, 0.56, 0.26); // white shirt
    for (const s of [-1, 1]) box(spine, hoodie, 0.17, 0.58, 0.3, s * 0.17, 0.3, 0); // open hoodie
    box(spine, fur, 0.52, 0.08, 0.32, 0, 0.56, 0); // fur trim
    box(spine, hoodie, 0.42, 0.16, 0.05, 0, 0.5, 0.16); // hood down on the back
    box(spine, team, 0.04, 0.12, 0.01, 0.06, 0.4, -0.152); box(spine, team, 0.04, 0.12, 0.01, -0.06, 0.4, -0.152); // drawstrings in your color
    pelvis(hips, black); box(hips, fur, 0.02, 0.2, 0.27, 0.215, 0, 0); box(hips, fur, 0.02, 0.2, 0.27, -0.215, 0, 0); // shorts with a white stripe
    ball(head, skull, 0.17, 0, 0.16, 0).scale.set(1.1, 1, 1); // big round skull
    ball(head, black, 0.035, -0.065, 0.19, -0.135); ball(head, black, 0.035, 0.065, 0.19, -0.135); // eye sockets
    ball(head, eye, 0.016, -0.065, 0.19, -0.165); // one glowing eye
    ball(head, mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.5 }), 0.012, 0.065, 0.19, -0.165);
    box(head, black, 0.2, 0.012, 0.02, 0, 0.09, -0.15); for (let i = -4; i <= 4; i++) box(head, black, 0.006, 0.04, 0.02, i * 0.022, 0.09, -0.15); // the big grin
    box(head, black, 0.03, 0.025, 0.02, 0, 0.14, -0.163); // nose
    return { arm: hoodie, leg: mat('#e8e2d0'), hand: skull, foot: mat('#ff8fb8', { roughness: 0.9 }) };
  },
  blocksteve({ hips, spine, head }, team) {
    // Minecraft vibe: all blocks. A square head with short brown hair, a teal shirt, blue jeans, grey shoes.
    const skin = mat('#c99a6e', { roughness: 0.9 }), hair = mat('#3a2614', { roughness: 0.9 }), shirt = mat('#2ab0b0', { roughness: 0.9 }), jeans = mat('#3a3aa8', { roughness: 0.9 }), eye = mat('#ffffff'), iris = mat('#4a3aa8');
    torso(spine, shirt, 0.5, 0.56, 0.26);
    box(spine, team, 0.5, 0.04, 0.27, 0, 0.05, 0); // a hem in your color
    pelvis(hips, jeans);
    headBlock(head, skin, 0.3);
    box(head, hair, 0.31, 0.08, 0.31, 0, 0.27, 0); box(head, hair, 0.31, 0.2, 0.06, 0, 0.19, 0.13); // hair
    for (const s of [-1, 1]) { box(head, eye, 0.06, 0.035, 0.01, s * 0.07, 0.16, -0.152); box(head, iris, 0.03, 0.035, 0.012, s * 0.055, 0.16, -0.153); }
    box(head, mat('#8a5a3a'), 0.06, 0.03, 0.01, 0, 0.12, -0.152); box(head, mat('#5a3a22'), 0.12, 0.03, 0.01, 0, 0.08, -0.152); // nose, mouth
    return { arm: skin, leg: jeans, hand: skin, foot: mat('#6a6a6a') };
  },
  puffball({ hips, spine, head }, team) {
    // Kirby vibe: one big round pink body from the hips to the top of the head, big oval eyes, blush, red feet.
    const pink = mat('#ffaecb', { roughness: 0.6 }), red = mat('#d8263a', { roughness: 0.5 }), black = mat('#141018'), white = mat('#ffffff'), blush = mat('#ff6a9a', { roughness: 0.6 });
    ball(spine, pink, 0.42, 0, 0.42, 0).scale.set(1, 1, 0.85);
    pelvis(hips, pink);
    for (const s of [-1, 1]) {
      const e = ball(head, black, 0.03, s * 0.06, -0.02, -0.355); e.scale.set(0.7, 1.6, 0.5); // tall oval eyes
      ball(head, white, 0.012, s * 0.06, 0.01, -0.37);
      const b = ball(head, blush, 0.03, s * 0.15, -0.09, -0.33); b.scale.set(1.4, 0.6, 0.4); // blush
    }
    box(head, red, 0.05, 0.02, 0.01, 0, -0.08, -0.365); // little mouth
    box(spine, team, 0.08, 0.08, 0.02, 0, 0.2, 0.36); // a star patch in your color
    return { arm: pink, leg: pink, hand: pink, foot: red };
  },
  jellybean({ hips, spine, head }, team) {
    // Fall Guys vibe: a tall squishy bean in your color with a white face, big googly eyes and a smile.
    const face = mat('#f6f2ea', { roughness: 0.6 }), black = mat('#111'), white = mat('#ffffff');
    const bean = add(spine, new THREE.CapsuleGeometry(0.27, 0.48, 6, 18), team, 0, 0.44, 0);
    bean.scale.set(1, 1, 0.9);
    pelvis(hips, team);
    const f = ball(head, face, 0.16, 0, 0.16, -0.1); f.scale.set(1.15, 0.85, 0.6); // face
    for (const s of [-1, 1]) { ball(head, white, 0.045, s * 0.06, 0.2, -0.19); ball(head, black, 0.02, s * 0.06, 0.2, -0.235); } // googly eyes
    const m = add(head, new THREE.TorusGeometry(0.04, 0.008, 6, 12, Math.PI), black, 0, 0.13, -0.19); m.rotation.z = Math.PI; // smile
    return { arm: team, leg: team, hand: team, foot: team };
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
// Costume styles: another look for a costume, from the same builder with other colors.
const STYLES = {
  goldskeleton: ['skeleton', { bone: '#f5c533', glow: '#5a3a00', dark: '#2a1a05', shiny: true }],
  neonninja: ['ninja', { neon: '#ff2fd8' }],
  shadowsamurai: ['samurai', { neon: '#ff2a2a', red: '#ff8a1a', armor: '#0c0a0e' }],
  darkastronaut: ['astronaut', { suit: '#1e2028', grey: '#3a3d48', visor: '#b36bff', visorGlow: '#4a1a8a' }],
};
for (const [id, [base, pal]] of Object.entries(STYLES)) BUILD[id] = (parts, team) => BUILD[base](parts, team, pal);

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
// mats.anim(dt, player), if a costume has one, runs every frame (e.g. the Chicken's wings when emoting).
export function buildCostume(id, team) {
  const b = BUILD[id];
  if (!b) return null;
  const parts = { hips: new THREE.Group(), spine: new THREE.Group(), head: new THREE.Group() };
  const m = b(parts, team);
  return { ...parts, mats: m };
}
export const costumeItem = (id) => COSTUME_ITEMS.find((c) => c.id === id) || null;
