// Poses with something to sit, lean or step on (bodypose.js format). The
// support prop goes in the character's frame, from the point under the hips:
// [category, item, [x (left), y, z (forward)], yaw]. Seat heights (primitives.js):
// chair 0.475, stool 0.65, bench 0.475, table 0.78, crate 0.6, sofa 0.45,
// bed 0.5, stairs 0.17 per step; the hips joint sits ~0.085 above a seat.
// When the hips are over the prop the body settles onto it by itself (and feet
// near the floor are planted), so `ground` is only a first guess; hands and
// feet on a prop use ik at: 'support' (offset from the centre of its top, in
// the prop's own frame).
const flat = 'Open flat';
const crossedArms = {
  leftUpperArm: [0.35, -0.9, 0.25], leftLowerArm: [-0.95, 0.1, 0.3],
  rightUpperArm: [-0.35, -0.9, 0.28], rightLowerArm: [0.95, 0.16, 0.25],
};
const seated = (y = 0.56) => ({ feet: 'flat', ground: y });

export const SUPPORT = [
  // ---- chairs
  { name: 'Sitting on a chair', tags: ['sit', 'chair'], body: {
    spine: [-5, 0, 0], ...seated(),
    arms: { leftUpperArm: [0.15, -1, 0.25], leftLowerArm: [0.05, -0.3, 1], rightUpperArm: [-0.15, -1, 0.25], rightLowerArm: [-0.05, -0.3, 1] },
    legs: { leftUpperLeg: [0.12, -0.05, 1], leftLowerLeg: [0.02, -1, 0.05], rightUpperLeg: [-0.12, -0.05, 1], rightLowerLeg: [-0.02, -1, 0.05] },
    ik: { leftHand: { at: 'leftLowerLeg', off: [0, 0.07, -0.13], pole: [0.5, 0, -0.5] }, rightHand: { at: 'rightLowerLeg', off: [0, 0.07, -0.13], pole: [-0.5, 0, -0.5] } },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' },
    support: ['Furniture', 'Chair', [0, 0, -0.03], 0] } },
  { name: 'Chair, legs crossed', tags: ['sit', 'chair', 'elegant'], body: {
    spine: [-3, 8, 0], head: [0, -8, 0], ...seated(),
    arms: { leftUpperArm: [0.05, -0.95, 0.35], leftLowerArm: [-0.35, -0.3, 0.9], rightUpperArm: [-0.12, -0.95, 0.3], rightLowerArm: [0.1, -0.35, 0.95] },
    legs: { leftUpperLeg: [0.1, -0.05, 1], leftLowerLeg: [0.02, -1, 0.08], rightUpperLeg: [0.12, 0.25, 0.95], rightLowerLeg: [0.12, -0.88, 0.4], rightFoot: [0.1, -0.5, 0.85] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' },
    support: ['Furniture', 'Chair', [0, 0, -0.03], 0] } },
  { name: 'Chair, elbows on knees', tags: ['sit', 'chair', 'thinking', 'tired'], body: {
    hips: [30, 0, 0], spine: [15, 0, 0], neck: [-15, 0, 0], head: [-20, 0, 0], ...seated(),
    arms: { leftUpperArm: [0.15, -0.95, 0.3], leftLowerArm: [-0.55, 0.25, 0.8], rightUpperArm: [-0.15, -0.95, 0.3], rightLowerArm: [0.55, 0.25, 0.8] },
    legs: { leftUpperLeg: [0.2, -0.05, 1], leftLowerLeg: [0.04, -1, 0.1], rightUpperLeg: [-0.2, -0.05, 1], rightLowerLeg: [-0.04, -1, 0.1] },
    hands: { left: 'Loose fist', right: 'Grab (C-shape)' },
    support: ['Furniture', 'Chair', [0, 0, -0.03], 0] } },
  { name: 'Slouched on a chair', tags: ['sit', 'chair', 'lazy', 'bored'], body: {
    hips: [-28, 0, 0], spine: [22, 0, 0], neck: [10, 0, 0], head: [5, 10, 0], ...seated(0.52), feet: 'free',
    arms: { leftUpperArm: [0.3, -1, -0.15], leftLowerArm: [0.15, -1, 0.05], rightUpperArm: [-0.3, -1, -0.15], rightLowerArm: [-0.15, -1, 0.05] },
    legs: { leftUpperLeg: [0.18, -0.25, 0.95], leftLowerLeg: [0.12, -0.75, 0.65], rightUpperLeg: [-0.15, -0.25, 0.95], rightLowerLeg: [-0.1, -0.7, 0.7] },
    hands: { left: 'Limp', right: 'Limp' },
    support: ['Furniture', 'Chair', [0, 0, -0.05], 0] } },
  { name: 'Sitting backwards on a chair', tags: ['sit', 'chair', 'casual'], body: {
    hips: [6, 0, 0], spine: [4, 0, 0], head: [5, 0, 0], ...seated(),
    legs: { leftUpperLeg: [0.72, -0.02, 0.69], leftLowerLeg: [0.12, -1, -0.12], rightUpperLeg: [-0.72, -0.02, 0.69], rightLowerLeg: [-0.12, -1, -0.12] },
    ik: { leftHand: { at: 'support', off: [0.09, 0.03, -0.19], pole: [0.8, -0.4, -0.2] }, rightHand: { at: 'support', off: [-0.1, 0.06, -0.17], pole: [-0.8, -0.4, -0.2] } },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' },
    support: ['Furniture', 'Chair', [0, 0, 0.06], 180] } },

  // ---- stools, benches, tables, crates
  { name: 'Perched on a stool', tags: ['sit', 'stool', 'bar'], body: {
    spine: [-3, 0, 0], ...seated(0.735), feet: 'free',
    arms: { leftUpperArm: [0.12, -1, 0.2], leftLowerArm: [-0.15, -0.4, 0.9], rightUpperArm: [-0.12, -1, 0.2], rightLowerArm: [0.15, -0.4, 0.9] },
    legs: { leftUpperLeg: [0.12, 0.02, 1], leftLowerLeg: [0, -0.85, -0.5], leftFoot: [0, -0.6, 0.8], rightUpperLeg: [-0.13, -0.05, 1], rightLowerLeg: [-0.02, -1, 0.12] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' },
    support: ['Furniture', 'Stool', [0, 0, -0.02], 0] } },
  { name: 'Stool, feet dangling', tags: ['sit', 'stool', 'casual'], body: {
    hips: [5, 0, 0], ...seated(0.735), feet: 'free', head: [5, 0, 0],
    arms: { leftUpperArm: [0.3, -0.9, -0.1], leftLowerArm: [0.05, -1, 0.05], rightUpperArm: [-0.3, -0.9, -0.1], rightLowerArm: [-0.05, -1, 0.05] },
    legs: { leftUpperLeg: [0.12, -0.15, 1], leftLowerLeg: [0.02, -0.95, -0.3], leftFoot: [0, -0.7, 0.7], rightUpperLeg: [-0.12, -0.15, 1], rightLowerLeg: [-0.02, -0.9, 0.35], rightFoot: [0, -0.6, 0.8] },
    hands: { left: flat, right: flat },
    support: ['Furniture', 'Stool', [0, 0, -0.02], 0] } },
  { name: 'Bench, leaning back on hands', tags: ['sit', 'bench', 'relaxed', 'park'], body: {
    hips: [-15, 0, 0], spine: [5, 0, 0], head: [-10, 15, 0], ...seated(), feet: 'free',
    legs: { leftUpperLeg: [0.12, 0.02, 1], leftLowerLeg: [0.02, -0.8, 0.6], rightUpperLeg: [-0.12, 0.02, 1], rightLowerLeg: [0.02, -0.75, 0.66] },
    ik: { leftHand: { at: 'support', off: [-0.14, 0.025, -0.13], pole: [0.3, 0, -1] }, rightHand: { at: 'support', off: [-0.56, 0.025, -0.13], pole: [-0.3, 0, -1] } },
    hands: { left: flat, right: flat },
    support: ['Furniture', 'Bench', [0.35, 0, -0.06], 0] } },
  { name: 'Bench, elbows on knees', tags: ['sit', 'bench', 'waiting'], body: {
    hips: [30, 0, 0], spine: [15, 0, 0], neck: [-10, 0, 0], head: [-10, -20, 0], ...seated(),
    arms: { leftUpperArm: [0.2, -0.95, 0.3], leftLowerArm: [-0.4, 0.3, 0.85], rightUpperArm: [-0.2, -0.95, 0.3], rightLowerArm: [0.4, 0.3, 0.85] },
    legs: { leftUpperLeg: [0.3, -0.05, 1], leftLowerLeg: [0.08, -1, 0.1], rightUpperLeg: [-0.3, -0.05, 1], rightLowerLeg: [-0.08, -1, 0.1] },
    hands: { left: 'Loose fist', right: 'Grab (C-shape)' },
    support: ['Furniture', 'Bench', [-0.3, 0, -0.06], 0] } },
  { name: 'Sitting on the table edge', tags: ['sit', 'table', 'casual'], body: {
    hips: [5, 0, 0], ...seated(0.865), feet: 'free',
    legs: { leftUpperLeg: [0.12, 0, 1], leftLowerLeg: [0.02, -1, 0.15], leftFoot: [0, -0.6, 0.8], rightUpperLeg: [-0.12, 0, 1], rightLowerLeg: [-0.02, -0.9, -0.35], rightFoot: [0, -0.7, 0.7] },
    ik: { leftHand: { at: 'support', off: [0.24, 0.025, 0.1], pole: [0.6, 0, -1] }, rightHand: { at: 'support', off: [-0.24, 0.025, 0.1], pole: [-0.6, 0, -1] } },
    hands: { left: flat, right: flat }, plant: false,
    support: ['Furniture', 'Table', [0, 0, -0.24], 0] } },
  { name: 'Sitting on a crate', tags: ['sit', 'crate', 'rest'], body: {
    hips: [25, 0, 0], spine: [12, 0, 0], neck: [-10, 0, 0], ...seated(0.685),
    arms: { leftUpperArm: [0.25, -0.95, 0.25], leftLowerArm: [-0.3, 0.2, 0.95], rightUpperArm: [-0.15, -1, 0.15], rightLowerArm: [0.05, -0.5, 0.85] },
    legs: { leftUpperLeg: [0.3, 0.02, 0.95], leftLowerLeg: [0.05, -1, 0.15], rightUpperLeg: [-0.3, 0.02, 0.95], rightLowerLeg: [-0.05, -1, 0.08] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' },
    support: ['Furniture', 'Crate', [0, 0, -0.12], 0] } },
  { name: 'Sitting on the stairs', tags: ['sit', 'stairs', 'steps'], body: {
    hips: [20, 0, 0], spine: [10, 0, 0], head: [-10, 0, 0], ...seated(0.6),
    arms: { leftUpperArm: [0.15, -0.9, 0.4], leftLowerArm: [-0.3, 0.1, 0.95], rightUpperArm: [-0.15, -0.9, 0.4], rightLowerArm: [0.3, 0.1, 0.95] },
    legs: { leftUpperLeg: [0.12, 0.2, 1], leftLowerLeg: [0.02, -1, 0.1], rightUpperLeg: [-0.12, 0.2, 1], rightLowerLeg: [-0.02, -1, 0.1] },
    ik: { leftFoot: { at: 'support', off: [0.11, -0.6, 0.55], pole: [0.1, 0.3, 1] }, rightFoot: { at: 'support', off: [-0.11, -0.6, 0.55], pole: [-0.1, 0.3, 1] } },
    hands: { left: 'Loose fist', right: 'Relaxed (soft)' }, plant: false,
    support: ['Room', 'Stairs', [0, 0, -0.02], 0] } },
  { name: 'Sitting on a low step', tags: ['sit', 'platform', 'step'], body: {
    hips: [15, 0, 0], spine: [8, 0, 0], ...seated(0.39),
    arms: { leftUpperArm: [0.3, -0.5, 0.8], leftLowerArm: [0, -0.8, 0.6], rightUpperArm: [-0.3, -0.5, 0.8], rightLowerArm: [0, -0.8, 0.6] },
    legs: { leftUpperLeg: [0.15, 0.45, 0.9], leftLowerLeg: [0.02, -1, 0.05], rightUpperLeg: [-0.15, 0.45, 0.9], rightLowerLeg: [-0.02, -1, 0.05] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' },
    support: ['Room', 'Platform', [0, 0, -0.62], 0] } },

  // ---- sofa and bed
  { name: 'Lounging on the sofa', tags: ['sit', 'sofa', 'relaxed', 'home'], body: {
    hips: [-25, 0, 0], spine: [5, 0, 0], head: [5, 10, 0], ...seated(0.53), feet: 'free',
    arms: { leftUpperArm: [0.15, -1, 0.2], leftLowerArm: [-0.4, -0.2, 0.9], rightUpperArm: [-0.95, 0.15, -0.2], rightLowerArm: [-0.9, -0.1, 0.3] },
    legs: { leftUpperLeg: [0.1, 0.05, 1], leftLowerLeg: [-0.1, -0.75, 0.65], rightUpperLeg: [-0.1, 0.05, 1], rightLowerLeg: [0.08, -0.75, 0.65] },
    hands: { left: 'Relaxed (soft)', right: 'Limp' }, plant: false,
    support: ['Furniture', 'Sofa', [-0.2, 0, -0.05], 0] } },
  { name: 'Lying on the bed (back)', tags: ['lie', 'bed', 'relaxed'], body: {
    hips: [-90, 0, 0], neck: [15, 0, 0], lift: 0.5,
    arms: { leftUpperArm: [0.7, 0.7, 0.02], leftLowerArm: [-0.6, 0.8, 0.02], rightUpperArm: [-0.3, -0.9, 0.2], rightLowerArm: [0.6, 0.1, 0.8] },
    legs: { leftUpperLeg: [0.05, -0.55, 0.83], leftLowerLeg: [0, -0.8, -0.6], rightUpperLeg: [-0.1, -1, 0], rightLowerLeg: [-0.05, -1, 0] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' }, feet: 'free',
    support: ['Furniture', 'Bed', [0, 0, -0.1], 0] } },
  { name: 'Lying on the bed (side)', tags: ['lie', 'bed', 'sleep'], body: {
    hips: [0, 0, -90], spine: [10, 0, 0], head: [5, 0, -10], lift: 0.5,
    arms: { leftUpperArm: [0.15, 1, 0.15], leftLowerArm: [-0.2, 0.35, 0.9], rightUpperArm: [0.55, -0.4, 0.7], rightLowerArm: [0.6, -0.2, 0.75] },
    legs: { leftUpperLeg: [0, -0.75, 0.65], leftLowerLeg: [0, -0.9, -0.45], rightUpperLeg: [0.1, -0.6, 0.8], rightLowerLeg: [0.05, -0.95, -0.3] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' }, feet: 'free',
    support: ['Furniture', 'Bed', [0.1, 0, 0], 90] } },

  // ---- walls and pillars
  { name: 'Leaning back against a wall', tags: ['lean', 'wall', 'cool'], body: {
    hips: [-6, 0, 0], spine: [-3, 0, 0], head: [0, -10, 0],
    arms: crossedArms,
    legs: { leftUpperLeg: [0.12, -1, 0.2], leftLowerLeg: [0.05, -1, 0.15], rightUpperLeg: [-0.05, -1, 0.22], rightLowerLeg: [0.12, -1, 0.15] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' },
    support: ['Room', 'Wall', [0, 0, -0.24], 0] } },
  { name: 'Shoulder against a wall', tags: ['lean', 'wall', 'casual'], body: {
    hips: [0, 0, -8], spine: [0, 0, -6], head: [0, 15, 5],
    arms: crossedArms,
    legs: { leftUpperLeg: [-0.05, -1, 0.1], leftLowerLeg: [-0.12, -1, 0.05], rightUpperLeg: [0.12, -1, 0], rightLowerLeg: [0.1, -1, 0] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' },
    support: ['Room', 'Wall', [-0.38, 0, 0], 90] } },
  { name: 'Foot up against the wall', tags: ['lean', 'wall', 'cool'], body: {
    hips: [-6, 0, 0], spine: [-3, 0, 0], head: [0, 20, 0],
    arms: { leftUpperArm: [0.3, -0.95, -0.1], leftLowerArm: [-0.15, -1, 0.15], rightUpperArm: [-0.3, -0.95, -0.1], rightLowerArm: [0.15, -1, 0.15] },
    legs: { leftUpperLeg: [0.1, -1, 0.22], leftLowerLeg: [0.05, -1, 0.1], rightUpperLeg: [-0.06, -0.9, 0.4], rightLowerLeg: [0, -0.6, -0.8], rightFoot: [0, -1, 0.2] },
    ik: { rightFoot: { at: 'support', off: [-0.1, -2.12, 0.11], pole: [0, 0.2, 1] } },
    hands: { left: 'Relaxed', right: 'Relaxed' }, feet: 'free',
    support: ['Room', 'Wall', [0, 0, -0.24], 0] } },
  { name: 'Sitting against the wall', tags: ['sit', 'wall', 'tired', 'floor'], body: {
    hips: [-3, 0, 0], spine: [-3, 0, 0], head: [10, 0, 0],
    arms: { leftUpperArm: [0.25, -0.55, 0.8], leftLowerArm: [0.05, -0.35, 0.95], rightUpperArm: [-0.25, -0.55, 0.8], rightLowerArm: [-0.05, -0.35, 0.95] },
    legs: { leftUpperLeg: [0.15, 0.45, 0.9], leftLowerLeg: [0.02, -1, 0.15], rightUpperLeg: [-0.15, 0.45, 0.9], rightLowerLeg: [-0.02, -1, 0.15] },
    hands: { left: 'Limp', right: 'Limp' },
    support: ['Room', 'Wall', [0, 0, -0.19], 0] } },
  { name: 'Leaning on a pillar', tags: ['lean', 'pillar', 'waiting'], body: {
    hips: [-6, 0, 0], spine: [-3, 0, 0], head: [-5, -20, 0],
    arms: { leftUpperArm: [0.32, -0.92, -0.2], leftLowerArm: [-0.8, -0.45, -0.35], rightUpperArm: [-0.32, -0.92, -0.2], rightLowerArm: [0.8, -0.45, -0.35] },
    legs: { leftUpperLeg: [0.12, -1, 0.2], leftLowerLeg: [0.05, -1, 0.12], rightUpperLeg: [-0.06, -0.9, 0.4], rightLowerLeg: [0, -0.67, -0.74], rightFoot: [0, -1, 0.1] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' },
    support: ['Room', 'Pillar', [0, 0, -0.37], 0] } },

  // ---- tables, steps, crates (standing)
  { name: 'Leaning on a table, both hands', tags: ['lean', 'table', 'meeting'], body: {
    hips: [30, 0, 0], spine: [10, 0, 0], neck: [-15, 0, 0], head: [-15, 0, 0], armsIn: 'world',
    arms: { leftUpperArm: [0.2, -0.85, 0.45], leftLowerArm: [0.08, -0.95, 0.3], rightUpperArm: [-0.2, -0.85, 0.45], rightLowerArm: [-0.08, -0.95, 0.3] },
    legs: { leftUpperLeg: [0.1, -1, -0.12], leftLowerLeg: [0.05, -1, -0.05], rightUpperLeg: [-0.1, -1, -0.12], rightLowerLeg: [-0.05, -1, -0.05] },
    ik: { leftHand: { at: 'support', off: [0.22, 0.025, -0.24], pole: [0.6, 0, -0.8] }, rightHand: { at: 'support', off: [-0.22, 0.025, -0.24], pole: [-0.6, 0, -0.8] } },
    hands: { left: flat, right: flat },
    support: ['Furniture', 'Table', [0, 0, 0.62], 0] } },
  { name: 'Foot up on a crate', tags: ['crate', 'heroic', 'step'], body: {
    hips: [15, 0, 0], spine: [15, 0, 0], head: [-10, 0, 0],
    arms: { leftUpperArm: [0.45, -0.8, -0.1], leftLowerArm: [-0.45, -0.3, 0.6], rightUpperArm: [-0.1, -0.6, 0.8], rightLowerArm: [0.3, -0.3, 0.9] },
    legs: { leftUpperLeg: [0.1, -1, -0.05], leftLowerLeg: [0.05, -1, 0], rightUpperLeg: [-0.05, 0.5, 0.86], rightLowerLeg: [0, -1, 0.1] },
    hands: { left: 'Relaxed', right: 'Relaxed (soft)' },
    support: ['Furniture', 'Crate', [-0.1, 0, 0.45], 0] } },
  { name: 'Standing on a crate, looking out', tags: ['crate', 'stand', 'lookout', 'heroic'], body: {
    head: [-5, 20, 0], rest: 'feet',
    arms: { leftUpperArm: [0.3, -1, 0.05], leftLowerArm: [0.1, -1, 0.1], rightUpperArm: [-0.4, 0.3, 0.85], rightLowerArm: [0.6, 0.65, 0.2] },
    legs: { leftUpperLeg: [0.08, -1, 0.1], leftLowerLeg: [0.02, -1, 0], rightUpperLeg: [-0.12, -1, -0.08], rightLowerLeg: [-0.02, -1, 0] },
    hands: { right: 'Open fingers together' },
    support: ['Furniture', 'Crate', [0, 0, 0], 0] } },
];
