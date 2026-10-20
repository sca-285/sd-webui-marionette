// Midair, jumps, flips and flying (bodypose.js format). `lift` raises the body
// above the floor after the lowest point is grounded; feet are left free.
const toes = { leftFoot: [0, -0.85, 0.5], rightFoot: [0, -0.85, 0.5] };
const open = { left: 'Open spread', right: 'Open spread' };

export const AIR = [
  // ---- jumps
  { name: 'Star jump', tags: ['jump', 'star', 'joy'], body: {
    spine: [-8, 0, 0], head: [-15, 0, 0],
    arms: { leftUpperArm: [0.7, 0.7, 0], leftLowerArm: [0.6, 0.8, 0], rightUpperArm: [-0.7, 0.7, 0], rightLowerArm: [-0.6, 0.8, 0] },
    legs: { leftUpperLeg: [0.45, -0.9, 0.02], leftLowerLeg: [0.45, -0.9, 0], rightUpperLeg: [-0.45, -0.9, 0.02], rightLowerLeg: [-0.45, -0.9, 0], ...toes },
    feet: 'free', lift: 0.55, hands: open } },
  { name: 'Tuck jump', tags: ['jump', 'tuck'], body: {
    hips: [10, 0, 0], spine: [20, 0, 0],
    arms: { leftUpperArm: [0.3, 0.7, 0.6], leftLowerArm: [0.2, 0.9, 0.3], rightUpperArm: [-0.3, 0.7, 0.6], rightLowerArm: [-0.2, 0.9, 0.3] },
    legs: { leftUpperLeg: [0.1, 0.45, 0.89], leftLowerLeg: [0.04, -0.95, -0.3], rightUpperLeg: [-0.1, 0.45, 0.89], rightLowerLeg: [-0.04, -0.95, -0.3], ...toes },
    hands: open, feet: 'free', lift: 0.6 } },
  { name: 'Straddle jump', tags: ['jump', 'split', 'cheer', 'gymnastics'], body: {
    hips: [-15, 0, 0], spine: [25, 0, 0], head: [-15, 0, 0],
    arms: { leftUpperArm: [0.85, 0.05, 0.5], leftLowerArm: [0.8, 0, 0.6], rightUpperArm: [-0.85, 0.05, 0.5], rightLowerArm: [-0.8, 0, 0.6] },
    legs: { leftUpperLeg: [0.95, 0.1, 0.3], leftLowerLeg: [0.95, 0.1, 0.3], rightUpperLeg: [-0.95, 0.1, 0.3], rightLowerLeg: [-0.95, 0.1, 0.3], leftFoot: [1, 0.2, 0.2], rightFoot: [-1, 0.2, 0.2] },
    feet: 'free', lift: 0.8, hands: { left: 'Open fingers together', right: 'Open fingers together' } } },
  { name: 'Leap (grand jeté)', tags: ['leap', 'ballet', 'dance', 'split'], body: {
    hips: [5, 0, 0], spine: [-10, 0, 0], neck: [-5, 0, 0], head: [-10, 0, 0],
    arms: { leftUpperArm: [0.3, 0.6, 0.75], leftLowerArm: [0.15, 0.7, 0.7], rightUpperArm: [-0.95, 0.25, -0.1], rightLowerArm: [-0.95, 0.3, 0.1] },
    legs: { leftUpperLeg: [0.02, 0.1, 1], leftLowerLeg: [0.02, 0.1, 1], leftFoot: [0, 0.05, 1], rightUpperLeg: [-0.02, 0.2, -1], rightLowerLeg: [-0.02, 0.35, -0.95], rightFoot: [0, 0.3, -1] },
    feet: 'free', lift: 0.6, hands: { left: 'Elegant (ballet)', right: 'Elegant (ballet)' } } },
  { name: 'Long jump (hang, mid-flight)', tags: ['jump', 'athletics', 'long jump', 'flight'], body: {
    hips: [-8, 0, 0], spine: [-16, 0, 0], neck: [-5, 0, 0], head: [-5, 0, 0],
    arms: { leftUpperArm: [0.35, 0.85, -0.35], leftLowerArm: [0.2, 0.8, -0.55], rightUpperArm: [-0.35, 0.85, -0.35], rightLowerArm: [-0.2, 0.8, -0.55] },
    legs: { leftUpperLeg: [0.1, -0.8, -0.5], leftLowerLeg: [0.02, -0.3, -0.95], rightUpperLeg: [-0.1, -0.92, 0.3], rightLowerLeg: [-0.02, -0.85, -0.5], ...toes },
    feet: 'free', lift: 0.7, hands: open } },
  { name: 'Bunny hop', tags: ['jump', 'hop', 'cute', 'playful'], body: {
    spine: [5, 0, 0], head: [-10, 0, 10],
    arms: { leftUpperArm: [0.3, -0.5, 0.8], leftLowerArm: [0.1, 0.7, 0.7], rightUpperArm: [-0.3, -0.5, 0.8], rightLowerArm: [-0.1, 0.7, 0.7] },
    legs: { leftUpperLeg: [0.12, -0.7, 0.3], leftLowerLeg: [0.05, -0.5, -0.85], rightUpperLeg: [-0.12, -0.7, 0.3], rightLowerLeg: [-0.05, -0.5, -0.85], ...toes },
    feet: 'free', lift: 0.35, hands: { left: 'Loose fist', right: 'Loose fist' } } },
  // ---- airborne attacks
  { name: 'Jump kick', tags: ['kick', 'jump', 'fight', 'martial arts'], body: {
    hips: [-25, 0, 0], spine: [15, 0, 0], head: [10, 0, 0],
    arms: { leftUpperArm: [0.35, -0.55, 0.6], leftLowerArm: [-0.3, 0.8, 0.5], rightUpperArm: [-0.8, -0.1, -0.5], rightLowerArm: [-0.6, 0.3, -0.5] },
    legs: { rightUpperLeg: [-0.05, 0.35, 0.95], rightLowerLeg: [-0.02, 0.27, 0.96], rightFoot: [0, 0.95, 0.25], leftUpperLeg: [0.08, -0.2, 0.95], leftLowerLeg: [0.02, -1, -0.15], leftFoot: [0, -0.8, 0.5] },
    feet: 'free', lift: 0.7, hands: { left: 'Fist', right: 'Fist' } } },
  { name: 'Flying side kick', tags: ['kick', 'flying', 'fight', 'martial arts'], body: {
    hips: [0, 0, 40], spine: [4, 0, 16], neck: [0, -25, -10], head: [0, -50, -15], legsIn: 'world',
    arms: { ...{ leftUpperArm: [0.3, -0.65, 0.6], leftLowerArm: [-0.3, 0.85, 0.45] }, rightUpperArm: [-0.55, -0.7, 0.45], rightLowerArm: [0.35, 0.65, 0.65] },
    legs: { rightUpperLeg: [-0.97, 0.12, 0.05], rightLowerLeg: [-0.98, 0.07, -0.02], rightFoot: [0, -0.4, 0.92],
      leftUpperLeg: [0.25, -0.3, 0.92], leftLowerLeg: [0.1, -0.95, -0.3], leftFoot: [0, -0.8, 0.5] },
    feet: 'free', lift: 0.8, hands: { left: 'Fist', right: 'Fist' } } },
  // ---- flips and inverted
  { name: 'Backflip (tucked)', tags: ['flip', 'backflip', 'acrobatics', 'inverted'], body: {
    hips: [-180, 0, 0], spine: [40, 0, 0], neck: [20, 0, 0], head: [10, 0, 0],
    arms: { leftUpperArm: [0.25, -0.3, 0.9], leftLowerArm: [-0.2, -0.8, 0.5], rightUpperArm: [-0.25, -0.3, 0.9], rightLowerArm: [0.2, -0.8, 0.5] },
    legsIn: 'hips',
    legs: { leftUpperLeg: [0.1, 0.6, 0.8], leftLowerLeg: [0, -0.95, -0.3], rightUpperLeg: [-0.1, 0.6, 0.8], rightLowerLeg: [0, -0.95, -0.3] },
    feet: 'free', lift: 1.0, hands: { left: 'Grab (C-shape)', right: 'Grab (C-shape)' } } },
  { name: 'Backflip (layout)', tags: ['flip', 'backflip', 'acrobatics', 'inverted'], body: {
    hips: [-160, 0, 0], spine: [-25, 0, 0], neck: [-15, 0, 0], head: [-20, 0, 0],
    arms: { leftUpperArm: [0.95, 0.3, 0], leftLowerArm: [0.95, 0.3, 0], rightUpperArm: [-0.95, 0.3, 0], rightLowerArm: [-0.95, 0.3, 0] },
    legsIn: 'hips', legs: { leftUpperLeg: [0.04, -1, 0], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.04, -1, 0], rightLowerLeg: [0, -1, 0], leftFoot: [0, -0.7, 0.7], rightFoot: [0, -0.7, 0.7] },
    feet: 'free', lift: 1.0, hands: { left: 'Open fingers together', right: 'Open fingers together' } } },
  { name: 'Front flip (tucked)', tags: ['flip', 'acrobatics', 'parkour'], body: {
    hips: [130, 0, 0], spine: [40, 0, 0], neck: [20, 0, 0], head: [15, 0, 0],
    arms: { leftUpperArm: [0.25, -0.3, 0.9], leftLowerArm: [-0.2, -0.8, 0.5], rightUpperArm: [-0.25, -0.3, 0.9], rightLowerArm: [0.2, -0.8, 0.5] },
    legsIn: 'hips',
    legs: { leftUpperLeg: [0.1, 0.6, 0.8], leftLowerLeg: [0, -0.95, -0.3], rightUpperLeg: [-0.1, 0.6, 0.8], rightLowerLeg: [0, -0.95, -0.3] },
    feet: 'free', lift: 0.9, hands: { left: 'Grab (C-shape)', right: 'Grab (C-shape)' } } },
  { name: 'Cartwheel', tags: ['cartwheel', 'gymnastics', 'acrobatics', 'inverted'], body: {
    hips: [0, 0, 175], spine: [0, 0, 0], neck: [-10, 0, 0], head: [-15, 0, 0],
    arms: { leftUpperArm: [0.3, 0.95, 0], leftLowerArm: [0.3, 0.95, 0], rightUpperArm: [-0.3, 0.95, 0], rightLowerArm: [-0.3, 0.95, 0] },
    legsIn: 'hips',
    legs: { leftUpperLeg: [0.75, -0.65, 0], leftLowerLeg: [0.75, -0.65, 0], rightUpperLeg: [-0.75, -0.65, 0], rightLowerLeg: [-0.75, -0.65, 0], leftFoot: [0.5, -0.5, 0.6], rightFoot: [-0.5, -0.5, 0.6] },
    feet: 'free', hands: { left: 'Open spread', right: 'Open spread' } } },
  { name: 'Handstand', tags: ['handstand', 'gymnastics', 'inverted', 'balance'], body: {
    hips: [180, 0, 0], spine: [-10, 0, 0], neck: [-30, 0, 0], head: [-20, 0, 0],
    arms: { leftUpperArm: [0.15, 1, 0.05], leftLowerArm: [0.12, 1, 0.05], rightUpperArm: [-0.15, 1, 0.05], rightLowerArm: [-0.12, 1, 0.05] },
    wrist: { left: [-80, 0], right: [-80, 0] },
    legsIn: 'hips', legs: { leftUpperLeg: [0.03, -1, 0], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.03, -1, 0], rightLowerLeg: [0, -1, 0], leftFoot: [0, -0.6, 0.8], rightFoot: [0, -0.6, 0.8] },
    feet: 'free', hands: { left: 'Open spread', right: 'Open spread' } } },
  // ---- flying and floating
  { name: 'Superhero flying', tags: ['flying', 'superhero', 'hero'], body: {
    hips: [88, 0, 0], spine: [-15, 0, 0], neck: [-25, 0, 0], head: [-25, 0, 0],
    arms: { rightUpperArm: [-0.12, 1, 0.1], rightLowerArm: [-0.05, 1, 0.05], leftUpperArm: [0.2, -1, 0.05], leftLowerArm: [0.1, -1, 0.1] },
    legsIn: 'hips',
    legs: { leftUpperLeg: [0.04, -1, 0], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.04, -1, 0.05], rightLowerLeg: [0, -0.85, -0.55], leftFoot: [0, -0.6, 0.8], rightFoot: [0, -0.6, 0.8] },
    feet: 'free', lift: 1.2, hands: { right: 'Fist', left: 'Fist' } } },
  { name: 'Hovering', tags: ['flying', 'hover', 'floating', 'magic'], body: {
    spine: [5, 0, 0], neck: [10, 0, 0], head: [15, 0, 0],
    arms: { leftUpperArm: [0.6, -0.75, 0.15], leftLowerArm: [0.6, -0.6, 0.35], rightUpperArm: [-0.6, -0.75, 0.15], rightLowerArm: [-0.6, -0.6, 0.35] },
    forearm: { left: 40, right: 40 },
    legs: { leftUpperLeg: [0.1, -0.85, 0.5], leftLowerLeg: [0.02, -0.95, -0.3], rightUpperLeg: [-0.08, -1, 0.1], rightLowerLeg: [-0.02, -1, -0.15], ...toes },
    feet: 'free', lift: 0.8, hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' } } },
  { name: 'Levitating (rising)', tags: ['levitate', 'floating', 'magic', 'power'], body: {
    spine: [-12, 0, 0], neck: [-10, 0, 0], head: [-25, 0, 0],
    arms: { leftUpperArm: [0.85, -0.35, 0.3], leftLowerArm: [0.85, -0.1, 0.45], rightUpperArm: [-0.85, -0.35, 0.3], rightLowerArm: [-0.85, -0.1, 0.45] },
    forearm: { left: -90, right: -90 },
    legs: { leftUpperLeg: [0.05, -1, 0.05], leftLowerLeg: [0.02, -1, -0.1], rightUpperLeg: [-0.05, -1, 0.05], rightLowerLeg: [-0.02, -1, -0.1], ...toes },
    feet: 'free', lift: 0.6, hands: { left: 'Elegant (ballet)', right: 'Elegant (ballet)' } } },
  { name: 'Floating (zero-g)', tags: ['floating', 'zero gravity', 'space', 'relaxed'], body: {
    hips: [25, 0, 10], spine: [25, 0, 0], neck: [10, 0, 0], head: [5, 0, 0],
    arms: { leftUpperArm: [0.45, -0.25, 0.6], leftLowerArm: [0.1, 0.35, 0.6], rightUpperArm: [-0.45, -0.1, 0.6], rightLowerArm: [-0.1, 0.45, 0.6] },
    legsIn: 'hips',
    legs: { leftUpperLeg: [0.15, -0.65, 0.55], leftLowerLeg: [0.05, -0.85, -0.5], rightUpperLeg: [-0.1, -0.8, 0.35], rightLowerLeg: [0, -0.9, -0.35] },
    feet: 'free', lift: 0.9, hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' } } },
  { name: 'Mid-air spin', tags: ['spin', 'jump', 'dance', 'figure skating'], body: {
    hips: [0, 0, 12], spine: [0, 0, 5], head: [0, 20, 0],
    arms: { leftUpperArm: [0.3, -0.7, 0.55], leftLowerArm: [-0.95, 0.25, 0.2], rightUpperArm: [-0.3, -0.7, 0.55], rightLowerArm: [0.95, 0.15, 0.2] },
    legs: { leftUpperLeg: [-0.02, -1, 0.05], leftLowerLeg: [-0.08, -1, 0], rightUpperLeg: [0.02, -1, 0.02], rightLowerLeg: [0.06, -1, 0.02], ...toes },
    feet: 'free', lift: 0.6, hands: { left: 'Fist', right: 'Fist' } } },
  { name: 'Wall jump (push-off)', tags: ['parkour', 'wall jump', 'jump'], body: {
    hips: [0, 0, 30], spine: [10, 0, 10], head: [-15, 0, 0],
    arms: { leftUpperArm: [0.6, 0.7, 0.3], leftLowerArm: [0.4, 0.85, 0.2], rightUpperArm: [-0.4, 0.4, 0.8], rightLowerArm: [-0.1, 0.6, 0.8] },
    legsIn: 'hips',
    legs: { rightUpperLeg: [-0.9, -0.1, 0.3], rightLowerLeg: [-0.6, -0.75, 0.1], rightFoot: [-0.9, 0.1, 0.4], leftUpperLeg: [0.1, -0.4, 0.9], leftLowerLeg: [0.05, -1, -0.15] },
    feet: 'free', lift: 0.8, hands: open } },
  // ---- falling and diving
  { name: 'Swan dive', tags: ['dive', 'diving', 'falling', 'head first'], body: {
    hips: [125, 0, 0], spine: [-20, 0, 0], neck: [-15, 0, 0], head: [-15, 0, 0],
    arms: { leftUpperArm: [0.95, 0.25, -0.1], leftLowerArm: [0.95, 0.3, 0], rightUpperArm: [-0.95, 0.25, -0.1], rightLowerArm: [-0.95, 0.3, 0] },
    legsIn: 'hips', legs: { leftUpperLeg: [0.02, -1, -0.05], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.02, -1, -0.05], rightLowerLeg: [0, -1, 0], leftFoot: [0, -0.6, 0.8], rightFoot: [0, -0.6, 0.8] },
    feet: 'free', lift: 1.2, hands: { left: 'Open fingers together', right: 'Open fingers together' } } },
  { name: 'Skydiving (belly to earth)', tags: ['skydiving', 'falling', 'freefall'], body: {
    hips: [90, 0, 0], spine: [-25, 0, 0], neck: [-15, 0, 0], head: [-20, 0, 0],
    arms: { leftUpperArm: [0.95, 0.15, -0.25], leftLowerArm: [0.15, 0.95, -0.25], rightUpperArm: [-0.95, 0.15, -0.25], rightLowerArm: [-0.15, 0.95, -0.25] },
    legsIn: 'hips',
    legs: { leftUpperLeg: [0.35, -0.95, -0.1], leftLowerLeg: [0.1, -0.3, -0.95], rightUpperLeg: [-0.35, -0.95, -0.1], rightLowerLeg: [-0.1, -0.3, -0.95] },
    feet: 'free', lift: 1.3, hands: open } },
  { name: 'Falling (flailing)', tags: ['falling', 'fall', 'panic'], body: {
    hips: [70, 15, 15], spine: [-10, 10, 0], neck: [-20, 0, 0], head: [-25, 0, 0],
    arms: { leftUpperArm: [0.8, 0.55, 0.1], leftLowerArm: [0.5, 0.85, 0.2], rightUpperArm: [-0.9, 0.2, 0.35], rightLowerArm: [-0.4, 0.3, 0.85] },
    legsIn: 'hips',
    legs: { leftUpperLeg: [0.3, -0.85, -0.4], leftLowerLeg: [0.1, -0.2, -1], rightUpperLeg: [-0.25, -0.9, 0.25], rightLowerLeg: [-0.05, -0.9, -0.45] },
    feet: 'free', lift: 1.0, hands: { left: 'Tense spread', right: 'Tense spread' } } },
  { name: 'Falling backward (reaching up)', tags: ['falling', 'fall', 'despair', 'drama'], body: {
    hips: [-75, 0, 0], spine: [15, 0, 0], neck: [10, 0, 0], head: [15, 0, 0],
    armsIn: 'world',
    arms: { leftUpperArm: [0.3, 0.9, 0.2], leftLowerArm: [0.15, 0.95, 0.1], rightUpperArm: [-0.25, 0.85, 0.35], rightLowerArm: [-0.1, 0.95, 0.15] },
    legsIn: 'hips',
    legs: { leftUpperLeg: [0.12, -0.6, 0.8], leftLowerLeg: [0.05, -0.95, -0.2], rightUpperLeg: [-0.1, -0.85, 0.4], rightLowerLeg: [0, -1, 0] },
    feet: 'free', lift: 1.1, hands: { left: 'Open spread', right: 'Grab (C-shape)' } } },
  { name: 'Freefall tumbling', tags: ['falling', 'tumble', 'chaos', 'freefall'], body: {
    hips: [60, 30, 70], spine: [20, -20, 10], neck: [10, 0, 0], head: [-10, 20, 0],
    arms: { leftUpperArm: [0.9, 0.3, 0.3], leftLowerArm: [0.4, 0.8, 0.4], rightUpperArm: [-0.5, -0.5, 0.7], rightLowerArm: [-0.2, 0.2, 0.95] },
    legsIn: 'hips',
    legs: { leftUpperLeg: [0.4, -0.8, 0.4], leftLowerLeg: [0.1, -0.6, -0.8], rightUpperLeg: [-0.15, -0.9, -0.3], rightLowerLeg: [-0.05, -0.95, 0.2] },
    feet: 'free', lift: 1.2, hands: { left: 'Tense spread', right: 'Limp' } } },
];
