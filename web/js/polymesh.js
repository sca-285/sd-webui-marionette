// Minimal polygon mesh (n-gon faces, shared vertices) with the editing
// operations of the Model mode. Faces are counter-clockwise seen from outside.
import * as THREE from 'three';

const ek = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
// Faces may carry a paint colour (face.c, hex): a face array rebuilt from another keeps it.
const keepC = (src, dst) => { if (src.c !== undefined) dst.c = src.c; return dst; };
const copyFace = (f) => keepC(f, f.slice());

export class PolyMesh {
  constructor(v = [], f = []) {
    this.v = v; // THREE.Vector3[]
    this.f = f; // number[][]
  }

  clone() { return new PolyMesh(this.v.map((p) => p.clone()), this.f.map(copyFace)); }

  get painted() { return this.f.some((f) => f.c !== undefined); }

  toJSON() {
    const out = { v: this.v.flatMap((p) => [+p.x.toFixed(5), +p.y.toFixed(5), +p.z.toFixed(5)]), f: this.f.map((f) => f.slice()) };
    if (this.painted) out.fc = this.f.map((f) => (f.c === undefined ? null : f.c));
    return out;
  }

  static fromJSON(j) {
    const v = [];
    for (let i = 0; i < j.v.length; i += 3) v.push(new THREE.Vector3(j.v[i], j.v[i + 1], j.v[i + 2]));
    return new PolyMesh(v, j.f.map((f, i) => { const g = f.slice(); if (j.fc?.[i] != null) g.c = j.fc[i]; return g; }));
  }

  static merge(list) {
    const out = new PolyMesh();
    for (const m of list) {
      const o = out.v.length;
      out.v.push(...m.v.map((p) => p.clone()));
      out.f.push(...m.f.map((f) => keepC(f, f.map((i) => i + o))));
    }
    return out;
  }

  addVert(p) { this.v.push(p.clone()); return this.v.length - 1; }

  // Newell normal; length is twice the face area.
  faceNormalRaw(f) {
    const n = new THREE.Vector3();
    for (let i = 0; i < f.length; i++) {
      const a = this.v[f[i]], b = this.v[f[(i + 1) % f.length]];
      n.x += (a.y - b.y) * (a.z + b.z);
      n.y += (a.z - b.z) * (a.x + b.x);
      n.z += (a.x - b.x) * (a.y + b.y);
    }
    return n;
  }
  faceNormal(f) { return this.faceNormalRaw(f).normalize(); }
  faceCenter(f) { return f.reduce((c, i) => c.add(this.v[i]), new THREE.Vector3()).divideScalar(f.length); }

