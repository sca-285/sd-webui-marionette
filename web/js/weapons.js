// Hand-held props: blades, polearms, axes, bows, firearms, sci-fi and everyday
// objects. Units are metres.
//
// Every held prop is built in its grip frame, so it can ride in a hand:
//   origin = centre of the main hand's grip,
//   +Y     = along the fist, out past the thumb (blade, shaft tip, barrel side),
//   +Z     = the way the knuckles point (cutting edge, muzzle, arrow).
// `poly.grip` says how it is held: { hand, style, second } where `second` is
// the other hand's grip point (two-handed props) in the same frame.
import * as THREE from 'three';
import { PolyMesh } from './polymesh.js';
import { box, cylinder, sphere, torus, prism } from './primitives.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RAD = Math.PI / 180;

// Faces counter-clockwise seen from outside: flip a closed part whose signed volume is negative.
function orient(m) {
  let vol = 0;
  const t = new THREE.Vector3();
  for (const f of m.f) {
    const a = m.v[f[0]];
    for (let i = 1; i + 1 < f.length; i++) vol += a.dot(t.copy(m.v[f[i]]).cross(m.v[f[i + 1]]));
  }
  if (vol < 0) m.f.forEach((f) => f.reverse());
  return m;
}

// Move / turn a part: rotations in degrees (XYZ order), then translation.
function xf(m, { t = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}) {
  const m4 = new THREE.Matrix4().compose(V(...t), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0] * RAD, r[1] * RAD, r[2] * RAD)), V(s, s, s));
  m.transform(m4);
  return m;
}

const merge = (...parts) => PolyMesh.merge(parts.flat());

// Rings of equal length joined by quads; a ring of one point closes to a tip.
function loft(rings) {
  const v = [], f = [], at = [];
  for (const r of rings) { at.push(v.length); v.push(...r); }
  for (let k = 0; k + 1 < rings.length; k++) {
    const A = rings[k], B = rings[k + 1], a = at[k], b = at[k + 1];
    if (B.length === 1) for (let i = 0; i < A.length; i++) f.push([a + i, a + ((i + 1) % A.length), b]);
    else if (A.length === 1) for (let i = 0; i < B.length; i++) f.push([a, b + ((i + 1) % B.length), b + i]);
    else for (let i = 0; i < A.length; i++) { const j = (i + 1) % A.length; f.push([a + i, a + j, b + j, b + i]); }
  }
  if (rings[0].length > 2) f.push([...rings[0].keys()].map((i) => i + at[0]).reverse());
  const last = rings[rings.length - 1];
  if (last.length > 2) f.push([...last.keys()].map((i) => i + at[at.length - 1]));
  return orient(new PolyMesh(v, f));
}

// Sweep a 2D cross-section along a path. `side` is a direction kept
// perpendicular to the path (the section's first axis); scale(t) tapers it.
function sweep(path, shape, { side = V(1, 0, 0), scale = () => 1 } = {}) {
  const n = path.length;
  const rings = path.map((p, i) => {
    const T = path[Math.min(n - 1, i + 1)].clone().sub(path[Math.max(0, i - 1)]).normalize();
    const N = side.clone().addScaledVector(T, -side.dot(T)).normalize();
    const B = T.clone().cross(N);
    const s = scale(i / (n - 1));
    return shape.map(([a, b]) => p.clone().addScaledVector(N, a * s).addScaledVector(B, b * s));
  });
  return loft(rings);
}

const circle = (r, n = 12) => [...Array(n)].map((_, i) => [Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r]);
const rect = (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
// Rod along +Y from y0 to y1.
const rod = (r, y0, y1, n = 12, x = 0, z = 0, r2 = r) => orient(cylinder(r, y1 - y0, n, x, y0, z, r2));
// Rod between two points.
const bar = (a, b, r, n = 10) => sweep([V(...a), V(...b)], circle(r, n), { side: Math.abs(b[0] - a[0]) > 0.9 * Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) ? V(0, 1, 0) : V(1, 0, 0) });
const cube = (w, h, d, x, y, z) => orient(box(w, h, d, x, y, z));
const ball = (r, y, seg = 12, rings = 8) => orient(sphere(r, seg, rings, y));
const ring = (R, r, y, n = 24) => xf(orient(torus(R, r, n, 8)), { t: [0, y - r, 0] });
const flat = (profile, thick, x = 0) => xf(orient(prism(profile, thick)), { t: [x, 0, 0] });

