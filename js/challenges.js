import { store, esc } from './util.js';
import { onStats, allStats, addTokens } from './missions.js';
import { weekId, weekEnds } from './leaderboard.js';

// Friend challenges: dare a friend to a race this week ("first to 25 headshots"). Both count from
// the moment the friend accepts, both see both progress bars, and the first to the goal wins
// FC_TOKENS (rewarded for up to FC_PAID_PER_WEEK challenges a week). Everything goes over the relay,
// signed and retained so it reaches friends who are offline:
//   fchal/<to>/<id>    the challenge (from the sender)        { id, to, stat, goal, week }
//   fchalok/<id>       accepted or declined (from the friend) { id, ok }
//   fchalp/<id>/<tag>  each side's progress                   { id, n, done (time they reached it) }
// Your challenges are kept on this device (`fchals`). They end with the leaderboard week.

const V = 'whffa/v1/';
export const FC_STATS = {
  kills: { name: 'kills', goals: [25, 50, 100] },
  headshots: { name: 'headshot kills', goals: [10, 25, 50] },
  wins: { name: 'wins', goals: [3, 5, 10] },
  matches: { name: 'matches', goals: [5, 10, 20] },
  playerKills: { name: 'kills on real players', goals: [10, 25, 50] },
};
export const FC_TOKENS = 100, FC_PAID_PER_WEEK = 3, FC_MAX = 5;
const low = (s) => String(s || '').toLowerCase();
const ID_RE = /^[a-z0-9]{10}$/;
const randId = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

class FriendChallenges {
  constructor() { this.list = []; this.subs = new Set(); }

  init(social) {
    this.social = social;
    this.load();
    social.relay.onMessage((t, payload) => {
      if (!t.startsWith(V + 'fchal')) return;
      const text = payload.toString();
      if (t.startsWith(V + 'fchalok/')) this.receiveOk(t.slice(V.length + 8), text);
      else if (t.startsWith(V + 'fchalp/')) { const [id, tag] = t.slice(V.length + 7).split('/'); this.receiveProgress(id, tag, text); }
      else if (t.startsWith(V + 'fchal/')) { const [to, id] = t.slice(V.length + 6).split('/'); this.receiveChallenge(to, id, text); }
    });
    onStats(() => this.progress());
    setInterval(() => this.tick(), 30000);
    this.sync();
  }

  load() {
    const l = store.get('fchals', []);
    this.list = Array.isArray(l) ? l.filter((c) => c && ID_RE.test(c.id)) : [];
  }
  save() { store.set('fchals', this.list.slice(0, 30)); if (this.onChange) this.onChange(); }
  get(id) { return this.list.find((c) => c.id === id); }
  me() { return low(this.social && this.social.tag); }
  other(c) { return low(c.from) === this.me() ? c.to : c.from; }

  // Subscriptions: challenges sent to me, and the answers / progress of the ones I'm in.
  sync() {
    const s = this.social;
    if (!s || !s.relay) return;
    const want = new Set();
    if (s.tag) want.add(V + 'fchal/' + this.me() + '/+');
    for (const c of this.list) if (c.state === 'pending' || c.state === 'active') { want.add(V + 'fchalok/' + c.id); want.add(V + 'fchalp/' + c.id + '/+'); }
    for (const t of this.subs) if (!want.has(t)) s.relay.unsubscribe(t);
    for (const t of want) if (!this.subs.has(t)) s.relay.subscribe(t);
    this.subs = want;
  }

  // ---------- Sending ----------
  async challenge(friend, stat, goal) {
    const s = this.social;
    if (!s || !s.tag) throw new Error('Get a gamertag first.');
    if (!FC_STATS[stat] || !FC_STATS[stat].goals.includes(goal)) throw new Error('Pick a challenge.');
    if (!s.friends.has(low(friend))) throw new Error('You can only challenge friends.');
    if (this.list.filter((c) => c.state === 'pending' || c.state === 'active').length >= FC_MAX) throw new Error(`You can have ${FC_MAX} challenges going at once.`);
    const id = randId(), week = weekId(), to = s.friends.get(low(friend)).tag;
    s.relay.publish(V + 'fchal/' + low(to) + '/' + id, await s.sign({ id, to, stat, goal, week }), { retain: true });
    this.list.unshift({ id, from: s.tag, to, stat, goal, week, state: 'pending', at: Date.now() });
    this.save(); this.sync();
  }
  async answer(id, ok) {
    const c = this.get(id), s = this.social;
    if (!c || c.state !== 'pending' || low(c.to) !== this.me()) return;
    s.relay.publish(V + 'fchalok/' + id, await s.sign({ id, ok: !!ok }), { retain: true });
    s.relay.publish(V + 'fchal/' + this.me() + '/' + id, '', { retain: true }); // answered: take it out of my inbox
    this.start(c, ok);
  }
  start(c, ok) {
    c.state = ok ? 'active' : 'declined';
    if (ok) { c.base = allStats()[c.stat] || 0; c.mine = 0; c.theirs = c.theirs || 0; }
    this.save(); this.sync();
    if (ok) this.post(c);
  }

