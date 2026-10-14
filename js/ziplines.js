import * as THREE from 'three';

// Ziplines: steel cables between rooftops (a map's `ziplines`: [[ax, ay, az, bx, by, bz], ...], the
// cable's two ends). Press Use (E) near a cable to grab it; you ride the way you're facing at
// ZIP_SPEED (under the host's speed check) hanging HANG below the cable, and let go at the end or
// when you jump. Riding is client-side movement like the grappling hook (game.js `updateZip`).

export const ZIP_SPEED = 15, HANG = 2.15, GRAB = 1.7;

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _p = new THREE.Vector3();

// Cables and their end posts, added to the map's scene group.
export function buildZiplines(group, lines) {
  if (!lines || !lines.length) return;
  const cable = new THREE.MeshStandardMaterial({ color: '#2b2f36', metalness: 0.8, roughness: 0.35 });
  const post = new THREE.MeshStandardMaterial({ color: '#c8462e', metalness: 0.5, roughness: 0.5 });
  for (const l of lines) {
    _a.set(l[0], l[1], l[2]); _b.set(l[3], l[4], l[5]);
    const len = _a.distanceTo(_b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 6), cable);
    m.position.copy(_a).add(_b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _p.copy(_b).sub(_a).normalize());
    group.add(m);
    for (const e of [_a, _b]) { // a post from the cable down to the roof it stands on
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.8, 0.22), post);
      p.position.set(e.x, e.y - 1.25, e.z);
      p.castShadow = true;
      group.add(p);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), post);
      arm.position.set(e.x, e.y + 0.1, e.z);
      group.add(arm);
    }
  }
}

// The cable within reach of a player standing at pos (their hands are HANG above their feet):
// { i, t } (t: 0..1 along the cable), or null.
export function zipNear(lines, pos) {
  let best = null, bestD = GRAB;
  (lines || []).forEach((l, i) => {
    _a.set(l[0], l[1], l[2]); _b.set(l[3], l[4], l[5]);
    _p.set(pos.x, pos.y + HANG, pos.z);
    const ab = _b.clone().sub(_a), t = Math.max(0, Math.min(1, _p.clone().sub(_a).dot(ab) / ab.lengthSq()));
    const d = _a.clone().addScaledVector(ab, t).distanceTo(_p);
    if (d < bestD) { bestD = d; best = { i, t }; }
  });
  return best;
}

// A point on cable i at t, as the rider's feet position.
export function zipFeet(l, t, out) {
  return out.set(l[0] + (l[3] - l[0]) * t, l[1] + (l[4] - l[1]) * t - HANG, l[2] + (l[5] - l[2]) * t);
}
export const zipLength = (l) => Math.hypot(l[3] - l[0], l[4] - l[1], l[5] - l[2]);
