import { store, esc } from './util.js';
import { qrSvg } from './qr.js';

// Linked devices: play one gamertag on several phones / PCs / browsers with the same progress.
//
// Linking copies the account's device key to the new device, so everything signed (gamertag,
// friends, owner / staff role) just works there. The account's device shows a QR code / link
// holding a one-time channel and secret; the new device sends a request with a 4-digit check
// code; only after Approve on the account's device is the key sent, encrypted with the secret.
// A gamertag the new device had before is released, and its progress merges in.
//
// Sync: every linked device keeps a "doc" and posts it encrypted (key derived from the account's
// private key, so only its devices can read it) as a retained message at whffa/v1/sync/<id>/<dev>.
// Counters (XP, tokens, stats, season XP) record only what *this* device added, and the value is
// the sum over devices, so nothing is lost or counted twice. "best" values take the max, owned
// items and achievements are combined, and everything else (look, loadout, friends, clan…) takes
// the latest change. Modules keep progress in memory, so merged values are written to storage and
// the page reloads (only outside a match).

const P = 'whffa/v1/';
const LINK_MS = 5 * 60e3;
const COUNTERS = ['xp', 'tokens', 'stats', 'season', 'aimBest'];
const SETS = ['owned', 'claimed', 'modesPlayed', 'mapsPlayed', 'seasonBadges', 'holDone', 'giftsClaimed', 'invitesPaid'];
const MAPS = ['ach'];
const LWW = ['name', 'color', 'cos', 'loadout', 'mods', 'presets', 'rulePresets', 'myClan', 'friends', 'friendReqOut', 'login',
  'daily', 'motw', 'featDone', 'streakWrap', 'champClaimed', 'clanTopClaimed', 'achShow', 'ranked', 'tutorialDone'];
const SYNCED = new Set([...COUNTERS, ...SETS, ...MAPS, ...LWW]);

const low = (s) => String(s || '').toLowerCase();
const te = new TextEncoder(), td = new TextDecoder();
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);

// Storage without the sync hook (store.set would count merged values as this device's progress).
const KEY = (k) => 'whffa.' + k;
function rawGet(k) { try { const v = localStorage.getItem(KEY(k)); return v == null ? null : JSON.parse(v); } catch { return null; } }
function rawSet(k, v) { try { if (v == null) localStorage.removeItem(KEY(k)); else localStorage.setItem(KEY(k), JSON.stringify(v)); } catch { /* full */ } }

// Numbers inside a counter key: { sum: {path: n}, max: {path: n} }.
function flat(k, v) {
  const sum = {}, max = {};
  if (k === 'xp' || k === 'tokens') { if (v != null) sum[k] = num(v); }
  else if (k === 'aimBest') { if (v != null) max[k] = num(v); }
  else if (k === 'stats' && isObj(v)) {
    for (const [s, n] of Object.entries(v)) (s.startsWith('best') ? max : sum)['stats.' + s] = num(n);
  } else if (k === 'season' && isObj(v) && v.n) {
    sum['season.xp@' + v.n] = num(v.xp);
    max['season.tier@' + v.n] = num(v.tier);
  }
  return { sum, max };
}

function freshDoc(dev, { own = true, lwwTime = 0 } = {}) {
  const d = { v: 1, dev, ts: Date.now(), sum: {}, max: {}, sets: {}, maps: {}, lww: {} };
  if (!own) return d;
  for (const k of COUNTERS) {
    const f = flat(k, rawGet(k));
    Object.assign(d.sum, f.sum);
    Object.assign(d.max, f.max);
  }
  for (const k of SETS) { const v = rawGet(k); if (Array.isArray(v)) d.sets[k] = v; }
  for (const k of MAPS) { const v = rawGet(k); if (isObj(v)) d.maps[k] = v; }
  if (lwwTime) for (const k of LWW) { const v = rawGet(k); if (v != null) d.lww[k] = { t: lwwTime, v }; }
  return d;
}

