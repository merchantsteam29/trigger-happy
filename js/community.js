import { cleanMap, EDIT_MATS, HALF_W, HALF_D } from './editor.js';
import { esc, store } from './util.js';
import { moderation } from './moderation.js';
import { roles } from './roles.js';

// Community maps: players publish editor maps (signed, retained at whffa/v1/cmap/<id>, where id is
// "<gamertag>-<6 letters>", up to 5 each) and like them (whffa/v1/cmaplike/<id>/<tag>, one per
// player). The map editor's 🌍 Community maps lists them (Top / New) to play or copy. Staff can
// hide a map (a staff-signed list at whffa/v1/cmaphide). Nothing loads until the list is opened.

const V = 'whffa/v1/', MAP = V + 'cmap/', LIKE = V + 'cmaplike/', HIDE = V + 'cmaphide';
const ID_RE = /^[a-z0-9_]{3,16}-[a-z0-9]{6}$/;
export const MAX_PUBLISHED = 5;
const low = (s) => String(s || '').toLowerCase();
const randId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

class Community {
  constructor() { this.maps = new Map(); this.likes = new Map(); this.hidden = new Set(); this.on = false; }
  init(social) { this.social = social; }

  // Starts listening (the first time the list is opened).
  start() {
    const s = this.social;
    if (this.on || !s) return;
    this.on = true;
    s.relay.onMessage((t, payload) => {
      const text = payload.toString();
      if (t === HIDE) this.receiveHide(text);
      else if (t.startsWith(MAP)) this.receiveMap(t.slice(MAP.length), text);
      else if (t.startsWith(LIKE)) { const [id, tag] = t.slice(LIKE.length).split('/'); this.receiveLike(id, tag, text); }
    });
    for (const t of [MAP + '+', LIKE + '+/+', HIDE]) s.relay.subscribe(t);
  }

  changed() { if (this.onChange) this.onChange(); }

  async receiveMap(id, text) {
    if (!ID_RE.test(id)) return;
    if (!text) { this.maps.delete(id); this.changed(); return; }
    if (text.length > 80000) return;
    const b = await this.social.verify(text);
    if (!b || low(b.from) !== id.split('-')[0]) return;
    const map = cleanMap(b.map);
    if (!map || (!map.boxes.length && !map.spawns.length)) return;
    this.maps.set(id, { id, by: b.from, map, ts: Number(b.ts) || 0 });
    this.changed();
  }

  async receiveLike(id, tag, text) {
    if (!ID_RE.test(id) || !/^[a-z0-9_]{3,16}$/.test(tag || '')) return;
    const b = text ? await this.social.verify(text) : null;
    if (text && (!b || low(b.from) !== tag || b.like !== id)) return;
    const set = this.likes.get(id) || new Set(); // after the check: several arrive at once
    if (b) set.add(tag); else set.delete(tag);
    this.likes.set(id, set);
    this.changed();
  }

  async receiveHide(text) {
    this.hideRaw = text || null;
    const b = text ? await moderation.staffSigned(text, 'tools') : null;
    if (!b || !Array.isArray(b.ids)) return;
    if (this.hideTs && Number(b.ts) < this.hideTs) return;
    this.hideTs = Number(b.ts) || 0;
    this.hidden = new Set(b.ids.filter((x) => ID_RE.test(x)).slice(0, 2000));
    this.changed();
  }
  reverify() { if (this.hideRaw) this.receiveHide(this.hideRaw); }

  // Maps to show: sort 'top' (likes, then newest) or 'new'.
  list(sort = 'top') {
    const me = low(this.social && this.social.tag);
    return [...this.maps.values()].filter((m) => !this.hidden.has(m.id) && !moderation.isGone(m.by))
      .map((m) => { const l = this.likes.get(m.id); return { ...m, likes: l ? l.size : 0, liked: !!(me && l && l.has(me)), mine: low(m.by) === me }; })
      .sort((a, b) => (sort === 'top' ? b.likes - a.likes : 0) || b.ts - a.ts);
  }

  // Publishes a map (again under the same id if you published one with this name before).
  async publish(map) {
    const s = this.social;
    if (!s || !s.tag) throw new Error('Get a gamertag first (Friends) to publish maps.');
    const mb = moderation.myLimit('maps'); // staff banned you from publishing (moderation.js LIMITS)
    if (mb) throw new Error(`Staff banned you from publishing maps${mb.until ? ' until ' + new Date(mb.until).toLocaleString() : ''}: ${mb.reason}`);
    const m = cleanMap(map);
    if (!m.boxes.length) throw new Error('Draw something first!');
    const ids = store.get('cmapIds', {}), tag = low(s.tag);
    let id = ids[m.name];
    if (!id || !ID_RE.test(id) || !id.startsWith(tag + '-')) id = tag + '-' + randId();
    const mine = [...this.maps.values()].filter((x) => low(x.by) === tag && x.id !== id);
    if (mine.length >= MAX_PUBLISHED) throw new Error(`You can publish up to ${MAX_PUBLISHED} maps. Remove one first.`);
    const signed = await s.sign({ map: m });
    s.relay.publish(MAP + id, signed, { retain: true });
    ids[m.name] = id;
    store.set('cmapIds', ids);
    await this.receiveMap(id, signed);
    return id;
  }
  // Takes one of your maps down.
  unpublish(id) {
    const s = this.social, m = this.maps.get(id);
    if (!s || !m || low(m.by) !== low(s.tag)) return;
    s.relay.publish(MAP + id, '', { retain: true });
    this.maps.delete(id);
    this.changed();
  }
  async like(id, on) {
    const s = this.social;
    if (!s || !s.tag) throw new Error('Get a gamertag first (Friends) to like maps.');
    const tag = low(s.tag), topic = LIKE + id + '/' + tag;
    if (on) { const signed = await s.sign({ like: id }); s.relay.publish(topic, signed, { retain: true }); await this.receiveLike(id, tag, signed); }
    else { s.relay.publish(topic, '', { retain: true }); await this.receiveLike(id, tag, ''); }
  }
  // Staff: hide a map from everyone's list.
  async hide(id) {
    const next = [...new Set([...this.hidden, id])];
    const signed = await this.social.sign({ ids: next });
    this.social.relay.publish(HIDE, signed, { retain: true });
    await this.receiveHide(signed);
  }
}

