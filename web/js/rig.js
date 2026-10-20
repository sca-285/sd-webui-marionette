// Bone resolution, rig normalisation, pose I/O, IK and OpenPose keypoints.
//
// Every model is normalised on load: upright (+Y), facing +Z, ~1.72 units tall,
// feet on the floor. Poses are stored as world-space rotation deltas from each
// rig's own rest pose, keyed by canonical bone names, so a pose saved on one
// model can be loaded onto another.
import * as THREE from 'three';
import { facePoints, faceNormal, DEFAULT_FACE } from './face.js';
import { buildLimits, clampJoint, jointWithin, twistAngle } from './limits.js';

export const SIDES = ['left', 'right'];
export const FINGER_NAMES = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
const LIMB_KEYS = ['Shoulder', 'UpperArm', 'LowerArm', 'Hand', 'UpperLeg', 'LowerLeg', 'Foot', 'Toes'];
const TARGET_HEIGHT = 1.72;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const wpos = (o, out = new THREE.Vector3()) => o.getWorldPosition(out);
const wquat = (o, out = new THREE.Quaternion()) => o.getWorldQuaternion(out);

// ---------------------------------------------------------------- resolving

const SIDE_PARTS = {
  shoulder: 'Shoulder', clavicle: 'Shoulder', collar: 'Shoulder', collarbone: 'Shoulder',
  upperarm: 'UpperArm', arm: 'UpperArm', uparm: 'UpperArm',
  lowerarm: 'LowerArm', forearm: 'LowerArm', elbow: 'LowerArm',
  hand: 'Hand', wrist: 'Hand',
  upperleg: 'UpperLeg', upleg: 'UpperLeg', thigh: 'UpperLeg', hip: 'UpperLeg',
  lowerleg: 'LowerLeg', leg: 'LowerLeg', shin: 'LowerLeg', calf: 'LowerLeg', knee: 'LowerLeg',
  foot: 'Foot', ankle: 'Foot',
  toes: 'Toes', toebase: 'Toes', toe: 'Toes', ball: 'Toes',
};
const CENTER_PARTS = { hips: 'hips', pelvis: 'hips', hip: 'hips', neck: 'neck', neck01: 'neck', neck1: 'neck', head: 'head' };
const NOISE = new Set(['j', 'bip', 'bip01', 'bip001', 'def', 'org', 'cc', 'base', 'c', 'bone', 'jnt', 'joint', 'b']);
const REJECT = new Set(['ik', 'mch', 'ctrl', 'ctl', 'fk', 'pole', 'target', 'twist', 'roll', 'end', 'nub', 'helper', 'sec', 'adj', 'tweak']);
const FINGER_RANK = { metacarpal: 0, proximal: 1, intermediate: 2, distal: 3 };

function classifyCore(core, side) {
  let m = core.match(/^(?:hand)?f?(thumb|index|middle|ring|pinky|little)(?:finger)?0*(\d+)$/);
  if (!m) {
    const r = core.match(/^(thumb|index|middle|ring|little)(metacarpal|proximal|intermediate|distal)$/);
    if (r) m = [null, r[1], FINGER_RANK[r[2]]];
  }
  if (m) {
    if (!side) return null;
    const finger = m[1] === 'pinky' ? 'Little' : m[1][0].toUpperCase() + m[1].slice(1);
    return { side, finger, n: Number(m[2]) };
  }
  if (side) return SIDE_PARTS[core] ? { key: side + SIDE_PARTS[core] } : null;
  return CENTER_PARTS[core] ? { key: CENTER_PARTS[core] } : null;
}

export function classifyBoneName(raw) {
  const s = raw.toLowerCase().replace(/^mixamorig\d*[:_]?/, '');
  let tokens = s.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.some((t) => REJECT.has(t))) return null;
  let side = null;
  tokens = tokens.flatMap((t) => {
    if (t === 'l' || t === 'left') { side = 'left'; return []; }
    if (t === 'r' || t === 'right') { side = 'right'; return []; }
    let m = t.match(/^(left|right)(.+)$/);
    if (m) { side = m[1]; return [m[2]]; }
    m = t.match(/^(.+?)(left|right)$/);
    if (m) { side = m[2]; return [m[1]]; }
    return [t];
  });
  const core = tokens.filter((t) => !NOISE.has(t)).join('');
  let r = classifyCore(core, side);
  // Sanitised names like "upper_armL" lose the separator before the side letter.
  if (!r && !side && /[a-z][lr]$/.test(core)) r = classifyCore(core.slice(0, -1), core.endsWith('l') ? 'left' : 'right');
  return r;
}

export function resolveGeneric(object) {
  const skinBones = new Set();
  object.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.bones.forEach((b) => skinBones.add(b)); });
  const found = {};
  const fingerRaw = { left: {}, right: {} };
  object.traverse((o) => {
    if (!o.name || o.isMesh) return;
    const r = classifyBoneName(o.name);
    if (!r) return;
    const score = (skinBones.has(o) ? 2 : 0) + (o.isBone ? 1 : 0);
    if (r.finger) {
      const list = (fingerRaw[r.side][r.finger] ||= {});
      if (!list[r.n] || list[r.n].score < score) list[r.n] = { obj: o, score };
    } else if (!found[r.key] || found[r.key].score < score) {
      found[r.key] = { obj: o, score };
    }
  });
  const bones = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.obj]));
  const fingers = { left: {}, right: {} };
  const tips = { left: {}, right: {} };
  for (const side of SIDES) {
    for (const f of FINGER_NAMES) {
      const raw = fingerRaw[side][f];
      if (!raw) continue;
      const hand = bones[side + 'Hand'];
      const objs = Object.keys(raw).map(Number).sort((a, b) => a - b).map((n) => raw[n].obj)
        .filter((o) => !hand || isDescendant(o, hand));
      if (!objs.length) continue;
      fingers[side][f] = objs.slice(0, 3);
      if (objs.length >= 4) tips[side][f] = objs[3];
    }
  }
  return { bones, fingers, tips };
}

