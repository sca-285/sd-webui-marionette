// Scene lighting, in the spirit of PoseMy.Art: key / fill / rim directional
// lights plus sky/ground ambient, set by azimuth / elevation around the
// subject (or around the camera's view when "follow camera" is on), with
// photographic presets, optional shadows and draggable handles in the views.
import * as THREE from 'three';

const D = THREE.MathUtils.degToRad;
const R = THREE.MathUtils.radToDeg;

export const LIGHT_NAMES = ['key', 'fill', 'rim'];

const L = (az, el, i, color = '#ffffff', on = true) => ({ az, el, i, color, on });
export const LIGHT_PRESETS = {
  'Viewport default': { key: L(35, 40, 1.8), fill: L(-60, 20, 0.5), rim: L(-145, 30, 0.6), ambient: 1.2, sky: '#ffffff', ground: '#50505a' },
  'Studio 3-point': { key: L(40, 35, 2.2, '#fff4e8'), fill: L(-50, 15, 0.7, '#e8f0ff'), rim: L(160, 40, 1.4), ambient: 0.35, sky: '#ffffff', ground: '#3a3a40' },
  Rembrandt: { key: L(50, 45, 2.6, '#fff1e0'), fill: L(-60, 10, 0.25), rim: L(-150, 30, 0.4), ambient: 0.15, sky: '#ffffff', ground: '#202024' },
  Loop: { key: L(30, 30, 2.4, '#fff4ea'), fill: L(-40, 10, 0.5), rim: L(170, 35, 0.8), ambient: 0.25, sky: '#ffffff', ground: '#2c2c30' },
  'Butterfly / paramount': { key: L(0, 55, 2.4), fill: L(0, -25, 0.5), rim: L(180, 30, 0.6, '#ffffff', false), ambient: 0.25, sky: '#ffffff', ground: '#2c2c30' },
  Split: { key: L(90, 10, 2.6), fill: L(-90, 0, 0.1, '#ffffff', false), rim: L(180, 20, 0.3, '#ffffff', false), ambient: 0.1, sky: '#ffffff', ground: '#18181a' },
  'Rim / backlight': { key: L(165, 25, 2.6), fill: L(0, 5, 0.3), rim: L(-165, 25, 2.0), ambient: 0.15, sky: '#ffffff', ground: '#18181a' },
  'Top light': { key: L(0, 85, 2.6), fill: L(0, 0, 0.2, '#ffffff', false), rim: L(180, 20, 0.3, '#ffffff', false), ambient: 0.12, sky: '#ffffff', ground: '#101012' },
  'Under light': { key: L(0, -45, 2.4, '#e6ffe8'), fill: L(0, 0, 0.1, '#ffffff', false), rim: L(180, 0, 0.3, '#ffffff', false), ambient: 0.08, sky: '#202028', ground: '#101012' },
  'Golden hour': { key: L(70, 12, 2.4, '#ffb46b'), fill: L(-90, 20, 0.5, '#6a8cff'), rim: L(-160, 15, 0.9, '#ffcf99'), ambient: 0.3, sky: '#ffd2a0', ground: '#4a3a5a' },
  Moonlight: { key: L(-60, 40, 1.2, '#9db4ff'), fill: L(80, 10, 0.15, '#6070a0'), rim: L(170, 30, 0.6, '#b0c4ff'), ambient: 0.15, sky: '#40507a', ground: '#0c0c14' },
};
export const DEFAULT_LIGHTING = { preset: 'Viewport default', ...structuredClone(LIGHT_PRESETS['Viewport default']), shadows: false, followCamera: false, handles: true };