const tag = (m, color, grip) => { m.color = color; if (grip) m.grip = grip; return m; };
// Paint every face of a part (parts keep their colour through merge).
const paint = (hex, ...parts) => { for (const m of parts.flat()) for (const f of m.f) f.c = hex; return parts.length === 1 ? parts[0] : parts.flat(); };
const STEEL = 0xc9d0d9, DARK = 0x5b6472, WOOD = 0x9a7653, GOLD = 0xd0a94e, BLACK = 0x4a515d, SCIFI = 0xd5dce6;
const LEATHER = 0x6b4a33, BRASS = 0xb88d4a, DARKWOOD = 0x6e4c32, POLYMER = 0x383e48, ORB = 0x7dd3fc, ENERGY = 0x5eead4, ACCENT = 0x38bdf8, FLAME = 0xf59e0b, CLOTH = 0xa63d3d;

// ---------------------------------------------------------------- blades

// Straight double edge with a diamond section; tip at y1.
function straightBlade(y0, y1, w0, w1, t, tipLen) {
  const ringAt = (y, w) => [V(0, y, w / 2), V(t / 2, y, 0), V(0, y, -w / 2), V(-t / 2, y, 0)];
  return loft([ringAt(y0, w0), ringAt(y1 - tipLen, w1), [V(0, y1, 0)]]);
}

// Single edge on +Z, spine on -Z; `curve` bends it back towards the spine;
// `belly` widens it towards the tip (dao) before the clipped point.
function sabreBlade(y0, len, w0, wTip, t, { curve = 0.06, belly = 0, steps = 10 } = {}) {
  const rings = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, y = y0 + u * len;
    const off = -curve * u * u;
    const w = w0 + (wTip - w0) * u + belly * Math.sin(u * Math.PI * 0.9);
    const tw = u > 0.88 ? Math.max(0.004, w * (1 - (u - 0.88) / 0.12)) : w;
    if (i === steps) { rings.push([V(0, y, off - w0 * 0.15)]); break; }
    const spine = off - tw * 0.3, edge = off + tw * 0.7;
    rings.push([V(0, y, edge), V(t / 2, y, spine + tw * 0.25), V(t / 2, y, spine), V(-t / 2, y, spine), V(-t / 2, y, spine + tw * 0.25)]);
  }
  return loft(rings);
}

// Wrapped grip from y0 to y1 with a pommel below.
const hilt = (y0, y1, r = 0.016, pommel = 0.022) => [paint(LEATHER, rod(r, y0, y1, 10)), paint(BRASS, ball(pommel, y0 - pommel * 0.7, 10, 6))];

const sword = () => tag(merge(
  ...hilt(-0.1, 0.1),
  paint(BRASS, cube(0.03, 0.025, 0.2, 0, 0.115, 0)),
  straightBlade(0.125, 0.92, 0.045, 0.034, 0.008, 0.09),
), STEEL, { hand: 'right', style: 'fist' });

const greatsword = () => tag(merge(
  ...hilt(-0.2, 0.18, 0.018, 0.028),
  paint(BRASS, cube(0.035, 0.03, 0.34, 0, 0.195, 0)),
  straightBlade(0.21, 1.45, 0.065, 0.05, 0.01, 0.13),
), STEEL, { hand: 'right', style: 'fist', second: [0, -0.14, 0] });

const jian = () => tag(merge(
  ...hilt(-0.09, 0.09, 0.014, 0.018),
  paint(BRASS, xf(cube(0.03, 0.022, 0.09, 0, 0, 0), { t: [0, 0.1, 0] })),
  straightBlade(0.11, 0.8, 0.034, 0.026, 0.006, 0.06),
), STEEL, { hand: 'right', style: 'fist' });

const dao = () => tag(merge(
  ...hilt(-0.1, 0.09, 0.016, 0.02),
  paint(BRASS, rod(0.048, 0.09, 0.098, 18)),
  sabreBlade(0.098, 0.72, 0.038, 0.05, 0.007, { curve: 0.07, belly: 0.012 }),
), STEEL, { hand: 'right', style: 'fist' });

