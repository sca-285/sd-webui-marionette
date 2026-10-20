// Full-body poses. A pose is written the way an animator thinks about a body,
// from the hips out, and works on any rig (T- or A-pose rest):
//
//   hips:   [pitch, yaw, roll] degrees. pitch + = lean forward, yaw + = turn to
//           the character's left, roll + = tilt to the character's left.
//   spine:  [pitch, yaw, roll] total bend of the back, shared by the spine joints
//           (yaw = twist of the chest against the hips).
//   neck, head: [pitch, yaw, roll] each, relative to the bone below.
//   shoulders: { left: [raise, forward] } degrees (shrug / reach).
//   arms:   directions in the chest frame (+X the character's left, +Y up the
//           spine, +Z out of the chest): leftUpperArm, leftLowerArm.
//   armsIn: 'world' gives the arm directions in the upright frame instead
//           (easier for prone, crawling and upside-down bodies).
//   legs:   directions of leftUpperLeg, leftLowerLeg, leftFoot in the upright
//           frame of the character (+Y straight up, +Z the way it faces), so a
//           lean or a twist of the hips keeps the feet where they are;
//           legsIn: 'hips' gives them in the pelvis frame instead (lying, flips).
//           Unspecified arms hang relaxed, unspecified legs stand straight
//           (unless the hips are lying down), unspecified hands are relaxed.
//   ik:     put a hand or foot on a body part: { leftHand: { at, off, pole } }
//           at = a bone ('head', 'neck', 'chest', 'hips', 'leftUpperLeg' (thigh),
//           'leftLowerLeg' (knee), 'rightHand', ...), off = [x, y, z] metres
//           from it in the upright frame, pole = the way the elbow / knee
//           points (upright frame). Solved after the limb directions.
//   forearm: { left: deg } turn of the forearm about itself (+ = palm turns down / in).
//   wrist:  { left: [flex, deviation] } degrees (+ flex = towards the palm).
//   hands:  { left: shape name or shape } (handshapes.js).
//   feet:   'flat' keeps unspecified feet level with the floor (default for
//           standing poses), 'free' lets them follow the shins.
//   ground: 'lowest' (default: the lowest part of the body rests on the floor),
//           a number = hips height in metres, or 'keep'.
//   lift:   metres above the floor after grounding (jumps, flying).
//   support: [category, item, [x, y, z], yaw] a library prop placed in the
//           character's frame (+X left, +Z forward, from the point under the hips).
//           When the hips are over the prop (seat, bed, crate to stand on), the
//           body settles onto it: lowered or raised until it rests on the top
//           without sinking in, whatever the body's proportions (settle: false
//           keeps the given height; rest: 'feet' when standing on it). ik targets can use at: 'support' with off
//           in the prop's frame from the centre of its top (hand on a table,
//           foot on a step); they are solved once the body is in place.
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { setHandShape, HAND_SHAPES } from './handshapes.js';
import { LIBRARY } from './library.js';

const D = THREE.MathUtils.degToRad;
const wpos = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const SIDES = ['left', 'right'];
const euler = (a) => new THREE.Quaternion().setFromEuler(new THREE.Euler(D(a[0] || 0), D(a[1] || 0), -D(a[2] || 0), 'YXZ'));

function spineKeys(rig) {
  const out = [];
  for (let i = 0; rig.map['spine' + i]; i++) out.push('spine' + i);
  return out;
}

// Rotate a bone relative to its parent, by q expressed in the character's rest axes.
function setRel(rig, key, parentDelta, q) {
  const b = rig.map[key];
  if (!b) return;
  rig.setWorldQuat(b, parentDelta.clone().multiply(q).multiply(rig.rest[key].wq));
}

// Lowest point of the character: skinned or rigid meshes, vertex-exact.
function lowestY(root) {
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => { if (o.isMesh && o.visible && !o.userData.noBounds) box.expandByObject(o, true); });
  return box.isEmpty() ? null : box.min.y;
}

