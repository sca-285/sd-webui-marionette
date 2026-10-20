// Applying a library pose to a rig: the body (bodypose.js, or the older
// direction presets), then the props it holds: each grip turned the way the
// pose wants, the other hand brought onto two-handed props, and the fingers
// closed round every handle.
import * as THREE from 'three';
import { LIBRARY } from './library.js';
import { slotFrame, orientGrip, reachGrip, closeHand, gripRadius } from './grip.js';
import { applyBodyPose } from './bodypose.js';
import { setHandShape, HAND_SHAPES } from './handshapes.js';

const other = (s) => (s === 'left' ? 'right' : 'left');
const FLIP = [0, 0, 1, 0]; // 180° about the grip's z: held point-down / reversed

// Where a quiver sits on the back frame: behind the shoulders, leaning to the right.
export const BACK_OFFSET = [0.1, -0.42, -0.14, ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 22 * Math.PI / 180)).toArray()];

export const offsetMatrix = (o, out = new THREE.Matrix4()) =>
  out.compose(new THREE.Vector3(o[0], o[1], o[2]), new THREE.Quaternion(o[3], o[4], o[5], o[6]), new THREE.Vector3(1, 1, 1));

// The prop parts a pose holds, with their slots and offsets. e.hold:
// { right: { r: [x, y, z] degrees, t: [x, y, z] } } turns / moves a part in its hand.
export function posePropList(e) {
  if (!e.prop) return [];
  const parts = [LIBRARY[e.prop[0]]?.[e.prop[1]]?.()].flat().filter(Boolean);
  return parts.map((poly, i) => {
    let slot = poly.grip?.hand === 'back' ? 'back' : poly.grip?.hand || 'right';
    if (e.swap && slot !== 'back') slot = other(slot);
    const flip = e.flip === true || e.flip === slot;
    let o = slot === 'back' ? BACK_OFFSET : [0, 0, 0, ...(flip ? FLIP : [0, 0, 0, 1])];
    const hd = e.hold?.[e.swap ? other(slot) : slot];
    if (hd && slot !== 'back') {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(hd.r || [0, 0, 0]).map((d) => d * Math.PI / 180)));
      o = [...(hd.t || [0, 0, 0]), ...new THREE.Quaternion(o[3], o[4], o[5], o[6]).premultiply(q).toArray()];
    }
    return { lib: e.prop, part: i, poly, slot, o };
  });
}

const wpos = (o) => o.getWorldPosition(new THREE.Vector3());
// A point on a bone, given in the bone's rest-aligned frame (character axes
// at rest: +X left, +Y up, +Z forward), e.g. the corner of the mouth on 'head'.
function bonePoint(rig, key, local) {
  const b = rig.map[key];
  if (!b) return null;
  return wpos(b).add(new THREE.Vector3(...local).applyQuaternion(rig.delta(key)).multiplyScalar(rig.height / 1.72));
}
// World point for { at, off (upright frame), local (bone frame) }.
function anchorPoint(rig, a, yaw) {
  let key = a.at || 'chest';
  if (key === 'chest') { key = 'hips'; for (let i = 0; rig.map['spine' + i]; i++) key = 'spine' + i; }
  const p = a.local ? bonePoint(rig, key, a.local) : wpos(rig.map[key]);
  if (!p) return null;
  if (a.off) p.add(new THREE.Vector3(...a.off).applyQuaternion(yaw));
  return p;
}
const elbowPole = (rig, side, dir, yaw) => {
  const up = rig.map[side + 'UpperArm'];
  return up && dir ? wpos(up).add(new THREE.Vector3(...dir).normalize().multiplyScalar(0.5).applyQuaternion(yaw)) : null;
};

