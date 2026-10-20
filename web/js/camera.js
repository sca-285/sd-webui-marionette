// Shot composer (shot size x angle x direction x lens x dutch), lens maths,
// crop, saved views and prompt tags describing the current shot.
import * as THREE from 'three';

const RAD = Math.PI / 180;

export const SHOT_SIZES = ['Extreme close-up', 'Close-up', 'Portrait', 'Medium shot', 'Cowboy shot', 'Full body', 'Wide'];
export const ANGLES = { 'Eye level': 0, 'High angle': 30, 'Low angle': -25, "Bird's eye": 70, "Worm's eye": -60, Overhead: 88 };
export const DIRECTIONS = {
  Front: 0, 'Three-quarter left': 40, 'Side left': 90, 'Back three-quarter left': 140,
  Back: 180, 'Back three-quarter right': -140, 'Side right': -90, 'Three-quarter right': -40,
};
export const LENSES = [14, 18, 24, 35, 50, 85, 135, 200];
export const PLACEMENTS = { Centered: 0, 'Left third': -0.333, 'Right third': 0.333 };
export const DEFAULT_SHOT = { size: 'Full body', angle: 'Eye level', dir: 'Front', lens: 50, dutch: 0, place: 'Centered' };

// Full-frame equivalent: the 43.27 mm diagonal maps to the output's diagonal,
// so a "50mm" looks like 50mm whether the image is portrait or landscape.
export function fovForLens(mm, aspect) {
  const td = 43.27 / (2 * mm);
  return (2 * Math.atan(td / Math.sqrt(1 + aspect * aspect))) / RAD;
}
export function lensForFov(fov, aspect) {
  const td = Math.tan((fov * RAD) / 2) * Math.sqrt(1 + aspect * aspect);
  return 43.27 / (2 * td);
}

const wpos = (o) => o.getWorldPosition(new THREE.Vector3());
const mid = (a, b, t = 0.5) => (a && b ? a.clone().lerp(b, t) : a || b || null);

// Points that must span the frame vertically (y), plus points that must stay
// inside it horizontally (x). top/bottom are the NDC rows the y-extent maps to:
// bottom = -1 cuts the frame exactly at the lowest y point (portrait, cowboy...).
function shotPoints(rig, size) {
  const kp = rig.keypoints();
  const b = kp.body;
  const top = wpos(rig.markers.headTop);
  const neck = b[1];
  const hips = mid(b[8], b[11]);
  const knees = mid(b[9], b[12]);
  const eyes = mid(b[14], b[15]);
  const chin = mid(b[0], neck, 0.55);
  const feet = [b[10], b[13], ...['leftToes', 'rightToes'].map((k) => rig.map[k]).filter(Boolean).map(wpos)];
  const hands = Object.values(kp.hands).flat().filter(Boolean);
  const extra = (kp.extra || []).flatMap((a) => a.pts);
  const all = [top, ...b, ...feet, ...hands, ...extra].filter(Boolean);
  const S = {
    'Extreme close-up': {
      y: [eyes.clone().lerp(b[0], -1.1), b[0].clone().lerp(eyes, -1.2)], x: [], top: 0.55, bottom: -0.55,
    },
    'Close-up': { y: [top, chin.clone().lerp(neck, 0.15)], x: [b[16], b[17]], top: 0.9, bottom: -0.86 },
    Portrait: { y: [top, mid(neck, hips, 0.38)], x: [b[2], b[5], b[16], b[17]], top: 0.86, bottom: -1 },
    'Medium shot': { y: [top, mid(neck, hips, 0.85)], x: [b[2], b[5], b[3], b[6]], top: 0.88, bottom: -1 },
    'Cowboy shot': { y: [top, mid(hips, knees, 0.55)], x: [b[2], b[5], b[3], b[6], b[4], b[7], b[8], b[11]], top: 0.9, bottom: -1 },
    'Full body': { y: all, x: all, top: 0.9, bottom: -0.92 },
    Wide: { y: all, x: all, top: 0.5, bottom: -0.55 },
  }[size];
  if (!S) return null;
  S.y = S.y.filter(Boolean);
  S.x = [...S.y, ...S.x.filter(Boolean)];
  return S;
}