export function resolveVRM(vrm) {
  const H = vrm.humanoid;
  const g = (n) => H.getRawBoneNode(n) || null;
  const bones = {};
  for (const [k, n] of [['hips', 'hips'], ['neck', 'neck'], ['head', 'head']]) if (g(n)) bones[k] = g(n);
  for (const side of SIDES) {
    for (const k of LIMB_KEYS) {
      const node = g(side + k);
      if (node) bones[side + k] = node;
    }
  }
  const fingers = { left: {}, right: {} };
  for (const side of SIDES) {
    for (const f of FINGER_NAMES) {
      const parts = f === 'Thumb' ? ['Metacarpal', 'Proximal', 'Distal'] : ['Proximal', 'Intermediate', 'Distal'];
      let objs = parts.map((p) => g(side + f + p)).filter(Boolean);
      // VRM 0.x thumbs are exposed as proximal/intermediate/distal by older exporters.
      if (f === 'Thumb' && objs.length < 3) objs = ['Proximal', 'Intermediate', 'Distal'].map((p) => g(side + f + p)).filter(Boolean);
      if (objs.length) fingers[side][f] = objs;
    }
  }
  return { bones, fingers, tips: { left: {}, right: {} } };
}

function isDescendant(o, ancestor) {
  for (let p = o.parent; p; p = p.parent) if (p === ancestor) return true;
  return false;
}

// ---------------------------------------------------------------- rig

export class Rig {
  static useLimits = true;

  constructor(root, mapping) {
    this.root = root;
    this.map = { ...mapping.bones };
    this.fingers = mapping.fingers;
    this.tips = { left: { ...mapping.tips.left }, right: { ...mapping.tips.right } };
    this.markers = {};
    this.extras = mapping.extras || [];
    this.extraDefaults = mapping.extraDefaults || {};
    this.extraChild = {};
    this.missing = ['hips', 'head', 'leftUpperArm', 'rightUpperArm', 'leftUpperLeg', 'rightUpperLeg']
      .filter((k) => !this.map[k]);
    if (this.missing.length) throw new Error('Could not find bones: ' + this.missing.join(', '));
    this._buildSpine();
    this._normalize();
    this._buildOrder();
    this._captureRest();
    this._buildMarkers();
    this._buildLimits();
  }

  // Anatomical joint limits (see limits.js). Rig.useLimits switches them for all rigs.
  _buildLimits() {
    const byBone = new Map(this.order.map((k) => [this.map[k], k]));
    const parentKey = (key) => {
      for (let p = this.map[key].parent; p; p = p.parent) if (byBone.has(p)) return byBone.get(p);
      return null;
    };
    const child = (key) => {
      const f = key.match(/^(left|right)(Thumb|Index|Middle|Ring|Little)(\d)$/);
      if (f) return this.fingers[f[1]][f[2]][+f[3] + 1] || this.tips[f[1]][f[2]] || null;
      return this.childOf(key);
    };
    const handDir = (side) => {
      const h = this.map[side + 'Hand'], c = this.childOf(side + 'Hand');
      return h && c ? wpos(c).sub(wpos(h)).normalize() : null;
    };
    const thumb = (side) => {
      const h = this.map[side + 'Hand'], t = this.fingers[side].Thumb?.[0], d = handDir(side);
      if (!h || !t || !d) return null;
      const v = wpos(t).sub(wpos(h));
      return v.addScaledVector(d, -v.dot(d)).normalize();
    };
    this.parentOf = Object.fromEntries(this.order.map((k) => [k, parentKey(k)]));
    this.jointLimits = buildLimits(this, { child, palm: (s) => this.palmN[s], thumb, parentKey });
  }

  get limitsOn() { return Rig.useLimits && !!this.jointLimits; }

  // Clamp the given joints (default: all), parents first.
  clampLimits(keys = null) {
    if (!this.limitsOn) return false;
    let any = false;
    const set = keys && new Set(keys);
    for (const k of this.order) {
      if (set && !set.has(k)) continue;
      // A forearm / shin bent sideways is really a rolled upper arm / thigh.
      if (this.jointLimits[k]?.type === 'hinge' && !jointWithin(this, k)) this.alignHinge(k);
      if (clampJoint(this, k)) any = true;
    }
    return any;
  }

  withinLimits(key) { return jointWithin(this, key); }

  _buildSpine() {
    const top = this.map.neck || this.map.head;
    if (!isDescendant(top, this.map.hips)) return;
    const chain = [];
    for (let p = top.parent; p && p !== this.map.hips; p = p.parent) chain.unshift(p);
    // Keep a handful of spine joints at most; very long chains get thinned.
    const step = Math.max(1, Math.ceil(chain.length / 4));
    chain.filter((_, i) => i % step === 0).forEach((b, i) => { this.map['spine' + i] = b; });
    for (const side of SIDES) {
      const sh = this.map[side + 'Shoulder'];
      if (sh && (chain.includes(sh) || !isDescendant(this.map[side + 'UpperArm'], sh))) delete this.map[side + 'Shoulder'];
    }
  }

  _normalize() {
    const r = this.root;
    r.updateMatrixWorld(true);
    const up = wpos(this.map.head).sub(wpos(this.map.hips)).normalize();
    if (up.y < 0.95) {
      r.quaternion.premultiply(_q1.setFromUnitVectors(up, new THREE.Vector3(0, 1, 0)));
      r.updateMatrixWorld(true);
    }
    const lat = wpos(this.map.leftUpperArm).sub(wpos(this.map.rightUpperArm));
    r.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.atan2(lat.z, lat.x));
    r.updateMatrixWorld(true);

