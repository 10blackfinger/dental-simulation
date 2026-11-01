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

## 3. Character preview geometry

- **Asset:** Dentist, patient and dental assistant preview stand-ins.
- **Source:** Original procedural geometry authored in `src/main.js` for this project; no imported third-party character file is used in this mode.
- **Licence:** Part of this project's code; see the repository licence terms (no third-party model licence claimed).
- **Limitations:** simplified geometric figures only. They are not scanned or anatomically accurate human models, do not have a skeleton rig or facial/hand animation, and are not evidence of correct ergonomic or clinical positioning.

## 4. Full-body skeleton and muscle atlas

- **Asset:** `ecorche.glb` and `ecorche.structures.json`.
- **Source:** [Écorché](https://github.com/Charleeh/ecorche), pinned to commit `320805e06aee51e2e6f6b22533eb2a59d43f2d4d`.
- **Original datasets:** BodyParts3D (© Database Center for Life Science) and Z-Anatomy (Gauthier Kervyn).
- **Licence:** CC BY-SA 4.0 for the model and derived meshes: https://creativecommons.org/licenses/by-sa/4.0/
- **Required credit:** “Écorché (github.com/Charleeh/ecorche), CC BY-SA 4.0. Based on BodyParts3D, © The Database Center for Life Science, CC BY 4.0, and Z-Anatomy by Gauthier Kervyn, CC BY-SA 4.0.”
- **Contents:** 634 named structures: 198 bones, 42 cartilages, 28 teeth, eyes, deep-muscle structures and superficial-muscle structures. The upstream project documents 486,005 vertices and 984,688 triangles.
- **Runtime file:** `model/ecorche.glb`, pinned upstream size 14,314,536 bytes. The downloader validates the GLB header, minimum size and upstream Git blob SHA-1 `4360e0abeed7892e2585f257857b6d2d040af85d`.
- **Viewer changes:** no source mesh geometry is edited by the preparation script. The application applies a parent transform for framing and changes per-mesh visibility/opacity for interactive layer viewing.
- **Limits:** one adult male anatomical figure; simplified real-time geometry; no internal organs, vessels, nerves, ligaments, joint capsules or skin. The source notes facial muscles were not run through the same layering pass and positions are accurate only to a few millimetres. The source expressly says not for clinical use.
- **ShareAlike:** redistribution or adaptations must preserve the attribution, licence link and modification notice, and share adaptations under CC BY-SA 4.0.