const katana = () => tag(merge(
  paint(0x2b2f36, rod(0.015, -0.16, 0.12, 10)),
  paint(BRASS, orient(cylinder(0.04, 0.008, 16, 0, 0.12, 0))),
  sabreBlade(0.128, 0.72, 0.032, 0.026, 0.007, { curve: 0.035 }),
), STEEL, { hand: 'right', style: 'fist', second: [0, -0.11, 0] });

const dagger = () => tag(merge(
  ...hilt(-0.05, 0.05, 0.013, 0.016),
  paint(BRASS, cube(0.022, 0.016, 0.085, 0, 0.058, 0)),
  straightBlade(0.066, 0.28, 0.034, 0.024, 0.006, 0.06),
), STEEL, { hand: 'right', style: 'fist' });

const rapier = () => tag(merge(
  ...hilt(-0.08, 0.08, 0.013, 0.02),
  paint(BRASS, ring(0.06, 0.004, 0.09)),
  paint(BRASS, cube(0.012, 0.012, 0.22, 0, 0.09, 0)),
  straightBlade(0.095, 1.05, 0.02, 0.012, 0.006, 0.05),
), STEEL, { hand: 'right', style: 'fist' });

const beamSaber = () => tag(merge(
  paint(0x9aa4b2, rod(0.018, -0.12, 0.13, 14)),
  paint(0x2f3640, rod(0.022, 0.1, 0.13, 14)),
  paint(ENERGY, rod(0.014, 0.13, 1.0, 12), ball(0.014, 1.0, 10, 6)),
), SCIFI, { hand: 'right', style: 'fist', second: [0, -0.09, 0] });

// ---------------------------------------------------------------- polearms and staves

const shortStaff = () => tag(merge(
  rod(0.016, -0.42, 0.68, 12),
  paint(BRASS, rod(0.019, -0.45, -0.38, 12), rod(0.019, 0.64, 0.71, 12)),
), WOOD, { hand: 'right', style: 'fist', second: [0, 0.4, 0] });

// Mage staff: long shaft, a crescent cradling an orb.
function archistaff() {
  const crest = sweep(
    [...Array(17)].map((_, i) => { const a = (-200 + (i / 16) * 220) * RAD; return V(0, 1.02 + Math.sin(a) * 0.12 + 0.08, Math.cos(a) * 0.12); }),
    rect(0.022, 0.016), { side: V(1, 0, 0), scale: (u) => 1 - 0.5 * Math.abs(u - 0.5) },
  );
  return tag(merge(
    paint(DARKWOOD, rod(0.017, -1.05, 1.02, 12, 0, 0, 0.02)),
    ring(0.026, 0.008, -0.05), ring(0.026, 0.008, 0.9),
    crest,
    paint(ORB, ball(0.055, 1.1, 16, 10)),
    xf(orient(cylinder(0.014, 0.04, 10, 0, 0, 0, 0.002)), { t: [0, -1.09, 0] }),
  ), GOLD, { hand: 'right', style: 'fist', second: [0, -0.35, 0] });
}

function leafHead(y0, len, w, t) {
  const ringAt = (y, ww) => [V(0, y, ww / 2), V(t / 2, y, 0), V(0, y, -ww / 2), V(-t / 2, y, 0)];
  return loft([ringAt(y0, w * 0.3), ringAt(y0 + len * 0.35, w), ringAt(y0 + len * 0.7, w * 0.6), [V(0, y0 + len, 0)]]);
}

const spear = () => tag(merge(
  rod(0.015, -0.35, 1.6, 12),
  paint(DARK, rod(0.02, -0.38, -0.33, 12), rod(0.018, 1.58, 1.66, 12, 0, 0, 0.012)),
  paint(CLOTH, ball(0.035, 1.6, 10, 6)), // tassel bundle
  paint(STEEL, leafHead(1.66, 0.3, 0.055, 0.012)),
), WOOD, { hand: 'right', style: 'fist', second: [0, 0.75, 0] });

const scythe = () => tag(merge(
  paint(DARKWOOD, rod(0.017, -0.5, 1.15, 12)),
  sweep([...Array(13)].map((_, i) => { const u = i / 12; return V(0, 1.12 - Math.sin(u * 2.2) * 0.12 * u, 0.02 - u * 0.7); }),
    [[0, 0.05], [0.006, 0], [0, -0.02], [-0.006, 0]], { side: V(1, 0, 0), scale: (u) => 1 - 0.9 * u }),
), DARK, { hand: 'right', style: 'fist', second: [0, 0.7, 0] });

