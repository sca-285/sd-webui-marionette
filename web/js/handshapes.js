// Hand shapes: every finger joint, the spread of the fingers and the thumb's
// opposition, plus a grip solver that wraps the fingers round a handle.
//
// A shape gives, per finger, [base, middle, tip, spread] in degrees: curl
// towards the palm for the three joints, spread away from the middle finger.
// The thumb has a fifth value, opposition: how far it swings in front of the
// palm (0 = flat beside the index, ~60 = facing the fingers).
import * as THREE from 'three';
import { FINGER_NAMES } from './rig.js';

const D = THREE.MathUtils.degToRad;
const wpos = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const _q = new THREE.Quaternion(), _qs = new THREE.Quaternion(), _qo = new THREE.Quaternion();

// Rest-space geometry of a hand: spread / opposition directions, cached per rig.
function handInfo(rig, side) {
  rig._handInfo ??= {};
  if (rig._handInfo[side]) return rig._handInfo[side];
  const hand = rig.map[side + 'Hand'];
  const F = rig.fingers?.[side];
  if (!hand || !F) return null;
  const n = rig.palmN[side];
  const inv = rig.delta(side + 'Hand').invert();
  const hp = wpos(hand);
  const rest = (o) => wpos(o).sub(hp).applyQuaternion(inv);
  const midBase = F.Middle?.[0] ? rest(F.Middle[0]) : null;
  const midAxis = rig.curlAxes[side].Middle || rig.curlAxes[side].Index;
  const long = midAxis ? n.clone().cross(midAxis).normalize() : new THREE.Vector3(1, 0, 0);
  const info = { n, long, spread: {}, opp: 1 };
  for (const f of FINGER_NAMES) {
    const axis = rig.curlAxes[side][f];
    if (!axis || !F[f]) continue;
    const d = n.clone().cross(axis);
    const off = midBase ? rest(F[f][0]).sub(midBase) : new THREE.Vector3();
    info.spread[f] = n.clone().cross(d).dot(off) >= 0 ? 1 : -1;
    if (f === 'Thumb') info.opp = long.clone().cross(d).dot(n) >= 0 ? 1 : -1;
  }
  rig._handInfo[side] = info;
  return info;
}

// Pose one finger: curls (deg, cumulative along the chain), spread, opposition.
export function poseFinger(rig, side, f, curls, spread = 0, opp = 0) {
  const ch = rig.fingers?.[side]?.[f];
  const axis = rig.curlAxes[side]?.[f];
  const info = handInfo(rig, side);
  if (!ch || !axis || !info) return;
  const handDelta = rig.delta(side + 'Hand');
  _qs.setFromAxisAngle(info.n, D(spread) * (info.spread[f] || 1));
  _qo.setFromAxisAngle(info.long, f === 'Thumb' ? D(opp) * info.opp : 0);
  let acc = 0;
  ch.forEach((b, i) => {
    acc += D(curls[i] || 0);
    const q = handDelta.clone().multiply(_qo).multiply(_qs).multiply(_q.setFromAxisAngle(axis, acc)).multiply(rig.rest[`${side}${f}${i}`].wq);
    rig.setWorldQuat(b, q);
  });
}

export function setHandShape(rig, side, shape) {
  if (!shape || !rig.map[side + 'Hand']) return;
  for (const f of FINGER_NAMES) {
    const v = shape[f[0]] || shape[f];
    if (v) poseFinger(rig, side, f, v.slice(0, 3), v[3] || 0, v[4] || 0);
  }
}

// Shape from the older 0..1 curl values (HAND_PRESETS, HOLD_CURLS).
export function shapeFromCurl(c) {
  const max = [75, 95, 70], tmax = [25, 40, 55];
  const s = {};
  for (const f of FINGER_NAMES) {
    const v = c[f] ?? 0;
    s[f[0]] = (f === 'Thumb' ? tmax : max).map((m) => m * v);
    if (f === 'Thumb') s.T.push(0, 30 * v);
  }
  return s;
}

// Wrap the fingers round a handle: a line through `point` along `dir` (world)
// of radius r. Each joint bends until the next joint (or the tip) touches the
// handle, the way a hand closes on a stick. opts.skip: fingers left alone,
// opts.thumbOpp: thumb opposition, opts.pad: finger thickness.
export function wrapFingers(rig, side, point, dir, r = 0.016, opts = {}) {
  const F = rig.fingers?.[side];
  if (!F) return;
  const pad = opts.pad ?? 0.009 * (rig.height || 1.7) / 1.7;
  const d = dir.clone().normalize();
  const dist = (p) => { const v = p.clone().sub(point); return v.addScaledVector(d, -v.dot(d)).length(); };
  const fingers = FINGER_NAMES.filter((f) => F[f] && !(opts.skip || []).includes(f));
  for (const f of fingers) {
    const ch = F[f];
    const thumb = f === 'Thumb';
    const max = thumb ? [40, 60, 70] : [95, 110, 80];
    const spread = opts.spread?.[f] ?? (f === 'Little' ? -4 : 0);
    const opp = thumb ? (opts.thumbOpp ?? 55) : 0;
    const curls = [0, 0, 0];
    for (let i = 0; i < ch.length && i < 3; i++) {
      const next = ch[i + 1] || rig.tips[side][f];
      if (!next) break;
      let best = 0, bestErr = Infinity;
      for (let a = 0; a <= max[i]; a += 3) {
        curls[i] = a;
        poseFinger(rig, side, f, curls, spread, opp);
        const err = dist(wpos(next)) - (r + pad);
        if (err <= 0) { best = a; bestErr = 0; break; }
        if (err < bestErr) { bestErr = err; best = a; }
      }
      curls[i] = best;
      poseFinger(rig, side, f, curls, spread, opp);
    }
  }
}

