import { roles, rank, verifyWith, ACT_PERM } from './roles.js';
import { store } from './util.js';

// Moderation over the public relays (no server of our own):
//
//  modrec/<tag>   one retained, staff-signed record per gamertag: warnings, ban, chat mute, forced
//                 gamertag change, staff notes and an action log. Each action re-publishes the whole
//                 record signed by the staff member who made it; clients only accept it if that
//                 signer is the owner or a moderator ranked above the player.
//  announce       retained, staff-signed announcement every player sees (until it expires).
//  report/<id>    retained player reports (signed by the reporter's gamertag), read by staff.
//  pres/+         (staff only) everyone's signed online status, for the "Online now" list.
//
// Players watch their own record: new warnings pop up, a ban locks them out of matches, a mute
// blocks their chat, and a forced gamertag change releases their tag. Enforcement is done by the
// game itself — clearing site data or a new gamertag gets around it.

const V = 'whffa/v1/';
const SHADOW = V + 'shadowmutes'; // staff-signed list of shadow-muted players: [{ t: lower tag, u: until (0 = no end) }]
const PERMA = V + 'permabans'; // staff-signed list of permanently banned players: [{ t: lower tag, x: their key }]
const P = V + 'modrec/', ANN = V + 'announce', REP = V + 'report/', PRES = V + 'pres/', FILTER = V + 'chatfilter', APPEAL = V + 'appeal/', STAFFCHAT = V + 'staffchat/', TAG = V + 'tag/';
const STAFFCHAT_KEEP = 3 * 864e5; // staff chat history: 3 days
const LOG_MAX = 30;
const REPLAY = 'whffa/v1/replay/'; // report replay clips (replay.js)
const REPDONE = 'whffa/v1/repdone/'; // "reviewed" notes for reporters (staff-signed, cleared by the reporter once seen)
const REPORT_MAX_AGE = 7 * 864e5;
const SUSPECTS = V + 'suspects'; // staff-signed shared watchlist: [{ t: tag, why, by, ts }]; every staff member is alerted
const EVID = V + 'evidence/'; // staff-signed replay clips kept with a player's record: evidence/<lower tag>-<id>
const CLAIM = V + 'repclaim/'; // "I've got this": which staff member is handling a report (staff-signed, retained)
const APPROVE = V + 'approve/'; // trial moderators' ban / unban requests, waiting for the owner (signed, retained)
const BUG = V + 'bug/'; // retained bug reports (signed by the sender), read by the owner
const BUG_MAX_AGE = 30 * 864e5;
const ONLINE_MS = 75000;
const low = (t) => String(t || '').toLowerCase();
const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);
const parse = (text) => { try { const env = JSON.parse(text); return { env, body: JSON.parse(env.b) }; } catch { return null; } };

export const REPORT_REASONS = ['Cheating / hacking', 'Abusive chat', 'Offensive name', 'Griefing / team killing', 'Spamming', 'Other'];
export const AUTO_FLAG = 'Auto-flag: suspicious stats'; // filed by the host's game, not offered to players

// Starred out in chat for everyone (staff can turn this list off and add their own words).
const DEFAULT_WORDS = ['fuck', 'fucking', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'asshole', 'bastard', 'slut', 'whore',
  'fag', 'faggot', 'nigger', 'nigga', 'retard', 'kys', 'rape'];

class Moderation {
  constructor() {
    this.raw = new Map(); // lower tag -> latest raw record text (re-checked when the staff list changes)
    this.records = new Map(); // lower tag -> verified record body
    this.announcement = null; // verified announcement body
    this.perma = new Map(); // lower tag -> key x of a permanently banned player
    this.shadow = new Map(); // lower tag -> until (0: no end): shadow-muted, their chat only reaches themselves
    this.onPerma = null;
    this.annRaw = null;
    this.reports = new Map(); // report id -> { id, from, target, lobby, reason, details, ts }
    this.bugs = new Map(); // bug id -> { id, from, text, info, img, ts } (owner only)
    this.claims = new Map(); // (staff) report id -> { by, ts }
    this.approvals = new Map(); // (owner) request id -> { id, from, target, act, reason, hours, ts }
    this.online = new Map(); // lower tag -> { tag, mode, lobby, at }
    this.appeals = new Map(); // lower tag -> { tag, banTs, text, ts }
    this.filter = { defaults: true, words: [] }; // staff-signed chat filter settings
    this.buildFilter();
    this.social = null;
    this.watching = new Set(); // relay topics
    this.onChange = null; // records / reports / online list changed (mod panel)
    this.onWarn = null; // (warning, count) a new warning for you
    this.onBan = null; // (ban | null) your ban started / ended
    this.onMute = null; // (mute | null) your chat mute started / ended
    this.onRename = null; // (rename) you must pick a new gamertag
    this.onKick = null; // (kick) staff removed you from your match
    this.onStaffChat = null; // (message) a new staff chat message
    this.staffChat = new Map(); // id -> { id, from, text, ts }
    this.directory = new Map(); // (staff) lower tag -> { tag, since, seen }: every claimed gamertag
    this.watch = new Set(store.get('watchlist', [])); // (staff, this device) gamertags to be told about
    this.onWatched = null; // (tag) a watched player just came online
    this.suspects = new Map(); // (staff) lower tag -> { tag, why, by, ts }: the shared watchlist
    this.onSuspect = null; // (suspect, presence) a suspect came online or joined a match
    this.onAnnounce = null; // (announcement | null)
    this.lastBan = null;
    this.lastMute = null;
  }

  init(social) {
    this.social = social;
    social.isGoneClaim = (k, c) => this.isGoneClaim(k, c);
    social.isShadow = (tag) => this.isShadowMuted(tag); // party chat drops their messages (social.js)
    social.relay.onMessage((t, payload, packet) => this.route(t, payload.toString(), packet));
    const prev = social.relay.onConnect;
    social.relay.onConnect = () => { if (prev) prev(); for (const w of this.watching) social.relay.subscribe(w); };
    this.sync();
  }