// Pose `rig` for a catalog entry. Returns { held, support }.
//   mount: place a held prop first, then bring the hand onto it (long guns:
//     the butt in the shoulder, the barrel along `aim`): { side, at, off,
//     local, point (prop frame point that sits at the anchor), aim, up, pole }.
//   draw: a bow at full draw: { bow: 'left', anchor: { at, local, off },
//     cant (deg), pole (draw elbow direction), shape (draw hand) }.
//   reach[].pole: the way the reaching elbow points (upright frame).
export function applyEntry(rig, e, { root = null, HAND_PRESETS = {}, POSE_PRESETS = {} } = {}) {
  if (e.body) applyBodyPose(rig, e.body, { root });
  else if (e.dirs) rig.applyDirections(e.dirs);
  else if (e.preset) rig.applyDirections(POSE_PRESETS[e.preset]);
  if (e.handsPreset) for (const [side, n] of Object.entries(e.handsPreset)) rig.setCurl(side, HAND_PRESETS[n]);
  const yaw = rig.facing();
  const mirrorV = (v) => (e.swap ? [-v[0], v[1], v[2]] : v);
  const W = (v) => new THREE.Vector3(...mirrorV(v)).applyQuaternion(yaw).normalize();
  const held = posePropList(e);
  const bySlot = Object.fromEntries(held.map((h) => [h.slot, h]));
  const swapSide = (s) => (e.swap ? other(s) : s);
  const closing = [];
  const shaped = new Set();
  for (const [s, g] of Object.entries(e.grip || {})) orientGrip(rig, swapSide(s), W(g.y), g.z ? W(g.z) : null);

  if (e.mount) {
    const m = e.mount, side = swapSide(m.side || 'right'), h = bySlot[side];
    const A = anchorPoint(rig, { ...m, off: m.off && mirrorV(m.off) }, yaw);
    if (h && A) {
      const z = W(m.aim || [0, 0, 1]);
      const y = W(m.up || [0, 1, 0]).addScaledVector(z, -W(m.up || [0, 1, 0]).dot(z)).normalize();
      const x = y.clone().cross(z);
      const prop = new THREE.Matrix4().makeBasis(x, y, z);
      const pt = new THREE.Vector3(...(m.point || [0, 0, 0])).applyMatrix4(prop);
      prop.setPosition(A.clone().sub(pt));
      // The grip frame that carries the prop there.
      const g = prop.clone().multiply(offsetMatrix(h.o).invert());
      const gx = new THREE.Vector3(), gy = new THREE.Vector3(), gz = new THREE.Vector3();
      g.extractBasis(gx, gy, gz);
      reachGrip(rig, side, new THREE.Vector3().setFromMatrixPosition(g), gy, gz, elbowPole(rig, side, m.pole && mirrorV(m.pole), yaw));
    }
  }

  if (e.draw) {
    const d = e.draw, bowSide = swapSide(d.bow || 'left'), hand = other(bowSide), h = bySlot[bowSide];
    const A = anchorPoint(rig, { at: 'head', local: [-0.035, -0.05, 0.07], ...d.anchor, ...(d.anchor?.local && e.swap ? { local: mirrorV(d.anchor.local) } : {}) }, yaw);
    if (h && A) {
      for (let i = 0; i < 2; i++) {
        // The arrow runs from the anchor through the bow grip; the bow stands
        // across it, canted a little, its string towards the archer.
        const R = new THREE.Vector3().setFromMatrixPosition(slotFrame(rig, bowSide));
        const aim = R.clone().sub(A).normalize();
        const up = new THREE.Vector3(0, 1, 0).addScaledVector(aim, -aim.y).normalize();
        if (d.cant) up.applyAxisAngle(aim, (d.cant * Math.PI / 180) * (bowSide === 'left' ? -1 : 1));
        orientGrip(rig, bowSide, up, aim);
      }
      const R = new THREE.Vector3().setFromMatrixPosition(slotFrame(rig, bowSide));
      const aim = R.clone().sub(A).normalize();
      const up = new THREE.Vector3(0, 1, 0).addScaledVector(aim, -aim.y).normalize();
      // Draw hand: fingers hooked on the (vertical) string, knuckles to the bow,
      // forearm in line with the arrow, elbow back along it.
      const pole = A.clone().addScaledVector(aim, -0.6).add(new THREE.Vector3(0, 0.08, 0));
      reachGrip(rig, hand, A, up, aim, d.pole ? elbowPole(rig, hand, mirrorV(d.pole), yaw) : pole, { free: true });
      setHandShape(rig, hand, d.shape || { T: [25, 35, 30, 0, 55], I: [10, 70, 55, 0], M: [10, 75, 60, 0], R: [15, 75, 60, 0], L: [70, 90, 65, 0] });
      shaped.add(hand);
    }
  }

  for (const h of held) if (h.slot !== 'back' && !shaped.has(h.slot)) closing.push([h.slot, h.poly.grip?.style || 'fist', gripRadius(h.poly)]);
  for (const r0 of e.reach || []) {
    const r = { ...r0, side: swapSide(r0.side), from: r0.from && swapSide(r0.from) };
    const from = r.from || other(r.side);
    const h = bySlot[from];
    if (!h) continue;
    const m = slotFrame(rig, from);
    if (!m) continue;
    m.multiply(offsetMatrix(h.o));
    const at = r.at || h.poly.grip?.second || [0, 0.2, 0];
    const p = new THREE.Vector3(...at).applyMatrix4(m);
    const wx = new THREE.Vector3(), wy = new THREE.Vector3(), wz = new THREE.Vector3();
    m.extractBasis(wx, wy, wz);
    let y = wy, z = null;
    if (r.axis === 'z') {
      // Under a fore-end: the grip runs along the barrel, the palm up against it.
      y = wz;
      const x = wy.clone().multiplyScalar(r.side === 'right' ? 1 : -1);
      z = x.clone().cross(y);
    } else if (r.axis === 'cup') {
      // Wrapping the firing hand from the side: palm against it, knuckles forward.
      z = wz;
    } else if (r.axis === '-y') y = wy.clone().negate();
    reachGrip(rig, r.side, p, y, z, elbowPole(rig, r.side, r.pole && mirrorV(r.pole), yaw));
    if (r.shape) setHandShape(rig, r.side, typeof r.shape === 'string' ? HAND_SHAPES[r.shape] : r.shape);
    else closing.push([r.side, r.style || 'support', r.r || 0.02]);
  }
  for (const [side, style, rad] of closing) closeHand(rig, side, style, rad);
  // Held props must not sink into the floor (prone, crawling): lift the body if they do.
  let low = Infinity;
  for (const h of held) {
    const m = slotFrame(rig, h.slot);
    if (!m) continue;
    m.multiply(offsetMatrix(h.o));
    for (const v of h.poly.v) low = Math.min(low, v.clone().applyMatrix4(m).y);
  }
  if (low < -0.005 && e.body?.ground !== 'keep' && typeof e.body?.ground !== 'number') {
    const hips = rig.map.hips;
    const w = hips.getWorldPosition(new THREE.Vector3());
    w.y -= low;
    hips.parent.updateWorldMatrix(true, false);
    hips.position.copy(hips.parent.worldToLocal(w));
    rig.root.updateMatrixWorld(true);
  }
  return { held, support: e.body?.support || e.support || null };
}