  edges() {
    const m = new Map();
    this.f.forEach((f, fi) => {
      for (let i = 0; i < f.length; i++) {
        const a = f[i], b = f[(i + 1) % f.length], k = ek(a, b);
        if (!m.has(k)) m.set(k, { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
        m.get(k).faces.push(fi);
      }
    });
    return m;
  }

  bounds(verts) {
    const box = new THREE.Box3();
    for (const i of verts ?? this.v.keys()) box.expandByPoint(this.v[i]);
    return box;
  }

  // Remove consecutive duplicates, degenerate faces and unused vertices.
  compact() {
    this.f = this.f.map((f) => keepC(f, f.filter((v, i) => v !== f[(i + 1) % f.length]))).filter((f) => new Set(f).size >= 3);
    const used = new Map();
    const v = [];
    for (const f of this.f) {
      for (let i = 0; i < f.length; i++) {
        if (!used.has(f[i])) { used.set(f[i], v.length); v.push(this.v[f[i]]); }
        f[i] = used.get(f[i]);
      }
    }
    this.v = v;
    return used;
  }

  // Weld vertices closer than eps. Returns old -> new index map.
  weld(eps = 1e-5) {
    const grid = new Map();
    const remap = new Array(this.v.length);
    const out = [];
    const q = (x) => Math.round(x / eps);
    this.v.forEach((p, i) => {
      const k = q(p.x) + ',' + q(p.y) + ',' + q(p.z);
      if (!grid.has(k)) { grid.set(k, out.length); out.push(p); }
      remap[i] = grid.get(k);
    });
    this.v = out;
    this.f = this.f.map((f) => keepC(f, f.map((i) => remap[i])));
    const used = this.compact();
    return remap.map((i) => used.get(i));
  }

  // Triangles as vertex-index triples, wound like their face; tri.face = source face.
  triangulate() {
    const out = [];
    const t = new THREE.Vector3(), t2 = new THREE.Vector3();
    this.f.forEach((f, fi) => {
      const n = this.faceNormal(f);
      let tris;
      if (f.length === 3) tris = [[0, 1, 2]];
      else if (f.length === 4 && isConvexQuad(this, f, n)) tris = [[0, 1, 2], [0, 2, 3]];
      else {
        const u = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        u.cross(n).normalize();
        const w = n.clone().cross(u);
        tris = THREE.ShapeUtils.triangulateShape(f.map((i) => new THREE.Vector2(this.v[i].dot(u), this.v[i].dot(w))), []);
      }
      for (const k of tris) {
        let [a, b, c] = k.map((j) => f[j]);
        t.subVectors(this.v[b], this.v[a]).cross(t2.subVectors(this.v[c], this.v[a]));
        if (t.dot(n) < 0) [b, c] = [c, b];
        out.push({ face: fi, v: [a, b, c], n });
      }
    });
    return out;
  }

  // Flat-shaded triangle geometry; triFace[t] = source face index.
  // base: colour of unpainted faces when some faces are painted (vertex colours).
  toGeometry(base = 0x9aa5b1) {
    const pos = [], nor = [], col = [], triFace = [];
    const painted = this.painted;
    const c = new THREE.Color(), cache = new Map();
    const rgb = (hex) => { if (!cache.has(hex)) cache.set(hex, c.setHex(hex).toArray()); return cache.get(hex); };
    for (const tri of this.triangulate()) {
      const fc = painted ? rgb(this.f[tri.face].c ?? base) : null;
      for (const i of tri.v) {
        const p = this.v[i];
        pos.push(p.x, p.y, p.z);
        nor.push(tri.n.x, tri.n.y, tri.n.z);
        if (fc) col.push(fc[0], fc[1], fc[2]);
      }
      triFace.push(tri.face);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (painted) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return { geometry: g, triFace };
  }

  // Shared-vertex triangulation, as CSG needs a connected (two-manifold) input.
  toIndexedGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.v.flatMap((q) => [q.x, q.y, q.z]), 3));
    g.setIndex(this.triangulate().flatMap((t) => t.v));
    g.computeVertexNormals();
    return g;
  }

