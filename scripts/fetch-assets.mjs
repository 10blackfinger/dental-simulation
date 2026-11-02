import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assetDir = join(root, 'public', 'models');
await mkdir(assetDir, { recursive: true });

// Remove locally cached assets for features that are no longer part of this clean baseline.
const retiredPaths = [
  'clinic-practice.glb',
  'ecorche-anatomy.glb',
  'patient-male.glb',
  'patient-female.glb',
  'ecorche-structures.json',
  'pediatric-dentition',
  'dental-scope'
];
for (const relativePath of retiredPaths) {
  await rm(join(assetDir, relativePath), { recursive: true, force: true });
}

const assets = [
  {
    file: 'oral-anatomy.glb',
    url: 'https://raw.githubusercontent.com/organui/teeth-3d/main/public/models/teeth.glb',
    format: 'glb',
    license: 'CC BY-SA 2.1 Japan',
    source: 'BodyParts3D / Anatomography 4.3, adapted by OrganUI',
    expectedSha256: '89a1074b0806eb41c318d38c78a269134c5070be7b90cb2f93ab2de7d35ec239',
    expectedMinBytes: 1000000
  }
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function isValid(file, spec) {
  try {
    const bytes = await readFile(file);
    if (bytes.length < spec.expectedMinBytes) return false;
    if (spec.format === 'glb' && bytes.subarray(0, 4).toString('ascii') !== 'glTF') return false;
    if (spec.expectedSha256 && sha256(bytes) !== spec.expectedSha256) return false;
    return true;
  } catch {
    return false;
  }
}

for (const asset of assets) {
  const destination = join(assetDir, asset.file);
  await mkdir(dirname(destination), { recursive: true });
  if (await isValid(destination, asset)) {
    console.log('[assets] verified existing ' + asset.file);
    continue;
  }
  try {
    console.log('[assets] fetching ' + asset.file);
    const response = await fetch(asset.url, { signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < asset.expectedMinBytes) {
      throw new Error('unexpected file size (' + buffer.length + ' bytes)');
    }
    if (asset.format === 'glb' && buffer.subarray(0, 4).toString('ascii') !== 'glTF') {
      throw new Error('file is not a binary glTF (GLB)');
    }
    const digest = sha256(buffer);
    if (asset.expectedSha256 && digest !== asset.expectedSha256) {
      throw new Error('SHA-256 mismatch: ' + digest);
    }
    await writeFile(destination, buffer);
    console.log('[assets] saved ' + asset.file + ' (' + buffer.length + ' bytes)');
  } catch (error) {
    console.warn('[assets] could not prepare ' + asset.file + ': ' + error.message);
    console.warn('[assets] the viewer will try the original CORS-enabled source and use its internal fallback if needed.');
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  note: 'Only the core oral-anatomy model is prepared in this clean baseline. The model licence and attribution are recorded in ASSET_CREDITS.md.',
  assets
};
await writeFile(join(assetDir, 'asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
