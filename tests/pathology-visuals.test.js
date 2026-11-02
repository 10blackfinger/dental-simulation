import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine, Scene, MeshBuilder } from '@babylonjs/core';
import { createPathologyRenderer } from '../src/pathology-visuals.js';
import { DENTAL_PATHOLOGIES } from '../src/pathology-catalog.js';

function createFixture() {
  const engine = new NullEngine({ renderWidth: 320, renderHeight: 240 });
  const scene = new Scene(engine);
  const tooth = MeshBuilder.CreateSphere('FMA55681', { diameter: 1, segments: 32 }, scene);
  tooth.scaling.set(0.6, 1.9, 0.55);
  const mandible = MeshBuilder.CreateSphere('FMA52748', {
    diameter: 2.1, segments: 32
  }, scene);
  const maxilla = MeshBuilder.CreateSphere('FMA53649', {
    diameter: 1.5, segments: 32
  }, scene);
  maxilla.position.set(0, 0.02, 0);
  const upperGum = MeshBuilder.CreateSphere('FMA59763', {
    diameter: 1, segments: 32
  }, scene);
  upperGum.scaling.set(1.25, 0.25, 0.12);
  upperGum.position.set(0, 0.3, 0.19);
  const lowerGum = MeshBuilder.CreateSphere('FMA59764', {
    diameter: 1, segments: 32
  }, scene);
  lowerGum.scaling.set(1.25, 0.25, 0.12);
  lowerGum.position.set(0, -0.3, 0.19);

  const records = {
    FMA55681: {
      layer: 'teeth', arch: 'maxillary', side: 'right', position: 1, type: 'central incisor'
    },
    FMA52748: { layer: 'mandible', side: 'midline' },
    FMA53649: { layer: 'maxilla', side: 'midline' },
    FMA59763: { layer: 'gingiva', side: 'midline' },
    FMA59764: { layer: 'gingiva', side: 'midline' }
  };
  const catalog = [
    { sourceId: 'FMA55681', arch: 'maxillary', side: 'right', position: 1, label: 'Upper right central incisor' }
  ];
  const renderer = createPathologyRenderer(scene);
  const context = { meshes: [tooth, mandible, maxilla, upperGum, lowerGum], records, catalog };
  return { engine, scene, renderer, context, tooth, mandible, maxilla, upperGum, lowerGum };
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

test('jaw cysts deform the supporting bone mesh and restore it on clear', () => {
  const f = createFixture();
  const original = Float32Array.from(f.mandible.getVerticesData('position'));
  const result = f.renderer.render([
    state('3', 'dentigerous-cyst', 'dentigerous-cyst', 'bone')
  ], f.context);
  assert.equal(result.effects, 1, 'the jaw lesion should be represented by one pathology case');
  const affected = f.mandible.getVerticesData('position');
  assert.ok(affected.some((value, index) => Math.abs(value - original[index]) > 1e-7),
    'a cyst should remodel the actual mandibular mesh');
  f.renderer.clear();
  assert.deepEqual(Array.from(f.mandible.getVerticesData('position')), Array.from(original));
  f.engine.dispose();
});

test('oral mucosal lesions sculpt the selected soft-tissue proxy surface', () => {
  const f = createFixture();
  const original = Float32Array.from(f.upperGum.getVerticesData('position'));
  const result = f.renderer.render([
    state('4', 'recurrent-aphthous-ulcer', 'aphthous', 'oral-soft')
  ], f.context);
  assert.equal(result.effects, 1);
  const affected = f.upperGum.getVerticesData('position');
  assert.ok(affected.some((value, index) => Math.abs(value - original[index]) > 1e-7),
    'the ulcer crater should deform the gingival proxy mesh');
  f.renderer.clear();
  assert.deepEqual(Array.from(f.upperGum.getVerticesData('position')), Array.from(original));
  f.engine.dispose();
});

test('caries deforms the real tooth surface and clearing restores its original vertices', () => {
  const f = createFixture();
  const original = Float32Array.from(f.tooth.getVerticesData('position'));
  f.renderer.render([
    state('5', 'deep-caries', 'deep-caries', 'tooth', { severity: 4 })
  ], f.context);
  const damaged = f.tooth.getVerticesData('position');
  assert.ok(
    damaged.some((value, index) => Math.abs(value - original[index]) > 1e-7),
    'deep caries should modify the actual tooth vertex positions'
  );

  f.renderer.clear();
  const restored = f.tooth.getVerticesData('position');
  assert.deepEqual(Array.from(restored), Array.from(original));
  f.engine.dispose();
});

test('developmental absence hides the selected tooth and restores it on clear', () => {
  const f = createFixture();
  assert.equal(f.tooth.isVisible, true);
  f.renderer.render([
    state('6', 'hypodontia', 'missing-tooth', 'tooth')
  ], f.context);
  assert.equal(f.tooth.isVisible, false);
  f.renderer.clear();
  assert.equal(f.tooth.isVisible, true);
  f.engine.dispose();
});


test('periodontitis changes gingiva and adjacent alveolar bone, not only tooth color', () => {
  const f = createFixture();
  const gumBefore = Float32Array.from(f.upperGum.getVerticesData('position'));
  const boneBefore = Float32Array.from(f.maxilla.getVerticesData('position'));
  f.renderer.render([
    state('7', 'periodontitis-stage-iii', 'periodontitis', 'tooth')
  ], f.context);
  const gumAfter = f.upperGum.getVerticesData('position');
  const boneAfter = f.maxilla.getVerticesData('position');
  assert.ok(gumAfter.some((value, index) => Math.abs(value - gumBefore[index]) > 1e-7),
    'periodontal inflammation should remodel the gingival tissue');
  assert.ok(boneAfter.some((value, index) => Math.abs(value - boneBefore[index]) > 1e-7),
    'periodontitis should remove support from the adjacent alveolar bone');
  f.renderer.clear();
  assert.deepEqual(Array.from(f.upperGum.getVerticesData('position')), Array.from(gumBefore));
  assert.deepEqual(Array.from(f.maxilla.getVerticesData('position')), Array.from(boneBefore));
  f.engine.dispose();
});

test('developmental tooth size changes stay centered in the socket', () => {
  const f = createFixture();
  f.tooth.position.set(1.2, 0.25, -0.15);
  f.tooth.computeWorldMatrix(true);
  const beforeBounds = f.tooth.getBoundingInfo().boundingBox;
  const beforeCenter = beforeBounds.centerWorld.clone();
  const beforeWidth = beforeBounds.extendSizeWorld.x * 2;
  f.renderer.render([
    state('8', 'microdontia-peg-lateral', 'microdontia', 'tooth')
  ], f.context);
  f.tooth.computeWorldMatrix(true);
  const afterBounds = f.tooth.getBoundingInfo().boundingBox;
  const afterCenter = afterBounds.centerWorld;
  const afterWidth = afterBounds.extendSizeWorld.x * 2;
  assert.ok(Math.abs(afterCenter.x - beforeCenter.x) < 0.015);
  assert.ok(Math.abs(afterCenter.y - beforeCenter.y) < 0.015);
  assert.ok(Math.abs(afterCenter.z - beforeCenter.z) < 0.015);
  assert.ok(afterWidth < beforeWidth * 0.9, 'microdontia should shrink the tooth around its own centroid');
  f.renderer.clear();
  f.engine.dispose();
});


test('all 108 catalogue diagnoses execute a dedicated visual route without generic fallback', () => {
  const f = createFixture();
  for (const condition of DENTAL_PATHOLOGIES) {
    const state = {
      caseId: 'catalog-' + condition.id,
      condition,
      stage: condition.stages[2],
      stageIndex: 2,
      severity: 2,
      toothSourceId: condition.target === 'tooth' ? 'FMA55681' : null,
      targetValue: condition.target === 'bone' ? 'mandible' :
        condition.target === 'oral-soft' ? 'gum-upper' : null
    };
    const result = f.renderer.render([state], f.context);
    assert.deepEqual(result.unhandledVisuals, [], condition.id + ' should not use a generic fallback visual');
    f.renderer.clear();
  }
  f.engine.dispose();
});
