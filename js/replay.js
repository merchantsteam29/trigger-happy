import { RemotePlayer } from './remote.js';
import { MAPS } from './maps.js';
import { MODES } from './host.js';
import { registerCustomMap } from './editor.js';
import { esc } from './util.js';
import { WEAPONS } from './weapons.js';

// Replay theater. Every client records the matches it plays or watches from the host's snapshots
// (10 a second: where everyone is, their aim, gun and state) plus the kills. After a match,
// 🎬 Watch your last match (home screen) plays it back on its map from any angle: the spectator
// camera (follow a player, their view, or fly free), a timeline and speeds. Reports carry the
// last 30 s as a compact clip (`encodeClip`), signed at whffa/v1/replay/<report id>, which staff
// open from the Mod Panel (moderation.js fetchReplay).
//
// Recording: { v: 1, map, mode, cm (custom map), pl: { id: { n, c, cos, team } },
//   f: [{ t (host ms), p: { id: [x, y, z, yaw, pitch, gun, crouch, alive, flags, team, kills, deaths] } }],
//   k: [[t, killer, victim, gun, head]] }

const REC_GAP = 95, MAX_FRAMES = 9000; // 10 a second, up to 15 minutes
const r2 = (v) => Math.round(v * 100) / 100;

export class Recorder {
  constructor() { this.cur = null; this.last = null; this.cosOf = new Map(); } // cosOf: id -> outfit (from welcome / pjoin)

  begin(game, settings) {
    this.end();
    this.cur = { v: 1, map: settings.map, mode: settings.mode, cm: settings.map === 'custom' ? settings.customMap || null : null, pl: {}, f: [], k: [], at: Date.now() };
    for (const p of game.players.values()) this.player(game, p);
  }
  player(game, p) {
    if (this.cur && p && p.id) this.cur.pl[p.id] = { n: String(p.name || '?').slice(0, 24), c: game.colorFor(p), cos: this.cosOf.get(p.id) || null, team: p.team || 0 };
  }
  snap(tm, s) {
    const c = this.cur;
    if (!c || !tm || !s) return;
    const lastF = c.f[c.f.length - 1];
    if (lastF && tm - lastF.t < REC_GAP) return;
    const p = {};
    for (const id in s) {
      const a = s[id];
      p[id] = [r2(a[0]), r2(a[1]), r2(a[2]), r2(a[3]), r2(a[4]), a[5], a[6] ? 1 : 0, a[7] ? 1 : 0, a[11] || 0, a[12] || 0, a[9] || 0, a[10] || 0];
    }
    c.f.push({ t: tm, p });
    if (c.f.length > MAX_FRAMES) c.f.shift();
  }
  kill(m) {
    const c = this.cur;
    if (c && c.f.length) c.k.push([c.f[c.f.length - 1].t, m.k, m.v, m.w, m.head ? 1 : 0]);
  }
  // The match is over (or we left): keep it as the last match if it's worth watching (15 s+).
  end() {
    const f = this.cur && this.cur.f;
    if (f && f.length > 20 && f[f.length - 1].t - f[0].t >= 15000) this.last = this.cur;
    this.cur = null;
  }
  // The match being played right now, or the last one.
  latest() { return this.cur && this.cur.f.length > 20 ? this.cur : this.last; }
}