export class LightRig {
  constructor(scene, getCamera) {
    this.scene = scene;
    this.getCamera = getCamera;
    this.center = new THREE.Vector3(0, 0.9, 0);
    this.radius = 1.2;
    this.target = new THREE.Object3D();
    scene.add(this.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x50505a, 1);
    scene.add(this.hemi);
    this.lights = {};
    this.handles = new THREE.Group();
    this.handles.name = 'lightHandles';
    scene.add(this.handles);
    for (const n of LIGHT_NAMES) {
      const l = new THREE.DirectionalLight(0xffffff, 1);
      l.target = this.target;
      scene.add(l);
      this.lights[n] = l;
      const h = new THREE.Group();
      h.userData.light = n;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]),
        new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.7 }));
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
      bulb.userData.light = n;
      line.renderOrder = bulb.renderOrder = 996;
      h.add(line, bulb);
      h.userData.line = line;
      h.userData.bulb = bulb;
      this.handles.add(h);
    }
    const key = this.lights.key;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    // Ground shadow catcher (only drawn while shadows are on, and only in the shaded pass).
    this.catcher = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.35 }));
    this.catcher.rotation.x = -Math.PI / 2;
    this.catcher.receiveShadow = true;
    this.catcher.userData.shadedOnly = true;
    this.catcher.visible = false;
    scene.add(this.catcher);
    this.state = structuredClone(DEFAULT_LIGHTING);
  }

  setState(s) {
    this.state = { ...structuredClone(DEFAULT_LIGHTING), ...structuredClone(s || {}) };
    for (const n of LIGHT_NAMES) this.state[n] = { ...DEFAULT_LIGHTING[n], ...(s?.[n] || {}) };
    this.update();
  }

  applyPreset(name) {
    const p = LIGHT_PRESETS[name];
    if (!p) return;
    const keep = { shadows: this.state.shadows, followCamera: this.state.followCamera, handles: this.state.handles };
    this.setState({ ...structuredClone(p), preset: name, ...keep });
  }

  // World direction toward the light (from the subject).
  direction(name) {
    const { az, el } = this.state[name];
    const a = D(az), e = D(el);
    if (!this.state.followCamera) return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
    const cam = this.getCamera();
    cam.updateMatrixWorld();
    const Rv = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const U = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const B = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2);
    return Rv.multiplyScalar(Math.sin(a) * Math.cos(e)).add(U.multiplyScalar(Math.sin(e))).add(B.multiplyScalar(Math.cos(a) * Math.cos(e))).normalize();
  }

  // Inverse of direction(): set a light's az / el from a world direction.
  setDirection(name, dir) {
    const d = dir.clone().normalize();
    let x = d.x, y = d.y, z = d.z;
    if (this.state.followCamera) {
      const cam = this.getCamera();
      cam.updateMatrixWorld();
      x = d.dot(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0));
      y = d.dot(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1));
      z = d.dot(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2));
    }
    this.state[name].el = Math.round(R(Math.asin(THREE.MathUtils.clamp(y, -1, 1))));
    this.state[name].az = Math.round(R(Math.atan2(x, z)));
    this.state.preset = 'Custom';
    this.update();
  }

  // Key light direction relative to a camera, for the IC-Light pass.
  keyRelativeTo(cam) {
    const d = this.direction('key');
    cam.updateMatrixWorld();
    const x = d.dot(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0));
    const y = d.dot(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1));
    const z = d.dot(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2));
    return { az: R(Math.atan2(x, z)), el: R(Math.asin(THREE.MathUtils.clamp(y, -1, 1))) };
  }

  setSubject(center, radius) {
    this.center.copy(center);
    this.radius = Math.max(0.5, radius);
    this.update();
  }

  update() {
    const s = this.state;
    this.target.position.copy(this.center);
    this.target.updateMatrixWorld();
    const dist = this.radius * 4;
    for (const n of LIGHT_NAMES) {
      const l = this.lights[n], c = s[n];
      const dir = this.direction(n);
      l.position.copy(this.center).addScaledVector(dir, dist);
      l.color.set(c.color);
      l.intensity = c.on ? c.i : 0;
      l.visible = c.on;
      const h = this.handles.children[LIGHT_NAMES.indexOf(n)];
      const end = this.center.clone().addScaledVector(dir, this.radius * 0.9);
      h.userData.line.geometry.setFromPoints([this.center, end]);
      h.userData.bulb.position.copy(end);
      h.userData.bulb.material.color.set(c.color);
      h.userData.line.material.color.set(c.color);
      h.visible = c.on;
    }
    this.hemi.intensity = s.ambient;
    this.hemi.color.set(s.sky);
    this.hemi.groundColor.set(s.ground);
    const key = this.lights.key;
    key.castShadow = !!s.shadows;
    if (s.shadows) {
      const r = this.radius * 1.4;
      Object.assign(key.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 0.1, far: dist + this.radius * 3 });
      key.shadow.camera.updateProjectionMatrix();
    }
    this.catcher.visible = !!s.shadows;
    this.handles.visible = !!s.handles;
  }

  // Characters and props cast / receive shadows while shadows are on.
  markShadows(objects) {
    for (const o of objects) o.traverse((m) => { if (m.isMesh) { m.castShadow = !!this.state.shadows; m.receiveShadow = !!this.state.shadows; } });
  }
}

