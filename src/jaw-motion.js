/**
 * Resolve which anatomy meshes are physically attached to the mandibular unit.
 *
 * The source model stores dentin/tooth meshes with an `arch` property, while
 * enamel, pulp, PDL, lamina and restorations refer back to their host tooth via
 * `tooth`. Both forms must move together or the visible crown appears detached
 * when the jaw opens.
 */
export function isMandibularRecord(record, structures = {}) {
  if (!record) return false;
  if (record.arch === 'mandibular') return true;

  const hostTooth = record.tooth ? structures[record.tooth] : null;
  return hostTooth?.arch === 'mandibular';
}

/**
 * Return every mesh belonging to the mandible: lower teeth, all structures
 * attached to those teeth, mandibular bone/ramus, lower gingiva and the
 * explicitly identified inferior alveolar neurovascular structures.
 */
export function collectMandibularMeshes(meshes, structures = {}, lowerNeurovascularIds = new Set()) {
  return [...new Set(meshes.filter(mesh => {
    const record = structures[mesh.name];
    return isMandibularRecord(record, structures) ||
      record?.layer === 'mandible' ||
      record?.layer === 'ramus' ||
      mesh.name === 'FMA59764' ||
      lowerNeurovascularIds.has(mesh.name);
  }))];
}

function median(values) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function rotateAroundX(point, hinge, angleRadians) {
  const y = point.y - hinge.y;
  const z = point.z - hinge.z;
  const cosine = Math.cos(angleRadians);
  const sine = Math.sin(angleRadians);
  return {
    x: point.x,
    y: hinge.y + y * cosine - z * sine,
    z: hinge.z + y * sine + z * cosine
  };
}

/**
 * Find the small neutral correction that brings opposing incisal/occlusal
 * surfaces into contact before applying the user's requested opening angle.
 *
 * Each pair contains one upper and one lower occlusal surface point in the same
 * world coordinate frame. The scan can have been acquired with a slightly open
 * bite; treating the raw scan pose as "closed" leaves a visible anterior gap
 * even when the control says 0°. This robust median fit compensates for that
 * acquisition offset without changing the measured tooth geometry.
 *
 * The result angleRadians is a rotation about the world/model X axis. The caller
 * converts it to the UI's opening-angle sign convention.
 */
export function estimateClosedJawCorrection(pairs, hinge, options = {}) {
  const validPairs = (pairs || []).filter(pair =>
    Number.isFinite(pair?.upper?.y) &&
    Number.isFinite(pair?.lower?.y) &&
    Number.isFinite(pair?.lower?.z)
  );
  const targetGap = Math.max(0, Number(options.targetGap ?? 0.0025));
  const maxCorrectionRadians = Math.max(
    0,
    Math.min(35, Number(options.maxCorrectionDegrees ?? 25))
  ) * Math.PI / 180;

  const gapAt = angle => median(validPairs.map(pair => {
    const lower = rotateAroundX(pair.lower, hinge, angle);
    return pair.upper.y - lower.y;
  }));

  const initialGap = gapAt(0);
  if (!validPairs.length || !Number.isFinite(initialGap) || initialGap <= targetGap ||
      maxCorrectionRadians === 0) {
    return {
      angleRadians: 0,
      pairCount: validPairs.length,
      initialGap,
      residualGap: initialGap,
      calibrated: validPairs.length > 0
    };
  }

  // Search both rotation directions. The anterior arch can face +Z or -Z,
  // so a correct closing correction may be negative OR positive around X.
  let bestAngle = 0;
  let bestResidual = initialGap;
  let bestScore = Math.abs(initialGap - targetGap);
  const ranges = [
    [-maxCorrectionRadians, 0],
    [0, maxCorrectionRadians]
  ];

  for (const [startAngle, endAngle] of ranges) {
    const startGap = gapAt(startAngle);
    const endGap = gapAt(endAngle);
    if (!Number.isFinite(startGap) || !Number.isFinite(endGap)) continue;

    if ((startGap - targetGap) * (endGap - targetGap) <= 0) {
      let low = startAngle;
      let high = endAngle;
      let lowGap = startGap;
      for (let iteration = 0; iteration < 40; iteration++) {
        const mid = (low + high) / 2;
        const midGap = gapAt(mid);
        if (!Number.isFinite(midGap)) break;
        if (Math.abs(midGap - targetGap) < 1e-5) {
          low = mid;
          high = mid;
          break;
        }
        if ((lowGap - targetGap) * (midGap - targetGap) <= 0) {
          high = mid;
        } else {
          low = mid;
          lowGap = midGap;
        }
      }
      const candidateAngle = (low + high) / 2;
      const candidateGap = gapAt(candidateAngle);
      const candidateScore = Math.abs(candidateGap - targetGap);
      if (candidateScore < bestScore ||
          (Math.abs(candidateScore - bestScore) < 1e-7 && Math.abs(candidateAngle) < Math.abs(bestAngle))) {
        bestAngle = candidateAngle;
        bestResidual = candidateGap;
        bestScore = candidateScore;
      }
    } else {
      // The measured gap may exceed the safe correction range. Keep the
      // endpoint which reduces it most, rather than silently reporting zero.
      for (const candidateAngle of [startAngle, endAngle]) {
        const candidateGap = gapAt(candidateAngle);
        const candidateScore = Math.abs(candidateGap - targetGap);
        if (candidateScore < bestScore) {
          bestAngle = candidateAngle;
          bestResidual = candidateGap;
          bestScore = candidateScore;
        }
      }
    }
  }

  return {
    angleRadians: bestAngle,
    pairCount: validPairs.length,
    initialGap,
    residualGap: bestResidual,
    calibrated: true
  };
}
