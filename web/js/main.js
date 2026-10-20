import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { BODY_SLIDERS, BODY_PRESETS, DEFAULT_BODY, HAIR_GROUPS, BEARD_STYLES } from './mannequin.js';
import { POSE_PRESETS, HAND_PRESETS, WING_PRESETS, SIDES, Rig } from './rig.js';
import { Character, buildModel, disposeRoot, characterMeshes, REGION_COLORS, loadAnimationSource } from './characters.js';
import { Outliner } from './outliner.js';
import { SEG_NAMES, segColor, defaultSegClass } from './seg.js';
import { parseOpenPose, fitPerson } from './posefit.js';
import { PassRenderer, projectKeypoints, drawOpenPose } from './passes.js';
import * as Cam from './camera.js';
import { theme } from './theme.js';
import { PropManager } from './props.js';
import { ModalTransform } from './modal.js';
import { LIBRARY } from './library.js';
import { serverUrl } from './base.js';
import { initSideTabs } from './sidetabs.js';
import { buildAttachments, removeAttachments, HORN_STYLES, EAR_STYLES, ATTACH_DEFAULTS } from './attachments.js';
import { RigControls, CONTROL_SCHEMES } from './controls.js';
import { PoseLibrary } from './poselib.js';
import { LightRig, LIGHT_NAMES, LIGHT_PRESETS, drawLightBall, ballToAngles } from './lights.js';
import { slotFrame } from './grip.js';
import { applyEntry, BACK_OFFSET, offsetMatrix } from './poseapply.js';
import { CATALOG, CATEGORIES } from './catalog.js';
import { HAND_SHAPES, setHandShape } from './handshapes.js';
import { closeHand, gripRadius } from './grip.js';

const params = new URLSearchParams(location.search);
const CTX = params.get('ctx') || 'tab'; // 'tab' | 'txt2img' | 'img2img'
const INSTANCE = Math.random().toString(36).slice(2);
const bridge = (() => {
  try { return window.parent !== window ? window.parent.RiggedPose || null : null; } catch { return null; }
})();
const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const SETTINGS_KEY = 'riggedPose.settings.' + CTX;
const SYNC_KEY = 'riggedPose.sync.v1';
const settings = store.get(SETTINGS_KEY, {});
const saveSettings = () => store.set(SETTINGS_KEY, settings);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Side panel tabs (Character, Pose, Props, Camera, Light, Output, Settings).
const sideTabs = initSideTabs({
  side: $('side'), nav: $('sideTabs'), find: $('findSetting'), results: $('findResults'),
  initial: settings.sideTab || 'character',
  onChange: (id) => { settings.sideTab = id; saveSettings(); },
});


// ------------------------------------------------------------------ scene

const canvas = $('view');
const overlay = $('overlay');
// preserveDrawingBuffer: with several view panes only the panes that changed are redrawn.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
// Viewport resolution (captures render separately at full quality).
const RENDER_SCALE = { high: 2, auto: 1.5, fast: 1, fastest: 0.75 };
const viewportPixelRatio = (mode) => {
  const dpr = window.devicePixelRatio || 1;
  return mode === 'fastest' ? 0.75 : Math.min(dpr, RENDER_SCALE[mode] ?? 1.5);
};
renderer.setPixelRatio(viewportPixelRatio('auto'));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const css = getComputedStyle(document.documentElement);
scene.background = new THREE.Color(css.getPropertyValue('--stage').trim() || '#1a1f2b');
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const grid = new THREE.GridHelper(6, 24, 0x888888, 0x555555);
grid.material.transparent = true;
grid.material.opacity = 0.35;
scene.add(grid);

const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
camera.position.set(0, 1.1, 4.2);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.9, 0);
controls.update();
let roll = 0;

// Free work camera, as in Blender/Maya: the shot camera stays where it is while
// you fly around the scene; Numpad 0 looks through the shot camera again.
const viewCam = new THREE.PerspectiveCamera(45, 1, 0.02, 500);
viewCam.position.set(2.6, 2.0, 3.6);
const viewControls = new OrbitControls(viewCam, canvas);
viewControls.target.set(0, 0.9, 0);
viewControls.enabled = false;
viewControls.update();
let lookThrough = true;

// ---- View panes (Maya-style 1 / 2 / 4 views). Each pane shows the shot
// camera, the free perspective camera, or an orthographic front / side / top
// view. The pane under the mouse is the active one: picking, gizmos, keys and
// navigation all work in it, because canvas.getBoundingClientRect() reports
// that pane's rectangle (see viewRect).
const ORTHO = {
  front: { dir: [0, 0, 1], up: [0, 1, 0], label: 'Front' },
  back: { dir: [0, 0, -1], up: [0, 1, 0], label: 'Back' },
  left: { dir: [1, 0, 0], up: [0, 1, 0], label: 'Left side' },
  right: { dir: [-1, 0, 0], up: [0, 1, 0], label: 'Right side' },
  top: { dir: [0, 1, 0], up: [0, 0, -1], label: 'Top' },
  bottom: { dir: [0, -1, 0], up: [0, 0, 1], label: 'Bottom' },
};
const VIEW_LABELS = { camera: 'Camera', persp: 'Perspective', ...Object.fromEntries(Object.entries(ORTHO).map(([k, v]) => [k, v.label])) };
const LAYOUTS = {
  single: [[0, 0, 1, 1]],
  two: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]],
  quad: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
};
const DEFAULT_PANE_VIEWS = { single: ['camera'], two: ['camera', 'persp'], quad: ['camera', 'persp', 'front', 'left'] };
const ORTHO_HALF = 1.2; // half height (m) of an ortho view at zoom 1
let viewLayout = 'single';
let paneViews = JSON.parse(JSON.stringify(DEFAULT_PANE_VIEWS));
let maximizedFrom = null; // layout to return to after Space
const panes = [];
let activePane = 0;
const orthoPool = []; // one ortho camera per pane slot, kept across layout changes

function orthoFor(i) {
  if (!orthoPool[i]) {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 200);
    const target = new THREE.Vector3(0, 0.9, 0);
    orthoPool[i] = { cam, ctl: { target, enabled: true, view: null, update() { orientOrtho(orthoPool[i]); } } };
  }
  return orthoPool[i];
}
function orientOrtho(o) {
  const d = ORTHO[o.ctl.view] || ORTHO.front;
  o.cam.up.set(...d.up);
  o.cam.position.copy(o.ctl.target).add(new THREE.Vector3(...d.dir).multiplyScalar(50));
  o.cam.lookAt(o.ctl.target);
  o.cam.updateProjectionMatrix();
  o.cam.updateMatrixWorld(true);
}
const paneCam = (p) => (p.view === 'camera' ? camera : p.view === 'persp' ? viewCam : orthoFor(p.slot).cam);
const paneControls = (p) => (p.view === 'camera' ? controls : p.view === 'persp' ? viewControls : orthoFor(p.slot).ctl);
const activeCam = () => (panes[activePane] ? paneCam(panes[activePane]) : lookThrough ? camera : viewCam);
const activeControls = () => (panes[activePane] ? paneControls(panes[activePane]) : lookThrough ? controls : viewControls);
// The canvas rectangle only changes with layout(): cache it, because gizmos and
// controls ask for it on every pointer move, and reading layout right after
// the panels changed forces a full reflow each time.
let rectCache = null;
const realRect = () => (rectCache ||= HTMLCanvasElement.prototype.getBoundingClientRect.call(canvas));
window.addEventListener('resize', () => { rectCache = null; });
function viewRect() {
  const r = realRect();
  const p = panes[activePane];
  if (!p) return r;
  return new DOMRect(r.left + p.vp.x, r.top + p.vp.y, p.vp.w, p.vp.h);
}
canvas.getBoundingClientRect = viewRect;
// OrbitControls reads clientWidth / clientHeight on every move: answer from the
// cached pane size, so dragging never forces the WebUI page to reflow.
Object.defineProperty(canvas, 'clientWidth', { get: () => viewRect().width });
Object.defineProperty(canvas, 'clientHeight', { get: () => viewRect().height });
const paneOffset = () => (panes[activePane] ? panes[activePane].vp : { x: 0, y: 0 });
const shotHelper = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf97316 }));
shotHelper.visible = false;
shotHelper.frustumCulled = false;
scene.add(shotHelper);

// Scene lighting (Lighting panel); follows the shot camera when asked to.
const lightRig = new LightRig(scene, () => camera);

const gizmo = new TransformControls(camera, canvas);
gizmo.setMode('rotate');
gizmo.setSpace('local');
gizmo.setSize(0.75);
scene.add(gizmo);

const handles = new THREE.Group();
handles.renderOrder = 999;
scene.add(handles);
const ikTargets = new THREE.Group();
scene.add(ikTargets);

const passes = new PassRenderer();

// Every character in the scene; `rig` / `modelRoot` / `modelSpec` alias the active one.
const characters = [];
let activeChar = null;
let rig = null;
let modelRoot = null;
let modelSpec = { kind: 'mannequin' };
let selected = null; // canonical key or 'ik:<key>'
let ikMode = false;
let dirty = true;
let applyingSync = false;
let lastCapture = null;
let lastKp2 = null;

const requestRender = () => { dirty = true; };
let perfOn = false; // FPS / timing HUD
// Only some panes changed (a free / ortho view moved): redraw just those.
const paneDirty = new Set();
const requestPane = (slot) => { if (panes.length > 1) paneDirty.add(slot); else dirty = true; };
const requestView = (view) => { if (panes.length > 1) { for (const p of panes) if (p.view === view) paneDirty.add(p.slot); } else dirty = true; };

theme.onChange((t) => {
  scene.background = t.stage.clone();
  shotHelper.material.color.copy(t.accent);
  requestRender();
});
theme.watch();

// ------------------------------------------------------------------ output size / layout

const outW = $('outW'), outH = $('outH');
const size = () => ({ W: Math.max(64, +outW.value || 512), H: Math.max(64, +outH.value || 512) });

function layout() {
  const stage = $('stage');
  const { W, H } = size();
  const cw = stage.clientWidth, ch = stage.clientHeight;
  if (!cw || !ch) return;
  const a = W / H;
  let w = cw - 16, h = ch - 16;
  const multi = viewLayout !== 'single';
  if (lookThrough && !multi) { if (w / h > a) w = h * a; else h = w / a; }
  w = Math.max(32, Math.floor(w)); h = Math.max(32, Math.floor(h));
  renderer.setSize(w, h, false);
  rectCache = null;
  layoutPanes(w, h, a);
  canvas.style.width = overlay.style.width = w + 'px';
  queueMicrotask(() => { rectCache = null; });
  canvas.style.height = overlay.style.height = h + 'px';
  const dpr = renderer.getPixelRatio();
  overlay.width = Math.round(w * dpr);
  overlay.height = Math.round(h * dpr);
  camera.aspect = a;
  camera.updateProjectionMatrix();
  viewCam.aspect = panes[0] && !multi ? panes[0].vp.w / panes[0].vp.h : w / h;
  viewCam.updateProjectionMatrix();
  if (settings.shot?.lens > 0) applyLens();
  updateViewHud();
  requestRender();
}

function layoutPanes(w, h, aspect) {
  const rects = LAYOUTS[viewLayout];
  const views = paneViews[viewLayout];
  panes.length = 0;
  rects.forEach(([fx, fy, fw, fh], i) => {
    const rect = { x: Math.round(fx * w), y: Math.round(fy * h), w: Math.round(fw * w), h: Math.round(fh * h) };
    const p = { slot: i, view: views[i] || 'persp', rect, vp: { ...rect } };
    if (p.view === 'camera' && rects.length > 1) {
      // Letterbox the shot camera to the output aspect inside its pane.
      let vw = rect.w - 4, vh = rect.h - 4;
      if (vw / vh > aspect) vw = vh * aspect; else vh = vw / aspect;
      p.vp = { x: Math.round(rect.x + (rect.w - vw) / 2), y: Math.round(rect.y + (rect.h - vh) / 2), w: Math.round(vw), h: Math.round(vh) };
    }
    if (ORTHO[p.view]) {
      const o = orthoFor(i);
      if (o.ctl.view !== p.view) { o.ctl.view = p.view; if (rig) o.ctl.target.copy(rig.bounds().center); }
      const asp = p.vp.w / Math.max(1, p.vp.h);
      Object.assign(o.cam, { left: -ORTHO_HALF * asp, right: ORTHO_HALF * asp, top: ORTHO_HALF, bottom: -ORTHO_HALF });
      orientOrtho(o);
    }
    panes.push(p);
  });
  activePane = Math.min(activePane, panes.length - 1);
  updatePaneUI();
}

function updatePaneUI() {
  const box = $('panes');
  if (!box) return;
  const multi = panes.length > 1;
  Object.assign(box.style, { left: canvas.offsetLeft + 'px', top: canvas.offsetTop + 'px', width: canvas.style.width, height: canvas.style.height });
  if (box.children.length !== panes.length) {
    box.innerHTML = '';
    panes.forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'pane';
      const sel = document.createElement('select');
      sel.className = 'pane-view';
      sel.title = 'What this pane shows';
      for (const [v, label] of Object.entries(VIEW_LABELS)) sel.add(new Option(label, v));
      sel.addEventListener('change', () => setPaneView(i, sel.value));
      sel.addEventListener('pointerdown', (e) => e.stopPropagation());
      d.append(sel);
      box.append(d);
    });
  }
  panes.forEach((p, i) => {
    const d = box.children[i];
    Object.assign(d.style, { left: p.rect.x + 'px', top: p.rect.y + 'px', width: p.rect.w + 'px', height: p.rect.h + 'px' });
    d.classList.toggle('active', multi && i === activePane);
    d.classList.toggle('multi', multi);
    d.querySelector('select').value = p.view;
  });
}

function paneAt(clientX, clientY) {
  const r = realRect();
  const x = clientX - r.left, y = clientY - r.top;
  return panes.findIndex((p) => x >= p.rect.x && x < p.rect.x + p.rect.w && y >= p.rect.y && y < p.rect.y + p.rect.h);
}

// Make a pane the active one: cameras for picking / gizmos, navigation, HUD.
function setActivePane(i, { force = false } = {}) {
  if (i < 0 || i >= panes.length || (i === activePane && !force)) return;
  activePane = i;
  const was = lookThrough, wasDirty = dirty;
  lookThrough = panes[i].view === 'camera';
  syncPaneControls();
  // Only the pane border (HTML) changes; the gizmo camera swap is not worth a redraw.
  dirty = wasDirty || force;
  if (was !== lookThrough) outliner.refresh();
  $('camView').classList.toggle('on', lookThrough);
  updatePaneUI();
  updateViewHud();
}
function syncPaneControls() {
  const v = panes[activePane]?.view;
  controls.enabled = v === 'camera' && !cropMode && !boxMode && !camLocked();
  viewControls.enabled = v === 'persp' && !boxMode;
  gizmo.camera = activeCam();
  props.setCamera(activeCam());
  applyNav();
}

function setPaneView(i, view) {
  paneViews[viewLayout][i] = view;
  if (view === 'persp' && !viewInit) initViewCam();
  settings.paneViews = paneViews;
  saveSettings();
  activePane = i;
  lookThrough = view === 'camera';
  layout();
  setActivePane(i, { force: true });
}

function setViewLayout(name, { keepMax = false } = {}) {
  if (!LAYOUTS[name]) return;
  if (!keepMax) maximizedFrom = null;
  viewLayout = name;
  if (paneViews[name].includes('persp') && !viewInit) initViewCam();
  settings.viewLayout = name;
  saveSettings();
  document.querySelectorAll('#viewLayouts [data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === name));
  activePane = Math.min(activePane, LAYOUTS[name].length - 1);
  lookThrough = paneViews[name][activePane] === 'camera';
  layout();
  setActivePane(activePane, { force: true });
}
document.querySelectorAll('#viewLayouts [data-layout]').forEach((b) => b.addEventListener('click', () => setViewLayout(b.dataset.layout)));

// Space (Maya): maximise the pane under the mouse, Space again to go back.
function toggleMaximize() {
  if (viewLayout === 'single' && maximizedFrom) {
    const from = maximizedFrom;
    maximizedFrom = null;
    return setViewLayout(from);
  }
  if (viewLayout === 'single') return toast('Choose 2 or 4 views first (toolbar)');
  const p = panes[activePane];
  if (ORTHO[p.view]) {
    const src = orthoFor(p.slot), dst = orthoFor(0);
    dst.ctl.target.copy(src.ctl.target); dst.cam.zoom = src.cam.zoom; dst.ctl.view = p.view;
  }
  maximizedFrom = viewLayout;
  paneViews.single[0] = p.view;
  activePane = 0;
  setViewLayout('single', { keepMax: true });
}

// The pane under the pointer becomes active before any control sees the event.
for (const type of ['pointerdown', 'wheel', 'pointermove']) {
  $('viewport').addEventListener(type, (e) => {
    if (panes.length <= 1 || modal.active || gizmo.dragging || props.gizmo.dragging || orthoDrag || cropDrag || boxSel) return;
    if (type === 'pointermove' && e.buttons) return;
    const i = paneAt(e.clientX, e.clientY);
    if (i >= 0 && i !== activePane) setActivePane(i);
  }, { capture: true, passive: true });
}

// Ortho panes: pan with the middle / right button (or Alt + any), wheel zooms at the cursor.
let orthoDrag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = panes[activePane];
  if (!p || !ORTHO[p.view] || boxMode || cropMode) return;
  if (!(e.button === 1 || e.button === 2 || e.altKey)) return;
  if (gizmo.axis || props.gizmo.axis) return;
  orthoDrag = { x: e.clientX, y: e.clientY, alt: e.altKey && e.button === 2 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!orthoDrag) return;
  const o = orthoFor(panes[activePane].slot), cam = o.cam;
  const dx = e.clientX - orthoDrag.x, dy = e.clientY - orthoDrag.y;
  orthoDrag.x = e.clientX; orthoDrag.y = e.clientY;
  if (orthoDrag.alt) { cam.zoom = THREE.MathUtils.clamp(cam.zoom * Math.exp(-dy * 0.01), 0.05, 200); cam.updateProjectionMatrix(); return requestPane(panes[activePane].slot); }
  const perPx = (cam.top - cam.bottom) / cam.zoom / panes[activePane].vp.h;
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
  o.ctl.target.addScaledVector(right, -dx * perPx).addScaledVector(up, dy * perPx);
  orientOrtho(o);
  requestPane(panes[activePane].slot);
});
canvas.addEventListener('pointerup', () => { orthoDrag = null; });
canvas.addEventListener('contextmenu', (e) => { if (ORTHO[panes[activePane]?.view]) e.preventDefault(); });
canvas.addEventListener('wheel', (e) => {
  const p = panes[activePane];
  if (!p || !ORTHO[p.view]) return;
  e.preventDefault();
  const o = orthoFor(p.slot), cam = o.cam;
  const r = viewRect();
  const ndc = new THREE.Vector3(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, 0);
  const before = ndc.clone().unproject(cam);
  cam.zoom = THREE.MathUtils.clamp(cam.zoom * Math.exp(-e.deltaY * 0.0015), 0.05, 200);
  cam.updateProjectionMatrix();
  const after = ndc.clone().unproject(cam);
  o.ctl.target.add(before.sub(after));
  orientOrtho(o);
  requestPane(p.slot);
}, { passive: false });
new ResizeObserver(layout).observe($('stage'));

function followTarget() {
  return CTX === 'tab' ? $('targetTab').value : CTX;
}

function pollSize() {
  if (!$('followSize').checked || !bridge?.getSize) return;
  const s = bridge.getSize(followTarget());
  if (s && s.w && s.h && (s.w !== +outW.value || s.h !== +outH.value)) {
    outW.value = s.w; outH.value = s.h;
    layout();
  }
}
setInterval(pollSize, 1000);

// ------------------------------------------------------------------ toast

let toastT;
function toast(msg, err = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = err ? 'err' : '';
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, err ? 6000 : 2500);
}

// ------------------------------------------------------------------ model loading

// ------------------------------------------------------------------ mesh colours

// A character can wear its colour (outliner dot / region colour) over its
// materials; "Colour IDs" does that for everyone and gives every prop a
// colour of its own, to tell people and objects apart in a busy scene.
let colorCodeOn = false;
const PROP_ID_COLORS = [0xffe119, 0x469990, 0xdcbeff, 0x9a6324, 0xaaffc3, 0x800000, 0x808000, 0xffd8b1, 0x000075, 0xfabed4, 0x00c2a8, 0xff7f50];
const TINT_MIX = 0.72;
function applyCharacterColor(c) {
  if (!c.root) return;
  const on = colorCodeOn || !!c.tint;
  const tint = new THREE.Color(c.color);
  c.root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [o.material].flat()) {
      if (!m?.color) continue;
      m.userData.baseColor ??= m.color.getHex();
      m.color.setHex(m.userData.baseColor);
      if (on) m.color.lerp(tint, TINT_MIX);
    }
  });
  c.root.userData.tinted = on + c.color;
  requestRender();
}
function propIdColor(m) {
  if (!colorCodeOn) return null;
  return PROP_ID_COLORS[props.meshes.indexOf(m) % PROP_ID_COLORS.length];
}
function setColorCode(on) {
  colorCodeOn = on;
  settings.colorCode = on;
  saveSettings();
  $('colorCodeBtn').classList.toggle('on', on);
  characters.forEach(applyCharacterColor);
  props.refreshColors();
  outliner.refresh();
}
// One hidden colour input serves every "Change colour…" menu entry.
function pickColor(initial, done) {
  const el = $('pickColor');
  el.value = initial;
  el.oninput = () => done(el.value);
  el.click();
}

// ------------------------------------------------------------------ extras (any model)

// Horns, animal ears and (for models other than the mannequin) genitals,
// stored per character in c.attach.
const hasExtras = (a) => !!a && Object.entries(a).some(([k, v]) => ['genitals', 'horns', 'ears'].includes(k) && v && v !== 'none');
function buildCharacterExtras(c) {
  if (!c.rig) return;
  const pose = c.rig.getPose();
  c.rig.resetAll();
  c.root.updateMatrixWorld(true);
  try {
    const hair = c.spec?.kind === 'mannequin' ? 0x4a3d35 : 0x3b2f28;
    buildAttachments(c.root, c.rig, c.attach || {}, { skipGenitals: c.spec?.kind === 'mannequin', hairColor: hair });
  } catch (e) { console.warn('extras', e); }
  c.rig.setPose(pose);
  applyCharacterColor(c);
}
function setExtras(patch) {
  const c = activeChar;
  if (!c) return;
  c.attach = { ...ATTACH_DEFAULTS, ...(c.attach || {}), ...patch };
  if (hasExtras(c.attach)) buildCharacterExtras(c); else removeAttachments(c.root);
  syncExtrasUI();
  requestRender();
  queueCharSave();
  queueSync();
}
function syncExtrasUI() {
  const a = { ...ATTACH_DEFAULTS, ...(activeChar?.attach || {}) };
  $('xHorns').value = a.horns;
  $('xEars').value = a.ears;
  $('xGenitals').value = a.genitals;
  $('xErect').value = a.erect ? '1' : '0';
  $('xGSize').value = a.gSize;
  $('xGSizeOut').textContent = Math.round(a.gSize * 100);
  $('xPubic').checked = !!a.pubic;
  $('xGenitalsBox').hidden = activeChar?.spec?.kind === 'mannequin';
  $('xErectRow').hidden = a.genitals !== 'male';
  $('xGSizeRow').hidden = a.genitals === 'none';
}
for (const [v, l] of HORN_STYLES) $('xHorns').add(new Option(l, v));
for (const [v, l] of EAR_STYLES) $('xEars').add(new Option(l, v));
$('xHorns').addEventListener('change', (e) => setExtras({ horns: e.target.value }));
$('xEars').addEventListener('change', (e) => setExtras({ ears: e.target.value }));
$('xGenitals').addEventListener('change', (e) => setExtras({ genitals: e.target.value }));
$('xErect').addEventListener('change', (e) => setExtras({ erect: e.target.value === '1' }));
$('xGSize').addEventListener('input', (e) => { $('xGSizeOut').textContent = Math.round(e.target.value * 100); });
$('xGSize').addEventListener('change', (e) => setExtras({ gSize: +e.target.value }));
$('xPubic').addEventListener('change', (e) => setExtras({ pubic: e.target.checked }));