// ---------- Clips (for reports) ----------
// The last `secs` seconds, compact: positions in decimeters, angles in hundredths, no outfits.
// { v: 1, map, mode, cm, pl: [[id, name, color, team]], f: [[t/100, row|0 per player]], k }
export function encodeClip(rec, secs = 30) {
  if (!rec || rec.f.length < 10) return null;
  const tEnd = rec.f[rec.f.length - 1].t;
  for (let step = 1; step <= 4; step *= 2) {
    const frames = rec.f.filter((f, i) => f.t >= tEnd - secs * 1000 && i % step === 0);
    const t0 = frames[0].t, ids = Object.keys(rec.pl).filter((id) => frames.some((f) => f.p[id]));
    const out = {
      v: 1, map: rec.map, mode: rec.mode, cm: rec.cm || null,
      pl: ids.map((id) => [id, rec.pl[id].n, rec.pl[id].c, rec.pl[id].team]),
      f: frames.map((f) => [Math.round((f.t - t0) / 100), ...ids.map((id) => { const a = f.p[id]; return a ? [Math.round(a[0] * 10), Math.round(a[1] * 10), Math.round(a[2] * 10), Math.round(a[3] * 100), Math.round(a[4] * 100), a[5], a[6], a[7], a[8], a[9], a[10], a[11]] : 0; })]),
      k: rec.k.filter((k) => k[0] >= t0).map((k) => [Math.round((k[0] - t0) / 100), k[1], k[2], k[3], k[4]]),
    };
    const json = JSON.stringify(out);
    if (json.length < 140000) return json;
  }
  return null;
}

