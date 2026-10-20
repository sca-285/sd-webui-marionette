// Fashion and studio poses: solo model shots, female / male / unisex styling
// (bodypose.js format). Legs are built from a few helpers so the weight is
// always on one leg: the standing leg runs in under the body, the hips tilt
// down on the free side (roll −, weight left) and the chest tilts back the
// other way (spine roll +): a real contrapposto. Poses are written with the
// weight on the left and mirrored with mir() where both versions are useful.

const soft = 'Relaxed (soft)', elegant = 'Elegant (ballet)', flat = 'Open fingers together', sens = 'Sensual (soft curl)';

// ---- legs, weight on the LEFT leg (mir() gives the right-leg versions)
const standL = { leftUpperLeg: [-0.08, -1, 0.02], leftLowerLeg: [0, -1, 0] };
const softKneeL = { leftUpperLeg: [-0.07, -1, 0.16], leftLowerLeg: [0, -1, -0.08] };
const free = {
  // relaxed: knee forward and in, foot on its toes beside the standing foot
  relaxed: { rightUpperLeg: [0.12, -1, 0.3], rightLowerLeg: [-0.04, -1, -0.22], rightFoot: [0.08, -0.65, 0.75] },
  // crossed over in front of the standing leg, toes down
  cross: { rightUpperLeg: [0.24, -1, 0.14], rightLowerLeg: [0.1, -1, -0.04], rightFoot: [0.15, -0.55, 0.82] },
  // ankle cross: crossed lower down, both feet near
  ankle: { rightUpperLeg: [0.2, -1, 0.08], rightLowerLeg: [0.2, -1, 0.0], rightFoot: [0.15, -0.4, 0.9] },
  // knee turned in, toe in
  kneeIn: { rightUpperLeg: [0.22, -1, 0.36], rightLowerLeg: [-0.16, -1, -0.26], rightFoot: [0.32, -0.62, 0.72] },
  // stepped forward, heel down
  step: { rightUpperLeg: [-0.06, -1, 0.36], rightLowerLeg: [0, -1, 0.12], rightFoot: [-0.05, 0.1, 1] },
  // out to the side
  side: { rightUpperLeg: [-0.3, -1, 0.04], rightLowerLeg: [-0.08, -1, 0], rightFoot: [-0.3, -0.1, 0.95] },
  // back, on the ball of the foot
  back: { rightUpperLeg: [-0.06, -1, -0.18], rightLowerLeg: [0, -0.9, -0.42], rightFoot: [0, -0.8, 0.6] },
  // bent knee lifted (pin-up flick)
  flick: { rightUpperLeg: [0.12, -0.75, 0.4], rightLowerLeg: [0.05, -0.55, -0.85], rightFoot: [0, -0.8, -0.3] },
};
const legsL = (f = 'relaxed', standing = standL) => ({ ...standing, ...free[f] });
const maleWide = { leftUpperLeg: [0.3, -1, 0.02], leftLowerLeg: [0.08, -1, 0], rightUpperLeg: [-0.3, -1, 0.02], rightLowerLeg: [-0.08, -1, 0] };
const maleLean = { leftUpperLeg: [-0.02, -1, 0.04], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.16, -1, 0.14], rightLowerLeg: [-0.03, -1, -0.03], rightFoot: [-0.25, -0.1, 0.96] };

// ---- hands on the body (left versions; mir() swaps)
const hipL = { at: 'hips', off: [0.16, 0.11, 0.0], pole: [1, 0, -0.5] };
const hipR = { at: 'hips', off: [-0.16, 0.11, 0.0], pole: [-1, 0, -0.5] };
const pocketL = { at: 'hips', off: [0.17, -0.03, 0.05], pole: [0.8, 0, -0.8] };
const pocketR = { at: 'hips', off: [-0.17, -0.03, 0.05], pole: [-0.8, 0, -0.8] };
const backPocketL = { at: 'hips', off: [0.11, -0.04, -0.1], pole: [0.8, 0, 0.2] };
const backPocketR = { at: 'hips', off: [-0.11, -0.04, -0.1], pole: [-0.8, 0, 0.2] };
const thighL = { at: 'leftUpperLeg', off: [0.07, -0.14, 0.06], pole: [1, 0, -0.5] };
const thighR = { at: 'rightUpperLeg', off: [-0.07, -0.14, 0.06], pole: [-1, 0, -0.5] };
const hairL = { at: 'head', off: [0.08, 0.1, -0.03], pole: [1, 0.5, 0.1] };
const hairR = { at: 'head', off: [-0.08, 0.1, -0.03], pole: [-1, 0.5, 0.1] };
const napeL = { at: 'neck', off: [0.05, 0.03, -0.06], pole: [1, 0.6, -0.2] };
const napeR = { at: 'neck', off: [-0.05, 0.03, -0.06], pole: [-1, 0.6, -0.2] };
const chinR = { at: 'head', off: [-0.02, -0.02, 0.1], pole: [-0.6, -1, 0.3] };
const crossedArms = { leftUpperArm: [0.32, -0.9, 0.28], leftLowerArm: [-0.95, 0.1, 0.3], rightUpperArm: [-0.32, -0.9, 0.3], rightLowerArm: [0.95, 0.16, 0.26] };
const hangL = { leftUpperArm: [0.2, -1, 0.04], leftLowerArm: [0.08, -1, 0.16] };
const hangR = { rightUpperArm: [-0.2, -1, 0.04], rightLowerArm: [-0.08, -1, 0.16] };

