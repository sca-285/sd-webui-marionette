// Props: scene objects built from PolyMesh, with Blender-like Object and Edit modes.
import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import * as P from './polymesh.js';
import { PolyMesh } from './polymesh.js';
import { LIBRARY } from './library.js';
import { theme } from './theme.js';

// Selection colour follows the WebUI accent.
const ORANGE = theme.accent;
const EDGE = new THREE.Color(0x111827);
const VERT = new THREE.Color(0x111827);
const CLIP_KEY = 'riggedPose.propClipboard.v1';

export class PropManager {
  constructor({ scene, canvas, getCamera, onChange, requestRender, toast, onRefresh }) {
    this.onRefresh = onRefresh;
    this.scene = scene;
    this.canvas = canvas;
    this.getCamera = getCamera;
    this.onChange = onChange;
    this.requestRender = requestRender;
    this.toast = toast;
    this.group = new THREE.Group();
    this.group.name = 'props';
    scene.add(this.group);
    this.gizmo = new TransformControls(getCamera(), canvas);
    this.gizmo.setSize(0.8);
    scene.add(this.gizmo);
    this.pivot = new THREE.Object3D();
    scene.add(this.pivot);
    this.mode = 'object'; // 'object' | 'edit'
    this.enabled = false; // false while the app is in Pose mode
    this.selected = new Set();
    this.active = null;
    this.sel = new Set(); // edit-mode vertex selection (indices)
    this.selMode = 'vert';
    this.tool = 'translate';
    this.pivotMode = 'median'; // 'median' | 'active' | 'individual' | 'world'
    this.pivotEdit = false; // Maya D / Insert: move the object's own pivot
    this.pivotSnap = 'off'; // 'off' | 'vertex' | 'edge' | 'face' | 'grid' | 'origin'
    this.undoStack = [];
    this.redoStack = [];
    this.counter = 0;
    this.overlay = null;

    this.gizmo.addEventListener('dragging-changed', (e) => {
      this.dragging = e.value;
      if (e.value) {
        this.pushUndo();
        if (this.pivotEdit) { this._snapTargets = this._snapCandidates(); return; }
        if (this.mode === 'edit') this._beginEditDrag(); else this._beginObjectDrag();
      } else {
        if (this.pivotEdit) this.setOrigin('pivot');
        this.drag = null;
        this._changed();
        this._refresh();
      }
    });
    this.gizmo.addEventListener('objectChange', () => {
      if (this.pivotEdit) { this._snapPivot(); this.requestRender(); return; }
      if (this.mode === 'edit') this._applyEditDrag(); else this._applyObjectDrag();
      this.requestRender();
    });
    this.gizmo.addEventListener('change', () => this.requestRender());
  }

  // ------------------------------------------------------------ objects

  get meshes() { return this.group.children.filter((o) => o.userData.poly); }

  _material(color) {
    return new THREE.MeshStandardMaterial({
      color, roughness: 0.8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });
  }

