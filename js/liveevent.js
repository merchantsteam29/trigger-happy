import { OWNER, roles, verifyWith } from './roles.js';

// Owner events: the owner starts a special event from the Mod Panel (Announce tab) without an
// update: a name, a token multiplier for everything players earn, and / or a featured map and mode
// that the home screen's event row (and Quick Play when it starts a server) use. It's one retained
// message at whffa/v1/event, signed with the owner's key; it ends by itself at `until`.

const T = 'whffa/v1/event';
const low = (s) => String(s || '').toLowerCase();
export const EVENT_HOURS = [[1, '1 hour'], [3, '3 hours'], [24, '1 day'], [48, '2 days'], [72, '3 days (a weekend)'], [168, '7 days']];

class LiveEvent {
  constructor() {
    this.ev = null; // { name, tokens, map, mode, until, ts }
    this.onChange = null;
  }

  init(social) {
    this.social = social;
    social.relay.onMessage((t, payload) => { if (t === T) this.receive(payload.toString()); });
    social.relay.subscribe(T);
    const prev = social.relay.onConnect;
    social.relay.onConnect = () => { if (prev) prev(); social.relay.subscribe(T); };
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
}

export const liveEvent = new LiveEvent();
