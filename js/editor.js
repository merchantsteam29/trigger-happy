import { MAPS, MAP_BLURB } from './maps.js';
import { store, esc } from './util.js';

// Map editor: draw your own map from above (blocks, stairs, ramps, jump pads, spawn points, team
// spawns, pickups), save up to 5, share them as a code, and host a private server on one. The host
// sends the map in its settings ('customMap'), so everyone who joins builds the same map
// (registerCustomMap) as map 'custom'.
//
// Map data: { v: 1, name, theme, boxes: [[x0, z0, x1, z1, y0, h, mat, stairs, ramp]], spawns: [[x, y, z, team]],
//   pickups: [[kind, x, y, z]] }
// stairs: 0 for a block, or the way the steps rise ('+x', '-x', '+z', '-z'); ramp: 1 for a ramp (fine
// steps, which feel like a slope). mat 'pad': a jump pad. team: 0 anyone, 1 red, 2 blue (team modes).
// kind: 'hp' health, 'ammo', or 'power' (a power weapon).

export const HALF_W = 30, HALF_D = 22, MAX_BOXES = 400, MAX_SPAWNS = 16, MAX_PICKUPS = 8;
export const PICKUP_KINDS = [['hp', '✚ Health'], ['ammo', '▣ Ammo'], ['power', '★ Power weapon']];
const PAD_H = 0.15;
export const EDIT_MATS = [
  ['concreteWall', 'Concrete', '#9aa0a6'], ['brick', 'Brick', '#a5553a'], ['brickDark', 'Dark brick', '#6a3a2c'],
  ['wood', 'Wood', '#a0743f'], ['crate', 'Crates', '#b58a4f'], ['stone', 'Stone', '#8f8a80'], ['castleStone', 'Castle stone', '#b9b2a6'],
  ['metalFloor', 'Metal', '#7d8794'], ['containerRed', 'Red container', '#b8322a'], ['containerBlue', 'Blue container', '#2d5fa8'],
  ['containerGreen', 'Green container', '#3f7a3a'], ['sandbag', 'Sandbags', '#b9a57a'], ['hedge', 'Hedge', '#3f6a2a'],
  ['snowBank', 'Snow', '#e9f0f6'], ['neonBlock', 'Neon', '#6a2cff'],
];
const MAT_IDS = [...EDIT_MATS.map((m) => m[0]), 'pad'];
const DIRS = ['+x', '-x', '+z', '-z'];
// Each theme borrows a built-in map's sky and lighting, and sets the ground.
const THEMES = {
  day: { name: 'Day', from: 'castle', floor: 'grass' },
  night: { name: 'Night', from: 'rooftops', floor: 'asphalt' },
  snow: { name: 'Snow', from: 'arctic', floor: 'snow' },
  desert: { name: 'Desert', from: 'town', floor: 'sand' },
};
export const THEME_IDS = Object.keys(THEMES);

const snap = (v) => Math.round(Number(v) * 2) / 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Anything from storage, a code or another player goes through here: sizes, counts and names capped.
export function cleanMap(d) {
  if (!d || typeof d !== 'object') return null;
  const out = { v: 1, name: String(d.name || 'My map').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) || 'My map', theme: THEME_IDS.includes(d.theme) ? d.theme : 'day', boxes: [], spawns: [], pickups: [] };
  for (const b of Array.isArray(d.boxes) ? d.boxes.slice(0, MAX_BOXES) : []) {
    if (!Array.isArray(b)) continue;
    let [x0, z0, x1, z1] = [b[0], b[1], b[2], b[3]].map((v) => snap(num(v)));
    x0 = clamp(x0, -HALF_W, HALF_W); x1 = clamp(x1, -HALF_W, HALF_W); z0 = clamp(z0, -HALF_D, HALF_D); z1 = clamp(z1, -HALF_D, HALF_D);
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (z1 < z0) [z0, z1] = [z1, z0];
    if (x1 - x0 < 0.5 || z1 - z0 < 0.5) continue;
    const mat = MAT_IDS.includes(b[6]) ? b[6] : 'concreteWall', pad = mat === 'pad';
    const y0 = clamp(snap(num(b[4])), 0, 12), h = pad ? PAD_H : clamp(snap(num(b[5])), 0.5, 10);
    const dir = !pad && DIRS.includes(b[7]) ? b[7] : 0;
    out.boxes.push([x0, z0, x1, z1, y0, h, mat, dir, dir && b[8] === 1 ? 1 : 0]);
  }
  for (const s of Array.isArray(d.spawns) ? d.spawns.slice(0, MAX_SPAWNS) : []) {
    if (!Array.isArray(s)) continue;
    out.spawns.push([clamp(snap(num(s[0])), -HALF_W + 1, HALF_W - 1), clamp(num(s[1]), 0, 22), clamp(snap(num(s[2])), -HALF_D + 1, HALF_D - 1), [1, 2].includes(s[3]) ? s[3] : 0]);
  }
  for (const k of Array.isArray(d.pickups) ? d.pickups.slice(0, MAX_PICKUPS) : []) {
    if (!Array.isArray(k) || !PICKUP_KINDS.some(([id]) => id === k[0])) continue;
    out.pickups.push([k[0], clamp(snap(num(k[1])), -HALF_W + 1, HALF_W - 1), clamp(num(k[2]), 0, 22), clamp(snap(num(k[3])), -HALF_D + 1, HALF_D - 1)]);
  }
  return out;
}

