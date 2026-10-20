// Holding props: the grip frame of a hand, turning a hand so a held prop
// points where a pose wants it, and bringing the other hand onto a two-handed
// prop. The grip frame matches how hand-held props are built (weapons.js):
//   origin = inside the closed fingers, where a handle sits,
//   +Y     = along the fist, out past the thumb and index (blade / shaft side),
//   +Z     = the way the knuckles point (edge / muzzle).
import * as THREE from 'three';
import { wrapFingers, setHandShape, HAND_SHAPES } from './handshapes.js';

const wpos = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const TILT = 20 * Math.PI / 180; // a handle crosses the palm on a slant, not square to the fingers

// Finger curl for each way of holding (see Rig.setCurl).
export const HOLD_CURLS = {
  fist: { Thumb: 0.5, Index: 0.68, Middle: 0.74, Ring: 0.8, Little: 0.86 },
  trigger: { Thumb: 0.5, Index: 0.3, Middle: 0.74, Ring: 0.8, Little: 0.86 },
  pinch: { Thumb: 0.45, Index: 0.42, Middle: 0.5, Ring: 0.6, Little: 0.7 },
  phone: { Thumb: 0.3, Index: 0.32, Middle: 0.38, Ring: 0.44, Little: 0.5 },
  flat: { Thumb: 0.2, Index: 0.18, Middle: 0.22, Ring: 0.28, Little: 0.34 },
  support: { Thumb: 0.4, Index: 0.55, Middle: 0.62, Ring: 0.68, Little: 0.74 },
};

// World matrix of the grip frame of rig's `side` hand, or null without hands.
export function gripFrame(rig, side, out = new THREE.Matrix4()) {
  const hand = rig.map[side + 'Hand'];
  const F = rig.fingers?.[side] || {};
  const idx = F.Index?.[0], mid = F.Middle?.[0] || idx, lit = F.Little?.[0] || F.Ring?.[0];
  if (!hand || !idx || !lit) return null;
  const W = wpos(hand), I = wpos(idx), M = wpos(mid), L = wpos(lit);
  const K = I.clone().add(L).multiplyScalar(0.5);
  const size = M.distanceTo(W) || 0.09;
  const f = K.clone().sub(W).normalize(); // wrist -> knuckles
  const palm = rig.palmN[side].clone().applyQuaternion(rig.delta(side + 'Hand')).normalize();
  const across = I.clone().sub(L);
  const y = across.addScaledVector(f, -across.dot(f)).normalize();
  // Lean the handle towards the knuckles at the thumb end.
  y.multiplyScalar(Math.cos(TILT)).addScaledVector(f, Math.sin(TILT)).normalize();
  const z = f.clone().addScaledVector(y, -f.dot(y)).normalize();
  const x = y.clone().cross(z);
  const p = W.clone().lerp(K, 1.02).addScaledVector(palm, size * 0.3);
  return out.makeBasis(x, y, z).setPosition(p);
}

// Upper-back frame for props worn on the back (quivers): it turns with the chest.
export function backFrame(rig, out = new THREE.Matrix4()) {
  let key = 'hips';
  for (let i = 0; rig.map['spine' + i]; i++) key = 'spine' + i;
  const q = rig.delta(key);
  const ax = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(q);
  return out.makeBasis(ax(1, 0, 0), ax(0, 1, 0), ax(0, 0, 1)).setPosition(wpos(rig.map[key]));
}

export const slotFrame = (rig, slot, out) => (slot === 'back' ? backFrame(rig, out) : gripFrame(rig, slot, out));

// Swing-twist split: the part of q that turns about axis.
function twistAbout(q, axis) {
  const r = new THREE.Vector3(q.x, q.y, q.z);
  const p = axis.clone().multiplyScalar(r.dot(axis));
  const t = new THREE.Quaternion(p.x, p.y, p.z, q.w);
  return t.lengthSq() < 1e-12 ? new THREE.Quaternion() : t.normalize();
}

// Turn the hand so the grip's +Y points along yWant (world) and, if given,
// +Z along zWant. The turn about the forearm goes to the forearm (pronation /
// supination), the rest to the wrist, the way a person would do it.
export function orientGrip(rig, side, yWant, zWant = null) {
  const hand = rig.map[side + 'Hand'], lower = rig.map[side + 'LowerArm'];
  const cur = gripFrame(rig, side);
  if (!cur || !hand) return;
  const target = basisFor(cur, yWant, zWant);
  const qOf = (m) => new THREE.Quaternion().setFromRotationMatrix(m);
  if (lower) {
    const q = qOf(target).multiply(qOf(cur).invert());
    const axis = wpos(hand).sub(wpos(lower)).normalize();
    rig.rotateWorld(lower, twistAbout(q, axis));
  }
  const now = gripFrame(rig, side);
  rig.rotateWorld(hand, qOf(target).multiply(qOf(now).invert()));
}