// ---------------------------------------------------------------- axes

// Flat bearded head, edge on +Z, poll on -Z.
function axeHead(y, size, thick, { beard = 0.5, poll = 'flat' } = {}) {
  const s = size;
  const prof = [[-0.03 * s / 0.12, y - 0.025], [0.04, y - 0.022], [0.09 * s / 0.12, y - 0.06 * beard * s / 0.12 - 0.02],
    [0.12 * s / 0.12, y - 0.07 * beard * s / 0.12 - 0.02], [0.13 * s / 0.12, y + 0.035 * s / 0.12],
    [0.095 * s / 0.12, y + 0.05 * s / 0.12], [0.04, y + 0.025], [-0.03 * s / 0.12, y + 0.028]];
  const head = paint(STEEL, flat(prof, thick));
  const eye = cube(thick * 1.9, 0.07, 0.05, 0, y, -0.005);
  const back = poll === 'spike' ? xf(orient(cylinder(0.014, 0.07, 8, 0, 0, 0, 0.001)), { r: [-90, 0, 0], t: [0, y, -0.025] }) : cube(thick * 1.9, 0.05, 0.03, 0, y, -0.04);
  return [head, eye, back];
}

const hatchet = () => tag(merge(paint(WOOD, rod(0.014, -0.16, 0.2, 10)), ...axeHead(0.19, 0.08, 0.012)), DARK, { hand: 'right', style: 'fist' });
const shortAxe = () => tag(merge(paint(WOOD, rod(0.016, -0.22, 0.38, 10)), ...axeHead(0.36, 0.12, 0.014, { beard: 0.9 })), DARK, { hand: 'right', style: 'fist' });
const longAxe = () => tag(merge(
  paint(DARKWOOD, rod(0.018, -0.4, 0.95, 12)), paint(LEATHER, rod(0.021, -0.44, -0.38, 10)),
  ...axeHead(0.9, 0.2, 0.018, { beard: 1, poll: 'spike' }),
), DARK, { hand: 'right', style: 'fist', second: [0, 0.45, 0] });

// ---------------------------------------------------------------- bows

// Recurve in the YZ plane: the string on -Z (towards the archer).
// draw: how far the string is pulled back (m). At full draw the limbs bend
// further and the string makes a V to the nock point behind the grip.
function bowMesh(draw = 0) {
  const k = 1 + 0.75 * (draw / 0.6), sy = 1 - 0.07 * (draw / 0.6);
  const zOf = (u) => k * (-0.172 * u * u + (u > 0.85 ? 0.12 * (u - 0.85) : 0));
  const limb = (dir) => sweep(
    [...Array(11)].map((_, i) => { const u = i / 10; return V(0, dir * (0.08 + u * 0.66) * sy, zOf(u)); }),
    rect(0.034, 0.014), { side: V(1, 0, 0), scale: (u) => 1 - 0.55 * u },
  );
  const tipY = 0.74 * sy, tipZ = zOf(1);
  const string = draw > 0
    ? [bar([0, tipY, tipZ], [0, 0, -draw], 0.002, 6), bar([0, 0, -draw], [0, -tipY, tipZ], 0.002, 6)]
    : [bar([0, tipY, tipZ], [0, -tipY, tipZ], 0.002, 6)];
  return merge(
    paint(LEATHER, cube(0.032, 0.22, 0.045, 0, 0, 0.004)), // riser
    limb(1), limb(-1),
    paint(0xeae6dc, ...string),
  );
}
const bow = () => tag(bowMesh(), WOOD, { hand: 'left', style: 'fist' });
const drawnBow = () => tag(bowMesh(0.66), WOOD, { hand: 'left', style: 'fist' });

// Arrow lying along +Z with the nock at the origin.
function arrowMesh(len = 0.75) {
  return merge(
    bar([0, 0, 0], [0, 0, len - 0.04], 0.0045, 6),
    paint(STEEL, xf(orient(cylinder(0.009, 0.045, 6, 0, 0, 0, 0.0005)), { r: [90, 0, 0], t: [0, 0, len - 0.045] })),
    ...[0, 120, 240].map((a) => paint(0xe9e5dc, xf(flat([[0.02, 0], [0.11, 0], [0.12, 0.016], [0.035, 0.016]], 0.001), { r: [0, 0, a] }))),
  );
}
const arrow = () => tag(xf(arrowMesh(), { r: [-90, 0, 0], t: [0, -0.02, 0] }), WOOD, { hand: 'right', style: 'pinch' });

