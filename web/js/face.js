// OpenPose 70-point face (68 dlib landmarks + 2 pupils) as a 3D template in
// centimetres for a 1.72 m adult, relative to the head bone: +X the character's
// left, +Y up, +Z forward. Point 0 is the character's right jaw, as OpenPose
// orders it (image-left on a front view).
import * as THREE from 'three';

const T = [];
// 0-16 jaw line, right ear -> chin -> left ear
for (let i = 0; i <= 16; i++) {
  const p = THREE.MathUtils.degToRad(-90 + (i * 180) / 16);
  T.push([7.0 * Math.sin(p), -0.3 + 8.5 * (1 - Math.cos(p)), 1.5 + 6.9 * Math.cos(p)]);
}
// 17-21 right brow (outer -> inner), 22-26 left brow (inner -> outer)
const brow = [[-6.2, 11.6, 7.6], [-5.2, 12.2, 8.5], [-4.0, 12.5, 9.0], [-2.8, 12.4, 9.3], [-1.6, 12.1, 9.4]];
T.push(...brow);
T.push(...brow.slice().reverse().map(([x, y, z]) => [-x, y, z]));
// 27-30 nose bridge, 31-35 nostrils
T.push([0, 10.6, 9.2], [0, 9.4, 9.8], [0, 8.2, 10.3], [0, 6.9, 10.8]);
T.push([-1.6, 5.9, 9.4], [-0.8, 5.6, 9.8], [0, 5.5, 10.0], [0.8, 5.6, 9.8], [1.6, 5.9, 9.4]);
// 36-41 right eye, 42-47 left eye
T.push([-4.7, 9.6, 8.0], [-3.8, 10.1, 8.7], [-2.8, 10.1, 8.8], [-1.9, 9.6, 8.9], [-2.8, 9.15, 8.8], [-3.8, 9.15, 8.7]);
T.push([1.9, 9.6, 8.9], [2.8, 10.1, 8.8], [3.8, 10.1, 8.7], [4.7, 9.6, 8.0], [3.8, 9.15, 8.7], [2.8, 9.15, 8.8]);
// 48-59 outer lips, 60-67 inner lips
T.push([-2.5, 3.3, 8.6], [-1.6, 3.9, 9.3], [-0.6, 4.2, 9.6], [0, 4.0, 9.7], [0.6, 4.2, 9.6], [1.6, 3.9, 9.3],
  [2.5, 3.3, 8.6], [1.6, 2.7, 9.2], [0.7, 2.4, 9.4], [0, 2.35, 9.45], [-0.7, 2.4, 9.4], [-1.6, 2.7, 9.2]);
T.push([-2.1, 3.3, 8.9], [-0.7, 3.45, 9.4], [0, 3.45, 9.5], [0.7, 3.45, 9.4],
  [2.1, 3.3, 8.9], [0.7, 3.2, 9.4], [0, 3.2, 9.5], [-0.7, 3.2, 9.4]);
// 68-69 pupils (right, left)
T.push([-3.3, 9.6, 8.95], [3.3, 9.6, 8.95]);

export const FACE_TEMPLATE = T;
export const DEFAULT_FACE = { open: 0, smile: 0, blink: 0, brows: 0 };
const EYE_C = [[-3.3, 9.6], [3.3, 9.6]];
const HEAD_CENTER = [0, 6.5, 1.5];

const LOWER_LIP = new Set([55, 56, 57, 58, 59, 65, 66, 67]);
const UPPER_LID = { 37: 41, 38: 40, 43: 47, 44: 46 };

/**
 * Face points (cm, face frame) with expression and gaze applied.
 * expr: { open, smile, blink, brows } in 0..1 (brows -1..1); gaze: [x, y] in -1..1 or null.
 */
export function facePoints(expr = DEFAULT_FACE, gaze = null) {
  const e = { ...DEFAULT_FACE, ...expr };
  const P = T.map((p) => p.slice());
  // Mouth open: lower lip and chin drop, jaw corners less.
  const drop = 2.4 * e.open;
  for (const i of LOWER_LIP) P[i][1] -= drop;
  for (let i = 0; i <= 16; i++) P[i][1] -= drop * 0.8 * Math.cos(THREE.MathUtils.degToRad(-90 + (i * 180) / 16)) ** 2;
  // Smile: corners up and out.
  for (const [i, s] of [[48, -1], [60, -1], [54, 1], [64, 1]]) { P[i][1] += 0.9 * e.smile; P[i][0] += 0.4 * e.smile * s; }
  // Blink: upper lids meet the lower ones.
  for (const [u, l] of Object.entries(UPPER_LID)) P[u][1] += (P[l][1] - P[u][1]) * e.blink;
  // Brows up / down.
  for (let i = 17; i <= 26; i++) P[i][1] += 0.8 * e.brows;
  // Pupils follow the gaze, hidden behind closed lids.
  if (gaze) {
    for (const [k, i] of [[0, 68], [1, 69]]) {
      P[i][0] = EYE_C[k][0] + THREE.MathUtils.clamp(gaze[0], -1, 1) * 0.55;
      P[i][1] = EYE_C[k][1] + THREE.MathUtils.clamp(gaze[1], -1, 1) * 0.3;
    }
  }
  return { points: P, pupilsHidden: e.blink > 0.7 };
}

export const faceNormal = (p) => new THREE.Vector3(p[0] - HEAD_CENTER[0], p[1] - HEAD_CENTER[1], p[2] - HEAD_CENTER[2]).normalize();
