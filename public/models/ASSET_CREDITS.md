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
- **Application use:** patient figures in the character-preview scene and the integrated dental-chair treatment scene. The application places the selected GLB in a fixed horizontal orientation for the visual demonstrator; it does not animate the 57-bone rig or claim a clinically validated patient position. They are generic teaching assets, not patient-specific digital twins or diagnostic representations.


## 8. Integrated treatment scene stand-ins

- **Patient:** the same OSCE Sim / MakeHuman-derived CC0 models recorded in section 7 are now placed in the integrated chairside scene. The model is oriented horizontally as a static whole-body transform; the source rig is retained but no bone animation is currently played.
- **Dentist and assistant:** original low-poly procedural geometry authored in this repository and parented into the treatment scene. These are illustrative placeholders, not third-party assets, scanned individuals, photorealistic models or anatomically validated characters.
- **Chairside tray and selected instrument/material proxy:** original procedural geometry authored in this repository. The user can request slow tray-to-mouth and mouth-to-tray object transforms. There is no collision/contact physics, tool tracking, force calibration or tissue interaction.
- **Licence:** original procedural scene parts are part of the repository code. The imported patient GLBs retain the CC0 1.0 Universal terms described in section 7.
- **Visual caveat:** the static clinic room, imported patient geometry and procedural staff are aligned for a software demonstration. A dentist must review the exact scene layout, posture and visual realism before use as a formal ergonomics or clinical-skills teaching resource.


## 9. Primary tooth model library — University of Dundee

- **Source repository:** [sameralseedbth-Dental/dental-3d-models](https://github.com/sameralseedbth-Dental/dental-3d-models), pinned to commit `4f0ffb651998a4641ddf45c7632ea236cc164fcb`.
- **Original author:** University of Dundee, School of Dentistry.
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0), as declared in the source repository README.
- **Required attribution:** “3D models © University of Dundee, School of Dentistry”, with a link to the source repository and [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Included models:** ten individual primary teeth, FDI 61–65 (upper left) and 71–75 (lower left). The source repository contains a broader set of permanent-tooth and molar-variant models as well, but those are not copied into this primary-dentition feature.
- **Application modifications:** original GLB geometry is downloaded from the pinned commit and loaded as separate meshes. The viewer applies only parent positioning, centering/scaling and interaction metadata; it does not claim to alter or validate the source anatomy.
- **Coverage limitation:** these ten teeth represent only the left quadrants of the primary dentition. They are not a complete primary dentition, mixed-dentition atlas or age-specific eruption model. The app labels this limitation in the UI.
- **Clinical limitation:** the source licence establishes reuse rights, not clinical or educational validation. Qualified paediatric dental specialists must review model geometry, terminology and teaching context before formal teaching or clinical use.
- **Share/attribution:** preserve the author attribution, link the licence and indicate any changes made to the source material. No claim of endorsement by the University of Dundee is made.


## 8. Chairside instruments and study props (CC0)

The following additional static 3D props are downloaded by `scripts/fetch-assets.mjs` into `public/models/dental-tools/`. They are presentation and interaction assets, not calibrated or clinically validated instruments.

- **Instrument tray:** [3DAssets.dev asset 34383](https://3dassets.dev/assets/34383) — [GLB](https://cdn.3dassets.dev/assets/34383/v1/model.glb), 30,452 bytes; CC0 1.0 Universal. The publisher's description lists a mirror, probe, cotton pliers and cotton rolls. The items are static meshes, not independently rigged tools.
- **Ultrasonic scaler:** [3DAssets.dev asset 34384](https://3dassets.dev/assets/34384) — [GLB](https://cdn.3dassets.dev/assets/34384/v1/model.glb), 28,284 bytes; CC0 1.0 Universal. Visual prop only; no powered vibration, calibrated tip or scaling physics.
- **Light-curing device:** [3DAssets.dev asset 34385](https://3dassets.dev/assets/34385) — [GLB](https://cdn.3dassets.dev/assets/34385/v1/model.glb), 22,728 bytes; CC0 1.0 Universal. Visual prop only; it does not emit validated irradiance or model polymerisation chemistry.
- **Plaster lower-arch study model:** [3DAssets.dev asset 34397](https://3dassets.dev/assets/34397) — [GLB](https://cdn.3dassets.dev/assets/34397/v1/model.glb), 24,768 bytes; CC0 1.0 Universal. A separate teaching/display object, not a replacement for the Dental Scope clinical anatomy mesh.

The 3DAssets.dev models are low-polygon static props. The associated catalogue reports CC0 1.0 Universal for these entries; the download script checks exact file sizes and GLB magic bytes. Keep this attribution record with redistributed copies even though CC0 does not require attribution.
