// Pose from image: parse OpenPose JSON and lift 2D keypoints onto a 3D rig as
// seen from the current shot camera.
//
// Depth is ambiguous from one view, so: the distance comes from the torso,
// shoulder and limb lengths (foreshortening only ever shortens them, so the
// smallest estimate is the right one); the torso is fitted from several starting
// tilts (upright, leaning towards / away from the camera, lying) and the one that
// best explains the shoulders, hips, face and reachable elbows / knees wins;
// each limb bone comes from a ray / sphere intersection whose answers are
// chosen by the joint limits (elbows and knees only bend one way); the head is
// turned so the nose, eyes and ears (and face points) land where detected.
import * as THREE from 'three';
import { clampJoint } from './limits.js';

const BODY25_TO_COCO = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function triples(arr, minConf) {
  const out = [];
  for (let i = 0; i + 2 < (arr?.length || 0); i += 3) {
    const [x, y, c] = [arr[i], arr[i + 1], arr[i + 2]];
    out.push(c >= minConf && (x !== 0 || y !== 0) ? [x, y, c] : null);
  }
  return out;
}

// Accepts OpenPose JSON (COCO-18 or BODY_25, pixel or normalised coordinates),
// a list of those (ControlNet's editor), or { poses: [...] } (ControlNet API).
export function parseOpenPose(json, minConf = 0.1) {
  let doc = json;
  if (Array.isArray(doc)) doc = doc[0];
  if (doc?.poses) doc = doc.poses[0];
  if (!doc?.people) throw new Error('No "people" in this file: not an OpenPose JSON');
  const people = doc.people.map((p) => {
    let body = triples(p.pose_keypoints_2d, minConf);
    if (body.length >= 25) body = BODY25_TO_COCO.map((i) => body[i]);
    const hand = (a) => { const h = triples(a, minConf); return h.length === 21 && h.filter(Boolean).length >= 6 ? h : null; };
    const face = triples(p.face_keypoints_2d, Math.max(minConf, 0.3));
    return {
      body: body.slice(0, 18), hands: { left: hand(p.hand_left_keypoints_2d), right: hand(p.hand_right_keypoints_2d) },
      face: face.filter(Boolean).length >= 20 ? face : null,
    };
  }).filter((p) => p.body.filter(Boolean).length >= 4);
  let W = doc.canvas_width, H = doc.canvas_height;
  const all = people.flatMap((p) => [...p.body, ...(p.hands.left || []), ...(p.hands.right || [])]).filter(Boolean);
  const maxXY = all.reduce((m, q) => Math.max(m, q[0], q[1]), 0);
  if (maxXY <= 1.5) {
    // Normalised coordinates.
    const s = (q) => q && [q[0] * (W || 1), q[1] * (H || 1), q[2]];
    for (const p of people) {
      p.body = p.body.map(s);
      if (p.face) p.face = p.face.map(s);
      for (const k of ['left', 'right']) if (p.hands[k]) p.hands[k] = p.hands[k].map(s);
    }
    W ||= 1; H ||= 1;
  }
  if (!W || !H) {
    W = Math.ceil(Math.max(...all.map((q) => q[0])) * 1.05);
    H = Math.ceil(Math.max(...all.map((q) => q[1])) * 1.05);
  }
  return { W, H, people };
}

const mid = (a, b) => (a && b ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.min(a[2], b[2])] : a || b || null);
const wpos = (o) => o.getWorldPosition(new THREE.Vector3());

/**
 * Pose `rig` to match one detected person. camera: the shot camera (its aspect
 * should match the image). Returns the estimated distance, or throws.
 */
