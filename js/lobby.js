import * as THREE from 'three';
import { RemotePlayer } from './remote.js';
import { EMOTES } from './emotes.js';
import { POSE_ITEMS } from './poses.js';
import { esc } from './util.js';

// The Character screen's live preview: your 3D character (the same model everyone sees in matches)
// in what you're wearing or trying on, holding your main gun with its charm, slowly turning (drag to
// turn it yourself). The buttons under it play your emotes and your victory pose. It has its own
// small renderer and only draws while it's on screen.

export class Lobby3D {
  constructor() {
    this.ok = true;
    this.yaw = 0.5; this.drag = null;
  }

  init() {
    if (this.r || !this.ok) return !!this.r;
    try {
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'cz-3d';
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    } catch { this.ok = false; return false; }
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    this.renderer.setSize(200, 262, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#f4ecff', '#3a2a40', 2.2));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.4); sun.position.set(2, 4, 3); this.scene.add(sun);
    const rim = new THREE.DirectionalLight('#ff4f9a', 1.4); rim.position.set(-3, 2, -2); this.scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.25 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01;
    this.scene.add(floor);
    this.camera = new THREE.PerspectiveCamera(32, 200 / 262, 0.1, 50);
    this.camera.position.set(0, 1.4, 5.4);
    this.camera.lookAt(0, 1.3, 0); // room for an emote bubble over the head
    this.r = new RemotePlayer(this.scene, 'lobby', '', '#fff', null, {});
    Object.assign(this.r, { hasState: true, alive: true, replay: true });
    this.r.pos.set(0, 0, 0); this.r.prev.set(0, 0, 0);
    this.r.root.visible = this.r.limbs.visible = true;
    // Drag to turn
    this.canvas.addEventListener('pointerdown', (e) => { this.drag = { x: e.clientX, yaw: this.yaw }; this.canvas.setPointerCapture(e.pointerId); });
    this.canvas.addEventListener('pointermove', (e) => { if (this.drag) this.yaw = this.drag.yaw + (e.clientX - this.drag.x) * 0.012; });
    this.canvas.addEventListener('pointerup', () => { this.drag = null; this.idleAt = performance.now(); });
    return true;
  }

  // Puts the preview into the Character screen's stage (replacing the flat picture) and shows `cos`.
  // gun: the weapon to hold. buttons: an element for the emote / pose buttons.
  mount(stage, cos, color, gun, buttons) {
    if (!this.init()) return false;
    const flat = stage.querySelector('canvas:not(.cz-3d)');
    if (flat) flat.style.display = 'none';
    if (this.canvas.parentElement !== stage) stage.appendChild(this.canvas);
    this.r.setCosmetics(cos);
    if (color !== this.color) { this.color = color; this.r.setLook(color, false, false); }
    this.r.setWeapon(gun || 'ar'); this.r.swapT = 0;
    this.cos = cos;
    if (buttons) {
      const pose = POSE_ITEMS.find((p) => p.id === cos.pose) || POSE_ITEMS[0];
      buttons.innerHTML = EMOTES.map((e) => `<button data-emote="${e.id}" title="${esc(e.name)}">${e.icon}</button>`).join('') + `<button data-pose title="Your victory pose: ${esc(pose.name)}">${pose.icon}</button>`;
      buttons.querySelectorAll('[data-emote]').forEach((b) => { b.onclick = () => this.play('emote', b.dataset.emote); });
      buttons.querySelector('[data-pose]').onclick = () => this.play('pose', this.cos.pose || 'cheer');
    }
    if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame((t) => this.loop(t)); }
    return true;
  }

  play(kind, id) {
    const r = this.r;
    if (kind === 'emote') { r.setPose(null); r.emote(id); } else { r.emoteT = 0; r.setPose(id); this.poseEnd = performance.now() + 4500; }
  }

  loop(now) {
    if (!this.canvas.isConnected) { this.running = false; return; } // left the Character screen
    requestAnimationFrame((t) => this.loop(t));
    if (document.hidden || !this.canvas.offsetParent) { this.last = now; return; }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.drag && now - (this.idleAt || 0) > 2500) this.yaw += dt * 0.35; // slowly turns
    const r = this.r;
    if (r.poseId && now > this.poseEnd) r.setPose(null);
    r.yaw = this.yaw; r.pitch = 0;
    r.update(dt);
    r.tag.visible = false;
    this.renderer.render(this.scene, this.camera);
  }
}
