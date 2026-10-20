// Action and fighting poses (bodypose.js format).
// Notes for authors: the library normalises the hips to face forward, so hips
// yaw only twists the legs against the body. roll + leans the body to the
// character's left. Orthodox stance = left foot forward, body turned right.
const F = { left: 'Fist', right: 'Fist' };
const stanceLegs = {
  leftUpperLeg: [0.12, -0.95, 0.32], leftLowerLeg: [0.02, -1, -0.08],
  rightUpperLeg: [-0.2, -0.97, -0.2], rightLowerLeg: [-0.02, -1, -0.12],
};
const guardL = { leftUpperArm: [0.3, -0.65, 0.6], leftLowerArm: [-0.3, 0.85, 0.45] };
const guardR = { rightUpperArm: [-0.3, -0.7, 0.55], rightLowerArm: [0.35, 0.85, 0.4] };

export const ACTION = [
  // ---- boxing
  { name: 'Boxing guard', tags: ['boxing', 'fight', 'guard', 'still'], body: {
    hips: [5, -30, 0], spine: [10, -5, 0], neck: [5, 0, 0], head: [8, 30, 0],
    shoulders: { left: [10, 10], right: [10, 10] },
    arms: { ...guardL, ...guardR }, legs: stanceLegs, hands: F,
    ik: { leftHand: { at: 'head', off: [0.06, -0.1, 0.24], pole: [0.3, -1, 0] }, rightHand: { at: 'head', off: [-0.1, -0.12, 0.15], pole: [-0.3, -1, 0] } } } },
  { name: 'Jab', tags: ['boxing', 'punch', 'fight'], body: {
    hips: [5, -35, 0], spine: [8, -10, 0], head: [5, 40, 0],
    shoulders: { left: [5, 30], right: [10, 5] },
    arms: { leftUpperArm: [0.5, 0.05, 0.86], leftLowerArm: [0.5, 0.05, 0.86], ...guardR },
    forearm: { left: 70 }, legs: stanceLegs, hands: F } },
  { name: 'Cross', tags: ['boxing', 'punch', 'fight'], body: {
    hips: [8, 20, 0], spine: [10, 25, 0], head: [5, -40, 0],
    shoulders: { right: [5, 35], left: [10, 0] },
    arms: { rightUpperArm: [-0.55, 0.08, 0.83], rightLowerArm: [-0.55, 0.05, 0.83], ...guardL },
    forearm: { right: 70 },
    legs: { leftUpperLeg: [0.12, -0.92, 0.38], leftLowerLeg: [0.02, -1, -0.05], rightUpperLeg: [-0.18, -0.95, -0.3], rightLowerLeg: [-0.02, -0.9, -0.42] },
    feet: 'free', hands: F } },
  { name: 'Uppercut', tags: ['boxing', 'punch', 'fight'], body: {
    hips: [-5, 15, 0], spine: [-10, 30, -8], head: [-5, -30, 0],
    arms: { rightUpperArm: [-0.2, -0.75, 0.65], rightLowerArm: [0.2, 0.9, 0.35], ...guardL },
    forearm: { right: -60 },
    legs: { leftUpperLeg: [0.15, -0.9, 0.35], leftLowerLeg: [0.02, -1, -0.12], rightUpperLeg: [-0.18, -0.95, -0.25], rightLowerLeg: [-0.02, -1, -0.15] },
    hands: F } },
  { name: 'Hook', tags: ['boxing', 'punch', 'fight'], body: {
    hips: [5, 30, 0], spine: [8, 30, 5], head: [5, -45, 0],
    shoulders: { left: [15, 20] },
    arms: { leftUpperArm: [0.95, 0.2, 0.25], leftLowerArm: [-0.3, 0.1, 0.95], ...guardR },
    forearm: { left: 90 }, legs: stanceLegs, hands: F } },
  // ---- kicks and close strikes
  // Kicks: the kicking knee is never hyperextended (the shin sits a touch
  // below the thigh line), the standing knee is soft and its foot pivots away
  // from the target, the body leans away from the kick for balance.
  { name: 'Front kick', tags: ['kick', 'fight', 'martial arts'], body: {
    hips: [-14, 0, 0], spine: [6, 0, 0], head: [12, 0, 0],
    arms: { ...guardL, rightUpperArm: [-0.35, -0.8, -0.3], rightLowerArm: [-0.1, -0.2, 0.95] },
    legs: { rightUpperLeg: [-0.05, 0.3, 0.95], rightLowerLeg: [-0.03, 0.2, 0.98], rightFoot: [0, 0.95, 0.3],
      leftUpperLeg: [0.08, -0.97, 0.18], leftLowerLeg: [0.02, -1, -0.1], leftFoot: [0.25, -0.05, 0.95] },
    hands: F } },
  { name: 'Side kick', tags: ['kick', 'fight', 'martial arts'], body: {
    hips: [0, 0, 28], spine: [4, 0, 14], neck: [0, -20, -10], head: [0, -55, -15],
    arms: { ...guardL, rightUpperArm: [-0.55, -0.7, 0.45], rightLowerArm: [0.35, 0.65, 0.65] },
    legs: { rightUpperLeg: [-0.97, 0.24, 0.04], rightLowerLeg: [-0.98, 0.18, -0.03], rightFoot: [0, -0.4, 0.92],
      leftUpperLeg: [0.12, -0.97, 0.12], leftLowerLeg: [0.02, -1, -0.07], leftFoot: [0.55, -0.05, -0.83] },
    hands: F } },
  { name: 'Roundhouse kick', tags: ['kick', 'fight', 'martial arts', 'muay thai'], body: {
    hips: [-4, 35, 24], spine: [2, 10, 12], neck: [0, -20, -8], head: [0, -50, -12],
    arms: { ...guardL, rightUpperArm: [-0.35, -0.75, -0.55], rightLowerArm: [-0.15, -0.95, 0.25] },
    legs: { rightUpperLeg: [-0.55, 0.32, 0.77], rightLowerLeg: [-0.52, 0.22, 0.82], rightFoot: [-0.5, 0.12, 0.86],
      leftUpperLeg: [0.12, -0.97, 0.1], leftLowerLeg: [0.02, -1, -0.08], leftFoot: [0.55, -0.05, -0.83] },
    hands: F } },
  { name: 'High kick', tags: ['kick', 'fight', 'flexible', 'axe kick'], body: {
    hips: [-28, 0, 0], spine: [14, 0, 0], head: [20, 0, 0],
    arms: { leftUpperArm: [0.7, -0.4, 0.5], leftLowerArm: [0.2, 0.3, 0.9], rightUpperArm: [-0.8, -0.3, -0.2], rightLowerArm: [-0.6, -0.4, 0.5] },
    legs: { rightUpperLeg: [-0.04, 0.88, 0.47], rightLowerLeg: [-0.02, 0.84, 0.54], rightFoot: [0, 0.3, 0.95],
      leftUpperLeg: [0.06, -0.98, 0.14], leftLowerLeg: [0.02, -1, -0.08] },
    hands: F } },
  { name: 'Knee strike', tags: ['muay thai', 'knee', 'fight'], body: {
    hips: [-20, 0, 0], spine: [20, 0, 0], head: [15, 0, 0],
    shoulders: { left: [10, 20], right: [10, 20] },
    arms: { leftUpperArm: [0.2, 0.3, 0.95], leftLowerArm: [-0.2, -0.6, 0.75], rightUpperArm: [-0.2, 0.3, 0.95], rightLowerArm: [0.2, -0.6, 0.75] },
    legs: { rightUpperLeg: [-0.05, 0.45, 0.9], rightLowerLeg: [0, -0.6, 0.15], rightFoot: [0, -0.6, -0.8], leftUpperLeg: [0.06, -1, -0.15], leftLowerLeg: [0.02, -1, -0.05] },
    hands: { left: 'Grab (C-shape)', right: 'Grab (C-shape)' } } },
  { name: 'Elbow strike', tags: ['muay thai', 'elbow', 'fight'], body: {
    hips: [5, 25, 0], spine: [10, 30, 5], head: [10, -50, 0],
    shoulders: { right: [20, 30] },
    arms: { rightUpperArm: [0.35, 0.25, 0.9], rightLowerArm: [-0.9, 0.1, -0.35], ...guardL },
    legs: stanceLegs, hands: F } },
  // ---- defence
  { name: 'Block high', tags: ['block', 'defend', 'fight'], body: {
    hips: [0, -15, 0], spine: [5, -5, 0], head: [-10, 10, 0],
    shoulders: { left: [20, 10], right: [20, 10] },
    arms: { leftUpperArm: [0.5, 0.55, 0.65], leftLowerArm: [-0.85, 0.35, 0.3], rightUpperArm: [-0.45, 0.6, 0.65], rightLowerArm: [0.85, 0.45, 0.25] },
    legs: stanceLegs, hands: F } },
  { name: 'Block low', tags: ['block', 'defend', 'fight', 'karate'], body: {
    hips: [10, -35, 0], spine: [5, -10, 0], head: [10, 40, 0],
    arms: { leftUpperArm: [0.45, -0.75, 0.5], leftLowerArm: [0.15, -0.75, 0.65], rightUpperArm: [-0.25, -0.6, -0.75], rightLowerArm: [0.1, -0.05, 1] },
    forearm: { left: 80, right: -90 },
    ik: { rightHand: { at: 'hips', off: [-0.2, 0.12, 0.04], pole: [-0.2, 0, -1] } },
    legs: { leftUpperLeg: [0.12, -0.7, 0.7], leftLowerLeg: [0.02, -1, 0.1], rightUpperLeg: [-0.15, -0.75, -0.65], rightLowerLeg: [-0.05, -0.75, -0.65] },
    hands: F } },
  { name: 'Karate front stance', tags: ['karate', 'martial arts', 'stance', 'punch'], body: {
    hips: [5, 0, 0], spine: [0, 0, 0], head: [5, 0, 0],
    arms: { leftUpperArm: [0.05, 0.05, 1], leftLowerArm: [0, 0.05, 1], rightUpperArm: [-0.25, -0.6, -0.75], rightLowerArm: [0.1, -0.05, 1] },
    forearm: { left: 90, right: -90 },
    ik: { rightHand: { at: 'hips', off: [-0.2, 0.12, 0.04], pole: [-0.2, 0, -1] } },
    legs: { leftUpperLeg: [0.12, -0.7, 0.7], leftLowerLeg: [0.02, -1, 0.1], rightUpperLeg: [-0.12, -0.75, -0.65], rightLowerLeg: [-0.04, -0.75, -0.65] },
    hands: F } },
  { name: 'Kung fu crane', tags: ['kung fu', 'martial arts', 'balance', 'still'], body: {
    hips: [0, 0, 0], spine: [-5, 0, 0], head: [5, 0, 0],
    shoulders: { left: [15, -10], right: [15, -10] },
    arms: { leftUpperArm: [0.95, 0.25, -0.1], leftLowerArm: [0.95, 0.15, 0.1], rightUpperArm: [-0.95, 0.25, -0.1], rightLowerArm: [-0.95, 0.15, 0.1] },
    wrist: { left: [80, 0], right: [80, 0] },
    legs: { rightUpperLeg: [-0.05, 0.25, 1], rightLowerLeg: [0, -1, 0.1], rightFoot: [0, -0.8, 0.5], leftUpperLeg: [0.04, -1, 0], leftLowerLeg: [0, -1, 0] },
    hands: { left: 'Pinch (tips)', right: 'Pinch (tips)' } } },
  { name: 'Dodge left', tags: ['dodge', 'evade', 'fight'], body: {
    hips: [5, 0, 15], spine: [10, 10, 20], head: [5, -10, -15],
    arms: { leftUpperArm: [0.6, -0.6, 0.5], leftLowerArm: [-0.2, 0.8, 0.55], rightUpperArm: [-0.4, -0.5, 0.75], rightLowerArm: [0.4, 0.75, 0.5] },
    legs: { leftUpperLeg: [0.3, -0.8, 0.45], leftLowerLeg: [0.05, -1, -0.15], rightUpperLeg: [-0.6, -0.8, 0], rightLowerLeg: [-0.55, -0.83, 0] },
    feet: 'free', hands: F } },
  { name: 'Dodge right', tags: ['dodge', 'evade', 'fight'], body: {
    hips: [5, 0, -15], spine: [10, -10, -20], head: [5, 10, 15],
    arms: { rightUpperArm: [-0.6, -0.6, 0.5], rightLowerArm: [0.2, 0.8, 0.55], leftUpperArm: [0.4, -0.5, 0.75], leftLowerArm: [-0.4, 0.75, 0.5] },
    legs: { rightUpperLeg: [-0.3, -0.8, 0.45], rightLowerLeg: [-0.05, -1, -0.15], leftUpperLeg: [0.6, -0.8, 0], leftLowerLeg: [0.55, -0.83, 0] },
    feet: 'free', hands: F } },
  { name: 'Lean-back dodge (bullet time)', tags: ['dodge', 'matrix', 'evade', 'action'], body: {
    hips: [-25, 0, 0], spine: [-45, 0, 0], neck: [-10, 0, 0], head: [25, 0, 0],
    arms: { leftUpperArm: [0.9, 0.15, -0.35], leftLowerArm: [0.7, 0.6, -0.3], rightUpperArm: [-0.9, 0.15, -0.35], rightLowerArm: [-0.7, 0.6, -0.3] },
    legs: { leftUpperLeg: [0.15, -0.55, 0.8], leftLowerLeg: [0.02, -0.65, -0.75], rightUpperLeg: [-0.15, -0.6, 0.75], rightLowerLeg: [-0.02, -0.65, -0.75] },
    hands: { left: 'Open spread', right: 'Open spread' } } },
  { name: 'Duck under', tags: ['dodge', 'duck', 'crouch', 'fight'], body: {
    hips: [35, 0, 0], spine: [35, 0, 0], neck: [-25, 0, 0], head: [-25, 0, 0],
    arms: { ...guardL, ...guardR },
    legs: { leftUpperLeg: [0.25, -0.35, 0.9], leftLowerLeg: [0.05, -1, -0.25], rightUpperLeg: [-0.25, -0.5, 0.8], rightLowerLeg: [-0.05, -1, -0.3] },
    hands: F } },
  // ---- hits and falls
  { name: 'Hit in the chest', tags: ['hit', 'knocked back', 'hurt', 'reaction'], body: {
    hips: [-14, 0, 0], spine: [24, 0, 0], neck: [10, 0, 0], head: [18, 0, 0],
    shoulders: { left: [8, -10], right: [8, -10] },
    arms: { leftUpperArm: [0.7, -0.45, -0.55], leftLowerArm: [0.45, -0.4, -0.8], rightUpperArm: [-0.7, -0.45, -0.55], rightLowerArm: [-0.45, -0.4, -0.8] },
    legs: { leftUpperLeg: [0.08, -0.97, 0.2], leftLowerLeg: [0, -1, 0.05], rightUpperLeg: [-0.1, -0.88, -0.45], rightLowerLeg: [-0.03, -0.88, -0.45] },
    feet: 'free', hands: { left: 'Open spread', right: 'Open spread' } } },
  { name: 'Blown away', tags: ['launched', 'knocked back', 'flying back', 'explosion', 'midair'], body: {
    hips: [-55, 10, 10], spine: [-30, 0, 0], neck: [20, 0, 0], head: [25, 0, 0],
    arms: { leftUpperArm: [0.6, 0.2, 0.75], leftLowerArm: [0.3, 0.6, 0.75], rightUpperArm: [-0.7, 0.4, 0.55], rightLowerArm: [-0.3, 0.85, 0.4] },
    legsIn: 'hips',
    legs: { leftUpperLeg: [0.15, -0.6, 0.8], leftLowerLeg: [0.05, -1, -0.1], rightUpperLeg: [-0.15, -0.9, 0.35], rightLowerLeg: [0, -0.8, -0.6] },
    feet: 'free', lift: 0.8, hands: { left: 'Tense spread', right: 'Tense spread' } } },
  { name: 'Stumble', tags: ['trip', 'fall', 'reaction'], body: {
    hips: [30, 0, 5], spine: [10, 0, 0], neck: [-20, 0, 0], head: [-30, 0, 0],
    arms: { leftUpperArm: [0.35, -0.4, 0.85], leftLowerArm: [0.15, -0.6, 0.8], rightUpperArm: [-0.4, -0.3, 0.85], rightLowerArm: [-0.15, -0.55, 0.8] },
    wrist: { left: [-50, 0], right: [-50, 0] },
    legs: { leftUpperLeg: [0.1, -0.6, 0.8], leftLowerLeg: [0.02, -1, 0.1], rightUpperLeg: [-0.08, -0.65, -0.75], rightLowerLeg: [0, 0.1, -1] },
    feet: 'free', hands: { left: 'Open spread', right: 'Open spread' } } },
  { name: 'Falling backward', tags: ['fall', 'reaction', 'midair'], body: {
    hips: [-50, 0, 0], spine: [5, 0, 0], neck: [15, 0, 0], head: [20, 0, 0],
    arms: { leftUpperArm: [0.4, 0.6, 0.7], leftLowerArm: [0.2, 0.8, 0.55], rightUpperArm: [-0.45, 0.4, 0.8], rightLowerArm: [-0.2, 0.6, 0.75] },
    legsIn: 'hips',
    legs: { leftUpperLeg: [0.1, -0.5, 0.85], leftLowerLeg: [0, -1, 0.15], rightUpperLeg: [-0.1, -0.9, 0.3], rightLowerLeg: [0, -1, -0.1] },
    feet: 'free', lift: 0.35, hands: { left: 'Open spread', right: 'Open spread' } } },
  { name: 'Superhero landing', tags: ['landing', 'kneel', 'hero', 'impact'], body: {
    hips: [30, 0, 0], spine: [25, 0, 0], neck: [-25, 0, 0], head: [-30, 0, 0],
    armsIn: 'world',
    arms: { rightUpperArm: [-0.25, -1, 0.3], rightLowerArm: [0, -1, 0.15], leftUpperArm: [0.85, -0.05, -0.5], leftLowerArm: [0.85, 0.15, -0.45] },
    legs: { leftUpperLeg: [0.25, -0.25, 0.95], leftLowerLeg: [0.03, -1, -0.05], rightUpperLeg: [-0.15, -1, -0.15], rightLowerLeg: [0, -0.1, -1] },
    feet: 'free', hands: { right: 'Fist', left: 'Open spread' } } },
  // ---- athletics and big gestures
  { name: 'Sprint', tags: ['run', 'sprint'], body: {
    hips: [12, -8, 0], spine: [10, 14, 0], head: [-12, -6, 0],
    arms: { leftUpperArm: [0.15, -0.55, 0.8], leftLowerArm: [-0.2, 0.6, 0.75], rightUpperArm: [-0.15, -0.7, -0.6], rightLowerArm: [-0.05, -0.3, 0.95] },
    legs: { leftUpperLeg: [0.02, -0.75, -0.6], leftLowerLeg: [0, -0.15, -1], rightUpperLeg: [-0.03, -0.3, 0.95], rightLowerLeg: [0, -1, 0.05] },
    hands: { left: 'Karate chop', right: 'Karate chop' }, feet: 'free', lift: 0.04 } },
  { name: 'Sprint start (set)', tags: ['run', 'start', 'athletics', 'crouch'], body: {
    hips: [70, 0, 0], spine: [10, 0, 0], neck: [-10, 0, 0], head: [-15, 0, 0],
    armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.15, -1, 0.05], leftLowerArm: [0.03, -1, 0.02], rightUpperArm: [-0.15, -1, 0.05], rightLowerArm: [-0.03, -1, 0.02] },
    legs: { leftUpperLeg: [0.08, -0.7, 0.7], leftLowerLeg: [0, -0.5, -0.85], rightUpperLeg: [-0.08, -0.65, -0.75], rightLowerLeg: [0, -0.35, -0.95] },
    feet: 'free', hands: { left: 'Five', right: 'Five' } } },
  { name: 'Baseball slide', tags: ['slide', 'sport', 'ground'], body: {
    hips: [-70, 0, 0], spine: [10, 0, 0], neck: [20, 0, 0], head: [20, 0, 0],
    armsIn: 'world', legsIn: 'world',
    arms: { rightUpperArm: [-0.4, -0.5, -0.75], rightLowerArm: [-0.1, -0.95, 0.2], leftUpperArm: [0.4, 0.85, 0.3], leftLowerArm: [0.2, 0.95, 0.25] },
    legs: { leftUpperLeg: [0.05, -0.15, 1], leftLowerLeg: [0, -0.1, 1], rightUpperLeg: [-0.2, -0.25, 0.95], rightLowerLeg: [-0.1, -0.15, -1] },
    feet: 'free', hands: { left: 'Open spread', right: 'Open flat' } } },
  { name: 'Pitch (throw)', tags: ['throw', 'baseball', 'sport'], body: {
    hips: [8, -10, 0], spine: [-6, -35, 6], neck: [0, 15, 0], head: [0, 30, 0],
    arms: { rightUpperArm: [-0.95, 0.3, -0.12], rightLowerArm: [-0.2, 0.8, -0.55], leftUpperArm: [0.35, 0.12, 0.93], leftLowerArm: [0.25, 0.05, 0.97] },
    forearm: { right: -40 },
    legs: { leftUpperLeg: [0.12, -0.75, 0.65], leftLowerLeg: [0.02, -1, 0.05], rightUpperLeg: [-0.15, -0.85, -0.5], rightLowerLeg: [-0.05, -0.75, -0.66] },
    feet: 'free', hands: { right: 'Grab (C-shape)', left: 'Open fingers together' } } },
  { name: 'Victory (fists up)', tags: ['victory', 'celebrate', 'win'], body: {
    spine: [-12, 0, 0], neck: [-10, 0, 0], head: [-20, 0, 0],
    shoulders: { left: [20, 0], right: [20, 0] },
    arms: { leftUpperArm: [0.5, 0.85, 0.1], leftLowerArm: [0.15, 1, 0.05], rightUpperArm: [-0.5, 0.85, 0.1], rightLowerArm: [-0.15, 1, 0.05] },
    legs: { leftUpperLeg: [0.15, -1, 0.02], rightUpperLeg: [-0.15, -1, 0.02] },
    hands: F } },
  { name: 'Power-up (charging)', tags: ['power', 'anime', 'scream', 'charge'], body: {
    hips: [10, 0, 0], spine: [-15, 0, 0], neck: [-15, 0, 0], head: [-25, 0, 0],
    shoulders: { left: [15, -10], right: [15, -10] },
    arms: { leftUpperArm: [0.35, -0.75, -0.55], leftLowerArm: [0.05, -0.1, 1], rightUpperArm: [-0.35, -0.75, -0.55], rightLowerArm: [-0.05, -0.1, 1] },
    forearm: { left: -80, right: -80 },
    ik: { leftHand: { at: 'hips', off: [0.22, 0.1, 0.04], pole: [0.4, 0, -1] }, rightHand: { at: 'hips', off: [-0.22, 0.1, 0.04], pole: [-0.4, 0, -1] } },
    legs: { leftUpperLeg: [0.4, -0.85, 0.2], leftLowerLeg: [0.05, -1, -0.1], rightUpperLeg: [-0.4, -0.85, 0.2], rightLowerLeg: [-0.05, -1, -0.1] },
    hands: F } },
  { name: 'Come at me (taunt)', tags: ['taunt', 'beckon', 'fight', 'attitude'], body: {
    hips: [0, -15, 5], spine: [-5, -10, 0], head: [-10, 20, 8],
    arms: { rightUpperArm: [-0.25, -0.45, 0.85], rightLowerArm: [0.05, 0.3, 0.95], leftUpperArm: [0.25, -1, 0.05], leftLowerArm: [0.1, -1, 0.15] },
    forearm: { right: -90 },
    legs: { leftUpperLeg: [0.12, -1, 0.2], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.15, -1, -0.12], rightLowerLeg: [0, -1, -0.05] },
    hands: { right: 'Beckon', left: 'Relaxed' } } },
  { name: 'Push', tags: ['push', 'shove', 'effort'], body: {
    hips: [25, 0, 0], spine: [10, 0, 0], neck: [-15, 0, 0], head: [-10, 0, 0],
    shoulders: { left: [5, 25], right: [5, 25] },
    arms: { leftUpperArm: [0.15, 0.15, 1], leftLowerArm: [0.05, 0.1, 1], rightUpperArm: [-0.15, 0.15, 1], rightLowerArm: [-0.05, 0.1, 1] },
    wrist: { left: [-70, 0], right: [-70, 0] }, forearm: { left: 85, right: 85 },
    legs: { leftUpperLeg: [0.1, -0.85, 0.45], leftLowerLeg: [0.02, -1, -0.05], rightUpperLeg: [-0.1, -0.7, -0.7], rightLowerLeg: [-0.03, -0.7, -0.7] },
    feet: 'free', hands: { left: 'Open fingers together', right: 'Open fingers together' } } },
  { name: 'Pull (tug of war)', tags: ['pull', 'rope', 'effort'], body: {
    hips: [-25, 0, 0], spine: [-5, 0, 0], neck: [10, 0, 0], head: [10, 0, 0],
    arms: { leftUpperArm: [0.1, -0.75, 0.65], leftLowerArm: [0, -0.4, 0.9], rightUpperArm: [-0.1, -0.8, 0.6], rightLowerArm: [0.05, -0.45, 0.9] },
    forearm: { left: 70, right: 70 },
    legs: { leftUpperLeg: [0.12, -0.75, 0.65], leftLowerLeg: [0.02, -0.85, 0.5], rightUpperLeg: [-0.12, -0.9, -0.1], rightLowerLeg: [-0.03, -1, -0.35] },
    feet: 'free', hands: F } },
];