// ---- mirror a pose left <-> right
const swapKey = (k) => (k.startsWith('left') ? 'right' + k.slice(4) : k.startsWith('right') ? 'left' + k.slice(5) : k);
const mv = (v) => (Array.isArray(v) && v.length === 3 && typeof v[0] === 'number' ? [-v[0], v[1], v[2]] : v);
const mAng = (a) => (a ? [a[0], -(a[1] || 0), -(a[2] || 0)] : a);
function mirBody(b) {
  const o = { ...b };
  for (const k of ['hips', 'spine', 'neck', 'head']) if (b[k]) o[k] = mAng(b[k]);
  for (const k of ['arms', 'legs']) if (b[k]) o[k] = Object.fromEntries(Object.entries(b[k]).map(([n, v]) => [swapKey(n), mv(v)]));
  for (const k of ['shoulders', 'hands', 'wrist', 'forearm']) {
    if (b[k]) o[k] = Object.fromEntries(Object.entries(b[k]).map(([s, v]) => [s === 'left' ? 'right' : s === 'right' ? 'left' : s, v]));
  }
  if (b.ik) {
    o.ik = Object.fromEntries(Object.entries(b.ik).map(([n, t]) => [swapKey(n), { ...t, at: swapKey(t.at || 'chest'), off: mv(t.off), pole: t.pole && mv(t.pole) }]));
  }
  if (b.support) o.support = [b.support[0], b.support[1], mv(b.support[2]), -(b.support[3] || 0)];
  return o;
}
const mir = (p, name) => ({ ...p, name, body: mirBody(p.body) });

