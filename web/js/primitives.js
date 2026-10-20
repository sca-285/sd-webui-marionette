// Primitive and prop builders. Units are metres (the character is ~1.72 tall);
// every prop sits on y = 0 so it lands on the floor.
import * as THREE from 'three';
import { PolyMesh } from './polymesh.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function box(w, h, d, cx = 0, cy = h / 2, cz = 0) {
  const x = w / 2, y = h / 2, z = d / 2;
  const v = [
    V(-x, -y, -z), V(x, -y, -z), V(x, y, -z), V(-x, y, -z),
    V(-x, -y, z), V(x, -y, z), V(x, y, z), V(-x, y, z),
  ].map((p) => p.add(V(cx, cy, cz)));
  return new PolyMesh(v, [[4, 5, 6, 7], [1, 0, 3, 2], [0, 4, 7, 3], [5, 1, 2, 6], [7, 6, 2, 3], [0, 1, 5, 4]]);
}

export function plane(w, d) {
  return new PolyMesh([V(-w / 2, 0, d / 2), V(w / 2, 0, d / 2), V(w / 2, 0, -d / 2), V(-w / 2, 0, -d / 2)], [[0, 1, 2, 3]]);
}

export function cylinder(r, h, n = 24, cx = 0, cy = 0, cz = 0, r2 = r) {
  const v = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    v.push(V(cx + Math.cos(a) * r, cy, cz - Math.sin(a) * r));
  }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    v.push(V(cx + Math.cos(a) * r2, cy + h, cz - Math.sin(a) * r2));
  }
  const f = [[...Array(n).keys()].reverse(), [...Array(n).keys()].map((i) => i + n)];
  for (let i = 0; i < n; i++) f.push([i, (i + 1) % n, ((i + 1) % n) + n, i + n]);
  return new PolyMesh(v, f);
}

export function cone(r, h, n = 24) {
  const v = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    v.push(V(Math.cos(a) * r, 0, -Math.sin(a) * r));
  }
  v.push(V(0, h, 0));
  const f = [[...Array(n).keys()].reverse()];
  for (let i = 0; i < n; i++) f.push([i, (i + 1) % n, n]);
  return new PolyMesh(v, f);
}

export function sphere(r, seg = 24, rings = 14, cy = r) {
  const v = [V(0, cy + r, 0)];
  for (let j = 1; j < rings; j++) {
    const phi = (j / rings) * Math.PI;
    for (let i = 0; i < seg; i++) {
      const th = (i / seg) * Math.PI * 2;
      v.push(V(Math.sin(phi) * Math.cos(th) * r, cy + Math.cos(phi) * r, -Math.sin(phi) * Math.sin(th) * r));
    }
  }
  v.push(V(0, cy - r, 0));
  const S = v.length - 1;
  const at = (j, i) => 1 + (j - 1) * seg + (i % seg);
  const f = [];
  for (let i = 0; i < seg; i++) f.push([0, at(1, i), at(1, i + 1)]);
  for (let j = 1; j < rings - 1; j++) for (let i = 0; i < seg; i++) f.push([at(j, i), at(j + 1, i), at(j + 1, i + 1), at(j, i + 1)]);
  for (let i = 0; i < seg; i++) f.push([at(rings - 1, i), S, at(rings - 1, i + 1)]);
  return new PolyMesh(v, f);
}

export function torus(R, r, n = 32, m = 12) {
  const v = [], f = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    for (let j = 0; j < m; j++) {
      const b = (j / m) * Math.PI * 2;
      v.push(V((R + r * Math.cos(b)) * Math.cos(a), r + r * Math.sin(b), -(R + r * Math.cos(b)) * Math.sin(a)));
    }
  }
  const at = (i, j) => (i % n) * m + (j % m);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) f.push([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
  return new PolyMesh(v, f);
}

// 2D profile in the (z, y) plane extruded along x. Profile is counter-clockwise
// when seen from +x.
export function prism(profile, width) {
  // Orient the profile so the +x cap faces +x (Newell normal of the (z, y) loop).
  let nx = 0;
  for (let i = 0; i < profile.length; i++) {
    const [z0, y0] = profile[i], [z1, y1] = profile[(i + 1) % profile.length];
    nx += (y0 - y1) * (z0 + z1);
  }
  if (nx < 0) profile = profile.slice().reverse();
  const n = profile.length, x = width / 2;
  const v = [...profile.map(([z, y]) => V(x, y, z)), ...profile.map(([z, y]) => V(-x, y, z))];
  const f = [[...Array(n).keys()], [...Array(n).keys()].map((i) => i + n).reverse()];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    f.push([j, i, i + n, j + n]);
  }
  return new PolyMesh(v, f);
}

