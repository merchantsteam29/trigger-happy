// Name tag styles: a cosmetic (slot `nametag` in missions.js COSMETICS) for the name above your head
// (remote.js nameTag). Some glow, some move (fire flickers, rainbow cycles, the owner's shimmers).
// In team modes tags keep the team colors, so you can always tell friend from foe. The owner's
// style only shows on a player the host has verified as the owner (their role), so it can't be
// faked by editing a save.

const STYLES = {
  gold: { stops: ['#fff6c2', '#ffd23a', '#c98a12'], glow: '#ffbf2e', blur: 10 },
  neon: { stops: ['#c9fbff', '#2ef2ff'], glow: '#00e5ff', blur: 18 },
  fire: { stops: ['#fff07a', '#ff9a1f', '#ff3a1f'], glow: '#ff5a1f', blur: 16, anim: 'flicker' },
  ice: { stops: ['#ffffff', '#bfe9ff', '#6cc4ff'], glow: '#9ad8ff', blur: 12 },
  toxic: { stops: ['#e6ff9a', '#7dff3a', '#2fbf2f'], glow: '#5aff3a', blur: 16 },
  galaxy: { stops: ['#ffb8f2', '#a46bff', '#3a7bff'], glow: '#8a5cff', blur: 14, sparks: '#ffffff' },
  royal: { stops: ['#e8c6ff', '#9b4dff'], glow: '#ffd23a', blur: 6, stroke: '#ffd23a' },
  rainbow: { stops: ['#ffffff', '#ffffff'], glow: '#ffffff', blur: 12, anim: 'hue' }, // white, tinted by the animation
  pixel: { stops: ['#ffffff', '#ffffff'], glow: '#000000', blur: 0, font: '900 32px "Courier New", monospace', pixel: true },
  lava: { stops: ['#ffe28a', '#ff7a1a', '#c81a0a'], glow: '#ff4a12', blur: 16, drips: '#ff5a12', anim: 'flicker' },
  code: { stops: ['#d8ffe0', '#3aff7a', '#1a9a3a'], glow: '#3aff7a', blur: 14, font: '700 28px "Courier New", monospace', anim: 'flicker' },
  candy: { stops: [...Array(7)].flatMap(() => ['#ffffff', '#ffffff', '#ff4f8b', '#ff4f8b']), glow: '#ff9ac8', blur: 10, sharp: true },
  shadow: { stops: ['#2a2a2e', '#08080a'], glow: '#ff1a2a', blur: 18, stroke: '#ff2a3a' },
  hearts: { stops: ['#ffe0ee', '#ff6aa8', '#ff2f6a'], glow: '#ff6aa8', blur: 12, sparks: '#ff6aa8', spark: '♥' },
  owner: { stops: ['#fffbe0', '#ffd23a', '#ff9d00'], glow: '#ffcc33', blur: 20, sparks: '#fff3a0', crown: true, anim: 'shimmer' },
};

const item = (id, name, price, desc) => ({ id, name, price, desc, get icon() { return tagIcon(id); } });
export const NAMETAG_ITEMS = [
  { id: 'none', name: 'Plain', free: true, desc: 'Your name in your color', get icon() { return tagIcon('none'); } },
  item('gold', 'Gold', 200, 'Shiny gold letters'),
  item('ice', 'Ice', 250, 'Frosty and cool'),
  item('toxic', 'Toxic', 250, 'Glowing green'),
  item('neon', 'Neon', 250, 'Bright cyan glow'),
  item('fire', 'Fire', 300, 'Flickering flames'),
  item('galaxy', 'Galaxy', 350, 'Purple and blue, with stars'),
  item('royal', 'Royal', 400, 'Purple with a gold edge'),
  item('rainbow', 'Rainbow', 500, 'Cycles through every color'),
  item('pixel', 'Pixel', 300, 'Blocky 8-bit letters'),
  item('lava', 'Lava', 400, 'Hot letters dripping lava'),
  item('code', 'Code', 400, 'Glowing green computer letters'),
  item('candy', 'Candy Stripe', 300, 'Pink and white stripes'),
  item('shadow', 'Shadow', 450, 'Black letters with a red glow'),
  item('hearts', 'Hearts', 350, 'Pink, with hearts all around'),
  { id: 'owner', name: 'Owner', reward: true, how: 'Only GIGACHAD can wear this', desc: 'Shimmering gold with a crown', get icon() { return tagIcon('owner'); } },
];
export const NAMETAG_IDS = NAMETAG_ITEMS.map((x) => x.id);
export const tagAnim = (id) => (STYLES[id] && STYLES[id].anim) || null;

