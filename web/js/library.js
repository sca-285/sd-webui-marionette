// Everything the Props panel can add: primitives, room and furniture, then
// the hand-held props (weapons and everyday objects).
import { LIBRARY as BASE } from './primitives.js';
import { WEAPONS } from './weapons.js';

export const LIBRARY = { ...BASE, ...WEAPONS };
