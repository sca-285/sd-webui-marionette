// Weapon poses: full-body, dynamic, the props held in the hands (poseapply.js).
// Body in bodypose.js format; grip directions in the character's upright frame
// after the pose (+X left, +Y up, +Z the way the hips face).
const W = (name, tags, prop, body, rest = {}) => ({ name, tags: [...tags, 'weapon'], prop, body, ...rest });

export const WEAPONS = [
  // ---- swords
  W('Sword · guard', ['sword', 'still'], ['Blades', 'Sword'], {
    hips: [6, 20, 0], spine: [4, 10, 0], head: [6, -28, 0],
    arms: { rightUpperArm: [-0.25, -0.6, 0.75], rightLowerArm: [0.2, 0.35, 0.9], leftUpperArm: [0.55, -0.75, -0.1], leftLowerArm: [0.35, -0.2, 0.75] },
    legs: { rightUpperLeg: [-0.15, -0.92, 0.38], rightLowerLeg: [-0.03, -1, 0.02], leftUpperLeg: [0.22, -0.95, -0.25], leftLowerLeg: [0.05, -1, -0.32] },
    hands: { left: 'Relaxed (soft)' },
  }, { grip: { right: { y: [0.2, 0.75, 0.6], z: [0, -0.5, 1] } } }),
  W('Sword · overhead strike', ['sword', 'action'], ['Blades', 'Sword'], {
    hips: [-6, 25, 0], spine: [-12, 15, 0], head: [8, -30, 0],
    arms: { rightUpperArm: [-0.25, 0.9, 0.2], rightLowerArm: [0.25, 0.65, -0.65], leftUpperArm: [0.35, -0.3, 0.85], leftLowerArm: [-0.15, 0.45, 0.85] },
    legs: { rightUpperLeg: [-0.12, -0.85, 0.5], rightLowerLeg: [0, -1, 0.05], leftUpperLeg: [0.2, -0.9, -0.35], leftLowerLeg: [0.05, -0.85, -0.55] },
    hands: { left: 'Open spread' },
  }, { grip: { right: { y: [0.1, 0.15, -1], z: [0, 1, 0.1] } } }),
  W('Sword · horizontal slash (follow-through)', ['sword', 'action', 'slash'], ['Blades', 'Sword'], {
    hips: [10, 45, 0], spine: [12, 40, 0], head: [5, -55, 0],
    arms: { rightUpperArm: [0.55, 0.05, 0.85], rightLowerArm: [0.9, 0.05, 0.4], leftUpperArm: [0.95, -0.25, -0.2], leftLowerArm: [0.6, 0.2, -0.75] },
    legs: { rightUpperLeg: [-0.3, -0.75, 0.6], rightLowerLeg: [-0.05, -1, 0.05], leftUpperLeg: [0.3, -0.85, -0.4], leftLowerLeg: [0.05, -0.75, -0.65] },
    hands: { left: 'Open spread' }, feet: 'flat',
  }, { grip: { right: { y: [1, 0.05, -0.25], z: [0, 0, -1] } } }),
  W('Sword · rising slash', ['sword', 'action', 'slash'], ['Blades', 'Sword'], {
    hips: [-5, -20, 0], spine: [-15, -25, 0], head: [-15, 15, 0],
    arms: { rightUpperArm: [-0.3, 0.85, 0.45], rightLowerArm: [-0.3, 0.95, 0.1], leftUpperArm: [0.6, -0.7, -0.3], leftLowerArm: [0.35, -0.6, 0.6] },
    legs: { rightUpperLeg: [-0.18, -0.9, 0.35], rightLowerLeg: [-0.03, -1, -0.02], leftUpperLeg: [0.2, -0.85, -0.45], leftLowerLeg: [0.05, -0.7, -0.7] },
    hands: { left: 'Open spread' },
  }, { grip: { right: { y: [-0.35, 0.9, 0.3], z: [0, 0.3, -1] } } }),
  W('Sword · thrust lunge', ['sword', 'action', 'thrust', 'lunge'], ['Blades', 'Sword'], {
    hips: [18, 30, 0], spine: [10, 25, 0], head: [-10, -50, 0],
    arms: { rightUpperArm: [0.6, 0.15, 0.8], rightLowerArm: [0.6, 0.1, 0.8], leftUpperArm: [0.55, -0.35, -0.75], leftLowerArm: [0.25, 0.55, -0.8] },
    legs: { rightUpperLeg: [-0.15, -0.5, 0.85], rightLowerLeg: [-0.05, -1, 0.1], leftUpperLeg: [0.25, -0.65, -0.7], leftLowerLeg: [0.05, -0.55, -0.85] },
    hands: { left: 'Elegant (ballet)' },
  }, { grip: { right: { y: [0, 0.05, 1], z: [-1, 0, 0] } } }),
  W('Sword · leaping downward strike', ['sword', 'action', 'midair', 'jump'], ['Blades', 'Sword'], {
    hips: [25, 10, 0], spine: [20, 5, 0], head: [-25, -10, 0],
    arms: { rightUpperArm: [-0.2, 0.7, 0.7], rightLowerArm: [0, 0.2, 1], leftUpperArm: [0.7, 0.5, -0.4], leftLowerArm: [0.6, 0.7, 0.1] },
    legs: { rightUpperLeg: [-0.1, -0.2, 1], rightLowerLeg: [0, -1, 0.1], leftUpperLeg: [0.15, -0.9, -0.4], leftLowerLeg: [0.05, 0.1, -1] },
    hands: { left: 'Open spread' }, feet: 'free', lift: 0.55,
  }, { grip: { right: { y: [0, -0.75, 0.7], z: [0, -0.7, -0.7] } } }),
  W('Katana · low draw (iai)', ['katana', 'sword', 'still', 'iaido'], ['Blades', 'Katana'], {
    hips: [12, 30, 0], spine: [10, 15, 0], head: [5, -45, 0],
    arms: { rightUpperArm: [0.3, -0.8, 0.5], rightLowerArm: [0.85, 0.05, 0.5], leftUpperArm: [0.4, -0.95, 0.05], leftLowerArm: [-0.2, -0.4, 0.9] },
    legs: { rightUpperLeg: [-0.2, -0.8, 0.55], rightLowerLeg: [-0.03, -1, 0.05], leftUpperLeg: [0.25, -0.85, -0.45], leftLowerLeg: [0.05, -0.75, -0.65] },
  }, { grip: { right: { y: [0.85, 0.2, -0.45], z: [0, 1, 0] } }, reach: [{ side: 'left', at: [0, 0.22, -0.01], axis: 'y' }] }),
  W('Katana · two-handed guard', ['katana', 'sword', 'two-handed', 'still'], ['Blades', 'Katana'], {
    hips: [6, 15, 0], spine: [5, 10, 0], head: [8, -22, 0],
    arms: { rightUpperArm: [-0.05, -0.75, 0.65], rightLowerArm: [0.35, -0.05, 1], leftUpperArm: [0.25, -0.85, 0.45], leftLowerArm: [-0.25, -0.15, 1] },
    legs: { rightUpperLeg: [-0.12, -0.92, 0.35], rightLowerLeg: [-0.03, -1, 0.02], leftUpperLeg: [0.2, -0.95, -0.25], leftLowerLeg: [0.05, -1, -0.35] },
  }, { grip: { right: { y: [-0.1, 0.5, 1], z: [0, -1, 0.4] } }, reach: [{ side: 'left' }] }),
  W('Katana · overhead (jodan)', ['katana', 'sword', 'two-handed', 'action'], ['Blades', 'Katana'], {
    hips: [-4, -15, 0], spine: [-8, -10, 0], head: [10, 20, 0],
    arms: { rightUpperArm: [-0.15, 0.85, 0.45], rightLowerArm: [0.35, 0.85, -0.2], leftUpperArm: [0.3, 0.8, 0.45], leftLowerArm: [-0.3, 0.85, -0.15] },
    legs: { leftUpperLeg: [0.12, -0.9, 0.4], leftLowerLeg: [0.03, -1, 0.02], rightUpperLeg: [-0.2, -0.95, -0.3], rightLowerLeg: [-0.05, -0.95, -0.4] },
  }, { grip: { right: { y: [0, 0.45, -1], z: [0, 1, 0.3] } }, reach: [{ side: 'left' }] }),
  W('Greatsword · resting on shoulder', ['greatsword', 'sword', 'still', 'rest'], ['Blades', 'Greatsword'], {
    hips: [0, -8, 6], spine: [-4, 6, -4], head: [4, 10, 4],
    arms: { rightUpperArm: [-0.35, -0.75, 0.5], rightLowerArm: [0.45, 0.75, 0.35], leftUpperArm: [0.3, -0.95, 0.1], leftLowerArm: [0.15, -0.95, 0.2] },
    legs: { leftUpperLeg: [0.14, -1, 0.06], leftLowerLeg: [0.02, -1, -0.05], rightUpperLeg: [-0.06, -1, 0], rightLowerLeg: [0, -1, 0] },
    hands: { left: 'Relaxed (soft)' },
  }, { grip: { right: { y: [-0.15, 0.35, -0.95], z: [0, 1, 0] } } }),
  W('Greatsword · spinning swing', ['greatsword', 'sword', 'two-handed', 'action'], ['Blades', 'Greatsword'], {
    hips: [10, 50, 0], spine: [15, 40, -8], head: [0, -40, 0],
    arms: { rightUpperArm: [0.55, -0.2, 0.8], rightLowerArm: [0.85, -0.05, 0.5], leftUpperArm: [0.85, -0.3, 0.35], leftLowerArm: [0.9, 0, 0.35] },
    legs: { rightUpperLeg: [-0.4, -0.75, 0.45], rightLowerLeg: [-0.1, -1, 0.05], leftUpperLeg: [0.35, -0.85, -0.35], leftLowerLeg: [0.1, -0.8, -0.55] },
  }, { grip: { right: { y: [1, 0.15, -0.35], z: [0, 0, -1] } }, reach: [{ side: 'left' }] }),
  W('Dual swords · ready', ['sword', 'dual', 'still'], ['Blades', 'Dual swords'], {
    hips: [8, 0, 0], spine: [6, 0, 0], head: [8, 0, 0],
    arms: { rightUpperArm: [-0.4, -0.65, 0.6], rightLowerArm: [-0.1, 0.15, 1], leftUpperArm: [0.4, -0.65, 0.6], leftLowerArm: [0.1, 0.15, 1] },
    legs: { leftUpperLeg: [0.3, -0.9, 0.15], leftLowerLeg: [0.08, -1, 0], rightUpperLeg: [-0.3, -0.9, -0.1], rightLowerLeg: [-0.08, -1, -0.12] },
  }, { grip: { right: { y: [-0.45, 0.6, 0.65], z: [0, -0.3, 1] }, left: { y: [0.45, 0.6, 0.65], z: [0, -0.3, 1] } } }),
  W('Dual swords · cross slash', ['sword', 'dual', 'action', 'slash'], ['Blades', 'Dual swords'], {
    hips: [18, 0, 0], spine: [12, 0, 0], head: [-15, 0, 0],
    arms: { rightUpperArm: [0.3, 0.05, 1], rightLowerArm: [0.85, 0.2, 0.45], leftUpperArm: [-0.3, 0.1, 1], leftLowerArm: [-0.85, 0.3, 0.45] },
    legs: { rightUpperLeg: [-0.15, -0.55, 0.8], rightLowerLeg: [-0.03, -1, 0.1], leftUpperLeg: [0.18, -0.7, -0.65], leftLowerLeg: [0.05, -0.55, -0.85] },
  }, { grip: { right: { y: [0.6, 0.6, -0.5], z: [0.2, -0.6, -0.8] }, left: { y: [-0.6, 0.55, -0.55], z: [-0.2, -0.6, -0.8] } } }),
  W('Dual dao · whirlwind', ['dao', 'saber', 'dual', 'action', 'spin'], ['Blades', 'Dual dao'], {
    hips: [5, 35, 0], spine: [8, 35, -12], head: [0, -30, 10],
    arms: { rightUpperArm: [-1, 0.15, 0.1], rightLowerArm: [-0.85, 0.3, 0.4], leftUpperArm: [0.95, 0.35, -0.1], leftLowerArm: [0.7, 0.6, -0.4] },
    legs: { rightUpperLeg: [-0.1, -1, 0.05], rightLowerLeg: [-0.02, -1, 0], leftUpperLeg: [0.35, -0.35, 0.85], leftLowerLeg: [0.15, -1, -0.2] },
    feet: 'free',
  }, { grip: { right: { y: [-0.3, 0.2, 1], z: [-1, 0, 0] }, left: { y: [0.4, 0.3, -0.85], z: [1, 0, 0] } } }),
  W('Dagger · reverse-grip crouch', ['dagger', 'knife', 'still', 'crouch'], ['Blades', 'Dagger'], {
    hips: [25, 15, 0], spine: [15, 10, 0], head: [-20, -20, 0],
    arms: { rightUpperArm: [-0.4, -0.6, 0.7], rightLowerArm: [0.15, 0.4, 0.9], leftUpperArm: [0.3, -0.5, 0.8], leftLowerArm: [-0.2, 0.45, 0.85] },
    legs: { rightUpperLeg: [-0.25, -0.4, 0.85], rightLowerLeg: [-0.05, -1, -0.05], leftUpperLeg: [0.25, -0.75, -0.25], leftLowerLeg: [0.05, -0.15, -1] },
    hands: { left: 'Karate chop' }, feet: 'free',
  }, { flip: true, grip: { right: { y: [0.1, 1, -0.1], z: [0, 0, 1] } } }),
  W('Dagger · throw', ['dagger', 'knife', 'action', 'throw'], ['Blades', 'Dagger'], {
    hips: [-4, -35, 0], spine: [-6, -25, 0], head: [0, 50, 0],
    arms: { rightUpperArm: [-0.75, 0.55, -0.35], rightLowerArm: [0.15, 0.95, -0.1], leftUpperArm: [0.45, 0.05, 0.9], leftLowerArm: [0.3, 0.1, 0.95] },
    legs: { leftUpperLeg: [0.25, -0.9, 0.35], leftLowerLeg: [0.05, -1, 0.02], rightUpperLeg: [-0.25, -0.92, -0.25], rightLowerLeg: [-0.05, -0.95, -0.35] },
    hands: { left: 'Point' },
  }, { grip: { right: { y: [0.1, 0.9, 0.45], z: [0, -0.4, 1] } } }),
  W('Dual daggers · assassin lunge', ['dagger', 'knife', 'dual', 'action', 'lunge'], ['Blades', 'Dual daggers'], {
    hips: [35, 0, 0], spine: [20, 0, 0], head: [-35, 0, 0],
    armsIn: 'world',
    arms: { rightUpperArm: [-0.25, -0.35, 0.9], rightLowerArm: [-0.05, -0.05, 1], leftUpperArm: [0.45, -0.45, -0.75], leftLowerArm: [0.3, -0.7, -0.6] },
    legs: { rightUpperLeg: [-0.15, -0.45, 0.85], rightLowerLeg: [-0.03, -1, 0.15], leftUpperLeg: [0.2, -0.55, -0.8], leftLowerLeg: [0.05, -0.35, -0.95] },
    feet: 'free',
  }, { flip: true, grip: { right: { y: [0, 0.95, -0.3], z: [0, -0.3, 1] }, left: { y: [0, 0.6, 0.8], z: [0, 0.8, -0.6] } } }),
  // ---- staves and polearms
  W('Staff · ready', ['staff', 'two-handed', 'still'], ['Staves & polearms', 'Short staff'], {
    hips: [8, -20, 0], spine: [6, -10, 0], head: [5, 25, 0],
    arms: { rightUpperArm: [-0.3, -0.85, 0.35], rightLowerArm: [0.35, -0.2, 0.95], leftUpperArm: [0.35, -0.45, 0.8], leftLowerArm: [0.05, 0.4, 0.95] },
    legs: { leftUpperLeg: [0.15, -0.9, 0.4], leftLowerLeg: [0.03, -1, 0.02], rightUpperLeg: [-0.22, -0.92, -0.25], rightLowerLeg: [-0.05, -0.95, -0.35] },
  }, { grip: { right: { y: [0.6, 0.6, 0.5], z: [0, -0.3, 1] } }, reach: [{ side: 'left' }] }),
  W('Staff · spin overhead', ['staff', 'two-handed', 'action', 'spin'], ['Staves & polearms', 'Short staff'], {
    hips: [0, 15, 0], spine: [-8, 10, 6], head: [-10, -10, 0],
    arms: { rightUpperArm: [-0.45, 0.85, 0.2], rightLowerArm: [0.2, 0.95, 0.15], leftUpperArm: [0.4, 0.85, 0.25], leftLowerArm: [-0.15, 0.95, 0.2] },
    legs: { leftUpperLeg: [0.2, -0.9, 0.3], leftLowerLeg: [0.05, -1, 0.02], rightUpperLeg: [-0.2, -0.95, -0.2], rightLowerLeg: [-0.05, -0.9, -0.4] },
  }, { grip: { right: { y: [1, 0.05, 0.25], z: [0, 1, 0] } }, reach: [{ side: 'left' }] }),
  W('Staff · low sweep', ['staff', 'two-handed', 'action', 'crouch'], ['Staves & polearms', 'Short staff'], {
    hips: [25, 30, -10], spine: [20, 20, 0], head: [-25, -30, 0],
    arms: { rightUpperArm: [-0.2, -0.6, 0.8], rightLowerArm: [0.3, -0.4, 0.85], leftUpperArm: [0.45, -0.75, 0.5], leftLowerArm: [0.35, -0.5, 0.8] },
    legs: { rightUpperLeg: [-0.3, -0.35, 0.85], rightLowerLeg: [-0.05, -1, -0.1], leftUpperLeg: [0.95, -0.3, 0.05], leftLowerLeg: [0.95, -0.3, 0.05] },
    feet: 'free',
  }, { grip: { right: { y: [0.85, -0.15, 0.5], z: [0, -1, 0] } }, reach: [{ side: 'left' }] }),
  W('Archistaff · casting', ['staff', 'archistaff', 'mage', 'magic', 'action'], ['Staves & polearms', 'Archistaff'], {
    hips: [-6, -10, 0], spine: [-14, -8, 0], head: [-18, 10, 0],
    arms: { rightUpperArm: [-0.35, 0.85, 0.35], rightLowerArm: [-0.1, 1, 0.15], leftUpperArm: [0.35, 0.05, 0.95], leftLowerArm: [0.1, 0.25, 1] },
    legs: { leftUpperLeg: [0.12, -0.88, 0.45], leftLowerLeg: [0.03, -1, 0.02], rightUpperLeg: [-0.2, -0.95, -0.25], rightLowerLeg: [-0.05, -0.95, -0.35] },
    hands: { left: 'Open spread' }, wrist: { left: [-40, 0] },
  }, { grip: { right: { y: [-0.05, 1, 0.2], z: [0, 0, 1] } } }),
  W('Archistaff · planted, wise', ['staff', 'archistaff', 'mage', 'still', 'rest'], ['Staves & polearms', 'Archistaff'], {
    hips: [0, 0, 5], spine: [6, 0, -3], neck: [10, 0, 0], head: [12, 8, 0],
    arms: { rightUpperArm: [-0.3, -0.7, 0.45], rightLowerArm: [-0.05, 0.45, 0.9], leftUpperArm: [0.2, -0.95, 0.25], leftLowerArm: [-0.4, -0.3, 0.85] },
    legs: { rightUpperLeg: [-0.12, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.06], leftLowerLeg: [0, -1, 0.05] },
    hands: { left: 'Relaxed (soft)' },
  }, { grip: { right: { y: [0, 1, 0.05], z: [0, 0, 1] } } }),
  W('Spear · thrust lunge', ['spear', 'polearm', 'two-handed', 'action', 'lunge'], ['Staves & polearms', 'Spear'], {
    hips: [18, -30, 0], spine: [10, -25, 0], head: [-12, 50, 0],
    armsIn: 'world',
    arms: { rightUpperArm: [-0.25, -0.75, -0.3], rightLowerArm: [0.25, -0.2, 0.95], leftUpperArm: [0.1, -0.25, 1], leftLowerArm: [-0.05, -0.05, 1] },
    legs: { leftUpperLeg: [0.1, -0.5, 0.85], leftLowerLeg: [0.02, -1, 0.1], rightUpperLeg: [-0.2, -0.65, -0.75], rightLowerLeg: [-0.05, -0.5, -0.85] },
  }, { grip: { right: { y: [0.1, 0.08, 1], z: [0, -1, 0] } }, reach: [{ side: 'left' }] }),
  W('Spear · braced, kneeling', ['spear', 'polearm', 'two-handed', 'still', 'kneel'], ['Staves & polearms', 'Spear'], {
    hips: [15, -15, 0], spine: [8, -10, 0], head: [-10, 20, 0],
    armsIn: 'world',
    arms: { rightUpperArm: [-0.3, -0.9, -0.2], rightLowerArm: [0.2, -0.4, 0.9], leftUpperArm: [0.2, -0.45, 0.85], leftLowerArm: [-0.05, 0.1, 1] },
    legs: { leftUpperLeg: [0.12, -0.15, 1], leftLowerLeg: [0.02, -1, 0.05], rightUpperLeg: [-0.12, -1, 0.05], rightLowerLeg: [-0.03, -0.05, -1] },
    feet: 'free',
  }, { grip: { right: { y: [0, 0.4, 0.92], z: [0, -0.92, 0.4] } }, reach: [{ side: 'left' }] }),
  W('Spear · javelin throw', ['spear', 'polearm', 'action', 'throw'], ['Staves & polearms', 'Spear'], {
    hips: [-8, -40, 0], spine: [-12, -30, 0], head: [0, 60, 0],
    arms: { rightUpperArm: [-0.8, 0.4, -0.4], rightLowerArm: [-0.1, 0.95, -0.25], leftUpperArm: [0.5, 0.15, 0.85], leftLowerArm: [0.35, 0.3, 0.9] },
    legs: { leftUpperLeg: [0.25, -0.85, 0.45], leftLowerLeg: [0.05, -1, 0.05], rightUpperLeg: [-0.3, -0.9, -0.25], rightLowerLeg: [-0.05, -0.85, -0.5] },
    hands: { left: 'Open fingers together' },
  }, { grip: { right: { y: [0.7, 0.3, 0.65], z: [0, 1, 0] } } }),
  W('Scythe · reaping swing', ['scythe', 'two-handed', 'action'], ['Staves & polearms', 'Scythe'], {
    hips: [15, 40, 0], spine: [15, 30, 0], head: [-5, -40, 0],
    armsIn: 'world',
    arms: { rightUpperArm: [-0.1, -0.85, 0.5], rightLowerArm: [0.5, -0.35, 0.8], leftUpperArm: [0.6, -0.4, 0.7], leftLowerArm: [0.75, -0.1, 0.65] },
    legs: { rightUpperLeg: [-0.35, -0.8, 0.45], rightLowerLeg: [-0.08, -1, 0.05], leftUpperLeg: [0.3, -0.85, -0.4], leftLowerLeg: [0.08, -0.8, -0.55] },
  }, { grip: { right: { y: [0.85, 0.3, 0.45], z: [0, -1, 0.2] } }, reach: [{ side: 'left' }] }),
  // ---- axes
  W('Axe · overhead chop', ['axe', 'action'], ['Axes', 'Short axe'], {
    hips: [-5, 20, 0], spine: [-15, 15, 0], head: [10, -25, 0],
    arms: { rightUpperArm: [-0.3, 0.9, 0.05], rightLowerArm: [0.25, 0.6, -0.75], leftUpperArm: [0.4, -0.3, 0.85], leftLowerArm: [-0.1, 0.35, 0.95] },
    legs: { rightUpperLeg: [-0.12, -0.85, 0.5], rightLowerLeg: [-0.02, -1, 0.05], leftUpperLeg: [0.22, -0.92, -0.3], leftLowerLeg: [0.05, -0.85, -0.5] },
    hands: { left: 'Fist' },
  }, { grip: { right: { y: [0.05, 0.1, -1], z: [0, 1, 0.1] } } }),
  W('Long axe · two-handed swing', ['axe', 'two-handed', 'action'], ['Axes', 'Long axe'], {
    hips: [-5, -40, 0], spine: [-10, -35, 8], head: [5, 45, 0],
    armsIn: 'world',
    arms: { rightUpperArm: [-0.45, 0.2, -0.85], rightLowerArm: [-0.2, 0.75, -0.6], leftUpperArm: [-0.35, -0.2, 0.9], leftLowerArm: [-0.85, 0.4, 0.3] },
    legs: { leftUpperLeg: [0.25, -0.88, 0.4], leftLowerLeg: [0.05, -1, 0.05], rightUpperLeg: [-0.25, -0.92, -0.3], rightLowerLeg: [-0.05, -0.85, -0.5] },
  }, { grip: { right: { y: [-0.6, 0.75, -0.3], z: [-0.4, -0.2, 0.9] } }, reach: [{ side: 'left' }] }),
  W('Dual hatchets · berserker roar', ['axe', 'hatchet', 'dual', 'action'], ['Axes', 'Dual hatchets'], {
    hips: [-6, 0, 0], spine: [-18, 0, 0], neck: [-15, 0, 0], head: [-20, 0, 0],
    arms: { rightUpperArm: [-0.9, 0.35, -0.1], rightLowerArm: [-0.2, 0.95, 0.15], leftUpperArm: [0.9, 0.35, -0.1], leftLowerArm: [0.2, 0.95, 0.15] },
    legs: { leftUpperLeg: [0.35, -0.92, 0.1], leftLowerLeg: [0.08, -1, 0], rightUpperLeg: [-0.35, -0.92, 0.1], rightLowerLeg: [-0.08, -1, 0] },
  }, { grip: { right: { y: [-0.4, 0.35, 0.85], z: [-0.6, 0.6, -0.3] }, left: { y: [0.4, 0.35, 0.85], z: [0.6, 0.6, -0.3] } } }),
  // ---- bows (target to the character's left: left shoulder towards it)
  W('Bow · full draw', ['bow', 'archer', 'action'], ['Bows', 'Bow + arrow (drawn)'], {
    hips: [0, 10, 0], spine: [-3, 10, -3], neck: [0, 30, 0], head: [5, 45, 0],
    armsIn: 'world',
    arms: { leftUpperArm: [1, 0.1, 0.02], leftLowerArm: [1, 0.1, 0.02], rightUpperArm: [0.6, 0.12, -0.2], rightLowerArm: [0.95, 0.15, 0.1] },
    legs: { leftUpperLeg: [0.22, -1, 0.02], leftLowerLeg: [0.05, -1, 0], rightUpperLeg: [-0.22, -1, 0.02], rightLowerLeg: [-0.05, -1, 0] },
  }, { grip: { left: { y: [0, 1, 0.05], z: [1, 0, 0] } }, draw: { bow: 'left', pole: [-0.65, 0.1, -0.75] }, hold: { right: { r: [90, 0, 0] } } }),
  W('Bow · drawing, kneeling', ['bow', 'archer', 'action', 'kneel'], ['Bows', 'Bow + arrow (drawn)'], {
    hips: [5, 15, 0], spine: [0, 10, -3], neck: [0, 30, 0], head: [5, 40, 0],
    armsIn: 'world',
    arms: { leftUpperArm: [1, 0.15, 0.05], leftLowerArm: [1, 0.15, 0.05], rightUpperArm: [0.6, 0.15, -0.2], rightLowerArm: [0.95, 0.2, 0.1] },
    legs: { leftUpperLeg: [0.25, -0.15, 0.95], leftLowerLeg: [0.05, -1, 0.05], rightUpperLeg: [-0.15, -1, -0.05], rightLowerLeg: [-0.03, -0.05, -1] },
    feet: 'free',
  }, { grip: { left: { y: [0, 1, 0.05], z: [1, 0.1, 0] } }, draw: { bow: 'left', pole: [-0.65, 0.1, -0.75] }, hold: { right: { r: [90, 0, 0] } } }),
  W('Bow · aiming into the sky', ['bow', 'archer', 'action'], ['Bows', 'Bow + arrow (drawn)'], {
    hips: [-5, 10, 0], spine: [-15, 10, -5], neck: [-15, 25, 0], head: [-20, 30, 0],
    armsIn: 'world',
    arms: { leftUpperArm: [0.7, 0.7, 0.05], leftLowerArm: [0.7, 0.72, 0.05], rightUpperArm: [0.55, 0.45, -0.3], rightLowerArm: [0.75, 0.65, 0.05] },
    legs: { leftUpperLeg: [0.25, -1, 0.05], leftLowerLeg: [0.05, -1, 0], rightUpperLeg: [-0.22, -1, -0.05], rightLowerLeg: [-0.05, -1, -0.05] },
  }, { grip: { left: { y: [-0.7, 0.7, 0.05], z: [0.7, 0.7, 0] } }, draw: { bow: 'left', pole: [-0.65, 0.1, -0.75] }, hold: { right: { r: [90, 0, 0] } } }),
  W('Bow · relaxed, quiver on back', ['bow', 'archer', 'still', 'rest'], ['Bows', 'Bow + quiver'], {
    hips: [0, 0, 5], spine: [3, 0, -3], head: [5, -15, 0],
    arms: { leftUpperArm: [0.3, -1, 0.1], leftLowerArm: [0.15, -0.6, 0.8], rightUpperArm: [-0.2, -1, -0.05], rightLowerArm: [-0.1, -1, 0.1] },
    legs: { rightUpperLeg: [-0.12, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.04, -1, 0.08], leftLowerLeg: [0, -1, 0.06] },
  }, { grip: { left: { y: [0, 1, 0.12], z: [0, 0, 1] } } }),
  // ---- firearms (aimed where the head looks; arms in the upright frame)
  W('Pistol · one-hand aim', ['pistol', 'gun', 'action', 'aim'], ['Firearms', 'Pistol'], {
    hips: [0, 0, 0], spine: [2, -25, 0], neck: [0, 10, 0], head: [5, 15, 0], armsIn: 'world',
    arms: { rightUpperArm: [-0.08, 0.05, 1], rightLowerArm: [-0.02, 0.04, 1], leftUpperArm: [0.3, -1, -0.1], leftLowerArm: [0.15, -1, 0.1] },
    legs: { rightUpperLeg: [-0.18, -1, 0.15], rightLowerLeg: [-0.03, -1, 0], leftUpperLeg: [0.15, -1, -0.15], leftLowerLeg: [0.03, -1, -0.1] },
    hands: { left: 'Loose fist' },
  }, { grip: { right: { y: [0, 1, 0.08], z: [0, 0, 1] } } }),
  W('Pistol · two-handed (isosceles)', ['pistol', 'gun', 'two-handed', 'action', 'aim'], ['Firearms', 'Pistol'], {
    hips: [4, 0, 0], spine: [8, 0, 0], head: [4, 0, 0], armsIn: 'world',
    arms: { rightUpperArm: [0.2, -0.08, 1], rightLowerArm: [0.22, 0.02, 1], leftUpperArm: [-0.2, -0.12, 1], leftLowerArm: [-0.45, 0.05, 0.9] },
    legs: { leftUpperLeg: [0.18, -1, 0.12], leftLowerLeg: [0.04, -1, 0.02], rightUpperLeg: [-0.18, -1, -0.08], rightLowerLeg: [-0.04, -1, -0.08] },
  }, { mount: { side: 'right', at: 'head', off: [0, -0.06, 0.5], aim: [0, 0, 1], pole: [-0.4, -1, 0] }, reach: [{ side: 'left', at: [0.04, -0.03, 0.0], axis: 'cup', r: 0.034, pole: [0.4, -1, 0] }] }),
  W('Pistol · peeking from cover', ['pistol', 'gun', 'two-handed', 'action', 'cover'], ['Firearms', 'Pistol'], {
    hips: [10, 0, 8], spine: [5, 0, 22], neck: [0, 0, 8], head: [0, 0, -15], armsIn: 'world',
    arms: { rightUpperArm: [-0.15, -0.1, 1], rightLowerArm: [0.05, 0.02, 1], leftUpperArm: [-0.35, -0.2, 0.9], leftLowerArm: [-0.55, 0.05, 0.8] },
    legs: { rightUpperLeg: [-0.3, -0.5, 0.75], rightLowerLeg: [-0.05, -1, 0.05], leftUpperLeg: [0.2, -0.75, -0.35], leftLowerLeg: [0.05, -0.2, -1] },
    feet: 'free',
  }, { mount: { side: 'right', at: 'head', off: [0.02, -0.06, 0.46], aim: [0, 0, 1], up: [-0.25, 1, 0], pole: [-0.4, -1, 0] }, reach: [{ side: 'left', at: [0.04, -0.03, 0.0], axis: 'cup', r: 0.034, pole: [0.4, -1, 0] }] }),
  W('Dual pistols · akimbo', ['pistol', 'gun', 'dual', 'action', 'aim'], ['Firearms', 'Dual pistols'], {
    hips: [0, 0, 0], spine: [6, 0, 0], head: [6, 0, 0], armsIn: 'world',
    arms: { rightUpperArm: [-0.45, 0.05, 0.9], rightLowerArm: [-0.3, 0.04, 1], leftUpperArm: [0.45, 0.05, 0.9], leftLowerArm: [0.3, 0.04, 1] },
    legs: { leftUpperLeg: [0.3, -0.95, 0.1], leftLowerLeg: [0.07, -1, 0], rightUpperLeg: [-0.3, -0.95, 0.1], rightLowerLeg: [-0.07, -1, 0] },
  }, { grip: { right: { y: [-0.45, 0.9, 0.05], z: [0, 0, 1] }, left: { y: [0.45, 0.9, 0.05], z: [0, 0, 1] } } }),
  W('Dual pistols · crossed arms', ['pistol', 'gun', 'dual', 'still', 'aim'], ['Firearms', 'Dual pistols'], {
    hips: [0, 0, 0], spine: [4, 0, 0], head: [8, 0, 0], armsIn: 'world',
    arms: { rightUpperArm: [-0.1, -0.15, 1], rightLowerArm: [0.65, 0.2, 0.75], leftUpperArm: [0.1, -0.1, 1], leftLowerArm: [-0.65, 0.3, 0.75] },
    legs: { leftUpperLeg: [0.2, -1, 0.05], leftLowerLeg: [0.05, -1, 0], rightUpperLeg: [-0.2, -1, 0.05], rightLowerLeg: [-0.05, -1, 0] },
  }, { grip: { right: { y: [0, 1, 0], z: [-0.6, 0, 0.8] }, left: { y: [0, 1, 0], z: [0.6, 0, 0.8] } } }),
  W('Rifle · shouldered aim', ['rifle', 'gun', 'two-handed', 'action', 'aim'], ['Firearms', 'Rifle'], {
    hips: [4, 0, 0], spine: [6, -28, 0], neck: [4, 12, 0], head: [10, 16, -12], armsIn: 'world',
    arms: { rightUpperArm: [-0.3, -0.85, 0.45], rightLowerArm: [0.4, 0.3, 0.85], leftUpperArm: [0.05, -0.55, 0.85], leftLowerArm: [-0.25, 0.25, 0.95] },
    legs: { leftUpperLeg: [0.15, -0.95, 0.3], leftLowerLeg: [0.03, -1, 0.02], rightUpperLeg: [-0.2, -0.95, -0.2], rightLowerLeg: [-0.05, -0.95, -0.25] },
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.06, -0.02, 0.07], point: [0, 0.03, -0.33], aim: [0, 0, 1], pole: [-0.5, -1, 0] }, reach: [{ side: 'left', axis: 'z', at: [0, 0.08, 0.27], r: 0.026, pole: [0.2, -1, 0] }] }),
  W('Rifle · kneeling aim', ['rifle', 'gun', 'two-handed', 'action', 'aim', 'kneel'], ['Firearms', 'Rifle'], {
    hips: [5, 0, 0], spine: [10, -28, 0], neck: [4, 12, 0], head: [10, 16, -12], armsIn: 'world',
    arms: { rightUpperArm: [-0.3, -0.85, 0.45], rightLowerArm: [0.4, 0.3, 0.85], leftUpperArm: [0.05, -0.7, 0.7], leftLowerArm: [-0.2, 0.35, 0.92] },
    legs: { leftUpperLeg: [0.12, -0.1, 1], leftLowerLeg: [0.02, -1, 0.05], rightUpperLeg: [-0.12, -1, -0.05], rightLowerLeg: [-0.03, -0.05, -1] },
    feet: 'free',
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.06, -0.02, 0.07], point: [0, 0.03, -0.33], aim: [0, 0, 1], pole: [-0.5, -1, 0] }, reach: [{ side: 'left', axis: 'z', at: [0, 0.08, 0.27], r: 0.026, pole: [0.2, -1, 0] }] }),
  W('Rifle · prone aim', ['rifle', 'gun', 'two-handed', 'action', 'aim', 'prone', 'lying'], ['Firearms', 'Rifle'], {
    hips: [88, 0, 0], spine: [-25, -20, 0], neck: [-25, 10, 0], head: [-25, 10, 0], armsIn: 'world', legsIn: 'world',
    arms: { rightUpperArm: [-0.25, -0.6, 0.75], rightLowerArm: [0.35, 0.15, 0.9], leftUpperArm: [0.15, -0.65, 0.75], leftLowerArm: [-0.15, 0.15, 1] },
    legs: { leftUpperLeg: [0.2, 0, -1], leftLowerLeg: [0.15, 0.02, -1], rightUpperLeg: [-0.2, 0, -1], rightLowerLeg: [-0.15, 0.02, -1] },
    feet: 'free',
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.06, -0.02, 0.07], point: [0, 0.03, -0.33], aim: [0, -0.04, 1], pole: [-0.5, -1, 0] }, reach: [{ side: 'left', axis: 'z', at: [0, 0.08, 0.26], r: 0.026, pole: [0.3, -1, 0] }] }),
  W('Rifle · army crawl', ['rifle', 'gun', 'action', 'crawl', 'prone'], ['Firearms', 'Rifle'], {
    hips: [88, 0, -8], spine: [-15, 10, 0], neck: [-25, 0, 0], head: [-25, 0, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.4, -0.5, 0.75], leftLowerArm: [-0.2, -0.1, 1], rightUpperArm: [-0.35, -0.7, 0.4], rightLowerArm: [0.25, -0.05, 1] },
    legs: { leftUpperLeg: [0.85, -0.05, -0.5], leftLowerLeg: [0.05, 0, -1], rightUpperLeg: [-0.15, 0, -1], rightLowerLeg: [-0.1, 0.05, -1] },
    feet: 'free',
  }, { grip: { right: { y: [0.05, 1, 0], z: [0.25, 0, 0.97] } } }),
  W('Sniper · prone', ['sniper', 'rifle', 'gun', 'two-handed', 'aim', 'prone', 'lying'], ['Firearms', 'Sniper rifle'], {
    hips: [88, 10, 0], spine: [-25, -22, 0], neck: [-25, 10, 0], head: [-20, 10, -10], armsIn: 'world', legsIn: 'world',
    arms: { rightUpperArm: [-0.25, -0.6, 0.75], rightLowerArm: [0.35, 0.15, 0.9], leftUpperArm: [0.15, -0.65, 0.75], leftLowerArm: [-0.15, 0.15, 1] },
    legs: { leftUpperLeg: [0.35, 0, -1], leftLowerLeg: [0.2, 0.02, -1], rightUpperLeg: [-0.1, 0, -1], rightLowerLeg: [-0.05, 0.02, -1] },
    feet: 'free',
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.06, -0.02, 0.07], point: [0, 0.03, -0.39], aim: [0, -0.04, 1], pole: [-0.5, -1, 0] }, reach: [{ side: 'left', axis: 'z', at: [0, 0.065, 0.24], r: 0.024, pole: [0.3, -1, 0] }] }),
  W('Shotgun · hip fire', ['shotgun', 'gun', 'two-handed', 'action'], ['Firearms', 'Shotgun'], {
    hips: [-4, 0, 0], spine: [-6, -38, 0], head: [8, 38, 0], armsIn: 'world',
    arms: { rightUpperArm: [-0.3, -0.95, -0.05], rightLowerArm: [0.1, -0.2, 1], leftUpperArm: [0.1, -0.6, 0.8], leftLowerArm: [-0.3, 0.05, 0.95] },
    legs: { leftUpperLeg: [0.18, -0.95, 0.3], leftLowerLeg: [0.04, -1, 0.02], rightUpperLeg: [-0.22, -0.95, -0.25], rightLowerLeg: [-0.05, -0.92, -0.35] },
  }, { mount: { side: 'right', at: 'hips', off: [-0.1, 0.2, 0.14], point: [0, 0.01, -0.36], aim: [0.05, 0.08, 1], pole: [-0.4, -1, -0.2] }, reach: [{ side: 'left', axis: 'z', at: [0, 0.06, 0.31], r: 0.024, pole: [0.3, -1, 0] }] }),
  W('Pistol · wounded, dragging back', ['pistol', 'gun', 'action', 'wounded', 'ground', 'lying'], ['Firearms', 'Pistol'], {
    hips: [-55, 0, 8], spine: [20, 0, 0], neck: [15, 0, 0], head: [20, 0, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.35, -0.8, -0.5], leftLowerArm: [0.2, -0.05, 1], rightUpperArm: [-0.15, 0.2, 1], rightLowerArm: [-0.02, 0.15, 1] },
    legs: { leftUpperLeg: [0.15, -0.1, 1], leftLowerLeg: [0.1, -0.05, 1], rightUpperLeg: [-0.1, 0.25, 0.95], rightLowerLeg: [0, -0.7, 0.7] },
    hands: { left: 'Open spread' }, feet: 'free',
  }, { grip: { right: { y: [0, 1, 0.15], z: [0, -0.15, 1] } } }),
  W('Pistol · dodge roll (crouched)', ['pistol', 'gun', 'action', 'dodge', 'crouch'], ['Firearms', 'Pistol'], {
    hips: [30, 0, -15], spine: [20, 0, 10], head: [-25, 0, 0], armsIn: 'world',
    arms: { rightUpperArm: [-0.1, -0.15, 1], rightLowerArm: [0, 0.02, 1], leftUpperArm: [0.4, -0.9, 0.1], leftLowerArm: [0.05, -1, 0.1] },
    legs: { rightUpperLeg: [-0.25, -0.3, 0.9], rightLowerLeg: [-0.05, -1, -0.1], leftUpperLeg: [0.35, -0.9, -0.2], leftLowerLeg: [0.1, -0.05, -1] },
    hands: { left: 'Open spread' }, feet: 'free',
  }, { grip: { right: { y: [0, 1, 0.05], z: [0, 0, 1] } } }),
  // ---- sci-fi and fantasy
  W('Blaster · run and gun', ['blaster', 'sci-fi', 'gun', 'action', 'run'], ['Sci-fi & fantasy', 'Blaster'], {
    hips: [12, 0, 0], spine: [8, 0, 0], head: [-8, 0, 0], armsIn: 'world',
    arms: { rightUpperArm: [-0.12, 0, 1], rightLowerArm: [-0.03, 0.03, 1], leftUpperArm: [0.15, -0.6, -0.75], leftLowerArm: [0.05, 0.4, 0.9] },
    legs: { leftUpperLeg: [0.03, -0.35, 0.95], leftLowerLeg: [0, -1, 0.1], rightUpperLeg: [-0.03, -0.75, -0.6], rightLowerLeg: [0, -0.2, -1] },
    hands: { left: 'Loose fist' }, feet: 'free', lift: 0.05,
  }, { grip: { right: { y: [0, 1, 0.08], z: [0, 0, 1] } } }),
  W('Blaster rifle · aim', ['blaster', 'sci-fi', 'rifle', 'two-handed', 'action', 'aim'], ['Sci-fi & fantasy', 'Blaster rifle'], {
    hips: [4, 0, 0], spine: [6, -28, 0], neck: [4, 12, 0], head: [10, 16, -12], armsIn: 'world',
    arms: { rightUpperArm: [-0.3, -0.85, 0.45], rightLowerArm: [0.4, 0.3, 0.85], leftUpperArm: [0.05, -0.55, 0.85], leftLowerArm: [-0.25, 0.25, 0.95] },
    legs: { leftUpperLeg: [0.15, -0.95, 0.3], leftLowerLeg: [0.03, -1, 0.02], rightUpperLeg: [-0.2, -0.95, -0.2], rightLowerLeg: [-0.05, -0.95, -0.25] },
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.06, -0.02, 0.07], point: [0, 0.045, -0.32], aim: [0, 0, 1], pole: [-0.5, -1, 0] }, reach: [{ side: 'left', axis: 'z', at: [0, 0.09, 0.29], r: 0.02, pole: [0.2, -1, 0] }] }),
  W('Beam saber · guard', ['beam saber', 'sci-fi', 'sword', 'two-handed', 'still'], ['Sci-fi & fantasy', 'Beam saber'], {
    hips: [10, -25, 0], spine: [6, -15, 0], head: [5, 35, 0],
    arms: { rightUpperArm: [-0.1, -0.7, 0.7], rightLowerArm: [0.4, 0.15, 0.95], leftUpperArm: [0.3, -0.8, 0.5], leftLowerArm: [-0.15, 0.05, 1] },
    legs: { leftUpperLeg: [0.15, -0.85, 0.5], leftLowerLeg: [0.03, -1, 0.05], rightUpperLeg: [-0.25, -0.9, -0.3], rightLowerLeg: [-0.05, -0.85, -0.5] },
  }, { grip: { right: { y: [0.45, 0.85, -0.25], z: [0, 0.25, 1] } }, reach: [{ side: 'left' }] }),
  W('Wand · duelling cast', ['wand', 'magic', 'fantasy', 'action'], ['Sci-fi & fantasy', 'Wand'], {
    hips: [6, -30, 0], spine: [5, -20, 0], head: [0, 45, 0],
    arms: { rightUpperArm: [0.1, 0.1, 1], rightLowerArm: [0.25, 0.2, 1], leftUpperArm: [0.6, -0.4, -0.6], leftLowerArm: [0.3, 0.5, -0.7] },
    legs: { leftUpperLeg: [0.18, -0.85, 0.5], leftLowerLeg: [0.03, -1, 0.05], rightUpperLeg: [-0.22, -0.92, -0.3], rightLowerLeg: [-0.05, -0.85, -0.5] },
    hands: { left: 'Elegant (ballet)' },
  }, { grip: { right: { y: [0, 0.3, 1], z: [0, -1, 0.3] } } }),
  W('Sword & shield · guard', ['sword', 'shield', 'still'], ['Sci-fi & fantasy', 'Sword + shield'], {
    hips: [8, -15, 0], spine: [8, -10, 0], head: [5, 20, 0],
    arms: { leftUpperArm: [0.35, -0.55, 0.6], leftLowerArm: [-0.4, 0.15, 0.95], rightUpperArm: [-0.5, -0.35, 0.3], rightLowerArm: [-0.05, 0.85, 0.5] },
    legs: { leftUpperLeg: [0.15, -0.9, 0.4], leftLowerLeg: [0.03, -1, 0.03], rightUpperLeg: [-0.22, -0.92, -0.25], rightLowerLeg: [-0.05, -0.92, -0.35] },
  }, { grip: { left: { y: [0, 1, 0], z: [0, 0, 1] }, right: { y: [0.15, 0.6, 0.8], z: [0, -0.6, 0.5] } } }),
  W('Shield · bash', ['shield', 'sword', 'action', 'charge'], ['Sci-fi & fantasy', 'Sword + shield'], {
    hips: [20, 30, 0], spine: [12, 25, 0], head: [-5, -45, 0],
    arms: { leftUpperArm: [0.25, -0.2, 0.95], leftLowerArm: [-0.2, 0.25, 0.95], rightUpperArm: [-0.6, -0.5, -0.5], rightLowerArm: [-0.2, -0.6, 0.75] },
    legs: { leftUpperLeg: [0.1, -0.5, 0.85], leftLowerLeg: [0.02, -1, 0.1], rightUpperLeg: [-0.2, -0.65, -0.75], rightLowerLeg: [-0.05, -0.5, -0.85] },
  }, { grip: { left: { y: [0, 1, 0], z: [0.3, 0, 1] }, right: { y: [0, -0.4, 0.9], z: [0, -0.9, -0.4] } } }),
  // ---- idle / rest (tag 'idle')
  W('Sword · at rest by the side', ['sword', 'idle', 'still', 'rest'], ['Blades', 'Sword'], {
    hips: [0, 0, 5], spine: [2, 4, -3], head: [4, 8, 0],
    arms: { rightUpperArm: [-0.15, -1, 0.05], rightLowerArm: [-0.05, -0.95, 0.3] },
    legs: { rightUpperLeg: [-0.12, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.08], leftLowerLeg: [0, -1, 0.05] },
    hands: { left: 'Relaxed (soft)' },
  }, { grip: { right: { y: [0.05, -0.45, 0.9], z: [0, -0.9, -0.45] } } }),
  W('Sword · point down, hands on pommel', ['sword', 'idle', 'still', 'rest', 'two-handed'], ['Blades', 'Sword'], {
    spine: [4, 0, 0], head: [8, 0, 0],
    arms: { rightUpperArm: [-0.1, -0.8, 0.55], rightLowerArm: [0.25, -0.4, 0.85], leftUpperArm: [0.1, -0.8, 0.55], leftLowerArm: [-0.25, -0.4, 0.85] },
    legs: { leftUpperLeg: [0.12, -1, 0.02], leftLowerLeg: [0.02, -1, 0], rightUpperLeg: [-0.12, -1, 0.02], rightLowerLeg: [-0.02, -1, 0] },
  }, { mount: { side: 'right', at: 'hips', off: [0, -0.93, 0.36], point: [0, 0.92, 0], aim: [0, 0, 1], up: [0, -1, 0], pole: [-0.6, -0.3, -0.5] },
    reach: [{ side: 'left', at: [0.0, -0.12, 0.0], axis: 'cup', r: 0.034, pole: [0.6, -0.3, -0.5] }] }),
  W('Greatsword · planted, hands on pommel', ['greatsword', 'sword', 'idle', 'still', 'rest', 'two-handed'], ['Blades', 'Greatsword'], {
    spine: [4, 0, 0], head: [6, 0, 0],
    arms: { rightUpperArm: [-0.15, -0.6, 0.75], rightLowerArm: [0.3, 0, 0.95], leftUpperArm: [0.15, -0.6, 0.75], leftLowerArm: [-0.3, 0, 0.95] },
    legs: { leftUpperLeg: [0.16, -1, 0.02], leftLowerLeg: [0.03, -1, 0], rightUpperLeg: [-0.16, -1, 0.02], rightLowerLeg: [-0.03, -1, 0] },
  }, { mount: { side: 'right', at: 'hips', off: [0, -0.93, 0.95], point: [0, 1.45, 0], aim: [0, 0.57, 0.82], up: [0, -0.82, 0.57], pole: [-0.6, -0.3, -0.5] },
    reach: [{ side: 'left', at: [0.0, -0.15, 0.0], axis: 'cup', r: 0.036, pole: [0.6, -0.3, -0.5] }] }),
  W('Katana · blade on the shoulder', ['katana', 'sword', 'idle', 'still', 'rest'], ['Blades', 'Katana'], {
    hips: [0, -10, 5], spine: [0, 6, -3], head: [4, 14, 4],
    legs: { rightUpperLeg: [-0.14, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.1], leftLowerLeg: [0, -1, 0.06] },
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.03, 0.08, -0.01], point: [0, 0.3, -0.01], aim: [0, 0.9, 0.42], up: [0.1, 0.42, -0.9], pole: [-0.5, -1, 0.2] } }),
  W('Katana · held low at the side', ['katana', 'sword', 'idle', 'still'], ['Blades', 'Katana'], {
    hips: [0, 15, 0], spine: [3, 10, 0], head: [5, -20, 0],
    arms: { rightUpperArm: [-0.2, -1, 0.15], rightLowerArm: [-0.15, -0.8, 0.55] },
    legs: { rightUpperLeg: [-0.15, -1, 0.15], rightLowerLeg: [-0.02, -1, 0], leftUpperLeg: [0.12, -1, -0.12], leftLowerLeg: [0.02, -1, -0.08] },
  }, { grip: { right: { y: [-0.2, -0.35, 0.9], z: [0, -0.92, -0.35] } } }),
  W('Dual swords · blades down, ready', ['sword', 'dual', 'idle', 'still'], ['Blades', 'Dual swords'], {
    spine: [3, 0, 0], head: [5, 0, 0],
    arms: { rightUpperArm: [-0.3, -1, 0.05], rightLowerArm: [-0.15, -0.9, 0.35], leftUpperArm: [0.3, -1, 0.05], leftLowerArm: [0.15, -0.9, 0.35] },
    legs: { leftUpperLeg: [0.18, -1, 0.04], leftLowerLeg: [0.04, -1, 0], rightUpperLeg: [-0.18, -1, 0.04], rightLowerLeg: [-0.04, -1, 0] },
  }, { grip: { right: { y: [-0.3, -0.6, -0.75], z: [0, -0.8, 0.6] }, left: { y: [0.3, -0.6, -0.75], z: [0, -0.8, 0.6] } } }),
  W('Dagger · twirling, relaxed', ['dagger', 'knife', 'idle', 'still'], ['Blades', 'Dagger'], {
    hips: [0, 0, 6], spine: [2, 0, -4], head: [12, 10, 0],
    arms: { rightUpperArm: [-0.25, -0.9, 0.3], rightLowerArm: [0.35, 0.15, 0.92], leftUpperArm: [0.25, -1, 0], leftLowerArm: [0.1, -1, 0.1] },
    legs: { rightUpperLeg: [-0.12, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.04, -1, 0.1], leftLowerLeg: [0, -1, 0.05] },
  }, { grip: { right: { y: [0.4, 0.85, 0.3], z: [-0.3, -0.2, 0.93] } } }),
  W('Staff · across the shoulders', ['staff', 'idle', 'still', 'rest', 'two-handed'], ['Staves & polearms', 'Short staff'], {
    spine: [-2, 0, 0], head: [-4, 0, 0],
    arms: { rightUpperArm: [-1, 0.25, -0.1], rightLowerArm: [-0.3, 0.9, -0.2], leftUpperArm: [1, 0.25, -0.1], leftLowerArm: [0.3, 0.9, -0.2] },
    legs: { leftUpperLeg: [0.14, -1, 0.04], leftLowerLeg: [0.03, -1, 0], rightUpperLeg: [-0.14, -1, 0.04], rightLowerLeg: [-0.03, -1, 0] },
  }, { hold: { right: { t: [0, 0.38, 0] } }, mount: { side: 'right', at: 'neck', off: [0, 0.02, -0.07], point: [0, 0.13, 0], aim: [0, 1, 0], up: [1, 0, 0], pole: [-0.3, -0.6, -0.8] },
    reach: [{ side: 'left', at: [0, 0.62, 0], r: 0.018, pole: [0.3, -0.6, -0.8] }] }),
  W('Spear · planted at the side', ['spear', 'polearm', 'idle', 'still', 'rest'], ['Staves & polearms', 'Spear'], {
    hips: [0, 0, -4], spine: [0, 0, 3], head: [5, 0, 0],
    legs: { leftUpperLeg: [0.12, -1, 0.02], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.05, -1, 0.06], rightLowerLeg: [0, -1, 0.02] },
  }, { hold: { right: { t: [0, -0.72, 0] } }, mount: { side: 'right', at: 'hips', off: [-0.3, -0.93, 0.12], point: [0, -0.38, 0], aim: [0, 0, 1], up: [0.04, 1, 0], pole: [-0.3, -1, -0.2] } }),
  W('Staff · leaning on it', ['staff', 'idle', 'still', 'rest', 'tired'], ['Staves & polearms', 'Short staff'], {
    hips: [4, 0, -8], spine: [8, 0, 6], neck: [8, 0, 0], head: [6, 0, 4],
    legs: { leftUpperLeg: [0.14, -1, 0.06], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.02, -1, 0.1], rightLowerLeg: [0, -1, 0.03] },
    ik: { leftHand: { at: 'hips', off: [0.17, 0.08, 0.02], pole: [1, -0.3, -0.4] } }, wrist: { left: [-20, 0] },
  }, { hold: { right: { t: [0, -0.62, 0] } }, mount: { side: 'right', at: 'hips', off: [-0.28, -0.93, 0.3], point: [0, -0.44, 0], aim: [0, 0, 1], up: [0.1, 1, -0.15], pole: [-0.4, -1, 0] },
 }),
  W('Axe · on the shoulder', ['axe', 'idle', 'still', 'rest'], ['Axes', 'Short axe'], {
    hips: [0, -8, 5], spine: [0, 5, -3], head: [4, 10, 0],
    legs: { rightUpperLeg: [-0.13, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.1], leftLowerLeg: [0, -1, 0.06] },
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.03, 0.07, 0.01], point: [0, 0.22, 0], aim: [0, 0.85, 0.53], up: [0, 0.53, -0.85], pole: [-0.5, -1, 0.2] } }),
  W('Long axe · on the shoulder', ['axe', 'idle', 'still', 'rest'], ['Axes', 'Long axe'], {
    hips: [0, -8, 5], spine: [0, 5, -3], head: [4, 10, 0],
    legs: { rightUpperLeg: [-0.13, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.1], leftLowerLeg: [0, -1, 0.06] },
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.03, 0.07, 0.01], point: [0, 0.45, 0], aim: [0, 0.85, 0.53], up: [0, 0.53, -0.85], pole: [-0.5, -1, 0.2] } }),
  W('Axe · hanging at the side', ['axe', 'hatchet', 'idle', 'still'], ['Axes', 'Hatchet'], {
    hips: [0, 0, 5], spine: [2, 0, -3], head: [6, -10, 0],
    arms: { rightUpperArm: [-0.15, -1, 0.02], rightLowerArm: [-0.05, -1, 0.12] },
    legs: { rightUpperLeg: [-0.12, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.08], leftLowerLeg: [0, -1, 0.05] },
  }, { grip: { right: { y: [0, -1, 0.15], z: [0, 0.15, 1] } } }),
  W('Bow · arrow nocked, low ready', ['bow', 'archer', 'idle', 'still', 'ready'], ['Bows', 'Bow + arrow'], {
    hips: [0, 10, 0], spine: [3, 10, 0], neck: [0, 20, 0], head: [8, 30, 0],
    arms: { leftUpperArm: [0.45, -0.75, 0.45], leftLowerArm: [0.35, -0.4, 0.85] },
    legs: { leftUpperLeg: [0.2, -1, 0.02], leftLowerLeg: [0.05, -1, 0], rightUpperLeg: [-0.2, -1, 0.02], rightLowerLeg: [-0.05, -1, 0] },
  }, { grip: { left: { y: [0.35, 0.6, 0.72], z: [0.55, -0.7, 0.45] } }, hold: { right: { r: [90, 0, 0] } },
    reach: [{ side: 'right', from: 'left', at: [0, 0.0, -0.16], axis: 'z', shape: { T: [25, 35, 30, 0, 55], I: [10, 70, 55, 0], M: [10, 75, 60, 0], R: [15, 75, 60, 0], L: [70, 90, 65, 0] }, pole: [-0.6, -1, -0.3] }] }),
  W('Pistol · low ready', ['pistol', 'gun', 'idle', 'still', 'ready', 'two-handed'], ['Firearms', 'Pistol'], {
    hips: [2, 0, 0], spine: [6, 0, 0], head: [12, 0, 0],
    legs: { leftUpperLeg: [0.15, -1, 0.1], leftLowerLeg: [0.03, -1, 0], rightUpperLeg: [-0.15, -1, -0.04], rightLowerLeg: [-0.03, -1, -0.04] },
  }, { mount: { side: 'right', at: 'chest', off: [-0.02, -0.3, 0.36], aim: [0, -0.6, 0.8], pole: [-0.4, -1, 0] },
    reach: [{ side: 'left', at: [0.04, -0.03, 0.0], axis: 'cup', r: 0.034, pole: [0.4, -1, 0] }] }),
  W('Pistol · muzzle up by the face', ['pistol', 'gun', 'idle', 'still', 'ready'], ['Firearms', 'Pistol'], {
    hips: [0, 0, 5], spine: [0, -10, -3], head: [4, 10, 0],
    legs: { rightUpperLeg: [-0.12, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.1], leftLowerLeg: [0, -1, 0.06] },
  }, { mount: { side: 'right', at: 'head', off: [-0.14, -0.08, 0.12], aim: [0, 1, 0], up: [0, 0, -1], pole: [-0.3, -1, 0] } }),
  W('Pistol · hand on the holster', ['pistol', 'gun', 'idle', 'still', 'western'], ['Firearms', 'Revolver'], {
    hips: [0, 0, 6], spine: [0, 0, -4], head: [8, 0, 0],
    legs: { rightUpperLeg: [-0.14, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.1], leftLowerLeg: [0, -1, 0.06] },
    hands: { left: 'Relaxed' },
  }, { mount: { side: 'right', at: 'hips', off: [-0.27, -0.06, 0.0], aim: [0, -1, 0.08], up: [0, 0.08, -1], pole: [-0.5, -0.8, -0.4] } }),
  W('Rifle · port arms', ['rifle', 'gun', 'idle', 'still', 'two-handed'], ['Firearms', 'Rifle'], {
    spine: [2, 0, 0], head: [6, 0, 0],
    legs: { leftUpperLeg: [0.13, -1, 0.04], leftLowerLeg: [0.03, -1, 0], rightUpperLeg: [-0.13, -1, 0.04], rightLowerLeg: [-0.03, -1, 0] },
  }, { mount: { side: 'right', at: 'chest', off: [-0.12, -0.3, 0.22], aim: [0.55, 0.83, 0], up: [0, 0, 1], pole: [-0.6, -1, 0] },
    reach: [{ side: 'left', axis: 'z', at: [0, 0.08, 0.32], r: 0.026, pole: [0.6, -1, 0] }] }),
  W('Rifle · low ready', ['rifle', 'gun', 'idle', 'still', 'ready', 'two-handed'], ['Firearms', 'Rifle'], {
    hips: [4, 0, 0], spine: [8, -28, 0], neck: [6, 12, 0], head: [14, 16, 0],
    legs: { leftUpperLeg: [0.15, -0.95, 0.3], leftLowerLeg: [0.03, -1, 0.02], rightUpperLeg: [-0.2, -0.95, -0.2], rightLowerLeg: [-0.05, -0.95, -0.25] },
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.06, -0.02, 0.07], point: [0, 0.03, -0.33], aim: [0, -0.55, 0.84], pole: [-0.5, -1, 0] },
    reach: [{ side: 'left', axis: 'z', at: [0, 0.08, 0.27], r: 0.026, pole: [0.2, -1, 0] }] }),
  W('Rifle · resting on the shoulder', ['rifle', 'gun', 'idle', 'still', 'rest'], ['Firearms', 'Rifle'], {
    hips: [0, -8, 5], spine: [0, 5, -3], head: [4, 10, 0],
    legs: { rightUpperLeg: [-0.13, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.1], leftLowerLeg: [0, -1, 0.06] },
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.02, 0.08, 0.0], point: [0, 0.1, 0.24], aim: [0, 0.6, -0.8], up: [0, 0.8, 0.6], pole: [-0.5, -1, 0.3] } }),
  W('Sniper · carried on the shoulder', ['sniper', 'rifle', 'gun', 'idle', 'still', 'rest'], ['Firearms', 'Sniper rifle'], {
    hips: [0, -8, 5], spine: [0, 5, -3], head: [4, 10, 0],
    legs: { rightUpperLeg: [-0.13, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.1], leftLowerLeg: [0, -1, 0.06] },
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.02, 0.08, 0.0], point: [0, 0.08, 0.26], aim: [0, 0.6, -0.8], up: [0, 0.8, 0.6], pole: [-0.5, -1, 0.3] } }),
  W('Shotgun · on the shoulder', ['shotgun', 'gun', 'idle', 'still', 'rest'], ['Firearms', 'Shotgun'], {
    hips: [0, -8, 5], spine: [0, 5, -3], head: [4, 10, 0],
    legs: { rightUpperLeg: [-0.13, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.1], leftLowerLeg: [0, -1, 0.06] },
  }, { mount: { side: 'right', at: 'rightUpperArm', off: [0.02, 0.08, 0.0], point: [0, 0.1, 0.24], aim: [0, 0.6, -0.8], up: [0, 0.8, 0.6], pole: [-0.5, -1, 0.3] } }),
  W('Blaster · muzzle up, idle', ['blaster', 'sci-fi', 'gun', 'idle', 'still'], ['Sci-fi & fantasy', 'Blaster'], {
    hips: [0, 0, 5], spine: [0, -10, -3], head: [4, 10, 0],
    legs: { rightUpperLeg: [-0.12, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.1], leftLowerLeg: [0, -1, 0.06] },
  }, { mount: { side: 'right', at: 'head', off: [-0.15, -0.08, 0.12], aim: [0, 1, 0], up: [0, 0, -1], pole: [-0.3, -1, 0] } }),
  W('Beam saber · idle, blade down', ['beam saber', 'sci-fi', 'sword', 'idle', 'still'], ['Sci-fi & fantasy', 'Beam saber'], {
    hips: [0, 10, 5], spine: [2, 6, -3], head: [6, -12, 0],
    arms: { rightUpperArm: [-0.2, -1, 0.08], rightLowerArm: [-0.12, -0.9, 0.35] },
    legs: { rightUpperLeg: [-0.12, -1, 0.04], rightLowerLeg: [0, -1, -0.02], leftUpperLeg: [0.05, -1, 0.08], leftLowerLeg: [0, -1, 0.05] },
  }, { grip: { right: { y: [-0.15, -0.55, 0.82], z: [0, -0.82, -0.55] } } }),
  W('Sword & shield · resting', ['sword', 'shield', 'idle', 'still', 'rest'], ['Sci-fi & fantasy', 'Sword + shield'], {
    hips: [0, 0, 4], spine: [2, 0, -2], head: [6, 0, 0],
    arms: { leftUpperArm: [0.25, -1, 0.1], leftLowerArm: [0.05, -0.55, 0.85], rightUpperArm: [-0.18, -1, 0.05], rightLowerArm: [-0.05, -0.95, 0.3] },
    legs: { leftUpperLeg: [0.13, -1, 0.04], leftLowerLeg: [0.03, -1, 0], rightUpperLeg: [-0.13, -1, 0.04], rightLowerLeg: [-0.03, -1, 0] },
  }, { grip: { left: { y: [0, 1, 0], z: [0.2, 0, 1] }, right: { y: [0.05, -0.45, 0.9], z: [0, -0.9, -0.45] } } }),
];
