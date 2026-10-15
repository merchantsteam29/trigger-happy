# Trigger Happy (formerly Gun Game 3D): notes for developers and AI agents

A browser multiplayer FPS. Plain HTML + ES modules + Three.js 0.160 (import map from a CDN), no
build step, no backend: matches are peer-to-peer and everything persistent goes over free public
MQTT relays, signed by the players' own keys.

- Live: https://merchantsteam29.github.io/trigger-happy/ (GitHub Pages from `main`). Repo: `merchantsteam29/trigger-happy`. The old address is a separate redirect repo, `Gun-game-fun`.
- Owner: gamertag **GIGACHAD** (GitHub `merchantsteam29`). The owner decides features and pushes.
- Player-facing docs: `README.md`. This file is for whoever changes the code.

## Working agreement (read first)

- **Commit, never push.** The owner pushes with GitHub Desktop ("Push origin"). Make one commit per
  feature, end the message with the `Co-Authored-By` line your tool asks for, and tell the owner to push.
- **If git says "Author identity unknown"**, commit with
  `git -c user.name=merchantsteam29 -c user.email=ciasfrenzer@gmail.com commit ...` (the identity on
  every earlier commit). Don't write git config.
- **Every release bumps the version** (`node tools/release.mjs`, below). Players' games update
  themselves from `version.json`, and the notes in it are shown to players.
- **Players see the update history** (Settings → 📜 Updates, `UPDATES` in `js/changelog.js`). **One big log per
  batch, never one entry per feature** (the owner insists): each feature is a `'## Feature name'` heading note followed by its
  notes. While building a batch of features, add each one to the top entry and bump its `v` to the new version. A new batch
  gets a new entry with a **new banner** made for it in `banners.js` (also sold in the shop, `COSMETICS.banner` in missions.js).
- **Test before committing**, in a browser, against a local server.
- **Keep tests private.** Host test matches as *Private*. Never publish test data (reports, gifts,
  leaderboard posts, clan records, server listings) to the public relays. See "Testing" for how to stub them.
- **Don't** enter real credentials, create accounts, or touch real players' data.
- Changes to moderation / staff features: the owner's key is required in real use. In tests, stub
  `roles` in memory and block relay publishes.
- **Hidden feature:** `js/showroom.js` is a secret the owner doesn't want advertised. Don't describe it
  in `README.md`, release notes or commit titles shown to players. Use "Small fixes and polish" for its updates.

### Owner preferences (standing decisions)

- **GIGACHAD owns every cosmetic and wrap**, including ones added later. It's a check in `missions.js` (`isOwned` /
  `ownsWrap` ask `roles.isOwner()`), not a grant, so new items need nothing extra. Achievements use `isEarned` (real ownership).
- **No weapon mastery** (per-gun levels / unlock tracks / mastery camos). Ever.
- **New features don't give XP.** Reward with leaderboards, badges (achievements) or tokens. The
  existing XP / level / season system stays as it is. The Leaderboard shows no XP board.
- **The shop never rotates.** No weekly / daily stock, no timers, nothing leaves the shop.
- **No Discord** integration.
- **No interface languages.** A translation feature was added and then removed at the owner's request.
- Times follow the device's time zone (no in-game time zone picker; Settings shows the zone).
- Game Night events: Battle Royale every 30 minutes (warned 15 min before), and a tournament in the
  last 30 minutes (warned 10 min before, wording: "10 MINS UNTIL TOURNAMENT. LEAVE SOON IF YOU DON'T WANT TO PARTICIPATE").

## Run, check, release

```bash
node serve.js                      # http://localhost:8080 (any static server works; no file://)
node tools/check.mjs               # syntax of every js file, version.json files list, modulepreload lines
node tools/release.mjs 2026.10.10.15 "Player-facing note" ["Another note"]
```

- Version format `YYYY.MM.DD.N`, where N counts up within the day. `release.mjs` sets `js/version.js` and
  `version.json`, replaces the notes, adds new `js/*.js` files to the `files` list (the update
  cache), then runs the check.
- **A new `js/*.js` file also needs** `<link rel="modulepreload" href="js/NAME.js">` in `index.html`,
  placed **after** the import map. If it comes before the import map, `three` imports break. `check.mjs` tells you if one is missing.
- **Docs pass with every release:** in the same commit, make quick, targeted updates to `README.md` (anything players
  see) and this file (architecture, topics, module map, decisions, status) wherever the change makes them wrong or
  incomplete. Edit only the affected lines, and skip it when nothing documented changed.

