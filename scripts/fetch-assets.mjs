import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assetDir = join(root, 'public', 'models');
await mkdir(assetDir, { recursive: true });

const assets = [
  {
    file: 'clinic-practice.glb',
    url: 'https://cdn.3dassets.dev/assets/34423/v1/model.glb',
    license: 'CC0 1.0 Universal',
    source: '3DAssets.dev — Dental Practice and Surgery starter scene (54 models)',
    expectedSha256: null,
    expectedMinBytes: 100_000
  },
  {
    file: 'oral-anatomy.glb',
    url: 'https://raw.githubusercontent.com/organui/teeth-3d/main/public/models/teeth.glb',
    license: 'CC BY-SA 2.1 Japan',
    source: 'BodyParts3D / Anatomography 4.3, adapted by OrganUI',
    expectedSha256: '89a1074b0806eb41c318d38c78a269134c5070be7b90cb2f93ab2de7d35ec239',
    expectedMinBytes: 1_000_000
  }
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function validExisting(file, spec) {
  try {
    const bytes = await readFile(file);
    if (bytes.length < spec.expectedMinBytes || bytes.subarray(0, 4).toString('ascii') !== 'glTF') return false;
    return !spec.expectedSha256 || sha256(bytes) === spec.expectedSha256;
  } catch {
    return false;
  }
}

for (const asset of assets) {
  const destination = join(assetDir, asset.file);
  if (await validExisting(destination, asset)) {
    console.log(`[assets] verified existing ${asset.file}`);
    continue;
  }
  try {
    console.log(`[assets] fetching ${asset.file}`);
    const response = await fetch(asset.url, { signal: AbortSignal.timeout(90_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < asset.expectedMinBytes) throw new Error(`unexpectedly small file (${buffer.length} bytes)`);
    if (buffer.subarray(0, 4).toString('ascii') !== 'glTF') throw new Error('file is not a binary glTF (GLB)');
    const digest = sha256(buffer);
    if (asset.expectedSha256 && digest !== asset.expectedSha256) throw new Error(`SHA-256 mismatch: ${digest}`);
    await writeFile(destination, buffer);
    console.log(`[assets] saved ${asset.file} (${buffer.length} bytes, sha256 ${digest})`);
  } catch (error) {
    console.warn(`[assets] could not prepare ${asset.file}: ${error.message}`);
    console.warn('[assets] the viewer will try the original CORS-enabled source URL; procedural fallback remains available.');
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  note: 'The models are downloaded during local dev/build. If the download is unavailable, the viewer streams the source URL. Check each source license before redistributing the GLB independently.',
  assets
};
await writeFile(join(assetDir, 'asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
