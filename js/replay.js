import * as THREE from 'three';
import { RemotePlayer } from './remote.js';
import { MAPS } from './maps.js';
import { MODES } from './host.js';
import { registerCustomMap } from './editor.js';
import { esc } from './util.js';
import { WEAPONS } from './weapons.js';
import { sfx } from './audio.js';

// Replay theater. Every client records the matches it plays or watches: every host snapshot
// (20 a second: where everyone is, their aim, gun and state), the shots (with tracers), thrown and
// fired projectiles, explosions and kills. The last 5 matches are kept on the device (IndexedDB).
// Home screen → 🎬 Replays plays one back on its map from any angle: the spectator camera (follow a
// player, their view, or fly free), a timeline, speeds, and ⏺ to save a video clip. Movement is
// smoothed with a Catmull-Rom curve through the snapshots. Reports carry the last 30 s as a compact
// clip (`encodeClip`), signed at whffa/v1/replay/<report id>, which staff open from the Mod Panel.
//
// Recording (v 2): { v, map, mode, cm (custom map), at (ms), ids: [player ids], pl: { id: { n, c, cos, team } },
//   wt: [gun ids], f: [{ t (host ms), a: Int16Array(ids so far × ROW) }], k: [[t, killer, victim, gun, head]],
//   ev: [[t, 'shot' | 'proj' | 'boom', message]] }
// A row: x, y, z (×50), yaw, pitch (×1000), gun (wt index), crouch, alive (-1 = not in the match), flags, team, kills, deaths.

const ROW = 12, MAX_FRAMES = 14400, KEEP = 5; // 12 minutes at 20 a second; 5 matches kept
const PI2 = Math.PI * 2;
const wrap = (a) => ((a + Math.PI) % PI2 + PI2) % PI2 - Math.PI;
const q = (v, k) => Math.max(-32767, Math.min(32767, Math.round(v * k)));

export class Recorder {
  constructor() { this.cur = null; this.last = null; this.cosOf = new Map(); } // cosOf: id -> outfit (from welcome / pjoin)

  begin(game, settings) {
    this.end();
    this.cur = { v: 2, map: settings.map, mode: settings.mode, cm: settings.map === 'custom' ? settings.customMap || null : null, at: Date.now(), ids: [], idx: new Map(), pl: {}, wt: [], f: [], k: [], ev: [] };
    for (const p of game.players.values()) this.player(game, p);
  }
  player(game, p) {
    if (this.cur && p && p.id) this.cur.pl[p.id] = { n: String(p.name || '?').slice(0, 24), c: game.colorFor(p), cos: this.cosOf.get(p.id) || null, team: p.team || 0 };
  }
  gun(w) {
    const c = this.cur;
    let i = c.wt.indexOf(w);
    if (i < 0) { i = c.wt.length; c.wt.push(w); }
    return i;
  }
  // Host time now (between snapshots): for shots and kills.
  now() { const c = this.cur; return c && c.f.length ? c.f[c.f.length - 1].t + (performance.now() - this.snapAt) : 0; }

  snap(tm, s) {
    const c = this.cur;
    if (!c || !tm || !s) return;
    const lastF = c.f[c.f.length - 1];
    if (lastF && tm <= lastF.t) return;
    for (const id in s) if (!c.idx.has(id)) { c.idx.set(id, c.ids.length); c.ids.push(id); }
    const a = new Int16Array(c.ids.length * ROW);
    for (let j = 0; j < c.ids.length; j++) a[j * ROW + 7] = -1;
    for (const id in s) {
      const r = s[id], o = c.idx.get(id) * ROW;
      a[o] = q(r[0], 50); a[o + 1] = q(r[1], 50); a[o + 2] = q(r[2], 50);
      a[o + 3] = q(wrap(r[3]), 1000); a[o + 4] = q(r[4], 1000); a[o + 5] = this.gun(r[5]);
      a[o + 6] = r[6] ? 1 : 0; a[o + 7] = r[7] ? 1 : 0; a[o + 8] = r[11] || 0; a[o + 9] = r[12] || 0; a[o + 10] = r[9] || 0; a[o + 11] = r[10] || 0;
    }
    c.f.push({ t: tm, a });
    this.snapAt = performance.now();
    if (c.f.length > MAX_FRAMES) { const t0 = c.f.shift().t; while (c.ev.length && c.ev[0][0] < t0) c.ev.shift(); }
  }
  kill(m) { const c = this.cur; if (c && c.f.length) c.k.push([this.now(), m.k, m.v, m.w, m.head ? 1 : 0]); }
  // A shot, thrown / fired projectile or explosion (anyone's, including your own).
  event(m) {
    const c = this.cur;
    if (!c || !c.f.length || !m.id) return;
    const body = m.t === 'shot' ? { id: m.id, w: m.w, o: m.o, e: (m.e || []).slice(0, 12), q: m.q ? 1 : 0 } : m.t === 'proj' ? { id: m.id, k: m.k } : { id: m.id, p: m.p, k: m.k };
    c.ev.push([this.now(), m.t, body]);
  }

