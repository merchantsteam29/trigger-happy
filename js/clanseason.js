import { leaderboard, weekId, prevWeek } from './leaderboard.js';
import { clans } from './clans.js';

// Clan seasons: every week (the leaderboard's week, Monday 00:00 UTC) clans earn points from their
// members: 1 per kill and 10 per win (from the members' weekly leaderboard posts), plus 50 per
// clan war won that week (the clan record's `warWk`). Leaderboard → Clans ranks them; when the
// week ends the top 3 clans' members get tokens, and #1 also gets the Top Clan banner (main.js).

export const CLAN_POINTS = { kill: 1, win: 10, war: 50 };
export const CLAN_REWARDS = [300, 150, 75]; // tokens for each member of the #1, #2 and #3 clan

const low = (s) => String(s || '').toLowerCase();

// One clan's points for a week ('cur' or 'prev'): { total, kills, wins, wars, members: [{ tag, pts }] }
export function clanPoints(c, which = 'cur') {
  const e = leaderboard.entries[which] || new Map();
  const week = which === 'prev' ? prevWeek() : weekId();
  const members = c.members.map((m) => {
    const x = e.get(low(m)) || {};
    const kills = Math.max(0, x.kills || 0), wins = Math.max(0, x.wins || 0);
    return { tag: m, kills, wins, pts: kills * CLAN_POINTS.kill + wins * CLAN_POINTS.win };
  }).filter((m) => !leaderboard.isHidden(m.tag)).sort((a, b) => b.pts - a.pts);
  const kills = members.reduce((n, m) => n + m.kills, 0), wins = members.reduce((n, m) => n + m.wins, 0);
  const wars = Math.max(0, Math.min(50, (c.warWk && c.warWk[week]) || 0));
  return { total: kills * CLAN_POINTS.kill + wins * CLAN_POINTS.win + wars * CLAN_POINTS.war, kills, wins, wars, members };
}

// The week's clan board: [{ tag: '[TAG] Name', clan, value, me, rank }]
export function clanStandings(which = 'cur') {
  const mine = clans.myClan();
  return clans.list().map((c) => ({ tag: `[${c.tag}] ${c.name}`, clan: c.tag, color: c.color, value: clanPoints(c, which).total, me: !!mine && mine.tag === c.tag }))
    .filter((r) => r.value > 0).sort((a, b) => b.value - a.value || a.clan.localeCompare(b.clan)).map((r, i) => ({ ...r, rank: i + 1 }));
}
