# Investor demo and pre-release checklist

## Demonstrable now
- Arabic-first responsive web interface with RTL layout.
- Single integrated treatment scene with clinic pack, patient model, dentist/assistant stand-ins, instrument tray and patient mouth interaction.
- User-triggered slow movement of a selected instrument/material proxy between tray and mouth.
- Searchable starter inventory of instruments, materials and PPE.
- Eleven guided educational case pathways with references and JSON export.
- Separate clinic, people, oral anatomy, dental atlas and full-body anatomy modes.
- Optional local Qwen3.5 chat through Ollama.

## Required before investor or institutional presentation
- Confirm the live GitHub Actions workflow and Pages deployment succeed on the intended release commit.
- Test on target Windows laptops/desktops and mobile screens; capture screenshots/video of every mode.
- Visually calibrate the imported clinic chair and patient positioning across the exact target browser/GPU combinations.
- Have dental specialists review all anatomical models, Arabic/English terminology, case pathways and teaching notes.
- Review model attribution, ShareAlike obligations and redistribution rights before distributing binaries outside the app.
- Validate smoothness and memory use with the actual large atlas files on the minimum target hardware.
- Add properly rigged clinician and assistant models, authored patient poses, validated chair/device animations and a coherent gesture library.
- Add collision constraints, contact mechanics, tissue deformation, bur cutting, irrigation/suction and haptic integration if the product scope requires procedure simulation.
- Expand the clinical content with specialist-authored cases, differential diagnosis branches, assessment rubrics and reviewed outcomes.
- Run accessibility, keyboard navigation, localisation, security and privacy reviews.
- Complete intended-use and regulatory review for each target country before marketing as clinical decision support.

## Honest product statement

This build is a strong interactive educational demonstrator and a foundation for a larger dental simulation product. It is not yet a complete, clinically validated, physically realistic procedural simulator. Do not market it as error-free, clinically approved or suitable for unsupervised patient care.