// A doc from another device (or a link bundle): keep only well-formed parts.
function cleanDoc(d) {
  if (!isObj(d) || typeof d.dev !== 'string' || !/^[A-Za-z0-9]{4,24}$/.test(d.dev)) return null;
  const nums = (o) => { const r = {}; if (isObj(o)) for (const [p, n] of Object.entries(o)) if (p.length < 60 && Number.isFinite(n)) r[p] = n; return r; };
  const out = { v: 1, dev: d.dev, ts: num(d.ts), sum: nums(d.sum), max: nums(d.max), sets: {}, maps: {}, lww: {} };
  for (const k of SETS) if (isObj(d.sets) && Array.isArray(d.sets[k])) out.sets[k] = d.sets[k].slice(0, 2000);
  for (const k of MAPS) if (isObj(d.maps) && isObj(d.maps[k])) out.maps[k] = d.maps[k];
  for (const k of LWW) if (isObj(d.lww) && isObj(d.lww[k]) && Number.isFinite(d.lww[k].t)) out.lww[k] = { t: d.lww[k].t, v: d.lww[k].v };
  return out;
}

// What every synced key should be, given this device's doc and the others'.
export function mergeDocs(mine, others, get = rawGet) {
  const docs = [mine, ...others], out = {};
  const sum = {}, max = {};
  for (const d of docs) {
    for (const [p, n] of Object.entries(d.sum)) sum[p] = (sum[p] || 0) + n;
    for (const [p, n] of Object.entries(d.max)) max[p] = Math.max(max[p] ?? -Infinity, n);
  }
  if ('xp' in sum) out.xp = Math.max(0, Math.round(sum.xp));
  if ('tokens' in sum) out.tokens = Math.max(0, Math.round(sum.tokens));
  if ('aimBest' in max) out.aimBest = max.aimBest;
  const stats = { ...(get('stats') || {}) };
  let anyStat = false;
  for (const [p, n] of Object.entries(sum)) if (p.startsWith('stats.')) { stats[p.slice(6)] = Math.max(0, Math.round(n)); anyStat = true; }
  for (const [p, n] of Object.entries(max)) if (p.startsWith('stats.')) { stats[p.slice(6)] = n; anyStat = true; }
  if (anyStat) out.stats = stats;
  const season = get('season');
  if (isObj(season) && season.n) {
    const xp = sum['season.xp@' + season.n], tier = max['season.tier@' + season.n];
    if (xp != null || tier != null) out.season = { ...season, xp: xp != null ? Math.max(0, Math.round(xp)) : season.xp, tier: Math.max(num(season.tier), tier ?? 0) };
  }
  for (const k of SETS) {
    const have = get(k), all = new Set(Array.isArray(have) ? have : []);
    let any = Array.isArray(have);
    for (const d of docs) if (d.sets[k]) { any = true; for (const x of d.sets[k]) all.add(x); }
    if (any) out[k] = k === 'giftsClaimed' ? [...all].slice(-300) : [...all];
  }
  for (const k of MAPS) {
    const have = get(k), all = { ...(isObj(have) ? have : {}) };
    let any = isObj(have);
    for (const d of docs) if (d.maps[k]) { any = true; for (const [id, t] of Object.entries(d.maps[k])) all[id] = id in all ? Math.min(all[id], t) : t; }
    if (any) out[k] = all;
  }
  for (const k of LWW) {
    let best = null;
    for (const d of docs) if (d.lww[k] && (!best || d.lww[k].t > best.t)) best = d.lww[k];
    if (best) out[k] = best.v;
  }
  return out;
}

async function aesKey(raw) { return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function seal(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(obj))));
  const all = new Uint8Array(12 + c.length);
  all.set(iv); all.set(c, 12);
  return b64(all);
}
async function unseal(key, text) {
  try {
    const all = unb64(text);
    return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, key, all.slice(12))));
  } catch { return null; }
}

class Devices {
  constructor() {
    this.doc = cleanDoc(rawGet('syncDoc'));
    this.peers = new Map(); // dev -> doc
    this.applying = false;
    this.pending = false;
    this.link = null; // the linking in progress (see render)
    this.el = null;
    this.canReload = () => true;
    this.onRelease = null; // (oldTag) clear the old gamertag's profile / boards
    if (this.doc) this.track();
    // While merged values are being written (just before a reload), nothing else may overwrite them.
    const set = store.set.bind(store);
    store.set = (k, v) => { if (this.applying && SYNCED.has(k)) return; set(k, v); };
  }

  get linked() { return !!this.doc; }