    const feet = SIDES.map((s) => this.map[s + 'Foot']).filter(Boolean).map((f) => wpos(f).y);
    const hipsY = wpos(this.map.hips).y, headY = wpos(this.map.head).y;
    const footY = feet.length ? Math.min(...feet) : hipsY - (headY - hipsY) * 1.6;
    const span = headY - footY;
    if (span > 1e-6) r.scale.multiplyScalar((TARGET_HEIGHT * 0.837) / span);
    r.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(r);
    const floor = box.isEmpty() ? footY : box.min.y;
    const hips = wpos(this.map.hips);
    r.position.x -= hips.x;
    r.position.z -= hips.z;
    r.position.y -= Number.isFinite(floor) ? floor : 0;
    r.updateMatrixWorld(true);
    this.height = TARGET_HEIGHT;
  }

  _buildOrder() {
    const center = ['hips', ...Object.keys(this.map).filter((k) => /^spine\d+$/.test(k)).sort(), 'neck', 'head'];
    const order = center.filter((k) => this.map[k]);
    for (const side of SIDES) {
      for (const k of LIMB_KEYS) {
        if (this.map[side + k]) order.push(side + k);
        if (k === 'Hand') {
          for (const f of FINGER_NAMES) {
            (this.fingers[side][f] || []).forEach((b, i) => {
              const key = `${side}${f}${i}`;
              this.map[key] = b;
              order.push(key);
            });
          }
        }
      }
    }
    for (const e of this.extras) {
      this.map[e.key] = e.bone;
      this.extraChild[e.key] = e.child || null;
      order.push(e.key);
    }
    this.extraArms = [];
    for (const k of order) {
      const m = k.match(/^(left|right)UpperArm(\d)$/);
      if (m) this.extraArms.push({ side: m[1], keys: [k, `${m[1]}LowerArm${m[2]}`, `${m[1]}Hand${m[2]}`] });
    }
    this.order = order;
  }

  isExtra(key) { return key in this.extraChild; }

  _captureRest() {
    this.root.updateMatrixWorld(true);
    this.rest = {};
    for (const k of this.order) {
      const b = this.map[k];
      this.rest[k] = { lq: b.quaternion.clone(), lp: b.position.clone(), wq: wquat(b) };
    }
    this.restHips = wpos(this.map.hips);
    // Height of each foot joint above the floor in the rest pose (sole offset).
    this.restY = {};
    for (const k of ['leftFoot', 'rightFoot', 'leftToes', 'rightToes']) if (this.map[k]) this.restY[k] = wpos(this.map[k]).y;
    // Rest-space curl axes for the finger curl tool.
    this.curlAxes = { left: {}, right: {} };
    this.palmN = {};
    for (const side of SIDES) {
      const hand = this.map[side + 'Hand'];
      const idx = this.fingers[side].Index?.[0];
      const lit = this.fingers[side].Little?.[0] || this.fingers[side].Ring?.[0];
      let palmN = new THREE.Vector3(0, -1, 0);
      if (hand && idx && lit) {
        const h = wpos(hand), a = wpos(idx).sub(h), b = wpos(lit).sub(h);
        palmN = side === 'left' ? b.cross(a) : a.cross(b);
        palmN.normalize();
      }
      this.palmN[side] = palmN.clone();
      for (const f of FINGER_NAMES) {
        const ch = this.fingers[side][f];
        if (!ch || ch.length < 2) continue;
        const dir = wpos(ch[ch.length - 1]).sub(wpos(ch[0])).normalize();
        this.curlAxes[side][f] = dir.clone().cross(palmN).normalize();
      }
    }
  }

  _buildMarkers() {
    const h = this.height;
    const head = this.map.head;
    const hp = wpos(head);
    const add = (parent, world, name) => {
      const m = new THREE.Object3D();
      m.name = 'rp_marker_' + name;
      parent.add(m);
      m.position.copy(parent.worldToLocal(world.clone()));
      m.updateMatrixWorld(true);
      return m;
    };
    const P = (x, y, z) => hp.clone().add(new THREE.Vector3(x * h, y * h, z * h));
    this.markers.nose = add(head, P(0, 0.04, 0.062), 'nose');
    this.markers.leftEye = add(head, P(0.019, 0.056, 0.05), 'leftEye');
    this.markers.rightEye = add(head, P(-0.019, 0.056, 0.05), 'rightEye');
    this.markers.leftEar = add(head, P(0.045, 0.045, 0.0), 'leftEar');
    this.markers.rightEar = add(head, P(-0.045, 0.045, 0.0), 'rightEar');
    this.markers.headTop = add(head, P(0, 0.115, 0.005), 'headTop');
    // Face frame (cm) expressed in head-local space, for the 70 face keypoints.
    const s = h / 1.72 / 100;
    const o = head.worldToLocal(hp.clone());
    const axis = (x, y, z) => head.worldToLocal(hp.clone().add(new THREE.Vector3(x, y, z).multiplyScalar(s))).sub(o);
    this.faceFrame = { o, x: axis(1, 0, 0), y: axis(0, 1, 0), z: axis(0, 0, 1) };
    this.face = { ...DEFAULT_FACE };
    for (const side of SIDES) {
      for (const f of FINGER_NAMES) {
        const ch = this.fingers[side][f];
        if (!ch || this.tips[side][f]) continue;
        const last = ch[ch.length - 1];
        const prev = ch.length > 1 ? ch[ch.length - 2] : this.map[side + 'Hand'];
        const a = wpos(prev), b = wpos(last);
        this.tips[side][f] = add(last, b.clone().add(b.clone().sub(a).multiplyScalar(0.85)), side + f + 'Tip');
      }
    }
  }

  get isTPose() {
    const ua = this.map.leftUpperArm, la = this.map.leftLowerArm;
    if (!ua || !la) return false;
    return wpos(la).sub(wpos(ua)).normalize().y > -0.5;
  }

  sideOf(key) { return key.startsWith('left') ? 'left' : key.startsWith('right') ? 'right' : null; }
  isFingerKey(key) { return /(Thumb|Index|Middle|Ring|Little)\d$/.test(key); }

  // ------------------------------------------------------------ pose ops

  setWorldQuat(bone, q) {
    bone.parent.updateWorldMatrix(true, false);
    wquat(bone.parent, _q2).invert();
    bone.quaternion.copy(_q2.multiply(q));
    bone.updateMatrixWorld(true);
  }

  rotateWorld(bone, q) {
    this.setWorldQuat(bone, wquat(bone, _q1).premultiply(q));
  }

  resetBone(key) {
    const b = this.map[key];
    b.quaternion.copy(this.rest[key].lq);
    if (key === 'hips') b.position.copy(this.rest[key].lp);
    b.updateMatrixWorld(true);
  }

  resetAll({ keepPlacement = false } = {}) {
    const hips = this.map.hips;
    const yaw = keepPlacement ? this.facing() : null;
    const pos = keepPlacement ? hips.getWorldPosition(new THREE.Vector3()) : null;
    for (const k of this.order) {
      this.map[k].quaternion.copy(this.rest[k].lq);
      this.map[k].position.copy(this.rest[k].lp);
    }
    this.root.updateMatrixWorld(true);
    if (keepPlacement) {
      this.setWorldQuat(hips, yaw.multiply(this.rest.hips.wq));
      pos.y = this.restHips.y;
      hips.parent.updateWorldMatrix(true, false);
      hips.position.copy(hips.parent.worldToLocal(pos));
      this.root.updateMatrixWorld(true);
    }
  }

  delta(key) {
    return wquat(this.map[key]).multiply(_q1.copy(this.rest[key].wq).invert());
  }

  getPose() {
    this.root.updateMatrixWorld(true);
    const bones = {};
    for (const k of this.order) bones[k] = this.delta(k).toArray().map((v) => +v.toFixed(5));
    const off = wpos(this.map.hips).sub(this.restHips).divideScalar(this.height);
    return { v: 1, bones, hips: off.toArray().map((v) => +v.toFixed(5)), face: { ...this.face } };
  }

  setPose(pose) {
    if (!pose || !pose.bones) return;
    if (pose.face) this.face = { ...DEFAULT_FACE, ...pose.face };
    this.resetAll();
    for (const k of this.order) {
      const d = pose.bones[k];
      if (!d) continue;
      this.setWorldQuat(this.map[k], _q1.fromArray(d).normalize().multiply(this.rest[k].wq));
    }
    if (pose.hips) {
      const hips = this.map.hips;
      const target = this.restHips.clone().add(_v1.fromArray(pose.hips).multiplyScalar(this.height));
      hips.parent.updateWorldMatrix(true, false);
      hips.position.copy(hips.parent.worldToLocal(target));
    }
    this.root.updateMatrixWorld(true);
  }

  // Pose in the character's own frame (facing removed, no placement): what a
  // pose library stores, so it applies wherever the character stands.
  getLocalPose() {
    const pose = this.getPose();
    const fi = this.facing().invert();
    const bones = {};
    for (const [k, a] of Object.entries(pose.bones)) bones[k] = fi.clone().multiply(_q1.fromArray(a)).toArray().map((v) => +v.toFixed(5));
    return { v: 2, bones, hipsY: pose.hips[1], face: pose.face };
  }

  // Apply a local pose to some bones (default all). Bones are applied relative
  // to their parent, so "upper body only" keeps the current hips and spine
  // and the arms follow them; bones not applied keep their own local rotation.
  applyLocalPose(lp, keys = null) {
    if (!lp?.bones) return;
    const only = keys && new Set(keys);
    const f = this.facing();
    const cur = this.getPose();
    const Q = (a) => new THREE.Quaternion().fromArray(a);
    const lib = Object.fromEntries(Object.entries(lp.bones).map(([k, a]) => [k, f.clone().multiply(Q(a))]));
    const out = {};
    for (const k of this.order) {
      const p = this.parentOf?.[k];
      const curK = cur.bones[k] ? Q(cur.bones[k]) : new THREE.Quaternion();
      const parentNew = p && out[p];
      if ((!only || only.has(k)) && lib[k]) {
        if (!p || !lib[p]) out[k] = lib[k];
        else out[k] = parentNew.clone().multiply(lib[p].clone().invert().multiply(lib[k]));
      } else if (p && parentNew) {
        out[k] = parentNew.clone().multiply(Q(cur.bones[p]).invert().multiply(curK));
      } else out[k] = curK;
    }
    const hips = [...cur.hips];
    if ((!only || only.has('hips')) && Number.isFinite(lp.hipsY)) hips[1] = lp.hipsY;
    const face = (!only || only.has('head')) && lp.face ? lp.face : cur.face;
    this.setPose({ v: 1, bones: Object.fromEntries(Object.entries(out).map(([k, q]) => [k, q.toArray()])), hips, face });
  }

  // Bone directions (to the child joint) in the rest pose, in character space.
  restDirections() {
    const snap = this.order.map((k) => [this.map[k], this.map[k].quaternion.clone(), this.map[k].position.clone()]);
    for (const k of this.order) {
      this.map[k].quaternion.copy(this.rest[k].lq);
      this.map[k].position.copy(this.rest[k].lp);
    }
    this.root.updateMatrixWorld(true);
    const out = {};
    for (const k of this.order) {
      const c = this.childOf(k);
      if (!c) continue;
      const d = wpos(c).sub(wpos(this.map[k]));
      if (d.lengthSq() > 1e-10) out[k] = d.normalize();
    }
    for (const [b, q, p] of snap) { b.quaternion.copy(q); b.position.copy(p); }
    this.root.updateMatrixWorld(true);
    return out;
  }

  // Bone keys of a body region, for partial pose application.
  regionKeys(region) {
    const isFinger = (k) => this.isFingerKey(k);
    const lower = /^(hips|(left|right)(UpperLeg|LowerLeg|Foot|Toes))$/;
    const test = {
      all: () => true,
      upper: (k) => !lower.test(k),
      lower: (k) => lower.test(k),
      arms: (k) => /(Shoulder|UpperArm|LowerArm|Hand)\d*$/.test(k) || isFinger(k),
      hands: (k) => /Hand\d*$/.test(k) || isFinger(k),
      head: (k) => /^(neck|head)$/.test(k),
    }[region] || (() => true);
    return this.order.filter(test);
  }

  // mode: 'LtoR' | 'RtoL' | 'flip'
  mirror(mode) {
    const pose = this.getPose();
    const m = (a) => [a[0], -a[1], -a[2], a[3]];
    const out = { v: 1, bones: { ...pose.bones }, hips: pose.hips };
    for (const k of this.order) {
      const side = this.sideOf(k);
      const src = pose.bones[k];
      if (!side) {
        if (mode === 'flip') out.bones[k] = m(src);
        continue;
      }
      const other = (side === 'left' ? 'right' : 'left') + k.slice(side.length);
      if (!pose.bones[other]) continue;
      if (mode === 'flip' || (mode === 'LtoR' && side === 'left') || (mode === 'RtoL' && side === 'right')) {
        out.bones[other] = m(src);
      }
    }
    // Mirroring is about the character's own centre: it stays where it stands.
    this.setPose(out);
  }

  // Swing a bone so it points along dir (world). child: object at the bone's far end.
  aim(key, childObj, dir) {
    const b = this.map[key];
    if (!b || !childObj) return;
    this.root.updateMatrixWorld(true);
    const cur = wpos(childObj, _v1).sub(wpos(b, _v2)).normalize();
    this.rotateWorld(b, new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize()));
  }

  childOf(key) {
    if (key in this.extraChild) return this.extraChild[key];
    const side = this.sideOf(key);
    const part = side ? key.slice(side.length) : key;
    const next = { Shoulder: 'UpperArm', UpperArm: 'LowerArm', LowerArm: 'Hand', UpperLeg: 'LowerLeg', LowerLeg: 'Foot', Foot: 'Toes' }[part];
    if (next) return this.map[side + next] || null;
    if (part === 'Hand') return this.map[side + 'Middle0'] || this.map[side + 'Index0'] || null;
    if (key === 'head') return this.markers.headTop;
    if (key === 'neck') return this.map.head;
    const sp = key.match(/^spine(\d+)$/);
    if (sp) return this.map['spine' + (+sp[1] + 1)] || this.map.neck || this.map.head;
    return null;
  }

  // preset: { key: [x,y,z] direction in character space }
  // Directions are in character space (+X left, +Y up, +Z forward) and follow
  // where the character stands and faces; a reset keeps that placement.
  applyDirections(preset, { reset = true, defaults = true } = {}) {
    if (reset) this.resetAll({ keepPlacement: true });
    if (defaults) preset = { ...this.extraDefaults, ...preset };
    const yaw = this.facing();
    const touched = [];
    for (const k of this.order) {
      if (preset[k]) {
        this.aim(k, this.childOf(k), new THREE.Vector3(...preset[k]).applyQuaternion(yaw));
        touched.push(k);
      }
    }
    this.clampLimits(touched);
  }

  // Heading of the character (rotation about Y only), from the hips.
  facing() {
    const f = new THREE.Vector3(0, 0, 1).applyQuaternion(this.delta('hips'));
    f.y = 0;
    if (f.lengthSq() < 1e-8) return new THREE.Quaternion();
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(f.x, f.z));
  }

  // values: { Thumb: 0..1, Index: .., ... }
  setCurl(side, values) {
    const hand = this.map[side + 'Hand'];
    if (!hand) return;
    this.root.updateMatrixWorld(true);
    const handDelta = this.delta(side + 'Hand');
    for (const f of FINGER_NAMES) {
      const ch = this.fingers[side][f];
      const axis = this.curlAxes[side][f];
      if (!ch || !axis || values[f] === undefined) continue;
      const max = f === 'Thumb' ? [25, 40, 55] : [75, 95, 70];
      let acc = 0;
      ch.forEach((b, i) => {
        acc += THREE.MathUtils.degToRad(max[i] ?? 60) * values[f];
        const key = `${side}${f}${i}`;
        const q = handDelta.clone().multiply(_q1.setFromAxisAngle(axis, acc)).multiply(this.rest[key].wq);
        this.setWorldQuat(b, q);
      });
    }
  }

  // ------------------------------------------------------------ IK (CCD)

  ikChain(effectorKey) {
    const side = this.sideOf(effectorKey);
    const part = effectorKey.slice(side.length);
    const keys = part === 'Hand' ? ['UpperArm', 'LowerArm'] : ['UpperLeg', 'LowerLeg'];
    const chain = keys.map((k) => this.map[side + k]);
    return chain.every(Boolean) ? chain : null;
  }

  // Two-bone IK, solved analytically: the elbow / knee goes into the plane of
  // the root, the target and the pole (optional world point the joint should
  // point toward), then the upper bone rolls so the joint hinges the way a real
  // elbow / knee does. With joint limits on, the result is kept in range.
  solveIK(effectorKey, target, iterations = 16, pole = null) {
    const chain = this.ikChain(effectorKey);
    const eff = this.map[effectorKey];
    if (!chain || !eff) return;
    const [up, mid] = chain;
    const keys = [this.keyOf(up), this.keyOf(mid)];
    this.root.updateMatrixWorld(true);
    const keepRot = wquat(eff);
    const a = wpos(up), m = wpos(mid), c = wpos(eff);
    const L1 = a.distanceTo(m), L2 = m.distanceTo(c);
    const axis = target.clone().sub(a);
    let d = axis.length();
    if (d < 1e-6 || L1 < 1e-6 || L2 < 1e-6) return;
    axis.divideScalar(d);
    d = THREE.MathUtils.clamp(d, Math.abs(L1 - L2) + 1e-4, (L1 + L2) * 0.99999);
    const flat = (p) => { const v = p.clone().sub(a); return v.addScaledVector(axis, -v.dot(axis)); };
    let bend = flat(pole ? pole : this.defaultPole(effectorKey));
    if (bend.lengthSq() < 1e-10) bend = flat(m);
    if (bend.lengthSq() < 1e-10) bend = new THREE.Vector3(0, 0, effectorKey.endsWith('Hand') ? -1 : 1).applyQuaternion(this.facing());
    bend.addScaledVector(axis, -bend.dot(axis)).normalize();
    const cosA = THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
    const knee = a.clone().addScaledVector(axis, L1 * cosA).addScaledVector(bend, L1 * Math.sqrt(1 - cosA * cosA));
    const aimLower = () => {
      this.aim(keys[1], eff, target.clone().sub(wpos(mid)));
      this.alignHinge(keys[1]);
    };
    this.aim(keys[0], mid, knee.sub(a));
    aimLower();
    if (this.limitsOn) {
      // A hip / shoulder out of range moves the joint: re-aim the lower bone at
      // the target from where it ended up, as close as the limits allow.
      for (let i = 0; i < 3 && clampJoint(this, keys[0]); i++) aimLower();
      clampJoint(this, keys[1]);
    }
    this.setWorldQuat(eff, keepRot);
    if (this.limitsOn) clampJoint(this, effectorKey);
  }

  // Roll the parent of a hinge joint (upper arm / thigh) about its own axis so
  // the joint's current bend lies in its hinge plane. The child keeps its world
  // rotation; the roll stays within the parent's twist range when limits are on.
  alignHinge(key) {
    const L = this.jointLimits?.[key];
    if (!L || L.type !== 'hinge') return false;
    const P = this.jointLimits[L.parent];
    const ap = P ? P.d0 : L.N;
    this.root.updateMatrixWorld(true);
    const Dp = this.delta(L.parent);
    const d = L.d0.clone().applyQuaternion(Dp.clone().invert().multiply(this.delta(key)));
    if (d.angleTo(ap) < 0.17) return false;
    const F = L.F.clone().addScaledVector(ap, -L.F.dot(ap));
    if (F.lengthSq() < 1e-8) return false;
    F.normalize();
    const S = ap.clone().cross(F);
    let beta = Math.atan2(d.dot(S), d.dot(F));
    // Beyond ~150° the bend is really an over-straightened joint: leave it to the clamp.
    if (Math.abs(beta) > THREE.MathUtils.degToRad(150) || Math.abs(beta) < 1e-4) return false;
    if (this.limitsOn && P) {
      const tw = twistAngle(Dp.clone().premultiply(this.delta(P.parent).invert()), P.d0);
      beta = THREE.MathUtils.clamp(tw + beta, P.twist[0], P.twist[1]) - tw;
    }
    const pb = this.map[L.parent], cb = this.map[key];
    const keep = wquat(cb);
    const worldAxis = ap.clone().applyQuaternion(Dp);
    this.rotateWorld(pb, new THREE.Quaternion().setFromAxisAngle(worldAxis, beta));
    this.setWorldQuat(cb, keep);
    return true;
  }

  keyOf(bone) { return this.order.find((k) => this.map[k] === bone); }

  // Swing the limb about its root -> effector axis so the middle joint points at
  // the pole. The effector stays put, so this never fights the IK solution.
  applyPole(effectorKey, pole) {
    const chain = this.ikChain(effectorKey);
    const eff = this.map[effectorKey];
    if (!chain || !eff) return;
    this.root.updateMatrixWorld(true);
    const keep = wquat(eff);
    const a = wpos(chain[0]), m = wpos(chain[1]), c = wpos(eff);
    const axis = c.clone().sub(a);
    if (axis.lengthSq() < 1e-10) return;
    axis.normalize();
    const flat = (p) => { const v = p.clone().sub(a); return v.addScaledVector(axis, -v.dot(axis)); };
    const cur = flat(m), want = flat(pole);
    if (cur.lengthSq() < 1e-10 || want.lengthSq() < 1e-10) return;
    cur.normalize();
    want.normalize();
    let ang = Math.acos(THREE.MathUtils.clamp(cur.dot(want), -1, 1));
    if (cur.clone().cross(want).dot(axis) < 0) ang = -ang;
    this.rotateWorld(chain[0], new THREE.Quaternion().setFromAxisAngle(axis, ang));
    this.setWorldQuat(eff, keep);
  }

  // Where the pole sits for the current bend (or the natural bend if straight):
  // elbows point back, knees forward.
  defaultPole(effectorKey, dist = 0.35) {
    const chain = this.ikChain(effectorKey);
    if (!chain) return null;
    this.root.updateMatrixWorld(true);
    const a = wpos(chain[0]), m = wpos(chain[1]), c = wpos(this.map[effectorKey]);
    const axis = c.clone().sub(a).normalize();
    const v = m.clone().sub(a);
    v.addScaledVector(axis, -v.dot(axis));
    if (v.lengthSq() < (0.02 * this.height) ** 2) {
      v.set(0, 0, effectorKey.endsWith('Hand') ? -1 : 1).applyQuaternion(this.facing());
      v.addScaledVector(axis, -v.dot(axis));
    }
    return m.addScaledVector(v.normalize(), dist * this.height);
  }

  // ------------------------------------------------------------ keypoints

  // World-space OpenPose keypoints. Body: COCO-18 order. Hands: 21 each.
  // opts.eyesAt: world point the pupils look at (e.g. the camera).
  keypoints(cameraPos, opts = {}) {
    this.root.updateMatrixWorld(true);
    const P = (o) => (o ? wpos(o) : null);
    const m = this.map, mk = this.markers;
    const rS = P(m.rightUpperArm), lS = P(m.leftUpperArm);
    const neck = rS && lS ? rS.clone().add(lS).multiplyScalar(0.5) : P(m.neck);
    const body = [
      P(mk.nose), neck,
      rS, P(m.rightLowerArm), P(m.rightHand),
      lS, P(m.leftLowerArm), P(m.leftHand),
      P(m.rightUpperLeg), P(m.rightLowerLeg), P(m.rightFoot),
      P(m.leftUpperLeg), P(m.leftLowerLeg), P(m.leftFoot),
      P(mk.rightEye), P(mk.leftEye), P(mk.rightEar), P(mk.leftEar),
    ];
    if (cameraPos) {
      // Hide face points that face away from the camera, as a detector would.
      const hd = this.delta('head');
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(hd);
      const left = new THREE.Vector3(1, 0, 0).applyQuaternion(hd);
      const toCam = cameraPos.clone().sub(body[0] || P(m.head)).normalize();
      const f = fwd.dot(toCam), l = left.dot(toCam);
      if (f < -0.2) body[0] = null;
      if (f < -0.05 || l < -0.7) body[15] = null;
      if (f < -0.05 || l > 0.7) body[14] = null;
      if (l < -0.3) body[17] = null;
      if (l > 0.3) body[16] = null;
    }
    const hands = {};
    for (const side of SIDES) {
      const wrist = P(m[side + 'Hand']);
      if (!wrist) { hands[side] = null; continue; }
      const pts = [wrist];
      let ok = false;
      for (const f of FINGER_NAMES) {
        const ch = this.fingers[side][f] || [];
        const tip = this.tips[side][f];
        const joints = [...ch.slice(0, 3), tip].filter(Boolean);
        if (joints.length === 4) ok = true;
        for (let i = 0; i < 4; i++) pts.push(joints.length === 4 ? P(joints[i]) : null);
      }
      hands[side] = ok ? pts : null;
    }
    const extra = this.extraArms.map((a) => ({ side: a.side, pts: a.keys.map((k) => P(m[k])) }));
    return { body, hands, extra, face: this.facePoints(cameraPos, opts.eyesAt) };
  }

  // 70 OpenPose face points in world space (null where turned away from the camera).
  facePoints(cameraPos, eyesAt) {
    const F = this.faceFrame, head = this.map.head;
    if (!F) return null;
    const origin = head.localToWorld(F.o.clone());
    const ax = ['x', 'y', 'z'].map((k) => head.localToWorld(F.o.clone().add(F[k])).sub(origin));
    const unit = ax.map((v) => v.clone().normalize());
    let gaze = null;
    if (eyesAt) {
      const d = eyesAt.clone().sub(origin);
      const dz = d.dot(unit[2]);
      if (dz > 0) gaze = [Math.atan2(d.dot(unit[0]), dz) / 0.6, Math.atan2(d.dot(unit[1]), dz) / 0.5];
    }
    const { points, pupilsHidden } = facePoints(this.face, gaze);
    return points.map((p, i) => {
      if (pupilsHidden && i >= 68) return null;
      const w = origin.clone().addScaledVector(ax[0], p[0]).addScaledVector(ax[1], p[1]).addScaledVector(ax[2], p[2]);
      if (cameraPos) {
        const n = faceNormal(p);
        const nw = unit[0].clone().multiplyScalar(n.x).addScaledVector(unit[1], n.y).addScaledVector(unit[2], n.z);
        if (nw.dot(cameraPos.clone().sub(w).normalize()) < -0.2) return null;
      }
      return w;
    });
  }

  // Turn neck and head toward a world point (limited, like a real neck).
  lookAt(target) {
    const turn = (bone, share) => {
      if (!bone) return;
      this.root.updateMatrixWorld(true);
      const from = wpos(this.map.head);
      const cur = new THREE.Vector3(0, 0, 1).applyQuaternion(this.delta('head'));
      const want = target.clone().sub(from).normalize();
      let q = new THREE.Quaternion().setFromUnitVectors(cur, want);
      const ang = 2 * Math.acos(THREE.MathUtils.clamp(Math.abs(q.w), -1, 1));
      const limit = THREE.MathUtils.degToRad(75);
      if (ang > limit) q = new THREE.Quaternion().slerp(q, limit / ang);
      this.rotateWorld(bone, new THREE.Quaternion().slerp(q, share));
    };
    turn(this.map.neck, 0.4);
    turn(this.map.head, 1);
    this.clampLimits(['neck', 'head']);
  }

  // Approximate bounding sphere of the posed character, from its joints.
  bounds() {
    const pts = this.order.map((k) => wpos(this.map[k]));
    pts.push(wpos(this.markers.headTop));
    const box = new THREE.Box3().setFromPoints(pts);
    const s = box.getBoundingSphere(new THREE.Sphere());
    s.radius += this.height * 0.12;
    return s;
  }

  // Character forward/left, following the hips.
  frame() {
    const d = this.delta('hips');
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(d);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1);
    fwd.normalize();
    return { fwd, left: new THREE.Vector3(0, 1, 0).cross(fwd).normalize(), hips: wpos(this.map.hips) };
  }
}

