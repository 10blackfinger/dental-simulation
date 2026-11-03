import test from 'node:test';
import assert from 'node:assert/strict';
import { collectMandibularMeshes, estimateClosedJawCorrection, isMandibularRecord } from '../src/jaw-motion.js';

const structures = {
  'tooth-lower': { layer: 'teeth', arch: 'mandibular' },
  'tooth-upper': { layer: 'teeth', arch: 'maxillary' },
  'enamel-lower': { layer: 'enamel', tooth: 'tooth-lower' },
  'pulp-lower': { layer: 'pulp', tooth: 'tooth-lower' },
  'pdl-lower': { layer: 'pdl', tooth: 'tooth-lower' },
  'lamina-lower': { layer: 'lamina', tooth: 'tooth-lower' },
  'crown-lower': { layer: 'prosthetic', tooth: 'tooth-lower' },
  'enamel-upper': { layer: 'enamel', tooth: 'tooth-upper' },
  'FMA52748': { layer: 'mandible' },
  'FMA52748M': { layer: 'ramus' },
  'FMA59764': { layer: 'gingiva' },
  'FMA53243': { layer: 'nerves' }
};

const meshes = Object.keys(structures).map(name => ({ name }));
const lowerNerves = new Set(['FMA53243']);

test('a structure follows the mandible through its host tooth reference', () => {
  assert.equal(isMandibularRecord(structures['tooth-lower'], structures), true);
  assert.equal(isMandibularRecord(structures['enamel-lower'], structures), true);
  assert.equal(isMandibularRecord(structures['pulp-lower'], structures), true);
  assert.equal(isMandibularRecord(structures['crown-lower'], structures), true);
  assert.equal(isMandibularRecord(structures['enamel-upper'], structures), false);
});

test('the mandibular movement set includes lower teeth and every tooth-attached layer', () => {
  const names = collectMandibularMeshes(meshes, structures, lowerNerves).map(mesh => mesh.name);
  for (const expected of [
    'tooth-lower', 'enamel-lower', 'pulp-lower', 'pdl-lower',
    'lamina-lower', 'crown-lower', 'FMA52748', 'FMA52748M',
    'FMA59764', 'FMA53243'
  ]) {
    assert.ok(names.includes(expected), expected + ' should follow the mandible');
  }
  assert.ok(!names.includes('tooth-upper'), 'upper tooth must remain stationary');
  assert.ok(!names.includes('enamel-upper'), 'upper enamel must remain stationary');
});


test('closed-jaw calibration removes a small scan-acquisition gap at the incisors', () => {
  const hinge = { x: 0, y: 0, z: -1 };
  const pairs = Array.from({ length: 6 }, (_, index) => ({
    upper: { x: index * 0.02, y: 0, z: 0.8 + index * 0.03 },
    lower: { x: index * 0.02, y: -0.2, z: 0.8 + index * 0.03 }
  }));
  const result = estimateClosedJawCorrection(pairs, hinge);
  assert.equal(result.pairCount, 6);
  assert.ok(result.angleRadians < 0, 'an anterior arch on +Z closes with a negative X correction');
  assert.ok(result.residualGap <= 0.004, 'the calibrated occlusal gap should be reduced to contact clearance');
  assert.ok(result.initialGap > result.residualGap);
});

test('closed-jaw calibration does not move a scan that is already in occlusion', () => {
  const result = estimateClosedJawCorrection([
    { upper: { x: 0, y: 0, z: 0.8 }, lower: { x: 0, y: -0.001, z: 0.8 } },
    { upper: { x: 0.1, y: 0, z: 0.7 }, lower: { x: 0.1, y: -0.001, z: 0.7 } }
  ], { x: 0, y: 0, z: -1 });
  assert.equal(result.angleRadians, 0);
  assert.equal(result.calibrated, true);
});

test('closed-jaw calibration finds the opposite sign when the anterior arch is on -Z', () => {
  const result = estimateClosedJawCorrection([
    { upper: { x: 0, y: 0, z: -0.8 }, lower: { x: 0, y: -0.2, z: -0.8 } },
    { upper: { x: 0.1, y: 0, z: -0.7 }, lower: { x: 0.1, y: -0.2, z: -0.7 } }
  ], { x: 0, y: 0, z: 1 });
  assert.ok(result.angleRadians > 0, 'an anterior arch on -Z closes with a positive X correction');
  assert.ok(result.residualGap <= 0.004);
});