// ------------------------------------------------------------------ female
const F = [
  { name: 'Classic S-curve', tags: ['female', 'model', 's-curve', 'contrapposto'], body: {
    hips: [0, 0, -15], spine: [-4, -10, 19], neck: [0, 0, -4], head: [4, -12, -10], shoulders: { right: [-6, 0] },
    ik: { leftHand: hipL }, wrist: { left: [-10, 0] }, arms: hangR,
    legs: legsL('kneeIn', softKneeL), hands: { left: flat, right: elegant } } },
  { name: 'Hip pop, both hands on hips', tags: ['female', 'model', 'hip pop'], body: {
    hips: [0, 0, -14], spine: [-3, 6, 18], neck: [0, 0, -6], head: [6, 14, -8],
    ik: { leftHand: hipL, rightHand: hipR }, wrist: { left: [-10, 0], right: [-10, 0] },
    legs: legsL('side'), hands: { left: flat, right: flat } } },
  { name: 'Over-the-shoulder look', tags: ['female', 'model', 'look back'], body: {
    hips: [0, 0, -8], spine: [-2, -38, 8], neck: [0, -28, 0], head: [8, -42, -10], shoulders: { left: [10, 0] },
    arms: { leftUpperArm: [0.08, -1, 0.2], leftLowerArm: [-0.2, -0.9, 0.4], ...hangR },
    legs: legsL('back'), hands: { left: soft, right: elegant } } },
  { name: 'Runway walk', tags: ['female', 'catwalk', 'walk', 'model'], body: {
    hips: [0, 8, -8], spine: [-4, -14, 8], head: [-2, 6, 0],
    arms: { leftUpperArm: [0.22, -1, -0.28], leftLowerArm: [0.1, -1, -0.05], rightUpperArm: [-0.12, -1, 0.32], rightLowerArm: [0.02, -0.9, 0.45] },
    legs: { leftUpperLeg: [-0.02, -1, -0.22], leftLowerLeg: [0, -0.92, -0.4], leftFoot: [0, -0.75, 0.66], rightUpperLeg: [0.1, -1, 0.3], rightLowerLeg: [0.06, -1, 0.1] },
    feet: 'free', hands: { left: soft, right: soft } } },
  { name: 'Runway pause, hand on hip', tags: ['female', 'catwalk', 'model'], body: {
    hips: [0, 0, -12], spine: [-3, 8, 14], head: [-2, 8, -4],
    ik: { rightHand: hipR }, wrist: { right: [-10, 0] }, arms: hangL,
    legs: legsL('cross'), hands: { left: soft, right: flat } } },
  { name: 'Hands in hair, head back', tags: ['female', 'model', 'hair', 'beauty'], body: {
    hips: [-4, 0, -10], spine: [-12, 0, 12], neck: [-8, 0, 0], head: [-14, 8, -10],
    ik: { leftHand: hairL, rightHand: hairR },
    legs: legsL('kneeIn', softKneeL), hands: { left: 'Grasping (gripping fabric)', right: soft } } },
  { name: 'Hand in hair, hand on thigh', tags: ['female', 'model', 'hair'], body: {
    hips: [0, 0, -12], spine: [-4, -8, 14], neck: [0, 0, -6], head: [-6, -10, -12],
    ik: { leftHand: hairL, rightHand: thighR },
    legs: legsL('flick'), feet: 'flat', hands: { left: soft, right: flat } } },
  { name: 'Hand on collarbone, shoulder up', tags: ['female', 'model', 'beauty', 'portrait'], body: {
    hips: [0, 0, -8], spine: [0, -14, 8], neck: [6, 0, 0], head: [12, -24, -12], shoulders: { right: [14, 6] },
    ik: { rightHand: { at: 'chest', off: [0.05, 0.08, 0.1], pole: [-0.6, -1, 0.3] } }, arms: hangL,
    legs: legsL('relaxed'), hands: { left: soft, right: elegant } } },
  { name: 'Ankle cross, arms folded', tags: ['female', 'model', 'crossed legs', 'casual'], body: {
    hips: [0, 0, -6], spine: [0, -8, 8], head: [6, -10, -8],
    arms: crossedArms, legs: legsL('ankle'), hands: { left: soft, right: soft } } },
  { name: 'Knees in, toes in (cute)', tags: ['female', 'cute', 'shy'], body: {
    hips: [6, 0, -6], spine: [6, 0, 6], neck: [6, 0, 0], head: [10, 6, -14], shoulders: { left: [10, 6], right: [10, 6] },
    arms: { leftUpperArm: [0.05, -1, 0.2], leftLowerArm: [-0.4, -0.85, 0.35], rightUpperArm: [-0.05, -1, 0.2], rightLowerArm: [0.4, -0.85, 0.35] },
    legs: { leftUpperLeg: [-0.06, -1, 0.14], leftLowerLeg: [0.06, -1, -0.06], rightUpperLeg: [0.16, -1, 0.26], rightLowerLeg: [-0.12, -1, -0.18], rightFoot: [0.35, -0.6, 0.7] },
    hands: { left: soft, right: soft } } },
  { name: 'Arched back, hands on lower back', tags: ['female', 'model', 'arched'], body: {
    hips: [-6, 0, -8], spine: [-18, 0, 10], neck: [-6, 0, 0], head: [-4, 15, -8], shoulders: { left: [0, -12], right: [0, -12] },
    ik: { leftHand: backPocketL, rightHand: backPocketR },
    legs: legsL('relaxed', softKneeL), hands: { left: flat, right: flat } } },
  { name: 'Hand framing the face', tags: ['female', 'beauty', 'portrait'], body: {
    hips: [0, 0, -10], spine: [0, -6, 12], neck: [4, 0, -6], head: [8, -14, -16],
    ik: { rightHand: { at: 'head', off: [-0.07, -0.02, 0.08], pole: [-0.5, -1, 0.2] } }, wrist: { right: [-20, 0] }, arms: hangL,
    legs: legsL('kneeIn'), hands: { left: soft, right: 'Peace (closed)' } } },
  { name: 'Arm up, hand on head, hip out', tags: ['female', 'model', 'pinup'], body: {
    hips: [0, 0, -14], spine: [-6, -6, 18], neck: [0, 0, -4], head: [2, -10, -10],
    ik: { leftHand: { at: 'head', off: [0.02, 0.14, -0.02], pole: [1, 0.4, 0] }, rightHand: thighR },
    legs: legsL('relaxed'), hands: { left: soft, right: flat } } },
  { name: 'Shy, holding the other arm', tags: ['female', 'shy', 'cute'], body: {
    hips: [4, 0, -6], spine: [6, 10, 6], neck: [8, 0, 0], head: [14, 12, -8], shoulders: { left: [8, 8] },
    arms: { leftUpperArm: [0.1, -1, 0.12], leftLowerArm: [-0.3, -0.92, 0.25] },
    ik: { rightHand: { at: 'leftLowerArm', off: [0.0, 0.02, 0.04], pole: [-0.6, -1, 0.3] } },
    legs: legsL('kneeIn'), hands: { left: soft, right: soft } } },
  { name: 'Twisted look back (shoot from behind)', tags: ['female', 'model', 'back'], body: {
    hips: [0, 0, -10], spine: [-6, -55, 12], neck: [0, -20, 0], head: [6, -40, -6],
    ik: { leftHand: hipL }, arms: hangR,
    legs: legsL('back'), hands: { left: flat, right: elegant } } },
  { name: 'Twirl', tags: ['female', 'dance', 'dynamic', 'dress'], body: {
    hips: [0, 0, -6], spine: [-6, 25, 8], head: [-8, 25, -10],
    arms: { leftUpperArm: [0.95, 0.15, -0.1], leftLowerArm: [0.9, 0.35, 0.05], rightUpperArm: [-0.9, 0.05, 0.25], rightLowerArm: [-0.6, 0.2, 0.75] },
    legs: { leftUpperLeg: [-0.04, -1, 0.04], leftLowerLeg: [0, -1, 0], leftFoot: [0, -0.6, 0.8], rightUpperLeg: [-0.08, -0.85, -0.3], rightLowerLeg: [0.05, -0.2, -0.98], rightFoot: [0, 0.2, -0.95] },
    feet: 'free', hands: { left: elegant, right: elegant } } },
  { name: 'Fashion jump', tags: ['female', 'jump', 'dynamic'], body: {
    hips: [-6, 0, -8], spine: [-14, 8, 10], head: [-10, 10, -6],
    arms: { leftUpperArm: [0.6, 0.8, 0.0], leftLowerArm: [0.4, 0.9, 0.1], rightUpperArm: [-0.85, 0.2, 0.3], rightLowerArm: [-0.5, -0.1, 0.85] },
    legs: { leftUpperLeg: [0.05, -0.9, 0.42], leftLowerLeg: [0.02, -0.4, -0.92], rightUpperLeg: [-0.08, -1, -0.25], rightLowerLeg: [0, -0.3, -0.95] },
    feet: 'free', lift: 0.45, hands: { left: 'Open spread', right: elegant } } },
  { name: 'Editorial squat', tags: ['female', 'squat', 'editorial'], body: {
    hips: [12, 0, -6], spine: [-6, -10, 8], neck: [-6, 0, 0], head: [6, -14, -10],
    ik: { leftHand: { at: 'leftLowerLeg', off: [0.0, 0.07, 0.05], pole: [0.6, 0, 0.5] } },
    arms: { rightUpperArm: [-0.45, -0.6, 0.65], rightLowerArm: [0.2, -0.35, 0.9] },
    legs: { leftUpperLeg: [0.45, -0.3, 0.85], leftLowerLeg: [0.05, -1, -0.12], rightUpperLeg: [-0.4, -0.55, 0.72], rightLowerLeg: [0.0, -0.95, -0.35], rightFoot: [0, -0.6, 0.8] },
    hands: { left: flat, right: soft } } },
  { name: 'Kneeling, hand in hair', tags: ['female', 'kneeling', 'editorial'], body: {
    hips: [-4, 0, -6], spine: [-10, -12, 10], neck: [-4, 0, 0], head: [-6, -16, -10],
    ik: { leftHand: hairL, rightHand: thighR },
    legs: { leftUpperLeg: [0.12, -1, 0.12], leftLowerLeg: [0.04, -0.05, -1], rightUpperLeg: [-0.12, -0.15, 1], rightLowerLeg: [-0.03, -1, 0.04] },
    feet: 'free', hands: { left: soft, right: flat } } },
  { name: 'Floor, legs to the side', tags: ['female', 'sitting', 'floor', 'editorial'], body: {
    hips: [-10, 25, -18], spine: [6, -25, 22], head: [10, -25, -6], legsIn: 'world', armsIn: 'world',
    arms: { rightUpperArm: [-0.12, -0.9, 0.42], rightLowerArm: [0.5, -0.5, 0.7] },
    ik: { leftHand: { at: 'leftUpperLeg', off: [-0.02, 0.05, 0.16], pole: [1, 0, -0.4] } },
    legs: { leftUpperLeg: [-0.38, -0.12, 0.92], leftLowerLeg: [-0.7, -0.1, -0.7], rightUpperLeg: [-0.55, -0.1, 0.83], rightLowerLeg: [-0.8, -0.08, -0.6] },
    feet: 'free', hands: { left: 'Open flat', right: soft } } },
  { name: 'Lying, chin on hands, feet up', tags: ['female', 'lying', 'editorial', 'cute'], body: {
    hips: [90, 0, 0], spine: [-30, 0, 0], neck: [-14, 0, 0], head: [-8, 15, -10],
    ik: { leftHand: { at: 'head', off: [0.04, -0.1, 0.07], pole: [0.5, -1, 0] }, rightHand: { at: 'head', off: [-0.04, -0.1, 0.07], pole: [-0.5, -1, 0] } },
    legs: { leftUpperLeg: [0.07, -1, 0], leftLowerLeg: [0, 0.2, -0.98], rightUpperLeg: [-0.07, -1, 0], rightLowerLeg: [0, -0.4, -0.92] },
    feet: 'free', hands: { left: soft, right: soft } } },
  { name: 'Foot on a crate, lean on knee', tags: ['female', 'model', 'crate', 'lean'], body: {
    hips: [10, 0, -4], spine: [16, -10, 6], neck: [-14, 0, 0], head: [-10, -10, -6],
    ik: { leftHand: { at: 'leftLowerLeg', off: [-0.02, 0.09, 0.0], pole: [0.8, 0, 0] }, rightHand: { at: 'leftLowerLeg', off: [0.02, 0.07, 0.06], pole: [-0.6, 0, 0.6] },
      leftFoot: { at: 'support', off: [0, 0.06, -0.08], pole: [0.1, 0.3, 1] } },
    legs: { leftUpperLeg: [0.08, -0.05, 1], leftLowerLeg: [0.02, -1, 0.0], rightUpperLeg: [-0.08, -1, -0.15], rightLowerLeg: [0, -1, -0.05] },
    hands: { left: flat, right: soft }, support: ['Furniture', 'Crate', [0.1, 0, 0.6], 0] } },
  { name: 'Stool, legs crossed', tags: ['female', 'stool', 'sitting', 'crossed legs'], body: {
    spine: [-4, -8, 6], head: [6, -10, -8], feet: 'free',
    ik: { leftHand: { at: 'rightUpperLeg', off: [0.04, 0.03, 0.12], pole: [0.6, -0.6, -0.4] }, rightHand: { at: 'rightUpperLeg', off: [-0.03, 0.03, 0.18], pole: [-0.6, -0.6, 0] } },
    legs: { leftUpperLeg: [0.1, -0.3, 1], leftLowerLeg: [0.0, -0.95, -0.3], leftFoot: [0, -0.6, 0.8], rightUpperLeg: [0.18, 0.1, 1], rightLowerLeg: [0.12, -0.92, 0.3], rightFoot: [0.1, -0.6, 0.8] },
    hands: { left: soft, right: elegant }, support: ['Furniture', 'Stool', [0, 0, -0.02], 0] } },
  { name: 'Chair, leg over knee', tags: ['female', 'chair', 'sitting', 'crossed legs'], body: {
    spine: [-4, 10, -6], head: [4, -12, 8], feet: 'free',
    ik: { rightHand: { at: 'rightUpperLeg', off: [-0.02, 0.04, 0.2], pole: [-0.6, -0.6, 0] } },
    arms: { leftUpperArm: [0.2, -0.95, -0.2], leftLowerArm: [0.15, -0.95, 0.2] },
    legs: { leftUpperLeg: [0.1, -0.05, 1], leftLowerLeg: [0.02, -1, 0.06], rightUpperLeg: [0.14, 0.25, 0.95], rightLowerLeg: [0.12, -0.85, 0.45], rightFoot: [0.1, -0.5, 0.85] },
    hands: { left: soft, right: soft }, support: ['Furniture', 'Chair', [0, 0, -0.03], 0] } },
  { name: 'Wall, shoulder lean, ankles crossed', tags: ['female', 'wall', 'lean'], body: {
    hips: [0, 0, -9], spine: [0, 0, -7], head: [4, 18, 10],
    arms: crossedArms,
    legs: { leftUpperLeg: [-0.08, -1, 0.12], leftLowerLeg: [-0.14, -1, 0.04], rightUpperLeg: [0.14, -1, 0.06], rightLowerLeg: [0.06, -1, 0.02], rightFoot: [-0.1, -0.4, 0.9] },
    hands: { left: soft, right: soft }, support: ['Room', 'Wall', [-0.385, 0, 0], 90] } },
  { name: 'Wall, foot up, head back', tags: ['female', 'wall', 'lean', 'cool'], body: {
    hips: [-6, 0, -6], spine: [-4, 0, 6], neck: [-8, 0, 0], head: [-10, 20, -8],
    ik: { leftHand: hairL }, arms: { rightUpperArm: [-0.3, -0.95, -0.12], rightLowerArm: [0.12, -1, 0.1] },
    legs: { leftUpperLeg: [0.08, -1, 0.22], leftLowerLeg: [0.04, -1, 0.1], rightUpperLeg: [-0.06, -0.9, 0.4], rightLowerLeg: [0, -0.6, -0.8], rightFoot: [0, -1, 0.1] },
    feet: 'flat', hands: { left: soft, right: flat }, support: ['Room', 'Wall', [0, 0, -0.29], 0] } },
  { name: 'Beauty stretch, arms up', tags: ['female', 'beauty', 'stretch'], body: {
    hips: [0, 0, -10], spine: [-10, -6, 12], neck: [-4, 0, 0], head: [-8, -10, -14],
    arms: { leftUpperArm: [0.25, 1, -0.05], leftLowerArm: [-0.55, 0.8, 0.0], rightUpperArm: [-0.3, 0.95, -0.05], rightLowerArm: [0.6, 0.75, 0.05] },
    legs: legsL('cross'), hands: { left: elegant, right: elegant } } },
  { name: 'Walking towards camera', tags: ['female', 'walk', 'street'], body: {
    hips: [0, -8, -6], spine: [-2, 12, 6], head: [0, -6, -4],
    arms: { leftUpperArm: [0.18, -1, 0.32], leftLowerArm: [0.05, -0.85, 0.5], rightUpperArm: [-0.2, -1, -0.25], rightLowerArm: [-0.1, -1, -0.02] },
    legs: { leftUpperLeg: [-0.06, -1, 0.3], leftLowerLeg: [0, -1, 0.06], rightUpperLeg: [0.08, -1, -0.22], rightLowerLeg: [0, -0.9, -0.42], rightFoot: [0, -0.75, 0.66] },
    hands: { left: soft, right: soft } } },
  { name: 'Contrapposto, hand on thigh', tags: ['female', 'contrapposto', 'model'], body: {
    hips: [0, 0, -12], spine: [-2, 6, 14], neck: [0, 0, -4], head: [4, 10, -8],
    ik: { rightHand: thighR }, arms: { leftUpperArm: [0.3, -0.95, -0.05], leftLowerArm: [0.1, -1, 0.1] },
    legs: legsL('relaxed', softKneeL), hands: { left: elegant, right: flat } } },
  { name: 'Angular arms, hands on head', tags: ['female', 'editorial', 'angular'], body: {
    hips: [0, 0, -10], spine: [-4, -8, 12], head: [6, -10, -6],
    ik: { leftHand: { at: 'head', off: [0.03, 0.15, 0.0], pole: [1, 0.2, 0.3] }, rightHand: { at: 'head', off: [-0.03, 0.15, -0.02], pole: [-1, 0.2, -0.3] } },
    legs: legsL('side'), hands: { left: flat, right: flat } } },
  { name: 'Pin-up knee flick', tags: ['female', 'pinup', 'retro'], body: {
    hips: [4, 0, -12], spine: [-8, 10, 14], neck: [0, 0, -4], head: [6, 18, -10],
    ik: { leftHand: hipL, rightHand: { at: 'head', off: [-0.07, 0.04, 0.06], pole: [-1, 0, 0.3] } },
    legs: legsL('flick'), feet: 'flat', hands: { left: flat, right: elegant } } },
  { name: 'Hand on neck, looking down', tags: ['female', 'model', 'moody'], body: {
    hips: [0, 0, -8], spine: [4, -10, 10], neck: [10, 0, 0], head: [16, -14, -12],
    ik: { leftHand: napeL }, arms: hangR,
    legs: legsL('ankle'), hands: { left: soft, right: soft } } },
];