  // Start counting this device's own changes to synced keys.
  track() {
    this.last = {};
    for (const k of SYNCED) this.last[k] = rawGet(k);
    store.onSet = (k) => this.changed(k);
  }

  changed(k) {
    if (!this.doc || this.applying || !SYNCED.has(k)) return;
    const v = rawGet(k), d = this.doc;
    if (COUNTERS.includes(k)) {
      const nf = flat(k, v), of = flat(k, this.last[k]);
      for (const [p, n] of Object.entries(nf.sum)) { const delta = n - (of.sum[p] || 0); if (delta) d.sum[p] = (d.sum[p] || 0) + delta; }
      for (const [p, n] of Object.entries(nf.max)) if (n > (d.max[p] ?? -Infinity)) d.max[p] = n;
    } else if (SETS.includes(k)) d.sets[k] = Array.isArray(v) ? v : [];
    else if (MAPS.includes(k)) d.maps[k] = isObj(v) ? v : {};
    else d.lww[k] = { t: Date.now(), v };
    this.last[k] = v;
    this.save();
  }

  save() {
    this.doc.ts = Date.now();
    rawSet('syncDoc', this.doc);
    this.dirty = true;
    clearTimeout(this.pubT);
    this.pubT = setTimeout(() => this.publish(), 3000);
  }

  async init(social, { canReload, onRelease } = {}) {
    this.social = social;
    if (canReload) this.canReload = canReload;
    if (onRelease) this.onRelease = onRelease;
    social.relay.onMessage((t, payload) => this.receive(t, payload.toString()));
    setInterval(() => {
      if (this.pending && this.canReload()) this.apply();
      if (this.dirty && this.social.relay.online) this.publish();
    }, 5000);
    await social.ready;
    if (this.doc) await this.startSync();
  }

  async startSync() {
    const k = rawGet('idKeys');
    if (!k || !k.priv || !k.priv.d) return;
    const topicHash = await crypto.subtle.digest('SHA-256', te.encode('whffa-sync-topic|' + k.priv.d));
    this.syncTopic = P + 'sync/' + hex(topicHash).slice(0, 24) + '/';
    this.syncKey = await aesKey(await crypto.subtle.digest('SHA-256', te.encode('whffa-sync-key|' + k.priv.d)));
    this.social.relay.subscribe(this.syncTopic + '+');
    this.dirty = true;
    this.publish();
  }

  async publish() {
    if (!this.doc || !this.syncKey || !this.social.relay.online) return;
    this.dirty = false;
    this.social.relay.publish(this.syncTopic + this.doc.dev, await seal(this.syncKey, this.doc), { retain: true });
  }

  async receive(t, text) {
    if (this.syncTopic && t.startsWith(this.syncTopic)) {
      const dev = t.slice(this.syncTopic.length);
      if (!text || !this.doc || dev === this.doc.dev) return;
      const d = cleanDoc(await unseal(this.syncKey, text));
      if (!d || d.dev !== dev) return;
      const had = this.peers.get(dev);
      if (had && had.ts >= d.ts) return;
      this.peers.set(dev, d);
      this.render();
      clearTimeout(this.applyT);
      this.applyT = setTimeout(() => this.apply(), 1500); // let the other retained docs arrive too
    } else if (this.link && this.link.topic && t.startsWith(this.link.topic)) {
      const m = await unseal(this.link.key, text);
      if (m) this.linkMessage(t.slice(this.link.topic.length), m);
    }
  }

  // Write merged progress and reload, unless it's already up to date.
  apply() {
    if (!this.doc || this.applying) return;
    const m = mergeDocs(this.doc, [...this.peers.values()]);
    const keys = Object.keys(m).filter((k) => JSON.stringify(m[k]) !== JSON.stringify(rawGet(k)));
    this.pending = false;
    if (!keys.length) return;
    if (!this.canReload()) { this.pending = true; return; }
    // Guard against a reload loop if something keeps disagreeing.
    const now = Date.now(), recent = JSON.parse(sessionStorage.getItem('whffa.syncReloads') || '[]').filter((x) => now - x < 60e3);
    if (recent.length >= 2) return;
    sessionStorage.setItem('whffa.syncReloads', JSON.stringify([...recent, now]));
    this.applying = true;
    for (const k of keys) rawSet(k, m[k]);
    sessionStorage.setItem('whffa.devNote', 'synced');
    location.reload();
  }

