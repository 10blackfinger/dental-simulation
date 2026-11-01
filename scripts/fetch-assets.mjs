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
  },
  {
    file: 'ecorche-anatomy.glb',
    url: 'https://raw.githubusercontent.com/Charleeh/ecorche/320805e06aee51e2e6f6b22533eb2a59d43f2d4d/model/ecorche.glb',
    license: 'CC BY-SA 4.0',
    source: 'Écorché — BodyParts3D and Z-Anatomy, pinned commit 320805e06aee51e2e6f6b22533eb2a59d43f2d4d',
    expectedGitBlobSha1: '769efcb5b01a772225fd8bb39cb44fb127c753cd',
    expectedMinBytes: 14_000_000
  },
  {
    file: 'patient-male.glb',
    url: 'https://raw.githubusercontent.com/Rishi-Sureshkumar/osce-sim/2ec3eac67b986ea838bb64a2375d63eb3bfbeac5/public/models/patient.glb',
    license: 'CC0 1.0 Universal',
    source: 'OSCE Sim patient.glb; built from MakeHuman 1.x core assets and a 57-bone reduced rig',
    expectedBytes: 447192,
    expectedGitBlobSha1: 'ff8e88f3faac09d23577d6b21e741e2d8f440b4d',
    expectedMinBytes: 447192
  },
  {
    file: 'patient-female.glb',
    url: 'https://raw.githubusercontent.com/Rishi-Sureshkumar/osce-sim/2ec3eac67b986ea838bb64a2375d63eb3bfbeac5/public/models/patient-female.glb',
    license: 'CC0 1.0 Universal',
    source: 'OSCE Sim patient-female.glb; built from MakeHuman 1.x core assets and a 57-bone reduced rig',
    expectedBytes: 445616,
    expectedGitBlobSha1: '516b8323004ab3248e640070ee7a860f01978f84',
    expectedMinBytes: 445616
  }
];