// Upright quiver, five arrows standing in it; worn on the back.
function quiverMesh() {
  const tube = paint(LEATHER, orient(cylinder(0.065, 0.55, 14, 0, 0, 0, 0.075)));
  const arrows = [[-0.02, 0.02], [0.025, 0.015], [0, -0.025], [-0.03, -0.02], [0.03, -0.02]]
    .map(([x, z], i) => xf(arrowMesh(), { r: [-90, 0, 0], t: [x, 0.08 + i * 0.012, z] }));
  return merge(tube, paint(BRASS, ring(0.07, 0.008, 0.06), ring(0.077, 0.008, 0.52)), ...arrows);
}
const quiver = () => tag(quiverMesh(), WOOD, { hand: 'back', style: 'none' });

// ---------------------------------------------------------------- firearms

// Pistol grip leaning back a little, the gun's bore along +Z at height `bore`.
const pistolGrip = (h = 0.11, w = 0.03, d = 0.05, lean = -16, c = POLYMER) => paint(c, xf(cube(w, h, d, 0, 0, 0), { r: [lean, 0, 0], t: [0, -0.005, -0.005] }));
const triggerGuard = (y, z, r = 0.022) => sweep(
  [...Array(9)].map((_, i) => { const a = (i / 8) * Math.PI; return V(0, y - Math.sin(a) * r, z + Math.cos(a) * r * 1.2); }),
  rect(0.008, 0.005), { side: V(1, 0, 0) },
);

const pistol = () => tag(merge(
  pistolGrip(),
  paint(0x7b8494, cube(0.028, 0.032, 0.19, 0, 0.068, 0.045)), // slide
  cube(0.026, 0.022, 0.13, 0, 0.044, 0.06), // frame
  triggerGuard(0.035, 0.05),
  cube(0.005, 0.016, 0.006, 0, 0.026, 0.045), // trigger
), BLACK, { hand: 'right', style: 'trigger', second: [0, -0.01, -0.01] });

const magnum = () => tag(merge(
  pistolGrip(0.125, 0.034, 0.058),
  paint(0xa7afbb, cube(0.034, 0.04, 0.27, 0, 0.078, 0.075)),
  flat([[-0.06, 0.098], [0.21, 0.098], [0.21, 0.106], [-0.06, 0.106]], 0.01), // rib
  cube(0.03, 0.026, 0.14, 0, 0.05, 0.07),
  triggerGuard(0.038, 0.055, 0.025),
), BLACK, { hand: 'right', style: 'trigger', second: [0, -0.01, -0.01] });

const revolver = () => tag(merge(
  paint(DARKWOOD, xf(cube(0.03, 0.105, 0.042, 0, 0, 0), { r: [-24, 0, 0], t: [0, -0.005, -0.015] })),
  cube(0.024, 0.045, 0.07, 0, 0.055, 0.02), // frame
  paint(0x9aa3af, xf(orient(cylinder(0.022, 0.045, 12, 0, 0, 0)), { r: [90, 0, 0], t: [0, 0.062, 0.055] })), // drum
  paint(0x9aa3af, bar([0, 0.072, 0.055], [0, 0.072, 0.24], 0.009, 10)), // barrel
  cube(0.008, 0.02, 0.17, 0, 0.083, 0.15), // barrel lug
  cube(0.008, 0.02, 0.02, 0, 0.085, -0.012), // hammer
  triggerGuard(0.032, 0.04),
), DARK, { hand: 'right', style: 'trigger', second: [0, -0.01, -0.01] });