  // After a reload: 'linked' | 'synced' | null, for a toast.
  note() { const n = sessionStorage.getItem('whffa.devNote'); sessionStorage.removeItem('whffa.devNote'); return n; }

  // ---------- Linking ----------
  // On the account's device: open a channel and show its link as a QR code.
  async startLink() {
    if (!this.social.tag) return;
    this.cancelLink();
    const chan = randHex(6), secret = crypto.getRandomValues(new Uint8Array(16));
    this.link = { role: 'src', step: 'wait', chan, key: await aesKey(secret), topic: P + 'link/' + chan + '/', until: Date.now() + LINK_MS,
      url: location.origin + location.pathname + '?link=' + chan + '.' + b64(secret) };
    this.social.relay.subscribe(this.link.topic + 'r');
    this.link.timer = setInterval(() => { if (Date.now() > this.link.until) this.cancelLink(); else this.tick(); }, 1000);
    this.render();
  }

  cancelLink() {
    const l = this.link;
    if (!l) return;
    clearInterval(l.timer);
    clearInterval(l.resend);
    this.social.relay.unsubscribe(l.topic + (l.role === 'src' ? 'r' : 'a'));
    this.link = null;
    this.render();
  }

  async send(to, m) { if (this.link) this.social.relay.publish(this.link.topic + to, await seal(this.link.key, m)); }

  linkMessage(to, m) {
    const l = this.link;
    if (l.role === 'src' && to === 'r') {
      if (m.t === 'req' && l.step === 'wait' && /^[0-9a-f]{8}$/.test(m.id) && /^\d{4}$/.test(m.code)) {
        l.step = 'ask';
        l.req = { id: m.id, code: m.code, name: String(m.name || 'A device').slice(0, 20) };
        this.render();
      } else if (m.t === 'got' && l.req && m.id === l.req.id) {
        clearInterval(l.resend);
        l.step = 'done';
        clearInterval(l.timer);
        this.social.relay.unsubscribe(l.topic + 'r');
        this.render();
      }
    } else if (l.role === 'dst' && to === 'a' && m.id === l.id) {
      if (m.t === 'no') { clearInterval(l.resend); l.step = 'denied'; this.render(); }
      else if (m.t === 'ok' && l.step === 'wait') this.finishJoin(m);
    }
  }

  // Account's device: send the key and progress to the approved request.
  async approve() {
    const l = this.link;
    if (!l || l.step !== 'ask') return;
    l.step = 'sending';
    l.until = Date.now() + 60e3;
    this.render();
    if (!this.doc) {
      rawSet('syncBackup', { ts: Date.now(), data: Object.fromEntries([...SYNCED].map((k) => [k, rawGet(k)])) });
      this.doc = freshDoc(rawGet('installId') || randHex(5), { lwwTime: Date.now() });
      this.track();
      this.save();
      await this.startSync();
    }
    const m = { t: 'ok', id: l.req.id, keys: rawGet('idKeys'), tag: rawGet('gamertag'), doc: this.doc };
    this.send('a', m);
    l.resend = setInterval(() => this.send('a', m), 2500);
  }

  deny() {
    const l = this.link;
    if (!l || l.step !== 'ask') return;
    this.send('a', { t: 'no', id: l.req.id });
    l.step = 'wait';
    l.req = null;
    this.render();
  }

  // New device: read a link (QR / pasted). Asks first if this device's gamertag would be released.
  prepareJoin(text) {
    const m = String(text || '').match(/(?:[?&]link=)?([0-9a-f]{12})\.([A-Za-z0-9_-]{22})\b/);
    if (!m) { this.link = { role: 'dst', step: 'error', error: 'That isn\'t a link from Link a device.' }; this.render(); return; }
    this.cancelLink();
    this.link = { role: 'dst', step: 'confirm', chan: m[1], secret: m[2] };
    this.render();
  }

