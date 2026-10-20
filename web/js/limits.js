// Anatomical joint limits.
//
// Each joint's rotation is taken relative to its parent (in the parent's rest
// frame, which after normalisation is character space: +X left, +Y up, +Z
// forward) and split into a swing (where the bone points) and a twist (roll
// about the bone itself). The swing is clamped either to a hinge plane (elbow,
// knee, finger joints) or to a cone whose reach varies with direction
// (shoulder, hip, spine, wrist, ankle...); the twist to a range. Limits are
// written for the left side; the right side is mirrored.
import * as THREE from 'three';

const D = THREE.MathUtils.degToRad;

// Cone reach (degrees) at 8 azimuths, 0 = towards F, 90 = towards S.
// ring(F, S, -F, -S) fills the diagonals with an elliptical blend.
function ring(f, s, b, m) {
  const e = (a, c) => 1 / Math.hypot(Math.SQRT1_2 / a, Math.SQRT1_2 / c);
  return [f, e(f, s), s, e(s, b), b, e(b, m), m, e(m, f)];
}

// N: neutral axis, F: azimuth 0 / flexion side, S: azimuth 90.
// Vectors: rest (bone's own rest direction), down, up, fwd, back, lat (outwards),
// palm (towards the palm), thumb (radial side of the hand).
// hinge: flex towards F, ext away from it, side = sideways play.
const LIMITS = {
  spine: { type: 'cone', N: 'rest', F: 'fwd', S: 'lat', trunk: true, cone: [80, 35, 30, 35], twist: [-45, 45] },
  neck: { type: 'cone', N: 'rest', F: 'fwd', S: 'lat', cone: ring(45, 35, 50, 35), twist: [-50, 50] },
  head: { type: 'cone', N: 'rest', F: 'fwd', S: 'lat', cone: ring(35, 25, 30, 25), twist: [-35, 35] },
  Shoulder: { type: 'cone', N: 'rest', F: 'up', S: 'fwd', cone: ring(35, 25, 10, 25), twist: [-15, 15] },
  // Plane of elevation around the hanging arm: forward, scaption, abduction,
  // behind, extension, behind the back, against the body, across the chest.
  UpperArm: { type: 'cone', N: 'down', F: 'fwd', S: 'lat', cone: [170, 170, 170, 100, 60, 40, 30, 135], twist: [-100, 100] },
  LowerArm: { type: 'hinge', N: 'rest', F: 'fwd', flex: 150, ext: 5, side: 8, twist: [-85, 85] },
  Hand: { type: 'cone', N: 'rest', F: 'palm', S: 'thumb', cone: ring(75, 20, 65, 35), twist: [-20, 20] },
  UpperLeg: { type: 'cone', N: 'down', F: 'fwd', S: 'lat', cone: [125, 110, 50, 35, 25, 20, 25, 95], twist: [-60, 60] },
  LowerLeg: { type: 'hinge', N: 'rest', F: 'back', flex: 155, ext: 2, side: 4, twist: [-25, 25] },
  Foot: { type: 'cone', N: 'rest', F: 'up', S: 'lat', cone: ring(25, 20, 50, 25), twist: [-25, 25] },
  Toes: { type: 'hinge', N: 'rest', F: 'up', flex: 70, ext: 40, side: 5, twist: [-5, 5] },
  Finger0: { type: 'cone', N: 'rest', F: 'palm', S: 'thumb', cone: ring(90, 20, 25, 20), twist: [-8, 8] },
  Finger1: { type: 'hinge', N: 'rest', F: 'palm', flex: 105, ext: 5, side: 3, twist: [-5, 5] },
  Finger2: { type: 'hinge', N: 'rest', F: 'palm', flex: 85, ext: 10, side: 3, twist: [-5, 5] },
  Thumb0: { type: 'cone', N: 'rest', F: 'palm', S: 'thumb', cone: ring(50, 45, 40, 45), twist: [-40, 40] },
  Thumb1: { type: 'hinge', N: 'rest', F: 'palm', flex: 60, ext: 10, side: 10, twist: [-10, 10] },
  Thumb2: { type: 'hinge', N: 'rest', F: 'palm', flex: 85, ext: 20, side: 5, twist: [-5, 5] },
};