  // Triangle soup (e.g. CSG output) -> welded mesh with coplanar regions merged back into n-gons.
  static fromGeometry(geo) {
    const p = geo.attributes.position;
    const idx = geo.index;
    const v = [], f = [];
    for (let i = 0; i < p.count; i++) v.push(new THREE.Vector3().fromBufferAttribute(p, i));
    const n = idx ? idx.count : p.count;
    for (let i = 0; i < n; i += 3) f.push(idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2]);
    const m = new PolyMesh(v, f);
    m.weld(1e-5);
    m.dissolvePlanar();
    fixTJunctions(m, m.v.keys());
    return m;
  }

  // Merge edge-connected coplanar faces whose union has a single boundary loop.
  dissolvePlanar(angleEps = 1e-3) {
    const normals = this.f.map((f) => this.faceNormal(f));
    const planeD = this.f.map((f, i) => normals[i].dot(this.v[f[0]]));
    const edges = this.edges();
    const seen = new Array(this.f.length).fill(false);
    const out = [];
    for (let s = 0; s < this.f.length; s++) {
      if (seen[s]) continue;
      const group = [s];
      seen[s] = true;
      for (let gi = 0; gi < group.length; gi++) {
        const f = this.f[group[gi]];
        for (let i = 0; i < f.length; i++) {
          const e = edges.get(ek(f[i], f[(i + 1) % f.length]));
          if (e.faces.length !== 2) continue;
          for (const o of e.faces) {
            if (seen[o]) continue;
            if (normals[o].dot(normals[s]) > 1 - angleEps && Math.abs(planeD[o] - planeD[s]) < 1e-4) {
              seen[o] = true;
              group.push(o);
            }
          }
        }
      }
      if (group.length === 1) { out.push(this.f[s]); continue; }
      const directed = new Set();
      for (const g of group) {
        const f = this.f[g];
        for (let i = 0; i < f.length; i++) directed.add(f[i] + '>' + f[(i + 1) % f.length]);
      }
      const next = new Map();
      let multi = false;
      for (const g of group) {
        const f = this.f[g];
        for (let i = 0; i < f.length; i++) {
          const a = f[i], b = f[(i + 1) % f.length];
          if (directed.has(b + '>' + a)) continue;
          if (next.has(a)) multi = true;
          next.set(a, b);
        }
      }
      const start = next.keys().next().value;
      const loop = [start];
      for (let c = next.get(start); c !== start && loop.length <= next.size; c = next.get(c)) loop.push(c);
      if (multi || loop.length !== next.size) out.push(...group.map((g) => this.f[g]));
      else out.push(keepC(this.f[group[0]], dropCollinear(this, loop)));
    }
    this.f = out;
    this.compact();
  }

  // Loose parts (faces connected through shared vertices).
  components() {
    const parent = this.v.map((_, i) => i);
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    for (const f of this.f) for (let i = 1; i < f.length; i++) parent[find(f[i])] = find(f[0]);
    const groups = new Map();
    this.f.forEach((f) => {
      const r = find(f[0]);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r).push(f);
    });
    return [...groups.values()].map((faces) => {
      const p = new PolyMesh(this.v.map((q) => q.clone()), faces.map(copyFace));
      p.compact();
      return p;
    });
  }

  transform(m4, verts) {
    for (const i of verts ?? this.v.keys()) this.v[i].applyMatrix4(m4);
  }
}

function isConvexQuad(m, f, n) {
  const t = new THREE.Vector3(), u = new THREE.Vector3();
  for (let i = 0; i < 4; i++) {
    const a = m.v[f[i]], b = m.v[f[(i + 1) % 4]], c = m.v[f[(i + 2) % 4]];
    if (t.subVectors(b, a).cross(u.subVectors(c, b)).dot(n) <= 0) return false;
  }
  return true;
}

function dropCollinear(m, loop) {
  const t = new THREE.Vector3(), u = new THREE.Vector3();
  const out = loop.filter((v, i) => {
    const a = m.v[loop[(i - 1 + loop.length) % loop.length]], b = m.v[v], c = m.v[loop[(i + 1) % loop.length]];
    return t.subVectors(b, a).cross(u.subVectors(c, b)).lengthSq() > 1e-14;
  });
  return out.length >= 3 ? out : loop;
}

// ------------------------------------------------------------------ selection helpers

export function selectedFaces(m, verts) {
  const out = [];
  m.f.forEach((f, i) => { if (f.every((v) => verts.has(v))) out.push(i); });
  return out;
}
export function selectedEdges(m, verts) {
  return [...m.edges().values()].filter((e) => verts.has(e.a) && verts.has(e.b));
}

// ------------------------------------------------------------------ operations
// Each returns the new vertex selection (Set) where it makes sense.

