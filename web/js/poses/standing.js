// Standing and everyday poses (bodypose.js format).
// Weight on the left leg = hips roll negative (bodypose.js: roll + tilts to
// the character's left), the spine rolls back the other way.

const relaxedL = { leftUpperArm: [0.22, -1, 0.04], leftLowerArm: [0.1, -1, 0.14] };
const relaxedR = { rightUpperArm: [-0.22, -1, 0.04], rightLowerArm: [-0.1, -1, 0.14] };
// Standing leg straight under the body, the other knee loose and forward.
const weightL = { leftUpperLeg: [-0.07, -1, 0.02], leftLowerLeg: [0, -1, 0], rightUpperLeg: [0.1, -1, 0.27], rightLowerLeg: [-0.04, -1, -0.2], rightFoot: [0.08, -0.6, 0.78] };
const weightR = { rightUpperLeg: [0.07, -1, 0.02], rightLowerLeg: [0, -1, 0], leftUpperLeg: [-0.1, -1, 0.27], leftLowerLeg: [0.04, -1, -0.2], leftFoot: [-0.08, -0.6, 0.78] };

// Thumb folded along the hand (crossed arms, hands on the body).
const tucked = { T: [15, 30, 30, -10, 45], I: [15, 20, 12, 0], M: [18, 24, 14, 0], R: [22, 28, 16, 0], L: [26, 32, 18, 2] };
const cupped = { T: [10, 10, 10, 5, 50], I: [20, 25, 15, -3], M: [22, 25, 15, 0], R: [24, 26, 15, -3], L: [26, 28, 15, -6] };

