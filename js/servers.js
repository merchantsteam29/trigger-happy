import { Relay } from './relay.js';

// Public server list over the public relays (see relay.js).
// Hosts of public servers publish a small retained "listing" every 15 s on every relay;
// everyone browsing subscribes to all listings. A last-will message clears the listing if the
// host's tab dies. Listings are public data: everything read back is validated and only ever
// shown as text.

const PREFIX = 'whffa/v1/servers/';
const REFRESH_MS = 15000;
// A listing disappears if we haven't heard it refreshed for this long (by OUR clock: the host's
// clock may be wrong, which used to hide perfectly good servers).
const SEEN_MS = 40000;
// A retained listing is what the relay kept from the host's last refresh. Live hosts refresh every
// 15 s, so an older one is a leftover from a host whose tab died without clearing it (those used to
// sit in the list for 10 minutes with nobody behind them). A live host whose clock is off still
// shows up with its next refresh, which arrives as a normal (not retained) message.
const RETAINED_MAX_AGE = 60 * 1000;
// A listed server we couldn't join stays hidden this long (by our clock).
const DEAD_MS = 3 * 60 * 1000;
const CODE_RE = /^[A-Z0-9]{5}$/;
export const REGIONS = ['NA', 'SA', 'EU', 'Asia', 'OCE', 'AF'];

// Rough region from the browser's time zone (P2P has no real regions; it's a hint for players).
export function guessRegion() {
  const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  if (/^America\/(Sao_Paulo|Argentina|Santiago|Bogota|Lima|Caracas|Montevideo|La_Paz|Asuncion|Guayaquil)/.test(tz)) return 'SA';
  if (tz.startsWith('America/') || tz.startsWith('US/') || tz.startsWith('Canada/')) return 'NA';
  if (tz.startsWith('Europe/')) return 'EU';
  if (tz.startsWith('Asia/')) return 'Asia';
  if (tz.startsWith('Australia/') || tz.startsWith('Pacific/')) return 'OCE';
  if (tz.startsWith('Africa/')) return 'AF';
  return 'NA';
}

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

// Validates one listing; returns a clean object or null.
function clean(code, raw) {
  if (!CODE_RE.test(code) || !raw || typeof raw !== 'object' || raw.v !== 1) return null;
  const max = int(raw.max, 2, 12);
  return {
    code,
    name: str(raw.name, 32) || 'Unnamed server',
    mode: str(raw.mode, 20),
    map: str(raw.map, 20),
    players: int(raw.players, 0, 12),
    bots: int(raw.bots, 0, 12),
    max,
    region: REGIONS.includes(raw.region) ? raw.region : '',
    gn: raw.gn === 1, // a Game Night server (gamenight.js)
    rules: str(raw.rules, 24), // custom rules preset name (rulesets.js), '' for normal
    motw: str(raw.motw, 16), // Mode of the week id (modeweek.js), '' for normal
    ranked: raw.ranked === 1, sr: int(raw.sr, 0, 5000), // ranked server and its host's rating
    watch: raw.w === 1, // anyone may 👁 Watch it
    ts: Number(raw.ts) || 0,
  };
}

// Browsing: keeps a live map of public servers.
export class ServerBrowser {
  constructor() {
    this.servers = new Map();
    this.dead = new Map(); // code -> when we gave up on it
    this.onChange = () => {};
    this.relay = null;
  }

  get status() {
    if (!this.relay) return 'idle';
    return this.relay.status;
  }

  async start() {
    if (this.relay) { if (this.relay.status === 'offline') this.relay.start(); return; }
    this.relay = new Relay();
    this.relay.onStatus = () => this.onChange();
    this.relay.onMessage((topic, payload, packet) => this.receive(topic, payload, packet));
    this.relay.subscribe(PREFIX + '+');
    this.onChange();
    await this.relay.start();
    this.onChange();
    clearInterval(this.pruneT);
    this.pruneT = setInterval(() => this.onChange(), 10000); // re-render so stale entries drop off
  }

  retry() {
    if (this.relay) this.relay.end();
    this.relay = null;
    this.start();
  }

  receive(topic, payload, packet) {
    if (!topic.startsWith(PREFIX)) return;
    const code = topic.slice(PREFIX.length);
    const text = payload ? payload.toString() : '';
    if (!text) { this.servers.delete(code); this.onChange(); return; }
    let raw;
    try { raw = JSON.parse(text); } catch { return; }
    const s = clean(code, raw);
    if (!s) return;
    if (packet && packet.retain && Math.abs(Date.now() - s.ts) > RETAINED_MAX_AGE) return; // a dead host's leftover
    if (Date.now() - (this.dead.get(code) || 0) < DEAD_MS) return;
    s.seen = Date.now();
    this.servers.set(code, s);
    this.onChange();
  }

  // Joining a listed server failed (no host behind it): hide it for a while.
  markDead(code) {
    if (!this.servers.has(code)) return;
    this.dead.set(code, Date.now());
    this.servers.delete(code);
    this.onChange();
  }

  // Fresh, joinable-looking servers, busiest first.
  list() {
    const now = Date.now();
    return [...this.servers.values()]
      .filter((s) => now - s.seen < SEEN_MS)
      .sort((a, b) => b.players - a.players || a.name.localeCompare(b.name));
  }
}

// Hosting a public server: publish its listing until stopped (or the tab goes away).
export class ServerAnnouncer {
  constructor() { this.relay = null; this.code = null; this.live = true; }

  // false while players can't reach this host (lobby server down): the listing is taken down until it's back.
  setLive(v) {
    if (this.live === v) return;
    this.live = v;
    this.publish();
  }

  async start(code, getInfo) {
    this.stop();
    this.code = code;
    this.getInfo = getInfo;
    const topic = PREFIX + code;
    const relay = new Relay({ will: { topic, payload: '', retain: true, qos: 0 } });
    this.relay = relay;
    relay.onConnect = () => this.publish(); // (re)announce on every relay as it connects
    const ok = await relay.start();
    if (this.relay !== relay) return false; // stopped while connecting
    this.timer = setInterval(() => this.publish(), REFRESH_MS);
    return ok;
  }

  publish() {
    if (!this.relay || !this.code) return;
    const info = { v: 1, ...this.getInfo(), ts: Date.now() };
    this.relay.publish(PREFIX + this.code, this.live ? JSON.stringify(info) : '', { retain: true });
  }

  stop() {
    clearInterval(this.timer);
    if (this.relay) this.relay.end(this.code ? PREFIX + this.code : null, '', true);
    this.relay = null;
    this.code = null;
  }
}
