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
- **Runtime file:** `model/ecorche.glb`, pinned upstream size 14,314,536 bytes. The downloader validates the GLB header, minimum size and download integrity fingerprint `769efcb5b01a772225fd8bb39cb44fb127c753cd` (computed from the pinned raw-file bytes).
- **Viewer changes:** no source mesh geometry is edited by the preparation script. The application applies a parent transform for framing and changes per-mesh visibility/opacity for interactive layer viewing.
- **Limits:** one adult male anatomical figure; simplified real-time geometry; no internal organs, vessels, nerves, ligaments, joint capsules or skin. The source notes facial muscles were not run through the same layering pass and positions are accurate only to a few millimetres. The source expressly says not for clinical use.
- **ShareAlike:** redistribution or adaptations must preserve the attribution, licence link and modification notice, and share adaptations under CC BY-SA 4.0.


## 6. Detailed dental anatomy atlas (Dental Scope)

- **Asset source:** [Dental Scope](https://github.com/Yoosseph/dental-scope), pinned commit `4ca93c04c7ed500fdc06e31ac82fcd668a34cae5`.
- **Model source:** BodyParts3D 3.0, © The Database Center for Life Science (DBCLS).
- **Licence:** the base dental atlas is CC BY-SA 2.1 Japan. The neurovascular extension also incorporates Z-Anatomy material under CC BY-SA 4.0; retain both notices and comply with the applicable ShareAlike licence for the combined file.
- **Required credit for base atlas:** “BodyParts3D 3.0, © The Database Center for Life Science (DBCLS), adapted in Dental Scope. CC BY-SA 2.1 Japan.”
- **Neurovascular credit:** “Z-Anatomy by Gauthier Kervyn, CC BY-SA 4.0, as incorporated in the Dental Scope neurovascular extension.”
- **Files downloaded:** `core.glb` (6,389,592 bytes), `context.glb` (1,031,904 bytes), `neurovascular.glb` (383,276 bytes), `manifest.json` (299,017 bytes), and 32 per-tooth GLB files (FDI 11–18, 21–28, 31–38, 41–48; 54,320,881 bytes across these 36 files).
- **Coverage:** 415 named mesh-registry entries, 32 permanent tooth models, and separate enamel, coronal/radicular dentin, cementum, periodontal ligament, pulp chamber and root-canal meshes. Shared structures include gingiva, maxilla, mandible, skull context, muscles, TMJ/disc, maxillary sinuses and neurovascular structures as present in the pinned source manifest.
- **Runtime behavior:** shared jaw/context/neurovascular meshes load on opening the dental atlas. Detailed tooth layers are loaded on demand when the user chooses an FDI tooth. The preparation script pins each file to its GitHub blob SHA and exact byte size and rejects altered, partial or non-GLB data.
- **Modeling limits:** the source project labels several dental layers and measurements as schematic/estimated rather than measured tissue segmentation. Canal configurations, landmarks and paths should not be presented as universal anatomy. Some cranial paths and nerve branches are explicitly schematic and remain subject to specialist review.
- **ShareAlike:** attribution must be retained, sources linked, changes noted, and derivative model files redistributed under the corresponding ShareAlike licence. Do not combine these model licences with the project's code licence.


## 7. Male and female patient characters (CC0)

- **Source repository:** [OSCE Sim](https://github.com/Rishi-Sureshkumar/osce-sim), pinned commit `2ec3eac67b986ea838bb64a2375d63eb3bfbeac5`.
- **Models:** `patient.glb` (68-year-old male patient) and `patient-female.glb` (young adult female patient).
- **Licence:** CC0 1.0 Universal for the MakeHuman 1.x base mesh, core assets, rig/weights and exported character models, as recorded in the source project's `public/models/LICENSE.md` and the [MakeHuman asset licence](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md).
- **Source models:** `patient.glb` (447,192 bytes; Git blob SHA `ff8e88f3faac09d23577d6b21e741e2d8f440b4d`); `patient-female.glb` (445,616 bytes; Git blob SHA `516b8323004ab3248e640070ee7a860f01978f84`).
- **Rig:** the source project builds a reduced 57-bone rig. These models are loaded as skinned GLB assets; this application does not currently provide a clinically reviewed pose/animation library for them.
- **Use in this application:** patient figure selection in the character preview. The characters are visual teaching assets, not patient-specific representations, and must not be used to infer clinical appearance or outcomes.

## 7. Patient character variants

- **Source:** [OSCE Sim](https://github.com/Rishi-Sureshkumar/osce-sim), pinned commit `2ec3eac67b986ea838bb64a2375d63eb3bfbeac5`.
- **Models:** `patient.glb` (68-year-old male) and `patient-female.glb` (young adult female).
- **Licence:** CC0 1.0 Universal for the exported models and MakeHuman core assets. Official [MakeHuman licence](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md).
- **Files:** `patient.glb` — 447,192 bytes, Git blob SHA `ff8e88f3faac09d23577d6b21e741e2d8f440b4d`; `patient-female.glb` — 445,616 bytes, Git blob SHA `516b8323004ab3248e640070ee7a860f01978f84`.
- **Rig:** source project reports a reduced 57-bone rig. They are loaded as skinned GLB assets; this app currently provides no validated patient pose/animation library.
- **Application use:** optional patient figures in the character-preview scene. They are generic teaching assets, not patient-specific digital twins or diagnostic representations.
