// Built-in parametric mannequin.
//
// The body is a smooth union of SDF primitives (ellipsoids, round cones) meshed
// with Surface Nets and skinned to the skeleton by primitive ownership, so the
// torso, breasts, hips and limbs deform as one surface. Hands, genitals, hair,
// wings and tail are rigid parts on their own bones.
// Faces +Z, character's left is +X, ~1.72 units tall, rest pose is a T-pose.
import * as THREE from 'three';
import { ell, cone, carve, primDist, fieldFromPrims, fieldFromFn, meshField, surfacePoint, sdEllipsoid, sdBox, smin, fastSDF, refineToSurface } from './sdf.js';

export const BODY_SLIDERS = [
  ['shoulders', 'Shoulders'], ['pecs', 'Chest muscle'], ['breasts', 'Breasts'], ['waist', 'Waist'],
  ['hips', 'Hips'], ['butt', 'Butt'], ['thighs', 'Thighs'], ['muscle', 'Muscle'], ['belly', 'Belly'],
];

export const BODY_PRESETS = {
  Female: { shoulders: 0.25, pecs: 0, breasts: 0.5, waist: 0.2, hips: 0.75, butt: 0.6, thighs: 0.6, muscle: 0.15, belly: 0.15 },
  Male: { shoulders: 0.8, pecs: 0.5, breasts: 0, waist: 0.55, hips: 0.25, butt: 0.35, thighs: 0.45, muscle: 0.55, belly: 0.2 },
  Neutral: { shoulders: 0.5, pecs: 0.15, breasts: 0, waist: 0.45, hips: 0.45, butt: 0.4, thighs: 0.45, muscle: 0.3, belly: 0.2 },
};

// [value, label] grouped for the UI. Every style works on any body.
export const HAIR_GROUPS = [
  ['', [['none', 'No hair']]],
  ['Short', [['buzz', 'Buzz cut'], ['crew', 'Crew cut'], ['short', 'Short'], ['sidepart', 'Side part'], ['slicked', 'Slicked back'],
    ['quiff', 'Quiff'], ['pompadour', 'Pompadour'], ['undercut', 'Undercut'], ['spiky', 'Spiky'], ['mohawk', 'Mohawk']]],
  ['Medium / long', [['afro', 'Afro'], ['mullet', 'Mullet'], ['bob', 'Bob'], ['long', 'Long']]],
  ['Tied', [['manbun', 'Man bun'], ['bun', 'Bun'], ['ponytail', 'Ponytail'], ['twintails', 'Twintails']]],
];
export const HAIR_STYLES = HAIR_GROUPS.flatMap(([, list]) => list.map(([v]) => v));
export const BEARD_STYLES = [['none', 'None'], ['mustache', 'Mustache'], ['goatee', 'Goatee'], ['short', 'Short beard'], ['full', 'Full beard']];

// simple: rigid segments (artist's wooden mannequin), fastest
// standard: smooth skinned body (default)
// high: denser mesh projected onto the exact surface, extra anatomy, finer hands and hair
export const DETAIL_LEVELS = ['simple', 'standard', 'high'];

export const DEFAULT_BODY = {
  ...BODY_PRESETS.Neutral,
  detail: 'standard',
  genitals: 'none', erect: false, gSize: 0.5, pubic: false, nipples: true,
  hair: 'none', bangs: false, beard: 'none', arms: 2, wings: 'none', tail: false,
};

const FINGERS = [['Index', 0.03, 1.0], ['Middle', 0.01, 1.08], ['Ring', -0.01, 1.0], ['Little', -0.03, 0.8]];
const V3 = (a) => (a.isVector3 ? a.clone() : new THREE.Vector3(...a));
const Y = new THREE.Vector3(0, 1, 0);

function taperedCapsule(r1, r2, len, seg = 14, rings = 6) {
  const pts = [];
  for (let i = 0; i <= rings; i++) {
    const a = -Math.PI / 2 + (i / rings) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(1e-4, r1 * Math.cos(a)), -len / 2 + r1 * Math.sin(a)));
  }
  for (let i = 0; i <= rings; i++) {
    const a = (i / rings) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(1e-4, r2 * Math.cos(a)), len / 2 + r2 * Math.sin(a)));
  }
  return new THREE.LatheGeometry(pts, seg);
}