  async join() {
    const l = this.link;
    if (!l || l.step !== 'confirm') return;
    l.key = await aesKey(unb64(l.secret));
    l.topic = P + 'link/' + l.chan + '/';
    l.id = randHex(4);
    l.code = String(1000 + (crypto.getRandomValues(new Uint16Array(1))[0] % 9000));
    l.step = 'wait';
    l.until = Date.now() + LINK_MS;
    this.social.relay.subscribe(l.topic + 'a');
    const req = { t: 'req', id: l.id, code: l.code, name: this.social.tag || 'A new device' };
    this.send('r', req);
    l.resend = setInterval(() => { if (Date.now() > l.until) this.cancelLink(); else { this.send('r', req); this.tick(); } }, 3000);
    this.render();
  }

  async finishJoin(m) {
    const l = this.link;
    clearInterval(l.resend);
    l.step = 'checking';
    this.render();
    const fail = (e) => { l.step = 'error'; l.error = e; this.render(); };
    const keys = m.keys, tag = isObj(m.tag) ? m.tag : null, src = cleanDoc(m.doc);
    if (!isObj(keys) || !isObj(keys.priv) || !isObj(keys.pub) || !tag || typeof tag.tag !== 'string' || !src) return fail('The other device sent something unexpected. Try again.');
    try {
      // The key must work, and must be the one that owns the gamertag.
      const ALG = { name: 'ECDSA', namedCurve: 'P-256' }, SIG = { name: 'ECDSA', hash: 'SHA-256' };
      const priv = await crypto.subtle.importKey('jwk', keys.priv, ALG, false, ['sign']);
      const pub = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: keys.pub.x, y: keys.pub.y }, ALG, false, ['verify']);
      const probe = te.encode('link-check');
      if (!await crypto.subtle.verify(SIG, pub, await crypto.subtle.sign(SIG, priv, probe), probe)) return fail('The account key didn\'t check out.');
    } catch { return fail('The account key didn\'t check out.'); }
    const claim = await this.social.lookup(tag.tag, true);
    if (!claim || claim.pub.x !== keys.pub.x || claim.pub.y !== keys.pub.y) return fail(`Couldn't confirm that ${tag.tag} belongs to that key. Check your internet and try again.`);
    this.send('r', { t: 'got', id: l.id });

    const old = this.social.tag, same = !!old && low(old) === low(tag.tag);
    if (old && !same) {
      if (this.onRelease) this.onRelease(old);
      this.social.releaseTag();
    }
    // This device's own progress so far (unless it was already this account) merges in.
    const mine = freshDoc(rawGet('installId') || randHex(5), { own: !same });
    if (!same) for (const k of ['friends', 'friendReqOut', 'myClan']) rawSet(k, null); // the old gamertag's
    const merged = mergeDocs(mine, [src]);
    this.applying = true;
    rawSet('idKeys', { priv: keys.priv, pub: { x: keys.pub.x, y: keys.pub.y } });
    rawSet('gamertag', { tag: tag.tag, since: num(tag.since) });
    rawSet('syncDoc', mine);
    for (const [k, v] of Object.entries(merged)) rawSet(k, v);
    l.step = 'done';
    this.render();
    sessionStorage.setItem('whffa.devNote', 'linked');
    setTimeout(() => location.reload(), 1500); // let the release / ack go out first
  }

  // ---------- Card (Friends screen) ----------
  clock() {
    const left = this.link && this.link.until ? Math.max(0, Math.ceil((this.link.until - Date.now()) / 1000)) : 0;
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  }
  tick() { const c = this.el && this.el.querySelector('.dv-clock'); if (c) c.textContent = this.clock(); }

  render(el = this.el) {
    this.el = el;
    if (!el || !this.social) return;
    const s = this.social, l = this.link, tag = s.tag ? esc(s.tag) : '';
    const n = this.peers.size;
    let body = '';
    const joinRow = `<div class="inv-row"><input id="dv-paste" placeholder="Paste the link from your other device" spellcheck="false" autocomplete="off"><button id="dv-join">Use it</button></div>`;
    const clock = `<span class="dv-clock">${this.clock()}</span>`;
    if (!l) {
      body = s.tag
        ? `<p class="note">${this.linked && n ? `${tag} is synced with <b>${n}</b> other device${n === 1 ? '' : 's'}. Level, tokens, items and stats stay the same on all of them.` : `Play as <b>${tag}</b> on another phone, PC or browser, with the same level, tokens, items and stats.`}</p>
          <div class="rp-btns"><button id="dv-start" class="primary">Link a device</button></div>
          <details class="dv-other"><summary>Use an account from another device on this one instead</summary>${joinRow}</details>`
        : `<p class="note">Already playing on another device? There, open <b>Friends → Your devices → Link a device</b>, then scan its code with this device's camera or paste its link here.</p>${joinRow}`;
    } else if (l.role === 'src' && l.step === 'wait') {
      body = `<p class="note">On your other device, scan this code with the camera, or open the link. <b>Only show it to yourself:</b> it's the key to your account. (${clock})</p>
        <div class="share-qr dv-qr">${qrSvg(l.url)}</div>
        <div class="inv-row"><input id="dv-link" readonly value="${esc(l.url)}"><button id="dv-copy">Copy link</button></div>
        <div class="rp-btns"><button id="dv-cancel" class="ghost">Cancel</button></div>`;
    } else if (l.role === 'src' && l.step === 'ask') {
      body = `<p class="dv-ask"><b>${esc(l.req.name)}</b> wants to play as <b>${tag}</b>.</p>
        <p class="note">Its screen should show the code <b class="dv-code">${l.req.code}</b>. Only approve your own devices: a linked device keeps your account for good.</p>
        <div class="rp-btns"><button id="dv-approve" class="primary">Approve</button><button id="dv-deny" class="ghost">Deny</button></div>`;
    } else if (l.role === 'src' && l.step === 'sending') {
      body = '<p class="note">Sending your account…</p>';
    } else if (l.role === 'src' && l.step === 'done') {
      body = `<p class="note">✅ Linked! Progress from the other device shows up here in a moment.</p><div class="rp-btns"><button id="dv-cancel">OK</button></div>`;
    } else if (l.step === 'confirm') {
      body = s.tag
        ? `<p class="note">This device will play as the account from your other device. Your gamertag <b>${tag}</b> will be <b>released</b> (anyone could take it) and its level, tokens, items and stats move into that account.</p>
          <div class="rp-btns"><button id="dv-go" class="primary">Continue</button><button id="dv-cancel" class="ghost">Cancel</button></div>`
        : `<p class="note">This device will play as the account from your other device, with its level, tokens and items.</p>
          <div class="rp-btns"><button id="dv-go" class="primary">Continue</button><button id="dv-cancel" class="ghost">Cancel</button></div>`;
    } else if (l.step === 'wait') {
      body = `<p class="note">On your other device, check that it shows the code below, then tap <b>Approve</b>. (${clock})</p>
        <p class="dv-code big">${l.code}</p><div class="rp-btns"><button id="dv-cancel" class="ghost">Cancel</button></div>`;
    } else if (l.step === 'checking') body = '<p class="note">Checking the account…</p>';
    else if (l.step === 'done') body = '<p class="note">✅ Linked! Loading your account…</p>';
    else if (l.step === 'denied') body = `<p class="note">The other device said no.</p><div class="rp-btns"><button id="dv-cancel">OK</button></div>`;
    else if (l.step === 'error') body = `<p class="note dv-err">${esc(l.error)}</p><div class="rp-btns"><button id="dv-cancel">OK</button></div>`;

    const typed = el.querySelector('#dv-paste'), was = typed ? typed.value : '', focused = typed && document.activeElement === typed;
    el.innerHTML = `<div class="inv-head"><span class="inv-ic">📱</span><div><h3>Your devices</h3></div></div>${body}`;
    const paste = el.querySelector('#dv-paste');
    if (paste && was) paste.value = was;
    if (paste && focused) paste.focus();
    const on = (id, fn) => { const b = el.querySelector('#' + id); if (b) b.onclick = fn; };
    on('dv-start', () => this.startLink());
    on('dv-cancel', () => this.cancelLink());
    on('dv-approve', () => this.approve());
    on('dv-deny', () => this.deny());
    on('dv-go', () => this.join());
    on('dv-join', () => this.prepareJoin(el.querySelector('#dv-paste').value));
    on('dv-copy', async () => {
      const b = el.querySelector('#dv-copy');
      try { await navigator.clipboard.writeText(l.url); b.textContent = 'Copied!'; } catch { el.querySelector('#dv-link').select(); }
    });
    const keep = el.querySelector('details.dv-other');
    if (keep && this.openOther) keep.open = true;
    if (keep) keep.ontoggle = () => { this.openOther = keep.open; };
  }
}

export const devices = new Devices();