// ------------------------------------------------------------------ male
const M = [
  { name: 'Wide power stance', tags: ['male', 'power', 'confident'], body: {
    spine: [-8, 0, 0], neck: [-4, 0, 0], head: [-6, 0, 0], shoulders: { left: [0, -10], right: [0, -10] },
    arms: { leftUpperArm: [0.32, -1, -0.02], leftLowerArm: [0.12, -1, 0.1], rightUpperArm: [-0.32, -1, -0.02], rightLowerArm: [-0.12, -1, 0.1] },
    legs: maleWide, hands: { left: 'Loose fist', right: 'Loose fist' } } },
  { name: 'Hands in pockets, weight on one leg', tags: ['male', 'casual', 'pockets'], body: {
    hips: [0, 0, -6], spine: [-4, -8, 8], head: [4, -12, -4],
    ik: { leftHand: pocketL, rightHand: pocketR }, wrist: { left: [0, 0], right: [0, 0] },
    legs: maleLean, hands: { left: 'Loose fist', right: 'Loose fist' } } },
  { name: 'Thumbs in pockets, head tilt', tags: ['male', 'casual', 'cool'], body: {
    hips: [0, 0, -8], spine: [-4, 8, 10], neck: [2, 0, 0], head: [6, 14, 8],
    ik: { leftHand: { ...pocketL, off: [0.16, 0.02, 0.07] }, rightHand: { ...pocketR, off: [-0.16, 0.02, 0.07] } },
    legs: legsL('side', softKneeL), hands: { left: 'Fist (thumb up)', right: 'Fist (thumb up)' } } },
  { name: 'Arms crossed, leaning on one leg', tags: ['male', 'arms crossed', 'confident'], body: {
    hips: [0, 0, -6], spine: [-6, -6, 8], head: [-4, -10, 4],
    arms: crossedArms, legs: maleLean, hands: { left: 'Loose fist', right: 'Loose fist' } } },
  { name: 'Checking the watch', tags: ['male', 'suit', 'watch'], body: {
    hips: [0, 0, -5], spine: [6, 10, 4], neck: [8, 0, 0], head: [18, 10, 0],
    arms: { leftUpperArm: [0.25, -0.85, 0.45], leftLowerArm: [-0.75, 0.25, 0.6] },
    ik: { rightHand: { at: 'leftHand', off: [-0.08, 0.0, 0.02], pole: [-1, -0.5, 0] } }, forearm: { left: 70 },
    legs: maleLean, hands: { left: 'Loose fist', right: 'Pinch (pads)' } } },
  { name: 'Adjusting the cuff', tags: ['male', 'suit', 'cuff'], body: {
    hips: [0, 0, -5], spine: [4, -14, 4], neck: [6, 0, 0], head: [14, -18, 0],
    arms: { rightUpperArm: [-0.25, -0.85, 0.45], rightLowerArm: [0.55, 0.15, 0.82] },
    ik: { leftHand: { at: 'rightHand', off: [0.09, 0.02, 0.03], pole: [1, -0.5, 0] } },
    legs: legsL('step'), hands: { left: 'Pinch (pads)', right: 'Relaxed' } } },
  { name: 'Collar pop', tags: ['male', 'jacket', 'cool'], body: {
    hips: [0, 0, -4], spine: [-6, 0, 4], neck: [-6, 0, 0], head: [-8, 10, 0],
    ik: { leftHand: { at: 'neck', off: [0.07, 0.0, 0.03], pole: [1, -0.4, 0] }, rightHand: { at: 'neck', off: [-0.07, 0.0, 0.03], pole: [-1, -0.4, 0] } },
    legs: maleLean, hands: { left: 'Pinch (pads)', right: 'Pinch (pads)' } } },
  { name: 'Adjusting the lapels', tags: ['male', 'suit', 'jacket'], body: {
    spine: [-4, 0, 0], neck: [-2, 0, 0], head: [-4, 6, 0],
    ik: { leftHand: { at: 'chest', off: [0.08, -0.02, 0.12], pole: [1, -1, 0] }, rightHand: { at: 'chest', off: [-0.08, -0.02, 0.12], pole: [-1, -1, 0] } },
    wrist: { left: [-30, 0], right: [-30, 0] },
    legs: legsL('step'), hands: { left: 'Grasping (gripping fabric)', right: 'Grasping (gripping fabric)' } } },
  { name: 'Hand through hair, looking down', tags: ['male', 'moody', 'hair'], body: {
    hips: [0, 0, -6], spine: [6, -10, 8], neck: [10, 0, 0], head: [20, -12, 0],
    ik: { leftHand: hairL, rightHand: pocketR },
    legs: maleLean, hands: { left: 'Grasping (gripping fabric)', right: 'Loose fist' } } },
  { name: 'Looking down cool, heel forward', tags: ['male', 'cool', 'pockets'], body: {
    hips: [0, 0, -5], spine: [8, 8, 4], neck: [12, 0, 0], head: [16, 10, 0],
    ik: { leftHand: pocketL, rightHand: pocketR },
    legs: { ...standL, rightUpperLeg: [-0.1, -1, 0.3], rightLowerLeg: [-0.02, -1, 0.2], rightFoot: [-0.1, 0.35, 0.93] },
    hands: { left: 'Loose fist', right: 'Loose fist' } } },
  { name: 'Jacket over the shoulder, walking', tags: ['male', 'walk', 'jacket'], body: {
    hips: [0, -8, -5], spine: [-4, 12, 6], head: [-2, -8, 0],
    ik: { rightHand: { at: 'chest', off: [-0.14, 0.2, -0.04], pole: [-1, -0.4, 0.4] }, leftHand: pocketL },
    legs: { leftUpperLeg: [0.02, -1, 0.3], leftLowerLeg: [0, -1, 0.08], rightUpperLeg: [-0.06, -1, -0.22], rightLowerLeg: [0, -0.9, -0.42], rightFoot: [0, -0.75, 0.66] },
    hands: { left: 'Loose fist', right: 'Fist' } } },
  { name: 'Walking, hands in pockets', tags: ['male', 'walk', 'street', 'pockets'], body: {
    hips: [0, 8, -4], spine: [2, -10, 4], head: [6, 6, 0],
    ik: { leftHand: pocketL, rightHand: pocketR },
    legs: { leftUpperLeg: [0.04, -1, -0.24], leftLowerLeg: [0, -0.9, -0.42], leftFoot: [0, -0.75, 0.66], rightUpperLeg: [-0.04, -1, 0.3], rightLowerLeg: [0, -1, 0.06] },
    feet: 'free', hands: { left: 'Loose fist', right: 'Loose fist' } } },
  { name: 'Streetwear squat', tags: ['male', 'squat', 'street'], body: {
    hips: [32, 0, 0], spine: [4, 0, 0], neck: [-18, 0, 0], head: [-12, 8, 0],
    arms: { leftUpperArm: [0.3, -0.75, 0.6], leftLowerArm: [-0.3, -0.4, 0.86], rightUpperArm: [-0.3, -0.75, 0.6], rightLowerArm: [0.3, -0.45, 0.84] },
    legs: { leftUpperLeg: [0.55, -0.05, 0.83], leftLowerLeg: [0.06, -1, -0.28], rightUpperLeg: [-0.55, -0.05, 0.83], rightLowerLeg: [-0.06, -1, -0.28] },
    hands: { left: 'Relaxed', right: 'Loose fist' } } },
  { name: 'One-knee crouch, forearm on knee', tags: ['male', 'crouch', 'sneaker'], body: {
    hips: [10, 0, 0], spine: [12, -10, 0], neck: [-14, 0, 0], head: [-6, -6, 0],
    ik: { rightHand: { at: 'rightLowerLeg', off: [0.02, 0.1, 0.06], pole: [-0.6, 0, 0.6] } },
    arms: { leftUpperArm: [0.3, -0.9, 0.3], leftLowerArm: [0.05, -0.95, 0.35] },
    legs: { rightUpperLeg: [-0.12, -0.2, 1], rightLowerLeg: [-0.02, -1, -0.05], leftUpperLeg: [0.12, -1, -0.05], leftLowerLeg: [0.02, -0.05, -1] },
    feet: 'free', hands: { left: 'Relaxed', right: 'Relaxed' } } },
  { name: 'Kneeling, fist on the ground', tags: ['male', 'kneeling', 'hero'], body: {
    hips: [20, 0, 0], spine: [18, 0, 0], neck: [-25, 0, 0], head: [-20, 0, 0], armsIn: 'world',
    ik: { leftHand: { at: 'leftLowerLeg', off: [-0.02, 0.1, 0.0], pole: [0.6, 0, -0.4] } },
    arms: { rightUpperArm: [-0.2, -1, 0.3], rightLowerArm: [-0.05, -1, 0.1] },
    legs: { leftUpperLeg: [0.12, -0.15, 1], leftLowerLeg: [0.02, -1, 0.0], rightUpperLeg: [-0.14, -1, -0.15], rightLowerLeg: [-0.02, -0.05, -1] },
    feet: 'free', hands: { left: 'Relaxed', right: 'Fist' } } },
  { name: 'Floor, one knee up, arm on knee', tags: ['male', 'sitting', 'floor', 'casual'], body: {
    hips: [-15, 0, 0], spine: [5, 0, 0], head: [5, -15, 0], legsIn: 'world',
    ik: { rightHand: { at: 'rightLowerLeg', off: [0.04, 0.12, 0.1], pole: [-0.6, 0, -0.2] }, leftHand: { at: 'hips', off: [0.2, -0.08, -0.25], pole: [0.6, 0.3, 0.6] } },
    legs: { rightUpperLeg: [-0.1, 0.85, 0.52], rightLowerLeg: [0, -1, -0.12], leftUpperLeg: [0.15, 0.03, 1], leftLowerLeg: [-0.25, 0.02, 0.97] },
    feet: 'free', hands: { left: 'Open flat', right: 'Relaxed' } } },
  { name: 'Stool, one foot down', tags: ['male', 'stool', 'sitting'], body: {
    spine: [2, 8, 0], head: [4, -10, 0], feet: 'free',
    ik: { leftHand: { at: 'leftUpperLeg', off: [0.04, 0.03, 0.2], pole: [0.6, -0.6, 0] }, rightHand: { at: 'rightUpperLeg', off: [-0.03, 0.04, 0.15], pole: [-0.8, -0.6, 0] } },
    legs: { leftUpperLeg: [0.2, -0.25, 1], leftLowerLeg: [0.02, -0.9, -0.4], leftFoot: [0, -0.4, 0.9], rightUpperLeg: [-0.25, -0.6, 0.75], rightLowerLeg: [-0.05, -1, 0.12], rightFoot: [0, -0.15, 1] },
    hands: { left: 'Relaxed', right: 'Relaxed' }, support: ['Furniture', 'Stool', [0, 0, -0.02], 0] } },
  { name: 'Backwards on a chair, arms on the backrest', tags: ['male', 'chair', 'sitting', 'casual'], body: {
    hips: [10, 0, 0], spine: [6, 0, 0], head: [-4, -10, 0], feet: 'flat',
    ik: { leftHand: { at: 'hips', off: [-0.08, 0.44, 0.3], pole: [1, -0.4, 0] }, rightHand: { at: 'hips', off: [0.08, 0.46, 0.3], pole: [-1, -0.4, 0] } },
    legs: { leftUpperLeg: [0.5, -0.12, 0.86], leftLowerLeg: [0.08, -1, 0], rightUpperLeg: [-0.5, -0.12, 0.86], rightLowerLeg: [-0.08, -1, 0] },
    hands: { left: 'Relaxed', right: 'Loose fist' }, support: ['Furniture', 'Chair', [0, 0, 0.06], 180] } },
  { name: 'Chair, elbows on knees, hands clasped', tags: ['male', 'chair', 'sitting', 'thinking'], body: {
    hips: [28, 0, 0], spine: [14, 0, 0], neck: [-18, 0, 0], head: [-18, 0, 0], feet: 'flat',
    ik: { leftHand: { at: 'hips', off: [0.03, 0.12, 0.45], pole: [1, -0.5, 0] }, rightHand: { at: 'hips', off: [-0.03, 0.12, 0.45], pole: [-1, -0.5, 0] } },
    legs: { leftUpperLeg: [0.25, -0.05, 1], leftLowerLeg: [0.05, -1, 0.1], rightUpperLeg: [-0.25, -0.05, 1], rightLowerLeg: [-0.05, -1, 0.1] },
    hands: { left: 'Loose fist', right: 'Grab (C-shape)' }, support: ['Furniture', 'Chair', [0, 0, -0.03], 0] } },
  { name: 'Wall, back lean, foot up', tags: ['male', 'wall', 'lean', 'cool'], body: {
    hips: [-6, 0, 0], spine: [-3, 0, 0], head: [2, 22, 0],
    ik: { leftHand: pocketL, rightHand: pocketR },
    legs: { leftUpperLeg: [0.1, -1, 0.22], leftLowerLeg: [0.05, -1, 0.1], rightUpperLeg: [-0.06, -0.9, 0.4], rightLowerLeg: [0, -0.6, -0.8], rightFoot: [0, -1, 0.1] },
    feet: 'flat', hands: { left: 'Loose fist', right: 'Loose fist' }, support: ['Room', 'Wall', [0, 0, -0.27], 0] } },
  { name: 'Wall, shoulder lean, arms crossed', tags: ['male', 'wall', 'lean'], body: {
    hips: [0, 0, -8], spine: [0, 0, -6], head: [0, 18, 6],
    arms: crossedArms,
    legs: { leftUpperLeg: [-0.06, -1, 0.1], leftLowerLeg: [-0.12, -1, 0.05], rightUpperLeg: [0.14, -1, 0.02], rightLowerLeg: [0.1, -1, 0], rightFoot: [-0.2, -0.3, 0.93] },
    hands: { left: 'Loose fist', right: 'Loose fist' }, support: ['Room', 'Wall', [-0.385, 0, 0], 90] } },
  { name: 'Hand on chin, suit', tags: ['male', 'suit', 'thinking'], body: {
    hips: [0, 0, -5], spine: [2, -8, 6], neck: [4, 0, 0], head: [8, -12, 0],
    arms: { leftUpperArm: [0.1, -0.95, 0.3], leftLowerArm: [-0.85, 0.15, 0.5] },
    ik: { rightHand: chinR },
    legs: legsL('step'), hands: { left: 'Relaxed', right: 'Loose fist' } } },
  { name: 'Over-the-shoulder look (male)', tags: ['male', 'look back'], body: {
    hips: [0, 0, -5], spine: [-2, -40, 4], neck: [0, -25, 0], head: [-2, -35, 0],
    ik: { leftHand: pocketL }, arms: hangR,
    legs: maleLean, hands: { left: 'Loose fist', right: 'Relaxed' } } },
  { name: 'Hero stance, fists clenched', tags: ['male', 'hero', 'power'], body: {
    spine: [-10, 0, 0], neck: [-6, 0, 0], head: [-10, -10, 0], shoulders: { left: [0, -12], right: [0, -12] },
    arms: { leftUpperArm: [0.4, -0.95, -0.05], leftLowerArm: [0.15, -1, 0.12], rightUpperArm: [-0.4, -0.95, -0.05], rightLowerArm: [-0.15, -1, 0.12] },
    legs: maleWide, hands: { left: 'Fist', right: 'Fist' } } },
  { name: 'Profile, hands behind back', tags: ['male', 'profile', 'formal'], body: {
    spine: [-6, 30, 0], neck: [-2, 25, 0], head: [-6, 30, 0],
    ik: { leftHand: backPocketL, rightHand: { ...backPocketR, off: [-0.04, -0.02, -0.12] } },
    legs: legsL('step'), hands: { left: 'Grab (C-shape)', right: 'Relaxed' } } },
  { name: 'Leaning forward, hands on knees (male)', tags: ['male', 'sport', 'lean'], body: {
    hips: [55, 0, 0], spine: [6, 0, 0], neck: [-25, 0, 0], head: [-20, 0, 0], legsIn: 'world', feet: 'flat',
    ik: { leftHand: { at: 'leftLowerLeg', off: [0, 0.07, 0.07], pole: [0.6, 0, 0] }, rightHand: { at: 'rightLowerLeg', off: [0, 0.07, 0.07], pole: [-0.6, 0, 0] } },
    legs: { leftUpperLeg: [0.18, -1, 0.3], leftLowerLeg: [0.04, -1, -0.08], rightUpperLeg: [-0.18, -1, 0.3], rightLowerLeg: [-0.04, -1, -0.08] },
    hands: { left: 'Grab (C-shape)', right: 'Grab (C-shape)' } } },
  { name: 'Stretching, arms behind head', tags: ['male', 'casual', 'stretch'], body: {
    hips: [-4, 0, -6], spine: [-10, -6, 8], neck: [-6, 0, 0], head: [-10, -10, 0],
    ik: { leftHand: { at: 'head', off: [0.04, 0.06, -0.1], pole: [1, 0.3, 0.1] }, rightHand: { at: 'head', off: [-0.04, 0.06, -0.1], pole: [-1, 0.3, 0.1] } },
    legs: maleLean, hands: { left: 'Relaxed', right: 'Relaxed' } } },
];

