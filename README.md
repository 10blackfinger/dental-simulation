# Dental Simulation

A browser-based dental education prototype built with Vite and Babylon.js. The application is Arabic-first (RTL), with an interactive 3D viewport, imported GLB asset packs, an oral anatomy explorer and guided educational checklists.

## Included in the current build

### 3D assets
- **Dental practice scene:** a 54-model CC0 asset pack from 3DAssets.dev, including the clinic areas, dental chairs and delivery equipment, operating lights, stools, suction, cabinetry, x-ray equipment, instruments, sterilisation equipment, lab equipment, reception and waiting areas.
- **Oral anatomy:** 33 separately selectable structures adapted by OrganUI from BodyParts3D / Anatomography 4.3. It contains 28 permanent teeth, upper and lower gingiva, both maxillae and the mandible.
- Models are fetched automatically before `npm run dev` and `npm run build`. The oral anatomy file is verified against a pinned SHA-256 hash before it is accepted.
- The project keeps a procedural fallback scene if a remote asset cannot be obtained.

See [3D asset credits, source provenance and licences](public/models/ASSET_CREDITS.md).

### Interactive training
- Orbit, front, side and top camera presets.
- Toggle room, dental unit, jaw, and instruments in the fallback scene.
- Select oral-anatomy structures by clicking the model or using the searchable structure list.
- Isolate one anatomical structure or restore the full model.
- A separate character-preview scene with original procedural dentist, patient and assistant stand-ins. These are low-detail visual proxies, not realistic or rigged clinical characters.
- Full-body anatomy atlas with 634 named bones, cartilages, teeth, eyes and muscle structures from Écorché, including layer toggles, surface-muscle transparency, search and isolation.
- Four guided educational checklists: primary exam, restoration concepts, endodontic principles and oral hygiene.
- Training progress is stored locally in the current browser and can be exported as JSON. No login is required and no patient identifiers are collected.

## Run locally

Requires Node.js 22 or newer and an internet connection for the first asset download.

```bash
npm install
npm run dev
```

The `predev` script fetches and verifies the required models. Then open the local Vite address printed in the terminal.

## Build and validate

```bash
npm run check
npm run build
npm run preview
npm run test:e2e
```

The `prebuild` script prepares the GLB assets before Vite creates the production bundle. The browser smoke suite loads both GLB models, switches between scenes, checks the structure list and completes a training checklist. The downloaded binary files are ignored by Git to keep the repository source manageable; they are included in the generated `dist/models/` output.

## Deployment

The repository includes a GitHub Actions workflow to build and deploy the static site to GitHub Pages. In **Settings → Pages**, choose **GitHub Actions** as the build and deployment source. The public URL is normally:

`https://10blackfinger.github.io/dental-simulation/`

The URL will work only after Pages is enabled and the Actions deployment succeeds.

## Scope and clinical safety

This is an educational visual prototype, not a clinical device, diagnostic system, or validated clinical-skills simulator. The full-practice scene is a static scene; the included pack does not supply clinically validated device physics or complete chair/device animation. The separate human figures are simplified geometric stand-ins, with no skeleton rig, facial animation or clinically realistic hand articulation. The anatomy source omits wisdom teeth, primary dentition, tooth tissue layers, nerves, vessels, TMJs and several oral structures. Character rigs, procedure physics, haptic feedback, validated scoring and specialist-reviewed clinical cases are not yet implemented.

The anatomy provider's documentation says independent specialist review is pending. Dental educators and qualified specialists must review the geometry, terminology and educational workflows before use in a formal curriculum. Never use this prototype to diagnose or treat a patient.

## Privacy

There are no user accounts. Training checklists are stored in browser local storage on the current device. Exported reports contain scenario progress and timestamps only; do not enter real patient information.

## No image files are overwritten

The asset-preparation script only writes GLB model files and a generated asset manifest under `public/models/`. It does not edit, replace or delete existing pictures or screenshots.