  route(t, text, packet) {
    if (t.startsWith(P)) this.receive(t.slice(P.length), text);
    else if (t === ANN) this.receiveAnnouncement(text);
    else if (t === PERMA) this.receivePerma(text);
    else if (t === SHADOW) this.receiveShadow(text);
    else if (t.startsWith(REPDONE)) this.receiveReviewed(t.slice(REPDONE.length), text);
    else if (t.startsWith(REP)) this.receiveReport(t.slice(REP.length), text);
    else if (t.startsWith(BUG) && roles.isOwner()) this.receiveBug(t.slice(BUG.length), text);
    else if (t === SUSPECTS && roles.myRole()) this.receiveSuspects(text);
    else if (t.startsWith(CLAIM) && roles.myRole()) this.receiveClaimMark(t.slice(CLAIM.length), text);
    else if (t.startsWith(APPROVE) && roles.isOwner()) this.receiveApproval(t.slice(APPROVE.length), text);
    else if (t.startsWith(PRES) && roles.myRole()) this.receivePresence(t.slice(PRES.length), text, packet);
    else if (t === FILTER) this.receiveFilter(text);
    else if (t.startsWith(APPEAL)) this.receiveAppeal(t.slice(APPEAL.length), text);
    else if (t.startsWith(STAFFCHAT) && roles.myRole()) this.receiveStaffChat(t.slice(STAFFCHAT.length), text);
    else if (t.startsWith(TAG) && roles.myRole() && this.watching.has(TAG + '+')) this.receiveClaim(t.slice(TAG.length), text);
  }

  // Everyone: your own record and announcements. Staff also: all records, reports and presence.
  sync() {
    const s = this.social;
    if (!s) return;
    const want = new Set([ANN, FILTER, PERMA, SHADOW]);
    if (s.tag) { want.add(P + low(s.tag)); want.add(APPEAL + low(s.tag)); }
    if (roles.isOwner()) { want.add(BUG + '+'); want.add(APPROVE + '+'); }
    for (const r of this.myReports()) if (r.status === 'sent') want.add(REPDONE + r.id); // has staff looked at mine?
    if (roles.myRole()) for (const t of [P + '+', REP + '+', PRES + '+', APPEAL + '+', STAFFCHAT + '+', TAG + '+', SUSPECTS, CLAIM + '+']) want.add(t);
    for (const w of this.watching) if (!want.has(w)) s.relay.unsubscribe(w);
    for (const w of want) if (!this.watching.has(w)) s.relay.subscribe(w);
    this.watching = want;
    if (!roles.myRole()) { this.reports.clear(); this.online.clear(); this.suspects.clear(); }
    else if (this.suspectsRaw) this.receiveSuspects(this.suspectsRaw);
    if (!roles.isOwner()) { this.bugs.clear(); this.approvals.clear(); }
    this.reverify();
    if (this.filterRaw) this.receiveFilter(this.filterRaw);
    if (this.permaRaw) this.receivePerma(this.permaRaw);
    if (this.shadowRaw) this.receiveShadow(this.shadowRaw);
    // Staff: bring the list up to date with the records (bans from before the list existed).
    if (roles.myRole()) { clearTimeout(this.permaT); this.permaT = setTimeout(() => this.syncPerma(), 8000); }
  }

  // ---------- Permanent bans: removed from the game for everyone ----------
  // A permanently banned player is off the leaderboards, their profile and clan are gone, they
  // drop out of friend lists and staff lists, and their gamertag is free for someone else (the
  // ban is tied to their key, so only a NEW player can take the name).
  isGone(tag) { return !!tag && this.perma.has(low(tag)); }
  isGoneClaim(k, c) { const x = this.perma.get(low(k)); return !!x && !!c && !!c.pub && c.pub.x === x; }
  async receivePerma(text) {
    this.permaRaw = text || null;
    const body = text ? await this.staffSigned(text) : null;
    if (!body || !Array.isArray(body.bans)) return;
    if (this.permaTs && Number(body.ts) < this.permaTs) return;
    this.permaTs = Number(body.ts) || 0;
    this.perma = new Map(body.bans.filter((b) => b && typeof b.t === 'string' && typeof b.x === 'string').slice(0, 2000).map((b) => [low(b.t), b.x]));
    if (this.onPerma) this.onPerma();
    if (this.onChange) this.onChange(null);
  }
  // ---------- Shadow mutes ----------
  // A shadow-muted player can chat as usual, but only they see it: hosts send their match chat back
  // to them alone, and everyone's game drops their party and clan chat. They aren't told.
  isShadowMuted(tag) { const u = tag ? this.shadow.get(low(tag)) : undefined; return u !== undefined && (!u || u > Date.now()); }
  async receiveShadow(text) {
    this.shadowRaw = text || null;
    const body = text ? await this.staffSigned(text) : null;
    if (!body || !Array.isArray(body.list)) return;
    if (this.shadowTs && Number(body.ts) < this.shadowTs) return;
    this.shadowTs = Number(body.ts) || 0;
    this.shadow = new Map(body.list.filter((x) => x && typeof x.t === 'string').slice(0, 2000).map((x) => [low(x.t), Math.max(0, Number(x.u) || 0)]));
    if (this.onChange) this.onChange(null);
  }
  async setShadow(tag, until) { // until: null to lift it
    const next = new Map([...this.shadow].filter(([, u]) => !u || u > Date.now()));
    if (until === null) next.delete(low(tag)); else next.set(low(tag), until);
    const signed = await this.social.sign({ list: [...next].map(([t, u]) => ({ t, u })) });
    this.social.relay.publish(SHADOW, signed, { retain: true });
    await this.receiveShadow(signed);
  }

  async publishPerma(map) {
    const bans = [...map].map(([t, x]) => ({ t, x }));
    const signed = await this.social.sign({ bans });
    this.social.relay.publish(PERMA, signed, { retain: true });
    await this.receivePerma(signed);
  }
  // Staff: make the list match the records (perma bans in, unbans / temp bans out).
  async syncPerma() {
    if (!roles.myRole() || !this.social) return;
    const next = new Map(this.perma);
    let changed = false;
    for (const [k, rec] of this.records) {
      const perm = rec.ban && !rec.ban.until;
      if (perm && !next.has(k)) {
        const c = await this.social.lookup(rec.target || k);
        if (c && c.pub) { next.set(k, c.pub.x); changed = true; }
      } else if (!perm && next.has(k)) { next.delete(k); changed = true; }
    }
    if (changed) await this.publishPerma(next);
  }

