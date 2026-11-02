import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3
} from '@babylonjs/core';

const SOURCE = {
  upperGum: 'FMA59763',
  lowerGum: 'FMA59764',
  palate: 'FMA53649',
  maxilla: 'FMA53649',
  mandible: 'FMA52748'
};

const PALETTE = {
  chalk: '#e9e6d5',
  white: '#f4eee0',
  candidiasisWhite: '#f4eee0',
  leukoplakiaWhite: '#ece7d9',
  white: '#f6f1dc',
  cariesRim: '#916044',
  cariesCore: '#241915',
  dentin: '#bd9664',
  rootCaries: '#78523b',
  plaque: '#d5c58b',
  calculus: '#d6b36d',
  gingiva: '#c84f59',
  gingivaDark: '#762d3a',
  ulcer: '#e7c6a1',
  pus: '#f1a44e',
  abscess: '#bb3d48',
  apical: '#8c4c45',
  boneLoss: '#806c56',
  boneDensity: '#eee1c1',
  pulp: '#d34c56',
  necrosis: '#552b36',
  enamelDefect: '#fff4c8',
  wear: '#b58b5a',
  hypersensitivity: '#8bd1e4',
  crack: '#261e1b',
  fracture: '#3b2b29',
  mucosa: '#c84754',
  candidiasis: '#f4eee0',
  leukoplakia: '#ece7d9',
  cancer: '#8d2638',
  herpes: '#efad9c',
  boneCyst: '#e3c7a0',
  boneTumor: '#8f5c58',
  alveolarBone: '#a89479',
  polyp: '#d94f64'
};