export function buildMannequin(opts = {}) {
  const o = { ...DEFAULT_BODY, ...opts };
  const detail = DETAIL_LEVELS.includes(o.detail) ? o.detail : 'standard';
  const HI = detail === 'high', LO = detail === 'simple';
  const Q = HI ? { lathe: 28, rings: 10, sph: [36, 24], hair: 0.005 } : { lathe: 14, rings: 6, sph: [20, 14], hair: 0.0075 };
  const root = new THREE.Group();
  root.name = 'Mannequin';
  const b = {};
  const mk = (name, parent, x, y, z) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(x, y, z);
    (parent ? b[parent] : root).add(bone);
    b[name] = bone;
    return bone;
  };
  const W = (n) => b[n].getWorldPosition(new THREE.Vector3());
  const update = () => root.updateMatrixWorld(true);

  const sw = 0.13 + 0.04 * o.shoulders;
  const xl = 0.072 + 0.04 * o.hips;
  const pairs = Math.max(1, Math.min(3, Math.round((o.arms || 2) / 2)));

  // ---------------------------------------------------------------- skeleton
  mk('hips', null, 0, 0.95, 0);
  mk('spine', 'hips', 0, 0.1, 0);
  mk('chest', 'spine', 0, 0.15, 0);
  mk('neck', 'chest', 0, 0.22, 0);
  mk('head', 'neck', 0, 0.1, 0);
  mk('headTop', 'head', 0, 0.2, 0);

  const armName = (side, part, n) => side + part + (n === 1 ? '' : n);
  const fingerName = (side, f, i, n) => side + f + i + (n === 1 ? '' : '_' + n);
  const buildArm = (side, s, n) => {
    const k = n === 1 ? 1 : 0.94;
    mk(armName(side, 'Shoulder', n), 'chest', s * 0.03, 0.18 - 0.115 * (n - 1), n === 1 ? 0 : -0.008);
    mk(armName(side, 'UpperArm', n), armName(side, 'Shoulder', n), s * (n === 1 ? sw : sw * 0.88), 0, 0);
    mk(armName(side, 'LowerArm', n), armName(side, 'UpperArm', n), s * 0.27 * k, 0, 0);
    const hand = armName(side, 'Hand', n);
    mk(hand, armName(side, 'LowerArm', n), s * 0.25 * k, 0, 0);
    mk(fingerName(side, 'Thumb', 0, n), hand, 0.02 * s, -0.01, 0.03);
    mk(fingerName(side, 'Thumb', 1, n), fingerName(side, 'Thumb', 0, n), 0.03 * s, 0, 0.03);
    mk(fingerName(side, 'Thumb', 2, n), fingerName(side, 'Thumb', 1, n), 0.025 * s, 0, 0.022);
    mk(fingerName(side, 'Thumb', 'Tip', n), fingerName(side, 'Thumb', 2, n), 0.02 * s, 0, 0.018);
    for (const [f, z, len] of FINGERS) {
      mk(fingerName(side, f, 0, n), hand, 0.085 * s, 0, z);
      mk(fingerName(side, f, 1, n), fingerName(side, f, 0, n), 0.04 * len * s, 0, 0);
      mk(fingerName(side, f, 2, n), fingerName(side, f, 1, n), 0.026 * len * s, 0, 0);
      mk(fingerName(side, f, 'Tip', n), fingerName(side, f, 2, n), 0.022 * len * s, 0, 0);
    }
  };

  for (const [side, s] of [['left', 1], ['right', -1]]) {
    for (let n = 1; n <= pairs; n++) buildArm(side, s, n);
    mk(side + 'UpperLeg', 'hips', xl * s, -0.05, 0);
    mk(side + 'LowerLeg', side + 'UpperLeg', 0, -0.42, 0);
    mk(side + 'Foot', side + 'LowerLeg', 0, -0.4, 0);
    mk(side + 'Toes', side + 'Foot', 0, -0.06, 0.12);
    mk(side + 'ToesTip', side + 'Toes', 0, 0, 0.06);
    if (o.wings !== 'none') {
      mk(side + 'Wing0', 'chest', s * 0.07, 0.11, -0.1);
      mk(side + 'Wing1', side + 'Wing0', s * 0.2, 0.11, -0.09);
      mk(side + 'Wing2', side + 'Wing1', s * 0.28, 0.05, -0.03);
      mk(side + 'WingTip', side + 'Wing2', s * 0.3, -0.03, 0.02);
    }
    if (o.hair === 'twintails') {
      mk(side + 'Twintail0', 'head', s * 0.085, 0.135, -0.03);
      mk(side + 'Twintail1', side + 'Twintail0', s * 0.04, -0.1, -0.02);
      mk(side + 'Twintail2', side + 'Twintail1', s * 0.01, -0.13, 0);
      mk(side + 'TwintailTip', side + 'Twintail2', 0, -0.13, 0.01);
    }
  }
  if (o.tail) {
    const offs = [[0, -0.03, -0.1], [0, -0.05, -0.12], [0, -0.07, -0.11], [0, -0.08, -0.09], [0, -0.09, -0.06], [0, -0.08, -0.03]];
    offs.forEach((p, i) => mk(i < 5 ? 'tail' + i : 'tailTip', i ? (i - 1 < 5 ? 'tail' + (i - 1) : null) : 'hips', ...p));
  }
  if (o.hair === 'ponytail') {
    mk('ponytail0', 'head', 0, 0.14, -0.095);
    mk('ponytail1', 'ponytail0', 0, -0.1, -0.06);
    mk('ponytail2', 'ponytail1', 0, -0.12, -0.02);
    mk('ponytailTip', 'ponytail2', 0, -0.12, 0.01);
  }
  update();

  // ---------------------------------------------------------------- materials
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc9c3b8, roughness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0xa8968b, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x4a3d35, roughness: 0.8 });
  const featherMat = new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: 0.85 });
  const membraneMat = new THREE.MeshStandardMaterial({ color: 0x5b4b57, roughness: 0.7, side: THREE.DoubleSide });

  const attach = (bone, mesh, worldPos) => {
    mesh.position.copy(V3(worldPos)).sub(W(bone));
    b[bone].add(mesh);
    return mesh;
  };
  const seg = (bone, a, c, r1, mat, r2 = r1) => {
    const A = V3(a), B = V3(c);
    const dir = B.clone().sub(A);
    const m = new THREE.Mesh(taperedCapsule(r1, r2, Math.max(1e-3, dir.length()), Q.lathe, Q.rings), mat);
    m.quaternion.setFromUnitVectors(Y, dir.normalize());
    return attach(bone, m, A.add(B).multiplyScalar(0.5));
  };
  const blob = (bone, c, r, mat) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, Q.sph[0], Q.sph[1]), mat);
    m.scale.set(...r);
    return attach(bone, m, c);
  };

  // ---------------------------------------------------------------- body SDF
  const { shoulders: sh, pecs: pc, breasts: br, waist: wa, hips: hp, butt: bt, thighs: th, muscle: mu, belly: be } = o;
  const prims = [];
  const subs = [];
  const P = (...a) => prims.push(...a);

  P(ell('hips', [0, 0.93, -0.005], [0.115 + 0.055 * hp, 0.105, 0.092 + 0.012 * bt], 0.05));
  for (const s of [1, -1]) {
    P(ell('hips', [s * (0.05 + 0.02 * hp), 0.885, -0.045 - 0.02 * bt], [0.065 + 0.025 * bt + 0.01 * hp, 0.075 + 0.02 * bt, 0.055 + 0.03 * bt], 0.04));
  }
  if (o.genitals === 'female') P(ell('hips', [0, 0.877, 0.062], [0.042, 0.03, 0.024], 0.04));
  P(ell('spine', [0, 1.06, 0.005 + 0.012 * be], [0.1 + 0.045 * wa, 0.12, 0.08 + 0.035 * be], 0.07));
  P(ell('chest', [0, 1.255, -0.005], [0.12 + 0.04 * sh + 0.01 * mu, 0.135, 0.092], 0.06));
  P(ell('chest', [0, 1.335, -0.012], [0.13 + 0.045 * sh, 0.065, 0.078], 0.05));
  // Breasts, pecs and nipples sit out towards the sides of the ribcage
  // (nipples ~18-20 cm apart on a 1.72 m adult), scaled with chest width.
  const chestHalf = 0.12 + 0.04 * sh + 0.01 * mu;
  const breastC = (s) => [s * (chestHalf * 0.64 + 0.01 * br), 1.275 - 0.015 * br, 0.062 + 0.02 * br];
  const nippleX = (s) => s * (br > 0.02 ? Math.abs(breastC(1)[0]) + 0.003 : chestHalf * 0.62 + 0.004 * pc);
  for (const s of [1, -1]) {
    if (pc > 0.02) P(ell('chest', [s * chestHalf * 0.48, 1.298, 0.055 + 0.012 * pc], [0.068, 0.048 + 0.01 * pc, 0.025 + 0.025 * pc], 0.04));
    if (br > 0.02) P(ell('chest', breastC(s), [0.05 + 0.035 * br, 0.048 + 0.032 * br, 0.035 + 0.05 * br], 0.035));
  }
  P(cone('neck', [0, 1.39, -0.012], [0, 1.555, 0], 0.05 + 0.012 * mu, 0.043, 0.05));
  P(ell('head', [0, 1.625, 0.008], [0.078, 0.103, 0.094], 0.03));
  P(ell('head', [0, 1.565, 0.035], [0.056 + 0.008 * mu, 0.05, 0.062], 0.045));
  if (!HI) P(cone('head', [0, 1.615, 0.087], [0, 1.58, 0.105], 0.009, 0.012, 0.012));
  for (const s of [1, -1]) P(ell('head', [s * 0.079, 1.61, -0.005], [0.011, 0.027, 0.017], 0.01));
  if (HI) {
    // Facial structure. Order matters: sockets are carved before the lids go on.
    P(ell('head', [0, 1.533, 0.068], [0.022, 0.018, 0.02], 0.025));
    P(cone('head', [0, 1.634, 0.093], [0, 1.594, 0.106], 0.0055, 0.0075, 0.012));
    P(ell('head', [0, 1.589, 0.104], [0.0095, 0.0085, 0.0085], 0.008));
    for (const s of [1, -1]) {
      P(cone('head', [s * 0.01, 1.645, 0.097], [s * 0.052, 1.641, 0.082], 0.0075, 0.0055, 0.03)); // brow
      P(ell('head', [s * 0.046, 1.597, 0.064], [0.024, 0.016, 0.022], 0.035)); // cheekbone
      P(ell('head', [s * 0.048, 1.55, 0.025], [0.02, 0.025, 0.035], 0.03)); // jaw angle
      P(ell('head', [s * 0.0095, 1.586, 0.097], [0.0068, 0.0058, 0.0068], 0.006)); // nostril wing
    }
    for (const s of [1, -1]) P(carve(ell('head', [s * 0.033, 1.618, 0.103], [0.0155, 0.0125, 0.016], 0.006))); // socket
    for (const s of [1, -1]) {
      P(ell('head', [s * 0.033, 1.6255, 0.0905], [0.0148, 0.0052, 0.0085], 0.004)); // upper lid
      P(ell('head', [s * 0.033, 1.6102, 0.0895], [0.0135, 0.0035, 0.0072], 0.004)); // lower lid
    }
    P(ell('head', [0, 1.5675, 0.0935], [0.018, 0.0062, 0.0085], 0.008)); // upper lip
    P(ell('head', [0, 1.5565, 0.0915], [0.0165, 0.0065, 0.0085], 0.008)); // lower lip
  }

  for (const [side, s] of [['left', 1], ['right', -1]]) {
    for (let n = 1; n <= pairs; n++) {
      const U = W(armName(side, 'UpperArm', n)), L = W(armName(side, 'LowerArm', n)), H = W(armName(side, 'Hand', n));
      const sc = n === 1 ? 1 : 0.88;
      P(ell(armName(side, 'Shoulder', n), [s * (0.03 + sw * 0.55), U.y - 0.015, -0.01], [0.075 * sc, (0.055 + 0.01 * mu) * sc, 0.065 * sc], 0.05));
      P(ell(armName(side, 'UpperArm', n), [U.x + s * 0.015, U.y + 0.003, U.z - 0.003], [(0.062 + 0.012 * mu) * sc, (0.05 + 0.012 * mu) * sc, (0.052 + 0.01 * mu) * sc], 0.04));
      P(cone(armName(side, 'UpperArm', n), U.toArray(), L.toArray(), (0.043 + 0.012 * mu) * sc, (0.033 + 0.005 * mu) * sc, 0.03));
      if (mu > 0.3) P(ell(armName(side, 'UpperArm', n), [(U.x + L.x) / 2, U.y, U.z + 0.012], [0.075, 0.032 + 0.015 * mu, 0.03 + 0.015 * mu], 0.03));
      P(cone(armName(side, 'LowerArm', n), L.toArray(), [H.x - s * 0.01, H.y, H.z], (0.035 + 0.008 * mu) * sc, 0.024 * sc, 0.02));
      if (HI) P(ell(armName(side, 'LowerArm', n), [L.x + s * 0.06, L.y + 0.005, L.z + 0.005], [0.07 * sc, (0.032 + 0.01 * mu) * sc, 0.034 * sc], 0.03));
    }
    const x = s * xl;
    P(cone(side + 'UpperLeg', [x, 0.88, 0], [x, 0.5, 0.005], 0.074 + 0.03 * th + 0.01 * hp, 0.048 + 0.006 * mu, 0.045));
    P(ell(side + 'LowerLeg', [x, 0.48, 0.01], [0.048, 0.05, 0.05], 0.02));
    P(cone(side + 'LowerLeg', [x, 0.46, -0.005], [x, 0.1, -0.01], 0.048 + 0.006 * mu, 0.03, 0.02));
    P(ell(side + 'LowerLeg', [x, 0.35, -0.022], [0.045 + 0.008 * mu, 0.085, 0.042 + 0.008 * mu], 0.03));
    P(cone(side + 'Foot', [x, 0.075, -0.025], [x, 0.04, 0.1], 0.042, 0.036, 0.03));
    P(cone(side + 'Toes', [x, 0.035, 0.115], [x, 0.028, 0.17], 0.034, 0.026, 0.02));
    if (HI) {
      P(ell(side + 'LowerLeg', [x, 0.485, 0.048], [0.03, 0.035, 0.018], 0.02)); // kneecap
      P(ell(side + 'Foot', [x, 0.045, -0.045], [0.03, 0.035, 0.032], 0.02)); // heel
      P(ell(side + 'Foot', [x + s * 0.028, 0.085, -0.012], [0.012, 0.014, 0.012], 0.01)); // ankle bones
      P(ell(side + 'Foot', [x - s * 0.026, 0.09, -0.012], [0.012, 0.014, 0.012], 0.01));
      P(cone('chest', [s * 0.012, 1.405, 0.06], [s * (0.03 + sw * 0.75), 1.425, 0.005], 0.011, 0.009, 0.015)); // clavicle
      P(ell('chest', [s * 0.075, 1.43, -0.04], [0.07, 0.03, 0.045], 0.04)); // trapezius
      P(ell('chest', [s * 0.075, 1.29, -0.072], [0.055, 0.075, 0.02], 0.04)); // shoulder blade
      P(cone('neck', [s * 0.045, 1.575, -0.01], [s * 0.014, 1.415, 0.05], 0.014, 0.011, 0.02)); // neck muscle
    }
  }
  subs.push({ c: [0, 1.0, 0.085 + 0.047 * be], r: 0.008 });

  const bodySDF = fastSDF(prims, subs);
  if (LO) {
    // Rigid segments, one per primitive, like a wooden artist's mannequin.
    for (const p of prims) {
      if (p.sub) continue;
      if (p.t === 'ell') blob(p.bone, p.c, p.r, skinMat);
      else seg(p.bone, p.a, p.b, p.ra, skinMat, p.rb);
    }
  } else {
    const bodyGeo = meshField(fieldFromPrims(prims, subs, HI ? 0.0062 : 0.0105));
    if (HI) refineToSurface(bodyGeo, bodySDF);
    const body = new THREE.SkinnedMesh(bodyGeo, skinMat);
    body.name = 'body';
    const skinBones = skinByPrims(bodyGeo, prims.filter((p) => !p.sub), b, HI ? 5 : 3);
    root.add(body);
    update();
    body.bind(new THREE.Skeleton(skinBones));
  }
  if (HI) {
    for (const s of [1, -1]) blob('head', [s * 0.033, 1.618, 0.0815], [0.0118, 0.0118, 0.0118], darkMat); // eyes
  }

  // ---------------------------------------------------------------- hands
  for (const [side, s] of [['left', 1], ['right', -1]]) {
    for (let n = 1; n <= pairs; n++) {
      const hand = armName(side, 'Hand', n);
      if (HI) {
        // Sculpted palm: heel, centre and thumb mound blended, refined to the surface.
        const Hp = W(hand);
        const at = (dx, dy, dz) => [Hp.x + s * dx, Hp.y + dy, Hp.z + dz];
        const pp = [
          ell(hand, at(0.048, 0, 0), [0.046, 0.0145, 0.043], 0.02),
          ell(hand, at(0.014, -0.001, 0), [0.024, 0.014, 0.032], 0.02),
          ell(hand, at(0.03, -0.007, 0.026), [0.026, 0.013, 0.017], 0.015),
          ell(hand, at(0.08, 0.001, 0), [0.012, 0.012, 0.042], 0.015),
        ];
        const g = meshField(fieldFromPrims(pp, [], 0.0028, 0.01));
        refineToSurface(g, fastSDF(pp, []));
        g.translate(-Hp.x, -Hp.y, -Hp.z);
        b[hand].add(new THREE.Mesh(g, skinMat));
      } else {
        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.028, 0.085), skinMat);
        attach(hand, palm, W(hand).add(new THREE.Vector3(0.045 * s, 0, 0)));
      }
      for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Little']) {
        const r = f === 'Thumb' ? 0.0115 : 0.009;
        const j = [0, 1, 2, 'Tip'].map((i) => fingerName(side, f, i, n));
        for (let i = 0; i < 3; i++) seg(j[i], W(j[i]), W(j[i + 1]), r * (1 - 0.04 * i), skinMat, r * (0.96 - 0.04 * i));
        if (HI) for (let i = 1; i < 3; i++) blob(j[i], W(j[i]), [r * 1.04, r * 1.04, r * 1.04], skinMat); // knuckles
      }
    }
  }

  // ---------------------------------------------------------------- chest details
  if (o.nipples) {
    for (const s of [1, -1]) {
      const c = br > 0.02 ? breastC(s) : [0, 1.265, 0];
      c[0] = nippleX(s);
      if (br > 0.02) c[1] -= 0.004;
      const p = surfacePoint(bodySDF, [c[0], c[1], 0], [0, 0, 1]);
      // Face along the skin's normal: away from the midline they point outward.
      const e = 0.002;
      const n = new THREE.Vector3(
        bodySDF(p.x + e, p.y, p.z) - bodySDF(p.x - e, p.y, p.z),
        bodySDF(p.x, p.y + e, p.z) - bodySDF(p.x, p.y - e, p.z),
        bodySDF(p.x, p.y, p.z + e) - bodySDF(p.x, p.y, p.z - e)).normalize();
      const ar = 0.012 + 0.01 * br;
      const nr = 0.0042 + 0.002 * br;
      const areola = blob('chest', p.clone().addScaledVector(n, -0.0025), [ar, ar, 0.004], darkMat);
      const nip = blob('chest', p.clone().addScaledVector(n, 0.0015), [nr, nr, nr], darkMat);
      for (const m of [areola, nip]) m.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
    }
  }

  // ---------------------------------------------------------------- genitals
  const extraKeys = [];
  if (o.genitals === 'male') {
    const g = o.gSize;
    const hipsW = W('hips');
    const base = surfacePoint(bodySDF, [0, 0.885, 0], [0, 0, 1]);
    base.z -= 0.006;
    const erect = !!o.erect;
    const L = erect ? 0.12 + 0.07 * g : 0.065 + 0.035 * g;
    const r = erect ? 0.015 + 0.006 * g : 0.0135 + 0.004 * g;
    const d1 = new THREE.Vector3(0, erect ? 0.32 : -1, erect ? 1 : 0.32).normalize();
    const d2 = new THREE.Vector3(0, erect ? 0.45 : -1, erect ? 1 : 0.12).normalize();
    mk('penis0', 'hips', ...base.clone().sub(hipsW).toArray());
    mk('penis1', 'penis0', ...d1.clone().multiplyScalar(L * 0.5).toArray());
    mk('penisTip', 'penis1', ...d2.clone().multiplyScalar(L * 0.5).toArray());
    update();
    const gl = r * (erect ? 2.3 : 1.9);
    const glansBase = W('penisTip').addScaledVector(d2, -gl);
    seg('penis0', W('penis0').addScaledVector(d1, -0.01), W('penis1'), r * 1.08, skinMat, r);
    seg('penis1', W('penis1'), glansBase.clone().addScaledVector(d2, r * 0.4), r, skinMat, r * 0.97);
    const k = erect ? 1 : 0.93;
    const prof = [[0.92, 0], [1.08, 0.12], [1.1, 0.25], [1.0, 0.45], [0.8, 0.7], [0.45, 0.92], [0.001, 1]]
      .map(([x, y]) => new THREE.Vector2(x * r * k, y * gl));
    const glans = new THREE.Mesh(new THREE.LatheGeometry(prof, HI ? 40 : 20), darkMat);
    glans.quaternion.setFromUnitVectors(Y, d2);
    attach('penis1', glans, glansBase);
    const ss = 0.85 + 0.35 * g;
    const sc = base.clone().add(new THREE.Vector3(0, -0.038 - (erect ? 0 : 0.008) - 0.01 * g, -0.016));
    blob('hips', sc.clone().add(new THREE.Vector3(0, 0.008, 0)), [0.034 * ss, 0.03 * ss, 0.024 * ss], skinMat);
    for (const s of [1, -1]) blob('hips', sc.clone().add(new THREE.Vector3(s * 0.016 * ss, 0, 0)), [0.02 * ss, 0.026 * ss, 0.021 * ss], skinMat);
    if (o.pubic) blob('hips', surfacePoint(bodySDF, [0, base.y + 0.03, 0], [0, 0, 1]).add(new THREE.Vector3(0, 0, -0.005)), [0.05, 0.03, 0.009], hairMat);
    extraKeys.push(['penis0', 'penis1'], ['penis1', 'penisTip']);
  } else if (o.genitals === 'female') {
    const g = o.gSize;
    const top = surfacePoint(bodySDF, [0, 0.868, 0], [0, 0, 1]);
    const bot = surfacePoint(bodySDF, [0, 0.84, -0.01], [0, 0, 1]);
    const lr = 0.0085 * (0.8 + 0.4 * g);
    for (const s of [1, -1]) {
      seg('hips', top.clone().add(new THREE.Vector3(s * 0.0075, 0, -0.005)), bot.clone().add(new THREE.Vector3(s * 0.0075, 0.004, -0.007)), lr, skinMat);
    }
    blob('hips', top.clone().add(new THREE.Vector3(0, 0.006, -0.002)), [0.006, 0.009, 0.005], skinMat);
    if (o.pubic) blob('hips', surfacePoint(bodySDF, [0, top.y + 0.025, 0], [0, 0, 1]).add(new THREE.Vector3(0, 0, -0.005)), [0.045, 0.028, 0.009], hairMat);
  }

  // ---------------------------------------------------------------- hair
  if (o.hair !== 'none') {
    const hairFn = hairSDF(o.hair, o.bangs);
    const hairGeo = meshField(fieldFromFn(hairFn, [-0.17, -0.48, -0.19], [0.17, 0.3, 0.17], Q.hair));
    if (HI) refineToSurface(hairGeo, hairFn);
    b.head.add(new THREE.Mesh(hairGeo, hairMat));
    if (o.hair === 'ponytail') {
      const j = ['ponytail0', 'ponytail1', 'ponytail2', 'ponytailTip'];
      const r = [0.032, 0.026, 0.018, 0.008];
      blob('ponytail0', W('ponytail0'), [0.024, 0.024, 0.024], darkMat);
      for (let i = 0; i < 3; i++) seg(j[i], W(j[i]), W(j[i + 1]), r[i], hairMat, r[i + 1]);
      extraKeys.push(['ponytail0', 'ponytail1'], ['ponytail1', 'ponytail2'], ['ponytail2', 'ponytailTip']);
    }
    if (o.hair === 'twintails') {
      for (const side of ['left', 'right']) {
        const j = [0, 1, 2, 'Tip'].map((i) => side + 'Twintail' + i);
        const r = [0.028, 0.022, 0.015, 0.006];
        blob(j[0], W(j[0]), [0.02, 0.02, 0.02], darkMat);
        for (let i = 0; i < 3; i++) seg(j[i], W(j[i]), W(j[i + 1]), r[i], hairMat, r[i + 1]);
        for (let i = 0; i < 3; i++) extraKeys.push([j[i], j[i + 1]]);
      }
    }
  }

  if (o.beard && o.beard !== 'none') {
    const beardFn = beardSDF(o.beard);
    const beardGeo = meshField(fieldFromFn(beardFn, [-0.1, -0.04, -0.03], [0.1, 0.12, 0.13], Q.hair * 0.6));
    if (HI) refineToSurface(beardGeo, beardFn);
    b.head.add(new THREE.Mesh(beardGeo, hairMat));
  }

  // ---------------------------------------------------------------- wings
  if (o.wings !== 'none') {
    for (const [side, s] of [['left', 1], ['right', -1]]) {
      const j = [0, 1, 2, 'Tip'].map((i) => side + 'Wing' + i);
      const r = [0.026, 0.02, 0.014, 0.008];
      for (let i = 0; i < 3; i++) seg(j[i], W(j[i]), W(j[i + 1]), r[i], o.wings === 'bat' ? membraneMat : featherMat, r[i + 1]);
      if (o.wings === 'feathered') buildFeathers(side, s, j, W, attach, featherMat);
      else buildMembrane(side, s, j, b, W, seg, root, membraneMat);
      for (let i = 0; i < 3; i++) extraKeys.push([j[i], j[i + 1]]);
    }
  }

  // ---------------------------------------------------------------- tail
  if (o.tail) {
    const j = ['tail0', 'tail1', 'tail2', 'tail3', 'tail4', 'tailTip'];
    const r = [0.036, 0.03, 0.024, 0.018, 0.012, 0.006];
    for (let i = 0; i < 5; i++) {
      seg(j[i], W(j[i]), W(j[i + 1]), r[i], skinMat, r[i + 1]);
      extraKeys.push([j[i], j[i + 1]]);
    }
  }

  // ---------------------------------------------------------------- mapping
  const bones = { hips: b.hips, spine0: b.spine, spine1: b.chest, neck: b.neck, head: b.head };
  const fingers = { left: {}, right: {} };
  const tips = { left: {}, right: {} };
  const extras = [];
  const extraDefaults = {};
  for (const side of ['left', 'right']) {
    const s = side === 'left' ? 1 : -1;
    for (const k of ['Shoulder', 'UpperArm', 'LowerArm', 'Hand', 'UpperLeg', 'LowerLeg', 'Foot', 'Toes']) bones[side + k] = b[side + k];
    for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Little']) {
      fingers[side][f] = [0, 1, 2].map((i) => b[side + f + i]);
      tips[side][f] = b[side + f + 'Tip'];
    }
    for (let n = 2; n <= pairs; n++) {
      const U = armName(side, 'UpperArm', n), L = armName(side, 'LowerArm', n), H = armName(side, 'Hand', n);
      extras.push({ key: U, bone: b[U], child: b[L] }, { key: L, bone: b[L], child: b[H] }, { key: H, bone: b[H], child: b[fingerName(side, 'Middle', 0, n)] });
      extraDefaults[U] = [s * (0.4 + 0.12 * n), -0.85, 0.1 + 0.08 * n];
      extraDefaults[L] = [s * 0.2, -0.75, 0.55];
    }
  }
  for (const [k, c] of extraKeys) extras.push({ key: k, bone: b[k], child: b[c] });
  return { root, mapping: { bones, fingers, tips, extras, extraDefaults } };
}