  // Signed by someone who is staff right now (and, given `perm`, allowed to do it: roles.js PERMS)?
  async staffSigned(text, perm = '') {
    const p = parse(text);
    if (!p || !p.body.from) return null;
    const pub = roles.pubOf(p.body.from);
    if (perm && !roles.can(p.body.from, perm, Number(p.body.ts) || 0)) return null;
    return pub && roles.roleOfTag(p.body.from) && (await verifyWith(pub, p.env)) ? p.body : null;
  }

  // ---------- Records ----------

  async receive(k, text) {
    if (!text) { this.raw.delete(k); this.records.delete(k); this.changed(k); return; }
    this.raw.set(k, text);
    const body = await this.verify(k, text);
    if (!body) return;
    const cur = this.records.get(k);
    if (cur && cur.ts > body.ts) return; // an older copy from the other relay
    this.records.set(k, body);
    this.changed(k);
  }

  // Valid if signed by staff who outrank the player the record is about.
  async verify(k, text) {
    const p = parse(text);
    if (!p || low(p.body.target) !== k || !p.body.from) return null;
    const role = roles.roleOfTag(p.body.from), pub = roles.pubOf(p.body.from);
    if (!role || !pub || rank(role) <= rank(roles.roleOfTag(p.body.target))) return null;
    // The latest change must be one the signer is allowed to make (moderator permissions).
    const last = (Array.isArray(p.body.log) ? p.body.log : []).slice(-1)[0];
    if (last && low(last.by) === low(p.body.from) && ACT_PERM[last.act] && !roles.can(p.body.from, ACT_PERM[last.act], Number(last.ts) || 0)) return null;
    return (await verifyWith(pub, p.env)) ? p.body : null;
  }

  // The staff list loaded / changed: things signed by moderators may only be valid now.
  async reverify() {
    for (const [k, text] of this.raw) {
      const body = await this.verify(k, text);
      if (body) this.records.set(k, body); else this.records.delete(k);
      this.changed(k);
    }
    if (this.annRaw) this.receiveAnnouncement(this.annRaw);
  }

  changed(k) {
    if (this.onChange) this.onChange(k);
    if (this.social && k === low(this.social.tag)) this.applyMine();
  }

  // ---------- Your own record ----------

  active(x) { return x && (!x.until || x.until > Date.now()) ? x : null; }
  activeBan(rec) { return this.active(rec && rec.ban); }
  activeMute(rec) { return this.active(rec && rec.mute); }
  mine() { const s = this.social; return s && s.tag ? this.records.get(low(s.tag)) : null; }
  myBan() { return this.activeBan(this.mine()); }
  myMute() { const m = this.activeMute(this.mine()); return m && !m.shadow ? m : null; } // a shadow mute is never shown to them

  applyMine() {
    const rec = this.mine();
    // Warnings you haven't acknowledged yet (newest last).
    const seen = store.get('warnSeen', 0);
    const fresh = ((rec && rec.warns) || []).filter((w) => w.ts > seen);
    if (fresh.length && this.onWarn) this.onWarn(fresh[fresh.length - 1], fresh.length);
    // Ban / mute start or end.
    const ban = this.activeBan(rec), mute = this.myMute();
    const banKey = ban ? ban.ts + (ban.appealDenied ? 'd' : '') : null; // a denied appeal updates the ban screen
    if (banKey !== this.lastBan) { this.lastBan = banKey; if (this.onBan) this.onBan(ban); }
    if ((mute ? mute.ts : null) !== this.lastMute) { this.lastMute = mute ? mute.ts : null; if (this.onMute) this.onMute(mute); }
    // Kicked from your match by staff (once per kick).
    if (rec && rec.kick && rec.kick.ts > store.get('kickDone', 0) && Date.now() - rec.kick.ts < 10 * 60000 && this.onKick) {
      store.set('kickDone', rec.kick.ts);
      this.onKick(rec.kick);
    }
    // Forced gamertag change.
    if (rec && rec.rename && rec.rename.ts > store.get('renameDone', 0) && this.onRename) {
      store.set('renameDone', rec.rename.ts);
      this.onRename(rec.rename);
    }
  }

  ackWarnings() {
    const rec = this.mine();
    const last = Math.max(0, ...((rec && rec.warns) || []).map((w) => w.ts));
    store.set('warnSeen', Math.max(store.get('warnSeen', 0), last));
  }

  // ---------- Staff actions on a gamertag ----------