// Load (or replace) the model of a character; the active one by default.
async function loadModel(spec, { keepPose = true, character = activeChar, pose = null } = {}) {
  const c = character || newCharacter();
  const prevPose = pose || (keepPose && c.rig ? c.rig.getPose() : null);
  let built;
  try {
    built = await buildModel(spec);
  } catch (e) {
    console.error(e);
    toast('Could not load model: ' + (e.message || e), true);
    return false;
  }
  if (c === activeChar) gizmo.detach();
  disposeRoot(c.root);
  Object.assign(c, { root: built.root, rig: built.rig, mapping: built.mapping, spec: built.spec, clips: built.clips || [], animObj: built.animObj, mixer: null });
  c.root.visible = c.visible;
  c.root.userData.character = c;
  scene.add(c.root);
  if (hasExtras(c.attach)) buildCharacterExtras(c);
  applyCharacterColor(c);
  const r = c.rig;
  if (prevPose) {
    r.setPose(prevPose);
    // Newly added extras (e.g. a second arm pair) start from their default pose.
    const fresh = Object.fromEntries(Object.entries(r.extraDefaults).filter(([k]) => !prevPose.bones[k]));
    r.applyDirections(fresh, { reset: false, defaults: false });
  } else if (r.isTPose) {
    r.applyDirections(POSE_PRESETS.Relaxed);
  }
  if (!characters.includes(c)) characters.push(c);
  if (c === activeChar || !activeChar) {
    const keep = selected && !selected.startsWith('ik:') && r.map[selected] ? selected : null;
    setActiveCharacter(c, { keepSelection: true });
    select(keep);
  } else {
    outliner.refresh();
  }
  queueCharSave();
  requestRender();
  return true;
}

function describeModel(mapping) {
  const fingers = SIDES.reduce((n, s) => n + Object.keys(rig.fingers[s]).length, 0);
  const name = modelSpec.kind === 'mannequin' ? 'Built-in mannequin' : modelSpec.name || modelSpec.url;
  const body = rig.order.filter((k) => !rig.isFingerKey(k)).length;
  const missing = ['neck', 'leftLowerArm', 'rightLowerArm', 'leftHand', 'rightHand', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot']
    .filter((k) => !rig.map[k]);
  const extras = rig.extras.length ? `, ${rig.extras.length} extra bones` : '';
  $('modelInfo').textContent = `${name}: ${body - rig.extras.length} body bones${extras}, ${fingers}/10 fingers` +
    (missing.length ? `. Missing: ${missing.join(', ')}` : '') + (mapping.bones && fingers === 0 ? '. No finger bones: OpenPose hands disabled for this model.' : '');
}

// Rigged in Blender from the Human Base Meshes bundle (see models/README.txt).
const BASE_MESHES = [['Female · realistic', 'models/hbm_female.glb'], ['Male · realistic', 'models/hbm_male.glb']];

async function refreshModelList() {
  const sel = $('modelSelect');
  sel.innerHTML = '';
  sel.add(new Option('Built-in mannequin', 'mannequin'));
  const base = document.createElement('optgroup');
  base.label = 'Base meshes (Blender Studio, CC0)';
  for (const [name, url] of BASE_MESHES) base.append(new Option(name, url));
  sel.append(base);
  try {
    const res = await fetch(serverUrl('../rigged-pose-api/models'));
    if (res.ok) {
      const list = await res.json();
      for (const m of list) sel.add(new Option(m.name, m.url));
    }
  } catch { /* standalone preview without the WebUI backend */ }
  sel.value = modelSpec.kind === 'url' ? modelSpec.url : 'mannequin';
}

$('modelSelect').addEventListener('change', async (e) => {
  const v = e.target.value;
  const spec = v === 'mannequin' ? { kind: 'mannequin', opts: { ...bodyOpts } } : { kind: 'url', url: v, name: e.target.selectedOptions[0].text };
  if (await loadModel(spec)) queueSync();
});
$('modelFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (f) await loadModel({ kind: 'file', file: f, name: f.name });
  e.target.value = '';
});

// ------------------------------------------------------------------ body panel (mannequin)

const legacyModel = settings.characters?.[0]?.spec || settings.model;
let bodyOpts = { ...DEFAULT_BODY, ...(legacyModel?.kind === 'mannequin' ? legacyModel.opts : {}) };
const bodyInputs = {};

for (const [name, preset] of Object.entries(BODY_PRESETS)) {
  const btn = document.createElement('button');
  btn.textContent = name;
  btn.addEventListener('click', () => { Object.assign(bodyOpts, preset); syncBodyUI(false); rebuildBody(); });
  $('bodyPresets').append(btn);
}
for (const [key, label] of BODY_SLIDERS) {
  const l = document.createElement('label');
  l.textContent = label + ' ';
  const out = document.createElement('output');
  const r = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 1, step: 0.01 });
  // High detail takes a moment to build: rebuild when the slider is released.
  r.addEventListener('input', () => { bodyOpts[key] = +r.value; out.textContent = Math.round(r.value * 100); if (bodyOpts.detail !== 'high') queueRebuild(); });
  r.addEventListener('change', () => { if (bodyOpts.detail === 'high') rebuildBody(); });
  l.append(out, r);
  $('bodySliders').append(l);
  bodyInputs[key] = { r, out };
}
for (const [label, list] of HAIR_GROUPS) {
  const parent = label ? Object.assign(document.createElement('optgroup'), { label }) : $('bHair');
  for (const [v, text] of list) parent.append(new Option(text, v));
  if (label) $('bHair').append(parent);
}
for (const [v, text] of BEARD_STYLES) $('bBeard').add(new Option(text, v));
const bodyFields = {
  bDetail: ['detail', (v) => v],
  bGenitals: ['genitals', (v) => v], bErect: ['erect', (v) => v === '1'], bGSize: ['gSize', Number],
  bNipples: ['nipples', null], bPubic: ['pubic', null], bHair: ['hair', (v) => v], bBangs: ['bangs', null], bBeard: ['beard', (v) => v],
  bArms: ['arms', Number], bWings: ['wings', (v) => v], bTail: ['tail', null],
};
for (const [id, [key, conv]] of Object.entries(bodyFields)) {
  const el = $(id);
  el.addEventListener(el.type === 'range' ? 'input' : 'change', () => {
    bodyOpts[key] = conv ? conv(el.value) : el.checked;
    syncBodyUI(false);
    if (el.type !== 'range') rebuildBody();
    else if (bodyOpts.detail !== 'high') queueRebuild();
  });
  if (el.type === 'range') el.addEventListener('change', () => { if (bodyOpts.detail === 'high') rebuildBody(); });
}
for (const name of Object.keys(WING_PRESETS)) {
  const btn = document.createElement('button');
  btn.textContent = 'Wings: ' + name;
  btn.addEventListener('click', () => {
    if (!rig?.map.leftWing0) return;
    pushUndo();
    rig.applyDirections(WING_PRESETS[name], { reset: false, defaults: false });
    poseChanged();
  });
  $('wingPresets').append(btn);
}

// fromModel: take the options of the loaded mannequin (after a load or a sync).
function syncBodyUI(fromModel = true) {
  const isMannequin = modelSpec.kind === 'mannequin';
  $('bodyPanel').dataset.forceHidden = isMannequin ? '0' : '1';
  $('bodyPanel').hidden = !isMannequin || sideTabs.current !== 'character';
  syncExtrasUI();
  if (fromModel && isMannequin && modelSpec.opts) bodyOpts = { ...DEFAULT_BODY, ...modelSpec.opts };
  for (const [key] of BODY_SLIDERS) {
    bodyInputs[key].r.value = bodyOpts[key];
    bodyInputs[key].out.textContent = Math.round(bodyOpts[key] * 100);
  }
  for (const [id, [key]] of Object.entries(bodyFields)) {
    const el = $(id);
    if (el.type === 'checkbox') el.checked = !!bodyOpts[key];
    else if (key === 'erect') el.value = bodyOpts.erect ? '1' : '0';
    else el.value = String(bodyOpts[key]);
  }
  $('bGSizeOut').textContent = Math.round(bodyOpts.gSize * 100);
  $('bErectRow').hidden = bodyOpts.genitals !== 'male';
  $('bGSizeRow').hidden = bodyOpts.genitals === 'none';
  $('wingPresets').hidden = bodyOpts.wings === 'none';
}

let rebuilding = null;
async function rebuildBody() {
  if (rebuilding) { rebuilding.again = true; return; }
  rebuilding = { again: false };
  try {
    do {
      rebuilding.again = false;
      const spec = { kind: 'mannequin', opts: { ...bodyOpts } };
      if (bodyOpts.detail === 'high') {
        toast('Building high-detail body…');
        await new Promise((r) => setTimeout(r, 30)); // let the toast paint
      }
      if (await loadModel(spec, { keepPose: true })) {
        $('modelSelect').value = 'mannequin';
        queueSync();
      }
    } while (rebuilding.again);
  } finally {
    rebuilding = null;
  }
}
const queueRebuild = debounce(rebuildBody, 120);

// ------------------------------------------------------------------ characters

function uniqueName(base) {
  const names = new Set(characters.map((c) => c.name));
  if (!names.has(base)) return base;
  for (let i = 2; ; i++) if (!names.has(`${base} ${i}`)) return `${base} ${i}`;
}

function newCharacter(name) {
  const used = new Set(characters.map((c) => c.color));
  const color = REGION_COLORS.find((c) => !used.has(c)) || REGION_COLORS[characters.length % REGION_COLORS.length];
  return new Character({ name: uniqueName(name || 'Character'), color });
}

function setActiveCharacter(c, { keepSelection = false } = {}) {
  const changed = c !== activeChar;
  activeChar = c || null;
  rig = c?.rig || null;
  modelRoot = c?.root || null;
  modelSpec = c?.spec || { kind: 'mannequin' };
  if (changed && !keepSelection) select(null);
  if (rig) {
    buildHandles();
    if (ikMode) placeIkTargets();
    describeModel(c.mapping);
  } else {
    handles.clear();
  }
  syncBodyUI();
  syncFaceUI();
  if (changed) { setAnimPlaying?.(false); anim = null; }
  queueLightSubject();
  refreshClipList();
  $('modelSelect').value = modelSpec.kind === 'url' ? modelSpec.url : 'mannequin';
  outliner.refresh();
  requestRender();
  queueCameraChange();
}

function visibleRigs() {
  return characters.filter((c) => c.visible && c.rig).map((c) => c.rig);
}

async function addCharacter(spec, { pose, name, activate = true } = {}) {
  const c = newCharacter(name);
  if (!(await loadModel(spec, { character: c, keepPose: false, pose }))) return null;
  if (!pose) {
    // Stand to the right of everyone else.
    const xs = characters.filter((o) => o !== c && o.rig).map((o) => o.rig.map.hips.getWorldPosition(new THREE.Vector3()).x);
    if (xs.length) {
      const p = c.rig.getPose();
      p.hips = [(Math.max(...xs) + 0.85) / c.rig.height, p.hips[1], p.hips[2]];
      c.rig.setPose(p);
    }
  }
  if (activate) setActiveCharacter(c);
  queueCharSave();
  queueSync();
  requestRender();
  return c;
}

function duplicateCharacter(c) {
  if (!c?.rig) return;
  if (c.spec.kind === 'file') return toast('Re-open the model file to add another copy', true);
  const pose = c.rig.getPose();
  pose.hips = [pose.hips[0] + 0.85 / c.rig.height, pose.hips[1], pose.hips[2]];
  return addCharacter(c.spec, { pose, name: c.name });
}

function removeCharacter(c) {
  if (characters.length <= 1) return toast('The scene needs at least one character', true);
  disposeRoot(c.root);
  characters.splice(characters.indexOf(c), 1);
  for (const st of [undoStack, redoStack]) for (let i = st.length - 1; i >= 0; i--) if (st[i].id === c.id) st.splice(i, 1);
  if (c === activeChar) setActiveCharacter(characters[0]);
  else outliner.refresh();
  queueCharSave();
  queueSync();
  requestRender();
}

function serializeCharacters() {
  return characters.map((c) => ({
    id: c.id, name: c.name, color: c.color, visible: c.visible, locked: c.locked, tint: !!c.tint, attach: c.attach || null,
    spec: c.spec?.kind === 'file' ? null : c.spec, pose: c.rig?.getPose() || null,
  }));
}

// Reconcile the scene with a saved/synced character list.
async function restoreCharacters(list, activeId) {
  for (const c of [...characters]) {
    if (!list.some((d) => d.id === c.id) && c.spec?.kind !== 'file') {
      disposeRoot(c.root);
      characters.splice(characters.indexOf(c), 1);
    }
  }
  for (const d of list) {
    let c = characters.find((x) => x.id === d.id);
    if (!c) {
      if (!d.spec) continue;
      c = new Character({ id: d.id, name: d.name, color: d.color });
      c.attach = d.attach || null;
      if (!(await loadModel(d.spec, { character: c, keepPose: false, pose: d.pose }))) continue;
    } else if (d.spec && JSON.stringify(d.spec) !== JSON.stringify(c.spec)) {
      await loadModel(d.spec, { character: c, pose: d.pose });
    } else if (d.pose && c.rig) {
      c.rig.setPose(d.pose);
    }
    c.name = d.name || c.name;
    if (JSON.stringify(d.attach || null) !== JSON.stringify(c.attach || null)) {
      c.attach = d.attach || null;
      if (hasExtras(c.attach)) buildCharacterExtras(c); else if (c.root) removeAttachments(c.root);
    }
    c.color = d.color || c.color;
    c.locked = !!d.locked;
    if (!!d.tint !== !!c.tint || c.root?.userData.tinted !== (colorCodeOn || !!d.tint) + c.color) { c.tint = !!d.tint; applyCharacterColor(c); }
    c.setVisible(d.visible !== false);
  }
  const order = (c) => { const i = list.findIndex((d) => d.id === c.id); return i < 0 ? 1e9 : i; };
  characters.sort((a, b) => order(a) - order(b));
  setActiveCharacter(characters.find((c) => c.id === activeId) || (characters.includes(activeChar) ? activeChar : characters[0]) || null,
    { keepSelection: activeChar?.id === activeId });
}

// Flush pending saves if the tab is closed right after an edit.
window.addEventListener('pagehide', () => {
  if (!characters.length) return;
  settings.characters = serializeCharacters();
  settings.activeChar = activeChar?.id;
  settings.props = props.serialize();
  saveSettings();
  if (!applyingSync) syncNow({ force: true });
});

const queueCharSave = debounce(() => {
  settings.characters = serializeCharacters();
  settings.activeChar = activeChar?.id;
  delete settings.model;
  saveSettings();
}, 400);

// ------------------------------------------------------------------ outliner

const outliner = new Outliner($('outliner'), {
  characters: () => characters.map((c) => ({
    name: c.name + (c.spec?.kind === 'mannequin' ? '' : ' · ' + (c.spec?.name || 'model')),
    color: c.color, active: c === activeChar && appMode === 'pose', selected: c === activeChar,
    visible: c.visible, locked: c.locked, hint: 'Click to pose this character',
    onSelect: () => { setAppMode('pose'); setActiveCharacter(c); },
    onRename: (n) => { c.name = n; outliner.refresh(); queueCharSave(); queueSync(); },
    onToggleVisible: () => { c.setVisible(!c.visible); if (c === activeChar) select(null); outliner.refresh(); requestRender(); queueCharSave(); queueSync(); },
    onToggleLock: () => { c.locked = !c.locked; if (c === activeChar) select(null); outliner.refresh(); requestRender(); queueCharSave(); queueSync(); },
    menu: [
      { label: c.tint ? 'Show its own materials' : 'Paint it with its colour', fn: () => { c.tint = !c.tint; applyCharacterColor(c); outliner.refresh(); queueCharSave(); queueSync(); } },
      { label: 'Change colour…', fn: () => pickColor(c.color, (v) => { c.color = v; applyCharacterColor(c); outliner.refresh(); queueCharSave(); queueSync(); }) },
      { label: 'Duplicate', fn: () => duplicateCharacter(c) },
      { label: 'Frame in camera', fn: () => { setActiveCharacter(c); $('shotSubject').value = 'active'; frameShot(); } },
      { label: 'Reset pose', fn: () => { setActiveCharacter(c); pushUndo(); c.rig.applyDirections(POSE_PRESETS.Relaxed); poseChanged(); } },
      { label: 'Delete', danger: true, fn: () => { if (confirm(`Delete ${c.name}?`)) removeCharacter(c); } },
    ],
  })),
  props: () => props.meshes.map((m) => ({
    name: m.name + (m.userData.held ? ` · ${SLOT_NAMES[m.userData.held.slot]}` : ''), env: !!m.userData.env, color: '#' + (propIdColor(m) ?? m.userData.color).toString(16).padStart(6, '0'),
    active: appMode !== 'pose' && m === props.active, selected: appMode !== 'pose' && props.selected.has(m),
    visible: m.visible, locked: !!m.userData.locked,
    onSelect: (add) => {
      if (m.userData.locked) return toast('Unlock it first (lock icon)');
      if (appMode === 'pose') setAppMode('object');
      if (appMode === 'edit' && m !== props.active) setAppMode('object');
      if (!m.visible) m.visible = true;
      props.selectObjects([m], add);
      refreshXform();
      outliner.refresh();
    },
    onRename: (n) => props.rename(m, n),
    onToggleVisible: () => { m.visible = !m.visible; if (!m.visible) props.selected.delete(m); props._changed(); },
    onToggleLock: () => props.setFlag(m, 'locked', !m.userData.locked),
    menu: [
      ...(activeChar && !m.userData.env ? [
        { label: `Hold in right hand (${activeChar.name})`, fn: () => holdProp(m, activeChar, 'right') },
        { label: `Hold in left hand (${activeChar.name})`, fn: () => holdProp(m, activeChar, 'left') },
        ...(m.userData.grip?.hand === 'back' ? [{ label: `Wear on the back (${activeChar.name})`, fn: () => holdProp(m, activeChar, 'back') }] : []),
      ] : []),
      ...(m.userData.held ? [{ label: 'Let go (stays where it is)', fn: () => releaseProp(m) }] : []),
      { label: 'Change colour…', fn: () => pickColor('#' + m.userData.color.toString(16).padStart(6, '0'), (v) => { props.selectObjects([m]); props.setColor(parseInt(v.slice(1), 16)); }) },
      { label: m.userData.env ? 'Move to Props' : 'Move to Environment', fn: () => props.setFlag(m, 'env', !m.userData.env) },
      { label: 'Duplicate', fn: () => { setAppMode('object'); props.selectObjects([m]); props.duplicate(); } },
      { label: 'Drop to floor', fn: () => { props.selectObjects([m]); props.dropToFloor(); } },
      { label: 'Delete', danger: true, fn: () => { props.selectObjects([m]); props.deleteObjects(); } },
    ],
  })),
  cameras: () => shotCams.map((c, i) => {
    const on = c.id === activeCamId;
    return {
      name: c.name + (on ? (lookThrough ? ' · viewing' : ' · active') : ''),
      color: on ? getComputedStyle(document.documentElement).getPropertyValue('--accent') : CAM_COLORS[i % CAM_COLORS.length],
      active: on && lookThrough, selected: on, visible: c.visible, locked: c.locked,
      hint: on ? 'Active camera: renders the output. Click to look through it (Numpad 0)' : 'Click to make this the active camera and look through it',
      onSelect: () => { if (on) setLookThrough(!lookThrough); else { switchCamera(c.id); setLookThrough(true); } },
      onRename: (n) => { c.name = n; camsChanged(); },
      onToggleVisible: () => { c.visible = !c.visible; camsChanged(); },
      onToggleLock: () => { c.locked = !c.locked; if (on && c.locked && selected?.startsWith('cam')) select(null); camsChanged(); },
      menu: [
        { label: 'Look through', fn: () => { switchCamera(c.id); setLookThrough(true); } },
        { label: 'Move / turn it', fn: () => { switchCamera(c.id); selectCamera('cam'); } },
        { label: 'Frame active character', fn: () => { switchCamera(c.id); frameShot(); } },
        { label: 'Align to free view', fn: () => { switchCamera(c.id); if (!viewInit) initViewCam(); alignCamToView(); } },
        { label: 'Duplicate', fn: () => addCamera(c) },
        { label: 'Delete', danger: true, fn: () => deleteCamera(c) },
      ],
    };
  }),
  onAddCamera: () => addCamera(),
  onAddCharacter: () => addCharacter({ kind: 'mannequin', opts: { ...(activeChar?.spec?.opts || bodyOpts) } }),
  onAddProp: () => { sideTabs.setTab('props'); $('propCat').focus(); },
  onLayout: (l) => { settings.outliner = { ...(settings.outliner || {}), ...l }; saveSettings(); },
});
outliner.place(settings.outliner);

// ------------------------------------------------------------------ handles & selection

// IK targets keep these colours; bone controls use the scheme from controls.js.
const COLORS = { left: 0x3b82f6, right: 0xef4444, center: 0xfacc15, extra: 0xa855f7, sel: 0xffffff };
const rigControls = new RigControls(handles);
let controlsShown = true;

function buildHandles() {
  rigControls.build(rig);
}

function updateHandles() {
  if (!rig) return;
  handles.visible = controlsShown && appMode === 'pose' && activeChar.visible && !activeChar.locked;
  if (!handles.visible) return;
  rigControls.update({
    selected, showFingers: $('fingerHandles').checked, ikMode,
    resolution: renderer.getDrawingBufferSize(new THREE.Vector2()),
  });
}

// One key (H) shows / hides the rig controls; the selected bone keeps its gizmo.
function setControlsShown(on) {
  controlsShown = on;
  if (!on) handles.visible = false;
  $('ctrlToggle').classList.toggle('on', on);
  settings.controlsShown = on;
  saveSettings();
  requestRender();
}

// Click on the active character's body: select the bone nearest to the hit.
function nearestBone(point) {
  let best = null, bestD = Infinity;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), seg = new THREE.Line3(), q = new THREE.Vector3();
  for (const k of rig.order) {
    if (rig.isFingerKey(k) && !$('fingerHandles').checked) continue;
    const child = rigControls._child(k);
    rig.map[k].getWorldPosition(a);
    if (child) child.getWorldPosition(b); else b.copy(a);
    seg.set(a, b).closestPointToPoint(point, true, q);
    const d = q.distanceTo(point) * (k === 'hips' ? 1.6 : 1);
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
}

