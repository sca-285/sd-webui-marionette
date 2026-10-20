// Maya-style FK controls: a coloured ring around each joint, perpendicular to
// the bone, sized to wrap the limb. All rings go into one batched line mesh
// (one draw call, plus one for the selected ring), drawn with screen-space
// line width and picked in screen space (the curve itself, or the joint
// centre for rings too small to hit).
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export const CONTROL_SCHEMES = {
  maya: { label: 'Maya (L blue · C red · R green)', left: 0x2f6bff, right: 0x22c55e, center: 0xef4444, extra: 0xa855f7 },
  classic: { label: 'Classic (L blue · C yellow · R red)', left: 0x3b82f6, right: 0xef4444, center: 0xfacc15, extra: 0xa855f7 },
};
const SEL = 0xffffff;
const ROOT_COLOR = 0xfacc15;
const SEG = 32;
const CIRCLE = Array.from({ length: SEG }, (_, i) => {
  const a = (i / SEG) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
});

function batch(rings, material) {
  const g = new LineSegmentsGeometry();
  g.setPositions(new Float32Array(rings * SEG * 6));
  g.setColors(new Float32Array(rings * SEG * 6));
  const line = new LineSegments2(g, material);
  line.frustumCulled = false;
  line.renderOrder = 999;
  return line;
}

// Ring radius (m, for a 1.72 m figure) and where it sits along the bone (0..1).
function ringSpec(rig, key) {
  if (key === 'hips') return { r: 0.2, up: true };
  if (/^spine\d+$/.test(key)) return { r: 0.15 };
  if (key === 'neck') return { r: 0.065, at: 0.4 };
  if (key === 'head') return { r: 0.12, at: 0.45 };
  if (rig.isExtra(key) && !/(UpperArm|LowerArm|Hand)\d$/.test(key)) return { r: null };
  const side = rig.sideOf(key);
  const part = side ? key.slice(side.length).replace(/^(UpperArm|LowerArm|Hand)\d$/, '$1') : key;
  if (/^Thumb\d$/.test(part)) return { r: 0.013, at: 0.3, finger: true };
  if (/^(Index|Middle|Ring|Little)\d$/.test(part)) return { r: 0.011, at: 0.3, finger: true };
  return {
    Shoulder: { r: 0.045, at: 0.55 }, UpperArm: { r: 0.075 }, LowerArm: { r: 0.06 }, Hand: { r: 0.05, at: 0.15 },
    UpperLeg: { r: 0.1 }, LowerLeg: { r: 0.075 }, Foot: { r: 0.07, parentAxis: true }, Toes: { r: 0.04, at: 0.3 },
  }[part] || { r: 0.06 };
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);
const _up = new THREE.Vector3(0, 1, 0);
const _p = new THREE.Vector3();
const _p2 = new THREE.Vector3();