// Make it map 'custom' (maps.js), ready for setMapData / buildMapScene. Returns true if it changed.
let lastKey = '';
export function registerCustomMap(d) {
  const m = cleanMap(d);
  if (!m) return false;
  const key = JSON.stringify(m);
  if (key === lastKey && MAPS.custom) return false;
  lastKey = key;
  const T = THEMES[m.theme], base = MAPS[T.from];
  const spawns = m.spawns.length >= 2 ? m.spawns : [[-26, 0, -18], [26, 0, 18], [-26, 0, 18], [26, 0, -18]];
  MAPS.custom = {
    name: m.name,
    custom: true,
    theme: base ? base.theme : MAPS.castle.theme,
    bounds: 30,
    // Objective spots: the middle, then the spawn points.
    hills: [[0, 0, 0, 3], ...spawns.slice(0, 4).map(([x, y, z]) => [x * 0.6, 0, z * 0.6, 3])],
    pickups: m.pickups.length ? m.pickups.map((k) => k.slice()) : null, // host.js setupPickups
    build({ add, spawn, stairs }) {
      add(-HALF_W, -1, -HALF_D, HALF_W, 0, HALF_D, T.floor);
      add(-HALF_W, 0, HALF_D - 0.3, HALF_W, 6, HALF_D, 'concreteWall');
      add(-HALF_W, 0, -HALF_D, HALF_W, 6, -HALF_D + 0.3, 'concreteWall');
      add(HALF_W - 0.3, 0, -HALF_D, HALF_W, 6, HALF_D, 'concreteWall');
      add(-HALF_W, 0, -HALF_D, -HALF_W + 0.3, 6, HALF_D, 'concreteWall');
      for (const [x0, z0, x1, z1, y0, h, mat, dir, ramp] of m.boxes) {
        if (dir && ramp) ramps(x0, z0, x1, z1, y0, y0 + h, dir, mat, add);
        else if (dir) stairs(x0, z0, x1, z1, y0, y0 + h, dir, mat, add);
        else add(x0, y0, z0, x1, y0 + h, z1, mat);
      }
      for (const [x, y, z, team] of spawns) spawn(x, y, z, team);
    },
  };
  MAP_BLURB.custom = 'Custom map';
  return true;
}

// A ramp: stairs with 0.15 m steps (walked up smoothly; physics is boxes only).
function ramps(x0, z0, x1, z1, y0, y1, dir, mat, add) {
  const along = dir[1], len = along === 'x' ? x1 - x0 : z1 - z0;
  const n = Math.max(1, Math.ceil((y1 - y0) / 0.15)), d = len / n;
  for (let i = 0; i < n; i++) {
    const k = dir[0] === '+' ? i : n - 1 - i, top = y0 + ((y1 - y0) * (i + 1)) / n;
    if (along === 'x') add(x0 + k * d, y0, z0, x0 + (k + 1) * d, top, z1, mat);
    else add(x0, y0, z0 + k * d, x1, top, z0 + (k + 1) * d, mat);
  }
}