// Weight each vertex to the bone owning its nearest primitive, blended with
// primitives of that bone's parent/children only (so thighs never pull each other).
// Skin weights. Each vertex is seeded with the bone of the nearest primitive
// (which limb / body part it belongs to); the blend with the parent and child
// bones then follows planes placed at the real joints, each with its own
// falloff (wide at hips and shoulders, tight at wrists and toes), and a few
// smoothing passes over the mesh remove seams between seeds.
const SKIN_JOINTS = {
  spine: { w: 0.06 }, chest: { w: 0.06 }, neck: { w: 0.035, off: 0.01 }, head: { w: 0.03, n: [0, 1, 0.6] },
  Shoulder: { w: 0.05, off: 0.06 }, UpperArm: { w: 0.045, off: -0.02 }, LowerArm: { w: 0.035 }, Hand: { w: 0.02, off: -0.012 },
  UpperLeg: { w: 0.07, n: [0.55, -0.81, 0.18], off: 0.02 }, LowerLeg: { w: 0.045 }, Foot: { w: 0.03, n: [0, -1, 0] }, Toes: { w: 0.02, n: [0, 0, 1] },
};
const jointPart = (name) => name.replace(/^(left|right)/, '').replace(/\d+$/, '');

function skinByPrims(geo, prims, b, smoothPasses = 3) {
  const names = [...new Set(prims.map((p) => p.bone))];
  // Hands have no body primitives, but the wrist should follow them.
  for (const n of [...names]) {
    const m = n.match(/^(left|right)LowerArm(\d*)$/);
    const hand = m && m[1] + 'Hand' + m[2];
    if (hand && b[hand] && !names.includes(hand)) names.push(hand);
  }
  const index = Object.fromEntries(names.map((n, i) => [n, i]));
  const nb = names.length;
  const V = (o) => o.getWorldPosition(new THREE.Vector3());
  const info = names.map((n) => {
    const bone = b[n];
    const kids = bone.children.filter((c) => c.isBone);
    const main = kids.find((c) => /^(spine|neck|chest|head)$/.test(c.name)) ||
      kids.find((c) => c.name === n.replace('LowerArm', 'Hand') || /(LowerArm|LowerLeg|Foot|Toes|ToesTip|headTop|UpperArm)\d*$/.test(c.name)) ||
      kids.find((c) => /Middle0/.test(c.name)) || kids[0];
    const J = V(bone);
    const dir = main ? V(main).sub(J).normalize() : new THREE.Vector3(0, 1, 0);
    return { bone, J, dir, parent: bone.parent && index[bone.parent.name] !== undefined ? index[bone.parent.name] : -1 };
  });
  const children = names.map(() => []);
  info.forEach((it, i) => { if (it.parent >= 0) children[it.parent].push(i); });
  // Joint plane of each bone against its parent.
  for (const [i, it] of info.entries()) {
    const cfg = SKIN_JOINTS[jointPart(names[i])] || { w: 0.04 };
    const side = names[i].startsWith('right') ? -1 : 1;
    let n;
    if (cfg.n) n = new THREE.Vector3(cfg.n[0] * side, cfg.n[1], cfg.n[2]);
    else if (it.parent >= 0 && children[it.parent].length === 1) n = info[it.parent].dir.clone().add(it.dir);
    else n = it.dir.clone();
    if (n.lengthSq() < 1e-8) n = it.dir.clone();
    n.normalize();
    it.n = n;
    it.w = cfg.w;
    it.o = it.J.clone().addScaledVector(it.dir, cfg.off || 0);
  }
  const sigma = (i, x, y, z) => {
    const it = info[i];
    const s = (x - it.o.x) * it.n.x + (y - it.o.y) * it.n.y + (z - it.o.z) * it.n.z;
    const t = Math.min(1, Math.max(0, (s + it.w) / (2 * it.w)));
    return t * t * (3 - 2 * t);
  };
  const primBone = prims.map((p) => index[p.bone]);
  const pos = geo.attributes.position;
  const N = pos.count;
  const Wt = new Float32Array(N * nb);
  const near = new Float32Array(nb);
  const PROX = 0.05;
  for (let v = 0; v < N; v++) {
    const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
    near.fill(Infinity);
    let dmin = Infinity, k = 0;
    for (let p = 0; p < prims.length; p++) {
      const d = primDist(prims[p], x, y, z);
      const bi = primBone[p];
      if (d < near[bi]) near[bi] = d;
      if (d < dmin) { dmin = d; k = bi; }
    }
    const row = v * nb;
    let rest = 1;
    for (const c of children[k]) {
      const prox = Number.isFinite(near[c]) ? Math.min(1, Math.max(0, 1 - (near[c] - dmin) / PROX)) : 1;
      const a = sigma(c, x, y, z) * prox;
      if (a <= 0) continue;
      Wt[row + c] += a * rest;
      rest *= 1 - a;
    }
    const p = info[k].parent;
    const own = p >= 0 ? sigma(k, x, y, z) : 1;
    Wt[row + k] += rest * own;
    if (p >= 0) Wt[row + p] += rest * (1 - own);
  }
  // Smooth over the mesh (vertex neighbours from the triangles).
  if (geo.index && smoothPasses > 0) {
    const idx = geo.index.array;
    const deg = new Uint32Array(N + 1);
    for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) { deg[idx[t + e]] += 2; }
    const start = new Uint32Array(N + 1);
    for (let v = 0; v < N; v++) start[v + 1] = start[v] + deg[v];
    const nbr = new Uint32Array(start[N]);
    const fill = start.slice(0, N);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], c = idx[t + 1], d = idx[t + 2];
      nbr[fill[a]++] = c; nbr[fill[a]++] = d;
      nbr[fill[c]++] = a; nbr[fill[c]++] = d;
      nbr[fill[d]++] = a; nbr[fill[d]++] = c;
    }
    let src = Wt, dst = new Float32Array(N * nb);
    for (let pass = 0; pass < smoothPasses; pass++) {
      for (let v = 0; v < N; v++) {
        const s0 = start[v], s1 = start[v + 1], row = v * nb;
        const cnt = s1 - s0;
        for (let j = 0; j < nb; j++) {
          let acc = 0;
          for (let q = s0; q < s1; q++) acc += src[nbr[q] * nb + j];
          dst[row + j] = cnt ? 0.5 * src[row + j] + 0.5 * acc / cnt : src[row + j];
        }
      }
      [src, dst] = [dst, src];
    }
    if (src !== Wt) Wt.set(src);
  }
  const si = new Uint16Array(N * 4), sw = new Float32Array(N * 4);
  const top = [0, 0, 0, 0], tw = [0, 0, 0, 0];
  for (let v = 0; v < N; v++) {
    const row = v * nb;
    top.fill(0); tw.fill(0);
    for (let j = 0; j < nb; j++) {
      const w = Wt[row + j];
      if (w <= tw[3]) continue;
      let q = 3;
      while (q > 0 && w > tw[q - 1]) { tw[q] = tw[q - 1]; top[q] = top[q - 1]; q--; }
      tw[q] = w; top[q] = j;
    }
    const sum = tw[0] + tw[1] + tw[2] + tw[3] || 1;
    for (let q = 0; q < 4; q++) { si[v * 4 + q] = top[q]; sw[v * 4 + q] = tw[q] / sum; }
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  return names.map((n) => b[n]);
}