export function fitPerson(rig, person, camera, imgW, imgH) {
  const B = person.body;
  const neck2 = B[1] || mid(B[2], B[5]);
  const hip2 = mid(B[8], B[11]);
  if (!neck2 || !hip2) throw new Error('This person needs a visible neck/shoulders and hips');

  camera.updateMatrixWorld(true);
  const camR = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const camF = camera.getWorldDirection(new THREE.Vector3());
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const ray = (p) => {
    const r = new THREE.Raycaster();
    r.setFromCamera(new THREE.Vector2((p[0] / imgW) * 2 - 1, 1 - (p[1] / imgH) * 2), camera);
    return r.ray;
  };
  const atDepth = (p, d) => { const r = ray(p); return r.origin.clone().addScaledVector(r.direction, d / r.direction.dot(camF)); };
  // Length of a 2D segment in "view units" (world length at distance 1).
  const viewLen = (a, b) => Math.hypot(((a[0] - b[0]) / imgW) * 2 * tanV * camera.aspect, ((a[1] - b[1]) / imgH) * 2 * tanV);
  const v = new THREE.Vector3();
  const proj = (p) => { v.copy(p).project(camera); return [(v.x + 1) / 2 * imgW, (1 - v.y) / 2 * imgH]; };
  const err2 = (p3, q2) => { const [x, y] = proj(p3); return ((x - q2[0]) ** 2 + (y - q2[1]) ** 2) / (imgH * imgH); };

  // Rest-pose measurements.
  rig.resetAll();
  const m = rig.map, mk = rig.markers;
  const sR = wpos(m.rightUpperArm), sL = wpos(m.leftUpperArm);
  const hR = wpos(m.rightUpperLeg), hL = wpos(m.leftUpperLeg);
  const torso3 = sR.clone().add(sL).multiplyScalar(0.5).distanceTo(hR.clone().add(hL).multiplyScalar(0.5));
  const shoulder3 = sR.distanceTo(sL);
  const boneLen = (a, b) => (m[a] && m[b] ? wpos(m[a]).distanceTo(wpos(m[b])) : 0);

  // Distance: every rigid segment gives an upper bound of the true distance
  // (foreshortening only shortens it on screen); the smallest one wins, unless
  // it is far below the next one (a bad keypoint).
  const est = [torso3 / Math.max(1e-6, viewLen(neck2, hip2))];
  if (B[2] && B[5]) est.push(shoulder3 / Math.max(1e-6, viewLen(B[2], B[5])));
  if (B[8] && B[11]) est.push(boneLen('leftUpperLeg', 'rightUpperLeg') / Math.max(1e-6, viewLen(B[8], B[11])) * 1.25);
  for (const [i, j, a, b] of [[2, 3, 'rightUpperArm', 'rightLowerArm'], [5, 6, 'leftUpperArm', 'leftLowerArm'], [3, 4, 'rightLowerArm', 'rightHand'], [6, 7, 'leftLowerArm', 'leftHand'],
    [8, 9, 'rightUpperLeg', 'rightLowerLeg'], [11, 12, 'leftUpperLeg', 'leftLowerLeg'], [9, 10, 'rightLowerLeg', 'rightFoot'], [12, 13, 'leftLowerLeg', 'leftFoot']]) {
    const L = boneLen(a, b);
    if (B[i] && B[j] && L) est.push(L / Math.max(1e-6, viewLen(B[i], B[j])));
  }
  est.sort((x, y) => x - y);
  const d = est.length > 1 && est[0] < 0.7 * est[1] ? est[1] : est[0];

  // Torso frame for a given up direction; the facing comes from the shoulders.
  const hip3 = atDepth(hip2, d), neck3 = atDepth(neck2, d);
  const up0 = neck3.clone().sub(hip3).normalize();
  const torsoGuess = (up, flip) => {
    let left;
    if (B[2] && B[5]) {
      const span = atDepth(B[5], d).sub(atDepth(B[2], d));
      span.addScaledVector(up, -span.dot(up));
      const s2 = Math.min(span.length(), shoulder3);
      // Facing the camera puts the character's left shoulder on the viewer's right.
      const facingCam = span.dot(camR) > 0;
      // The nearer shoulder: the one whose ear OpenPose still sees, else the nose side.
      let nearLeft = B[17] && !B[16] ? true : B[16] && !B[17] ? false : null;
      if (nearLeft === null && B[0]) nearLeft = (B[0][0] - neck2[0]) * (facingCam ? 1 : -1) < 0;
      if (flip) nearLeft = !nearLeft;
      const dz = Math.sqrt(Math.max(0, shoulder3 ** 2 - s2 ** 2));
      left = span.normalize().multiplyScalar(s2).addScaledVector(camF, (nearLeft ? -1 : 1) * dz);
    } else {
      // One shoulder: a profile view. Visible right side -> the character's left points away.
      left = camF.clone().multiplyScalar(B[2] ? 1 : -1);
      if (flip) left.negate();
    }
    left.addScaledVector(up, -left.dot(up));
    if (left.lengthSq() < 1e-8) left.copy(camR);
    left.normalize();
    const fwd = new THREE.Vector3().crossVectors(left, up).normalize();
    left.crossVectors(up, fwd).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(left, up, fwd));
  };

  // Place the torso: hips position + body rotation. The hips bone sits between
  // the thighs, so it goes on the detected mid-hip.
  const hipsOffset = wpos(m.hips).sub(hR.clone().add(hL).multiplyScalar(0.5));
  const setTorso = (pos, q) => {
    rig.setWorldQuat(m.hips, q.clone().multiply(rig.rest.hips.wq));
    m.hips.parent.updateWorldMatrix(true, false);
    m.hips.position.copy(m.hips.parent.worldToLocal(pos.clone().add(hipsOffset.clone().applyQuaternion(q))));
    rig.root.updateMatrixWorld(true);
  };

  // Torso fit (a small PnP over 6 degrees of freedom). Besides shoulders and
  // hips, the face points (head still at rest on the torso, so a weak weight)
  // tell which way the body faces, and an elbow / knee that its upper bone
  // could not reach from where the shoulder / hip sits rules a guess out.
  const torsoPts = [[2, m.rightUpperArm], [5, m.leftUpperArm], [8, m.rightUpperLeg], [11, m.leftUpperLeg]].filter(([i, o]) => B[i] && o);
  const headPts = [[0, mk.nose], [14, mk.rightEye], [15, mk.leftEye], [16, mk.rightEar], [17, mk.leftEar]].filter(([i, o]) => B[i] && o);
  const reach = [[2, 3, 'rightUpperArm', 'rightLowerArm'], [5, 6, 'leftUpperArm', 'leftLowerArm'], [8, 9, 'rightUpperLeg', 'rightLowerLeg'], [11, 12, 'leftUpperLeg', 'leftLowerLeg']]
    .filter(([, j, a, b]) => B[j] && m[a] && m[b]).map(([, j, a, b]) => [ray(B[j]), m[a], boneLen(a, b)]);
  const H2 = rig.height * rig.height;
  const cost = (pos, q) => {
    setTorso(pos, q);
    let e = 0;
    for (const [i, o] of torsoPts) e += err2(wpos(o), B[i]);
    for (const [i, o] of headPts) e += 0.25 * err2(wpos(o), B[i]);
    for (const [r, o, L] of reach) {
      const gap = r.distanceToPoint(wpos(o)) - L;
      if (gap > 0) e += 0.5 * gap * gap / H2;
    }
    // The torso points in front of the camera.
    if (wpos(m.hips).sub(camera.position).dot(camF) < 0.1) e += 1;
    const bodyUp = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    return e + 0.0004 * (1 - bodyUp.y);
  };
  const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  const refine = (q0, pos0 = hip3, iters = 60, s0 = 0.08, r0 = 0.25) => {
    let pos = pos0.clone(), q = q0.clone(), best = cost(pos, q);
    let sp = s0 * rig.height, sr = r0;
    for (let it = 0; it < iters && (sp > 1e-4 || sr > 1e-4); it++) {
      let improved = false;
      for (const a of axes) for (const sgn of [1, -1]) {
        const p2 = pos.clone().addScaledVector(a, sgn * sp);
        const c1 = cost(p2, q);
        if (c1 < best) { best = c1; pos = p2; improved = true; }
        const q2 = new THREE.Quaternion().setFromAxisAngle(a, sgn * sr).multiply(q);
        const c2 = cost(pos, q2);
        if (c2 < best) { best = c2; q = q2; improved = true; }
      }
      if (!improved) { sp *= 0.5; sr *= 0.5; }
    }
    return { pos, q, best };
  };
  // Starting tilts: the torso seen on screen may lean towards or away from the
  // camera by any amount (a body lying down is just a big tilt).
  const tiltAxis = up0.clone().cross(camF).normalize();
  const starts = [];
  for (const deg of [0, 30, -30, 60, -60, 80, -80]) {
    const up = up0.clone().applyAxisAngle(tiltAxis, THREE.MathUtils.degToRad(deg));
    for (const flip of [false, true]) starts.push(torsoGuess(up, flip));
  }
  // Cheap pass over every start, then the best few refined fully.
  const coarse = starts.map((q) => refine(q, hip3, 14)).sort((a, b) => a.best - b.best);
  // Keep distinct guesses only (spine directions apart), so an end-on body's
  // two mirror answers both get judged by the rest of the body below.
  const distinct = [];
  const upOf = (t) => new THREE.Vector3(0, 1, 0).applyQuaternion(t.q);
  for (const c of coarse) {
    if (distinct.length >= 4) break;
    if (distinct.every((o) => upOf(o).angleTo(upOf(c)) > 0.5 || new THREE.Vector3(0, 0, 1).applyQuaternion(o.q).angleTo(new THREE.Vector3(0, 0, 1).applyQuaternion(c.q)) > 1.2)) distinct.push(c);
  }
  const finalists = distinct.map((t) => refine(t.q, t.pos, 60, 0.02, 0.06)).sort((a, b) => a.best - b.best);
  let fwd = new THREE.Vector3();

  // Limbs: [upper, lower, end, joint i, mid i, end i, prefer forward for upper, for lower]
  const LIMBS = [
    ['rightUpperArm', 'rightLowerArm', 'rightHand', 2, 3, 4, 1, 1],
    ['leftUpperArm', 'leftLowerArm', 'leftHand', 5, 6, 7, 1, 1],
    ['rightUpperLeg', 'rightLowerLeg', 'rightFoot', 8, 9, 10, 1, -1],
    ['leftUpperLeg', 'leftLowerLeg', 'leftFoot', 11, 12, 13, 1, -1],
  ];
  // Both points of the joint's ray at bone length from P (one if the ray passes out of reach).
  const onRay = (P, p2, L) => {
    const r = ray(p2);
    const w = r.origin.clone().sub(P);
    const b = r.direction.dot(w);
    const disc = b * b - (w.lengthSq() - L * L);
    if (disc < 0) {
      const c = r.origin.clone().addScaledVector(r.direction, -b);
      return [P.clone().add(c.sub(P).setLength(L))];
    }
    const s = Math.sqrt(disc);
    return [r.origin.clone().addScaledVector(r.direction, -b - s), r.origin.clone().addScaledVector(r.direction, -b + s)];
  };
  const snap = (keys) => keys.map((k) => [m[k], m[k].quaternion.clone()]);
  const restore = (sn) => { for (const [o, q] of sn) o.quaternion.copy(q); rig.root.updateMatrixWorld(true); };
  // How far the joint limits would have to move these bones (radians).
  const violation = (keys) => {
    if (!rig.jointLimits) return 0;
    const sn = snap(keys);
    let tot = 0;
    for (const k of keys) {
      const before = m[k].getWorldQuaternion(new THREE.Quaternion());
      if (clampJoint(rig, k)) tot += before.angleTo(m[k].getWorldQuaternion(new THREE.Quaternion()));
    }
    restore(sn);
    return tot;
  };
  const solveLimbs = () => {
  let total = 0;
  for (const [up1, low, end, , iMid, iEnd, pu, pl] of LIMBS) {
    if (!m[up1] || !m[low]) continue;
    const P = wpos(m[up1]);
    const L1 = P.distanceTo(wpos(m[low])), L2 = m[end] ? wpos(m[low]).distanceTo(wpos(m[end])) : 0;
    const mids = B[iMid] ? onRay(P, B[iMid], L1) : [null];
    let best = null;
    const base = snap([up1, low, end].filter((k) => m[k]));
    for (const C of mids) {
      restore(base);
      if (C) rig.aim(up1, m[low], C.clone().sub(P));
      const afterC = snap([up1, low]);
      const Q = wpos(m[low]);
      const ends = B[iEnd] && m[end] ? onRay(Q, B[iEnd], L2) : [null];
      for (const E of ends) {
        restore(afterC);
        if (E) { rig.aim(low, m[end], E.clone().sub(Q)); rig.alignHinge?.(low); }
        // Joint limits decide; the usual bend (hands / knees forward, shins back) breaks ties.
        let score = violation([up1, low]);
        if (C && C.clone().sub(P).dot(fwd) * pu < 0) score += 0.05;
        if (E && E.clone().sub(Q).dot(fwd) * pl < 0) score += 0.05;
        if (!best || score < best.score) best = { score, q: snap([up1, low]) };
      }
    }
    if (best) { restore(best.q); total += best.score; }
  }
  return total;
  };

  // Head: turn it (part in the neck) so the face points land on the detection.
  const faceDet = person.face;
  const faceIdx = faceDet ? faceDet.map((p, i) => (p ? i : -1)).filter((i) => i >= 0) : [];
  const solveHead = () => {
  if (!(m.head && (headPts.length >= 2 || faceIdx.length >= 10))) return 0;
  {
    const head = m.head;
    const H0 = head.getWorldQuaternion(new THREE.Quaternion());
    const headCost = (q) => {
      rig.setWorldQuat(head, q.clone().multiply(H0));
      let e = 0;
      for (const [i, o] of headPts) e += err2(wpos(o), B[i]);
      if (faceIdx.length >= 10) {
        const fp = rig.facePoints?.(null);
        if (fp) {
          let fe = 0, n = 0;
          for (const i of faceIdx) if (fp[i]) { fe += err2(fp[i], faceDet[i]); n++; }
          if (n) e += (fe / n) * 5;
        }
      }
      // Heads rarely turn far from the chest: a gentle pull back to neutral.
      const ang = 2 * Math.acos(Math.min(1, Math.abs(q.w)));
      return e + 0.00015 * ang * ang;
    };
    let q = new THREE.Quaternion(), best = headCost(q), sr = 0.35;
    for (let it = 0; it < 80 && sr > 2e-4; it++) {
      let improved = false;
      for (const a of axes) for (const sgn of [1, -1]) {
        const q2 = new THREE.Quaternion().setFromAxisAngle(a, sgn * sr).multiply(q);
        const c = headCost(q2);
        if (c < best) { best = c; q = q2; improved = true; }
      }
      if (!improved) sr *= 0.5;
    }
    // Share the turn with the neck, keeping the head's final orientation.
    const target = q.clone().multiply(H0);
    if (m.neck) rig.rotateWorld(m.neck, new THREE.Quaternion().slerp(q, 0.4));
    rig.setWorldQuat(head, target);
    if (rig.jointLimits) { clampJoint(rig, 'neck'); clampJoint(rig, 'head'); }
    return best;
  }
  };

  // The torso guesses that explain the shoulders and hips equally well (a body
  // seen end-on, lying towards or away from the camera) are told apart by the
  // rest of the body: limbs that need impossible joints, a face that can't be
  // turned onto its detection.
  const all = rig.order.map((k) => [m[k], m[k].quaternion.clone(), m[k].position.clone()]);
  const reset = () => { for (const [o, q, p] of all) { o.quaternion.copy(q); o.position.copy(p); } rig.root.updateMatrixWorld(true); };
  let pick = finalists[0];
  if (finalists.length > 1) {
    let bestScore = Infinity;
    for (const t of finalists) {
      if (t.best > finalists[0].best * 3 + 0.004) continue;
      reset();
      setTorso(t.pos, t.q);
      fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(t.q);
      const lv = solveLimbs(), hv = solveHead();
      let rv = 0;
      for (const [i, k] of [[3, 'rightLowerArm'], [4, 'rightHand'], [6, 'leftLowerArm'], [7, 'leftHand'], [9, 'rightLowerLeg'], [10, 'rightFoot'], [12, 'leftLowerLeg'], [13, 'leftFoot']]) {
        if (B[i] && m[k]) rv += err2(wpos(m[k]), B[i]);
      }
      const score = t.best + 0.004 * lv + hv + rv;
      if (score < bestScore) { bestScore = score; pick = t; }
    }
    reset();
  }
  setTorso(pick.pos, pick.q);
  fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(pick.q);
  solveLimbs();
  solveHead();

  // Fingers: curl from the bend between knuckle and fingertip segments.
  for (const side of ['left', 'right']) {
    const h = person.hands[side];
    if (!h) continue;
    const curl = {};
    ['Thumb', 'Index', 'Middle', 'Ring', 'Little'].forEach((f, i) => {
      const [a, b2, c] = [h[0], h[1 + i * 4], h[4 + i * 4]];
      if (!a || !b2 || !c) return;
      const v1 = [b2[0] - a[0], b2[1] - a[1]], v2 = [c[0] - b2[0], c[1] - b2[1]];
      const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2) || 1);
      curl[f] = THREE.MathUtils.clamp(Math.acos(THREE.MathUtils.clamp(cos, -1, 1)) / (f === 'Thumb' ? 1.4 : 2.2), 0, 1);
    });
    rig.setCurl(side, curl);
  }
  return d;
}

// Pair detected people with characters left-to-right on screen.
export function screenOrder(points2d) {
  return points2d.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
}