// Share codes: "M-" + the map as base64url JSON.
export function mapCode(d) {
  const json = JSON.stringify(cleanMap(d));
  return 'M-' + btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function readMapCode(code) {
  try {
    const s = String(code).trim().replace(/^M-/i, '').replace(/-/g, '+').replace(/_/g, '/');
    return cleanMap(JSON.parse(decodeURIComponent(escape(atob(s)))));
  } catch { return null; }
}

export const savedMaps = () => (store.get('customMaps', []) || []).map(cleanMap).filter(Boolean).slice(0, 5);

// ---------- The editor screen ----------
export class MapEditor {
  // onPlay(map, mode): host a private server on it. toast(text): a message.
  // onPublish(map) / onCommunity(): community maps (community.js).
  constructor({ onPlay, toast, onPublish, onCommunity }) {
    this.onPlay = onPlay;
    this.onPublish = onPublish;
    this.onCommunity = onCommunity;
    this.toast = toast;
    this.el = document.getElementById('editor');
    this.canvas = document.getElementById('ed-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.tool = 'block';
    this.mat = 'concreteWall';
    this.h = 3;
    this.y0 = 0;
    this.team = 0; // spawn tool: 0 anyone, 1 red, 2 blue
    this.kind = 'hp'; // pickup tool
    this.slot = -1; // which saved map this is (-1: not saved yet)
    this.undo = [];
    this.map = cleanMap({ name: 'My map', theme: 'day', boxes: [], spawns: [], pickups: [] });
    this.bind();
  }

  open() {
    this.el.classList.remove('hidden');
    this.renderPanel();
    requestAnimationFrame(() => this.draw());
  }

  close() { this.el.classList.add('hidden'); }

  // Opens a copy of someone's map (Community maps) as a new, unsaved map.
  load(map) { this.push(); this.map = cleanMap(map); this.slot = -1; this.renderPanel(); this.draw(); }

  // Canvas cell <-> world: x across, z down; 1 m = `this.k` pixels.
  fit() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    const k = Math.max(4, Math.floor(Math.min(r.width / (HALF_W * 2), r.height / (HALF_D * 2))));
    this.k = k;
    this.canvas.width = HALF_W * 2 * k;
    this.canvas.height = HALF_D * 2 * k;
  }

  toWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * HALF_W * 2 - HALF_W;
    const z = ((e.clientY - r.top) / r.height) * HALF_D * 2 - HALF_D;
    return { x: clamp(snap(x), -HALF_W, HALF_W), z: clamp(snap(z), -HALF_D, HALF_D) };
  }

  topAt(x, z) { // highest block top under a point (for spawns placed on platforms)
    let y = 0;
    for (const [x0, z0, x1, z1, y0, h, mat, dir] of this.map.boxes) if (!dir && mat !== 'pad' && x >= x0 && x <= x1 && z >= z0 && z <= z1) y = Math.max(y, y0 + h);
    return y;
  }

  push() { this.undo.push(JSON.stringify(this.map)); if (this.undo.length > 60) this.undo.shift(); }

  bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const p = this.toWorld(e);
      if (this.tool === 'spawn') {
        if (this.map.spawns.length >= MAX_SPAWNS) { this.toast(`Up to ${MAX_SPAWNS} spawn points`); return; }
        this.push();
        this.map.spawns.push([p.x, this.topAt(p.x, p.z), p.z, this.team]);
        this.draw();
        return;
      }
      if (this.tool === 'pickup') {
        if (this.map.pickups.length >= MAX_PICKUPS) { this.toast(`Up to ${MAX_PICKUPS} pickups`); return; }
        this.push();
        this.map.pickups.push([this.kind, p.x, this.topAt(p.x, p.z), p.z]);
        this.draw();
        return;
      }
      if (this.tool === 'erase') { this.eraseAt(p); return; }
      this.drag = { a: p, b: p };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => { if (this.drag) { this.drag.b = this.toWorld(e); this.draw(); } });
    c.addEventListener('pointerup', () => {
      const d = this.drag;
      this.drag = null;
      if (!d) return;
      const x0 = Math.min(d.a.x, d.b.x), x1 = Math.max(d.a.x, d.b.x), z0 = Math.min(d.a.z, d.b.z), z1 = Math.max(d.a.z, d.b.z);
      if (x1 - x0 < 0.5 || z1 - z0 < 0.5) { this.draw(); return; }
      if (this.map.boxes.length >= MAX_BOXES) { this.toast(`Up to ${MAX_BOXES} blocks`); return; }
      let dir = 0;
      if (this.tool === 'stairs' || this.tool === 'ramp') { // they rise the way you dragged
        const dx = d.b.x - d.a.x, dz = d.b.z - d.a.z;
        dir = Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? '+x' : '-x') : (dz >= 0 ? '+z' : '-z');
      }
      this.push();
      if (this.tool === 'pad') this.map.boxes.push([x0, z0, x1, z1, this.topAt((x0 + x1) / 2, (z0 + z1) / 2), PAD_H, 'pad', 0, 0]); // sits on whatever is under it
      else this.map.boxes.push([x0, z0, x1, z1, this.y0, this.h, this.mat, dir, this.tool === 'ramp' ? 1 : 0]);
      this.draw();
    });
    window.addEventListener('resize', () => { if (!this.el.classList.contains('hidden')) this.draw(); });
  }

  eraseAt(p) {
    const si = this.map.spawns.findIndex(([x, , z]) => Math.hypot(x - p.x, z - p.z) < 0.9);
    if (si >= 0) { this.push(); this.map.spawns.splice(si, 1); this.draw(); return; }
    const ki = this.map.pickups.findIndex(([, x, , z]) => Math.hypot(x - p.x, z - p.z) < 0.9);
    if (ki >= 0) { this.push(); this.map.pickups.splice(ki, 1); this.draw(); return; }
    for (let i = this.map.boxes.length - 1; i >= 0; i--) {
      const [x0, z0, x1, z1] = this.map.boxes[i];
      if (p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1) { this.push(); this.map.boxes.splice(i, 1); this.draw(); return; }
    }
  }

  draw() {
    this.fit();
    const g = this.ctx, k = this.k, X = (x) => (x + HALF_W) * k, Z = (z) => (z + HALF_D) * k;
    const floor = { day: '#3f5a33', night: '#262a33', snow: '#dfe7ee', desert: '#c9ab78' }[this.map.theme];
    g.fillStyle = floor;
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Grid: every meter, stronger every 5
    for (let x = -HALF_W; x <= HALF_W; x++) { g.strokeStyle = x % 5 ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.28)'; g.beginPath(); g.moveTo(X(x) + 0.5, 0); g.lineTo(X(x) + 0.5, this.canvas.height); g.stroke(); }
    for (let z = -HALF_D; z <= HALF_D; z++) { g.strokeStyle = z % 5 ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.28)'; g.beginPath(); g.moveTo(0, Z(z) + 0.5); g.lineTo(this.canvas.width, Z(z) + 0.5); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.strokeRect(X(-0.5), Z(-0.5), k, k); // the middle
    const color = (m) => (m === 'pad' ? '#27d3ff' : (EDIT_MATS.find((e) => e[0] === m) || EDIT_MATS[0])[2]);
    // Blocks, lowest first, so higher ones are drawn on top
    const list = [...this.map.boxes].sort((a, b) => a[4] + a[5] - (b[4] + b[5]));
    for (const [x0, z0, x1, z1, y0, h, mat, dir, ramp] of list) {
      g.fillStyle = color(mat);
      g.fillRect(X(x0), Z(z0), (x1 - x0) * k, (z1 - z0) * k);
      if (ramp) { // shaded from low to high
        const gr = dir[1] === 'x' ? g.createLinearGradient(X(x0), 0, X(x1), 0) : g.createLinearGradient(0, Z(z0), 0, Z(z1));
        gr.addColorStop(dir[0] === '+' ? 0 : 1, 'rgba(0,0,0,0.35)'); gr.addColorStop(dir[0] === '+' ? 1 : 0, 'rgba(255,255,255,0.15)');
        g.fillStyle = gr; g.fillRect(X(x0), Z(z0), (x1 - x0) * k, (z1 - z0) * k);
      }
      g.strokeStyle = 'rgba(0,0,0,0.55)';
      g.strokeRect(X(x0) + 0.5, Z(z0) + 0.5, (x1 - x0) * k - 1, (z1 - z0) * k - 1);
      g.fillStyle = '#fff';
      g.font = `bold ${Math.max(9, Math.min(13, k * 1.4))}px sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const cx = X((x0 + x1) / 2), cz = Z((z0 + z1) / 2);
      g.fillText(mat === 'pad' ? '⇑ pad' : dir ? `${ramp ? '◢ ' : ''}${{ '+x': '→', '-x': '←', '+z': '↓', '-z': '↑' }[dir]} ${y0 + h}m` : `${y0 ? `${y0}–` : ''}${y0 + h}m`, cx, cz);
    }
    for (const [x, y, z, team] of this.map.spawns) {
      g.fillStyle = ['#4dff9a', '#ff4d5e', '#4da3ff'][team || 0]; g.beginPath(); g.arc(X(x), Z(z), Math.max(4, k * 0.6), 0, 7); g.fill();
      g.strokeStyle = '#063'; g.stroke();
      if (y) { g.fillStyle = '#063'; g.font = 'bold 9px sans-serif'; g.fillText(String(y), X(x), Z(z)); }
    }
    for (const [kind, x, , z] of this.map.pickups) {
      const r = Math.max(5, k * 0.7);
      g.fillStyle = { hp: '#2fd36b', ammo: '#e0b03a', power: '#b061ff' }[kind];
      g.fillRect(X(x) - r, Z(z) - r, r * 2, r * 2);
      g.strokeStyle = '#111'; g.strokeRect(X(x) - r + 0.5, Z(z) - r + 0.5, r * 2 - 1, r * 2 - 1);
      g.fillStyle = '#fff'; g.font = `bold ${Math.round(r * 1.3)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText({ hp: '+', ammo: '▣', power: '★' }[kind], X(x), Z(z) + 1);
    }
    if (this.drag) {
      const { a, b } = this.drag;
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(X(Math.min(a.x, b.x)), Z(Math.min(a.z, b.z)), Math.abs(b.x - a.x) * k, Math.abs(b.z - a.z) * k);
    }
    const info = document.getElementById('ed-count');
    if (info) info.textContent = `${this.map.boxes.length} / ${MAX_BOXES} blocks · ${this.map.spawns.length} / ${MAX_SPAWNS} spawns · ${this.map.pickups.length} / ${MAX_PICKUPS} pickups`;
  }

  renderPanel() {
    const m = this.map, saved = savedMaps();
    const seg = (name, items, cur) => `<div class="seg ed-seg" data-seg="${name}">${items.map(([id, label]) => `<button data-v="${id}" class="${id === cur ? 'sel' : ''}">${label}</button>`).join('')}</div>`;
    document.getElementById('ed-panel').innerHTML = `
      <label class="ed-l">Name<input id="ed-name" maxlength="24" value="${esc(m.name)}"></label>
      <div class="ed-l">Theme${seg('theme', THEME_IDS.map((t) => [t, THEMES[t].name]), m.theme)}</div>
      <div class="ed-l">Tool${seg('tool', [['block', '▭ Block'], ['stairs', '▤ Stairs'], ['ramp', '◢ Ramp'], ['pad', '⇑ Jump pad'], ['spawn', '● Spawn'], ['pickup', '✚ Pickup'], ['erase', '✖ Erase']], this.tool)}</div>
      <small class="ed-hint">${{ block: 'Drag to draw a block.', stairs: 'Drag the way the steps should go up.', ramp: 'Drag the way the ramp should go up.', pad: 'Drag a small square: it launches players up. Put it on the ground or on a block.', spawn: 'Click to add a spawn point (on top of blocks too).', pickup: 'Click to place a pickup. Health and ammo come back after a while; the power weapon appears 30 s in.', erase: 'Click a block, spawn or pickup to remove it.' }[this.tool]}</small>
      ${this.tool === 'spawn' ? `<div class="ed-l">Team${seg('team', [['0', 'Anyone'], ['1', '🔴 Red'], ['2', '🔵 Blue']], String(this.team))}<small class="ed-hint">Team modes use red and blue spawns for each team (if the map has both).</small></div>` : ''}
      ${this.tool === 'pickup' ? `<div class="ed-l">Pickup${seg('kind', PICKUP_KINDS, this.kind)}</div>` : ''}
      <label class="ed-l">Material<select id="ed-mat">${EDIT_MATS.map(([id, n]) => `<option value="${id}" ${id === this.mat ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="ed-l">Height <b id="ed-hv">${this.h} m</b><input id="ed-h" type="range" min="0.5" max="10" step="0.5" value="${this.h}"></label>
      <label class="ed-l">Starts at <b id="ed-yv">${this.y0} m</b><input id="ed-y" type="range" min="0" max="12" step="0.5" value="${this.y0}"></label>
      <small class="ed-hint">Raise it to make bridges and floating platforms.</small>
      <small id="ed-count" class="ed-hint"></small>
      <div class="ed-btns"><button id="ed-undo">↶ Undo</button><button id="ed-clear" class="ghost">Clear</button></div>
      <div class="ed-btns"><button id="ed-save" class="primary">💾 Save</button><button id="ed-code">🔗 Code</button><button id="ed-import">📥 Load code</button></div>
      <div class="ed-btns"><button id="ed-publish" title="Share it with everyone in Community maps">🌍 Publish</button><button id="ed-community">🌍 Community maps</button></div>
      <div class="ed-l">Play it<div class="ed-btns"><select id="ed-mode">${[['ffa', 'Free For All'], ['tdm', 'Team Deathmatch'], ['ctf', 'Capture the Flag'], ['gungame', 'Gun Game'], ['infection', 'Infection'], ['koth', 'King of the Hill'], ['prophunt', 'Prop Hunt']].map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}</select><button id="ed-play" class="primary">▶ Play</button></div></div>
      <div class="ed-l">My maps${saved.length ? `<div class="ed-maps">${saved.map((s, i) => `<span class="ed-map ${i === this.slot ? 'sel' : ''}"><button data-load="${i}">${esc(s.name)}</button><button class="ghost" data-del="${i}" title="Delete">✖</button></span>`).join('')}</div>` : '<small class="ed-hint">Saved maps show here (up to 5).</small>'}</div>
      <button id="ed-close" class="ghost">Close editor</button>`;
    const $ = (id) => document.getElementById(id);
    // Handlers use this.map (not m): undo, load and import swap in a new map object.
    $('ed-name').oninput = (e) => { this.map.name = e.target.value.slice(0, 24); };
    document.querySelectorAll('#ed-panel [data-seg] button').forEach((b) => {
      b.onclick = () => {
        const which = b.parentElement.dataset.seg;
        if (which === 'theme') this.map.theme = b.dataset.v;
        else if (which === 'team') this.team = Number(b.dataset.v);
        else if (which === 'kind') this.kind = b.dataset.v;
        else this.tool = b.dataset.v;
        this.renderPanel(); this.draw();
      };
    });
    $('ed-mat').onchange = (e) => { this.mat = e.target.value; };
    $('ed-h').oninput = (e) => { this.h = Number(e.target.value); $('ed-hv').textContent = `${this.h} m`; };
    $('ed-y').oninput = (e) => { this.y0 = Number(e.target.value); $('ed-yv').textContent = `${this.y0} m`; };
    $('ed-undo').onclick = () => { const s = this.undo.pop(); if (s) { this.map = cleanMap(JSON.parse(s)); this.renderPanel(); this.draw(); } };
    $('ed-clear').onclick = () => { if (!confirm('Clear the whole map?')) return; this.push(); this.map.boxes = []; this.map.spawns = []; this.map.pickups = []; this.draw(); };
    $('ed-save').onclick = () => {
      const all = savedMaps();
      if (this.slot < 0 || this.slot >= all.length) {
        if (all.length >= 5) { this.toast('You can keep 5 maps. Delete one first.'); return; }
        this.slot = all.length;
      }
      all[this.slot] = cleanMap(this.map);
      store.set('customMaps', all);
      this.toast(`Saved "${all[this.slot].name}"`);
      this.renderPanel();
    };
    $('ed-code').onclick = async () => {
      const code = mapCode(this.map);
      try { await navigator.clipboard.writeText(code); this.toast('Map code copied. Send it to a friend!'); } catch { prompt('Copy this map code:', code); }
    };
    $('ed-import').onclick = () => {
      const code = prompt('Paste a map code (starts with M-):');
      if (!code) return;
      const got = readMapCode(code);
      if (!got) { this.toast('That is not a map code.'); return; }
      this.push(); this.map = got; this.slot = -1; this.renderPanel(); this.draw();
    };
    $('ed-play').onclick = () => {
      const map = cleanMap(this.map);
      if (!map.boxes.length && !map.spawns.length) { this.toast('Draw something first!'); return; }
      this.close();
      this.onPlay(map, $('ed-mode').value);
    };
    document.querySelectorAll('#ed-panel [data-load]').forEach((b) => { b.onclick = () => { this.slot = Number(b.dataset.load); this.map = savedMaps()[this.slot]; this.undo = []; this.renderPanel(); this.draw(); }; });
    document.querySelectorAll('#ed-panel [data-del]').forEach((b) => {
      b.onclick = () => {
        const i = Number(b.dataset.del), all = savedMaps();
        if (!confirm(`Delete "${all[i].name}"?`)) return;
        all.splice(i, 1);
        store.set('customMaps', all);
        if (this.slot === i) this.slot = -1; else if (this.slot > i) this.slot--;
        this.renderPanel();
      };
    });
    $('ed-close').onclick = () => this.close();
    $('ed-publish').onclick = () => { if (this.onPublish) this.onPublish(cleanMap(this.map)); };
    $('ed-community').onclick = () => { if (this.onCommunity) this.onCommunity(); };
  }
}
