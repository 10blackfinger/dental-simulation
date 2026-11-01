# Dental Simulation

Arabic-first 3D dental education prototype built with Vite and Babylon.js.

## Current modules

### Integrated chairside encounter
- Default experience combines the clinic scene, a patient lying in the dental chair, dentist and assistant stand-ins, and a shared instrument tray.
- Male and female CC0 MakeHuman-derived GLB patient figures can be selected. The source has a reduced 57-bone rig, but this application currently uses a fixed horizontal pose, not clinically reviewed skeletal animations.
- The mouth can be opened or closed by the user. A selected instrument or material prop can be moved slowly between tray and mouth by explicit user action.
- Camera orbit/front/side/top views and a separate clinic-only scene remain available.

### 3D assets and anatomy
- 54-model CC0 dental practice scene pack.
- 33 selectable oral anatomy structures adapted from BodyParts3D / Anatomography.
- Dental Scope atlas with 415 named registry entries, 32 FDI permanent tooth files, per-tooth tissue layer files, jaws, context and a neurovascular extension.
- A separate primary-tooth atlas with ten University of Dundee CC BY 4.0 GLB models (FDI 61–65 and 71–75, left quadrants only); it is not a complete primary dentition.
- Full-body anatomy atlas with 634 named structures.
- Male/female CC0 MakeHuman-derived patient figures.
- Models are downloaded and integrity-checked during predev/prebuild. The asset downloader does not edit or replace picture files.

See [3D asset credits and licences](public/models/ASSET_CREDITS.md).

### Instruments and materials catalogue
The searchable inventory includes examination instruments, probes, handpieces, burs, rubber-dam and matrix systems, curing light, endodontic files/accessories, extraction and surgical instruments, periodontal scalers/curettes, prosthodontic and orthodontic items, restorative/endodontic/prosthetic materials and PPE. Each entry has a purpose and a caution note. This is an educational starter inventory, not a complete purchasing catalogue or substitute for manufacturer instructions.

### Guided learning pathways
Twelve case pathways cover initial examination, caries/restoration, endodontics, oral hygiene, extraction assessment, periodontal care, crowns/prosthodontics, implant assessment, orthodontic assessment, dental trauma and acute dental problems and paediatric dentistry. They provide staged explanations, progress tracking, references and JSON export. These checklists are not complete procedure simulations, validated treatment protocols or competency assessments.

### Local dental education assistant
The UI includes Qwen3.5 through local Ollama (default qwen3.5:4b; 9B and 27B choices) and an optional dental-specialized PALL-Text 8B model through a local vLLM OpenAI-compatible endpoint. Qwen3.5-4B is Apache-2.0. PALL-Text is English-first and distributed under the Llama 3.1 Community License, not Apache-2.0; check its terms before commercial use. Both backends are intended to run on the user's own computer. The PALL server must be bound to localhost and use a narrow CORS allowlist with vLLM 0.32.0 or newer.

Important: Qwen3.5 is a general open-weight model, not a dental-specialist model and not fine-tuned on a clinician-validated dental dataset. The app gives it a dental-focused system prompt and a small curated source index. It can still hallucinate; check answers against the cited original guidance and a qualified supervisor.

See [local AI setup](docs/LOCAL_AI_SETUP.md) and [clinical references and limits](docs/CLINICAL_REFERENCES.md).

## Run locally
Requires Node.js 22+ and internet access for the initial model download.

    npm install
    npm run dev

## Validate and build

    npm run check
    npm run build
    npm run preview
    npm run test:e2e

The browser smoke test covers the integrated treatment view, inventory selection, user-triggered object movement, anatomy viewers, patient selection and a guided case.

## Deployment
GitHub Actions builds and deploys the static site to GitHub Pages. In Settings → Pages, choose GitHub Actions as the source.

Expected address: https://10blackfinger.github.io/dental-simulation/

The address is live only when the latest workflow build, browser tests and Pages deployment all succeed.

## Known limitations
- The imported patient is displayed in a fixed horizontal pose. There is no validated animation library, breathing, facial animation, lip/tongue rig or patient response system.
- Dentist and assistant are procedural geometric stand-ins, not photorealistic or fully rigged characters.
- Instrument/material props are simplified. There is no force feedback, haptics, collision/contact simulation, bur cutting, tissue deformation, irrigation physics, fluid suction simulation or validated instrument calibration.
- The imported clinic pack is static. Some chair controls are available only in the procedural fallback and do not actuate the static imported equipment.
- The 12 pathways are explanatory checklists, not exhaustive coverage of every disease or rare case, full procedure walkthroughs or validated scoring.
- Some anatomy structures are schematic/estimated and require dental-specialist review.
- The AI helper is general Qwen3.5 with a prompt and source index, not a fine-tuned dental foundation model or diagnostic model.
- GitHub Pages is static hosting. The user must run Ollama locally and allow the specific website origin; cloud inference and shared user data are not configured.
- Investor/university release still requires specialist content review, asset/licence review, visual QA on target devices, performance profiling and accessibility testing.

## Privacy
No login is required. Training progress stays in the current browser's local storage. Exported reports contain scenario progress only. Do not enter real patient names, photographs or identifiable clinical records.

## Picture files
The model preparation script writes model files and a generated manifest inside public/models only. It does not edit, replace or delete screenshots, photos or other picture files.