export function extrudeFaces(m, faces, dist) {
  if (!faces.length) return null;
  const region = new Set(faces);
  const normal = new THREE.Vector3();
  for (const fi of region) normal.add(m.faceNormalRaw(m.f[fi]));
  normal.normalize();
  const directed = new Set();
  for (const fi of region) {
    const f = m.f[fi];
    for (let i = 0; i < f.length; i++) directed.add(f[i] + '>' + f[(i + 1) % f.length]);
  }
  const boundary = [];
  for (const fi of region) {
    const f = m.f[fi];
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      if (!directed.has(b + '>' + a)) boundary.push([a, b]);
    }
  }
  const map = new Map();
  for (const fi of region) for (const v of m.f[fi]) if (!map.has(v)) map.set(v, m.addVert(m.v[v]));
  for (const fi of region) m.f[fi] = keepC(m.f[fi], m.f[fi].map((v) => map.get(v)));
  for (const [a, b] of boundary) m.f.push([a, b, map.get(b), map.get(a)]);
  for (const nv of map.values()) m.v[nv].addScaledVector(normal, dist);
  return new Set(map.values());
}

export function insetFaces(m, faces, dist) {
  const sel = new Set();
  for (const fi of faces) {
    const f = m.f[fi];
    const c = m.faceCenter(f);
    const inner = f.map((v) => {
      const p = m.v[v];
      const toC = c.clone().sub(p);
      const len = toC.length();
      return m.addVert(p.clone().addScaledVector(toC.normalize(), Math.min(dist, len * 0.95)));
    });
    for (let i = 0; i < f.length; i++) {
      const j = (i + 1) % f.length;
      m.f.push(keepC(f, [f[i], f[j], inner[j], inner[i]]));
    }
    m.f[fi] = keepC(f, inner);
    inner.forEach((v) => sel.add(v));
  }
  return sel;
}

// Single-segment bevel (chamfer) of the selected edges.
export function bevelEdges(m, edgeList, d) {
  if (!edgeList.length) return null;
  const oldVertCount = m.v.length;
  const sel = new Set(edgeList.map((e) => ek(e.a, e.b)));
  const isSel = (a, b) => sel.has(ek(a, b));
  const corner = m.f.map((f) => f.map((v, i) => {
    const p = f[(i - 1 + f.length) % f.length], n = f[(i + 1) % f.length];
    const off = new THREE.Vector3();
    const P = m.v[v];
    if (isSel(p, v)) off.add(m.v[n].clone().sub(P).normalize().multiplyScalar(Math.min(d, m.v[n].distanceTo(P) * 0.45)));
    if (isSel(v, n)) off.add(m.v[p].clone().sub(P).normalize().multiplyScalar(Math.min(d, m.v[p].distanceTo(P) * 0.45)));
    return off.lengthSq() > 0 ? m.addVert(P.clone().add(off)) : v;
  }));
  const oldFaces = m.f;
  const pos = (fi, v) => corner[fi][oldFaces[fi].indexOf(v)];
  const newFaces = corner.map((c) => c.slice());
  const edges = new PolyMesh(m.v, oldFaces).edges();
  for (const e of edges.values()) {
    if (!isSel(e.a, e.b) || e.faces.length !== 2) continue;
    let [A, B] = e.faces;
    let a = e.a, b = e.b;
    const fa = oldFaces[A];
    if (fa[(fa.indexOf(a) + 1) % fa.length] !== b) [a, b] = [b, a];
    newFaces.push([pos(A, b), pos(A, a), pos(B, a), pos(B, b)]);
  }
  // Corner polygons: walk the face fan around each touched vertex.
  const touched = new Set(edgeList.flatMap((e) => [e.a, e.b]));
  for (const v of touched) {
    const fan = [];
    oldFaces.forEach((f, fi) => { if (f.includes(v)) fan.push(fi); });
    const prevOf = (fi) => { const f = oldFaces[fi]; return f[(f.indexOf(v) - 1 + f.length) % f.length]; };
    const nextOf = (fi) => { const f = oldFaces[fi]; return f[(f.indexOf(v) + 1) % f.length]; };
    const order = [fan[0]];
    while (order.length < fan.length) {
      const n = nextOf(order[order.length - 1]);
      const g = fan.find((fi) => prevOf(fi) === n && !order.includes(fi));
      if (g === undefined) break;
      order.push(g);
    }
    if (order.length !== fan.length) continue;
    const poly = order.map((fi) => pos(fi, v)).reverse();
    const uniq = poly.filter((x, i) => x !== poly[(i + 1) % poly.length]);
    if (new Set(uniq).size >= 3) newFaces.push(uniq);
  }
  m.f = newFaces;
  const remap = m.weld(1e-6);
  fixTJunctions(m, new Set(remap.slice(oldVertCount)));
  return new Set();
}