  // act: 'warn' | 'ban' | 'unban' | 'mute' | 'smute' (shadow mute) | 'unmute' | 'rename' | 'clearwarns' | 'note'.
  async act(tag, act, { reason = '', hours = 0, clip: clipId = '' } = {}) {
    const s = this.social, me = roles.myRole();
    if (!me) throw new Error('Only staff can do that.');
    const claim = await s.lookup(tag, true);
    if (!claim) throw new Error(`Nobody has the gamertag "${tag}".`);
    const target = claim.tag, k = low(target);
    if (k === low(s.tag)) throw new Error('You can\'t moderate yourself.');
    if (rank(me) <= rank(roles.roleOfTag(target))) throw new Error('You can only act on players ranked below you.');
    if (ACT_PERM[act] === 'ban' && roles.myTrial()) return this.requestApproval(target, act, reason, hours); // trial mode
    if (ACT_PERM[act] && !roles.myCan(ACT_PERM[act])) throw new Error('The owner hasn\'t given you permission to do that.');
    reason = clip(reason, 140);
    const now = Date.now(), until = hours > 0 ? now + hours * 3600e3 : 0;
    const old = this.records.get(k) || {};
    const rec = {
      target, warns: [...(old.warns || [])], ban: old.ban || null, mute: old.mute || null, rename: old.rename || null,
      notes: [...(old.notes || [])], log: [...(old.log || [])],
    };
    let note = '';
    const span = hours > 0 ? fmtHours(hours) : 'permanent';
    if (act === 'warn') {
      if (!reason) throw new Error('Give a reason for the warning.');
      rec.warns = [...rec.warns, { by: s.tag, reason, ts: now }].slice(-20);
      note = reason;
    } else if (act === 'ban') {
      rec.ban = { by: s.tag, reason: reason || 'Breaking the rules', until, ts: now };
      note = `${span}${reason ? ' · ' + reason : ''}`;
    } else if (act === 'unban') {
      rec.ban = null;
      note = reason;
    } else if (act === 'mute') {
      rec.mute = { by: s.tag, reason: reason || 'Chat abuse', until, ts: now };
      note = `${span}${reason ? ' · ' + reason : ''}`;
    } else if (act === 'smute') {
      rec.mute = { by: s.tag, reason: reason || 'Chat abuse', until, ts: now, shadow: true };
      note = `${span}${reason ? ' · ' + reason : ''}`;
    } else if (act === 'unmute') {
      rec.mute = null;
      note = reason;
    } else if (act === 'rename') {
      rec.rename = { by: s.tag, reason: reason || 'Inappropriate gamertag', ts: now };
      note = rec.rename.reason;
    } else if (act === 'clearwarns') {
      rec.warns = [];
    } else if (act === 'kick') {
      rec.kick = { by: s.tag, reason: reason || 'Removed by staff', ts: now };
      note = rec.kick.reason;
    } else if (act === 'denyappeal') {
      if (!rec.ban) throw new Error('They aren\'t banned.');
      rec.ban = { ...rec.ban, appealDenied: true };
      note = reason;
    } else if (act === 'note') {
      if (!reason) throw new Error('Type the note first.');
      rec.notes = [...rec.notes, { by: s.tag, text: reason, ts: now, ...(/^[a-z0-9]{4,12}$/.test(clipId) ? { clip: clipId } : {}) }].slice(-20);
      note = reason;
    } else throw new Error('Unknown action.');
    rec.log = [...rec.log, { by: s.tag, act, note, ts: now }].slice(-LOG_MAX);
    const text = await s.sign(rec);
    s.relay.publish(P + k, text, { retain: true });
    if (act === 'unban' || act === 'denyappeal') this.clearAppeal(k); // the appeal is answered
    if (act === 'smute') await this.setShadow(k, until);
    else if ((act === 'mute' || act === 'unmute') && this.shadow.has(k)) await this.setShadow(k, null);
    await this.receive(k, text);
    if (act === 'ban' || act === 'unban') {
      const next = new Map(this.perma);
      if (act === 'ban' && !until) next.set(k, claim.pub.x); else next.delete(k);
      await this.publishPerma(next);
    }
    return this.records.get(k);
  }

  // ---------- Announcements ----------

  async receiveAnnouncement(text) {
    this.annRaw = text || null;
    const body = text ? await this.staffSigned(text, 'announce') : null;
    const a = body && body.text && (!body.until || body.until > Date.now()) ? body : null;
    if (a && this.announcement && this.announcement.ts > a.ts) return;
    this.announcement = a;
    if (this.onAnnounce) this.onAnnounce(a);
    if (this.onChange) this.onChange(null);
  }

  async announce(text, hours, level = 'info') {
    if (!roles.myCan('announce')) throw new Error('You don\'t have permission to post announcements.');
    text = clip(text, 200);
    if (!text) throw new Error('Type the announcement first.');
    const body = { text, level: level === 'warn' ? 'warn' : 'info', until: hours > 0 ? Date.now() + hours * 3600e3 : 0, id: Date.now().toString(36) };
    const signed = await this.social.sign(body);
    this.social.relay.publish(ANN, signed, { retain: true });
    await this.receiveAnnouncement(signed);
  }

  async clearAnnouncement() {
    if (!roles.myCan('announce')) throw new Error('You don\'t have permission to do that.');
    const signed = await this.social.sign({ text: '', until: 0, id: 'cleared' });
    this.social.relay.publish(ANN, signed, { retain: true });
    await this.receiveAnnouncement(signed);
  }

  // ---------- Reports ----------

  // Anyone with a gamertag can report a player (once a minute).
  // img: optional small JPEG data URL of the reporter's screen (evidence for staff).
  // replay: the last 30 s of the match (replay.js encodeClip), sent signed at replay/<id> for staff.
  async report({ target, lobby, reason, details, img, replay }) {
    const s = this.social;
    if (!s.tag) throw new Error('Pick a gamertag first so staff know who sent the report.');
    if (Date.now() - (this.lastReport || 0) < 60000) throw new Error('You just sent a report. Wait a minute before sending another.');
    if (!REPORT_REASONS.includes(reason)) throw new Error('Pick a reason.');
    const id = `${low(s.tag)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`; // unique even if sent in the same moment
    const shot = typeof img === 'string' && img.startsWith('data:image/jpeg;base64,') && img.length < 60000 ? img : undefined;
    const hasClip = typeof replay === 'string' && replay.length < 150000;
    if (hasClip) s.relay.publish(REPLAY + id, await s.sign({ id, clip: replay }), { retain: true });
    s.relay.publish(REP + id, await s.sign({ id, target: clip(target, 16), lobby: clip(lobby, 8), reason, details: clip(details, 200), img: shot, rp: hasClip ? 1 : 0 }), { retain: true });
    this.lastReport = Date.now();
    store.set('myReports', [{ id, target: clip(target, 16), reason, ts: Date.now(), status: 'sent' }, ...this.myReports()].slice(0, 20));
    this.sync();
  }

  async receiveReport(id, text) {
    if (!text) { if (this.reports.delete(id) && this.onChange) this.onChange(null); return; }
    const b = await this.social.verify(text); // signed by the reporter's own gamertag
    if (!b || b.id !== id || Date.now() - (Number(b.ts) || 0) > REPORT_MAX_AGE) return;
    const img = typeof b.img === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(b.img) ? b.img : null;
    this.reports.set(id, { id, from: b.from, target: clip(b.target, 16), lobby: clip(b.lobby, 8), reason: clip(b.reason, 40), details: clip(b.details, 200), ts: Number(b.ts), img, rp: b.rp === 1 });
    if (this.onChange) this.onChange(null);
  }

