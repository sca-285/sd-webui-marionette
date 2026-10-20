// Character models: loading (mannequin / GLB / VRM / FBX), rig creation, disposal.
// Placement lives in the pose (hips offset and rotation), so every character is
// normalised at the origin and moved by posing its hips.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { buildMannequin } from './mannequin.js';
import { serverUrl } from './base.js';
import { buildAttachments } from './attachments.js';
import { Rig, resolveGeneric, resolveVRM } from './rig.js';

// Region colours (distinct, readable): one per character for region maps and the outliner.
export const REGION_COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45'];

const gltfLoader = new GLTFLoader();
gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
const fbxLoader = new FBXLoader();

let nextId = 1;

export class Character {
  constructor({ id, name, color } = {}) {
    this.id = id || 'c' + Date.now().toString(36) + (nextId++);
    this.name = name || 'Character';
    this.color = color || REGION_COLORS[0];
    this.root = null;
    this.rig = null;
    this.spec = null;
    this.mapping = null;
    this.visible = true;
    this.locked = false;
  }

  setVisible(v) {
    this.visible = v;
    if (this.root) this.root.visible = v;
  }
}

// Returns { root, rig, mapping, spec } or throws.
export async function buildModel(spec) {
  let obj, mapping, url = spec.url, clips = [];
  if (spec.kind === 'mannequin') {
    const m = buildMannequin(spec.opts);
    obj = m.root;
    mapping = m.mapping;
  } else {
    if (spec.kind === 'file') url = URL.createObjectURL(spec.file);
    else url = serverUrl(url);
    try {
      const ext = (spec.name || url).split('?')[0].split('.').pop().toLowerCase();
      if (ext === 'fbx') {
        obj = await fbxLoader.loadAsync(url);
        mapping = resolveGeneric(obj);
        clips = obj.animations || [];
      } else {
        const gltf = await gltfLoader.loadAsync(url);
        clips = gltf.animations || [];
        const vrm = gltf.userData.vrm;
        if (vrm) {
          VRMUtils.removeUnnecessaryVertices(gltf.scene);
          vrm.humanoid.autoUpdateHumanBones = false;
          obj = vrm.scene;
          mapping = resolveVRM(vrm);
        } else {
          obj = gltf.scene;
          mapping = resolveGeneric(obj);
        }
      }
    } finally {
      if (spec.kind === 'file') URL.revokeObjectURL(url);
    }
  }
  const root = new THREE.Group();
  root.add(obj);
  obj.traverse((o) => {
    if (o.isMesh) o.frustumCulled = false;
    if (o.isLight || o.isCamera) o.visible = false;
  });
  const rig = new Rig(root, mapping);
  // Genitals, horns, animal ears: the mannequin keeps its own genitals.
  const att = spec.kind === 'mannequin' ? { horns: spec.opts?.horns, ears: spec.opts?.ears } : spec.attach;
  if (att && (att.genitals && att.genitals !== 'none' || att.horns && att.horns !== 'none' || att.ears && att.ears !== 'none')) {
    try { buildAttachments(root, rig, att, { skipGenitals: spec.kind === 'mannequin' }); } catch (e) { console.warn('attachments', e); }
  }
  // Animation clips that came with the model play on its own object.
  return { root, rig, mapping, clips, animObj: obj, spec: spec.kind === 'file' ? { kind: 'file', name: spec.file.name } : spec };
}

// An animation-only file (e.g. Mixamo FBX "without skin"): its own skeleton
// is rigged like a model so every frame can be read as a canonical pose and
// retargeted onto any character.
export async function loadAnimationSource(file) {
  const url = URL.createObjectURL(file);
  try {
    const ext = file.name.split('.').pop().toLowerCase();
    let obj, clips, mapping;
    if (ext === 'fbx') {
      obj = await fbxLoader.loadAsync(url);
      clips = obj.animations || [];
      mapping = resolveGeneric(obj);
    } else {
      const gltf = await gltfLoader.loadAsync(url);
      clips = gltf.animations || [];
      const vrm = gltf.userData.vrm;
      obj = vrm ? vrm.scene : gltf.scene;
      mapping = vrm ? resolveVRM(vrm) : resolveGeneric(obj);
    }
    if (!clips.length) throw new Error('the file has no animation');
    const root = new THREE.Group();
    root.add(obj);
    const rig = new Rig(root, mapping);
    return { name: file.name, root, obj, rig, clips, mixer: new THREE.AnimationMixer(obj), restDirs: rig.restDirections() };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function disposeRoot(root) {
  if (!root) return;
  root.parent?.remove(root);
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => {
      for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
      m.dispose();
    });
  });
}

// Meshes that belong to a character (for click-to-select in the viewport).
export function characterMeshes(c) {
  const out = [];
  c.root?.traverse((o) => { if (o.isMesh && o.visible) out.push(o); });
  return out;
}
