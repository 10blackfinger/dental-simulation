# Clinical simulation engine — scope and validation

## Runtime interaction

The oral-exam workspace uses Babylon.js scene picking to raycast from the pointer into registered tooth and gingival meshes. A surface action is recorded only while the user presses and drags across an eligible mesh. The contact record stores the mesh key, world-space contact point, normal and accumulated dwell time.

The control panel exposes two educational inputs:
- Applied force (N): a user-set scenario parameter, not a force sensor or calibrated instrument value.
- Rotary speed (RPM): a user-set speed parameter. The drill wear accumulator scales with this input and the nominal force value.

The rotary model creates a local surface-preparation indicator and advances a teaching depth value. It does not subtract triangles or perform a volumetric Boolean cut. The displayed depth is a normalized teaching variable, not a clinically meaningful measured depth.

## Soft-tissue and fluid approximations

Gingival contact applies a Gaussian displacement field to the picked mesh's vertex buffer. The displacement decays after contact ends. This is a local visual approximation: it does not use a measured constitutive model, viscoelastic tissue parameters, vascular response, pain response or patient-specific tissue data.

Air/water and endodontic-irrigation interactions spawn lightweight particles that move under a simplified gravity/velocity model. High-volume and saliva suction attract nearby particles toward the selected instrument. This is not computational fluid dynamics, aerosol modelling, validated fluid pressure, or a representation of irrigation safety.

## Guided 3D pathways

The interactive procedure flows use different tools and add visible scene outcomes for:
- clinical examination;
- endodontic access and canal concepts;
- hygiene and periodontal instrumentation concepts;
- extraction assessment;
- crown/prosthodontic workflow;
- implant planning and fixture visualization;
- orthodontic bracket/wire placement;
- dental trauma splint visualization;
- paediatric preventive/restorative concepts.

The visual effects are teaching markers attached to the selected anatomy. They do not constitute full surgical simulation, calibrated instrument kinematics, validated tooth extraction mechanics, implant drilling planning, orthodontic force systems, or an automated competency assessment.

## Assets and provenance

The oral anatomy meshes and tooth bounds are sourced from the documented Dental Scope / BodyParts3D assets. The four additional static GLB props are CC0 assets listed in public/models/ASSET_CREDITS.md. The procedural inventory models are built from Babylon.js primitives and are original simplified study props. The patient meshes and room pack retain their upstream asset credits.

## Validation

The Playwright suite exercises:
- default oral examination startup and FDI target selection;
- jaw open/close controls;
- all 55 inventory selections;
- tool placement, pointer-drag surface contact, and contact-gated restoration steps;
- a second guided examination flow;
- responsive viewport and drawer behavior;
- no uncaught browser page errors.

## Limits before any clinical or institutional use

This project is an educational prototype. A clinically meaningful simulator would still require, at minimum:
1. calibrated instrument geometry, kinematics and force/torque response;
2. validated tooth, enamel, dentin, pulp, periodontal ligament, bone and soft-tissue constitutive models;
3. volumetric cutting and material removal with conservative mesh remeshing;
4. validated coolant, irrigation, aerosol and suction fluid simulation;
5. patient-specific anatomy and clinically reviewed pathological datasets;
6. expert-authored protocols, objective metrics, validation studies and institutional review.

Do not use its displayed force, speed, depth, particle count, or outcome markers to make patient-care decisions or to certify procedural competency. Real procedures require qualified supervision and the relevant local protocol.