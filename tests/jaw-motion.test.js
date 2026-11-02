import test from 'node:test';
import assert from 'node:assert/strict';
import { collectMandibularMeshes, isMandibularRecord } from '../src/jaw-motion.js';

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
