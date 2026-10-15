import { OWNER, roles, verifyWith } from './roles.js';

// Owner events: the owner starts a special event from the Mod Panel (Announce tab) without an
// update: a name, a token multiplier for everything players earn, and / or a featured map and mode
// that the home screen's event row (and Quick Play when it starts a server) use. It's one retained
// message at whffa/v1/event, signed with the owner's key; it ends by itself at `until`.

const T = 'whffa/v1/event';
const LIVE = 'whffa/v1/ownerlive'; // the owner calling everyone into their match: { lobby, until } (owner-signed, retained)
const MAINT = 'whffa/v1/maint'; // the owner's maintenance countdown: { at, msg } (owner-signed, retained)
const SPOT = 'whffa/v1/spotlight'; // the owner's shop spotlight: { title, items: [{ slot, id }] } (owner-signed, retained)
export const SPOT_MAX = 8;
const MOTD = 'whffa/v1/motd'; // the owner's message of the day: { id, title, text, btn, go } (owner-signed, retained)
// Where a message of the day's button can take players: a page of the menu, or a web link (https only).
export const MOTD_GO = [['', 'No button'], ['play', 'Quick Play'], ['shop', 'The Shop'], ['missions', 'Missions'], ['leaderboard', 'Leaderboard'], ['friends', 'Friends'], ['character', 'Character'], ['link', 'A web link…']];
const low = (s) => String(s || '').toLowerCase();
export const EVENT_HOURS = [[1, '1 hour'], [3, '3 hours'], [24, '1 day'], [48, '2 days'], [72, '3 days (a weekend)'], [168, '7 days']];

class LiveEvent {
  constructor() {
    this.ev = null; // { name, tokens, map, mode, until, ts }
    this.onChange = null;
    this.motd = null; // { id, title, text, btn, go, url, ts }
    this.onMotd = null;
    this.ownerLive = null; // { lobby, until, ts }
    this.onLive = null; // (live | null, justStarted)
    this.maint = null; // { at, msg, ts }
    this.onMaint = null;
    this.spot = null; // { title, items, ts }
    this.onSpot = null;
  }

  init(social) {
    this.social = social;
    social.relay.onMessage((t, payload) => { if (t === T) this.receive(payload.toString()); else if (t === MOTD) this.receiveMotd(payload.toString()); else if (t === SPOT) this.receiveSpot(payload.toString()); else if (t === MAINT) this.receiveMaint(payload.toString()); else if (t === LIVE) this.receiveLive(payload.toString()); });
    for (const t of [T, MOTD, SPOT, MAINT, LIVE]) social.relay.subscribe(t);
    const prev = social.relay.onConnect;
    social.relay.onConnect = () => { if (prev) prev(); for (const t of [T, MOTD, SPOT, MAINT, LIVE]) social.relay.subscribe(t); };
  }

  async receive(text) {
    let env, b;
    try { env = JSON.parse(text); b = JSON.parse(env.b); } catch { return; }
    if (!b || low(b.from) !== low(OWNER.tag) || !(await verifyWith(OWNER.pub, env))) return; // the owner's only
    if (this.ev && this.ev.ts > Number(b.ts)) return;
    const was = this.live();
    this.ev = {
      name: String(b.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40) || 'Special event',
      tokens: Math.max(1, Math.min(3, Math.round(Number(b.tokens) || 1))),
      map: typeof b.map === 'string' ? b.map.slice(0, 24) : '', mode: typeof b.mode === 'string' ? b.mode.slice(0, 24) : '',
      until: Number(b.until) || 0, ts: Number(b.ts) || 0, off: !!b.off,
    };
    clearTimeout(this.endT);
    const left = this.ev.until - Date.now();
    if (left > 0) this.endT = setTimeout(() => { if (this.onChange) this.onChange(null, true); }, Math.min(left + 100, 2 ** 31 - 1));
    if (this.onChange) this.onChange(this.live(), !was && !!this.live());
  }

  // The event running right now (null when there's none).
  live() { const e = this.ev; return e && !e.off && e.until > Date.now() ? e : null; }
  tokenBoost() { const e = this.live(); return e ? e.tokens : 1; }

  async start({ name, tokens = 1, map = '', mode = '', hours = 24 }) {
    if (!roles.isOwner()) throw new Error('Only the owner can run events.');
    if (!String(name || '').trim()) throw new Error('Give the event a name.');
    if (tokens <= 1 && !map && !mode) throw new Error('Pick double tokens, a map or a mode.');
    const signed = await this.social.sign({ name, tokens, map, mode, until: Date.now() + hours * 3600e3 });
    this.social.relay.publish(T, signed, { retain: true });
    await this.receive(signed);
  }

  async end() {
    if (!roles.isOwner()) throw new Error('Only the owner can end events.');
    const signed = await this.social.sign({ off: 1, until: 0 });
    this.social.relay.publish(T, signed, { retain: true });
    await this.receive(signed);
  }

