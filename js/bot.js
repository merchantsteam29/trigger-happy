import { moveBody, raycast, rayAABB } from './physics.js';
import { WEAPONS } from './weapons.js';
import { MAPS, boxes } from './maps.js';
import { zipNear, zipFeet, zipLength, ZIP_SPEED, HANG } from './ziplines.js';

const WALK = 5.6, JUMP = 8, EYE = 1.62;
const NADE_G = 18, GRAPPLE_PULL = 20; // frag lob gravity (game.js BOUNCE_GRAVITY); grappling hook pull speed
const SNIPERS = ['sniper', 'dmr', 'amr', 'railgun', 'p_railcannon'];
const r2 = (v) => Math.round(v * 100) / 100;
const DIFF = {
  easy: { react: 1.4, err: 0.2, turn: 2.2, see: 26, pause: 1.1, fov: 1.2, head: 0, forget: 0.5 },
  normal: { react: 0.85, err: 0.11, turn: 4, see: 38, pause: 0.55, fov: 1.4, head: 0.03, forget: 0.25 },
  hard: { react: 0.5, err: 0.055, turn: 6.5, see: 52, pause: 0.3, fov: 1.6, head: 0.1, forget: 0.1 },
};
// Auto difficulty: a skill from 0 (easy) through 0.5 (normal) and 1 (hard) up to 1.3 (expert),
// blended from the tables above. The host moves it with how the real players are doing.
const EXPERT = { react: 0.32, err: 0.035, turn: 8, see: 60, pause: 0.2, fov: 1.8, head: 0.16, forget: 0.05 };
// Presets past hard (picked by the host): expert, and nightmare (near-instant, pinpoint, hunts headshots).
DIFF.expert = EXPERT;
DIFF.nightmare = { react: 0.18, err: 0.018, turn: 11, see: 80, pause: 0.1, fov: 2.2, head: 0.32, forget: 0.02 };
export const BOT_DIFFS = ['auto', 'easy', 'normal', 'hard', 'expert', 'nightmare'];
export function skillParams(s) {
  s = Math.max(0, Math.min(1.3, s));
  const [a, b, k] = s <= 0.5 ? [DIFF.easy, DIFF.normal, s / 0.5] : s <= 1 ? [DIFF.normal, DIFF.hard, (s - 0.5) / 0.5] : [DIFF.hard, EXPERT, (s - 1) / 0.3];
  const out = {};
  for (const key of Object.keys(DIFF.normal)) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}
export const BOT_PRIMARIES = ['ar', 'smg', 'burst', 'lmg', 'shotgun', 'dmr', 'br', 'vector', 'doublebarrel', 'carbine', 'pdw', 'autoshot', 'slug', 'flamethrower'];
export const BOT_NAMES = ['Viper', 'Ghost', 'Razor', 'Blaze', 'Echo', 'Havoc', 'Nova', 'Raptor', 'Specter', 'Talon', 'Onyx', 'Fang', 'Jinx', 'Rook'];

const angDiff = (a, b) => ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
const v3 = () => ({ x: 0, y: 0, z: 0 });

// Bot stats for a weapon; projectile weapons are approximated as heavy hitscan.
function stats(id) {
  const w = WEAPONS[id] || WEAPONS.ar;
  if (w.snow) return { ...w, type: 'gun', dmg: w.directDmg, head: w.head || 1, pellets: 1, spread: 0.03, range: 40 }; // snowballs: their real damage
  if (w.type === 'proj') return w.auto
    ? { ...w, type: 'gun', dmg: w.directDmg, head: w.head || 1, pellets: 1, spread: 0.02, range: 60 } // e.g. the nailgun
    : { ...w, type: 'gun', dmg: 65, head: 1, pellets: 1, spread: 0.03, range: 60, auto: false };
  return w;
}

// AI player simulated inside the host. Shares the host's player record `p` and calls into
// HostLogic for damage, effects and teams, exactly like a remote client would.
export class Bot {
  constructor(logic, p, difficulty) {
    this.logic = logic;
    this.p = p;
    this.difficulty = DIFF[difficulty] || difficulty === 'auto' ? difficulty : 'normal';
    this.crouchT = 0; this.retreat = null; this.retreatT = 0;
    this.body = { pos: v3(), vel: v3(), onGround: false };
    this.yaw = 0; this.pitch = 0;
    this.weapon = 'ar';
    this.ammo = 30;
    this.fireCd = 0; this.reloadT = 0; this.pauseT = 0;
    this.path = null; this.pathT = 0; this.goal = null;
    this.target = null; this.reactT = 0; this.lastSeen = null; this.lastSeenT = 0;
    this.aimErr = { x: 0, y: 0 }; this.errT = 0;
    this.strafe = 1; this.strafeT = 0;
    this.stuckT = 0; this.lastPos = v3();
  }

  get d() {
    if (this.difficulty !== 'auto') return DIFF[this.difficulty];
    const s = this.logic.botSkill ?? 0.45;
    if (this.dS !== s) { this.dS = s; this.dCache = skillParams(s); }
    return this.dCache;
  }
  get skill() { return this.difficulty === 'auto' ? this.logic.botSkill ?? 0.45 : { easy: 0.1, normal: 0.5, hard: 1, expert: 1.3, nightmare: 1.5 }[this.difficulty]; }