function basisFor(cur, yWant, zWant) {
  const x0 = new THREE.Vector3(), y0 = new THREE.Vector3(), z0 = new THREE.Vector3();
  cur.extractBasis(x0, y0, z0);
  const y = yWant.clone().normalize();
  let z = (zWant ? zWant.clone() : z0.clone()).addScaledVector(y, -(zWant || z0).dot(y));
  if (z.lengthSq() < 1e-8) z = x0.clone().cross(y);
  z.normalize();
  return new THREE.Matrix4().makeBasis(y.clone().cross(z), y, z);
}

// Bring `side`'s hand onto a world point, its grip running along yWant (and
// the knuckles along zWant, if given). pole: world point the elbow should
// point towards. A few rounds of IK + orient converge. Returns the miss (m).
export function reachGrip(rig, side, point, yWant, zWant = null, pole = null, { free = false } = {}) {
  const hand = rig.map[side + 'Hand'];
  if (!hand) return Infinity;
  // free: ignore the joint limits for this reach (an archer's drawing arm
  // sits at the very edge of the shoulder's range).
  const limits = rig.jointLimits;
  if (free) rig.jointLimits = null;
  try {
    return reachLoop(rig, side, hand, point, yWant, zWant, pole);
  } finally {
    rig.jointLimits = limits;
  }
}
function reachLoop(rig, side, hand, point, yWant, zWant, pole) {
  for (let i = 0; i < 4; i++) {
    orientGrip(rig, side, yWant, zWant);
    const g = gripFrame(rig, side);
    const off = new THREE.Vector3().setFromMatrixPosition(g).sub(wpos(hand));
    rig.solveIK(side + 'Hand', point.clone().sub(off), 16, pole);
  }
  orientGrip(rig, side, yWant, zWant);
  return new THREE.Vector3().setFromMatrixPosition(gripFrame(rig, side)).distanceTo(point);
}

// Close a hand on what it holds: the fingers wrap the handle that runs along
// the grip frame's +Y (radius r). Triggers keep the index finger on the
// trigger; small or flat things use a fixed shape.
export function closeHand(rig, side, style = 'fist', r = 0.016, frame = null) {
  const g = frame || gripFrame(rig, side);
  if (!g || style === 'none') return;
  const shaped = { pinch: 'Pinch (pads)', flat: 'Grab (C-shape)', phone: 'Hold a glass' }[style];
  if (shaped) { setHandShape(rig, side, HAND_SHAPES[shaped]); return; }
  const p = new THREE.Vector3().setFromMatrixPosition(g);
  const x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3();
  g.extractBasis(x, y, z);
  if (style === 'trigger') {
    wrapFingers(rig, side, p, y, r, { skip: ['Index'], thumbOpp: 45 });
    setHandShape(rig, side, { I: [20, 45, 25, 0] });
  } else if (style === 'support') {
    // Under a fore-end / round another hand: the fingers wrap, the thumb lies
    // along the side of the handle instead of sticking out.
    wrapFingers(rig, side, p, y, r, { skip: ['Thumb'] });
    setHandShape(rig, side, { T: SUPPORT_THUMB });
  } else wrapFingers(rig, side, p, y, r, { thumbOpp: 55 });
}
export const SUPPORT_THUMB = [10, 20, 15, 0, 60];

// Radius of the handle at the grip, measured from the prop's own mesh (built
// in its grip frame): the vertices round the origin, near the grip axis.
export function gripRadius(poly) {
  if (poly.grip?.r) return poly.grip.r;
  const d = [];
  for (const v of poly.v) if (Math.abs(v.y) < 0.035) { const r = Math.hypot(v.x, v.z); if (r < 0.06) d.push(r); }
  d.sort((a, b) => a - b);
  const r = d.length ? THREE.MathUtils.clamp(d[Math.floor(d.length * 0.4)], 0.006, 0.04) : 0.016;
  if (poly.grip) poly.grip.r = +r.toFixed(4);
  return r;
}