// A clip from someone else, checked and turned back into a recording (null if it's broken).
export function decodeClip(json) {
  let c;
  try { c = typeof json === 'string' ? JSON.parse(json) : json; } catch { return null; }
  if (!c || c.v !== 1 || !Array.isArray(c.pl) || !Array.isArray(c.f) || !MAPS[c.map] && c.map !== 'custom') return null;
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const pl = {}, ids = [];
  for (const p of c.pl.slice(0, 40)) {
    if (!Array.isArray(p)) continue;
    const id = String(p[0]).slice(0, 24);
    ids.push(id);
    pl[id] = { n: String(p[1] || '?').replace(/[<>]/g, '').slice(0, 24), c: /^#[0-9a-f]{6}$/i.test(p[2]) ? p[2] : '#ffffff', cos: null, team: num(p[3]) };
  }
  const f = c.f.slice(0, 2000).map((row) => {
    const p = {};
    ids.forEach((id, i) => {
      const a = row[i + 1];
      if (!Array.isArray(a)) return;
      p[id] = [num(a[0]) / 10, num(a[1]) / 10, num(a[2]) / 10, num(a[3]) / 100, num(a[4]) / 100, WEAPONS[a[5]] ? a[5] : 'ar', a[6] ? 1 : 0, a[7] ? 1 : 0, num(a[8]), num(a[9]), num(a[10]), num(a[11])];
    });
    return { t: num(row[0]) * 100, p };
  }).filter((x, i, arr) => !i || x.t > arr[i - 1].t);
  if (f.length < 2) return null;
  const k = (Array.isArray(c.k) ? c.k : []).slice(0, 200).map((x) => [num(x[0]) * 100, String(x[1]), String(x[2]), String(x[3]), x[4] ? 1 : 0]);
  return { v: 1, map: c.map, mode: MODES[c.mode] ? c.mode : 'ffa', cm: c.map === 'custom' ? c.cm : null, pl, f, k };
}

// ---------- The theater ----------
const fmtT = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const lerpAng = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

export class Theater {
  // title: shown at the top. onClose(): back to the menu.
  constructor(game, rec, { title = 'Replay', onClose } = {}) {
    this.g = game; this.rec = rec; this.title = title; this.onClose = onClose;
  }

  open() {
    const g = this.g, rec = this.rec;
    if (g.active || g.theater) return false;
    if (rec.map === 'custom') { if (!rec.cm || !registerCustomMap(rec.cm) && !MAPS.custom) return false; g.mapId = null; }
    g.loadMap(MAPS[rec.map] ? rec.map : 'warehouse');
    for (const r of g.remotes.values()) r.dispose();
    g.remotes.clear();
    for (const [id, p] of Object.entries(rec.pl)) {
      const r = new RemotePlayer(g.scene, id, p.n, p.c, p.cos, {});
      r.replay = true;
      g.remotes.set(id, r);
    }
    g.spectating = true; g.specFree = false; g.specFP = false; g.specPos = null; g.specIdx = 0;
    g.theater = this;
    this.t0 = rec.f[0].t; this.t1 = rec.f[rec.f.length - 1].t; this.t = this.t0;
    this.i = 0; this.speed = 1; this.playing = true;
    this.buildUi();
    document.body.classList.add('in-theater');
    return true;
  }

  close() {
    const g = this.g;
    if (g.theater !== this) return;
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
    el.innerHTML = `<div class="th-top"><b>🎬 ${esc(this.title)}</b><small>${esc(mode)} · ${esc(map)}</small><button class="ghost" data-close>✖ Close</button></div>
      <div class="th-feed"></div>
      <div class="th-who"></div>
      <div class="th-bar">
        <button data-play title="Play / pause (P)">⏸</button>
        <input type="range" min="0" max="1000" value="0" data-seek>
        <span class="th-time"></span>
        <div class="seg th-speed">${[0.25, 0.5, 1, 2, 4].map((s) => `<button data-speed="${s}" class="${s === 1 ? 'sel' : ''}">${s}×</button>`).join('')}</div>
        <small>Click the view to look around (Esc frees the mouse) · F free camera / follow · Q / E switch player · R their view · H hide this · wheel: camera speed</small>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('[data-close]').onclick = () => this.close();
    el.querySelector('[data-play]').onclick = () => this.toggle();
    const seek = el.querySelector('[data-seek]');
    seek.oninput = () => { this.seek(this.t0 + (this.t1 - this.t0) * (Number(seek.value) / 1000)); };
    el.querySelectorAll('[data-speed]').forEach((b) => { b.onclick = () => { this.speed = Number(b.dataset.speed); el.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('sel', x === b)); }; });
    this.lockClick = () => { if (!document.pointerLockElement) this.g.canvas.requestPointerLock(); };
    this.g.canvas.addEventListener('click', this.lockClick);
    // Keys the camera reads (game.keys) while the mouse is locked; P pauses, H hides the bar.
    this.keyFn = (e) => { if (e.code === 'KeyP') this.toggle(); if (e.code === 'KeyH') el.classList.toggle('bare'); };
    addEventListener('keydown', this.keyFn);
  }

  toggle() {
    if (!this.playing && this.t >= this.t1) this.seek(this.t0);
    this.playing = !this.playing;
    this.el.querySelector('[data-play]').textContent = this.playing ? '⏸' : '▶';
  }

  seek(t) {
    this.t = Math.max(this.t0, Math.min(this.t1, t));
    this.i = 0;
    for (const r of this.g.remotes.values()) { r.alive = false; r.deathT = 0; r.hasState = false; } // re-placed from the recording
  }

  frame(dt) {
    const g = this.g, f = this.rec.f;
    if (this.playing) {
      this.t += dt * 1000 * this.speed;
      if (this.t >= this.t1) { this.t = this.t1; this.playing = false; this.el.querySelector('[data-play]').textContent = '▶'; }
    }
    while (this.i < f.length - 2 && f[this.i + 1].t <= this.t) this.i++;
    const a = f[this.i], b = f[Math.min(f.length - 1, this.i + 1)];
    const k = b.t > a.t ? Math.max(0, Math.min(1, (this.t - a.t) / (b.t - a.t))) : 0;
    for (const [id, r] of g.remotes) {
      const x = a.p[id], y = b.p[id] || x;
      if (!x) { if (r.alive) r.setState([0, -100, 0, 0, 0, 'ar', 0, 0, 0, 0, 0, 0, 0, 0]); continue; }
      r.setState([x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7], 100, x[10], x[11], x[8], x[9], 0]);
      if (x[7]) {
        r.pos.set(x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k);
        r.yaw = lerpAng(x[3], y[3], k);
        r.pitch = x[4] + (y[4] - x[4]) * k;
      }
      r.update(dt * Math.min(this.speed, 2));
    }
    g.specCam(dt, null, true);
    this.ui();
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