  // Staff: resolve a report (removes it for every staff member).
  // ---------- Claiming reports ----------
  async receiveClaimMark(id, text) {
    if (!text) { if (this.claims.delete(id) && this.onChange) this.onChange(null); return; }
    const b = await this.staffSigned(text);
    if (!b || b.id !== id) return;
    const cur = this.claims.get(id);
    if (cur && cur.ts > Number(b.ts)) return;
    if (b.off) this.claims.delete(id); else this.claims.set(id, { by: b.from, ts: Number(b.ts) || 0 });
    if (this.onChange) this.onChange(null);
  }
  // on: take the report ("I've got this"), or let it go.
  async claimReport(id, on = true) {
    if (!roles.myRole()) return;
    const signed = await this.social.sign(on ? { id } : { id, off: 1 });
    this.social.relay.publish(CLAIM + id, signed, { retain: true });
    await this.receiveClaimMark(id, signed);
  }
  claimOf(id) { return this.claims.get(id) || null; }

  // A player's past trouble, for the repeat-offender badge on reports: open reports about them, and
  // warnings / mutes / bans / kicks from their record's history.
  offences(tag) {
    const k = low(tag), rec = this.records.get(k) || {}, log = rec.log || [];
    const n = (acts) => log.filter((l) => acts.includes(l.act)).length;
    return {
      reports: [...this.reports.values()].filter((r) => low(r.target) === k).length,
      warns: Math.max((rec.warns || []).length, n(['warn'])), mutes: n(['mute', 'smute']), bans: n(['ban']), kicks: n(['kick']),
    };
  }

  async dismissReport(id) {
    if (!roles.myRole()) return;
    if (this.claims.has(id)) { this.social.relay.publish(CLAIM + id, '', { retain: true }); this.claims.delete(id); }
    this.social.relay.publish(REP + id, '', { retain: true });
    this.social.relay.publish(REPLAY + id, '', { retain: true });
    this.reports.delete(id);
    if (this.onChange) this.onChange(null);
    this.social.relay.publish(REPDONE + id, await this.social.sign({ id }), { retain: true }); // tells the reporter it was looked at (not what was done)
  }

  // ---------- Your reports ----------
  // The reports you sent: [{ id, target, reason, ts, status: 'sent' | 'reviewed' | 'expired', at }]. When
  // staff resolve one, a staff-signed note says so (not who did what); after 7 days unanswered it expires.
  myReports() {
    const list = store.get('myReports', []);
    return Array.isArray(list) ? list.filter((r) => r && typeof r.id === 'string').map((r) => (r.status === 'sent' && Date.now() - r.ts > REPORT_MAX_AGE ? { ...r, status: 'expired' } : r)) : [];
  }
  async receiveReviewed(id, text) {
    if (!text) return;
    const b = await this.staffSigned(text);
    const list = this.myReports(), r = list.find((x) => x.id === id);
    if (!b || b.id !== id || !r || r.status !== 'sent') return;
    r.status = 'reviewed'; r.at = Number(b.ts) || Date.now();
    store.set('myReports', list);
    this.social.relay.publish(REPDONE + id, '', { retain: true }); // seen: clean it up
    this.sync();
    if (this.onReviewed) this.onReviewed(r);
  }

  // Staff: the replay clip sent with a report (signed by the reporter), or null.
  fetchReplay(r) {
    const s = this.social, topic = REPLAY + r.id;
    return new Promise((resolve) => {
      let raw = null;
      const off = s.relay.onMessage((t, payload) => { if (t === topic && payload.length) raw = payload.toString(); });
      s.relay.subscribe(topic);
      setTimeout(async () => {
        off();
        s.relay.unsubscribe(topic);
        const b = raw ? await s.verify(raw) : null;
        resolve(b && b.id === r.id && low(b.from) === low(r.from) && typeof b.clip === 'string' ? b.clip : null);
      }, 3000);
    });
  }

  // ---------- Evidence clips ----------
  // Staff save the last 60 s of a match they're in or watching onto a player's record: the clip is
  // retained at evidence/<tag>-<id> (signed by the staff member) and a staff note points at it.

  async saveEvidence(target, data, text) {
    if (!roles.myRole()) throw new Error('Only staff can do that.');
    if (typeof data !== 'string' || !data) throw new Error('Nothing recorded yet.');
    const claim = await this.social.lookup(target, true);
    if (!claim) throw new Error(`${target} has no gamertag, so there's no record to keep it on.`);
    const id = Date.now().toString(36);
    this.social.relay.publish(EVID + low(claim.tag) + '-' + id, await this.social.sign({ id, target: claim.tag, clip: data }), { retain: true });
    return this.act(claim.tag, 'note', { reason: clip(text, 140) || '🎬 Evidence clip', clip: id });
  }

  fetchEvidence(target, id) {
    const s = this.social, topic = EVID + low(target) + '-' + id;
    return new Promise((resolve) => {
      let raw = null;
      const off = s.relay.onMessage((t, payload) => { if (t === topic && payload.length) raw = payload.toString(); });
      s.relay.subscribe(topic);
      setTimeout(async () => {
        off();
        s.relay.unsubscribe(topic);
        const b = raw ? await this.staffSigned(raw) : null;
        resolve(b && b.id === id && typeof b.clip === 'string' ? b.clip : null);
      }, 3000);
    });
  }