## Architecture

### Matches: peer-to-peer, host-authoritative
- `net.js`: WebRTC via PeerJS (`probePing`: the server list's ping check, a `probe` / `pong` connection that takes no slot). The browser that creates a lobby is the **host**. It runs `HostLogic` (`host.js`)
  locally and relays between clients (lobby code = PeerJS id `whffa-v1-<CODE>`).
- `host.js` (`HostLogic`) holds the true game state: players, health, kills, scores, modes,
  bots, pickups, barrels/crates, zombies waves, the Battle Royale storm, the tournament, map votes,
  and anti-cheat (`AC`, `checkMove` / `checkRate` / `checkHit`, aim snaps `trackAim` / `checkSnap`, auto-flags to staff). It ticks at 20 Hz
  in a Worker timer, so background tabs keep running, and broadcasts a `snap` each tick.
- Clients (`game.js`) simulate their own movement and shooting (hitscan raycasts) and send intents.
  The host validates, applies damage and broadcasts the results.
- Client → host messages (`host.js` `handle`): `st` (state), `shot`, `hit`, `proj`, `boom`, `fx`,
  `prop`, `wall`, `ping`, `spray`, `vc`, `chat`, `vote`, `mods`, `cos`, `ident`, `staff`, `mod*`.
- Host → client messages (`game.js` `onNet`): `welcome`, `snap`, `spawn`, `dmg`, `hitc`, `kill`,
  `notice`, `start`, `end`, `settings`, `pjoin`, `pleave`, `loadout`, `pickup`, `propbreak`, `wallbreak`, `spray`,
  `ping`, `kicked` (with `reason`), `warend`, `tourney`, `vc`, `votes` / `voted`, staff messages.
- Spectators: `HostLogic.addSpectator` takes staff (signed proof, invisible) and viewers (`'watch'`, no slot, up to 30) when
  `watchable()` (host rule `watch`, never ranked / clan wars; Game Night events always). The camera is `game.js` `specCam`.
- Bots (`bot.js`) run inside the host (`p.bot`), with A* paths over `nav.js` and "Auto" skill that
  follows how real players are doing (`HostLogic.botSkill`). They throw frags (`throwNade`: the host sends `proj` / `boom`
  and applies the splash), grapple up to higher waypoints, ride ziplines (`wanderSpot` / `rideZip`) and like high ground.
- Modes are entries in `MODES` (`host.js`) with flags: `teams`, `redBlue`, `infect` (Infection
  rules), `prop` (Prop Hunt, `prophunt.js`), `duel`, `snd` (Search & Destroy: rounds, bomb, sites from the map's hills), `horror`, `br`, `event` (Game Night only, hidden from pickers), `coop`, `loadout`, `practice`.

### Public relays: everything that persists
- `relay.js` connects to free public MQTT brokers. Topics live under `whffa/v1/`, mostly **retained**.
  Anything that matters is **signed** with the player's device key (ECDSA; `social.sign` /
  `social.verify`, which looks up the signer's gamertag claim). Staff and owner messages are checked against
  `roles.js` (the owner's public key is hard-coded there).
- Data is self-reported (stats, tokens, cosmetics live in the player's localStorage), so the code
  caps what it accepts, and tokens are cosmetic-only.

| Topic (under `whffa/v1/`) | What | File |
|---|---|---|
| `tag/<tag>` | gamertag claims (public key) | social.js |
| `pres/<tag>`, `inbox/<tag>`, `req/…`, `acc/…`, `rm/…`, `party/<id>/…` | presence, friends, party, party chat and voice | social.js |
| `servers/<CODE>` | public server list (its own relay connection: `ServerAnnouncer`) | servers.js |
| `role/…` | moderator appointments (owner-signed) | roles.js |
| `modrec/<tag>`, `report/<id>`, `appeal/<tag>`, `announce`, `chatfilter`, `staffchat/…`, `permabans`, `suspects` (the staff's shared watchlist: `moderation.setSuspect`, alerts via `onSuspect` from presence; ban evasion: `altsOf` / `evaders` match the staff directory's claim keys `x` against banned players' keys), `shadowmutes` (staff-signed: hosts send their match chat back to them only, clients drop their party / clan chat), `pres/…` | moderation | moderation.js |
| `bug/<id>` | bug reports (only the owner reads them) | moderation.js |
| `evidence/<tag>-<id>` | a staff member's 60 s replay clip kept with a player's record (signed, retained; a record note's `clip` points at it: `moderation.saveEvidence` / `fetchEvidence`) | moderation.js |
| `approve/<id>` | a trial moderator's ban / unban request (signed, retained; the owner approves or denies, then clears it) | moderation.js |
| `lb/<week>/<tag>`, `lb/all/<tag>` (also `sr` / `srp` for the Ranked board), `lb/aim/<tag>`, `lb/hide` | weekly / all-time / training-course leaderboards (`aim`: Gridshot, `tr`: the other courses) | leaderboard.js |
| `prof/<tag>` | public profiles | profiles.js |
| `clan/<TAG>`, `clanreq/…`, `clanleave/…`, `clanchat/…`, `clanwar/…`, `clanwarok/…`, `clanwargo/<TAG>` | clans, clan wars | clans.js |
| `gift/<tag>/<id>` | gifts (claimed and cleared by the receiver) | gifts.js |
| `ref/…` | invite rewards | invites.js |
| `gamenight` | Game Night schedule (owner-signed) | gamenight.js |
| `repdone/<report id>` | staff-signed "reviewed" note for the reporter (they clear it once seen) | moderation.js |
| `fchal/<to>/<id>`, `fchalok/<id>`, `fchalp/<id>/<tag>` | friend challenges: the dare, the answer, each side's progress (signed, retained) | challenges.js |
| `replay/<report id>` | replay clip sent with a report (signed by the reporter, cleared on resolve) | moderation.js, replay.js |
| `cmap/<tag>-<id>`, `cmaplike/<id>/<tag>`, `cmaphide` | community maps (signed, retained; staff-signed hide list) | community.js |
| `link/<chan>/r`, `link/<chan>/a` | linking a device (not retained, encrypted with the QR's one-time secret) | devices.js |
| `sync/<id>/<device>` | linked devices' progress (retained, encrypted with a key derived from the account key) | devices.js |

Voice uses PeerJS calls (`whffa-v1-vc-<room>-<tag>`) with signed tokens (`voice.js`).

### Module map (`js/`)
- **Core:** `main.js` (menus, wiring, everything UI outside a match) · `game.js` (client match:
  input, movement, shooting, camera, effects, HUD feeding) · `host.js` (`HostLogic`) · `net.js` ·
  `physics.js` (boxes, `moveBody`, `raycast`) · `maps.js` (map data + scene build) · `nav.js`
- **Players and visuals:** `remote.js` (other players), `viewmodel.js` (first-person gun),
  `rig.js`, `models.js` / `guns.js` / `modelkit.js` (low-poly models), `cosmetics.js`, `camos.js`,
  `banners.js`, `effects.js`, `audio.js` (synthesized sounds), `radar.js`, `hud.js`, `medals.js`, `highlights.js`
- **Weapons and rules:** `weapons.js` (stats, `SLOTS`), `mods.js` (attachments), `rulesets.js` (rule presets),
  `modeweek.js`, `events.js` (Game Night event times), `holidays.js`
- **Progress and economy:** `progress.js` (XP, levels, daily), `missions.js` (stats, missions, tokens,
  owned cosmetics, `track.*`), `seasons.js` (weekly season pass; season dates live in `ranked.js` `seasonNow` / `seasonDates`), `achievements.js`, `ranked.js`, `shop.js`, `gifts.js`, `invites.js`
- **Social and online:** `relay.js`, `social.js`, `profiles.js`, `clans.js`, `leaderboard.js`, `servers.js`,
  `gamenight.js`, `voice.js`, `chat.js`
- **Staff:** `roles.js` (appointments; moderator permissions: `PERMS`, `ACT_PERM`, `roles.can(tag, perm, at)` / `myCan`, an appointment's `perms` list, none = all, and `trial` (`onTrial` / `myTrial`: their ban / unban / appeal answers become owner-signed requests at `approve/<id>`, `moderation.requestApproval` / `answerApproval`); checked by `moderation.verify` on a record's latest log entry, `staffSigned(text, perm)`, and the host's in-match `mod*` handlers), `moderation.js`, `modpanel.js`, `hostpanel.js`
- **Input and settings:** `settings.js` (`opts`, `setOpt`, `onOpts`), `settingsui.js`, `binds.js`, `gamepad.js`
  (rebindable `PAD_ACTIONS`), `touch.js`, `access.js` (colorblind modes), `tutorial.js`
- **Look:** `style.css` (base layout, HUD positions) with `ui.css` loaded after it (UI v3: tokens, menu shell, every
  screen's look). Classes and ids are shared with the JS, so restyle in `ui.css` and keep them. Icons: `icons/icon.svg` is the
  source; the PNGs (favicon, 192/512, maskable, apple-touch) are rendered from it. `icons/mark.svg` is the logo without its tile.
- **Other:** `updater.js` + `sw.js` (self-update and offline cache), `version.js`, `util.js` (`store`, `esc`), `qr.js` (QR code SVG for the Share button), `playercard.js` (player cards: the profile popup's card, `cardHtml` / `cardImage`; the title and stats you pick are saved as `card` and posted with your profile), `clanbase.js` (clan bases: `clanBaseMap` makes an editor-format map with a `clan` part that `editor.js` keeps and draws with `clanDecor`; opened from the clan card in `main.js`), `challenges.js` (friend challenges: weekly races between two friends, stats counted from when it's accepted, kept in `fchals`), `lobby.js` (the Character screen's live 3D preview: its own small renderer with a `RemotePlayer`, emote / pose buttons; mounted by `settingsui.js` customize), `charms.js` (weapon charms: cosmetic slot `charm`, hung on guns by `attachCharm` in `viewmodel.js` and `remote.js`, swinging with `swingCharm`), `nametags.js` (name tag styles: cosmetic slot `nametag`, drawn by `remote.js` `nameTag`, animated in `RemotePlayer.update`; plain in team modes; `owner` only shows when the host verified the owner role), `poses.js` (victory poses: cosmetic slot `pose`, shown on the end-of-match stage by `game.js` `startStage` with `RemotePlayer.setPose`), `killfx.js` (kill effects: cosmetic slot `killfx`, played in `game.js` `onKill` from the killer's cosmetics; `ICON_SLOTS` in missions.js are slots shown as icon cards), `devices.js` (linked devices: one account on several devices, progress sync), `changelog.js` (`UPDATES`: the update history in Settings → 📜 Updates), match history (`matchHistory`, last 20, written in `game.js` `trackMatchEnd`, linking `rec` to a saved replay's `at`), `replay.js` (replay theater: `Recorder` on `game.recorder` keeps every snapshot (Int16 rows), kills and shot / projectile / explosion events (`game.sendRec` records your own); the last 5 are saved in IndexedDB `th-replays`; `Theater` plays a recording back through `game.theater` with the spectator camera; `encodeClip` / `decodeClip` for report clips), `bracket.js` (custom 1v1 bracket tournaments from the Host panel: mode `bracket` (a Duel variant, not in `MODE_ORDER`), `HostLogic.bk`, only fighters spawn (guard in `spawn`), snapshot `bk`), `clanseason.js` (weekly clan points from members' leaderboard kills / wins and the clan record's `warWk` war wins; top 3 rewards in `main.js` `claimTopClan`), `community.js` (community maps: publish / like / hide editor maps, the browser over the map editor; subscribes only once opened), `movers.js` (moving platforms: a map's `movers` become boxes in `maps.js` `movers` that move on the host's clock (`updateMovers`, called by the client, the host tick and the replay theater); `carry` moves whoever stands on one), `ziplines.js` (a map's `ziplines` cables: built with the map, ridden client-side by `game.js` `updateZip` under the host's speed check), `walls.js` (breakables: `maps.js` puts glass (mat `glass`, 1 hp, see-through: `raycast(..., seeThrough)`) in windows and wooden boards (mat `boards`) in spare doorways, ids `brk`, the host keeps their health in `wallHp` and sends broken ids in snapshots as `wb`; bots' nav ignores boards and `botBreach` breaks them), `training.js` (Practice Range training courses: `Training` on `game.train`, bests in `trainBest`), `weather.js` (rain / fog / thunderstorm: the host's `weather` rule, rolled per match into settings `wx`; also the day / night cycle on `DAY_MAPS`: settings `dn` = the host time the match started, `Weather.applyDay` tints over the weather), `editor.js` (map editor: blocks, stairs, ramps, jump pads (mat `pad`), team spawns (`spawn(x, y, z, team)`, used by `pickSpawn` / `makeFlags`) and pickups (`MAPS.custom.pickups`, used by `setupPickups`); a hosted custom map
  travels in the settings as `customMap` and is registered as map `custom` by `registerCustomMap`)

### Where to add things
- **Party matchmaking:** a player's `cos.party` (their party id) makes `HostLogic.autoTeam` / `partyTeams` keep a party on one
  team; `social.onLeaderLobby` (main.js) follows the leader into matches.
- **Mode:** `MODES` and `MODE_ORDER` in `host.js`, the objective text in `game.js` `modeBar()`, the score
  label in `hud.js`, and kill handling in `HostLogic.kill` if it scores differently.
- **Setting:** default in `settings.js`, a row in `TABS` in `settingsui.js` (types: check, range, swatch, choice, special).
- **Weapon:** `weapons.js` (`WEAPONS` and `SLOTS`), a model in `guns.js`, a sound in `audio.js`. Power weapons (map pickups)
  are `power: true`, kept out of `SLOTS` and listed in `POWER_WEAPONS` (`host.js`); the host only takes their hits from
  the player it gave the pickup to (`p.powerW`), and they can't be reloaded (`game.js` `dropPower`). Their models are
  existing bodies refinished by `powerGun()` in `guns.js`.
- **Map:** `maps.js` (`MAPS`, `MAP_ORDER`, `MAP_BLURB`).
- **Cosmetic or banner:** `COSMETICS` in `missions.js` (`price`, or `reward` with `how`), with its look in `cosmetics.js` /
  `banners.js`. Earn-only items use `grantItem` / `grantWrap`.
- **Achievement:** `ACHIEVEMENTS` in `achievements.js` (stat-based; event stats come in via `track.stat`).
- **New progress saved with `store`:** add the key to `COUNTERS` / `SETS` / `MAPS` / `LWW` in `devices.js`, or it won't sync
  between linked devices (counters need a `flat()` rule). Per-device things (settings, UI state) stay out.
- **Something stored on the relay:** follow `gifts.js` / `profiles.js`: sign on send, verify on receive,
  cap and clean every field, and use retained messages for anything that must survive.

## Testing (in a browser)

- `window.game` is the client `Game`; `game.net.logic` is the `HostLogic` when you host.
  `await import('/js/<file>.js')` returns the same live module the page uses (handy for stubbing).
- **Host a Private server** (Create server → 🔒 Private). Quick Play, the featured mode and mode of the week create
  **public** servers. Those are announced by `ServerAnnouncer` on its own relay connection, so stub
  `ServerAnnouncer.prototype.start` before testing them. Stubbing `social.relay.publish` doesn't cover it.
- To block other relay writes: `(await import('/js/moderation.js')).moderation.social.relay.publish = () => {}`.
- Two identities: open the game on `localhost:8080` and `127.0.0.1:8080` (separate storage).
- Background tabs throttle `requestAnimationFrame`. Call `game.frame()` in a loop to advance the client.
- Put back any localStorage you changed (tokens, owned items, clan, scores) after a test.
- `node tools/check.mjs` before every commit.

## Gotchas

- Line endings are mixed (`* text=auto`). When patching files with scripts, normalize `\r\n` first.
- In JS `String.replace`, `$&` and `$1` in the replacement are special. Use a function or `split/join` when
  inserting code that contains `$`.
- Three.js 0.160 lights use physical units: a SpotLight needs intensity of about 20, not 1–2.
- `sanitizeCos` (missions.js) decides which cosmetics fields reach other players. `clan`, `lvl`, `sr` and `v`
  ride along there.
- Everything is client-reported. Anything that grants value must be capped, and never trust a peer's numbers
  without the host or a signature.

## Status (2026-10-10)

Built and committed but **not yet tested with real people**:
- gifts arriving at a friend
- a real clan war between two clans
- watching a Game Night event as a viewer (and how the spectator overlay looks)
- Battle Royale and tournament starting from a real Game Night schedule
- ranked season banners being handed out (first season ends Oct 19; seasons are weekly after that)
- how wall-running feels with a mouse
- linked devices on real phones / PCs over the public relays (tested with two browser identities and a local relay stand-in)

Built on 2026-10-12 at the owner's request ("do the max amount of updates"), not yet played by real people: crosshair editor,
Halloween event, grappling hook, Prop Hunt, match report, emotes, Duel, hit / kill sounds, loadout codes, Haunted Manor
map, Search & Destroy, Snowball Fight, map editor.