function select(key) {
  selected = key;
  if (!key) {
    gizmo.detach();
    $('sel').textContent = 'No bone selected';
  } else if (key.startsWith('light:')) {
    const n = key.slice(6);
    lightProxy.position.copy(lightRig.handles.children[LIGHT_NAMES.indexOf(n)].userData.bulb.position);
    lightProxy.updateMatrixWorld(true);
    gizmo.setMode('translate');
    gizmo.setSpace('world');
    gizmo.attach(lightProxy);
    $('sel').textContent = `${n[0].toUpperCase() + n.slice(1)} light (drag around the subject)`;
    setActiveLight(n);
  } else if (key === 'cam' || key === 'cam:aim') {
    placeCamProxies();
    const aim = key === 'cam:aim';
    const mode = aim || currentMode === 'translate' ? 'translate' : 'rotate';
    gizmo.setMode(mode);
    gizmo.setSpace(mode === 'rotate' ? 'local' : 'world');
    gizmo.attach(aim ? aimProxy : camProxy);
    $('sel').textContent = aim ? `${camRec().name} aim point` : `${camRec().name} (${mode === 'translate' ? 'move' : 'turn'})`;
  } else if (key === 'root') {
    // Whole character: move / turn about the floor point under the hips.
    const f = rigControls.rootFrame(rig);
    rootProxy.position.copy(f.position);
    rootProxy.quaternion.copy(f.quaternion);
    rootProxy.updateMatrixWorld(true);
    const mode = currentMode === 'translate' ? 'translate' : 'rotate';
    gizmo.setMode(mode);
    gizmo.setSpace(mode === 'rotate' ? 'local' : 'world');
    gizmo.attach(rootProxy);
    $('sel').textContent = `${activeChar?.name || 'Character'} (root${mode === 'translate' ? ', move' : ''})`;
  } else if (key.startsWith('ik:')) {
    const h = ikHandle(key);
    if (!h.mesh) { selected = null; gizmo.detach(); return requestRender(); }
    gizmo.setMode('translate');
    gizmo.setSpace('world');
    gizmo.attach(h.mesh);
    $('sel').textContent = (h.pole ? 'Pole: ' : 'IK target: ') + h.k;
  } else {
    const mode = currentMode === 'translate' ? 'translate' : 'rotate';
    gizmo.setMode(mode);
    gizmo.setSpace(mode === 'translate' ? 'world' : currentSpace);
    if (mode === 'translate' && key !== 'hips') {
      // Any other joint is dragged through a helper: hands / feet by IK, the
      // rest by swinging the bone above them.
      rig.map[key].getWorldPosition(jointProxy.position);
      jointProxy.updateMatrixWorld(true);
      gizmo.attach(jointProxy);
    } else gizmo.attach(rig.map[key]);
    $('sel').textContent = key + (mode === 'translate' ? ' (move)' : '');
  }
  requestRender();
}

const rootProxy = new THREE.Object3D();
rootProxy.name = 'rootProxy';
scene.add(rootProxy);
let rootStart = null;

// Apply a world-space transform (relative to the drag start) to the whole
// character: the hips carry everything else.
function moveCharacter(delta, start) {
  const hips = rig.map.hips;
  const m = delta.clone().multiply(start);
  const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  m.decompose(pos, q, sc);
  hips.parent.updateWorldMatrix(true, false);
  hips.position.copy(hips.parent.worldToLocal(pos));
  rig.setWorldQuat(hips, q);
  rig.root.updateMatrixWorld(true);
}

// ---- Lighting panel
const lightProxy = new THREE.Object3D();
scene.add(lightProxy);
let activeLight = 'key';
const saveLighting = debounce(() => { settings.lighting = lightRig.state; saveSettings(); }, 300);
function setActiveLight(n) {
  activeLight = n;
  document.querySelectorAll('#lightPick [data-light]').forEach((b) => b.classList.toggle('on', b.dataset.light === n));
  syncLightUI();
}
function syncLightUI() {
  const st = lightRig.state, l = st[activeLight];
  const set = (id, v) => { const el = $(id); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; };
  set('lightOn', l.on);
  set('lightI', l.i); $('lightIOut').textContent = (+l.i).toFixed(2);
  set('lightColor', l.color);
  set('lightAzV', l.az); $('lightAzVOut').textContent = `${l.az}°`;
  set('lightElV', l.el); $('lightElVOut').textContent = `${l.el}°`;
  set('ambient', st.ambient); $('ambientOut').textContent = (+st.ambient).toFixed(2);
  set('skyColor', st.sky); set('groundColor', st.ground);
  set('lightShadows', st.shadows); set('lightFollowCam', st.followCamera); set('lightHandles', st.handles);
  $('lightPreset').value = LIGHT_PRESETS[st.preset] ? st.preset : '';
  drawLightBall($('lightBall'), lightRig, activeLight);
}
function lightingChanged({ shadows = false } = {}) {
  lightRig.update();
  if (shadows) applyShadowMode();
  syncLightUI();
  saveLighting();
  requestRender();
}
// Shadows need the renderer's shadow map and every mesh casting / receiving.
function applyShadowMode() {
  const on = !!lightRig.state.shadows;
  renderer.shadowMap.enabled = on;
  lightRig.markShadows([...characters.map((c) => c.root).filter(Boolean), props.group]);
  scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); });
}
const queueLightSubject = debounce(() => {
  const rigs = visibleRigs();
  if (!rigs.length) return;
  const b = new THREE.Box3();
  for (const r of rigs) { const s = r.bounds(); b.union(new THREE.Box3().setFromCenterAndSize(s.center, new THREE.Vector3().setScalar(s.radius * 2))); }
  const sph = b.getBoundingSphere(new THREE.Sphere());
  lightRig.setSubject(sph.center, sph.radius);
  if (lightRig.state.shadows) lightRig.markShadows([...characters.map((c) => c.root).filter(Boolean), props.group]);
  requestRender();
}, 150);
$('lightPreset').add(new Option('Custom', ''));
for (const name of Object.keys(LIGHT_PRESETS)) $('lightPreset').add(new Option(name, name));
$('lightPreset').addEventListener('change', () => { if ($('lightPreset').value) { lightRig.applyPreset($('lightPreset').value); lightingChanged({ shadows: true }); } });
document.querySelectorAll('#lightPick [data-light]').forEach((b) => b.addEventListener('click', () => setActiveLight(b.dataset.light)));
const lightField = (id, fn, opts) => $(id).addEventListener('input', () => { fn($(id)); lightRig.state.preset = 'Custom'; lightingChanged(opts); });
lightField('lightOn', (el) => { lightRig.state[activeLight].on = el.checked; });
lightField('lightI', (el) => { lightRig.state[activeLight].i = +el.value; });
lightField('lightColor', (el) => { lightRig.state[activeLight].color = el.value; });
lightField('lightAzV', (el) => { lightRig.state[activeLight].az = +el.value; });
lightField('lightElV', (el) => { lightRig.state[activeLight].el = +el.value; });
lightField('ambient', (el) => { lightRig.state.ambient = +el.value; });
lightField('skyColor', (el) => { lightRig.state.sky = el.value; });
lightField('groundColor', (el) => { lightRig.state.ground = el.value; });
$('lightShadows').addEventListener('change', () => { lightRig.state.shadows = $('lightShadows').checked; lightingChanged({ shadows: true }); });
$('lightFollowCam').addEventListener('change', () => {
  // Keep the lights where they are; only the way they are measured changes.
  const dirs = Object.fromEntries(LIGHT_NAMES.map((n) => [n, lightRig.direction(n)]));
  lightRig.state.followCamera = $('lightFollowCam').checked;
  for (const n of LIGHT_NAMES) lightRig.setDirection(n, dirs[n]);
  lightingChanged();
});
$('lightHandles').addEventListener('change', () => { lightRig.state.handles = $('lightHandles').checked; lightingChanged(); });
let ballDrag = false;
const ballSet = (e) => {
  const { az, el } = ballToAngles($('lightBall'), e);
  Object.assign(lightRig.state[activeLight], { az, el, on: true });
  lightRig.state.preset = 'Custom';
  lightingChanged();
};
$('lightBall').addEventListener('pointerdown', (e) => { ballDrag = true; $('lightBall').setPointerCapture(e.pointerId); ballSet(e); });
$('lightBall').addEventListener('pointermove', (e) => { if (ballDrag) ballSet(e); });
$('lightBall').addEventListener('pointerup', () => { ballDrag = false; });
// ---- The shot camera as an object: gizmo on the camera body or its aim point.
const camProxy = new THREE.Object3D();
const aimProxy = new THREE.Object3D();
scene.add(camProxy, aimProxy);
const aimMarker = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), new THREE.MeshBasicMaterial({ color: 0xf97316, wireframe: true, depthTest: false }));
aimMarker.renderOrder = 997;
scene.add(aimMarker);
let camDragStart = null;

function placeCamProxies() {
  camProxy.position.copy(camera.position);
  camProxy.quaternion.copy(camera.quaternion);
  camProxy.updateMatrixWorld(true);
  aimProxy.position.copy(controls.target);
  aimProxy.updateMatrixWorld(true);
  aimMarker.position.copy(controls.target);
}
// Apply the camera gizmo / modal result.
function applyCamProxy(kind) {
  if (kind === 'aim') {
    controls.target.copy(aimProxy.position);
  } else if (gizmo.mode === 'rotate' || kind === 'rotate') {
    const dist = camera.position.distanceTo(controls.target);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camProxy.quaternion);
    controls.target.copy(camera.position).addScaledVector(fwd, dist);
  } else {
    const d = camProxy.position.clone().sub(camera.position);
    camera.position.copy(camProxy.position);
    if (!$('camKeepAim').checked) controls.target.add(d);
  }
  controls.update();
  applyRoll();
  aimMarker.position.copy(controls.target);
  syncCamFields();
  afterCameraMove();
}
function selectCamera(which) {
  if (camLockedToast()) return;
  if (appMode !== 'pose') setAppMode('pose');
  // Moving the camera you look through is disorienting: use the free view.
  if (lookThrough && !panes.some((p) => p.view !== 'camera')) setLookThrough(false);
  else if (lookThrough) setActivePane(panes.findIndex((p) => p.view !== 'camera'));
  select(which === 'aim' ? 'cam:aim' : 'cam');
}

// Panel fields are refreshed at most once per frame, and only while the
// Camera panel is open (writing many inputs during a drag is costly).
let camFieldsQueued = false;
function syncCamFields() {
  if (camFieldsQueued) return;
  camFieldsQueued = true;
  requestAnimationFrame(() => { camFieldsQueued = false; writeCamFields(); });
}
function writeCamFields() {
  if (!$('camXform').closest('details')?.open) return;
  const set = (el, v, d = 3) => { if (document.activeElement !== el) el.value = +v.toFixed(d); };
  document.querySelectorAll('#camXform input').forEach((el) => {
    const v = el.dataset.k[0] === 'p' ? camera.position : controls.target;
    set(el, v.getComponent(+el.dataset.k[1]));
  });
  set($('camMM'), Cam.lensForFov(camera.fov, camera.aspect), 1);
  set($('camDist'), camera.position.distanceTo(controls.target));
  set($('camNear'), camera.near);
  set($('camFar'), camera.far, 0);
}
document.querySelectorAll('#camXform input').forEach((el) => el.addEventListener('change', () => {
  if (camLockedToast()) return writeCamFields();
  const v = el.dataset.k[0] === 'p' ? camera.position : controls.target;
  v.setComponent(+el.dataset.k[1], +el.value || 0);
  controls.update();
  applyRoll();
  if (selected?.startsWith('cam')) select(selected);
  afterCameraMove();
}));
$('camMM').addEventListener('change', () => {
  camera.fov = Cam.fovForLens(Math.max(6, +$('camMM').value || 50), camera.aspect);
  camera.updateProjectionMatrix();
  settings.shot.lens = 0;
  $('shotLens').value = '0';
  saveSettings();
  syncFovUI();
  afterCameraMove();
});
$('camDist').addEventListener('change', () => {
  if (camLockedToast()) return writeCamFields();
  const d = Math.max(0.1, +$('camDist').value || 1);
  const dir = camera.position.clone().sub(controls.target).normalize();
  camera.position.copy(controls.target).addScaledVector(dir, d);
  controls.update();
  applyRoll();
  afterCameraMove();
});
for (const id of ['camNear', 'camFar']) $(id).addEventListener('change', () => {
  camera.near = Math.max(0.001, +$('camNear').value || 0.05);
  camera.far = Math.max(camera.near + 1, +$('camFar').value || 200);
  camera.updateProjectionMatrix();
  settings.camClip = [camera.near, camera.far];
  saveSettings();
  afterCameraMove();
});
if (settings.camClip) { [camera.near, camera.far] = settings.camClip; camera.updateProjectionMatrix(); }
$('selCam').addEventListener('click', () => selectCamera('cam'));
$('camXform').closest('details')?.addEventListener('toggle', () => writeCamFields());
$('selAim').addEventListener('click', () => selectCamera('aim'));

// ---- Several shot cameras. `camera` is always the active one (the one that
// renders); the others are kept as saved states and drawn as small frustums
// in the free and ortho views. Clicking one there makes it the active camera.
const CAM_COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#f87171'];
const camHelpers = new THREE.Group();
camHelpers.visible = false;
scene.add(camHelpers);
let shotCams = [{ id: 'cam1', name: 'Camera 1', locked: false, visible: true, state: null }];
let activeCamId = 'cam1';
const camRec = () => shotCams.find((c) => c.id === activeCamId) || shotCams[0];
const camLocked = () => !!camRec()?.locked;
const camState = () => ({ ...Cam.serializeCamera(camera, controls, roll), near: camera.near, far: camera.far });
function putCamState(s) {
  if (!s) return;
  setRoll(Cam.restoreCamera(s, camera, controls));
  if (s.near) { camera.near = s.near; camera.far = s.far || camera.far; camera.updateProjectionMatrix(); }
  syncFovUI();
}
// full = every camera with its state (scenes, settings); otherwise the list
// without the active camera's state, which travels as `camera` and changes on every orbit.
function camerasData(full = true) {
  return {
    active: activeCamId,
    list: shotCams.map((c) => ({ ...c, state: c.id === activeCamId ? (full ? camState() : null) : c.state })),
  };
}
function restoreCameras(data, { applyActive = true } = {}) {
  const list = (data?.list || []).filter((c) => c?.id);
  shotCams = list.length ? list.map((c) => ({ id: c.id, name: c.name || c.id, locked: !!c.locked, visible: c.visible !== false, state: c.state || null }))
    : [{ id: 'cam1', name: 'Camera 1', locked: false, visible: true, state: null }];
  activeCamId = shotCams.some((c) => c.id === data?.active) ? data.active : shotCams[0].id;
  if (applyActive) putCamState(camRec().state);
  camRec().state = null;
  if (selected?.startsWith('cam')) select(null);
  camsChanged();
}
function camsChanged() {
  refreshCamHelpers();
  syncPaneControls();
  outliner.refresh();
  settings.cameras = camerasData();
  saveSettings();
  queueSync();
  requestRender();
}
function refreshCamHelpers() {
  for (const o of [...camHelpers.children]) { o.geometry.dispose(); o.material.dispose(); camHelpers.remove(o); }
  shotCams.forEach((c, i) => {
    if (c.id === activeCamId || !c.visible || !c.state) return;
    const cam = new THREE.PerspectiveCamera(c.state.fov || 50, camera.aspect, 0.05, 10);
    cam.position.fromArray(c.state.p);
    const t = new THREE.Vector3().fromArray(c.state.t);
    cam.lookAt(t);
    if (c.state.roll) cam.rotateZ(THREE.MathUtils.degToRad(c.state.roll));
    cam.updateMatrixWorld(true);
    const lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: CAM_COLORS[i % CAM_COLORS.length], transparent: true, opacity: 0.75 }));
    writeFrustum(lines, cam, t);
    lines.userData.camId = c.id;
    camHelpers.add(lines);
  });
}
function switchCamera(id) {
  const next = shotCams.find((c) => c.id === id);
  if (!next || id === activeCamId) return;
  if (selected?.startsWith('cam')) select(null);
  camRec().state = camState();
  activeCamId = id;
  putCamState(next.state);
  next.state = null;
  camsChanged();
  afterCameraMove();
}
function addCamera(from = null) {
  const n = shotCams.reduce((m, c) => Math.max(m, +c.id.replace(/\D/g, '') || 0), 0) + 1;
  let state = from ? (from.id === activeCamId ? camState() : structuredClone(from.state)) : null;
  if (!state) {
    // A new camera starts where you are looking from: the free view if one is
    // in use, otherwise beside the current camera.
    state = camState();
    if (viewInit && !lookThrough) {
      state.p = viewCam.position.toArray();
      state.t = viewControls.target.toArray();
      state.roll = 0;
      state.crop = null;
    } else {
      const side = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(0.6);
      state.p = camera.position.clone().add(side).toArray();
      state.t = controls.target.clone().add(side).toArray();
    }
  }
  shotCams.push({ id: 'cam' + n, name: from ? from.name + ' copy' : 'Camera ' + n, locked: false, visible: true, state });
  switchCamera('cam' + n);
  toast(`${camRec().name} is now the active camera`);
}
function deleteCamera(c) {
  if (shotCams.length < 2) return toast('The scene needs at least one camera', true);
  if (!confirm(`Delete ${c.name}?`)) return;
  if (c.id === activeCamId) switchCamera(shotCams.find((o) => o !== c).id);
  shotCams = shotCams.filter((o) => o !== c);
  camsChanged();
}
// Locked cameras keep their framing: no gizmo, no orbit, no auto-framing.
function camLockedToast() {
  if (!camLocked()) return false;
  toast(`${camRec().name} is locked (lock icon in the Outliner)`, true);
  return true;
}

const jointProxy = new THREE.Object3D();
jointProxy.name = 'jointProxy';
scene.add(jointProxy);

function parentJoint(key) {
  for (let p = rig.map[key].parent; p; p = p.parent) {
    const k = rig.keyOf(p);
    if (k) return k;
  }
  return null;
}

// Move a joint to a world point (W / G on a bone).
function moveJoint(key, target) {
  if (rig.ikChain && /(Hand|Foot)$/.test(key) && rig.ikChain(key)) {
    rig.solveIK(key, target, 16, rig.defaultPole(key));
    return;
  }
  const parent = parentJoint(key);
  const pos = rig.map[key].getWorldPosition(new THREE.Vector3());
  if (!parent || parent === 'hips') {
    // The root of a leg or of the spine: moving it moves the hips.
    const pin = captureFeet();
    const hips = rig.map.hips;
    const hp = hips.getWorldPosition(new THREE.Vector3()).add(target).sub(pos);
    hips.parent.updateWorldMatrix(true, false);
    hips.position.copy(hips.parent.worldToLocal(hp));
    rig.root.updateMatrixWorld(true);
    if (pin) applyFeetPin(pin);
    return;
  }
  const from = rig.map[parent].getWorldPosition(new THREE.Vector3());
  const dir = target.clone().sub(from);
  if (dir.lengthSq() < 1e-10) return;
  rig.aim(parent, rig.map[key], dir);
  rig.clampLimits([parent]);
}

const raycaster = new THREE.Raycaster();
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || gizmo.dragging || props.gizmo.dragging || cropMode || boxMode || e.altKey) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 4 || gizmo.axis || props.gizmo.axis || e.button !== 0) return;
  const r = canvas.getBoundingClientRect();
  const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  applyRoll();
  if (appMode !== 'pose') { props.pick(p, [e.clientX - r.left, e.clientY - r.top], e.shiftKey); refreshXform(); return; }
  raycaster.setFromCamera(p, activeCam());
  const ikHit = raycaster.intersectObjects(ikTargets.children.filter((o) => o.visible), false)[0];
  if (ikHit) {
    const k = ikHit.object.userData.key;
    return select((ikHit.object.userData.pole ? 'ik:pole:' : 'ik:') + k);
  }
  const ctrl = handles.visible && rigControls.pick(activeCam(), [e.clientX - r.left, e.clientY - r.top], [r.width, r.height]);
  if (ctrl) return select(ctrl);
  if (!lookThrough) {
    // The shot camera body and its aim point are clickable in other views.
    const px = [e.clientX - r.left, e.clientY - r.top];
    const scr = (v) => { const s = v.clone().project(activeCam()); return s.z > 1 ? null : [(s.x + 1) / 2 * r.width, (1 - s.y) / 2 * r.height]; };
    const near = (v, tol) => { const s = scr(v); return s && Math.hypot(s[0] - px[0], s[1] - px[1]) < tol; };
    if (camRec().visible && !camLocked()) {
      if (near(controls.target, 10)) return select('cam:aim');
      if (near(camera.position, 14)) return select('cam');
    }
    for (const h of camHelpers.children) {
      const c = shotCams.find((o) => o.id === h.userData.camId);
      if (c && near(new THREE.Vector3().fromArray(c.state.p), 14)) { switchCamera(c.id); if (!c.locked) select('cam'); return; }
    }
    if (lightRig.handles.visible) {
      for (const h of lightRig.handles.children) if (h.visible && near(h.userData.bulb.position, 12)) return select('light:' + h.userData.light);
    }
  }
  // Clicking another character's body makes it the active one; clicking the
  // active one picks the bone under the cursor.
  const pickable = characters.filter((c) => c.visible && !c.locked);
  const body = raycaster.intersectObjects(pickable.flatMap(characterMeshes), false)[0];
  let owner = body?.object;
  while (owner && !owner.userData.character) owner = owner.parent;
  if (owner && owner.userData.character !== activeChar) return setActiveCharacter(owner.userData.character);
  if (owner && rig) return select(nearestBone(body.point));
  return select(null);
});

// ------------------------------------------------------------------ gizmo / IK

let currentMode = 'rotate';
let currentSpace = 'local';

let pinState = null;
gizmo.addEventListener('dragging-changed', (e) => {
  activeControls().enabled = !e.value;
  if (e.value) {
    pushUndo();
    pinState = selected === 'hips' ? captureFeet() : null;
    rootStart = gizmo.object === rootProxy ? { inv: rootProxy.matrixWorld.clone().invert(), hips: rig.map.hips.matrixWorld.clone() } : null;
    balancePin = balanceApplies(selected) ? plantedFeet() : null;
  } else {
    pinState = null;
    rootStart = null;
    balancePin = null;
    if (selected === 'root') select('root');
    if (gizmo.object === jointProxy && selected && rig?.map[selected]) {
      rig.map[selected].getWorldPosition(jointProxy.position);
      jointProxy.updateMatrixWorld(true);
    }
    poseChanged();
  }
});
gizmo.addEventListener('objectChange', () => {
  if (selected?.startsWith('ik:')) {
    const h = ikHandle(selected);
    if (!h.pole) snapToSurface(h.mesh, h.k);
    solveLimb(h.k);
  } else if (selected === 'hips' && pinState) {
    applyFeetPin(pinState);
  } else if (gizmo.object === lightProxy && selected?.startsWith('light:')) {
    lightRig.setDirection(selected.slice(6), lightProxy.position.clone().sub(lightRig.center));
    syncLightUI();
  } else if (gizmo.object === camProxy) {
    applyCamProxy('cam');
  } else if (gizmo.object === aimProxy) {
    applyCamProxy('aim');
  } else if (gizmo.object === rootProxy && rootStart && rig) {
    rootProxy.updateMatrixWorld(true);
    moveCharacter(rootProxy.matrixWorld.clone().multiply(rootStart.inv), rootStart.hips);
  } else if (gizmo.object === jointProxy && selected && rig) {
    moveJoint(selected, jointProxy.position);
  } else if (selected && rig) {
    rig.clampLimits([selected]);
  }
  mirrorLive();
  if (balancePin) autoBalance(balancePin);
  requestRender();
});

// ---- IK handles, pins, live mirror, surfaces

function ikHandle(sel) {
  const pole = sel.startsWith('ik:pole:');
  const k = sel.slice(pole ? 8 : 3);
  return { k, pole, mesh: ikTargets.children.find((o) => o.userData.key === k && !!o.userData.pole === pole) };
}

function solveLimb(k) {
  const t = ikTargets.children.find((o) => o.userData.key === k && !o.userData.pole);
  const p = ikTargets.children.find((o) => o.userData.key === k && o.userData.pole);
  if (!t) return;
  if (/Hand$/.test(k) && $('spineFollow').checked) spineReach(k, t.position);
  rig.solveIK(k, t.position, 16, p ? p.position : rig.defaultPole(k));
}

// ---- Light auto-posing (in the spirit of Cascadeur's AutoPosing)

const V3 = () => new THREE.Vector3();
const wp = (k) => rig.map[k]?.getWorldPosition(V3()) || null;