  // ---------- Bug reports (owner) ----------
  // Anyone with a gamertag can send one (once a minute): what happened, plus the game version,
  // device and match it came from, and an optional picture of their screen.
  async reportBug({ text, info, img }) {
    const s = this.social;
    if (!s.tag) throw new Error('Pick a gamertag (Friends tab) first, so the owner knows who sent it.');
    if (String(text || '').trim().length < 5) throw new Error('Say what went wrong (a few words is fine).');
    if (Date.now() - (this.lastBug || 0) < 60000) throw new Error('You just sent one. Wait a minute before sending another.');
    const id = `${low(s.tag)}-${Date.now().toString(36)}`;
    const shot = typeof img === 'string' && img.startsWith('data:image/jpeg;base64,') && img.length < 60000 ? img : undefined;
    s.relay.publish(BUG + id, await s.sign({ id, text: clip(text, 500), info: clip(info, 300), img: shot }), { retain: true });
    this.lastBug = Date.now();
  }
  async receiveBug(id, text) {
    if (!text) { if (this.bugs.delete(id) && this.onChange) this.onChange(null); return; }
    const b = await this.social.verify(text);
    if (!b || b.id !== id || Date.now() - (Number(b.ts) || 0) > BUG_MAX_AGE) return;
    const img = typeof b.img === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(b.img) ? b.img : null;
    this.bugs.set(id, { id, from: b.from, text: clip(b.text, 500), info: clip(b.info, 300), ts: Number(b.ts), img });
    if (this.onChange) this.onChange(null);
  }
  // Owner: mark a bug fixed / handled (removes it).
  closeBug(id) {
    if (!roles.isOwner()) return;
    this.social.relay.publish(BUG + id, '', { retain: true });
    this.bugs.delete(id);
    if (this.onChange) this.onChange(null);
  }

  // ---------- Action log (staff) ----------

  // Every staff action on every gamertag, newest first.
  actionLog() {
    const out = [];
    for (const r of this.records.values()) for (const l of r.log || []) out.push({ ...l, target: r.target });
    return out.sort((a, b) => b.ts - a.ts);
  }

  // ---------- Chat filter ----------