  spawn(s, loadout) {
    this.hide = null;
    this.nades = 2; this.nadeCd = 4 + Math.random() * 4; // frags (thrown at enemies who duck behind cover)
    this.grap = null; this.grapCd = 2; // grappling hook up to higher ground
    this.zip = null; this.zipPlan = null; // ziplines (ziplines.js)
    const b = this.body;
    b.pos.x = s.x; b.pos.y = s.y; b.pos.z = s.z;
    b.vel.x = b.vel.y = b.vel.z = 0;
    this.yaw = s.yaw;
    this.pitch = 0;
    this.setLoadout(loadout);
    this.path = null;
    this.target = null;
    this.lastSeen = null;
    this.reactT = this.d.react;
  }

  setLoadout(l) {
    this.loadout = l || null;
    this.weapon = l ? l[0] : BOT_PRIMARIES[(Math.random() * BOT_PRIMARIES.length) | 0];
    this.ammo = stats(this.weapon).mag || 0;
    this.reloadT = 0;
    this.fireCd = 0.3;
  }

  // One in the Chamber: a kill hands back a bullet (and the gun, if we'd gone to the knife).
  addAmmo(n) {
    const gun = this.loadout ? this.loadout[0] : this.weapon;
    this.ammo = Math.min((stats(gun).mag || 1), (this.weapon === gun ? this.ammo : 0) + n);
    this.weapon = gun;
  }

  onMessage(m) {
    if (m.t === 'dmg') {
      if (m.imp) { this.body.vel.x += m.imp[0]; this.body.vel.y += m.imp[1]; this.body.vel.z += m.imp[2]; }
      const from = this.logic.players.get(m.from);
      if (from && from !== this.p && from.alive) {
        // Turn to face whoever is shooting; switch to them if they're in sight and closer than the current target.
        this.lastSeen = { x: from.st[0], y: from.st[1], z: from.st[2] };
        this.lastSeenT = 4;
        const b = this.body, eye = { x: b.pos.x, y: b.pos.y + EYE, z: b.pos.z };
        const dNew = Math.hypot(from.st[0] - b.pos.x, from.st[2] - b.pos.z);
        const dOld = this.target ? Math.hypot(this.target.st[0] - b.pos.x, this.target.st[2] - b.pos.z) : Infinity;
        if (this.target !== from && dNew < dOld && this.logic.hostile(this.p, from) && this.visible(from, eye)) { this.target = from; this.reactT = this.d.react * 0.6; }
      }
    } else if (m.t === 'loadout') this.setLoadout(m.l);
  }

