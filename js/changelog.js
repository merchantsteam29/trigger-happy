import { esc } from './util.js';
import { bannerHtml } from './banners.js';
import { APP_VERSION } from './version.js';

// Update history (Settings → 📜 Updates): newest first. Each update shows its name on a banner
// (banners.js id) that fits its theme, with the new features under it. `v` is the release that
// finished the update; small releases are grouped into one update. Add an entry with each release
// that players would notice (keep the hidden feature out, see CLAUDE.md).
export const UPDATES = [
  { v: '2026.10.12.9', name: 'Halloween', banner: 'hol_halloween', notes: [
    "Halloween event from Oct 24 to 31: a dusky purple sky and 10 glowing jack-o'-lanterns hidden near the spawns in every match",
    'Shoot them to smash them, and smash 31 for the new Pumpkin Smasher achievement',
    'Play a match during the event for the Halloween banner and 150 tokens',
  ] },
  { v: '2026.10.12.8', name: 'Crosshair Editor', banner: 'neon', notes: [
    'Make your own crosshair in Settings > HUD & Audio, with a live preview',
    'Pick a shape (cross, T, circle or dot only), then line length, thickness, gap, outline and color',
    'Choose whether it spreads while you move and jump, or stays put',
  ] },
  { v: '2026.10.12.7', name: 'Update History', banner: 'galaxy', notes: [
    'New in Settings: 📜 Updates shows every update so far, each with its own banner and everything that was new',
  ] },
  { v: '2026.10.12.6', name: 'Power Up', banner: 'gold', notes: [
    'Power weapons are now real power weapons: gold, pickup-only and much stronger than any loadout gun',
    'New: Gatling Cannon, Rail Cannon, Hellfire Launcher and Thunder Shotgun',
    'No reloading: when they run dry you get your own gun back, and you lose them when you die',
  ] },
  { v: '2026.10.12.5', name: 'Linked Devices', banner: 'matrix', notes: [
    'Play your account on more than one device: Friends → Your devices → Link a device, then scan the code',
    'Level, tokens, items and stats stay in sync between linked devices',
  ] },
  { v: '2026.10.12.4', name: 'Share It', banner: 'sunset', notes: [
    'New Share button at the top of the menu: the game\'s link as a QR code that friends scan with their phone',
    'With a gamertag it\'s your invite link, so you both get tokens',
  ] },
  { v: '2026.10.12.3', name: 'Dress Up', banner: 'candy', notes: [
    'New cosmetics: Hard Hat, Graduation Cap, Unicorn Horn, Pumpkin Head, Curly and Braids hair, Smiley Mask, VR Headset, Teddy Bear and Toy Rocket',
    'New banners: Candy Stripe, Trigger Happy, Thunderstorm and Vaporwave',
  ] },
  { v: '2026.10.12.2', name: 'Server Cleanup', banner: 'carbon', notes: [
    'Servers that have closed no longer linger in the server list, and Quick Play skips them',
    'Hosting: if the connection players join through drops, your server reconnects by itself',
  ] },
  { v: '2026.10.12.1', name: 'Trigger Happy', banner: 'happy', notes: [
    'Gun Game 3D is now Trigger Happy! New name, new icon and a brand-new look for every menu and the HUD',
    'Menu sections are now tabs along the top, with keyboard and mouse help at the bottom of the screen',
  ] },
  { v: '2026.10.10.14', name: 'Parkour', banner: 'storm', notes: [
    'Climb onto ledges by jumping at them',
    'Wall-run by sprint-jumping along walls, and jump again to kick off',
  ] },
  { v: '2026.10.10.13', name: 'Lights Out', banner: 'blood', notes: [
    'New horror mode: Infection in the dark with fog, rain, lightning, flashlights and glowing-eyed zombies',
  ] },
  { v: '2026.10.10.12', name: 'Showtime', banner: 'neon', notes: [
    'Mode of the week: a new silly mode every Monday. Play 3 matches of it for bonus tokens',
    'Spectator mode: watch Game Night tournaments and Battle Royales live, with player markers, a live scoreboard and a free camera',
  ] },
  { v: '2026.10.10.10', name: 'Clan Wars', banner: 'dragon', notes: [
    'Challenge another clan to a clan-vs-clan match; wins and losses go on your clan\'s record',
    'The top clan each week gets tokens and the Top Clan banner',
    'Clan sprays: clan leaders draw a pixel spray, members spray it on walls with X',
  ] },
  { v: '2026.10.10.8', name: 'Shop & Gifts', banner: 'diamond', notes: [
    'New Shop screen: every cosmetic, banner and wrap in one place, always the same stock',
    'Gifts: send tokens or buy items for your friends',
  ] },
  { v: '2026.10.10.7', name: 'Achievements', banner: 's1elite', notes: [
    'Achievements: 28 feats to unlock (Missions, Achievements tab). Show your best 3 on your profile',
    'Ranked season rewards: a banner for the best division you reach each season',
    'Aim trainer: a 60-second target challenge in the Practice Range, with its own leaderboard',
  ] },
  { v: '2026.10.10.5', name: 'Smarter Bots', banner: 'camo', notes: [
    'Bots match how good the players are, take cover when hurt, grab health, check corners and stick with their team',
    'Explosive barrels and breakable crates on every map. Shoot a barrel near enemies!',
    'Damage drop-off on every gun: the Minigun, DMR, snipers and Railgun lose some damage at long range',
    'Streamer mode hides server codes and other players\' names while you stream or record',
    'Report a bug: a button in the pause menu sends bug reports straight to the developer',
  ] },
  { v: '2026.10.09.16', name: 'Controller Update', banner: 'ocean', notes: [
    'Change any controller button in Settings, push-to-talk on the controller, PlayStation button names',
    'Switch who you watch with LB / RB, and skip the kill cam with any button',
    'Settings shows your time zone (from your device); the leaderboard resets on the right day',
  ] },
  { v: '2026.10.09.11', name: 'Holidays', banner: 'hol_diwali', notes: [
    'Holiday events for many faiths and cultures (Diwali, Hanukkah, Eid, Christmas, Lunar New Year, Vesak and more)',
    'Bonus XP and a free holiday banner for playing during each one',
  ] },
  { v: '2026.10.09.10', name: 'Battle Royale Nights', banner: 'galaxy', notes: [
    'Game Night Battle Royale: rounds every 30 minutes, announced 15 minutes ahead. One life, loot, and a closing storm',
    'Game Night tournament: knockout rounds and a 1v1 final in the last 30 minutes. The champion wins tokens and a wrap',
    'Game Night voice chat: talk with everyone in the Game Night server',
  ] },
  { v: '2026.10.09.7', name: 'Zombie Survival', banner: 'toxic', notes: [
    'Co-op waves of zombies that get bigger, tougher and faster',
    'Downed players come back when the wave is cleared, and every 5th wave brings a Brute',
  ] },
  { v: '2026.10.09.6', name: 'Kill Cam & Pings', banner: 'flames', notes: [
    'Kill cam: when you die, watch the last few seconds from your killer\'s eyes',
    'Pings in team modes: press Z (D-pad up / 📍 on touch) to mark an enemy or a spot for your team',
    'Leaderboard: All time tab, and the top players in each game mode',
    'Accessibility: colorblind modes (including Grayscale) and sound captions with an arrow to where sounds came from',
    'Blood effects setting, and joining tells you if you or the host need to update',
  ] },
  { v: '2026.10.08.42', name: 'Fair Play', banner: 'rks_elite', notes: [
    'Anti-cheat: shots faster than a gun can fire are dropped, and teleport / speed hacks don\'t count',
    'Hits through solid walls are counted; repeat cheaters get auto-reported to staff',
    'Fewer false reports: kills on bots no longer count toward suspicious-stats flags',
    'Permanently banned players are removed from leaderboards, clans and friend lists, and their gamertag is freed',
  ] },
  { v: '2026.10.08.40', name: 'Animations', banner: 'vapor', notes: [
    'Weighty first-person recoil that differs per weapon type, and your gun sways when you turn, jump and land',
    'Players dip their hips on each step, lean into runs, breathe when standing and kick back when firing',
    'Menus slide in, cards lift when you hover, and the results screen reveals itself step by step',
  ] },
  { v: '2026.10.08.36', name: 'New Look', banner: 'rainbow', notes: [
    'A cleaner menu with a top bar, a side menu and a wider layout',
    'New Play screen with a big Quick Play card, and a new Character screen with tabs for every kind of item',
    'Missions in tabs, a tabbed pause menu, and a restyled HUD, scoreboard and results screen',
    'Phones: swipeable rows and less crowded screens',
  ] },
  { v: '2026.10.08.29', name: 'Highlights', banner: 'tiger', notes: [
    'Your best moment of each match can be saved as a short video clip',
    'Watch it on the results screen, save it or share it (Settings > Video > Record highlight clips)',
  ] },
  { v: '2026.10.08.24', name: 'Easy Start', banner: 'standard', notes: [
    'Tutorial for new players: 11 quick steps in the Practice Range, with 150 tokens for finishing it',
    'Low-end graphics mode for school laptops and old phones',
    'Auto resolution keeps matches smooth, and the game loads faster',
  ] },
  { v: '2026.10.08.22', name: 'Feel & Sound', banner: 'rks_contender', notes: [
    'Damage direction arcs, a heartbeat at low health, and ragdoll-style deaths',
    'Sounds behind you are duller and far-away shots echo, so you can tell where they came from',
    'Footsteps sound different on metal, wood, snow, grass and concrete, and you can hear enemies reloading',
  ] },
  { v: '2026.10.08.20', name: 'Ranked', banner: 'rks_legend', notes: [
    'Play Ranked finds a match near your skill rating (SR)',
    'Divisions from Rookie to Legend, 5 placement matches, and your rating change on the results screen',
  ] },
  { v: '2026.10.08.19', name: 'Three New Maps', banner: 'arctic', notes: [
    'Sky Islands: floating islands with bridges and jump pads (fall off and you die)',
    'Arctic Base: a big snowy research base with a frozen lake and a radar tower',
    'Neon Streets: night city blocks with a raised highway down the middle',
  ] },
  { v: '2026.10.08.18', name: 'Pickups & Rules', banner: 'rks_master', notes: [
    'Map pickups: health packs, ammo crates and a power weapon in the middle of the map',
    'Custom rules: weapon restrictions and one shot kills, with 12 presets like Moon knife fight and Chaos',
    'Save your own rule presets and share them with a code',
  ] },
  { v: '2026.10.08.16', name: 'Season 1: Ignition', banner: 's1', notes: [
    'Season pass: a free 30-tier pass every 6 weeks, with season-only wraps and banners',
    'Clans: create one with a [TAG], clan chat, and a Clans tab on the leaderboard',
    'Player profiles: click a gamertag to see their level, rank, K/D, wins and favorite gun',
    'Invite friends: when a new player joins through your link, you both get 200 tokens',
  ] },
  { v: '2026.10.08.12', name: 'Level Up', banner: 's1elite', notes: [
    'XP, levels and ranks, a daily login reward and 3 daily challenges',
    'Game Night: a set time when everyone plays together, and Quick Play to jump straight into a match',
    'Weekly leaderboard, with a trophy and the Weekly Champion wrap for last week\'s #1s',
    'Install the game as an app, and a featured mode of the day with bonus tokens',
  ] },
  { v: '2026.10.08.7', name: 'Wraps & Presets', banner: 'neon', notes: [
    'Weapon wraps in Customize: 3D preview, apply to one gun or all, 8 premium wraps',
    'Preset loadouts: 6 ready-made ones plus 3 slots to save your own',
    'Balance from player feedback: pistols no longer kill as fast as rifles, the Anti-Materiel Rifle is now the Heavy Sniper Rifle',
    'Banned players are kept out of matches, offensive gamertags are blocked, and chat spammers get auto-muted',
  ] },
  { v: '2026.10.07.9', name: 'Medals & Practice', banner: 'flames', notes: [
    'Medals: First Blood, multi-kills, streaks, Headshot, Revenge, Longshot and more',
    'Match MVP card, next-map voting and weapon camos',
    'Practice Range: every weapon, moving targets and damage numbers',
    'New weapons: Flamethrower, Nailgun and the Frying Pan',
    'Watch your killer and teammates while you wait to respawn, and rebind any key',
  ] },
  { v: '2026.10.06.5', name: 'Staff Team', banner: 'gold', notes: [
    'GIGACHAD is the owner; owner and moderator badges show on names everywhere',
    'Report players from the pause menu, and staff announcements show at the top of the menu',
    'Banned players can send an appeal, and lobby and party chat have a filter',
  ] },
  { v: '2026.10.05.3', name: 'Gun Game 3D', banner: 'dragon', notes: [
    'The game got its first name: Gun Game 3D',
    'Every gun is back (31 to pick from), rebalanced, with attachments: optics, suppressors, mags, grips and lasers',
    'New HUD with a minimap, kill banners and an end-of-match podium',
    'Banners to collect, and 16 accessories like the Santa hat, samurai helmet and demon wings',
  ] },
  { v: '2026.10.04.9', name: 'Friends & Party', banner: 'ocean', notes: [
    'Gamertags, friends, party chat and party voice chat',
    'New modes: Domination, Tank Battle, Speed Demons, Railgun Arena',
    'New maps: Jungle Temple, Oil Rig, Subway',
  ] },
  { v: '2026.10.04.4', name: 'First Updates', banner: 'standard', notes: [
    'New modes: Capture the Flag, Bounty Hunter, Headshots Only, Big Heads, and new maps: Castle, Airplane Hangar, Shopping Mall',
    'The game tells you when an update is out and refreshes itself',
    'Remade gun models, see-through scopes, better headshots and smoother movement',
    'Controller support for every menu and match',
  ] },
];

const dateOf = (v) => {
  const [y, m, d] = v.split('.').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// The pop-up (index.html #chl-pop), opened from Settings.
export function openUpdates() {
  const latest = UPDATES[0];
  document.getElementById('chl-list').innerHTML = UPDATES.map((u) => `<article class="chl-item">
      ${bannerHtml(u.banner, u.name, '#fff', `${dateOf(u.v)} · v${u.v}`, u === latest && latest.v === APP_VERSION ? '<span class="chip">NEW</span>' : '')}
      <ul>${u.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    </article>`).join('');
  document.getElementById('chl-pop').classList.remove('hidden');
  document.getElementById('chl-list').scrollTop = 0;
}

export function closeUpdates() { document.getElementById('chl-pop').classList.add('hidden'); }
export const updatesOpen = () => !document.getElementById('chl-pop').classList.contains('hidden');
