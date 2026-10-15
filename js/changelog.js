import { esc } from './util.js';
import { bannerHtml } from './banners.js';
import { APP_VERSION } from './version.js';

// Update history (Settings → 📜 Updates): newest first. Each update shows its name on a banner
// (banners.js id) that fits its theme, with the new features under it. `v` is the release that
// finished the update; small releases are grouped into one update. Add an entry with each release
// that players would notice (keep the hidden feature out, see CLAUDE.md).
export const UPDATES = [
  { v: '2026.10.14.26', name: 'Foundry', banner: 'storm', notes: [
    'New map: Foundry. Ride elevators up to the high decks and moving bridges out to the tower in the middle',
    'Moving platforms carry you (and the bots) along',
  ] },
  { v: '2026.10.14.25', name: 'Glass', banner: 'storm', notes: [
    'Building windows now have glass: see through it, then shoot it out. One shot shatters a pane',
    'Bots see through glass too, and shoot or barge their way through',
  ] },
  { v: '2026.10.14.24', name: 'Day and Night', banner: 'sunset', notes: [
    'Outdoor maps now have a day / night cycle: the sun sets, night falls and the sun comes back up during a match',
    'Hosts can turn it off in the Host panel',
  ] },
  { v: '2026.10.14.23', name: 'Clan Bases', banner: 'gold', notes: [
    'Every clan has a base: open it from your clan card for a private match on your own map',
    'Your clan tag in lights, your clan spray on the walls and your war record on a plaque',
    'Clan members get a Join button when someone opens it',
  ] },
  { v: '2026.10.14.22', name: 'Friend Challenges', banner: 'blood', notes: [
    'Challenge a friend to a race this week: first to so many kills, headshots, wins, matches or kills on real players',
    'You both see both progress bars, and the winner gets 100 tokens',
  ] },
  { v: '2026.10.14.21', name: 'Party Up', banner: 'neon', notes: [
    'Parties play together: when your party leader starts or joins a match, you follow them in automatically',
    'In team modes your party is always on the same team',
  ] },
  { v: '2026.10.14.20', name: '3D Character', banner: 'galaxy', notes: [
    'The Character screen shows your character in 3D, in what you wear or try on, with your gun and charm',
    'Play your emotes and victory pose from the buttons under it, and drag to turn it',
  ] },
  { v: '2026.10.14.19', name: 'Your Own Spray', banner: 'sunset', notes: [
    'Draw your own spray in Character → Spray, no clan needed. Press X in a match to spray it',
    'In a clan with a spray? Pick which one X sprays',
  ] },
  { v: '2026.10.14.18', name: 'Weapon Charms', banner: 'gold', notes: [
    'Weapon charms: a little keychain hanging off your guns that swings as you move and shoot',
    'Nine to pick from in the Shop, from a Rubber Duck to a Diamond. Everyone sees yours',
  ] },
  { v: '2026.10.14.17', name: 'Name Tags', banner: 'rainbow', notes: [
    'Name tags: style the name above your head. Gold, Ice, Toxic, Neon, Fire, Galaxy, Royal and an animated Rainbow',
    'Find them in the Shop, and pick yours in Character → Name tags',
  ] },
  { v: '2026.10.14.16', name: 'Match History', banner: 'galaxy', notes: [
    'Match history: your last 20 matches with your place, kills, deaths, K/D and score',
    'Watch the replay of any of your last 5 right from the list',
  ] },
  { v: '2026.10.14.15', name: 'Your Reports', banner: 'matrix', notes: [
    'Friends → Your reports shows the players you reported and whether the staff have looked at it yet',
    'You get a thank-you pop-up when they do',
  ] },
  { v: '2026.10.14.14', name: 'Moderation Tools', banner: 'matrix', notes: [
    'New tools for the staff to keep chat friendly',
  ] },
  { v: '2026.10.14.13', name: 'Replays for Staff', banner: 'matrix', notes: [
    'Anti-cheat flags now come with a replay of the last 30 seconds for the staff, following the flagged player',
  ] },
  { v: '2026.10.14.12', name: 'Smarter Bots', banner: 'storm', notes: [
    'Bots throw frag grenades where you just took cover',
    'Bots go for high ground, ride ziplines, and better bots use a grappling hook to get up walls',
  ] },
  { v: '2026.10.14.11', name: 'Ranked Revival', banner: 'blood', notes: [
    'Ranked now puts everyone on the busiest ranked server, so you play real people instead of waiting with bots',
    'The Ranked tile shows how many are playing ranked right now',
    'Weekly reward: 5 ranked matches = 300 tokens. Ranked Hour every day: +50 tokens per ranked match',
    'New ♛ Ranked leaderboard: the top 100 by SR, for everyone or one division',
  ] },
  { v: '2026.10.14.10', name: 'Smoother Replays', banner: 'galaxy', notes: [
    'Replays are smooth now, and show every shot with tracers and sounds, grenades and explosions',
    'Replays on the home screen keeps your last 5 matches, even after closing the game',
    'Save clip records what you\'re watching as a video. The follow camera no longer goes inside walls',
  ] },
  { v: '2026.10.14.9', name: 'Replay Theater', banner: 'galaxy', notes: [
    'Watch your last match from the home screen: follow any player, see through their eyes or fly a free camera',
    'Timeline, pause and speeds from 0.25× to 4×, with the kill feed',
    'Reports now include a replay of the last 30 seconds for the staff',
  ] },
  { v: '2026.10.14.8', name: 'Tournament Brackets', banner: 'blood', notes: [
    'Hosts can start a 1v1 bracket tournament from the Host panel: up to 8 players, bots count',
    'Each match is a Duel to 3. Everyone else watches, with the bracket on screen, until the final crowns a champion',
  ] },
  { v: '2026.10.14.7', name: 'Clan Seasons', banner: 'gold', notes: [
    'Clan seasons: every week clans score points from their members (1 per kill, 10 per win, 50 per clan war won)',
    'The top 3 clans each week get tokens (300 / 150 / 75 each), and #1 the Top Clan banner',
    'Your clan card shows your rank, points and what each member added',
  ] },
  { v: '2026.10.14.6', name: 'Community Maps', banner: 'rainbow', notes: [
    'Publish your editor maps for everyone (Map editor → 🌍 Publish)',
    'Community maps lists every player\'s maps by likes or newest: play one, copy it to edit, or ♥ like it',
  ] },
  { v: '2026.10.14.5', name: 'Two New Maps', banner: 'sunset', notes: [
    'Skyline: a sunset city with rooftops linked by ziplines. Press E under a cable to ride it',
    'Farmstead: a barn with hay lofts, silos, farmhouses and a cornfield',
  ] },
  { v: '2026.10.14.4', name: 'Editor Upgrades', banner: 'sunset', notes: [
    'Map editor: ramps, jump pads, and health, ammo and power weapon pickups',
    'Spawns can be red or blue: team modes spawn each team on its own side',
    'Play your map in Capture the Flag too (the bases go at the red and blue spawns)',
  ] },
  { v: '2026.10.14.3', name: 'Breakable Walls', banner: 'blood', notes: [
    'Windows and some doorways on 9 maps are boarded up with wooden planks. Shoot them or blow them up to open a new way in',
    'Bots barge straight through boards in their way',
    'Every board is back at the start of the next match. Hosts can turn them off in the Host panel',
  ] },
  { v: '2026.10.14.2', name: 'Training Courses', banner: 'neon', notes: [
    'The Practice Range has 5 training courses: Gridshot, Flick, Tracking, Speed run and a Movement course',
    'Speed run and Movement are timed: clear 20 targets, or run and jump through 10 rings, as fast as you can',
    'The leaderboard\'s Training board ranks the best score in each course (the old Aim trainer is Gridshot)',
  ] },
  { v: '2026.10.14.1', name: 'Spectator Camera', banner: 'matrix', notes: [
    'Watch any server that allows it: 👁 Watch in Find Servers, or type a code and press 👁. Viewers take no player slot',
    'Free camera (F): fly anywhere, mouse wheel sets the speed. R watches through a player\'s eyes, H hides the HUD',
    'Hosts can turn spectators off in Create server or the Host panel',
  ] },
  { v: '2026.10.13.9', name: 'Player Cards', banner: 'galaxy', notes: [
    'Profiles are now player cards: your character in your outfit, a title, your stats, favorite gun and ranked division',
    'Set yours up in Character → Player card: pick a title from your achievements and the four stats to show',
    'Save image downloads your card as a picture to share',
  ] },
  { v: '2026.10.13.8', name: 'Victory Poses', banner: 'gold', notes: [
    'The match MVP now steps onto a stage at the end and does their victory pose for everyone',
    'Everyone has Cheer. Eight more in the Shop: Flex, Finger Guns, Dab, Heart Hands, Take a Bow, Floss, Spin Jump and Levitate',
    'Pick yours in Character → Victory poses',
  ] },
  { v: '2026.10.13.7', name: 'Kill Effects', banner: 'rainbow', notes: [
    'Kill effects: a burst where your victim stood when you get a kill. Everyone in the match sees it',
    'Eight to pick from in the Shop: Confetti, Love Bomb, Pixel Burst, Lightning, Ember Burst, Spirit, Jackpot and Black Hole',
    'Wear one in Character → Kill effects',
  ] },
  { v: '2026.10.13.6', name: 'Weather', banner: 'storm', notes: [
    'Matches can have rain, fog or a thunderstorm. Servers roll it each match, or the host picks one',
    'Rain stops when you are under a roof. Storms darken the map, with lightning and thunder',
    'Settings: Weather effects turns off the rain and lightning flashes (the fog stays)',
  ] },
  { v: '2026.10.13.5', name: 'Server Filters', banner: 'matrix', notes: [
    'Find Servers can filter by mode, ping, With friends and Not full',
    'Check ping measures your real ping to every server in the list',
    'Servers your online friends are playing on show their names',
  ] },
  { v: '2026.10.13.4', name: 'Bot Difficulty', banner: 'blood', notes: [
    'Create server has a Bot difficulty: Auto, Easy, Normal, Hard, Expert or Nightmare',
    'Nightmare bots react almost instantly and go for the head',
    'In the Host panel, the difficulty picker now changes every bot at once (and the ones that join later)',
  ] },
  { v: '2026.10.13.3', name: 'Weekly Seasons', banner: 'storm', notes: [
    'Seasons are now one week long: a new season starts every Monday. Season 1 ends Monday 19 October, then Season 2 Frostbite',
    'The season pass is harder to finish: each tier needs 100 XP more than the one before (73,500 XP for all 30)',
    'Kills on bots give 30 XP instead of 100. Kills on real players still give 100',
    'Ranked seasons are weekly too, so you can earn ranked banners every week',
    '7 new missions and 7 new achievements for the long haul, including kills on real players only',
  ] },
  { v: '2026.10.13.2', name: 'Map Editor', banner: 'neon', notes: [
    'Build your own map: 🛠 Map editor in the menu. Draw blocks, stairs and spawn points from above',
    'Pick materials, heights and a theme (Day, Night, Snow or Desert). Save up to 5, or share one as a code',
    'Press Play to host a private server on your map. Everyone who joins gets it too',
  ] },
  { v: '2026.10.13.1', name: 'Snowball Fight', banner: 'arctic', notes: [
    'New mode: Snowball Fight. Red vs Blue with nothing but snowballs',
    'Lob them at the other team: three hits knock someone out. First team to 40',
  ] },
  { v: '2026.10.12.18', name: 'Search & Destroy', banner: 'flames', notes: [
    'New mode: Search & Destroy. Red vs Blue rounds with one life, and the sides swap every round',
    'Attackers plant the bomb at A or B (hold E). Defenders stop them or defuse it in 35 seconds',
    'First team to win 4 rounds takes the match',
  ] },
  { v: '2026.10.12.17', name: 'Haunted Manor', banner: 'galaxy', notes: [
    'New map: Haunted Manor. A dark manor at night with three rooms and a roof terrace up the outside stairs',
    'Graveyards with a walk-in crypt on both sides, hedges, a pumpkin patch and dead trees',
  ] },
  { v: '2026.10.12.16', name: 'Loadout Codes', banner: 'ocean', notes: [
    'Share your loadout as a code: Loadout > Share code copies it, with attachments and wraps',
    'Friends paste it with Use code to get the same loadout',
  ] },
  { v: '2026.10.12.15', name: 'Hit Sounds', banner: 'vapor', notes: [
    'Pick your hit sound (Classic, Ding, Click, Thud or Off) and kill sound (Classic, Bell, Chime, Boom or Off)',
    'In Settings > HUD & Audio. You hear each one when you pick it',
  ] },
  { v: '2026.10.12.14', name: 'Duel', banner: 'blood', notes: [
    'New mode: Duel. 1v1, first to 5',
    'Every kill starts a new round: you both respawn far apart with the same new random loadout',
    'Fill with bots gives you exactly one opponent',
  ] },
  { v: '2026.10.12.13', name: 'Emotes', banner: 'rainbow', notes: [
    'Press B in a match, then 1 to 4: wave, dance, salute or laugh',
    'Everyone else sees your character do it, with the emoji over your head',
  ] },
  { v: '2026.10.12.12', name: 'Match Report', banner: 'carbon', notes: [
    'The results screen now shows Your match: kills, damage dealt, accuracy and headshot kills',
    'Plus your top guns, with kills, damage and hit rate for each',
  ] },
  { v: '2026.10.12.11', name: 'Prop Hunt', banner: 'tiger', notes: [
    'New mode: Prop Hunt. Props hide as a crate, barrel, box, traffic cone or tires (press R to switch)',
    'Hunters are blind for the first 25 seconds, then search. Every miss costs a hunter health',
    'Found props join the hunters. Props win if any are still hidden when time runs out',
  ] },
  { v: '2026.10.12.10', name: 'Grappling Hook', banner: 'camo', notes: [
    'New utility: the Grappling Hook. Aim at a wall or ledge and throw it (G) to get pulled there',
    'Jump to let go early. 3 charges, and one comes back every 6 seconds',
    'Everyone can see your rope',
  ] },
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