// Assault rifle: receiver over the grip, stock behind, handguard ahead.
const rifle = () => tag(merge(
  pistolGrip(0.1, 0.03, 0.045, -20),
  cube(0.04, 0.07, 0.3, 0, 0.075, 0.06),
  paint(0x6b7280, cube(0.045, 0.05, 0.28, 0, 0.08, 0.35)), // handguard
  bar([0, 0.085, 0.49], [0, 0.085, 0.62], 0.008, 8), // barrel
  cube(0.012, 0.03, 0.012, 0, 0.122, 0.57), // front sight
  cube(0.02, 0.03, 0.1, 0, 0.125, 0.05), // rail / sight
  paint(POLYMER, xf(cube(0.03, 0.17, 0.06, 0, 0, 0), { r: [14, 0, 0], t: [0, -0.02, 0.15] })), // magazine
  paint(POLYMER, flat([[-0.09, 0.1], [-0.33, 0.085], [-0.33, -0.03], [-0.29, -0.03], [-0.09, 0.05]], 0.035)), // stock
  triggerGuard(0.035, 0.03),
), BLACK, { hand: 'right', style: 'trigger', second: [0, 0.05, 0.34] });

const sniperRifle = () => tag(merge(
  pistolGrip(0.09, 0.03, 0.045, -22),
  cube(0.04, 0.06, 0.3, 0, 0.07, 0.07),
  cube(0.042, 0.04, 0.2, 0, 0.065, 0.3),
  bar([0, 0.075, 0.4], [0, 0.075, 0.95], 0.01, 10),
  paint(0x2b2f36, bar([0, 0.15, -0.02], [0, 0.15, 0.28], 0.02, 12)), // scope
  cube(0.02, 0.035, 0.02, 0, 0.115, 0.04), cube(0.02, 0.035, 0.02, 0, 0.115, 0.2),
  cube(0.025, 0.08, 0.05, 0, 0.0, 0.13),
  paint(0x6f5a3e, flat([[-0.08, 0.1], [-0.38, 0.09], [-0.4, -0.04], [-0.33, -0.04], [-0.2, 0.0], [-0.08, 0.04]], 0.04)),
  triggerGuard(0.035, 0.03),
), DARK, { hand: 'right', style: 'trigger', second: [0, 0.04, 0.3] });

const shotgun = () => tag(merge(
  pistolGrip(0.09, 0.03, 0.045, -22, WOOD),
  paint(DARK, cube(0.04, 0.06, 0.24, 0, 0.07, 0.06)),
  paint(DARK, bar([0, 0.085, 0.18], [0, 0.085, 0.7], 0.012, 10)),
  paint(DARK, bar([0, 0.055, 0.2], [0, 0.055, 0.62], 0.011, 10)), // tube magazine
  bar([0, 0.06, 0.3], [0, 0.06, 0.45], 0.022, 10), // pump
  flat([[-0.06, 0.09], [-0.36, 0.07], [-0.36, -0.06], [-0.3, -0.06], [-0.06, 0.03]], 0.04),
  triggerGuard(0.035, 0.03),
), WOOD, { hand: 'right', style: 'trigger', second: [0, 0.04, 0.37] });

// ---------------------------------------------------------------- sci-fi

const blaster = () => tag(merge(
  pistolGrip(0.105, 0.032, 0.05, -18),
  cube(0.036, 0.045, 0.17, 0, 0.07, 0.04),
  bar([0, 0.075, 0.12], [0, 0.075, 0.25], 0.016, 12),
  ...[0.17, 0.215].map((z) => paint(ACCENT, xf(ring(0.02, 0.005, 0), { r: [90, 0, 0], t: [0, 0.075, z] }))), // cooling rings
  paint(0x4b5563, cube(0.012, 0.03, 0.06, 0, 0.105, 0.01)), // emitter fin
  paint(ENERGY, bar([0, 0.045, -0.03], [0, 0.045, 0.06], 0.01, 8)), // power cell
  triggerGuard(0.032, 0.04),
), SCIFI, { hand: 'right', style: 'trigger', second: [0, -0.01, -0.01] });

const blasterRifle = () => tag(merge(
  pistolGrip(0.1, 0.03, 0.045, -18),
  cube(0.05, 0.08, 0.36, 0, 0.08, 0.1),
  bar([0, 0.09, 0.27], [0, 0.09, 0.62], 0.018, 12),
  ...[0.4, 0.46, 0.52].map((z) => paint(ACCENT, xf(ring(0.026, 0.006, 0), { r: [90, 0, 0], t: [0, 0.09, z] }))),
  paint(0x4b5563, bar([0, 0.15, 0.0], [0, 0.15, 0.18], 0.018, 10)),
  flat([[-0.08, 0.11], [-0.32, 0.1], [-0.32, -0.02], [-0.22, -0.02], [-0.08, 0.05]], 0.04),
  triggerGuard(0.035, 0.03),
), SCIFI, { hand: 'right', style: 'trigger', second: [0, 0.06, 0.4] });

