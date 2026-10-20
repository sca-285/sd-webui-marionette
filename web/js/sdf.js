// Signed distance primitives, field sampling and Surface Nets meshing.
import * as THREE from 'three';

export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export function sdEllipsoid(x, y, z, c, r) {
  const px = x - c[0], py = y - c[1], pz = z - c[2];
  const k0 = Math.sqrt((px / r[0]) ** 2 + (py / r[1]) ** 2 + (pz / r[2]) ** 2);
  const k1 = Math.sqrt((px / (r[0] * r[0])) ** 2 + (py / (r[1] * r[1])) ** 2 + (pz / (r[2] * r[2])) ** 2);
  return k1 === 0 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
}

// Inigo Quilez's exact round cone.
export function sdRoundCone(x, y, z, p) {
  const pax = x - p.a[0], pay = y - p.a[1], paz = z - p.a[2];
  const { bax, bay, baz, l2, rr, a2, il2 } = p;
  const yy = pax * bax + pay * bay + paz * baz;
  const zz = yy - l2;
  const xvx = pax * l2 - bax * yy, xvy = pay * l2 - bay * yy, xvz = paz * l2 - baz * yy;
  const x2 = xvx * xvx + xvy * xvy + xvz * xvz;
  const y2 = yy * yy * l2, z2 = zz * zz * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - p.rb;
  if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - p.ra;
  return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - p.ra;
}

export function sdBox(x, y, z, c, h) {
  const qx = Math.abs(x - c[0]) - h[0], qy = Math.abs(y - c[1]) - h[1], qz = Math.abs(z - c[2]) - h[2];
  const o = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
  return o + Math.min(Math.max(qx, qy, qz), 0);
}

export const ell = (bone, c, r, k = 0.04) => ({ t: 'ell', bone, c, r, k });
// A primitive with sub: true carves (smooth subtraction) instead of adding, at
// its place in the list, so later primitives can be added back on top.
export const carve = (p) => ({ ...p, sub: true });
const combine = (d, p, dist) => (p.sub ? -smin(-d, dist, p.k) : smin(d, dist, p.k));
export function cone(bone, a, b, ra, rb, k = 0.03) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = ra - rb;
  return { t: 'cone', bone, a, b, ra, rb, k, bax, bay, baz, l2, rr, a2: l2 - rr * rr, il2: 1 / l2 };
}

export function primDist(p, x, y, z) {
  return p.t === 'ell' ? sdEllipsoid(x, y, z, p.c, p.r) : sdRoundCone(x, y, z, p);
}

function primBox(p) {
  const m = p.k + 0.002;
  if (p.t === 'ell') return [p.c.map((v, i) => v - p.r[i] - m), p.c.map((v, i) => v + p.r[i] + m)];
  const r = Math.max(p.ra, p.rb) + m;
  return [p.a.map((v, i) => Math.min(v, p.b[i]) - r), p.a.map((v, i) => Math.max(v, p.b[i]) + r)];
}

// Evaluate a smooth union of primitives (minus subtracted spheres) at one point.
export function evalPrims(prims, subs, x, y, z) {
  let d = 1;
  for (const p of prims) d = combine(d, p, primDist(p, x, y, z));
  for (const s of subs) d = -smin(-d, Math.hypot(x - s.c[0], y - s.c[1], z - s.c[2]) - s.r, 0.006);
  return d;
}