// A hand target beyond arm's reach: bend / turn the spine toward it, shared
// over the spine joints and kept within their limits.
function spineReach(handKey, target) {
  const side = rig.sideOf(handKey);
  const ua = side + 'UpperArm', la = side + 'LowerArm';
  const spine = rig.order.filter((k) => /^spine\d+$/.test(k));
  if (!spine.length || !rig.map[ua] || !rig.map[la]) return;
  for (let it = 0; it < 3; it++) {
    const S = wp(ua), E = wp(la), H = wp(handKey);
    const reach = S.distanceTo(E) + E.distanceTo(H);
    const dist = S.distanceTo(target);
    if (dist < reach * 0.97) return;
    const want = target.clone().sub(target.clone().sub(S).normalize().multiplyScalar(reach * 0.95));
    const B = wp(spine[0]);
    const a = S.clone().sub(B), b = want.sub(B);
    if (a.lengthSq() < 1e-8 || b.lengthSq() < 1e-8) return;
    let R = new THREE.Quaternion().setFromUnitVectors(a.normalize(), b.normalize());
    const ang = 2 * Math.acos(Math.min(1, Math.abs(R.w)));
    const max = THREE.MathUtils.degToRad(35);
    if (ang > max) R = new THREE.Quaternion().slerp(R, max / ang);
    const share = new THREE.Quaternion().slerp(R, 1 / spine.length);
    for (const k of spine) rig.rotateWorld(rig.map[k], share);
    rig.clampLimits(spine);
  }
}

// Body mass shares (Dempster-style, rounded) per segment, at the segment middle.
const SEG_MASS = { hips: 0.14, spine: 0.3, neck: 0.02, head: 0.07, Shoulder: 0.01, UpperArm: 0.028, LowerArm: 0.016, Hand: 0.006, UpperLeg: 0.1, LowerLeg: 0.046, Foot: 0.014 };
function centerOfMass() {
  const spines = rig.order.filter((k) => /^spine\d+$/.test(k)).length || 1;
  const sum = V3();
  let w = 0;
  for (const k of rig.order) {
    if (rig.isFingerKey(k) || rig.isExtra(k)) continue;
    const part = /^spine\d+$/.test(k) ? 'spine' : rig.sideOf(k) ? k.slice(rig.sideOf(k).length) : k;
    let m = SEG_MASS[part];
    if (!m) continue;
    if (part === 'spine') m /= spines;
    const a = wp(k), c = rig.childOf(k);
    const mid = c ? a.add(c.getWorldPosition(V3())).multiplyScalar(0.5) : a;
    sum.addScaledVector(mid, m);
    w += m;
  }
  return sum.divideScalar(w || 1);
}

// Feet planted on the floor right now (for the balance support area).
function plantedFeet() {
  const feet = ['leftFoot', 'rightFoot'].filter((k) => rig.map[k] && rig.ikChain(k));
  if (!feet.length) return [];
  const ys = feet.map((k) => wp(k).y - (rig.restY[k] ?? 0));
  const floor = Math.min(...ys);
  return feet.filter((k, i) => ys[i] - floor < 0.05 * (rig.height / 1.72)).map((k) => ({
    k, p: wp(k), q: rig.map[k].getWorldQuaternion(new THREE.Quaternion()),
    toes: rig.map[k.replace('Foot', 'Toes')] ? wp(k.replace('Foot', 'Toes')) : null,
  }));
}

// Shift the hips so the centre of mass is over the planted feet; the feet stay put.
function autoBalance(pin) {
  if (!pin?.length) return;
  const support = V3();
  for (const f of pin) support.add(f.toes ? f.p.clone().add(f.toes).multiplyScalar(0.5) : f.p);
  support.divideScalar(pin.length);
  const hips = rig.map.hips;
  for (let it = 0; it < 3; it++) {
    const d = support.clone().sub(centerOfMass());
    d.y = 0;
    if (d.lengthSq() < 0.004 ** 2) break;
    const p = hips.getWorldPosition(V3()).add(d);
    hips.parent.updateWorldMatrix(true, false);
    hips.position.copy(hips.parent.worldToLocal(p));
    rig.root.updateMatrixWorld(true);
    for (const f of pin) { rig.solveIK(f.k, f.p, 20, rig.defaultPole(f.k)); rig.setWorldQuat(rig.map[f.k], f.q); }
  }
}
let balancePin = null;
const balanceApplies = (key) => $('autoBalance').checked && rig && key && key !== 'root' && key !== 'hips'
  && !/(UpperLeg|LowerLeg|Foot|Toes)$/.test(key.replace(/^ik:(pole:)?/, ''));

// Feet stay planted while the hips move (when "Pin feet" is on).
function captureFeet() {
  if (!$('pinFeet').checked || !rig) return null;
  return ['leftFoot', 'rightFoot'].filter((k) => rig.map[k] && rig.ikChain(k)).map((k) => ({
    k, p: rig.map[k].getWorldPosition(new THREE.Vector3()), q: rig.map[k].getWorldQuaternion(new THREE.Quaternion()),
  }));
}
function applyFeetPin(pin) {
  for (const f of pin || []) {
    rig.solveIK(f.k, f.p, 20, rig.defaultPole(f.k));
    rig.setWorldQuat(rig.map[f.k], f.q);
  }
}

// Symmetric posing: whatever side is being edited is copied to the other.
function mirrorLive() {
  if (!$('liveMirror').checked || !selected || !rig) return;
  const key = selected.startsWith('ik:') ? ikHandle(selected).k : selected;
  const side = rig.sideOf(key);
  if (side) rig.mirror(side === 'left' ? 'LtoR' : 'RtoL');
}

const surfaceMeshes = () => props.meshes.filter((m) => m.visible);

// Snap an IK target onto a surface just below it (hand on a table, foot on a
// step), keeping a joint-sized clearance. Only nearby surfaces count, so a hand
// held high above a table is left alone.
function snapToSurface(mesh, k) {
  if (!$('ikSnap').checked || !rig) return;
  const foot = k.endsWith('Foot');
  const clear = foot ? (rig.restY[k] ?? 0.08) : 0.03 * (rig.height / 1.72);
  const from = mesh.position.clone();
  from.y += 0.15;
  const hit = new THREE.Raycaster(from, new THREE.Vector3(0, -1, 0)).intersectObjects(surfaceMeshes(), false)[0];
  if (hit && hit.point.y >= mesh.position.y - clear - 0.12) mesh.position.y = hit.point.y + clear;
  else if (mesh.position.y < clear) mesh.position.y = clear; // the floor
}

// Height of the first prop surface below p (or the floor at y = 0).
function surfaceBelow(p) {
  const hit = new THREE.Raycaster(p.clone(), new THREE.Vector3(0, -1, 0)).intersectObjects(surfaceMeshes(), false)[0];
  return hit ? Math.max(hit.point.y, 0) : 0;
}

function moveHipsBy(dy) {
  const hips = rig.map.hips;
  const p = hips.getWorldPosition(new THREE.Vector3());
  p.y += dy;
  hips.parent.updateWorldMatrix(true, false);
  hips.position.copy(hips.parent.worldToLocal(p));
  rig.root.updateMatrixWorld(true);
}

function standOnSurface() {
  if (!rig) return;
  const top = rig.map.hips.getWorldPosition(new THREE.Vector3()).y;
  let gap = Infinity;
  for (const [k, restY] of Object.entries(rig.restY)) {
    const p = rig.map[k].getWorldPosition(new THREE.Vector3());
    gap = Math.min(gap, p.y - restY - surfaceBelow(new THREE.Vector3(p.x, top, p.z)));
  }
  if (!Number.isFinite(gap)) return;
  pushUndo();
  moveHipsBy(-gap);
  poseChanged();
}

const SIT_LEGS = Object.fromEntries(Object.entries(POSE_PRESETS.Sitting).filter(([k]) => /Leg$/.test(k)));
function sitOnProp() {
  if (!rig) return;
  const hips = rig.map.hips.getWorldPosition(new THREE.Vector3());
  const seat = surfaceBelow(hips);
  if (seat < 0.1) return toast('No seat under the hips: move the character over a chair, bed or bench first', true);
  pushUndo();
  rig.applyDirections(SIT_LEGS, { reset: false, defaults: false });
  moveHipsBy(seat + 0.093 * rig.height - hips.y);
  const yaw = rig.facing();
  for (const k of ['leftFoot', 'rightFoot']) {
    if (!rig.map[k] || !rig.ikChain(k)) continue;
    const f = rig.map[k].getWorldPosition(new THREE.Vector3());
    const floor = surfaceBelow(new THREE.Vector3(f.x, Math.min(f.y, seat - 0.02), f.z));
    const target = new THREE.Vector3(f.x, floor + rig.restY[k], f.z);
    if (f.y > target.y + 0.005) rig.solveIK(k, target, 24, rig.defaultPole(k));
    rig.setWorldQuat(rig.map[k], yaw.clone().multiply(rig.rest[k].wq));
  }
  poseChanged();
}
$('standOn').addEventListener('click', standOnSurface);

// Face expression and gaze
const faceInputs = [...document.querySelectorAll('[data-face]')];
function syncFaceUI() {
  if (!rig) return;
  for (const el of faceInputs) {
    el.value = rig.face[el.dataset.face] ?? 0;
    $(el.id + 'Out').textContent = Math.round(el.value * 100);
  }
}
for (const el of faceInputs) {
  el.addEventListener('pointerdown', () => pushUndo());
  el.addEventListener('input', () => {
    if (!rig) return;
    rig.face[el.dataset.face] = +el.value;
    $(el.id + 'Out').textContent = Math.round(el.value * 100);
    requestRender();
  });
  el.addEventListener('change', poseChanged);
}
$('lookCam').addEventListener('click', () => {
  if (!rig) return;
  pushUndo();
  applyRoll();
  rig.lookAt(camera.position);
  poseChanged();
});
$('eyesFollow').addEventListener('change', requestRender);
$('optFace70').addEventListener('change', requestRender);
$('sitOn').addEventListener('click', sitOnProp);
gizmo.addEventListener('change', requestRender);
controls.addEventListener('change', () => { requestRender(); queueCameraChange(); updateViewHud(); aimMarker.position.copy(controls.target); syncCamFields(); if (lightRig.state.followCamera) lightRig.update(); });
viewControls.addEventListener('change', () => requestView('persp'));

const poleGeo = new THREE.OctahedronGeometry(1);
function placeIkTargets() {
  ikTargets.clear();
  if (!ikMode || !rig) return;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  for (const k of ['leftHand', 'rightHand', 'leftFoot', 'rightFoot']) {
    if (!rig.map[k] || !rig.ikChain(k)) continue;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: rig.sideOf(k) === 'left' ? COLORS.left : COLORS.right, depthTest: false, transparent: true, opacity: 0.9, wireframe: true,
    }));
    m.scale.setScalar(rig.height * 0.045);
    m.renderOrder = 1000;
    m.userData.key = k;
    rig.map[k].getWorldPosition(m.position);
    ikTargets.add(m);
    const pole = new THREE.Mesh(poleGeo, new THREE.MeshBasicMaterial({
      color: rig.sideOf(k) === 'left' ? COLORS.left : COLORS.right, depthTest: false, transparent: true, opacity: 0.85,
    }));
    pole.scale.setScalar(rig.height * 0.016);
    pole.renderOrder = 1000;
    Object.assign(pole.userData, { key: k, pole: true });
    pole.position.copy(rig.defaultPole(k));
    ikTargets.add(pole);
  }
}

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('#toolbar [data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  if (selected && !selected.startsWith('ik:')) select(selected);
}
document.querySelectorAll('#toolbar [data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

function toggleIK() {
  ikMode = !ikMode;
  $('ikToggle').classList.toggle('on', ikMode);
  if (selected?.startsWith('ik:') || (ikMode && selected && /(Hand|Foot)$/.test(selected))) select(null);
  placeIkTargets();
  requestRender();
}
$('ikToggle').addEventListener('click', toggleIK);

function toggleSpace() {
  currentSpace = currentSpace === 'local' ? 'world' : 'local';
  $('spaceToggle').textContent = currentSpace === 'local' ? 'Local' : 'World';
  if (selected && !selected.startsWith('ik:')) select(selected);
}
$('spaceToggle').addEventListener('click', toggleSpace);

// ------------------------------------------------------------------ undo

const undoStack = [], redoStack = [];
// Entries remember which character they belong to.
function pushUndo() {
  if (!rig) return;
  undoStack.push({ id: activeChar.id, pose: rig.getPose() });
  if (undoStack.length > 80) undoStack.shift();
  redoStack.length = 0;
}
function stepHistory(from, to) {
  const e = from.pop();
  const c = e && characters.find((x) => x.id === e.id);
  if (!c?.rig) return;
  if (c !== activeChar) setActiveCharacter(c);
  to.push({ id: c.id, pose: c.rig.getPose() });
  c.rig.setPose(e.pose);
  poseChanged();
}
function undo() { stepHistory(undoStack, redoStack); }
function redo() { stepHistory(redoStack, undoStack); }
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);

function poseChanged() {
  syncFaceUI();
  queueLightSubject();
  if (ikMode) placeIkTargets();
  if (selected?.startsWith('ik:')) select(selected);
  requestRender();
  queueCharSave();
  queueSync();
  queueCameraChange();
}

// ------------------------------------------------------------------ pose panel

for (const name of Object.keys(POSE_PRESETS)) {
  const b = document.createElement('button');
  b.textContent = name;
  b.addEventListener('click', () => {
    if (!rig) return;
    pushUndo();
    rig.applyDirections(POSE_PRESETS[name]);
    poseChanged();
  });
  $('posePresets').append(b);
}

for (const [id, side] of [['handL', 'left'], ['handR', 'right']]) {
  const sel = $(id);
  sel.add(new Option('Hand pose…', ''));
  const grp = document.createElement('optgroup');
  grp.label = 'Hand poses (library: L → Hand poses)';
  Object.keys(HAND_SHAPES).forEach((n) => grp.append(new Option(n, n)));
  sel.append(grp);
  sel.addEventListener('change', () => {
    if (!rig || !sel.value) return;
    pushUndo();
    setHandShape(rig, side, HAND_SHAPES[sel.value]);
    sel.value = '';
    poseChanged();
  });
}
for (const [id, side] of [['curlL', 'left'], ['curlR', 'right']]) {
  const r = $(id);
  r.addEventListener('pointerdown', pushUndo);
  r.addEventListener('input', () => {
    if (!rig) return;
    const v = +r.value;
    rig.setCurl(side, { Thumb: v * 0.75, Index: v, Middle: v, Ring: v, Little: v });
    requestRender();
  });
  r.addEventListener('change', poseChanged);
}

$('resetBone').addEventListener('click', () => {
  if (!rig || !selected || selected.startsWith('ik:') || selected.startsWith('cam') || selected.startsWith('light:')) return;
  pushUndo();
  if (selected === 'root') {
    // Back to the world origin, facing +Z, same pose.
    const f = rigControls.rootFrame(rig);
    const cur = new THREE.Matrix4().compose(f.position, f.quaternion, new THREE.Vector3(1, 1, 1));
    const home = new THREE.Matrix4().makeTranslation(0, f.position.y, 0);
    moveCharacter(home.multiply(cur.invert()), rig.map.hips.matrixWorld.clone());
    select('root');
  } else rig.resetBone(selected);
  poseChanged();
});
$('resetPose').addEventListener('click', () => { if (rig) { pushUndo(); rig.resetAll({ keepPlacement: true }); poseChanged(); } });
$('mirrorLR').addEventListener('click', () => { if (rig) { pushUndo(); rig.mirror('LtoR'); poseChanged(); } });
$('mirrorRL').addEventListener('click', () => { if (rig) { pushUndo(); rig.mirror('RtoL'); poseChanged(); } });
$('flipPose').addEventListener('click', () => { if (rig) { pushUndo(); rig.mirror('flip'); poseChanged(); } });
$('fingerHandles').addEventListener('change', requestRender);
for (const [k, v] of Object.entries(CONTROL_SCHEMES)) $('ctrlScheme').add(new Option(v.label, k));
$('ctrlScheme').value = settings.ctrlScheme in CONTROL_SCHEMES ? settings.ctrlScheme : 'maya';
rigControls.setScheme($('ctrlScheme').value);
$('ctrlScheme').addEventListener('change', () => {
  rigControls.setScheme($('ctrlScheme').value);
  settings.ctrlScheme = $('ctrlScheme').value;
  saveSettings();
  requestRender();
});
$('ctrlToggle').addEventListener('click', () => setControlsShown(!controlsShown));
setControlsShown(settings.controlsShown !== false);

function download(name, href) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}
const jsonURL = (obj) => URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }));

$('savePose').addEventListener('click', () => {
  if (!rig) return;
  const data = {
    type: 'rigged-pose', v: 2, pose: rig.getPose(), characters: serializeCharacters(), active: activeChar.id,
    camera: camState(), cameras: camerasData(), props: props.serialize(),
  };
  download('pose.json', jsonURL(data));
});
$('loadPose').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f || !rig) return;
  try {
    const data = JSON.parse(await f.text());
    if (data.characters?.length) await restoreCharacters(data.characters, data.active);
    else { pushUndo(); rig.setPose(data.pose || data); }
    if (data.props) props.load(data.props);
    if (data.cameras) restoreCameras(data.cameras, { applyActive: false });
    if (data.camera) putCamState(data.camera);
    poseChanged();
  } catch (err) {
    toast('Not a pose file: ' + err.message, true);
  }
});

// ------------------------------------------------------------------ camera panel

const RAD = Math.PI / 180;

function applyRoll() {
  camera.lookAt(controls.target);
  if (roll) camera.rotateZ(THREE.MathUtils.degToRad(roll));
  camera.updateMatrixWorld(true);
}
function setRoll(v) {
  roll = v;
  $('roll').value = v;
  $('rollOut').textContent = v + '°';
  requestRender();
}

// Shot composer
settings.shot = { ...Cam.DEFAULT_SHOT, ...(settings.shot || {}) };
const fillSelect = (id, items, value) => {
  const s = $(id);
  for (const [label, v] of items) s.add(new Option(label, String(v)));
  s.value = String(value);
};
fillSelect('shotSize', Cam.SHOT_SIZES.map((n) => [n, n]), settings.shot.size);
fillSelect('shotAngle', Object.keys(Cam.ANGLES).map((n) => [n, n]), settings.shot.angle);
fillSelect('shotDir', Object.keys(Cam.DIRECTIONS).map((n) => [n, n]), settings.shot.dir);
fillSelect('shotLens', [...Cam.LENSES.map((mm) => [mm + ' mm', mm]), ['Custom (FOV slider)', 0]], settings.shot.lens);
fillSelect('shotDutch', [-30, -20, -10, 0, 10, 20, 30].map((d) => [d ? (d > 0 ? '+' : '') + d + '°' : 'None', d]), settings.shot.dutch);
fillSelect('shotPlace', Object.keys(Cam.PLACEMENTS).map((n) => [n, n]), settings.shot.place);

function readShot() {
  settings.shot = {
    size: $('shotSize').value, angle: $('shotAngle').value, dir: $('shotDir').value,
    lens: +$('shotLens').value, dutch: +$('shotDutch').value, place: $('shotPlace').value,
  };
  saveSettings();
  return settings.shot;
}

function applyLens() {
  const mm = settings.shot.lens;
  if (mm > 0) {
    camera.fov = Cam.fovForLens(mm, camera.aspect);
    camera.updateProjectionMatrix();
  }
  syncFovUI();
}

function frameShot(dirOverride) {
  if (!rig || camLockedToast()) return;
  const s = readShot();
  applyLens();
  setRoll(s.dutch);
  const dir = dirOverride || Cam.shotDirection(rig, Cam.ANGLES[s.angle], Cam.DIRECTIONS[s.dir]);
  const subject = $('shotSubject').value === 'all' ? visibleRigs() : [rig];
  Cam.fitShot(camera, controls, subject.length ? subject : [rig], { size: s.size, dir, roll: s.dutch, cx: Cam.PLACEMENTS[s.place] });
  if (!lookThrough) setLookThrough(true);
  afterCameraMove();
}
for (const id of ['shotSize', 'shotAngle', 'shotDir', 'shotLens', 'shotDutch', 'shotPlace', 'shotSubject']) $(id).addEventListener('change', () => frameShot());
$('frameShot').addEventListener('click', () => frameShot());

function afterCameraMove() {
  if (lightRig.state.followCamera) lightRig.update();
  aimMarker.position.copy(controls.target);
  syncCamFields();
  if (selected?.startsWith('cam') && !gizmo.dragging) placeCamProxies();
  updateViewHud();
  requestRender();
  queueCameraChange();
}

$('fov').addEventListener('input', (e) => {
  camera.fov = +e.target.value;
  camera.updateProjectionMatrix();
  settings.shot.lens = 0;
  $('shotLens').value = '0';
  saveSettings();
  syncFovUI();
  afterCameraMove();
});
$('roll').addEventListener('input', (e) => {
  setRoll(+e.target.value);
  if ([...$('shotDutch').options].some((o) => +o.value === roll)) $('shotDutch').value = String(roll);
  afterCameraMove();
});

// Free view vs. looking through the shot camera
let viewInit = false;
function initViewCam() {
  viewInit = true;
  const back = camera.position.clone().sub(controls.target).normalize();
  viewControls.target.copy(controls.target);
  viewCam.position.copy(camera.position).addScaledVector(back, 1.6).add(new THREE.Vector3(0.9, 0.7, 0));
  viewControls.update();
}
// Numpad 0: the active pane switches between the shot camera and the free view.
function setLookThrough(on) {
  if (!on && !viewInit) initViewCam();
  if (!on && cropMode) setCropMode(false);
  const i = Math.max(0, activePane);
  paneViews[viewLayout][i] = on ? 'camera' : 'persp';
  settings.paneViews = paneViews;
  saveSettings();
  lookThrough = on;
  layout();
  setActivePane(i, { force: true });
  outliner.refresh();
}
$('camView').addEventListener('click', () => setLookThrough(!lookThrough));

function alignCamToView() {
  if (camLockedToast()) return;
  camera.position.copy(viewCam.position);
  controls.target.copy(viewControls.target);
  Cam.setCrop(camera, null);
  camera.updateProjectionMatrix();
  setRoll(0);
  controls.update();
  setLookThrough(true);
  afterCameraMove();
}
$('alignCam').addEventListener('click', alignCamToView);

function updateShotHelper() {
  applyRoll();
  writeFrustum(shotHelper, camera, controls.target);
  shotHelper.visible = !lookThrough && camRec().visible;
}
// Camera body + frustum + "up" triangle as line pairs, into one reused buffer.
function writeFrustum(lines, cam, target) {
  const c = cam.position;
  const fwd = cam.getWorldDirection(new THREE.Vector3());
  const L = Math.max(0.35, c.distanceTo(target) * 0.3);
  const at = (x, y) => {
    const d = new THREE.Vector3(x, y, 0.5).unproject(cam).sub(c);
    return d.multiplyScalar(L / d.dot(fwd)).add(c);
  };
  const [a, b, cc, d] = [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)];
  const t1 = at(-0.35, 1.08), t2 = at(0.35, 1.08), t3 = at(0, 1.4);
  const pts = [c, a, c, b, c, cc, c, d, a, b, b, cc, cc, d, d, a, t1, t2, t2, t3, t3, t1];
  // Reuse one buffer: a new attribute every frame leaks a GPU buffer each time.
  let attr = lines.geometry.getAttribute('position');
  if (!attr || attr.count !== pts.length) {
    attr = new THREE.Float32BufferAttribute(new Float32Array(pts.length * 3), 3);
    lines.geometry.setAttribute('position', attr);
  }
  pts.forEach((p, i) => attr.setXYZ(i, p.x, p.y, p.z));
  attr.needsUpdate = true;
  lines.geometry.computeBoundingSphere();
}

// Only touch the DOM when the text changes (it is called on every camera move).
const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };
function updateViewHud() {
  const pv = panes[activePane]?.view;
  if (ORTHO[pv]) return setText($('viewHud'), `${VIEW_LABELS[pv]} (ortho) · MMB/RMB pan · wheel zoom`);
  if (!lookThrough) return setText($('viewHud'), 'Free view · Numpad 0 = camera');
  const crop = Cam.getCrop(camera);
  const mm = Math.round(Cam.lensForFov(camera.fov, camera.aspect));
  setText($('viewHud'), `${shotCams.length > 1 ? camRec().name : 'Camera'}${camLocked() ? ' 🔒' : ''} · ${mm} mm` + (crop ? ` · crop ${(1 / crop.w).toFixed(1)}×` : '') + (roll ? ` · dutch ${roll}°` : ''));
}