export class RigControls {
  constructor(group) {
    this.group = group;
    this.scheme = 'maya';
    this.width = 2;
    this.mat = new LineMaterial({ vertexColors: true, linewidth: this.width, depthTest: false, transparent: true, opacity: 0.95 });
    this.selMat = new LineMaterial({ color: SEL, linewidth: this.width + 1.5, depthTest: false, transparent: true });
    this.rings = [];
    this.lines = null;
    this.selLine = batch(1, this.selMat);
    this.selLine.renderOrder = 1000;
    // Root ("main") control: a big ring on the floor with four arrows, moves
    // and turns the whole character.
    this.rootMat = new LineMaterial({ color: ROOT_COLOR, linewidth: this.width + 0.5, depthTest: false, transparent: true });
    this.rootLine = batch(1, this.rootMat);
    this.rootLine.geometry.setPositions(new Float32Array((SEG + 8) * 6));
    this.rootLine.renderOrder = 998;
    this.root = { key: 'root', matrix: new THREE.Matrix4(), position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), visible: false };
  }

  // Line width is in pixels of the viewport being drawn (per view pane).
  setResolution(w, h) {
    this.mat.resolution.set(w, h);
    this.selMat.resolution.set(w, h);
    this.rootMat.resolution.set(w, h);
  }

  // Where the root control sits: on the floor under the hips, facing the
  // character's heading.
  rootFrame(rig) {
    const hips = rig.map.hips.getWorldPosition(new THREE.Vector3());
    const feet = ['leftFoot', 'rightFoot'].filter((k) => rig.map[k])
      .map((k) => rig.map[k].getWorldPosition(new THREE.Vector3()).y - (rig.restY[k] ?? 0));
    const y = feet.length ? Math.min(...feet) : hips.y - rig.restHips.y;
    return { position: new THREE.Vector3(hips.x, Math.min(y, hips.y), hips.z), quaternion: rig.facing() };
  }

  setScheme(name) {
    if (CONTROL_SCHEMES[name]) this.scheme = name;
  }

  build(rig) {
    this.group.clear();
    this.rig = rig;
    this.rings = rig.order.map((k) => {
      const spec = ringSpec(rig, k);
      return { key: k, side: rig.isExtra(k) ? 'extra' : rig.sideOf(k) || 'center', finger: !!spec.finger, spec,
        matrix: new THREE.Matrix4(), position: new THREE.Vector3(), visible: false };
    });
    this.lines?.geometry.dispose();
    this.lines = batch(this.rings.length, this.mat);
    this.group.add(this.rootLine, this.lines, this.selLine);
  }

  // Place every ring for the current pose. opts: { selected, showFingers, ikMode, resolution }
  update(opts) {
    const rig = this.rig;
    if (!rig || !this.lines) return;
    this.setResolution(opts.resolution.x, opts.resolution.y);
    const scale = rig.height / 1.72;
    const selSide = opts.selected && !opts.selected.startsWith('ik:') ? rig.sideOf(opts.selected) : null;
    const selHand = opts.selected && (opts.selected.endsWith('Hand') || rig.isFingerKey(opts.selected));
    const pos = this.lines.geometry.attributes.instanceStart.data;
    const col = this.lines.geometry.attributes.instanceColorStart.data;
    const colors = CONTROL_SCHEMES[this.scheme];
    const c = new THREE.Color(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    let n = 0;
    this.selLine.visible = false;
    for (const ring of this.rings) {
      const { key, side, finger, spec } = ring;
      const bone = rig.map[key];
      let visible = !finger || opts.showFingers || (selHand && side === selSide);
      if (opts.ikMode && /(Hand|Foot)$/.test(key)) visible = false;
      ring.visible = false;
      if (!visible) continue;
      bone.getWorldPosition(_a);
      // Axis: the bone's direction (towards its child joint).
      const child = this._child(key);
      let len = 0;
      if (spec.up) _b.copy(_up).applyQuaternion(rig.delta('hips'));
      else if (spec.parentAxis) _b.copy(_a).sub(bone.parent.getWorldPosition(sc));
      else if (child) { _b.copy(child.getWorldPosition(sc)).sub(_a); len = _b.length(); }
      else _b.set(0, 1, 0);
      if (spec.r === null && !len) continue;
      if (_b.lengthSq() < 1e-12) _b.set(0, 1, 0);
      _b.normalize();
      const r = (spec.r ?? THREE.MathUtils.clamp(len * 0.3, 0.03, 0.09)) * scale;
      ring.position.copy(_a).addScaledVector(_b, (spec.at || 0) * len);
      ring.matrix.compose(ring.position, q.setFromUnitVectors(_z, _b), sc.setScalar(r));
      ring.visible = true;
      const isSel = key === opts.selected;
      const target = isSel ? this.selLine.geometry.attributes.instanceStart.data.array : pos.array;
      let o = isSel ? 0 : n * SEG * 6;
      c.setHex(colors[side]);
      for (let i = 0; i < SEG; i++, o += 6) {
        _p.copy(CIRCLE[i]).applyMatrix4(ring.matrix);
        _p2.copy(CIRCLE[(i + 1) % SEG]).applyMatrix4(ring.matrix);
        target[o] = _p.x; target[o + 1] = _p.y; target[o + 2] = _p.z;
        target[o + 3] = _p2.x; target[o + 4] = _p2.y; target[o + 5] = _p2.z;
        if (!isSel) { col.array[o] = col.array[o + 3] = c.r; col.array[o + 1] = col.array[o + 4] = c.g; col.array[o + 2] = col.array[o + 5] = c.b; }
      }
      if (isSel) {
        this.selLine.visible = true;
        this.selLine.geometry.attributes.instanceStart.data.needsUpdate = true;
      } else n++;
    }
    this.lines.geometry.instanceCount = n * SEG;
    this._updateRoot(rig, scale, opts.selected === 'root');
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  _updateRoot(rig, scale, selected) {
    const f = this.rootFrame(rig);
    const R = this.root;
    R.position.copy(f.position);
    R.quaternion.copy(f.quaternion);
    // Ring lies flat: local XY plane -> world XZ.
    R.matrix.compose(f.position, f.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)),
      new THREE.Vector3().setScalar(0.42 * scale));
    R.visible = true;
    const arr = this.rootLine.geometry.attributes.instanceStart.data.array;
    let o = 0;
    const put = (a, b) => {
      _p.copy(a).applyMatrix4(R.matrix); _p2.copy(b).applyMatrix4(R.matrix);
      arr[o++] = _p.x; arr[o++] = _p.y; arr[o++] = _p.z; arr[o++] = _p2.x; arr[o++] = _p2.y; arr[o++] = _p2.z;
    };
    for (let i = 0; i < SEG; i++) put(CIRCLE[i], CIRCLE[(i + 1) % SEG]);
    // Arrow heads at the four quarters; the front one (local -Y = character forward) is longer.
    for (const [x, y, len] of [[0, -1, 0.35], [1, 0, 0.18], [0, 1, 0.18], [-1, 0, 0.18]]) {
      const tip = new THREE.Vector3(x * (1 + len), y * (1 + len), 0);
      const side = new THREE.Vector3(-y, x, 0).multiplyScalar(0.12);
      const base = new THREE.Vector3(x, y, 0);
      put(base.clone().add(side), tip);
      put(base.clone().sub(side), tip);
    }
    this.rootLine.geometry.attributes.instanceStart.data.needsUpdate = true;
    this.rootLine.geometry.instanceCount = SEG + 8;
    this.rootMat.color.setHex(selected ? SEL : ROOT_COLOR);
    this.rootMat.linewidth = this.width + (selected ? 1.5 : 0.5);
  }

  _child(key) {
    const rig = this.rig;
    const f = key.match(/^(left|right)(Thumb|Index|Middle|Ring|Little)(\d)$/);
    if (f) return rig.fingers[f[1]][f[2]][+f[3] + 1] || rig.tips[f[1]][f[2]] || null;
    return rig.childOf(key);
  }

  // Screen-space pick. px: [x, y] in canvas pixels. Returns the key or null.
  pick(camera, px, size, tolerance = 7) {
    if (!this.group.visible) return null;
    const toScreen = (v) => {
      v.project(camera);
      return v.z > 1 ? null : [(v.x + 1) / 2 * size[0], (1 - v.y) / 2 * size[1]];
    };
    let best = null, bestD = tolerance;
    for (const ring of [...this.rings, this.root]) {
      if (!ring.visible) continue;
      let prev = null, first = null;
      for (let i = 0; i <= SEG; i++) {
        const s = toScreen(_a.copy(CIRCLE[i % SEG]).applyMatrix4(ring.matrix));
        if (s && prev) {
          const d = segDist(px, prev, s);
          if (d < bestD) { bestD = d; best = ring.key; }
        }
        prev = s;
        if (i === 0) first = s;
      }
      // Small rings (fingers, far away): the joint itself is a target too.
      const c = toScreen(_a.copy(ring.position));
      if (c && first && Math.hypot(first[0] - c[0], first[1] - c[1]) < 14) {
        const d = Math.hypot(px[0] - c[0], px[1] - c[1]) - 2;
        if (d < bestD) { bestD = d; best = ring.key; }
      }
    }
    return best;
  }

  // Screen point on a ring (for tests).
  ringPoint(key) {
    const ring = key === 'root' ? this.root : this.rings.find((r) => r.key === key);
    return ring ? new THREE.Vector3(1, 0, 0).applyMatrix4(ring.matrix) : null;
  }
}

function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? THREE.MathUtils.clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, 0, 1) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