// ---- Support props: where main.js puts them (see supportMatrix there), and a
// BVH of their surface for contact tests.
const supportCache = new Map();
function supportShape(sup) {
  const key = sup[0] + '/' + sup[1];
  if (!supportCache.has(key)) {
    const poly = [LIBRARY[sup[0]]?.[sup[1]]?.()].flat()[0];
    if (!poly) { supportCache.set(key, null); return null; }
    const geo = poly.toIndexedGeometry();
    geo.computeBoundingBox();
    supportCache.set(key, { bvh: new MeshBVH(geo), box: geo.boundingBox.clone(), geo });
  }
  return supportCache.get(key);
}
function supportFrame(rig, sup) {
  const yaw = rig.facing();
  const hp = wpos(rig.map.hips);
  const off = new THREE.Vector3(...(sup[2] || [0, 0, 0])).applyQuaternion(yaw);
  const q = yaw.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), D(sup[3] || 0)));
  return new THREE.Matrix4().compose(new THREE.Vector3(hp.x + off.x, off.y, hp.z + off.z), q, new THREE.Vector3(1, 1, 1));
}
const RAYS = [new THREE.Vector3(0.31, 0.83, 0.47), new THREE.Vector3(-0.72, 0.11, 0.69), new THREE.Vector3(0.05, -0.97, 0.24)].map((v) => v.normalize());
const _ray = new THREE.Ray();
// Depth of a point inside the prop under an upward-facing surface (a seat, a
// mattress, a step): 0 outside, or when the nearest surface is a side (a
// backrest or a wall is a matter of where the prop stands, not of height).
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
function insideDepth(shape, p) {
  if (!shape.box.containsPoint(p)) return 0;
  let odd = 0;
  for (let i = 0; i < 3; i++) {
    _ray.set(p, RAYS[i]);
    if (shape.bvh.raycast(_ray, THREE.DoubleSide).length % 2) odd++;
    if (odd >= 2 || odd + (2 - i) < 2) break;
  }
  if (odd < 2) return 0;
  const hit = shape.bvh.closestPointToPoint(p, {});
  const pos = shape.geo.attributes.position, idx = shape.geo.index, f = hit.faceIndex * 3;
  _a.fromBufferAttribute(pos, idx.getX(f)); _b.fromBufferAttribute(pos, idx.getX(f + 1)); _c.fromBufferAttribute(pos, idx.getX(f + 2));
  const n = _c.sub(_b).cross(_a.sub(_b)).normalize();
  return Math.abs(n.y) > 0.7 ? hit.distance : 0;
}
// Character vertices near the prop, in the prop's frame. Only the parts a body
// rests on (hips, back, head, thighs) count: a hand or a shin poking into the
// prop is the pose's business, not a reason to lift the whole body.
function bodySamples(root, rig, inv, box, reach, rest = 'seat') {
  const out = [];
  const v = new THREE.Vector3();
  const near = box.clone().expandByVector(new THREE.Vector3(0.02, reach, 0.02));
  const restKeys = rest === 'feet' ? /^(left|right)(LowerLeg|Foot|Toes)$/ : /^(hips|spine\d+|neck|head|leftUpperLeg|rightUpperLeg)$/;
  const resting = new Set(Object.entries(rig.map).filter(([k]) => restKeys.test(k)).map(([, b]) => b));
  const boneOf = (o) => { for (let p = o; p; p = p.parent) if (p.isBone || resting.has(p)) return p; return null; };
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || !o.visible || o.userData.noBounds) return;
    const pos = o.geometry.attributes.position;
    const si = o.isSkinnedMesh && o.geometry.attributes.skinIndex, sw = si && o.geometry.attributes.skinWeight;
    const bones = o.skeleton?.bones;
    const fixed = si ? null : boneOf(o);
    if (!si && !resting.has(fixed)) return;
    for (let i = 0; i < pos.count; i += 2) {
      if (si) {
        let best = 0, w = -1;
        for (let j = 0; j < 4; j++) { const x = sw.getComponent(i, j); if (x > w) { w = x; best = si.getComponent(i, j); } }
        if (!resting.has(bones[best])) continue;
      }
      o.getVertexPosition(i, v);
      o.localToWorld(v).applyMatrix4(inv);
      if (near.containsPoint(v)) out.push(v.clone());
    }
  });
  return out;
}
// Vertical shift that rests the body on the prop: the lowest one with no part
// sunk in deeper than tol, the feet staying above the floor.
function settleShift(root, rig, shape, M, low, rest, maxUp = Infinity) {
  const inv = M.clone().invert();
  const top = shape.box.max.y + M.elements[13];
  const lo = -Math.max(0, low), hi = Math.min(maxUp, Math.max(0.05, top - low + 0.05));
  const samples = bodySamples(root, rig, inv, shape.box, hi - lo + 0.05, rest);
  if (!samples.length) return 0;
  const p = new THREE.Vector3();
  const ok = (dy) => samples.every((s) => insideDepth(shape, p.set(s.x, s.y + dy, s.z)) <= 0.004);
  // The first clear height going up (rising further can run the thighs into a
  // backrest, so the search must not jump to a higher clear band).
  if (ok(lo)) return lo;
  let prev = lo;
  for (let dy = lo + 0.01; dy <= hi + 1e-9; dy += 0.01) {
    if (ok(dy)) {
      let a = prev, b = dy;
      for (let i = 0; i < 6; i++) { const m = (a + b) / 2; if (ok(m)) b = m; else a = m; }
      return b;
    }
    prev = dy;
  }
  return hi;
}