function limitKind(key) {
  if (/^spine\d+$/.test(key)) return 'spine';
  if (key === 'neck' || key === 'head') return key;
  const m = key.match(/^(?:left|right)(.+)$/);
  if (!m) return null;
  const part = m[1];
  const f = part.match(/^(Thumb|Index|Middle|Ring|Little)(\d)$/);
  if (f) return (f[1] === 'Thumb' ? 'Thumb' : 'Finger') + Math.min(+f[2], 2);
  const base = part.replace(/\d$/, ''); // extra arms share the main arm's limits
  return base in LIMITS ? base : null;
}

const _q = new THREE.Quaternion();
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _d = new THREE.Vector3();

function orth(v, n) {
  const o = v.clone().addScaledVector(n, -v.dot(n));
  return o.lengthSq() > 1e-8 ? o.normalize() : null;
}

// Build per-joint limit frames from the rig's rest pose (call while at rest).
export function buildLimits(rig, { child, palm, thumb, parentKey }) {
  const out = {};
  const spines = rig.order.filter((k) => /^spine\d+$/.test(k)).length || 1;
  for (const key of rig.order) {
    const kind = limitKind(key);
    const parent = parentKey(key);
    if (!kind || !parent) continue;
    const spec = LIMITS[kind];
    const c = child(key);
    if (!c) continue;
    const side = rig.sideOf(key);
    const sx = side === 'right' ? -1 : 1;
    const b = rig.map[key];
    const p0 = b.getWorldPosition(new THREE.Vector3());
    const d0 = c.getWorldPosition(new THREE.Vector3()).sub(p0);
    if (d0.lengthSq() < 1e-10) continue;
    d0.normalize();
    const vec = (name) => {
      switch (name) {
        case 'rest': return d0.clone();
        case 'down': return new THREE.Vector3(0, -1, 0);
        case 'up': return new THREE.Vector3(0, 1, 0);
        case 'fwd': return new THREE.Vector3(0, 0, 1);
        case 'back': return new THREE.Vector3(0, 0, -1);
        case 'lat': return new THREE.Vector3(sx, 0, 0);
        case 'palm': return palm(side)?.clone() || new THREE.Vector3(0, -1, 0);
        case 'thumb': return thumb(side)?.clone() || new THREE.Vector3(0, 0, 1);
        default: return null;
      }
    };
    const N = vec(spec.N).normalize();
    let F = orth(vec(spec.F), N);
    if (!F) F = orth(new THREE.Vector3(0, 0, 1), N) || orth(new THREE.Vector3(0, 1, 0), N);
    let S = spec.S ? orth(vec(spec.S), N) : null;
    S = S ? orth(S, F) : null;
    if (!S) S = N.clone().cross(F).normalize();
    let cone = spec.cone;
    if (spec.trunk) {
      // Trunk totals are shared out between however many spine joints the rig has.
      const k = Math.min(1, 1.4 / spines);
      cone = ring(...cone.map((v) => v * k));
    }
    const tw = spec.trunk ? spec.twist.map((v) => v * Math.min(1, 1.4 / spines)) : spec.twist;
    out[key] = {
      parent, type: spec.type, d0, N, F, S,
      cone: cone && cone.map(D),
      flex: D(spec.flex ?? 0), ext: D(spec.ext ?? 0), side: D(spec.side ?? 0),
      twist: side === 'right' ? [-D(tw[1]), -D(tw[0])] : [D(tw[0]), D(tw[1])],
    };
  }
  return out;
}

const TOL = D(0.25);

function coneReach(cone, phi) {
  const t = ((phi / (Math.PI / 4)) % 8 + 8) % 8;
  const i = Math.floor(t), f = t - i;
  return cone[i] * (1 - f) + cone[(i + 1) % 8] * f;
}