const wand = () => tag(merge(rod(0.008, -0.07, 0.25, 8, 0, 0, 0.004), paint(DARKWOOD, rod(0.011, -0.08, 0.05, 8))), WOOD, { hand: 'right', style: 'fist' });

// ---------------------------------------------------------------- shields

// Held by the centre grip; the face looks away from the bearer (+Z).
const roundShield = () => tag(merge(
  xf(orient(cylinder(0.3, 0.025, 28, 0, 0, 0)), { r: [90, 0, 0], t: [0, 0, 0.05] }),
  paint(STEEL, xf(ball(0.07, 0, 14, 8), { t: [0, 0, 0.05] })),
  paint(LEATHER, bar([0, -0.06, 0.03], [0, 0.06, 0.03], 0.012, 8)),
), WOOD, { hand: 'left', style: 'fist' });

// ---------------------------------------------------------------- everyday

const mug = () => tag(merge(
  orient(cylinder(0.042, 0.1, 18, 0, -0.05, 0.075)),
  sweep([...Array(9)].map((_, i) => { const a = -Math.PI / 2 + (i / 8) * Math.PI; return V(0, Math.sin(a) * 0.032, 0.036 - Math.cos(a) * 0.03); }),
    circle(0.006, 8), { side: V(1, 0, 0) }),
), 0xe5e7eb, { hand: 'right', style: 'fist' });

const bottle = () => tag(loft([0, 0.12, 0.16, 0.2, 0.235].map((y, i) => {
  const r = [0.035, 0.035, 0.02, 0.012, 0.012][i];
  return circle(r, 16).map(([a, b]) => V(a, y - 0.07, b));
})), 0x4d7c5a, { hand: 'right', style: 'fist' });

const wineGlass = () => tag(merge(
  orient(cylinder(0.032, 0.004, 16, 0, -0.075, 0)), rod(0.004, -0.072, 0.0, 8),
  paint(0x9f1d3a, loft([[0.0, 0.004], [0.02, 0.03], [0.07, 0.04], [0.11, 0.034]].map(([y, r]) => circle(r, 16).map(([a, b]) => V(a, y, b))))),
), 0xdbeafe, { hand: 'right', style: 'pinch' });

// Flat against the palm (thin along the palm normal), screen facing out of a right hand.
const phone = () => tag(merge(cube(0.009, 0.155, 0.075, 0.004, 0.04, 0.0), paint(0x1e293b, cube(0.002, 0.145, 0.068, 0.0095, 0.04, 0))), BLACK, { hand: 'right', style: 'phone' });
const book = () => tag(merge(cube(0.04, 0.24, 0.17, 0, 0.0, 0.07), paint(0xf1ead8, cube(0.034, 0.23, 0.162, 0, 0, 0.072))), 0x8b3a3a, { hand: 'right', style: 'flat' });

const umbrella = () => {
  const canopy = loft([[0.82, 0.02], [0.8, 0.22], [0.7, 0.5], [0.58, 0.62], [0.47, 0.66]].map(([y, r]) =>
    [...Array(8)].map((_, i) => { const a = (i / 8) * Math.PI * 2; return V(Math.cos(a) * r, y, Math.sin(a) * r); })));
  return tag(merge(
    canopy, paint(0x9aa3af, rod(0.008, -0.05, 0.86, 8)),
    sweep([...Array(9)].map((_, i) => { const a = (i / 8) * Math.PI; return V(0, -0.05 - Math.sin(a) * 0.045, 0.045 - Math.cos(a) * 0.045); }), circle(0.011, 8), { side: V(1, 0, 0) }),
  ), 0x1f2937, { hand: 'right', style: 'fist' });
};