export function shotDirection(rig, angleDeg, dirDeg) {
  const { fwd, left } = rig.frame();
  const az = dirDeg * RAD, el = angleDeg * RAD;
  const d = fwd.clone().multiplyScalar(Math.cos(az)).add(left.clone().multiplyScalar(Math.sin(az)));
  return d.multiplyScalar(Math.cos(el)).add(new THREE.Vector3(0, Math.sin(el), 0)).normalize();
}

/**
 * Place the camera so the chosen shot fills the frame, looking along -dir.
 *
 * With the orientation fixed, "point p sits on the top edge of the frame" is a
 * plane equation that is linear in the camera position C. Writing C = uR + vU + wF
 * in the camera basis, the top and bottom edges give w and v exactly; the left and
 * right edges give another w. The smaller w (further back) is the binding one,
 * and the free axis is centred by bisection. Exact for any lens or angle, and
 * every point is guaranteed to end up in front of the camera.
 * opts: { size, dir: Vector3 (target -> camera), roll (deg), cx (NDC x of the subject) }
 */
// rig may be one rig or several (frame every character).
export function fitShot(camera, controls, rig, opts) {
  const list = (Array.isArray(rig) ? rig : [rig]).map((r) => shotPoints(r, opts.size)).filter(Boolean);
  const S = list.length ? { ...list[0], y: list.flatMap((s) => s.y), x: list.flatMap((s) => s.x) } : null;
  if (!S || !S.y.length) return false;
  camera.clearViewOffset();
  camera.up.set(0, 1, 0);
  camera.position.set(0, 0, 0);
  camera.lookAt(opts.dir.clone().normalize().negate());
  if (opts.roll) camera.rotateZ(opts.roll * RAD);
  camera.updateMatrixWorld(true);
  const R = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const U = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const F = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2).negate();
  const tV = Math.tan((camera.fov * RAD) / 2), tH = tV * camera.aspect;
  const cx = opts.cx || 0, m = 0.93;
  const plane = (axis, t) => axis.clone().addScaledVector(F, -t);
  const maxDot = (pts, n) => Math.max(...pts.map((p) => p.dot(n)));
  const minDot = (pts, n) => Math.min(...pts.map((p) => p.dot(n)));

  const tT = S.top * tV, tB = S.bottom * tV;
  const aV = maxDot(S.y, plane(U, tT)), bV = minDot(S.y, plane(U, tB));
  const wV = (aV - bV) / (tB - tT);
  const xr = (cx + m) * tH, xl = (cx - m) * tH;
  const aH = maxDot(S.x, plane(R, xr)), bH = minDot(S.x, plane(R, xl));
  const wH = (aH - bH) / (xl - xr);

  // Centre the non-binding axis: find c so that (max+min)/2 of the NDC coords hits goal.
  const centre = (pts, axis, t, w, goal) => {
    let lo = -1e3, hi = 1e3;
    for (let i = 0; i < 80; i++) {
      const c = (lo + hi) / 2;
      const nd = pts.map((p) => (p.dot(axis) - c) / ((p.dot(F) - w) * t));
      ((Math.max(...nd) + Math.min(...nd)) / 2 > goal ? (lo = c) : (hi = c));
    }
    return (lo + hi) / 2;
  };
  let u, v, w;
  if (wV <= wH) {
    w = wV;
    v = aV + tT * w;
    u = centre(S.x, R, tH, w, cx);
  } else {
    w = wH;
    u = aH + xr * w;
    v = centre(S.y, U, tV, w, (S.top + S.bottom) / 2);
  }
  const C = R.clone().multiplyScalar(u).addScaledVector(U, v).addScaledVector(F, w);
  const centroid = S.y.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(S.y.length);
  camera.position.copy(C);
  controls.target.copy(C).addScaledVector(F, Math.max(0.1, centroid.dot(F) - w));
  controls.update();
  return true;
}

// Crop is stored normalised (fractions of the full frame), so it survives
// output size changes; three only uses the ratios of setViewOffset.
export function getCrop(camera) {
  const v = camera.view;
  return v && v.enabled ? { x: v.offsetX, y: v.offsetY, w: v.width, h: v.height } : null;
}
export function setCrop(camera, c) {
  if (!c || c.w >= 0.999) camera.clearViewOffset();
  else camera.setViewOffset(1, 1, c.x, c.y, c.w, c.h);
}

