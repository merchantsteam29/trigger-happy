import { esc, store } from './util.js';
import { ACH, ACHIEVEMENTS, TIER_COLOR, achievements } from './achievements.js';
import { bannerOf } from './banners.js';
import { WEAPONS } from './weapons.js';
import { divisionOf, PLACEMENTS } from './ranked.js';

// Player cards: your profile (profiles.js) shown as a card with your character in your outfit,
// a title (one of your achievements), four stats you pick, your best gun, ranked division,
// showcased achievements and season badges. Set it up in Character → Player card; it can be
// saved as an image to share. Everyone sees it when they click your gamertag.

export const CARD_STATS = {
  kills: { name: 'Kills', v: (p) => p.kills.toLocaleString() },
  kd: { name: 'K/D', v: (p) => (p.kills / Math.max(1, p.deaths)).toFixed(2) },
  wins: { name: 'Wins', v: (p) => p.wins.toLocaleString() },
  winrate: { name: 'Win rate', v: (p) => (p.matches ? Math.round((p.wins / p.matches) * 100) + '%' : '–') },
  matches: { name: 'Matches', v: (p) => p.matches.toLocaleString() },
  heads: { name: 'Headshots', v: (p) => p.heads.toLocaleString() },
  hsrate: { name: 'Headshot %', v: (p) => (p.kills ? Math.round((p.heads / p.kills) * 100) + '%' : '–') },
  streak: { name: 'Best streak', v: (p) => p.streak },
  pk: { name: 'Player kills', v: (p) => (p.pk || 0).toLocaleString() },
  level: { name: 'Level', v: (p) => p.level || 1 },
};
export const DEFAULT_STATS = ['kills', 'kd', 'wins', 'streak'];
export const cleanCardStats = (a) => { const out = (Array.isArray(a) ? a : []).filter((k) => CARD_STATS[k]).slice(0, 4); return out.length === 4 ? out : DEFAULT_STATS; };
export const cleanTitle = (t) => (typeof t === 'string' && ACH[t] ? t : '');

// Your card setup: { title: achievement id or '', stats: [4 keys] }
export function myCard() {
  const c = store.get('card', {});
  const title = cleanTitle(c.title);
  return { title: title && achievements.unlocked[title] ? title : '', stats: cleanCardStats(c.stats) };
}
export function setMyCard(c) { store.set('card', { title: cleanTitle(c.title), stats: cleanCardStats(c.stats) }); }

// The card's HTML. p: a cleaned profile (profiles.js) with tag; extra: { rankName, badges (html), clan }
export function cardHtml(p, extra = {}) {
  const bn = bannerOf(p.banner || 'standard');
  const stats = cleanCardStats(p.stats);
  const title = p.title && ACH[p.title];
  const W = WEAPONS[p.fav];
  const dv = p.srPlayed ? divisionOf(p.sr) : null;
  return `<div class="pcard" style="--pc-bg:${bn.bg};--pc-acc:${bn.accent || '#ffb020'};--pc-c:${esc(p.color)}">
    <div class="pc-head">
      <canvas class="pc-av" width="120" height="157"></canvas>
      <div class="pc-id">
        ${title ? `<em class="pc-title" style="--tier:${TIER_COLOR[title.tier]}">${title.icon} ${esc(title.name)}</em>` : ''}
        <b class="pc-name">${extra.clan ? `<span class="pc-clan">[${esc(extra.clan)}]</span> ` : ''}${esc(p.name || p.tag)}</b>
        <small>@${esc(p.tag)}${extra.rankName ? ` · ${esc(extra.rankName)}` : ''} · Level ${p.level || 1}</small>
        <div class="pc-chips">${extra.badges || ''}</div>
      </div>
      <span class="pc-emblem">${bn.emblem || '★'}</span>
    </div>
    <div class="pc-stats">${stats.map((k) => `<div><b>${CARD_STATS[k].v(p)}</b><small>${CARD_STATS[k].name}</small></div>`).join('')}</div>
    <div class="pc-row">
      ${W ? `<div><small>Favorite gun</small><b>${esc(W.name)}</b><em>${p.favKills.toLocaleString()} kills</em></div>` : ''}
      ${dv ? `<div><small>Ranked</small><b style="color:${dv.color}">${dv.icon} ${esc(dv.name)}</b><em>${p.srPlayed >= PLACEMENTS ? p.sr + ' SR' : 'Placements'}</em></div>` : ''}
    </div>
    ${p.ach && p.ach.length ? `<div class="pc-ach"><small>Achievements · ${p.achN}/${ACHIEVEMENTS.length}</small><div>${p.ach.map((id) => `<span class="pf-achip" style="--tier:${TIER_COLOR[ACH[id].tier]}" title="${esc(ACH[id].desc)}">${ACH[id].icon} ${esc(ACH[id].name)}</span>`).join('')}</div></div>` : ''}
    ${p.seasons && p.seasons.length ? `<div class="pc-badges"><small>Season badges</small>${p.seasons.map((n) => `<span class="pf-sb">S${n}</span>`).join('')}</div>` : ''}
  </div>`;
}