export const community = new Community();

// A small top-down picture of a map.
function thumb(cv, map) {
  const g = cv.getContext('2d'), k = cv.width / (HALF_W * 2);
  g.fillStyle = { day: '#3f5a33', night: '#262a33', snow: '#dfe7ee', desert: '#c9ab78' }[map.theme] || '#333';
  g.fillRect(0, 0, cv.width, cv.height);
  for (const [x0, z0, x1, z1, y0, h, mat] of [...map.boxes].sort((a, b) => a[4] + a[5] - (b[4] + b[5]))) {
    g.fillStyle = mat === 'pad' ? '#27d3ff' : (EDIT_MATS.find((e) => e[0] === mat) || EDIT_MATS[0])[2];
    g.fillRect((x0 + HALF_W) * k, (z0 + HALF_D) * k, Math.max(1, (x1 - x0) * k), Math.max(1, (z1 - z0) * k));
  }
  for (const [x, , z, team] of map.spawns) { g.fillStyle = ['#4dff9a', '#ff4d5e', '#4da3ff'][team || 0]; g.fillRect((x + HALF_W) * k - 1.5, (z + HALF_D) * k - 1.5, 3, 3); }
}

// The browser, shown over the map editor. onPlay(map, mode), onCopy(map), toast(text).
export function openCommunity(host, { onPlay, onCopy, toast }) {
  community.start();
  let sort = 'top', mode = 'ffa';
  const el = document.createElement('div');
  el.className = 'cm-pane';
  host.appendChild(el);
  const close = () => { el.remove(); community.onChange = null; };
  const render = () => {
    const rows = community.list(sort), staff = roles.myCan('tools');
    el.innerHTML = `<div class="cm-head"><h3>🌍 Community maps</h3>
        <div class="seg"><button data-sort="top" class="${sort === 'top' ? 'sel' : ''}">♥ Top</button><button data-sort="new" class="${sort === 'new' ? 'sel' : ''}">New</button></div>
        <select class="cm-mode">${[['ffa', 'Free For All'], ['tdm', 'Team Deathmatch'], ['ctf', 'Capture the Flag'], ['gungame', 'Gun Game'], ['infection', 'Infection'], ['koth', 'King of the Hill'], ['prophunt', 'Prop Hunt']].map(([id, n]) => `<option value="${id}" ${id === mode ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <button class="ghost cm-close">✖ Close</button></div>
      <div class="cm-list">${rows.length ? rows.map((m) => `<div class="cm-row" data-id="${esc(m.id)}">
          <canvas width="120" height="88"></canvas>
          <div class="cm-info"><b>${esc(m.map.name)}</b><small>by <span class="pf-link" data-profile="${esc(m.by)}">${esc(m.by)}</span> · ${m.map.boxes.length} blocks · ${new Date(m.ts).toLocaleDateString()}</small></div>
          <button class="cm-like ${m.liked ? 'sel' : ''}" data-like title="${m.liked ? 'Unlike' : 'Like'}">♥ ${m.likes}</button>
          <button class="primary" data-play>▶ Play</button><button data-copy title="Open a copy in the editor">✎ Copy</button>
          ${m.mine ? '<button class="ghost" data-unpub title="Take it down">🗑</button>' : staff ? '<button class="ghost" data-hide title="Hide it from everyone (staff)">🚫</button>' : ''}
        </div>`).join('') : '<p class="note">No community maps yet. Build one and press 🌍 Publish!</p>'}</div>`;
    el.querySelectorAll('.cm-row').forEach((row) => {
      const m = community.maps.get(row.dataset.id);
      if (!m) return;
      thumb(row.querySelector('canvas'), m.map);
      row.querySelector('[data-play]').onclick = () => { close(); onPlay(m.map, mode); };
      row.querySelector('[data-copy]').onclick = () => { close(); onCopy(m.map); };
      row.querySelector('[data-like]').onclick = () => community.like(m.id, !row.querySelector('[data-like]').classList.contains('sel')).catch((e) => toast(e.message));
      const un = row.querySelector('[data-unpub]');
      if (un) un.onclick = () => { if (confirm(`Take "${m.map.name}" down?`)) community.unpublish(m.id); };
      const hd = row.querySelector('[data-hide]');
      if (hd) hd.onclick = () => { if (confirm(`Hide "${m.map.name}" by ${m.by} from everyone?`)) community.hide(m.id); };
    });
    el.querySelectorAll('[data-sort]').forEach((b) => { b.onclick = () => { sort = b.dataset.sort; render(); }; });
    el.querySelector('.cm-mode').onchange = (e) => { mode = e.target.value; };
    el.querySelector('.cm-close').onclick = close;
  };
  let t = 0;
  community.onChange = () => { clearTimeout(t); t = setTimeout(render, 150); }; // many arrive at once
  render();
  return close;
}
