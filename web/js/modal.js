// Blender-style modal transforms: press G / R / S, move the mouse, constrain
// with X / Y / Z (twice = local axis, Shift = exclude that axis), type a value,
// hold Ctrl to snap; LMB / Enter confirms, RMB / Esc cancels.
//
// A target is { pivot: Vector3 (world), localBasis?: Quaternion, can: {move, rotate, scale},
//               begin(), apply(t), cancel(), commit() }, where t is
// { kind, matrix (world transform about the pivot), translation, axis, angle, scale, basis }.
import * as THREE from 'three';

const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const KIND_LABEL = { move: 'Move', rotate: 'Rotate', scale: 'Scale' };

export class ModalTransform {
  constructor({ canvas, getCamera, setHud, onActiveChange }) {
    this.canvas = canvas;
    this.getCamera = getCamera;
    this.setHud = setHud;
    this.onActiveChange = onActiveChange;
    this.state = null;
    this.mouse = null;
    canvas.addEventListener('pointermove', (e) => { this.mouse = this._local(e); });
    window.addEventListener('pointermove', (e) => { if (this.state) { this.mouse = this._local(e); this._update(e.ctrlKey); } });
    window.addEventListener('pointerdown', (e) => {
      if (!this.state) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.button === 2) this.cancel(); else this.confirm();
    }, true);
    window.addEventListener('contextmenu', (e) => { if (this.state || this.justEnded) e.preventDefault(); }, true);
  }

  get active() { return !!this.state; }

  _local(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  }

  _ray(m) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((m.x / m.w) * 2 - 1, -(m.y / m.h) * 2 + 1), this.getCamera());
    return ray.ray;
  }

  _screen(p) {
    const r = this.canvas.getBoundingClientRect();
    const v = p.clone().project(this.getCamera());
    return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height };
  }

  start(kind, target) {
    if (this.state) return false;
    if (!target || !target.can[kind]) return false;
    const r = this.canvas.getBoundingClientRect();
    const m = this.mouse && this.mouse.w ? this.mouse : { x: r.width * 0.6, y: r.height * 0.4, w: r.width, h: r.height };
    target.begin();
    this.state = { kind, target, axis: null, local: false, exclude: false, num: '', m0: { ...m }, base: null };
    this.mouse = m;
    this._rebase();
    this.onActiveChange?.(true);
    this._update(false);
    return true;
  }

  // Re-anchor mouse references (after a constraint change).
  _rebase() {
    const s = this.state;
    const cam = this.getCamera();
    const fwd = cam.getWorldDirection(new THREE.Vector3());
    s.view = fwd;
    s.ps = this._screen(s.target.pivot);
    s.plane0 = this._hitPlane(s.m0);
  }

  _axisVec() {
    const s = this.state;
    if (!s.axis) return null;
    const v = AXES[s.axis].clone();
    if (s.local && s.target.localBasis) v.applyQuaternion(s.target.localBasis);
    return v.normalize();
  }

  _hitPlane(m) {
    const s = this.state;
    const a = this._axisVec();
    const n = a && s.exclude ? a : s.view;
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, s.target.pivot);
    return this._ray(m).intersectPlane(plane, new THREE.Vector3());
  }

  // Parameter t of the point P + t*a on the constraint axis closest to the mouse ray.
  _axisParam(m, a) {
    const ray = this._ray(m);
    const w = this.state.target.pivot.clone().sub(ray.origin);
    const b = ray.direction.dot(a);
    const den = 1 - b * b;
    return den < 1e-6 ? 0 : (b * ray.direction.dot(w) - a.dot(w)) / den;
  }

  _update(snap) {
    const s = this.state;
    if (!s) return;
    const m = this.mouse;
    const a = this._axisVec();
    const num = s.num !== '' && s.num !== '-' && s.num !== '.' ? parseFloat(s.num) : null;
    const t = { kind: s.kind, axis: a, local: s.local };
    const P = s.target.pivot;
    let label;
    if (s.kind === 'move') {
      let d = new THREE.Vector3();
      if (num !== null) d.copy(a && !s.exclude ? a : AXES.x).multiplyScalar(num);
      else if (a && !s.exclude) d.copy(a).multiplyScalar(this._axisParam(m, a) - this._axisParam(s.m0, a));
      else {
        const h = this._hitPlane(m);
        if (h && s.plane0) d.subVectors(h, s.plane0);
      }
      if (snap && num === null) d.set(...d.toArray().map((x) => Math.round(x / 0.05) * 0.05));
      t.translation = d;
      t.matrix = new THREE.Matrix4().makeTranslation(d.x, d.y, d.z);
      label = a && !s.exclude ? `${d.dot(a).toFixed(3)} m` : `${d.x.toFixed(3)}, ${d.y.toFixed(3)}, ${d.z.toFixed(3)} m`;
    } else if (s.kind === 'rotate') {
      let ang;
      if (num !== null) ang = THREE.MathUtils.degToRad(num);
      else {
        const a0 = Math.atan2(-(s.m0.y - s.ps.y), s.m0.x - s.ps.x);
        const a1 = Math.atan2(-(m.y - s.ps.y), m.x - s.ps.x);
        ang = a1 - a0;
        if (snap) ang = THREE.MathUtils.degToRad(Math.round(THREE.MathUtils.radToDeg(ang) / 5) * 5);
      }
      const toViewer = s.view.clone().negate();
      let axis = a || toViewer;
      if (a && num === null && a.dot(toViewer) < 0) ang = -ang;
      if (s.exclude) axis = toViewer;
      t.axis = axis;
      t.angle = ang;
      const q = new THREE.Quaternion().setFromAxisAngle(axis, ang);
      t.quaternion = q;
      t.matrix = new THREE.Matrix4().makeTranslation(P.x, P.y, P.z)
        .multiply(new THREE.Matrix4().makeRotationFromQuaternion(q))
        .multiply(new THREE.Matrix4().makeTranslation(-P.x, -P.y, -P.z));
      label = `${THREE.MathUtils.radToDeg(ang).toFixed(1)}°`;
    } else {
      let f;
      if (num !== null) f = num;
      else {
        const d0 = Math.hypot(s.m0.x - s.ps.x, s.m0.y - s.ps.y), d1 = Math.hypot(m.x - s.ps.x, m.y - s.ps.y);
        f = d0 > 2 ? d1 / d0 : 1;
        if (snap) f = Math.round(f / 0.1) * 0.1;
      }
      const sv = new THREE.Vector3(1, 1, 1);
      if (!s.axis) sv.setScalar(f);
      else for (const k of ['x', 'y', 'z']) if ((k === s.axis) !== s.exclude) sv[k] = f;
      const basis = new THREE.Quaternion();
      if (s.local && s.target.localBasis) basis.copy(s.target.localBasis);
      t.scale = sv;
      t.basis = basis;
      const B = new THREE.Matrix4().makeRotationFromQuaternion(basis);
      t.matrix = new THREE.Matrix4().makeTranslation(P.x, P.y, P.z)
        .multiply(B).multiply(new THREE.Matrix4().makeScale(sv.x, sv.y, sv.z)).multiply(B.clone().invert())
        .multiply(new THREE.Matrix4().makeTranslation(-P.x, -P.y, -P.z));
      label = `×${f.toFixed(3)}`;
    }
    s.target.apply(t);
    const con = s.axis ? ` · ${s.exclude ? 'not ' : ''}${s.axis.toUpperCase()}${s.local ? ' local' : ''}` : '';
    this.setHud?.(`${KIND_LABEL[s.kind]}${con} · ${s.num !== '' ? '[' + s.num + '] ' : ''}${label} · X/Y/Z axis, Ctrl snap, click/Enter ok, Esc/RMB cancel`);
  }

  // Returns true when the key belongs to the modal operation.
  key(e) {
    const s = this.state;
    if (!s) return false;
    const k = e.key.toLowerCase();
    e.preventDefault();
    e.stopImmediatePropagation();
    if (k === 'escape') return this.cancel(), true;
    if (k === 'enter' || k === ' ') return this.confirm(), true;
    if (k === 'x' || k === 'y' || k === 'z') {
      if (s.axis === k && !s.exclude === !e.shiftKey) {
        if (!s.local && s.target.localBasis) s.local = true;
        else { s.axis = null; s.local = false; }
      } else {
        s.axis = k;
        s.local = false;
        s.exclude = e.shiftKey && s.kind !== 'rotate';
      }
      this._rebase();
    } else if (/^[0-9]$/.test(k) || k === '.') s.num += k;
    else if (k === '-') s.num = s.num.startsWith('-') ? s.num.slice(1) : '-' + s.num;
    else if (k === 'backspace') s.num = s.num.slice(0, -1);
    else if ((k === 'g' || k === 'r' || k === 's') && s.target.can[{ g: 'move', r: 'rotate', s: 'scale' }[k]]) {
      // Switch operation like Blender: back to the start state, keep going.
      s.target.cancel(true);
      s.target.begin();
      s.kind = { g: 'move', r: 'rotate', s: 'scale' }[k];
      s.axis = null; s.local = false; s.exclude = false; s.num = '';
      s.m0 = { ...this.mouse };
      this._rebase();
    }
    this._update(e.ctrlKey);
    return true;
  }

  confirm() {
    const s = this.state;
    if (!s) return;
    this.state = null;
    s.target.commit();
    this._end();
  }

  cancel() {
    const s = this.state;
    if (!s) return;
    this.state = null;
    s.target.cancel(false);
    this._end();
  }

  _end() {
    this.setHud?.('');
    this.onActiveChange?.(false);
    this.justEnded = true;
    setTimeout(() => { this.justEnded = false; }, 300);
  }
}