// Insert vertices that lie in the middle of a face edge into that face, so
// neighbouring faces share them (keeps the mesh watertight after a bevel).
export function fixTJunctions(m, candidates) {
  const cand = [...candidates].filter((i) => i !== undefined && i < m.v.length);
  if (!cand.length) return;
  const t = new THREE.Vector3(), d = new THREE.Vector3();
  m.f = m.f.map((f) => {
    const g = [];
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      g.push(a);
      const A = m.v[a], B = m.v[b];
      d.subVectors(B, A);
      const L2 = d.lengthSq();
      const on = [];
      for (const c of cand) {
        if (c === a || c === b || f.includes(c)) continue;
        const k = t.subVectors(m.v[c], A).dot(d) / L2;
        if (k <= 1e-6 || k >= 1 - 1e-6) continue;
        if (t.subVectors(m.v[c], A).addScaledVector(d, -k).lengthSq() < 1e-12) on.push([k, c]);
      }
      on.sort((x, y) => x[0] - y[0]).forEach(([, c]) => g.push(c));
    }
    return g;
  });
}

export function subdivideFaces(m, faces) {
  const set = new Set(faces);
  const mids = new Map();
  const mid = (a, b) => {
    const k = ek(a, b);
    if (!mids.has(k)) mids.set(k, m.addVert(m.v[a].clone().add(m.v[b]).multiplyScalar(0.5)));
    return mids.get(k);
  };
  for (const fi of set) { const f = m.f[fi]; for (let i = 0; i < f.length; i++) mid(f[i], f[(i + 1) % f.length]); }
  const out = [];
  const sel = new Set();
  m.f.forEach((f, fi) => {
    if (set.has(fi)) {
      const c = m.addVert(m.faceCenter(f));
      sel.add(c);
      for (let i = 0; i < f.length; i++) {
        const q = [f[i], mids.get(ek(f[i], f[(i + 1) % f.length])), c, mids.get(ek(f[(i - 1 + f.length) % f.length], f[i]))];
        q.forEach((v) => sel.add(v));
        out.push(q);
      }
    } else {
      // Keep neighbours watertight: insert split points into their edges.
      const g = [];
      for (let i = 0; i < f.length; i++) {
        g.push(f[i]);
        const k = ek(f[i], f[(i + 1) % f.length]);
        if (mids.has(k)) g.push(mids.get(k));
      }
      out.push(g);
    }
  });
  m.f = out;
  return sel;
}

// Split every face crossing the plane. Returns the new on-plane vertices.
export function bisect(m, plane, faceFilter) {
  const dist = m.v.map((p) => plane.distanceToPoint(p));
  const eps = 1e-7;
  const cut = new Map();
  const onPlane = new Set();
  const cutVert = (a, b) => {
    const k = ek(a, b);
    if (!cut.has(k)) {
      const t = dist[a] / (dist[a] - dist[b]);
      const i = m.addVert(m.v[a].clone().lerp(m.v[b], t));
      cut.set(k, i);
      dist[i] = 0;
    }
    onPlane.add(cut.get(k));
    return cut.get(k);
  };
  const out = [];
  m.f.forEach((f, fi) => {
    if (faceFilter && !faceFilter.has(fi)) { out.push(f); return; }
    const ring = [];
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      ring.push(a);
      if ((dist[a] > eps && dist[b] < -eps) || (dist[a] < -eps && dist[b] > eps)) ring.push(cutVert(a, b));
    }
    const pos = ring.filter((v) => dist[v] >= -eps), neg = ring.filter((v) => dist[v] <= eps);
    const hasPos = ring.some((v) => dist[v] > eps), hasNeg = ring.some((v) => dist[v] < -eps);
    if (hasPos && hasNeg && pos.length >= 3 && neg.length >= 3) {
      out.push(pos, neg);
      ring.forEach((v) => { if (Math.abs(dist[v]) <= eps) onPlane.add(v); });
    } else {
      out.push(ring);
    }
  });
  // Faces that were not split still need the new points on shared edges.
  m.f = out.map((f) => {
    const g = [];
    for (let i = 0; i < f.length; i++) {
      g.push(f[i]);
      const k = ek(f[i], f[(i + 1) % f.length]);
      if (cut.has(k) && !f.includes(cut.get(k))) g.push(cut.get(k));
    }
    return g;
  });
  return onPlane;
}