// Grid over [min,max] with spacing h, filled primitive by primitive (fast).
export function fieldFromPrims(prims, subs, h, pad = 0.03) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const boxes = prims.map(primBox);
  for (const [a, b] of boxes) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], a[i]); hi[i] = Math.max(hi[i], b[i]); }
  const o = lo.map((v) => v - pad);
  const n = hi.map((v, i) => Math.ceil((v + pad - o[i]) / h) + 1);
  const [nx, ny, nz] = n;
  const f = new Float32Array(nx * ny * nz).fill(1);
  prims.forEach((p, pi) => {
    const [a, b] = boxes[pi];
    const i0 = Math.max(0, Math.floor((a[0] - o[0]) / h)), i1 = Math.min(nx - 1, Math.ceil((b[0] - o[0]) / h));
    const j0 = Math.max(0, Math.floor((a[1] - o[1]) / h)), j1 = Math.min(ny - 1, Math.ceil((b[1] - o[1]) / h));
    const k0 = Math.max(0, Math.floor((a[2] - o[2]) / h)), k1 = Math.min(nz - 1, Math.ceil((b[2] - o[2]) / h));
    for (let k = k0; k <= k1; k++) {
      const z = o[2] + k * h;
      for (let j = j0; j <= j1; j++) {
        const y = o[1] + j * h;
        let idx = i0 + nx * (j + ny * k);
        for (let i = i0; i <= i1; i++, idx++) f[idx] = combine(f[idx], p, primDist(p, o[0] + i * h, y, z));
      }
    }
  });
  for (const s of subs) {
    const r = s.r + 0.01;
    for (let k = Math.max(0, Math.floor((s.c[2] - r - o[2]) / h)); k <= Math.min(nz - 1, Math.ceil((s.c[2] + r - o[2]) / h)); k++) {
      for (let j = Math.max(0, Math.floor((s.c[1] - r - o[1]) / h)); j <= Math.min(ny - 1, Math.ceil((s.c[1] + r - o[1]) / h)); j++) {
        for (let i = Math.max(0, Math.floor((s.c[0] - r - o[0]) / h)); i <= Math.min(nx - 1, Math.ceil((s.c[0] + r - o[0]) / h)); i++) {
          const idx = i + nx * (j + ny * k);
          const d = Math.hypot(o[0] + i * h - s.c[0], o[1] + j * h - s.c[1], o[2] + k * h - s.c[2]) - s.r;
          f[idx] = -smin(-f[idx], d, 0.006);
        }
      }
    }
  }
  return { f, n, o, h };
}

// Grid sampled from an arbitrary distance function.
export function fieldFromFn(fn, lo, hi, h) {
  const n = hi.map((v, i) => Math.ceil((v - lo[i]) / h) + 1);
  const [nx, ny, nz] = n;
  const f = new Float32Array(nx * ny * nz);
  let idx = 0;
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) f[idx++] = fn(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
    }
  }
  return { f, n, o: lo, h };
}

const CORNERS = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

// Naive Surface Nets: one vertex per surface cell, one quad per crossing edge.
export function meshField({ f, n, o, h }) {
  const [nx, ny, nz] = n;
  const id = (i, j, k) => i + nx * (j + ny * k);
  const cell = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const cc = CORNERS[c];
          v[c] = f[id(i + cc[0], j + cc[1], k + cc[2])];
          if (v[c] < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, cnt = 0;
        for (const [a, b] of EDGES) {
          if (((mask >> a) & 1) === ((mask >> b) & 1)) continue;
          const t = v[a] / (v[a] - v[b]);
          const A = CORNERS[a], B = CORNERS[b];
          sx += A[0] + t * (B[0] - A[0]);
          sy += A[1] + t * (B[1] - A[1]);
          sz += A[2] + t * (B[2] - A[2]);
          cnt++;
        }
        cell[id(i, j, k)] = pos.length / 3;
        pos.push(o[0] + (i + sx / cnt) * h, o[1] + (j + sy / cnt) * h, o[2] + (k + sz / cnt) * h);
      }
    }
  }
  const tri = [];
  const quad = (a, b, c, d, inside) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (inside) tri.push(a, b, c, a, c, d);
    else tri.push(a, c, b, a, d, c);
  };
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const ins = f[id(i, j, k)] < 0;
        if (i < nx - 1 && j > 0 && k > 0 && ins !== (f[id(i + 1, j, k)] < 0)) {
          quad(cell[id(i, j - 1, k - 1)], cell[id(i, j, k - 1)], cell[id(i, j, k)], cell[id(i, j - 1, k)], ins);
        }
        if (j < ny - 1 && i > 0 && k > 0 && ins !== (f[id(i, j + 1, k)] < 0)) {
          quad(cell[id(i - 1, j, k - 1)], cell[id(i - 1, j, k)], cell[id(i, j, k)], cell[id(i, j, k - 1)], ins);
        }
        if (k < nz - 1 && i > 0 && j > 0 && ins !== (f[id(i, j, k + 1)] < 0)) {
          quad(cell[id(i - 1, j - 1, k)], cell[id(i, j - 1, k)], cell[id(i, j, k)], cell[id(i - 1, j, k)], ins);
        }
      }
    }
  }
  // Guarantee outward winding regardless of axis conventions.
  let vol = 0;
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
    vol += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
      - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
      + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
  }
  if (vol < 0) for (let t = 0; t < tri.length; t += 3) [tri[t + 1], tri[t + 2]] = [tri[t + 2], tri[t + 1]];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(tri, 1) : new THREE.Uint16BufferAttribute(tri, 1));
  g.computeVertexNormals();
  return g;
}