  _makeMesh(poly, name, color = 0x9aa5b1) {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), this._material(color));
    mesh.userData.poly = poly;
    mesh.userData.color = color;
    mesh.name = name;
    this.group.add(mesh);
    this.rebuild(mesh);
    return mesh;
  }

  rebuild(mesh) {
    const { geometry, triFace } = mesh.userData.poly.toGeometry(mesh.userData.color);
    mesh.geometry.dispose();
    mesh.geometry = geometry;
    mesh.userData.triFace = triFace;
    this._applyColor(mesh);
    if (mesh === this.active && this.mode === 'edit') this._buildOverlay();
  }

  add(category, name, at) {
    const build = LIBRARY[category]?.[name];
    if (!build) return null;
    this.pushUndo();
    this.mode = 'object';
    // A builder gives one mesh, or several for sets (dual blades, bow + quiver).
    const parts = [build()].flat();
    const made = parts.map((poly, i) => {
      const label = parts.length > 1 ? `${name} ${{ left: 'L', right: 'R', back: 'back' }[poly.grip?.hand] || i + 1}` : name;
      const mesh = this._makeMesh(poly, `${label}.${String(++this.counter).padStart(3, '0')}`, poly.color);
      mesh.userData.env = category === 'Room';
      mesh.userData.kind = name;
      mesh.userData.lib = [category, name, i];
      if (at) mesh.position.copy(at);
      if (poly.grip) {
        // Hand-held props are built around their grip: stand them on the floor, side by side.
        mesh.userData.grip = poly.grip;
        mesh.position.y = (at?.y || 0) - Math.min(...poly.v.map((q) => q.y));
        mesh.position.x += (i - (parts.length - 1) / 2) * 0.3;
      }
      return mesh;
    });
    this.selectObjects(made);
    this._changed();
    return made[0];
  }

  selectObjects(list, additive = false) {
    const prevActive = this.active;
    if (!additive) this.selected.clear();
    for (const m of list) {
      if (additive && this.selected.has(m) && m === this.active) this.selected.delete(m);
      else this.selected.add(m);
    }
    this.active = list.length ? list[list.length - 1] : additive ? this.active : null;
    if (this.active && !this.selected.has(this.active)) this.active = [...this.selected].pop() || null;
    if (this.active !== prevActive) {
      this.sel.clear();
      if (!this.active && this.mode === 'edit') this.mode = 'object';
    }
    this._refresh();
  }

  _highlight() {
    for (const m of this.meshes) {
      const on = this.enabled && this.selected.has(m);
      if (on) m.material.emissive.copy(theme.accent).multiplyScalar(m === this.active ? 0.32 : 0.16);
      else m.material.emissive.setHex(0x000000);
    }
  }

  // Temporarily drop editor-only visuals (for captures).
  setCaptureMode(on) {
    if (on) for (const m of this.meshes) m.material.emissive.setHex(0);
    else this._highlight();
    if (this.overlay) this.overlay.visible = !on;
  }

  // ------------------------------------------------------------ mode & gizmo

  setEnabled(on) {
    this.enabled = on;
    if (!on && this.mode === 'edit') this.mode = 'object';
    this._refresh();
  }

  setMode(mode) {
    if (mode === 'edit' && !this.active) { this.toast?.('Select an object first'); return false; }
    this.mode = mode;
    this.sel.clear();
    this._refresh();
    return true;
  }

  setTool(tool) {
    this.tool = tool;
    if (this.pivotEdit && tool === 'scale') this.pivotEdit = false;
    this._refresh();
  }

  setPivotMode(mode) {
    this.pivotMode = mode;
    this._refresh();
  }

  // Maya's D / Insert: the gizmo moves (and turns) the pivot, not the object.
  setPivotEdit(on) {
    if (on && (this.mode !== 'object' || !this.active)) { this.toast?.('Select an object in Object mode first'); return false; }
    this.pivotEdit = on;
    if (on && this.tool === 'scale') this.tool = 'translate';
    this._refresh();
    return true;
  }

  // World-space point that rotate / scale act around, for the current selection.
  transformPivot() {
    const list = [...this.selected].filter((m) => m.visible);
    if (this.pivotMode === 'world') return new THREE.Vector3();
    if (this.mode === 'edit' && this.active) {
      this.active.updateMatrixWorld(true);
      return this.pivotMode === 'median' || !this.sel.size ? (this.sel.size ? this._selectionCenterWorld() : this.active.getWorldPosition(new THREE.Vector3()))
        : this.active.getWorldPosition(new THREE.Vector3());
    }
    if (this.pivotMode === 'active' && this.active) return this.active.getWorldPosition(new THREE.Vector3());
    if (!list.length) return new THREE.Vector3();
    return list.reduce((c, m) => c.add(m.getWorldPosition(new THREE.Vector3())), new THREE.Vector3()).divideScalar(list.length);
  }

  setSnap(on, grid = 0.05) {
    this.gizmo.setTranslationSnap(on ? grid : null);
    this.gizmo.setRotationSnap(on ? THREE.MathUtils.degToRad(15) : null);
    this.gizmo.setScaleSnap(on ? 0.1 : null);
  }

  setCamera(cam) { this.gizmo.camera = cam; }

  _refresh() {
    this.onRefresh?.();
    this._highlight();
    this.gizmo.detach();
    if (this.overlay) { this.overlay.parent?.remove(this.overlay); this._disposeOverlay(); }
    if (!this.enabled) { this.requestRender(); return; }
    this.gizmo.setMode(this.tool);
    if (this.mode === 'object') {
      if (!this.active) { this.pivotEdit = false; this.requestRender(); return; }
      // The gizmo sits on a helper at the pivot and drives every selected object.
      this._syncPivot();
      this.gizmo.setSpace(this.pivotEdit || this.tool === 'scale' ? 'local' : 'world');
      this.gizmo.attach(this.pivot);
    } else if (this.active) {
      this._buildOverlay();
      this._placePivot();
    }
    this.requestRender();
  }

  _syncPivot() {
    if (this.mode !== 'object' || !this.active || this.dragging) return;
    this.active.updateMatrixWorld(true);
    const own = this.pivotEdit || this.pivotMode === 'individual';
    this.pivot.position.copy(own ? this.active.getWorldPosition(new THREE.Vector3()) : this.transformPivot());
    this.pivot.quaternion.copy(this.active.getWorldQuaternion(new THREE.Quaternion()));
    this.pivot.scale.set(1, 1, 1);
    this.pivot.updateMatrixWorld(true);
  }

  _disposeOverlay() {
    this.overlay?.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    this.overlay = null;
  }

  _buildOverlay() {
    if (this.overlay) { this.overlay.parent?.remove(this.overlay); this._disposeOverlay(); }
    const mesh = this.active;
    if (!mesh || this.mode !== 'edit') return;
    const m = mesh.userData.poly;
    const g = new THREE.Group();
    g.renderOrder = 998;
    // Edges
    const edges = [...m.edges().values()];
    const lp = [], lc = [];
    for (const e of edges) {
      const on = this.sel.has(e.a) && this.sel.has(e.b);
      const c = on ? ORANGE : EDGE;
      lp.push(...m.v[e.a].toArray(), ...m.v[e.b].toArray());
      lc.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.9 }));
    lines.renderOrder = 998;
    g.add(lines);
    // Vertices
    if (this.selMode === 'vert') {
      const pp = [], pc = [];
      m.v.forEach((p, i) => {
        const c = this.sel.has(i) ? ORANGE : VERT;
        pp.push(p.x, p.y, p.z);
        pc.push(c.r, c.g, c.b);
      });
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
      pg.setAttribute('color', new THREE.Float32BufferAttribute(pc, 3));
      const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true, depthTest: false, transparent: true }));
      pts.renderOrder = 999;
      g.add(pts);
    }
    // Selected faces
    const faces = P.selectedFaces(m, this.sel);
    if (faces.length) {
      const sub = new PolyMesh(m.v, faces.map((i) => m.f[i]));
      const fm = new THREE.Mesh(sub.toGeometry().geometry, new THREE.MeshBasicMaterial({
        color: ORANGE, transparent: true, opacity: 0.35, depthTest: false, side: THREE.DoubleSide,
      }));
      fm.renderOrder = 997;
      g.add(fm);
    }
    mesh.add(g);
    this.overlay = g;
  }

  _selectionCenterWorld() {
    const m = this.active.userData.poly;
    for (const i of [...this.sel]) if (!m.v[i]) this.sel.delete(i);
    const c = new THREE.Vector3();
    for (const i of this.sel) c.add(m.v[i]);
    return c.divideScalar(Math.max(1, this.sel.size)).applyMatrix4(this.active.matrixWorld);
  }

  _placePivot() {
    this.gizmo.detach();
    if (!this.active || !this.sel.size) return;
    this.active.updateMatrixWorld(true);
    this.pivot.position.copy(this.transformPivot());
    this.pivot.quaternion.copy(this.active.getWorldQuaternion(new THREE.Quaternion()));
    this.pivot.scale.set(1, 1, 1);
    this.pivot.updateMatrixWorld(true);
    this.gizmo.setSpace('local');
    this.gizmo.attach(this.pivot);
  }

  _beginObjectDrag() {
    this.pivot.updateMatrixWorld(true);
    this.drag = {
      inv: this.pivot.matrixWorld.clone().invert(),
      start: [...this.selected].filter((m) => m.visible).map((m) => { m.updateMatrix(); return [m, m.matrix.clone()]; }),
    };
  }

  _applyObjectDrag() {
    if (!this.drag) return;
    this.pivot.updateMatrixWorld(true);
    const delta = this.pivot.matrixWorld.clone().multiply(this.drag.inv);
    const indiv = this.pivotMode === 'individual';
    let L, moved;
    if (indiv) {
      // Same rotation / scale for every object, each about its own origin;
      // the translation is the one the gizmo itself went through.
      const A = new THREE.Vector3().setFromMatrixPosition(this.drag.inv.clone().invert());
      moved = A.clone().applyMatrix4(delta).sub(A);
      L = delta.clone().setPosition(0, 0, 0);
    }
    for (const [m, M] of this.drag.start) {
      let D = delta;
      if (indiv) {
        const O = new THREE.Vector3().setFromMatrixPosition(M);
        D = new THREE.Matrix4().makeTranslation(O.x + moved.x, O.y + moved.y, O.z + moved.z)
          .multiply(L).multiply(new THREE.Matrix4().makeTranslation(-O.x, -O.y, -O.z));
      }
      D.clone().multiply(M).decompose(m.position, m.quaternion, m.scale);
    }
  }

  // userData.frame maps the current local vertex space back to the one the
  // object was created with, so the pivot can always be reset.
  _trackFrame(m, X) {
    const F = m.userData.frame || new THREE.Matrix4();
    m.userData.frame = F.multiply(X.clone().invert());
  }

  // Pivot back to where the object was created with it (origin and axes).
  resetPivot() {
    const m = this.active;
    if (!m) return;
    const F = m.userData.frame;
    if (!F || F.equals(new THREE.Matrix4())) { this.toast?.('Pivot is already at its default'); return; }
    this.pushUndo();
    m.updateMatrix();
    m.matrix.clone().multiply(F.clone().invert()).decompose(m.position, m.quaternion, m.scale);
    m.userData.poly.transform(F);
    m.userData.frame = null;
    this.rebuild(m);
    this._refresh();
    this._changed();
  }

  setPivotSnap(mode) { this.pivotSnap = mode; }

  // World points the pivot can snap to for the current snap mode.
  _snapCandidates() {
    const out = [];
    const mode = this.pivotSnap;
    if (mode === 'off' || mode === 'grid') return out;
    for (const mesh of this.meshes) {
      if (!mesh.visible) continue;
      mesh.updateMatrixWorld(true);
      const poly = mesh.userData.poly, W = mesh.matrixWorld;
      if (mode === 'origin') { out.push(mesh.getWorldPosition(new THREE.Vector3())); continue; }
      if (mode === 'vertex') for (const v of poly.v) out.push(v.clone().applyMatrix4(W));
      else if (mode === 'edge') for (const e of poly.edges().values()) out.push(poly.v[e.a].clone().add(poly.v[e.b]).multiplyScalar(0.5).applyMatrix4(W));
      else if (mode === 'face') for (const f of poly.f) out.push(f.reduce((c, i) => c.add(poly.v[i]), new THREE.Vector3()).divideScalar(f.length).applyMatrix4(W));
    }
    return out;
  }

  // While the pivot gizmo is dragged: jump to the nearest snap point on screen.
  _snapPivot() {
    const mode = this.pivotSnap;
    if (mode === 'off') return;
    const p = this.pivot.position;
    if (mode === 'grid') {
      const g = 0.05;
      p.set(Math.round(p.x / g) * g, Math.round(p.y / g) * g, Math.round(p.z / g) * g);
      this.pivot.updateMatrixWorld(true);
      return;
    }
    const cam = this.getCamera(), r = this.canvas.getBoundingClientRect();
    const px = (v) => { const s = v.clone().project(cam); return [(s.x + 1) / 2 * r.width, (1 - s.y) / 2 * r.height, s.z]; };
    const at = px(p);
    let best = null, bestD = 40;
    for (const c of this._snapTargets || []) {
      const s = px(c);
      if (s[2] > 1) continue;
      const d = Math.hypot(s[0] - at[0], s[1] - at[1]);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best) { p.copy(best); this.pivot.updateMatrixWorld(true); }
  }

  // Click while editing the pivot: put it on the feature under the cursor
  // (vertex / edge centre / face centre of the clicked face, or the surface).
  _pivotClick(ndc) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.getCamera());
    const hit = ray.intersectObjects(this.meshes.filter((m) => m.visible), false)[0];
    if (!hit) return false;
    const mesh = hit.object, poly = mesh.userData.poly, W = mesh.matrixWorld;
    const face = poly.f[mesh.userData.triFace?.[hit.faceIndex]];
    let p = hit.point.clone();
    if (face && this.pivotSnap !== 'off' && this.pivotSnap !== 'grid') {
      const pts = face.map((i) => poly.v[i].clone().applyMatrix4(W));
      if (this.pivotSnap === 'face') p = pts.reduce((c, v) => c.add(v), new THREE.Vector3()).divideScalar(pts.length);
      else if (this.pivotSnap === 'origin') p = mesh.getWorldPosition(new THREE.Vector3());
      else {
        const cand = this.pivotSnap === 'edge' ? pts.map((v, i) => v.clone().add(pts[(i + 1) % pts.length]).multiplyScalar(0.5)) : pts;
        p = cand.reduce((b, v) => (v.distanceTo(hit.point) < b.distanceTo(hit.point) ? v : b));
      }
    }
    this.pushUndo();
    this.pivot.position.copy(p);
    if (this.pivotSnap === 'grid') { this._snapTargets = []; this._snapPivot(); }
    this.pivot.updateMatrixWorld(true);
    this.setOrigin('pivot');
    return true;
  }

  // Move the active object's origin (pivot) without moving its geometry.
  // where: 'pivot' (the pivot-edit gizmo), 'center', 'base', 'world', 'selection'.
  setOrigin(where) {
    const m = this.active;
    if (!m) return;
    const poly = m.userData.poly;
    m.updateMatrix();
    const before = m.matrix.clone();
    const local = (v) => v.clone().applyMatrix4(before);
    let p, q = m.quaternion.clone();
    if (where === 'pivot') { p = this.pivot.position.clone(); q = this.pivot.quaternion.clone(); }
    else if (where === 'world') p = new THREE.Vector3();
    else if (where === 'selection') {
      const ids = [...this.sel].filter((i) => poly.v[i]);
      if (!ids.length) { this.toast?.('Select vertices in Edit mode first'); return; }
      p = local(ids.reduce((c, i) => c.add(poly.v[i]), new THREE.Vector3()).divideScalar(ids.length));
    } else {
      const box = poly.bounds();
      const c = box.getCenter(new THREE.Vector3());
      if (where === 'base') c.y = box.min.y;
      p = local(c);
    }
    if (where !== 'pivot') this.pushUndo();
    m.position.copy(p);
    m.quaternion.copy(q);
    m.updateMatrix();
    // Vertices are re-expressed in the new frame so nothing moves in the world.
    const X = m.matrix.clone().invert().multiply(before);
    poly.transform(X);
    this._trackFrame(m, X);
    this.rebuild(m);
    this._refresh();
    this._changed();
  }

  _beginEditDrag() {
    const m = this.active.userData.poly;
    this.drag = {
      inv: this.pivot.matrixWorld.clone().invert(),
      toLocal: this.active.matrixWorld.clone().invert(),
      orig: new Map([...this.sel].map((i) => [i, m.v[i].clone().applyMatrix4(this.active.matrixWorld)])),
    };
  }

  _applyEditDrag() {
    if (!this.drag) return;
    this.pivot.updateMatrixWorld(true);
    const delta = this.pivot.matrixWorld.clone().multiply(this.drag.inv);
    const m = this.active.userData.poly;
    for (const [i, w] of this.drag.orig) m.v[i].copy(w).applyMatrix4(delta).applyMatrix4(this.drag.toLocal);
    this.rebuild(this.active);
  }

  // ------------------------------------------------------------ picking

  // ndc: THREE.Vector2; px: [x, y] in canvas CSS pixels. Returns true if handled.
  pick(ndc, px, additive) {
    if (!this.enabled) return false;
    if (this.pivotEdit) { this._pivotClick(ndc); return true; }
    const cam = this.getCamera();
    if (this.mode === 'object') {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObjects(this.meshes.filter((m) => m.visible && !m.userData.locked), false)[0];
      this.selectObjects(hit ? [hit.object] : [], additive);
      return true;
    }
    const mesh = this.active;
    const m = mesh.userData.poly;
    const r = this.canvas.getBoundingClientRect();
    const toPx = (p) => {
      const v = p.clone().applyMatrix4(mesh.matrixWorld).project(cam);
      return v.z > 1 ? null : [(v.x + 1) / 2 * r.width, (1 - v.y) / 2 * r.height];
    };
    let picked = null;
    if (this.selMode === 'vert') {
      let best = 12;
      m.v.forEach((p, i) => {
        const s = toPx(p);
        if (!s) return;
        const d = Math.hypot(s[0] - px[0], s[1] - px[1]);
        if (d < best) { best = d; picked = [i]; }
      });
    } else if (this.selMode === 'edge') {
      let best = 10;
      for (const e of m.edges().values()) {
        const a = toPx(m.v[e.a]), b = toPx(m.v[e.b]);
        if (!a || !b) continue;
        const d = segDist(px, a, b);
        if (d < best) { best = d; picked = [e.a, e.b]; }
      }
    } else {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObject(mesh, false)[0];
      if (hit) picked = m.f[mesh.userData.triFace[hit.faceIndex]].slice();
    }
    if (!additive) this.sel.clear();
    if (picked) {
      const allIn = picked.every((i) => this.sel.has(i));
      for (const i of picked) (additive && allIn ? this.sel.delete(i) : this.sel.add(i));
    }
    this._refresh();
    return true;
  }

  // rect in canvas CSS pixels
  boxSelect(rect, additive) {
    if (!this.enabled) return;
    const cam = this.getCamera();
    const r = this.canvas.getBoundingClientRect();
    const inside = (p, mat) => {
      const v = p.clone().applyMatrix4(mat).project(cam);
      if (v.z > 1) return false;
      const x = (v.x + 1) / 2 * r.width, y = (1 - v.y) / 2 * r.height;
      return x >= rect.left && x <= rect.left + rect.w && y >= rect.top && y <= rect.top + rect.h;
    };
    if (this.mode === 'object') {
      const hits = this.meshes.filter((m) => m.visible && !m.userData.locked).filter((mesh) => {
        mesh.geometry.computeBoundingBox();
        return inside(mesh.geometry.boundingBox.getCenter(new THREE.Vector3()), mesh.matrixWorld);
      });
      this.selectObjects(hits, additive);
      return;
    }
    const mesh = this.active;
    const m = mesh.userData.poly;
    if (!additive) this.sel.clear();
    if (this.selMode === 'face') {
      m.f.forEach((f) => { if (inside(m.faceCenter(f), mesh.matrixWorld)) f.forEach((i) => this.sel.add(i)); });
    } else {
      m.v.forEach((p, i) => { if (inside(p, mesh.matrixWorld)) this.sel.add(i); });
    }
    this._refresh();
  }

  selectAll(on = true) {
    if (this.mode === 'edit' && this.active) {
      this.sel = on ? new Set(this.active.userData.poly.v.keys()) : new Set();
      this._refresh();
    } else {
      this.selectObjects(on ? this.meshes : []);
    }
  }

  setSelMode(mode) {
    this.selMode = mode;
    this._refresh();
  }

  // ------------------------------------------------------------ edit operations

  _edit(fn, { keepSel = true } = {}) {
    if (this.mode !== 'edit' || !this.active) return false;
    this.pushUndo();
    const m = this.active.userData.poly;
    const res = fn(m);
    if (res instanceof Set) this.sel = res;
    else if (!keepSel || res === 'clear') this.sel = new Set();
    this.rebuild(this.active);
    this._refresh();
    this._changed();
    return res;
  }

  faces() { return P.selectedFaces(this.active.userData.poly, this.sel); }

  extrude(dist) {
    if (!this.faces().length) return this.toast?.('Extrude: select faces (face mode, 3)');
    return this._edit((m) => P.extrudeFaces(m, P.selectedFaces(m, this.sel), dist));
  }
  inset(dist) {
    if (!this.faces().length) return this.toast?.('Inset: select faces');
    return this._edit((m) => P.insetFaces(m, P.selectedFaces(m, this.sel), dist));
  }
  bevel(width) {
    const edges = P.selectedEdges(this.active.userData.poly, this.sel);
    if (!edges.length) return this.toast?.('Bevel: select edges (or faces) first');
    return this._edit((m) => P.bevelEdges(m, P.selectedEdges(m, this.sel), width), { keepSel: false });
  }
  subdivide() {
    if (!this.faces().length) return this.toast?.('Subdivide: select faces');
    return this._edit((m) => P.subdivideFaces(m, P.selectedFaces(m, this.sel)));
  }
  slice(axis, count) {
    return this._edit((m) => P.sliceAlong(m, axis, count, this.sel.size ? this.sel : null));
  }
  connect() {
    if (this.sel.size !== 2) return this.toast?.('Connect: select exactly 2 vertices of one face');
    const [a, b] = [...this.sel];
    return this._edit((m) => { if (!P.connectVerts(m, a, b)) this.toast?.('Those vertices do not share a face'); });
  }
  merge() {
    if (this.sel.size < 2) return this.toast?.('Merge: select 2 or more vertices');
    return this._edit((m) => P.mergeVerts(m, this.sel));
  }
  fill() {
    if (this.sel.size < 3) return this.toast?.('Fill: select 3 or more vertices');
    return this._edit((m) => { if (!P.fillVerts(m, this.sel)) this.toast?.('Fill: those vertices already form a face (or are collinear)'); });
  }
  remove() {
    if (this.mode === 'object') return this.deleteObjects();
    if (!this.sel.size) return;
    return this._edit((m) => { P.deleteSelection(m, this.selMode, this.sel); return 'clear'; });
  }
  duplicateSel() {
    if (!this.faces().length) return this.toast?.('Duplicate: select faces');
    return this._edit((m) => P.duplicateFaces(m, P.selectedFaces(m, this.sel)));
  }
  flip() {
    return this._edit((m) => { P.flipFaces(m, this.sel.size ? P.selectedFaces(m, this.sel) : null); });
  }
  separate() {
    if (this.mode !== 'edit' || !this.faces().length) return this.toast?.('Separate: select faces in Edit mode');
    this.pushUndo();
    const src = this.active;
    const part = P.separateFaces(src.userData.poly, this.faces());
    const mesh = this._makeMesh(part, src.name + '.part', src.userData.color);
    Object.assign(mesh.userData, { env: src.userData.env, kind: src.userData.kind, seg: src.userData.seg });
    mesh.position.copy(src.position);
    mesh.quaternion.copy(src.quaternion);
    mesh.scale.copy(src.scale);
    this.sel.clear();
    this.rebuild(src);
    this._refresh();
    this._changed();
  }

  // Deformers work on the selection in Edit mode, on the whole object otherwise.
  deform(kind, axis, dirAxis, amount, segments = 0) {
    const mesh = this.active;
    if (!mesh) return this.toast?.('Select an object');
    this.pushUndo();
    const m = mesh.userData.poly;
    const verts = this.mode === 'edit' && this.sel.size ? this.sel : null;
    if (!verts && segments > 0) P.sliceAlong(m, axis, segments);
    if (kind === 'bend') P.bend(m, verts, axis, dirAxis, amount);
    else if (kind === 'twist') P.twist(m, verts, axis, amount);
    else P.taper(m, verts, axis, amount);
    this.rebuild(mesh);
    this._refresh();
    this._changed();
  }

  // ------------------------------------------------------------ object operations

  // A library part made for a hand (pose library): no undo step, not selected.
  addHeld(poly, lib) {
    const mesh = this._makeMesh(poly, `${lib[1]}.${String(++this.counter).padStart(3, '0')}`, poly.color);
    Object.assign(mesh.userData, { kind: lib[1], lib, grip: poly.grip, auto: true });
    return mesh;
  }

  removeMeshes(list) {
    for (const m of list) { this.group.remove(m); m.geometry.dispose(); m.material.dispose(); this.selected.delete(m); }
    if (!this.selected.has(this.active)) this.active = [...this.selected].pop() || null;
    this._refresh();
  }

  deleteObjects() {
    if (!this.selected.size) return;
    this.pushUndo();
    for (const m of this.selected) { this.group.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.selected.clear();
    this.active = null;
    this._refresh();
    this._changed();
  }

  duplicate() {
    if (this.mode === 'edit') return this.duplicateSel();
    if (!this.selected.size) return;
    this.pushUndo();
    const copies = [...this.selected].map((src) => {
      const c = this._makeMesh(src.userData.poly.clone(), src.name.replace(/\.\d+$/, '') + '.' + String(++this.counter).padStart(3, '0'), src.userData.color);
      c.position.copy(src.position).add(new THREE.Vector3(0.25, 0, 0));
      Object.assign(c.userData, { env: src.userData.env, kind: src.userData.kind, seg: src.userData.seg });
      c.quaternion.copy(src.quaternion);
      c.scale.copy(src.scale);
      return c;
    });
    this.selectObjects(copies);
    this._changed();
  }

  copy() {
    if (!this.selected.size) return;
    try { localStorage.setItem(CLIP_KEY, JSON.stringify([...this.selected].map((m) => this._serializeOne(m)))); } catch { /* storage full */ }
    this.toast?.(`Copied ${this.selected.size} object(s)`);
  }

  paste() {
    let list;
    try { list = JSON.parse(localStorage.getItem(CLIP_KEY) || 'null'); } catch { list = null; }
    if (!list?.length) return this.toast?.('Clipboard is empty');
    this.pushUndo();
    const made = list.map((d) => this._deserializeOne(d));
    made.forEach((m) => m.position.x += 0.25);
    this.selectObjects(made);
    this._changed();
  }

  join() {
    const A = this.active;
    const others = [...this.selected].filter((m) => m !== A);
    if (!A || !others.length) return this.toast?.('Join: select 2+ objects (the active one keeps its transform)');
    this.pushUndo();
    A.updateMatrixWorld(true);
    const inv = A.matrixWorld.clone().invert();
    const parts = [A.userData.poly];
    for (const B of others) {
      B.updateMatrixWorld(true);
      const p = B.userData.poly.clone();
      p.transform(inv.clone().multiply(B.matrixWorld));
      if (B.matrixWorld.determinant() * A.matrixWorld.determinant() < 0) P.flipFaces(p);
      parts.push(p);
      this.group.remove(B);
    }
    A.userData.poly = PolyMesh.merge(parts);
    this.rebuild(A);
    this.selectObjects([A]);
    this._changed();
  }

  // op: 'union' | 'difference' | 'intersect'. Active object is the result;
  // the other selected objects are the cutters.
  boolean(op, keepCutters = false) {
    const A = this.active;
    const others = [...this.selected].filter((m) => m !== A);
    if (!A || !others.length) return this.toast?.('Boolean: select the cutter(s), then Shift+click the object to keep last');
    this.pushUndo();
    const ev = new Evaluator();
    ev.attributes = ['position', 'normal'];
    ev.useGroups = false;
    const OP = { union: ADDITION, difference: SUBTRACTION, intersect: INTERSECTION }[op];
    A.updateMatrixWorld(true);
    const inv = A.matrixWorld.clone().invert();
    const solid = (poly, matrix) => {
      // Assembled props are several overlapping shells: union them first.
      let acc = null;
      for (const part of poly.components()) {
        const b = new Brush(part.toIndexedGeometry());
        if (matrix) { b.matrixAutoUpdate = false; b.matrix.copy(matrix); }
        b.updateMatrixWorld(true);
        acc = acc ? ev.evaluate(acc, b, ADDITION) : b;
      }
      return acc;
    };
    try {
      let res = solid(A.userData.poly);
      for (const B of others) {
        B.updateMatrixWorld(true);
        res = ev.evaluate(res, solid(B.userData.poly, inv.clone().multiply(B.matrixWorld)), OP);
      }
      const poly = PolyMesh.fromGeometry(res.geometry);
      if (!poly.f.length) this.toast?.('Boolean result is empty');
      A.userData.poly = poly;
    } catch (err) {
      console.error(err);
      this.toast?.('Boolean failed: ' + err.message);
      return;
    }
    for (const B of others) {
      if (keepCutters) B.visible = false;
      else { this.group.remove(B); B.geometry.dispose(); }
    }
    this.rebuild(A);
    this.selectObjects([A]);
    this._changed();
  }

  mirror(axis) {
    const mesh = this.active;
    if (!mesh) return;
    this.pushUndo();
    P.mirror(mesh.userData.poly, axis);
    this.rebuild(mesh);
    this._changed();
  }

  dropToFloor() {
    if (!this.selected.size) return;
    this.pushUndo();
    for (const m of this.selected) {
      m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m);
      m.position.y -= box.min.y;
    }
    this._changed();
    this.requestRender();
  }

  // Bake rotation and scale into the vertices (Ctrl+A in Blender).
  applyTransform() {
    const m = this.active;
    if (!m) return;
    this.pushUndo();
    const rs = new THREE.Matrix4().compose(new THREE.Vector3(), m.quaternion, m.scale);
    m.userData.poly.transform(rs);
    this._trackFrame(m, rs);
    if (rs.determinant() < 0) P.flipFaces(m.userData.poly);
    m.quaternion.identity();
    m.scale.set(1, 1, 1);
    this.rebuild(m);
    this._refresh();
    this._changed();
  }

  // Origin to the bottom centre of the geometry (handy for props on the floor).
  originToGeometry() { this.setOrigin('base'); }

  // Painted faces show their own colours (vertex colours); the colour-coded
  // view (colorCode(mesh) -> hex) paints each object in one flat colour.
  _applyColor(mesh) {
    const over = this.colorCode?.(mesh);
    const painted = over == null && mesh.userData.poly.painted;
    if (mesh.material.vertexColors !== painted) { mesh.material.vertexColors = painted; mesh.material.needsUpdate = true; }
    mesh.material.color.setHex(painted ? 0xffffff : over ?? mesh.userData.color);
  }

  refreshColors() {
    for (const m of this.meshes) this._applyColor(m);
    this.requestRender();
  }

  setColor(hex) {
    const m = this.active;
    if (!m) return;
    m.userData.color = hex;
    if (m.userData.poly.painted) this.rebuild(m); else this._applyColor(m);
    this._changed();
    this.requestRender();
  }

  // Edit mode: paint the selected faces (hex), or clear the paint (null) of the
  // selected faces, or of every face when none is selected.
  paintFaces(hex) {
    const m = this.active;
    if (!m) return 0;
    const poly = m.userData.poly;
    const faces = this.mode === 'edit' ? P.selectedFaces(poly, this.sel) : [];
    if (hex != null && !faces.length) { this.toast?.('Select faces in Edit mode first (face select, then click or box-select)'); return 0; }
    this.pushUndo();
    for (const fi of faces.length ? faces : poly.f.keys()) {
      if (hex == null) delete poly.f[fi].c; else poly.f[fi].c = hex;
    }
    this.rebuild(m);
    this._changed();
    return faces.length || poly.f.length;
  }

  setFlag(mesh, key, value) {
    mesh.userData[key] = value;
    if (key === 'locked' && value) { this.selected.delete(mesh); if (this.active === mesh) this.active = null; this._refresh(); }
    this._changed();
  }

  rename(mesh, name) {
    mesh.name = name;
    this._changed();
  }

  showHidden() {
    for (const m of this.meshes) m.visible = true;
    this.requestRender();
    this._changed();
  }

  // ------------------------------------------------------------ undo / serialisation

  _serializeOne(m) {
    return {
      name: m.name, color: m.userData.color, visible: m.visible, env: !!m.userData.env, locked: !!m.userData.locked, kind: m.userData.kind, seg: m.userData.seg,
      p: m.position.toArray(), q: m.quaternion.toArray(), s: m.scale.toArray(), mesh: m.userData.poly.toJSON(),
      ...(m.userData.grip ? { grip: m.userData.grip } : {}), ...(m.userData.held ? { held: m.userData.held } : {}),
      ...(m.userData.lib ? { lib: m.userData.lib } : {}), ...(m.userData.auto ? { auto: true } : {}),
      ...(m.userData.frame ? { frame: m.userData.frame.toArray() } : {}),
    };
  }

  _deserializeOne(d) {
    const m = this._makeMesh(PolyMesh.fromJSON(d.mesh), d.name, d.color ?? 0x9aa5b1);
    m.position.fromArray(d.p);
    m.quaternion.fromArray(d.q);
    m.scale.fromArray(d.s);
    m.visible = d.visible !== false;
    Object.assign(m.userData, { env: !!d.env, locked: !!d.locked, kind: d.kind, seg: d.seg, grip: d.grip, held: d.held, lib: d.lib, auto: !!d.auto });
    if (d.frame) m.userData.frame = new THREE.Matrix4().fromArray(d.frame);
    return m;
  }

  serialize() { return this.meshes.map((m) => this._serializeOne(m)); }

  load(list, { silent = false } = {}) {
    const activeName = this.active?.name;
    for (const m of this.meshes) { this.group.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.selected.clear();
    this.active = null;
    for (const d of list || []) this._deserializeOne(d);
    const again = this.meshes.find((m) => m.name === activeName);
    if (again) { this.selected.add(again); this.active = again; }
    if (this.mode === 'edit' && !this.active) this.mode = 'object';
    this.counter = Math.max(this.counter, ...this.meshes.map((m) => +(m.name.match(/\.(\d+)$/)?.[1] || 0)));
    this._refresh();
    if (!silent) this._changed();
  }

  pushUndo() {
    this.undoStack.push(JSON.stringify(this.serialize()));
    if (this.undoStack.length > 60) this.undoStack.shift();
    this.redoStack.length = 0;
  }
  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(JSON.stringify(this.serialize()));
    this.load(JSON.parse(this.undoStack.pop()));
  }
  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(JSON.stringify(this.serialize()));
    this.load(JSON.parse(this.redoStack.pop()));
  }

  _changed() {
    if (this.mode === 'edit' && this.active) this._placePivot();
    else this._syncPivot();
    this.onChange?.();
    this.requestRender();
  }

  worldBounds() {
    const box = new THREE.Box3();
    for (const m of this.meshes) if (m.visible) box.expandByObject(m);
    return box;
  }
}

function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
