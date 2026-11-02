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