// Directions in character space: +X = character's left, +Y up, +Z forward.
const mirrorDirs = (p) => {
  const out = { ...p };
  for (const [k, v] of Object.entries(p)) {
    if (k.startsWith('left')) out['right' + k.slice(4)] ??= [-v[0], v[1], v[2]];
  }
  return out;
};

export const POSE_PRESETS = {
  'T-pose': {},
  Relaxed: mirrorDirs({ leftUpperArm: [0.25, -1, 0.02], leftLowerArm: [0.12, -1, 0.15] }),
  'Arms up': mirrorDirs({ leftUpperArm: [0.35, 1, 0], leftLowerArm: [0.15, 1, 0.05] }),
  'Hands on hips': mirrorDirs({ leftUpperArm: [0.7, -0.75, -0.25], leftLowerArm: [-0.75, -0.35, 0.45] }),
  Walking: {
    leftUpperArm: [0.12, -1, -0.3], leftLowerArm: [0.05, -1, 0.15],
    rightUpperArm: [-0.12, -1, 0.3], rightLowerArm: [-0.05, -1, 0.55],
    leftUpperLeg: [0.02, -1, 0.38], leftLowerLeg: [0, -1, 0.08],
    rightUpperLeg: [-0.02, -1, -0.28], rightLowerLeg: [0, -1, -0.62],
  },
  Sitting: mirrorDirs({
    leftUpperArm: [0.15, -1, 0.25], leftLowerArm: [0.05, -0.35, 1],
    leftUpperLeg: [0.12, -0.05, 1], leftLowerLeg: [0.02, -1, 0.1],
  }),
  Kneeling: {
    ...mirrorDirs({ leftUpperArm: [0.2, -1, 0.05], leftLowerArm: [0.1, -1, 0.2] }),
    leftUpperLeg: [0.08, -0.1, 1], leftLowerLeg: [0, -1, 0.05],
    rightUpperLeg: [-0.06, -1, -0.05], rightLowerLeg: [0, -0.05, -1],
  },
  'Arms crossed': {
    leftUpperArm: [0.35, -0.9, 0.25], leftLowerArm: [-0.95, 0.1, 0.3],
    rightUpperArm: [-0.35, -0.9, 0.28], rightLowerArm: [0.95, 0.16, 0.25],
  },
  'Hands behind head': mirrorDirs({ leftUpperArm: [0.9, 0.4, -0.1], leftLowerArm: [-0.75, 0.55, -0.35] }),
  'Hands clasped': mirrorDirs({ leftUpperArm: [0.2, -1, 0.15], leftLowerArm: [-0.6, -0.45, 0.65] }),
  Thinking: {
    leftUpperArm: [0.2, -1, 0.12], leftLowerArm: [-0.6, 0.1, 0.8],
    rightUpperArm: [-0.25, -0.85, 0.45], rightLowerArm: [0.35, 0.85, 0.4],
  },
  Pointing: {
    leftUpperArm: [0.25, -1, 0.02], leftLowerArm: [0.12, -1, 0.15],
    rightUpperArm: [-0.25, 0.1, 1], rightLowerArm: [-0.2, 0.12, 1],
  },
  Waving: {
    leftUpperArm: [0.25, -1, 0.02], leftLowerArm: [0.12, -1, 0.15],
    rightUpperArm: [-0.9, 0.35, 0.15], rightLowerArm: [-0.25, 1, 0.1],
  },
  'Reaching up': {
    leftUpperArm: [0.25, -1, 0.02], leftLowerArm: [0.12, -1, 0.15],
    rightUpperArm: [-0.2, 1, 0.1], rightLowerArm: [-0.1, 1, 0.05],
  },
  Running: {
    leftUpperArm: [0.15, -0.8, -0.55], leftLowerArm: [0.05, 0.1, 1],
    rightUpperArm: [-0.15, -0.6, 0.75], rightLowerArm: [-0.05, 0.75, 0.6],
    leftUpperLeg: [0.02, -0.5, 0.85], leftLowerLeg: [0, -1, -0.1],
    rightUpperLeg: [-0.02, -0.95, -0.35], rightLowerLeg: [0, -0.45, -0.9],
  },
  'Jump (star)': mirrorDirs({
    leftUpperArm: [0.75, 0.65, 0], leftLowerArm: [0.7, 0.7, 0.05],
    leftUpperLeg: [0.45, -0.9, 0.05], leftLowerLeg: [0.4, -0.92, 0],
  }),
  Squat: mirrorDirs({
    leftUpperArm: [0.15, -0.2, 1], leftLowerArm: [0.1, -0.1, 1],
    leftUpperLeg: [0.25, -0.15, 1], leftLowerLeg: [0.05, -1, -0.15],
  }),
  'Cross-legged': mirrorDirs({
    leftUpperArm: [0.2, -1, 0.15], leftLowerArm: [0.2, -0.6, 0.8],
    leftUpperLeg: [0.55, -0.15, 0.82], leftLowerLeg: [-0.45, -0.75, 0.48],
  }),
  'Fighting stance': {
    leftUpperArm: [0.25, -0.75, 0.6], leftLowerArm: [-0.25, 0.7, 0.65],
    rightUpperArm: [-0.3, -0.85, 0.35], rightLowerArm: [0.3, 0.75, 0.55],
    leftUpperLeg: [0.15, -1, 0.25], leftLowerLeg: [0, -1, 0.05],
    rightUpperLeg: [-0.2, -1, -0.2], rightLowerLeg: [0, -1, -0.32],
  },
  Contrapposto: {
    leftUpperArm: [0.22, -1, 0.04], leftLowerArm: [0.1, -1, 0.18],
    rightUpperArm: [-0.3, -1, -0.02], rightLowerArm: [-0.15, -1, 0.1],
    leftUpperLeg: [0.02, -1, 0.14], leftLowerLeg: [0.02, -1, -0.08],
    rightUpperLeg: [-0.1, -1, 0], rightLowerLeg: [0, -1, 0],
  },
};

