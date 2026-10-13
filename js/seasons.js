import { store } from './util.js';
import { addTokens, grantWrap, grantItem } from './missions.js';
import { onProgress } from './progress.js';
import { seasonNow, seasonDates } from './ranked.js';

// Seasons: a free 30-tier pass every week (dates in ranked.js). All XP you earn during the season
// fills it; each tier costs more than the last (tierXp). Every tier pays tokens; some give season-only wraps and banners that
// can't be bought. Reaching tier 30 earns that season's badge, kept forever.
// To add a season, add an entry to SEASONS (its wraps go in camos.js, banners in banners.js
// and missions.js COSMETICS.banner, all with `reward: true`). Seasons without an entry pay
// tokens only.

export const TIERS = 30;
// XP to go from tier t - 1 to tier t: 1,000 for tier 1, 100 more each tier (73,500 for all 30).
// Season 1 kept its flat 1,000 a tier.
export const tierXp = (t, n = 2) => (n <= 1 ? 1000 : 1000 + 100 * (t - 1));
export const tierFor = (xp, n) => { let t = 0; while (t < TIERS && xp >= tierXp(t + 1, n)) xp -= tierXp(++t, n); return { tier: t, into: xp }; };
export const tierTokens = (tier) => (tier % 5 === 0 ? 100 : 40);

export const SEASONS = {
  1: {
    name: 'Ignition', color: '#ff7a2a',
    items: {
      5: { kind: 'wrap', id: 's1_spark' },
      10: { kind: 'banner', id: 's1' },
      15: { kind: 'wrap', id: 's1_volt' },
      20: { kind: 'wrap', id: 's1_gold' },
      25: { kind: 'banner', id: 's1elite' },
      30: { kind: 'wrap', id: 's1_prism' },
    },
  },
  2: {
    name: 'Frostbite', color: '#6fd8ff',
    items: {
      5: { kind: 'wrap', id: 's2_frost' },
      10: { kind: 'banner', id: 's2' },
      15: { kind: 'wrap', id: 's2_aurora' },
      20: { kind: 'wrap', id: 's2_glacier' },
      25: { kind: 'banner', id: 's2elite' },
      30: { kind: 'wrap', id: 's2_prism' },
    },
  },
};

// Seasons after the ones above take a name and color from this list (tokens and the badge only).
const WEEKLY = [
  { name: 'Overdrive', color: '#ff4a6a' }, { name: 'Blackout', color: '#8a7dff' }, { name: 'Wildfire', color: '#ff8a1a' },
  { name: 'Riptide', color: '#2ad1c9' }, { name: 'Venom', color: '#7ce03a' }, { name: 'Eclipse', color: '#c86bff' },
  { name: 'Sandstorm', color: '#e0b25a' }, { name: 'Thunderclap', color: '#ffe14a' }, { name: 'Nightfall', color: '#4a7dff' },
  { name: 'Ironclad', color: '#9fb0c2' }, { name: 'Inferno', color: '#ff3a1a' }, { name: 'Glacier', color: '#9ae6ff' },
];

export function seasonAt(t = Date.now()) {
  const n = seasonNow(t), { start, end } = seasonDates(n);
  const def = SEASONS[n] || { ...WEEKLY[(n - 3) % WEEKLY.length], items: {} };
  return { n, start, end, ...def };
}

class Seasons {
  constructor() {
    this.onTier = null; // ({ tier, tokens, item }) for the toast
    this.load();
    onProgress((e) => { if (e.type === 'xp') this.add(e.amount); });
  }

  load() {
    const s = seasonAt(), saved = store.get('season', null);
    this.state = saved && saved.n === s.n ? saved : { n: s.n, xp: 0, tier: 0 };
  }

  info() {
    if (seasonAt().n !== this.state.n) this.load();
    const s = seasonAt(), { tier, into } = tierFor(this.state.xp, s.n), done = tier >= TIERS;
    const need = done ? 0 : tierXp(tier + 1, s.n);
    return { ...s, xp: this.state.xp, tier, into: done ? 1 : into, need: done ? 1 : need, done };
  }

  add(xp) {
    if (seasonAt().n !== this.state.n) this.load();
    this.state.xp += xp;
    const s = seasonAt(), { tier } = tierFor(this.state.xp, s.n);
    while (this.state.tier < tier) {
      const t = ++this.state.tier;
      const item = s.items[t] || null;
      addTokens(tierTokens(t));
      if (item) { if (item.kind === 'wrap') grantWrap(item.id); else grantItem(item.kind, item.id); }
      if (t === TIERS) {
        const badges = store.get('seasonBadges', []);
        if (!badges.includes(s.n)) store.set('seasonBadges', [...badges, s.n]);
      }
      if (this.onTier) this.onTier({ tier: t, tokens: tierTokens(t), item, season: s });
    }
    store.set('season', this.state);
  }

  badges() { return store.get('seasonBadges', []); }
}

export const seasons = new Seasons();
