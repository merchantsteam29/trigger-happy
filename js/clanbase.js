import * as THREE from 'three';
import { SPRAY_PALETTE } from './clans.js';

// Clan bases: any clan member opens their clan's own private map from the clan card. It's an
// editor-format map (editor.js) with an extra `clan` part: tag, name, color, spray and a plaque line.
// It travels to everyone who joins like any editor map, and clanDecor draws the clan's sign over
// the stage, their spray on the side walls and the plaque (war record, clan season) at the back.

const TAG_RE = /^[A-Z0-9]{2,5}$/, SPRAY_RE = /^[0-9a-f]{256}$/;
const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

export function cleanClanDeco(c) {
  if (!c || typeof c !== 'object' || !TAG_RE.test(c.tag)) return null;
  return { tag: c.tag, name: clip(c.name, 24), color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#ffb020', spray: SPRAY_RE.test(c.spray || '') ? c.spray : null, plaque: clip(c.plaque, 70) };
}

// The base: a stage with the clan sign, towers with stairs, cover, a jump pad, pickups, and red / blue
// spawns on either side for practice scrims.
export function clanBaseMap(clan, plaque = '') {
  const b = (x0, z0, x1, z1, y0, h, mat, dir = 0, ramp = 0) => [x0, z0, x1, z1, y0, h, mat, dir, ramp];
  return {
    v: 1, name: `[${clan.tag}] Clan base`, theme: 'night',
    boxes: [
      b(-8, -21.5, 8, -17, 0, 1, 'neonBlock'), b(-2, -17, 2, -14, 0, 1, 'neonBlock', '-z', 1), // the stage, a ramp up
      b(-14, -14, -12, -12, 0, 6, 'concreteWall'), b(12, -14, 14, -12, 0, 6, 'concreteWall'), b(-14, 12, -12, 14, 0, 6, 'concreteWall'), b(12, 12, 14, 14, 0, 6, 'concreteWall'),
      b(-22, -18, -18, -14, 0, 4, 'brickDark'), b(-18, -18, -16, -14, 0, 4, 'brickDark', '-x'), // west tower + stairs
      b(18, 14, 22, 18, 0, 4, 'brickDark'), b(16, 14, 18, 18, 0, 4, 'brickDark', '+x'), // east tower + stairs
      b(-26, -6, -24.5, 6, 0, 1.4, 'sandbag'), b(24.5, -6, 26, 6, 0, 1.4, 'sandbag'), // red and blue cover
      b(-8, 6, -6, 8, 0, 1.2, 'crate'), b(6, -8, 8, -6, 0, 1.2, 'crate'), b(-3, -3, 3, 3, 0, 0.5, 'metalFloor'),
      b(-18, 4, -14, 6, 0, 1.2, 'containerRed'), b(14, -6, 18, -4, 0, 1.2, 'containerBlue'),
      b(-1, 9, 1, 11, 0, 0.15, 'pad'),
    ],
    spawns: [[-27, 0, -10, 1], [-27, 0, 0, 1], [-27, 0, 10, 1], [27, 0, -10, 2], [27, 0, 0, 2], [27, 0, 10, 2], [0, 1, -19, 0], [0, 0, 18, 0]],
    pickups: [['power', 0, 0.5, 0], ['hp', -20, 0, 0], ['hp', 20, 0, 0], ['ammo', 0, 0, 15]],
    clan: cleanClanDeco({ ...clan, plaque }),
  };
}

function textPlane(w, h, draw, pxPerM = 64) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * pxPerM); c.height = Math.round(h * pxPerM);
  draw(c.getContext('2d'), c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }));
}

// Adds the clan's sign, sprays and plaque to the map's scene group (editor walls: x ±30, z ±22).
export function clanDecor(g, d) {
  if (!d) return;
  const sign = textPlane(16, 3.4, (x, w, h) => {
    const grad = x.createLinearGradient(0, 0, w, h); grad.addColorStop(0, '#0d0a18'); grad.addColorStop(1, '#1d1530');
    x.fillStyle = grad; x.fillRect(0, 0, w, h);
    x.strokeStyle = d.color; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, h - 14);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = d.color; x.shadowBlur = 30;
    x.fillStyle = d.color; x.font = `900 ${Math.round(h * 0.42)}px Rubik, sans-serif`; x.fillText(`[${d.tag}]`, w / 2, h * 0.38);
    x.shadowBlur = 0; x.fillStyle = '#ffffff'; x.font = `700 ${Math.round(h * 0.2)}px Rubik, sans-serif`; x.fillText(d.name || '', w / 2, h * 0.76);
  });
  sign.position.set(0, 4.4, -21.68);
  g.add(sign);
  if (d.plaque) {
    const pl = textPlane(9, 1.1, (x, w, h) => {
      x.fillStyle = 'rgba(10,8,20,0.85)'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#ffd23a'; x.lineWidth = 5; x.strokeRect(3, 3, w - 6, h - 6);
      x.fillStyle = '#ffd23a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `700 ${Math.round(h * 0.42)}px Rubik, sans-serif`;
      x.fillText(d.plaque, w / 2, h / 2, w - 30);
    });
    pl.position.set(0, 2.6, 21.68); pl.rotation.y = Math.PI;
    g.add(pl);
  }
  if (d.spray) {
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const x = c.getContext('2d');
    for (let i = 0; i < 256; i++) { const col = SPRAY_PALETTE[parseInt(d.spray[i], 16)]; if (col) { x.fillStyle = col; x.fillRect(i % 16, (i / 16) | 0, 1, 1); } }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const z of [-12, 0, 12]) for (const side of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), mat);
      m.position.set(side * 29.68, 2.4, z); m.rotation.y = -side * Math.PI / 2;
      g.add(m);
    }
  }
  // Clan-colored light strips along the stage
  const strip = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: d.color }));
  strip.position.set(0, 1.04, -17);
  g.add(strip);
}