// Returns the clamped direction, or null when d is already inside the limits.
function clampSwing(d, L) {
  const n = d.dot(L.N), f = d.dot(L.F), s = d.dot(L.S);
  if (L.type === 'hinge') {
    const side = Math.asin(THREE.MathUtils.clamp(s, -1, 1));
    let a = Math.atan2(f, n);
    const okA = a <= L.flex + TOL && a >= -L.ext - TOL;
    const okS = Math.abs(side) <= L.side + TOL;
    if (okA && okS) return null;
    if (!okA) {
      // Snap to the nearer end of the range (going round the back if needed).
      const dist = (x) => Math.abs(Math.atan2(Math.sin(a - x), Math.cos(a - x)));
      a = dist(L.flex) < dist(-L.ext) ? L.flex : -L.ext;
    }
    const sd = THREE.MathUtils.clamp(side, -L.side, L.side);
    return L.N.clone().multiplyScalar(Math.cos(a)).addScaledVector(L.F, Math.sin(a))
      .multiplyScalar(Math.cos(sd)).addScaledVector(L.S, Math.sin(sd)).normalize();
  }
  const theta = Math.acos(THREE.MathUtils.clamp(n, -1, 1));
  if (theta < 1e-4) return null;
  const phi = Math.atan2(s, f);
  const max = coneReach(L.cone, phi);
  if (theta <= max + TOL) return null;
  return L.N.clone().multiplyScalar(Math.cos(max))
    .addScaledVector(L.F, Math.sin(max) * Math.cos(phi))
    .addScaledVector(L.S, Math.sin(max) * Math.sin(phi)).normalize();
}

// Clamp one joint in place. Returns true when the bone was moved.
export function clampJoint(rig, key) {
  const L = rig.jointLimits?.[key];
  if (!L) return false;
  rig.root.updateMatrixWorld(true);
  const R = rig.delta(L.parent).invert().multiply(rig.delta(key));
  let changed = false;
  _d.copy(L.d0).applyQuaternion(R);
  const d2 = clampSwing(_d, L);
  if (d2) {
    R.premultiply(_q.setFromUnitVectors(_d, d2));
    changed = true;
  }
  // Twist about the rest axis: R = swing * twist.
  const p = R.x * L.d0.x + R.y * L.d0.y + R.z * L.d0.z;
  _qa.set(L.d0.x * p, L.d0.y * p, L.d0.z * p, R.w);
  if (_qa.lengthSq() > 1e-12) {
    _qa.normalize();
    let ang = 2 * Math.atan2(_qa.x * L.d0.x + _qa.y * L.d0.y + _qa.z * L.d0.z, _qa.w);
    ang = Math.atan2(Math.sin(ang), Math.cos(ang));
    const [lo, hi] = L.twist;
    if (ang < lo - TOL || ang > hi + TOL) {
      const swing = R.clone().multiply(_qa.invert());
      R.copy(swing.multiply(_qb.setFromAxisAngle(L.d0, THREE.MathUtils.clamp(ang, lo, hi))));
      changed = true;
    }
  }
  if (!changed) return false;
  const q = rig.delta(L.parent).multiply(R).multiply(rig.rest[key].wq);
  rig.setWorldQuat(rig.map[key], q.normalize());
  return true;
}

// Roll of rotation q about axis (radians, -PI..PI), from its swing-twist split.
export function twistAngle(q, axis) {
  const p = q.x * axis.x + q.y * axis.y + q.z * axis.z;
  const a = 2 * Math.atan2(p, q.w);
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// Is the joint within its limits? (for tests / UI)
export function jointWithin(rig, key) {
  const L = rig.jointLimits?.[key];
  if (!L) return true;
  rig.root.updateMatrixWorld(true);
  const R = rig.delta(L.parent).invert().multiply(rig.delta(key));
  if (clampSwing(_d.copy(L.d0).applyQuaternion(R), L)) return false;
  const p = R.x * L.d0.x + R.y * L.d0.y + R.z * L.d0.z;
  const ang = Math.atan2(Math.sin(2 * Math.atan2(p, R.w)), Math.cos(2 * Math.atan2(p, R.w)));
  return ang >= L.twist[0] - 2 * TOL && ang <= L.twist[1] + 2 * TOL;
}
