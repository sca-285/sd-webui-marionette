// On the ground: crawling, lying, kneeling, sitting on the floor, floor exercise
// (bodypose.js format). Prone / crawling bodies give arms and legs in the
// upright frame (armsIn / legsIn 'world'); lying on the back or side uses the
// chest and pelvis frames.
const flat = 'Open flat';

export const GROUND = [
  // ---- crawling and prone
  { name: 'Crawling on hands and knees', tags: ['crawl', 'prone'], body: {
    hips: [88, 0, 0], spine: [-12, 0, 0], neck: [-25, 0, 0], head: [-35, 0, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.05, -1, 0.25], leftLowerArm: [0, -1, 0.1], rightUpperArm: [-0.05, -0.8, -0.1], rightLowerArm: [0, -1, 0.3] },
    legs: { leftUpperLeg: [0.08, -1, -0.2], leftLowerLeg: [0, -0.05, -1], rightUpperLeg: [-0.08, -0.85, 0.2], rightLowerLeg: [0, -0.1, -1] },
    hands: { left: 'Open fingers together', right: 'Open fingers together' } } },
  { name: 'Army crawl', tags: ['crawl', 'prone', 'military'], body: {
    hips: [90, 0, 8], spine: [-8, 0, 0], neck: [-30, 0, 0], head: [-20, 0, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.45, -0.35, 0.8], leftLowerArm: [-0.45, -0.05, 0.9], rightUpperArm: [-0.6, -0.4, 0.2], rightLowerArm: [-0.1, -0.1, 1] },
    legs: { leftUpperLeg: [0.6, -0.05, -0.8], leftLowerLeg: [0.05, -0.05, -1], rightUpperLeg: [-0.1, -0.05, -1], rightLowerLeg: [-0.05, -0.05, -1] },
    hands: { left: flat, right: 'Grasping (gripping fabric)' } } },
  { name: 'Dragging oneself (injured)', tags: ['crawl', 'injured', 'prone'], body: {
    hips: [85, 0, 10], spine: [-15, 10, 0], neck: [-35, 0, 0], head: [-10, 0, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.25, -0.15, 1], leftLowerArm: [0.1, -0.1, 1], rightUpperArm: [-0.5, -0.6, 0.5], rightLowerArm: [-0.1, -0.3, 0.95] },
    legs: { leftUpperLeg: [0.1, -0.1, -1], leftLowerLeg: [0.05, -0.05, -1], rightUpperLeg: [-0.6, -0.1, -0.75], rightLowerLeg: [-0.1, 0, -1] },
    hands: { left: 'Grasping (gripping fabric)', right: flat } } },
  { name: 'Push-up (top)', tags: ['exercise', 'push-up', 'prone'], body: {
    hips: [70, 0, 0], armsIn: 'world', legsIn: 'world', neck: [-10, 0, 0],
    arms: { leftUpperArm: [0.15, -1, 0.05], leftLowerArm: [0.12, -1, 0.05], rightUpperArm: [-0.15, -1, 0.05], rightLowerArm: [-0.12, -1, 0.05] },
    legs: { leftUpperLeg: [0.05, -0.34, -0.94], leftLowerLeg: [0.03, -0.34, -0.94], rightUpperLeg: [-0.05, -0.34, -0.94], rightLowerLeg: [-0.03, -0.34, -0.94] },
    hands: { left: flat, right: flat } } },
  { name: 'Push-up (down)', tags: ['exercise', 'push-up', 'prone'], body: {
    hips: [84, 0, 0], armsIn: 'world', legsIn: 'world', neck: [-15, 0, 0],
    arms: { leftUpperArm: [0.5, 0.05, -0.85], leftLowerArm: [0, -1, 0.05], rightUpperArm: [-0.5, 0.05, -0.85], rightLowerArm: [0, -1, 0.05] },
    legs: { leftUpperLeg: [0.05, -0.1, -1], leftLowerLeg: [0.03, -0.1, -1], rightUpperLeg: [-0.05, -0.1, -1], rightLowerLeg: [-0.03, -0.1, -1] },
    hands: { left: flat, right: flat } } },
  { name: 'Plank (forearms)', tags: ['exercise', 'plank', 'prone'], body: {
    hips: [80, 0, 0], armsIn: 'world', legsIn: 'world', neck: [-10, 0, 0],
    arms: { leftUpperArm: [0.08, -1, 0.05], leftLowerArm: [-0.15, 0, 1], rightUpperArm: [-0.08, -1, 0.05], rightLowerArm: [0.15, 0, 1] },
    legs: { leftUpperLeg: [0.05, -0.18, -1], leftLowerLeg: [0.03, -0.18, -1], rightUpperLeg: [-0.05, -0.18, -1], rightLowerLeg: [-0.03, -0.18, -1] },
    hands: { left: 'Loose fist', right: 'Loose fist' } } },
  { name: 'Lying on the stomach (chin on hands)', tags: ['lie', 'prone', 'relaxed'], body: {
    hips: [90, 0, 0], spine: [-30, 0, 0], neck: [-15, 0, 0], head: [-15, 0, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.3, -0.8, 0.5], leftLowerArm: [-0.45, 0.6, 0.65], rightUpperArm: [-0.3, -0.8, 0.5], rightLowerArm: [0.45, 0.6, 0.65] },
    legs: { leftUpperLeg: [0.08, -0.05, -1], leftLowerLeg: [-0.25, 0.9, -0.35], rightUpperLeg: [-0.08, -0.05, -1], rightLowerLeg: [0.25, 0.85, -0.45] },
    ik: { leftHand: { at: 'head', off: [0.05, -0.11, 0.06], pole: [0.6, -0.5, 0] }, rightHand: { at: 'head', off: [-0.05, -0.11, 0.06], pole: [-0.6, -0.5, 0] } },
    hands: { left: 'Cupped', right: 'Cupped' }, feet: 'free' } },
  { name: 'Cobra stretch', tags: ['yoga', 'stretch', 'prone'], body: {
    hips: [90, 0, 0], spine: [-55, 0, 0], neck: [-15, 0, 0], head: [-15, 0, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.18, -1, -0.05], leftLowerArm: [0.12, -1, 0.1], rightUpperArm: [-0.18, -1, -0.05], rightLowerArm: [-0.12, -1, 0.1] },
    legs: { leftUpperLeg: [0.08, -0.05, -1], leftLowerLeg: [0.06, -0.05, -1], rightUpperLeg: [-0.08, -0.05, -1], rightLowerLeg: [-0.06, -0.05, -1] },
    hands: { left: flat, right: flat }, feet: 'free' } },

  // ---- lying on the back / side
  { name: 'Lying on the back (relaxed)', tags: ['lie', 'supine', 'relaxed'], body: {
    hips: [-90, 0, 0], head: [5, 20, 0],
    arms: { leftUpperArm: [0.45, -0.9, 0], leftLowerArm: [0.35, -1, 0.1], rightUpperArm: [-0.45, -0.9, 0], rightLowerArm: [-0.35, -1, 0.15] },
    legs: { leftUpperLeg: [0.12, -1, 0], leftLowerLeg: [0.06, -1, 0.05], rightUpperLeg: [-0.1, -1, 0.05], rightLowerLeg: [-0.06, -1, 0] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' }, feet: 'free' } },
  { name: 'Lying on the back, hands behind head', tags: ['lie', 'supine', 'relaxed'], body: {
    hips: [-90, 0, 0], neck: [10, 0, 0],
    arms: { leftUpperArm: [0.7, 0.7, 0.05], leftLowerArm: [-0.85, 0.15, -0.45], rightUpperArm: [-0.7, 0.7, 0.05], rightLowerArm: [0.85, 0.15, -0.45] },
    legs: { leftUpperLeg: [0.05, -0.55, 0.83], leftLowerLeg: [0, -0.8, -0.6], rightUpperLeg: [-0.1, -1, 0], rightLowerLeg: [-0.05, -1, 0] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' }, feet: 'free' } },
  { name: 'Lying on the side (head on arm)', tags: ['lie', 'side'], body: {
    hips: [0, 0, -90], spine: [10, 0, 0], head: [5, 0, -10],
    arms: { leftUpperArm: [0.15, 1, 0.15], leftLowerArm: [-0.2, 0.35, 0.9], rightUpperArm: [0.55, -0.4, 0.7], rightLowerArm: [0.6, -0.2, 0.75] },
    legs: { leftUpperLeg: [0, -0.75, 0.65], leftLowerLeg: [0, -0.9, -0.45], rightUpperLeg: [0.1, -0.6, 0.8], rightLowerLeg: [0.05, -0.95, -0.3] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' }, feet: 'free' } },
  { name: 'Fetal position', tags: ['lie', 'side', 'curl'], body: {
    hips: [0, 0, -90], spine: [40, 0, 0], neck: [20, 0, 0], head: [15, 0, 0],
    arms: { leftUpperArm: [0.15, -0.55, 0.8], leftLowerArm: [-0.45, -0.55, 0.7], rightUpperArm: [-0.15, -0.55, 0.8], rightLowerArm: [0.45, -0.55, 0.7] },
    legs: { leftUpperLeg: [0, 0.1, 1], leftLowerLeg: [0, -1, 0.1], rightUpperLeg: [0.08, 0.15, 1], rightLowerLeg: [0.05, -1, 0.05] },
    hands: { left: 'Loose fist', right: 'Loose fist' }, feet: 'free' } },
  { name: 'Sit-up (crunch)', tags: ['exercise', 'supine'], body: {
    hips: [-85, 0, 0], spine: [45, 0, 0], neck: [15, 0, 0],
    arms: { leftUpperArm: [0.7, 0.55, 0.4], leftLowerArm: [-0.85, 0.1, -0.5], rightUpperArm: [-0.7, 0.55, 0.4], rightLowerArm: [0.85, 0.1, -0.5] },
    legs: { leftUpperLeg: [0.08, -0.5, 0.85], leftLowerLeg: [0, -0.8, -0.6], rightUpperLeg: [-0.08, -0.5, 0.85], rightLowerLeg: [0, -0.8, -0.6] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' }, feet: 'free' } },

  // ---- kneeling
  { name: 'Kneeling (upright)', tags: ['kneel'], body: {
    legs: { leftUpperLeg: [0.08, -1, 0], leftLowerLeg: [0, -0.05, -1], leftFoot: [0, -0.15, -1], rightUpperLeg: [-0.08, -1, 0], rightLowerLeg: [0, -0.05, -1], rightFoot: [0, -0.15, -1] },
    arms: { leftUpperArm: [0.15, -1, 0.1], leftLowerArm: [0.05, -0.6, 0.8], rightUpperArm: [-0.15, -1, 0.1], rightLowerArm: [-0.05, -0.6, 0.8] } } },
  { name: 'Kneeling on one knee', tags: ['kneel', 'proposal', 'rest'], body: {
    spine: [8, 0, 0], head: [10, 0, 0],
    legs: { leftUpperLeg: [0.1, 0, 1], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.08, -1, -0.05], rightLowerLeg: [0, -0.05, -1], rightFoot: [0, -0.7, -0.7] },
    arms: { leftUpperArm: [0.15, -0.7, 0.7], leftLowerArm: [0.1, -0.2, 1], rightUpperArm: [-0.2, -1, 0.05], rightLowerArm: [-0.1, -1, 0.15] },
    ik: { leftHand: { at: 'leftLowerLeg', off: [0.02, 0.06, 0.02], pole: [0.5, 0, -0.5] } } } },
  { name: 'Seiza (kneeling sitting on heels)', tags: ['kneel', 'sit', 'japanese'], body: {
    legs: { leftUpperLeg: [0.08, -0.05, 1], leftLowerLeg: [0, -0.1, -1], leftFoot: [0, -0.05, -1], rightUpperLeg: [-0.08, -0.05, 1], rightLowerLeg: [0, -0.1, -1], rightFoot: [0, -0.05, -1] },
    arms: { leftUpperArm: [0.15, -1, 0.2], leftLowerArm: [0.02, -0.35, 1], rightUpperArm: [-0.15, -1, 0.2], rightLowerArm: [-0.02, -0.35, 1] },
    ik: { leftHand: { at: 'leftLowerLeg', off: [0, 0.07, -0.14] }, rightHand: { at: 'rightLowerLeg', off: [0, 0.07, -0.14] } },
    hands: { left: flat, right: flat } } },
  { name: "Child's pose", tags: ['yoga', 'stretch', 'kneel'], body: {
    hips: [100, 0, 0], spine: [20, 0, 0], neck: [10, 0, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.15, -0.15, 1], leftLowerArm: [0.05, -0.15, 1], rightUpperArm: [-0.15, -0.15, 1], rightLowerArm: [-0.05, -0.15, 1] },
    legs: { leftUpperLeg: [0.15, -0.35, 0.93], leftLowerLeg: [0, -0.05, -1], leftFoot: [0, -0.1, -1], rightUpperLeg: [-0.15, -0.35, 0.93], rightLowerLeg: [0, -0.05, -1], rightFoot: [0, -0.1, -1] },
    hands: { left: flat, right: flat } } },
  { name: 'Downward dog', tags: ['yoga', 'stretch'], body: {
    hips: [130, 0, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.12, -0.7, 0.7], leftLowerArm: [0.1, -0.7, 0.7], rightUpperArm: [-0.12, -0.7, 0.7], rightLowerArm: [-0.1, -0.7, 0.7] },
    legs: { leftUpperLeg: [0.08, -0.75, -0.65], leftLowerLeg: [0.05, -0.75, -0.65], rightUpperLeg: [-0.08, -0.75, -0.65], rightLowerLeg: [-0.05, -0.75, -0.65] },
    feet: 'flat', hands: { left: 'Open spread', right: 'Open spread' } } },

  // ---- sitting on the floor
  { name: 'Sitting cross-legged', tags: ['sit', 'floor', 'meditate'], body: {
    hips: [-5, 0, 0],
    legs: { leftUpperLeg: [0.7, 0.05, 0.7], leftLowerLeg: [-0.9, -0.1, 0.3], rightUpperLeg: [-0.7, 0.05, 0.7], rightLowerLeg: [0.9, -0.1, 0.25] },
    arms: { leftUpperArm: [0.25, -0.9, 0.3], leftLowerArm: [0.3, -0.35, 0.9], rightUpperArm: [-0.25, -0.9, 0.3], rightLowerArm: [-0.3, -0.35, 0.9] },
    ik: { leftHand: { at: 'leftLowerLeg', off: [0, 0.06, 0], pole: [0.6, 0, -0.6] }, rightHand: { at: 'rightLowerLeg', off: [0, 0.06, 0], pole: [-0.6, 0, -0.6] } },
    feet: 'free' } },
  { name: 'Sitting, leaning back on hands', tags: ['sit', 'floor', 'relaxed'], body: {
    hips: [-25, 0, 0], spine: [10, 0, 0], head: [10, 0, 0], armsIn: 'world',
    legs: { leftUpperLeg: [0.08, -0.02, 1], leftLowerLeg: [0.05, -0.02, 1], rightUpperLeg: [-0.08, -0.02, 1], rightLowerLeg: [-0.12, 0.2, 1] },
    arms: { leftUpperArm: [0.25, -0.85, -0.45], leftLowerArm: [0.2, -0.88, -0.4], rightUpperArm: [-0.25, -0.85, -0.45], rightLowerArm: [-0.2, -0.88, -0.4] },
    hands: { left: flat, right: flat }, feet: 'free' } },
  { name: 'Hugging knees', tags: ['sit', 'floor', 'sad'], body: {
    spine: [25, 0, 0], head: [12, 0, 0],
    legs: { leftUpperLeg: [0.08, 0.65, 0.75], leftLowerLeg: [0, -1, 0.05], rightUpperLeg: [-0.08, 0.65, 0.75], rightLowerLeg: [0, -1, 0.05] },
    arms: { leftUpperArm: [0.2, -0.45, 0.88], leftLowerArm: [-0.75, -0.1, 0.65], rightUpperArm: [-0.2, -0.45, 0.88], rightLowerArm: [0.75, -0.15, 0.6] },
    ik: { leftHand: { at: 'rightLowerLeg', off: [0.03, -0.12, 0.07] }, rightHand: { at: 'leftLowerLeg', off: [-0.03, -0.14, 0.07] } },
    hands: { left: 'Loose fist', right: 'Loose fist' } } },
  { name: 'Sitting, one knee up', tags: ['sit', 'floor', 'relaxed'], body: {
    hips: [-10, 0, 0], head: [0, -15, 0],
    legs: { leftUpperLeg: [0.1, 0.6, 0.8], leftLowerLeg: [0, -1, 0.05], rightUpperLeg: [-0.45, -0.05, 0.9], rightLowerLeg: [0.6, -0.05, 0.8] },
    arms: { leftUpperArm: [0.3, -0.3, 0.9], leftLowerArm: [0, -0.7, 0.7], rightUpperArm: [-0.35, -0.9, -0.25], rightLowerArm: [-0.1, -1, -0.1] },
    hands: { left: 'Relaxed (soft)', right: flat }, feet: 'free' } },
  { name: 'Side-sit (mermaid)', tags: ['sit', 'floor', 'graceful'], body: {
    hips: [-5, 20, 12], spine: [0, -15, -8], head: [5, -10, 5],
    legs: { leftUpperLeg: [0.1, -0.05, 1], leftLowerLeg: [-0.85, -0.05, -0.5], rightUpperLeg: [-0.4, -0.05, 0.9], rightLowerLeg: [-0.9, -0.05, -0.3] },
    arms: { leftUpperArm: [0.1, -1, 0.25], leftLowerArm: [-0.2, -0.5, 0.85], rightUpperArm: [-0.45, -0.9, 0.05], rightLowerArm: [-0.25, -1, 0.05] },
    hands: { left: 'Relaxed (soft)', right: flat }, feet: 'free' } },
  { name: 'Seated straddle stretch', tags: ['stretch', 'floor', 'exercise'], body: {
    hips: [35, 0, 0], spine: [35, 0, 0], head: [10, 0, 0],
    legs: { leftUpperLeg: [0.75, -0.02, 0.65], leftLowerLeg: [0.75, -0.02, 0.65], rightUpperLeg: [-0.75, -0.02, 0.65], rightLowerLeg: [-0.75, -0.02, 0.65] },
    arms: { leftUpperArm: [0.2, 0.8, 0.5], leftLowerArm: [0.15, 0.9, 0.4], rightUpperArm: [-0.2, 0.8, 0.5], rightLowerArm: [-0.15, 0.9, 0.4] },
    hands: { left: flat, right: flat }, feet: 'free' } },

  // ---- squatting
  { name: 'Deep squat', tags: ['squat', 'crouch'], body: {
    hips: [35, 0, 0], spine: [5, 0, 0], head: [-15, 0, 0],
    legs: { leftUpperLeg: [0.35, -0.15, 0.92], leftLowerLeg: [0.05, -0.92, -0.38], rightUpperLeg: [-0.35, -0.15, 0.92], rightLowerLeg: [-0.05, -0.92, -0.38] },
    arms: { leftUpperArm: [0.1, -0.6, 0.8], leftLowerArm: [-0.1, -0.3, 0.95], rightUpperArm: [-0.1, -0.6, 0.8], rightLowerArm: [0.1, -0.3, 0.95] } } },
  { name: 'Crouching on the toes', tags: ['crouch', 'squat', 'ready'], body: {
    hips: [30, 0, 0], spine: [10, 0, 0], head: [-25, 0, 0],
    legs: { leftUpperLeg: [0.25, -0.25, 0.93], leftLowerLeg: [0, -0.85, -0.53], leftFoot: [0, -0.7, 0.7], rightUpperLeg: [-0.25, -0.25, 0.93], rightLowerLeg: [0, -0.85, -0.53], rightFoot: [0, -0.7, 0.7] },
    arms: { leftUpperArm: [0.3, -0.5, 0.8], leftLowerArm: [-0.1, -0.5, 0.85], rightUpperArm: [-0.15, -1, 0.35], rightLowerArm: [-0.05, -1, 0.3] },
    hands: { right: 'Open spread' } } },
];
