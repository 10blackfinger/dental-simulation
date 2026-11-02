# Clinical simulation engine — scope and validation

## Runtime interaction

The oral-exam workspace uses Babylon.js scene picking to raycast from the pointer into registered tooth and gingival meshes. A surface action is recorded only while the user presses and drags across an eligible mesh. The contact record stores the mesh key, world-space contact point, normal and accumulated dwell time.

The control panel exposes two educational inputs:
- Applied force (N): a user-set scenario parameter, not a force sensor or calibrated instrument value.
- Rotary speed (RPM): a user-set speed parameter. The drill wear accumulator scales with this input and the nominal force value.

The rotary model advances a teaching depth value and attempts a swept-path Boolean subtraction on the selected tooth mesh using Babylon.js CSG2 / Manifold. The implant-site flow can also attempt a Boolean subtraction on selected mandibular/maxillary bone surfaces. The stroke is sampled into overlapping cutter volumes and the original mesh is retained so the case can be reset. This is a genuine geometry edit when the source mesh is closed and valid for Manifold; unsupported/open meshes fall back to a visible preparation marker. The displayed depth remains a normalized teaching variable, not a clinically meaningful measurement. Repeated cutter subtraction is not a validated bur-cutting model.

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

These flows now combine selected 3D instruments, surface-contact checks, scenario-specific actions and attached 3D outcomes. Tooth and bone preparation can change the source geometry through CSG2 where supported. Extraction still hides the tooth mesh and presents a socket marker rather than modelling periodontal ligament mechanics or traction forces. Implant preparation is an approximate Boolean site on the jaw mesh, not a clinically planned osteotomy. Orthodontic bracket/wire objects do not model calibrated force systems. None of these flows is a full clinically validated surgical simulation or automated competency assessment.

## Assets and provenance

The oral anatomy meshes and tooth bounds are sourced from the documented Dental Scope / BodyParts3D assets. The six additional GLB props (tray, scaler, curing light, plaster arch, forceps and scalpel set) are CC0 assets listed in public/models/ASSET_CREDITS.md. The clinical practice pack exposes any native GLB AnimationGroups through the clinic animation panel; a model without embedded animation channels remains static. The procedural inventory models are built from Babylon.js primitives and are original simplified study props. The patient meshes and room pack retain their upstream asset credits.

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