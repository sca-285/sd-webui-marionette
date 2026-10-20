// Everyday props: full-body poses holding a cup, phone, book, umbrella...
// (bodypose.js body + poseapply.js grips; grip directions in the upright frame).
const P = (name, tags, prop, body, rest = {}) => ({ name, tags: [...tags, 'everyday'], prop, body, ...rest });
const walkL = { leftUpperLeg: [0.05, -0.92, 0.38], leftLowerLeg: [0.02, -1, 0.1], rightUpperLeg: [-0.05, -0.95, -0.28], rightLowerLeg: [-0.02, -0.85, -0.5] };
const stand = { leftUpperLeg: [0.1, -1, 0.04], leftLowerLeg: [0.02, -1, 0.02], rightUpperLeg: [-0.05, -1, 0], rightLowerLeg: [0, -1, 0] };

export const PROPS = [
  P('Drinking from a mug', ['mug', 'coffee', 'drink'], ['Handheld', 'Mug'], {
    hips: [0, 0, 4], spine: [-2, 0, -2], neck: [-5, 0, 0], head: [-12, 0, 0],
    arms: { rightUpperArm: [-0.12, -0.85, 0.45], rightLowerArm: [0.35, 0.85, 0.4], leftUpperArm: [0.15, -1, 0.15], leftLowerArm: [-0.3, -0.25, 0.9] },
    ik: { rightHand: { at: 'head', off: [-0.1, -0.14, 0.1], pole: [-1, -0.6, 0] } },
    legs: stand, hands: { left: 'Relaxed (soft)' },
  }, { grip: { right: { y: [0, 0.85, -0.5], z: [0.7, 0.2, 0.6] } } }),
  P('Coffee in hand, walking', ['mug', 'coffee', 'walk'], ['Handheld', 'Mug'], {
    hips: [3, 8, 0], spine: [2, -8, 0], head: [5, 0, 0],
    arms: { rightUpperArm: [-0.15, -0.95, 0.15], rightLowerArm: [0.05, -0.1, 1], leftUpperArm: [0.12, -1, -0.25], leftLowerArm: [0.05, -1, 0.05] },
    legs: walkL,
  }, { grip: { right: { y: [0, 1, 0], z: [0.6, 0, 0.8] } } }),
  P('Phone call', ['phone', 'call'], ['Handheld', 'Phone'], {
    hips: [0, 0, -5], spine: [0, 0, 4], head: [5, -10, 8],
    arms: { rightUpperArm: [-0.25, -0.7, 0.3], rightLowerArm: [0.25, 0.95, -0.05], leftUpperArm: [0.2, -1, 0.2], leftLowerArm: [-0.4, -0.2, 0.85] },
    ik: { rightHand: { at: 'head', off: [-0.1, 0.0, 0.0], pole: [-0.6, -1, 0] } },
    legs: { leftUpperLeg: [0.02, -1, 0.04], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.14, -1, 0.06], rightLowerLeg: [-0.02, -1, 0.06] },
    hands: { left: 'Relaxed (soft)' },
  }, { grip: { right: { y: [0, 1, 0.3], z: [0.3, -0.1, 1] } } }),
  P('Texting, head down', ['phone', 'texting'], ['Handheld', 'Phone'], {
    hips: [0, 0, 0], spine: [8, 0, 0], neck: [20, 0, 0], head: [25, 0, 0],
    arms: { rightUpperArm: [-0.12, -1, 0.15], rightLowerArm: [0.3, 0.2, 1], leftUpperArm: [0.12, -1, 0.15], leftLowerArm: [-0.3, 0.2, 1] },
    legs: stand,
  }, { grip: { right: { y: [0.15, 0.6, 0.8], z: [0.3, 0.75, -0.6] } }, reach: [{ side: 'left', at: [0.0, 0.06, 0.0], axis: 'y', shape: 'Relaxed (soft)' }] }),
  P('Selfie', ['phone', 'selfie'], ['Handheld', 'Phone'], {
    hips: [0, 0, 6], spine: [-4, 10, -6], neck: [0, -10, 0], head: [-8, -12, 10],
    arms: { rightUpperArm: [-0.35, 0.35, 0.85], rightLowerArm: [-0.2, 0.45, 0.85], leftUpperArm: [0.4, -0.85, -0.2], leftLowerArm: [-0.2, 0.7, 0.3] },
    legs: { leftUpperLeg: [0.02, -1, 0.06], leftLowerLeg: [0, -1, 0.06], rightUpperLeg: [-0.14, -1, 0.02], rightLowerLeg: [-0.02, -1, -0.02] },
    hands: { left: 'Peace' },
  }, { grip: { right: { y: [0.1, 1, -0.1], z: [0.5, -0.3, -0.8] } } }),
  P('Singing (microphone)', ['microphone', 'singer', 'music', 'stage'], ['Handheld', 'Microphone'], {
    hips: [-4, 10, 0], spine: [-12, 0, 0], neck: [-8, 0, 0], head: [-18, -8, 0],
    arms: { rightUpperArm: [-0.2, -0.75, 0.6], rightLowerArm: [0.35, 0.7, 0.6], leftUpperArm: [0.75, 0.2, 0.5], leftLowerArm: [0.6, 0.45, 0.6] },
    ik: { rightHand: { at: 'head', off: [-0.02, -0.08, 0.13], pole: [-1, -0.8, 0] } },
    legs: { leftUpperLeg: [0.2, -1, 0.15], leftLowerLeg: [0.05, -1, 0.02], rightUpperLeg: [-0.15, -1, -0.15], rightLowerLeg: [-0.03, -0.95, -0.25] },
    hands: { left: 'Open spread' },
  }, { grip: { right: { y: [-0.1, 0.6, -0.8], z: [0.6, 0.6, 0.4] } } }),
  P('Walking with an umbrella', ['umbrella', 'rain', 'walk'], ['Handheld', 'Umbrella'], {
    hips: [3, 6, 0], spine: [2, -6, 0], head: [8, 0, 0],
    arms: { rightUpperArm: [-0.15, -0.9, 0.3], rightLowerArm: [0.25, 0.15, 1], leftUpperArm: [0.12, -1, -0.2], leftLowerArm: [0.05, -1, 0.05] },
    legs: walkL,
  }, { grip: { right: { y: [0.05, 1, 0.05], z: [0, 0, 1] } } }),
  P('Lantern raised', ['lantern', 'light', 'fantasy', 'explore'], ['Handheld', 'Lantern'], {
    hips: [5, -10, 0], spine: [5, -5, 0], head: [0, 10, 0],
    arms: { rightUpperArm: [-0.3, 0.2, 0.9], rightLowerArm: [-0.1, 0.45, 0.9], leftUpperArm: [0.3, -0.8, 0.4], leftLowerArm: [0.1, -0.3, 0.95] },
    legs: walkL, hands: { left: 'Open fingers together' },
  }, { grip: { right: { y: [0, 0, 1], z: [0, -1, 0] } } }),
  P('Torch, exploring', ['torch', 'fire', 'fantasy', 'explore'], ['Handheld', 'Torch'], {
    hips: [8, -10, 0], spine: [8, -8, 0], head: [-5, 15, 0],
    arms: { rightUpperArm: [-0.3, 0.15, 0.95], rightLowerArm: [-0.1, 0.6, 0.8], leftUpperArm: [0.35, -0.5, 0.75], leftLowerArm: [0.1, 0.1, 1] },
    legs: walkL, hands: { left: 'Open fingers together' },
  }, { grip: { right: { y: [0, 0.95, 0.3], z: [0, -0.3, 1] } } }),
  P('Torch raised high', ['torch', 'fire', 'fantasy'], ['Handheld', 'Torch'], {
    hips: [0, 0, 5], spine: [-8, 0, -6], head: [-15, 0, 0],
    arms: { rightUpperArm: [-0.3, 0.9, 0.2], rightLowerArm: [-0.05, 1, 0.1], leftUpperArm: [0.25, -1, 0.05], leftLowerArm: [0.12, -1, 0.1] },
    legs: stand,
  }, { grip: { right: { y: [0, 1, 0.1], z: [0, 0, 1] } } }),
  P('Carrying a briefcase', ['briefcase', 'office', 'walk'], ['Handheld', 'Briefcase'], {
    hips: [3, 6, -3], spine: [2, -6, 3], head: [5, 0, 0],
    arms: { rightUpperArm: [-0.15, -1, 0.02], rightLowerArm: [-0.05, -1, 0.03], leftUpperArm: [0.12, -1, -0.25], leftLowerArm: [0.05, -1, 0.05] },
    legs: walkL,
  }, { grip: { right: { y: [0, 0, 1], z: [0, -1, 0] } } }),
  P('Reading a book', ['book', 'read', 'study'], ['Handheld', 'Book'], {
    hips: [0, 0, 0], spine: [5, 0, 0], neck: [15, 0, 0], head: [20, 0, 0],
    arms: { rightUpperArm: [-0.15, -1, 0.2], rightLowerArm: [0.25, 0.6, 0.75], leftUpperArm: [0.15, -1, 0.2], leftLowerArm: [-0.25, 0.6, 0.75] },
    legs: stand,
  }, { grip: { right: { y: [0, 0.9, 0.35], z: [1, 0, 0] } }, reach: [{ side: 'left', at: [0, 0, 0.15], axis: 'y', shape: 'Open fingers together' }] }),
  P('Walking with a cane', ['cane', 'old', 'walk'], ['Handheld', 'Cane'], {
    hips: [12, 5, 0], spine: [12, -5, 0], neck: [-10, 0, 0], head: [-5, 0, 0],
    arms: { rightUpperArm: [-0.2, -0.9, 0.35], rightLowerArm: [-0.05, -0.75, 0.65], leftUpperArm: [0.15, -1, -0.1], leftLowerArm: [0.05, -1, 0.1] },
    legs: { leftUpperLeg: [0.06, -0.95, 0.25], leftLowerLeg: [0.02, -1, 0.05], rightUpperLeg: [-0.06, -0.97, -0.15], rightLowerLeg: [-0.02, -0.92, -0.35] },
  }, { grip: { right: { y: [0, 1, -0.05], z: [0, 0, 1] } } }),
  P('Drinking from a bottle', ['bottle', 'drink'], ['Handheld', 'Bottle'], {
    hips: [-4, 0, 0], spine: [-10, 0, 0], neck: [-15, 0, 0], head: [-30, 0, 0],
    arms: { rightUpperArm: [-0.2, -0.35, 0.9], rightLowerArm: [0.35, 0.75, 0.55], leftUpperArm: [0.2, -1, 0.05], leftLowerArm: [0.12, -1, 0.1] },
    ik: { rightHand: { at: 'head', off: [-0.03, 0.0, 0.22], pole: [-1, -0.3, 0] } },
    legs: stand,
  }, { grip: { right: { y: [0.1, 0.3, -0.95], z: [0.3, 0.9, 0.3] } } }),
  P('Holding a bottle, casual', ['bottle', 'drink', 'still'], ['Handheld', 'Bottle'], {
    hips: [0, 0, 6], spine: [0, 0, -4], head: [5, 10, 0],
    arms: { rightUpperArm: [-0.15, -1, 0.05], rightLowerArm: [-0.05, -0.75, 0.65], leftUpperArm: [0.3, -0.85, -0.2], leftLowerArm: [-0.4, 0.2, -0.2] },
    legs: { leftUpperLeg: [0.02, -1, 0.06], leftLowerLeg: [0, -1, 0.06], rightUpperLeg: [-0.14, -1, 0.02], rightLowerLeg: [-0.02, -1, -0.02] },
  }, { grip: { right: { y: [0, 1, 0.1], z: [0, -0.1, 1] } } }),
  P('Wine glass · toast', ['wine glass', 'drink', 'toast', 'party'], ['Handheld', 'Wine glass'], {
    hips: [0, 0, 4], spine: [-3, 8, -3], head: [-3, -5, 0],
    arms: { rightUpperArm: [-0.15, -0.3, 0.95], rightLowerArm: [0.05, 0.55, 0.85], leftUpperArm: [0.15, -1, 0.1], leftLowerArm: [0.1, -1, 0.15] },
    legs: stand,
  }, { grip: { right: { y: [0, 1, 0], z: [0.2, 0, 1] } } }),
];