// Hair volumes in head-bone space (head bone origin at the base of the skull).
function hairSDF(style, bangs) {
  const hc = [0, 0.105, 0.008];
  // Hairline: the face is cut out below a line that recedes at the temples.
  const hairline = (x) => hc[1] + 0.035 + 3 * x * x;
  const face = (x, y, z) => Math.max(sdBox(x, y, z, [0, hc[1] - 0.08, hc[2] + 0.09], [0.072, 0.115, 0.09]), y - hairline(x));
  const below = (y, z, y0, slope) => y0 + slope * (z - hc[2]) - y; // > 0 below the cut line
  const cap = (x, y, z, s) => sdEllipsoid(x, y, z, [0, hc[1] + 0.01, hc[2] - 0.006], [0.088 * s, 0.114 * s, 0.104 * s]);
  // Close-cropped layer t metres over the scalp, thinning out towards the
  // forehead hairline instead of ending in a step.
  const shell = (x, y, z, t) => {
    if (t > 0.005 && z > 0.02) t *= Math.min(1, Math.max(0.5, (y - hairline(x)) / 0.025));
    return sdEllipsoid(x, y, z, [0, hc[1] + 0.002, hc[2] - 0.003], [0.079 + t, 0.104 + t, 0.095 + t]);
  };
  const ears = (x, y, z) => Math.min(...[1, -1].map((s) => sdEllipsoid(x, y, z, [s * 0.082, 0.09, -0.004], [0.02, 0.03, 0.025])));
  const spikes = style === 'spiky' ? spikeCones(hc) : null;
  return (x, y, z) => {
    let d;
    switch (style) {
      case 'bob': case 'long':
        d = smin(cap(x, y, z, 1.06), sdEllipsoid(x, y, z, [0, hc[1] - 0.04, hc[2] - 0.012], [0.1, 0.12, 0.11]), 0.03);
        if (style === 'long') {
          d = smin(d, sdEllipsoid(x, y, z, [0, hc[1] - 0.27, -0.085], [0.11, 0.26, 0.045]), 0.04);
          for (const s of [1, -1]) d = smin(d, sdEllipsoid(x, y, z, [s * 0.085, hc[1] - 0.13, -0.005], [0.03, 0.13, 0.045]), 0.03);
          d = Math.max(d, below(y, z, hc[1] - 0.53, 0));
        } else d = Math.max(d, below(y, z, hc[1] - 0.115, 0.15));
        break;
      case 'buzz':
        d = Math.max(shell(x, y, z, 0.004), below(y, z, hc[1] - 0.035, 0.45), -ears(x, y, z));
        break;
      case 'crew':
        d = smin(shell(x, y, z, 0.005), sdEllipsoid(x, y, z, [0, hc[1] + 0.058, hc[2] + 0.012], [0.068, 0.05, 0.088]), 0.012);
        d = Math.max(d, below(y, z, hc[1] - 0.035, 0.45), -ears(x, y, z));
        break;
      case 'sidepart':
        d = smin(shell(x, y, z, 0.011), sdEllipsoid(x, y, z, [-0.012, hc[1] + 0.068, hc[2] + 0.052], [0.074, 0.042, 0.052]), 0.02);
        d = Math.max(d, below(y, z, hc[1] - 0.042, 0.4), -ears(x, y, z));
        d = Math.max(d, -sdBox(x, y, z, [0.032, hc[1] + 0.115, hc[2] + 0.005], [0.0025, 0.03, 0.085])); // the parting
        break;
      case 'slicked':
        d = smin(shell(x, y, z, 0.009), sdEllipsoid(x, y, z, [0, hc[1] - 0.045, hc[2] - 0.06], [0.07, 0.06, 0.05]), 0.02);
        d = Math.max(d, below(y, z, hc[1] - 0.075, 0.6), -ears(x, y, z));
        break;
      case 'quiff': case 'pompadour': {
        const big = style === 'pompadour';
        d = smin(shell(x, y, z, 0.006), sdEllipsoid(x, y, z, [0, hc[1] + 0.07, hc[2] - (big ? 0.02 : 0)], [0.068, 0.048, big ? 0.095 : 0.085]), 0.015);
        d = smin(d, sdEllipsoid(x, y, z, [0, hc[1] + (big ? 0.108 : 0.095), hc[2] + 0.05], big ? [0.066, 0.058, 0.068] : [0.058, 0.045, 0.058]), 0.025);
        d = Math.max(d, below(y, z, hc[1] - 0.035, 0.45), -ears(x, y, z));
        break;
      }
      case 'undercut': {
        const top = Math.max(sdEllipsoid(x, y, z, [0, hc[1] + 0.03, hc[2] - 0.004], [0.084, 0.098, 0.104]), hc[1] + 0.035 - y);
        d = smin(shell(x, y, z, 0.003), top, 0.004);
        d = smin(d, sdEllipsoid(x, y, z, [0.018, hc[1] + 0.078, hc[2] + 0.055], [0.062, 0.03, 0.04]), 0.02); // swept fringe
        d = Math.max(d, below(y, z, hc[1] - 0.035, 0.45), -ears(x, y, z));
        break;
      }
      case 'spiky':
        d = shell(x, y, z, 0.008);
        for (const c of spikes) d = smin(d, primDist(c, x, y, z), 0.01);
        d = Math.max(d, below(y, z, hc[1] - 0.035, 0.45), -ears(x, y, z));
        break;
      case 'mohawk': {
        const crest = Math.max(sdEllipsoid(x, y, z, [0, hc[1] + 0.04, hc[2] - 0.012], [0.11, 0.155, 0.13]), Math.abs(x) - 0.02);
        d = smin(shell(x, y, z, 0.0015), crest, 0.012);
        d = Math.max(d, below(y, z, hc[1] - 0.03, 0.6), -ears(x, y, z));
        break;
      }
      case 'afro':
        d = smin(sdEllipsoid(x, y, z, [0, hc[1] + 0.035, hc[2] - 0.014], [0.132, 0.135, 0.135]), cap(x, y, z, 1.02), 0.02);
        d = Math.max(d, below(y, z, hc[1] - 0.075, 0.55));
        // A rounded opening for the face rather than the square cut below.
        d = Math.max(d, -sdEllipsoid(x, y, z, [0, hc[1] - 0.045, hc[2] + 0.125], [0.08, 0.105, 0.115]));
        break;
      case 'mullet':
        d = smin(cap(x, y, z, 1.0), sdEllipsoid(x, y, z, [0, hc[1] - 0.125, -0.07], [0.08, 0.125, 0.042]), 0.035);
        d = Math.max(d, below(y, z, hc[1] - 0.045, 0.4) - Math.max(0, -z - 0.02) * 6, below(y, z, hc[1] - 0.25, 0), -ears(x, y, z));
        break;
      case 'manbun':
        d = smin(shell(x, y, z, 0.007), sdEllipsoid(x, y, z, [0, hc[1] + 0.07, hc[2] - 0.098], [0.034, 0.032, 0.03]), 0.016);
        d = Math.max(d, below(y, z, hc[1] - 0.045, 0.45), -ears(x, y, z));
        break;
      default: // short, ponytail, bun, twintails
        d = cap(x, y, z, 1);
        d = Math.max(d, below(y, z, hc[1] - 0.045, style === 'ponytail' ? 0.6 : 0.4));
        if (style === 'bun') d = smin(d, sdEllipsoid(x, y, z, [0, hc[1] + 0.04, -0.105], [0.05, 0.045, 0.045]), 0.02);
    }
    if (style !== 'afro') d = Math.max(d, -face(x, y, z));
    if (bangs) {
      const bg = Math.max(sdEllipsoid(x, y, z, [0, hc[1] + 0.045, hc[2] + 0.083], [0.08, 0.04, 0.022]), below(y, z, hc[1] + 0.008, 0));
      d = smin(d, bg, 0.01);
    }
    return d;
  };
}