// Crop tool: drag an output-shaped frame; applied as a lens shift, so the
// perspective is exactly that of the uncropped shot.
let cropMode = false;
let cropDrag = null;
function setCropMode(on) {
  if (on && !lookThrough) {
    const i = panes.findIndex((p) => p.view === 'camera');
    if (i >= 0) setActivePane(i); else setLookThrough(true);
  }
  cropMode = on;
  controls.enabled = lookThrough && !on && !camLocked();
  $('cropTool').classList.toggle('on', on);
  canvas.classList.toggle('crop', on);
  $('cropBox').hidden = true;
  if (on) toast('Drag a frame on the image to crop · Esc to cancel');
}
$('cropTool').addEventListener('click', () => setCropMode(!cropMode));
$('resetCrop').addEventListener('click', () => {
  Cam.setCrop(camera, null);
  camera.updateProjectionMatrix();
  afterCameraMove();
});

function cropRect(e) {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const dx = x - cropDrag.x, dy = y - cropDrag.y;
  const f = Math.min(1, Math.max(Math.abs(dx) / r.width, Math.abs(dy) / r.height));
  const w = f * r.width, h = f * r.height;
  const left = THREE.MathUtils.clamp(dx < 0 ? cropDrag.x - w : cropDrag.x, 0, r.width - w);
  const top = THREE.MathUtils.clamp(dy < 0 ? cropDrag.y - h : cropDrag.y, 0, r.height - h);
  return { left, top, w, h, f, r };
}
canvas.addEventListener('pointerdown', (e) => {
  if (!cropMode || e.button !== 0) return;
  const r = canvas.getBoundingClientRect();
  cropDrag = { x: e.clientX - r.left, y: e.clientY - r.top };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!cropDrag) return;
  const { left, top, w, h } = cropRect(e);
  Object.assign($('cropBox').style, {
    left: canvas.offsetLeft + paneOffset().x + left + 'px', top: canvas.offsetTop + paneOffset().y + top + 'px', width: w + 'px', height: h + 'px',
  });
  $('cropBox').hidden = false;
});
canvas.addEventListener('pointerup', (e) => {
  if (!cropDrag) return;
  const { left, top, f, r } = cropRect(e);
  cropDrag = null;
  if (f > 0.03) {
    const c = Cam.getCrop(camera) || { x: 0, y: 0, w: 1, h: 1 };
    Cam.setCrop(camera, { x: c.x + (left / r.width) * c.w, y: c.y + (top / r.height) * c.h, w: c.w * f, h: c.h * f });
    camera.updateProjectionMatrix();
  }
  setCropMode(false);
  afterCameraMove();
});

// Navigation schemes
let altDown = false;
function applyNav() {
  const scheme = $('navScheme').value;
  const M = THREE.MOUSE;
  for (const c of [controls, viewControls]) {
    c.zoomToCursor = $('zoomCursor').checked && viewLayout === 'single';
    if (scheme === 'blender') c.mouseButtons = { LEFT: altDown ? M.ROTATE : -1, MIDDLE: M.ROTATE, RIGHT: -1 };
    else if (scheme === 'maya') c.mouseButtons = altDown ? { LEFT: M.ROTATE, MIDDLE: M.PAN, RIGHT: M.DOLLY } : { LEFT: -1, MIDDLE: M.PAN, RIGHT: -1 };
    else c.mouseButtons = { LEFT: M.ROTATE, MIDDLE: M.DOLLY, RIGHT: M.PAN };
  }
}
for (const id of ['navScheme', 'zoomCursor', 'keyScheme']) {
  const el = $(id);
  if (settings[id] !== undefined) el[el.type === 'checkbox' ? 'checked' : 'value'] = settings[id];
  el.addEventListener('change', () => {
    settings[id] = el.type === 'checkbox' ? el.checked : el.value;
    saveSettings();
    applyNav();
  });
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Alt') { e.preventDefault(); if (!altDown) { altDown = true; applyNav(); } }
});
window.addEventListener('keyup', (e) => { if (e.key === 'Alt') { altDown = false; applyNav(); } });
window.addEventListener('blur', () => { altDown = false; applyNav(); });
applyNav();

// View helpers (Blender numpad / Maya F / A)
function viewFrom(vec) {
  const p = panes[activePane];
  if (p && ORTHO[p.view]) {
    // On an ortho pane the numpad picks which side it looks from.
    const a = [Math.abs(vec.x), Math.abs(vec.y), Math.abs(vec.z)];
    const m = a.indexOf(Math.max(...a));
    const v = m === 0 ? (vec.x > 0 ? 'left' : 'right') : m === 1 ? (vec.y > 0 ? 'top' : 'bottom') : vec.z > 0 ? 'front' : 'back';
    return setPaneView(activePane, v);
  }
  const cam = activeCam(), ctl = activeControls();
  const dist = cam.position.distanceTo(ctl.target);
  cam.position.copy(ctl.target).addScaledVector(vec.clone().normalize(), dist);
  if (Math.abs(vec.y) > 0.99) cam.position.addScaledVector(rig ? rig.frame().fwd : new THREE.Vector3(0, 0, 1), dist * 1e-3);
  ctl.update();
  if (lookThrough) setRoll(0);
  afterCameraMove();
}
function orbitBy(yaw, pitch) {
  const cam = activeCam(), ctl = activeControls();
  if (cam.isOrthographicCamera) return;
  const off = cam.position.clone().sub(ctl.target);
  const s = new THREE.Spherical().setFromVector3(off);
  s.theta += yaw * RAD;
  s.phi = THREE.MathUtils.clamp(s.phi - pitch * RAD, 0.01, Math.PI - 0.01);
  cam.position.copy(ctl.target).add(off.setFromSpherical(s));
  ctl.update();
  afterCameraMove();
}
function dollyBy(k) {
  const cam = activeCam(), ctl = activeControls();
  if (cam.isOrthographicCamera) { cam.zoom /= k; cam.updateProjectionMatrix(); return requestRender(); }
  cam.position.sub(ctl.target).multiplyScalar(k).add(ctl.target);
  ctl.update();
  afterCameraMove();
}
// Centre a free / ortho view on a sphere.
function fitView(cam, ctl, center, radius) {
  ctl.target.copy(center);
  if (cam.isOrthographicCamera) {
    cam.zoom = ORTHO_HALF / Math.max(0.05, radius);
    cam.updateProjectionMatrix();
  } else {
    const d = cam.position.clone().sub(ctl.target).normalize();
    cam.position.copy(center).addScaledVector(d, radius / Math.sin((cam.fov * RAD) / 2));
  }
  ctl.update();
}
function frameAll() {
  if (!rig) return;
  if (activeCam().isOrthographicCamera) {
    const sph = rig.bounds();
    fitView(activeCam(), activeControls(), sph.center, sph.radius * 0.9);
    return requestRender();
  }
  if (lookThrough) {
    const dir = camera.position.clone().sub(controls.target).normalize();
    Cam.fitShot(camera, controls, rig, { size: 'Full body', dir, roll, cx: 0 });
  } else {
    const sph = rig.bounds();
    const d = viewCam.position.clone().sub(viewControls.target).normalize();
    viewControls.target.copy(sph.center);
    viewCam.position.copy(sph.center).addScaledVector(d, sph.radius / Math.sin((viewCam.fov * RAD) / 2));
    viewControls.update();
  }
  afterCameraMove();
}
function frameSelected() {
  if (appMode !== 'pose' && props.active) {
    const sph = new THREE.Box3().setFromObject(props.active).getBoundingSphere(new THREE.Sphere());
    fitView(activeCam(), activeControls(), sph.center, Math.max(0.2, sph.radius));
    return afterCameraMove();
  }
  const key = selected?.startsWith('ik:') ? selected.slice(3) : selected;
  if (!rig || !key || !rig.map[key]) return frameAll();
  const cam = activeCam(), ctl = activeControls();
  const p = rig.map[key].getWorldPosition(new THREE.Vector3());
  const r = rig.height * (rig.isFingerKey(key) || key.includes('Hand') ? 0.07 : key === 'head' || key === 'neck' ? 0.12 : 0.25);
  if (cam.isOrthographicCamera) fitView(cam, ctl, p, r);
  else {
    const d = cam.position.clone().sub(ctl.target).normalize();
    ctl.target.copy(p);
    cam.position.copy(p).addScaledVector(d, r / Math.tan((cam.fov * RAD) / 2));
    ctl.update();
  }
  afterCameraMove();
}

function renderViews() {
  const box = $('views');
  box.innerHTML = '';
  Cam.loadViews().forEach((v, i) => {
    const w = document.createElement('span');
    w.className = 'view';
    const go = document.createElement('button');
    go.textContent = v.name;
    go.addEventListener('click', () => {
      setRoll(Cam.restoreCamera(v.cam, camera, controls));
      setLookThrough(true);
      syncFovUI();
      afterCameraMove();
    });
    const del = document.createElement('button');
    del.textContent = '×';
    del.title = 'Delete view';
    del.addEventListener('click', () => {
      const list = Cam.loadViews();
      list.splice(i, 1);
      Cam.saveViews(list);
      renderViews();
    });
    w.append(go, del);
    box.append(w);
  });
}
$('saveView').addEventListener('click', () => {
  const list = Cam.loadViews();
  const name = $('viewName').value.trim() || 'View ' + (list.length + 1);
  list.push({ name, cam: Cam.serializeCamera(camera, controls, roll) });
  Cam.saveViews(list);
  $('viewName').value = '';
  renderViews();
});
window.addEventListener('storage', (e) => { if (e.key === 'riggedPose.views.v1') renderViews(); });

function syncFovUI() {
  $('fov').value = camera.fov;
  $('fovOut').textContent = `${camera.fov.toFixed(1)}° ≈ ${Math.round(Cam.lensForFov(camera.fov, camera.aspect))} mm`;
}

let currentTags = '';
function updateTags() {
  if (!rig) return;
  applyRoll();
  const { W, H } = size();
  const kp2 = projectKeypoints(rig.keypoints(camera.position), camera, W, H);
  currentTags = Cam.cameraTags(rig, camera, controls.target, roll, kp2, W, H, $('tagStyle').value);
  $('tags').value = currentTags;
  $('tagsHud').textContent = currentTags;
  if (CTX !== 'tab') bridge?.setState?.(CTX, JSON.stringify({ tags: currentTags }));
}
const queueCameraChange = debounce(() => { updateTags(); queueSync(); settings.cameras = camerasData(); saveSettings(); }, 250);
$('tagStyle').addEventListener('change', () => { settings.tagStyle = $('tagStyle').value; saveSettings(); updateTags(); });
$('copyTags').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(currentTags); toast('Copied'); } catch { $('tags').select(); document.execCommand('copy'); }
});
$('appendTags').addEventListener('click', () => {
  if (!bridge?.appendPrompt) return toast('Not running inside the WebUI', true);
  bridge.appendPrompt(followTarget(), currentTags);
  toast('Added to ' + followTarget() + ' prompt');
});

// ------------------------------------------------------------------ output panel

const PASSES = [
  { id: 'openpose', label: 'OpenPose', on: true, unit: 0 },
  { id: 'depth', label: 'Depth', on: true, unit: 1 },
  { id: 'normal', label: 'Normal', on: false, unit: -1 },
  { id: 'edge', label: 'Canny / lineart', on: false, unit: -1 },
  { id: 'mask', label: 'Mask', on: false, unit: -1 },
  { id: 'shaded', label: 'Shaded render', on: false, unit: -1 },
  { id: 'seg', label: 'Segmentation (ADE20K)', on: false, unit: -1 },
  { id: 'light', label: 'Light (IC-Light)', on: false, unit: -1 },
  { id: 'regions', label: 'Region map + person masks', on: false, unit: -1 },
  { id: 'handDepth', label: 'Hands: depth', on: false, unit: -1 },
  { id: 'handMask', label: 'Hands: mask', on: false, unit: -1 },
  { id: 'handPose', label: 'Hands: OpenPose', on: false, unit: -1 },
];
// Pass -> unit bundles with sensible weights. Preprocessor must be "None" in
// each unit, as the images already are control maps.
const CN_PRESETS = {
  'Pose only': { units: { openpose: [0, 1.0] }, hint: 'OpenPose model, weight 1.0.' },
  'Pose + Depth': { units: { openpose: [0, 1.0], depth: [1, 0.55] }, hint: 'Body shape from depth without locking details. Good default.' },
  'Pose + Depth + Canny': { units: { openpose: [0, 1.0], depth: [1, 0.5], edge: [2, 0.4] }, hint: 'Tight silhouette and props; lower canny if it looks stiff.' },
  'Pose + Seg (scene layout)': { units: { openpose: [0, 1.0], seg: [1, 0.7] }, hint: 'Furniture, walls and floor by class (seg model).' },
  'Depth + Normal (shape)': { units: { depth: [0, 0.7], normal: [1, 0.5] }, hint: 'Sculpted body and props, no skeleton.' },
  'Union: Pose + Depth': { units: { openpose: [0, 1.0], depth: [1, 0.6] }, hint: 'ControlNet Union / ProMax in both units, control type set per unit.' },
  'Regions for couple prompts': { units: { openpose: [0, 1.0] }, extra: ['regions'], hint: 'Region map and per-person masks: download them for Regional Prompter / Forge Couple.' },
  'Lighting (IC-Light)': { units: {}, extra: ['light', 'mask'], hint: 'Light and mask images for IC-Light; set the light direction below.' },
};
const passLabel = (id) => PASSES.find((p) => p.id === id)?.label || id.replace(/^person_/, 'Mask: ');
const fileName = (id, res) => `${id.replace(/[^\w-]+/g, '_')}_${res.W}x${res.H}.png`;
const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
settings.passes ||= {};
const tbody = $('passTable').querySelector('tbody');
for (const p of PASSES) {
  const cfg = (settings.passes[p.id] ||= { on: p.on, unit: p.unit });
  const tr = document.createElement('tr');
  const cb = Object.assign(document.createElement('input'), { type: 'checkbox', checked: cfg.on });
  cb.addEventListener('change', () => { cfg.on = cb.checked; saveSettings(); });
  const sel = document.createElement('select');
  sel.add(new Option('—', '-1'));
  for (let i = 0; i < 8; i++) sel.add(new Option('Unit ' + i, String(i)));
  sel.value = String(cfg.unit);
  sel.addEventListener('change', () => { cfg.unit = +sel.value; saveSettings(); });
  const td = (el) => { const c = document.createElement('td'); if (typeof el === 'string') c.textContent = el; else c.append(el); return c; };
  tr.append(td(cb), td(p.label), td(sel));
  tbody.append(tr);
}

for (const id of ['segBg', 'lightAz', 'lightEl']) {
  const el = $(id);
  if (settings[id] !== undefined) el.value = settings[id];
  const show = () => { if ($(id + 'Out')) $(id + 'Out').textContent = el.value + '°'; };
  show();
  el.addEventListener('input', () => { settings[id] = el.value; saveSettings(); show(); });
}
Object.keys(CN_PRESETS).forEach((n) => $('cnPreset').add(new Option(n, n)));
$('cnPreset').value = settings.cnPreset || 'Pose + Depth';
const showHint = () => { $('cnHint').textContent = CN_PRESETS[$('cnPreset').value].hint + ($('cnAuto').checked ? ' Send sets the control type and Preprocessor None for you.' : ' Set Preprocessor to "None".'); };
showHint();
$('cnPreset').addEventListener('change', showHint);
$('cnApply').addEventListener('click', () => {
  const pr = CN_PRESETS[$('cnPreset').value];
  settings.cnPreset = $('cnPreset').value;
  for (const p of PASSES) {
    const u = pr.units[p.id];
    settings.passes[p.id] = { on: !!u || (pr.extra || []).includes(p.id), unit: u ? u[0] : -1 };
  }
  saveSettings();
  [...tbody.rows].forEach((tr, i) => {
    const cfg = settings.passes[PASSES[i].id];
    tr.querySelector('input').checked = cfg.on;
    tr.querySelector('select').value = String(cfg.unit);
  });
  let weights = 0;
  for (const [, [unit, w]] of Object.entries(pr.units)) if (bridge?.setUnitWeight?.(followTarget(), unit, w)) weights++;
  toast(`Preset applied${weights ? `, ${weights} ControlNet weight(s) set` : ''}`);
});
const OPT_IDS = ['cnAuto', 'propAutoHold', 'keepDetectRef', 'jointLimits', 'autoBalance', 'spineFollow', 'pinFeet', 'liveMirror', 'ikSnap', 'eyesFollow', 'optFace70', 'optHands', 'optFace', 'optExtras', 'optGuides', 'optFlipX', 'optFlipY', 'optOverlay', 'autoSend', 'linkEditors', 'followSize'];
for (const id of OPT_IDS) {
  const el = $(id);
  if (settings[id] !== undefined) el.checked = settings[id];
  el.addEventListener('change', () => {
    settings[id] = el.checked;
    saveSettings();
    if (id === 'optOverlay' || id === 'optGuides') requestRender();
    if (id === 'autoSend') registerAutoSend();
    if (id === 'followSize') pollSize();
    if (id === 'jointLimits') setJointLimits(el.checked, true);
  });
}
setJointLimits($('jointLimits').checked, false);

// Turning limits on also brings the current poses back into range (undoable).
function setJointLimits(on, apply) {
  Rig.useLimits = on;
  if (!on || !apply) return;
  for (const c of characters) {
    if (!c.rig) continue;
    const before = c.rig.getPose();
    if (c.rig.clampLimits()) undoStack.push({ id: c.id, pose: before });
  }
  poseChanged();
  toast('Joint limits on');
}
if (settings.tagStyle) $('tagStyle').value = settings.tagStyle;
if (settings.W) outW.value = settings.W;
if (settings.H) outH.value = settings.H;
if (settings.targetTab) $('targetTab').value = settings.targetTab;
for (const el of [outW, outH]) {
  el.addEventListener('change', () => {
    $('followSize').checked = false;
    settings.followSize = false;
    settings.W = +outW.value; settings.H = +outH.value;
    saveSettings();
    layout();
  });
}
// Frame presets: same pixel area as now, sides rounded to 64. Inside the
// WebUI the generation size follows too (when "Follow WebUI" is on).
const ASPECTS = [['1:1', 1, 1, 'Square'], ['2:3', 2, 3, 'Portrait'], ['3:4', 3, 4, 'Portrait'], ['9:16', 9, 16, 'Tall'],
  ['3:2', 3, 2, 'Landscape'], ['4:3', 4, 3, 'Landscape'], ['16:9', 16, 9, 'Wide']];
function setAspect(rw, rh) {
  const area = Math.max(512 * 512, (+outW.value || 1024) * (+outH.value || 1024));
  const w = Math.max(256, Math.round(Math.sqrt((area * rw) / rh) / 64) * 64);
  const h = Math.max(256, Math.round(Math.sqrt((area * rh) / rw) / 64) * 64);
  outW.value = w; outH.value = h;
  settings.W = w; settings.H = h;
  if ($('followSize').checked && bridge?.setSize?.(followTarget(), w, h)) toast(`Frame ${w}×${h} · WebUI size set too`);
  else {
    $('followSize').checked = false;
    settings.followSize = false;
    toast(`Frame ${w}×${h}`);
  }
  saveSettings();
  layout();
  markAspect();
}
function markAspect() {
  const r = (+outW.value || 1) / (+outH.value || 1);
  document.querySelectorAll('[data-aspects] button[data-r]').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.r - r) < 0.03));
}
for (const box of document.querySelectorAll('[data-aspects]')) {
  for (const [label, rw, rh, kind] of ASPECTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.r = String(rw / rh);
    b.title = `${kind} ${label}`;
    const icon = document.createElement('i');
    const k = 14 / Math.max(rw, rh);
    Object.assign(icon.style, { width: rw * k + 'px', height: rh * k + 'px' });
    b.append(icon, label);
    b.addEventListener('click', () => setAspect(rw, rh));
    box.append(b);
  }
  const flip = document.createElement('button');
  flip.type = 'button';
  flip.textContent = '⇄';
  flip.title = 'Swap portrait / landscape';
  flip.addEventListener('click', () => setAspect(+outH.value, +outW.value));
  box.append(flip);
}
for (const el of [outW, outH]) el.addEventListener('input', markAspect);
setInterval(markAspect, 1500);
markAspect();
$('targetTab').addEventListener('change', () => {
  settings.targetTab = $('targetTab').value;
  saveSettings();
  pollSize();
  registerAutoSend();
});
if (CTX !== 'tab') $('targetRow').hidden = true;
if (!bridge) $('followSize').checked = false;

function capture() {
  if (!rig) return null;
  applyRoll();
  const { W, H } = size();
  const want = new Set(PASSES.filter((p) => settings.passes[p.id].on).map((p) => p.id));
  if (!want.size) { toast('No pass enabled', true); return null; }
  const t0 = performance.now();
  props.setCaptureMode(true);
  let out;
  try {
    passes.renderer.shadowMap.enabled = !!lightRig.state.shadows;
    passes.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    out = passes.render({
      scene, camera, rigs: visibleRigs(), W, H,
      hide: [handles, gizmo, grid, ikTargets, shotHelper, camHelpers, props.gizmo, aimMarker, lightRig.handles],
      maskHide: $('maskCharOnly').checked ? [props.group] : [],
      segGroups: [
        ...characters.filter((c) => c.visible && c.root).map((c) => ({ objects: [c.root], color: segColor('person') })),
        ...props.meshes.filter((m) => m.visible).map((m) => ({ objects: [m], color: segColor(m.userData.seg || defaultSegClass(m.userData.kind)) })),
      ],
      segBackground: $('segBg').value ? segColor($('segBg').value) : [0, 0, 0],
      regionGroups: characters.filter((c) => c.visible && c.root).map((c) => ({ name: c.name, objects: [c.root], color: hexRGB(c.color) })),
      light: $('lightFollowKey').checked ? lightRig.keyRelativeTo(camera) : { az: +$('lightAz').value, el: +$('lightEl').value },
      extraBox: props.worldBounds(),
      passes: want,
      opts: {
        hands: $('optHands').checked, face: $('optFace').checked,
        flipX: $('optFlipX').checked, flipY: $('optFlipY').checked, extras: $('optExtras').checked,
        face70: $('optFace70').checked, eyesFollow: $('eyesFollow').checked,
      },
    });
  } finally {
    props.setCaptureMode(false);
  }
  const result = { W, H, json: out.openposeJSON, images: {} };
  for (const p of PASSES) if (out[p.id]) result.images[p.id] = out[p.id].toDataURL('image/png');
  for (const pm of out.personMasks || []) result.images['person_' + pm.name] = pm.canvas.toDataURL('image/png');
  lastCapture = result;
  showThumbs(result);
  requestRender();
  console.debug(`[rigged-pose] captured ${want.size} passes at ${W}x${H} in ${(performance.now() - t0) | 0} ms`);
  return result;
}

function showThumbs(res) {
  const box = $('thumbs');
  box.innerHTML = '';
  for (const [id, url] of Object.entries(res.images)) {
    const f = document.createElement('figure');
    f.title = 'Click to download';
    const img = new Image();
    img.src = url;
    const c = document.createElement('figcaption');
    c.textContent = passLabel(id);
    f.append(img, c);
    f.addEventListener('click', () => download(fileName(id, res), url));
    box.append(f);
  }
}