export function applyBodyPose(rig, p, { root = null } = {}) {
  const yaw = rig.facing();
  const ground = rig.map.hips.getWorldPosition(new THREE.Vector3());
  rig.resetAll({ keepPlacement: true });
  rig.root.updateMatrixWorld(true);
  const restHipsY = rig.map.hips.getWorldPosition(new THREE.Vector3()).y;

  // Hips: the whole body turns with them.
  const hips = rig.map.hips;
  rig.setWorldQuat(hips, yaw.clone().multiply(euler(p.hips || [0, 0, 0])).multiply(rig.rest.hips.wq));

  // Back: the bend is shared out along the spine joints.
  const sk = spineKeys(rig);
  const sp = p.spine || [0, 0, 0];
  const part = sk.length ? sp.map((v) => (v || 0) / sk.length) : sp;
  for (const k of sk) setRel(rig, k, rig.delta(rig.parentOf?.[k] || 'hips'), euler(part));
  if (rig.map.neck) setRel(rig, 'neck', rig.delta(rig.parentOf?.neck || sk[sk.length - 1] || 'hips'), euler(p.neck || [0, 0, 0]));
  if (rig.map.head) setRel(rig, 'head', rig.delta(rig.parentOf?.head || 'neck'), euler(p.head || [0, 0, 0]));

  const chestKey = sk[sk.length - 1] || 'hips';
  const chest = rig.delta(chestKey);
  const hipsD = rig.delta('hips');

  // Shoulders (clavicles): raise about the forward axis, reach about the vertical.
  for (const side of SIDES) {
    const key = side + 'Shoulder', s = p.shoulders?.[side];
    if (!rig.map[key] || !s) continue;
    const sign = side === 'left' ? 1 : -1;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -D(s[1] || 0) * sign, D(s[0] || 0) * sign, 'YXZ'));
    setRel(rig, key, rig.delta(rig.parentOf?.[key] || chestKey), q);
  }

  // Limbs: aim each bone along its direction in the chest / hips frame.
  const hr = p.hips || [0, 0, 0];
  const upright = Math.abs(hr[0] || 0) < 50 && Math.abs(hr[2] || 0) < 50;
  const ARMS = { leftUpperArm: [0.22, -1, 0.04], leftLowerArm: [0.1, -1, 0.14], rightUpperArm: [-0.22, -1, 0.04], rightLowerArm: [-0.1, -1, 0.14] };
  const LEGS = { leftUpperLeg: [0.07, -1, 0.02], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.07, -1, 0.02], rightLowerLeg: [0, -1, 0] };
  const pick = (base, given) => {
    const out = { ...base };
    for (const side of SIDES) {
      // A limb given partly (only the upper bone) keeps the rest of its default.
      const keys = Object.keys(base).filter((k) => k.startsWith(side));
      if (keys.some((k) => given?.[k])) for (const k of keys) if (!given[k]) delete out[k];
    }
    return { ...out, ...(given || {}) };
  };
  const legsInHips = p.legsIn === 'hips' || (!upright && p.legsIn !== 'world');
  const dirs = {
    ...(rig.extraDefaults || {}),
    ...pick(ARMS, p.arms),
    ...(p.legs || upright ? pick(upright && !p.legsIn ? LEGS : {}, p.legs) : {}),
  };
  for (const k of rig.order) {
    const v = dirs[k];
    if (!v) continue;
    const frame = /Arm|Hand|Shoulder/.test(k) ? (p.armsIn === 'world' ? yaw : chest) : /Leg|Foot|Toes/.test(k) ? (legsInHips ? hipsD : yaw) : yaw;
    rig.aim(k, rig.childOf(k), new THREE.Vector3(...v).applyQuaternion(frame));
    if (/LowerArm|LowerLeg/.test(k)) rig.alignHinge(k);
  }

  // Hands and feet placed on the body.
  const anchorKey = (a) => (a === 'chest' ? chestKey : a === 'head' ? 'head' : a);
  const solveIk = (eff, t, target) => {
    let pole = null;
    if (t.pole) {
      const chain = rig.ikChain(eff);
      if (chain) pole = wpos(chain[1]).add(new THREE.Vector3(...t.pole).normalize().multiplyScalar(0.4).applyQuaternion(yaw));
    }
    rig.solveIK(eff, target, 16, pole);
  };
  for (const [eff, t] of Object.entries(p.ik || {})) {
    if (t.at === 'support') continue;
    const k = anchorKey(t.at || 'chest');
    const b = rig.map[k] || (k === 'headTop' ? rig.markers.headTop : null);
    if (!rig.map[eff] || !b) continue;
    solveIk(eff, t, wpos(b).add(new THREE.Vector3(...(t.off || [0, 0, 0])).applyQuaternion(yaw)));
  }

  // Forearm turn and wrist.
  for (const side of SIDES) {
    const lower = rig.map[side + 'LowerArm'], hand = rig.map[side + 'Hand'];
    if (lower && hand && p.forearm?.[side]) {
      const keep = rig.childOf(side + 'LowerArm');
      const axis = wpos(hand).sub(wpos(lower)).normalize();
      if (keep) rig.rotateWorld(lower, new THREE.Quaternion().setFromAxisAngle(axis, D(p.forearm[side]) * (side === 'left' ? -1 : 1)));
    }
    const w = p.wrist?.[side];
    if (hand && w) {
      const n = rig.palmN[side];
      const mid = rig.curlAxes[side].Middle || rig.curlAxes[side].Index;
      if (mid) {
        const q = new THREE.Quaternion().setFromAxisAngle(mid, D(w[0] || 0)).multiply(new THREE.Quaternion().setFromAxisAngle(n, D(w[1] || 0) * (side === 'left' ? 1 : -1)));
        const parentD = rig.delta(side + 'LowerArm');
        // The wrist keeps the hand's rest relation to the forearm, then bends.
        rig.setWorldQuat(hand, parentD.clone().multiply(q).multiply(rig.rest[side + 'Hand'].wq));
      }
    }
    const h = p.hands?.[side] ?? 'Relaxed';
    if (h) setHandShape(rig, side, typeof h === 'string' ? HAND_SHAPES[h] : h);
  }

  // Feet level with the floor unless the pose says otherwise.
  const feetMode = p.feet || (upright ? 'flat' : 'free');
  const feetFlat = (key) => feetMode === 'flat' && !dirs[key];
  for (const side of SIDES) {
    const key = side + 'Foot';
    if (!rig.map[key] || dirs[key] || feetMode !== 'flat') continue;
    rig.setWorldQuat(rig.map[key], yaw.clone().multiply(rig.rest[key].wq));
  }

  // Placement: back where the character stood, resting on the floor.
  rig.root.updateMatrixWorld(true);
  const hp = wpos(hips);
  const setHipsY = (y) => {
    const w = wpos(hips);
    w.set(ground.x + (p.shift ? new THREE.Vector3(...p.shift).applyQuaternion(yaw).x : 0), y,
      ground.z + (p.shift ? new THREE.Vector3(...p.shift).applyQuaternion(yaw).z : 0));
    hips.parent.updateWorldMatrix(true, false);
    hips.position.copy(hips.parent.worldToLocal(w));
    rig.root.updateMatrixWorld(true);
  };
  if (typeof p.ground === 'number') setHipsY(p.ground);
  else if (p.ground === 'keep') setHipsY(restHipsY);
  else {
    setHipsY(hp.y);
    const low = root ? lowestY(root) : null;
    setHipsY(hp.y - (low ?? 0));
  }
  if (p.lift) setHipsY(wpos(hips).y + p.lift);

  // Resting on a support prop, and limbs placed on it.
  const sup = p.support;
  const shape = sup && root ? supportShape(sup) : null;
  if (shape) {
    let M = supportFrame(rig, sup);
    const hpL = wpos(hips).applyMatrix4(M.clone().invert());
    const over = hpL.x > shape.box.min.x && hpL.x < shape.box.max.x && hpL.z > shape.box.min.z && hpL.z < shape.box.max.z;
    if (p.settle ?? over) {
      // Rest on the prop, put feet meant for the floor back on it (plant: false
      // keeps them), and rest again: a few rounds settle thighs and soles together.
      for (let round = 0; round < 3; round++) {
        const low = lowestY(root) ?? 0;
        // A seat is never above standing hip height (that would be a backrest top).
        const maxUp = p.rest === 'feet' ? Infinity : Math.max(0, restHipsY + 0.03 - wpos(hips).y);
        const dy = settleShift(root, rig, shape, M, low, p.rest, maxUp);
        if (Math.abs(dy) > 1e-4) setHipsY(wpos(hips).y + dy);
        if (p.plant === false || p.rest === 'feet' || round === 2) break;
        let moved = false;
        for (const side of SIDES) {
          const fk = side + 'Foot', foot = rig.map[fk];
          if (!foot || rig.restY?.[fk] === undefined || !rig.ikChain(fk)) continue;
          const fp = wpos(foot);
          const above = fp.y - rig.restY[fk];
          if (Math.abs(above) < 0.005 || above > 0.2) continue;
          const knee = wpos(rig.map[side + 'LowerLeg']);
          const pole = knee.clone().add(new THREE.Vector3(0, 0, 0.4).applyQuaternion(yaw));
          rig.solveIK(fk, fp.setY(rig.restY[fk]), 16, pole);
          if (feetFlat(fk)) rig.setWorldQuat(foot, yaw.clone().multiply(rig.rest[fk].wq));
          moved = true;
        }
        if (!moved) break;
      }
    }
    const tops = Object.entries(p.ik || {}).filter(([, t]) => t.at === 'support');
    if (tops.length) {
      M = supportFrame(rig, sup);
      const b = shape.box;
      const topC = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2);
      for (const [eff, t] of tops) {
        if (!rig.map[eff]) continue;
        const local = topC.clone().add(new THREE.Vector3(...(t.off || [0, 0, 0])));
        solveIk(eff, t, local.applyMatrix4(M));
        // A hand put on a prop lies palm down on it (palm: false keeps its turn).
        const side = eff.startsWith('left') ? 'left' : 'right';
        if (/Hand$/.test(eff) && t.palm !== false && rig.palmN?.[side]) {
          const n = rig.palmN[side].clone().applyQuaternion(rig.delta(eff)).normalize();
          rig.rotateWorld(rig.map[eff], new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, -1, 0)));
        }
        // A foot put on a step stays level.
        if (/Foot$/.test(eff) && (p.feet || 'flat') === 'flat') rig.setWorldQuat(rig.map[eff], yaw.clone().multiply(rig.rest[eff].wq));
      }
    }
  }
  return { yaw, ground };
}

export { HAND_SHAPES };
