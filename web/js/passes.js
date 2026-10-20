// Offscreen render passes for ControlNet: OpenPose, depth, normal, edge, mask, shaded.
import * as THREE from 'three';

// ControlNet / controlnet_aux OpenPose palette and limb order (1-based keypoint ids).
const BODY_COLORS = [
  [255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0], [85, 255, 0],
  [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255],
  [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85],
];
const LIMBS = [
  [2, 3], [2, 6], [3, 4], [4, 5], [6, 7], [7, 8], [2, 9], [9, 10], [10, 11],
  [2, 12], [12, 13], [13, 14], [2, 1], [1, 15], [15, 17], [1, 16], [16, 18],
];
const HAND_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10],
  [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20],
];

const hsv = (h) => {
  const i = Math.floor(h * 6), f = h * 6 - i, q = 1 - f;
  const [r, g, b] = [[1, f, 0], [q, 1, 0], [0, 1, f], [0, q, 1], [f, 0, 1], [1, 0, q]][i % 6];
  return `rgb(${r * 255 | 0},${g * 255 | 0},${b * 255 | 0})`;
};

export function projectKeypoints(kp, camera, W, H) {
  const v = new THREE.Vector3();
  const pr = (p) => {
    if (!p) return null;
    v.copy(p).project(camera);
    if (v.z < -1 || v.z > 1) return null;
    return [(v.x + 1) * 0.5 * W, (1 - v.y) * 0.5 * H];
  };
  return {
    body: kp.body.map(pr),
    hands: Object.fromEntries(Object.entries(kp.hands).map(([s, h]) => [s, h ? h.map(pr) : null])),
    extra: (kp.extra || []).map((a) => ({ side: a.side, pts: a.pts.map(pr) })),
    face: kp.face ? kp.face.map(pr) : null,
  };
}