// Which ControlNet control type each pass is for (bridge.configureUnit).
const PASS_CN_KIND = { openpose: 'openpose', handPose: 'openpose', depth: 'depth', handDepth: 'depth', normal: 'normal', edge: 'canny', seg: 'seg' };
async function sendCapture(res, tab = followTarget()) {
  if (!bridge?.sendToControlNet) { toast('Not running inside the WebUI: use the downloads instead', true); return false; }
  const jobs = PASSES.filter((p) => res.images[p.id] && settings.passes[p.id].unit >= 0);
  if (!jobs.length) { toast('Pick a ControlNet unit for at least one pass', true); return false; }
  const errs = [];
  const setup = [];
  for (const p of jobs) {
    const unit = settings.passes[p.id].unit;
    // Control type, preprocessor None and a matching model, before the image goes in.
    if ($('cnAuto').checked && bridge.configureUnit) {
      try {
        const done = await bridge.configureUnit(tab, unit, PASS_CN_KIND[p.id] || null);
        if (done?.length) setup.push(`unit ${unit}: ${done.join(', ')}`);
      } catch (e) { console.warn('ControlNet setup', e); }
    }
    const r = await bridge.sendToControlNet(tab, unit, res.images[p.id], `${p.id}.png`);
    if (!r.ok) errs.push(`${p.label}: ${r.msg}`);
  }
  if (setup.length) console.info('Marionette ControlNet setup:', setup.join(' · '));
  if (errs.length) toast(errs.join(' · '), true);
  else toast(`Sent ${jobs.map((p) => p.label + ' → ' + settings.passes[p.id].unit).join(', ')} (${tab})`);
  return !errs.length;
}

$('capture').addEventListener('click', capture);
$('send').addEventListener('click', async () => {
  const res = capture();
  if (res) await sendCapture(res);
});
$('downloadAll').addEventListener('click', () => {
  const res = lastCapture || capture();
  if (!res) return;
  for (const [id, url] of Object.entries(res.images)) download(fileName(id, res), url);
});
$('downloadJSON').addEventListener('click', () => {
  const res = lastCapture?.json ? lastCapture : capture();
  if (res?.json) download('openpose.json', jsonURL(res.json));
  else toast('Enable the OpenPose pass first', true);
});

const editorApi = {
  ctx: CTX,
  autoSend: () => $('autoSend').checked,
  async captureAndSend(tab) {
    const res = capture();
    return res ? sendCapture(res, tab) : false;
  },
};
function registerAutoSend() {
  if (!bridge?.registerEditor) return;
  bridge.registerEditor(followTarget(), editorApi, INSTANCE);
}

// ------------------------------------------------------------------ sync between editors

// Editors in the same WebUI page share one thread, so syncing must be cheap:
// only real changes are sent (an editor never echoes back what it just
// received), each part is applied only if it differs, and an editor that is
// not on screen (closed accordion, other tab) defers the work until it shows.
const lastSync = { characters: '', props: '', camera: '', cameras: '', active: '' };
let syncQuietUntil = 0;
let propsCache = { version: -1, json: null, str: '' };
let propsVersion = 0;
function syncPayload() {
  if (propsCache.version !== propsVersion) {
    const json = props.serialize();
    propsCache = { version: propsVersion, json, str: JSON.stringify(json) };
  }
  const characters = serializeCharacters(), cam = camState(), cams = camerasData(false);
  return { characters, active: activeChar?.id, camera: cam, cameras: cams, props: propsCache.json,
    str: { characters: JSON.stringify(characters), camera: JSON.stringify(cam), cameras: JSON.stringify(cams), props: propsCache.str, active: String(activeChar?.id) } };
}
function syncNow({ force = false } = {}) {
  if (!rig || !$('linkEditors').checked) return;
  const wait = syncQuietUntil - performance.now();
  if (!force && (applyingSync || wait > 0)) { setTimeout(queueSync, Math.max(50, wait)); return; }
  const p = syncPayload();
  const changed = Object.keys(lastSync).filter((k) => p.str[k] !== lastSync[k]);
  if (!changed.length) return;
  Object.assign(lastSync, p.str);
  perf.syncsOut++;
  store.set(SYNC_KEY, {
    from: INSTANCE, t: Date.now(), characters: p.characters, active: p.active, camera: p.camera, cameras: p.cameras,
    // Prop meshes are the heavy part: only sent when they changed.
    props: changed.includes('props') ? p.props : undefined, propsSame: !changed.includes('props'),
  });
}
const queueSync = debounce(() => syncNow(), 250);

async function applySync(data) {
  if (!data || data.from === INSTANCE || !$('linkEditors').checked) return;
  applyingSync = true;
  try {
    const str = (v) => JSON.stringify(v);
    if (data.characters) {
      const cs = str(data.characters);
      if (cs !== lastSync.characters || String(data.active) !== lastSync.active) {
        lastSync.characters = cs;
        lastSync.active = String(data.active);
        await restoreCharacters(data.characters, data.active);
      }
    } else if (data.model) await restoreCharacters([{ id: activeChar?.id || 'c1', name: 'Character', spec: data.model, pose: data.pose }], activeChar?.id);
    if (data.props && !data.propsSame) {
      const ps = str(data.props);
      if (ps !== lastSync.props) { lastSync.props = ps; props.load(data.props, { silent: true }); refreshXform(); }
    }
    if (data.cameras) {
      const cs = str(data.cameras);
      if (cs !== lastSync.cameras) { lastSync.cameras = cs; lastSync.camera = ''; restoreCameras(data.cameras, { applyActive: false }); }
    }
    if (data.camera) {
      const cs = str(data.camera);
      if (cs !== lastSync.camera) { lastSync.camera = cs; putCamState(data.camera); refreshCamHelpers(); updateViewHud(); }
    }
    if (ikMode) placeIkTargets();
    updateTags();
    requestRender();
  } finally {
    applyingSync = false;
    // What we now show is the baseline: only later edits here are news to the
    // others, and whatever the restore itself queued is an echo.
    if (data.props && !data.propsSame) propsCache = { version: ++propsVersion, json: data.props, str: JSON.stringify(data.props) };
    if (rig) Object.assign(lastSync, syncPayload().str);
    syncQuietUntil = performance.now() + 1000;
  }
}
let pendingSync = null;
window.addEventListener('storage', (e) => {
  if (e.key !== SYNC_KEY || !e.newValue) return;
  let data;
  try { data = JSON.parse(e.newValue); } catch { return; }
  if (data.from === INSTANCE) return;
  perf.syncsIn++;
  if (!editorShown()) {
    // Off screen: keep only the latest state (and the last full props) for later.
    if (data.propsSame && pendingSync?.props && !pendingSync.propsSame) { data.props = pendingSync.props; data.propsSame = false; }
    pendingSync = data;
    return;
  }
  applySync(data);
});

// Is this editor on screen? A closed accordion, another WebUI tab or scrolling
// it out of view hides the iframe. The parent page tells us through an
// IntersectionObserver (no polling: asking for layout every few hundred ms
// forces the whole WebUI page to reflow).
let onScreen = true;
const editorShown = () => onScreen && !document.hidden;
let wasShown = true;
function visibilityChanged() {
  const now = editorShown();
  if (now === wasShown) return;
  wasShown = now;
  if (!now) return;
  if (pendingSync) { const d = pendingSync; pendingSync = null; applySync(d); }
  layout();
  requestRender();
}
try {
  const f = window.frameElement;
  if (f && window.parent.IntersectionObserver) {
    new window.parent.IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      visibilityChanged();
    }).observe(f);
  }
} catch { /* cross-origin parent: assume visible */ }
document.addEventListener('visibilitychange', visibilityChanged);

// ------------------------------------------------------------------ pose library

// Small preview of the active character only, seen from the front three-quarter.
const thumbTarget = new THREE.WebGLRenderTarget(128, 160, { samples: 4 });
thumbTarget.texture.colorSpace = THREE.SRGBColorSpace;
const thumbCam = new THREE.PerspectiveCamera(28, 128 / 160, 0.05, 100);
// extra: objects shown with the character (held props), framed with it.
// place(cam): a custom view instead of framing the whole character.
function renderThumb(extra = [], place = null) {
  if (!rig) return '';
  rig.root.updateMatrixWorld(true);
  extra.forEach((o) => scene.add(o));
  if (place) place(thumbCam);
  else {
    const sph = rig.bounds();
    for (const o of extra) {
      o.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(o);
      sph.expandByPoint(b.min).expandByPoint(b.max);
    }
    const dir = new THREE.Vector3(0.55, 0.18, 1).normalize().applyQuaternion(rig.facing());
    thumbCam.position.copy(sph.center).addScaledVector(dir, (sph.radius * 0.92) / Math.sin(THREE.MathUtils.degToRad(thumbCam.fov / 2)));
    thumbCam.lookAt(sph.center);
  }
  thumbCam.updateMatrixWorld(true);
  const hide = [handles, gizmo, props.gizmo, grid, ikTargets, shotHelper, camHelpers, aimMarker, lightRig.handles, lightRig.catcher, props.group, ...characters.filter((c) => c !== activeChar).map((c) => c.root)]
    .filter((o) => o && o.visible);
  hide.forEach((o) => { o.visible = false; });
  const bg = scene.background;
  scene.background = null;
  const prevTarget = renderer.getRenderTarget();
  const clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
  renderer.setScissorTest(false);
  renderer.setRenderTarget(thumbTarget);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, thumbCam);
  const px = new Uint8Array(128 * 160 * 4);
  renderer.readRenderTargetPixels(thumbTarget, 0, 0, 128, 160, px);
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(clear, alpha);
  scene.background = bg;
  hide.forEach((o) => { o.visible = true; });
  const c = document.createElement('canvas');
  c.width = 128; c.height = 160;
  const img = c.getContext('2d').createImageData(128, 160);
  for (let y = 0; y < 160; y++) img.data.set(px.subarray((159 - y) * 512, (160 - y) * 512), y * 512);
  c.getContext('2d').putImageData(img, 0, 0);
  extra.forEach((o) => scene.remove(o));
  requestRender();
  return c.toDataURL('image/webp', 0.85);
}

// Mirror a local pose (left <-> right).
function mirrorLocalPose(lp) {
  const m = (a) => [a[0], -a[1], -a[2], a[3]];
  const bones = {};
  for (const [k, a] of Object.entries(lp.bones)) {
    const side = k.startsWith('left') ? 'left' : k.startsWith('right') ? 'right' : null;
    bones[side ? (side === 'left' ? 'right' : 'left') + k.slice(side.length) : k] = m(a);
  }
  return { ...lp, bones };
}

// A throwaway mesh for a library part (painted faces in their own colours).
function polyMesh(poly, color) {
  const geo = poly.toGeometry(color).geometry;
  const painted = !!geo.getAttribute('color');
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: painted ? 0xffffff : color, vertexColors: painted, roughness: 0.75, side: THREE.DoubleSide }));
}
// Stand-ins for held props in a thumbnail (the real props are hidden there).
function thumbProps(held) {
  return held.map((h) => {
    const mesh = h.mesh ? new THREE.Mesh(h.mesh.geometry, h.mesh.material)
      : polyMesh(h.poly, h.poly.color ?? 0x9aa5b1);
    mesh.matrixAutoUpdate = false;
    if (h.mesh) mesh.matrix.copy(h.mesh.matrixWorld);
    else slotFrame(rig, h.slot, mesh.matrix)?.multiply(offsetMatrix(h.o));
    mesh.userData.temp = !h.mesh;
    return mesh;
  });
}
const disposeThumbProps = (list) => list.forEach((m) => { if (m.userData.temp) { m.geometry.dispose(); m.material.dispose(); } });
// Props the active character holds, as a pose stores them.
const heldList = (c) => heldMeshes().filter((m) => m.userData.held.char === c?.id && m.userData.lib)
  .map((m) => ({ lib: m.userData.lib.slice(0, 2), part: m.userData.lib[2] || 0, slot: m.userData.held.slot, o: m.userData.held.o, mesh: m }));
const catalogById = new Map(CATALOG.map((e) => [e.id, e]));
// A support prop (seat, wall, step) in the character's frame: [cat, item, [x, y, z], yaw].
function supportMatrix(r, sup, out = new THREE.Matrix4()) {
  const yaw = r.facing();
  const hp = r.map.hips.getWorldPosition(new THREE.Vector3());
  const off = new THREE.Vector3(...(sup[2] || [0, 0, 0])).applyQuaternion(yaw);
  const q = yaw.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(sup[3] || 0)));
  return out.compose(new THREE.Vector3(hp.x + off.x, off.y, hp.z + off.z), q, new THREE.Vector3(1, 1, 1));
}
function thumbSupport(sup) {
  const poly = sup && [LIBRARY[sup[0]]?.[sup[1]]?.()].flat()[0];
  if (!poly) return [];
  const mesh = polyMesh(poly, poly.color ?? 0x8f99a6);
  mesh.matrixAutoUpdate = false;
  supportMatrix(rig, sup, mesh.matrix);
  mesh.userData.temp = true;
  return [mesh];
}
// Seats, walls and steps a pose brings: one per character, replaced by the next.
function ensureSupport(c, sup) {
  const old = props.meshes.filter((m) => m.userData.supportFor === c.id);
  if (old.length) props.removeMeshes(old);
  const poly = sup && [LIBRARY[sup[0]]?.[sup[1]]?.()].flat()[0];
  if (poly) {
    const m = props.addHeld(poly, [sup[0], sup[1], 0]);
    m.userData.grip = null;
    m.userData.supportFor = c.id;
    m.userData.env = sup[0] === 'Room';
    supportMatrix(c.rig, sup).decompose(m.position, m.quaternion, m.scale);
  }
  props._changed();
}

const poseLibrary = new PoseLibrary({
  root: $('poseLib'),
  toast: (m, e) => toast(m, e),
  categories: CATEGORIES,
  builtins: () => CATALOG.map((e) => ({ id: e.id, name: e.name, tags: e.tags || [], cat: e.cat, adult: !!e.adult, badge: e.prop ? '⚔' : e.body?.support ? '▭' : '' })),
  builtinPose(id) {
    if (!rig) return null;
    const e = catalogById.get(id);
    if (!e) return null;
    const snap = boneSnapshot();
    const { held, support } = applyEntry(rig, e, { root: activeChar.root, HAND_PRESETS, POSE_PRESETS });
    const temp = [...thumbProps(held), ...thumbSupport(support)];
    const out = { pose: rig.getLocalPose(), thumb: renderThumb(temp) };
    disposeThumbProps(temp);
    if (held.length) out.pose.props = held.map(({ lib, part, slot, o }) => ({ lib, part, slot, o }));
    if (support) out.pose.support = support;
    restoreBones(snap);
    return out;
  },
  capture: () => {
    const held = heldList(activeChar);
    const temp = thumbProps(held);
    const pose = rig.getLocalPose();
    if (held.length) pose.props = held.map(({ lib, part, slot, o }) => ({ lib, part, slot, o }));
    const thumb = renderThumb(temp);
    return { pose, thumb };
  },
  applyPose(pose, region, mirror, withProps = true) {
    if (!rig) return;
    pushUndo();
    rig.applyLocalPose(mirror ? mirrorLocalPose(pose) : pose, region === 'all' ? null : rig.regionKeys(region));
    if (withProps && pose.props?.length) {
      const swap = { left: 'right', right: 'left', back: 'back' };
      ensureHeld(activeChar, pose.props.map((p) => ({ ...p, slot: mirror ? swap[p.slot] : p.slot })));
    }
    if (withProps && region === 'all') {
      const sup = pose.support && mirror ? [pose.support[0], pose.support[1], [-(pose.support[2]?.[0] || 0), pose.support[2]?.[1] || 0, pose.support[2]?.[2] || 0], -(pose.support[3] || 0)] : pose.support;
      if (sup || props.meshes.some((m) => m.userData.supportFor === activeChar.id)) ensureSupport(activeChar, sup);
    }
    poseChanged();
  },
  hands: () => Object.keys(HAND_SHAPES).map((name) => ({ id: name, name, tags: ['hand'] })),
  handThumb: (id) => renderHandThumb(id),
  applyHand(id, sides) {
    if (!rig) return;
    pushUndo();
    for (const side of sides) setHandShape(rig, side, HAND_SHAPES[id]);
    poseChanged();
  },
});
// Close-up of a hand shape on the active character's right hand.
function renderHandThumb(id) {
  if (!rig?.map.rightHand) return '';
  const snap = boneSnapshot();
  rig.applyDirections({ rightUpperArm: [-0.3, -0.2, 1], rightLowerArm: [0, 1, 0.15] });
  setHandShape(rig, 'right', HAND_SHAPES[id]);
  rig.root.updateMatrixWorld(true);
  const h = rig.map.rightHand.getWorldPosition(new THREE.Vector3());
  const m = (rig.fingers.right.Middle?.[0] || rig.map.rightHand).getWorldPosition(new THREE.Vector3());
  const c = h.clone().lerp(m, 0.9);
  const yaw = rig.facing();
  const url = renderThumb([], (cam) => {
    cam.position.copy(c).add(new THREE.Vector3(-0.07, 0.03, 0.3).applyQuaternion(yaw).multiplyScalar(rig.height / 1.72));
    cam.lookAt(c);
  });
  restoreBones(snap);
  return url;
}
$('openPoseLib').addEventListener('click', () => poseLibrary.toggle());

// ------------------------------------------------------------------ animation clips

// Clips of the active model play on it directly; clips from animation files are
// sampled on their own skeleton and retargeted through the canonical pose
// (with a rest-pose correction, so T-pose clips fit A-pose models too).
const animSources = [];
let anim = null; // { kind, clip, src, t, facing0, hips0, srcFacing0, srcHips0, corr }
let animPlaying = false;

function refreshClipList() {
  const sel = $('animClip');
  const keep = sel.value;
  sel.innerHTML = '';
  sel.add(new Option(activeChar?.clips?.length || animSources.length ? '— choose a clip —' : 'No clips (load a file)', ''));
  (activeChar?.clips || []).forEach((c, i) => sel.add(new Option(`${c.name || 'Clip ' + (i + 1)} (model)`, `own:${i}`)));
  animSources.forEach((src, j) => src.clips.forEach((c, i) => sel.add(new Option(`${c.name || 'Clip ' + (i + 1)} · ${src.name}`, `ext:${j}:${i}`))));
  sel.value = [...sel.options].some((o) => o.value === keep) ? keep : '';
}

// One action per clip, played once and held, so the last frame is the last
// pose (a looping action would wrap the end back to frame 0).
function clipAction(mixer, clip) {
  const a = mixer.clipAction(clip);
  a.setLoop(THREE.LoopOnce, 1);
  a.clampWhenFinished = true;
  return a;
}
function sampleClip(kind, clip, src, t) {
  if (kind === 'own') {
    activeChar.mixer ||= new THREE.AnimationMixer(activeChar.animObj);
    const m = activeChar.mixer;
    m.stopAllAction();
    clipAction(m, clip).play();
    m.setTime(t);
    rig.root.updateMatrixWorld(true);
    return { pose: rig.getPose(), facing: rig.facing() };
  }
  src.mixer.stopAllAction();
  clipAction(src.mixer, clip).play();
  src.mixer.setTime(t);
  src.root.updateMatrixWorld(true);
  return { pose: src.rig.getPose(), facing: src.rig.facing() };
}

function selectClip(value) {
  setAnimPlaying(false);
  anim = null;
  if (!value || !rig) { $('animFrame').textContent = '–'; return; }
  const [kind, a, b] = value.split(':');
  const clip = kind === 'own' ? activeChar.clips[+a] : animSources[+a]?.clips[+b];
  const src = kind === 'ext' ? animSources[+a] : null;
  if (!clip) return;
  pushUndo();
  const before = rig.getPose();
  const facing0 = rig.facing();
  let corr = null;
  if (src) {
    // Map each target bone's rest direction onto the source's.
    const tgtRest = rig.restDirections();
    corr = {};
    for (const [k, d] of Object.entries(tgtRest)) if (src.restDirs[k]) corr[k] = new THREE.Quaternion().setFromUnitVectors(d, src.restDirs[k]);
  }
  const first = sampleClip(kind, clip, src, 0);
  anim = { kind, clip, src, facing0, hips0: before.hips, srcFacing0: first.facing, srcHips0: first.pose.hips, corr, face: before.face };
  $('animTime').max = String(Math.max(0.001, clip.duration));
  $('animTime').value = '0';
  setAnimTime(0);
}

function setAnimTime(t) {
  if (!anim || !rig) return;
  anim.t = t;
  const { pose } = sampleClip(anim.kind, anim.clip, anim.src, t);
  // Turn the clip so its first frame faces where the character faced.
  const yaw = anim.facing0.clone().multiply(anim.srcFacing0.clone().invert());
  for (const [k, v] of Object.entries(pose.bones)) {
    const q = new THREE.Quaternion().fromArray(v);
    if (anim.corr?.[k]) q.multiply(anim.corr[k]);
    pose.bones[k] = yaw.clone().multiply(q).toArray();
  }
  const d = new THREE.Vector3(pose.hips[0] - anim.srcHips0[0], pose.hips[1] - anim.srcHips0[1], pose.hips[2] - anim.srcHips0[2]).applyQuaternion(yaw);
  if ($('animInPlace').checked) d.x = d.z = 0;
  pose.hips = [anim.hips0[0] + d.x, anim.hips0[1] + d.y, anim.hips0[2] + d.z];
  pose.face = rig.face;
  rig.setPose(pose);
  const fps = 30;
  $('animFrame').textContent = `${Math.round(t * fps)} / ${Math.round(anim.clip.duration * fps)}`;
  if (ikMode) placeIkTargets();
  requestRender();
}

function setAnimPlaying(on) {
  if (on && !anim) return toast('Choose a clip first');
  const was = animPlaying;
  animPlaying = on;
  $('animPlay').textContent = on ? '❚❚' : '▶';
  if (on) {
    let last = performance.now();
    const step = (now) => {
      if (!animPlaying || !anim) return;
      let t = anim.t + (now - last) / 1000;
      last = now;
      if (t > anim.clip.duration) t %= Math.max(0.001, anim.clip.duration);
      $('animTime').value = String(t);
      setAnimTime(t);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  } else if (was) poseChanged();
}

$('animClip').addEventListener('change', () => selectClip($('animClip').value));
$('animTime').addEventListener('pointerdown', () => { if (anim) { setAnimPlaying(false); pushUndo(); } });
$('animTime').addEventListener('input', () => setAnimTime(+$('animTime').value));
$('animTime').addEventListener('change', () => poseChanged());
$('animPlay').addEventListener('click', () => setAnimPlaying(!animPlaying));
$('animInPlace').addEventListener('change', () => { if (anim) { setAnimTime(anim.t || 0); poseChanged(); } });
$('animToLib').addEventListener('click', () => { setAnimPlaying(false); poseLibrary.open(); poseLibrary.saveCurrent(); });
$('animFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  toast('Loading animation…');
  try {
    const src = await loadAnimationSource(f);
    animSources.push(src);
    refreshClipList();
    const value = `ext:${animSources.length - 1}:0`;
    $('animClip').value = value;
    selectClip(value);
    toast(`${src.clips.length} clip(s) from ${f.name}`);
  } catch (err) {
    toast('Could not load the animation: ' + err.message, true);
  }
});

// ------------------------------------------------------------------ scenes (new / save / open / restore)

