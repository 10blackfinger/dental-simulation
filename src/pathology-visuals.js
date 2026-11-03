import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexData
} from '@babylonjs/core';

// Every visual key represented in the 108-case catalogue has an explicit
// renderer route. This guards against silently falling back to a generic blob.
export const SUPPORTED_PATHOLOGY_VISUALS = Object.freeze([
  'white-spot',
  'caries',
  'deep-caries',
  'root-caries',
  'recurrent-caries',
  'rampant-caries',
  'arrested-caries',
  'pulpitis-reversible',
  'pulpitis-irreversible',
  'pulp-necrosis',
  'pulp-calcification',
  'periapical-inflammation',
  'periapical-lesion',
  'apical-abscess',
  'chronic-apical-abscess',
  'periapical-cyst',
  'condensing-osteitis',
  'internal-resorption',
  'root-resorption',
  'plaque',
  'calculus',
  'gingivitis',
  'necrotizing-gingivitis',
  'periodontitis',
  'periodontal-abscess',
  'recession',
  'furcation',
  'erosion',
  'attrition',
  'abrasion',
  'abfraction',
  'hypersensitivity',
  'crack',
  'vertical-root-fracture',
  'crown-fracture',
  'complicated-fracture',
  'crown-root-fracture',
  'root-fracture',
  'concussion',
  'subluxation',
  'luxation',
  'intrusive-luxation',
  'avulsion',
  'enamel-hypoplasia',
  'mih',
  'fluorosis',
  'amelogenesis-imperfecta',
  'dentinogenesis-imperfecta',
  'microdontia',
  'dens-invaginatus',
  'dens-evaginatus',
  'discoloration',
  'pericoronitis',
  'pulp-polyp',
  'alveolar-osteitis',
  'hypercementosis',
  'taurodontism',
  'dentigerous-cyst',
  'odontogenic-keratocyst',
  'ameloblastoma',
  'odontoma',
  'aphthous',
  'candidiasis',
  'lichen-planus',
  'leukoplakia',
  'erythroplakia',
  'oral-cancer',
  'herpes',
  'noma',
  'gingival-enlargement',
  'canal-obliteration',
  'root-canal-obturation',
  'periapical-scar',
  'cervical-resorption',
  'inflammatory-root-resorption',
  'replacement-resorption',
  'transient-apical-breakdown',
  'endo-perio',
  'necrotizing-periodontitis',
  'mucogingival-defect',
  'occlusal-trauma',
  'implant-mucositis',
  'implantitis',
  'missing-tooth',
  'supernumerary-tooth',
  'macrodontia',
  'fusion',
  'gemination',
  'dilaceration',
  'impacted-tooth',
  'ectopic-eruption',
  'enamel-pearl',
  'cemento-osseous-dysplasia',
  'nasopalatine-cyst',
  'lateral-periodontal-cyst',
  'odontogenic-myxoma',
  'giant-cell-granuloma',
  'fibrous-dysplasia',
  'calcifying-odontogenic-cyst'
]);

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
  const originalVertexData = new Map();
  const workingPositions = new Map();
  const originalVisibility = new Map();
  const generatedMeshes = new Set();
  const unhandledVisuals = new Set();

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
    for (const [mesh, data] of originalVertexData) {
      if (mesh.isDisposed?.()) continue;
      mesh.setVerticesData('position', data.positions.slice(), true);
      if (data.normals) mesh.setVerticesData('normal', data.normals.slice(), true);
      mesh.refreshBoundingInfo();
    }
    originalVertexData.clear();
    workingPositions.clear();

    for (const [mesh, visible] of originalVisibility) {
      if (!mesh.isDisposed?.()) mesh.isVisible = visible;
    }
    originalVisibility.clear();

    for (const mesh of generatedMeshes) {
      if (!mesh.isDisposed?.()) mesh.dispose(false, false);
    }
    generatedMeshes.clear();

    for (const root of effectRoots.splice(0)) root.dispose(false, false);
    for (const [mesh, original] of originalMaterials) {
      if (!mesh.isDisposed?.()) mesh.material = original;
    }
    originalMaterials.clear();
    for (const tint of tintMaterials) tint.dispose(false, false);
    tintMaterials.clear();
    for (const [mesh, transform] of originalTransforms) {
      if (mesh.isDisposed?.()) continue;
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

  function rememberVisibility(mesh) {
    if (mesh && !originalVisibility.has(mesh)) originalVisibility.set(mesh, mesh.isVisible);
  }

  function hideTooth(parts) {
    for (const mesh of parts) {
      rememberVisibility(mesh);
      mesh.isVisible = false;
    }
  }

  function cloneTooth(parts, tooth, amount = 1) {
    const base = parts.find(mesh => mesh.name && !mesh.name.includes('-enamel') && !mesh.name.includes('-pulp'));
    if (!base) return;
    const extent = getBounds(base)?.extent || new Vector3(0.1, 0.2, 0.1);
    const sideSign = tooth.side === 'right' ? -1 : 1;
    const offset = new Vector3(sideSign * extent.x * (0.72 + amount * 0.12), 0, extent.z * 0.1);
    for (const original of parts) {
      const clone = original.clone('PathologySupernumerary_' + original.name + '_' + generatedMeshes.size);
      if (!clone) continue;
      generatedMeshes.add(clone);
      clone.isPickable = false;
      clone.isVisible = true;
      clone.position.addInPlace(offset);
      clone.scaling.scaleInPlace(0.72 + amount * 0.12);
    }
  }

  function deformSurface(anchor, targets, frame, options = {}) {
    if (!anchor || !frame || !targets?.length) return 0;
    const {
      factor = 0.2,
      depthRatio = 0.18,
      surfaceBandRatio = 0.3,
      mode = 'loss',
      profile = 'smooth',
      irregularity = 0,
      directionVector = null,
      normalCheck = true
    } = options;
    anchor.computeWorldMatrix(true);
    const anchorWorld = anchor.getWorldMatrix();
    const worldCenter = Vector3.TransformCoordinates(frame.point, anchorWorld);

    const normalAxis = frame.normal.x ? 'x' : frame.normal.y ? 'y' : 'z';
    const tangentAxes = normalAxis === 'x' ? ['y', 'z'] : normalAxis === 'y' ? ['x', 'z'] : ['x', 'y'];
    const unitAxis = axis => new Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
    const rawNormal = Vector3.TransformNormal(frame.normal, anchorWorld);
    const normalScale = Math.max(rawNormal.length(), 1e-6);
    const worldNormal = rawNormal.scale(1 / normalScale);
    const tangentVectors = tangentAxes.map(axis => {
      const raw = Vector3.TransformNormal(unitAxis(axis), anchorWorld);
      const scale = Math.max(raw.length(), 1e-6);
      return { direction: raw.scale(1 / scale), scale };
    });
    const radii = tangentAxes.map((axis, index) =>
      Math.max(frame.extent[axis] * factor * tangentVectors[index].scale, 0.004)
    );
    const minRadius = Math.min(...radii);
    const depth = Math.max(minRadius * depthRatio, 0.0015);
    const surfaceBand = Math.max(minRadius * surfaceBandRatio, depth * 1.5, 0.003);

    let changedVertices = 0;
    for (const mesh of targets) {
      const sourcePositions = workingPositions.get(mesh) || mesh.getVerticesData('position');
      const indices = mesh.getIndices();
      if (!sourcePositions || !indices?.length) continue;

      if (!originalVertexData.has(mesh)) {
        const sourceNormals = mesh.getVerticesData('normal');
        originalVertexData.set(mesh, {
          positions: Float32Array.from(sourcePositions),
          normals: sourceNormals ? Float32Array.from(sourceNormals) : null
        });
      }
      const positions = Float32Array.from(sourcePositions);
      const normals = mesh.getVerticesData('normal');
      mesh.computeWorldMatrix(true);
      const targetWorld = mesh.getWorldMatrix();
      const inverseTarget = targetWorld.clone();
      inverseTarget.invert();

      let meshChangedVertices = 0;
      for (let i = 0; i < positions.length; i += 3) {
        const localVertex = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
        const worldVertex = Vector3.TransformCoordinates(localVertex, targetWorld);
        const delta = worldVertex.subtract(worldCenter);
        const axial = Vector3.Dot(delta, worldNormal);
        if (Math.abs(axial) > surfaceBand) continue;

        if (normalCheck && normals) {
          const localNormal = new Vector3(normals[i], normals[i + 1], normals[i + 2]);
          const worldVertexNormal = Vector3.TransformNormal(localNormal, targetWorld).normalize();
          if (Vector3.Dot(worldVertexNormal, worldNormal) < 0.12) continue;
        }

        const radial = delta.subtract(worldNormal.scale(axial));
        const a = Vector3.Dot(radial, tangentVectors[0].direction) / radii[0];
        const b = Vector3.Dot(radial, tangentVectors[1].direction) / radii[1];
        const radialSquared = a * a + b * b;
        if (radialSquared >= 1) continue;

        const radialDistance = Math.sqrt(radialSquared);
        const angle = Math.atan2(b, a);
        const edgeNoise = irregularity
          ? 1 + irregularity * (
            Math.sin(angle * 5 + 0.7) * 0.45 +
            Math.sin(angle * 9 - 1.1) * 0.3 +
            Math.sin(angle * 13 + 2.2) * 0.25
          )
          : 1;
        const adjustedRadius = radialDistance / Math.max(edgeNoise, 0.55);
        if (adjustedRadius >= 1) continue;

        let radialFalloff;
        if (profile === 'groove') {
          radialFalloff = Math.exp(-Math.pow((adjustedRadius - 0.38) / 0.3, 2));
        } else if (profile === 'ridge') {
          radialFalloff = Math.max(0, 1 - Math.abs(adjustedRadius - 0.82) / 0.2);
        } else if (profile === 'wedge') {
          radialFalloff = Math.pow(1 - adjustedRadius, 0.65) * (0.4 + 0.6 * Math.abs(Math.cos(angle)));
        } else if (profile === 'lobulated') {
          radialFalloff = Math.pow(1 - adjustedRadius * adjustedRadius, 1.15) *
            (0.78 + 0.22 * Math.sin(angle * 4 + 0.4));
        } else {
          radialFalloff = Math.pow(1 - adjustedRadius * adjustedRadius, profile === 'crater' ? 1.35 : 1.8);
        }
        const axialFalloff = Math.max(0, 1 - Math.abs(axial) / surfaceBand);
        const falloff = radialFalloff * axialFalloff;
        if (falloff <= 0.025) continue;

        const direction = mode === 'raise' ? 1 : -1;
        const displacementAxis = directionVector
          ? directionVector.clone().normalize()
          : worldNormal;
        const worldDelta = displacementAxis.scale(direction * depth * falloff);
        const localDelta = Vector3.TransformNormal(worldDelta, inverseTarget);
        positions[i] += localDelta.x;
        positions[i + 1] += localDelta.y;
        positions[i + 2] += localDelta.z;
        changedVertices++;
        meshChangedVertices++;
      }

      if (!meshChangedVertices) continue;
      mesh.setVerticesData('position', positions, true);
      const nextNormals = new Float32Array(positions.length);
      VertexData.ComputeNormals(positions, indices, nextNormals);
      mesh.setVerticesData('normal', nextNormals, true);
      mesh.refreshBoundingInfo();
      workingPositions.set(mesh, positions);
    }
    return changedVertices;
  }

  function deformToothSurface(parts, records, sourceId, anchor, frame, options = {}) {
    const layers = options.layers || ['teeth', 'enamel', 'prosthetic'];
    const targets = parts.filter(mesh => layers.includes(records[mesh.name]?.layer));
    const { layers: _layers, ...deformation } = options;
    return deformSurface(anchor, targets, frame, deformation);
  }

  function updateMeshGeometry(mesh, nextPositions) {
    const indices = mesh.getIndices();
    if (!indices?.length) return false;
    const current = workingPositions.get(mesh) || mesh.getVerticesData('position');
    if (!current) return false;
    if (!originalVertexData.has(mesh)) {
      const sourceNormals = mesh.getVerticesData('normal');
      originalVertexData.set(mesh, {
        positions: Float32Array.from(current),
        normals: sourceNormals ? Float32Array.from(sourceNormals) : null
      });
    }
    mesh.setVerticesData('position', nextPositions, true);
    const nextNormals = new Float32Array(nextPositions.length);
    VertexData.ComputeNormals(nextPositions, indices, nextNormals);
    mesh.setVerticesData('normal', nextNormals, true);
    mesh.refreshBoundingInfo();
    workingPositions.set(mesh, nextPositions);
    return true;
  }

  // Imported structures use the patient coordinate frame while most GLB node
  // origins sit at the model origin. Scale every part around one shared tooth
  // centroid so developmental size changes do not make the tooth drift out of
  // its socket or separate the enamel, dentin and pulp.
  function scaleToothAroundAnchor(parts, anchor, factor) {
    if (!anchor || !Number.isFinite(factor) || factor <= 0) return;
    const bounds = getBounds(anchor);
    if (!bounds) return;
    anchor.computeWorldMatrix(true);
    const centerWorld = Vector3.TransformCoordinates(bounds.center, anchor.getWorldMatrix());
    for (const mesh of parts) {
      const source = workingPositions.get(mesh) || mesh.getVerticesData('position');
      if (!source) continue;
      mesh.computeWorldMatrix(true);
      const world = mesh.getWorldMatrix();
      const inverse = world.clone();
      inverse.invert();
      const updated = Float32Array.from(source);
      for (let i = 0; i < updated.length; i += 3) {
        const local = new Vector3(source[i], source[i + 1], source[i + 2]);
        const point = Vector3.TransformCoordinates(local, world);
        const scaled = centerWorld.add(point.subtract(centerWorld).scale(factor));
        const nextLocal = Vector3.TransformCoordinates(scaled, inverse);
        updated[i] = nextLocal.x;
        updated[i + 1] = nextLocal.y;
        updated[i + 2] = nextLocal.z;
      }
      updateMeshGeometry(mesh, updated);
    }
  }

  // Locate the nearest point on the segmented gingival surface to the tooth
  // cervical frame, then deform a compact patch around that point. This handles
  // small segmentation gaps between the tooth and gingiva without moving the
  // entire gum arch or requiring the two meshes to intersect perfectly.
  function deformGingivaNearestToTooth(gum, anchor, frame, options = {}) {
    const source = workingPositions.get(gum) || gum.getVerticesData('position');
    const indices = gum.getIndices();
    if (!source || !indices?.length) return 0;

    anchor.computeWorldMatrix(true);
    gum.computeWorldMatrix(true);
    const anchorWorld = anchor.getWorldMatrix();
    const gumWorld = gum.getWorldMatrix();
    const inverseGumWorld = gumWorld.clone();
    inverseGumWorld.invert();

    const targetWorld = Vector3.TransformCoordinates(frame.point, anchorWorld);
    const surfaceNormal = Vector3.TransformNormal(frame.normal, anchorWorld).normalize();
    let nearestIndex = -1;
    let nearestDistanceSquared = Infinity;
    let nearestWorld = null;

    for (let i = 0; i < source.length; i += 3) {
      const local = new Vector3(source[i], source[i + 1], source[i + 2]);
      const world = Vector3.TransformCoordinates(local, gumWorld);
      const distanceSquared = Vector3.DistanceSquared(world, targetWorld);
      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearestIndex = i;
        nearestWorld = world;
      }
    }
    if (nearestIndex < 0 || !nearestWorld) return 0;

    const toothBox = anchor.getBoundingInfo().boundingBox;
    const toothExtent = toothBox.extendSizeWorld.scale(2);
    const smallAxis = Math.max(Math.min(toothExtent.x, toothExtent.y, toothExtent.z), 0.04);
    const factor = Math.max(0.12, Math.min(0.42, options.factor ?? 0.2));
    const radius = Math.max(smallAxis * factor, 0.045);
    const surfaceBand = Math.max(radius * (options.surfaceBandRatio ?? 0.58), 0.025);
    const depth = radius * Math.max(0.015, Math.min(0.35, options.depthRatio ?? 0.08));
    const pushDirection = options.directionVector
      ? options.directionVector.clone().normalize()
      : surfaceNormal;
    const sign = options.mode === 'loss' ? -1 : 1;
    const positions = Float32Array.from(source);
    let changedVertices = 0;

    for (let i = 0; i < positions.length; i += 3) {
      const local = new Vector3(source[i], source[i + 1], source[i + 2]);
      const world = Vector3.TransformCoordinates(local, gumWorld);
      const delta = world.subtract(nearestWorld);
      const axial = Vector3.Dot(delta, surfaceNormal);
      const radial = delta.subtract(surfaceNormal.scale(axial));
      const radialDistance = radial.length();
      if (radialDistance >= radius || Math.abs(axial) >= surfaceBand) continue;

      const radialFalloff = Math.pow(1 - Math.pow(radialDistance / radius, 2), 2);
      const axialFalloff = Math.max(0, 1 - Math.abs(axial) / surfaceBand);
      const falloff = radialFalloff * axialFalloff;
      if (falloff <= 0.02) continue;

      const worldDelta = pushDirection.scale(sign * depth * falloff);
      const localDelta = Vector3.TransformNormal(worldDelta, inverseGumWorld);
      positions[i] += localDelta.x;
      positions[i + 1] += localDelta.y;
      positions[i + 2] += localDelta.z;
      changedVertices++;
    }

    if (!changedVertices) return 0;
    updateMeshGeometry(gum, positions);
    return changedVertices;
  }

  function getGingivaMesh(context, tooth) {
    const sourceId = tooth.arch === 'mandibular' ? SOURCE.lowerGum : SOURCE.upperGum;
    return sourceMesh(context.meshes, context.records, sourceId, 'gingiva');
  }

  function getJawBoneMesh(context, tooth) {
    const sourceId = tooth.arch === 'mandibular' ? SOURCE.mandible : SOURCE.maxilla;
    const layer = tooth.arch === 'mandibular' ? 'mandible' : 'maxilla';
    return sourceMesh(context.meshes, context.records, sourceId, layer);
  }

  function modifyGingivaAtTooth(context, tooth, anchor, frame, options = {}) {
    const gum = getGingivaMesh(context, tooth);
    if (!gum || !anchor || !frame) return 0;
    if (options.tint) setTint(gum, options.tint, options.tintStrength ?? 0.5);
    const { tint, tintStrength, ...shape } = options;
    const surfaceChanges = deformSurface(anchor, [gum], frame, {
      factor: 0.2,
      depthRatio: 0.08,
      surfaceBandRatio: 0.5,
      normalCheck: false,
      ...shape
    });
    if (surfaceChanges > 0) return surfaceChanges;
    // Fallback to the nearest measured gingival surface point when the tooth
    // and gum segmentations have a small gap at the CEJ.
    return deformGingivaNearestToTooth(gum, anchor, frame, {
      factor: 0.24,
      depthRatio: 0.1,
      surfaceBandRatio: 0.72,
      ...shape
    });
  }

  function modifyAlveolarBoneAtTooth(context, tooth, anchor, frame, options = {}) {
    const bone = getJawBoneMesh(context, tooth);
    if (!bone || !anchor || !frame) return 0;
    const source = workingPositions.get(bone) || bone.getVerticesData('position');
    if (!source?.length) return 0;

    anchor.computeWorldMatrix(true);
    bone.computeWorldMatrix(true);
    const anchorWorld = anchor.getWorldMatrix();
    const boneWorld = bone.getWorldMatrix();
    const inverseAnchorWorld = anchorWorld.clone();
    inverseAnchorWorld.invert();
    const toothSurfaceWorld = Vector3.TransformCoordinates(frame.point, anchorWorld);
    const outwardWorld = Vector3.TransformNormal(frame.normal, anchorWorld).normalize();

    // The cortical plate is not coincident with the tooth surface. A fixed
    // 0.045-unit offset commonly remains inside the tooth/socket gap and edits
    // no bone vertices at all. Find the nearest measured cortical vertex to the
    // selected root/cervical site, then deform a small patch at that bone point.
    let nearestDistanceSquared = Infinity;
    let nearestBonePoint = null;
    for (let i = 0; i < source.length; i += 3) {
      const local = new Vector3(source[i], source[i + 1], source[i + 2]);
      const world = Vector3.TransformCoordinates(local, boneWorld);
      const delta = world.subtract(toothSurfaceWorld);
      const projection = Vector3.Dot(delta, outwardWorld);
      // Prefer the bone on the same side of the tooth as the selected surface;
      // a slightly wider allowance tolerates imperfectly segmented sockets.
      if (projection < -0.08) continue;
      const distanceSquared = Vector3.DistanceSquared(world, toothSurfaceWorld);
      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearestBonePoint = world;
      }
    }

    // If the surface-normal side had no samples, fall back to the globally
    // nearest point rather than leaving a disease with no alveolar response.
    if (!nearestBonePoint) {
      for (let i = 0; i < source.length; i += 3) {
        const local = new Vector3(source[i], source[i + 1], source[i + 2]);
        const world = Vector3.TransformCoordinates(local, boneWorld);
        const distanceSquared = Vector3.DistanceSquared(world, toothSurfaceWorld);
        if (distanceSquared < nearestDistanceSquared) {
          nearestDistanceSquared = distanceSquared;
          nearestBonePoint = world;
        }
      }
    }
    if (!nearestBonePoint) return 0;

    const boneFrame = {
      ...frame,
      point: Vector3.TransformCoordinates(nearestBonePoint, inverseAnchorWorld),
      normal: frame.normal.clone(),
      extent: frame.extent.clone()
    };
    if (options.tint) setTint(bone, options.tint, options.tintStrength ?? 0.28);
    const { tint, tintStrength, ...shape } = options;
    return deformSurface(anchor, [bone], boneFrame, {
      factor: 0.2,
      depthRatio: 0.1,
      surfaceBandRatio: 0.58,
      normalCheck: false,
      profile: 'crater',
      ...shape
    });
  }

  function makeCanalFill(root, pulp, tooth) {
    if (!root || !pulp) return;
    const bounds = getBounds(pulp);
    if (!bounds) return;
    const center = bounds.center;
    const sign = tooth.arch === 'maxillary' ? 1 : -1;
    const points = [
      new Vector3(center.x, center.y - sign * bounds.extent.y * 0.36, center.z),
      new Vector3(center.x, center.y - sign * bounds.extent.y * 0.12, center.z),
      new Vector3(center.x, center.y + sign * bounds.extent.y * 0.14, center.z),
      new Vector3(center.x, center.y + sign * bounds.extent.y * 0.36, center.z)
    ];
    const fill = MeshBuilder.CreateTube('PathologyCanalObturation', {
      path: points,
      radius: Math.max(Math.min(bounds.extent.x, bounds.extent.z) * 0.075, 0.003),
      tessellation: 8,
      cap: MeshBuilder.CAP_ALL
    }, scene);
    fill.parent = root;
    fill.material = material('dentin');
    fill.isPickable = false;
  }

  function changeToothScale(parts, factor, anchor) {
    scaleToothAroundAnchor(parts, anchor || parts[0], factor);
  }

  function bendToothRoot(parts, tooth, amount) {
    for (const mesh of parts.filter(item => {
      const layer = item.metadata?.structureId || '';
      return item.getTotalVertices?.() > 0;
    })) {
      const positions = workingPositions.get(mesh) || mesh.getVerticesData('position');
      const indices = mesh.getIndices();
      if (!positions || !indices?.length) continue;
      if (!originalVertexData.has(mesh)) {
        const sourceNormals = mesh.getVerticesData('normal');
        originalVertexData.set(mesh, {
          positions: Float32Array.from(positions),
          normals: sourceNormals ? Float32Array.from(sourceNormals) : null
        });
      }
      const updated = Float32Array.from(positions);
      const bounds = getBounds(mesh);
      if (!bounds) continue;
      const crownSign = tooth.arch === 'maxillary' ? -1 : 1;
      for (let i = 0; i < updated.length; i += 3) {
        const y = updated[i + 1];
        const rootDepth = crownSign < 0
          ? (y - bounds.min.y) / Math.max(bounds.extent.y, 1e-6)
          : (bounds.max.y - y) / Math.max(bounds.extent.y, 1e-6);
        if (rootDepth < 0.34) continue;
        const t = Math.min(1, (rootDepth - 0.34) / 0.66);
        updated[i] += amount * t * t;
      }
      mesh.setVerticesData('position', updated, true);
      const updatedNormals = new Float32Array(updated.length);
      VertexData.ComputeNormals(updated, indices, updatedNormals);
      mesh.setVerticesData('normal', updatedNormals, true);
      mesh.refreshBoundingInfo();
      workingPositions.set(mesh, updated);
    }
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

  function markUnhandledVisual(root, visual) {
    unhandledVisuals.add(visual);
    if (root) root.metadata = { ...(root.metadata || {}), unhandledVisual: true };
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

    if (surface === 'occlusal' || surface === 'incisal') {
      normal.y = crownSign;
    } else if (surface === 'apical') {
      normal.y = rootSign;
    } else if (surface === 'lingual') {
      if (position >= 4) normal.x = side === 'right' ? 1 : -1;
      else normal.z = -1;
    } else if (surface === 'mesial' || surface === 'distal') {
      const mesialSign = side === 'right' ? 1 : -1;
      normal.x = surface === 'mesial' ? mesialSign : -mesialSign;
    } else if (position >= 4) {
      normal.x = side === 'right' ? -1 : 1;
    } else {
      normal.z = 1;
    }

    const positions = workingPositions.get(mesh) || mesh.getVerticesData('position');
    if (!positions?.length) {
      // Defensive fallback for a mesh without readable vertex positions.
      const point = center.clone();
      const yRatio = surface === 'cervical'
        ? (crownSign < 0 ? 0.66 : 0.34)
        : (crownSign < 0 ? 0.34 : 0.66);
      if (normal.y !== 0) {
        point.y = normal.y === crownSign
          ? (crownSign < 0 ? min.y : max.y)
          : (rootSign > 0 ? max.y : min.y);
      } else {
        point.y = min.y + extent.y * yRatio;
        if (normal.x !== 0) point.x += normal.x * extent.x * 0.48;
        if (normal.z !== 0) point.z += normal.z * extent.z * 0.48;
      }
      const axisExtent = normal.x ? extent.x : normal.y ? extent.y : extent.z;
      point.addInPlace(normal.scale(Math.max(axisExtent * 0.002, 0.0005)));
      return { point, normal, extent, min, max, center };
    }

    // Pick points from the actual surface mesh, not an arbitrary fraction of
    // the bounding box. The old 43% offset often landed well inside the crown
    // or outside the buccal contour, so visible lesions floated or were buried.
    let targetY;
    let yBand;
    if (surface === 'occlusal' || surface === 'incisal') {
      targetY = crownSign < 0 ? min.y : max.y;
      yBand = Math.max(extent.y * 0.055, 0.0015);
    } else if (surface === 'apical') {
      targetY = rootSign > 0 ? max.y : min.y;
      yBand = Math.max(extent.y * 0.055, 0.0015);
    } else {
      const ratio = surface === 'cervical'
        ? (crownSign < 0 ? 0.66 : 0.34)
        : (crownSign < 0 ? 0.34 : 0.66);
      targetY = min.y + extent.y * ratio;
      yBand = Math.max(extent.y * 0.105, 0.0025);
    }

    const candidates = [];
    let extremeProjection = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      if (Math.abs(y - targetY) > yBand) continue;
      const projection = x * normal.x + y * normal.y + z * normal.z;
      if (projection > extremeProjection) extremeProjection = projection;
      candidates.push({ x, y, z, projection });
    }

    // A narrow support band around the outermost sampled contour keeps the
    // frame on the real enamel/root surface, while averaging a few vertices
    // gives a stable anchor for the disease patch instead of one triangle tip.
    const projectionAxisExtent = normal.x ? extent.x : normal.y ? extent.y : extent.z;
    const projectionTolerance = Math.max(projectionAxisExtent * 0.045, 0.0012);
    const support = candidates.filter(item =>
      item.projection >= extremeProjection - projectionTolerance
    );
    const selected = support.length ? support : candidates;
    let point;
    if (selected.length) {
      point = selected.reduce((sum, item) => {
        sum.x += item.x;
        sum.y += item.y;
        sum.z += item.z;
        return sum;
      }, { x: 0, y: 0, z: 0 });
      point = new Vector3(
        point.x / selected.length,
        point.y / selected.length,
        point.z / selected.length
      );
    } else {
      point = center.clone();
      point.y = targetY;
      if (normal.x !== 0) point.x += normal.x * extent.x * 0.48;
      if (normal.z !== 0) point.z += normal.z * extent.z * 0.48;
    }

    point.addInPlace(normal.scale(Math.max(projectionAxisExtent * 0.002, 0.0005)));
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

  function addLongitudinalCrack(root, frame, key = 'crack', width = 0.006) {
    if (!root || !frame) return;
    const axis = new Vector3(0, 1, 0);
    const across = Vector3.Cross(frame.normal, axis).normalize();
    const extent = Math.max(frame.extent.y * 0.34, 0.025);
    const path = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8 - 0.5;
      const zigzag = Math.sin(i * 1.7) * Math.min(extent * 0.035, 0.004);
      path.push(
        frame.point
          .add(axis.scale(t * extent * 2))
          .add(across.scale(zigzag))
          .add(frame.normal.scale(0.004))
      );
    }
    const line = MeshBuilder.CreateTube('PathologyLongitudinalFracture', {
      path, radius: width, tessellation: 6
    }, scene);
    line.parent = root;
    line.material = material(key);
    line.isPickable = false;
  }

  function addCavity(root, frame, severity, progression, key = 'cariesCore', options = {}) {
    if (!frame) return;
    const size = (options.size ?? 0.075) + severity * 0.012 + progression * 0.055;
    // A thin irregular brown transition zone surrounds the excavated centre;
    // the dark floor is set slightly into the tooth rather than floating above it.
    spherePatch(root, frame, 'cariesRim', size * 1.22, 0.025, 0.94, 0.001);
    spherePatch(root, frame, key, size * 0.72, 0.014, 0.96, 0.003);
    if (options.dentinFloor) {
      spherePatch(root, frame, 'dentin', size * 0.34, 0.012, 0.92, 0.005);
    }
    if (progression > 0.72 && options.fracturedEdge !== false) {
      addCrack(root, frame, 'fracture', 0.0035 + severity * 0.0008);
    }
  }

  function addSurfaceStriae(root, frame, count = 5, key = 'enamelDefect', width = 0.0025) {
    if (!root || !frame) return;
    const nAxis = frame.normal.x ? 'x' : frame.normal.y ? 'y' : 'z';
    const tangentA = nAxis === 'x' ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
    const tangentB = Vector3.Cross(frame.normal, tangentA).normalize();
    const radius = Math.max(Math.min(frame.extent.x, frame.extent.z) * 0.3, 0.02);
    for (let row = 0; row < count; row++) {
      const offset = (row - (count - 1) / 2) * radius * 0.18;
      const path = [];
      for (let step = 0; step <= 10; step++) {
        const t = step / 10 - 0.5;
        const wave = Math.sin(step * 0.72 + row * 0.9) * radius * 0.025;
        path.push(
          frame.point
            .add(tangentA.scale(t * radius * 1.5))
            .add(tangentB.scale(offset + wave))
            .add(frame.normal.scale(0.0035))
        );
      }
      const line = MeshBuilder.CreateTube('PathologyStria', {
        path, radius: width, tessellation: 5
      }, scene);
      line.parent = root;
      line.material = material(key, 0.92);
      line.isPickable = false;
    }
  }

  function addDenticles(root, frame, count, key = 'boneDensity') {
    if (!root || !frame) return;
    const nAxis = frame.normal.x ? 'x' : frame.normal.y ? 'y' : 'z';
    const tangentA = nAxis === 'x' ? 'y' : 'x';
    const tangentB = nAxis === 'z' ? 'y' : 'z';
    const spanA = Math.max(frame.extent[tangentA] * 0.2, 0.025);
    const spanB = Math.max(frame.extent[tangentB] * 0.16, 0.02);
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399963229728653;
      const radius = 0.18 + 0.65 * Math.sqrt((i + 1) / count);
      const denticle = MeshBuilder.CreateSphere('PathologyDenticle', {
        segments: 14, diameter: 1
      }, scene);
      denticle.parent = root;
      denticle.position.copyFrom(frame.point);
      denticle.position[tangentA] += Math.cos(angle) * spanA * radius;
      denticle.position[tangentB] += Math.sin(angle) * spanB * radius;
      denticle.position.addInPlace(frame.normal.scale(0.008));
      const size = Math.max(Math.min(spanA, spanB) * (0.16 + 0.07 * (i % 3)), 0.006);
      denticle.scaling.set(size * 0.8, size * (1.15 + 0.2 * (i % 2)), size * 0.65);
      denticle.material = material(key);
      denticle.isPickable = false;
    }
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
    const enamel = parts.find(mesh => records[mesh.name]?.layer === 'enamel');
    const prosthetic = parts.find(mesh => records[mesh.name]?.layer === 'prosthetic');
    // In the scanned patient, two teeth were restored with full-contour crowns
    // and their natural enamel is absent. The restoration is the visible outer
    // tooth surface and therefore must receive surface lesions and highlights.
    const outerSurface = enamel || prosthetic || base;
    const pulp = parts.find(mesh => records[mesh.name]?.layer === 'pulp');
    const gum = getGingivaMesh(context, tooth);
    const bone = getJawBoneMesh(context, tooth);
    const severity = state.severity;
    const progression = state.stage.progression;
    const condition = state.condition;
    const visual = condition.visual;
    const root = makeRoot(outerSurface, 'Pathology_' + condition.id + '_' + state.caseId, state);
    if (!root) return;
    const surface = visual.includes('root') || visual.includes('resorption') ? 'cervical' :
      visual.includes('wear') || visual.includes('attrition') ? 'occlusal' : 'buccal';
    const frame = surfaceFrame(outerSurface, tooth, surface);
    const surfaceTargets = parts.filter(mesh => {
      const layer = records[mesh.name]?.layer;
      return layer === 'teeth' || layer === 'enamel' || layer === 'prosthetic';
    });

    switch (visual) {
      case 'white-spot':
        // Initial caries is a subsurface optical change, not a hole.
        spherePatch(root, frame, 'chalk', 0.12 + progression * 0.045, 0.012, 0.66);
        if (enamel) setTint(enamel, 'chalk', 0.12 + progression * 0.08);
        break;
      case 'caries':
      case 'root-caries':
      case 'recurrent-caries':
      case 'rampant-caries':
      case 'arrested-caries':
        {
          const cariesFrame = visual === 'root-caries'
            ? surfaceFrame(base || outerSurface, tooth, 'cervical')
            : visual === 'caries' && condition.id === 'enamel-caries'
              ? surfaceFrame(outerSurface, tooth, 'occlusal')
              : frame;
          const arrested = visual === 'arrested-caries';
          const targetLayers = visual === 'root-caries' ? ['teeth'] :
            ['teeth', 'enamel', 'prosthetic'];
          addCavity(root, cariesFrame, severity, progression,
            arrested ? 'rootCaries' : visual === 'root-caries' ? 'rootCaries' : 'cariesCore',
            { dentinFloor: targetLayers.includes('teeth') && condition.id !== 'enamel-caries',
              fracturedEdge: !arrested });
          deformToothSurface(parts, records, sourceId, enamel || base, cariesFrame, {
            layers: targetLayers,
            factor: arrested ? 0.09 : condition.id === 'enamel-caries'
              ? 0.1 + progression * 0.045 : 0.14 + progression * 0.12,
            depthRatio: arrested ? 0.025 : condition.id === 'enamel-caries'
              ? 0.025 + progression * 0.045 : 0.075 + progression * 0.17,
            surfaceBandRatio: 0.34,
            profile: 'crater',
            irregularity: 0.12
          });
          if (visual === 'root-caries') {
            spherePatch(root, cariesFrame, 'rootCaries', 0.13 + progression * 0.04, 0.022, 0.9);
          }
          if (visual === 'recurrent-caries') {
            const margin = parts.find(mesh => records[mesh.name]?.layer === 'prosthetic');
            if (margin) {
              const marginFrame = surfaceFrame(margin, tooth, 'cervical');
              spherePatch(root, marginFrame, 'cariesRim', 0.11 + progression * 0.04, 0.016, 0.88);
            }
          }
          if (visual === 'rampant-caries') {
            const secondFrame = surfaceFrame(outerSurface, tooth, 'lingual');
            addCavity(root, secondFrame, severity, progression, 'cariesCore');
            deformToothSurface(parts, records, sourceId, enamel || base, secondFrame, {
              factor: 0.12 + progression * 0.1,
              depthRatio: 0.1 + progression * 0.16,
              surfaceBandRatio: 0.34,
              profile: 'crater',
              irregularity: 0.1
            });
          }
        }
        break;
      case 'deep-caries':
        addCavity(root, frame, severity + 1, progression, 'cariesCore', { dentinFloor: true });
        deformToothSurface(parts, records, sourceId, enamel || base, frame, {
          factor: 0.2 + progression * 0.1,
          depthRatio: 0.24 + progression * 0.22,
          surfaceBandRatio: 0.42,
          profile: 'crater',
          irregularity: 0.16
        });
        if (pulp) setTint(pulp, 'pulp', 0.5 + progression * 0.38);
        break;
      case 'pulpitis-reversible':
        if (pulp) {
          setTint(pulp, 'pulp', 0.35 + severity * 0.07);
          deformSurface(pulp, [pulp], surfaceFrame(pulp, tooth, 'apical'), {
            factor: 0.13, depthRatio: 0.035, mode: 'raise', profile: 'lobulated',
            surfaceBandRatio: 0.5, normalCheck: false
          });
        }
        break;
      case 'pulpitis-irreversible':
        if (pulp) {
          setTint(pulp, 'abscess', 0.58 + progression * 0.28);
          deformSurface(pulp, [pulp], surfaceFrame(pulp, tooth, 'apical'), {
            factor: 0.17 + progression * 0.04, depthRatio: 0.06 + severity * 0.008,
            mode: 'raise', profile: 'lobulated', surfaceBandRatio: 0.55, normalCheck: false
          });
        }
        break;
      case 'pulp-necrosis':
        if (pulp) setTint(pulp, 'necrosis', 0.95);
        addApicalLesion(root, surfaceFrame(base || outerSurface, tooth, 'apical'), state, 'apical');
        break;
      case 'pulp-polyp':
        if (pulp) setTint(pulp, 'polyp', 0.95);
        spherePatch(root, surfaceFrame(outerSurface, tooth, 'occlusal'), 'polyp', 0.13 + progression * 0.05, 0.045, 0.96, 0.012);
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
          const apical = surfaceFrame(base || outerSurface, tooth, 'apical');
          const key = visual === 'condensing-osteitis' ? 'boneDensity' :
            visual === 'apical-abscess' || visual === 'chronic-apical-abscess' ? 'abscess' :
            visual === 'periapical-cyst' ? 'ulcer' : 'apical';
          addApicalLesion(root, apical, state, key);
          if (visual === 'condensing-osteitis') {
            modifyAlveolarBoneAtTooth(context, tooth, base || enamel, apical, {
              mode: 'raise', profile: 'lobulated', factor: 0.14 + progression * 0.05,
              depthRatio: 0.08, tint: 'boneDensity', tintStrength: 0.48
            });
          } else {
            modifyAlveolarBoneAtTooth(context, tooth, base || enamel, apical, {
              mode: 'loss', profile: 'crater', factor: 0.16 + progression * 0.08,
              depthRatio: 0.06 + severity * 0.012, irregularity: 0.1
            });
          }
          if (visual === 'apical-abscess' || visual === 'chronic-apical-abscess') {
            spherePatch(root, apical, 'pus', 0.06 + progression * 0.03, 0.035, 0.95, 0.012);
            modifyGingivaAtTooth(context, tooth, base || enamel,
              surfaceFrame(base || outerSurface, tooth, 'cervical'), {
                mode: 'raise', profile: 'lobulated', factor: 0.13 + progression * 0.06,
                depthRatio: 0.08, tint: 'gingiva', tintStrength: 0.42
              });
          }
          if (visual === 'chronic-apical-abscess') {
            const sinusFrame = surfaceFrame(base || enamel, tooth, 'cervical');
            spherePatch(root, sinusFrame, 'pus', 0.035, 0.018, 0.96, 0.01);
          }
        }
        break;
      case 'internal-resorption':
        {
          const internalFrame = surfaceFrame(pulp || base, tooth, 'apical');
          spherePatch(root, internalFrame, 'rootCaries', 0.12 + progression * 0.08, 0.12, 0.9);
          if (pulp) {
            deformSurface(pulp, [pulp], internalFrame, {
              factor: 0.14 + progression * 0.08,
              depthRatio: 0.12 + severity * 0.035,
              surfaceBandRatio: 0.42
            });
            setTint(pulp, 'abscess', 0.65);
          }
        }
        break;
      case 'hypercementosis': {
        const apicalFrame = surfaceFrame(base || outerSurface, tooth, 'apical');
        spherePatch(root, apicalFrame, 'boneDensity', 0.11 + progression * 0.035, 0.08, 0.96, 0.008);
        deformToothSurface(parts, records, sourceId, base || enamel, apicalFrame, {
          layers: ['teeth'], mode: 'raise', profile: 'lobulated',
          factor: 0.14 + progression * 0.04, depthRatio: 0.12 + severity * 0.015,
          surfaceBandRatio: 0.55, normalCheck: false
        });
        break;
      }
      case 'taurodontism':
        if (pulp) {
          setTint(pulp, 'pulp', 0.55);
          spherePatch(root, surfaceFrame(pulp, tooth, 'apical'), 'pulp', 0.16 + progression * 0.05, 0.18, 0.9);
        }
        break;
      case 'root-resorption':
      case 'external-cervical-resorption':
      case 'cervical-resorption':
      case 'external-inflammatory-resorption':
      case 'inflammatory-root-resorption':
      case 'vertical-root-fracture':
        {
          const rootFrame = surfaceFrame(base || outerSurface, tooth,
            visual === 'external-cervical-resorption' || visual === 'cervical-resorption' ? 'cervical' : 'apical');
          if (visual === 'vertical-root-fracture') {
            addLongitudinalCrack(root, rootFrame, 'crack', 0.006 + severity * 0.001);
            deformToothSurface(parts, records, sourceId, base || enamel, rootFrame, {
              layers: ['teeth'], profile: 'groove',
              factor: 0.11 + progression * 0.06, depthRatio: 0.08 + severity * 0.025,
              surfaceBandRatio: 0.54
            });
          } else {
            spherePatch(root, rootFrame, 'rootCaries', 0.13 + progression * 0.06, 0.025, 0.92);
            deformToothSurface(parts, records, sourceId, base || enamel, rootFrame, {
              layers: ['teeth'],
              factor: 0.13 + progression * 0.1,
              depthRatio: 0.12 + progression * 0.2,
              surfaceBandRatio: 0.42,
              profile: 'crater',
              irregularity: visual === 'inflammatory-root-resorption' ? 0.22 : 0.12
            });
            if (visual === 'inflammatory-root-resorption') {
              tintLayer(parts, records, sourceId, 'pdl', 'abscess', 0.52);
              modifyAlveolarBoneAtTooth(context, tooth, base || enamel, rootFrame, {
                mode: 'loss', profile: 'crater', factor: 0.12, depthRatio: 0.06
              });
            }
          }
        }
        break;
      case 'replacement-resorption':
        {
          const apical = surfaceFrame(base || outerSurface, tooth, 'apical');
          tintLayer(parts, records, sourceId, 'pdl', 'boneDensity', 0.75);
          spherePatch(root, apical, 'boneDensity', 0.16 + progression * 0.07, 0.2, 0.95, 0.006);
          clusteredDots(root, apical, 'boneDensity', 10 + severity * 3, 0.2);
          deformToothSurface(parts, records, sourceId, base || enamel, apical, {
            factor: 0.11 + progression * 0.05, depthRatio: 0.08 + progression * 0.12
          });
        }
        break;
      case 'transient-apical-breakdown':
      case 'periapical-scar':
        {
          const apical = surfaceFrame(base || enamel, tooth, 'apical');
          spherePatch(root, apical, visual === 'periapical-scar' ? 'dentin' : 'apical',
            visual === 'periapical-scar' ? 0.1 : 0.14, 0.045, 0.58, 0.006);
          tintLayer(parts, records, sourceId, 'pdl', visual === 'periapical-scar' ? 'dentin' : 'gingiva', 0.32);
        }
        break;
      case 'canal-obliteration':
        if (pulp) {
          setTint(pulp, 'boneDensity', 0.72);
          clusteredDots(root, surfaceFrame(pulp, tooth, 'apical'), 'boneDensity', 16 + severity * 3, 0.19);
        }
        break;
      case 'root-canal-obturation':
        makeCanalFill(root, pulp, tooth);
        if (pulp) setTint(pulp, 'dentin', 0.26);
        break;
      case 'plaque': {
        const cervical = surfaceFrame(outerSurface, tooth, 'cervical');
        spherePatch(root, cervical, 'plaque', 0.2 + progression * 0.04, 0.012, 0.32, 0.006);
        clusteredDots(root, cervical, 'plaque', 12 + severity * 3, 0.24 + progression * 0.06);
        break;
      }
      case 'calculus': {
        const cervical = surfaceFrame(outerSurface, tooth, 'cervical');
        clusteredDots(root, cervical, 'calculus', 8 + severity * 3, 0.22 + progression * 0.08);
        spherePatch(root, cervical, 'calculus', 0.12 + progression * 0.055, 0.075, 0.96, 0.009);
        // A hard mineralized ledge hugs the cervical/root surface instead of
        // resembling a scatter of identical round beads.
        deformToothSurface(parts, records, sourceId, base || enamel, cervical, {
          layers: ['teeth'], mode: 'raise', profile: 'ridge', factor: 0.16,
          depthRatio: 0.035 + severity * 0.004, surfaceBandRatio: 0.38
        });
        break;
      }
      case 'pericoronitis':
        {
          const cervical = surfaceFrame(outerSurface, tooth, 'cervical');
          modifyGingivaAtTooth(context, tooth, enamel || base, cervical, {
            mode: 'raise', profile: 'lobulated', factor: 0.22 + progression * 0.06,
            depthRatio: 0.13 + severity * 0.012, tint: 'gingiva', tintStrength: 0.62
          });
          spherePatch(root, cervical, 'gingiva', 0.18 + progression * 0.05, 0.12, 0.88, 0.009);
          spherePatch(root, cervical, 'ulcer', 0.055 + severity * 0.01, 0.025, 0.92, 0.014);
          if (progression > 0.6) spherePatch(root, cervical, 'pus', 0.045 + severity * 0.008, 0.025, 0.9, 0.017);
        }
        break;
      case 'gingivitis':
      case 'necrotizing-gingivitis':
      case 'necrotizing-periodontitis':
      case 'periodontal-abscess':
      case 'periodontitis':
      case 'endo-perio':
      case 'mucogingival-defect':
      case 'traumatic-occlusal-injury':
      case 'occlusal-trauma':
        {
          const cervical = surfaceFrame(outerSurface, tooth, 'cervical');
          const rootAxis = new Vector3(0, tooth.arch === 'maxillary' ? 1 : -1, 0);

          if (visual === 'traumatic-occlusal-injury' || visual === 'occlusal-trauma') {
            // Occlusal overload is expressed in the periodontal ligament and
            // supporting bone, not as an invented fracture line on the crown.
            tintLayer(parts, records, sourceId, 'pdl', 'abscess', 0.42 + progression * 0.16);
            if (bone) modifyAlveolarBoneAtTooth(context, tooth, base || enamel, cervical, {
              mode: 'raise', profile: 'smooth', factor: 0.12,
              depthRatio: 0.035 + severity * 0.006, tint: 'boneDensity', tintStrength: 0.22
            });
            break;
          }

          const necrotizing = visual === 'necrotizing-gingivitis' || visual === 'necrotizing-periodontitis';
          const abscess = visual === 'periodontal-abscess';
          const gingivalColor = necrotizing ? 'gingivaDark' : 'gingiva';
          const swelling = visual === 'gingivitis' || abscess || necrotizing;
          if (swelling) {
            modifyGingivaAtTooth(context, tooth, enamel || base, cervical, {
              mode: 'raise', profile: 'lobulated',
              factor: 0.17 + progression * 0.07,
              depthRatio: (necrotizing ? 0.04 : 0.075) + severity * 0.009,
              tint: gingivalColor, tintStrength: necrotizing ? 0.7 : 0.56
            });
            spherePatch(root, cervical, gingivalColor, 0.14 + progression * 0.055, 0.11, 0.62, 0.007);
          }
          if (abscess) {
            spherePatch(root, cervical, 'pus', 0.055 + progression * 0.025, 0.025, 0.96, 0.014);
            clusteredDots(root, cervical, 'pus', 4 + severity, 0.08);
          }
          if (necrotizing) {
            // Interdental papillae become cratered and covered by a grey-yellow
            // pseudomembrane; the gingival proxy carries the local tissue loss.
            modifyGingivaAtTooth(context, tooth, enamel || base, cervical, {
              mode: 'loss', profile: 'crater', factor: 0.13 + progression * 0.04,
              depthRatio: 0.12 + severity * 0.015, tint: 'gingivaDark', tintStrength: 0.5
            });
            spherePatch(root, cervical, 'ulcer', 0.12 + progression * 0.03, 0.03, 0.96, 0.012);
            clusteredDots(root, cervical, 'ulcer', 5 + severity, 0.1);
          }
          if (visual === 'periodontitis' || visual === 'necrotizing-periodontitis' || visual === 'endo-perio') {
            const stageFactor = visual === 'periodontitis' ? progression : Math.min(1, progression * 1.12);
            modifyGingivaAtTooth(context, tooth, enamel || base, cervical, {
              mode: 'raise', profile: 'smooth', factor: 0.16 + stageFactor * 0.08,
              depthRatio: 0.035 + stageFactor * 0.035,
              directionVector: rootAxis, tint: 'gingiva', tintStrength: 0.32
            });
            modifyAlveolarBoneAtTooth(context, tooth, base || enamel, cervical, {
              mode: 'loss', profile: 'wedge', factor: 0.18 + stageFactor * 0.08,
              depthRatio: 0.09 + stageFactor * 0.16, irregularity: 0.08,
              tint: 'boneLoss', tintStrength: 0.24
            });
            tintLayer(parts, records, sourceId, 'pdl', 'gingivaDark', 0.25 + stageFactor * 0.32);
          }
          if (visual === 'endo-perio') {
            const apical = surfaceFrame(base || enamel, tooth, 'apical');
            addApicalLesion(root, apical, state, 'apical');
            modifyAlveolarBoneAtTooth(context, tooth, base || enamel, apical, {
              mode: 'loss', profile: 'crater', factor: 0.13 + progression * 0.08,
              depthRatio: 0.07 + progression * 0.08
            });
          }
          if (visual === 'mucogingival-defect') {
            modifyGingivaAtTooth(context, tooth, enamel || base, cervical, {
              mode: 'raise', profile: 'smooth', factor: 0.18,
              depthRatio: 0.16 + progression * 0.08,
              directionVector: rootAxis
            });
            deformToothSurface(parts, records, sourceId, enamel || base, cervical, {
              layers: ['enamel'], factor: 0.11 + progression * 0.06,
              depthRatio: 0.04, profile: 'crater'
            });
          }
        }
        break;
      case 'recession': {
        const cervical = surfaceFrame(outerSurface, tooth, 'cervical');
        const rootAxis = new Vector3(0, tooth.arch === 'maxillary' ? 1 : -1, 0);
        modifyGingivaAtTooth(context, tooth, enamel || base, cervical, {
          mode: 'raise', profile: 'smooth', factor: 0.2,
          depthRatio: 0.14 + progression * 0.12,
          directionVector: rootAxis, tint: 'gingiva', tintStrength: 0.18
        });
        deformToothSurface(parts, records, sourceId, enamel || base, cervical, {
          layers: ['enamel'], profile: 'crater',
          factor: 0.16 + progression * 0.05, depthRatio: 0.04
        });
        spherePatch(root, cervical, 'dentin', 0.13 + progression * 0.06, 0.018, 0.82, 0.003);
        break;
      }
      case 'furcation': {
        const furcationFrame = surfaceFrame(base || outerSurface, tooth, 'lingual');
        modifyAlveolarBoneAtTooth(context, tooth, base || enamel, furcationFrame, {
          mode: 'loss', profile: 'wedge', factor: 0.21 + progression * 0.08,
          depthRatio: 0.15 + progression * 0.12, irregularity: 0.1,
          tint: 'boneLoss', tintStrength: 0.24
        });
        spherePatch(root, furcationFrame, 'boneLoss', 0.13 + progression * 0.08, 0.035, 0.85, 0.004);
        break;
      }
      case 'erosion':
      case 'attrition':
      case 'abrasion':
      case 'abfraction':
      case 'hypersensitivity':
        {
          const targetSurface = visual === 'erosion' || visual === 'attrition' ? 'occlusal' : 'cervical';
          const wearFrame = surfaceFrame(outerSurface, tooth, targetSurface);
          const key = visual === 'hypersensitivity' ? 'hypersensitivity' :
            visual === 'erosion' || visual === 'attrition' ? 'dentin' : 'wear';
          spherePatch(root, wearFrame, key,
            visual === 'attrition' ? 0.3 : 0.16 + progression * 0.12,
            0.018, visual === 'hypersensitivity' ? 0.62 : 0.9, 0.003);
          if (visual !== 'hypersensitivity') {
            deformToothSurface(parts, records, sourceId, enamel || base, wearFrame, {
              layers: visual === 'abrasion' || visual === 'abfraction' ? ['enamel', 'teeth'] : ['enamel', 'teeth'],
              factor: visual === 'attrition' ? 0.34 : visual === 'erosion' ? 0.26 : 0.17 + progression * 0.07,
              depthRatio: visual === 'attrition' ? 0.13 + progression * 0.12 :
                visual === 'erosion' ? 0.055 + progression * 0.07 : 0.075 + progression * 0.09,
              surfaceBandRatio: 0.5,
              profile: visual === 'abrasion' ? 'groove' : visual === 'abfraction' ? 'wedge' : 'crater',
              irregularity: visual === 'erosion' ? 0.04 : visual === 'abfraction' ? 0.14 : 0.08
            });
          }
          if (visual === 'abrasion' || visual === 'abfraction') {
            addCrack(root, wearFrame, 'wear', 0.004);
          }
          if (visual === 'erosion') {
            const lingual = surfaceFrame(outerSurface, tooth, 'lingual');
            deformToothSurface(parts, records, sourceId, enamel || base, lingual, {
              factor: 0.18, depthRatio: 0.045, profile: 'crater', irregularity: 0.035
            });
          }
        }
        break;
      case 'crack':
        addCrack(root, surfaceFrame(outerSurface, tooth, 'occlusal'), 'crack', 0.009 + severity * 0.002);
        if (progression > 0.75) spherePatch(root, frame, 'dentin', 0.055, 0.025);
        break;
      case 'crown-fracture':
      case 'complicated-fracture':
      case 'crown-root-fracture':
      case 'root-fracture':
        {
          const fractureSurface = visual === 'root-fracture' ? 'apical' : 'occlusal';
          const fractureFrame = surfaceFrame(outerSurface, tooth, fractureSurface);
          addCrack(root, fractureFrame, 'fracture', 0.012 + severity * 0.002);
          spherePatch(root, surfaceFrame(outerSurface, tooth, 'occlusal'), 'dentin', 0.09 + progression * 0.06, 0.025);
          deformToothSurface(parts, records, sourceId, enamel || base, fractureFrame, {
            factor: 0.08 + progression * 0.08,
            depthRatio: 0.06 + severity * 0.025,
            surfaceBandRatio: 0.34
          });
        }
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
      case 'canal-obliteration':
      case 'root-canal-obturation':
      case 'periapical-scar':
      case 'replacement-resorption':
      case 'transient-apical-breakdown':
      case 'external-cervical-resorption':
      case 'external-inflammatory-resorption':
      case 'endo-perio':
      case 'necrotizing-periodontitis':
      case 'mucogingival-defect':
      case 'traumatic-occlusal-injury':
      case 'hypodontia':
      case 'missing-tooth':
      case 'supernumerary-tooth':
      case 'macrodontia':
      case 'fusion':
      case 'gemination':
      case 'dilaceration':
      case 'impacted-tooth':
      case 'ectopic-eruption':
      case 'enamel-pearl':
        {
          const key = visual === 'discoloration' || visual === 'dentinogenesis-imperfecta' ? 'dentin' : 'enamelDefect';
          const count = visual === 'fluorosis' ? 5 : visual === 'amelogenesis-imperfecta' ? 14 : visual === 'mih' ? 5 : 4;
          if (visual === 'enamel-hypoplasia') {
            addSurfaceStriae(root, frame, 3 + severity, 'enamelDefect', 0.0028);
            deformToothSurface(parts, records, sourceId, enamel || base, frame, {
              layers: ['enamel'], profile: 'groove', factor: 0.26,
              depthRatio: 0.035 + progression * 0.02, surfaceBandRatio: 0.48
            });
          } else if (visual === 'mih') {
            spherePatch(root, frame, 'enamelDefect', 0.19 + progression * 0.04, 0.014, 0.82);
            spherePatch(root, frame, 'dentin', 0.095 + progression * 0.025, 0.01, 0.54, 0.004);
          } else if (visual === 'fluorosis') {
            addSurfaceStriae(root, frame, 5 + severity, 'chalk', 0.002);
            spherePatch(root, frame, 'chalk', 0.2 + progression * 0.05, 0.008, 0.38);
          } else if (visual === 'amelogenesis-imperfecta') {
            if (enamel) setTint(enamel, 'enamelDefect', 0.42 + progression * 0.18);
            clusteredDots(root, frame, key, count + severity * 2, 0.3);
            deformToothSurface(parts, records, sourceId, enamel || base, frame, {
              layers: ['enamel'], profile: 'lobulated', factor: 0.34,
              depthRatio: 0.025 + progression * 0.025, surfaceBandRatio: 0.62,
              irregularity: 0.1
            });
          } else {
            clusteredDots(root, frame, key, count + severity * 2, 0.22 + progression * 0.07);
          }
          if (visual === 'dens-invaginatus') {
            const invagination = surfaceFrame(outerSurface, tooth, 'incisal');
            deformToothSurface(parts, records, sourceId, enamel || base, invagination, {
              layers: ['enamel', 'teeth'], profile: 'crater', factor: 0.12,
              depthRatio: 0.18 + progression * 0.08, irregularity: 0.06
            });
            spherePatch(root, invagination, 'crack', 0.055, 0.026, 0.9, 0.004);
          }
          if (visual === 'dens-evaginatus') {
            const cusp = surfaceFrame(outerSurface, tooth, 'occlusal');
            spherePatch(root, cusp, 'enamelDefect', 0.075, 0.13, 0.96, 0.014);
            deformToothSurface(parts, records, sourceId, enamel || base, cusp, {
              layers: ['teeth', 'enamel'], mode: 'raise', profile: 'lobulated',
              factor: 0.11, depthRatio: 0.18 + progression * 0.05
            });
          }
          if (visual === 'dentinogenesis-imperfecta' && base) {
            setTint(base, 'dentin', 0.72);
            if (enamel) setTint(enamel, 'dentin', 0.2);
          }
          if (visual === 'discoloration' && enamel) {
            setTint(enamel, 'dentin', 0.28 + severity * 0.08);
          }
          if (visual === 'microdontia') changeToothScale(parts, 0.84 - progression * 0.08, base || enamel);
          if (visual === 'macrodontia') changeToothScale(parts, 1.08 + progression * 0.1, base || enamel);
          if (visual === 'fusion') {
            changeToothScale(parts, 1.14 + progression * 0.05, base || enamel);
            addCrack(root, surfaceFrame(outerSurface, tooth, 'incisal'), 'dentin', 0.004);
          }
          if (visual === 'gemination') {
            changeToothScale(parts, 1.12 + progression * 0.06, base || enamel);
            addCrack(root, surfaceFrame(outerSurface, tooth, 'incisal'), 'fracture', 0.006);
          }
          if (visual === 'dilaceration') bendToothRoot(parts, tooth, 0.02 + progression * 0.03);
          if (visual === 'hypodontia' || visual === 'missing-tooth') hideTooth(parts);
          if (visual === 'supernumerary-tooth') cloneTooth(parts, tooth, progression);
          if (visual === 'impacted-tooth' || visual === 'ectopic-eruption') {
            const extent = getBounds(base || enamel)?.extent || new Vector3(0.1, 0.2, 0.1);
            const rootSign = tooth.arch === 'maxillary' ? 1 : -1;
            const displacement = visual === 'impacted-tooth'
              ? new Vector3(0, rootSign * extent.y * (0.45 + progression * 0.45), 0)
              : new Vector3((tooth.side === 'right' ? -1 : 1) * extent.x * (0.3 + progression * 0.4), 0, extent.z * 0.28);
            moveTooth(parts, tooth, displacement);
          }
          if (visual === 'enamel-pearl') {
            const rootFrame = surfaceFrame(base || enamel, tooth, 'cervical');
            spherePatch(root, rootFrame, 'boneDensity', 0.11 + progression * 0.035, 0.2, 1, 0.012);
          }
        }
        break;
      default:
        markUnhandledVisual(root, visual);
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
    const severity = state.severity;
    const progression = state.stage.progression;
    const growth = 0.065 + severity * 0.018 + progression * 0.06;

    // Jaw lesions now alter the segmented cortical mesh as well as carrying a
    // surface/radiographic teaching cue. This is an illustrative local response,
    // not a patient-specific tumour boundary or a validated growth model.
    if (visual === 'dentigerous-cyst' || visual === 'nasopalatine-cyst' ||
        visual === 'lateral-periodontal-cyst' || visual === 'calcifying-odontogenic-cyst') {
      deformSurface(anchor, [anchor], frame, {
        mode: 'raise', profile: 'lobulated',
        factor: growth * 1.35, depthRatio: 0.1 + progression * 0.06,
        surfaceBandRatio: 0.72, irregularity: 0.08, normalCheck: false
      });
      deformSurface(anchor, [anchor], frame, {
        mode: 'loss', profile: 'crater',
        factor: growth * 0.78, depthRatio: 0.08 + progression * 0.05,
        surfaceBandRatio: 0.68, irregularity: 0.12, normalCheck: false
      });
      spherePatch(root, frame, 'boneCyst', growth * 1.35, 0.14, 0.78, 0.006);
      spherePatch(root, frame, 'ulcer', growth * 0.82, 0.08, 0.64, 0.014);
      if (visual === 'calcifying-odontogenic-cyst') {
        addDenticles(root, frame, 5 + severity * 2, 'boneDensity');
      }
      if (visual === 'nasopalatine-cyst') {
        // The nasopalatine lesion is midline; frame the visual at the midline
        // rather than the lateral offset used for unilateral jaw lesions.
        const midline = { ...frame, point: bounds.center.clone() };
        spherePatch(root, midline, 'boneCyst', growth * 0.92, 0.1, 0.76, 0.008);
      }
    } else if (visual === 'odontogenic-keratocyst') {
      deformSurface(anchor, [anchor], frame, {
        mode: 'raise', profile: 'smooth', factor: growth * 1.15,
        depthRatio: 0.075 + progression * 0.04,
        surfaceBandRatio: 0.82, normalCheck: false
      });
      deformSurface(anchor, [anchor], frame, {
        mode: 'loss', profile: 'crater', factor: growth * 0.72,
        depthRatio: 0.07 + progression * 0.04,
        surfaceBandRatio: 0.64, irregularity: 0.045, normalCheck: false
      });
      // A long, scalloped cavity better conveys the anteroposterior growth
      // pattern than a cluster of round surface beads.
      const elongated = { ...frame, extent: frame.extent.clone() };
      elongated.extent.x *= 1.6;
      elongated.extent.y *= 0.7;
      spherePatch(root, elongated, 'boneCyst', growth * 1.4, 0.12, 0.76, 0.008);
      for (let i = 0; i < 5; i++) {
        const scallop = { ...elongated, point: elongated.point.add(new Vector3((i - 2) * growth * 0.32, 0, 0)) };
        spherePatch(root, scallop, 'boneCyst', growth * 0.24, 0.08, 0.7, 0.01);
      }
    } else if (visual === 'ameloblastoma') {
      deformSurface(anchor, [anchor], frame, {
        mode: 'raise', profile: 'lobulated', factor: growth * 1.8,
        depthRatio: 0.15 + progression * 0.1,
        surfaceBandRatio: 0.8, irregularity: 0.1, normalCheck: false
      });
      for (let i = 0; i < 5 + severity; i++) {
        const f = {
          ...frame,
          point: frame.point.add(new Vector3(
            Math.cos(i * Math.PI * 2 / (5 + severity)) * bounds.extent.x * growth * 1.2,
            Math.sin(i * Math.PI * 2 / (5 + severity)) * bounds.extent.y * growth * 0.7,
            0.012
          ))
        };
        spherePatch(root, f, 'boneCyst', growth * 0.48, 0.12, 0.85, 0.012);
      }
      spherePatch(root, frame, 'boneTumor', growth * 1.35, 0.16, 0.48, 0.01);
    } else if (visual === 'odontoma') {
      deformSurface(anchor, [anchor], frame, {
        mode: 'raise', profile: 'lobulated', factor: growth * 1.15,
        depthRatio: 0.08 + progression * 0.05,
        surfaceBandRatio: 0.72, normalCheck: false
      });
      spherePatch(root, frame, 'boneDensity', growth * 1.2, 0.13, 0.82, 0.01);
      addDenticles(root, frame, 7 + severity * 2, 'boneDensity');
    } else if (visual === 'cemento-osseous-dysplasia') {
      if (progression < 0.4) {
        spherePatch(root, frame, 'boneCyst', growth * 1.12, 0.08, 0.56, 0.004);
      } else if (progression < 0.82) {
        spherePatch(root, frame, 'boneCyst', growth * 1.08, 0.08, 0.6, 0.004);
        clusteredDots(root, frame, 'boneDensity', 8 + severity * 2, growth * 0.82);
      } else {
        setTint(anchor, 'boneDensity', 0.34);
        spherePatch(root, frame, 'boneDensity', growth * 1.4, 0.1, 0.76, 0.01);
        spherePatch(root, frame, 'boneCyst', growth * 0.92, 0.06, 0.36, 0.016);
        clusteredDots(root, frame, 'boneDensity', 16 + severity * 2, growth * 1.05);
      }
    } else if (visual === 'odontogenic-myxoma' || visual === 'giant-cell-granuloma') {
      deformSurface(anchor, [anchor], frame, {
        mode: 'raise', profile: 'lobulated', factor: growth * 1.75,
        depthRatio: 0.14 + progression * 0.08,
        surfaceBandRatio: 0.76, irregularity: 0.13, normalCheck: false
      });
      spherePatch(root, frame, 'boneTumor', growth * 1.58, 0.17, 0.7, 0.012);
      // Multiple radiolucent compartments / trabecular septa.
      for (let i = 0; i < 6 + severity; i++) {
        const f = {
          ...frame,
          point: frame.point.add(new Vector3(
            Math.cos(i * Math.PI / 3) * bounds.extent.x * growth * 1.05,
            Math.sin(i * Math.PI / 3) * bounds.extent.y * growth * 0.72,
            0.014
          ))
        };
        spherePatch(root, f, 'boneCyst', growth * (visual === 'odontogenic-myxoma' ? 0.32 : 0.43), 0.1, 0.84, 0.01);
      }
      if (visual === 'odontogenic-myxoma') {
        addSurfaceStriae(root, frame, 5 + severity, 'boneDensity', 0.003);
      }
    } else if (visual === 'fibrous-dysplasia') {
      deformSurface(anchor, [anchor], frame, {
        mode: 'raise', profile: 'smooth', factor: growth * 2.1,
        depthRatio: 0.12 + progression * 0.08,
        surfaceBandRatio: 0.9, normalCheck: false
      });
      setTint(anchor, 'boneDensity', 0.4 + progression * 0.12);
      spherePatch(root, frame, 'boneDensity', growth * 1.8, 0.28, 0.48, 0.008);
      clusteredDots(root, frame, 'boneDensity', 18 + severity * 2, growth * 1.18);
    } else {
      markUnhandledVisual(root, visual);
      deformSurface(anchor, [anchor], frame, {
        mode: 'raise', profile: 'lobulated', factor: growth,
        depthRatio: 0.08, surfaceBandRatio: 0.65, normalCheck: false
      });
      spherePatch(root, frame, 'boneCyst', growth, 0.12, 0.76, 0.006);
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
    const frame = {
      point: center,
      normal: new Vector3(0, 0, 0),
      extent: bounds.extent,
      min: bounds.min,
      max: bounds.max,
      center: bounds.center
    };
    // Mucosal disease is drawn on a selected gingival surface. The present CBCT
    // atlas does not contain tongue, cheek, lip or floor-of-mouth geometry.
    frame.normal.y = target === 'gum-lower' ? 1 : -1;
    const visual = state.condition.visual;
    const severity = state.severity;
    const progression = state.stage.progression;
    const localDeform = (mode, profile, factor, depthRatio, irregularity = 0) =>
      deformSurface(anchor, [anchor], frame, {
        mode, profile, factor, depthRatio, surfaceBandRatio: 0.42,
        irregularity, normalCheck: false
      });

    if (visual === 'aphthous') {
      spherePatch(root, frame, 'gingiva', 0.22 + severity * 0.022, 0.035, 0.76, 0.003);
      spherePatch(root, frame, 'ulcer', 0.115 + severity * 0.014, 0.018, 0.98, 0.008);
      localDeform('loss', 'crater', 0.18 + progression * 0.04, 0.09 + severity * 0.012, 0.08);
    } else if (visual === 'candidiasis') {
      setTint(anchor, 'mucosa', 0.28);
      spherePatch(root, frame, 'candidiasisWhite', 0.24 + progression * 0.05, 0.012, 0.78, 0.006);
      clusteredDots(root, frame, 'candidiasisWhite', 14 + severity * 3, 0.21);
      if (progression > 0.6) spherePatch(root, frame, 'mucosa', 0.15, 0.012, 0.55, 0.009);
    } else if (visual === 'leukoplakia') {
      spherePatch(root, frame, 'leukoplakiaWhite', 0.25 + progression * 0.07, 0.026, 0.9, 0.006);
      clusteredDots(root, frame, 'leukoplakiaWhite', 8 + severity * 2, 0.19);
      localDeform('raise', 'lobulated', 0.18 + progression * 0.05, 0.035 + severity * 0.008, 0.08);
    } else if (visual === 'lichen-planus') {
      spherePatch(root, frame, 'mucosa', 0.24, 0.012, 0.42, 0.005);
      addSurfaceStriae(root, frame, 9 + severity * 2, 'white', 0.003);
    } else if (visual === 'erythroplakia') {
      spherePatch(root, frame, 'mucosa', 0.24 + progression * 0.04, 0.008, 0.88, 0.004);
      localDeform('loss', 'smooth', 0.12, 0.018, 0.03);
    } else if (visual === 'herpes') {
      spherePatch(root, frame, 'herpes', 0.22 + progression * 0.05, 0.015, 0.86, 0.005);
      if (progression < 0.62) {
        clusteredDots(root, frame, 'herpes', 8 + severity * 2, 0.16);
      } else {
        clusteredDots(root, frame, 'ulcer', 7 + severity * 2, 0.15);
      }
    } else if (visual === 'oral-cancer') {
      spherePatch(root, frame, 'cancer', 0.21 + severity * 0.035, 0.16, 0.9, 0.009);
      localDeform('raise', 'lobulated', 0.22 + progression * 0.06, 0.15 + severity * 0.02, 0.2);
      localDeform('loss', 'crater', 0.09 + progression * 0.05, 0.1, 0.15);
      spherePatch(root, frame, 'fracture', 0.095 + progression * 0.025, 0.012, 0.9, 0.016);
    } else if (visual === 'noma') {
      setTint(anchor, 'gingivaDark', 0.72);
      spherePatch(root, frame, 'gingivaDark', 0.26 + severity * 0.04, 0.12, 0.88, 0.004);
      spherePatch(root, frame, 'fracture', 0.17 + progression * 0.04, 0.02, 0.96, 0.01);
      localDeform('loss', 'crater', 0.24 + progression * 0.06, 0.21 + severity * 0.035, 0.16);
    } else if (visual === 'alveolar-osteitis') {
      // Dry socket is represented as an empty post-extraction socket with
      // exposed bony walls, not as a pus-filled lesion.
      localDeform('loss', 'crater', 0.2 + progression * 0.05, 0.13 + severity * 0.015, 0.08);
      spherePatch(root, frame, 'alveolarBone', 0.17 + severity * 0.018, 0.018, 0.92, 0.012);
      spherePatch(root, frame, 'boneCyst', 0.09 + progression * 0.025, 0.012, 0.72, 0.017);
    } else if (visual === 'peri-implant-mucositis' || visual === 'implant-mucositis') {
      // No implant mesh is included in the current scan; only the soft-tissue
      // inflammatory response is shown here, explicitly as a tissue proxy.
      spherePatch(root, frame, 'gingiva', 0.24 + progression * 0.05, 0.1, 0.76, 0.008);
      localDeform('raise', 'lobulated', 0.19 + progression * 0.05, 0.1, 0.05);
    } else if (visual === 'peri-implantitis' || visual === 'implantitis') {
      spherePatch(root, frame, 'gingiva', 0.25 + progression * 0.05, 0.1, 0.84, 0.008);
      spherePatch(root, frame, 'boneLoss', 0.19 + progression * 0.05, 0.05, 0.82, -0.008);
      spherePatch(root, frame, 'abscess', 0.065 + severity * 0.01, 0.025, 0.86, 0.014);
      localDeform('raise', 'lobulated', 0.17, 0.095, 0.08);
    } else if (visual === 'gingival-enlargement') {
      spherePatch(root, frame, 'gingiva', 0.29 + progression * 0.06, 0.16, 0.78, 0.008);
      localDeform('raise', 'lobulated', 0.24 + progression * 0.04, 0.18 + severity * 0.02, 0.08);
    } else {
      markUnhandledVisual(root, visual);
      spherePatch(root, frame, 'gingiva', 0.24 + severity * 0.025, 0.08, 0.72, 0.006);
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
    unhandledVisuals.clear();
    for (const state of cases) applyCase(state, context);
    return {
      effects: effectRoots.length,
      unhandledVisuals: [...unhandledVisuals]
    };
  }

  function clear() {
    resetVisuals();
    unhandledVisuals.clear();
  }

  return { render, clear };
}