// Draws a name centered at (x, y) on a 2D canvas, in a style (or plain in `color`).
export function drawName(g, name, x, y, id, color) {
  const st = STYLES[id];
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '700 30px Rubik, sans-serif';
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(0,0,0,0.85)';
  if (!st) {
    g.strokeText(name, x, y);
    g.fillStyle = color;
    g.fillText(name, x, y);
    g.restore();
    return;
  }
  if (st.sparks) {
    g.fillStyle = st.sparks;
    for (let i = 0; i < 9; i++) { const a = i * 2.39, r = 70 + (i % 3) * 24; g.globalAlpha = 0.5 + (i % 2) * 0.4; g.fillText(st.spark || '✦', x + Math.cos(a) * r, y + Math.sin(a) * 16 + (i % 2 ? -14 : 12)); }
    g.globalAlpha = 1;
    g.font = '700 30px Rubik, sans-serif';
  }
  if (st.crown) { g.font = '28px sans-serif'; g.fillText('👑', x, y - 30); g.font = '800 30px Rubik, sans-serif'; }
  if (st.font) g.font = st.font;
  g.strokeText(name, x, y);
  if (st.pixel) { // arcade look: cyan and pink copies just off to the sides
    g.fillStyle = '#2ef2ff'; g.fillText(name, x - 2, y - 1);
    g.fillStyle = '#ff2fd8'; g.fillText(name, x + 2, y + 1);
  }
  if (st.drips) { // drops hanging under the letters
    const w0 = g.measureText(name).width;
    g.fillStyle = st.drips;
    for (let i = 0; i < 6; i++) { const dx = x - w0 / 2 + ((i + 0.5) / 6) * w0, len = 6 + ((i * 7) % 5) * 3; g.fillRect(dx - 2, y + 10, 4, len); g.beginPath(); g.arc(dx, y + 10 + len, 3, 0, Math.PI * 2); g.fill(); }
  }
  const w = Math.max(40, g.measureText(name).width);
  const grad = st.sharp ? g.createLinearGradient(x - 90, y - 30, x + 90, y + 30) : g.createLinearGradient(0, y - 15, 0, y + 15); // stripes run diagonally
  if (st.sharp) st.stops.forEach((c, i) => grad.addColorStop(Math.floor(i / 2) * 2 / st.stops.length + (i % 2) * (2 / st.stops.length - 0.001), c)); // hard-edged stripes
  else st.stops.forEach((c, i) => grad.addColorStop(i / Math.max(1, st.stops.length - 1), c));
  g.shadowColor = st.glow;
  g.shadowBlur = st.blur;
  g.fillStyle = grad;
  g.fillText(name, x, y);
  g.shadowBlur = 0;
  if (st.stroke) { g.lineWidth = 1.5; g.strokeStyle = st.stroke; g.strokeText(name, x, y); }
  g.restore();
  return w;
}

// Moves an animated tag (a THREE.Sprite). t: seconds.
export function animateTag(sprite, id, t) {
  const m = sprite && sprite.material;
  if (!m) return;
  const a = tagAnim(id);
  if (a === 'hue') m.color.setHSL((t * 0.22) % 1, 0.9, 0.62);
  else if (a === 'flicker') m.opacity = 0.84 + 0.16 * Math.sin(t * 13) * Math.sin(t * 7.3);
  else if (a === 'shimmer') m.color.setScalar(0.86 + 0.14 * Math.sin(t * 4));
}

// A small picture of a style (shop and Character cards).
const icons = new Map();
export function tagIcon(id) {
  if (!icons.has(id)) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    drawName(c.getContext('2d'), id === 'owner' ? 'GIGACHAD' : 'Your Name', 128, 58, id, '#ffffff');
    icons.set(id, `<img class="tag-prev" src="${c.toDataURL()}" alt="">`);
  }
  return icons.get(id);
}
