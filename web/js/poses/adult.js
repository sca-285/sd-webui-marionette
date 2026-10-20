// Adult (18+) solo poses for adult characters: boudoir, pin-up, nude-study and
// explicit poses, female and male styling. Hidden in the library until the
// viewer turns on "18+". bodypose.js format.
import * as THREE from 'three';

const F = ['female', 'adult'], M = ['male', 'adult'];
const FX = [...F, 'explicit'], MX = [...M, 'explicit'];
const soft = 'Sensual (soft curl)';

// Hand contact points are given on the body (pelvis or chest frame, measured
// on the mannequin: hips joint at the origin, +X left, +Y up, +Z front) and
// turned into the upright-frame offsets that bodypose.js `ik` expects.
const RAD = Math.PI / 180;
const rot = (a = [0, 0, 0]) => new THREE.Quaternion().setFromEuler(new THREE.Euler((a[0] || 0) * RAD, (a[1] || 0) * RAD, -(a[2] || 0) * RAD, 'YXZ'));
const fix = (v) => v.toArray().map((n) => +n.toFixed(3));
// A point on the pelvis for hips rotation h.
const pel = (h, v) => fix(new THREE.Vector3(...v).applyQuaternion(rot(h)));
// A point on the chest (relative to the top spine joint) for hips h and back bend sp (two spine joints).
const chest = (h, sp, v) => {
  const half = rot((sp || [0, 0, 0]).map((x) => x / 2));
  return fix(new THREE.Vector3(...v).applyQuaternion(rot(h).multiply(half).multiply(half)));
};
// Landmarks (pelvis frame): where the wrist sits for each touch.
const CROTCH = [0, -0.015, 0.125]; // palm over the mons, fingers reaching down to the vulva
const CROTCH_LOW = [0, -0.06, 0.13]; // deeper: fingers curling in from the front
const SHAFT = [-0.06, -0.1, 0.13]; // right-hand grip round an erect penis (left: mirror x)
const BUTT = [0.12, -0.03, -0.13]; // left buttock, wrist at the side (right: mirror x)
const BREAST = [0.12, -0.13, 0.12]; // left breast cupped from below (chest frame; right: mirror x)
const mx = (v) => [-v[0], v[1], v[2]];
const hand = (at, off, pole) => ({ at, off, pole });

// Wrist targets and hand turns found by fitting the fingertips onto the body
// (palm towards the skin, fingertip on the landmark), per pose and hand.
const TOUCH = {
  'Masturbating · lying back|right': { frame: 'pel', local: [-0.057, 0.035, 0.134], forearm: -60, wrist: [20, -30] },
  'Fingering · kneeling|right': { frame: 'pel', local: [-0.066, 0.034, 0.128], forearm: -60, wrist: [20, -30] },
  'Fingering · against a wall|right': { frame: 'pel', local: [-0.061, 0.039, 0.113], forearm: -75, wrist: [20, -30] },
  'All fours · hand between legs|right': { frame: 'pel', local: [-0.019, 0.039, 0.147], forearm: 15, wrist: [30, -30] },
  'Lying on stomach · hand underneath|right': { frame: 'pel', local: [-0.049, 0.039, 0.122], forearm: -75, wrist: [30, -30] },
  'Fingering · sitting on the floor|right': { frame: 'pel', local: [-0.055, 0.04, 0.119], forearm: -90, wrist: [30, -30] },
  'Chair edge · legs spread, touching|right': { frame: 'pel', local: [-0.065, 0.033, 0.13], forearm: -60, wrist: [20, -30] },
  'Lying on side · leg raised, touching|left': { frame: 'pel', local: [0.08, 0.03, 0.119], forearm: -75, wrist: [20, -30] },
  'Come hither · lying back|right': { frame: 'pel', local: [0.001, -0.033, 0.121], forearm: -75, wrist: [20, -30] },
  'Standing · hand between thighs|right': { frame: 'pel', local: [-0.048, 0.011, 0.091], forearm: -90, wrist: [10, -30] },
  'Spread on back · hands spreading|left': { frame: 'pel', local: [0.12, 0.021, 0.123], forearm: -60, wrist: [10, -30] },
  'Spread on back · hands spreading|right': { frame: 'pel', local: [-0.12, 0.021, 0.123], forearm: -60, wrist: [10, -30] },
  'Exhibition · standing, legs apart|left': { frame: 'pel', local: [0.111, 0.033, 0.092], forearm: -90, wrist: [20, -30] },
  'Exhibition · standing, legs apart|right': { frame: 'pel', local: [-0.111, 0.033, 0.092], forearm: -90, wrist: [20, -30] },
  'Exhibition · squat, spreading|left': { frame: 'pel', local: [0.125, 0.019, 0.117], forearm: -75, wrist: [10, -30] },
  'Exhibition · squat, spreading|right': { frame: 'pel', local: [-0.125, 0.019, 0.117], forearm: -75, wrist: [10, -30] },
  'Spreading from behind · bent over|left': { frame: 'pel', local: [0.13, 0.041, -0.091], forearm: 105, wrist: [-10, 0] },
  'Spreading from behind · bent over|right': { frame: 'pel', local: [-0.13, 0.041, -0.091], forearm: 105, wrist: [-10, 0] },
  'Spreading from behind · chest down|left': { frame: 'pel', local: [0.13, 0, -0.1], forearm: 120, wrist: [-30, 0] },
  'Spreading from behind · chest down|right': { frame: 'pel', local: [-0.13, 0, -0.1], forearm: 120, wrist: [-30, 0] },
  'Bent over a table · spreading|left': { frame: 'pel', local: [0.13, 0.059, -0.081], forearm: 60, wrist: [-10, -15] },
  'Bent over a table · spreading|right': { frame: 'pel', local: [-0.13, 0.059, -0.081], forearm: 60, wrist: [-10, -15] },
  'Spreading from behind (male)|left': { frame: 'pel', local: [0.13, 0, -0.1], forearm: 75, wrist: [-30, 0] },
  'Spreading from behind (male)|right': { frame: 'pel', local: [-0.13, 0, -0.1], forearm: 75, wrist: [-30, 0] },
  'Masturbating · lying back|left': { frame: 'chest', local: [0.212, -0.02, 0.177], forearm: -45, wrist: [20, 30] },
  'Fingering · kneeling|left': { frame: 'chest', local: [0.215, -0.063, 0.175], forearm: -30, wrist: [40, 30] },
  'Fingering · against a wall|left': { frame: 'chest', local: [0.217, -0.062, 0.17], forearm: -30, wrist: [40, 30] },
  'Standing · hand between thighs|left': { frame: 'chest', local: [0.045, -0.09, 0.213], forearm: -45, wrist: [40, 30] },
  'Kneeling · pressing breasts together|left': { frame: 'chest', local: [0.171, -0.039, 0.024], forearm: -30, wrist: [-60, 30] },
  'Kneeling · pressing breasts together|right': { frame: 'chest', local: [-0.171, -0.039, 0.024], forearm: -30, wrist: [-60, 30] },
  'Stroking · standing|right': { frame: 'pel', local: [-0.029, -0.147, 0.187], forearm: 0, wrist: [-10, -30] },
  'Stroking · head back|right': { frame: 'pel', local: [-0.023, -0.168, 0.198], forearm: 0, wrist: [-10, -30] },
  'Stroking · sitting on a chair|right': { frame: 'pel', local: [-0.023, -0.169, 0.198], forearm: 0, wrist: [-10, -30] },
  'Stroking · lying back|right': { frame: 'pel', local: [-0.028, -0.15, 0.188], forearm: 0, wrist: [-10, -30] },
  'Stroking · kneeling|right': { frame: 'pel', local: [-0.028, -0.153, 0.189], forearm: 0, wrist: [-10, -30] },
  'Stroking · squatting|right': { frame: 'pel', local: [-0.047, -0.087, 0.151], forearm: 0, wrist: [-10, -15] },
  'Stroking · leaning on a wall|right': { frame: 'pel', local: [-0.026, -0.159, 0.192], forearm: 0, wrist: [-10, -30] },
};