const dentalScopeAssets = [
  {
    "file": "dental-scope/context.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/context.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 1031904,
    "expectedGitBlobSha1": "484a37bcc1c675f09eaeff91b89275becc112029",
    "expectedMinBytes": 1031904
  },
  {
    "file": "dental-scope/core.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/core.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 6389592,
    "expectedGitBlobSha1": "8e565eaff3af5336ee645f8423a8799a8e47d3ca",
    "expectedMinBytes": 6389592
  },
  {
    "file": "dental-scope/manifest.json",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/manifest.json",
    "format": "json",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 299017,
    "expectedGitBlobSha1": "6d094723d3298a6f751a3e332eb9149771677ab3",
    "expectedMinBytes": 299017
  },
  {
    "file": "dental-scope/neurovascular.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/neurovascular.glb",
    "format": "glb",
    "license": "CC BY-SA 4.0; also incorporates BodyParts3D CC BY-SA 2.1 JP",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 383276,
    "expectedGitBlobSha1": "9d380046f5ef88369c4b1a676b8242bad23bbac0",
    "expectedMinBytes": 383276
  },
  {
    "file": "dental-scope/teeth/tooth-11.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-11.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 548828,
    "expectedGitBlobSha1": "2b669af29c685adf41cbe66bc84646adea296011",
    "expectedMinBytes": 548828
  },
  {
    "file": "dental-scope/teeth/tooth-12.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-12.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 551964,
    "expectedGitBlobSha1": "3480efa6e6c6541da6dd9a8813f5daeb16474d7d",
    "expectedMinBytes": 551964
  },
  {
    "file": "dental-scope/teeth/tooth-13.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-13.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 1979516,
    "expectedGitBlobSha1": "30824ae05db2ca74ff02d0aa7b48de7dc8bd262f",
    "expectedMinBytes": 1979516
  },
  {
    "file": "dental-scope/teeth/tooth-14.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-14.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 2340348,
    "expectedGitBlobSha1": "e14d61a10356a12a753d40b1cb2038767e3f3e45",
    "expectedMinBytes": 2340348
  },
  {
    "file": "dental-scope/teeth/tooth-15.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-15.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 659712,
    "expectedGitBlobSha1": "ff54cffb0ebfe1a75d49c8c740d6715a54c2b3aa",
    "expectedMinBytes": 659712
  },
  {
    "file": "dental-scope/teeth/tooth-16.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-16.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 3374028,
    "expectedGitBlobSha1": "872130d84d9e40e7602f7cd61e39177bbe48d231",
    "expectedMinBytes": 3374028
  },
  {
    "file": "dental-scope/teeth/tooth-17.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-17.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 1432420,
    "expectedGitBlobSha1": "1e0e05bb8cd370a6239d06548b45634ad25f46c8",
    "expectedMinBytes": 1432420
  },
  {
    "file": "dental-scope/teeth/tooth-18.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-18.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 2445052,
    "expectedGitBlobSha1": "36024158fdc9d4a5acc84a42425812eddb509ddd",
    "expectedMinBytes": 2445052
  },
  {
    "file": "dental-scope/teeth/tooth-21.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-21.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 1367860,
    "expectedGitBlobSha1": "db54fa28c0aa94f77e7b2836f9f79688f3888edb",
    "expectedMinBytes": 1367860
  },
  {
    "file": "dental-scope/teeth/tooth-22.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-22.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 614220,
    "expectedGitBlobSha1": "575cf6669d41bb358e0f7f6165b921e84aafacf",
    "expectedMinBytes": 614220
  },
  {
    "file": "dental-scope/teeth/tooth-23.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-23.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 550740,
    "expectedGitBlobSha1": "7f1fba5dbab3346047708320270fc374a94bcf35",
    "expectedMinBytes": 550740
  },
  {
    "file": "dental-scope/teeth/tooth-24.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-24.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 2352004,
    "expectedGitBlobSha1": "b2beda381868a5ebfa5200be20e2602fe318aabf",
    "expectedMinBytes": 2352004
  },
  {
    "file": "dental-scope/teeth/tooth-25.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-25.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 661984,
    "expectedGitBlobSha1": "9ad89b47359d5b5ce8e459ef82145d873ac950e9",
    "expectedMinBytes": 661984
  },
  {
    "file": "dental-scope/teeth/tooth-26.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-26.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 3397560,
    "expectedGitBlobSha1": "0d53848be1b38b09191c506d09c83102c844ea79",
    "expectedMinBytes": 3397560
  },
  {
    "file": "dental-scope/teeth/tooth-27.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-27.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 1437896,
    "expectedGitBlobSha1": "691a8f66c37b7f14fa4b44db72d684743a3b0620",
    "expectedMinBytes": 1437896
  },
  {
    "file": "dental-scope/teeth/tooth-28.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-28.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 1245112,
    "expectedGitBlobSha1": "d6ced4007f026686cccc094763a8e7eb0014c0f6",
    "expectedMinBytes": 1245112
  },
  {
    "file": "dental-scope/teeth/tooth-31.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-31.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 841668,
    "expectedGitBlobSha1": "345fd36175f1d7bc7f6a6353b75c521f28ac8f75",
    "expectedMinBytes": 841668
  },
  {
    "file": "dental-scope/teeth/tooth-32.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-32.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 815904,
    "expectedGitBlobSha1": "2adb94f213bedb9a6baa01c329fbed285345f5a7",
    "expectedMinBytes": 815904
  },
  {
    "file": "dental-scope/teeth/tooth-33.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-33.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 1320440,
    "expectedGitBlobSha1": "af9ecab18329e31813ab2299b330231a44e77dcc",
    "expectedMinBytes": 1320440
  },
  {
    "file": "dental-scope/teeth/tooth-34.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-34.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 552652,
    "expectedGitBlobSha1": "3ca2b2e7dab0a2e649bcd70933c613b12ef74095",
    "expectedMinBytes": 552652
  },
  {
    "file": "dental-scope/teeth/tooth-35.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-35.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 553668,
    "expectedGitBlobSha1": "9d61865bc4344bf5a451d55eaa7ad1af38fce829",
    "expectedMinBytes": 553668
  },
  {
    "file": "dental-scope/teeth/tooth-36.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-36.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 2077788,
    "expectedGitBlobSha1": "12ac444d3f23209a3d02df3058deceb8b730d8c9",
    "expectedMinBytes": 2077788
  },
  {
    "file": "dental-scope/teeth/tooth-37.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-37.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 3100344,
    "expectedGitBlobSha1": "92d016a7bc1651fcf061aae4d6a55cb672128198",
    "expectedMinBytes": 3100344
  },
  {
    "file": "dental-scope/teeth/tooth-38.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-38.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 1172108,
    "expectedGitBlobSha1": "553cdab460164eb7c2782b682a51410031832786",
    "expectedMinBytes": 1172108
  },
  {
    "file": "dental-scope/teeth/tooth-41.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-41.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 846536,
    "expectedGitBlobSha1": "e201f5a43215ccb4f6203f5ceb2024bac57dc348",
    "expectedMinBytes": 846536
  },
  {
    "file": "dental-scope/teeth/tooth-42.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-42.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 862060,
    "expectedGitBlobSha1": "cb0e2f3cf196caa50888e1bab6c0e84c5cb251ac",
    "expectedMinBytes": 862060
  },
  {
    "file": "dental-scope/teeth/tooth-43.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-43.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 547292,
    "expectedGitBlobSha1": "95c385711031b5f1981687011cbf722f3baf4037",
    "expectedMinBytes": 547292
  },
  {
    "file": "dental-scope/teeth/tooth-44.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-44.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 986600,
    "expectedGitBlobSha1": "a885c67d36f3c61b11dbce05be9d73c9057828f9",
    "expectedMinBytes": 986600
  },
  {
    "file": "dental-scope/teeth/tooth-45.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-45.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 861232,
    "expectedGitBlobSha1": "51b6c2f7d88432f5079e095ef56b21b331812b58",
    "expectedMinBytes": 861232
  },
  {
    "file": "dental-scope/teeth/tooth-46.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-46.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 3476856,
    "expectedGitBlobSha1": "0eb96899d2da6370191538e5ce7cecf2f964e63a",
    "expectedMinBytes": 3476856
  },
  {
    "file": "dental-scope/teeth/tooth-47.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-47.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 1736360,
    "expectedGitBlobSha1": "fb47618d1d1dd30c87e19ad575fecb3365d87d58",
    "expectedMinBytes": 1736360
  },
  {
    "file": "dental-scope/teeth/tooth-48.glb",
    "url": "https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/teeth/tooth-48.glb",
    "format": "glb",
    "license": "CC BY-SA 2.1 Japan",
    "source": "Dental Scope 3D anatomy, pinned source commit 4ca93c04c7ed500fdc06e31ac82fcd668a34cae5",
    "expectedBytes": 1506340,
    "expectedGitBlobSha1": "c37567139cb3a54d12a88cb71e39a1fae5aefef1",
    "expectedMinBytes": 1506340
  }
];
assets.push(...dentalScopeAssets);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

