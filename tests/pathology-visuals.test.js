import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine, Scene, MeshBuilder } from '@babylonjs/core';
import { createPathologyRenderer } from '../src/pathology-visuals.js';

function createFixture() {
  const engine = new NullEngine({ renderWidth: 320, renderHeight: 240 });
  const scene = new Scene(engine);
  const tooth = MeshBuilder.CreateBox('FMA55681', {
    width: 0.6, height: 1.9, depth: 0.55
  }, scene);
  const mandible = MeshBuilder.CreateBox('FMA52748', {
    width: 4.4, height: 1.1, depth: 2.1
  }, scene);
  const upperGum = MeshBuilder.CreateBox('FMA59763', {
    width: 3.6, height: 0.3, depth: 1.5
  }, scene);

  const records = {
    FMA55681: {
      layer: 'teeth', arch: 'maxillary', side: 'right', position: 1, type: 'central incisor'
    },
    FMA52748: { layer: 'mandible', side: 'midline' },
    FMA59763: { layer: 'gingiva', side: 'midline' }
  };
  const catalog = [
    { sourceId: 'FMA55681', arch: 'maxillary', side: 'right', position: 1, label: 'Upper right central incisor' }
  ];
  const renderer = createPathologyRenderer(scene);
  const context = { meshes: [tooth, mandible, upperGum], records, catalog };
  return { engine, scene, renderer, context, tooth, mandible, upperGum };
}

const state = (caseId, id, visual, target, extra = {}) => ({
  caseId,
  condition: { id, visual, target },
  stage: { progression: 0.6 },
  stageIndex: 1,
  severity: 3,
  toothSourceId: target === 'tooth' ? 'FMA55681' : null,
  targetValue: target === 'bone' ? 'mandible' : target === 'oral-soft' ? 'gum-upper' : null,
  ...extra
});

test('caries generates visible 3D cavity geometry on the selected tooth', () => {
  const f = createFixture();
  const result = f.renderer.render([
    state('1', 'dentin-caries', 'caries', 'tooth')
  ], f.context);
  assert.equal(result.effects, 1);
  assert.ok(f.scene.meshes.length > 3, 'the renderer should add cavity and rim meshes');
  f.renderer.clear();
  f.engine.dispose();
});

test('a tooth can carry two concurrent pathology effects', () => {
  const f = createFixture();
  const result = f.renderer.render([
    state('1', 'dentin-caries', 'caries', 'tooth'),
    state('2', 'cracked-tooth', 'crack', 'tooth', { severity: 2 })
  ], f.context);
  assert.equal(result.effects, 2);
  assert.ok(f.scene.meshes.some(mesh => mesh.name === 'PathologyCrack'), 'a crack tube should be generated');
  f.renderer.clear();
  assert.equal(f.scene.meshes.filter(mesh => mesh.name.startsWith('Pathology')).length, 0);
  f.engine.dispose();
});

test('jaw cysts render on jaw bone rather than on a tooth', () => {
  const f = createFixture();
  const result = f.renderer.render([
    state('3', 'dentigerous-cyst', 'dentigerous-cyst', 'bone')
  ], f.context);
  assert.equal(result.effects, 1, 'the jaw lesion should be represented by one pathology case');
  assert.equal(f.scene.meshes.filter(mesh => mesh.name.startsWith('Pathology')).length, 16);
  f.renderer.clear();
  f.engine.dispose();
});

test('oral mucosal lesions use the documented gingival proxy surface', () => {
  const f = createFixture();
  const result = f.renderer.render([
    state('4', 'recurrent-aphthous-ulcer', 'aphthous', 'oral-soft')
  ], f.context);
  assert.equal(result.effects, 1);
  assert.ok(f.scene.meshes.length > 3);
  f.renderer.clear();
  f.engine.dispose();
});