// Named shapes for the hand pose library. [base, middle, tip, spread(, opposition)]
const S = (T, I, M, R, L) => ({ T, I, M, R, L });
const fist = [85, 100, 70, 0];
const curled = [90, 105, 75, 0];
const straight = [0, 0, 0, 0];
export const HAND_SHAPES = {
  // relaxed and open
  Relaxed: S([5, 10, 10, 0, 20], [12, 18, 10, 2], [16, 22, 12, 0], [20, 26, 14, 2], [24, 30, 16, 5]),
  'Relaxed (soft)': S([10, 15, 15, 0, 30], [22, 30, 18, 0], [26, 34, 20, 0], [30, 38, 22, 0], [34, 42, 24, 2]),
  'Open flat': S([0, 0, 0, 0, 0], straight, straight, straight, straight),
  'Open spread': S([0, 0, 0, 20, 0], [0, 0, 0, 12], straight, [0, 0, 0, 10], [0, 0, 0, 22]),
  'Open fingers together': S([0, 5, 5, -5, 10], [0, 0, 0, -3], straight, [0, 0, 0, -3], [0, 0, 0, -6]),
  'Limp': S([10, 20, 20, 0, 25], [30, 35, 20, 0], [35, 40, 22, 0], [40, 45, 24, 0], [45, 50, 26, 0]),
  'Tense spread': S([10, 0, 0, 25, 20], [-10, 15, 10, 15], [-10, 15, 10, 0], [-10, 15, 10, 12], [-10, 15, 10, 25]),
  Cupped: S([10, 15, 15, -5, 35], [25, 25, 15, -2], [25, 25, 15, 0], [25, 25, 15, -2], [25, 25, 15, -5]),
  'Karate chop': S([10, 20, 15, -8, 25], [0, 0, 0, -4], straight, [0, 0, 0, -4], [0, 0, 0, -8]),
  // fists and grips
  Fist: S([20, 40, 50, 0, 60], fist, fist, fist, fist),
  'Fist (thumb up)': S([0, 0, 0, 10, 10], fist, fist, fist, fist),
  'Loose fist': S([10, 25, 30, 0, 45], [60, 70, 45, 0], [62, 72, 46, 0], [65, 74, 48, 0], [68, 76, 50, 0]),
  'Grab (C-shape)': S([10, 15, 15, 5, 55], [35, 40, 25, 3], [38, 42, 26, 0], [40, 44, 27, 3], [42, 46, 28, 6]),
  'Hold a glass': S([10, 15, 20, 5, 60], [45, 35, 20, 2], [48, 38, 22, 0], [52, 40, 24, 2], [58, 44, 26, 4]),
  'Pen grip': S([20, 25, 20, 0, 55], [40, 35, 15, 0], [45, 40, 20, 0], [75, 90, 60, 0], [80, 95, 60, 0]),
  'Claw': S([10, 30, 30, 15, 40], [20, 60, 50, 10], [20, 60, 50, 0], [20, 60, 50, 8], [20, 60, 50, 15]),
  'Tiger claw': S([5, 30, 40, 15, 40], [-5, 75, 65, 10], [-5, 75, 65, 0], [-5, 75, 65, 8], [-5, 75, 65, 15]),
  // pointing and gestures
  Point: S([20, 40, 50, 0, 50], straight, curled, curled, curled),
  'Point (thumb up)': S([0, 0, 0, 15, 5], straight, curled, curled, curled),
  'Finger gun': S([0, 0, 0, 20, 0], straight, straight, curled, curled),
  Peace: S([25, 40, 50, 0, 55], [0, 0, 0, 12], [0, 0, 0, -10], curled, curled),
  'Peace (closed)': S([25, 40, 50, 0, 55], [0, 0, 0, -3], [0, 0, 0, 0], curled, curled),
  OK: S([15, 25, 20, 0, 55], [45, 55, 35, 0], [0, 5, 5, 0], [0, 8, 8, 6], [0, 10, 10, 14]),
  'Thumbs up': S([0, 0, 0, 10, 0], fist, fist, fist, fist),
  'Rock (horns)': S([25, 40, 50, 0, 55], [0, 0, 0, 10], curled, curled, [0, 0, 0, 15]),
  'Call me (shaka)': S([0, 0, 0, 25, 0], curled, curled, curled, [0, 0, 0, 20]),
  'I love you': S([0, 0, 0, 25, 0], [0, 0, 0, 8], curled, curled, [0, 0, 0, 18]),
  'Middle finger': S([25, 40, 50, 0, 55], curled, straight, curled, curled),
  'Crossed fingers (approx.)': S([25, 40, 50, 0, 55], [0, 0, 0, -12], [10, 0, 0, 12], curled, curled),
  'Pinky promise': S([25, 40, 50, 0, 55], curled, curled, curled, [0, 0, 0, 10]),
  'Vulcan salute': S([0, 0, 0, 25, 0], [0, 0, 0, -6], [0, 0, 0, -10], [0, 0, 0, 14], [0, 0, 0, 6]),
  Beckon: S([10, 15, 15, 0, 35], [10, 70, 60, 0], curled, curled, curled),
  'Pinch (tips)': S([15, 20, 25, 0, 60], [40, 40, 25, 0], [15, 15, 10, 0], [10, 12, 8, 4], [8, 10, 6, 10]),
  'Pinch (pads)': S([15, 15, 15, 0, 55], [50, 25, 10, 0], [40, 40, 25, 0], [55, 60, 40, 0], [60, 65, 45, 0]),
  'Snap (ready)': S([15, 15, 10, 0, 60], [40, 40, 30, 0], [35, 25, 10, 0], [80, 95, 60, 0], [85, 95, 60, 0]),
  'Finger heart': S([15, 10, 5, 0, 55], [50, 35, 20, 0], curled, curled, curled),
  'Half heart': S([10, 20, 20, 5, 40], [30, 60, 45, 0], [30, 60, 45, 0], [30, 60, 45, 0], [30, 60, 45, 0]),
  // counting
  'One': S([25, 40, 50, 0, 55], straight, curled, curled, curled),
  'Two': S([25, 40, 50, 0, 55], [0, 0, 0, 8], [0, 0, 0, -4], curled, curled),
  'Three': S([25, 40, 50, 0, 55], [0, 0, 0, 8], straight, [0, 0, 0, 6], curled),
  'Four': S([25, 40, 50, -5, 55], [0, 0, 0, 6], straight, [0, 0, 0, 5], [0, 0, 0, 10]),
  'Five': S([0, 0, 0, 20, 0], [0, 0, 0, 10], straight, [0, 0, 0, 8], [0, 0, 0, 16]),
  // expressive
  'Sensual (soft curl)': S([5, 10, 15, 0, 30], [10, 20, 15, 3], [20, 30, 20, 0], [28, 36, 24, 2], [10, 15, 10, 14]),
  'Elegant (ballet)': S([10, 10, 10, 0, 45], [5, 10, 5, 4], [25, 20, 10, 0], [15, 15, 8, 3], [0, 5, 5, 10]),
  'Fingertip to lips': S([15, 25, 25, 0, 45], [10, 10, 5, 0], [40, 50, 30, 0], [55, 65, 40, 0], [60, 70, 45, 0]),
  'Grasping (gripping fabric)': S([20, 35, 35, 0, 55], [60, 75, 55, 0], [62, 78, 56, 0], [65, 80, 58, 0], [68, 82, 60, 0]),
  // adult (18+ poses)
  'Fingering (two fingers)': S([20, 30, 30, 0, 45], [8, 18, 12, -3], [8, 18, 12, 0], [75, 95, 65, 0], [80, 95, 65, 0]),
  'Fingering (one finger)': S([20, 30, 30, 0, 45], [8, 15, 10, 0], [75, 95, 65, 0], [80, 95, 65, 0], [82, 95, 65, 0]),
  'Come hither (hooked)': S([15, 25, 25, 0, 40], [15, 75, 55, -3], [15, 75, 55, 0], [80, 95, 65, 0], [82, 95, 65, 0]),
  'Rubbing (flat fingers)': S([10, 15, 15, -4, 30], [20, 15, 8, -4], [20, 15, 8, 0], [25, 18, 10, -3], [28, 20, 12, -6]),
  'Spreading (fingers splayed, pressing)': S([5, 10, 10, 18, 15], [15, 10, 5, 12], [15, 10, 5, 0], [18, 12, 6, 10], [20, 14, 8, 18]),
  'Stroking grip': S([15, 25, 30, 0, 55], [50, 65, 45, 0], [55, 68, 46, 0], [60, 72, 48, 0], [65, 75, 50, 0]),
  'Cupping breast': S([10, 15, 15, 10, 40], [30, 25, 15, 6], [32, 26, 15, 0], [34, 27, 16, 5], [36, 28, 16, 10]),
};