export function serializeCamera(camera, controls, roll) {
  const r = (v) => v.toArray().map((x) => +x.toFixed(4));
  return { p: r(camera.position), t: r(controls.target), fov: camera.fov, roll, crop: getCrop(camera) };
}

export function restoreCamera(s, camera, controls) {
  if (!s) return 0;
  camera.position.fromArray(s.p);
  controls.target.fromArray(s.t);
  camera.fov = s.fov || camera.fov;
  setCrop(camera, s.crop);
  camera.updateProjectionMatrix();
  controls.update();
  return s.roll || 0;
}

// style: 'danbooru' | 'natural'
export function cameraTags(rig, camera, target, roll, kp2, W, H, style = 'danbooru') {
  if (!rig) return '';
  const { fwd, left } = rig.frame();
  const viewDir = new THREE.Vector3();
  camera.getWorldDirection(viewDir);
  const toCam = viewDir.negate();
  const el = Math.asin(THREE.MathUtils.clamp(toCam.y, -1, 1)) / RAD;
  const flat = toCam.clone().setY(0);
  const az = flat.lengthSq() < 1e-6 ? 0 : Math.abs(Math.atan2(flat.normalize().dot(left), flat.dot(fwd)) / RAD);

  const inFrame = (p) => p && p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H;
  const b = kp2.body;
  const any = (...ids) => ids.some((i) => inFrame(b[i]));
  const m2 = (p, q) => (p && q ? [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] : p || q);
  // Share of a body segment that lies inside the frame.
  const frac = (p, q) => {
    if (!p || !q) return 0;
    let n = 0;
    for (let i = 0; i <= 20; i++) if (inFrame([p[0] + ((q[0] - p[0]) * i) / 20, p[1] + ((q[1] - p[1]) * i) / 20])) n++;
    return n / 21;
  };
  const hips = m2(b[8], b[11]), knees = m2(b[9], b[12]);
  let framing;
  if (any(10, 13)) framing = 'full';
  else if (frac(hips, knees) > 0.35) framing = 'cowboy';
  else if (frac(b[1], hips) > 0.7) framing = 'upper';
  else if (frac(b[1], hips) > 0.12 || any(2, 5)) framing = 'portrait';
  else if (any(0, 14, 15)) framing = 'closeup';
  else framing = 'detail';

  const tags = [];
  if (style === 'natural') {
    tags.push({ full: 'full-body shot', cowboy: 'medium-long shot', upper: 'medium shot', portrait: 'medium close-up', closeup: 'close-up shot', detail: 'extreme close-up' }[framing]);
    if (el > 55) tags.push("bird's-eye view");
    else if (el > 18) tags.push('high-angle shot');
    else if (el < -50) tags.push("worm's-eye view");
    else if (el < -15) tags.push('low-angle shot');
    else tags.push('eye-level shot');
    if (az < 22) tags.push('front view');
    else if (az < 65) tags.push('three-quarter view');
    else if (az < 115) tags.push('side view, profile');
    else if (az < 155) tags.push('three-quarter back view');
    else tags.push('back view');
    if (Math.abs(roll) > 8) tags.push('dutch angle');
    if (camera.fov > 65) tags.push('wide-angle lens');
    else if (camera.fov < 22) tags.push('telephoto lens');
  } else {
    tags.push({ full: 'full body', cowboy: 'cowboy shot', upper: 'upper body', portrait: 'portrait', closeup: 'close-up', detail: 'close-up' }[framing]);
    if (el > 18) tags.push('from above');
    else if (el < -15) tags.push('from below');
    if (az >= 65 && az < 115) tags.push('from side', 'profile');
    else if (az >= 115) tags.push('from behind');
    else if (az >= 22) tags.push('three-quarter view');
    else if (Math.abs(el) <= 18) tags.push('straight-on');
    if (Math.abs(roll) > 8) tags.push('dutch angle');
    if (camera.fov > 70) tags.push('fisheye');
  }
  return tags.join(', ');
}

const VIEWS_KEY = 'riggedPose.views.v1';
export function loadViews() {
  try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]'); } catch { return []; }
}
export function saveViews(list) {
  try { localStorage.setItem(VIEWS_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}