  // ---------- Receiving ----------
  async receiveChallenge(to, id, text) {
    if (!text || to !== this.me() || !ID_RE.test(id) || this.get(id)) return;
    const b = await this.social.verify(text);
    if (!b || b.id !== id || low(b.to) !== this.me() || !this.social.friends.has(low(b.from))) return;
    if (!FC_STATS[b.stat] || !FC_STATS[b.stat].goals.includes(b.goal) || b.week !== weekId()) return;
    this.list.unshift({ id, from: b.from, to: b.to, stat: b.stat, goal: b.goal, week: b.week, state: 'pending', at: Number(b.ts) || Date.now() });
    this.save(); this.sync();
    if (this.onNotice) this.onNotice(`⚔ ${b.from} challenges you: first to ${b.goal} ${FC_STATS[b.stat].name} this week!`);
  }
  async receiveOk(id, text) {
    const c = this.get(id);
    if (!text || !c || c.state !== 'pending' || low(c.from) !== this.me()) return;
    const b = await this.social.verify(text);
    if (!b || b.id !== id || low(b.from) !== low(c.to)) return;
    this.start(c, b.ok);
    if (this.onNotice) this.onNotice(b.ok ? `⚔ ${c.to} accepted your challenge. Go!` : `${c.to} passed on your challenge.`);
  }
  async receiveProgress(id, tag, text) {
    const c = this.get(id);
    if (!text || !c || c.state === 'declined' || tag !== low(this.other(c))) return;
    const b = await this.social.verify(text);
    if (!b || b.id !== id || low(b.from) !== tag) return;
    c.theirs = Math.max(0, Math.min(c.goal, Math.round(Number(b.n) || 0)));
    if (b.done && !c.theirDone) c.theirDone = Number(b.done) || Date.now();
    this.settle(c);
    this.save();
  }

  // ---------- Progress ----------
  progress() {
    const st = allStats();
    for (const c of this.list) {
      if (c.state !== 'active') continue;
      const n = Math.max(0, Math.min(c.goal, (st[c.stat] || 0) - (c.base || 0)));
      if (n === c.mine) continue;
      c.mine = n;
      if (n >= c.goal && !c.myDone) c.myDone = Date.now();
      this.settle(c);
      this.post(c);
    }
    this.save();
  }
  post(c) { // throttled a little: stats change in bursts
    this.timers = this.timers || new Map();
    clearTimeout(this.timers.get(c.id));
    const send = async () => { const s = this.social; if (s && s.tag) s.relay.publish(V + 'fchalp/' + c.id + '/' + this.me(), await s.sign({ id: c.id, n: c.mine || 0, done: c.myDone || 0 }), { retain: true }); };
    if (c.myDone) send(); else this.timers.set(c.id, setTimeout(send, 3000));
  }
  // Who got there first (and the reward, once).
  settle(c) {
    if (c.state !== 'active' || (!c.myDone && !c.theirDone)) return;
    const iWon = c.myDone && (!c.theirDone || c.myDone <= c.theirDone);
    c.state = 'done'; c.winner = iWon ? this.social.tag : this.other(c);
    if (iWon && !c.paid) {
      const wk = weekId(), paid = store.get('fchalPaid', {});
      if ((paid[wk] || 0) < FC_PAID_PER_WEEK) { paid[wk] = (paid[wk] || 0) + 1; store.set('fchalPaid', { [wk]: paid[wk] }); addTokens(FC_TOKENS); c.paid = true; }
    }
    if (this.onNotice) this.onNotice(iWon ? `🏆 You beat ${this.other(c)} to ${c.goal} ${FC_STATS[c.stat].name}!${c.paid ? ` +${FC_TOKENS} tokens` : ''}` : `${this.other(c)} beat you to ${c.goal} ${FC_STATS[c.stat].name}. Rematch?`);
    this.sync();
  }
  // Last week's challenges end.
  tick() {
    const wk = weekId();
    let ch = false;
    for (const c of this.list) if (c.week !== wk && (c.state === 'pending' || c.state === 'active')) { c.state = 'expired'; ch = true; }
    if (ch) { this.save(); this.sync(); }
  }
}