export const STANDING = [
  { name: 'Idle relaxed', tags: ['idle', 'stand'], body: {
    hips: [0, 0, 7], spine: [-2, 4, -8], head: [2, 6, 4],
    arms: { leftUpperArm: [0.2, -1, 0.02], leftLowerArm: [0.08, -1, 0.16], rightUpperArm: [-0.18, -1, 0.06], rightLowerArm: [-0.06, -1, 0.2] },
    legs: weightR,
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' } } },
  { name: 'Weight on one leg', tags: ['contrapposto', 'idle', 'stand'], body: {
    hips: [0, 0, -12], spine: [0, -6, 14], neck: [0, 0, -3], head: [3, -8, -6],
    arms: { ...relaxedL, rightUpperArm: [-0.2, -1, 0.02], rightLowerArm: [-0.1, -1, 0.16] },
    legs: weightL, hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' } } },
  { name: 'Arms crossed (relaxed)', tags: ['arms crossed', 'stand'], body: {
    wrist: { left: [70, 0], right: [70, 0] },
    ik: { rightHand: { at: 'leftUpperArm', off: [0.0, -0.24, 0.09], pole: [-0.5, -1, 0.3] }, leftHand: { at: 'rightUpperArm', off: [0.0, -0.27, 0.05], pole: [0.5, -1, 0.3] } },
    hips: [0, 0, 10], spine: [-3, 4, -11], head: [3, 8, 4],
    arms: { leftUpperArm: [0.3, -0.92, 0.25], leftLowerArm: [-0.95, 0.15, 0.32], rightUpperArm: [-0.3, -0.92, 0.28], rightLowerArm: [0.95, 0.22, 0.27] },
    legs: weightR, hands: { left: tucked, right: tucked } } },
  { name: 'Arms crossed (defensive)', tags: ['arms crossed', 'stand', 'serious'], body: {
    wrist: { left: [50, 0], right: [50, 0] },
    ik: { rightHand: { at: 'leftUpperArm', off: [0.0, -0.2, 0.09], pole: [-0.5, -1, 0.3] }, leftHand: { at: 'rightUpperArm', off: [0.0, -0.23, 0.05], pole: [0.5, -1, 0.3] } },
    hips: [0, 0, 0], spine: [-6, 0, 0], head: [-6, 0, 0], shoulders: { left: [6, 6], right: [6, 6] },
    arms: { leftUpperArm: [0.3, -0.85, 0.35], leftLowerArm: [-0.9, 0.3, 0.3], rightUpperArm: [-0.3, -0.85, 0.38], rightLowerArm: [0.9, 0.38, 0.25] },
    legs: { leftUpperLeg: [0.14, -1, 0], leftLowerLeg: [0.03, -1, 0], rightUpperLeg: [-0.14, -1, 0], rightLowerLeg: [-0.03, -1, 0] },
    hands: { left: 'Grasping (gripping fabric)', right: 'Grasping (gripping fabric)' } } },
  { name: 'Hands on hips', tags: ['hands on hips', 'stand', 'confident'], body: {
    ik: { leftHand: { at: 'hips', off: [0.15, 0.13, 0.0], pole: [1, 0, -0.5] }, rightHand: { at: 'hips', off: [-0.15, 0.13, 0.0], pole: [-1, 0, -0.5] } },
    hips: [0, 0, 3], spine: [-4, 0, -3], head: [-4, 0, 0],
    arms: { leftUpperArm: [0.72, -0.72, -0.2], leftLowerArm: [-0.72, -0.4, 0.5], rightUpperArm: [-0.72, -0.72, -0.2], rightLowerArm: [0.72, -0.4, 0.5] },
    wrist: { left: [0, 0], right: [0, 0] },
    legs: { leftUpperLeg: [0.12, -1, 0.02], leftLowerLeg: [0.03, -1, 0], rightUpperLeg: [-0.12, -1, 0.02], rightLowerLeg: [-0.03, -1, 0] },
    hands: { left: 'Open fingers together', right: 'Open fingers together' } } },
  { name: 'Hands in pockets', tags: ['pockets', 'casual', 'stand'], body: {
    ik: { leftHand: { at: 'hips', off: [0.17, -0.02, 0.05], pole: [0.8, 0, -0.8] }, rightHand: { at: 'hips', off: [-0.17, -0.02, 0.05], pole: [-0.8, 0, -0.8] } },
    hips: [0, 0, 9], spine: [-4, 6, -10], head: [4, -8, 3], shoulders: { left: [6, 0], right: [6, 0] },
    arms: { leftUpperArm: [0.42, -1, -0.05], leftLowerArm: [-0.05, -0.9, 0.4], rightUpperArm: [-0.42, -1, -0.05], rightLowerArm: [0.05, -0.9, 0.4] },
    wrist: { left: [0, 0], right: [0, 0] },
    legs: weightR, hands: { left: 'Loose fist', right: 'Loose fist' } } },
  { name: 'Thinking (hand on chin)', tags: ['thinking', 'stand'], body: {
    ik: { rightHand: { at: 'head', off: [-0.02, -0.15, 0.1], pole: [-0.2, -1, 0.2] }, leftHand: { at: 'hips', off: [-0.1, 0.2, 0.17], pole: [0.5, -1, 0] } },
    hips: [0, 0, -9], spine: [3, -4, 10], head: [8, -10, 6],
    arms: { leftUpperArm: [0.15, -0.95, 0.3], leftLowerArm: [-0.75, 0.05, 0.6], rightUpperArm: [-0.05, -0.9, 0.45], rightLowerArm: [0.6, 0.8, -0.05] },
    wrist: { right: [-30, 0] },
    legs: weightL, hands: { left: 'Relaxed', right: 'Loose fist' } } },
  { name: 'Scratching head', tags: ['confused', 'stand'], body: {
    ik: { rightHand: { at: 'head', off: [-0.07, 0.1, -0.02], pole: [-1, 0.3, 0.2] } },
    hips: [0, 0, 9], spine: [0, 4, -11], head: [4, 10, 12],
    arms: { ...relaxedL, rightUpperArm: [-0.85, 0.45, 0.2], rightLowerArm: [0.4, 0.85, -0.25] },
    legs: weightR, hands: { left: 'Relaxed (soft)', right: 'Claw' } } },
  { name: 'Facepalm', tags: ['facepalm', 'stand'], body: {
    ik: { rightHand: { at: 'head', off: [-0.02, -0.1, 0.14], pole: [-0.3, -1, 0.4] } },
    hips: [4, 0, 8], spine: [14, 0, -8], neck: [10, 0, 0], head: [18, 8, 0],
    arms: { leftUpperArm: [0.3, -0.85, 0.35], leftLowerArm: [-0.8, 0.1, 0.55], rightUpperArm: [-0.08, -0.5, 0.86], rightLowerArm: [0.3, 0.88, 0.35] },
    wrist: { right: [-25, 0] }, legs: weightR,
    hands: { left: tucked, right: cupped } } },
  { name: 'Shrug', tags: ['shrug', 'stand'], body: {
    hips: [0, 0, -7], spine: [-3, 0, 8], head: [-3, 0, 12], shoulders: { left: [22, 0], right: [22, 0] }, legs: weightL,
    arms: { leftUpperArm: [0.4, -0.9, 0.1], leftLowerArm: [0.75, 0.05, 0.65], rightUpperArm: [-0.4, -0.9, 0.1], rightLowerArm: [-0.75, 0.05, 0.65] },
    forearm: { left: -80, right: -80 },
    hands: { left: 'Open spread', right: 'Open spread' } } },
  { name: 'Waving hello', tags: ['wave', 'greeting', 'stand'], body: {
    hips: [0, 0, -9], spine: [0, 0, 10], head: [-3, 0, -6],
    arms: { ...relaxedL, rightUpperArm: [-0.9, 0.3, 0.2], rightLowerArm: [-0.25, 1, 0.1] },
    legs: weightL, hands: { left: 'Relaxed (soft)', right: 'Open fingers together' } } },
  { name: 'Big wave (both arms)', tags: ['wave', 'excited', 'stand'], body: {
    hips: [0, 0, 0], spine: [-10, 0, 0], head: [-12, 0, 0],
    arms: { leftUpperArm: [0.5, 0.85, 0.1], leftLowerArm: [0.35, 0.95, 0], rightUpperArm: [-0.55, 0.8, 0.15], rightLowerArm: [-0.55, 0.85, 0.05] },
    legs: { leftUpperLeg: [0.15, -1, 0], leftLowerLeg: [0.04, -1, 0], rightUpperLeg: [-0.15, -1, 0], rightLowerLeg: [-0.04, -1, 0] },
    hands: { left: 'Open spread', right: 'Open spread' } } },
  { name: 'Salute', tags: ['salute', 'military', 'stand'], body: {
    ik: { rightHand: { at: 'head', off: [-0.1, 0.04, 0.06], pole: [-1, 0, 0.1] } },
    spine: [-4, 0, 0], head: [-3, 0, 0],
    arms: { leftUpperArm: [0.12, -1, 0], leftLowerArm: [0.05, -1, 0.02], rightUpperArm: [-0.95, 0.05, 0.25], rightLowerArm: [0.6, 0.75, 0.2] },
    wrist: { right: [-5, 0] },
    legs: { leftUpperLeg: [0.04, -1, 0], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.04, -1, 0], rightLowerLeg: [0, -1, 0] },
    hands: { left: 'Open fingers together', right: 'Karate chop' } } },
  { name: 'Bow (polite)', tags: ['bow', 'greeting', 'japanese', 'stand'], body: {
    hips: [22, 0, 0], spine: [12, 0, 0], neck: [5, 0, 0], head: [6, 0, 0],
    arms: { leftUpperArm: [0.12, -1, 0.15], leftLowerArm: [-0.2, -0.95, 0.2], rightUpperArm: [-0.12, -1, 0.15], rightLowerArm: [0.2, -0.95, 0.2] },
    legs: { leftUpperLeg: [0.05, -1, 0.05], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.05, -1, 0.05], rightLowerLeg: [0, -1, 0] },
    hands: { left: 'Open fingers together', right: 'Open fingers together' } } },
  { name: 'Bow (deep)', tags: ['bow', 'apology', 'stand'], body: {
    hips: [55, 0, 0], spine: [18, 0, 0], neck: [8, 0, 0], head: [5, 0, 0],
    armsIn: 'world', arms: { leftUpperArm: [0.1, -1, 0.08], leftLowerArm: [0.02, -1, 0.05], rightUpperArm: [-0.1, -1, 0.08], rightLowerArm: [-0.02, -1, 0.05] },
    legs: { leftUpperLeg: [0.05, -1, -0.12], leftLowerLeg: [0, -1, 0.05], rightUpperLeg: [-0.05, -1, -0.12], rightLowerLeg: [0, -1, 0.05] },
    legsIn: 'world', feet: 'flat', hands: { left: 'Open fingers together', right: 'Open fingers together' } } },
  { name: 'Stretching overhead', tags: ['stretch', 'morning', 'stand'], body: {
    hips: [-4, 0, 6], spine: [-10, 0, -14], neck: [-5, 0, -5], head: [-10, 0, -6],
    arms: { leftUpperArm: [0.1, 1, -0.05], leftLowerArm: [-0.35, 0.95, 0], rightUpperArm: [-0.15, 1, -0.05], rightLowerArm: [0.3, 0.95, 0] },
    forearm: { left: -40, right: -40 },
    legs: { leftUpperLeg: [0.1, -1, 0], leftLowerLeg: [0.02, -1, 0], rightUpperLeg: [-0.1, -1, 0], rightLowerLeg: [-0.02, -1, 0] },
    hands: { left: 'Open fingers together', right: 'Grasping (gripping fabric)' } } },
  { name: 'Yawning stretch', tags: ['yawn', 'tired', 'stand'], body: {
    hips: [-6, 0, 0], spine: [-18, 0, 0], neck: [-10, 0, 0], head: [-22, 0, 0],
    shoulders: { left: [15, -10], right: [15, -10] },
    arms: { leftUpperArm: [0.85, 0.5, -0.15], leftLowerArm: [0.3, 0.95, -0.1], rightUpperArm: [-0.85, 0.5, -0.15], rightLowerArm: [-0.3, 0.95, -0.1] },
    legs: { leftUpperLeg: [0.12, -1, 0], leftLowerLeg: [0.03, -1, 0], rightUpperLeg: [-0.12, -1, 0], rightLowerLeg: [-0.03, -1, 0] },
    hands: { left: 'Loose fist', right: 'Loose fist' } } },
  { name: 'Checking watch', tags: ['watch', 'time', 'stand'], body: {
    hips: [0, 0, 9], spine: [5, 0, -8], neck: [10, 0, 0], head: [22, 15, 0],
    arms: { leftUpperArm: [0.35, -0.75, 0.55], leftLowerArm: [-0.6, 0.45, 0.65], ...relaxedR },
    forearm: { left: 70 }, legs: weightR,
    hands: { left: 'Relaxed', right: 'Relaxed (soft)' } } },
  { name: 'Pointing ahead', tags: ['point', 'direction', 'stand'], body: {
    hips: [0, 0, -8], spine: [0, -4, 9], head: [-4, 8, 0],
    arms: { ...relaxedL, rightUpperArm: [-0.25, 0.2, 0.95], rightLowerArm: [-0.15, 0.22, 1] },
    forearm: { right: 70 }, legs: weightL,
    hands: { left: 'Relaxed (soft)', right: 'Point' } } },
  { name: 'Calling out', tags: ['shout', 'call', 'stand'], body: {
    ik: { leftHand: { at: 'head', off: [0.09, -0.1, 0.1], pole: [1, -1, 0.3] }, rightHand: { at: 'head', off: [-0.09, -0.1, 0.1], pole: [-1, -1, 0.3] } }, wrist: { left: [-20, 0], right: [-20, 0] },
    hips: [-2, 0, 0], spine: [-8, 0, 0], neck: [-6, 0, 0], head: [-10, 0, 0],
    arms: { leftUpperArm: [0.55, -0.6, 0.55], leftLowerArm: [-0.65, 0.75, 0], rightUpperArm: [-0.55, -0.6, 0.55], rightLowerArm: [0.65, 0.75, 0] },
    legs: { leftUpperLeg: [0.12, -1, 0.15], leftLowerLeg: [0.02, -1, 0], rightUpperLeg: [-0.12, -1, -0.12], rightLowerLeg: [-0.02, -1, 0] },
    hands: { left: cupped, right: cupped } } },
  { name: 'Looking back over shoulder', tags: ['look back', 'stand'], body: {
    hips: [0, 0, -9], spine: [0, -45, 10], neck: [0, -25, 0], head: [5, -35, -5],
    arms: { leftUpperArm: [0.25, -1, -0.05], leftLowerArm: [0.15, -1, 0.1], rightUpperArm: [-0.15, -1, 0.15], rightLowerArm: [0.05, -1, 0.25] },
    legs: weightL, hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' } } },
  { name: 'Walking', tags: ['walk', 'stride'], body: {
    hips: [4, 10, 3], spine: [0, -18, -3], head: [2, 8, 0],
    arms: { leftUpperArm: [0.15, -1, 0.45], leftLowerArm: [0.05, -0.75, 0.66], rightUpperArm: [-0.15, -1, -0.42], rightLowerArm: [-0.08, -1, -0.08] },
    legs: { leftUpperLeg: [0.03, -1, -0.42], leftLowerLeg: [0, -0.82, -0.58], leftFoot: [0, -0.8, 0.6], rightUpperLeg: [-0.04, -1, 0.48], rightLowerLeg: [0, -1, 0.12], rightFoot: [0, 0.15, 1] },
    feet: 'free', hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' } } },
  { name: 'Tiptoeing', tags: ['sneak', 'tiptoe', 'stand'], body: {
    hips: [8, 0, 0], spine: [10, 0, 0], head: [-10, 15, 0], shoulders: { left: [10, 5], right: [10, 5] },
    arms: { leftUpperArm: [0.45, -0.7, 0.3], leftLowerArm: [0.2, 0.3, 0.9], rightUpperArm: [-0.45, -0.7, 0.1], rightLowerArm: [-0.2, 0.1, 0.95] },
    wrist: { left: [40, 0], right: [40, 0] },
    legs: { leftUpperLeg: [0.08, -1, 0.3], leftLowerLeg: [0, -1, -0.05], rightUpperLeg: [-0.08, -1, -0.15], rightLowerLeg: [0, -1, -0.25], leftFoot: [0, -0.8, 0.6], rightFoot: [0, -0.8, 0.6] },
    hands: { left: 'Limp', right: 'Limp' } } },
  { name: 'Shy', tags: ['shy', 'cute', 'stand'], body: {
    ik: { leftHand: { at: 'hips', off: [0.03, -0.12, 0.13], pole: [0.3, 0, -1] }, rightHand: { at: 'hips', off: [-0.03, -0.12, 0.13], pole: [-0.3, 0, -1] } },
    hips: [2, 0, -5], spine: [8, 0, 5], neck: [8, 0, 0], head: [14, -12, -12], shoulders: { left: [10, 10], right: [10, 10] },
    arms: { leftUpperArm: [0.1, -1, 0.15], leftLowerArm: [-0.45, -0.85, 0.3], rightUpperArm: [-0.1, -1, 0.15], rightLowerArm: [0.45, -0.85, 0.3] },
    legs: { leftUpperLeg: [0.03, -1, 0.02], leftLowerLeg: [0, -1, 0], rightUpperLeg: [0.02, -1, 0.15], rightLowerLeg: [-0.08, -1, -0.05], rightFoot: [0.3, -0.5, 0.8] },
    hands: { left: 'Hold a glass', right: 'Hold a glass' } } },
  { name: 'Power stance', tags: ['confident', 'hero', 'stand'], body: {
    hips: [0, 0, 0], spine: [-8, 0, 0], neck: [-4, 0, 0], head: [-8, 0, 0], shoulders: { left: [0, -10], right: [0, -10] },
    arms: { leftUpperArm: [0.7, -0.72, -0.15], leftLowerArm: [-0.7, -0.35, 0.55], rightUpperArm: [-0.7, -0.72, -0.15], rightLowerArm: [0.7, -0.35, 0.55] },
    legs: { leftUpperLeg: [0.25, -1, 0], leftLowerLeg: [0.06, -1, 0], rightUpperLeg: [-0.25, -1, 0], rightLowerLeg: [-0.06, -1, 0] },
    hands: { left: 'Fist', right: 'Fist' } } },
  { name: 'Cheering', tags: ['cheer', 'victory', 'happy'], body: {
    hips: [-4, 0, 0], spine: [-14, 0, 0], neck: [-6, 0, 0], head: [-14, 0, 0],
    arms: { leftUpperArm: [0.45, 0.88, 0.1], leftLowerArm: [0.2, 1, 0.05], rightUpperArm: [-0.45, 0.88, 0.1], rightLowerArm: [-0.2, 1, 0.05] },
    legs: { leftUpperLeg: [0.18, -1, 0], leftLowerLeg: [0.04, -1, 0], rightUpperLeg: [-0.18, -1, 0], rightLowerLeg: [-0.04, -1, 0] },
    hands: { left: 'Fist', right: 'Fist' } } },
  { name: 'Praying hands', tags: ['pray', 'thanks', 'stand'], body: {
    wrist: { left: [-35, 0], right: [-35, 0] },
    ik: { leftHand: { at: 'chest', off: [0.025, 0.0, 0.2], pole: [1, -1, 0] }, rightHand: { at: 'chest', off: [-0.025, 0.0, 0.2], pole: [-1, -1, 0] } },
    hips: [0, 0, -6], spine: [4, 0, 7], neck: [6, 0, 0], head: [14, 0, 0], legs: weightL,
    arms: { leftUpperArm: [0.35, -0.85, 0.35], leftLowerArm: [-0.7, 0.6, 0.38], rightUpperArm: [-0.35, -0.85, 0.35], rightLowerArm: [0.7, 0.6, 0.38] },
    hands: { left: 'Open fingers together', right: 'Open fingers together' } } },
  { name: 'Hugging self (cold)', tags: ['cold', 'hug', 'stand'], body: {
    wrist: { left: [50, 0], right: [50, 0] },
    ik: { rightHand: { at: 'leftUpperArm', off: [0.0, -0.16, 0.08], pole: [-0.5, -1, 0.4] }, leftHand: { at: 'rightUpperArm', off: [0.0, -0.19, 0.06], pole: [0.5, -1, 0.4] } },
    hips: [4, 0, 0], spine: [12, 0, 0], neck: [8, 0, 0], head: [8, 0, 0], shoulders: { left: [18, 15], right: [18, 15] },
    arms: { leftUpperArm: [0.15, -0.8, 0.55], leftLowerArm: [-0.95, 0.25, 0.1], rightUpperArm: [-0.15, -0.85, 0.5], rightLowerArm: [0.95, 0.3, 0.05] },
    legs: { leftUpperLeg: [-0.03, -1, 0.12], leftLowerLeg: [0.05, -1, -0.04], rightUpperLeg: [0.03, -1, 0.12], rightLowerLeg: [-0.05, -1, -0.04] },
    hands: { left: 'Grasping (gripping fabric)', right: 'Grasping (gripping fabric)' } } },

];