const lantern = () => tag(merge(
  cube(0.12, 0.02, 0.12, 0, -0.19, 0), cube(0.12, 0.02, 0.12, 0, -0.04, 0),
  ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => cube(0.01, 0.13, 0.01, x * 0.055, -0.115, z * 0.055)),
  paint(FLAME, orient(cylinder(0.04, 0.12, 12, 0, -0.18, 0))),
  orient(cylinder(0.065, 0.035, 4, 0, -0.03, 0, 0.01)),
  sweep([...Array(9)].map((_, i) => { const a = (i / 8) * Math.PI; return V(0, -0.004 + Math.sin(a) * 0.004, Math.cos(a) * 0.035); }), circle(0.004, 6)),
), GOLD, { hand: 'right', style: 'fist' });
// Hanging things: the handle runs through the fist, the body hangs past the knuckles.
const hanging = (build) => () => { const m = build(); xf(m, { r: [-90, 0, 0] }); return m; };

const microphone = () => tag(merge(rod(0.016, -0.1, 0.07, 12, 0, 0, 0.022), paint(0xb6bec9, ball(0.03, 0.1, 14, 8))), BLACK, { hand: 'right', style: 'fist' });
const torch = () => tag(merge(rod(0.018, -0.2, 0.22, 10, 0, 0, 0.024), paint(FLAME, loft([[0.2, 0.03], [0.26, 0.04], [0.33, 0.025]].map(([y, r]) => circle(r, 10).map(([a, b]) => V(a, y, b))).concat([[V(0, 0.4, 0)]])))), WOOD, { hand: 'right', style: 'fist' });
const briefcase = () => tag(merge(cube(0.1, 0.32, 0.44, 0, -0.2, 0), paint(BRASS, cube(0.104, 0.03, 0.05, 0, -0.06, 0.1), cube(0.104, 0.03, 0.05, 0, -0.06, -0.1)), sweep([...Array(7)].map((_, i) => { const a = (i / 6) * Math.PI; return V(0, -0.03 + Math.sin(a) * 0.03, Math.cos(a) * 0.06); }), rect(0.012, 0.012))), BLACK, { hand: 'right', style: 'fist' });
const cane = () => tag(merge(rod(0.011, -0.85, 0.0, 8), sweep([...Array(9)].map((_, i) => { const a = (i / 8) * Math.PI; return V(0, Math.sin(a) * 0.05, 0.05 - Math.cos(a) * 0.05); }), circle(0.012, 8))), WOOD, { hand: 'right', style: 'fist' });

// Two of a kind: one for each hand.
const pair = (build) => () => {
  const r = build(), l = build();
  l.grip = { ...l.grip, hand: 'left' };
  return [r, l];
};

export const WEAPONS = {
  Blades: {
    Sword: sword, 'Dual swords': pair(sword), 'Jian (straight sword)': jian, Greatsword: greatsword,
    'Dao (saber)': dao, 'Dual dao': pair(dao), Katana: katana, Rapier: rapier,
    Dagger: dagger, 'Dual daggers': pair(dagger),
  },
  'Staves & polearms': {
    'Short staff': shortStaff, Archistaff: archistaff, Spear: spear, Scythe: scythe,
  },
  Axes: { Hatchet: hatchet, 'Short axe': shortAxe, 'Long axe': longAxe, 'Dual hatchets': pair(hatchet) },
  'Bows': {
    Bow: bow, 'Bow + quiver': () => { const b = bow(), q = quiver(); return [b, q]; },
    Quiver: quiver, Arrow: arrow, 'Bow + arrow': () => [bow(), arrow()],
    'Bow (drawn)': drawnBow, 'Bow + arrow (drawn)': () => [drawnBow(), arrow()],
  },
  Firearms: {
    Pistol: pistol, 'Dual pistols': pair(pistol), Magnum: magnum, Revolver: revolver,
    Rifle: rifle, 'Sniper rifle': sniperRifle, Shotgun: shotgun,
  },
  'Sci-fi & fantasy': {
    Blaster: blaster, 'Blaster rifle': blasterRifle, 'Beam saber': beamSaber, 'Dual beam sabers': pair(beamSaber),
    Wand: wand, 'Round shield': roundShield, 'Sword + shield': () => [sword(), roundShield()],
  },
  Handheld: {
    Mug: mug, Bottle: bottle, 'Wine glass': wineGlass, Phone: phone, Book: book, Umbrella: umbrella,
    Lantern: hanging(lantern), Microphone: microphone, Torch: torch, Briefcase: hanging(briefcase), Cane: cane,
  },
};