function applyTouch(list) {
  for (const e of list) {
    for (const side of ['left', 'right']) {
      const t = TOUCH[`${e.name}|${side}`];
      const ik = e.body.ik?.[side + 'Hand'];
      if (!t || !ik) continue;
      ik.off = t.frame === 'chest' ? chest(e.body.hips, e.body.spine, t.local) : pel(e.body.hips, t.local);
      e.body.forearm = { ...(e.body.forearm || {}), [side]: t.forearm };
      e.body.wrist = { ...(e.body.wrist || {}), [side]: t.wrist };
    }
  }
  return list;
}

export const ADULT = applyTouch([
  // ---- standing (female)
  { name: 'Pin-up · arched, hands on head', tags: [...F, 'pinup', 'standing'], body: {
    hips: [-6, 10, 8], spine: [-18, -6, -10], neck: [-6, 0, 0], head: [8, -15, -10],
    ik: { leftHand: { at: 'head', off: [0.06, 0.13, -0.02], pole: [1, 0.2, 0] }, rightHand: { at: 'head', off: [-0.06, 0.13, -0.02], pole: [-1, 0.2, 0] } },
    legs: { leftUpperLeg: [0.02, -1, 0.15], leftLowerLeg: [0.05, -1, -0.05], rightUpperLeg: [-0.1, -1, 0], rightLowerLeg: [-0.02, -1, 0] },
    hands: { left: soft, right: soft } } },
  { name: 'Standing · covering chest', tags: [...F, 'nude', 'standing', 'shy'], body: {
    hips: [0, 0, 6], spine: [6, 0, -6], head: [12, -20, 8],
    ik: { leftHand: { at: 'chest', off: [-0.07, 0.04, 0.13], pole: [0.3, -1, 0] }, rightHand: { at: 'chest', off: [0.07, 0.1, 0.13], pole: [-0.3, -1, 0] } },
    legs: { leftUpperLeg: [-0.05, -1, 0.12], leftLowerLeg: [0.02, -1, -0.04], rightUpperLeg: [-0.08, -1, 0], rightLowerLeg: [0, -1, 0] },
    hands: { left: 'Cupped', right: 'Cupped' } } },
  { name: 'Back view · over the shoulder', tags: [...F, 'nude', 'standing', 'back'], body: {
    hips: [0, 180, 6], spine: [-6, -25, -6], neck: [0, -20, 0], head: [5, -45, 0],
    arms: { leftUpperArm: [0.35, -0.9, -0.05], leftLowerArm: [-0.5, -0.3, -0.6], rightUpperArm: [-0.3, -1, 0.1], rightLowerArm: [-0.1, -1, 0.2] },
    legs: { leftUpperLeg: [0.02, -1, 0.12], leftLowerLeg: [0.02, -1, -0.06], rightUpperLeg: [-0.1, -1, 0], rightLowerLeg: [0, -1, 0] },
    hands: { left: soft, right: 'Relaxed (soft)' } } },
  { name: 'Bent over · hands on knees', tags: [...F, 'standing', 'explicit'], body: {
    hips: [78, 180, 0], spine: [-20, 0, 0], neck: [-25, 0, 0], head: [-15, -35, 0],
    ik: { leftHand: { at: 'leftLowerLeg', off: [0, 0.06, 0.07], pole: [0.6, 0, 0] }, rightHand: { at: 'rightLowerLeg', off: [0, 0.06, 0.07], pole: [-0.6, 0, 0] } },
    legs: { leftUpperLeg: [0.18, -1, 0.1], leftLowerLeg: [0.05, -1, -0.05], rightUpperLeg: [-0.18, -1, 0.1], rightLowerLeg: [-0.05, -1, -0.05] }, legsIn: 'world',
    hands: { left: 'Open fingers together', right: 'Open fingers together' } } },
  { name: 'Standing · hand on thigh, hip out', tags: [...F, 'pinup', 'standing'], body: {
    hips: [0, -15, -10], spine: [-4, 10, 12], head: [6, 15, 8],
    arms: { rightUpperArm: [-0.55, 0.6, 0.3], rightLowerArm: [0.55, 0.75, 0.05] },
    ik: { leftHand: { at: 'leftUpperLeg', off: [0.06, -0.12, 0.05], pole: [1, 0, -0.4] }, rightHand: { at: 'head', off: [-0.05, 0.12, -0.03], pole: [-1, 0.3, 0] } },
    legs: { leftUpperLeg: [0.12, -1, 0], leftLowerLeg: [0, -1, 0], rightUpperLeg: [0.08, -1, 0.2], rightLowerLeg: [-0.02, -1, -0.12] },
    hands: { left: soft, right: 'Elegant (ballet)' } } },

  // ---- kneeling (female)
  { name: 'Kneeling · arched, hands in hair', tags: [...F, 'kneeling'], body: {
    hips: [-8, 0, 0], spine: [-22, 0, 0], neck: [-10, 0, 0], head: [-10, 15, 0],
    ik: { leftHand: { at: 'head', off: [0.07, 0.11, -0.05], pole: [1, 0.4, 0.2] }, rightHand: { at: 'head', off: [-0.07, 0.11, -0.05], pole: [-1, 0.4, 0.2] } },
    legs: { leftUpperLeg: [0.22, -1, 0.1], leftLowerLeg: [0.05, -0.05, -1], rightUpperLeg: [-0.22, -1, 0.1], rightLowerLeg: [-0.05, -0.05, -1] },
    hands: { left: soft, right: soft }, feet: 'free' } },
  { name: 'Kneeling · sitting on heels, thighs apart', tags: [...F, 'kneeling', 'explicit'], body: {
    hips: [-5, 0, 0], spine: [-6, 0, 0], head: [5, 0, 0],
    arms: { leftUpperArm: [0.2, -1, 0.15], leftLowerArm: [-0.1, -0.4, 0.95], rightUpperArm: [-0.2, -1, 0.15], rightLowerArm: [0.1, -0.4, 0.95] },
    legs: { leftUpperLeg: [0.55, -0.2, 0.8], leftLowerLeg: [-0.1, -0.12, -1], rightUpperLeg: [-0.55, -0.2, 0.8], rightLowerLeg: [0.1, -0.12, -1] },
    hands: { left: 'Open fingers together', right: 'Open fingers together' }, feet: 'free' } },
  { name: 'Kneeling · leaning back on hands', tags: [...F, 'kneeling', 'arched'], body: {
    hips: [-30, 0, 0], spine: [-25, 0, 0], neck: [-15, 0, 0], head: [-15, 0, 0],
    arms: { leftUpperArm: [0.25, -0.5, -0.85], leftLowerArm: [0.05, -0.6, -0.8], rightUpperArm: [-0.25, -0.5, -0.85], rightLowerArm: [-0.05, -0.6, -0.8] }, armsIn: 'world',
    legs: { leftUpperLeg: [0.3, -0.45, 0.85], leftLowerLeg: [0.02, -0.05, -1], rightUpperLeg: [-0.3, -0.45, 0.85], rightLowerLeg: [-0.02, -0.05, -1] }, legsIn: 'world',
    hands: { left: 'Open flat', right: 'Open flat' }, feet: 'free' } },
  { name: 'On all fours · arched, looking back', tags: [...F, 'all fours', 'explicit'], body: {
    hips: [85, 0, 0], spine: [-30, 0, 0], neck: [-20, 0, 0], head: [-20, 50, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.05, -1, 0.15], leftLowerArm: [0, -1, 0.05], rightUpperArm: [-0.05, -1, 0.15], rightLowerArm: [0, -1, 0.05] },
    legs: { leftUpperLeg: [0.12, -1, -0.1], leftLowerLeg: [0.02, -0.05, -1], rightUpperLeg: [-0.12, -1, -0.1], rightLowerLeg: [-0.02, -0.05, -1] },
    hands: { left: 'Open fingers together', right: 'Open fingers together' } } },
  { name: 'Chest down, hips up', tags: [...F, 'all fours', 'explicit'], body: {
    hips: [130, 0, 0], spine: [-40, 0, 0], neck: [-10, 0, 0], head: [0, 70, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.4, -0.2, 0.9], leftLowerArm: [-0.2, -0.1, 1], rightUpperArm: [-0.4, -0.2, 0.9], rightLowerArm: [0.2, -0.1, 1] },
    legs: { leftUpperLeg: [0.18, -1, 0.1], leftLowerLeg: [0.02, -0.05, -1], rightUpperLeg: [-0.18, -1, 0.1], rightLowerLeg: [-0.02, -0.05, -1] },
    hands: { left: 'Relaxed (soft)', right: 'Relaxed (soft)' } } },

  // ---- lying (female)
  { name: 'Reclining on side · head on hand', tags: [...F, 'lying', 'boudoir'], body: {
    hips: [0, 0, -90], spine: [-8, 0, 12], neck: [0, 0, -10], head: [0, 10, -15], legsIn: 'hips',
    arms: { leftUpperArm: [0.2, -0.85, 0.4], leftLowerArm: [-0.2, -0.7, 0.7], rightUpperArm: [-0.75, 0.6, 0.2], rightLowerArm: [0.55, 0.8, 0.1] },
    legs: { leftUpperLeg: [0, -0.75, 0.65], leftLowerLeg: [0, -0.95, -0.25], rightUpperLeg: [0, -1, 0.1], rightLowerLeg: [0, -1, -0.05] },
    hands: { left: soft, right: 'Relaxed (soft)' } } },
  { name: 'Lying on back · arms above head, knee up', tags: [...F, 'lying', 'boudoir'], body: {
    hips: [-90, 0, 8], spine: [-8, 0, 0], head: [0, 25, 0],
    arms: { leftUpperArm: [0.4, 0.9, 0.1], leftLowerArm: [-0.4, 0.9, 0.1], rightUpperArm: [-0.45, 0.9, 0.05], rightLowerArm: [0.5, 0.85, 0.1] },
    legs: { leftUpperLeg: [0.1, -0.55, 0.85], leftLowerLeg: [0, -0.95, -0.35], rightUpperLeg: [-0.06, -1, 0.05], rightLowerLeg: [0, -1, 0] },
    hands: { left: soft, right: soft } } },
  { name: 'Lying on back · knees up and apart', tags: [...F, 'lying', 'explicit'], body: {
    hips: [-90, 0, 0], spine: [-5, 0, 0], head: [-15, 0, 0],
    arms: { leftUpperArm: [0.85, 0.3, 0.1], leftLowerArm: [0.6, 0.75, 0.1], rightUpperArm: [-0.85, 0.3, 0.1], rightLowerArm: [-0.6, 0.75, 0.1] },
    legs: { leftUpperLeg: [0.5, -0.45, 0.75], leftLowerLeg: [0.12, -0.55, -0.82], rightUpperLeg: [-0.5, -0.45, 0.75], rightLowerLeg: [-0.12, -0.55, -0.82] },
    hands: { left: 'Grasping (gripping fabric)', right: 'Grasping (gripping fabric)' }, feet: 'free' } },
  { name: 'Lying on back · legs raised', tags: [...F, 'lying', 'explicit'], body: {
    hips: [-90, 0, 0], spine: [-5, 0, 0], head: [-20, 0, 0],
    arms: { leftUpperArm: [0.3, -1, 0.1], leftLowerArm: [0.05, -0.5, 0.85], rightUpperArm: [-0.3, -1, 0.1], rightLowerArm: [-0.05, -0.5, 0.85] },
    legs: { leftUpperLeg: [0.35, -0.1, 1], leftLowerLeg: [0.3, 0.05, 1], rightUpperLeg: [-0.35, -0.1, 1], rightLowerLeg: [-0.3, 0.05, 1] },
    hands: { left: 'Grasping (gripping fabric)', right: 'Grasping (gripping fabric)' }, feet: 'free' } },
  { name: 'Lying on stomach · feet up, looking back', tags: [...F, 'lying', 'boudoir'], body: {
    hips: [90, 0, 0], spine: [-28, 0, 0], neck: [-15, 0, 0], head: [-10, 35, 0],
    arms: { leftUpperArm: [0.4, 0.2, 0.9], leftLowerArm: [-0.55, 0.6, 0.6], rightUpperArm: [-0.4, 0.2, 0.9], rightLowerArm: [0.55, 0.6, 0.6] },
    legs: { leftUpperLeg: [0.06, -1, 0], leftLowerLeg: [0, -0.2, -1], rightUpperLeg: [-0.06, -1, 0], rightLowerLeg: [0, 0.35, -0.95] },
    hands: { left: soft, right: soft }, feet: 'free' } },
  { name: 'Lying on back · hands on body, legs crossed', tags: [...F, 'lying', 'sensual'], body: {
    hips: [-90, 0, 0], spine: [-6, 0, 0], head: [0, -20, 0],
    arms: { leftUpperArm: [0.3, -0.95, 0.15], leftLowerArm: [-0.75, 0.25, 0.6], rightUpperArm: [-0.25, -0.85, 0.45], rightLowerArm: [0.6, 0.6, 0.5] },
    legs: { leftUpperLeg: [-0.05, -0.85, 0.5], leftLowerLeg: [-0.1, -0.95, -0.3], rightUpperLeg: [-0.02, -1, 0.05], rightLowerLeg: [0, -1, 0] },
    hands: { left: soft, right: soft }, feet: 'free' } },

  // ---- sitting (female)
  { name: 'Sitting · coy side-sit', tags: [...F, 'sitting'], body: {
    hips: [-10, 20, -12], spine: [5, -15, 18], head: [10, -30, 10], legsIn: 'world', armsIn: 'world',
    arms: { leftUpperArm: [0.45, -0.9, -0.1], leftLowerArm: [0.15, -1, -0.05], rightUpperArm: [-0.2, -0.85, 0.5], rightLowerArm: [0.5, -0.4, 0.75] },
    legs: { leftUpperLeg: [-0.4, -0.15, 0.9], leftLowerLeg: [-0.65, -0.1, -0.75], rightUpperLeg: [-0.55, -0.12, 0.8], rightLowerLeg: [-0.75, -0.1, -0.6] },
    hands: { left: 'Open flat', right: soft }, feet: 'free' } },
  { name: 'Sitting · legs apart, leaning back', tags: [...F, 'sitting', 'explicit'], body: {
    hips: [-25, 0, 0], spine: [-8, 0, 0], head: [10, 0, 0], legsIn: 'world', armsIn: 'world',
    arms: { leftUpperArm: [0.3, -0.75, -0.6], leftLowerArm: [0.1, -0.8, -0.55], rightUpperArm: [-0.3, -0.75, -0.6], rightLowerArm: [-0.1, -0.8, -0.55] },
    legs: { leftUpperLeg: [0.6, 0.15, 0.8], leftLowerLeg: [0.25, -0.9, 0.35], rightUpperLeg: [-0.6, 0.15, 0.8], rightLowerLeg: [-0.25, -0.9, 0.35] },
    hands: { left: 'Open flat', right: 'Open flat' }, feet: 'free' } },
  { name: 'Squatting · knees apart', tags: [...F, 'squat', 'explicit'], body: {
    hips: [10, 0, 0], spine: [5, 0, 0], head: [-5, 0, 0],
    ik: { leftHand: { at: 'leftLowerLeg', off: [0, 0.07, 0.05], pole: [0.5, 0, 0.5] }, rightHand: { at: 'rightLowerLeg', off: [0, 0.07, 0.05], pole: [-0.5, 0, 0.5] } },
    legs: { leftUpperLeg: [0.6, -0.3, 0.75], leftLowerLeg: [0.05, -1, -0.1], rightUpperLeg: [-0.6, -0.3, 0.75], rightLowerLeg: [-0.05, -1, -0.1] },
    hands: { left: 'Relaxed', right: 'Relaxed' } } },

  // ---- male
  { name: 'Double biceps flex', tags: [...M, 'standing', 'muscle'], body: {
    spine: [-4, 0, 0], head: [-3, 0, 0], shoulders: { left: [12, 0], right: [12, 0] },
    arms: { leftUpperArm: [1, 0.15, -0.05], leftLowerArm: [0.05, 1, -0.1], rightUpperArm: [-1, 0.15, -0.05], rightLowerArm: [-0.05, 1, -0.1] },
    legs: { leftUpperLeg: [0.14, -1, 0.02], leftLowerLeg: [0.02, -1, 0], rightUpperLeg: [-0.14, -1, 0.02], rightLowerLeg: [-0.02, -1, 0] },
    hands: { left: 'Fist', right: 'Fist' } } },
  { name: 'Hands behind head, hips forward', tags: [...M, 'standing', 'nude'], body: {
    hips: [-8, 0, 0], spine: [-10, 0, 0], head: [8, 0, 0],
    ik: { leftHand: { at: 'head', off: [0.04, 0.06, -0.1], pole: [1, 0.3, 0.1] }, rightHand: { at: 'head', off: [-0.04, 0.06, -0.1], pole: [-1, 0.3, 0.1] } },
    legs: { leftUpperLeg: [0.12, -1, 0.08], leftLowerLeg: [0.02, -1, -0.05], rightUpperLeg: [-0.12, -1, 0.08], rightLowerLeg: [-0.02, -1, -0.05] },
    hands: { left: 'Relaxed', right: 'Relaxed' } } },
  { name: 'Standing · hand on abs, head back', tags: [...M, 'standing', 'sensual'], body: {
    hips: [0, 10, 6], spine: [-10, -5, -4], neck: [-10, 0, 0], head: [-15, 10, 0],
    ik: { leftHand: { at: 'hips', off: [0.02, 0.17, 0.12], pole: [1, -0.5, 0] }, rightHand: { at: 'head', off: [-0.03, 0.08, -0.09], pole: [-1, 0.3, 0] } },
    legs: { leftUpperLeg: [0.04, -1, 0.15], leftLowerLeg: [0.04, -1, -0.06], rightUpperLeg: [-0.12, -1, 0], rightLowerLeg: [0, -1, 0] },
    hands: { left: 'Open fingers together', right: 'Relaxed' } } },
  { name: 'Lying on back · arms behind head (male)', tags: [...M, 'lying', 'nude'], body: {
    hips: [-90, 0, 0], spine: [-5, 0, 0], head: [10, 0, 0],
    ik: { leftHand: { at: 'head', off: [0.05, -0.08, -0.06], pole: [1, 0.2, -0.3] }, rightHand: { at: 'head', off: [-0.05, -0.08, -0.06], pole: [-1, 0.2, -0.3] } },
    legs: { leftUpperLeg: [0.15, -0.55, 0.8], leftLowerLeg: [0.05, -0.95, -0.35], rightUpperLeg: [-0.12, -1, 0.02], rightLowerLeg: [0, -1, 0] },
    hands: { left: 'Relaxed', right: 'Relaxed' } } },
  { name: 'Lying on back · legs apart (male)', tags: [...M, 'lying', 'explicit'], body: {
    hips: [-90, 0, 0], spine: [-5, 0, 0], head: [-10, 0, 0],
    arms: { leftUpperArm: [0.8, 0.1, 0.1], leftLowerArm: [0.6, 0.5, 0.2], rightUpperArm: [-0.8, 0.1, 0.1], rightLowerArm: [-0.6, 0.5, 0.2] },
    legs: { leftUpperLeg: [0.5, -0.5, 0.65], leftLowerLeg: [0.2, -0.95, -0.25], rightUpperLeg: [-0.5, -0.5, 0.65], rightLowerLeg: [-0.2, -0.95, -0.25] },
    hands: { left: 'Relaxed', right: 'Relaxed' }, feet: 'free' } },
  { name: 'Kneeling upright · thighs apart (male)', tags: [...M, 'kneeling', 'explicit'], body: {
    hips: [-4, 0, 0], spine: [-6, 0, 0], head: [0, 0, 0],
    arms: { leftUpperArm: [0.3, -0.95, 0.1], leftLowerArm: [0.05, -0.85, 0.5], rightUpperArm: [-0.3, -0.95, 0.1], rightLowerArm: [-0.05, -0.85, 0.5] },
    legs: { leftUpperLeg: [0.35, -1, 0.05], leftLowerLeg: [0.05, -0.05, -1], rightUpperLeg: [-0.35, -1, 0.05], rightLowerLeg: [-0.05, -0.05, -1] },
    hands: { left: 'Relaxed', right: 'Relaxed' }, feet: 'free' } },
  { name: 'Sitting · legs spread, leaning back (male)', tags: [...M, 'sitting', 'explicit'], body: {
    hips: [-30, 0, 0], spine: [-5, 0, 0], head: [12, 0, 0], legsIn: 'world', armsIn: 'world',
    arms: { leftUpperArm: [0.35, -0.7, -0.6], leftLowerArm: [0.1, -0.85, -0.5], rightUpperArm: [-0.35, -0.7, -0.6], rightLowerArm: [-0.1, -0.85, -0.5] },
    legs: { leftUpperLeg: [0.55, 0.1, 0.8], leftLowerLeg: [0.2, -0.9, 0.4], rightUpperLeg: [-0.6, 0.05, 0.8], rightLowerLeg: [-0.05, -0.75, 0.65] },
    hands: { left: 'Open flat', right: 'Open flat' }, feet: 'free' } },
  { name: 'On all fours (male)', tags: [...M, 'all fours', 'explicit'], body: {
    hips: [85, 0, 0], spine: [-15, 0, 0], neck: [-25, 0, 0], head: [-20, 0, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.1, -1, 0.1], leftLowerArm: [0.02, -1, 0.05], rightUpperArm: [-0.1, -1, 0.1], rightLowerArm: [-0.02, -1, 0.05] },
    legs: { leftUpperLeg: [0.15, -1, -0.05], leftLowerLeg: [0.02, -0.05, -1], rightUpperLeg: [-0.15, -1, -0.05], rightLowerLeg: [-0.02, -0.05, -1] },
    hands: { left: 'Open flat', right: 'Open flat' } } },
  { name: 'Reclining on elbow (male)', tags: [...M, 'lying', 'nude'], body: {
    hips: [0, 0, -90], spine: [0, 0, 18], head: [0, 0, -12], legsIn: 'hips',
    arms: { leftUpperArm: [0.15, -0.8, 0.55], leftLowerArm: [0.1, -0.85, 0.5], rightUpperArm: [-0.2, -0.95, 0.15], rightLowerArm: [-0.1, -0.8, 0.55] },
    legs: { leftUpperLeg: [0, -0.8, 0.55], leftLowerLeg: [0, -0.95, -0.2], rightUpperLeg: [0, -1, 0.05], rightLowerLeg: [0, -1, 0] },
    hands: { left: 'Relaxed', right: 'Relaxed' } } },
  { name: 'Lying on stomach · on elbows (male)', tags: [...M, 'lying'], body: {
    hips: [90, 0, 0], spine: [-30, 0, 0], neck: [-10, 0, 0], head: [-5, 30, 0],
    arms: { leftUpperArm: [0.3, -0.3, 0.9], leftLowerArm: [-0.15, 0.6, 0.8], rightUpperArm: [-0.3, -0.3, 0.9], rightLowerArm: [0.15, 0.6, 0.8] },
    legs: { leftUpperLeg: [0.08, -1, 0], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.08, -1, 0], rightLowerLeg: [0, -0.6, -0.8] },
    hands: { left: 'Relaxed', right: 'Relaxed' }, feet: 'free' } },
  { name: 'Squatting · knees apart (male)', tags: [...M, 'squat'], body: {
    hips: [15, 0, 0], spine: [10, 0, 0], head: [-10, 0, 0],
    arms: { leftUpperArm: [0.4, -0.7, 0.55], leftLowerArm: [-0.1, -0.6, 0.8], rightUpperArm: [-0.4, -0.7, 0.55], rightLowerArm: [0.1, -0.6, 0.8] },
    legs: { leftUpperLeg: [0.65, -0.3, 0.7], leftLowerLeg: [0.08, -1, -0.12], rightUpperLeg: [-0.65, -0.3, 0.7], rightLowerLeg: [-0.08, -1, -0.12] },
    hands: { left: 'Relaxed', right: 'Relaxed' } } },

  // ---- with furniture
  { name: 'Reclining on a sofa', tags: [...F, 'sofa', 'boudoir'], body: {
    hips: [-35, 0, 0], spine: [5, 0, 0], head: [15, 15, 0],
    arms: { leftUpperArm: [0.85, 0.45, 0.1], leftLowerArm: [-0.5, 0.85, 0.1], rightUpperArm: [-0.3, -0.9, 0.3], rightLowerArm: [0.4, -0.3, 0.85] },
    legs: { leftUpperLeg: [0.05, -0.6, 0.8], leftLowerLeg: [0, -1, -0.15], rightUpperLeg: [-0.05, -1, 0.1], rightLowerLeg: [0, -1, 0] },
    hands: { left: soft, right: soft }, feet: 'free', ground: 0.55, support: ['Furniture', 'Sofa', [0, 0, 0.02], 0] } },
  { name: 'Lying on a bed · arms up', tags: [...F, 'bed', 'boudoir'], body: {
    hips: [-90, 0, 5], spine: [-6, 0, 0], head: [0, 20, 0],
    arms: { leftUpperArm: [0.35, 0.9, 0.1], leftLowerArm: [-0.4, 0.9, 0.1], rightUpperArm: [-0.4, 0.9, 0.05], rightLowerArm: [0.45, 0.85, 0.1] },
    legs: { leftUpperLeg: [0.05, -0.6, 0.8], leftLowerLeg: [0, -0.95, -0.3], rightUpperLeg: [-0.06, -1, 0.05], rightLowerLeg: [0, -1, 0] },
    hands: { left: soft, right: soft }, ground: 0.6, support: ['Furniture', 'Bed', [0, 0, 0.25], 0] } },
  { name: 'Chair · legs apart, leaning back', tags: [...M, 'chair', 'explicit'], body: {
    hips: [-15, 0, 0], spine: [-10, 0, 0], head: [10, 0, 0],
    arms: { leftUpperArm: [0.35, -1, -0.1], leftLowerArm: [0.1, -1, 0.1], rightUpperArm: [-0.35, -1, -0.1], rightLowerArm: [-0.1, -1, 0.1] },
    legs: { leftUpperLeg: [0.55, 0, 0.85], leftLowerLeg: [0.15, -1, 0.1], rightUpperLeg: [-0.55, 0, 0.85], rightLowerLeg: [-0.15, -1, 0.1] },
    hands: { left: 'Relaxed', right: 'Relaxed' }, ground: 0.56, support: ['Furniture', 'Chair', [0, 0, -0.1], 0] } },
  { name: 'Bent over a table', tags: [...F, 'table', 'explicit'], body: {
    hips: [70, 180, 0], spine: [-10, 0, 0], neck: [-30, 0, 0], head: [-20, -40, 0], armsIn: 'world', legsIn: 'world',
    arms: { leftUpperArm: [0.3, -0.75, -0.6], leftLowerArm: [0.05, -0.95, -0.3], rightUpperArm: [-0.3, -0.75, -0.6], rightLowerArm: [-0.05, -0.95, -0.3] },
    legs: { leftUpperLeg: [0.15, -1, 0.15], leftLowerLeg: [0.05, -1, 0], rightUpperLeg: [-0.15, -1, 0.15], rightLowerLeg: [-0.05, -1, 0] },
    hands: { left: 'Open flat', right: 'Open flat' }, feet: 'flat', support: ['Furniture', 'Table', [0, 0, -0.55], 0] } },
  // =================================================================== explicit (female)
  ...(() => {
    const out = [];
    // Lying back, knees up and apart: the base for the touching poses on the back.
    const backH = [-90, 0, 0];
    const backLegs = { leftUpperLeg: [0.5, -0.45, 0.75], leftLowerLeg: [0.12, -0.55, -0.82], rightUpperLeg: [-0.5, -0.45, 0.75], rightLowerLeg: [-0.12, -0.55, -0.82] };
    out.push({ name: 'Masturbating · lying back', tags: [...FX, 'lying', 'masturbation', 'fingering'], body: {
      hips: backH, spine: [-8, 0, 0], neck: [-10, 0, 0], head: [-20, 15, 0],
      ik: { rightHand: hand('hips', pel(backH, CROTCH), [-1, 0.6, 0.2]), leftHand: hand('spine1', chest(backH, [-8, 0, 0], BREAST), [1, 0.3, 0]) },
      wrist: { right: [15, 0], left: [-10, 0] },
      legs: backLegs, hands: { right: 'Fingering (two fingers)', left: 'Cupping breast' }, feet: 'free' } });
    out.push({ name: 'Come hither · lying back', tags: [...FX, 'lying', 'masturbation', 'fingering'], body: {
      hips: backH, spine: [-12, 0, 0], neck: [-15, 0, 0], head: [-25, -10, 0],
      ik: { rightHand: hand('hips', pel(backH, CROTCH_LOW), [-1, 0.5, 0.3]), leftHand: hand('head', [0.08, -0.06, -0.05], [1, 0.4, 0]) },
      wrist: { right: [25, 0] },
      legs: { ...backLegs, leftUpperLeg: [0.6, -0.35, 0.72], rightUpperLeg: [-0.6, -0.35, 0.72] }, hands: { right: 'Come hither (hooked)', left: 'Grasping (gripping fabric)' }, feet: 'free' } });
    // M-legs: thighs pulled up towards the chest and apart, hands behind the knees.
    const mH = [-90, 0, 0];
    out.push({ name: 'Legs spread · M-shape (on back)', tags: [...FX, 'lying', 'spread legs'], body: {
      hips: mH, spine: [-4, 0, 0], head: [-25, 0, 0], legsIn: 'hips',
      legs: { leftUpperLeg: [0.55, 0.3, 0.78], leftLowerLeg: [0.3, -0.7, -0.6], rightUpperLeg: [-0.55, 0.3, 0.78], rightLowerLeg: [-0.3, -0.7, -0.6] },
      ik: { leftHand: hand('leftLowerLeg', [-0.02, -0.06, 0.02], [1, 0, -0.3]), rightHand: hand('rightLowerLeg', [0.02, -0.06, 0.02], [-1, 0, -0.3]) },
      hands: { left: 'Grasping (gripping fabric)', right: 'Grasping (gripping fabric)' }, feet: 'free' } });
    out.push({ name: 'Knees to chest, legs spread', tags: [...FX, 'lying', 'spread legs'], body: {
      hips: [-90, 0, 0], spine: [6, 0, 0], head: [-15, 0, 0], legsIn: 'hips',
      legs: { leftUpperLeg: [0.5, 0.72, 0.48], leftLowerLeg: [0.25, -0.3, 0.92], rightUpperLeg: [-0.5, 0.72, 0.48], rightLowerLeg: [-0.25, -0.3, 0.92] },
      ik: { leftHand: hand('leftLowerLeg', [0.0, -0.04, 0.05], [1, 0.3, 0]), rightHand: hand('rightLowerLeg', [0.0, -0.04, 0.05], [-1, 0.3, 0]) },
      hands: { left: 'Grasping (gripping fabric)', right: 'Grasping (gripping fabric)' }, feet: 'free' } });
    out.push({ name: 'Spread on back · hands spreading', tags: [...FX, 'lying', 'spread legs', 'spreading'], body: {
      hips: backH, spine: [-5, 0, 0], head: [-25, 0, 0],
      legs: { leftUpperLeg: [0.62, -0.3, 0.72], leftLowerLeg: [0.2, -0.6, -0.78], rightUpperLeg: [-0.62, -0.3, 0.72], rightLowerLeg: [-0.2, -0.6, -0.78] },
      ik: { leftHand: hand('hips', pel(backH, [0.06, -0.05, 0.12]), [1, 0.5, 0]), rightHand: hand('hips', pel(backH, [-0.06, -0.05, 0.12]), [-1, 0.5, 0]) },
      wrist: { left: [20, 0], right: [20, 0] },
      hands: { left: 'Spreading (fingers splayed, pressing)', right: 'Spreading (fingers splayed, pressing)' }, feet: 'free' } });
    // Kneeling upright, thighs apart.
    const kH = [-6, 0, 0];
    const kLegs = { leftUpperLeg: [0.35, -1, 0.05], leftLowerLeg: [0.05, -0.05, -1], rightUpperLeg: [-0.35, -1, 0.05], rightLowerLeg: [-0.05, -0.05, -1] };
    out.push({ name: 'Fingering · kneeling', tags: [...FX, 'kneeling', 'masturbation', 'fingering'], body: {
      hips: kH, spine: [-12, 0, 0], neck: [-8, 0, 0], head: [-18, 20, 0],
      ik: { rightHand: hand('hips', pel(kH, CROTCH), [-1, 0, 0.3]), leftHand: hand('spine1', chest(kH, [-12, 0, 0], BREAST), [1, -0.3, 0]) },
      wrist: { right: [15, 0], left: [-10, 0] },
      legs: kLegs, hands: { right: 'Fingering (two fingers)', left: 'Cupping breast' }, feet: 'free' } });
    out.push({ name: 'Kneeling · pressing breasts together', tags: [...FX, 'kneeling', 'exhibition', 'breasts'], body: {
      hips: kH, spine: [4, 0, 0], neck: [5, 0, 0], head: [10, 0, 0],
      ik: { leftHand: hand('spine1', chest(kH, [4, 0, 0], [0.15, -0.1, 0.06]), [1, -0.6, 0]), rightHand: hand('spine1', chest(kH, [4, 0, 0], [-0.15, -0.1, 0.06]), [-1, -0.6, 0]) },
      wrist: { left: [-5, 0], right: [-5, 0] },
      shoulders: { left: [0, 10], right: [0, 10] },
      legs: kLegs, hands: { left: 'Cupping breast', right: 'Cupping breast' }, feet: 'free' } });
    // Standing.
    const wH = [-6, 0, 0];
    out.push({ name: 'Fingering · against a wall', tags: [...FX, 'standing', 'wall', 'masturbation', 'fingering'], body: {
      hips: wH, spine: [-10, 0, 0], neck: [-10, 0, 0], head: [-20, 25, 0],
      ik: { rightHand: hand('hips', pel(wH, CROTCH), [-1, 0, 0.2]), leftHand: hand('spine1', chest(wH, [-10, 0, 0], BREAST), [1, -0.4, 0]) },
      wrist: { right: [15, 0], left: [-10, 0] },
      legs: { leftUpperLeg: [0.18, -1, 0.15], leftLowerLeg: [0.1, -1, -0.1], rightUpperLeg: [-0.2, -1, 0.1], rightLowerLeg: [-0.06, -1, 0] },
      hands: { right: 'Fingering (two fingers)', left: 'Cupping breast' }, support: ['Room', 'Wall', [0, 0, -0.25], 0] } });
    out.push({ name: 'Standing · hand between thighs', tags: [...FX, 'standing', 'masturbation'], body: {
      hips: [8, 0, 0], spine: [6, 0, 0], neck: [6, 0, 0], head: [12, -15, 0],
      ik: { rightHand: hand('hips', pel([8, 0, 0], CROTCH_LOW), [-1, 0, 0.3]), leftHand: hand('spine1', chest([8, 0, 0], [6, 0, 0], mx(BREAST)), [1, -0.5, 0]) },
      wrist: { right: [20, 0], left: [-10, 0] },
      legs: { leftUpperLeg: [-0.02, -1, 0.15], leftLowerLeg: [0.06, -1, -0.12], rightUpperLeg: [0.0, -1, 0.15], rightLowerLeg: [-0.06, -1, -0.12] },
      hands: { right: 'Rubbing (flat fingers)', left: 'Cupping breast' } } });
    const exH = [-12, 0, 0];
    out.push({ name: 'Exhibition · standing, legs apart', tags: [...FX, 'standing', 'exhibition', 'spreading'], body: {
      hips: exH, spine: [-6, 0, 0], head: [10, 0, 0],
      ik: { leftHand: hand('hips', pel(exH, [0.07, -0.06, 0.12]), [1, -0.3, 0]), rightHand: hand('hips', pel(exH, [-0.07, -0.06, 0.12]), [-1, -0.3, 0]) },
      wrist: { left: [20, 0], right: [20, 0] },
      legs: { leftUpperLeg: [0.32, -1, 0.05], leftLowerLeg: [0.12, -1, 0], rightUpperLeg: [-0.32, -1, 0.05], rightLowerLeg: [-0.12, -1, 0] },
      hands: { left: 'Spreading (fingers splayed, pressing)', right: 'Spreading (fingers splayed, pressing)' } } });
    const sqH = [5, 0, 0];
    out.push({ name: 'Exhibition · squat, spreading', tags: [...FX, 'squat', 'exhibition', 'spreading'], body: {
      hips: sqH, spine: [6, 0, 0], head: [-10, 0, 0],
      ik: { leftHand: hand('hips', pel(sqH, [0.07, -0.07, 0.11]), [1, 0, 0.3]), rightHand: hand('hips', pel(sqH, [-0.07, -0.07, 0.11]), [-1, 0, 0.3]) },
      wrist: { left: [25, 0], right: [25, 0] },
      legs: { leftUpperLeg: [0.65, -0.3, 0.7], leftLowerLeg: [0.06, -1, -0.12], rightUpperLeg: [-0.65, -0.3, 0.7], rightLowerLeg: [-0.06, -1, -0.12] },
      hands: { left: 'Spreading (fingers splayed, pressing)', right: 'Spreading (fingers splayed, pressing)' } } });
    // From behind (turned away, so the thumbnail looks at the back).
    const boH = [78, 180, 0];
    out.push({ name: 'Spreading from behind · bent over', tags: [...FX, 'standing', 'from behind', 'spreading'], body: {
      hips: boH, spine: [-20, 0, 0], neck: [-30, 0, 0], head: [-10, -55, 0], legsIn: 'world', armsIn: 'world',
      legs: { leftUpperLeg: [-0.2, -1, -0.05], leftLowerLeg: [-0.06, -1, 0.04], rightUpperLeg: [0.2, -1, -0.05], rightLowerLeg: [0.06, -1, 0.04] },
      ik: { leftHand: hand('hips', pel(boH, BUTT), [-1, 0.5, 0]), rightHand: hand('hips', pel(boH, mx(BUTT)), [1, 0.5, 0]) },
      wrist: { left: [10, 0], right: [10, 0] },
      hands: { left: 'Spreading (fingers splayed, pressing)', right: 'Spreading (fingers splayed, pressing)' }, feet: 'flat' } });
    const cdH = [138, 180, 0];
    out.push({ name: 'Spreading from behind · chest down', tags: [...FX, 'kneeling', 'from behind', 'spreading'], body: {
      hips: cdH, spine: [-8, 0, 0], neck: [-10, 0, 0], head: [0, -70, 0], legsIn: 'world', armsIn: 'world',
      legs: { leftUpperLeg: [-0.22, -1, -0.1], leftLowerLeg: [-0.02, -0.05, 1], rightUpperLeg: [0.22, -1, -0.1], rightLowerLeg: [0.02, -0.05, 1] },
      ik: { leftHand: hand('hips', pel(cdH, BUTT), [-1, 0.5, 0]), rightHand: hand('hips', pel(cdH, mx(BUTT)), [1, 0.5, 0]) },
      wrist: { left: [10, 0], right: [10, 0] },
      hands: { left: 'Spreading (fingers splayed, pressing)', right: 'Spreading (fingers splayed, pressing)' }, feet: 'free' } });
    out.push({ name: 'Presenting from behind · face down', tags: [...FX, 'kneeling', 'from behind'], body: {
      hips: [135, 180, 0], spine: [-15, 0, 0], neck: [-10, 0, 0], head: [0, -60, 0], legsIn: 'world', armsIn: 'world',
      legs: { leftUpperLeg: [-0.28, -1, -0.12], leftLowerLeg: [-0.05, -0.05, 1], rightUpperLeg: [0.28, -1, -0.12], rightLowerLeg: [0.05, -0.05, 1] },
      arms: { leftUpperArm: [-0.45, -0.2, -0.85], leftLowerArm: [0.2, -0.1, -1], rightUpperArm: [0.45, -0.2, -0.85], rightLowerArm: [-0.2, -0.1, -1] },
      hands: { left: 'Grasping (gripping fabric)', right: 'Grasping (gripping fabric)' }, feet: 'free' } });
    const afH = [100, 180, 0];
    out.push({ name: 'All fours · hand between legs', tags: [...FX, 'all fours', 'from behind', 'masturbation'], body: {
      hips: afH, spine: [-20, 0, 0], neck: [-10, 0, 0], head: [-5, -60, 0], legsIn: 'world', armsIn: 'world',
      legs: { leftUpperLeg: [-0.2, -1, 0.05], leftLowerLeg: [-0.02, -0.05, 1], rightUpperLeg: [0.2, -1, 0.05], rightLowerLeg: [0.02, -0.05, 1] },
      arms: { leftUpperArm: [-0.25, -0.75, -0.6], leftLowerArm: [0.05, -0.6, -0.8] },
      ik: { rightHand: hand('hips', pel(afH, CROTCH_LOW), [1, -0.3, 0.3]) },
      wrist: { right: [20, 0] },
      hands: { left: 'Open flat', right: 'Fingering (two fingers)' }, feet: 'free' } });
    // On the side, top leg lifted.
    const sdH = [0, 0, -90];
    out.push({ name: 'Lying on side · leg raised, touching', tags: [...FX, 'lying', 'masturbation', 'fingering'], body: {
      hips: sdH, spine: [-6, 0, 10], neck: [0, 0, -10], head: [-10, 10, -15], legsIn: 'hips',
      legs: { leftUpperLeg: [0.7, 0.15, 0.65], leftLowerLeg: [0.85, -0.45, 0.1], rightUpperLeg: [0, -1, 0.12], rightLowerLeg: [0, -1, -0.1] },
      arms: { rightUpperArm: [-0.7, 0.65, 0.2], rightLowerArm: [0.55, 0.8, 0.15] },
      ik: { leftHand: hand('hips', pel(sdH, CROTCH), [0.2, 1, 0.3]) },
      wrist: { left: [15, 0] },
      hands: { left: 'Fingering (two fingers)', right: 'Relaxed (soft)' }, feet: 'free' } });
    // Prone.
    const prH = [90, 0, 0];
    out.push({ name: 'Lying on stomach · hand underneath', tags: [...FX, 'lying', 'masturbation'], body: {
      hips: prH, spine: [-15, 0, 0], neck: [-10, 0, 0], head: [0, 40, 0],
      legs: { leftUpperLeg: [0.12, -1, 0.05], leftLowerLeg: [0, -1, 0], rightUpperLeg: [-0.12, -1, 0.05], rightLowerLeg: [0, -0.5, -0.85] },
      arms: { leftUpperArm: [0.6, 0.6, 0.5], leftLowerArm: [-0.4, 0.8, 0.45] },
      ik: { rightHand: hand('hips', pel(prH, CROTCH_LOW), [-1, 0.2, 0]) },
      wrist: { right: [20, 0] },
      hands: { left: 'Relaxed (soft)', right: 'Rubbing (flat fingers)' }, feet: 'free' } });
    // Sitting.
    const sfH = [-28, 0, 0];
    out.push({ name: 'Fingering · sitting on the floor', tags: [...FX, 'sitting', 'masturbation', 'fingering'], body: {
      hips: sfH, spine: [-6, 0, 0], neck: [-6, 0, 0], head: [-15, 10, 0], legsIn: 'world',
      legs: { leftUpperLeg: [0.6, 0.15, 0.8], leftLowerLeg: [0.25, -0.9, 0.35], rightUpperLeg: [-0.6, 0.15, 0.8], rightLowerLeg: [-0.25, -0.9, 0.35] },
      arms: { leftUpperArm: [0.3, -0.75, -0.6], leftLowerArm: [0.1, -0.8, -0.55] }, armsIn: 'world',
      ik: { rightHand: hand('hips', pel(sfH, CROTCH), [-1, 0.2, 0.2]) },
      wrist: { right: [15, 0] },
      hands: { left: 'Open flat', right: 'Fingering (two fingers)' }, feet: 'free' } });
    const chH = [-22, 0, 0];
    out.push({ name: 'Chair edge · legs spread, touching', tags: [...FX, 'chair', 'sitting', 'masturbation', 'fingering'], body: {
      hips: chH, spine: [-10, 0, 0], neck: [-8, 0, 0], head: [-15, 0, 0],
      legs: { leftUpperLeg: [0.6, -0.05, 0.8], leftLowerLeg: [0.15, -1, 0.1], rightUpperLeg: [-0.6, -0.05, 0.8], rightLowerLeg: [-0.15, -1, 0.1] },
      arms: { leftUpperArm: [0.35, -0.95, -0.25], leftLowerArm: [0.1, -1, -0.1] },
      ik: { rightHand: hand('hips', pel(chH, CROTCH), [-1, 0.2, 0.2]) },
      wrist: { right: [15, 0] },
      hands: { left: 'Grasping (gripping fabric)', right: 'Fingering (two fingers)' }, ground: 0.54, support: ['Furniture', 'Chair', [0, 0, -0.2], 0] } });
    const tbH = [84, 180, 0];
    out.push({ name: 'Bent over a table · spreading', tags: [...FX, 'table', 'from behind', 'spreading'], body: {
      hips: tbH, spine: [-2, 0, 0], neck: [-25, 0, 0], head: [-15, -50, 0], legsIn: 'world',
      legs: { leftUpperLeg: [-0.18, -1, -0.12], leftLowerLeg: [-0.05, -1, 0], rightUpperLeg: [0.18, -1, -0.12], rightLowerLeg: [0.05, -1, 0] },
      ik: { leftHand: hand('hips', pel(tbH, BUTT), [-1, 0.5, 0]), rightHand: hand('hips', pel(tbH, mx(BUTT)), [1, 0.5, 0]) },
      wrist: { left: [10, 0], right: [10, 0] },
      hands: { left: 'Spreading (fingers splayed, pressing)', right: 'Spreading (fingers splayed, pressing)' }, feet: 'flat', support: ['Furniture', 'Table', [0, 0, -0.5], 0] } });
    return out;
  })(),

  // =================================================================== explicit (male)
  ...(() => {
    const out = [];
    const stH = [-6, 0, 0];
    out.push({ name: 'Stroking · standing', tags: [...MX, 'standing', 'masturbation', 'stroking'], body: {
      hips: stH, spine: [-4, 0, 0], neck: [5, 0, 0], head: [15, 0, 0],
      ik: { rightHand: hand('hips', pel(stH, SHAFT), [-1, 0, -0.3]), leftHand: hand('hips', [0.17, 0.05, 0.02], [1, 0, -0.5]) },
      wrist: { right: [10, 0] },
      legs: { leftUpperLeg: [0.16, -1, 0.05], leftLowerLeg: [0.04, -1, 0], rightUpperLeg: [-0.16, -1, 0.05], rightLowerLeg: [-0.04, -1, 0] },
      hands: { right: 'Stroking grip', left: 'Relaxed' } } });
    out.push({ name: 'Stroking · head back', tags: [...MX, 'standing', 'masturbation', 'stroking'], body: {
      hips: [-10, 0, 0], spine: [-12, 0, 0], neck: [-12, 0, 0], head: [-20, 0, 0],
      ik: { rightHand: hand('hips', pel([-10, 0, 0], SHAFT), [-1, 0, -0.3]), leftHand: hand('head', [0.05, 0.08, -0.08], [1, 0.4, 0]) },
      wrist: { right: [10, 0] },
      legs: { leftUpperLeg: [0.14, -1, 0.1], leftLowerLeg: [0.04, -1, -0.04], rightUpperLeg: [-0.14, -1, 0.1], rightLowerLeg: [-0.04, -1, -0.04] },
      hands: { right: 'Stroking grip', left: 'Relaxed' } } });
    const chH = [-18, 0, 0];
    out.push({ name: 'Stroking · sitting on a chair', tags: [...MX, 'chair', 'sitting', 'masturbation', 'stroking'], body: {
      hips: chH, spine: [-12, 0, 0], neck: [5, 0, 0], head: [10, 0, 0],
      legs: { leftUpperLeg: [0.55, 0, 0.85], leftLowerLeg: [0.15, -1, 0.1], rightUpperLeg: [-0.55, 0, 0.85], rightLowerLeg: [-0.15, -1, 0.1] },
      arms: { leftUpperArm: [0.35, -1, -0.1], leftLowerArm: [0.1, -1, 0.1] },
      ik: { rightHand: hand('hips', pel(chH, SHAFT), [-1, 0.2, -0.3]) },
      wrist: { right: [10, 0] },
      hands: { left: 'Relaxed', right: 'Stroking grip' }, ground: 0.56, support: ['Furniture', 'Chair', [0, 0, -0.1], 0] } });
    const lbH = [-90, 0, 0];
    out.push({ name: 'Stroking · lying back', tags: [...MX, 'lying', 'masturbation', 'stroking'], body: {
      hips: lbH, spine: [-5, 0, 0], head: [-15, 0, 0],
      legs: { leftUpperLeg: [0.45, -0.5, 0.7], leftLowerLeg: [0.15, -0.6, -0.78], rightUpperLeg: [-0.45, -0.5, 0.7], rightLowerLeg: [-0.15, -0.6, -0.78] },
      ik: { rightHand: hand('hips', pel(lbH, SHAFT), [-1, 0.5, 0]), leftHand: hand('head', [0.05, -0.08, -0.06], [1, 0.2, -0.3]) },
      wrist: { right: [10, 0] },
      hands: { right: 'Stroking grip', left: 'Relaxed' }, feet: 'free' } });
    const knH = [-4, 0, 0];
    out.push({ name: 'Stroking · kneeling', tags: [...MX, 'kneeling', 'masturbation', 'stroking'], body: {
      hips: knH, spine: [-6, 0, 0], head: [8, 0, 0],
      legs: { leftUpperLeg: [0.35, -1, 0.05], leftLowerLeg: [0.05, -0.05, -1], rightUpperLeg: [-0.35, -1, 0.05], rightLowerLeg: [-0.05, -0.05, -1] },
      ik: { rightHand: hand('hips', pel(knH, SHAFT), [-1, 0, -0.3]), leftHand: hand('leftUpperLeg', [0.03, -0.15, 0.08], [1, 0, -0.4]) },
      wrist: { right: [10, 0], left: [0, 0] },
      hands: { right: 'Stroking grip', left: 'Open fingers together' }, feet: 'free' } });
    const sqH = [12, 0, 0];
    out.push({ name: 'Stroking · squatting', tags: [...MX, 'squat', 'masturbation', 'stroking'], body: {
      hips: sqH, spine: [8, 0, 0], head: [-8, 0, 0],
      legs: { leftUpperLeg: [0.65, -0.3, 0.7], leftLowerLeg: [0.08, -1, -0.12], rightUpperLeg: [-0.65, -0.3, 0.7], rightLowerLeg: [-0.08, -1, -0.12] },
      ik: { rightHand: hand('hips', pel(sqH, SHAFT), [-1, 0, 0]), leftHand: hand('leftLowerLeg', [0, 0.07, 0.05], [0.5, 0, 0.5]) },
      wrist: { right: [10, 0] },
      hands: { right: 'Stroking grip', left: 'Relaxed' } } });
    const wlH = [-8, 0, 0];
    out.push({ name: 'Stroking · leaning on a wall', tags: [...MX, 'standing', 'wall', 'masturbation', 'stroking'], body: {
      hips: wlH, spine: [-8, 0, 0], neck: [-10, 0, 0], head: [-18, 15, 0],
      ik: { rightHand: hand('hips', pel(wlH, SHAFT), [-1, 0, -0.3]) },
      arms: { leftUpperArm: [0.6, -0.75, -0.25], leftLowerArm: [0.2, -0.95, -0.1] },
      wrist: { right: [10, 0] },
      legs: { leftUpperLeg: [0.2, -1, 0.18], leftLowerLeg: [0.08, -1, -0.08], rightUpperLeg: [-0.18, -1, 0.1], rightLowerLeg: [-0.05, -1, 0] },
      hands: { right: 'Stroking grip', left: 'Open flat' }, support: ['Room', 'Wall', [0, 0, -0.25], 0] } });
    out.push({ name: 'Exhibition · lying, legs spread (male)', tags: [...MX, 'lying', 'exhibition', 'spread legs'], body: {
      hips: lbH, spine: [-5, 0, 0], head: [-5, 0, 0],
      legs: { leftUpperLeg: [0.62, -0.35, 0.7], leftLowerLeg: [0.2, -0.65, -0.72], rightUpperLeg: [-0.62, -0.35, 0.7], rightLowerLeg: [-0.2, -0.65, -0.72] },
      ik: { leftHand: hand('head', [0.05, -0.08, -0.06], [1, 0.2, -0.3]), rightHand: hand('head', [-0.05, -0.08, -0.06], [-1, 0.2, -0.3]) },
      hands: { left: 'Relaxed', right: 'Relaxed' }, feet: 'free' } });
    out.push({ name: 'Reclining on elbows · exposed (male)', tags: [...MX, 'sitting', 'exhibition', 'spread legs'], body: {
      hips: [-55, 0, 0], spine: [-15, 0, 0], neck: [15, 0, 0], head: [20, 0, 0], legsIn: 'world', armsIn: 'world',
      legs: { leftUpperLeg: [0.5, 0.35, 0.8], leftLowerLeg: [0.15, -0.95, 0.25], rightUpperLeg: [-0.5, 0.35, 0.8], rightLowerLeg: [-0.15, -0.95, 0.25] },
      arms: { leftUpperArm: [0.3, -0.85, -0.45], leftLowerArm: [0.05, -0.2, -1], rightUpperArm: [-0.3, -0.85, -0.45], rightLowerArm: [-0.05, -0.2, -1] },
      hands: { left: 'Open flat', right: 'Open flat' }, feet: 'free' } });
    out.push({ name: 'Presenting from behind (male)', tags: [...MX, 'kneeling', 'from behind'], body: {
      hips: [120, 180, 0], spine: [-30, 0, 0], neck: [-10, 0, 0], head: [0, -60, 0], legsIn: 'world', armsIn: 'world',
      legs: { leftUpperLeg: [-0.25, -1, -0.1], leftLowerLeg: [-0.04, -0.05, 1], rightUpperLeg: [0.25, -1, -0.1], rightLowerLeg: [0.04, -0.05, 1] },
      arms: { leftUpperArm: [-0.45, -0.3, -0.85], leftLowerArm: [0.15, -0.15, -1], rightUpperArm: [0.45, -0.3, -0.85], rightLowerArm: [-0.15, -0.15, -1] },
      hands: { left: 'Open flat', right: 'Open flat' }, feet: 'free' } });
    const mbH = [135, 180, 0];
    out.push({ name: 'Spreading from behind (male)', tags: [...MX, 'kneeling', 'from behind', 'spreading'], body: {
      hips: mbH, spine: [-8, 0, 0], neck: [-10, 0, 0], head: [0, -65, 0], legsIn: 'world',
      legs: { leftUpperLeg: [-0.22, -1, -0.1], leftLowerLeg: [-0.03, -0.05, 1], rightUpperLeg: [0.22, -1, -0.1], rightLowerLeg: [0.03, -0.05, 1] },
      ik: { leftHand: hand('hips', pel(mbH, BUTT), [-1, 0.5, 0]), rightHand: hand('hips', pel(mbH, mx(BUTT)), [1, 0.5, 0]) },
      wrist: { left: [10, 0], right: [10, 0] },
      hands: { left: 'Spreading (fingers splayed, pressing)', right: 'Spreading (fingers splayed, pressing)' }, feet: 'free' } });
    return out;
  })(),
]);