// Evenly spaced cuts across the bounding box: a loop-cut for box-like shapes.
export function sliceAlong(m, axis, count, verts) {
  const box = m.bounds(verts && verts.size ? verts : undefined);
  const lo = box.min.getComponent(axis), hi = box.max.getComponent(axis);
  const n = new THREE.Vector3().setComponent(axis, 1);
  const sel = new Set();
  for (let i = 1; i <= count; i++) {
    const c = lo + ((hi - lo) * i) / (count + 1);
    for (const v of bisect(m, new THREE.Plane(n, -c))) sel.add(v);
  }
  return sel;
}

export function connectVerts(m, a, b) {
  const fi = m.f.findIndex((f) => f.includes(a) && f.includes(b));
  if (fi < 0) return false;
  const f = m.f[fi];
  const i = f.indexOf(a), j = f.indexOf(b);
  if (Math.abs(i - j) === 1 || Math.abs(i - j) === f.length - 1) return false;
  const [s, e] = i < j ? [i, j] : [j, i];
  m.f[fi] = keepC(f, f.slice(s, e + 1));
  m.f.push(keepC(f, [...f.slice(e), ...f.slice(0, s + 1)]));
  return true;
}

export function mergeVerts(m, verts) {
  if (verts.size < 2) return verts;
  const c = [...verts].reduce((s, i) => s.add(m.v[i]), new THREE.Vector3()).divideScalar(verts.size);
  const t = m.addVert(c);
  m.f = m.f.map((f) => f.map((v) => (verts.has(v) ? t : v)));
  const remap = m.compact();
  return new Set([remap.get(t)].filter((x) => x !== undefined));
}

export function fillVerts(m, verts) {
  const ids = [...verts];
  if (ids.length < 3) return false;
  if (m.f.some((f) => f.length === ids.length && f.every((v) => verts.has(v)))) return false;
  const c = ids.reduce((s, i) => s.add(m.v[i]), new THREE.Vector3()).divideScalar(ids.length);
  let n = new THREE.Vector3();
  for (let i = 0; i < ids.length; i++) {
    const a = m.v[ids[i]].clone().sub(c), b = m.v[ids[(i + 1) % ids.length]].clone().sub(c);
    const x = a.cross(b);
    n.add(x.dot(n) < 0 ? x.negate() : x);
  }
  if (n.lengthSq() < 1e-12) return false;
  n.normalize();
  const u = m.v[ids[0]].clone().sub(c).projectOnPlane(n).normalize();
  const w = n.clone().cross(u);
  ids.sort((a, b) => {
    const pa = m.v[a].clone().sub(c), pb = m.v[b].clone().sub(c);
    return Math.atan2(pa.dot(w), pa.dot(u)) - Math.atan2(pb.dot(w), pb.dot(u));
  });
  const center = m.bounds().getCenter(new THREE.Vector3());
  if (n.dot(c.clone().sub(center)) < 0) ids.reverse();
  m.f.push(ids);
  return true;
}

