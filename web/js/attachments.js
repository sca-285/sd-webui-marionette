// Parts that can be added to any character (built-in mannequin, the base-mesh
// bodies, GLB / VRM / FBX models): genitals, horns and animal ears. They are
// built in the rest pose against the character's own skin (rays find the
// surface), then ride on the hips / head bone so they follow every pose.
import * as THREE from 'three';

export const ATTACH_DEFAULTS = { genitals: 'none', erect: false, gSize: 0.5, pubic: false, horns: 'none', ears: 'none' };
export const HORN_STYLES = [['none', 'None'], ['small', 'Small horns'], ['demon', 'Demon (swept back)'], ['ram', 'Ram (curled)'], ['oni', 'Oni (single)'], ['antlers', 'Antlers']];
export const EAR_STYLES = [['none', 'None'], ['cat', 'Cat'], ['fox', 'Fox'], ['wolf', 'Wolf'], ['bunny', 'Bunny'], ['bear', 'Bear'], ['elf', 'Elf (pointed)']];

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wpos = (o) => o.getWorldPosition(new THREE.Vector3());

// Tapered tube along a path (rings of n points), closed with a cap at the start
// and a point at the end.
function taperedTube(path, r0, r1, n = 10, flat = 1) {
  const pos = [], idx = [];
  const m = path.length;
  let prevN = null;
  for (let i = 0; i < m; i++) {
    const t = path[Math.min(m - 1, i + 1)].clone().sub(path[Math.max(0, i - 1)]).normalize();
    let nrm = prevN ? prevN.clone().addScaledVector(t, -prevN.dot(t)) : (Math.abs(t.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).cross(t);
    nrm.normalize();
    prevN = nrm;
    const b = t.clone().cross(nrm);
    const r = i === m - 1 ? 0.0005 : r0 + (r1 - r0) * (i / (m - 1));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const p = path[i].clone().addScaledVector(nrm, Math.cos(a) * r).addScaledVector(b, Math.sin(a) * r * flat);
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < m - 1; i++) {
    for (let k = 0; k < n; k++) {
      const a = i * n + k, b2 = i * n + ((k + 1) % n), c = (i + 1) * n + k, d = (i + 1) * n + ((k + 1) % n);
      idx.push(a, c, b2, b2, c, d);
    }
  }
  const centre = pos.length / 3;
  pos.push(path[0].x, path[0].y, path[0].z);
  for (let k = 0; k < n; k++) idx.push(centre, k, (k + 1) % n);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Points along a quadratic Bezier.
const curve = (a, c, b, steps = 12) => [...Array(steps + 1)].map((_, i) => {
  const t = i / steps;
  return a.clone().multiplyScalar((1 - t) ** 2).addScaledVector(c, 2 * t * (1 - t)).addScaledVector(b, t * t);
});

// First hit of a ray on the character's meshes (skinned meshes in their current pose).
function surface(meshes, from, dir) {
  const rc = new THREE.Raycaster(from, dir.clone().normalize(), 0, 2);
  const hit = rc.intersectObjects(meshes, false)[0];
  return hit ? hit.point : null;
}

function skinColor(root) {
  let c = null;
  root.traverse((o) => {
    if (c || !o.isMesh || o.userData.attachment) return;
    const m = [o.material].flat()[0];
    if (m?.color) c = m.color.getHex();
  });
  return c ?? 0xc9c3b8;
}

export function removeAttachments(root) {
  const old = [];
  root.traverse((o) => { if (o.userData.attachment) old.push(o); });
  for (const o of old) {
    o.parent?.remove(o);
    o.traverse((x) => { x.geometry?.dispose(); [x.material].flat().forEach((m) => m?.dispose?.()); });
  }
}

// opts: ATTACH_DEFAULTS fields. skipGenitals: the mannequin builds its own.
export function buildAttachments(root, rig, opts = {}, { skipGenitals = false, hairColor = 0x4a3d35 } = {}) {
  removeAttachments(root);
  const o = { ...ATTACH_DEFAULTS, ...opts };
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((x) => {
    if (!x.isMesh || x.userData.attachment) return;
    // Rays hit skinned meshes as posed: their bone matrices must be current.
    if (x.isSkinnedMesh) { x.skeleton.update(); x.computeBoundingSphere(); }
    meshes.push(x);
  });
  const skin = new THREE.MeshStandardMaterial({ color: skinColor(root), roughness: 0.6, side: THREE.DoubleSide });
  const darker = new THREE.MeshStandardMaterial({ color: new THREE.Color(skinColor(root)).multiplyScalar(0.82).getHex(), roughness: 0.6 });
  const hair = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85, side: THREE.DoubleSide });
  const horn = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.45, side: THREE.DoubleSide });
  const yaw = rig.facing();
  const F = (x, y, z) => V(x, y, z).applyQuaternion(yaw); // character frame -> world
  const add = (bone, geo, mat) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.attachment = true;
    mesh.frustumCulled = false;
    // Geometry is in world space: attach keeps that placement under the bone.
    mesh.updateMatrixWorld(true);
    bone.attach(mesh);
    return mesh;
  };
  const hips = rig.map.hips, head = rig.map.head;
  const H = rig.height || 1.72;

  // ---- genitals, on the pelvis surface between the thighs
  if (!skipGenitals && o.genitals !== 'none' && rig.map.leftUpperLeg && rig.map.rightUpperLeg) {
    const lh = wpos(rig.map.leftUpperLeg), rh = wpos(rig.map.rightUpperLeg);
    const mid = lh.clone().add(rh).multiplyScalar(0.5);
    const fwd = F(0, 0, 1), up = V(0, 1, 0);
    const front = (dy) => surface(meshes, mid.clone().addScaledVector(up, dy).addScaledVector(fwd, 0.5), fwd.clone().negate());
    const g = o.gSize;
    if (o.genitals === 'male') {
      const base = front(-0.02 * H / 1.72) || mid.clone().addScaledVector(fwd, 0.08);
      const erect = !!o.erect;
      base.addScaledVector(fwd, erect ? -0.006 : 0.002);
      const L = erect ? 0.12 + 0.07 * g : 0.065 + 0.035 * g;
      const r = erect ? 0.015 + 0.006 * g : 0.0135 + 0.004 * g;
      const d1 = (erect ? F(0, 0.32, 1) : F(0, -1, 0.5)).normalize();
      const d2 = (erect ? F(0, 0.45, 1) : F(0, -1, 0.18)).normalize();
      const p1 = base.clone().addScaledVector(d1, L * 0.5);
      const tip = p1.clone().addScaledVector(d2, L * 0.5);
      const shaft = curve(base.clone().addScaledVector(d1, -0.012), base.clone().addScaledVector(d1, L * 0.45), tip.clone().addScaledVector(d2, -r * 1.2), 10);
      shaft.pop();
      add(hips, taperedTube([...shaft, tip.clone().addScaledVector(d2, -r * 1.15)], r * 1.08, r, 14), skin);
      const gl = r * (erect ? 2.3 : 1.9);
      const prof = [[0.92, 0], [1.08, 0.12], [1.1, 0.25], [1.0, 0.45], [0.8, 0.7], [0.45, 0.92], [0.001, 1]].map(([x, y]) => new THREE.Vector2(x * r, y * gl));
      const glans = new THREE.LatheGeometry(prof, 20);
      glans.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d2));
      const gb = tip.clone().addScaledVector(d2, -gl);
      glans.translate(gb.x, gb.y, gb.z);
      add(hips, glans, darker);
      const ss = 0.85 + 0.35 * g;
      const sc = base.clone().add(V(0, -0.04 - (erect ? 0 : 0.006) - 0.01 * g, 0)).addScaledVector(fwd, erect ? -0.016 : -0.028);
      for (const [dx, sx, sy, sz] of [[0, 0.034, 0.03, 0.024], [0.016, 0.02, 0.026, 0.021], [-0.016, 0.02, 0.026, 0.021]]) {
        const s = new THREE.SphereGeometry(1, 16, 12);
        s.scale(sx * ss, sy * ss, sz * ss);
        s.applyQuaternion(yaw);
        const c = sc.clone().add(F(dx * ss, dx ? 0 : 0.008, 0));
        s.translate(c.x, c.y, c.z);
        add(hips, s, skin);
      }
    } else if (o.genitals === 'female') {
      const top = front(-0.045 * H / 1.72);
      const bot = surface(meshes, mid.clone().addScaledVector(up, -0.075).addScaledVector(fwd, 0.4), F(0, 0.25, -1)) || top;
      if (top) {
        const lr = 0.011 * (0.8 + 0.4 * g);
        for (const s of [1, -1]) {
          const a = top.clone().add(F(s * 0.008, 0, -0.002)), b = bot.clone().add(F(s * 0.008, 0.006, -0.003));
          add(hips, taperedTube(curve(a, a.clone().lerp(b, 0.5).addScaledVector(fwd, 0.003), b, 8), lr, lr * 0.7, 10, 0.7), skin);
        }
        const hood = new THREE.SphereGeometry(1, 12, 10);
        hood.scale(0.006, 0.009, 0.005);
        hood.applyQuaternion(yaw);
        const hc = top.clone().add(F(0, 0.006, -0.002));
        hood.translate(hc.x, hc.y, hc.z);
        add(hips, hood, skin);
      }
    }
    if (o.pubic) {
      const p = front(0.012) || mid.clone().addScaledVector(fwd, 0.08);
      const s = new THREE.SphereGeometry(1, 16, 10);
      s.scale(0.05, 0.03, 0.009);
      s.applyQuaternion(yaw);
      p.addScaledVector(fwd, -0.004);
      s.translate(p.x, p.y, p.z);
      add(hips, s, hair);
    }
  }

  // ---- head geometry: top and sides of the skull from rays
  if ((o.horns !== 'none' || o.ears !== 'none') && head) {
    const top = rig.markers.headTop ? wpos(rig.markers.headTop) : wpos(head).add(V(0, 0.2, 0));
    const hb = wpos(head);
    const c = hb.clone().lerp(top, 0.55);
    const crown = surface(meshes, c.clone().add(V(0, 0.4, 0)), V(0, -1, 0)) || top;
    const sideHit = (s) => surface(meshes, c.clone().add(F(s * 0.4, 0, 0)), F(-s, 0, 0)) || c.clone().add(F(s * 0.08, 0, 0));
    const halfW = sideHit(1).distanceTo(sideHit(-1)) / 2;
    const onSkull = (x, y, z) => {
      // From the head centre outwards in the character frame, to the skin.
      const d = F(x, y, z).normalize();
      return surface(meshes, c.clone().addScaledVector(d, 0.4), d.clone().negate()) || c.clone().addScaledVector(d, halfW);
    };

    if (o.horns !== 'none') {
      for (const s of (o.horns === 'oni' ? [0] : [1, -1])) {
        const at = onSkull(s * 0.45, 0.8, 0.45);
        const out = F(s, 0, 0), upv = V(0, 1, 0), back = F(0, 0, -1), fw = F(0, 0, 1);
        let path, r0;
        switch (o.horns) {
          case 'small':
            path = curve(at, at.clone().addScaledVector(upv, 0.04).addScaledVector(out, 0.01), at.clone().addScaledVector(upv, 0.06).addScaledVector(back, 0.03).addScaledVector(out, 0.015));
            r0 = 0.014; break;
          case 'demon':
            path = curve(at, at.clone().addScaledVector(upv, 0.09).addScaledVector(out, 0.04), at.clone().addScaledVector(upv, 0.12).addScaledVector(back, 0.17).addScaledVector(out, 0.06), 16);
            r0 = 0.02; break;
          case 'ram': {
            // A spiral in the side plane: up and back, round behind the ear, then down and forward.
            const a0 = onSkull(s * 0.6, 0.6, 0.2);
            const R0 = 0.055, C = a0.clone().addScaledVector(back, R0);
            path = [...Array(24)].map((_, i) => {
              const t = i / 23, th = Math.PI - t * Math.PI * 1.6, rad = R0 * (1 - 0.4 * t);
              return C.clone().addScaledVector(back, Math.cos(th) * rad).addScaledVector(upv, Math.sin(th) * rad).addScaledVector(out, 0.015 + t * 0.04);
            });
            r0 = 0.024; break;
          }
          case 'oni': {
            const a1 = onSkull(0, 0.85, 0.5);
            path = curve(a1, a1.clone().addScaledVector(upv, 0.06).addScaledVector(fw, 0.01), a1.clone().addScaledVector(upv, 0.1).addScaledVector(fw, 0.015));
            r0 = 0.018; break;
          }
          case 'antlers': {
            path = curve(at, at.clone().addScaledVector(upv, 0.1).addScaledVector(out, 0.05), at.clone().addScaledVector(upv, 0.2).addScaledVector(out, 0.12).addScaledVector(back, 0.04), 14);
            r0 = 0.012;
            for (const f of [0.35, 0.6, 0.85]) {
              const p = path[Math.round(f * (path.length - 1))];
              add(head, taperedTube(curve(p, p.clone().addScaledVector(upv, 0.04).addScaledVector(fw, 0.02), p.clone().addScaledVector(upv, 0.07).addScaledVector(fw, 0.035), 6), 0.007, 0.004, 8), horn);
            }
            break;
          }
          default: path = null;
        }
        if (path) add(head, taperedTube(path, r0, r0 * 0.45, 12), horn);
      }
    }

    if (o.ears !== 'none') {
      for (const s of [1, -1]) {
        const out = F(s, 0, 0), upv = V(0, 1, 0), fw = F(0, 0, 1);
        if (o.ears === 'elf') {
          // Long pointed ears on the sides of the head, sweeping back and up.
          const at = onSkull(s, 0.05, -0.05);
          const tip = at.clone().addScaledVector(out, 0.05).addScaledVector(upv, 0.045).addScaledVector(fw, -0.04);
          add(head, taperedTube(curve(at.clone().addScaledVector(out, -0.006), at.clone().addScaledVector(out, 0.03).addScaledVector(upv, 0.02), tip, 10), 0.022, 0.008, 12, 0.4), skin);
          continue;
        }
        const shape = {
          cat: { pos: [0.55, 0.75, 0.05], h: 0.07, w: 0.045, lean: 0.25, bend: 0 },
          fox: { pos: [0.55, 0.75, 0.0], h: 0.1, w: 0.05, lean: 0.2, bend: 0 },
          wolf: { pos: [0.5, 0.8, -0.05], h: 0.085, w: 0.045, lean: 0.12, bend: 0.01 },
          bunny: { pos: [0.3, 0.92, -0.05], h: 0.2, w: 0.035, lean: 0.1, bend: -0.04 },
          bear: { pos: [0.6, 0.72, 0], h: 0.04, w: 0.04, lean: 0.3, bend: 0 },
        }[o.ears];
        if (!shape) continue;
        const base = onSkull(s * shape.pos[0], shape.pos[1], shape.pos[2]);
        const dir = upv.clone().addScaledVector(out, shape.lean).normalize();
        const tip = base.clone().addScaledVector(dir, shape.h).addScaledVector(F(0, 0, -1), shape.bend);
        const ctrl = base.clone().lerp(tip, 0.5).addScaledVector(F(0, 0, -1), shape.bend * 0.5);
        const outerR = o.ears === 'bear' ? shape.w * 0.75 : shape.w * 0.5;
        const ear = taperedTube(curve(base.clone().addScaledVector(dir, -0.01), ctrl, tip, 10), outerR, o.ears === 'bear' ? outerR * 0.9 : outerR * 0.25, 12, o.ears === 'bear' ? 0.45 : 0.32);
        add(head, ear, hair);
        if (o.ears !== 'bear') {
          // Lighter inner ear facing forward.
          const inner = taperedTube(curve(base.clone().addScaledVector(dir, 0.004).addScaledVector(fw, 0.006), ctrl.clone().addScaledVector(fw, 0.007), tip.clone().addScaledVector(dir, -0.012).addScaledVector(fw, 0.004), 8), outerR * 0.6, outerR * 0.12, 10, 0.2);
          add(head, inner, skin);
        }
      }
    }
  }
}
