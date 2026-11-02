import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { mkdir, readFile, writeFile, stat, rm, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assetDir = join(root, 'public', 'models');
await mkdir(assetDir, { recursive: true });

// Pin the source revision: the CBCT-derived anatomy and its metadata must always
// come from the same reviewed source revision.
const clinicalSource = {
  repository: 'https://github.com/NateSaindon/3Dentes',
  revision: 'd0687f31049d93ad4403181acb2a4868dc49eb03',
  license: 'CC BY-NC 4.0',
  attribution: 'Anatomy from 3Dentes by Nate Saindon, CC BY-NC 4.0.'
};

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
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function prepareClinicalModel() {
  const modelDestination = join(assetDir, 'clinical-dentition.glb');
  const metadataDestination = join(assetDir, 'clinical-teeth.json');
  const modelValid = await isValid(modelDestination, { format: 'glb', expectedMinBytes: 1000000 });
  const metadataValid = await exists(metadataDestination) &&
    (await readFile(metadataDestination, 'utf8')).includes('"source": "cbct"');
  if (modelValid && metadataValid) {
    console.log('[assets] verified existing CBCT-derived dental atlas');
    return;
  }

  const checkout = join(tmpdir(), 'dental-simulation-3dentes-' + clinicalSource.revision.slice(0, 12));
  const sourceModel = join(checkout, 'public', 'dentition.glb');
  const sourceMetadata = join(checkout, 'public', 'teeth.json');

  try {
    if (!await exists(join(checkout, '.git'))) {
      await rm(checkout, { recursive: true, force: true });
      await mkdir(checkout, { recursive: true });
      console.log('[assets] fetching pinned CBCT anatomy source revision');
      await execFileAsync('git', ['init', '--quiet'], { cwd: checkout, timeout: 30000 });
      await execFileAsync('git', ['remote', 'add', 'origin', clinicalSource.repository + '.git'], {
        cwd: checkout, timeout: 30000
      });
      await execFileAsync('git', ['fetch', '--depth=1', 'origin', clinicalSource.revision], {
        cwd: checkout, timeout: 300000, maxBuffer: 10 * 1024 * 1024
      });
      await execFileAsync('git', ['checkout', '--detach', 'FETCH_HEAD'], {
        cwd: checkout, timeout: 30000
      });
    }

    const { stdout: checkedOutRevision } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: checkout, timeout: 30000
    });
    if (checkedOutRevision.trim() !== clinicalSource.revision) {
      throw new Error('The checked-out anatomy revision does not match the pinned revision.');
    }

    if (!await exists(join(checkout, 'node_modules'))) {
      console.log('[assets] installing the pinned anatomy builder dependencies');
      await execFileAsync('npm', ['ci', '--no-audit', '--no-fund'], {
        cwd: checkout, timeout: 600000, maxBuffer: 10 * 1024 * 1024
      });
    }

    // Babylon can load ordinary glTF directly. Emit standard GLB buffers here
    // rather than requiring a remote Meshopt decoder at run time.
    const builderPath = join(checkout, 'tools', 'build-assets.mjs');
    const builder = await readFile(builderPath, 'utf8');
    const compressionBlock = /  await MeshoptEncoder\\.ready;\\s+const io = new NodeIO\\(\\)\\s+\\.registerExtensions\\(\\[EXTMeshoptCompression, KHRMeshQuantization\\]\\)\\s+\\.registerDependencies\\(\\{ 'meshopt\\.encoder': MeshoptEncoder \\}\\);\\s+  await doc\\.transform\\(meshopt\\(\\{ encoder: MeshoptEncoder, level: 'high', quantizationVolume: 'mesh' \\}\\)\\);/;
    if (!builder.includes('DENTAL_SIMULATION_STANDARD_GLTF')) {
      const standardBuilder = builder.replace(
        compressionBlock,
        '  // DENTAL_SIMULATION_STANDARD_GLTF: keep the runtime asset decoder-independent.\\n  const io = new NodeIO();'
      );
      if (standardBuilder === builder) {
        throw new Error('Could not safely adapt the pinned GLB builder for standard glTF output.');
      }
      await writeFile(builderPath, standardBuilder);
    }

    if (!await isValid(sourceModel, { format: 'glb', expectedMinBytes: 1000000 }) ||
        !await exists(sourceMetadata)) {
      console.log('[assets] building the CBCT-derived tooth, gingiva and internal anatomy meshes');
      await execFileAsync('node', ['tools/build-assets.mjs'], {
        cwd: checkout, timeout: 600000, maxBuffer: 10 * 1024 * 1024
      });
    }

    if (!await isValid(sourceModel, { format: 'glb', expectedMinBytes: 1000000 })) {
      throw new Error('The CBCT model builder did not produce a valid GLB file.');
    }
    const parsedMetadata = JSON.parse(await readFile(sourceMetadata, 'utf8'));
    if (parsedMetadata.source !== 'cbct' || !parsedMetadata.structures || !parsedMetadata.layers) {
      throw new Error('The CBCT structure metadata is missing or malformed.');
    }

    await copyFile(sourceModel, modelDestination);
    await copyFile(sourceMetadata, metadataDestination);
    console.log('[assets] saved CBCT-derived model and ' +
      Object.keys(parsedMetadata.structures).length + ' anatomical structures');
  } catch (error) {
    console.warn('[assets] could not prepare the CBCT-derived model: ' + error.message);
    console.warn('[assets] the viewer will fall back to the existing oral anatomy model.');
  }
}

await prepareClinicalModel();

const manifest = {
  generatedAt: new Date().toISOString(),
  note: 'The preferred model is segmented from a consented CBCT scan. See ASSET_CREDITS.md for provenance, limitations and the non-commercial license.',
  clinicalSource,
  assets
};
await writeFile(join(assetDir, 'asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\\n');