  // ---------- Message of the day ----------
  async receiveMotd(text) {
    let env, b;
    try { env = JSON.parse(text); b = JSON.parse(env.b); } catch { return; }
    if (!b || low(b.from) !== low(OWNER.tag) || !(await verifyWith(OWNER.pub, env))) return;
    if (this.motd && this.motd.ts > Number(b.ts)) return;
    const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
    const go = MOTD_GO.some(([id]) => id === b.go) ? b.go : '';
    const url = go === 'link' && /^https:\/\/[^\s"'<>]{3,300}$/.test(String(b.url || '')) ? String(b.url) : '';
    this.motd = b.off || !clean(b.text, 300) ? { off: true, ts: Number(b.ts) || 0 }
      : { id: clean(b.id, 20), title: clean(b.title, 50), text: clean(b.text, 300), btn: clean(b.btn, 24), go: go === 'link' && !url ? '' : go, url, ts: Number(b.ts) || 0 };
    if (this.onMotd) this.onMotd(this.motd);
  }
  async setMotd({ title, text, btn, go, url }) {
    if (!roles.isOwner()) throw new Error('Only the owner can set the message of the day.');
    if (!String(text || '').trim()) throw new Error('Type the message first.');
    if (go === 'link' && !/^https:\/\//.test(String(url || ''))) throw new Error('Links must start with https://');
    const signed = await this.social.sign({ id: Date.now().toString(36), title, text, btn, go, url });
    this.social.relay.publish(MOTD, signed, { retain: true });
    await this.receiveMotd(signed);
  }
  async clearMotd() {
    if (!roles.isOwner()) throw new Error('Only the owner can do that.');
    const signed = await this.social.sign({ off: 1 });
    this.social.relay.publish(MOTD, signed, { retain: true });
    await this.receiveMotd(signed);
  }
  // ---------- The owner calling everyone in ----------
  // "Call everyone" in the owner's pause menu: every player sees a "GIGACHAD is playing: Join" card
  // (and a pop-up) for up to 2 hours, or until the owner leaves that match.
  async receiveLive(text) {
    let env, b;
    try { env = JSON.parse(text); b = JSON.parse(env.b); } catch { return; }
    if (!b || low(b.from) !== low(OWNER.tag) || !(await verifyWith(OWNER.pub, env))) return;
    if (this.ownerLive && this.ownerLive.ts > Number(b.ts)) return;
    const was = this.live2();
    const lobby = String(b.lobby || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    this.ownerLive = b.off || !lobby ? { off: true, ts: Number(b.ts) || 0 } : { lobby, until: Math.min(Number(b.until) || 0, Date.now() + 3 * 3600e3), ts: Number(b.ts) || 0 };
    const now = this.live2();
    if (this.onLive) this.onLive(now, !!now && (!was || was.lobby !== now.lobby));
  }
  // The owner's match to join right now, or null.
  live2() { const l = this.ownerLive; return l && !l.off && l.until > Date.now() ? l : null; }
  async goLive(lobby) {
    if (!roles.isOwner()) throw new Error('Only the owner can do that.');
    const signed = await this.social.sign({ lobby, until: Date.now() + 2 * 3600e3 });
    this.social.relay.publish(LIVE, signed, { retain: true });
    await this.receiveLive(signed);
  }
  async endLive() {
    if (!roles.isOwner() || !this.live2()) return;
    const signed = await this.social.sign({ off: 1 });
    this.social.relay.publish(LIVE, signed, { retain: true });
    await this.receiveLive(signed);
  }

  // ---------- Maintenance countdown ----------
  // "Update in 5 minutes": everyone gets a countdown bar (menus and matches), then a "please refresh"
  // prompt at the time. Leftovers older than 15 minutes past the time are ignored.
  async receiveMaint(text) {
    let env, b;
    try { env = JSON.parse(text); b = JSON.parse(env.b); } catch { return; }
    if (!b || low(b.from) !== low(OWNER.tag) || !(await verifyWith(OWNER.pub, env))) return;
    if (this.maint && this.maint.ts > Number(b.ts)) return;
    const at = Number(b.at) || 0;
    this.maint = b.off || !at || Date.now() - at > 15 * 60000 ? null : { at, msg: String(b.msg || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 120), ts: Number(b.ts) || 0 };
    if (this.onMaint) this.onMaint(this.maint);
  }
  async startMaint(minutes, msg = '') {
    if (!roles.isOwner()) throw new Error('Only the owner can do that.');
    const signed = await this.social.sign({ at: Date.now() + minutes * 60000, msg });
    this.social.relay.publish(MAINT, signed, { retain: true });
    await this.receiveMaint(signed);
  }
  async cancelMaint() {
    if (!roles.isOwner()) throw new Error('Only the owner can do that.');
    const signed = await this.social.sign({ off: 1 });
    this.social.relay.publish(MAINT, signed, { retain: true });
    await this.receiveMaint(signed);
  }

  // ---------- Shop spotlight ----------
  // The owner picks a few shop items to show first in the Shop. It only reorders what's shown:
  // nothing is added, removed or timed (the shop never rotates).
  async receiveSpot(text) {
    let env, b;
    try { env = JSON.parse(text); b = JSON.parse(env.b); } catch { return; }
    if (!b || low(b.from) !== low(OWNER.tag) || !(await verifyWith(OWNER.pub, env))) return;
    if (this.spot && this.spot.ts > Number(b.ts)) return;
    const items = (Array.isArray(b.items) ? b.items : []).filter((x) => x && typeof x.slot === 'string' && typeof x.id === 'string').slice(0, SPOT_MAX).map((x) => ({ slot: x.slot.slice(0, 12), id: x.id.slice(0, 32) }));
    this.spot = { title: String(b.title || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40), items, ts: Number(b.ts) || 0 };
    if (this.onSpot) this.onSpot(this.spot);
  }
  async setSpot(title, items) {
    if (!roles.isOwner()) throw new Error('Only the owner can change the shop spotlight.');
    const signed = await this.social.sign({ title, items: items.slice(0, SPOT_MAX) });
    this.social.relay.publish(SPOT, signed, { retain: true });
    await this.receiveSpot(signed);
  }
  spotlight() { return this.spot && this.spot.items.length ? this.spot : null; }

  // The message to show (null if there's none, or you hid this one).
  currentMotd(hidden) { const m = this.motd; return m && !m.off && m.id !== hidden ? m : null; }
}

export const liveEvent = new LiveEvent();