const SCENE_BACKUP = 'riggedPose.prevScene.v1';
function sceneData() {
  return {
    format: 'marionette-scene', v: 1, characters: serializeCharacters(), active: activeChar?.id,
    props: props.serialize(), camera: camState(), cameras: camerasData(),
  };
}
function backupScene() {
  store.set(SCENE_BACKUP, sceneData());
  $('sceneRestore').disabled = false;
}
// Replace the whole scene. data = null gives a fresh one (one default character).
async function loadScene(data, { backup = true } = {}) {
  if (backup) backupScene();
  select(null);
  if (ikMode) toggleIK();
  for (const c of characters) disposeRoot(c.root);
  characters.length = 0;
  setActiveCharacter(null);
  undoStack.length = 0;
  redoStack.length = 0;
  if (data?.characters?.length) await restoreCharacters(data.characters.filter((d) => d.spec), data.active);
  if (!characters.length) await addCharacter({ kind: 'mannequin', opts: { ...DEFAULT_BODY } }, { name: 'Character' });
  props.load(data?.props || [], { silent: true });
  props.undoStack.length = 0;
  props.redoStack.length = 0;
  propsVersion++;
  refreshXform();
  restoreCameras(data?.cameras, { applyActive: false });
  if (data?.camera) { putCamState(data.camera); afterCameraMove(); } else frameShot();
  // Written at once: a reload right after must find this scene, not the old one.
  settings.characters = serializeCharacters();
  settings.activeChar = activeChar?.id;
  settings.props = props.serialize();
  saveSettings();
  syncNow({ force: true });
  outliner.refresh();
  requestRender();
}
$('sceneNew').addEventListener('click', async () => {
  if (!confirm('Start a new scene?\n\nThe current scene is kept as a backup: "Restore previous" brings it back.')) return;
  await loadScene(null);
  toast('New scene · "Restore previous" brings the old one back');
});
$('sceneSave').addEventListener('click', () => {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  download(`marionette-scene-${stamp}.json`, jsonURL(sceneData()));
  if (characters.some((c) => c.spec?.kind === 'file')) toast('Models opened from a file are not stored in the scene: open them again after loading', true);
});
$('sceneOpen').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.characters)) throw new Error('not a scene file');
    await loadScene(data);
    toast(`Opened ${file.name}`);
  } catch (err) {
    toast('Could not open the scene: ' + err.message, true);
  }
});
$('sceneRestore').addEventListener('click', async () => {
  const data = store.get(SCENE_BACKUP, null);
  if (!data) return toast('No previous scene', true);
  await loadScene(data); // the current one becomes the backup, so this toggles
  toast('Previous scene restored');
});
try { $('sceneRestore').disabled = localStorage.getItem(SCENE_BACKUP) === null; } catch { /* storage blocked */ }

// ------------------------------------------------------------------ props & modeling

const props = new PropManager({
  scene, canvas, getCamera: () => activeCam(), requestRender,
  toast: (m) => toast(m), onChange: () => { propsVersion++; if (lightRig.state.shadows) lightRig.markShadows([props.group]); queuePropsSave(); queueSync(); refreshXform(); outliner.refresh(); },
  onRefresh: () => outliner.refresh(),
});
props.colorCode = (m) => propIdColor(m);
props.gizmo.addEventListener('dragging-changed', (e) => { activeControls().enabled = !e.value; });
props.gizmo.addEventListener('objectChange', () => refreshXform());
const queuePropsSave = debounce(() => { settings.props = props.serialize(); saveSettings(); }, 400);

// ---- Props held in a hand (or worn on the back) ride along with the pose:
// userData.held = { char, slot: 'left' | 'right' | 'back', o: offset in the slot frame }.
const _slotM = new THREE.Matrix4(), _offM = new THREE.Matrix4(), _grpInv = new THREE.Matrix4();
const _hp = new THREE.Vector3(), _hq = new THREE.Quaternion(), _hs = new THREE.Vector3();
const heldMeshes = () => props.meshes.filter((m) => m.userData.held);
function updateHeldProps() {
  const list = heldMeshes();
  if (!list.length) return;
  props.group.updateMatrixWorld(true);
  _grpInv.copy(props.group.matrixWorld).invert();
  let moved = false;
  for (const m of list) {
    // While the prop itself is being dragged, the drag decides; the new offset is kept after.
    if (props.gizmo.dragging && props.selected.has(m)) continue;
    const h = m.userData.held;
    const c = characters.find((o) => o.id === h.char);
    if (!c?.rig || !slotFrame(c.rig, h.slot, _slotM)) continue;
    _slotM.premultiply(_grpInv).multiply(offsetMatrix(h.o, _offM)).decompose(_hp, _hq, _hs);
    if (_hp.distanceToSquared(m.position) < 1e-12 && Math.abs(_hq.dot(m.quaternion)) > 1 - 1e-10) continue;
    m.position.copy(_hp);
    m.quaternion.copy(_hq);
    m.updateMatrixWorld(true);
    moved = true;
  }
  if (moved && [...props.selected].some((m) => m.userData.held)) props._syncPivot();
}
// The offset that keeps a held prop where it is now (after the user moved it).
function captureHeldOffset(m) {
  const h = m.userData.held;
  const c = characters.find((o) => o.id === h?.char);
  if (!c?.rig || !slotFrame(c.rig, h.slot, _slotM)) return;
  m.updateMatrixWorld(true);
  _offM.copy(_slotM).invert().multiply(m.matrixWorld).decompose(_hp, _hq, _hs);
  h.o = [..._hp.toArray(), ..._hq.toArray()].map((v) => +v.toFixed(5));
}
props.gizmo.addEventListener('dragging-changed', (e) => {
  if (e.value) return;
  for (const m of props.selected) if (m.userData.held) captureHeldOffset(m);
});
const SLOT_NAMES = { left: 'left hand', right: 'right hand', back: 'back' };
// Put a prop in a character's hand (snapped to the grip), or on its back.
function holdProp(m, c, slot, { o = null, quiet = false } = {}) {
  if (!c?.rig) return;
  for (const other of heldMeshes()) {
    if (other !== m && other.userData.held.char === c.id && other.userData.held.slot === slot) other.userData.held = null;
  }
  m.userData.held = { char: c.id, slot, o: o || (slot === 'back' ? BACK_OFFSET : [0, 0, 0, 0, 0, 0, 1]) };
  if (slot !== 'back') closeHand(c.rig, slot, m.userData.grip?.style || 'fist', m.userData.grip ? gripRadius({ v: m.userData.poly.v, grip: m.userData.grip }) : 0.02);
  updateHeldProps();
  props._changed();
  poseChanged();
  if (!quiet) toast(`${m.name} → ${c.name}'s ${SLOT_NAMES[slot]}`);
}
function releaseProp(m) {
  m.userData.held = null;
  m.userData.auto = false;
  props._changed();
}
// Props a pose brings (pose library): reuse what the hand already holds,
// replace other pose-made props, let go of the user's own ones.
function ensureHeld(c, list) {
  if (!c?.rig) return;
  props.pushUndo();
  const want = new Set(list.map((h) => h.slot));
  for (const m of heldMeshes()) {
    const h = m.userData.held;
    if (h.char !== c.id) continue;
    const need = list.find((x) => x.slot === h.slot);
    if (need && String(m.userData.lib) === String([need.lib[0], need.lib[1], need.part])) continue;
    if (want.has(h.slot) || m.userData.auto) {
      if (m.userData.auto) props.removeMeshes([m]); else m.userData.held = null;
    }
  }
  for (const it of list) {
    const lib = [it.lib[0], it.lib[1], it.part];
    let m = heldMeshes().find((x) => x.userData.held.char === c.id && x.userData.held.slot === it.slot);
    if (!m) {
      const poly = it.poly || [LIBRARY[it.lib[0]]?.[it.lib[1]]?.()].flat()[it.part];
      if (!poly) continue;
      m = props.addHeld(poly, lib);
    }
    m.userData.held = { char: c.id, slot: it.slot, o: it.o };
  }
  updateHeldProps();
  props._changed();
}

let appMode = 'pose';
function setAppMode(mode) {
  if (mode === 'edit' && !props.active) { toast('Select a prop in Object mode first'); return; }
  if (mode !== 'pose' && appMode === 'pose') sideTabs?.setTab('props');
  else if (mode === 'pose' && appMode !== 'pose' && sideTabs?.current === 'props') sideTabs.setTab('pose');
  appMode = mode;
  if (mode !== 'object' && props.pivotEdit) { props.pivotEdit = false; $('pivotEdit').classList.remove('on'); }
  if (mode !== 'pose') select(null);
  props.setEnabled(mode !== 'pose');
  if (mode !== 'pose') props.setMode(mode);
  ikTargets.visible = mode === 'pose';
  document.querySelectorAll('#appModes [data-app]').forEach((b) => b.classList.toggle('on', b.dataset.app === appMode));
  document.querySelectorAll('#toolbar [data-mode], #ikToggle, #spaceToggle, #ctrlToggle').forEach((b) => { b.disabled = mode !== 'pose'; });
  $('propsPanel').dataset.mode = mode;
  outliner.refresh();
  refreshXform();
  requestRender();
}
document.querySelectorAll('#appModes [data-app]').forEach((b) => b.addEventListener('click', () => setAppMode(b.dataset.app)));

// Library
const catSel = $('propCat'), itemSel = $('propItem');
Object.keys(LIBRARY).forEach((c) => catSel.add(new Option(c, c)));
function fillItems() {
  itemSel.innerHTML = '';
  Object.keys(LIBRARY[catSel.value]).forEach((n) => itemSel.add(new Option(n, n)));
}
catSel.addEventListener('change', fillItems);
fillItems();
$('propAdd').addEventListener('click', () => {
  const at = new THREE.Vector3();
  if (rig) {
    const { left, hips } = rig.frame();
    at.set(hips.x, 0, hips.z);
    if (!(catSel.value === 'Room' && itemSel.value === 'Floor')) at.addScaledVector(left, -0.9);
  }
  setAppMode('object');
  props.add(catSel.value, itemSel.value, at);
  // Hand-held props go straight into the active character's hands.
  const made = [...props.selected].filter((m) => m.userData.grip);
  if ($('propAutoHold').checked && activeChar?.rig && made.length) {
    for (const m of made) holdProp(m, activeChar, m.userData.grip.hand === 'back' ? 'back' : m.userData.grip.hand, { quiet: true });
    toast(`${itemSel.value} → ${activeChar.name} · move it with the gizmo to adjust the grip, "Let go" in the Outliner`);
  }
  refreshXform();
});

// Tools, selection modes, operations
function setPropTool(tool) {
  props.setTool(tool);
  document.querySelectorAll('#propTools [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
}
document.querySelectorAll('#propTools [data-tool]').forEach((b) => b.addEventListener('click', () => setPropTool(b.dataset.tool)));
function setSelMode(mode) {
  props.setSelMode(mode);
  document.querySelectorAll('#selModes [data-sel]').forEach((b) => b.classList.toggle('on', b.dataset.sel === mode));
}
document.querySelectorAll('#selModes [data-sel]').forEach((b) => b.addEventListener('click', () => setSelMode(b.dataset.sel)));
$('propSnap').addEventListener('change', (e) => props.setSnap(e.target.checked));

const amount = () => +$('editAmount').value || 0.1;
function runOp(op, arg) {
  switch (op) {
    case 'extrude': return props.extrude(amount());
    case 'inset': return props.inset(amount());
    case 'bevel': return props.bevel(amount());
    case 'boolean': return props.boolean(arg, $('keepCutter').checked);
    case 'mirror': return props.mirror(+arg);
    case 'setOrigin': return props.setOrigin(arg);
    case 'selectAll': return props.selectAll(true);
    default: return props[op]?.();
  }
}
document.querySelectorAll('#propsPanel [data-op]').forEach((b) => b.addEventListener('click', () => runOp(b.dataset.op, b.dataset.arg)));
$('pivotMode').value = settings.pivotMode || 'median';
props.setPivotMode($('pivotMode').value);
$('pivotMode').addEventListener('change', () => {
  props.setPivotMode($('pivotMode').value);
  settings.pivotMode = $('pivotMode').value;
  saveSettings();
});
function togglePivotEdit(on = !props.pivotEdit) {
  if (on && appMode !== 'object') setAppMode('object');
  if (props.setPivotEdit(on) && on) toast('Edit pivot: drag the gizmo or click a surface to place it · D to finish');
  $('pivotEdit').classList.toggle('on', props.pivotEdit);
  document.querySelectorAll('#propTools [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === props.tool));
}
$('pivotEdit').addEventListener('click', () => togglePivotEdit());
$('renderScale').value = RENDER_SCALE[settings.renderScale] ? settings.renderScale : 'auto';
renderer.setPixelRatio(viewportPixelRatio($('renderScale').value));
$('renderScale').addEventListener('change', () => {
  settings.renderScale = $('renderScale').value;
  saveSettings();
  renderer.setPixelRatio(viewportPixelRatio(settings.renderScale));
  layout();
});
$('perfHud').checked = !!settings.perfHud;
perfOn = $('perfHud').checked;
$('perfOut').hidden = !perfOn;
$('perfHud').addEventListener('change', () => {
  perfOn = settings.perfHud = $('perfHud').checked;
  $('perfOut').hidden = !perfOn;
  saveSettings();
});
$('pivotSnap').value = settings.pivotSnap || 'off';
props.setPivotSnap($('pivotSnap').value);
$('pivotSnap').addEventListener('change', () => {
  props.setPivotSnap($('pivotSnap').value);
  settings.pivotSnap = $('pivotSnap').value;
  saveSettings();
});
$('sliceBtn').addEventListener('click', () => props.slice(+$('sliceAxis').value, Math.max(1, +$('sliceCount').value || 1)));
$('defApply').addEventListener('click', () => props.deform($('defKind').value, +$('defAxis').value, +$('defDir').value, +$('defAmount').value, +$('defSeg').value || 0));
$('defKind').addEventListener('change', () => { $('defAmount').value = $('defKind').value === 'taper' ? 0.5 : 45; });
$('propColor').addEventListener('input', (e) => props.setColor(parseInt(e.target.value.slice(1), 16)));
$('paintFaces').addEventListener('click', () => { const n = props.paintFaces(parseInt($('paintColor').value.slice(1), 16)); if (n) toast(`Painted ${n} face(s)`); });
$('clearPaint').addEventListener('click', () => props.paintFaces(null));
$('colorCodeBtn').addEventListener('click', () => setColorCode(!colorCodeOn));
[...SEG_NAMES].sort().forEach((n) => $('propSeg').add(new Option(n, n)));
$('propSeg').addEventListener('change', (e) => { if (props.active) props.setFlag(props.active, 'seg', e.target.value); });

// Numeric transform of the active prop
const xformInputs = [...document.querySelectorAll('#propXform input')];
function refreshXform() {
  const m = props.active;
  for (const el of xformInputs) {
    if (!m) { el.value = ''; continue; }
    const [kind, i] = [el.dataset.k[0], +el.dataset.k[1]];
    const v = kind === 'p' ? m.position.getComponent(i) : kind === 's' ? m.scale.getComponent(i)
      : THREE.MathUtils.radToDeg(m.rotation.toArray()[i]);
    if (document.activeElement !== el) el.value = +v.toFixed(kind === 'r' ? 1 : 3);
  }
  if (m) {
    $('propColor').value = '#' + m.userData.color.toString(16).padStart(6, '0');
    $('propSeg').value = m.userData.seg || defaultSegClass(m.userData.kind);
  }
}
for (const el of xformInputs) {
  el.addEventListener('change', () => {
    const m = props.active;
    if (!m) return;
    props.pushUndo();
    const [kind, i] = [el.dataset.k[0], +el.dataset.k[1]];
    const v = +el.value;
    if (kind === 'p') m.position.setComponent(i, v);
    else if (kind === 's') m.scale.setComponent(i, v || 1);
    else { const r = m.rotation.toArray(); r[i] = THREE.MathUtils.degToRad(v); m.rotation.set(r[0], r[1], r[2]); }
    props._changed();
  });
}

// Box select (B): drag a rectangle
let boxSel = null;
let boxMode = false;
function setBoxMode(on) {
  boxMode = on;
  canvas.classList.toggle('crop', on);
  syncPaneControls();
  if (on) toast('Drag to box-select · Shift adds');
}
canvas.addEventListener('pointerdown', (e) => {
  if (!boxMode || e.button !== 0) return;
  const r = canvas.getBoundingClientRect();
  boxSel = { x: e.clientX - r.left, y: e.clientY - r.top };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!boxSel) return;
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const rect = { left: Math.min(x, boxSel.x), top: Math.min(y, boxSel.y), w: Math.abs(x - boxSel.x), h: Math.abs(y - boxSel.y) };
  boxSel.rect = rect;
  Object.assign($('selBox').style, { left: canvas.offsetLeft + paneOffset().x + rect.left + 'px', top: canvas.offsetTop + paneOffset().y + rect.top + 'px', width: rect.w + 'px', height: rect.h + 'px' });
  $('selBox').hidden = false;
});
canvas.addEventListener('pointerup', (e) => {
  if (!boxSel) return;
  if (boxSel.rect && boxSel.rect.w > 3 && boxSel.rect.h > 3) props.boxSelect(boxSel.rect, e.shiftKey);
  boxSel = null;
  $('selBox').hidden = true;
  setBoxMode(false);
});

// Returns true when the key was a modeling shortcut.
function modelKey(e) {
  const k = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  const edit = appMode === 'edit';
  const act = (fn) => { e.preventDefault(); fn(); return true; };
  if (mod && k === 'z') return act(() => (e.shiftKey ? props.redo() : props.undo()));
  if (mod && k === 'y') return act(() => props.redo());
  if (mod && k === 'c') return act(() => props.copy());
  if (mod && k === 'v') return act(() => props.paste());
  if (mod && k === 'j') return act(() => props.join());
  if (mod && k === 'b') return act(() => props.bevel(amount()));
  if (mod && k === 'e' && edit) return act(() => props.extrude(amount()));
  if (mod && k === 'a') return act(() => props.applyTransform());
  if (e.key === 'Tab') return act(() => setAppMode(appMode === 'edit' ? 'object' : 'edit'));
  if (e.altKey && k === 'a') return act(() => props.selectAll(false));
  if (e.altKey && k === 'h') return act(() => props.showHidden());
  if (mod || e.altKey) return false;
  if (e.shiftKey && k === 'd') return act(() => props.duplicate());
  if (!edit && (k === 'd' || e.key === 'Insert')) return act(() => togglePivotEdit());
  const map = {
    a: () => props.selectAll(true), b: () => setBoxMode(true), x: () => props.remove(), delete: () => props.remove(),
    h: () => { for (const m of props.selected) m.visible = false; props.selectObjects([]); props._changed(); },
    escape: () => (props.pivotEdit ? togglePivotEdit(false) : boxMode ? setBoxMode(false) : edit ? props.selectAll(false) : props.selectObjects([])),
  };
  if (edit) {
    Object.assign(map, {
      1: () => setSelMode('vert'), 2: () => setSelMode('edge'), 3: () => setSelMode('face'),
      e: () => props.extrude(amount()), i: () => props.inset(amount()), j: () => props.connect(),
      m: () => props.merge(), f: () => props.fill(), p: () => props.separate(),
    });
  }
  if (map[k]) return act(map[k]);
  return false;
}

// ------------------------------------------------------------------ transform shortcuts (Blender modal / Maya tools)

const modal = new ModalTransform({
  canvas, getCamera: () => activeCam(),
  setHud: (t) => { $('modalHud').textContent = t; },
  onActiveChange: (on) => {
    activeControls().enabled = !on;
    gizmo.enabled = !on;
    props.gizmo.enabled = !on;
    requestRender();
  },
});
const ALL = { move: true, rotate: true, scale: true };

function propObjectTarget() {
  const list = [...props.selected].filter((m) => m.visible);
  if (!list.length) return null;
  const pivot = props.transformPivot();
  const indiv = props.pivotMode === 'individual';
  let start = [];
  const restore = () => { for (const s of start) { s.m.position.copy(s.p); s.m.quaternion.copy(s.q); s.m.scale.copy(s.s); } };
  return {
    pivot, localBasis: props.active?.quaternion.clone(), can: ALL,
    begin() { start = list.map((m) => ({ m, p: m.position.clone(), q: m.quaternion.clone(), s: m.scale.clone() })); },
    apply(t) {
      restore();
      for (const s of start) {
        if (!indiv || t.kind === 'move') s.m.position.applyMatrix4(t.matrix);
        if (t.kind === 'rotate') s.m.quaternion.premultiply(t.quaternion);
        if (t.kind === 'scale') {
          const f = t.scale;
          if (f.x === f.y && f.y === f.z) { s.m.scale.multiplyScalar(f.x); continue; }
          // Map each scaled world/local axis onto the object's closest own axis.
          const inv = s.q.clone().invert();
          for (const [i, fi] of [f.x, f.y, f.z].entries()) {
            if (fi === 1) continue;
            const ax = new THREE.Vector3().setComponent(i, 1).applyQuaternion(t.basis).applyQuaternion(inv);
            const j = [0, 1, 2].reduce((b, c) => (Math.abs(ax.getComponent(c)) > Math.abs(ax.getComponent(b)) ? c : b), 0);
            s.m.scale.setComponent(j, s.m.scale.getComponent(j) * fi);
          }
        }
      }
      refreshXform();
      requestRender();
    },
    cancel(keepUndo) { restore(); if (!keepUndo) props.undoStack.pop(); refreshXform(); requestRender(); },
    commit() { props._changed(); },
  };
}

function editVertsTarget() {
  const mesh = props.active;
  if (!mesh || !props.sel.size) return null;
  const poly = mesh.userData.poly;
  const ids = [...props.sel].filter((i) => poly.v[i]);
  mesh.updateMatrixWorld(true);
  const toWorld = mesh.matrixWorld.clone(), toLocal = toWorld.clone().invert();
  const pivot = props.transformPivot();
  let start = [];
  const restore = () => { for (const [i, w] of start) poly.v[i].copy(w).applyMatrix4(toLocal); };
  return {
    pivot, localBasis: mesh.getWorldQuaternion(new THREE.Quaternion()), can: ALL,
    begin() { start = ids.map((i) => [i, poly.v[i].clone().applyMatrix4(toWorld)]); },
    apply(t) {
      for (const [i, w] of start) poly.v[i].copy(w).applyMatrix4(t.matrix).applyMatrix4(toLocal);
      props.rebuild(mesh);
      requestRender();
    },
    cancel(keepUndo) { restore(); props.rebuild(mesh); if (!keepUndo) props.undoStack.pop(); requestRender(); },
    commit() { props._changed(); },
  };
}

// Exact snapshot of every posed bone (pose JSON rounds to 5 decimals).
function boneSnapshot() {
  return rig.order.map((k) => [rig.map[k], rig.map[k].quaternion.clone(), rig.map[k].position.clone()]);
}
function restoreBones(snap) {
  for (const [b, q, p] of snap) { b.quaternion.copy(q); b.position.copy(p); }
  rig.root.updateMatrixWorld(true);
}

function poseTarget() {
  if (!rig || !selected) return null;
  let startPose;
  if (selected.startsWith('ik:')) {
    const { k, pole, mesh: tgt } = ikHandle(selected);
    if (!tgt) return null;
    let p0;
    return {
      pivot: tgt.position.clone(), can: { move: true },
      begin() { startPose = boneSnapshot(); p0 = tgt.position.clone(); this.balance = balanceApplies(selected) ? plantedFeet() : null; },
      apply(t) {
        restoreBones(startPose);
        tgt.position.copy(p0).add(t.translation);
        if (!pole) snapToSurface(tgt, k);
        solveLimb(k);
        mirrorLive();
        if (this.balance) autoBalance(this.balance);
        requestRender();
      },
      cancel(keepUndo) { restoreBones(startPose); tgt.position.copy(p0); if (!keepUndo) undoStack.pop(); requestRender(); },
      commit() { poseChanged(); },
    };
  }
  if (selected.startsWith('light:')) {
    const n = selected.slice(6);
    const p0 = lightProxy.position.clone();
    const s0 = structuredClone(lightRig.state[n]);
    return {
      pivot: p0.clone(), can: { move: true },
      begin() {},
      apply(t) { lightRig.setDirection(n, p0.clone().add(t.translation).sub(lightRig.center)); syncLightUI(); requestRender(); },
      cancel() { Object.assign(lightRig.state[n], s0); lightRig.update(); syncLightUI(); requestRender(); },
      commit() { saveLighting(); select(selected); },
    };
  }
  if (selected === 'cam' || selected === 'cam:aim') {
    const aim = selected === 'cam:aim';
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    return {
      pivot: (aim ? t0 : p0).clone(), localBasis: camera.quaternion.clone(), can: { move: true, rotate: !aim },
      begin() {},
      apply(t) {
        camera.position.copy(p0);
        controls.target.copy(t0);
        if (t.kind === 'move') {
          if (aim) controls.target.add(t.translation);
          else { camera.position.add(t.translation); if (!$('camKeepAim').checked) controls.target.add(t.translation); }
        } else if (t.kind === 'rotate') {
          controls.target.copy(t0).sub(p0).applyQuaternion(t.quaternion).add(p0);
        }
        controls.update();
        applyRoll();
        aimMarker.position.copy(controls.target);
        requestRender();
      },
      cancel() { camera.position.copy(p0); controls.target.copy(t0); controls.update(); applyRoll(); requestRender(); },
      commit() { select(selected); syncCamFields(); afterCameraMove(); },
    };
  }
  if (selected === 'root') {
    const f = rigControls.rootFrame(rig);
    let hips0;
    return {
      pivot: f.position.clone(), localBasis: f.quaternion.clone(), can: { rotate: true, move: true },
      begin() { startPose = boneSnapshot(); hips0 = rig.map.hips.matrixWorld.clone(); },
      apply(t) {
        restoreBones(startPose);
        moveCharacter(t.matrix, hips0);
        requestRender();
      },
      cancel(keepUndo) { restoreBones(startPose); if (!keepUndo) undoStack.pop(); requestRender(); },
      commit() { select('root'); poseChanged(); },
    };
  }
  const bone = rig.map[selected];
  const pivot = bone.getWorldPosition(new THREE.Vector3());
  let q0;
  return {
    pivot, localBasis: bone.getWorldQuaternion(new THREE.Quaternion()), can: { rotate: true, move: true },
    begin() {
      startPose = boneSnapshot();
      q0 = bone.getWorldQuaternion(new THREE.Quaternion());
      this.pin = selected === 'hips' ? captureFeet() : null;
      this.balance = balanceApplies(selected) ? plantedFeet() : null;
    },
    apply(t) {
      restoreBones(startPose);
      if (t.kind === 'rotate') {
        rig.setWorldQuat(bone, t.quaternion.clone().multiply(q0));
        rig.clampLimits([selected]);
      }
      else if (selected === 'hips') {
        bone.parent.updateWorldMatrix(true, false);
        bone.position.copy(bone.parent.worldToLocal(pivot.clone().add(t.translation)));
        bone.updateMatrixWorld(true);
      } else moveJoint(selected, pivot.clone().add(t.translation));
      if (this.pin) applyFeetPin(this.pin);
      mirrorLive();
      if (this.balance) autoBalance(this.balance);
      requestRender();
    },
    cancel(keepUndo) { restoreBones(startPose); if (!keepUndo) undoStack.pop(); requestRender(); },
    commit() { poseChanged(); },
  };
}

function startModal(kind) {
  const target = appMode === 'pose' ? poseTarget() : appMode === 'edit' ? editVertsTarget() : propObjectTarget();
  const what = appMode === 'pose' ? 'a bone' : appMode === 'edit' ? 'vertices' : 'an object';
  if (!target) return toast(`Select ${what} first`);
  if (!target.can[kind]) {
    return toast(appMode === 'pose' ? (kind === 'scale' ? 'Bones cannot be scaled' : 'Only the hips and IK targets move; turn on IK (I) for hands/feet') : `Cannot ${kind} this`);
  }
  if (appMode === 'pose') pushUndo(); else props.pushUndo();
  applyRoll();
  modal.start(kind, target);
}

// Alt+G / Alt+R / Alt+S: clear location / rotation / scale.
function clearTransform(kind) {
  if (appMode === 'pose') {
    if (!rig) return;
    pushUndo();
    if (kind === 'move') rig.map.hips.position.copy(rig.rest.hips.lp);
    else if (kind === 'rotate') {
      // Rotation only, like Blender: the hips keep their location.
      const keys = selected && !selected.startsWith('ik:') ? [selected] : rig.order;
      for (const key of keys) rig.map[key].quaternion.copy(rig.rest[key].lq);
    }
    rig.root.updateMatrixWorld(true);
    return poseChanged();
  }
  if (appMode !== 'object' || !props.selected.size) return;
  props.pushUndo();
  for (const m of props.selected) {
    if (kind === 'move') m.position.set(0, 0, 0);
    else if (kind === 'rotate') m.quaternion.identity();
    else m.scale.set(1, 1, 1);
  }
  props._changed();
}

// Blender (and Simple): G/R/S are modal. Maya: W/E/R switch the manipulator.
// Transform keys follow their own setting, independent of mouse navigation.
// Maya keys: W / E / R pick the manipulator; G and S still start Blender-style
// modal moves / scales. Blender keys: G / R / S modal.
function transformKey(e) {
  if (e.ctrlKey || e.metaKey) return false;
  const k = e.key.toLowerCase();
  const maya = $('keyScheme').value === 'maya';
  if (maya && !e.altKey) {
    const tool = { w: 'translate', e: 'rotate', r: 'scale' }[k];
    if (tool) {
      e.preventDefault();
      if (appMode === 'pose') {
        if (tool === 'scale') toast('Bones cannot be scaled');
        else setMode(tool);
      } else setPropTool(tool);
      return true;
    }
  }
  const kind = { g: 'move', r: 'rotate', s: 'scale' }[k];
  if (!kind || (maya && k === 'r')) return false;
  e.preventDefault();
  if (e.altKey) clearTransform(kind); else startModal(kind);
  return true;
}

// ------------------------------------------------------------------ pose from image, reference image

let refImage = null;
let refToken = 0;
function setReference(src) {
  const token = ++refToken; // a later Clear wins over an image still loading
  if (!src) { refImage = null; refShown(); requestRender(); return; }
  const img = new Image();
  img.onload = () => { if (token !== refToken) return; refImage = img; refShown(); requestRender(); };
  img.onerror = () => toast('Could not load that image', true);
  img.src = src;
}
const fileURL = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
$('refFile').addEventListener('change', async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) setReference(await fileURL(f)); });
$('refLast').addEventListener('click', () => {
  const src = bridge?.getLastImage?.(followTarget());
  if (!src) return toast('No generated image found in the ' + followTarget() + ' gallery', true);
  setReference(src);
});
$('refClear').addEventListener('click', () => setReference(null));
// The photo is easy to remove from where it was added, and from the view itself.
function refShown() {
  $('refChip').hidden = !refImage;
  $('detectClear').hidden = !refImage;
}
$('refChip').addEventListener('click', () => setReference(null));
$('detectClear').addEventListener('click', () => setReference(null));
$('refOpacity').addEventListener('input', () => { $('refOpacityOut').textContent = Math.round($('refOpacity').value * 100) + '%'; requestRender(); });
$('refOpacityOut').textContent = '50%';