export const challenges = new FriendChallenges();

// The Friends screen card.
export function renderChallenges(el, social, toast) {
  const me = low(social.tag);
  if (!social.tag) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const friends = [...social.friends.values()];
  const list = challenges.list.filter((c) => c.week === weekId() || c.state === 'done').slice(0, 8);
  const keep = (sel) => { const x = el.querySelector(sel); return x ? x.value : ''; };
  const draft = { f: keep('#fc-friend'), s: keep('#fc-stat') || 'kills', g: keep('#fc-goal') };
  const bar = (n, goal, mine, who) => `<div class="fc-bar ${mine ? 'mine' : ''}"><i style="width:${Math.round((Math.min(n, goal) / goal) * 100)}%"></i><span>${who} · ${n} / ${goal}</span></div>`;
  const ends = Math.max(0, weekEnds() - Date.now()), days = Math.floor(ends / 864e5), hrs = Math.floor((ends % 864e5) / 36e5);
  el.innerHTML = `<h3>⚔ Friend challenges</h3><p class="note">Race a friend to a goal this week (ends in ${days}d ${hrs}h). The winner gets 🪙 ${FC_TOKENS} (up to ${FC_PAID_PER_WEEK} a week).</p>
    ${friends.length ? `<div class="fc-new"><select id="fc-friend">${friends.map((f) => `<option ${low(f.tag) === low(draft.f) ? 'selected' : ''}>${esc(f.tag)}</option>`).join('')}</select>
      <span>first to</span><select id="fc-goal">${FC_STATS[draft.s].goals.map((g) => `<option ${String(g) === draft.g ? 'selected' : ''}>${g}</option>`).join('')}</select>
      <select id="fc-stat">${Object.entries(FC_STATS).map(([k, v]) => `<option value="${k}" ${k === draft.s ? 'selected' : ''}>${v.name}</option>`).join('')}</select>
      <button class="primary" id="fc-send">⚔ Challenge</button></div>` : '<p class="note">Add friends to challenge them.</p>'}
    <div class="fc-list">${list.map((c) => {
      const out = low(c.from) === me, other = esc(out ? c.to : c.from), what = `first to ${c.goal} ${FC_STATS[c.stat].name}`;
      if (c.state === 'pending') return out ? `<div class="fc-row"><b>vs ${other}</b><small>${what} · waiting for them to accept</small></div>`
        : `<div class="fc-row in"><b>${other} challenges you</b><small>${what}</small><span><button class="primary" data-fcyes="${c.id}">Accept</button><button data-fcno="${c.id}">No thanks</button></span></div>`;
      if (c.state === 'active') return `<div class="fc-row"><b>vs ${other}</b><small>${what}</small>${bar(c.mine || 0, c.goal, true, 'You')}${bar(c.theirs || 0, c.goal, false, other)}</div>`;
      if (c.state === 'done') return `<div class="fc-row ${low(c.winner) === me ? 'won' : ''}"><b>${low(c.winner) === me ? '🏆 You won' : `${esc(c.winner)} won`} vs ${other}</b><small>${what}</small></div>`;
      return `<div class="fc-row off"><b>vs ${other}</b><small>${what} · ${c.state === 'declined' ? 'declined' : 'ran out of time'}</small></div>`;
    }).join('')}</div>`;
  const stat = el.querySelector('#fc-stat');
  if (stat) stat.onchange = () => renderChallenges(el, social, toast);
  const send = el.querySelector('#fc-send');
  if (send) send.onclick = async () => { try { await challenges.challenge(el.querySelector('#fc-friend').value, el.querySelector('#fc-stat').value, Number(el.querySelector('#fc-goal').value)); toast('⚔ Challenge sent!'); } catch (e) { toast(e.message); } };
  el.querySelectorAll('[data-fcyes]').forEach((b) => { b.onclick = () => challenges.answer(b.dataset.fcyes, true); });
  el.querySelectorAll('[data-fcno]').forEach((b) => { b.onclick = () => challenges.answer(b.dataset.fcno, false); });
}
