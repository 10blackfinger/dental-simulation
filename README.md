# Dental Simulation

Arabic-first 3D dental education prototype built with Vite and Babylon.js.

## Current modules

### Focused oral examination workspace
- The first workspace is "فحص الأسنان", opening the detailed Dental Scope oral anatomy with the lower jaw articulated open, 32 permanent teeth and FDI tooth selection.
- The searchable inventory contains 55 individually selectable 3D study models across examination, restorative, endodontic, surgical, periodontal, prosthodontic, implant, orthodontic, trauma, paediatric and PPE groups. Six additional CC0 GLB props are bundled: instrument tray, ultrasonic scaler, curing light, plaster arch, surgical forceps and a scalpel set.
- The articulated lower jaw opens and closes at a hinge. FDI tooth selection focuses the camera and targets actions to the selected Dental Scope tooth mesh.
- A surface-contact engine uses pointer-ray intersection against the visible tooth/gingiva mesh. Tool actions require a sustained contact gesture; rotary speed and user-entered nominal force drive a teaching wear-depth value. Gingival mesh vertices deform locally and recover, irrigation emits moving particles, and suction attracts particles. This is an approximate visual/interaction model, not physical force sensing or validated tissue mechanics.
- Guided action sequences now attach 3D outcome objects for examination, endodontic concepts, hygiene, extraction assessment, periodontal care, prosthodontics, implant planning, orthodontics, trauma and paediatric prevention. The restoration pathway has a staged caries/material overlay and requires surface contact before advancing.

### Integrated chairside encounter
- A separate treatment-room mode combines the clinic scene, a patient lying in the dental chair, dentist and assistant stand-ins, and a shared instrument tray.
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

### Online dental education assistant

The default assistant connects to **OpenRouter** over HTTPS and uses its OpenAI-compatible chat completions API. It offers the dynamic `openrouter/free` router and can list currently available text-capable model variants ending in `:free`. The free list changes over time; the app fetches it from the provider at connection time instead of hard-coding stale model IDs.

To use it, create a personal key at [OpenRouter API Keys](https://openrouter.ai/keys), enter it into the password field in the assistant panel, and test the connection. The key is held only in the current page's JavaScript memory and password field; the app does not write it to localStorage, sessionStorage, source files or GitHub. Refreshing the page or using “clear key” removes it. Browser-based Bring Your Own Key is suitable for a personal demo, not a shared production service: the key is necessarily accessible to the browser session and should be a restricted personal key with usage limits. For a university or public multi-user deployment, move provider calls behind a managed server-side proxy with per-user authentication, rate limits, logging controls and secrets stored in the hosting provider's secret manager. Never publish a shared API key in the static site.

OpenRouter supports a single OpenAI-compatible API for many hosted models and has an optional free router. Free variants have changing availability and strict quotas; they are intended for experimentation, not guaranteed continuous service or production teaching sessions. A model being free or popular does not make it a dental specialist or clinically validated.

Optional local providers remain available:
- Qwen3.5 through local Ollama (default `qwen3.5:4b`; larger 9B and 27B options).
- PALL-Text 8B through a local vLLM OpenAI-compatible server. PALL-Text is dental-domain-specialized and English-first under the Llama 3.1 Community License, not Apache-2.0.

The assistant's instruction prompt includes official entry points for ADA, AAE, EFP, IADT, SDCEP, AAPD and FDA. This is a curated source index, not retrieval-augmented generation over the complete guideline texts. The selected model can still make mistakes or invent details: learners must open the primary sources, verify local Egyptian rules and ask a clinical supervisor. Never send real patient identifiers, photographs or identifiable health records.

See [online AI setup and key privacy](docs/ONLINE_AI_SETUP.md), [local AI setup](docs/LOCAL_AI_SETUP.md) and [clinical references and limits](docs/CLINICAL_REFERENCES.md).
## Run locally
Requires Node.js 22+ and internet access for the initial model download.

    npm install
    npm run dev

## Validate and build

    npm run check
    npm run build
    npm run preview
    npm run test:e2e

The browser smoke test covers published GLB assets, cloud AI (mocked API contract), the fixed square viewport on desktop/mobile, independent mobile drawers, integrated treatment, inventory selection, slower user-triggered object movement, anatomy viewers, patient selection and a guided case.

## Deployment
GitHub Actions builds and deploys the static site to GitHub Pages. In Settings → Pages, choose GitHub Actions as the source.

Expected address: https://10blackfinger.github.io/dental-simulation/

The address is live only when the latest workflow build, browser tests and Pages deployment all succeed.

## Known limitations
- The imported patient is displayed in a fixed horizontal pose. There is no validated animation library, breathing, facial animation, lip/tongue rig or patient response system.
- Dentist and assistant are procedural geometric stand-ins, not photorealistic or fully rigged characters.
- The 55 procedural inventory models are simplified study props. Four imported CC0 GLBs are static source meshes but can be selected/moved as 3D scene objects. Surface contact, user-entered force/speed, localized gingival vertex deformation, irrigation particles and suction are interactive approximations; they are not calibrated physics or validated clinical instruments.
- The 12 pathways now have guided tool-to-surface interactions and attached 3D outcome markers. These are not complete biomechanical/surgical simulations: tooth removal is a visual state, the drill uses a surface mark rather than volumetric mesh cutting, endodontic and implant workflows are simplified, and there is no validated scoring or patient response.
- Instrument/material props are simplified. There is no force feedback, haptics, collision/contact simulation, bur cutting, tissue deformation, irrigation physics, fluid suction simulation or validated instrument calibration.
- The imported clinic pack is static. Some chair controls are available only in the procedural fallback and do not actuate the static imported equipment.
- The 12 pathways are explanatory checklists, not exhaustive coverage of every disease or rare case, full procedure walkthroughs or validated scoring.
- Some anatomy structures are schematic/estimated and require dental-specialist review.
- The default cloud assistant uses whichever OpenRouter model is selected at runtime; it is not a fine-tuned dental foundation model or diagnostic model. PALL-Text is an optional dental-domain model, but it is English-first and is not clinically validated.
- GitHub Pages is static hosting. Online AI uses the learner's personal OpenRouter key (Bring Your Own Key); no shared provider secret or institution-managed backend is embedded in the site. Optional local AI requires Ollama or vLLM.
- The fixed square viewport and mobile drawers have automated browser checks, but additional real-device visual QA, specialist content review, accessibility checks, asset/licence audit and performance profiling remain required before a formal university/investor release.

## Privacy
No login is required. Training progress stays in the current browser's local storage. Exported reports contain scenario progress only. Do not enter real patient names, photographs or identifiable clinical records.

## Picture files
The model preparation script writes model files and a generated manifest inside public/models only. It does not edit, replace or delete screenshots, photos or other picture files.