// Walk from an interior point along dir until leaving the surface.
export function surfacePoint(sdf, start, dir, step = 0.0015, max = 0.4) {
  const p = new THREE.Vector3(...start);
  const d = new THREE.Vector3(...dir).normalize();
  for (let t = 0; t < max; t += step) {
    if (sdf(p.x, p.y, p.z) > 0) return p;
    p.addScaledVector(d, step);
  }
  return p;
}

// Distance function that only evaluates primitives whose (blend-expanded)
// bounds contain the point. Primitives further away cannot change a smooth
// union near the surface, so this matches evalPrims there and is much faster.
export function fastSDF(prims, subs) {
  const boxes = prims.map((p) => {
    const [a, b] = primBox(p);
    const m = p.k + 0.01;
    return [a.map((v) => v - m), b.map((v) => v + m)];
  });
  return (x, y, z) => {
    let d = 1;
    for (let i = 0; i < prims.length; i++) {
      const [a, b] = boxes[i];
      if (x < a[0] || y < a[1] || z < a[2] || x > b[0] || y > b[1] || z > b[2]) continue;
      d = combine(d, prims[i], primDist(prims[i], x, y, z));
    }
    for (const s of subs) {
      const r = Math.hypot(x - s.c[0], y - s.c[1], z - s.c[2]) - s.r;
      if (r < 0.02) d = -smin(-d, r, 0.006);
    }
    return d;
  };
}

// Pull every vertex onto the exact zero level set (Newton steps along the
// gradient) and use the gradient as the normal: removes the voxel stair-steps
// and gives smooth, accurate normals for the depth / normal passes.
export function refineToSurface(geo, sdf, iterations = 3, eps = 0.0004) {
  const pos = geo.attributes.position;
  const nor = new Float32Array(pos.count * 3);
  const g = [0, 0, 0];
  const grad = (x, y, z) => {
    g[0] = sdf(x + eps, y, z) - sdf(x - eps, y, z);
    g[1] = sdf(x, y + eps, z) - sdf(x, y - eps, z);
    g[2] = sdf(x, y, z + eps) - sdf(x, y, z - eps);
    const l = Math.hypot(g[0], g[1], g[2]) || 1;
    g[0] /= l; g[1] /= l; g[2] /= l;
    return l / (2 * eps);
  };
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    for (let it = 0; it < iterations; it++) {
      const d = sdf(x, y, z);
      if (Math.abs(d) < 1e-6) break;
      const len = grad(x, y, z);
      const step = Math.max(-0.006, Math.min(0.006, d / Math.max(len, 0.3)));
      x -= g[0] * step; y -= g[1] * step; z -= g[2] * step;
    }
    grad(x, y, z);
    pos.setXYZ(i, x, y, z);
    nor[i * 3] = g[0]; nor[i * 3 + 1] = g[1]; nor[i * 3 + 2] = g[2];
  }
  pos.needsUpdate = true;
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.computeBoundingSphere();
  return geo;
}