// The direction ball: a shaded sphere seen from the front; click sets the
// light coming from the front half, Shift+click from the back half.
export function drawLightBall(canvas, rig, active) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, r = Math.min(W, H) / 2 - 6, cx = W / 2, cy = H / 2;
  const img = g.createImageData(W, H);
  const lights = LIGHT_NAMES.filter((n) => rig.state[n].on).map((n) => {
    const { az, el, i, color } = rig.state[n];
    const a = D(az), e = D(el);
    return { d: [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)], i, c: new THREE.Color(color) };
  });
  const amb = rig.state.ambient * 0.35;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / r, ny = (cy - y) / r, q = nx * nx + ny * ny;
      const o = (y * W + x) * 4;
      if (q > 1) { img.data[o + 3] = 0; continue; }
      const nz = Math.sqrt(1 - q);
      let cr = amb, cg = amb, cb = amb;
      for (const l of lights) {
        const k = Math.max(0, nx * l.d[0] + ny * l.d[1] + nz * l.d[2]) * l.i * 0.45;
        cr += k * l.c.r; cg += k * l.c.g; cb += k * l.c.b;
      }
      img.data[o] = Math.min(255, cr * 255); img.data[o + 1] = Math.min(255, cg * 255); img.data[o + 2] = Math.min(255, cb * 255); img.data[o + 3] = 255;
    }
  }
  g.clearRect(0, 0, W, H);
  g.putImageData(img, 0, 0);
  // Light markers: filled = front half, ring = behind.
  for (const n of LIGHT_NAMES) {
    const s = rig.state[n];
    if (!s.on) continue;
    const a = D(s.az), e = D(s.el);
    const px = cx + Math.sin(a) * Math.cos(e) * r, py = cy - Math.sin(e) * r;
    const front = Math.cos(a) * Math.cos(e) >= 0;
    g.beginPath();
    g.arc(px, py, n === active ? 7 : 5, 0, Math.PI * 2);
    g.lineWidth = 2;
    g.strokeStyle = n === active ? '#ffffff' : '#000000';
    g.fillStyle = s.color;
    if (front) g.fill();
    g.stroke();
    g.fillStyle = '#000';
    g.font = '10px sans-serif';
    g.fillText(n[0].toUpperCase(), px + 8, py + 4);
  }
}

// Ball click -> az / el (front hemisphere, or back with Shift).
export function ballToAngles(canvas, ev) {
  const b = canvas.getBoundingClientRect();
  const r = Math.min(b.width, b.height) / 2 - 6 * (b.width / canvas.width);
  let nx = (ev.clientX - b.left - b.width / 2) / r, ny = (b.top + b.height / 2 - ev.clientY) / r;
  const q = nx * nx + ny * ny;
  if (q > 1) { const k = 1 / Math.sqrt(q); nx *= k; ny *= k; }
  let nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  if (ev.shiftKey) nz = -nz;
  return { az: Math.round(R(Math.atan2(nx, nz))), el: Math.round(R(Math.asin(THREE.MathUtils.clamp(ny, -1, 1)))) };
}