  buildFilter() {
    const words = [...new Set([...(this.filter.defaults ? DEFAULT_WORDS : []), ...this.filter.words].map(low).filter(Boolean))];
    // Whole words, also with repeated letters ("fuuuck") and simple symbol swaps ("sh1t").
    const sub = { a: '[a@4]', e: '[e3]', i: '[i1!l]', o: '[o0]', s: '[s$5]', t: '[t7]' };
    const pat = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '').split('').map((c) => `${sub[c] || c}+`).join('');
    this.filterRe = words.length ? new RegExp(`(^|[^a-z0-9])(${words.map(pat).join('|')})(?=$|[^a-z0-9])`, 'gi') : null;
  }

  // Replaces filtered words with stars.
  clean(text) {
    return this.filterRe ? String(text).replace(this.filterRe, (m, pre, word) => pre + '*'.repeat(word.length)) : String(text);
  }

  async receiveFilter(text) {
    this.filterRaw = text || null;
    const body = text ? await this.staffSigned(text, 'tools') : null;
    if (!body) return;
    if (this.filterTs && this.filterTs > body.ts) return;
    this.filterTs = body.ts;
    this.filter = { defaults: body.defaults !== false, words: (Array.isArray(body.words) ? body.words : []).map((w) => clip(w, 30).toLowerCase()).filter(Boolean).slice(0, 300) };
    this.buildFilter();
    if (this.onChange) this.onChange(null);
  }

  async saveFilter(words, defaults) {
    if (!roles.myCan('tools')) throw new Error('You don\'t have permission to change the chat filter.');
    const list = [...new Set(words.map((w) => clip(w, 30).toLowerCase()).filter((w) => /^[a-z0-9]{2,30}$/.test(w)))].slice(0, 300);
    const signed = await this.social.sign({ defaults: !!defaults, words: list });
    this.social.relay.publish(FILTER, signed, { retain: true });
    await this.receiveFilter(signed);
    return list.length;
  }

  defaultWords() { return DEFAULT_WORDS.slice(); }

  // Gamertags run words together ("xXshitXx"), so names are checked inside the name too
  // (with simple symbol swaps); very short words only count on their own.
  badName(name) {
    const n = String(name).toLowerCase().replace(/[4@]/g, 'a').replace(/3/g, 'e').replace(/[1!]/g, 'i').replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't').replace(/_/g, '');
    const words = [...(this.filter.defaults ? DEFAULT_WORDS : []), ...this.filter.words];
    return words.some((w) => (w.length >= 4 ? n.includes(w) : n === w));
  }

  // ---------- Ban appeals ----------

  // A banned player asks for the ban to be lifted (one message per ban).
  async appeal(text) {
    const s = this.social, ban = this.myBan();
    if (!ban) throw new Error('You aren\'t banned.');
    text = clip(text, 400);
    if (text.length < 10) throw new Error('Explain a bit more (at least 10 characters).');
    s.relay.publish(APPEAL + low(s.tag), await s.sign({ banTs: ban.ts, text }), { retain: true });
    store.set('appealFor', ban.ts);
  }

  appealSent() { const b = this.myBan(); return !!b && store.get('appealFor', 0) === b.ts; }

  async receiveAppeal(k, text) {
    if (!text) { if (this.appeals.delete(k) && this.onChange) this.onChange(null); return; }
    const b = await this.social.verify(text); // signed by the banned player's own gamertag
    if (!b || low(b.from) !== k) return;
    this.appeals.set(k, { tag: b.from, banTs: Number(b.banTs) || 0, text: clip(b.text, 400), ts: Number(b.ts) || 0 });
    if (this.onChange) this.onChange(null);
  }

  // Open appeals: only for bans that are still active and not already denied.
  openAppeals() {
    return [...this.appeals.values()].filter((a) => {
      const ban = this.activeBan(this.records.get(low(a.tag)));
      return ban && ban.ts === a.banTs && !ban.appealDenied;
    }).sort((a, b) => b.ts - a.ts);
  }

  clearAppeal(k) {
    this.social.relay.publish(APPEAL + k, '', { retain: true });
    this.appeals.delete(k);
  }

  // ---------- Auto-flags ----------

  // Filed by the host's game when a player's stats look impossible (see host.js `checkFlags`).
  // replay: the host's last 30 s (replay.js encodeClip), so staff can watch what set it off.
  async autoFlag({ target, lobby, details, replay }) {
    const s = this.social;
    if (!s.tag) return; // reports are signed with a gamertag
    const id = `${low(s.tag)}-${Date.now().toString(36)}`;
    const hasClip = typeof replay === 'string' && replay.length < 150000;
    if (hasClip) s.relay.publish(REPLAY + id, await s.sign({ id, clip: replay }), { retain: true });
    s.relay.publish(REP + id, await s.sign({ id, target: clip(target, 16), lobby: clip(lobby, 8), reason: AUTO_FLAG, details: clip(details, 200), rp: hasClip ? 1 : 0 }), { retain: true });
  }

  // ---------- Trial moderators: owner approval ----------
  // A moderator on trial (roles.js) can't sign bans / unbans themselves: they send a request the
  // owner approves (the owner then makes the change, noting who asked) or denies. Either way the
  // answer goes to staff chat.

  async requestApproval(target, act, reason, hours) {
    const s = this.social;
    const id = `${low(s.tag)}-${Date.now().toString(36)}`;
    s.relay.publish(APPROVE + id, await s.sign({ id, target: clip(target, 16), act, reason: clip(reason, 140), hours: Math.max(0, Number(hours) || 0) }), { retain: true });
    return { pending: true };
  }

  async receiveApproval(id, text) {
    if (!text) { if (this.approvals.delete(id) && this.onChange) this.onChange(null); return; }
    const b = await this.staffSigned(text);
    if (!b || !b.target || !['ban', 'unban', 'denyappeal'].includes(b.act)) return;
    if (Date.now() - (Number(b.ts) || 0) > 14 * 864e5) { this.social.relay.publish(APPROVE + id, '', { retain: true }); return; }
    this.approvals.set(id, { id, from: b.from, target: clip(b.target, 16), act: b.act, reason: clip(b.reason, 140), hours: Math.max(0, Number(b.hours) || 0), ts: Number(b.ts) });
    if (this.onChange) this.onChange(null);
  }

  // Owner: answer a request.
  async answerApproval(id, yes) {
    const a = this.approvals.get(id);
    if (!a || !roles.isOwner()) return;
    const what = a.act === 'ban' ? `ban ${a.target} (${a.hours ? fmtHours(a.hours) : 'permanent'})` : a.act === 'unban' ? `unban ${a.target}` : `deny ${a.target}'s appeal`;
    if (yes) await this.act(a.target, a.act, { reason: `${a.reason}${a.reason ? ' ' : ''}(asked by ${a.from})`.trim(), hours: a.hours });
    this.social.relay.publish(APPROVE + id, '', { retain: true });
    this.approvals.delete(id);
    await this.sayStaff(`${yes ? '✓ Approved' : '✕ Denied'} ${a.from}'s request to ${what}.`).catch(() => {});
    if (this.onChange) this.onChange(null);
  }

  // ---------- Staff chat ----------
  // Retained, staff-signed messages (staffchat/<id>); only staff subscribe. Messages older than
  // a few days are ignored and cleaned up by whichever staff member sees them.

  async receiveStaffChat(id, text) {
    if (!text) { if (this.staffChat.delete(id) && this.onChange) this.onChange(null); return; }
    const b = await this.staffSigned(text);
    if (!b || !b.text) return;
    if (Date.now() - (Number(b.ts) || 0) > STAFFCHAT_KEEP) { this.social.relay.publish(STAFFCHAT + id, '', { retain: true }); return; }
    if (this.staffChat.has(id)) return;
    const m = { id, from: b.from, text: clip(b.text, 300), ts: Number(b.ts) };
    this.staffChat.set(id, m);
    if (this.onStaffChat && Date.now() - m.ts < 60000) this.onStaffChat(m);
    if (this.onChange) this.onChange(null);
  }

  async sayStaff(text) {
    if (!roles.myRole()) throw new Error('Only staff can use staff chat.');
    text = clip(text, 300);
    if (!text) return;
    const id = `${low(this.social.tag)}-${Date.now().toString(36)}`;
    const signed = await this.social.sign({ text });
    this.social.relay.publish(STAFFCHAT + id, signed, { retain: true });
    await this.receiveStaffChat(id, signed);
  }

  staffChatLog() { return [...this.staffChat.values()].sort((a, b) => a.ts - b.ts).slice(-100); }

  // ---------- Player directory (staff) ----------
  // Every claimed gamertag (the retained claims), so staff can search by part of a name.

  receiveClaim(k, text) {
    if (!text) { if (this.directory.delete(k) && this.onChange) this.onChange(null); return; }
    let c;
    try { c = JSON.parse(text); } catch { return; }
    if (!c || low(c.tag) !== k || !c.pub) return;
    const prev = this.directory.get(k);
    if (prev && prev.since && Number(c.since) > prev.since) return; // first claim wins, like social.lookup
    this.directory.set(k, { tag: clip(c.tag, 16), since: Number(c.since) || 0, seen: Number(c.seen) || 0, x: typeof c.pub.x === 'string' ? c.pub.x : '' });
    if (this.onChange) this.onChange(null);
  }

  // Search by any part of a gamertag (case doesn't matter); newest activity first.
  // ---------- Ban evasion ----------
  // A gamertag is claimed with the device's key, so a new gamertag made on a banned player's device
  // (or a device linked to it) has the same key as the banned one.

  // Other gamertags with the same device key as `tag`.
  altsOf(tag) {
    const k = low(tag), me = this.directory.get(k);
    const x = (me && me.x) || this.perma.get(k);
    if (!x) return [];
    return [...this.directory.values()].filter((p) => p.x === x && low(p.tag) !== k).map((p) => p.tag);
  }

  // Keys of banned players (permanent bans, and temporary bans still running) -> the banned gamertag.
  bannedKeys() {
    const keys = new Map();
    for (const [t, x] of this.perma) keys.set(x, t);
    for (const [k, rec] of this.records) {
      const d = this.directory.get(k);
      if (this.activeBan(rec) && d && d.x && !keys.has(d.x)) keys.set(d.x, rec.target || k);
    }
    return keys;
  }

  // Possible ban evaders: gamertags that aren't banned but share a banned player's key.
  evaders() {
    const keys = this.bannedKeys(), out = [];
    for (const [k, p] of this.directory) {
      const of = p.x && keys.get(p.x);
      if (!of || low(of) === k || this.isGone(p.tag) || this.activeBan(this.records.get(k))) continue;
      out.push({ tag: p.tag, of, seen: p.seen, on: this.online.has(k) });
    }
    return out.sort((a, b) => b.on - a.on || b.seen - a.seen);
  }

  searchPlayers(q = '') {
    q = low(q).replace(/[^a-z0-9_]/g, '');
    return [...this.directory.values()]
      .filter((p) => (!q || low(p.tag).includes(q)) && (!this.isGone(p.tag) || low(p.tag) === q))
      .sort((a, b) => (low(a.tag) === q ? -1 : low(b.tag) === q ? 1 : 0) || b.seen - a.seen);
  }

  // ---------- Recent players (this device) ----------
  // Everyone you've been in a match with lately (name, verified gamertag if known, lobby, when).
  notePlayer(name, gt, lobby) {
    if (!name || /^\[BOT\]/.test(name)) return;
    const list = store.get('recentPlayers', []).filter((p) => !(p.name === name && p.lobby === lobby));
    list.unshift({ name: clip(name, 16), gt: gt ? clip(gt, 16) : null, lobby: clip(lobby, 8), ts: Date.now() });
    store.set('recentPlayers', list.slice(0, 60));
  }
  recentPlayers() { return store.get('recentPlayers', []).filter((p) => !this.isGone(p.gt)); }

  // ---------- Watchlist (staff, saved on this device) ----------
  // ---------- Suspects (shared watchlist) ----------

  async receiveSuspects(text) {
    this.suspectsRaw = text || null;
    const body = text ? await this.staffSigned(text) : null;
    if (!body || !Array.isArray(body.list)) return;
    if (this.suspectsTs && Number(body.ts) < this.suspectsTs) return;
    this.suspectsTs = Number(body.ts) || 0;
    this.suspects = new Map(body.list.filter((x) => x && typeof x.t === 'string').slice(0, 300)
      .map((x) => [low(x.t), { tag: clip(x.t, 16), why: clip(x.why, 140), by: clip(x.by, 16), ts: Number(x.ts) || 0 }]));
    if (this.onChange) this.onChange(null);
  }
  isSuspect(tag) { return !!tag && this.suspects.has(low(tag)); }
  // why: null to take them off the list.
  async setSuspect(tag, why) {
    if (!roles.myRole()) throw new Error('Only staff can do that.');
    const next = new Map(this.suspects);
    if (why === null) next.delete(low(tag)); else next.set(low(tag), { tag: clip(tag, 16), why: clip(why, 140), by: this.social.tag, ts: Date.now() });
    const signed = await this.social.sign({ list: [...next.values()].map((x) => ({ t: x.tag, why: x.why, by: x.by, ts: x.ts })) });
    this.social.relay.publish(SUSPECTS, signed, { retain: true });
    await this.receiveSuspects(signed);
  }

  isWatched(tag) { return this.watch.has(low(tag)); }
  toggleWatch(tag) {
    const k = low(tag);
    if (this.watch.has(k)) this.watch.delete(k); else this.watch.add(k);
    store.set('watchlist', [...this.watch]);
    if (this.onChange) this.onChange(null);
    return this.watch.has(k);
  }

  // Moderator activity: actions per staff member (from the records' logs).
  staffStats() {
    const out = new Map();
    for (const l of this.actionLog()) {
      const s = out.get(l.by) || { by: l.by, total: 0, warn: 0, ban: 0, mute: 0, kick: 0, last: 0 };
      s.total++;
      if (s[l.act] !== undefined) s[l.act]++;
      s.last = Math.max(s.last, l.ts);
      out.set(l.by, s);
    }
    return [...out.values()].sort((a, b) => b.total - a.total);
  }

  // ---------- Host checks ----------

  // Fetches someone's moderation record (verified) — used by hosts to turn away banned players.
  fetchRecord(tag) {
    const k = low(tag);
    if (this.records.has(k)) return Promise.resolve(this.records.get(k));
    return new Promise((resolve) => {
      const topic = P + k;
      let done = false;
      const off = this.social.relay.onMessage(async (t, payload) => {
        if (t !== topic || done) return;
        const body = await this.verify(k, payload.toString());
        if (body) { done = true; off(); this.social.relay.unsubscribe(topic); resolve(body); }
      });
      this.social.relay.subscribe(topic);
      setTimeout(() => { if (!done) { done = true; off(); if (!this.watching.has(topic) && !this.watching.has(P + '+')) this.social.relay.unsubscribe(topic); resolve(null); } }, 2500);
    });
  }

  // ---------- Online now (staff) ----------

  async receivePresence(k, text, packet) {
    if (!text) return;
    const b = await this.social.verify(text);
    if (!b || low(b.from) !== k) return;
    const fresh = !(packet && packet.retain) || Math.abs(Date.now() - (Number(b.ts) || 0)) < ONLINE_MS;
    if (b.on && fresh) {
      if (!this.online.has(k) && this.watch.has(k) && this.onWatched) this.onWatched(b.from, b);
      // Suspects: tell every staff member when they come online or move into another match.
      const prev = this.online.get(k), sus = this.suspects.get(k);
      if (sus && this.onSuspect && (!prev || (b.mode === 'lobby' && b.lobby && prev.lobby !== b.lobby))) this.onSuspect(sus, b);
      this.online.set(k, { tag: b.from, mode: b.mode, lobby: b.lobby, at: Date.now() });
    }
    else this.online.delete(k);
    if (this.onChange) this.onChange(null);
  }

  onlineNow() {
    const now = Date.now();
    for (const [k, o] of this.online) if (now - o.at > ONLINE_MS) this.online.delete(k);
    return [...this.online.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  }
}

export function fmtHours(h) {
  return h >= 24 * 365 ? 'permanent' : h >= 24 ? `${Math.round(h / 24)} day${h >= 48 ? 's' : ''}` : `${h} hour${h === 1 ? '' : 's'}`;
}

export const moderation = new Moderation();
