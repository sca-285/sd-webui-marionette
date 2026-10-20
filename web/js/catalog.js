// Every built-in pose of the library, by category. Entries are either a body
// pose (bodypose.js), optionally with props (poseapply.js), or one of the
// older direction presets (rig.js POSE_PRESETS).
import { POSE_PRESETS } from './rig.js';
import { STANDING } from './poses/standing.js';
import { ACTION } from './poses/action.js';
import { AIR } from './poses/air.js';
import { GROUND } from './poses/ground.js';
import { WEAPONS } from './poses/weapons.js';
import { PROPS } from './poses/props.js';
import { FASHION } from './poses/fashion.js';
import { SUPPORT } from './poses/support.js';
import { ADULT } from './poses/adult.js';

export const CATEGORIES = [
  ['basics', 'Basics'], ['standing', 'Standing & everyday'], ['action', 'Action & fighting'],
  ['air', 'Midair, jumps & flying'], ['ground', 'Ground: crawl, lie, kneel'], ['weapons', 'Weapons'],
  ['props', 'Everyday props'], ['fashion', 'Fashion & studio'], ['support', 'Seats, walls & steps'],
];

const tag = (cat, list, extra = {}) => list.map((e) => ({ ...extra, ...e, cat, id: `${cat}:${e.name}` }));

export const CATALOG = [
  ...tag('basics', Object.keys(POSE_PRESETS).map((name) => ({ name, preset: name, tags: ['basic'] }))),
  ...tag('standing', STANDING),
  ...tag('action', ACTION),
  ...tag('air', AIR),
  ...tag('ground', GROUND),
  ...tag('weapons', WEAPONS),
  ...tag('props', PROPS),
  ...tag('fashion', FASHION),
  ...tag('support', SUPPORT),
  ...tag('adult', ADULT, { adult: true }),
];