// ------------------------------------------------------------------ unisex
const U = [
  { name: 'Chin-up profile', tags: ['unisex', 'portrait', 'profile'], body: {
    hips: [0, 0, -6], spine: [-4, 20, 6], neck: [-10, 25, 0], head: [-14, 40, 0],
    arms: { leftUpperArm: [0.15, -1, -0.12], leftLowerArm: [0.05, -1, 0.05], rightUpperArm: [-0.15, -1, -0.12], rightLowerArm: [-0.05, -1, 0.05] },
    legs: legsL('relaxed'), hands: { left: soft, right: soft } } },
  { name: 'Hands in back pockets, look back', tags: ['unisex', 'back', 'casual'], body: {
    hips: [0, 0, -8], spine: [-4, -35, 8], neck: [0, -20, 0], head: [4, -35, 0],
    ik: { leftHand: backPocketL, rightHand: backPocketR },
    legs: legsL('back'), hands: { left: flat, right: flat } } },
  { name: 'Sitting on the floor, hugging one knee', tags: ['unisex', 'sitting', 'floor'], body: {
    hips: [-10, 0, 0], spine: [12, 0, 0], neck: [6, 0, 0], head: [8, -15, -6], legsIn: 'world',
    ik: { leftHand: { at: 'leftLowerLeg', off: [-0.02, 0.0, 0.06], pole: [0.6, 0, 0.3] }, rightHand: { at: 'leftLowerLeg', off: [0.0, -0.04, 0.07], pole: [-0.8, 0, 0.3] } },
    legs: { leftUpperLeg: [0.12, 0.6, 0.8], leftLowerLeg: [0.0, -1, 0.1], rightUpperLeg: [-0.18, -0.12, 1], rightLowerLeg: [0.25, -0.1, 0.96] },
    feet: 'free', hands: { left: soft, right: soft } } },
  { name: 'Lean on one leg, thumbs hooked', tags: ['unisex', 'casual', 'denim'], body: {
    hips: [0, 0, -10], spine: [-2, -6, 12], head: [6, -10, -6],
    ik: { leftHand: { at: 'hips', off: [0.1, 0.05, 0.11], pole: [1, 0, -0.5] }, rightHand: { at: 'hips', off: [-0.1, 0.05, 0.11], pole: [-1, 0, -0.5] } },
    legs: legsL('side', softKneeL), hands: { left: 'Fist (thumb up)', right: 'Fist (thumb up)' } } },
];

export const FASHION = [
  ...F,
  mir(F[0], 'Classic S-curve (other side)'),
  mir(F[4], 'Runway pause (other side)'),
  mir(F[28], 'Contrapposto, hand on thigh (other side)'),
  ...M,
  mir(M[1], 'Hands in pockets (other leg)'),
  mir(M[3], 'Arms crossed, leaning (other leg)'),
  ...U,
];