export function wedge(w, h, d) {
  return prism([[d / 2, 0], [-d / 2, h], [-d / 2, 0]].reverse(), w);
}

export function stairs(steps = 5, w = 1, rise = 0.17, run = 0.28) {
  const p = [[0, 0]];
  for (let i = 0; i < steps; i++) {
    p.push([-i * run, (i + 1) * rise]);
    p.push([-(i + 1) * run, (i + 1) * rise]);
  }
  p.push([-steps * run, 0]);
  const m = prism(p.reverse(), w);
  m.v.forEach((q) => { q.z += (steps * run) / 2; });
  return m;
}

const merge = (...parts) => PolyMesh.merge(parts);
// Legs reach 1 cm into the part above, so pieces overlap instead of touching
// face-to-face, which keeps booleans on assembled props well defined.
const legs = (w, d, h, t, inset = 0.03) => {
  const out = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(box(t, h + 0.01, t, sx * (w / 2 - inset - t / 2), (h + 0.01) / 2, sz * (d / 2 - inset - t / 2)));
  return out;
};

export const LIBRARY = {
  Shapes: {
    Cube: () => box(0.5, 0.5, 0.5),
    Plane: () => plane(1, 1),
    Cylinder: () => cylinder(0.25, 0.5),
    Sphere: () => sphere(0.25),
    Cone: () => cone(0.25, 0.5),
    Torus: () => torus(0.3, 0.08),
    Wedge: () => wedge(0.6, 0.4, 0.8),
  },
  Room: {
    Floor: () => box(6, 0.02, 6, 0, -0.01, 0),
    Wall: () => box(4, 2.6, 0.12),
    Doorway: () => merge(box(1.55, 2.6, 0.12, -1.225), box(1.55, 2.6, 0.12, 1.225), box(0.9, 0.5, 0.12, 0, 2.35)),
    Window: () => merge(box(1.4, 2.6, 0.12, -1.3), box(1.4, 2.6, 0.12, 1.3), box(1.2, 0.9, 0.12, 0, 0.45), box(1.2, 0.6, 0.12, 0, 2.3)),
    Stairs: () => stairs(),
    Platform: () => box(1.5, 0.3, 1.5),
    Pillar: () => merge(box(0.45, 0.12, 0.45), cylinder(0.16, 2.36, 24, 0, 0.12), box(0.45, 0.12, 0.45, 0, 2.54)),
    Ramp: () => wedge(1, 0.5, 1.5),
  },
  Furniture: {
    Chair: () => merge(box(0.46, 0.05, 0.46, 0, 0.45), ...legs(0.46, 0.46, 0.425, 0.04, 0.01),
      box(0.04, 0.5, 0.04, -0.2, 0.72, -0.21), box(0.04, 0.5, 0.04, 0.2, 0.72, -0.21), box(0.44, 0.22, 0.03, 0, 0.82, -0.21)),
    Stool: () => merge(cylinder(0.18, 0.05, 24, 0, 0.6), ...legs(0.3, 0.3, 0.6, 0.035, 0.0)),
    Table: () => merge(box(1.2, 0.04, 0.75, 0, 0.74), ...legs(1.2, 0.75, 0.72, 0.06)),
    Bed: () => merge(box(1.4, 0.3, 2.0, 0, 0.15), box(1.36, 0.2, 1.96, 0, 0.4), box(1.4, 0.6, 0.06, 0, 0.6, -1.0),
      box(0.55, 0.1, 0.35, -0.33, 0.55, -0.75), box(0.55, 0.1, 0.35, 0.33, 0.55, -0.75)),
    Bench: () => merge(box(1.5, 0.05, 0.4, 0, 0.45), box(0.06, 0.425, 0.36, -0.65, 0.2125), box(0.06, 0.425, 0.36, 0.65, 0.2125)),
    Sofa: () => merge(box(1.9, 0.3, 0.85, 0, 0.15), box(1.6, 0.16, 0.68, 0, 0.37, 0.06), box(1.9, 0.45, 0.2, 0, 0.52, -0.32),
      box(0.15, 0.32, 0.85, -0.875, 0.45), box(0.15, 0.32, 0.85, 0.875, 0.45)),
    Crate: () => box(0.6, 0.6, 0.6),
    Desk: () => merge(box(1.4, 0.04, 0.7, 0, 0.74), box(0.04, 0.72, 0.66, -0.68, 0.36), box(0.04, 0.72, 0.66, 0.68, 0.36), box(1.32, 0.4, 0.02, 0, 0.5, -0.33)),
  },
};
