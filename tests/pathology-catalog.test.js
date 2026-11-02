import test from 'node:test';
import assert from 'node:assert/strict';
import { DENTAL_PATHOLOGIES, PATHOLOGY_CATEGORIES } from '../src/pathology-catalog.js';

test('the catalogue exports 108 complete diagnoses across the eight supported groups', () => {
  assert.equal(PATHOLOGY_CATEGORIES.length, 8);
  assert.equal(DENTAL_PATHOLOGIES.length, 108);
  const ids = DENTAL_PATHOLOGIES.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length, 'diagnosis IDs must be unique');
  const categoryIds = new Set(PATHOLOGY_CATEGORIES.map(item => item.id));
  for (const condition of DENTAL_PATHOLOGIES) {
    assert.ok(condition.id, 'every diagnosis has a stable ID');
    assert.ok(condition.name, condition.id + ' has a name');
    assert.ok(categoryIds.has(condition.category), condition.id + ' references a known category');
    assert.ok(condition.summary, condition.id + ' has an explanation');
    assert.ok(condition.symptoms, condition.id + ' has symptom information');
    assert.ok(condition.signs, condition.id + ' has clinical signs');
    assert.ok(condition.radiographic, condition.id + ' has radiographic context');
    assert.ok(Array.isArray(condition.layers) && condition.layers.length > 0, condition.id + ' has affected tissue layers');
    assert.equal(condition.stages.length, 3, condition.id + ' has three illustrative progression stages');
    for (const stage of condition.stages) {
      assert.ok(stage.id && stage.name && stage.description, condition.id + ' has a complete stage description');
      assert.ok(Number.isFinite(stage.progression), condition.id + ' has a numeric stage progression');
    }
    assert.ok(['tooth', 'bone', 'oral-soft'].includes(condition.target), condition.id + ' has a supported target');
  }
});

test('representative diagnoses from every new clinical area are available', () => {
  const ids = new Set(DENTAL_PATHOLOGIES.map(item => item.id));
  for (const id of [
    'external-cervical-resorption',
    'replacement-resorption',
    'endo-periodontal-lesion',
    'necrotizing-periodontitis',
    'peri-implantitis',
    'hypodontia',
    'impacted-tooth',
    'fibrous-dysplasia',
    'odontogenic-myxoma'
  ]) {
    assert.ok(ids.has(id), id + ' is included in the expanded catalogue');
  }
});