// Spikes radiating from the crown, as tapered cones.
function spikeCones(hc) {
  const out = [];
  const rings = [[0, 1], [20, 5], [38, 8], [56, 10], [74, 9]];
  for (const [deg, n] of rings) {
    for (let i = 0; i < n; i++) {
      const th = THREE.MathUtils.degToRad(deg), ph = (i / n) * Math.PI * 2 + deg * 0.05;
      const dir = new THREE.Vector3(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
      if (dir.z > 0.55 && dir.y < 0.7) continue; // keep the forehead clear
      const base = new THREE.Vector3(hc[0] + dir.x * 0.076, hc[1] + dir.y * 0.1, hc[2] + dir.z * 0.09);
      const tip = base.clone().add(dir.clone().add(new THREE.Vector3(0, 0.3, -0.3)).normalize().multiplyScalar(0.06 - 0.015 * (deg / 74)));
      out.push(cone('head', base.toArray(), tip.toArray(), 0.016, 0.0035, 0));
    }
  }
  return out;
}

// Facial hair in head-bone space.
function beardSDF(style) {
  const mouth = (x, y, z) => sdEllipsoid(x, y, z, [0, 0.042, 0.1], [0.021, 0.0075, 0.03]);
  const mustache = (x, y, z) => Math.min(
    sdEllipsoid(x, y, z, [0, 0.0535, 0.103], [0.027, 0.0078, 0.012]),
    ...[1, -1].map((s) => sdEllipsoid(x, y, z, [s * 0.023, 0.046, 0.098], [0.0072, 0.0115, 0.01])));
  return (x, y, z) => {
    if (style === 'mustache') return mustache(x, y, z);
    if (style === 'goatee') return Math.max(smin(mustache(x, y, z), sdEllipsoid(x, y, z, [0, 0.022, 0.087], [0.021, 0.024, 0.017]), 0.008), -mouth(x, y, z));
    const full = style === 'full';
    let d = sdEllipsoid(x, y, z, [0, 0.04, 0.032], full ? [0.072, 0.067, 0.079] : [0.067, 0.061, 0.076]);
    d = smin(d, full ? sdEllipsoid(x, y, z, [0, 0.01, 0.083], [0.042, 0.032, 0.032]) : sdEllipsoid(x, y, z, [0, 0.014, 0.08], [0.03, 0.022, 0.022]), 0.015);
    d = Math.max(d, y - (0.068 + 0.4 * Math.max(0, 0.03 - z))); // cheek line, up to the sideburns
    d = Math.max(d, -0.012 - z); // front of the ears
    d = Math.max(d, -0.03 + 0.4 * (0.06 - z) - y); // under the chin
    d = smin(d, mustache(x, y, z), 0.006);
    return Math.max(d, -mouth(x, y, z));
  };
}

function buildFeathers(side, s, j, W, attach, mat) {
  const geo = new THREE.SphereGeometry(1, 10, 6);
  // [bone index, feather count, length start, length end]
  const rows = [[0, 7, 0.16, 0.24], [1, 11, 0.26, 0.34], [2, 13, 0.38, 0.5]];
  for (const [bi, count, l0, l1] of rows) {
    const A = W(j[bi]), B = W(j[bi + 1]);
    const u = B.clone().sub(A).normalize();
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const base = A.clone().lerp(B, t);
      // Trailing direction: the bone direction rotated toward -Y, fanning out at the tip.
      const fan = bi === 2 ? THREE.MathUtils.lerp(90, 15, t ** 1.4) : 90 - 6 * t;
      const dir = u.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), -s * THREE.MathUtils.degToRad(fan));
      dir.z -= 0.15;
      dir.normalize();
      const len = THREE.MathUtils.lerp(l0, l1, t);
      for (const [layer, scale, w] of [[0, 1, 0.042], [1, 0.62, 0.046], [2, 0.32, 0.05]]) {
        const m = new THREE.Mesh(geo, mat);
        m.scale.set(w, (len * scale) / 2, 0.006);
        m.quaternion.setFromUnitVectors(Y, dir);
        attach(j[bi], m, base.clone().addScaledVector(dir, (len * scale) / 2).add(new THREE.Vector3(0, 0, layer * 0.007 - 0.002 * (i % 2))));
      }
    }
  }
}