export function deleteSelection(m, mode, verts) {
  if (mode === 'vert') m.f = m.f.filter((f) => !f.some((v) => verts.has(v)));
  else if (mode === 'edge') {
    const sel = new Set(selectedEdges(m, verts).map((e) => ek(e.a, e.b)));
    m.f = m.f.filter((f) => !f.some((v, i) => sel.has(ek(v, f[(i + 1) % f.length]))));
  } else {
    const faces = new Set(selectedFaces(m, verts));
    m.f = m.f.filter((_, i) => !faces.has(i));
  }
  m.compact();
}

export function duplicateFaces(m, faces) {
  const map = new Map();
  const sel = new Set();
  for (const fi of faces) {
    m.f.push(keepC(m.f[fi], m.f[fi].map((v) => {
      if (!map.has(v)) { map.set(v, m.addVert(m.v[v])); sel.add(map.get(v)); }
      return map.get(v);
    })));
  }
  return sel;
}

export function separateFaces(m, faces) {
  const set = new Set(faces);
  const part = new PolyMesh(m.v.map((p) => p.clone()), m.f.filter((_, i) => set.has(i)).map(copyFace));
  part.compact();
  m.f = m.f.filter((_, i) => !set.has(i));
  m.compact();
  return part;
}

export function flipFaces(m, faces) {
  for (const fi of faces ?? m.f.keys()) m.f[fi].reverse();
}

export function mirror(m, axis) {
  for (const p of m.v) p.setComponent(axis, -p.getComponent(axis));
  flipFaces(m);
}

// Deformers. axis = bend/twist axis (0 x, 1 y, 2 z); dirAxis = bend direction.
export function bend(m, verts, axis, dirAxis, angleDeg) {
  const ids = [...(verts ?? m.v.keys())];
  const box = m.bounds(ids);
  const lo = box.min.getComponent(axis), L = box.max.getComponent(axis) - lo;
  const cB = (box.min.getComponent(dirAxis) + box.max.getComponent(dirAxis)) / 2;
  const th = THREE.MathUtils.degToRad(angleDeg);
  if (Math.abs(th) < 1e-5 || L < 1e-6) return;
  const R = L / th;
  for (const i of ids) {
    const p = m.v[i];
    const s = p.getComponent(axis) - lo, h = p.getComponent(dirAxis) - cB;
    const a = s / R;
    p.setComponent(axis, lo + (R - h) * Math.sin(a));
    p.setComponent(dirAxis, cB + R - (R - h) * Math.cos(a));
  }
}

export function twist(m, verts, axis, angleDeg) {
  const ids = [...(verts ?? m.v.keys())];
  const box = m.bounds(ids);
  const c = box.getCenter(new THREE.Vector3());
  const lo = box.min.getComponent(axis), L = Math.max(1e-6, box.max.getComponent(axis) - lo);
  const [u, w] = [0, 1, 2].filter((k) => k !== axis);
  for (const i of ids) {
    const p = m.v[i];
    const a = THREE.MathUtils.degToRad(angleDeg) * ((p.getComponent(axis) - lo) / L);
    const x = p.getComponent(u) - c.getComponent(u), y = p.getComponent(w) - c.getComponent(w);
    p.setComponent(u, c.getComponent(u) + x * Math.cos(a) - y * Math.sin(a));
    p.setComponent(w, c.getComponent(w) + x * Math.sin(a) + y * Math.cos(a));
  }
}

export function taper(m, verts, axis, factor) {
  const ids = [...(verts ?? m.v.keys())];
  const box = m.bounds(ids);
  const c = box.getCenter(new THREE.Vector3());
  const lo = box.min.getComponent(axis), L = Math.max(1e-6, box.max.getComponent(axis) - lo);
  for (const i of ids) {
    const p = m.v[i];
    const k = THREE.MathUtils.lerp(1, factor, (p.getComponent(axis) - lo) / L);
    for (const o of [0, 1, 2]) if (o !== axis) p.setComponent(o, c.getComponent(o) + (p.getComponent(o) - c.getComponent(o)) * k);
  }
}