// Draws the avatar into a card made by cardHtml. drawAvatar comes from settingsui.js.
export function paintCard(root, p, drawAvatar) {
  const cv = root.querySelector('.pc-av');
  if (cv && p.cos) drawAvatar(cv, p.cos, p.color);
}

// The card as a PNG (for sharing): drawn on a canvas, since a page can't screenshot itself.
export async function cardImage(p, drawAvatar, extra = {}) {
  const S = 2, w = 600, h = 340;
  const c = document.createElement('canvas');
  c.width = w * S; c.height = h * S;
  const g = c.getContext('2d');
  g.scale(S, S);
  const bn = bannerOf(p.banner || 'standard'), acc = bn.accent || '#ffb020';
  const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
  rr(0, 0, w, h, 22); g.clip();
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#120c22'); bg.addColorStop(0.55, '#1c1530'); bg.addColorStop(1, acc + '88');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = acc + '22';
  for (let i = -h; i < w; i += 26) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 10, 0); g.lineTo(i + 10 + h * 0.5, h); g.lineTo(i + h * 0.5, h); g.fill(); }
  g.fillStyle = acc; g.fillRect(0, 0, w, 5);
  // avatar
  const av = document.createElement('canvas'); av.width = 150; av.height = 196;
  if (p.cos) drawAvatar(av, p.cos, p.color);
  g.fillStyle = 'rgba(255,255,255,0.05)'; rr(22, 26, 160, 206, 16); g.fill();
  g.drawImage(av, 27, 31);
  // text
  const title = p.title && ACH[p.title];
  let y = 54;
  g.textBaseline = 'alphabetic';
  if (title) { g.font = '700 15px system-ui, sans-serif'; g.fillStyle = TIER_COLOR[title.tier]; g.fillText(`${title.icon} ${title.name}`.toUpperCase(), 204, y); y += 34; } else y += 8;
  g.font = 'italic 900 34px system-ui, sans-serif'; g.fillStyle = p.color || '#fff';
  g.fillText((extra.clan ? `[${extra.clan}] ` : '') + (p.name || p.tag), 204, y, 370);
  y += 24;
  g.font = '600 15px system-ui, sans-serif'; g.fillStyle = '#c9c2dd';
  g.fillText(`@${p.tag}${extra.rankName ? ' · ' + extra.rankName : ''} · Level ${p.level || 1}`, 204, y, 370);
  y += 22;
  const W = WEAPONS[p.fav], dv = p.srPlayed ? divisionOf(p.sr) : null;
  g.font = '600 14px system-ui, sans-serif'; g.fillStyle = '#e8e2f5';
  const line = [W ? `★ ${W.name} · ${p.favKills.toLocaleString()} kills` : '', dv ? `${dv.icon} ${dv.name}` : ''].filter(Boolean).join('    ');
  if (line) g.fillText(line, 204, y, 370);
  // stats
  const stats = cleanCardStats(p.stats);
  stats.forEach((k, i) => {
    const x = 204 + i * 94, sy = 168;
    g.fillStyle = 'rgba(255,255,255,0.07)'; rr(x, sy, 86, 64, 10); g.fill();
    g.textAlign = 'center';
    g.font = '800 22px system-ui, sans-serif'; g.fillStyle = '#fff'; g.fillText(String(CARD_STATS[k].v(p)), x + 43, sy + 32, 80);
    g.font = '700 10px system-ui, sans-serif'; g.fillStyle = '#e2dbf5'; g.fillText(CARD_STATS[k].name.toUpperCase(), x + 43, sy + 52, 80);
    g.textAlign = 'left';
  });
  // achievements
  let ax = 22;
  g.font = '700 13px system-ui, sans-serif';
  for (const id of p.ach || []) {
    const a = ACH[id]; if (!a) continue;
    const t = `${a.icon} ${a.name}`, tw = g.measureText(t).width + 20;
    g.fillStyle = 'rgba(255,255,255,0.08)'; rr(ax, 256, tw, 28, 14); g.fill();
    g.strokeStyle = TIER_COLOR[a.tier]; g.lineWidth = 1.5; rr(ax, 256, tw, 28, 14); g.stroke();
    g.fillStyle = '#fff'; g.fillText(t, ax + 10, 275);
    ax += tw + 8;
  }
  if (p.seasons && p.seasons.length) { g.fillStyle = '#ffd23a'; g.font = '800 12px system-ui, sans-serif'; g.fillText(p.seasons.slice(-8).map((n) => 'S' + n).join(' · ') + ' badges', 22, 312); }
  g.textAlign = 'right'; g.font = 'italic 900 15px system-ui, sans-serif'; g.fillStyle = acc;
  g.fillText('TRIGGER HAPPY', w - 20, h - 18);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
