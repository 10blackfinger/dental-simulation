# 3D asset credits and licence record

This file records the sources of the two GLB assets loaded by the viewer. The downloader in `scripts/fetch-assets.mjs` writes their files into `public/models/` before local development and production builds. The binary files are generated/downloaded at build time and are intentionally not committed as opaque binary blobs.

## 1. Full dental practice scene

- **Asset:** Dental Practice and Surgery — starter scene
- **Direct source:** https://cdn.3dassets.dev/assets/34423/v1/model.glb
- **Pack page:** https://3dassets.dev/packs/dental-practice-and-surgery
- **Licence:** CC0 1.0 Universal
- **Contents:** 54 GLB models in the pack, approximately 117,172 triangles in the pack; chair, delivery units, operating lights, stools, suction, cabinets, x-ray equipment, instruments, sterilisation equipment, lab equipment, reception and waiting areas.
- **Coordinate units:** metres, +Y up.
- **Important limit:** the starter scene is a composed static scene, not a clinically validated digital twin. Its visual geometry is intended for presentation and interaction prototypes. The pack page reports no animations in the starter scene; moving/operating individual devices requires additional rigging and interaction code.

## 2. Oral anatomy model

- **Asset:** `teeth.glb`
- **Source dataset:** BodyParts3D / Anatomography 4.3, © The Database Center for Life Science (DBCLS).
- **Original source:** https://lifesciencedb.jp/bp3d/
- **Adapted public model:** https://github.com/organui/teeth-3d
- **Pinned source mirror commit used by the adapter:** `fd527e6f4daf732fd814314d9257df5877b844bc`
- **Adapter file / model:** https://github.com/organui/teeth-3d/blob/main/public/models/teeth.glb
- **Licence:** Creative Commons Attribution-Share Alike 2.1 Japan (CC BY-SA 2.1 Japan): https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
- **Required credit:** “BodyParts3D / Anatomography, © The Database Center for Life Science (DBCLS). Adapted by OrganUI. CC BY-SA 2.1 Japan.”
- **Adapter changes:** selected 33 source meshes; triangulated faces; recentered and uniformly scaled coordinates; changed axes from Z-up to Y-up; recomputed smooth normals; assigned illustrative colors; converted OBJ to GLB. No decimation or invented anatomy was reported by the adapter.
- **Coverage:** 28 permanent teeth (seven per quadrant), upper and lower gingiva, right and left maxilla, and mandible; 33 structures / 59,608 triangles according to the adapter's provenance notes.
- **Known omissions:** third molars (wisdom teeth), primary teeth, the rest of the skull, temporomandibular joints, palate soft tissue, tongue, lips, jaw muscles, nerves and vessels. Tooth tissues (enamel, dentine, pulp, cementum and periodontal ligament) are not separate meshes in this asset.
- **Medical review:** the source project's own documentation says specialist anatomical review is pending. Do not use the mesh as a clinical reference without independent dental-specialist review.

Because this model is CC BY-SA 2.1 Japan, any redistribution of the model or adaptations must retain the stated credit, licence link and modification notice, and comply with the ShareAlike terms. The code licence does not replace the model licence.

## Other researched assets not embedded

The following CC0 assets were found during research, but their permanent direct file URLs were not verified in the current environment, so they are not silently bundled or represented as loaded:

- Jordan — doctor with clinical coat (Innerscene; static character, CC0): https://www.innerscene.com/tools/library/3d-parts/jordan-3d-person-doctor-with-clinical-coat-98377d8e
- Nora — seated patient in gown (Innerscene; static character, CC0): https://www.innerscene.com/tools/library/3d-parts/nora-3d-person-patient-in-a-seated-gown-dfc1217d
- Alex — nurse standing (Innerscene; static character, CC0): https://www.innerscene.com/tools/library/3d-parts/alex-3d-person-nurse-standing-d18f2e37

Those character models are static rather than rigged/animated according to their library descriptions. They need a verified download and placement pass before they can be treated as part of this application.

## Integrity checks

- `oral-anatomy.glb` is accepted only if it is a GLB (magic bytes `glTF`), exceeds the minimum expected size, and matches SHA-256 `89a1074b0806eb41c318d38c78a269134c5070be7b90cb2f93ab2de7d35ec239`.
- `clinic-practice.glb` is accepted only if it is a GLB and passes the minimum-size check. It is fetched from the immutable CDN URL published by 3DAssets.dev.
- If either download fails, the application keeps its procedural fallback and reports the load status; it does not replace a known-good local asset with an incomplete response.