function buildMembrane(side, s, j, b, W, seg, root, mat) {
  const w2 = W(j[2]);
  const F = [[0.3, -0.03, 0.02], [0.22, -0.3, 0], [0.05, -0.42, -0.01]].map(([x, y, z]) => w2.clone().add(new THREE.Vector3(s * x, y, z)));
  for (const f of F.slice(1)) seg(j[2], w2, f, 0.007, mat, 0.004);
  const scallop = (a, c, k = 0.22) => a.clone().add(c).multiplyScalar(0.5).lerp(w2, k);
  const B1 = new THREE.Vector3(s * 0.09, 1.3, -0.09), B2 = new THREE.Vector3(s * 0.085, 1.02, -0.075);
  const W0 = W(j[0]), W1 = W(j[1]);
  const M12 = scallop(F[0], F[1]), M23 = scallop(F[1], F[2]), M3B = F[2].clone().lerp(B2, 0.5).lerp(W1, 0.15);
  // vertex: [position, bone]
  const verts = [[B1, 'chest'], [B2, 'spine'], [W0, j[0]], [W1, j[1]], [w2, j[2]], [F[0], j[2]], [F[1], j[2]], [F[2], j[2]], [M12, j[2]], [M23, j[2]], [M3B, j[1]]];
  const [iB1, iB2, iW0, iW1, iW2, iF1, iF2, iF3, iM12, iM23, iM3B] = verts.map((_, i) => i);
  const tris = [iB1, iW0, iW1, iB1, iW1, iB2, iB2, iW1, iM3B, iW1, iF3, iM3B, iW1, iW2, iF3, iW2, iM23, iF3, iW2, iF2, iM23, iW2, iM12, iF2, iW2, iF1, iM12];
  const boneList = [...new Set(verts.map((v) => v[1]))];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts.flatMap((v) => v[0].toArray()), 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(verts.flatMap((v) => [boneList.indexOf(v[1]), 0, 0, 0]), 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(verts.flatMap(() => [1, 0, 0, 0]), 4));
  geo.setIndex(tris);
  geo.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(geo, mat);
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(boneList.map((n) => b[n])));
}
