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
- `net.js`: WebRTC via PeerJS. The browser that creates a lobby is the **host**. It runs `HostLogic` (`host.js`)
  locally and relays between clients (lobby code = PeerJS id `whffa-v1-<CODE>`).
- `host.js` (`HostLogic`) holds the true game state: players, health, kills, scores, modes,
  bots, pickups, barrels/crates, zombies waves, the Battle Royale storm, the tournament, map votes,
  and anti-cheat (`AC`, `checkMove` / `checkRate` / `checkHit`, auto-flags to staff). It ticks at 20 Hz
  in a Worker timer, so background tabs keep running, and broadcasts a `snap` each tick.
- Clients (`game.js`) simulate their own movement and shooting (hitscan raycasts) and send intents.
  The host validates, applies damage and broadcasts the results.
- Client → host messages (`host.js` `handle`): `st` (state), `shot`, `hit`, `proj`, `boom`, `fx`,
  `prop`, `ping`, `spray`, `vc`, `chat`, `vote`, `mods`, `cos`, `ident`, `staff`, `mod*`.
- Host → client messages (`game.js` `onNet`): `welcome`, `snap`, `spawn`, `dmg`, `hitc`, `kill`,
  `notice`, `start`, `end`, `settings`, `pjoin`, `pleave`, `loadout`, `pickup`, `propbreak`, `spray`,
  `ping`, `kicked` (with `reason`), `warend`, `tourney`, `vc`, `votes` / `voted`, staff messages.
- Bots (`bot.js`) run inside the host (`p.bot`), with A* paths over `nav.js` and "Auto" skill that
  follows how real players are doing (`HostLogic.botSkill`).
- Modes are entries in `MODES` (`host.js`) with flags: `teams`, `redBlue`, `infect` (Infection
  rules), `horror`, `br`, `event` (Game Night only, hidden from pickers), `coop`, `loadout`, `practice`.

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
| `modrec/<tag>`, `report/<id>`, `appeal/<tag>`, `announce`, `chatfilter`, `staffchat/…`, `permabans`, `pres/…` | moderation | moderation.js |
| `bug/<id>` | bug reports (only the owner reads them) | moderation.js |
| `lb/<week>/<tag>`, `lb/all/<tag>`, `lb/aim/<tag>`, `lb/hide` | weekly / all-time / aim-trainer leaderboards | leaderboard.js |
| `prof/<tag>` | public profiles | profiles.js |
| `clan/<TAG>`, `clanreq/…`, `clanleave/…`, `clanchat/…`, `clanwar/…`, `clanwarok/…`, `clanwargo/<TAG>` | clans, clan wars | clans.js |
| `gift/<tag>/<id>` | gifts (claimed and cleared by the receiver) | gifts.js |
| `ref/…` | invite rewards | invites.js |
| `gamenight` | Game Night schedule (owner-signed) | gamenight.js |
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
  owned cosmetics, `track.*`), `seasons.js`, `achievements.js`, `ranked.js`, `shop.js`, `gifts.js`, `invites.js`
- **Social and online:** `relay.js`, `social.js`, `profiles.js`, `clans.js`, `leaderboard.js`, `servers.js`,
  `gamenight.js`, `voice.js`, `chat.js`
- **Staff:** `roles.js`, `moderation.js`, `modpanel.js`, `hostpanel.js`
- **Input and settings:** `settings.js` (`opts`, `setOpt`, `onOpts`), `settingsui.js`, `binds.js`, `gamepad.js`
  (rebindable `PAD_ACTIONS`), `touch.js`, `access.js` (colorblind modes), `tutorial.js`
- **Look:** `style.css` (base layout, HUD positions) with `ui.css` loaded after it (UI v3: tokens, menu shell, every
  screen's look). Classes and ids are shared with the JS, so restyle in `ui.css` and keep them. Icons: `icons/icon.svg` is the
  source; the PNGs (favicon, 192/512, maskable, apple-touch) are rendered from it. `icons/mark.svg` is the logo without its tile.
- **Other:** `updater.js` + `sw.js` (self-update and offline cache), `version.js`, `util.js` (`store`, `esc`), `qr.js` (QR code SVG for the Share button), `devices.js` (linked devices: one account on several devices, progress sync)

### Where to add things
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
- ranked season banners being handed out (first season ends Nov 16)
- how wall-running feels with a mouse
- linked devices on real phones / PCs over the public relays (tested with two browser identities and a local relay stand-in)

Ideas the owner hasn't picked yet: a grappling hook (left out of the movement update), a map editor, Prop Hunt.