// opts: { hands, face, scale, alpha }
export function drawOpenPose(ctx, kp2, W, H, opts = {}) {
  const s = opts.scale ?? Math.min(W, H) / 512;
  const stick = 4 * s, rad = 4 * s;
  const body = kp2.body.slice();
  if (opts.face === false) [0, 14, 15, 16, 17].forEach((i) => { body[i] = null; });
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  LIMBS.forEach(([a, b], i) => {
    const p = body[a - 1], q = body[b - 1];
    if (!p || !q) return;
    const [r, g, bl] = BODY_COLORS[i];
    ctx.fillStyle = `rgb(${r * 0.6 | 0},${g * 0.6 | 0},${bl * 0.6 | 0})`;
    const dx = q[0] - p[0], dy = q[1] - p[1];
    ctx.beginPath();
    ctx.ellipse((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, Math.hypot(dx, dy) / 2, stick, Math.atan2(dy, dx), 0, Math.PI * 2);
    ctx.fill();
  });
  // Extra arm pairs reuse the matching arm's limb and joint colours.
  const extra = opts.extras === false ? [] : kp2.extra || [];
  for (const { side, pts } of extra) {
    const [limbA, limbB, jS, jE, jW] = side === 'right' ? [2, 3, 2, 3, 4] : [4, 5, 5, 6, 7];
    const segs = [[body[1], pts[0], side === 'right' ? 0 : 1], [pts[0], pts[1], limbA], [pts[1], pts[2], limbB]];
    for (const [p, q, ci] of segs) {
      if (!p || !q) continue;
      const [r, g, bl] = BODY_COLORS[ci];
      ctx.fillStyle = `rgb(${r * 0.6 | 0},${g * 0.6 | 0},${bl * 0.6 | 0})`;
      const dx = q[0] - p[0], dy = q[1] - p[1];
      ctx.beginPath();
      ctx.ellipse((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, Math.hypot(dx, dy) / 2, stick, Math.atan2(dy, dx), 0, Math.PI * 2);
      ctx.fill();
    }
    [jS, jE, jW].forEach((ci, i) => {
      const p = pts[i];
      if (!p) return;
      ctx.fillStyle = `rgb(${BODY_COLORS[ci].join(',')})`;
      ctx.beginPath();
      ctx.arc(p[0], p[1], rad, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  body.forEach((p, i) => {
    if (!p) return;
    ctx.fillStyle = `rgb(${BODY_COLORS[i].join(',')})`;
    ctx.beginPath();
    ctx.arc(p[0], p[1], rad, 0, Math.PI * 2);
    ctx.fill();
  });
  // 70-point face: white dots, as ControlNet's openpose_face draws them.
  if (opts.face70 !== false && kp2.face) {
    ctx.fillStyle = '#fff';
    for (const p of kp2.face) {
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p[0], p[1], Math.max(1.2, 2.2 * s), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (opts.hands !== false) {
    for (const hand of Object.values(kp2.hands)) {
      if (!hand) continue;
      ctx.lineWidth = 2 * s;
      ctx.lineCap = 'round';
      HAND_EDGES.forEach(([a, b], i) => {
        const p = hand[a], q = hand[b];
        if (!p || !q) return;
        ctx.strokeStyle = hsv(i / HAND_EDGES.length);
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
        ctx.stroke();
      });
      ctx.fillStyle = 'rgb(0,0,255)';
      hand.forEach((p) => {
        if (!p) return;
        ctx.beginPath();
        ctx.arc(p[0], p[1], Math.max(1.5, 2.5 * s), 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
  ctx.restore();
}

// Exported as plain JSON in the OpenPose format ControlNet's editors read.
// kp2s: one projected keypoint set per person.
export function openPoseJSON(kp2s, W, H) {
  const flat = (pts) => pts.flatMap((p) => (p ? [+p[0].toFixed(2), +p[1].toFixed(2), 1] : [0, 0, 0]));
  const hand = (h) => (h ? flat(h) : null);
  return {
    canvas_width: W, canvas_height: H,
    people: (Array.isArray(kp2s) ? kp2s : [kp2s]).map((kp2) => ({
      pose_keypoints_2d: flat(kp2.body),
      face_keypoints_2d: kp2.face ? flat(kp2.face) : null,
      hand_left_keypoints_2d: hand(kp2.hands.left),
      hand_right_keypoints_2d: hand(kp2.hands.right),
    })),
  };
}

const newCanvas = (W, H) => {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  return c;
};

export class PassRenderer {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    this.normalMat = new THREE.MeshNormalMaterial();
    this.maskMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // Wing membranes are single sheets: render both faces in every pass.
    for (const m of [this.depthMat, this.normalMat, this.maskMat]) m.side = THREE.DoubleSide;
  }

  _target(W, H, samples) {
    return new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, samples });
  }

  _read(rt, W, H) {
    const buf = new Uint8Array(W * H * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    // Flip rows: GL reads bottom-up.
    const out = new Uint8ClampedArray(W * H * 4);
    const row = W * 4;
    for (let y = 0; y < H; y++) out.set(buf.subarray((H - 1 - y) * row, (H - y) * row), y * row);
    return out;
  }

  _renderTo(scene, cam, mat, clear, W, H, samples = 4) {
    const rt = this._target(W, H, samples);
    const r = this.renderer;
    scene.overrideMaterial = mat;
    r.setRenderTarget(rt);
    r.setClearColor(clear, 1);
    r.clear();
    r.render(scene, cam);
    r.setRenderTarget(null);
    scene.overrideMaterial = null;
    const data = this._read(rt, W, H);
    rt.dispose();
    return data;
  }

  /**
   * job: { scene, camera, rigs (visible characters), W, H, hide: Object3D[], passes: Set<string>, opts }
   * returns { [pass]: HTMLCanvasElement, openposeJSON }
   */
  render(job) {
    const { scene, W, H } = job;
    const rigs = job.rigs || (job.rig ? [job.rig] : []);
    const opts = job.opts || {};
    const cam = job.camera.clone();
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    this.renderer.setSize(W, H, false);

    const hidden = job.hide.filter((o) => o.visible);
    // Things only the shaded render shows (the floor shadow catcher).
    const shadedOnly = [];
    job.scene.traverse((o) => { if (o.userData.shadedOnly && o.visible) shadedOnly.push(o); });
    hidden.push(...shadedOnly);
    hidden.forEach((o) => { o.visible = false; });
    const bg = scene.background;
    scene.background = null;
    const out = {};
    try {
      const want = job.passes;
      const needNormal = want.has('normal') || want.has('edge');
      const needDepth = want.has('depth') || want.has('edge') || want.has('handDepth');
      let kp2s = null;

      if (want.has('openpose')) {
        const c = newCanvas(W, H);
        const g = c.getContext('2d');
        g.fillStyle = '#000';
        g.fillRect(0, 0, W, H);
        kp2s = rigs.map((r) => projectKeypoints(r.keypoints(cam.position, { eyesAt: opts.eyesFollow ? cam.position : null }), cam, W, H));
        for (const kp2 of kp2s) drawOpenPose(g, kp2, W, H, { hands: opts.hands !== false, face: opts.face !== false, face70: opts.face70 !== false, extras: opts.extras !== false });
        out.openpose = c;
        out.openposeJSON = openPoseJSON(kp2s, W, H);
      }

      let depth = null;
      if (needDepth) depth = this._depth(scene, cam, rigs, W, H, job.extraBox);
      if (want.has('depth')) out.depth = this._depthCanvas(depth, W, H);

      let normal = null;
      if (needNormal) {
        normal = this._renderTo(scene, cam, this.normalMat, new THREE.Color(0.5, 0.5, 1), W, H);
        if (opts.flipX || opts.flipY) {
          for (let i = 0; i < normal.length; i += 4) {
            if (opts.flipX) normal[i] = 255 - normal[i];
            if (opts.flipY) normal[i + 1] = 255 - normal[i + 1];
          }
        }
      }
      if (want.has('normal')) out.normal = this._toCanvas(normal, W, H);

      let mask = null;
      // Edges need the silhouette of everything; the Mask pass can be character-only.
      const black = new THREE.Color(0, 0, 0);
      if (want.has('edge')) mask = this._renderTo(scene, cam, this.maskMat, black, W, H);
      if (want.has('mask')) {
        const off = (job.maskHide || []).filter((o) => o.visible);
        off.forEach((o) => { o.visible = false; });
        try {
          out.mask = this._toCanvas(off.length || !mask ? this._renderTo(scene, cam, this.maskMat, black, W, H) : mask.slice(), W, H);
        } finally {
          off.forEach((o) => { o.visible = true; });
        }
      }

      if (want.has('edge')) out.edge = this._edges(normal, depth, mask, W, H);

      if (want.has('shaded')) {
        shadedOnly.forEach((o) => { o.visible = true; });
        const r = this.renderer;
        r.setRenderTarget(null);
        r.setClearColor(new THREE.Color(opts.shadedBg ?? 0xffffff), 1);
        r.clear();
        r.render(scene, cam);
        const c = newCanvas(W, H);
        c.getContext('2d').drawImage(r.domElement, 0, 0);
        out.shaded = c;
        shadedOnly.forEach((o) => { o.visible = false; });
      }

      if (want.has('seg')) out.seg = this._flat(scene, cam, W, H, job.segGroups || [], job.segBackground || [0, 0, 0]);

      if (want.has('regions')) {
        const groups = job.regionGroups || [];
        out.regions = this._flat(scene, cam, W, H, groups, [0, 0, 0]);
        out.personMasks = groups.map((g) => ({ name: g.name, canvas: this._flat(scene, cam, W, H, [{ ...g, color: [255, 255, 255] }], [0, 0, 0]) }));
      }

      if (want.has('light')) out.light = this._light(scene, cam, W, H, job.light || {});

      // Hands only: for hand refiners (depth hand refiner, inpaint / ADetailer masks).
      if (want.has('handPose')) {
        const c = newCanvas(W, H);
        const g = c.getContext('2d');
        g.fillStyle = '#000';
        g.fillRect(0, 0, W, H);
        kp2s ||= rigs.map((r) => projectKeypoints(r.keypoints(cam.position), cam, W, H));
        for (const kp2 of kp2s) drawOpenPose(g, { ...kp2, body: kp2.body.map(() => null), extra: [], face: null }, W, H, { hands: true, face70: false });
        out.handPose = c;
      }
      if (want.has('handMask') || want.has('handDepth')) {
        const hm = this._handMask(scene, cam, rigs, W, H);
        if (want.has('handMask')) out.handMask = this._toCanvas(hm, W, H);
        if (want.has('handDepth')) out.handDepth = this._handDepth(depth, hm, W, H);
      }
    } finally {
      scene.background = bg;
      scene.overrideMaterial = null;
      hidden.forEach((o) => { o.visible = true; });
    }
    return out;
  }

  // Linear eye-space depth per pixel (NaN for background), tightly bounded.
  _depth(scene, cam, rigs, W, H, extraBox) {
    const b = extraBox && !extraBox.isEmpty() ? extraBox.clone() : new THREE.Box3();
    for (const r of rigs) {
      const s = r.bounds();
      b.union(new THREE.Box3().setFromCenterAndSize(s.center, new THREE.Vector3().setScalar(s.radius * 2)));
    }
    if (b.isEmpty()) b.setFromCenterAndSize(new THREE.Vector3(0, 1, 0), new THREE.Vector3(2, 2, 2));
    const sph = b.getBoundingSphere(new THREE.Sphere());
    const dist = cam.position.distanceTo(sph.center);
    const c = cam.clone();
    c.near = Math.max(0.01, dist - sph.radius);
    c.far = dist + sph.radius;
    c.updateProjectionMatrix();
    const px = this._renderTo(scene, c, this.depthMat, new THREE.Color(1, 1, 1), W, H, 0);
    const n = c.near, f = c.far;
    const lin = new Float32Array(W * H);
    let min = Infinity, max = -Infinity;
    const k = 255 / 256;
    for (let i = 0, j = 0; j < lin.length; i += 4, j++) {
      // Inverse of three's packDepthToRGBA.
      const z = (px[i] / 255) * k / 16777216 + (px[i + 1] / 255) * k / 65536 + (px[i + 2] / 255) * k / 256 + (px[i + 3] / 255) * k;
      if (z >= 0.99999) { lin[j] = NaN; continue; }
      const ndc = z * 2 - 1;
      const d = (2 * n * f) / (f + n - ndc * (f - n));
      lin[j] = d;
      if (d < min) min = d;
      if (d > max) max = d;
    }
    return { lin, min, max };
  }

  // White where a hand is visible (occluded by the body or props: black).
  // Rigid hand parts are found by their bone; skinned meshes get a per-vertex
  // hand weight from their skin weights.
  _handMask(scene, cam, rigs, W, H) {
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const black = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const skinned = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    skinned.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float handW;\nvarying float vHandW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvHandW = handW;');
      sh.fragmentShader = 'varying float vHandW;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( vec3( step( 0.5, vHandW ) ), opacity );');
    };
    skinned.customProgramCacheKey = () => 'handW';
    const handBones = new Set();
    for (const r of rigs) {
      for (const k of r.order) if (/Hand\d*$/.test(k)) r.map[k].traverse((o) => handBones.add(o));
    }
    const underHand = (o) => { for (let p = o; p; p = p.parent) if (handBones.has(p)) return true; return false; };
    const swapped = [];
    scene.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      let mat = black;
      if (o.isSkinnedMesh && o.skeleton) {
        const g = o.geometry;
        const key = o.skeleton.uuid;
        if (g.userData.handWFor !== key && g.attributes.skinIndex) {
          const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
          const isHand = o.skeleton.bones.map((b) => handBones.has(b));
          const w = new Float32Array(si.count);
          for (let v = 0; v < si.count; v++) {
            let s = 0;
            for (let c = 0; c < 4; c++) if (isHand[si.getComponent(v, c)]) s += sw.getComponent(v, c);
            w[v] = s;
          }
          g.setAttribute('handW', new THREE.BufferAttribute(w, 1));
          g.userData.handWFor = key;
        }
        if (g.attributes.handW) mat = skinned;
      } else if (underHand(o)) mat = white;
      swapped.push([o, o.material]);
      o.material = mat;
    });
    try {
      return this._renderTo(scene, cam, null, new THREE.Color(0, 0, 0), W, H, 0);
    } finally {
      for (const [o, m] of swapped) o.material = m;
      white.dispose(); black.dispose(); skinned.dispose();
    }
  }

  // Depth of the hands only, stretched over the hands' own depth range.
  _handDepth(depth, mask, W, H) {
    const { lin } = depth;
    let min = Infinity, max = -Infinity;
    for (let j = 0; j < lin.length; j++) {
      if (mask[j * 4] < 128 || Number.isNaN(lin[j])) continue;
      if (lin[j] < min) min = lin[j];
      if (lin[j] > max) max = lin[j];
    }
    const img = new Uint8ClampedArray(W * H * 4);
    const range = Math.max(1e-6, max - min);
    for (let j = 0; j < lin.length; j++) {
      const on = mask[j * 4] >= 128 && !Number.isNaN(lin[j]);
      const v = on ? 255 - ((lin[j] - min) / range) * 175 : 0;
      img[j * 4] = img[j * 4 + 1] = img[j * 4 + 2] = v;
      img[j * 4 + 3] = 255;
    }
    return this._toCanvas(img, W, H);
  }

  _depthCanvas(depth, W, H) {
    const { lin, min, max } = depth;
    const img = new Uint8ClampedArray(W * H * 4);
    const range = Math.max(1e-6, max - min);
    for (let j = 0; j < lin.length; j++) {
      const d = lin[j];
      const v = Number.isNaN(d) ? 0 : 255 - ((d - min) / range) * 205;
      img[j * 4] = img[j * 4 + 1] = img[j * 4 + 2] = v;
      img[j * 4 + 3] = 255;
    }
    return this._toCanvas(img, W, H);
  }

  _edges(normal, depth, mask, W, H) {
    const img = new Uint8ClampedArray(W * H * 4);
    const { lin, min, max } = depth;
    const dTh = Math.max(1e-4, (max - min) * 0.04);
    const isEdge = (a, b) => {
      const ma = mask[a * 4] > 127, mb = mask[b * 4] > 127;
      if (ma !== mb) return true;
      if (!ma) return false;
      const dn = Math.abs(normal[a * 4] - normal[b * 4]) + Math.abs(normal[a * 4 + 1] - normal[b * 4 + 1]) + Math.abs(normal[a * 4 + 2] - normal[b * 4 + 2]);
      if (dn > 90) return true;
      const da = lin[a], db = lin[b];
      return !Number.isNaN(da) && !Number.isNaN(db) && Math.abs(da - db) > dTh;
    };
    const e = new Uint8Array(W * H);
    for (let y = 0; y < H - 1; y++) {
      for (let x = 0; x < W - 1; x++) {
        const i = y * W + x;
        if (isEdge(i, i + 1) || isEdge(i, i + W)) e[i] = 1;
      }
    }
    const t = Math.max(0, Math.round(Math.min(W, H) / 768));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let on = 0;
        for (let dy = -t; dy <= t && !on; dy++) {
          for (let dx = -t; dx <= t && !on; dx++) {
            const yy = y + dy, xx = x + dx;
            if (yy >= 0 && yy < H && xx >= 0 && xx < W && e[yy * W + xx]) on = 1;
          }
        }
        const o = (y * W + x) * 4;
        img[o] = img[o + 1] = img[o + 2] = on ? 255 : 0;
        img[o + 3] = 255;
      }
    }
    return this._toCanvas(img, W, H);
  }

  // Flat colour per object group (segmentation, region maps). Everything else
  // is hidden; no anti-aliasing, so every pixel is an exact class colour.
  _flat(scene, cam, W, H, groups, bg) {
    const keep = new Map();
    for (const g of groups) {
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(g.color[0] / 255, g.color[1] / 255, g.color[2] / 255), side: THREE.DoubleSide });
      for (const o of g.objects) o.traverse((m) => { if (m.isMesh) keep.set(m, mat); });
    }
    const swapped = [], hidden = [];
    scene.traverse((o) => {
      if (keep.has(o)) { swapped.push([o, o.material]); o.material = keep.get(o); }
      else if ((o.isMesh || o.isLine || o.isPoints || o.isSprite) && o.visible) { hidden.push(o); o.visible = false; }
    });
    try {
      const data = this._renderTo(scene, cam, null, new THREE.Color(bg[0] / 255, bg[1] / 255, bg[2] / 255), W, H, 0);
      return this._toCanvas(data, W, H);
    } finally {
      for (const [o, m] of swapped) o.material = m;
      for (const o of hidden) o.visible = true;
      new Set(keep.values()).forEach((m) => m.dispose());
    }
  }

  // Grey shading from one light, as a lighting condition (IC-Light and similar).
  // az / el in degrees relative to the camera: az 0 = from the camera, 90 = from
  // the right, 180 = rim light from behind; el = height.
  _light(scene, cam, W, H, { az = 45, el = 35, ambient = 0.08 } = {}) {
    const lights = [];
    scene.traverse((o) => { if (o.isLight && o.visible) { lights.push(o); o.visible = false; } });
    const R = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const U = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const B = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2);
    const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
    const dir = R.multiplyScalar(Math.sin(a) * Math.cos(e)).add(U.multiplyScalar(Math.sin(e))).add(B.multiplyScalar(Math.cos(a) * Math.cos(e)));
    const sun = new THREE.DirectionalLight(0xffffff, 2.6);
    sun.position.copy(dir.multiplyScalar(10));
    const amb = new THREE.AmbientLight(0xffffff, ambient);
    scene.add(sun, amb);
    scene.overrideMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    try {
      const r = this.renderer;
      r.setRenderTarget(null);
      r.setClearColor(0x000000, 1);
      r.clear();
      r.render(scene, cam);
      const c = newCanvas(W, H);
      c.getContext('2d').drawImage(r.domElement, 0, 0);
      return c;
    } finally {
      scene.overrideMaterial.dispose();
      scene.overrideMaterial = null;
      scene.remove(sun, amb);
      for (const l of lights) l.visible = true;
    }
  }

  _toCanvas(rgba, W, H) {
    const c = newCanvas(W, H);
    const g = c.getContext('2d');
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
    g.putImageData(new ImageData(rgba, W, H), 0, 0);
    return c;
  }
}
