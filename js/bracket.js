import { esc } from './util.js';

// Custom tournament brackets: any host can start one from the Host panel. Up to 8 players (bots
// count) are seeded into a single-elimination bracket of 1v1 duels (mode 'bracket': Duel's shared
// loadouts and rounds, first to 3). Only the two fighters spawn; everyone else watches. Then the
// server goes back to the mode it was on. Host side: the functions taking L (HostLogic). The
// snapshot carries `bk` = { s: 8 slots (ids, null = empty), w: winner per match (0 = not played,
// null = nobody), c: match being played (-1 between matches), sc: [score a, score b] }.

export const BRACKET_MAX = 8, BRACKET_MATCH_MS = 180000, BRACKET_GAP_MS = 4000, BRACKET_ROUND_GAP = 2500;
// Matches 0-3: quarterfinals (slots 0-1, 2-3, 4-5, 6-7), 4-5: semifinals, 6: the final.
const SRC = [null, null, null, null, [0, 1], [2, 3], [4, 5]];
export const roundName = (i) => (i < 4 ? 'QUARTERFINAL' : i < 6 ? 'SEMIFINAL' : 'FINAL');

// The two players of match i (ids or null), as far as the bracket is decided.
export function bracketPair(b, i) {
  if (i < 4) return [b.s[i * 2] || null, b.s[i * 2 + 1] || null];
  const [x, y] = SRC[i];
  return [b.w[x] || null, b.w[y] || null];
}

// ---------- Host ----------

// Starts a bracket with the players in the server. Returns an error message, or null.
export function startBracket(L) {
  const all = [...L.players.values()].filter((p) => !p.dummy && !p.zombie);
  const pool = [...all.filter((p) => !p.bot), ...all.filter((p) => p.bot)].slice(0, BRACKET_MAX);
  if (pool.length < 3) return 'A bracket needs at least 3 players (bots count).';
  for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; } // random seeds
  const slots = Array(BRACKET_MAX).fill(null);
  [0, 2, 4, 6, 1, 3, 5, 7].forEach((s, k) => { if (pool[k]) slots[s] = pool[k].id; }); // byes face players, never each other
  L.bk = { s: slots, w: Array(7).fill(0), c: -1, sc: [0, 0], nextAt: 0, endsAt: 0, prev: L.s.mode === 'bracket' ? 'ffa' : L.s.mode, done: false };
  L.startMatch('bracket', L.s.map);
  bracketNext(L);
  return null;
}

export const isFighter = (L, p) => !!(L.bk && L.bk.c >= 0 && L.bk.a && (p.id === L.bk.a || p.id === L.bk.b));

// Settles byes and starts the next match to play; ends the bracket after the final.
export function bracketNext(L) {
  const b = L.bk;
  for (let i = 0; i < 7; i++) {
    if (b.w[i] !== 0) continue;
    let [x, y] = bracketPair(b, i);
    if (x && !L.players.has(x)) x = null; // left the server: a walkover
    if (y && !L.players.has(y)) y = null;
    if (!x || !y) { b.w[i] = x || y || null; continue; }
    // Match i: the two fighters spawn, everyone else watches.
    b.c = i; b.a = x; b.b = y; b.sc = [0, 0]; b.endsAt = Date.now() + BRACKET_MATCH_MS;
    for (const p of L.players.values()) { p.alive = false; p.respawnAt = 0; }
    L.duelRound = 1; L.duelNextAt = 0; L.duelLoadout = L.newDuelLoadout();
    for (const id of [x, y]) { const p = L.players.get(id); p.kills = 0; L.spawn(p); }
    L.broadcast({ t: 'notice', text: `${roundName(i)} · ${L.players.get(x).name} VS ${L.players.get(y).name}`.toUpperCase() });
    return;
  }
  b.done = true;
  b.c = -1;
  L.endMatch();
}

// A fighter died: the other one takes the round.
export function bracketKill(L, v) {
  const b = L.bk;
  if (!b || b.c < 0 || (v.id !== b.a && v.id !== b.b)) return;
  v.respawnAt = 0;
  const side = v.id === b.a ? 1 : 0;
  b.sc[side]++;
  if (b.sc[side] >= L.s.scoreLimit) bracketWin(L, side);
  else if (!L.duelNextAt) L.duelNextAt = Date.now() + BRACKET_ROUND_GAP;
}

export function bracketWin(L, side) {
  const b = L.bk, id = side ? b.b : b.a, p = L.players.get(id);
  b.w[b.c] = id;
  const final = b.c === 6;
  b.c = -1; b.a = b.b = null;
  L.duelNextAt = 0;
  for (const q of L.players.values()) { q.alive = false; q.respawnAt = 0; }
  if (p) p.score += final ? 100 : 10;
  L.broadcast({ t: 'notice', text: final ? `${p ? p.name : '?'} WINS THE BRACKET!` : `${p ? p.name : '?'} GOES THROUGH` });
  b.nextAt = Date.now() + BRACKET_GAP_MS;
}

export function bracketTick(L, now) {
  const b = L.bk;
  if (!b || b.done) return;
  if (b.nextAt && now >= b.nextAt) { b.nextAt = 0; bracketNext(L); return; }
  if (b.c >= 0 && now >= b.endsAt) bracketWin(L, b.sc[1] > b.sc[0] ? 1 : 0); // out of time: the leader (or the higher seed) goes through
}

// A player left: if they were fighting, the other goes through.
export function bracketLeave(L, id) {
  const b = L.bk;
  if (!b || b.done || b.c < 0) return;
  if (id === b.a) bracketWin(L, 1);
  else if (id === b.b) bracketWin(L, 0);
}

export const bracketSnap = (b) => ({ s: b.s, w: b.w, c: b.c, sc: b.sc });

// ---------- Client ----------

// The bracket as HTML (HUD panel). name(id) -> display name.
export function bracketHtml(b, name, me) {
  const col = (from, to, title) => `<div class="bk-col"><small>${title}</small>${Array.from({ length: to - from }, (_, k) => {
    const i = from + k, [x, y] = bracketPair(b, i), w = b.w[i];
    const row = (id, sc) => `<div class="bk-p ${w && w === id ? 'win' : w ? 'out' : ''} ${id && id === me ? 'me' : ''}">${id ? esc(name(id)) : '<i>—</i>'}${b.c === i ? `<b>${sc}</b>` : ''}</div>`;
    return `<div class="bk-m ${b.c === i ? 'live' : ''}">${row(x, b.sc[0])}${row(y, b.sc[1])}</div>`;
  }).join('')}</div>`;
  const champ = b.w[6];
  return `<div class="bk-tree">${col(0, 4, 'Quarterfinals')}${col(4, 6, 'Semifinals')}${col(6, 7, 'Final')}<div class="bk-col bk-champ"><small>Champion</small><div class="bk-p ${champ ? 'win' : ''}">${champ ? '🏆 ' + esc(name(champ)) : '?'}</div></div></div>`;
}