async function validExisting(file, spec) {
  try {
    const bytes = await readFile(file);
    if (bytes.length < spec.expectedMinBytes || (spec.expectedBytes && bytes.length !== spec.expectedBytes)) return false;
    if ((spec.format || 'glb') === 'glb' && bytes.subarray(0, 4).toString('ascii') !== 'glTF') return false;
    if (spec.format === 'json') JSON.parse(bytes.toString('utf8'));
    if (spec.expectedSha256 && sha256(bytes) !== spec.expectedSha256) return false;
    if (spec.expectedGitBlobSha1 && gitBlobSha1(bytes) !== spec.expectedGitBlobSha1) return false;
    return true;
  } catch {
    return false;
  }
}

for (const asset of assets) {
  const destination = join(assetDir, asset.file);
  await mkdir(dirname(destination), { recursive: true });
  if (await validExisting(destination, asset)) {
    console.log(`[assets] verified existing ${asset.file}`);
    continue;
  }
  try {
    console.log(`[assets] fetching ${asset.file}`);
    const response = await fetch(asset.url, { signal: AbortSignal.timeout(90_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < asset.expectedMinBytes || (asset.expectedBytes && buffer.length !== asset.expectedBytes)) throw new Error(`unexpected file size (${buffer.length} bytes; expected ${asset.expectedBytes || asset.expectedMinBytes}+ bytes)`);
    if ((asset.format || 'glb') === 'glb' && buffer.subarray(0, 4).toString('ascii') !== 'glTF') throw new Error('file is not a binary glTF (GLB)');
    if (asset.format === 'json') JSON.parse(buffer.toString('utf8'));
    const digest = sha256(buffer);
    if (asset.expectedSha256 && digest !== asset.expectedSha256) throw new Error(`SHA-256 mismatch: ${digest}`);
    if (asset.expectedGitBlobSha1) {
      const gitDigest = gitBlobSha1(buffer);
      if (gitDigest !== asset.expectedGitBlobSha1) throw new Error(`Git blob SHA-1 mismatch: ${gitDigest}`);
    }
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