  visible(e, eye) {
    const tx = e.st[0], ty = e.st[1] + 1.2, tz = e.st[2];
    const dx = tx - eye.x, dy = ty - eye.y, dz = tz - eye.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > this.d.see || dist < 0.01) return false;
    return !raycast(eye.x, eye.y, eye.z, dx / dist, dy / dist, dz / dist, dist - 0.3, true); // bots see through glass, like players
  }

  update(dt) {
    const p = this.p;
    if (!p.alive) return;
    const L = this.logic, d = this.d, b = this.body;
    if (L.mode.prop && p.team === 2 && Date.now() < L.propHideUntil) return; // Prop Hunt: hunters wait blind
    const w = stats(this.weapon);
    const melee = w.type === 'melee';
    const eye = { x: b.pos.x, y: b.pos.y + EYE, z: b.pos.z };
    if (this.zip && this.rideZip(dt)) return;
    // Zipline: at the end of the one we were heading for, grab it.
    const zips = MAPS[L.s.map] && MAPS[L.s.map].ziplines;
    if (zips && this.zipPlan && !this.target) {
      const n = zipNear(zips, b.pos);
      if (n && n.i === this.zipPlan.i) { this.zip = { i: n.i, t: n.t, dir: this.zipPlan.dir }; this.zipPlan = null; this.goal = null; this.path = null; this.rideZip(dt); return; }
    }

    // ---- Perception ----
    let best = null, bestD = Infinity;
    for (const e of L.players.values()) {
      if (e === p || !e.alive || !L.hostile(p, e)) continue;
      const dist = Math.hypot(e.st[0] - b.pos.x, e.st[2] - b.pos.z);
      if (dist >= bestD) continue;
      // Prop Hunt: props never attack; hunters only spot a prop up close or one that just moved.
      if (L.mode.prop && (p.team === 1 || (e.team === 1 && dist > 7 && Date.now() - (e.movedAt || 0) > 3000))) continue;
      const ang = Math.abs(angDiff(this.yaw, Math.atan2(-(e.st[0] - b.pos.x), -(e.st[2] - b.pos.z))));
      if (ang > (L.zw && !p.zombie ? 4 : d.fov) && dist > 3 && e !== this.target) continue; // Zombie Survival: survivors hear them coming
      if (!this.visible(e, eye)) continue;
      best = e; bestD = dist;
    }
    // Bots sometimes lose track of a target they were already fighting.
    if (best && best === this.target && Math.random() < d.forget * dt) best = null;
    if (best !== this.target) { this.target = best; this.reactT = d.react * (0.7 + Math.random() * 0.8) * (L.zw && !p.zombie ? 0.5 : 1); }
    if (best) { this.lastSeen = { x: best.st[0], y: best.st[1], z: best.st[2] }; this.lastSeenT = 5; }
    this.lastSeenT -= dt;
    this.reactT -= dt;

    // ---- Goal selection ----
    let goal = null;
    const hill = L.currentHill();
    // Kill Confirmed: go for the nearest dog tag when nothing's shooting at us.
    let tag = null;
    if (!this.target && L.tags && L.tags.length) {
      let bestT = 25;
      for (const t of L.tags) { const dd = Math.hypot(t.x - b.pos.x, t.z - b.pos.z); if (dd < bestT) { bestT = dd; tag = t; } }
    }
    // Capture the Flag: carry it home, recover our dropped flag, chase our thief, or go steal theirs.
    let flagGoal = null;
    if (L.flags && (p.team === 1 || p.team === 2)) {
      const mine = L.flags[p.team], theirs = L.flags[p.team === 1 ? 2 : 1];
      if (theirs.carrier === p.id) flagGoal = mine.home;
      else if (mine.dropped || mine.carrier) flagGoal = mine.pos;
      else flagGoal = theirs.pos;
    }
    const dz = L.dom && !this.target ? L.domGoal(p) : null;
    // Badly hurt in a gunfight: back off to somewhere the enemy can't see, and come back once healed.
    const maxHp = L.maxHp(p);
    this.coverTryT = (this.coverTryT || 0) - dt;
    if (!p.zombie && !melee && this.target && p.hp < maxHp * 0.35 && this.skill > 0.2 && !this.retreat && this.coverTryT <= 0) {
      this.coverTryT = 1.5; // looking for cover is a few raycasts: not every frame
      this.retreat = this.findCover(this.target);
      this.retreatT = 4 + Math.random() * 2;
    }
    if (this.retreat) { this.retreatT -= dt; if (this.retreatT <= 0 || p.hp > maxHp * 0.7) this.retreat = null; }
    // Hurt and nothing to shoot: go for a health pickup nearby.
    let hpGoal = null;
    if (!this.target && !p.zombie && p.hp < maxHp * 0.6 && L.pickupsOn && L.pickupsOn()) {
      let bd = 35; const now = Date.now();
      for (const k of L.pickups) if (k.kind === 'hp' && now >= k.readyAt) { const dd = Math.hypot(k.x - b.pos.x, k.z - b.pos.z); if (dd < bd) { bd = dd; hpGoal = { x: k.x, y: k.y, z: k.z }; } }
    }
    const sz = L.brZone; // Battle Royale: get back inside the circle
    const brGoal = sz && Math.hypot(b.pos.x - sz.cx, b.pos.z - sz.cz) > Math.max(2, sz.r * 0.75) && (!this.target || Math.hypot(b.pos.x - sz.cx, b.pos.z - sz.cz) > sz.r)
      ? { x: sz.cx + (Math.random() - 0.5) * sz.r * 0.5, y: b.pos.y, z: sz.cz + (Math.random() - 0.5) * sz.r * 0.5 } : null;
    const sd = L.sd && !L.sd.waiting && !L.sd.postUntil ? L.sd : null; // Search & Destroy
    if (sd && sd.bomb.carrier === p.id) { // carry the bomb to a site (picked once per round)
      if (this.sdRound !== sd.round || !this.sdSite) { this.sdRound = sd.round; this.sdSite = sd.sites[(Math.random() * sd.sites.length) | 0]; }
      const s = this.sdSite;
      goal = s && Math.hypot(s.x - b.pos.x, s.z - b.pos.z) > s.r * 0.5 ? { x: s.x, y: s.y, z: s.z } : null;
      this.target = this.target && Math.hypot(this.target.st[0] - b.pos.x, this.target.st[2] - b.pos.z) < 12 ? this.target : null;
    } else if (sd && sd.bomb.state === 2 && p.team !== sd.att && !this.target) goal = { x: sd.bomb.x, y: sd.bomb.y, z: sd.bomb.z }; // defuse it
    else if (sd && sd.bomb.state === 1 && p.team === sd.att && !this.target) goal = { x: sd.bomb.x, y: sd.bomb.y, z: sd.bomb.z }; // pick it up
    else if (sd && !this.target && sd.sites.length) { // everyone else heads for (or guards) a site
      if (this.sdRound !== sd.round || !this.sdSite) { this.sdRound = sd.round; this.sdSite = sd.sites[(Math.random() * sd.sites.length) | 0]; }
      const s = this.sdSite;
      goal = Math.hypot(s.x - b.pos.x, s.z - b.pos.z) > s.r ? { x: s.x + (Math.random() - 0.5) * s.r, y: s.y, z: s.z + (Math.random() - 0.5) * s.r } : null;
    } else if (L.mode.prop && p.team === 1) { // Prop Hunt: go to a hiding spot and stay still
      if (!this.hide) { const n = L.nav && L.nav.random(); this.hide = n ? { x: n.x, y: n.y, z: n.z } : null; }
      goal = this.hide && Math.hypot(this.hide.x - b.pos.x, this.hide.z - b.pos.z) > 1 ? this.hide : null;
    } else if (brGoal) { if (!this.brGoal || Math.hypot(this.brGoal.x - sz.cx, this.brGoal.z - sz.cz) > sz.r * 0.7) this.brGoal = brGoal; goal = this.brGoal; }
    else if (this.retreat) goal = this.retreat;
    else if (hpGoal) goal = hpGoal;
    else if (flagGoal && (!this.target || L.flags[p.team === 1 ? 2 : 1].carrier === p.id)) goal = flagGoal;
    else if (dz && Math.random() < 0.995) goal = { x: dz.x + (Math.random() - 0.5) * dz.r, y: dz.y, z: dz.z + (Math.random() - 0.5) * dz.r };
    else if (this.target && melee) goal = this.lastSeen;
    else if (p.zombie && !this.target) { // they can smell you
      let nd = Infinity;
      for (const e of L.players.values()) {
        if (!e.alive || e.zombie) continue;
        const dd = Math.hypot(e.st[0] - b.pos.x, e.st[2] - b.pos.z);
        if (dd < nd) { nd = dd; goal = { x: e.st[0], y: e.st[1], z: e.st[2] }; }
      }
    }
    else if (tag) goal = { x: tag.x, y: tag.y, z: tag.z };
    else if (!this.target && this.lastSeen && this.lastSeenT > 0) goal = this.lastSeen;
    else if (!this.target && hill && Math.random() < 0.995) goal = { x: hill[0] + (Math.random() - 0.5) * hill[3], y: hill[1], z: hill[2] + (Math.random() - 0.5) * hill[3] };
    else if (!this.target) {
      if (!this.goal || Math.hypot(this.goal.x - b.pos.x, this.goal.z - b.pos.z) < 1.5 || this.pathT < -6) {
        // Team modes: usually move up with a teammate instead of wandering off alone.
        const mates = L.mode.teams && !p.zombie ? [...L.players.values()].filter((q) => q !== p && q.alive && q.team === p.team && !q.zombie) : [];
        const mate = mates.length && Math.random() < 0.6 ? mates[(Math.random() * mates.length) | 0] : null;
        const n = mate ? { x: mate.st[0] + (Math.random() - 0.5) * 8, y: mate.st[1], z: mate.st[2] + (Math.random() - 0.5) * 8 } : this.wanderSpot();
        this.goal = n ? { x: n.x, y: n.y, z: n.z } : null;
        this.pathT = 0;
      }
      goal = this.goal;
    }

    this.pathT -= dt;
    if (goal && L.nav && (this.pathT <= 0 || !this.path)) {
      this.path = L.nav.find(b.pos, goal);
      this.pathT = 1.2 + Math.random() * 0.6;
    }

    // ---- Movement direction ----
    let mx = 0, mz = 0;
    if (this.target && !melee && !this.retreat) {
      // Strafe in combat, keep a preferred range.
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafe = Math.random() < 0.5 ? -1 : 1; this.strafeT = 0.6 + Math.random() * 1.4; }
      const tx = this.target.st[0] - b.pos.x, tz = this.target.st[2] - b.pos.z;
      const dist = Math.hypot(tx, tz) || 1;
      const pref = ['shotgun', 'autoshot', 'doublebarrel', 'sawedoff', 'p_thunder'].includes(this.weapon) ? 5 : ['sniper', 'dmr', 'amr', 'railgun', 'p_railcannon'].includes(this.weapon) ? 30 : 14;
      const fwd = dist > pref + 4 ? 1 : dist < pref - 4 ? -0.7 : 0;
      mx = (tx / dist) * fwd + (-tz / dist) * this.strafe * 0.8;
      mz = (tz / dist) * fwd + (tx / dist) * this.strafe * 0.8;
    } else if (this.path && this.path.length) {
      let n = this.path[0];
      while (n && Math.hypot(n.x - b.pos.x, n.z - b.pos.z) < 0.6 && Math.abs(n.y - b.pos.y) < 1.2) {
        this.path.shift();
        n = this.path[0];
      }
      if (n) { mx = n.x - b.pos.x; mz = n.z - b.pos.z; }
      else if (melee && this.target) { mx = this.target.st[0] - b.pos.x; mz = this.target.st[2] - b.pos.z; }
    }
    if (melee && this.target && bestD < 6) { mx = this.target.st[0] - b.pos.x; mz = this.target.st[2] - b.pos.z; }
    const ml = Math.hypot(mx, mz);
    if (ml > 0.01) { mx /= ml; mz /= ml; }

    // Grappling hook: a better bot whose route goes up a wall it can't climb pulls itself up.
    this.grapCd -= dt;
    const up = this.path && this.path[0];
    if (!this.grap && up && this.grapCd <= 0 && this.skill >= 0.5 && !melee && up.y - b.pos.y > 1.6 && Math.hypot(up.x - b.pos.x, up.z - b.pos.z) < 14) this.startGrapple(up, eye);
    if (this.grap) { this.pullGrapple(dt); mx = 0; mz = 0; }
    // Frag: lob one where an enemy just ducked out of sight.
    this.nadeCd -= dt;
    if (this.nades > 0 && this.nadeCd <= 0 && this.skill >= 0.3 && !this.target && !melee && this.lastSeen && this.lastSeenT > 1.5 && this.lastSeenT < 4.5 && this.canNade()) {
      const dd = Math.hypot(this.lastSeen.x - b.pos.x, this.lastSeen.z - b.pos.z);
      if (dd > 7 && dd < 26) this.throwNade(this.lastSeen);
    }

    // Better bots crouch now and then in a long-range fight (smaller target).
    this.crouchT -= dt;
    if (this.target && !melee && !this.retreat && bestD > 12 && this.crouchT < -1.5 && Math.random() < dt * 0.6 * this.skill) this.crouchT = 0.8 + Math.random() * 1.2;
    const crouching = this.crouchT > 0 && this.target && !melee;
    const speed = WALK * (w.speedMul || 1) * L.s.moveSpeed * (this.target && !melee ? 0.85 : 1) * (p.speedK || 1) * (crouching ? 0.45 : 1);
    const a = b.onGround ? 1 - Math.exp(-dt * 12) : 1 - Math.exp(-dt * 2);
    if (!this.grap) { // the rope pulls on its own
      b.vel.x += (mx * speed - b.vel.x) * a;
      b.vel.z += (mz * speed - b.vel.z) * a;
    }

    // Stuck: jump and repath.
    this.stuckT += dt;
    if (this.stuckT > 0.8) {
      const moved = Math.hypot(b.pos.x - this.lastPos.x, b.pos.z - this.lastPos.z);
      if (ml > 0.01 && moved < 0.35 && b.onGround) {
        if (!(MAPS[L.s.map] && MAPS[L.s.map].voidY !== undefined)) b.vel.y = JUMP * L.s.jump;
        this.pathT = 0; this.goal = null;
      }
      this.lastPos.x = b.pos.x; this.lastPos.z = b.pos.z;
      this.stuckT = 0;
    }
    // Jump toward higher waypoints.
    const next = this.path && this.path[0];
    if (next && next.y - b.pos.y > 0.6 && b.onGround && Math.hypot(next.x - b.pos.x, next.z - b.pos.z) < 1.4) b.vel.y = JUMP * L.s.jump;

    // Maps with a void (Sky Islands): don't walk off the edge, and steer back if airborne over nothing.
    if (MAPS[L.s.map] && MAPS[L.s.map].voidY !== undefined) {
      const groundAt = (x, z, below) => boxes.some((q) => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1 && q.y1 <= b.pos.y + 0.6 && q.y1 >= b.pos.y - below);
      const sp = Math.hypot(b.vel.x, b.vel.z);
      if (b.onGround) {
        if (groundAt(b.pos.x, b.pos.z, 0.3)) this.lastSafe = { x: b.pos.x, z: b.pos.z };
        if (sp > 0.1 && !groundAt(b.pos.x + (b.vel.x / sp) * 0.8, b.pos.z + (b.vel.z / sp) * 0.8, 3)) { b.vel.x = 0; b.vel.z = 0; this.strafe = -this.strafe; this.pathT = 0; }
      } else if (this.lastSafe && !groundAt(b.pos.x, b.pos.z, 30)) {
        const dx = this.lastSafe.x - b.pos.x, dz = this.lastSafe.z - b.pos.z, dl = Math.hypot(dx, dz) || 1;
        b.vel.x = (dx / dl) * speed; b.vel.z = (dz / dl) * speed;
      }
    }
    moveBody(b, dt, 1.8);
    if (b.onGround && b.ground && b.ground.mat === 'pad') { b.vel.y = 14 * L.s.jump; b.onGround = false; }
    if (b.pos.y < -20) { const s = L.pickSpawn(p); b.pos.x = s.x; b.pos.y = s.y; b.pos.z = s.z; }

    // ---- Aim ----
    let wantYaw = this.yaw, wantPitch = 0;
    if (this.target) {
      this.errT -= dt;
      if (this.errT <= 0) {
        this.errT = 0.4 + Math.random() * 0.5;
        this.aimErr.x = (Math.random() - 0.5) * 2 * d.err;
        this.aimErr.y = (Math.random() - 0.5) * 2 * d.err;
      }
      const t = this.target;
      const headshot = Math.random() < d.head;
      const aimY = headshot ? headY(t.st, this.logic.mode.bigHead) : t.st[6] ? 0.9 : 1.15;
      const tx = t.st[0] - eye.x, ty = t.st[1] + aimY - eye.y, tz = t.st[2] - eye.z;
      wantYaw = Math.atan2(-tx, -tz) + this.aimErr.x;
      wantPitch = Math.atan2(ty, Math.hypot(tx, tz)) + this.aimErr.y;
    } else if (this.lastSeen && this.lastSeenT > 0 && this.skill > 0.3) {
      // Lost sight: keep the gun on where they were last seen (checks the corner).
      const tx = this.lastSeen.x - eye.x, tz = this.lastSeen.z - eye.z;
      if (Math.hypot(tx, tz) > 1.5) wantYaw = Math.atan2(-tx, -tz);
      else if (ml > 0.01) wantYaw = Math.atan2(-mx, -mz);
    } else if (ml > 0.01) {
      wantYaw = Math.atan2(-mx, -mz);
    }
    const maxTurn = d.turn * dt;
    const dy = angDiff(this.yaw, wantYaw);
    this.yaw += Math.max(-maxTurn, Math.min(maxTurn, dy));
    this.pitch += Math.max(-maxTurn, Math.min(maxTurn, wantPitch - this.pitch));

    // ---- Weapon ----
    this.fireCd -= dt;
    this.pauseT -= dt;
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.ammo = w.mag;
    }
    if (this.target && this.reactT <= 0 && this.fireCd <= 0 && this.reloadT <= 0 && this.pauseT <= 0 && Math.abs(dy) < 0.15) {
      if (melee) {
        if (bestD < (w.range || 2.4)) this.melee(w);
      } else if (bestD < (w.range || 100)) this.shoot(w, eye);
    }
    if (!melee && !w.power && !this.target && this.lastSeenT < 0 && this.reloadT <= 0 && w.mag && this.ammo < w.mag * 0.35 && !L.mode.noReload) this.reloadT = w.reload || 2; // top up between fights
    if (!melee && this.ammo <= 0 && this.reloadT <= 0) {
      // Power weapon empty: back to the bot's own gun. No reloading in One in the Chamber: fall
      // back to the knife until the next kill.
      if (w.power) { this.setLoadout(this.powerPrev || null); this.powerPrev = null; }
      else if (L.mode.noReload && this.loadout && this.loadout[1]) this.weapon = this.loadout[1];
      else this.reloadT = w.reload || 2;
    }

    const flags = (this.reloadT > 0 ? 1 : 0) | (b.onGround ? 0 : 4);
    p.st = [b.pos.x, b.pos.y, b.pos.z, this.yaw, this.pitch, this.weapon, crouching ? 1 : 0, flags];
  }

  // Where to wander: usually anywhere, sometimes high ground (more often with a sniper), and on maps
  // with ziplines sometimes the end of one (rode from there: ziplines.js).
  wanderSpot() {
    const L = this.logic, nav = L.nav;
    if (!nav) return null;
    const zips = MAPS[L.s.map] && MAPS[L.s.map].ziplines;
    if (zips && zips.length && this.skill >= 0.3 && Math.random() < 0.25) {
      const i = (Math.random() * zips.length) | 0, l = zips[i], end = Math.random() < 0.5 ? 0 : 1;
      this.zipPlan = { i, dir: end ? -1 : 1 }; // from this end toward the other
      return { x: end ? l[3] : l[0], y: (end ? l[4] : l[1]) - HANG - 0.45, z: end ? l[5] : l[2] };
    }
    this.zipPlan = null;
    if (Math.random() < (SNIPERS.includes(this.weapon) ? 0.5 : 0.25)) {
      let best = null;
      for (let k = 0; k < 10; k++) { const n = nav.random(); if (n && n.y > 2 && (!best || n.y > best.y)) best = n; }
      if (best) return best;
    }
    return nav.random();
  }

  // Riding a zipline: along the cable at ZIP_SPEED, letting go at the far end.
  rideZip(dt) {
    const L = this.logic, b = this.body, z = this.zip, zips = MAPS[L.s.map] && MAPS[L.s.map].ziplines, l = zips && zips[z.i];
    if (!l) { this.zip = null; return false; }
    const len = zipLength(l);
    z.t += (z.dir * ZIP_SPEED * dt) / len;
    const end = z.t <= 0 || z.t >= 1;
    z.t = Math.max(0, Math.min(1, z.t));
    const f = zipFeet(l, z.t, { set(x, y, zz) { this.x = x; this.y = y; this.z = zz; return this; } });
    b.pos.x = f.x; b.pos.y = f.y; b.pos.z = f.z;
    b.vel.x = ((l[3] - l[0]) / len) * ZIP_SPEED * z.dir; b.vel.y = 0; b.vel.z = ((l[5] - l[2]) / len) * ZIP_SPEED * z.dir;
    this.yaw = Math.atan2(-b.vel.x, -b.vel.z);
    b.onGround = false;
    if (end) this.zip = null; // let go, keeping the speed
    this.p.st = [b.pos.x, b.pos.y, b.pos.z, this.yaw, this.pitch, this.weapon, 0, 4];
    return true;
  }

  // Grappling hook toward a point just above the next waypoint (the lowest one in sight, so the rope
  // clears the ledge's edge).
  startGrapple(n, eye) {
    const L = this.logic, tx = n.x, tz = n.z;
    const ty = [0.6, 1.3, 2, 2.8].map((h) => n.y + h).find((y) => { const dx = tx - eye.x, dy = y - eye.y, dz = tz - eye.z, d = Math.hypot(dx, dy, dz); return d > 2 && !raycast(eye.x, eye.y, eye.z, dx / d, dy / d, dz / d, d - 0.4); });
    if (ty === undefined) { this.grapCd = 1.5; return; }
    this.grap = { x: tx, y: ty, z: tz, t: 0 };
    this.grapCd = 6 + Math.random() * 4;
    L.broadcast({ t: 'fx', k: 'rope', id: this.p.id, p: [r2(tx), r2(ty), r2(tz)] });
  }
  pullGrapple(dt) {
    const b = this.body, g = this.grap;
    g.t += dt;
    const dx = g.x - b.pos.x, dy = g.y - (b.pos.y + 1), dz = g.z - b.pos.z, d = Math.hypot(dx, dy, dz);
    if (d < 1.4 || g.t > 1.5) {
      this.grap = null;
      const hl = Math.hypot(dx, dz) || 1;
      b.vel.y = JUMP * 0.6; b.vel.x = (dx / hl) * 4.5; b.vel.z = (dz / hl) * 4.5; // a little hop over the ledge, not a launch
      this.logic.broadcast({ t: 'fx', k: 'rope', id: this.p.id });
      return;
    }
    const k = 1 - Math.exp(-dt * 7);
    b.vel.x += ((dx / d) * GRAPPLE_PULL - b.vel.x) * k;
    b.vel.z += ((dz / d) * GRAPPLE_PULL - b.vel.z) * k;
    b.vel.y += ((dy / d) * GRAPPLE_PULL + 4 - b.vel.y) * k;
    b.onGround = false;
  }

  // Frags only where players could have them (not with a set loadout that has none, not in Prop Hunt).
  canNade() {
    const L = this.logic;
    if (L.mode.prop || this.p.zombie || L.mode.practice) return false;
    return !this.loadout || this.loadout.includes('frag');
  }

  // Lobs a frag to land at `at`; it goes off after its fuse, hurting everyone in range and in sight.
  throwNade(at) {
    const L = this.logic, b = this.body, W = WEAPONS.frag, self = this.p;
    const o = [b.pos.x, b.pos.y + 1.5, b.pos.z];
    const dx = at.x - o[0], dy = at.y + 0.3 - o[1], dz = at.z - o[2], d = Math.hypot(dx, dz), t = Math.max(0.6, d / 14);
    const v = [dx / t, dy / t + 0.5 * NADE_G * t, dz / t];
    const pid = 1e6 + ((Math.random() * 1e8) | 0);
    this.nades--;
    this.nadeCd = 10 + Math.random() * 8;
    L.handle(self.id, { t: 'proj', pid, k: 'frag', p: o.map(r2), v: v.map(r2) });
    const land = { x: at.x, y: at.y + 0.3, z: at.z };
    setTimeout(() => {
      if (L.phase !== 'playing' || !L.players.has(self.id)) return;
      L.handle(self.id, { t: 'boom', pid, p: [r2(land.x), r2(land.y), r2(land.z)], k: 'frag' });
      for (const e of [...L.players.values()]) {
        if (!e.alive) continue;
        const ex = e.st[0], ey = e.st[1] + 0.9, ez = e.st[2], dd = Math.hypot(ex - land.x, ey - land.y, ez - land.z);
        if (dd >= W.radius) continue;
        const ux = ex - land.x, uy = ey - land.y, uz = ez - land.z, ul = Math.hypot(ux, uy, uz) || 1;
        if (ul > 0.3 && raycast(land.x, land.y, land.z, ux / ul, uy / ul, uz / ul, ul - 0.2)) continue; // behind cover
        const dmg = Math.round(W.splash * (1 - dd / W.radius) * (e === self ? 0.5 : 1));
        if (dmg > 0) L.hit(self, { v: e.id, dmg, w: 'frag', head: false });
      }
    }, W.fuse * 1000);
  }

  // A nav spot 6–18 m away, further from the enemy than we are and out of their sight.
  findCover(enemy) {
    const L = this.logic, b = this.body;
    if (!L.nav) return null;
    const ex = enemy.st[0], ey = enemy.st[1] + 1.5, ez = enemy.st[2];
    const myD = Math.hypot(b.pos.x - ex, b.pos.z - ez);
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < 24; i++) {
      const n = L.nav.random();
      if (!n) break;
      const d = Math.hypot(n.x - b.pos.x, n.z - b.pos.z);
      if (d < 6 || d > 18 || Math.abs(n.y - b.pos.y) > 3) continue;
      const fromEnemy = Math.hypot(n.x - ex, n.z - ez);
      const dx = n.x - ex, dy = n.y + 1.2 - ey, dz = n.z - ez, dl = Math.hypot(dx, dy, dz) || 1;
      const hidden = !!raycast(ex, ey, ez, dx / dl, dy / dl, dz / dl, dl - 0.3);
      const score = (hidden ? 20 : 0) + (fromEnemy - myD) - d * 0.3;
      if (score > bestScore) { bestScore = score; best = { x: n.x, y: n.y, z: n.z }; }
    }
    return best;
  }

  melee(w) {
    this.fireCd = w.rate * (this.p.zombie ? 2 : 1); // zombies swing slower
    this.logic.broadcast({ t: 'fx', k: 'melee', s: w.style, id: this.p.id });
    const t = this.target;
    this.logic.hit(this.p, { v: t.id, dmg: Math.max(1, Math.round(w.dmg * (this.p.dmgK || 1))), w: w.id, head: false });
  }

  shoot(w, eye) {
    const L = this.logic;
    this.fireCd = w.rate;
    if (!L.s.infiniteAmmo) this.ammo--;
    if (!w.auto || Math.random() < 0.3) this.pauseT = this.d.pause * (0.5 + Math.random());
    const cy = Math.cos(this.pitch);
    const fx = -Math.sin(this.yaw) * cy, fy = Math.sin(this.pitch), fz = -Math.cos(this.yaw) * cy;
    const ends = [];
    const hits = new Map();
    for (let i = 0; i < (w.pellets || 1); i++) {
      const moving = Math.hypot(this.body.vel.x, this.body.vel.z) > 1 ? 1.5 : 1;
      const s = (w.spread + this.d.err * 0.6) * moving;
      let dx = fx + (Math.random() - 0.5) * 2 * s, dy = fy + (Math.random() - 0.5) * 2 * s, dz = fz + (Math.random() - 0.5) * 2 * s;
      const l = Math.hypot(dx, dy, dz);
      dx /= l; dy /= l; dz /= l;
      const range = w.range || 150;
      const wh = raycast(eye.x, eye.y, eye.z, dx, dy, dz, range);
      let maxT = wh ? wh.t : range, hit = null;
      for (const e of L.players.values()) {
        if (e === this.p || !e.alive || !L.hostile(this.p, e)) continue;
        for (const hb of hitboxes(e.st, L.mode.bigHead)) {
          const t = rayAABB(eye.x, eye.y, eye.z, dx, dy, dz, hb[0], hb[1], hb[2], hb[3], hb[4], hb[5], maxT);
          if (t >= 0 && t < maxT) { maxT = t; hit = { e, head: hb[6] }; }
        }
      }
      if (!hit && wh && wh.box && wh.box.brk && maxT >= wh.t - 1e-6) L.damageWall(wh.box.brk, w.dmg, this.p); // shatters glass / splinters boards
      ends.push([eye.x + dx * maxT, eye.y + dy * maxT, eye.z + dz * maxT].map((v) => Math.round(v * 100) / 100));
      if (hit) {
        let dmg = w.dmg * (hit.head ? w.head || 1 : 1);
        if (w.falloff) {
          const [near, far, min] = w.falloff;
          dmg *= 1 - Math.max(0, Math.min(1, (maxT - near) / (far - near))) * (1 - min);
        }
        const h = hits.get(hit.e.id) || { dmg: 0, head: false };
        h.dmg += dmg; h.head = h.head || hit.head;
        hits.set(hit.e.id, h);
      }
    }
    const o = [eye.x + fx * 0.6, eye.y - 0.25, eye.z + fz * 0.6].map((v) => Math.round(v * 100) / 100);
    const W0 = WEAPONS[this.weapon];
    if (W0 && W0.snow && ends[0]) { // everyone sees the snowball fly, lobbed to land where the throw was decided
      const [ex, ey, ez] = ends[0], d = Math.hypot(ex - o[0], ey - o[1], ez - o[2]) || 1, t = d / W0.projSpeed;
      const v = [(ex - o[0]) / t, (ey - o[1]) / t + 0.5 * W0.projGravity * t, (ez - o[2]) / t].map((n) => Math.round(n * 100) / 100);
      L.broadcast({ t: 'proj', id: this.p.id, k: this.weapon, p: o, v, pid: Math.floor(Math.random() * 1e9) });
    } else L.broadcast({ t: 'shot', id: this.p.id, w: this.weapon, o, e: ends });
    // Players' positions reach the host a moment late, so a player who just ducked behind cover
    // could still be hit where the host last saw them (it looks like a shot through the wall).
    // The hit lands 0.1 s later, and only if the target is still in sight from this bot then.
    const wid = this.weapon, self = this.p;
    setTimeout(() => {
      if (!self.alive) return;
      const e0 = { x: this.body.pos.x, y: this.body.pos.y + EYE, z: this.body.pos.z };
      for (const [vid, h] of hits) {
        const e = L.players.get(vid);
        if (!e || !e.alive) continue;
        const clear = (y) => { const dx = e.st[0] - e0.x, dy = e.st[1] + y - e0.y, dz = e.st[2] - e0.z, d = Math.hypot(dx, dy, dz); return d < 0.5 || !raycast(e0.x, e0.y, e0.z, dx / d, dy / d, dz / d, d - 0.25); };
        if (!clear(h.head ? 1.7 : 1.1) && !clear(1.45) && !clear(0.6)) continue; // fully behind cover now
        L.hit(self, { v: vid, dmg: Math.round(h.dmg), w: wid, head: h.head });
      }
    }, 100);
  }
}

// Head center height above the feet, matching the player model (see RemotePlayer.hitboxes).
export function headY(st, big = false) {
  return (big ? 1.91 : 1.73) - (st[6] ? 0.32 : 0);
}

// Same boxes as the client-side RemotePlayer.hitboxes (standing/crouch from st[6]; big = Big Heads mode).
export function hitboxes(st, big = false) {
  const x = st[0], y = st[1], z = st[2];
  const hc = y + headY(st, big);
  const hw = big ? 0.42 : 0.19, lo = big ? 0.36 : 0.17, hi = big ? 0.44 : 0.21;
  const head = [x - hw, hc - lo, z - hw, x + hw, hc + hi, z + hw, true];
  return [head, [x - 0.36, y, z - 0.36, x + 0.36, hc - lo, z + 0.36, false]];
}