export function createPathologyRenderer(scene) {
  const materials = {};
  const effectRoots = [];
  const originalMaterials = new Map();
  const originalTransforms = new Map();
  const tintMaterials = new Set();

  function material(key, alpha = 1, emissive = 0) {
    const cacheKey = key + ':' + alpha + ':' + emissive;
    if (materials[cacheKey]) return materials[cacheKey];
    const hex = PALETTE[key] || key;
    const result = new StandardMaterial('Pathology_' + cacheKey.replace(/[^a-z0-9]/gi, '_'), scene);
    result.diffuseColor = Color3.FromHexString(hex);
    result.specularColor = new Color3(0.18, 0.14, 0.12);
    result.specularPower = 28;
    result.alpha = alpha;
    result.backFaceCulling = false;
    if (emissive) result.emissiveColor = Color3.FromHexString(hex).scale(emissive);
    materials[cacheKey] = result;
    return result;
  }

  function setTint(mesh, colorKey, intensity = 1) {
    if (!mesh?.material || typeof mesh.material.clone !== 'function') return;
    if (!originalMaterials.has(mesh)) originalMaterials.set(mesh, mesh.material);
    const base = originalMaterials.get(mesh);
    const clone = base.clone('PathologyTint_' + mesh.name + '_' + colorKey + '_' + effectRoots.length);
    if (!clone) return;
    const color = Color3.FromHexString(PALETTE[colorKey] || colorKey);
    if ('diffuseColor' in clone && clone.diffuseColor) clone.diffuseColor = Color3.Lerp(clone.diffuseColor, color, intensity);
    if ('albedoColor' in clone && clone.albedoColor) clone.albedoColor = Color3.Lerp(clone.albedoColor, color, intensity);
    if ('emissiveColor' in clone && intensity > 0.3) clone.emissiveColor = color.scale(0.08 * intensity);
    mesh.material = clone;
    tintMaterials.add(clone);
  }

  function resetVisuals() {
    for (const root of effectRoots.splice(0)) root.dispose(false, false);
    for (const [mesh, original] of originalMaterials) {
      const current = mesh.material;
      mesh.material = original;
      if (current && current !== original) current.dispose(false, false);
    }
    originalMaterials.clear();
    for (const tint of tintMaterials) tint.dispose(false, false);
    tintMaterials.clear();
    for (const [mesh, transform] of originalTransforms) {
      mesh.position.copyFrom(transform.position);
      mesh.rotation.copyFrom(transform.rotation);
      mesh.scaling.copyFrom(transform.scaling);
    }
    originalTransforms.clear();
  }

  function getBounds(mesh) {
    if (!mesh?.getBoundingInfo || !mesh.getTotalVertices?.()) return null;
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    const min = box.minimum.clone();
    const max = box.maximum.clone();
    const extent = max.subtract(min);
    return {
      min, max, extent,
      center: min.add(max).scale(0.5)
    };
  }

  function sourceMesh(meshes, records, sourceId, layer) {
    return meshes.find(mesh => {
      const record = records[mesh.name];
      return mesh.name === sourceId && record?.layer === layer;
    }) || null;
  }

  function toothParts(meshes, records, sourceId) {
    return meshes.filter(mesh => {
      const record = records[mesh.name];
      return mesh.name === sourceId || record?.tooth === sourceId;
    });
  }

  function makeRoot(anchor, name, state) {
    if (!anchor) return null;
    const root = new TransformNode(name, scene);
    root.parent = anchor;
    root.metadata = {
      pathologyId: state.condition.id,
      targetTooth: state.toothSourceId || null,
      stageIndex: state.stageIndex,
      severity: state.severity
    };
    effectRoots.push(root);
    return root;
  }

  function surfaceFrame(mesh, tooth, surface = 'buccal') {
    const bounds = getBounds(mesh);
    if (!bounds) return null;
    const { min, max, extent, center } = bounds;
    const arch = tooth?.arch || 'maxillary';
    const side = tooth?.side || 'right';
    const position = Number(tooth?.position || 1);
    const crownSign = arch === 'maxillary' ? -1 : 1;
    const rootSign = -crownSign;
    const normal = new Vector3(0, 0, 0);
    const point = center.clone();

    if (surface === 'occlusal' || surface === 'incisal') {
      normal.y = crownSign;
      point.y = crownSign < 0 ? min.y + extent.y * 0.025 : max.y - extent.y * 0.025;
    } else if (surface === 'apical') {
      normal.y = rootSign;
      point.y = rootSign > 0 ? max.y - extent.y * 0.02 : min.y + extent.y * 0.02;
    } else if (surface === 'lingual') {
      if (position >= 4) normal.x = side === 'right' ? 1 : -1;
      else normal.z = -1;
    } else if (surface === 'mesial' || surface === 'distal') {
      const mesialSign = side === 'right' ? 1 : -1;
      normal.x = surface === 'mesial' ? mesialSign : -mesialSign;
    } else {
      if (position >= 4) normal.x = side === 'right' ? -1 : 1;
      else normal.z = 1;
    }

    if (surface !== 'occlusal' && surface !== 'incisal' && surface !== 'apical') {
      const towardCrown = crownSign < 0 ? 0.34 : 0.66;
      point.y = min.y + extent.y * towardCrown;
      if (surface === 'cervical') point.y = min.y + extent.y * (crownSign < 0 ? 0.66 : 0.34);
      if (normal.x !== 0) point.x += normal.x * extent.x * 0.43;
      if (normal.z !== 0) point.z += normal.z * extent.z * 0.43;
    }

    const nExtent = normal.x ? extent.x : normal.y ? extent.y : extent.z;
    point.addInPlace(normal.scale(Math.max(nExtent * 0.018, 0.001)));
    return { point, normal, extent, min, max, center };
  }

  function spherePatch(root, frame, key, factor = 0.18, thickness = 0.055, alpha = 1, shift = 0) {
    if (!root || !frame) return null;
    const patch = MeshBuilder.CreateSphere('PathologyPatch', { segments: 18, diameter: 1 }, scene);
    patch.parent = root;
    patch.position.copyFrom(frame.point);
    patch.position.addInPlace(frame.normal.scale(shift));
    const nAxis = frame.normal.x ? 'x' : frame.normal.y ? 'y' : 'z';
    const tangentA = nAxis === 'x' ? 'y' : 'x';
    const tangentB = nAxis === 'z' ? 'y' : 'z';
    const ra = Math.max(frame.extent[tangentA] * factor, 0.004);
    const rb = Math.max(frame.extent[tangentB] * factor, 0.004);
    const depth = Math.max(frame.extent[nAxis] * thickness, 0.002);
    patch.scaling.set(1, 1, 1);
    patch.scaling[nAxis] = depth * 2;
    patch.scaling[tangentA] = ra * 2;
    patch.scaling[tangentB] = rb * 2;
    patch.material = material(key, alpha, alpha < 1 ? 0.04 : 0);
    patch.isPickable = false;
    return patch;
  }

  function clusteredDots(root, frame, key, count, spread = 0.18) {
    if (!root || !frame) return;
    const nAxis = frame.normal.x ? 'x' : frame.normal.y ? 'y' : 'z';
    const tangentA = nAxis === 'x' ? 'y' : 'x';
    const tangentB = nAxis === 'z' ? 'y' : 'z';
    const ra = Math.max(frame.extent[tangentA] * spread, 0.006);
    const rb = Math.max(frame.extent[tangentB] * spread, 0.006);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const radius = 0.35 + 0.18 * (i % 3);
      const dot = MeshBuilder.CreateSphere('PathologyDeposit', { segments: 8, diameter: 1 }, scene);
      dot.parent = root;
      dot.position.copyFrom(frame.point);
      dot.position[tangentA] += Math.cos(angle) * ra * radius;
      dot.position[tangentB] += Math.sin(angle) * rb * radius;
      dot.position.addInPlace(frame.normal.scale(0.004 + (i % 2) * 0.003));
      const size = Math.max(Math.min(ra, rb) * (0.22 + 0.08 * (i % 3)), 0.003);
      dot.scaling.set(size, size * (0.65 + (i % 2) * 0.2), size);
      dot.material = material(key);
      dot.isPickable = false;
    }
  }

  function addCrack(root, frame, key = 'crack', width = 0.009) {
    if (!root || !frame) return;
    const nAxis = frame.normal.x ? 'x' : frame.normal.y ? 'y' : 'z';
    const tangent = nAxis === 'x' ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
    const radius = Math.max(Math.min(frame.extent.x, frame.extent.z) * 0.24, 0.018);
    const path = [
      frame.point.add(tangent.scale(-radius)).add(frame.normal.scale(0.004)),
      frame.point.add(tangent.scale(-radius * 0.2)).add(frame.normal.scale(0.006)),
      frame.point.add(tangent.scale(radius * 0.12)).add(frame.normal.scale(0.003)),
      frame.point.add(tangent.scale(radius * 0.55)).add(frame.normal.scale(0.005))
    ];
    const line = MeshBuilder.CreateTube('PathologyCrack', { path, radius: width, tessellation: 6 }, scene);
    line.parent = root;
    line.material = material(key);
    line.isPickable = false;
  }

  function addCavity(root, frame, severity, progression, key = 'cariesCore') {
    if (!frame) return;
    const size = 0.075 + severity * 0.018 + progression * 0.065;
    spherePatch(root, frame, 'cariesRim', size * 1.28, 0.035, 1, 0.0005);
    spherePatch(root, frame, key, size * 0.72, 0.02, 1, 0.003);
    if (progression > 0.72) spherePatch(root, frame, 'fracture', size * 0.34, 0.012, 1, 0.005);
  }

  function addApicalLesion(root, frame, state, key) {
    if (!frame) return;
    const growth = 0.12 + state.severity * 0.025 + state.stage.progression * 0.11;
    spherePatch(root, frame, key, growth, 0.08, key === 'apical' ? 0.72 : 0.88, 0.004);
    clusteredDots(root, frame, key, 8, growth * 0.75);
  }

  function rememberTransform(mesh) {
    if (!originalTransforms.has(mesh)) {
      originalTransforms.set(mesh, {
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
        scaling: mesh.scaling.clone()
      });
    }
  }

  function moveTooth(parts, tooth, vector) {
    for (const mesh of parts) {
      rememberTransform(mesh);
      mesh.position.addInPlace(vector);
    }
  }

  function tintLayer(parts, records, toothSourceId, layer, color, intensity = 1) {
    const mesh = parts.find(part => records[part.name]?.layer === layer);
    if (mesh) setTint(mesh, color, intensity);
  }

  function renderToothCase(state, context, tooth) {
    const { meshes, records } = context;
    const sourceId = tooth.sourceId;
    const parts = toothParts(meshes, records, sourceId);
    const base = sourceMesh(meshes, records, sourceId, 'teeth');
    const enamel = parts.find(mesh => records[mesh.name]?.layer === 'enamel') || base;
    const pulp = parts.find(mesh => records[mesh.name]?.layer === 'pulp');
    const severity = state.severity;
    const progression = state.stage.progression;
    const condition = state.condition;
    const visual = condition.visual;
    const root = makeRoot(base || enamel, 'Pathology_' + condition.id + '_' + state.caseId, state);
    if (!root) return;
    const surface = visual.includes('root') || visual.includes('resorption') ? 'cervical' :
      visual.includes('wear') || visual.includes('attrition') ? 'occlusal' : 'buccal';
    const frame = surfaceFrame(enamel || base, tooth, surface);

    switch (visual) {
      case 'white-spot':
        spherePatch(root, frame, 'chalk', 0.12 + progression * 0.05, 0.02, 0.92);
        break;
      case 'caries':
      case 'root-caries':
      case 'recurrent-caries':
      case 'rampant-caries':
      case 'arrested-caries':
        addCavity(root, frame, severity, progression, visual === 'arrested-caries' ? 'rootCaries' : 'cariesCore');
        if (visual === 'root-caries') spherePatch(root, surfaceFrame(enamel || base, tooth, 'cervical'), 'rootCaries', 0.16 + progression * 0.04, 0.03);
        if (visual === 'rampant-caries') {
          const secondFrame = surfaceFrame(enamel || base, tooth, 'lingual');
          addCavity(root, secondFrame, severity, progression, 'cariesCore');
        }
        break;
      case 'deep-caries':
        addCavity(root, frame, severity + 1, progression, 'cariesCore');
        if (pulp) setTint(pulp, 'pulp', 0.88);
        break;
      case 'pulpitis-reversible':
        if (pulp) setTint(pulp, 'pulp', 0.42 + severity * 0.08);
        spherePatch(root, frame, 'gingiva', 0.07, 0.02, 0.5);
        break;
      case 'pulpitis-irreversible':
        if (pulp) setTint(pulp, 'abscess', 0.7 + progression * 0.22);
        addCrack(root, surfaceFrame(enamel || base, tooth, 'occlusal'), 'cariesRim', 0.006);
        break;
      case 'pulp-necrosis':
        if (pulp) setTint(pulp, 'necrosis', 0.95);
        addApicalLesion(root, surfaceFrame(base || enamel, tooth, 'apical'), state, 'apical');
        break;
      case 'pulp-polyp':
        if (pulp) setTint(pulp, 'polyp', 0.95);
        spherePatch(root, surfaceFrame(enamel || base, tooth, 'occlusal'), 'polyp', 0.13 + progression * 0.05, 0.045, 0.96, 0.012);
        break;
      case 'pulp-calcification':
        if (pulp) {
          setTint(pulp, 'boneDensity', 0.4);
          const pFrame = surfaceFrame(pulp, tooth, 'apical');
          clusteredDots(root, pFrame, 'boneDensity', 12, 0.2);
        }
        break;
      case 'periapical-inflammation':
      case 'periapical-lesion':
      case 'periapical-cyst':
      case 'apical-abscess':
      case 'chronic-apical-abscess':
      case 'condensing-osteitis':
        {
          const apical = surfaceFrame(base || enamel, tooth, 'apical');
          const key = visual === 'condensing-osteitis' ? 'boneDensity' :
            visual === 'apical-abscess' || visual === 'chronic-apical-abscess' ? 'abscess' :
            visual === 'periapical-cyst' ? 'ulcer' : 'apical';
          addApicalLesion(root, apical, state, key);
          if (visual === 'apical-abscess' || visual === 'chronic-apical-abscess') {
            spherePatch(root, apical, 'pus', 0.06 + progression * 0.03, 0.05, 0.95, 0.01);
          }
          if (visual === 'chronic-apical-abscess') addCrack(root, surfaceFrame(base || enamel, tooth, 'cervical'), 'pus', 0.006);
        }
        break;
      case 'internal-resorption':
        spherePatch(root, surfaceFrame(pulp || base, tooth, 'apical'), 'rootCaries', 0.12 + progression * 0.08, 0.12, 0.9);
        if (pulp) setTint(pulp, 'abscess', 0.65);
        break;
      case 'hypercementosis':
        spherePatch(root, surfaceFrame(base || enamel, tooth, 'apical'), 'boneDensity', 0.14 + progression * 0.04, 0.17, 1, 0.008);
        break;
      case 'taurodontism':
        if (pulp) {
          setTint(pulp, 'pulp', 0.55);
          spherePatch(root, surfaceFrame(pulp, tooth, 'apical'), 'pulp', 0.16 + progression * 0.05, 0.18, 0.9);
        }
        break;
      case 'root-resorption':
      case 'vertical-root-fracture':
        {
          const rootFrame = surfaceFrame(base || enamel, tooth, 'cervical');
          if (visual === 'vertical-root-fracture') addCrack(root, surfaceFrame(base || enamel, tooth, 'apical'), 'crack', 0.012);
          else {
            spherePatch(root, rootFrame, 'rootCaries', 0.13 + progression * 0.06, 0.035);
            addCrack(root, rootFrame, 'cariesRim', 0.005);
          }
        }
        break;
      case 'plaque':
        clusteredDots(root, surfaceFrame(enamel || base, tooth, 'cervical'), 'plaque', 18 + severity * 5, 0.2 + progression * 0.1);
        break;
      case 'calculus':
        clusteredDots(root, surfaceFrame(enamel || base, tooth, 'cervical'), 'calculus', 10 + severity * 4, 0.22 + progression * 0.08);
        spherePatch(root, surfaceFrame(enamel || base, tooth, 'cervical'), 'calculus', 0.12 + progression * 0.08, 0.11);
        break;
      case 'pericoronitis':
        {
          const cervical = surfaceFrame(enamel || base, tooth, 'cervical');
          spherePatch(root, cervical, 'gingiva', 0.24 + progression * 0.06, 0.26, 0.95, 0.008);
          spherePatch(root, cervical, 'pus', 0.07 + severity * 0.012, 0.07, 0.9, 0.014);
        }
        break;
      case 'gingivitis':
      case 'necrotizing-gingivitis':
      case 'periodontal-abscess':
      case 'periodontitis':
      case 'gingival-enlargement':
        {
          const cervical = surfaceFrame(enamel || base, tooth, 'cervical');
          const gingivalKey = visual === 'necrotizing-gingivitis' ? 'gingivaDark' : visual === 'periodontal-abscess' ? 'abscess' : 'gingiva';
          spherePatch(root, cervical, gingivalKey, 0.16 + progression * 0.08, 0.16 + severity * 0.025, 0.9);
          if (visual === 'periodontal-abscess') spherePatch(root, cervical, 'pus', 0.065 + progression * 0.03, 0.04, 1, 0.01);
          if (visual === 'necrotizing-gingivitis') clusteredDots(root, cervical, 'ulcer', 8, 0.12);
          if (visual === 'periodontitis') {
            spherePatch(root, surfaceFrame(base || enamel, tooth, 'apical'), 'boneLoss', 0.18 + progression * 0.1, 0.03, 0.85);
            tintLayer(parts, records, sourceId, 'pdl', 'gingivaDark', 0.35 + progression * 0.2);
            if (progression > 0.8) moveTooth(parts, tooth, new Vector3(0, 0, 0.012 * severity));
          }
          if (visual === 'gingival-enlargement') spherePatch(root, cervical, 'gingiva', 0.23 + progression * 0.06, 0.26, 0.72);
        }
        break;
      case 'recession':
        spherePatch(root, surfaceFrame(enamel || base, tooth, 'cervical'), 'dentin', 0.18 + progression * 0.08, 0.04, 0.95);
        addCrack(root, surfaceFrame(enamel || base, tooth, 'cervical'), 'rootCaries', 0.004);
        break;
      case 'furcation':
        spherePatch(root, surfaceFrame(base || enamel, tooth, 'cervical'), 'boneLoss', 0.14 + progression * 0.1, 0.07, 0.85);
        break;
      case 'erosion':
      case 'attrition':
      case 'abrasion':
      case 'abfraction':
      case 'hypersensitivity':
        {
          const targetSurface = visual === 'erosion' || visual === 'attrition' ? 'occlusal' : 'cervical';
          const wearFrame = surfaceFrame(enamel || base, tooth, targetSurface);
          const key = visual === 'hypersensitivity' ? 'hypersensitivity' : visual === 'erosion' || visual === 'attrition' ? 'dentin' : 'wear';
          spherePatch(root, wearFrame, key, 0.16 + progression * 0.12, 0.035, 0.96, 0.002);
          if (visual === 'abrasion' || visual === 'abfraction') addCrack(root, wearFrame, 'wear', 0.007);
        }
        break;
      case 'crack':
        addCrack(root, surfaceFrame(enamel || base, tooth, 'occlusal'), 'crack', 0.009 + severity * 0.002);
        if (progression > 0.75) spherePatch(root, frame, 'dentin', 0.055, 0.025);
        break;
      case 'crown-fracture':
      case 'complicated-fracture':
      case 'crown-root-fracture':
      case 'root-fracture':
        addCrack(root, surfaceFrame(enamel || base, tooth, visual === 'root-fracture' ? 'apical' : 'occlusal'), 'fracture', 0.012 + severity * 0.002);
        spherePatch(root, surfaceFrame(enamel || base, tooth, 'occlusal'), 'dentin', 0.09 + progression * 0.06, 0.025);
        if (visual === 'complicated-fracture' && pulp) setTint(pulp, 'pulp', 0.9);
        if (visual === 'crown-root-fracture' || visual === 'root-fracture') addCrack(root, surfaceFrame(base || enamel, tooth, 'cervical'), 'fracture', 0.008);
        break;
      case 'concussion':
      case 'subluxation':
        tintLayer(parts, records, sourceId, 'pdl', 'gingiva', 0.6);
        if (visual === 'subluxation') moveTooth(parts, tooth, new Vector3(0, 0, 0.006 * severity));
        break;
      case 'luxation':
      case 'intrusive-luxation':
      case 'avulsion':
        {
          const extent = getBounds(base || enamel)?.extent || new Vector3(0.1, 0.2, 0.1);
          const crownSign = tooth.arch === 'maxillary' ? -1 : 1;
          const scale = 0.24 + progression * 0.36 + severity * 0.08;
          let displacement = new Vector3(0, crownSign * extent.y * scale, 0);
          if (visual === 'intrusive-luxation') displacement.y *= -1.35;
          if (visual === 'luxation') displacement.x = (tooth.side === 'right' ? -1 : 1) * extent.x * scale * 0.7;
          if (visual === 'avulsion') displacement.y *= 2.5;
          moveTooth(parts, tooth, displacement);
          tintLayer(parts, records, sourceId, 'pdl', 'abscess', 0.35);
          if (visual === 'avulsion') spherePatch(root, surfaceFrame(base || enamel, tooth, 'apical'), 'boneLoss', 0.18, 0.06, 0.8);
        }
        break;
      case 'enamel-hypoplasia':
      case 'mih':
      case 'fluorosis':
      case 'amelogenesis-imperfecta':
      case 'microdontia':
      case 'dens-invaginatus':
      case 'dens-evaginatus':
      case 'discoloration':
      case 'dentinogenesis-imperfecta':
        {
          const key = visual === 'discoloration' || visual === 'dentinogenesis-imperfecta' ? 'dentin' : 'enamelDefect';
          const count = visual === 'fluorosis' || visual === 'amelogenesis-imperfecta' ? 12 : visual === 'mih' ? 7 : 4;
          clusteredDots(root, frame, key, count + severity * 2, 0.22 + progression * 0.07);
          if (visual === 'dens-invaginatus') spherePatch(root, surfaceFrame(enamel || base, tooth, 'incisal'), 'crack', 0.07, 0.04);
          if (visual === 'dens-evaginatus') spherePatch(root, surfaceFrame(enamel || base, tooth, 'occlusal'), 'enamelDefect', 0.1, 0.18);
          if (visual === 'dentinogenesis-imperfecta' && base) setTint(base, 'dentin', 0.72);
          if (visual === 'microdontia') spherePatch(root, frame, 'enamelDefect', 0.09, 0.025);
        }
        break;
      default:
        spherePatch(root, frame, 'cariesRim', 0.13, 0.04);
    }
  }

  function renderBoneCase(state, context) {
    const target = state.targetValue === 'mandible' ? 'mandible' : 'maxilla';
    const sourceId = target === 'mandible' ? SOURCE.mandible : SOURCE.maxilla;
    const layer = target === 'mandible' ? 'mandible' : 'maxilla';
    const anchor = sourceMesh(context.meshes, context.records, sourceId, layer);
    const bounds = getBounds(anchor);
    if (!anchor || !bounds) return;
    const root = makeRoot(anchor, 'PathologyBone_' + state.condition.id + '_' + state.caseId, state);
    const point = bounds.center.clone();
    point.z = bounds.max.z - bounds.extent.z * 0.025;
    point.x += (target === 'mandible' ? 0.16 : -0.12) * bounds.extent.x;
    const frame = {
      point,
      normal: new Vector3(0, 0, 1),
      extent: bounds.extent,
      min: bounds.min,
      max: bounds.max,
      center: bounds.center
    };
    const visual = state.condition.visual;
    const growth = 0.065 + state.severity * 0.018 + state.stage.progression * 0.06;
    if (visual === 'dentigerous-cyst' || visual === 'odontogenic-keratocyst') {
      spherePatch(root, frame, 'boneCyst', growth * 1.3, 0.16, 0.92, 0.008);
      spherePatch(root, frame, 'ulcer', growth * 0.92, 0.12, 0.88, 0.012);
      clusteredDots(root, frame, 'boneCyst', 8 + state.severity * 2, growth);
    } else if (visual === 'ameloblastoma') {
      spherePatch(root, frame, 'boneTumor', growth * 1.65, 0.22, 0.92, 0.012);
      for (let i = 0; i < 4 + state.severity; i++) {
        const f = {
          ...frame,
          point: frame.point.add(new Vector3(
            Math.cos(i * Math.PI / 3) * bounds.extent.x * growth * 1.6,
            Math.sin(i * Math.PI / 3) * bounds.extent.y * growth * 1.4,
            0.015
          ))
        };
        spherePatch(root, f, 'boneCyst', growth * 0.55, 0.16, 0.9, 0.01);
      }
    } else if (visual === 'odontoma') {
      spherePatch(root, frame, 'boneDensity', growth * 1.5, 0.2, 1, 0.012);
      clusteredDots(root, frame, 'boneDensity', 10 + state.severity * 3, growth * 1.5);
    } else {
      spherePatch(root, frame, 'boneCyst', growth, 0.12, 0.88, 0.006);
    }
  }

  function renderSoftTissueCase(state, context) {
    const { meshes, records } = context;
    const target = state.targetValue || 'gum-upper';
    const sourceId = target === 'gum-lower' ? SOURCE.lowerGum : target === 'palate' ? SOURCE.palate : SOURCE.upperGum;
    const layer = target === 'palate' ? 'maxilla' : target === 'gum-lower' || target === 'gum-upper' ? 'gingiva' : null;
    const anchor = sourceMesh(meshes, records, sourceId, layer);
    const bounds = getBounds(anchor);
    if (!anchor || !bounds) return;
    const root = makeRoot(anchor, 'PathologySoft_' + state.condition.id + '_' + state.caseId, state);
    const center = bounds.center.clone();
    const topY = target === 'gum-lower' ? bounds.max.y : bounds.min.y;
    center.y = topY;
    const fakeTooth = {arch: target === 'gum-lower' ? 'mandibular' : 'maxillary', side:'right', position:3};
    const frame = {
      point: center,
      normal: new Vector3(0, target === 'gum-lower' ? 1 : -1, 0),
      extent: bounds.extent,
      min: bounds.min,
      max: bounds.max,
      center: bounds.center
    };
    const visual = state.condition.visual;
    const severity = state.severity;
    const progression = state.stage.progression;
    if (visual === 'aphthous') {
      spherePatch(root, frame, 'gingiva', 0.23 + severity * 0.025, 0.055, 0.9);
      spherePatch(root, frame, 'ulcer', 0.13 + severity * 0.018, 0.025, 1, 0.004);
    } else if (visual === 'candidiasis' || visual === 'leukoplakia') {
      spherePatch(root, frame, visual === 'candidiasis' ? 'candidiasisWhite' : 'leukoplakiaWhite', 0.24 + progression * 0.08, 0.045, 0.94);
      clusteredDots(root, frame, visual === 'candidiasis' ? 'white' : 'leukoplakiaWhite', 12, 0.2);
    } else if (visual === 'lichen-planus') {
      for (let i = 0; i < 3; i++) {
        const f = {...frame, point: frame.point.add(new Vector3((i - 1) * bounds.extent.x * 0.12, 0, (i % 2) * bounds.extent.z * 0.1))};
        addCrack(root, f, 'white', 0.006);
      }
    } else if (visual === 'erythroplakia' || visual === 'herpes') {
      spherePatch(root, frame, visual === 'herpes' ? 'herpes' : 'mucosa', 0.22 + progression * 0.07, 0.05, 0.95);
      if (visual === 'herpes') clusteredDots(root, frame, 'ulcer', 9 + severity * 2, 0.16);
    } else if (visual === 'oral-cancer') {
      spherePatch(root, frame, 'cancer', 0.2 + severity * 0.04, 0.28, 0.95, 0.01);
      addCrack(root, frame, 'fracture', 0.01);
      if (progression > 0.6) spherePatch(root, frame, 'boneLoss', 0.16, 0.05, 0.7, -0.02);
    } else if (visual === 'noma') {
      spherePatch(root, frame, 'gingivaDark', 0.23 + severity * 0.05, 0.23, 0.95);
      spherePatch(root, frame, 'fracture', 0.13 + progression * 0.04, 0.15, 0.96, 0.012);
    } else if (visual === 'alveolar-osteitis') {
      spherePatch(root, frame, 'alveolarBone', 0.18 + severity * 0.025, 0.035, 1, 0.006);
      spherePatch(root, frame, 'fracture', 0.09 + progression * 0.035, 0.02, 0.94, 0.012);
      clusteredDots(root, frame, 'boneCyst', 8 + severity, 0.12);
    } else if (visual === 'gingival-enlargement') {
      spherePatch(root, frame, 'gingiva', 0.3 + progression * 0.08, 0.38, 0.9, 0.008);
    } else {
      spherePatch(root, frame, 'gingiva', 0.26 + severity * 0.04, 0.26, 0.92);
    }
  }

  function applyCase(state, context) {
    const condition = state.condition;
    if (condition.target === 'oral-soft') {
      renderSoftTissueCase(state, context);
      return;
    }
    if (condition.target === 'bone') {
      renderBoneCase(state, context);
      return;
    }
    const targets = state.toothSourceIds || (state.toothSourceId ? [state.toothSourceId] : []);
    for (const sourceId of targets) {
      const tooth = context.catalog.find(item => item.sourceId === sourceId);
      if (tooth) renderToothCase(state, context, tooth);
    }
  }

  function render(cases, context) {
    resetVisuals();
    for (const state of cases) applyCase(state, context);
    return { effects: effectRoots.length };
  }

  function clear() {
    resetVisuals();
  }

  return { render, clear };
}