export const WING_PRESETS = {
  Spread: mirrorDirs({ leftWing0: [1, 0.5, -0.45], leftWing1: [1, 0.35, -0.2], leftWing2: [1, -0.1, 0.05] }),
  Raised: mirrorDirs({ leftWing0: [0.5, 1, -0.5], leftWing1: [0.3, 1, -0.1], leftWing2: [0.25, 1, 0.2] }),
  Folded: mirrorDirs({ leftWing0: [0.35, 0.45, -1], leftWing1: [0.12, -1, -0.3], leftWing2: [0.05, -1, 0.12] }),
  'Half open': mirrorDirs({ leftWing0: [0.7, 0.6, -0.7], leftWing1: [0.8, -0.2, -0.5], leftWing2: [0.4, -1, -0.1] }),
};

export const HAND_PRESETS = {
  Open: { Thumb: 0, Index: 0, Middle: 0, Ring: 0, Little: 0 },
  Relaxed: { Thumb: 0.2, Index: 0.18, Middle: 0.25, Ring: 0.32, Little: 0.4 },
  Fist: { Thumb: 0.75, Index: 1, Middle: 1, Ring: 1, Little: 1 },
  Point: { Thumb: 0.65, Index: 0, Middle: 1, Ring: 1, Little: 1 },
  Peace: { Thumb: 0.75, Index: 0, Middle: 0, Ring: 1, Little: 1 },
  Grip: { Thumb: 0.45, Index: 0.55, Middle: 0.6, Ring: 0.65, Little: 0.7 },
};