  // The match is over (or we left): keep it if it's worth watching (15 s+), on the device too.
  end() {
    const c = this.cur;
    this.cur = null;
    if (!c || c.f.length < 40 || c.f[c.f.length - 1].t - c.f[0].t < 15000) return;
    delete c.idx;
    this.last = c;
    saveReplay(c);
  }
  // The match being played right now (for a report), or the last one.
  latest() { return this.cur && this.cur.f.length > 20 ? this.cur : this.last; }
}

// One player's row in a frame, decoded (null if they weren't in the match then).
function row(rec, f, j) {
  const o = j * ROW, a = f.a;
  if (o >= a.length || a[o + 7] < 0) return null;
  return [a[o] / 50, a[o + 1] / 50, a[o + 2] / 50, a[o + 3] / 1000, a[o + 4] / 1000, rec.wt[a[o + 5]] || 'ar', a[o + 6], a[o + 7], a[o + 8], a[o + 9], a[o + 10], a[o + 11]];
}

// ---------- Saved replays (IndexedDB, last KEEP matches) ----------
function db() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('th-replays', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('rec', { keyPath: 'at' }); r.result.createObjectStore('meta', { keyPath: 'at' }); }; // meta: the list (small)
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function saveReplay(rec) {
  try {
    const d = await db(), tx = d.transaction(['rec', 'meta'], 'readwrite'), st = tx.objectStore('rec'), mt = tx.objectStore('meta');
    st.put(rec);
    mt.put({ at: rec.at, map: rec.map, mode: rec.mode, secs: Math.round((rec.f[rec.f.length - 1].t - rec.f[0].t) / 1000), players: Object.keys(rec.pl).length });
    const keys = await new Promise((res) => { const k = mt.getAllKeys(); k.onsuccess = () => res(k.result); k.onerror = () => res([]); });
    for (const k of keys.sort((a, b) => a - b).slice(0, Math.max(0, keys.length - KEEP))) { st.delete(k); mt.delete(k); }
  } catch { /* private mode / full: only this session's last match */ }
}
// Saved matches, newest first: [{ at, map, mode, secs, players }]
export async function listReplays() {
  try {
    const d = await db();
    const all = await new Promise((res) => { const r = d.transaction('meta').objectStore('meta').getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); });
    return all.sort((a, b) => b.at - a.at);
  } catch { return []; }
}
export async function loadReplay(at) {
  try {
    const d = await db();
    return await new Promise((res) => { const r = d.transaction('rec').objectStore('rec').get(at); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
  } catch { return null; }
}

// ---------- Clips (for reports) ----------
// The last `secs` seconds, compact JSON: positions in decimeters, angles in hundredths, no outfits.
// { v: 1, map, mode, cm, pl: [[id, name, color, team]], f: [[t/100, row|0 per player]], k }
export function encodeClip(rec, secs = 30) {
  if (!rec || !rec.f || rec.f.length < 10) return null;
  const tEnd = rec.f[rec.f.length - 1].t;
  for (let step = 2; step <= 8; step *= 2) { // 10 a second (then fewer if it's too big)
    const frames = rec.f.filter((f, i) => f.t >= tEnd - secs * 1000 && i % step === 0);
    const t0 = frames[0].t, idx = rec.ids.map((id, j) => j).filter((j) => frames.some((f) => row(rec, f, j)));
    const out = {
      v: 1, map: rec.map, mode: rec.mode, cm: rec.cm || null,
      pl: idx.map((j) => { const id = rec.ids[j], p = rec.pl[id] || { n: '?', c: '#ffffff', team: 0 }; return [id, p.n, p.c, p.team]; }),
      f: frames.map((f) => [Math.round((f.t - t0) / 100), ...idx.map((j) => { const a = row(rec, f, j); return a ? [Math.round(a[0] * 10), Math.round(a[1] * 10), Math.round(a[2] * 10), Math.round(a[3] * 100), Math.round(a[4] * 100), a[5], a[6], a[7], a[8], a[9], a[10], a[11]] : 0; })]),
      k: rec.k.filter((k) => k[0] >= t0).map((k) => [Math.round((k[0] - t0) / 100), k[1], k[2], k[3], k[4]]),
    };
    const json = JSON.stringify(out);
    if (json.length < 140000) return json;
  }
  return null;
}

// A clip from someone else, checked and turned into a recording (null if it's broken).
export function decodeClip(json) {
  let c;
  try { c = typeof json === 'string' ? JSON.parse(json) : json; } catch { return null; }
  if (!c || c.v !== 1 || !Array.isArray(c.pl) || !Array.isArray(c.f) || (!MAPS[c.map] && c.map !== 'custom')) return null;
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const rec = { v: 2, map: c.map, mode: MODES[c.mode] ? c.mode : 'ffa', cm: c.map === 'custom' ? c.cm : null, at: 0, ids: [], pl: {}, wt: [], f: [], k: [], ev: [] };
  for (const p of c.pl.slice(0, 40)) {
    if (!Array.isArray(p)) continue;
    const id = String(p[0]).slice(0, 24);
    rec.ids.push(id);
    rec.pl[id] = { n: String(p[1] || '?').replace(/[<>]/g, '').slice(0, 24), c: /^#[0-9a-f]{6}$/i.test(p[2]) ? p[2] : '#ffffff', cos: null, team: num(p[3]) };
  }
  const gun = (w) => { const id = WEAPONS[w] ? w : 'ar'; let i = rec.wt.indexOf(id); if (i < 0) { i = rec.wt.length; rec.wt.push(id); } return i; };
  for (const r of c.f.slice(0, 2000)) {
    if (!Array.isArray(r)) continue;
    const t = num(r[0]) * 100;
    if (rec.f.length && t <= rec.f[rec.f.length - 1].t) continue;
    const a = new Int16Array(rec.ids.length * ROW);
    rec.ids.forEach((id, j) => {
      const x = r[j + 1], o = j * ROW;
      if (!Array.isArray(x)) { a[o + 7] = -1; return; }
      a[o] = q(num(x[0]) / 10, 50); a[o + 1] = q(num(x[1]) / 10, 50); a[o + 2] = q(num(x[2]) / 10, 50);
      a[o + 3] = q(wrap(num(x[3]) / 100), 1000); a[o + 4] = q(num(x[4]) / 100, 1000); a[o + 5] = gun(x[5]);
      a[o + 6] = x[6] ? 1 : 0; a[o + 7] = x[7] ? 1 : 0; a[o + 8] = num(x[8]); a[o + 9] = num(x[9]); a[o + 10] = num(x[10]); a[o + 11] = num(x[11]);
    });
    rec.f.push({ t, a });
  }
  if (rec.f.length < 2) return null;
  rec.k = (Array.isArray(c.k) ? c.k : []).slice(0, 200).map((x) => [num(x[0]) * 100, String(x[1]), String(x[2]), String(x[3]), x[4] ? 1 : 0]);
  return rec;
}

// ---------- The theater ----------
const fmtT = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= PI2; while (d < -Math.PI) d += PI2; return d; };
// Smooth curve from p1 (time t1) to p2 (t2) through the points either side (p0 at t0, p3 at t3): a cubic
// Hermite with each point's speed taken from its neighbours, using the real times (snapshots arrive unevenly).
function cr(p0, p1, p2, p3, t0, t1, t2, t3, k) {
  const h = t2 - t1 || 1, m1 = t2 > t0 ? (p2 - p0) / (t2 - t0) : 0, m2 = t3 > t1 ? (p3 - p1) / (t3 - t1) : 0;
  const k2 = k * k, k3 = k2 * k;
  return (2 * k3 - 3 * k2 + 1) * p1 + (k3 - 2 * k2 + k) * h * m1 + (-2 * k3 + 3 * k2) * p2 + (k3 - k2) * h * m2;
}

export class Theater {
  // title: shown at the top. focus: a player's name to follow first. onClose(): back to the menu.
  constructor(game, rec, { title = 'Replay', focus = null, onClose } = {}) {
    this.g = game; this.rec = rec; this.title = title; this.focus = focus; this.onClose = onClose;
  }

  open() {
    const g = this.g, rec = this.rec;
    if (g.active || g.theater || !rec || !rec.f || rec.f.length < 2) return false;
    if (rec.map === 'custom') { if (!rec.cm || (!registerCustomMap(rec.cm) && !MAPS.custom)) return false; g.mapId = null; }
    g.loadMap(MAPS[rec.map] ? rec.map : 'warehouse');
    for (const r of g.remotes.values()) r.dispose();
    g.remotes.clear();
    rec.ids.forEach((id) => {
      const p = rec.pl[id] || { n: '?', c: '#ffffff', cos: null };
      const r = new RemotePlayer(g.scene, id, p.n, p.c, p.cos, {});
      r.replay = true;
      g.remotes.set(id, r);
    });
    g.spectating = true; g.specFree = false; g.specFP = false; g.specPos = null; g.specIdx = 0; g.me.pitch = -0.25; // looking down at them a little
    g.theater = this;
    this.t0 = rec.f[0].t; this.t1 = rec.f[rec.f.length - 1].t; this.t = this.t0;
    this.i = 0; this.ev = 0; this.speed = 1; this.playing = true;
    this.buildUi();
    document.body.classList.add('in-theater');
    if (this.focus) this.follow(this.focus);
    return true;
  }

  // Follow a player by name (the spectator camera picks from the players alive, sorted by id).
  follow(name) {
    const g = this.g, id = this.rec.ids.find((x) => this.rec.pl[x] && this.rec.pl[x].n.toLowerCase() === String(name).toLowerCase());
    if (!id) return;
    this.frame(0); // place everyone first
    const list = [...g.remotes.values()].filter((r) => r.alive).sort((a, b) => a.id.localeCompare(b.id));
    const i = list.findIndex((r) => r.id === id);
    if (i >= 0) { g.specIdx = i; g.specFree = false; }
  }

  close() {
    const g = this.g;
    if (g.theater !== this) return;
    if (this.clip) this.stopClip();
    for (const r of g.remotes.values()) r.dispose();
    g.remotes.clear();
    g.theater = null; g.spectating = false; g.specFree = false; g.specFP = false; g.specTarget = null;
    if (document.pointerLockElement) document.exitPointerLock();
    this.el.remove();
    g.canvas.removeEventListener('click', this.lockClick);
    removeEventListener('keydown', this.keyFn);
    document.body.classList.remove('in-theater');
    if (this.onClose) this.onClose();
  }

  buildUi() {
    const rec = this.rec, mode = MODES[rec.mode] ? MODES[rec.mode].name : rec.mode, map = MAPS[rec.map] ? MAPS[rec.map].name : rec.map;
    const el = this.el = document.createElement('div');
    el.id = 'theater';
    const canClip = typeof MediaRecorder !== 'undefined' && !!this.g.renderer.domElement.captureStream;
    el.innerHTML = `<div class="th-top"><b>🎬 ${esc(this.title)}</b><small>${esc(mode)} · ${esc(map)}</small>${canClip ? '<button data-clip title="Record what you see as a video (up to 60 s)">⏺ Save clip</button>' : ''}<button class="ghost" data-close>✖ Close</button></div>
      <div class="th-feed"></div>
      <div class="th-who"></div>
      <div class="th-bar">
        <button data-play title="Play / pause (P)">⏸</button>
        <input type="range" min="0" max="1000" value="0" data-seek>
        <span class="th-time"></span>
        <div class="seg th-speed">${[0.25, 0.5, 1, 2, 4].map((s) => `<button data-speed="${s}" class="${s === 1 ? 'sel' : ''}">${s}×</button>`).join('')}</div>
        <small>Click the view to look around (Esc frees the mouse) · F free camera / follow · Q / E switch player · R their view · P pause · H hide this · wheel: camera speed</small>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('[data-close]').onclick = () => this.close();
    el.querySelector('[data-play]').onclick = () => this.toggle();
    const clipBtn = el.querySelector('[data-clip]');
    if (clipBtn) clipBtn.onclick = () => (this.clip ? this.stopClip() : this.startClip());
    const seek = el.querySelector('[data-seek]');
    seek.oninput = () => { this.seek(this.t0 + (this.t1 - this.t0) * (Number(seek.value) / 1000)); };
    el.querySelectorAll('[data-speed]').forEach((b) => { b.onclick = () => { this.speed = Number(b.dataset.speed); el.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('sel', x === b)); }; });
    this.lockClick = () => { if (!document.pointerLockElement) this.g.canvas.requestPointerLock(); };
    this.g.canvas.addEventListener('click', this.lockClick);
    this.keyFn = (e) => { if (e.code === 'KeyP') this.toggle(); if (e.code === 'KeyH') el.classList.toggle('bare'); };
    addEventListener('keydown', this.keyFn);
  }

  // ⏺ Save clip: records the view (what you see, without the controls) and downloads it.
  startClip() {
    const cv = this.g.renderer.domElement;
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
    if (!type) return;
    const chunks = [], mr = new MediaRecorder(cv.captureStream(30), { mimeType: type, videoBitsPerSecond: 4000000 });
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: type.split(';')[0] }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `trigger-happy-replay-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    };
    mr.start(500);
    this.clip = { mr, timer: setTimeout(() => this.stopClip(), 60000) };
    const b = this.el.querySelector('[data-clip]');
    b.textContent = '⏹ Stop & save'; b.classList.add('rec');
  }
  stopClip() {
    const c = this.clip;
    if (!c) return;
    this.clip = null;
    clearTimeout(c.timer);
    if (c.mr.state !== 'inactive') c.mr.stop();
    const b = this.el.querySelector('[data-clip]');
    if (b) { b.textContent = '⏺ Save clip'; b.classList.remove('rec'); }
  }

  toggle() {
    if (!this.playing && this.t >= this.t1) this.seek(this.t0);
    this.playing = !this.playing;
    this.el.querySelector('[data-play]').textContent = this.playing ? '⏸' : '▶';
  }

  seek(t) {
    this.t = Math.max(this.t0, Math.min(this.t1, t));
    this.i = 0;
    const ev = this.rec.ev || [];
    this.ev = 0;
    while (this.ev < ev.length && ev[this.ev][0] < this.t) this.ev++; // jumping doesn't replay the shots in between
    for (const r of this.g.remotes.values()) { r.alive = false; r.deathT = 0; r.hasState = false; }
  }

  frame(dt) {
    const g = this.g, rec = this.rec, f = rec.f;
    if (this.playing) {
      this.t += dt * 1000 * this.speed;
      if (this.t >= this.t1) { this.t = this.t1; this.playing = false; this.el.querySelector('[data-play]').textContent = '▶'; }
    }
    while (this.i < f.length - 2 && f[this.i + 1].t <= this.t) this.i++;
    const i = this.i, fa = f[i], fb = f[Math.min(f.length - 1, i + 1)];
    const fp = f[Math.max(0, i - 1)], fn = f[Math.min(f.length - 1, i + 2)];
    const k = fb.t > fa.t ? Math.max(0, Math.min(1, (this.t - fa.t) / (fb.t - fa.t))) : 0;
    rec.ids.forEach((id, j) => {
      const r = g.remotes.get(id);
      if (!r) return;
      const x = row(rec, fa, j);
      if (!x) { if (r.alive || !r.hasState) r.setState([0, -100, 0, 0, 0, 'ar', 0, 0, 0, 0, 0, 0, 0, 0]); r.update(dt); return; }
      r.setState([x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7], 100, x[10], x[11], x[8], x[9], 0]);
      if (x[7]) {
        const y = row(rec, fb, j), p = row(rec, fp, j), n = row(rec, fn, j);
        const B = y && y[7] && Math.hypot(y[0] - x[0], y[2] - x[2]) < 6 ? y : x; // a respawn: no sliding across the map
        const P = p && p[7] && Math.hypot(p[0] - x[0], p[2] - x[2]) < 6 ? p : x, N = n && n[7] && Math.hypot(n[0] - B[0], n[2] - B[2]) < 6 ? n : B;
        const T = [P === x ? fa.t - 50 : fp.t, fa.t, B === x ? fa.t + 50 : fb.t, N === B ? fb.t + 50 : fn.t];
        r.pos.set(cr(P[0], x[0], B[0], N[0], ...T, k), cr(P[1], x[1], B[1], N[1], ...T, k), cr(P[2], x[2], B[2], N[2], ...T, k));
        r.yaw = x[3] + angDiff(x[3], B[3]) * k;
        r.pitch = x[4] + (B[4] - x[4]) * k;
      }
      r.update(dt * Math.min(this.speed, 2));
    });
    this.events();
    g.specCam(dt, null, true);
    this.ui();
  }

  // Shots, projectiles and explosions whose time has come.
  events() {
    const g = this.g, ev = this.rec.ev || [];
    if (!this.playing) return;
    let n = 0;
    while (this.ev < ev.length && ev[this.ev][0] <= this.t) {
      const [, type, m] = ev[this.ev++];
      if (++n > 40) continue; // fast-forwarding: skip the effects, keep the place
      const r = g.remotes.get(m.id);
      if (type === 'shot') {
        g.remoteShot(m);
      } else if (type === 'proj') {
        const W = WEAPONS[m.k];
        if (r && W) { if (W.type === 'proj') r.fire(); else r.throwAnim(); g.posSound(W.type === 'proj' ? sfx[m.k] || sfx.gl : sfx.throw, r.pos, 0.8); }
      } else if (type === 'boom' && Array.isArray(m.p)) {
        const W = WEAPONS[m.k] || WEAPONS.gl;
        const pos = new THREE.Vector3(...m.p);
        if (W.smoke) g.smokeFx(pos); else if (W.flash) g.fx.burst(pos, null, '#ffffff', 16, 6, 0.08, 0.5); else if (W.snow) g.snowPuff(pos); else if (W.bolt) g.fx.blood(pos); else g.boomFx(pos, W.radius, W);
      }
    }
  }

  ui() {
    const now = performance.now();
    if (now - (this.uiT || 0) < 120) return;
    this.uiT = now;
    const el = this.el, span = Math.max(1, this.t1 - this.t0);
    el.querySelector('.th-time').textContent = `${fmtT(this.t - this.t0)} / ${fmtT(span)}`;
    const seek = el.querySelector('[data-seek]');
    if (document.activeElement !== seek) seek.value = String(Math.round(((this.t - this.t0) / span) * 1000));
    const pl = this.rec.pl, nm = (id) => esc((pl[id] && pl[id].n) || '?'), col = (id) => (pl[id] && pl[id].c) || '#fff';
    const recent = this.rec.k.filter((x) => x[0] <= this.t && this.t - x[0] < 6000).slice(-5);
    el.querySelector('.th-feed').innerHTML = recent.map((x) => `<div><b style="color:${col(x[1])}">${nm(x[1])}</b> ${x[4] ? '🎯' : '›'} ${esc((WEAPONS[x[3]] || {}).name || x[3])} › <b style="color:${col(x[2])}">${nm(x[2])}</b></div>`).join('');
    const tgt = this.g.specTarget;
    el.querySelector('.th-who').textContent = this.g.specFree || !tgt ? '🎥 Free camera' : `👁 ${pl[tgt.id] ? pl[tgt.id].n : ''}${this.g.specFP ? ' · their view' : ''}`;
  }
}