function setOutputSize(w, h) {
  // Keep the image aspect, scaled so the long side is about the current one.
  const longSide = Math.max(+outW.value, +outH.value) || 1024;
  const k = longSide / Math.max(w, h);
  outW.value = Math.max(64, Math.round((w * k) / 8) * 8);
  outH.value = Math.max(64, Math.round((h * k) / 8) * 8);
  $('followSize').checked = false;
  settings.followSize = false;
  settings.W = +outW.value; settings.H = +outH.value;
  saveSettings();
  layout();
}

async function importPose(json) {
  let parsed;
  try { parsed = parseOpenPose(json); } catch (e) { return toast(e.message, true); }
  if (!parsed.people.length) return toast('No person found', true);
  if ($('matchImgSize').checked) setOutputSize(parsed.W, parsed.H);
  setLookThrough(true);
  Cam.setCrop(camera, null);
  camera.updateProjectionMatrix();
  applyRoll();
  // One character per detected person, paired left-to-right on screen.
  let chars = characters.filter((c) => c.visible && c.rig);
  while (chars.length < parsed.people.length) {
    const c = await addCharacter({ kind: 'mannequin', opts: { ...(activeChar?.spec?.opts || bodyOpts) } }, { activate: false });
    if (!c) break;
    chars = characters.filter((x) => x.visible && x.rig);
  }
  const hipX = (p) => { const b = p.body; const h = b[8] && b[11] ? (b[8][0] + b[11][0]) / 2 : (b[1] || b.find(Boolean))[0]; return h; };
  const people = parsed.people.slice().sort((a, b) => hipX(a) - hipX(b));
  const screenX = (c) => c.rig.map.hips.getWorldPosition(new THREE.Vector3()).project(camera).x;
  chars = chars.slice().sort((a, b) => screenX(a) - screenX(b)).slice(0, people.length);
  const failed = [];
  people.forEach((p, i) => {
    const c = chars[i];
    if (!c) return;
    undoStack.push({ id: c.id, pose: c.rig.getPose() });
    try { fitPerson(c.rig, p, camera, parsed.W, parsed.H); c.rig.clampLimits(); } catch (e) { failed.push(e.message); }
  });
  redoStack.length = 0;
  if (chars[0] && chars[0] !== activeChar) setActiveCharacter(chars[0]);
  poseChanged();
  toast(failed.length ? 'Some people could not be fitted: ' + failed[0] : `Posed ${people.length} character(s) from the image`, failed.length > 0);
}

// Swap the selected bone to the other point on its camera ray at the same
// length: same silhouette from the camera, opposite depth.
function flipDepth() {
  if (!rig || !selected || selected.startsWith('ik:')) return toast('Select an arm or leg bone first');
  const bone = rig.map[selected], child = rig.childOf(selected);
  if (!child) return toast('This bone has no end joint to flip');
  applyRoll();
  const P = bone.getWorldPosition(new THREE.Vector3()), C = child.getWorldPosition(new THREE.Vector3());
  const O = camera.position, d = C.clone().sub(O).normalize();
  const w = O.clone().sub(P), L = P.distanceTo(C);
  const b = d.dot(w), disc = b * b - (w.lengthSq() - L * L);
  if (disc <= 1e-10) return toast('This bone points straight across the view: nothing to flip');
  const s = Math.sqrt(disc);
  const t = [-b - s, -b + s].sort((x, y) => Math.abs(y - C.distanceTo(O)) - Math.abs(x - C.distanceTo(O)))[0];
  // The joint after the child (e.g. the wrist when flipping the upper arm) keeps
  // its place on screen: re-aim the next bone back onto its old camera ray.
  const nextKey = rig.order.find((k) => rig.map[k] === child);
  const end = nextKey && rig.childOf(nextKey);
  const E = end && end.getWorldPosition(new THREE.Vector3());
  pushUndo();
  rig.aim(selected, child, O.clone().addScaledVector(d, t).sub(P));
  if (E) {
    const P2 = child.getWorldPosition(new THREE.Vector3());
    const L2 = C.distanceTo(E), d2 = E.clone().sub(O).normalize(), w2 = O.clone().sub(P2);
    const b2 = d2.dot(w2), disc2 = b2 * b2 - (w2.lengthSq() - L2 * L2);
    const target = disc2 >= 0
      ? [-b2 - Math.sqrt(disc2), -b2 + Math.sqrt(disc2)].map((tt) => O.clone().addScaledVector(d2, tt)).sort((x, y) => x.distanceTo(E) - y.distanceTo(E))[0]
      : O.clone().addScaledVector(d2, -b2);
    rig.aim(nextKey, end, target.sub(P2));
  }
  if (rig.clampLimits([selected, nextKey].filter(Boolean))) toast('Flipped, but held back by the joint limits');
  poseChanged();
}
$('flipDepth').addEventListener('click', flipDepth);

$('importJSON').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try { await importPose(JSON.parse(await f.text())); } catch (err) { toast('Not a JSON file: ' + err.message, true); }
});

// Run the WebUI's ControlNet preprocessor through its API and use the pose JSON it returns.
// Pose detection: the extension's own endpoint first (works on Forge / reForge /
// Neo, whose built-in ControlNet has no API), then sd-webui-controlnet's API.
async function detectPose(dataURL) {
  const errors = [];
  try {
    const res = await fetch(serverUrl('../rigged-pose-api/detect'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataURL, hands: true, face: true }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.ok && j.pose) return j.pose;
    errors.push(j.error ? `extension: ${j.error}` : `extension endpoint answered ${res.status}`);
  } catch (e) {
    errors.push('extension: ' + e.message);
  }
  for (const module of ['dw_openpose_full', 'openpose_full', 'DW OpenPose Full']) {
    try {
      const res = await fetch(serverUrl('../controlnet/detect'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controlnet_module: module, controlnet_input_images: [dataURL.split(',')[1]], controlnet_processor_res: 512 }),
      });
      if (!res.ok) { errors.push(`ControlNet API answered ${res.status}`); break; }
      const j = await res.json();
      if (j.poses?.length) return j.poses[0];
      errors.push('ControlNet returned no pose JSON');
    } catch (e) {
      errors.push('ControlNet API: ' + e.message);
      break;
    }
  }
  throw new Error(errors.join(' · '));
}
$('detectImg').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const url = await fileURL(f);
  setReference($('keepDetectRef').checked ? url : null);
  toast('Detecting pose…');
  try {
    await importPose(await detectPose(url));
  } catch (err) {
    console.warn('[marionette] pose detection failed:', err.message);
    toast(`Detection failed: ${err.message}. Restart the WebUI after updating the extension; if it still fails, load an OpenPose JSON (ControlNet preview → download JSON) instead.`, true);
  }
});

// ------------------------------------------------------------------ keyboard

const NUMPAD = {
  Numpad1: (e) => viewFrom(rig ? rig.frame().fwd.multiplyScalar(e.ctrlKey ? -1 : 1) : new THREE.Vector3(0, 0, 1)),
  Numpad3: (e) => viewFrom(rig ? rig.frame().left.multiplyScalar(e.ctrlKey ? 1 : -1) : new THREE.Vector3(-1, 0, 0)),
  Numpad7: (e) => viewFrom(new THREE.Vector3(0, e.ctrlKey ? -1 : 1, 0)),
  Numpad4: () => orbitBy(-15, 0),
  Numpad6: () => orbitBy(15, 0),
  Numpad8: () => orbitBy(0, 15),
  Numpad2: () => orbitBy(0, -15),
  NumpadDecimal: () => frameSelected(),
  NumpadAdd: () => dollyBy(0.85),
  NumpadSubtract: () => dollyBy(1.18),
};

window.addEventListener('keydown', (e) => {
  if (modal.active) { modal.key(e); return; }
  if (e.key === 'Escape' && poseLibrary.isOpen) { poseLibrary.close(); return; }
  if (e.target.matches('input, textarea, select')) return;
  const k = e.key.toLowerCase();
  if (transformKey(e)) return;
  if (appMode !== 'pose' && modelKey(e)) return;
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
  if (e.code === 'Space' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); if (!e.repeat) toggleMaximize(); return; }
  if (e.code === 'Numpad0') {
    e.preventDefault();
    if (e.ctrlKey && e.altKey) alignCamToView(); else setLookThrough(!lookThrough);
    return;
  }
  if (NUMPAD[e.code]) { e.preventDefault(); NUMPAD[e.code](e); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === 't') setMode(currentMode === 'translate' ? 'rotate' : 'translate');
  else if (k === 'i') toggleIK();
  else if (k === 'd' && !e.shiftKey) flipDepth();
  else if (k === 'q') toggleSpace();
  else if (k === 'c') capture();
  else if (k === 'k') setCropMode(!cropMode);
  else if (k === 'f') frameSelected();
  else if (k === 'h' && appMode === 'pose') setControlsShown(!controlsShown);
  else if (k === 'l' && appMode === 'pose') { e.preventDefault(); poseLibrary.toggle(); }
  else if (e.key === '/') { e.preventDefault(); $('findSetting').focus(); }
  else if (k === 'a' || e.key === 'Home') frameAll();
  else if (k === 'escape') { if (cropMode) setCropMode(false); else select(null); }
});

// ------------------------------------------------------------------ render loop

function drawOverlay() {
  const g = overlay.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, overlay.width, overlay.height);
  // Drawn over the shot camera: the active pane if it shows it, else the first that does.
  const camPane = panes[activePane]?.view === 'camera' ? panes[activePane] : panes.find((p) => p.view === 'camera');
  if (!camPane) return;
  const dpr = renderer.getPixelRatio();
  const W = Math.round(camPane.vp.w * dpr), H = Math.round(camPane.vp.h * dpr);
  g.translate(Math.round(camPane.vp.x * dpr), Math.round(camPane.vp.y * dpr));
  g.beginPath(); g.rect(0, 0, W, H); g.clip();
  if (refImage) {
    g.save();
    g.globalAlpha = +$('refOpacity').value;
    g.drawImage(refImage, 0, 0, W, H);
    g.restore();
  }
  if ($('optGuides').checked) {
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.lineWidth = 1;
    g.beginPath();
    for (const t of [1 / 3, 2 / 3]) {
      g.moveTo(W * t, 0); g.lineTo(W * t, H);
      g.moveTo(0, H * t); g.lineTo(W, H * t);
    }
    g.stroke();
    g.restore();
  }
  if (!rig || !$('optOverlay').checked) return;
  for (const r of visibleRigs()) {
    const kp2 = projectKeypoints(r.keypoints(camera.position, { eyesAt: $('eyesFollow').checked ? camera.position : null }), camera, W, H);
    if (r === rig) lastKp2 = kp2;
    drawOpenPose(g, kp2, W, H, {
      hands: $('optHands').checked, face: $('optFace').checked, face70: $('optFace70').checked, extras: $('optExtras').checked,
      alpha: r === rig ? 0.75 : 0.4, scale: Math.max(0.6, Math.min(W, H) / 700),
    });
  }
}

const paneClear = new THREE.Color();
const perf = { frames: 0, ms: 0, worst: 0, since: performance.now(), syncsIn: 0, syncsOut: 0 };
function frame() {
  requestAnimationFrame(frame);
  if (perfOn) perfTick();
  if (!dirty && !paneDirty.size) return;
  if (!wasShown) return; // keep it dirty; drawn when the editor shows again
  const t0 = performance.now();
  drawFrame();
  const dt = performance.now() - t0;
  perf.frames++; perf.ms += dt; perf.worst = Math.max(perf.worst, dt);
}
function perfTick() {
  const now = performance.now();
  if (now - perf.since < 1000) return;
  const s = (now - perf.since) / 1000;
  $('perfOut').textContent = `${Math.round(perf.frames / s)} redraws/s · ${(perf.frames ? perf.ms / perf.frames : 0).toFixed(1)} ms avg · ${perf.worst.toFixed(0)} ms max · `
    + `sync in/out ${perf.syncsIn}/${perf.syncsOut} · ×${renderer.getPixelRatio().toFixed(2)}`;
  Object.assign(perf, { frames: 0, ms: 0, worst: 0, since: now, syncsIn: 0, syncsOut: 0 });
}
function drawFrame() {
  const all = dirty || panes.length <= 1;
  dirty = false;
  applyRoll();
  updateHeldProps();
  updateHandles();
  const cw = parseFloat(canvas.style.width) || canvas.clientWidth, ch = parseFloat(canvas.style.height) || canvas.clientHeight;
  if (panes.length <= 1) {
    if (!lookThrough) updateShotHelper();
    shotHelper.visible = !lookThrough && camRec().visible;
    aimMarker.visible = camHelpers.visible = !lookThrough;
    lightRig.handles.visible = !lookThrough && lightRig.state.handles;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, cw, ch);
    renderer.render(scene, activeCam());
  } else {
    updateShotHelper();
    const dpr = renderer.getPixelRatio();
    renderer.setScissorTest(true);
    paneClear.copy(scene.background?.isColor ? scene.background : paneClear).multiplyScalar(0.7);
    for (const p of panes) {
      if (!all && !paneDirty.has(p.slot)) continue;
      const cam = paneCam(p);
      renderer.setViewport(p.rect.x, ch - p.rect.y - p.rect.h, p.rect.w, p.rect.h);
      renderer.setScissor(p.rect.x, ch - p.rect.y - p.rect.h, p.rect.w, p.rect.h);
      renderer.setClearColor(paneClear, 1);
      renderer.clear();
      if (cam === viewCam) { viewCam.aspect = p.vp.w / p.vp.h; viewCam.updateProjectionMatrix(); }
      renderer.setViewport(p.vp.x, ch - p.vp.y - p.vp.h, p.vp.w, p.vp.h);
      renderer.setScissor(p.vp.x, ch - p.vp.y - p.vp.h, p.vp.w, p.vp.h);
      aimMarker.visible = camHelpers.visible = p.view !== 'camera';
      shotHelper.visible = aimMarker.visible && camRec().visible;
      lightRig.handles.visible = p.view !== 'camera' && lightRig.state.handles;
      gizmo.camera = cam;
      props.gizmo.camera = cam;
      rigControls.setResolution(p.vp.w * dpr, p.vp.h * dpr);
      renderer.render(scene, cam);
    }
    renderer.setScissorTest(false);
    gizmo.camera = activeCam();
    props.gizmo.camera = activeCam();
    const ap = panes[activePane];
    if (ap) { viewCam.aspect = ap.vp.w / ap.vp.h; viewCam.updateProjectionMatrix(); }
    // Swapping the gizmos' camera per pane fires their 'change' event, which
    // would ask for yet another frame: that is not a real change, drop it.
    dirty = false;
  }
  paneDirty.clear();
  drawOverlay();
}

// ------------------------------------------------------------------ boot

(async function boot() {
  syncFovUI();
  setRoll(0);
  renderViews();
  lightRig.setState(settings.lighting);
  syncLightUI();
  colorCodeOn = !!settings.colorCode;
  $('colorCodeBtn').classList.toggle('on', colorCodeOn);
  if (settings.paneViews) for (const k of Object.keys(LAYOUTS)) if (Array.isArray(settings.paneViews[k])) paneViews[k] = settings.paneViews[k].filter((v) => VIEW_LABELS[v]);
  for (const k of Object.keys(LAYOUTS)) while (paneViews[k].length < LAYOUTS[k].length) paneViews[k].push(DEFAULT_PANE_VIEWS[k][paneViews[k].length]);
  setViewLayout(LAYOUTS[settings.viewLayout] ? settings.viewLayout : 'single');
  pollSize();
  await refreshModelList();
  const synced = $('linkEditors').checked ? store.get(SYNC_KEY, null) : null;
  // Scene: synced editor > this editor's last session > older single-model formats > default.
  let list = synced?.characters || settings.characters;
  const legacy = synced?.model || settings.model;
  if (!list?.length && legacy) list = [{ id: 'c1', name: 'Character', spec: legacy, pose: synced?.pose || null }];
  if (list?.length) await restoreCharacters(list, synced?.active || settings.activeChar);
  if (!characters.length) await addCharacter({ kind: 'mannequin', opts: { ...bodyOpts } }, { name: 'Character' });
  props.load(synced?.props || settings.props || [], { silent: true });
  // Cameras: the synced list wins; the active camera's framing comes from the
  // synced editor, or from this editor's last session.
  const camList = synced?.cameras || settings.cameras;
  if (camList) restoreCameras(camList, { applyActive: !synced?.camera });
  if (synced?.camera) putCamState(synced.camera);
  else if (!camList && !list?.some((d) => d.pose)) frameShot();
  $('modelSelect').value = modelSpec.kind === 'url' ? modelSpec.url : 'mannequin';
  registerAutoSend();
  updateTags();
  applyShadowMode();
  queueLightSubject();
  requestRender();
  requestAnimationFrame(frame);
  updateViewHud();
  window.__riggedPose = {
    get cameras() { return shotCams; }, get activeCamId() { return activeCamId; }, switchCamera, addCamera, poseLibrary, holdProp, CATALOG, requestRender, applyCatalog: (id) => poseLibrary.use(poseLibrary.builtinData(id).pose),
    scene, camera, controls, viewCam, get rig() { return rig; }, capture, loadModel,
    characters, addCharacter, removeCharacter, setActiveCharacter, get activeChar() { return activeChar; }, outliner,
    frameShot, setLookThrough, setCropMode, frameSelected, select, props, setAppMode, modal, importPose, setReference, rigControls,
    setViewLayout, setPaneView, panes, get activePane() { return activePane; }, setActivePane,
  };
})();
