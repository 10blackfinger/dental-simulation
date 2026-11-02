import './style.css';
import '@babylonjs/loaders/glTF';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { HighlightLayer } from '@babylonjs/core/Layers/highlightLayer';
import { CSG2, InitializeCSG2Async } from '@babylonjs/core/Meshes/csg2';
import {
  Engine, Scene, Vector3, Color3, Color4, Matrix, Quaternion, HemisphericLight, DirectionalLight, PointLight,
  ArcRotateCamera, MeshBuilder, StandardMaterial, TransformNode, ActionManager, VertexBuffer,
  ExecuteCodeAction, PointerEventTypes, Animation, CubicEase, EasingFunction
} from '@babylonjs/core';


const workspaceLayout = document.querySelector('.layout');
const mobileDrawerBackdrop = document.createElement('div');
mobileDrawerBackdrop.className = 'mobile-panel-backdrop';
mobileDrawerBackdrop.hidden = true;
workspaceLayout?.appendChild(mobileDrawerBackdrop);
const mobileDrawers = [
  { button: document.getElementById('mobile-open-controls'), panel: document.getElementById('sidebar-right') },
  { button: document.getElementById('mobile-open-library'), panel: document.getElementById('sidebar-left') }
];
function closeMobileDrawers() {
  for (const item of mobileDrawers) {
    item.panel?.classList.remove('mobile-open');
    item.button?.setAttribute('aria-expanded', 'false');
  }
  mobileDrawerBackdrop.hidden = true;
}
function openMobileDrawer(panelId) {
  const item = mobileDrawers.find(entry => entry.panel?.id === panelId);
  if (!item || window.matchMedia('(min-width: 761px)').matches) return;
  closeMobileDrawers();
  item.panel.classList.add('mobile-open');
  item.button?.setAttribute('aria-expanded', 'true');
  mobileDrawerBackdrop.hidden = false;
}
for (const item of mobileDrawers) {
  item.button?.addEventListener('click', () => {
    if (item.panel?.classList.contains('mobile-open')) closeMobileDrawers();
    else openMobileDrawer(item.panel.id);
  });
}
mobileDrawerBackdrop.addEventListener('click', closeMobileDrawers);
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMobileDrawers();
});
window.addEventListener('resize', () => {
  if (window.matchMedia('(min-width: 761px)').matches) closeMobileDrawers();
});

let clinicalSurfaceReady = false;
const canvas = document.getElementById('render-canvas');
const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: false });
engine.setHardwareScalingLevel(1.15);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.085, 0.13, 1);
scene.ambientColor = new Color3(0.35, 0.35, 0.35);

const camera = new ArcRotateCamera('ClinicCamera', -Math.PI / 2.35, 1.08, 9.5, new Vector3(0, 1.25, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 4.5;
camera.upperRadiusLimit = 16;
camera.wheelDeltaPercentage = 0.012;
camera.panningSensibility = 65;

const hemi = new HemisphericLight('SoftAmbient', new Vector3(0, 1, 0), scene);
hemi.intensity = 0.82;
const key = new DirectionalLight('KeyLight', new Vector3(-0.6, -1, 0.5), scene);
key.position = new Vector3(5, 8, -5);
key.intensity = 1.0;

const mats = {};
function material(name, color, roughness = 0.72, metallic = 0) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(color);
  m.specularColor = new Color3(0.22, 0.24, 0.28);
  m.specularPower = Math.max(8, 128 * (1 - roughness));
  m.alpha = 1;
  mats[name] = m;
  return m;
}
material('wall', '#d9e1e5');
material('floor', '#9aaab3');
material('trim', '#607584');
material('teal', '#168f91', 0.36);
material('tealDark', '#11636d');
material('white', '#f1f4f4', 0.3);
material('metal', '#aebbc3', 0.25, 0.65);
material('dark', '#263748');
material('screen', '#183f54', 0.25);
material('gum', '#d98291', 0.55);
material('tooth', '#fff0d8', 0.32);
material('accent', '#35c5b0', 0.3);
material('rubber', '#29323b');
material('glass', '#9ed9df', 0.2, 0.35);
material('skin', '#bb8060', 0.78);
material('hair', '#302820', 0.82);
material('coat', '#f5f4ed', 0.55);
material('scrubs', '#138d8c', 0.5);
material('trousers', '#24394e', 0.8);
material('mask', '#a4d5cf', 0.62);
material('eye', '#f7f5ef', 0.4);
material('pupil', '#262a30', 0.5);
material('shoe', '#273441', 0.55);
material('gown', '#8ab9c8', 0.7);

const root = new TransformNode('ClinicRoot', scene);
const room = new TransformNode('RoomGroup', scene); room.parent = root;
const unit = new TransformNode('DentalUnitGroup', scene); unit.parent = root;
const jawGroup = new TransformNode('JawGroup', scene); jawGroup.parent = root;
const toolGroup = new TransformNode('InstrumentGroup', scene); toolGroup.parent = root;
const peopleRoot = new TransformNode('PeoplePreviewRoot', scene);
peopleRoot.setEnabled(false);
const treatmentRoot = new TransformNode('IntegratedTreatmentRoot', scene);
treatmentRoot.setEnabled(false);
const pediatricRoot = new TransformNode('PrimaryDentitionAtlasRoot', scene);
pediatricRoot.setEnabled(false);
const treatmentLight = new PointLight('ChairsideExamLight', new Vector3(0, 2.65, -0.8), scene);
treatmentLight.intensity = 0;
treatmentLight.range = 4.2;
treatmentLight.diffuse = new Color3(1, 0.91, 0.77);

function box(name, size, pos, mat, parent, extra = {}) {
  const mesh = MeshBuilder.CreateBox(name, size, scene);
  mesh.position = new Vector3(...pos);
  mesh.material = mats[mat];
  mesh.parent = parent;
  if (extra.rotation) mesh.rotation = new Vector3(...extra.rotation);
  if (extra.scaling) mesh.scaling = new Vector3(...extra.scaling);
  return mesh;
}
function cylinder(name, height, diameter, pos, mat, parent, tessellation = 32) {
  const mesh = MeshBuilder.CreateCylinder(name, { height, diameter, tessellation }, scene);
  mesh.position = new Vector3(...pos);
  mesh.material = mats[mat];
  mesh.parent = parent;
  return mesh;
}
function sphere(name, diameter, pos, mat, parent, scaling) {
  const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 24 }, scene);
  mesh.position = new Vector3(...pos);
  if (scaling) mesh.scaling = new Vector3(...scaling);
  mesh.material = mats[mat];
  mesh.parent = parent;
  return mesh;
}
function tube(name, points, radius, mat, parent) {
  const mesh = MeshBuilder.CreateTube(name, { path: points.map(p => new Vector3(...p)), radius, tessellation: 12 }, scene);
  mesh.material = mats[mat]; mesh.parent = parent; return mesh;
}

// Room: clean, neutral architectural shell.
box('RoomFloor', [8.8, .18, 7.2], [0, -.1, 0], 'floor', room);
box('BackWall', [8.8, 3.6, .16], [0, 1.7, -3.6], 'wall', room);
box('LeftWall', [.16, 3.6, 7.2], [-4.4, 1.7, 0], 'wall', room);
box('RightWall', [.16, 3.6, 7.2], [4.4, 1.7, 0], 'wall', room);
box('BackBaseboard', [8.8, .12, .1], [0, .05, -3.49], 'trim', room);
box('WindowFrame', [2.05, 1.35, .12], [-2.65, 2.05, -3.48], 'metal', room);
box('WindowGlass', [1.86, 1.17, .035], [-2.65, 2.05, -3.39], 'glass', room);
box('WindowBarV', [.045, 1.17, .05], [-2.65, 2.05, -3.35], 'white', room);
box('WindowBarH', [1.86, .045, .05], [-2.65, 2.05, -3.35], 'white', room);
box('CabinetBase', [1.9, .82, .62], [2.9, .42, -2.8], 'white', room);
box('CabinetTop', [2.05, .1, .72], [2.9, .88, -2.8], 'metal', room);
for (let i=0;i<3;i++) {
  box('CabinetDoor'+i, [.56, .68, .035], [2.27+i*.63, .43, -2.46], 'wall', room);
  box('CabinetHandle'+i, [.035, .12, .035], [2.68+i*.63, .43, -2.42], 'metal', room);
}
box('CounterTop', [2.35, .12, .72], [2.65, 1.08, -2.72], 'white', room);
box('SinkBasin', [.6, .12, .38], [2.1, 1.17, -2.65], 'metal', room);
cylinder('SinkTap', .28, .045, [2.1, 1.34, -2.84], 'metal', room, 16);
box('MonitorDesk', [1.2, .1, .62], [-3.25, 1.08, -2.55], 'white', room);
box('MonitorScreen', [.82, .57, .08], [-3.25, 1.45, -2.78], 'dark', room);
box('MonitorDisplay', [.72, .46, .025], [-3.25, 1.45, -2.73], 'screen', room);
cylinder('MonitorStand', .24, .09, [-3.25, 1.12, -2.78], 'metal', room);
box('StoolSeat', [.7, .16, .7], [-2.9, .72, 1.9], 'tealDark', room);
cylinder('StoolStem', .58, .1, [-2.9, .38, 1.9], 'metal', room);
cylinder('StoolBase', .09, .8, [-2.9, .08, 1.9], 'metal', room);

// Dental chair, backrest and head support.
box('ChairBase', [1.3, .18, 1.45], [0, .32, .35], 'dark', unit);
cylinder('ChairLift', .7, .32, [0, .72, .35], 'metal', unit);
box('ChairSeat', [1.15, .3, 1.2], [0, 1.1, .28], 'teal', unit);
const back = box('ChairBackrest', [1.12, .26, 1.75], [0, 1.92, -.42], 'teal', unit);
back.rotation.x = -0.2;
const headrest = box('HeadRest', [.65, .25, .48], [0, 2.78, -.68], 'tealDark', unit);
headrest.rotation.x = -.18;
box('ChairFoot', [.88, .18, .55], [0, .92, 1.12], 'tealDark', unit);

// Delivery arm and instrument tray.
cylinder('UnitPedestal', .78, .34, [1.5, .42, -.15], 'white', unit);
box('UnitBody', [.65, .58, .8], [1.5, .98, -.15], 'white', unit);
box('TrayArm', [1.15, .1, .12], [1.03, 1.35, -.15], 'metal', unit);
box('InstrumentTray', [1.0, .09, .62], [.52, 1.43, -.15], 'metal', unit);
for(let i=0;i<3;i++) cylinder('HandpieceHolder'+i,.18,.11,[.22+i*.28,1.57,-.15],'dark',unit,20);
tube('SuctionHose', [[1.72,1.12,.02],[2.0,.9,.18],[2.12,.48,.55],[1.85,.32,.88]], .045, 'rubber', unit);
tube('HandpieceHose', [[1.45,1.18,-.45],[1.72,.96,-.55],[1.88,.55,-.75],[1.62,.38,-.9]], .035, 'rubber', unit);

// Operating lamp, arm and light head.
tube('LampArm', [[0,2.9,-.6],[.25,3.28,-.95],[.7,3.35,-1.2],[.95,3.05,-1.35]], .065, 'metal', unit);
const lamp = sphere('LampHead', .62, [1.0,2.9,-1.38], 'white', unit, [1.15,.35,.72]);
const lampGlow = new HemisphericLight('DentalLampLight', new Vector3(0,-1,0), scene);
lampGlow.position = new Vector3(1,2.65,-1.25);
lampGlow.intensity = .7;
lampGlow.diffuse = new Color3(1,.92,.77);
cylinder('LampLens', .035, .38, [1.0,2.77,-1.38], 'glass', unit);

// Stylized upper jaw and 16 tooth forms.
const jawArc = [];
for (let i=0;i<=32;i++) {
  const a = Math.PI + (Math.PI*i/32);
  jawArc.push([Math.cos(a)*1.02, 0, Math.sin(a)*.76]);
}
const upperGum = MeshBuilder.CreateTube('UpperGingiva', { path: jawArc.map(p=>new Vector3(p[0],p[1],p[2])), radius:.22, tessellation:20 }, scene);
upperGum.material = mats.gum; upperGum.parent = jawGroup; upperGum.position = new Vector3(0,2.45,-1.95);
for(let i=0;i<16;i++) {
  const a = Math.PI + Math.PI*i/15;
  const x = Math.cos(a)*1.02;
  const z = Math.sin(a)*.76;
  const tooth = MeshBuilder.CreateCylinder('UpperTooth_'+String(i+1).padStart(2,'0'), { height:.42, diameterTop:.2, diameterBottom:.28, tessellation:20 }, scene);
  tooth.position = new Vector3(x,2.5,-1.95+z);
  tooth.scaling.y = 1.15;
  tooth.material = mats.tooth;
  tooth.parent = jawGroup;
  const crown = sphere('ToothCrown_'+(i+1), .25, [x,2.68,-1.95+z], 'tooth', jawGroup, [1,.75,.9]);
}
const jawBase = box('JawDisplayBase',[2.45,.12,1.9],[0,2.16,-1.95],'dark',jawGroup);
jawBase.visibility = .75;

// Simple educational tools, grouped and named.
const mirrorHandle = cylinder('DentalMirrorHandle', .9, .055, [-1.5,1.75,.2], 'metal', toolGroup);
mirrorHandle.rotation.z = -.35;
const mirrorNeck = tube('DentalMirrorNeck',[[-1.5,2.1,.2],[-1.48,2.32,.25],[-1.38,2.42,.28]],.025,'metal',toolGroup);
const mirrorHead = sphere('DentalMirrorHead',.28,[-1.36,2.45,.29],'metal',toolGroup,[1,.18,1]);
const probeHandle = cylinder('DentalProbeHandle', .72, .06, [-1.95,1.72,.1], 'tealDark', toolGroup);
probeHandle.rotation.z = -.28;
tube('DentalProbeTip',[[-1.95,2.04,.1],[-1.9,2.28,.12],[-1.78,2.38,.16]],.018,'metal',toolGroup);
sphere('ProbeGrip',.1,[-1.95,1.55,.1],'accent',toolGroup,[1,2,1]);

// Character preview lab: original educational stand-ins, not scanned people or clinical avatars.
box('PeopleStageFloor',[5.7,.14,4.7],[0,-.08,0],'floor',peopleRoot);
box('PeopleStageBack',[5.7,3.4,.12],[0,1.58,-2.4],'wall',peopleRoot);
box('PeopleStageAccent',[5.7,.1,.14],[0,.04,-2.29],'teal',peopleRoot);
box('PeopleStageLeft',[.12,3.0,4.7],[-2.85,1.45,0],'wall',peopleRoot);
box('PeopleStageRight',[.12,3.0,4.7],[2.85,1.45,0],'wall',peopleRoot);

function addPersonFace(prefix, group, y, z, skinName = 'skin', hairName = 'hair', mask = false) {
  sphere(prefix+'_Head',.43,[0,y,z],skinName,group,[.9,1.08,.85]);
  sphere(prefix+'_HairCap',.45,[0,y+.12,z-.015],hairName,group,[1.02,.54,.92]);
  sphere(prefix+'_EarL',.09,[-.19,y,z+.005],skinName,group);
  sphere(prefix+'_EarR',.09,[.19,y,z+.005],skinName,group);
  for (const side of [-1,1]) {
    sphere(prefix+'_EyeWhite_'+side,.075,[side*.075,y+.025,z+.175],'eye',group,[1,.85,.45]);
    sphere(prefix+'_Pupil_'+side,.036,[side*.075,y+.02,z+.205],'pupil',group);
  }
  sphere(prefix+'_Nose',.075,[0,y-.04,z+.2],skinName,group,[.75,1,.72]);
  if (mask) {
    box(prefix+'_SurgicalMask',[.24,.115,.035],[0,y-.105,z+.205],'mask',group);
    tube(prefix+'_MaskBandL',[[-.12,y-.09,z+.19],[-.22,y-.06,z+.08]],.012,'mask',group);
    tube(prefix+'_MaskBandR',[[.12,y-.09,z+.19],[.22,y-.06,z+.08]],.012,'mask',group);
  } else {
    tube(prefix+'_Mouth',[[-.055,y-.145,z+.18],[0,y-.16,z+.19],[.055,y-.145,z+.18]],.009,'pupil',group);
  }
}

function buildStandingPerson(prefix, x, z, clothing, masked = false, withCoat = false, parentRoot = peopleRoot) {
  const group = new TransformNode(prefix, scene);
  group.parent = parentRoot;
  group.position.set(x,0,z);
  sphere(prefix+'_Pelvis',.46,[0,.85,0],withCoat?'trousers':clothing,group,[.74,.75,.55]);
  sphere(prefix+'_Torso',.82,[0,1.23,0],withCoat?'coat':clothing,group,[.79,.78,.48]);
  if (withCoat) {
    box(prefix+'_Shirt',[.2,.48,.035],[0,1.22,.205],'scrubs',group);
    box(prefix+'_CoatLeft',[.14,.55,.06],[-.16,1.23,.19],'coat',group);
    box(prefix+'_CoatRight',[.14,.55,.06],[.16,1.23,.19],'coat',group);
    for(let i=0;i<3;i++) sphere(prefix+'_Button'+i,.035,[0,1.05+i*.15,.25],'metal',group);
    tube(prefix+'_StethoscopeL',[[0,1.6,.19],[-.12,1.48,.22],[-.12,1.15,.24]],.023,'dark',group);
    tube(prefix+'_StethoscopeR',[[0,1.6,.19],[.12,1.48,.22],[.12,1.15,.24]],.023,'dark',group);
    sphere(prefix+'_StethoscopeChest',.07,[.12,1.1,.25],'metal',group);
  } else {
    box(prefix+'_ScrubPocket',[.2,.16,.035],[0,1.24,.213],'tealDark',group);
  }
  cylinder(prefix+'_Neck',.18,.15,[0,1.67,0],'skin',group,20);
  addPersonFace(prefix,group,1.91,.01,'skin','hair',masked);
  for(const side of [-1,1]) {
    tube(prefix+'_Arm_'+side,[[side*.28,1.46,0],[side*.39,1.2,.035],[side*.38,.98,.12]],.095,withCoat?'coat':clothing,group);
    sphere(prefix+'_Hand_'+side,.17,[side*.38,.91,.14],'skin',group,[.75,1,.8]);
    tube(prefix+'_Leg_'+side,[[side*.12,.79,0],[side*.14,.44,.015],[side*.15,.14,.04]],.115,'trousers',group);
    sphere(prefix+'_Shoe_'+side,.25,[side*.15,.09,.13],'shoe',group,[1,.38,1.45]);
  }
  return group;
}

function buildSeatedPatient() {
  const g = new TransformNode('PatientPreview',scene);
  g.parent = peopleRoot;
  box('PatientChairBase',[.92,.16,1.15],[0,.3,-.32],'dark',g);
  cylinder('PatientChairColumn',.48,.24,[0,.61,-.32],'metal',g);
  box('PatientChairSeat',[.98,.2,.92],[0,.86,-.33],'teal',g);
  const backrest=box('PatientChairBack',[.96,.18,1.12],[0,1.38,-.76],'teal',g);
  backrest.rotation.x=-.22;
  box('PatientHeadSupport',[.48,.16,.34],[0,1.96,-.9],'tealDark',g);
  box('PatientFootRest',[.82,.13,.5],[0,.62,.35],'tealDark',g);
  sphere('PatientPelvis',.45,[0,.99,-.35],'gown',g,[.85,.72,.6]);
  const torso=sphere('PatientTorso',.82,[0,1.43,-.66],'gown',g,[.83,.8,.52]);
  torso.rotation.x=-.22;
  cylinder('PatientNeck',.16,.14,[0,1.83,-.82],'skin',g,20);
  addPersonFace('Patient',g,2.03,-.85);
  for(const side of [-1,1]) {
    tube('PatientArm_'+side,[[side*.28,1.58,-.62],[side*.42,1.27,-.34],[side*.43,1.0,-.08]],.085,'gown',g);
    sphere('PatientHand_'+side,.15,[side*.43,.98,-.04],'skin',g);
    tube('PatientThigh_'+side,[[side*.14,.91,-.2],[side*.16,.7,.12],[side*.16,.62,.38]],.11,'gown',g);
    tube('PatientShin_'+side,[[side*.16,.62,.38],[side*.16,.45,.55],[side*.16,.33,.67]],.095,'gown',g);
    sphere('PatientFoot_'+side,.22,[side*.16,.3,.76],'skin',g,[.8,.55,1.5]);
  }
  return g;
}
const proceduralPatient = buildSeatedPatient();
proceduralPatient.setEnabled(true);
buildStandingPerson('DentistPreview',-1.75,.25,'coat',false,true);
buildStandingPerson('AssistantPreview',1.75,.25,'scrubs',true,false);

// Integrated chairside encounter: the patient, dentist, assistant and tray share one clinic scene.
const treatmentPatient = new TransformNode('PatientSupineOnDentalChair', scene);
treatmentPatient.parent = treatmentRoot;
treatmentPatient.position.set(0, 1.2, 0);
const patientBody = sphere('TreatmentPatientTorso', .9, [0, 0, 0.05], 'gown', treatmentPatient, [.68, .48, 1.08]);
const patientPelvis = sphere('TreatmentPatientPelvis', .58, [0, -.025, .79], 'gown', treatmentPatient, [.7, .65, .72]);
const patientNeck = cylinder('TreatmentPatientNeck', .24, .22, [0, .02, -.78], 'skin', treatmentPatient, 20);
const patientHead = sphere('TreatmentPatientHead', .72, [0, .035, -1.08], 'skin', treatmentPatient, [.78, .72, .9]);
sphere('TreatmentPatientHair', .73, [0, .12, -1.22], 'hair', treatmentPatient, [.8, .45, .8]);
for (const side of [-1, 1]) {
  sphere('TreatmentPatientEar_' + side, .14, [side * .28, .04, -1.05], 'skin', treatmentPatient, [.65, 1, 1]);
  sphere('TreatmentPatientEye_' + side, .095, [side * .105, .29, -1.19], 'eye', treatmentPatient, [1, .6, .8]);
  sphere('TreatmentPatientPupil_' + side, .04, [side * .105, .33, -1.2], 'pupil', treatmentPatient);
}
sphere('TreatmentPatientNose', .12, [0, .29, -.98], 'skin', treatmentPatient, [.7, .65, 1.1]);
sphere('TreatmentPatientMouth', .17, [0, .277, -.84], 'rubber', treatmentPatient, [1, .18, .55]);
const patientJawPivot = new TransformNode('TreatmentPatientLowerJawPivot', scene);
patientJawPivot.parent = treatmentPatient;
patientJawPivot.position.set(0, .08, -.81);
patientJawPivot.rotation.x = .24;
box('TreatmentPatientLowerJaw', [.31, .085, .2], [0, -.015, -.045], 'skin', patientJawPivot);
for (let i = 0; i < 4; i++) {
  sphere('TreatmentPatientUpperTooth_' + i, .055, [-.09 + i * .06, .315, -.865], 'tooth', treatmentPatient, [1, .35, .7]);
  sphere('TreatmentPatientLowerTooth_' + i, .05, [-.09 + i * .06, .085, -.85], 'tooth', patientJawPivot, [1, .35, .7]);
}
// Hands-on restorative training tooth: distinct crown, roots, caries lesion and treatment states.
const clinicalToothRoot = new TransformNode('ClinicalRestorationTooth', scene);
clinicalToothRoot.parent = treatmentPatient;
clinicalToothRoot.position.set(.12, .245, -.91);
const clinicalToothCrown = sphere('ClinicalToothCrown', .245, [0, 0, 0], 'tooth', clinicalToothRoot, [1.05, .82, .92]);
const clinicalToothNeck = cylinder('ClinicalToothNeck', .18, .105, [0, -.115, -.005], 'tooth', clinicalToothRoot, 24);
clinicalToothNeck.rotation.x = Math.PI / 2;
for (const dx of [-.055, .055]) {
  const root = cylinder('ClinicalToothRoot_' + dx, .25, .065, [dx, -.27, -.005], 'tooth', clinicalToothRoot, 20);
  root.rotation.z = dx < 0 ? -.12 : .12;
}
for (const dx of [-.065, .065]) {
  sphere('ClinicalToothCusp_' + dx, .09, [dx, .065, -.015], 'tooth', clinicalToothRoot, [.8, .48, .8]);
}
const clinicalCariesLesion = sphere('ClinicalCariesLesion', .092, [.055, .012, -.092], 'dark', clinicalToothRoot, [1, .78, .34]);
const clinicalCariesTint = new StandardMaterial('ClinicalCariesTint', scene);
clinicalCariesTint.diffuseColor = new Color3(.20, .075, .035);
clinicalCariesTint.specularColor = new Color3(.04, .03, .02);
clinicalCariesLesion.material = clinicalCariesTint;
const clinicalCavity = sphere('ClinicalPreparedCavity', .068, [.055, .012, -.086], 'dark', clinicalToothRoot, [1, .68, .26]);
clinicalCavity.setEnabled(false);
const clinicalRestoration = sphere('ClinicalCompositeRestoration', .067, [.055, .012, -.091], 'accent', clinicalToothRoot, [1, .72, .3]);
clinicalRestoration.setEnabled(false);
clinicalToothRoot.metadata = { title: 'ضرس تدريبي مصاب بالتسوس', detail: 'نموذج تعليمي لحالة تسوس إطباقي؛ تغيرات العلاج هنا مرئية ومبسطة وليست محاكاة نسيجية أو توصية علاجية.' };
box('TreatmentPatientBib', [.62, .045, .72], [0, .39, -.12], 'white', treatmentPatient);
for (const side of [-1, 1]) {
  tube('TreatmentPatientUpperArm_' + side, [[side*.32,.02,-.5],[side*.52,-.02,-.18],[side*.56,-.08,.2]], .105, 'gown', treatmentPatient);
  sphere('TreatmentPatientHand_' + side, .16, [side*.56,-.08,.27], 'skin', treatmentPatient, [.8,.65,1]);
  tube('TreatmentPatientThigh_' + side, [[side*.14,0,.72],[side*.17,-.04,1.12],[side*.17,-.08,1.42]], .15, 'gown', treatmentPatient);
  tube('TreatmentPatientShin_' + side, [[side*.17,-.08,1.42],[side*.17,-.08,1.78],[side*.17,-.08,2.05]], .12, 'gown', treatmentPatient);
  sphere('TreatmentPatientShoe_' + side, .28, [side*.17,-.1,2.12], 'shoe', treatmentPatient, [.8,.6,1.4]);
}
const treatmentDentist = buildStandingPerson('IntegratedDentist', -1.55, .02, 'coat', true, true, treatmentRoot);
treatmentDentist.rotation.y = Math.PI / 2;
const treatmentAssistant = buildStandingPerson('IntegratedAssistant', 1.55, .02, 'scrubs', true, false, treatmentRoot);
treatmentAssistant.rotation.y = -Math.PI / 2;

// Chairside delivery tray and a reusable, selectable instrument proxy.
box('TreatmentTrayStand', [.12, .82, .12], [-1.58, .48, 1.12], 'metal', treatmentRoot);
box('TreatmentTraySurface', [1.05, .09, .72], [-1.58, .91, 1.12], 'metal', treatmentRoot);
for (let i = 0; i < 4; i++) {
  const trayInstrument = cylinder('TrayInstrument_' + i, .58, .055, [-1.92 + i * .22, .99, 1.08], i % 2 ? 'tealDark' : 'metal', treatmentRoot, 20);
  trayInstrument.rotation.x = Math.PI / 2;
  trayInstrument.metadata = { treatmentLabel: ['مرآة الفحص','مسبار الأسنان','ملقط قطني','مقبض أداة دوارة'][i], detail: 'أداة عرض تعليمية على صينية الطبيب.' };
}
const activeInstrumentRoot = new TransformNode('ActiveTreatmentInstrument', scene);
activeInstrumentRoot.parent = treatmentRoot;
activeInstrumentRoot.position.set(-1.58, 1.08, 1.12);
const activeInstrumentHandle = cylinder('ActiveInstrumentHandle', .78, .065, [0,0,0], 'metal', activeInstrumentRoot, 24);
activeInstrumentHandle.rotation.x = Math.PI / 2;
const activeInstrumentGrip = cylinder('ActiveInstrumentGrip', .22, .095, [0,0,.18], 'tealDark', activeInstrumentRoot, 24);
activeInstrumentGrip.rotation.x = Math.PI / 2;
const activeInstrumentTip = sphere('ActiveInstrumentTip', .105, [0,0,-.42], 'white', activeInstrumentRoot, [1,.65,1.4]);
activeInstrumentRoot.metadata = { treatmentLabel: 'الأداة المختارة', detail: 'أداة تعليمية متحركة؛ لا تحاكي قوة أو دقة أداة سريرية حقيقية.' };


// Selection and metadata.
const descriptions = new Map();
function describe(mesh, title, detail) {
  mesh.metadata = { title, detail };
  descriptions.set(mesh.name, { title, detail });
}
scene.meshes.forEach(m => {
  if (m.name.includes('Tooth')) describe(m, 'سن تعليمي', 'شكل مبسط لسن ضمن نموذج الفك العلوي.');
});
describe(back,'مسند كرسي الأسنان','مسند قابل لتغيير الارتفاع ضمن نموذج الوحدة.');
describe(lamp,'مصباح الفحص','مصباح إضاءة توضيحي أعلى منطقة العمل.');
describe(upperGum,'اللثة العلوية','نموذج بصري مبسط للثة حول الأسنان.');
describe(mirrorHead,'مرآة فحص الأسنان','أداة فحص توضيحية وليست نموذجًا سريريًا معتمدًا.');
describe(probeHandle,'مسبار الأسنان','أداة فحص تعليمية مبسطة.');

let selectedTool = 'select';
let activeExperience = 'procedural';
let chairHeight = 0;
let lampOn = true;
scene.onPointerObservable.add((pointerInfo) => {
  if (pointerInfo.type !== PointerEventTypes.POINTERPICK || !pointerInfo.pickInfo?.hit) return;
  const picked = pointerInfo.pickInfo.pickedMesh;
  if (!picked || picked === scene.meshes[0]) return;
  if (activeExperience === 'pediatric') {
    const fdi = picked.metadata?.pediatricToothFdi;
    if (fdi) selectPediatricTooth(fdi);
    return;
  }
  if (activeExperience === 'dental-scope' || activeExperience === 'oral-exam') {
    const dentalKey = picked.metadata?.dentalScopeKey;
    if (dentalKey) {
      selectDentalStructure(dentalKey);
      const match = dentalKey.match(/^tooth-(\d{2})$/);
      if (match) {
        if (activeExperience === 'oral-exam') selectOralExamTooth(match[1]);
        else void loadDentalTooth(match[1]);
      }
    }
    return;
  }
  if (activeExperience === 'body-anatomy') {
    const record = bodyMeshRecords.find(item => item.mesh === picked);
    if (record) selectBodyStructure(record);
    return;
  }
  if (activeExperience === 'anatomy' && typeof anatomyCatalog !== 'undefined' && anatomyCatalog.some(item => item.id === picked.name)) {
    selectAnatomy(picked.name);
    return;
  }
  let node = picked;
  while (node && !node.metadata?.title && node.parent) node = node.parent;
  const data = node?.metadata || picked.metadata;
  if (data?.title) {
    document.getElementById('selection-name').textContent = data.title;
    document.getElementById('selection-description').textContent = data.detail;
  } else {
    document.getElementById('selection-name').textContent = picked.name.replaceAll('_',' ');
    document.getElementById('selection-description').textContent = 'عنصر ثلاثي الأبعاد داخل عيادة الأسنان.';
  }
  if (selectedTool !== 'select') {
    document.getElementById('selection-description').textContent += ' أداة التفاعل المختارة: ' + (selectedTool === 'mirror' ? 'مرآة الفحص' : 'مسبار الأسنان') + '.';
  }
});

function setCamera(mode) {
  if (activeExperience === 'pediatric') {
    const views = {
      orbit: [-Math.PI/2, 1.12, 4.8, new Vector3(-.8, 0, 0)],
      front: [-Math.PI/2, 1.2, 4.8, new Vector3(-.8, 0, 0)],
      side: [0, 1.2, 4.8, new Vector3(-.8, 0, 0)],
      top: [-Math.PI/2, .22, 5.2, new Vector3(-.8, 0, 0)]
    };
    const view = views[mode] || views.orbit;
    camera.alpha = view[0]; camera.beta = view[1]; camera.radius = view[2]; camera.setTarget(view[3]);
    document.querySelectorAll('.camera-button').forEach(b => b.classList.toggle('selected', b.dataset.camera === mode));
    setTimeout(fitVisibleSceneToSquare, 120);
    return;
  }
  if (activeExperience === 'treatment') {
    const views = {
      orbit: [-Math.PI/2.25, 1.12, 8.1, new Vector3(0, 1.35, 0)],
      front: [-Math.PI/2, 1.18, 8.0, new Vector3(0, 1.35, 0)],
      side: [0, 1.18, 8.0, new Vector3(0, 1.35, 0)],
      top: [-Math.PI/2, .24, 9.2, new Vector3(0, 1.15, 0)]
    };
    const view = views[mode] || views.orbit;
    camera.alpha = view[0]; camera.beta = view[1]; camera.radius = view[2]; camera.setTarget(view[3]);
    document.querySelectorAll('.camera-button').forEach(b => b.classList.toggle('selected', b.dataset.camera === mode));
    setTimeout(fitVisibleSceneToSquare, 120);
    return;
  }
  if (activeExperience === 'dental-scope') {
    const views = {
      orbit: [-Math.PI/2.25,1.13,12.8,new Vector3(0,0,0)],
      front: [-Math.PI/2,1.2,12.8,new Vector3(0,0,0)],
      side: [0,1.2,12.8,new Vector3(0,0,0)],
      top: [-Math.PI/2,.18,15,new Vector3(0,0,0)]
    };
    const view=views[mode]||views.orbit;
    camera.alpha=view[0];camera.beta=view[1];camera.radius=view[2];camera.setTarget(view[3]);
    document.querySelectorAll('.camera-button').forEach(b=>b.classList.toggle('selected',b.dataset.camera===mode));
    setTimeout(fitVisibleSceneToSquare, 120);
    return;
  }
  if (activeExperience === 'oral-exam') {
    const views = {
      orbit: [-Math.PI/2.22, 1.18, 16.5, new Vector3(0, 0.2, 0)],
      front: [-Math.PI/2, 1.2, 16.5, new Vector3(0, 0.15, 0)],
      side: [0, 1.2, 16.5, new Vector3(0, 0.15, 0)],
      top: [-Math.PI/2, .22, 18, new Vector3(0, 0, 0)]
    };
    const view = views[mode] || views.orbit;
    camera.alpha = view[0]; camera.beta = view[1]; camera.radius = view[2]; camera.setTarget(view[3]);
    document.querySelectorAll('.camera-button').forEach(b => b.classList.toggle('selected', b.dataset.camera === mode));
    const mouthMeshes = dentalMeshRecords
      .filter(record => record.file !== 'context.glb' && record.file !== 'neurovascular.glb')
      .map(record => record.mesh);
    setTimeout(() => fitVisibleSceneToSquare(mouthMeshes), 120);
    return;
  }
  if (activeExperience === 'body-anatomy') {
    const views = {
      orbit: [-Math.PI/2.2,1.15,7.4,new Vector3(0,2.25,0)],
      front: [-Math.PI/2,1.2,7.2,new Vector3(0,2.25,0)],
      side: [0,1.2,7.2,new Vector3(0,2.25,0)],
      top: [-Math.PI/2,.18,8.5,new Vector3(0,2.1,0)]
    };
    const view=views[mode]||views.orbit;
    camera.alpha=view[0];camera.beta=view[1];camera.radius=view[2];camera.setTarget(view[3]);
    document.querySelectorAll('.camera-button').forEach(b=>b.classList.toggle('selected',b.dataset.camera===mode));
    setTimeout(fitVisibleSceneToSquare, 120);
    return;
  }
  if (activeExperience === 'people') {
    const peopleViews = {
      orbit: [Math.PI/2,1.12,6.2,new Vector3(0,1.05,0)],
      front: [Math.PI/2,1.2,6.2,new Vector3(0,1.05,0)],
      side: [0,1.18,6.2,new Vector3(0,1.05,0)],
      top: [Math.PI/2,.25,6.5,new Vector3(0,1.0,0)]
    };
    const view = peopleViews[mode] || peopleViews.orbit;
    camera.alpha=view[0]; camera.beta=view[1]; camera.radius=view[2]; camera.setTarget(view[3]);
    document.querySelectorAll('.camera-button').forEach(b => b.classList.toggle('selected', b.dataset.camera === mode));
    setTimeout(fitVisibleSceneToSquare, 120);
    return;
  }
  if (activeExperience === 'anatomy') {
    const angles = {
      orbit: [-Math.PI / 2.3, 1.05, 5.4, new Vector3(0, 0.05, 0)],
      front: [-Math.PI / 2, 1.15, 5.4, new Vector3(0, 0.05, 0)],
      side: [0, 1.15, 5.4, new Vector3(0, 0.05, 0)],
      top: [-Math.PI / 2, 0.22, 5.6, new Vector3(0, 0, 0)]
    };
    const view = angles[mode] || angles.orbit;
    camera.alpha = view[0]; camera.beta = view[1]; camera.radius = view[2]; camera.setTarget(view[3]);
    document.querySelectorAll('.camera-button').forEach(b => b.classList.toggle('selected', b.dataset.camera === mode));
    setTimeout(fitVisibleSceneToSquare, 120);
    return;
  }
  if (activeExperience === 'clinic-pack') {
    const angles = {
      orbit: [-Math.PI / 2.35, 1.12, 10.5, new Vector3(0, 0.75, 0)],
      front: [-Math.PI / 2, 1.18, 10.5, new Vector3(0, 0.75, 0)],
      side: [0, 1.18, 10.5, new Vector3(0, 0.75, 0)],
      top: [-Math.PI / 2, 0.3, 12, new Vector3(0, 0.5, 0)]
    };
    const view = angles[mode] || angles.orbit;
    camera.alpha = view[0]; camera.beta = view[1]; camera.radius = view[2]; camera.setTarget(view[3]);
    document.querySelectorAll('.camera-button').forEach(b => b.classList.toggle('selected', b.dataset.camera === mode));
    setTimeout(fitVisibleSceneToSquare, 120);
    return;
  }
  const presets = {
    orbit: [-Math.PI/2.35,1.08,9.5,new Vector3(0,1.25,0)],
    front: [-Math.PI/2,1.15,9.3,new Vector3(0,1.35,-.2)],
    side: [0,1.18,9.3,new Vector3(0,1.3,-.2)],
    top: [-Math.PI/2,.18,10,new Vector3(0,1.0,-.3)]
  };
  const p = presets[mode] || presets.orbit;
  camera.alpha=p[0]; camera.beta=p[1]; camera.radius=p[2]; camera.setTarget(p[3]);
  document.querySelectorAll('.camera-button').forEach(b=>b.classList.toggle('selected',b.dataset.camera===mode));
  setTimeout(fitVisibleSceneToSquare, 120);
}

function fitVisibleSceneToSquare(meshesToFit = null) {
  if (!scene || !camera || scene.isDisposed) return;
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  let found = 0;
  const candidateMeshes = Array.isArray(meshesToFit) && meshesToFit.length ? meshesToFit : scene.meshes;
  for (const mesh of candidateMeshes) {
    try {
      if (!mesh.getTotalVertices || mesh.getTotalVertices() === 0 || !mesh.isVisible || !mesh.isEnabled()) continue;
      mesh.computeWorldMatrix(true);
      const bounds = mesh.getBoundingInfo()?.boundingBox;
      if (!bounds) continue;
      min.minimizeInPlace(bounds.minimumWorld);
      max.maximizeInPlace(bounds.maximumWorld);
      found += 1;
    } catch (error) {
      console.debug('Skipping mesh while fitting camera bounds.', mesh.name, error);
    }
  }
  if (!found) return;
  const center = min.add(max).scale(0.5);
  const diagonal = max.subtract(min).length();
  const boundingRadius = Math.max(diagonal * 0.5, 0.65);
  const safeFov = Math.max(0.35, Math.min(camera.fov || 0.8, 1.25));
  const fitRadius = Math.max(1.6, (boundingRadius / Math.sin(safeFov * 0.5)) * 1.12);
  camera.setTarget(center);
  camera.radius = fitRadius;
  camera.lowerRadiusLimit = fitRadius * 0.94;
  camera.upperRadiusLimit = Math.max(fitRadius * 2.5, fitRadius + 4);
  camera.panningSensibility = 0;
  camera.maxZ = Math.max(100, fitRadius * 30);
}

document.querySelectorAll('.camera-button').forEach(b=>b.addEventListener('click',()=>setCamera(b.dataset.camera)));
document.getElementById('reset-camera').addEventListener('click',()=>setCamera('orbit'));
document.getElementById('toggle-room').addEventListener('change',e=>room.setEnabled(e.target.checked));
document.getElementById('toggle-unit').addEventListener('change',e=>unit.setEnabled(e.target.checked));
document.getElementById('toggle-jaw').addEventListener('change',e=>jawGroup.setEnabled(e.target.checked));
document.getElementById('toggle-tools').addEventListener('change',e=>toolGroup.setEnabled(e.target.checked));
document.querySelectorAll('.tool-button').forEach(b=>b.addEventListener('click',()=>{
  selectedTool=b.dataset.tool;
  document.querySelectorAll('.tool-button').forEach(x=>x.classList.toggle('active',x===b));
  document.getElementById('selection-name').textContent=b.querySelector('b').textContent;
  document.getElementById('selection-description').textContent=b.querySelector('small').textContent;
}));
document.getElementById('chair-up').addEventListener('click',()=>{
  chairHeight=Math.min(.45,chairHeight+.08);
  ['ChairSeat','ChairBackrest','HeadRest','ChairFoot'].forEach(n=>{const m=scene.getMeshByName(n);if(m)m.position.y+=.08;});
});
document.getElementById('chair-down').addEventListener('click',()=>{
  if(chairHeight<=0)return;
  chairHeight=Math.max(0,chairHeight-.08);
  ['ChairSeat','ChairBackrest','HeadRest','ChairFoot'].forEach(n=>{const m=scene.getMeshByName(n);if(m)m.position.y-=.08;});
});
document.getElementById('lamp-toggle').addEventListener('click',()=>{
  lampOn=!lampOn; lampGlow.setEnabled(lampOn); lamp.setEnabled(lampOn);
  document.getElementById('lamp-state').textContent=lampOn?'الإضاءة تعمل':'الإضاءة متوقفة';
});


const assetStatus = document.getElementById('asset-status');
const loadingOverlay = document.getElementById('loading');
const anatomyPanel = document.getElementById('anatomy-section');
const pediatricPanel = document.getElementById('pediatric-section');
const structureList = document.getElementById('structure-list');
const highlight = new HighlightLayer('SelectedStructure', scene);
let clinicAssetRoot = null;
let anatomyAssetRoot = null;
let clinicContainer = null;
let anatomyContainer = null;
let selectedAnatomyId = null;

const anatomyCatalog = [];
const toothKinds = [
  ['central-incisor','القاطع المركزي'],
  ['lateral-incisor','القاطع الجانبي'],
  ['canine','الناب'],
  ['first-premolar','الضاحك الأول'],
  ['second-premolar','الضاحك الثاني'],
  ['first-molar','الضرس الأول'],
  ['second-molar','الضرس الثاني']
];
for (const [arch, archName] of [['upper','الفك العلوي'],['lower','الفك السفلي']]) {
  for (const [side, sideName] of [['right','الأيمن'],['left','الأيسر']]) {
    for (const [kind, kindName] of toothKinds) {
      anatomyCatalog.push({
        id: `${arch}-${side}-${kind}`,
        label: `${kindName} — ${archName} ${sideName}`,
        group: `${archName} — ${sideName}`
      });
    }
  }
}
anatomyCatalog.push(
  {id:'upper-gum',label:'اللثة العلوية',group:'اللثة'},
  {id:'lower-gum',label:'اللثة السفلية',group:'اللثة'},
  {id:'right-maxilla',label:'عظم الفك العلوي الأيمن',group:'عظام الفك'},
  {id:'left-maxilla',label:'عظم الفك العلوي الأيسر',group:'عظام الفك'},
  {id:'mandible',label:'عظم الفك السفلي',group:'عظام الفك'}
);

function setAssetStatus(message, state = '') {
  if (!assetStatus) return;
  assetStatus.textContent = message;
  assetStatus.classList.remove('ok','warn');
  if (state) assetStatus.classList.add(state);
}

function setProceduralControlsEnabled(enabled, mode = 'clinic') {
  for (const id of ['toggle-room','toggle-unit','toggle-tools']) {
    const control = document.getElementById(id);
    if (control) control.disabled = !enabled;
  }
  const jawControl = document.getElementById('toggle-jaw');
  if (jawControl) jawControl.disabled = mode === 'anatomy' ? false : !enabled;
  for (const id of ['chair-up','chair-down']) {
    const control = document.getElementById(id);
    if (control) control.disabled = !enabled;
  }
  const chairNote = document.querySelector('#chair-up small');
  if (chairNote) chairNote.textContent = enabled ? 'تحريك توضيحي للنموذج البديل' : 'الكرسي المستورد ثابت بدون تحريك';
}

const modelBase = new URL(import.meta.env.BASE_URL, window.location.href);
const localModelRoot = new URL('models/', modelBase).href;

async function loadContainer(localFile, remoteRoot, remoteFile) {
  try {
    return await SceneLoader.LoadAssetContainerAsync(localModelRoot, localFile, scene);
  } catch (localError) {
    console.warn(`Local model ${localFile} not present; trying its published source.`, localError);
    return await SceneLoader.LoadAssetContainerAsync(remoteRoot, remoteFile, scene);
  }
}

function attachCenteredContainer(container, nodeName, desiredSpan) {
  container.addAllToScene();
  const renderMeshes = container.meshes.filter(mesh => mesh.getTotalVertices() > 0 && mesh.getBoundingInfo);
  if (!renderMeshes.length) throw new Error('ملف GLB لا يحتوي على مجسمات قابلة للعرض.');
  for (const mesh of renderMeshes) mesh.computeWorldMatrix(true);

  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of renderMeshes) {
    const bounds = mesh.getBoundingInfo().boundingBox;
    min.minimizeInPlace(bounds.minimumWorld);
    max.maximizeInPlace(bounds.maximumWorld);
  }
  const size = max.subtract(min);
  const largest = Math.max(size.x, size.y, size.z, 0.001);
  const scale = desiredSpan / largest;

  const group = new TransformNode(nodeName, scene);
  for (const node of container.rootNodes) node.parent = group;
  group.scaling.setAll(scale);
  const centerX = (min.x + max.x) / 2;
  const centerZ = (min.z + max.z) / 2;
  group.position.set(-centerX * scale, -min.y * scale, -centerZ * scale);
  group.computeWorldMatrix(true);
  return { group, meshes: renderMeshes, size: size.scale(scale) };
}

async function ensureClinicModel() {
  if (clinicAssetRoot) return;
  setAssetStatus('جارٍ تحميل نموذج العيادة المتكامل…');
  try {
    clinicContainer = await loadContainer(
      'clinic-practice.glb',
      'https://cdn.3dassets.dev/assets/34423/v1/',
      'model.glb'
    );
    const mounted = attachCenteredContainer(clinicContainer, 'ExternalClinicPack', 8.4);
    clinicAssetRoot = mounted.group;
    root.setEnabled(false);
    clinicAssetRoot.setEnabled(true);
    setProceduralControlsEnabled(false, 'clinic');
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 28;
    setAssetStatus('تم تحميل مشهد العيادة: 54 أصلًا ثلاثي الأبعاد، غرفة علاج وتجهيزات ومناطق مساندة.', 'ok');
  } catch (error) {
    console.error('Clinic asset load failed', error);
    root.setEnabled(true);
    setProceduralControlsEnabled(true, 'clinic');
    setAssetStatus('تعذر تحميل الحزمة الخارجية؛ تم تشغيل العيادة البديلة المولّدة داخل المشروع.', 'warn');
  }
}

function selectAnatomy(id) {
  selectedAnatomyId = id;
  const selectedMeshes = [];
  for (const mesh of anatomyContainer?.meshes || []) {
    if (mesh.name === id || mesh.name.startsWith(id + '_')) {
      selectedMeshes.push(mesh);
      highlight.addMesh(mesh, Color3.FromHexString('#42d6bd'));
      document.getElementById('selection-name').textContent = anatomyCatalog.find(x=>x.id===id)?.label || mesh.name;
      document.getElementById('selection-description').textContent = 'تركيب تشريحي من نموذج BodyParts3D / Anatomography 4.3. استخدمه كمرجع تعليمي بصري فقط.';
    } else {
      highlight.removeMesh(mesh);
    }
  }
  if (selectedMeshes.length) setTimeout(() => fitVisibleSceneToSquare(selectedMeshes), 80);
  structureList?.querySelectorAll('.structure-button').forEach(button => {
    button.classList.toggle('selected', button.dataset.structure === id);
  });
}

function renderAnatomyList(filter = '') {
  if (!structureList) return;
  structureList.replaceChildren();
  const query = filter.trim().toLocaleLowerCase('ar');
  const groups = new Map();
  for (const item of anatomyCatalog) {
    if (query && !item.label.toLocaleLowerCase('ar').includes(query) && !item.group.toLocaleLowerCase('ar').includes(query)) continue;
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item);
  }
  for (const [groupName, items] of groups) {
    const heading = document.createElement('div');
    heading.className = 'anatomy-group-title';
    heading.textContent = groupName;
    structureList.appendChild(heading);
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'structure-button';
      button.dataset.structure = item.id;
      button.textContent = item.label;
      button.addEventListener('click', () => selectAnatomy(item.id));
      structureList.appendChild(button);
    }
  }
}
renderAnatomyList();

async function ensureAnatomyModel() {
  if (anatomyAssetRoot) return;
  setAssetStatus('جارٍ تحميل نموذج الفكين والأسنان والتراكيب التشريحية…');
  try {
    anatomyContainer = await loadContainer(
      'oral-anatomy.glb',
      'https://raw.githubusercontent.com/organui/teeth-3d/main/public/models/',
      'teeth.glb'
    );
    const mounted = attachCenteredContainer(anatomyContainer, 'ExternalOralAnatomy', 4.6);
    anatomyAssetRoot = mounted.group;
    anatomyAssetRoot.setEnabled(true);
    if (clinicAssetRoot) clinicAssetRoot.setEnabled(false);
    root.setEnabled(false);
    activeExperience = 'anatomy';
    anatomyPanel.hidden = false;
    setProceduralControlsEnabled(false, 'anatomy');
    camera.lowerRadiusLimit = 2.2;
    camera.upperRadiusLimit = 15;
    setCamera('orbit');
    document.getElementById('selection-name').textContent = 'التشريح الفموي';
    document.getElementById('selection-description').textContent = '28 سنًا دائمًا، اللثة، عظمتا الفك العلوي والفك السفلي.';
    setAssetStatus('تم تحميل 33 تركيبًا تشريحيًا منفصلًا. يمكنك اختيار كل سن أو عزل أي تركيب.', 'ok');
  } catch (error) {
    console.error('Anatomy model load failed', error);
    setAssetStatus('تعذر تحميل ملف التشريح الخارجي. بقي النموذج التوضيحي البديل متاحًا.', 'warn');
    anatomyPanel.hidden = true;
    root.setEnabled(true);
    setProceduralControlsEnabled(true, 'clinic');
    activeExperience = 'procedural';
  }
}

async function showClinicExperience() {
  pediatricRoot.setEnabled(false);
  pediatricPanel.hidden = true;
  treatmentRoot.setEnabled(false);
  treatmentLight.intensity = 0;
  treatmentLight.setEnabled(false);
  patientVariantControls.hidden = true;
  peopleRoot.setEnabled(false);
  dentalScopeRoot?.setEnabled(false);
  dentalToothDetails.forEach(item=>item.root.setEnabled(false));
  dentalAtlasPanel.hidden=true;
  engine.setHardwareScalingLevel(1.15);
  activeExperience = 'clinic-pack';
  peopleRoot.setEnabled(false);
  bodyPanel.hidden = true;
  bodyAssetRoot?.setEnabled(false);
  anatomyPanel.hidden = true;
  for (const id of ['view-oral-exam','view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas','view-pediatric']) {
    document.getElementById(id)?.classList.toggle('selected',id==='view-clinic');
  }
  loadingOverlay?.classList.remove('hidden');
  await ensureClinicModel();
  if (clinicAssetRoot) {
    setAssetStatus('تم تحميل مشهد العيادة: 54 أصلًا ثلاثي الأبعاد، غرفة علاج وتجهيزات ومناطق مساندة.', 'ok');
  }
  if (anatomyAssetRoot) anatomyAssetRoot.setEnabled(false);
  for(const item of patientVariants.values())item.root.setEnabled(false);
  if (clinicAssetRoot) {
    clinicAssetRoot.setEnabled(true);
    root.setEnabled(false);
    activeExperience = 'clinic-pack';
    setProceduralControlsEnabled(false, 'clinic');
  } else {
    root.setEnabled(true);
    activeExperience = 'procedural';
    setProceduralControlsEnabled(true, 'clinic');
  }
  camera.lowerRadiusLimit = 3;
  camera.upperRadiusLimit = 28;
  setCamera('orbit');
  loadingOverlay?.classList.add('hidden');
}


async function showTreatmentExperience() {
  pediatricRoot.setEnabled(false);
  pediatricPanel.hidden = true;
  patientVariantControls.hidden = false;
  peopleRoot.setEnabled(false);
  anatomyPanel.hidden = true;
  bodyPanel.hidden = true;
  dentalAtlasPanel.hidden = true;
  activeExperience = 'treatment';
  isPropAtMouth = false;
  selectedOralInventoryRoot?.setEnabled(false);
  selectedOralInventoryRoot = null;
  isPatientMouthOpen = true;
  patientJawPivot.rotation.x = .24;
  document.getElementById('patient-mouth-toggle').textContent = 'إغلاق الفم';
  for (const id of ['view-oral-exam','view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas','view-pediatric']) {
    document.getElementById(id)?.classList.toggle('selected', id === 'view-treatment');
  }
  loadingOverlay?.classList.remove('hidden');
  await ensureClinicModel();
  await selectPatientVariant(selectedPatientVariant);
  if (anatomyAssetRoot) anatomyAssetRoot.setEnabled(false);
  if (bodyAssetRoot) bodyAssetRoot.setEnabled(false);
  if (dentalScopeRoot) dentalScopeRoot.setEnabled(false);
  for (const item of dentalToothDetails.values()) item.root.setEnabled(false);
  for (const item of patientVariants.values()) item.root.setEnabled(false);
  if (clinicAssetRoot) {
    clinicAssetRoot.setEnabled(true);
    root.setEnabled(false);
    setProceduralControlsEnabled(false, 'clinic');
    setAssetStatus('تم تحميل مشهد العيادة: 54 أصلًا ثلاثي الأبعاد. المريض مستلقٍ والطبيب والمساعد داخل جلسة علاج واحدة.', 'ok');
  } else {
    root.setEnabled(true);
    setProceduralControlsEnabled(true, 'clinic');
    setAssetStatus('تم تشغيل العيادة البديلة: المريض مستلقٍ والطبيب والمساعد داخل جلسة علاج واحدة.', 'warn');
  }
  treatmentRoot.setEnabled(true);
  treatmentLight.setEnabled(true);
  treatmentLight.intensity = .85;
  camera.lowerRadiusLimit = 3.4;
  camera.upperRadiusLimit = 22;
  setCamera('treatment');
  loadingOverlay?.classList.add('hidden');
}
document.getElementById('view-treatment')?.addEventListener('click', showTreatmentExperience);

const patientModelStatus = document.getElementById('patient-model-status');
const patientVariantControls = document.getElementById('patient-variant-controls');
const patientVariants = new Map();
let selectedPatientVariant = 'male';
async function ensurePatientVariant(variant) {
  if(patientVariants.has(variant))return patientVariants.get(variant);
  const settings = variant === 'female'
    ? {
        local:'patient-female.glb',
        remote:'patient-female.glb',
        label:'المريضة'
      }
    : {
        local:'patient-male.glb',
        remote:'patient.glb',
        label:'المريض'
      };
  patientModelStatus.textContent='جارٍ تحميل '+settings.label+' ثلاثي الأبعاد…';
  const container=await loadContainer(
    settings.local,
    'https://raw.githubusercontent.com/Rishi-Sureshkumar/osce-sim/2ec3eac67b986ea838bb64a2375d63eb3bfbeac5/public/models/',
    settings.remote
  );
  const mounted=attachCenteredContainer(container,'Patient_'+variant,1.65);
  mounted.group.parent=peopleRoot;
  mounted.group.position.x=0;
  mounted.group.position.z=-.1;
  mounted.group.setEnabled(false);
  const model={container,root:mounted.group,label:settings.label};
  patientVariants.set(variant,model);
  return model;
}
async function selectPatientVariant(variant) {
  const patientStatus=document.getElementById('patient-model-status');
  try {
    const selected=await ensurePatientVariant(variant);
    for(const item of patientVariants.values())item.root.setEnabled(false);
    selected.root.parent = activeExperience === 'treatment' ? treatmentRoot : peopleRoot;
    selected.root.position.set(0, activeExperience === 'treatment' ? 1.1 : 0, activeExperience === 'treatment' ? 1.0 : -.1);
    selected.root.rotation.set(activeExperience === 'treatment' ? -Math.PI/2 : 0, 0, 0);
    selected.root.setEnabled(true);
    treatmentPatient.setEnabled(activeExperience !== 'treatment');
    proceduralPatient.setEnabled(false);
    selectedPatientVariant=variant;
    patientVariantControls?.querySelectorAll('.patient-variant-button').forEach(button=>{
      button.classList.toggle('selected',button.id===(variant==='female'?'patient-female':'patient-male'));
    });
    patientStatus.textContent='تم تحميل '+selected.label+' ثلاثي الأبعاد (CC0 / MakeHuman-derived).';
    document.getElementById('selection-name').textContent=selected.label;
    document.getElementById('selection-description').textContent='مجسم ثلاثي الأبعاد بملابس طبية وخامات مدمجة. يحتوي ملف المصدر على هيكل عظمي مختزل؛ لم تُضف بعد حركات أو وضعيات علاجية معتمدة.';
    return true;
  }catch(error){
    console.error('Patient model could not be loaded',variant,error);
    for(const item of patientVariants.values())item.root.setEnabled(false);
    proceduralPatient.setEnabled(activeExperience === 'people');
    treatmentPatient.setEnabled(activeExperience === 'treatment');
    patientStatus.textContent='تعذر تحميل المجسم الخارجي؛ تم إظهار النموذج البديل داخل المشروع.';
    return false;
  }
}
document.getElementById('patient-male')?.addEventListener('click',()=>void selectPatientVariant('male'));
document.getElementById('patient-female')?.addEventListener('click',()=>void selectPatientVariant('female'));

async function showPeopleExperience() {
  pediatricRoot.setEnabled(false);
  pediatricPanel.hidden = true;
  treatmentRoot.setEnabled(false);
  treatmentLight.intensity = 0;
  treatmentLight.setEnabled(false);
  dentalScopeRoot?.setEnabled(false);
  dentalToothDetails.forEach(item=>item.root.setEnabled(false));
  dentalAtlasPanel.hidden=true;
  engine.setHardwareScalingLevel(1.15);
  activeExperience = 'people';
  bodyPanel.hidden = true;
  bodyAssetRoot?.setEnabled(false);
  for (const id of ['view-oral-exam','view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas','view-pediatric']) {
    document.getElementById(id)?.classList.toggle('selected',id==='view-people');
  }
  root.setEnabled(false);
  clinicAssetRoot?.setEnabled(false);
  anatomyAssetRoot?.setEnabled(false);
  peopleRoot.setEnabled(true);
  patientVariantControls.hidden = false;
  anatomyPanel.hidden = true;
  for (const id of ['view-oral-exam','view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas','view-pediatric']) {
    document.getElementById(id)?.classList.toggle('selected',id==='view-people');
  }
  setProceduralControlsEnabled(false,'clinic');
  camera.lowerRadiusLimit = 3;
  camera.upperRadiusLimit = 12;
  setAssetStatus('وضع الشخصيات: طبيب ومساعد توضيحيان، مع اختيار مجسم مريض رجل أو امرأة من مكتبة CC0.', 'ok');
  await selectPatientVariant(selectedPatientVariant);
  document.getElementById('selection-name').textContent = 'فريق عيادة الأسنان';
  document.getElementById('selection-description').textContent = 'شخصيات تعليمية أولية لعرض التوزيع المكاني والأدوار داخل مشهد منفصل.';
  setCamera('orbit');
}
document.getElementById('view-people')?.addEventListener('click',showPeopleExperience);

async function showAnatomyExperience() {
  pediatricRoot.setEnabled(false);
  pediatricPanel.hidden = true;
  treatmentRoot.setEnabled(false);
  treatmentLight.intensity = 0;
  treatmentLight.setEnabled(false);
  patientVariantControls.hidden = true;
  dentalScopeRoot?.setEnabled(false);
  dentalToothDetails.forEach(item=>item.root.setEnabled(false));
  dentalAtlasPanel.hidden=true;
  engine.setHardwareScalingLevel(1.15);
  peopleRoot.setEnabled(false);
  bodyPanel.hidden = true;
  bodyAssetRoot?.setEnabled(false);
  for (const id of ['view-oral-exam','view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas','view-pediatric']) {
    document.getElementById(id)?.classList.toggle('selected',id==='view-anatomy');
  }
  loadingOverlay?.classList.remove('hidden');
  await ensureAnatomyModel();
  loadingOverlay?.classList.add('hidden');
}

document.getElementById('view-clinic')?.addEventListener('click', showClinicExperience);
document.getElementById('view-anatomy')?.addEventListener('click', showAnatomyExperience);
document.getElementById('anatomy-search')?.addEventListener('input', event => renderAnatomyList(event.target.value));
document.getElementById('isolate-structure')?.addEventListener('click', () => {
  if (!anatomyContainer || !selectedAnatomyId) return;
  for (const mesh of anatomyContainer.meshes) {
    mesh.setEnabled(mesh.name === selectedAnatomyId || mesh.name.startsWith(selectedAnatomyId + '_'));
  }
});
document.getElementById('restore-structures')?.addEventListener('click', () => {
  for (const mesh of anatomyContainer?.meshes || []) mesh.setEnabled(true);
  if (selectedAnatomyId) selectAnatomy(selectedAnatomyId);
});
document.getElementById('toggle-jaw')?.addEventListener('change', event => {
  if (activeExperience === 'anatomy' && anatomyAssetRoot) anatomyAssetRoot.setEnabled(event.target.checked);
});

// Browser-only training records. No patient names, identifiers, or clinical records are collected.

const bodyStatus = document.getElementById('body-mesh-map-status');
const bodyPanel = document.getElementById('body-section');
let bodyContainer = null;
let bodyAssetRoot = null;
let bodyCatalog = [];
let bodyMeshRecords = [];
let selectedBodyRecord = null;
let bodyIsolated = false;
const bodyLayerState = { skeleton: true, 'deep muscles': true, 'superficial muscles': true };
let bodySuperficialOpacity = 1;

function normalizeAnatomyName(value) {
  return String(value || '').toLocaleLowerCase('en')
    .replace(/[_-]+/g,' ')
    .replace(/\s+/g,' ')
    .replace(/\s*\(\d+\)\s*$/,'')
    .trim();
}
function bodyStatusText(message) {
  if (bodyStatus) bodyStatus.textContent = message;
}
function applyBodyVisibility() {
  for (const record of bodyMeshRecords) {
    const layerVisible = bodyLayerState[record.info.layer] !== false;
    const isolateVisible = !bodyIsolated || record.info.name === selectedBodyRecord?.info.name;
    record.mesh.isVisible = layerVisible && isolateVisible;
    record.mesh.visibility = record.info.layer === 'superficial muscles' ? bodySuperficialOpacity : 1;
  }
}
function selectBodyStructure(record) {
  selectedBodyRecord = record;
  highlight.removeAllMeshes();
  if (record?.mesh) {
    highlight.addMesh(record.mesh, Color3.FromHexString('#43dbc2'));
    document.getElementById('selection-name').textContent = record.info.name;
    const detail = [record.info.layer,record.info.side,record.info.tissue,record.info.fma].filter(Boolean).join(' · ');
    document.getElementById('selection-description').textContent = detail + ' — Écorché atlas, visual educational reference only.';
    setTimeout(() => fitVisibleSceneToSquare([record.mesh]), 80);
  }
  document.querySelectorAll('.body-structure-button').forEach(button => {
    button.classList.toggle('selected',button.dataset.name===record?.info.name);
  });
}
function renderBodyList(filter='') {
  const list=document.getElementById('body-structure-list');
  if(!list)return;
  const query=normalizeAnatomyName(filter);
  list.replaceChildren();
  const groups=new Map();
  for(const record of bodyMeshRecords) {
    if(query&&!normalizeAnatomyName(record.info.name).includes(query))continue;
    if(!groups.has(record.info.layer))groups.set(record.info.layer,[]);
    groups.get(record.info.layer).push(record);
  }
  for(const [layer,records] of groups) {
    const heading=document.createElement('div');
    heading.className='anatomy-group-title';
    heading.textContent=layer==='skeleton'?'العظام والغضاريف والأسنان':layer==='deep muscles'?'العضلات العميقة':'العضلات السطحية';
    list.appendChild(heading);
    for(const record of records) {
      const button=document.createElement('button');
      button.type='button';button.className='structure-button body-structure-button';
      button.dataset.name=record.info.name;
      button.textContent=record.info.name;
      button.addEventListener('click',()=>selectBodyStructure(record));
      list.appendChild(button);
    }
  }
  if(!list.childElementCount) {
    const empty=document.createElement('p');empty.className='asset-license-note';empty.textContent='لا توجد تراكيب مطابقة للبحث.';list.appendChild(empty);
  }
}
async function ensureBodyModel() {
  if(bodyAssetRoot)return;
  bodyStatusText('جارٍ تحميل نموذج تشريح الجسم الكامل (634 تركيبًا)…');
  try {
    const structureResponse=await fetch(new URL('models/ecorche-structures.json',modelBase));
    if(!structureResponse.ok)throw new Error('Could not load anatomical structure registry.');
    bodyCatalog=await structureResponse.json();
    if(!Array.isArray(bodyCatalog)||bodyCatalog.length!==634)throw new Error('The full-body structure registry failed validation.');
    bodyContainer=await loadContainer(
      'ecorche-anatomy.glb',
      'https://raw.githubusercontent.com/Charleeh/ecorche/320805e06aee51e2e6f6b22533eb2a59d43f2d4d/model/',
      'ecorche.glb'
    );
    const mounted=attachCenteredContainer(bodyContainer,'EcorcheFullBody',4.9);
    bodyAssetRoot=mounted.group;
    const byMeshName=new Map();
    for(const mesh of bodyContainer.meshes) {
      let cursor=mesh;
      const candidates=[mesh.name];
      while(cursor) {
        const extras=cursor.metadata?.gltf?.extras || cursor.metadata?.extras || {};
        if(extras.name)candidates.push(extras.name);
        cursor=cursor.parent;
      }
      for(const candidate of candidates) {
        const key=normalizeAnatomyName(candidate);
        if(!byMeshName.has(key))byMeshName.set(key,[]);
        byMeshName.get(key).push(mesh);
      }
    }
    bodyMeshRecords=[];
    for(const info of bodyCatalog) {
      const matches=byMeshName.get(normalizeAnatomyName(info.name))||[];
      for(const mesh of matches) {
        if(!bodyMeshRecords.some(record=>record.mesh===mesh))bodyMeshRecords.push({info,mesh});
      }
    }
    if(bodyMeshRecords.length===0)throw new Error('No named anatomy structures could be mapped to the loaded GLB meshes.');
    for(const record of bodyMeshRecords) {
      record.mesh.isPickable=true;
      record.mesh.metadata=record.mesh.metadata||{};
      record.mesh.metadata.bodyStructureName=record.info.name;
      record.mesh.metadata.bodyStructureLayer=record.info.layer;
    }
    clinicAssetRoot?.setEnabled(false);
    anatomyAssetRoot?.setEnabled(false);
    peopleRoot.setEnabled(false);
    root.setEnabled(false);
    bodyAssetRoot.setEnabled(true);
    engine.setHardwareScalingLevel(1.4);
    activeExperience='body-anatomy';
    bodyPanel.hidden=false;
    setProceduralControlsEnabled(false,'body');
    bodyLayerState.skeleton=true;bodyLayerState['deep muscles']=true;bodyLayerState['superficial muscles']=true;
    bodySuperficialOpacity=1;bodyIsolated=false;selectedBodyRecord=null;
    document.getElementById('body-layer-skeleton').checked=true;
    document.getElementById('body-layer-deep').checked=true;
    document.getElementById('body-layer-superficial').checked=true;
    document.getElementById('body-opacity').value='100';
    applyBodyVisibility();
    renderBodyList();
    camera.lowerRadiusLimit=2.8;camera.upperRadiusLimit=14;
    bodyStatusText(`تم تحميل ${bodyCatalog.length} تركيبًا في الدليل، وربط ${bodyMeshRecords.length} مجسمًا بالاسم.`);
    document.getElementById('selection-name').textContent='التشريح الكامل للجسم';
    document.getElementById('selection-description').textContent='أطلس 634 تركيبًا مسمى؛ استخدم البحث والطبقات لتصفية الهيكل والعضلات.';
  } catch(error) {
    console.error('Full-body anatomy load failed',error);
    bodyAssetRoot?.setEnabled(false);
    bodyPanel.hidden=true;
    root.setEnabled(true);
    setProceduralControlsEnabled(true,'clinic');
    activeExperience='procedural';
    bodyStatusText('تعذر تحميل نموذج التشريح الكامل. بقيت مشاهد العيادة والفم متاحة.');
    setAssetStatus('تعذر تحميل التشريح الكامل؛ تم الرجوع إلى مشهد العيادة.', 'warn');
  }
}
async function showBodyExperience() {
  pediatricRoot.setEnabled(false);
  pediatricPanel.hidden = true;
  treatmentRoot.setEnabled(false);
  treatmentLight.intensity = 0;
  treatmentLight.setEnabled(false);
  patientVariantControls.hidden = true;
  dentalScopeRoot?.setEnabled(false);
  dentalToothDetails.forEach(item=>item.root.setEnabled(false));
  dentalAtlasPanel.hidden=true;
  engine.setHardwareScalingLevel(1.15);
  for(const id of ['view-oral-exam','view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas']) {
    document.getElementById(id)?.classList.toggle('selected',id==='view-body');
  }
  peopleRoot.setEnabled(false);
  bodyPanel.hidden=false;
  loadingOverlay?.classList.remove('hidden');
  await ensureBodyModel();
  if(bodyAssetRoot) {
    clinicAssetRoot?.setEnabled(false);
    anatomyAssetRoot?.setEnabled(false);
    root.setEnabled(false);
    peopleRoot.setEnabled(false);
    for(const item of patientVariants.values())item.root.setEnabled(false);
    patientVariantControls.hidden=true;
    bodyAssetRoot.setEnabled(true);
    activeExperience='body-anatomy';
    engine.setHardwareScalingLevel(1.4);
    setProceduralControlsEnabled(false,'body');
    applyBodyVisibility();
    setCamera('orbit');
    setAssetStatus('تم تحميل أطلس التشريح الكامل: 634 تركيبًا مسمى من العظام والعضلات والأسنان.', 'ok');
  }
  loadingOverlay?.classList.add('hidden');
}
document.getElementById('view-body')?.addEventListener('click',showBodyExperience);
document.getElementById('body-search')?.addEventListener('input',event=>renderBodyList(event.target.value));
document.getElementById('body-layer-skeleton')?.addEventListener('change',event=>{bodyLayerState.skeleton=event.target.checked;applyBodyVisibility();});
document.getElementById('body-layer-deep')?.addEventListener('change',event=>{bodyLayerState['deep muscles']=event.target.checked;applyBodyVisibility();});
document.getElementById('body-layer-superficial')?.addEventListener('change',event=>{bodyLayerState['superficial muscles']=event.target.checked;applyBodyVisibility();});
document.getElementById('body-opacity')?.addEventListener('input',event=>{bodySuperficialOpacity=Number(event.target.value)/100;applyBodyVisibility();});
document.getElementById('body-isolate')?.addEventListener('click',()=>{
  if(!selectedBodyRecord)return;
  bodyIsolated=true;applyBodyVisibility();
});
document.getElementById('body-restore')?.addEventListener('click',()=>{
  bodyIsolated=false;applyBodyVisibility();
});


const dentalAtlasPanel = document.getElementById('dental-atlas-section');
const dentalAtlasStatus = document.getElementById('dental-atlas-status');
const dentalModelBase = new URL('dental-scope/', localModelRoot).href;
const dentalSourceBase = 'https://raw.githubusercontent.com/Yoosseph/dental-scope/4ca93c04c7ed500fdc06e31ac82fcd668a34cae5/public/models/';
let dentalManifest = null;
let dentalScopeRoot = null;
let dentalBaseContainers = [];
let dentalMeshByKey = new Map();
let dentalMeshRecords = [];
let dentalStructureRecords = [];
let dentalSelectedKey = null;
let dentalIsolatedKey = null;
let dentalSelectedFdi = null;
let dentalSelectedToothDetails = null;
let dentalLowerJawPivot = null;
let dentalLowerJawMeshes = [];
let dentalJawOpenAngle = 0.42;
let currentCariesTarget = '36';
const oralCariesOverlays = new Map();
const oralInventoryModels = new Map();
const oralSceneProps = new Map();
const oralScenePropPositions = new Map();
let oralScenePropsPromise = null;
let selectedOralInventoryRoot = null;
const oralInventoryTrayPosition = new Vector3(7.2, -1.4, 2.6);
const dentalToothDetails = new Map();
const dentalLayerState = {
  enamel: true,
  'dentin-coronal': true,
  'dentin-radicular': true,
  cementum: true,
  pdl: true,
  'pulp-chamber': true,
  canal: true
};

const fdiNames = {
  1: 'القاطع المركزي', 2: 'القاطع الجانبي', 3: 'الناب',
  4: 'الضاحك الأول', 5: 'الضاحك الثاني',
  6: 'الضرس الأول', 7: 'الضرس الثاني', 8: 'ضرس العقل'
};
function dentalToothLabel(fdi) {
  const value = String(fdi);
  const quadrant = Number(value[0]);
  const position = Number(value[1]);
  const arch = quadrant === 1 || quadrant === 2 ? 'الفك العلوي' : 'الفك السفلي';
  const side = quadrant === 1 || quadrant === 4 ? 'الأيمن' : 'الأيسر';
  return (fdiNames[position] || 'سن دائم') + ' — ' + arch + ' ' + side + ' (FDI ' + value + ')';
}
function setDentalStatus(message, state='') {
  if (!dentalAtlasStatus) return;
  dentalAtlasStatus.textContent=message;
  dentalAtlasStatus.classList.remove('ok','warn');
  if(state)dentalAtlasStatus.classList.add(state);
}
function dentalCandidates(mesh) {
  const names=[];
  let cursor=mesh;
  while(cursor) {
    if(cursor.name)names.push(cursor.name);
    const extra=cursor.metadata?.gltf?.extras||cursor.metadata?.extras||{};
    if(extra.name)names.push(extra.name);
    cursor=cursor.parent;
  }
  return names;
}
function dentalKeyForMesh(mesh, validKeys) {
  for(const name of dentalCandidates(mesh)) {
    if(validKeys.has(name))return name;
  }
  return null;
}
function attachDentalContainer(container,name) {
  container.addAllToScene();
  const group=new TransformNode(name,scene);
  for(const node of container.rootNodes)node.parent=group;
  group.computeWorldMatrix(true);
  return group;
}
async function loadDentalFile(file) {
  try {
    return await SceneLoader.LoadAssetContainerAsync(dentalModelBase,file,scene);
  } catch(localError) {
    console.warn('Local Dental Scope model unavailable; trying pinned upstream URL.',file,localError);
    return await SceneLoader.LoadAssetContainerAsync(dentalSourceBase,file,scene);
  }
}
function registerDentalMeshes(container, validKeys) {
  const records=[];
  for(const mesh of container.meshes) {
    if(!mesh.getTotalVertices || mesh.getTotalVertices()===0)continue;
    const key=dentalKeyForMesh(mesh,validKeys);
    if(!key)continue;
    mesh.metadata=mesh.metadata||{};
    mesh.metadata.dentalScopeKey=key;
    mesh.isPickable=true;
    const list=dentalMeshByKey.get(key)||[];
    list.push(mesh);
    dentalMeshByKey.set(key,list);
    records.push({key,mesh});
  }
  return records;
}
function isLowerJawStructureKey(key) {
  return /^tooth-[34]\d$/.test(key) ||
    key === 'gingiva-lower' ||
    key === 'mandible-body' ||
    key === 'mandibular-alveolar-process' ||
    key === 'mandibular-condyle-right' ||
    key === 'mandibular-condyle-left' ||
    /^mandibular-(ramus|body|condyle|coronoid)/.test(key);
}
function preserveWorldParent(mesh, parent) {
  mesh.computeWorldMatrix(true);
  const world = mesh.getWorldMatrix().clone();
  parent.computeWorldMatrix(true);
  const parentInverse = Matrix.Invert(parent.getWorldMatrix());
  const local = world.multiply(parentInverse);
  const scaling = Vector3.One();
  const rotation = Quaternion.Identity();
  const position = Vector3.Zero();
  if (!local.decompose(scaling, rotation, position)) {
    throw new Error('Could not preserve dental mesh transform while attaching lower jaw.');
  }
  mesh.parent = parent;
  mesh.position.copyFrom(position);
  mesh.scaling.copyFrom(scaling);
  mesh.rotationQuaternion = rotation;
  mesh.computeWorldMatrix(true);
}
function configureDentalLowerJawPivot() {
  if (dentalLowerJawPivot || !dentalScopeRoot) return;
  // Dental Scope coordinates are centimetres, +Y up and +Z anterior.
  // This hinge sits near the condyles; lower teeth, gingiva and mandible rotate together.
  dentalLowerJawPivot = new TransformNode('DentalLowerJawHinge', scene);
  dentalLowerJawPivot.parent = dentalScopeRoot;
  dentalLowerJawPivot.position.set(0, 4.1, -5.63);
  dentalLowerJawPivot.rotation.setAll(0);
  dentalLowerJawPivot.computeWorldMatrix(true);
  dentalLowerJawMeshes = [];
  for (const record of dentalMeshRecords) {
    if (!isLowerJawStructureKey(record.key)) continue;
    preserveWorldParent(record.mesh, dentalLowerJawPivot);
    record.mesh.metadata = record.mesh.metadata || {};
    record.mesh.metadata.dentalJawGroup = 'lower';
    dentalLowerJawMeshes.push(record.mesh);
  }
  if (dentalLowerJawMeshes.length < 8) {
    throw new Error('Lower jaw pivot did not attach the expected tooth and mandible structures.');
  }
  dentalLowerJawPivot.rotation.x = dentalJawOpenAngle;
}
function setDentalJawOpen(open) {
  if (!dentalLowerJawPivot) return;
  dentalLowerJawPivot.getScene().stopAnimation(dentalLowerJawPivot);
  const target = open ? dentalJawOpenAngle : 0;
  const animation = new Animation('DentalScopeMandibleOpenClose', 'rotation.x', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
  animation.setKeys([
    { frame: 0, value: dentalLowerJawPivot.rotation.x },
    { frame: 54, value: target }
  ]);
  const ease = new CubicEase();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  animation.setEasingFunction(ease);
  scene.beginDirectAnimation(dentalLowerJawPivot, [animation], 0, 54, false);
}
function dentalArabicLabel(key) {
  if(/^tooth-\d{2}$/.test(key))return dentalToothLabel(key.slice(-2));
  const map={
    'gingiva-upper':'اللثة العلوية','gingiva-lower':'اللثة السفلية',
    'mandible-body':'جسم الفك السفلي','maxilla-right':'عظم الفك العلوي الأيمن','maxilla-left':'عظم الفك العلوي الأيسر',
    'maxillary-sinus-right':'الجيب الفكي الأيمن','maxillary-sinus-left':'الجيب الفكي الأيسر',
    'inferior-alveolar-nerve-right':'العصب السنخي السفلي الأيمن','inferior-alveolar-nerve-left':'العصب السنخي السفلي الأيسر',
    'mental-nerve-right':'العصب الذقني الأيمن','mental-nerve-left':'العصب الذقني الأيسر',
    'lingual-nerve-right':'العصب اللساني الأيمن','lingual-nerve-left':'العصب اللساني الأيسر',
    'mandibular-canal-right':'القناة الفكية السفلية اليمنى','mandibular-canal-left':'القناة الفكية السفلية اليسرى',
    'articular-disc-right':'القرص المفصلي الأيمن','articular-disc-left':'القرص المفصلي الأيسر',
    'masseter-superficial-right':'العضلة الماضغة السطحية اليمنى','masseter-superficial-left':'العضلة الماضغة السطحية اليسرى',
    'masseter-deep-right':'العضلة الماضغة العميقة اليمنى','masseter-deep-left':'العضلة الماضغة العميقة اليسرى',
    'temporalis-right':'العضلة الصدغية اليمنى','temporalis-left':'العضلة الصدغية اليسرى',
    'buccinator-right':'العضلة المبوقة اليمنى','buccinator-left':'العضلة المبوقة اليسرى',
    'lateral-pterygoid-upper-right':'الجناحية الوحشية العلوية اليمنى','lateral-pterygoid-upper-left':'الجناحية الوحشية العلوية اليسرى',
    'lateral-pterygoid-lower-right':'الجناحية الوحشية السفلية اليمنى','lateral-pterygoid-lower-left':'الجناحية الوحشية السفلية اليسرى'
  };
  if(map[key])return map[key];
  const isNerve=/(nerve|trigeminal)/.test(key);
  const isVein=/vein|plexus/.test(key);
  const isArtery=/artery/.test(key);
  const isMuscle=/masseter|pterygoid|temporalis|buccinator|orbicularis/.test(key);
  const prefix=isNerve?'العصب ':isVein?'الوريد ':isArtery?'الشريان ':isMuscle?'العضلة ':'';
  return prefix+key.replaceAll('-',' ');
}
function setDentalMeshVisibility(key,visible) {
  for(const mesh of dentalMeshByKey.get(key)||[])mesh.isVisible=visible;
}
function applyDentalBaseVisibility() {
  for(const record of dentalMeshRecords) {
    const key=record.key;
    let visible=true;
    if(dentalIsolatedKey)visible=key===dentalIsolatedKey;
    if(key.startsWith('tooth-')&&/^\d{2}$/.test(key.slice(-2)))visible=visible&&document.getElementById('dental-shell-toggle').checked;
    if(key.startsWith('gingiva-'))visible=visible&&document.getElementById('dental-gum-toggle').checked;
    if(dentalManifest.meshes[key]?.file==='context.glb')visible=visible&&document.getElementById('dental-context-toggle').checked;
    if(dentalManifest.meshes[key]?.file==='neurovascular.glb')visible=visible&&document.getElementById('dental-nerve-toggle').checked;
    record.mesh.isVisible=visible;
  }
}
function renderDentalStructureList(filter='') {
  const list=document.getElementById('dental-structure-list');
  if(!list)return;
  const query=String(filter||'').toLowerCase().trim();
  list.replaceChildren();
  const records=dentalStructureRecords.filter(record=>{
    const label=dentalArabicLabel(record.key);
    return !query||record.key.toLowerCase().includes(query)||label.toLowerCase().includes(query);
  }).slice(0,140);
  for(const record of records) {
    const button=document.createElement('button');
    button.type='button';button.className='structure-button dental-structure-button';
    button.dataset.key=record.key;
    button.textContent=dentalArabicLabel(record.key);
    button.title=record.key;
    button.addEventListener('click',()=>selectDentalStructure(record.key));
    list.appendChild(button);
  }
  if(records.length===0) {
    const empty=document.createElement('p');empty.className='asset-license-note';empty.textContent='لا توجد تراكيب مطابقة.';list.appendChild(empty);
  }
}
function selectDentalStructure(key) {
  dentalSelectedKey=key;
  highlight.removeAllMeshes();
  const meshes=dentalMeshByKey.get(key)||[];
  for(const mesh of meshes)highlight.addMesh(mesh,Color3.FromHexString('#43dbc2'));
  if(meshes.length)setTimeout(()=>fitVisibleSceneToSquare(meshes),80);
  const label=dentalArabicLabel(key);
  document.getElementById('selection-name').textContent=label;
  const info=dentalManifest?.meshes?.[key];
  document.getElementById('selection-description').textContent=
    'معرّف التركيب: '+key+
    (info?' · المصدر التشريحي: '+(info.sourceRef||'BodyParts3D')+' · مستوى النمذجة: '+info.provenance:'');
  if (activeExperience === 'oral-exam' && /^tooth-\d{2}$/.test(key)) selectOralExamTooth(key.slice(-2));
  document.querySelectorAll('.dental-structure-button').forEach(button=>button.classList.toggle('selected',button.dataset.key===key));
}
function renderDentalToothGrid(filter='') {
  const grid=document.getElementById('dental-tooth-grid');
  if(!grid||!dentalManifest)return;
  const query=String(filter||'').toLowerCase().trim();
  grid.replaceChildren();
  for(const fdi of Object.keys(dentalManifest.teeth).sort()) {
    const number=Number(fdi);
    const label=dentalToothLabel(number);
    if(query&&!fdi.includes(query)&&!label.toLowerCase().includes(query))continue;
    const button=document.createElement('button');
    button.type='button';
    button.className='tooth-chip'+(number===dentalSelectedFdi?' selected':'');
    button.textContent=fdi;
    button.title=label;
    button.addEventListener('click',()=>{
      if (activeExperience === 'oral-exam') selectOralExamTooth(fdi);
      else void loadDentalTooth(fdi);
    });
    grid.appendChild(button);
  }
}
function dentalLayerFromKey(key,fdi) {
  const suffix='-'+fdi;
  if(!key.endsWith(suffix))return null;
  const base=key.slice(0,-suffix.length);
  return base.startsWith('canal-')?'canal':base;
}
function applyDentalToothLayers() {
  if(!dentalSelectedToothDetails)return;
  for(const record of dentalSelectedToothDetails.records) {
    const layer=dentalLayerFromKey(record.key,dentalSelectedFdi);
    record.mesh.isVisible=!!layer&&dentalLayerState[layer]!==false;
  }
}
async function loadDentalTooth(fdi) {
  const id=String(fdi);
  const meta=dentalManifest?.teeth?.[id];
  if(!meta)return;
  const status=document.getElementById('dental-tooth-mesh-status');
  document.getElementById('dental-tooth-detail-panel').hidden=false;
  dentalAtlasPanel.querySelectorAll('.tooth-chip').forEach(button=>button.classList.toggle('selected',button.textContent===id));
  document.getElementById('dental-selected-tooth-name').textContent=dentalToothLabel(Number(id));
  for(const [otherId,item] of dentalToothDetails)if(otherId!==id)item.root.setEnabled(false);
  for(const record of dentalMeshRecords)record.mesh.isVisible=false;
  for(const item of dentalToothDetails.values())item.root.setEnabled(false);
  dentalSelectedFdi=id;
  status.textContent='جارٍ تحميل طبقات السن '+id+'…';
  try {
    let cached=dentalToothDetails.get(id);
    if(!cached) {
      const container=await loadDentalFile(meta.asset);
      const rootNode=attachDentalContainer(container,'DentalScopeTooth_'+id);
      const validKeys=new Set(meta.layers.map(layer=>layer+'-'+id));
      const records=registerDentalMeshes(container,validKeys);
      if(records.length===0)throw new Error('No dental tissue meshes matched FDI '+id);
      cached={container,root:rootNode,records};
      dentalToothDetails.set(id,cached);
    }
    dentalToothDetails.forEach((item,key)=>item.root.setEnabled(key===id));
    dentalSelectedToothDetails=cached;
    for(const layer of Object.keys(dentalLayerState))dentalLayerState[layer]=true;
    dentalAtlasPanel.querySelectorAll('[data-tooth-layer]').forEach(input=>input.checked=true);
    applyDentalToothLayers();
    activeExperience='dental-scope';
    camera.alpha=-Math.PI/2.1;camera.beta=1.15;camera.radius=3.4;
    camera.setTarget(new Vector3(0,.1,0));
    setTimeout(() => fitVisibleSceneToSquare(cached.records.map(record => record.mesh)), 80);
    document.getElementById('selection-name').textContent=dentalToothLabel(Number(id));
    document.getElementById('selection-description').textContent='نموذج ثلاثي الأبعاد بطبقات داخلية مشتقة من سطح السن؛ ترتيبها التعليمي لا يمثل قياسًا نسيجيًا سريريًا.';
    status.textContent='تم تحميل '+recordsForTooth(cached).length+' مجسمات طبقية للسن FDI '+id+'.';
  } catch(error) {
    console.error('Dental tooth detail load failed',id,error);
    status.textContent='تعذر تحميل طبقات السن. ستظل بقية مكتبة الفم متاحة.';
    setDentalMeshVisibility('tooth-'+id,true);
  }
  renderDentalToothGrid(document.getElementById('dental-tooth-search').value);
}
function recordsForTooth(item){return item.records||[];}
function restoreDentalWholeMouth() {
  dentalSelectedFdi=null;
  dentalSelectedToothDetails=null;
  dentalIsolatedKey=null;
  for(const item of dentalToothDetails.values())item.root.setEnabled(false);
  document.getElementById('dental-tooth-detail-panel').hidden=true;
  for(const [key,meshes] of dentalMeshByKey)if(/^tooth-\d{2}$/.test(key))for(const mesh of meshes)mesh.isVisible=true;
  applyDentalBaseVisibility();
  renderDentalToothGrid(document.getElementById('dental-tooth-search').value);
  camera.lowerRadiusLimit=2.5;camera.upperRadiusLimit=30;
  setCamera('orbit');
  document.getElementById('selection-name').textContent='الأطلس السني الكامل';
  document.getElementById('selection-description').textContent='الفك واللثة والأسنان والأعصاب والأوعية والتراكيب حول المفصل.';
}

function oralOverlayMaterial(name, hex, alpha = 1) {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.FromHexString(hex);
  mat.emissiveColor = Color3.FromHexString(hex).scale(0.12);
  mat.specularColor = new Color3(0.18, 0.18, 0.18);
  mat.alpha = alpha;
  mat.backFaceCulling = false;
  return mat;
}
let oralOverlayMaterials = null;
function ensureOralOverlayMaterials() {
  if (oralOverlayMaterials) return oralOverlayMaterials;
  oralOverlayMaterials = {
    caries: oralOverlayMaterial('OralCariesBrown', '#4b2117'),
    cavity: oralOverlayMaterial('OralCavityDark', '#241512'),
    etch: oralOverlayMaterial('OralEtchBlue', '#66bde1', 0.48),
    bond: oralOverlayMaterial('OralBondAmber', '#e2a84f', 0.58),
    restoration: oralOverlayMaterial('OralComposite', '#e9dfc9')
  };
  return oralOverlayMaterials;
}
function getOralCariesOverlay(fdi = currentCariesTarget) {
  const id = String(fdi);
  if (oralCariesOverlays.has(id)) return oralCariesOverlays.get(id);
  const info = dentalManifest?.meshes?.['tooth-' + id];
  if (!info?.bounds) return null;
  const [min, max] = info.bounds;
  const center = new Vector3((min[0] + max[0]) / 2, max[1] + 0.035, (min[2] + max[2]) / 2);
  const lower = /^[34]/.test(id);
  const parent = lower && dentalLowerJawPivot ? dentalLowerJawPivot : dentalScopeRoot;
  const localPosition = lower && dentalLowerJawPivot
    ? center.subtract(dentalLowerJawPivot.position)
    : center;
  const root = new TransformNode('CariesOverlay_' + id, scene);
  root.parent = parent;
  root.position.copyFrom(localPosition);
  const materials = ensureOralOverlayMaterials();
  function overlay(name, diameter, material, scale) {
    const mesh = MeshBuilder.CreateSphere(name + '_' + id, { diameter, segments: 20 }, scene);
    mesh.parent = root;
    mesh.position.set(0, 0, 0);
    mesh.scaling.copyFrom(scale);
    mesh.material = material;
    mesh.isPickable = false;
    return mesh;
  }
  const visual = {
    root,
    lesion: overlay('CariesLesion', 0.38, materials.caries, new Vector3(1, 0.22, 0.86)),
    cavity: overlay('PreparedCavity', 0.31, materials.cavity, new Vector3(1, 0.2, 0.84)),
    etch: overlay('EtchFilm', 0.47, materials.etch, new Vector3(1, 0.12, 0.9)),
    bond: overlay('AdhesiveFilm', 0.40, materials.bond, new Vector3(1, 0.1, 0.86)),
    restoration: overlay('CompositeFill', 0.34, materials.restoration, new Vector3(1, 0.2, 0.86))
  };
  visual.root.setEnabled(true);
  oralCariesOverlays.set(id, visual);
  return visual;
}
function updateOralCariesVisual() {
  if (activeExperience !== 'oral-exam') return;
  const visual = getOralCariesOverlay(currentCariesTarget);
  if (!visual) return;
  const stage = cariesTrainingStage;
  visual.lesion.setEnabled(stage === 'caries');
  visual.cavity.setEnabled(['cavity', 'etched', 'bonded', 'ready-to-fill'].includes(stage));
  visual.etch.setEnabled(stage === 'etched');
  visual.bond.setEnabled(['bonded', 'ready-to-fill'].includes(stage));
  visual.restoration.setEnabled(['filled', 'restored'].includes(stage));
}
function selectOralExamTooth(fdi) {
  if (clinicalSurfaceReady) resetClinicalContactState('تم تغيير السن المستهدف. تم مسح أثر التلامس السابق.');
  const id = String(fdi);
  if (!dentalManifest?.teeth?.[id]) return;
  currentCariesTarget = id;
  dentalSelectedFdi = id;
  renderDentalToothGrid(document.getElementById('dental-tooth-search')?.value || '');
  const label = dentalToothLabel(Number(id));
  const target = document.getElementById('oral-exam-target-label');
  if (target) target.textContent = 'السن المستهدف: ' + label;
  document.getElementById('selection-name').textContent = label;
  document.getElementById('selection-description').textContent = 'تم اختيار السن للتدريب. تظهر عليه الآفة الافتراضية ويمكن تطبيق الأدوات والمواد التعليمية عليه.';
  cariesTrainingStage = 'caries';
  getOralCariesOverlay(id);
  const toothFocus = getOralExamTargetPoint(id);
  camera.setTarget(toothFocus);
  camera.radius = 6.4;
  updateCariesTrainingPanel('تم اختيار ' + label + '. الآفة الافتراضية ظاهرة؛ اختر أداة أو مادة واسحبها إلى مساحة العمل.');
  updateOralCariesVisual();
}
function buildOralInventoryModel(item) {
  const root = new TransformNode('OralInventory_' + item.id, scene);
  root.parent = dentalScopeRoot;
  root.position.copyFrom(oralInventoryTrayPosition);
  root.metadata = { title: item.name, detail: item.detail, inventoryId: item.id };
  const rod = (name, length, diameter, z, mat = 'metal') => {
    const mesh = cylinder(name + '_' + item.id, length, diameter, [0, 0, z], mat, root, 20);
    mesh.rotation.x = Math.PI / 2;
    mesh.isPickable = false;
    return mesh;
  };
  const ball = (name, diameter, x, y, z, mat = 'metal', scale = [1, 1, 1]) => {
    const mesh = sphere(name + '_' + item.id, diameter, [x, y, z], mat, root, scale);
    mesh.isPickable = false;
    return mesh;
  };
  const panel = (name, dimensions, position, mat = 'white') => {
    const mesh = box(name + '_' + item.id, dimensions, position, mat, root);
    mesh.isPickable = false;
    return mesh;
  };
  const taper = (name, length, wide, z, mat = 'metal') => {
    const mesh = MeshBuilder.CreateCylinder(name + '_' + item.id, {
      height: length, diameterTop: 0.012, diameterBottom: wide, tessellation: 16
    }, scene);
    mesh.parent = root;
    mesh.position.z = z;
    mesh.rotation.x = Math.PI / 2;
    mesh.material = mats[mat];
    mesh.isPickable = false;
    return mesh;
  };
  if (item.type === 'material') {
    if (['gutta-percha', 'paper-points', 'suture-material'].includes(item.id)) {
      if (item.id === 'suture-material') {
        const spool = cylinder('SutureSpool_' + item.id, 0.22, 0.34, [0, 0, 0], 'white', root, 24);
        spool.rotation.x = Math.PI / 2;
        tube('SutureThread_' + item.id, [[0.05,0,0.08],[0.3,0.02,-0.1],[0.48,0.08,-0.28]], 0.012, 'accent', root);
      } else {
        for (let i = -1; i <= 1; i++) taper('Point_' + i, 0.78, 0.09, i * 0.12, item.id === 'gutta-percha' ? 'accent' : 'white');
      }
    } else if (['ppe-gloves', 'ppe-mask', 'eye-protection', 'sterile-drape'].includes(item.id)) {
      panel('BarrierPack', [0.68, 0.18, 0.42], [0, 0, 0], 'glass');
      panel('BarrierLabel', [0.35, 0.025, 0.16], [0, 0.11, 0.02], 'white');
    } else {
      const bodyColor = item.id === 'composite-resin' ? 'tooth'
        : item.id === 'glass-ionomer' ? 'white'
        : item.id === 'etchant' ? 'glass'
        : item.id === 'adhesive' ? 'accent'
        : item.id === 'calcium-silicate' ? 'white'
        : item.id === 'endodontic-sealer' ? 'glass'
        : item.id === 'impression-silicone' ? 'gum'
        : item.id === 'fluoride-varnish' ? 'accent'
        : 'white';
      if (['etchant', 'adhesive'].includes(item.id)) {
        const barrel = cylinder('MaterialSyringe_' + item.id, 0.72, 0.2, [0,0,0], bodyColor, root, 20);
        barrel.rotation.x = Math.PI / 2;
        rod('SyringePlunger', 0.18, 0.12, 0.42, 'metal');
        taper('SyringeTip', 0.32, 0.08, -0.48, 'metal');
      } else {
        const cartridge = cylinder('MaterialCartridge_' + item.id, 0.55, 0.28, [0,0,0], bodyColor, root, 24);
        cartridge.rotation.x = Math.PI / 2;
        rod('CartridgeCap', 0.12, 0.31, 0.31, 'tealDark');
        rod('CartridgeNozzle', 0.2, 0.09, -0.35, 'metal');
      }
    }
  } else {
    switch (item.id) {
      case 'mirror':
        rod('MirrorHandle', 0.98, 0.055, 0, 'metal');
        rod('MirrorNeck', 0.22, 0.03, -0.52, 'metal');
        ball('MirrorHead', 0.28, 0, 0, -0.67, 'metal', [1,0.18,1]);
        break;
      case 'explorer':
      case 'periodontal-probe':
        rod('ProbeHandle', 0.94, 0.065, 0.08, 'metal');
        taper('ProbeTip', 0.42, 0.05, -0.56, 'metal');
        if (item.id === 'periodontal-probe') for (let i=0;i<4;i++) rod('ProbeMark'+i,0.035,0.085,-0.12-i*.09,'dark');
        break;
      case 'cotton-pliers':
      case 'extraction-forceps':
      case 'orthodontic-pliers':
        rod('PliersHandleL', 0.7, 0.06, 0.2, 'metal').position.x = -0.11;
        rod('PliersHandleR', 0.7, 0.06, 0.2, 'metal').position.x = 0.11;
        ball('PliersPivot', 0.14, 0, 0, -0.02, 'tealDark');
        taper('PliersTipL',0.38,0.09,-0.42,'metal').position.x=-0.11;
        taper('PliersTipR',0.38,0.09,-0.42,'metal').position.x=0.11;
        break;
      case 'high-speed':
      case 'low-speed':
        rod('HandpieceBody', 0.9, 0.22, 0.05, 'tealDark');
        rod('HandpieceGrip', 0.37, 0.28, 0.3, 'metal');
        rod('HeadNeck', 0.2, 0.13, -0.48, 'metal');
        taper('RotaryBur', 0.34, 0.08, -0.72, 'metal');
        ball('HeadCap', 0.2, 0, 0, -0.5, 'white', [1,0.9,0.75]);
        break;
      case 'bur-kit':
        for(let i=-1;i<=1;i++) {
          rod('BurHandle'+i,0.74,0.07,i*.18,'metal');
          taper('BurHead'+i,0.2,0.09,i*.18-0.42,'metal');
        }
        break;
      case 'rubber-dam':
        panel('RubberDamSheet',[0.95,0.045,0.75],[0,0,0],'rubber');
        panel('DamFrameTop',[1.05,0.045,0.045],[0,0.1,0],'metal');
        panel('DamFrameBottom',[1.05,0.045,0.045],[0,-0.1,0],'metal');
        break;
      case 'matrix':
        panel('MatrixBand',[0.62,0.045,0.42],[0,0,0],'metal');
        ball('MatrixRetainer',0.24,0.38,0,0,'tealDark',[1,1,0.75]);
        break;
      case 'wedges':
        for(let i=0;i<3;i++) taper('MatrixWedge'+i,0.5,0.16,-0.22+i*.2,'tooth');
        break;
      case 'composite-instrument':
      case 'endo-spreader':
      case 'elevator':
      case 'periotome':
      case 'scalpel':
      case 'gracey-curette':
      case 'curette':
      case 'suture-scissors':
      case 'needle-holder':
        rod('InstrumentHandle',0.85,0.12,0.12,'tealDark');
        rod('InstrumentShaft',0.4,0.055,-0.48,'metal');
        taper('InstrumentWorkingEnd',0.3,0.13,-0.78,'metal');
        ball('InstrumentCollar',0.16,0,0,-0.34,'white');
        break;
      case 'curing-light':
        rod('CuringBody',0.86,0.28,0.12,'tealDark');
        rod('CuringNeck',0.28,0.13,-0.42,'metal');
        ball('CuringLens',0.24,0,0,-0.61,'glass',[1,0.55,1]);
        break;
      case 'surgical-drill':
        rod('SurgicalDrillBody',0.92,0.28,0.12,'tealDark');
        rod('SurgicalDrillNeck',0.36,0.15,-0.42,'metal');
        taper('SurgicalDrillBit',0.48,0.1,-0.78,'metal');
        ball('SurgicalDrillBearing',0.2,0,0,-0.45,'white');
        break;
      case 'implant-fixture-kit':
        rod('ImplantFixtureCore',0.8,0.25,0,'metal');
        for(let i=0;i<5;i++) rod('ImplantThread_'+i,0.035,0.34,-0.3+i*.14,'metal');
        rod('ImplantAbutment',0.28,0.17,-0.54,'tealDark');
        break;
      case 'ortho-bracket-kit':
        for(let i=-1;i<=1;i++) {
          panel('OrthoBracketBase_'+i,[0.22,0.15,0.12],[i*.25,0,0],'metal');
          rod('OrthoBracketSlot_'+i,0.18,0.045,0,'tealDark').position.x=i*.25;
        }
        break;
      case 'orthodontic-wire':
      case 'splint-wire':
        tube('OrthoWireArc',[[0,0,.45],[.25,.06,.25],[.5,.08,0],[.25,.06,-.25],[0,0,-.45],[-.25,.06,-.25],[-.5,.08,0],[-.25,.06,.25],[0,0,.45]],.026,item.id==='splint-wire'?'accent':'metal',root);
        break;
      case 'endo-files':
        for(let i=0;i<3;i++) {
          rod('EndoHandle'+i,0.22,0.13,-0.36+i*.17,'accent').position.x=(i-1)*.16;
          taper('EndoFile'+i,0.62,0.055,-0.78+i*.17,'metal').position.x=(i-1)*.16;
        }
        break;
      case 'apex-locator':
        panel('ApexDevice',[0.55,0.4,0.22],[0,0,0],'dark');
        panel('ApexScreen',[0.36,0.22,0.025],[0,0.02,-0.12],'screen');
        rod('ApexCable',0.7,0.025,-0.3,'rubber');
        break;
      case 'endo-irrigation':
      case 'air-water':
      case 'saliva-ejector':
      case 'high-volume-suction':
        rod('SyringeBody',0.84,0.18,0.12,'white');
        rod('SyringeGrip',0.18,0.29,0.43,'metal');
        taper('SyringeCannula',0.56,0.075,-0.55,'metal');
        break;
      case 'impression-tray':
        panel('TrayBase',[0.8,0.07,0.45],[0,0,0],'metal');
        panel('TrayHandle',[0.22,0.09,0.18],[0,0,0.34],'metal');
        break;
      case 'intraoral-scanner':
        rod('ScannerBody',0.74,0.28,0.12,'white');
        rod('ScannerNeck',0.26,0.14,-0.38,'metal');
        panel('ScannerTip',[0.27,0.11,0.12],[0,0,-0.58],'glass');
        break;
      case 'shade-guide':
        panel('ShadeHandle',[0.18,0.13,0.55],[0,0,0.2],'white');
        for(let i=0;i<4;i++) panel('ShadeTab'+i,[0.19,0.12,0.08],[0,(i-1.5)*0.16,-0.25],'tooth');
        break;
      default:
        rod('GenericToolHandle',0.9,0.14,0.1,'metal');
        taper('GenericToolWorkingEnd',0.38,0.1,-0.52,'tealDark');
    }
  }
  root.setEnabled(false);
  return root;
}
function getOralInventoryRoot(item = selectedInventoryItem) {
  const externalId = ['ultrasonic-scaler','curing-light','extraction-forceps','scalpel'].includes(item.id) ? item.id : null;
  if (externalId && oralSceneProps.has(externalId)) return oralSceneProps.get(externalId);
  if (!oralInventoryModels.has(item.id)) oralInventoryModels.set(item.id, buildOralInventoryModel(item));
  return oralInventoryModels.get(item.id);
}
let selectedOralInventoryId = null;
function selectOralInventoryVisual(item) {
  if (selectedOralInventoryRoot) {
    isPropAtMouth = false;
    const previousWasProcedural = oralInventoryModels.get(selectedOralInventoryId) === selectedOralInventoryRoot;
    if (previousWasProcedural) selectedOralInventoryRoot.setEnabled(false);
    else if (oralScenePropPositions.has(selectedOralInventoryId)) {
      selectedOralInventoryRoot.position.copyFrom(oralScenePropPositions.get(selectedOralInventoryId));
    }
  }
  const root = getOralInventoryRoot(item);
  const external = root === oralSceneProps.get(item.id);
  if (external && oralScenePropPositions.has(item.id)) root.position.copyFrom(oralScenePropPositions.get(item.id));
  else if (!external) root.position.copyFrom(oralInventoryTrayPosition);
  root.setEnabled(true);
  root.rotation.set(0, 0, 0);
  root.metadata = { title:item.name, detail:item.detail, inventoryId:item.id };
  selectedOralInventoryRoot = root;
  selectedOralInventoryId = item.id;
  return root;
}
function moveSelectedOralInventoryToMouth(item = selectedInventoryItem) {
  const root = selectedOralInventoryRoot || selectOralInventoryVisual(item);
  if (!root) return false;
  const destination = getOralExamTargetPoint(currentCariesTarget).add(new Vector3(0, 0.22, 0.65));
  root.setEnabled(true);
  animateTreatmentNode(root, destination, new Vector3(0, 0, -0.18));
  isPropAtMouth = true;
  return true;
}
function returnSelectedOralInventoryToTray() {
  if (!selectedOralInventoryRoot) {
    isPropAtMouth = false;
    return;
  }
  const position = oralScenePropPositions.get(selectedOralInventoryId) || oralInventoryTrayPosition;
  animateTreatmentNode(selectedOralInventoryRoot, position.clone(), new Vector3(0, 0, 0));
  isPropAtMouth = false;
}
function getOralExamTargetPoint(fdi = currentCariesTarget) {
  const bounds = dentalManifest?.meshes?.['tooth-' + fdi]?.bounds;
  if (!bounds) return new Vector3(0, 0.5, 0);
  const [min, max] = bounds;
  const point = new Vector3((min[0] + max[0]) / 2, max[1] + 0.75, (min[2] + max[2]) / 2 + 0.15);
  if (/^[34]/.test(String(fdi)) && dentalLowerJawPivot) {
    const local = point.subtract(dentalLowerJawPivot.position);
    return Vector3.TransformCoordinates(local, dentalLowerJawPivot.computeWorldMatrix(true));
  }
  return point;
}
async function ensureOralSceneProps() {
  if (oralScenePropsPromise) return oralScenePropsPromise;
  oralScenePropsPromise = (async () => {
    const definitions = [
      { id:'instrument-tray', file:'dental-tools/instrument-tray.glb', url:'https://cdn.3dassets.dev/assets/34383/v1/', size:7.2, position:[7.4,-1.5,2.1], rotation:[0,-0.25,0] },
      { id:'ultrasonic-scaler', file:'dental-tools/ultrasonic-scaler.glb', url:'https://cdn.3dassets.dev/assets/34384/v1/', size:5.6, position:[-7.2,-1.2,2.5], rotation:[0,0.3,0] },
      { id:'curing-light', file:'dental-tools/curing-light.glb', url:'https://cdn.3dassets.dev/assets/34385/v1/', size:5.0, position:[6.8,1.7,1.4], rotation:[0,-0.5,0] },
      { id:'plaster-study-arch', file:'dental-tools/plaster-study-arch.glb', url:'https://cdn.3dassets.dev/assets/34397/v1/', size:5.6, position:[-7.3,1.7,0.4], rotation:[0,0.2,0] },
      { id:'extraction-forceps', file:'dental-tools/surgical-forceps.glb', url:'https://files.innerscene.com/library/forceps-0697e09f/23a4b04dccffb1867b5e/', remoteFile:'forceps.glb', size:1.6, position:[7.2,-1.2,3.2], rotation:[0,0.15,0] },
      { id:'scalpel', file:'dental-tools/scalpel-set.glb', url:'https://files.innerscene.com/library/scalpel-set-31709647/50ebfbee69cd692b267c/', remoteFile:'scalpel-set.glb', size:1.8, position:[-7.2,-1.2,3.2], rotation:[0,-0.15,0] }
    ];
    const results = await Promise.allSettled(definitions.map(async def => {
      const container = await loadContainer(def.file, def.url, def.remoteFile || 'model.glb');
      const mounted = attachCenteredContainer(container, 'OralSceneProp_' + def.id, def.size);
      mounted.group.parent = dentalScopeRoot;
      mounted.group.position.addInPlace(new Vector3(...def.position));
      mounted.group.rotation.set(...def.rotation);
      mounted.group.metadata = { title:def.id, detail:'نموذج ثلاثي الأبعاد ثابت من حزمة CC0 تعليمية؛ لا يحاكي الحركة أو المعايرة السريرية.' };
      mounted.group.setEnabled(true);
      oralSceneProps.set(def.id, mounted.group);
      oralScenePropPositions.set(def.id, mounted.group.position.clone());
    }));
    const failed = results.filter(result => result.status === 'rejected');
    if (failed.length) console.warn('Some chairside prop models could not be loaded.', failed);
    return oralSceneProps.size;
  })();
  return oralScenePropsPromise;
}
async function ensureDentalScope() {
  if(dentalScopeRoot)return;
  setDentalStatus('جارٍ تحميل الفك واللثة والجمجمة والأعصاب والأوعية…');
  try {
    const response=await fetch(new URL('dental-scope/manifest.json',localModelRoot));
    if(!response.ok)throw new Error('Dental manifest is missing.');
    dentalManifest=await response.json();
    if(Object.keys(dentalManifest.meshes||{}).length!==415||Object.keys(dentalManifest.teeth||{}).length!==32) {
      throw new Error('Dental Scope registry did not pass structure-count checks.');
    }
    const validKeys=new Set(Object.keys(dentalManifest.meshes));
    const files=['core.glb','context.glb','neurovascular.glb'];
    const loaded=await Promise.all(files.map(file=>loadDentalFile(file)));
    dentalScopeRoot=new TransformNode('DentalScopeRoot',scene);
    dentalMeshByKey=new Map();
    dentalBaseContainers=[];
    dentalMeshRecords=[];
    for(let i=0;i<loaded.length;i++) {
      const container=loaded[i];
      const child=attachDentalContainer(container,'DentalScopePart_'+files[i].replace('.glb',''));
      child.parent=dentalScopeRoot;
      dentalBaseContainers.push(container);
      dentalMeshRecords.push(...registerDentalMeshes(container,validKeys).map(record=>({...record,file:files[i]})));
    }
    if(dentalMeshRecords.length<120)throw new Error('Dental atlas did not expose enough of the expected named mesh records.');
    dentalStructureRecords=[...new Map(dentalMeshRecords.map(record=>[record.key,record])).values()].sort((a,b)=>a.key.localeCompare(b.key));
    configureDentalLowerJawPivot();
    dentalScopeRoot.setEnabled(true);
    root.setEnabled(false);
    clinicAssetRoot?.setEnabled(false);
    anatomyAssetRoot?.setEnabled(false);
    bodyAssetRoot?.setEnabled(false);
    peopleRoot.setEnabled(false);
    activeExperience='dental-scope';
    setProceduralControlsEnabled(false,'dental');
    camera.lowerRadiusLimit=2.5;camera.upperRadiusLimit=30;
    applyDentalBaseVisibility();
    renderDentalStructureList();
    renderDentalToothGrid();
    setDentalStatus('تم تحميل '+dentalStructureRecords.length+' تركيبًا مسجلًا من أصل 415، و32 سنًا مستقلًا مع طبقات داخلية.', 'ok');
  } catch(error) {
    console.error('Dental Scope model load failed',error);
    dentalScopeRoot?.setEnabled(false);
    setDentalStatus('تعذر تحميل الأطلس السني التفصيلي؛ ستظل بقية المشاهد متاحة.', 'warn');
  }
}
async function showDentalAtlasExperience() {
  pediatricRoot.setEnabled(false);
  pediatricPanel.hidden = true;
  treatmentRoot.setEnabled(false);
  treatmentLight.intensity = 0;
  treatmentLight.setEnabled(false);
  patientVariantControls.hidden = true;
  for(const id of ['view-oral-exam','view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas','view-pediatric']) {
    document.getElementById(id)?.classList.toggle('selected',id==='view-dental-atlas');
  }
  isPropAtMouth = false;
  selectedOralInventoryRoot?.setEnabled(false);
  selectedOralInventoryRoot = null;
  dentalAtlasPanel.hidden=false;
  bodyPanel.hidden=true;
  anatomyPanel.hidden=true;
  loadingOverlay?.classList.remove('hidden');
  await ensureDentalScope();
  if(dentalScopeRoot) {
    dentalScopeRoot.setEnabled(true);
    dentalToothDetails.forEach(item=>item.root.setEnabled(false));
    root.setEnabled(false);
    clinicAssetRoot?.setEnabled(false);
    anatomyAssetRoot?.setEnabled(false);
    bodyAssetRoot?.setEnabled(false);
    peopleRoot.setEnabled(false);
    activeExperience='dental-scope';
    isPatientMouthOpen = false;
    setDentalJawOpen(false);
    document.getElementById('patient-mouth-toggle').textContent = 'فتح الفم';
    setProceduralControlsEnabled(false,'dental');
    engine.setHardwareScalingLevel(1.25);
    restoreDentalWholeMouth();
    setDentalStatus('الأطلس السني جاهز: 32 سنًا، تشريح داخلي، لثة، عظام، مفاصل، أعصاب وأوعية.', 'ok');
    setCamera('orbit');
  }
  loadingOverlay?.classList.add('hidden');
}

async function showOralExamExperience() {
  loadingOverlay?.classList.remove('hidden');
  pediatricRoot.setEnabled(false);
  pediatricPanel.hidden = true;
  treatmentRoot.setEnabled(false);
  treatmentLight.intensity = 0;
  treatmentLight.setEnabled(false);
  patientVariantControls.hidden = true;
  peopleRoot.setEnabled(false);
  anatomyPanel.hidden = true;
  bodyPanel.hidden = true;
  dentalAtlasPanel.hidden = false;
  for (const id of ['view-oral-exam','view-treatment','view-clinic','view-anatomy','view-people','view-dental-atlas','view-pediatric','view-body']) {
    document.getElementById(id)?.classList.toggle('selected', id === 'view-oral-exam');
  }
  await ensureDentalScope();
  if (!dentalScopeRoot || !dentalLowerJawPivot) {
    setAssetStatus('تعذر تحميل تشريح الفم التفصيلي. تحقق من ملفات Dental Scope واتصال الشبكة.', 'warn');
    loadingOverlay?.classList.add('hidden');
    return;
  }
  dentalScopeRoot.setEnabled(true);
  dentalToothDetails.forEach(item => item.root.setEnabled(false));
  root.setEnabled(false);
  clinicAssetRoot?.setEnabled(false);
  anatomyAssetRoot?.setEnabled(false);
  bodyAssetRoot?.setEnabled(false);
  peopleRoot.setEnabled(false);
  treatmentRoot.setEnabled(false);
  activeExperience = 'oral-exam';
  setProceduralControlsEnabled(false, 'dental');
  engine.setHardwareScalingLevel(1.15);
  document.getElementById('dental-context-toggle').checked = false;
  document.getElementById('dental-nerve-toggle').checked = true;
  document.getElementById('dental-gum-toggle').checked = true;
  document.getElementById('dental-shell-toggle').checked = true;
  applyDentalBaseVisibility();
  isPatientMouthOpen = true;
  isPropAtMouth = false;
  dentalIsolatedKey = null;
  selectedOralInventoryRoot?.setEnabled(false);
  selectedOralInventoryRoot = null;
  scene.stopAnimation(dentalLowerJawPivot);
  dentalLowerJawPivot.rotation.x = dentalJawOpenAngle;
  document.getElementById('patient-mouth-toggle').textContent = 'إغلاق الفم';
  document.getElementById('apply-clinical-action').disabled = false;
  await ensureOralSceneProps();
  activeExperience = 'oral-exam';
  currentCariesTarget = '36';
  renderDentalToothGrid(document.getElementById('dental-tooth-search').value);
  selectOralExamTooth(currentCariesTarget);
  selectInventoryItem(selectedInventoryItem);
  setDentalStatus('وضع فحص الأسنان جاهز: فك سفلي متحرك، 32 سنًا، أدوات ومواد قابلة للسحب.', 'ok');
  setAssetStatus('فحص الأسنان جاهز. الفم مفتوح؛ اختر السن ثم اسحب الأداة أو المادة إلى منطقة العمل.', 'ok');
  setCamera('orbit');
  camera.setTarget(getOralExamTargetPoint(currentCariesTarget));
  camera.radius = 6.4;
  loadingOverlay?.classList.add('hidden');
}
document.getElementById('view-oral-exam')?.addEventListener('click', showOralExamExperience);

document.getElementById('view-dental-atlas')?.addEventListener('click',showDentalAtlasExperience);
document.getElementById('dental-tooth-search')?.addEventListener('input',event=>renderDentalToothGrid(event.target.value));
document.getElementById('dental-structure-search')?.addEventListener('input',event=>renderDentalStructureList(event.target.value));
document.getElementById('dental-tooth-back')?.addEventListener('click',restoreDentalWholeMouth);
document.getElementById('dental-context-toggle')?.addEventListener('change',event=>{
  for(const container of dentalBaseContainers)if(container.name?.includes('context'))container.meshes.forEach(mesh=>mesh.isVisible=event.target.checked);
  for(const record of dentalMeshRecords)if(record.file==='context.glb')record.mesh.isVisible=event.target.checked;
});
document.getElementById('dental-nerve-toggle')?.addEventListener('change',event=>{
  for(const record of dentalMeshRecords)if(record.file==='neurovascular.glb')record.mesh.isVisible=event.target.checked;
});
document.getElementById('dental-gum-toggle')?.addEventListener('change',event=>{
  for(const record of dentalMeshRecords)if(record.key.startsWith('gingiva-'))record.mesh.isVisible=event.target.checked;
});
document.getElementById('dental-shell-toggle')?.addEventListener('change',event=>{
  for(const record of dentalMeshRecords)if(/^tooth-\d{2}$/.test(record.key))record.mesh.isVisible=event.target.checked;
});
dentalAtlasPanel?.querySelectorAll('[data-tooth-layer]')?.forEach(input=>input.addEventListener('change',event=>{
  dentalLayerState[event.target.dataset.toothLayer]=event.target.checked;
  applyDentalToothLayers();
}));
document.getElementById('dental-isolate-structure')?.addEventListener('click',()=>{
  if(!dentalSelectedKey)return;
  dentalIsolatedKey=dentalSelectedKey;
  for(const record of dentalMeshRecords)record.mesh.isVisible=record.key===dentalIsolatedKey;
});
document.getElementById('dental-restore-structures')?.addEventListener('click',()=>{
  dentalIsolatedKey=null;applyDentalBaseVisibility();
});

const clinicalReferenceIndex = {
  adaCaries: { label: 'ADA — إرشادات تدبير التسوس', url: 'https://www.ada.org/resources/research/science/evidence-based-dental-research/caries-management-clinical-practice-guidelines' },
  adaEvidence: { label: 'ADA — أدلة الممارسة السنية', url: 'https://www.ada.org/resources/research/science/evidence-based-dental-research' },
  aae: { label: 'AAE — الإرشادات والمواقف السريرية لعلاج الجذور', url: 'https://www.aae.org/specialty/clinical-resources/guidelines-position-statements/' },
  sdcepAcute: { label: 'SDCEP — تدبير المشكلات السنية الحادة، الطبعة الثانية 2026', url: 'https://www.acutedentalproblems.sdcep.org.uk/' },
  sdcepPrescribing: { label: 'SDCEP — مرجع وصف الأدوية في طب الأسنان', url: 'https://www.sdcepdentalprescribing.nhs.scot/' },
  efp: { label: 'EFP — إرشادات علاج التهاب دواعم السن للمراحل I–III', url: 'https://www.efp.org/education/continuing-education/clinical-guidelines/guideline-on-treatment-of-stage-i-iii-periodontitis/' },
  iadt: { label: 'IADT — إرشادات إصابات الأسنان الرضحية', url: 'https://iadt-dentaltrauma.org/guidelines-and-resources/guidelines/' },
  aapd: { label: 'AAPD — مرجع طب أسنان الأطفال 2026–2027', url: 'https://www.aapd.org/research/oral-health-policies--recommendations/' },
  aapdPulp: { label: 'AAPD — علاج اللب للأسنان اللبنية والدائمة غير مكتملة الجذور', url: 'https://www.aapd.org/research/oral-health-policies--recommendations/pulp-therapy-for-primary-and-immature-permanent-teeth/' },
  aapdCaries: { label: 'AAPD — تقييم وإدارة مخاطر التسوس للأطفال', url: 'https://www.aapd.org/research/oral-health-policies--recommendations/caries-risk-assessment-and-management-for-infants-children-and-adolescents/' },
  aapdBehavior: { label: 'AAPD — التوجيه السلوكي لمريض الأسنان الطفل', url: 'https://www.aapd.org/research/oral-health-policies--recommendations/behavior-guidance-for-the-pediatric-dental-patient/' },
  fda: { label: 'FDA — اعتبارات دعم القرار السريري بالبرمجيات', url: 'https://www.fda.gov/medical-devices/digital-health-center-excellence/step-6-software-function-intended-provide-clinical-decision-support' }
};

const pediatricToothCatalog = [
  { fdi:'61', file:'primary-tooth-61.glb', sourceFile:'primary_upper_left_central_incisor_fdi_61.glb', label:'القاطع المركزي العلوي الأيسر', arch:'علوي', position:0 },
  { fdi:'62', file:'primary-tooth-62.glb', sourceFile:'primary_upper_left_lateral_incisor_fdi_62.glb', label:'القاطع الجانبي العلوي الأيسر', arch:'علوي', position:1 },
  { fdi:'63', file:'primary-tooth-63.glb', sourceFile:'primary_upper_left_canine_fdi_63.glb', label:'الناب العلوي الأيسر', arch:'علوي', position:2 },
  { fdi:'64', file:'primary-tooth-64.glb', sourceFile:'primary_upper_left_first_molar_fdi_64.glb', label:'الضرس اللبني الأول العلوي الأيسر', arch:'علوي', position:3 },
  { fdi:'65', file:'primary-tooth-65.glb', sourceFile:'primary_upper_left_second_molar_fdi_65.glb', label:'الضرس اللبني الثاني العلوي الأيسر', arch:'علوي', position:4 },
  { fdi:'71', file:'primary-tooth-71.glb', sourceFile:'primary_lower_left_central_incisor_fdi_71.glb', label:'القاطع المركزي السفلي الأيسر', arch:'سفلي', position:0 },
  { fdi:'72', file:'primary-tooth-72.glb', sourceFile:'primary_lower_left_lateral_incisor_fdi_72.glb', label:'القاطع الجانبي السفلي الأيسر', arch:'سفلي', position:1 },
  { fdi:'73', file:'primary-tooth-73.glb', sourceFile:'primary_lower_left_canine_fdi_73.glb', label:'الناب السفلي الأيسر', arch:'سفلي', position:2 },
  { fdi:'74', file:'primary-tooth-74.glb', sourceFile:'primary_lower_left_first_molar_fdi_74.glb', label:'الضرس اللبني الأول السفلي الأيسر', arch:'سفلي', position:3 },
  { fdi:'75', file:'primary-tooth-75.glb', sourceFile:'primary_lower_left_second_molar_fdi_75.glb', label:'الضرس اللبني الثاني السفلي الأيسر', arch:'سفلي', position:4 }
];
const pediatricSourceRoot = 'https://raw.githubusercontent.com/sameralseedbth-Dental/dental-3d-models/4f0ffb651998a4641ddf45c7632ea236cc164fcb/';
const pediatricRecords = [];
let selectedPediatricFdi = null;
const pediatricStatus = document.getElementById('pediatric-atlas-status');
function setPediatricStatus(message, state='') {
  if (!pediatricStatus) return;
  pediatricStatus.textContent = message;
  pediatricStatus.classList.remove('ok','warn');
  if (state) pediatricStatus.classList.add(state);
}
async function ensurePediatricDentition() {
  if (pediatricRecords.length === pediatricToothCatalog.length) return;
  setPediatricStatus('جارٍ تحميل 10 نماذج أسنان لبنية مرخصة من جامعة دندي…');
  const localRoot = new URL('pediatric-dentition/', localModelRoot).href;
  try {
    const results = await Promise.allSettled(pediatricToothCatalog.map(async tooth => {
      let container;
      try {
        container = await SceneLoader.LoadAssetContainerAsync(localRoot, tooth.file, scene);
      } catch (localError) {
        console.warn('Local primary tooth not present; using pinned public source.', tooth.fdi, localError);
        container = await SceneLoader.LoadAssetContainerAsync(pediatricSourceRoot, tooth.sourceFile, scene);
      }
      const mounted = attachCenteredContainer(container, 'PrimaryToothModel_' + tooth.fdi, .55);
      const placement = new TransformNode('PrimaryToothPlacement_' + tooth.fdi, scene);
      placement.parent = pediatricRoot;
      const xPositions = [-.12, -.43, -.78, -1.13, -1.48];
      placement.position.set(xPositions[tooth.position], tooth.arch === 'علوي' ? .52 : -.52, tooth.arch === 'علوي' ? -.12 : .12);
      mounted.group.parent = placement;
      const meshes = container.meshes.filter(mesh => mesh.getTotalVertices && mesh.getTotalVertices() > 0);
      for (const mesh of meshes) {
        mesh.isPickable = true;
        mesh.metadata = { ...(mesh.metadata || {}), pediatricToothFdi: tooth.fdi };
      }
      return { ...tooth, container, group: mounted.group, placement, meshes };
    }));
    pediatricRecords.push(...results.filter(result => result.status === 'fulfilled').map(result => result.value));
    const failedCount = results.length - pediatricRecords.length;
    if (!pediatricRecords.length) throw new Error('لم يتم تحميل أي نموذج من مجموعة الأسنان اللبنية.');
    pediatricRoot.setEnabled(true);
    setPediatricStatus('تم تحميل ' + pediatricRecords.length + ' نماذج من أصل 10 أسنان لبنية.' + (failedCount ? ' تعذر تحميل ' + failedCount + ' نماذج؛ النماذج المتاحة تعمل.' : '') + ' المجموعة تمثل الأسنان اليسرى فقط، وليست فكًا كاملًا.', failedCount ? 'warn' : 'ok');
    renderPediatricToothGrid();
  } catch (error) {
    console.error('Primary dentition models could not be loaded.', error);
    pediatricRoot.setEnabled(false);
    setPediatricStatus('تعذر تحميل مجموعة الأسنان اللبنية. بقية مشاهد المحاكي متاحة.', 'warn');
  }
}
function selectPediatricTooth(fdi) {
  const record = pediatricRecords.find(item => item.fdi === String(fdi));
  if (!record) return;
  selectedPediatricFdi = record.fdi;
  highlight.removeAllMeshes();
  for (const mesh of record.meshes) highlight.addMesh(mesh, Color3.FromHexString('#42d6bd'));
  if(record.meshes.length)setTimeout(()=>fitVisibleSceneToSquare(record.meshes),80);
  document.getElementById('selection-name').textContent = record.label + ' (FDI ' + record.fdi + ')';
  document.getElementById('selection-description').textContent = 'نموذج سن لبني منفرد من جامعة دندي. لا يمثل هذا الملف وحده الفك الكامل أو مرحلة بزوغ مكتملة.';
  document.getElementById('pediatric-tooth-detail').textContent = record.label + ' — FDI ' + record.fdi + '. نموذج تعليمي بصيغة GLB، مرخص CC BY 4.0. راجع الإسناد ومحدودية التغطية قبل استخدامه في تدريس رسمي.';
  document.querySelectorAll('.pediatric-tooth-button').forEach(button => button.classList.toggle('selected', button.dataset.fdi === record.fdi));
}
function renderPediatricToothGrid(filter='') {
  const grid = document.getElementById('pediatric-tooth-grid');
  if (!grid) return;
  const query = String(filter || '').toLowerCase().trim();
  grid.replaceChildren();
  for (const tooth of (pediatricRecords.length ? pediatricRecords : pediatricToothCatalog)) {
    if (query && !tooth.fdi.includes(query) && !tooth.label.toLowerCase().includes(query)) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tooth-chip pediatric-tooth-button' + (tooth.fdi === selectedPediatricFdi ? ' selected' : '');
    button.dataset.fdi = tooth.fdi;
    button.textContent = tooth.fdi;
    button.title = tooth.label;
    button.addEventListener('click', () => selectPediatricTooth(tooth.fdi));
    grid.appendChild(button);
  }
}
async function showPediatricDentitionExperience() {
  patientVariantControls.hidden = true;
  pediatricPanel.hidden = false;
  anatomyPanel.hidden = true;
  bodyPanel.hidden = true;
  dentalAtlasPanel.hidden = true;
  treatmentRoot.setEnabled(false);
  treatmentLight.intensity = 0;
  treatmentLight.setEnabled(false);
  peopleRoot.setEnabled(false);
  root.setEnabled(false);
  clinicAssetRoot?.setEnabled(false);
  anatomyAssetRoot?.setEnabled(false);
  bodyAssetRoot?.setEnabled(false);
  dentalScopeRoot?.setEnabled(false);
  dentalToothDetails.forEach(item => item.root.setEnabled(false));
  for (const id of ['view-oral-exam','view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas','view-pediatric']) {
    document.getElementById(id)?.classList.toggle('selected', id === 'view-pediatric');
  }
  activeExperience = 'pediatric';
  loadingOverlay?.classList.remove('hidden');
  await ensurePediatricDentition();
  if (pediatricRecords.length) {
    pediatricRoot.setEnabled(true);
    setProceduralControlsEnabled(false, 'pediatric');
    camera.lowerRadiusLimit = 1.5;
    camera.upperRadiusLimit = 12;
    setCamera('orbit');
    setAssetStatus('تم تحميل أطلس الأسنان اللبنية: 10 نماذج مفردة من جامعة دندي.', 'ok');
    if (!selectedPediatricFdi) selectPediatricTooth('61');
  }
  loadingOverlay?.classList.add('hidden');
}
document.getElementById('view-pediatric')?.addEventListener('click', showPediatricDentitionExperience);
document.getElementById('pediatric-tooth-search')?.addEventListener('input', event => renderPediatricToothGrid(event.target.value));

const trainingCases = {
  exam: {
    title: 'فحص سريري أولي',
    description: 'جلسة منظمة تبدأ بالفرز والتاريخ المرضي ثم الفحص والتوثيق. استخدم حالة افتراضية فقط ولا تدخل أي بيانات تعريفية.',
    sources: ['adaEvidence','sdcepAcute','aae'],
    steps: [
      ['تهيئة بيئة العمل', 'تحقق من جاهزية المكان، وسائل الوقاية الشخصية، سلامة التعقيم، ونظافة الأسطح قبل استقبال الحالة.'],
      ['الفرز والتاريخ المرضي', 'حدد الشكوى الرئيسية ومدتها والعوامل المحفزة والمخففة، ثم راجع التاريخ الطبي والحساسية والأدوية والعوامل المؤثرة في الخطة.'],
      ['الفحص خارج الفم وداخله', 'افحص الوجه والأنسجة الرخوة والإطباق والأسنان واللثة بشكل منهجي، وسجل الموجودات دون القفز إلى التشخيص.'],
      ['الاختبارات المساندة', 'اختر اختبارات اللب والقرع والجس والفحص اللثوي والتصوير عند وجود مبرر سريري؛ قارن النتائج بالأسنان المرجعية.'],
      ['التشخيص التفريقي', 'اربط الشكوى والفحص والاختبارات والصور، واكتب التشخيصات المحتملة وما ينقصك من معلومات.'],
      ['خطة وموافقة وتوثيق', 'ناقش البدائل والمنافع والمخاطر والتكلفة والمتابعة مع المريض الافتراضي، ثم وثق القرار ومبرراته.']
    ]
  },
  restoration: {
    title: 'ترميم الأسنان وإدارة التسوس',
    description: 'سيناريو تعليمي لاتخاذ القرار في إدارة التسوس واختيار الترميم. لا يحدد عمق تحضير أو وصفة مادة أو إعدادات جهاز.',
    sources: ['adaCaries','adaEvidence'],
    steps: [
      ['تقييم الآفة', 'راجع نشاط الآفة وموقعها وامتدادها وإمكانية تنظيفها وخطر التسوس العام، ولا تعتمد على صورة منفردة وحدها.'],
      ['تحديد قابلية الترميم', 'افحص بنية السن المتبقية وحالة اللب واللثة والإطباق، وقارن بين التدبير غير الترميمي والترميم المباشر وغير المباشر.'],
      ['شرح الخيارات والموافقة', 'اعرض البدائل والمنافع والقيود ومخاطر الحساسية أو فشل الترميم والحاجة إلى المتابعة.'],
      ['العزل وتجهيز المجال', 'تعرف إلى اختيار العزل المناسب وحماية الأنسجة ومنع التلوث وفق بروتوكول الكلية وإشراف الطبيب المسؤول.'],
      ['اختيار النظام والمواد', 'قارن الكومبوزيت والزجاج الأيوني والمواد الحيوية بحسب موضع الآفة ومتطلبات الالتصاق وتعليمات الشركة.'],
      ['تقييم الترميم', 'افحص الحواف والتلامس والإطباق والتشطيب والنظافة وسجل أي ملاحظة وخطة المراجعة.']
    ]
  },
  endo: {
    title: 'تشخيص وعلاج لب السن والجذور',
    description: 'تدريب على منطق التشخيص والتخطيط وفهم تشريح القنوات؛ لا يقدم أطوال عمل أو مقاسات ملفات أو بروتوكول ريّ تنفيذي.',
    sources: ['aae','adaEvidence'],
    steps: [
      ['تحديد التشخيص اللبي والذروي', 'اجمع الأعراض والتاريخ والفحص واختبارات الحساسية والقرع والجس والصور، ثم وثق التشخيصين كلًا على حدة.'],
      ['تقييم صعوبة الحالة والإنذار', 'راجع التشريح المتوقع والترميمية والحالة الداعمة والمخاطر الطبية، وفكر في الإحالة عند تجاوز مستوى الخبرة.'],
      ['مناقشة الخطة والموافقة', 'اشرح خيارات الحفاظ على اللب أو علاج الجذور أو الإحالة أو البدائل، مع توضيح عدم اليقين والإنذار.'],
      ['العزل وفهم الحجرة', 'راجع أهداف العزل ومنع التلوث، واستخدم الأطلس ثلاثي الأبعاد لفهم الحجرة ومداخل القنوات والاختلافات.'],
      ['مبادئ التنظيف والتشكيل والإغلاق', 'تعرف إلى أهداف الإجراءات ومراقبة الطول والسلامة والتطهير والإغلاق وفق البروتوكول المعتمد وتحت إشراف مباشر.'],
      ['الترميم والمتابعة', 'ناقش أهمية الإغلاق التاجي والترميم النهائي وتقييم الأعراض والشفاء شعاعيًا وفق خطة متابعة موثقة.']
    ]
  },
  hygiene: {
    title: 'اللثة والوقاية وإزالة اللويحة',
    description: 'تقييم صحة دواعم السن، التحكم بعوامل الخطورة، والتخطيط للصيانة الدورية.',
    sources: ['efp','adaEvidence'],
    steps: [
      ['تقييم اللثة', 'راجع النزف عند الجس والجيوب والفقد السريري للارتباط والحركة واللويحة، واطلب السجلات المناسبة للحالة.'],
      ['تصنيف الحالة', 'ناقش استخدام نظام المرحلة والدرجة ومقدار التعقيد وعوامل الخطورة بدل الاكتفاء بوصف عام للالتهاب.'],
      ['تحديد عوامل الخطورة', 'راجع التدخين والسكري والعناية المنزلية والعوامل الموضعية والأدوية والتاريخ المرضي.'],
      ['خطة التحكم غير الجراحي', 'تعرف إلى دور التثقيف والتحكم باللويحة والتنظيف المهني وإزالة الترسبات تحت اللثة وفق الحالة وإشراف المختص.'],
      ['إعادة التقييم', 'قارن المؤشرات بعد التدخل، وحدد المواقع التي تحتاج إلى تقييم إضافي أو إحالة متخصصة.'],
      ['الصيانة طويلة المدى', 'صمم خطة دعم دوري فردية بمشاركة المريض، مع توثيق عوامل الخطورة والالتزام والتغيرات.']
    ]
  },
  extraction: {
    title: 'تقييم وخلع الأسنان',
    description: 'محاكاة تعليمية لمسار القرار قبل الخلع وأثناءه وبعده؛ لا تستبدل التدريب العملي أو الإشراف الجراحي.',
    sources: ['sdcepAcute','aae','adaEvidence'],
    steps: [
      ['تأكيد سبب الخلع', 'راجع التشخيص وقابلية الحفاظ على السن والبدائل الترميمية واللبية واللثوية، وتأكد أن الخلع مبرر وليس افتراضيًا.'],
      ['تقييم عوامل الخطورة', 'راجع التاريخ الطبي والأدوية والحساسية ومضادات التخثر ومخاطر النزف والعدوى والعوامل التشريحية.'],
      ['التصوير وتقدير الصعوبة', 'اختر التصوير بناءً على السؤال السريري، وقيّم شكل الجذور والقرب من البنى التشريحية وحدود خبرتك.'],
      ['الموافقة والاستعداد', 'ناقش البدائل والمخاطر المتوقعة وخطة الألم والنزف والمتابعة، وجهز الأدوات والوقاية ومكان التصرف في الطوارئ.'],
      ['مبادئ الإجراء الجراحي', 'راجع مفاهيم التخدير الموضعي والتحكم بالقوى وحماية الأنسجة والتعامل مع التعقيد أو توقف التقدم؛ التنفيذ يكون بيد طبيب مدرب وتحت إشراف.'],
      ['الرعاية اللاحقة والتوثيق', 'اشرح تعليمات ما بعد الإجراء المعتمدة ومتى يطلب المريض المساعدة، ووثق الإجراء والمضاعفات والمتابعة.']
    ]
  },
  periodontal: {
    title: 'التعامل مع أمراض دواعم السن',
    description: 'مسار تعليمي مبني على التقييم المرحلي وعوامل الخطورة وإعادة التقييم والصيانة.',
    sources: ['efp','adaEvidence'],
    steps: [
      ['التاريخ والفحص الشامل', 'اجمع التاريخ الطبي والسني، قياسات اللثة، النزف، الفقد السريري للارتباط، الحركة، التشعبات واللويحة.'],
      ['المرحلة والدرجة', 'استخدم معايير التصنيف الحديثة لتقدير الشدة والتعقيد ومعدل التقدم وعوامل الخطورة.'],
      ['التثقيف والتحكم بعوامل الخطورة', 'ضع أهدافًا قابلة للقياس للتحكم باللويحة والتدخين والسكري والعناية المنزلية.'],
      ['العلاج غير الجراحي', 'راجع مبادئ إزالة الترسبات وتنظيف الجذور واختيار الأدوات اليدوية أو فوق الصوتية بحسب الحالة.'],
      ['إعادة التقييم', 'أعد قياس المؤشرات وقارنها بخط الأساس، وحدد الحاجة إلى علاج إضافي أو إحالة اختصاصية.'],
      ['برنامج الرعاية الداعمة', 'حدد تكرار الصيانة وفق خطورة الحالة والتزام المريض، مع إعادة التقييم والتوثيق المستمر.']
    ]
  },
  prostho: {
    title: 'التركيبات الثابتة والتاج',
    description: 'سيناريو عن تقييم السن والتخطيط التعويضي والتواصل مع المختبر، وليس دليلًا لتحضير سريري بمقاسات محددة.',
    sources: ['adaEvidence','aae'],
    steps: [
      ['تقييم السن والدعامة', 'راجع قابلية الترميم، البنية المتبقية، صحة اللب واللثة، الإطباق والدعم، واحتمال الحاجة إلى علاج سابق.'],
      ['تحديد الهدف التعويضي', 'ناقش التوقعات والجماليات والوظيفة والبدائل والتكلفة والمخاطر مع المريض الافتراضي.'],
      ['اختيار المادة والتصميم', 'قارن الخزف والزركونيا والمواد المعدنية أو المركبة بحسب المؤشرات والخصائص وتعليمات المختبر.'],
      ['التخطيط الرقمي أو التقليدي', 'تعرف إلى مبادئ التسجيل والمسح والانطباع وتوثيق اللون والعلاقة الإطباقية.'],
      ['المراجعة والتجربة', 'راجع نقاط التماس والحواف والإطباق واللون والراحة وقابلية التنظيف قبل اعتماد التصميم.'],
      ['التثبيت والمتابعة', 'تعرف إلى مبادئ اختيار الإسمنت بحسب المادة وتعليمات المصنّع، ثم وثق الإرشادات والمتابعة.']
    ]
  },
  implant: {
    title: 'تقييم حالة زراعة الأسنان',
    description: 'مرحلة تخطيط وتقييم متعدد التخصصات؛ لا يصمم هذا السيناريو موضعًا جراحيًا أو يوصي بعلاج مريض حقيقي.',
    sources: ['aae','adaEvidence'],
    steps: [
      ['تحديد الهدف والبدائل', 'راجع سبب فقد السن والبدائل التعويضية والوظيفية وتوقعات المريض.'],
      ['التقييم الطبي واللثوي', 'راجع عوامل الخطورة والحالة اللثوية والعناية المنزلية والتدخين والأدوية والتاريخ المرضي.'],
      ['تقييم العظم والأنسجة', 'ادرس العظم والنسج الرخوة والمسافات التشريحية والتصوير الذي يجيب عن سؤال سريري محدد.'],
      ['التخطيط التعويضي أولًا', 'ناقش موضع التعويض المرغوب والمساحة والإطباق والتصميم مع الفريق المختص قبل أي قرار جراحي.'],
      ['الموافقة وإدارة المخاطر', 'وضح البدائل والمضاعفات المحتملة والحاجة إلى الإحالة والصيانة طويلة المدى.'],
      ['خطة المتابعة', 'ضع أهدافًا موثقة لصحة النسج حول الزرعة والصيانة وإدارة عوامل الخطورة بالتعاون مع الفريق.']
    ]
  },
  ortho: {
    title: 'التقييم التقويمي',
    description: 'تدريب على جمع السجلات وتحليل المشكلة وتحديد أهداف المعالجة والمخاطر والإحالة.',
    sources: ['adaEvidence'],
    steps: [
      ['تحديد الشكوى والأهداف', 'راجع سبب طلب العلاج والتوقعات والقيود الطبية والسنية والعمر والنمو.'],
      ['السجلات التشخيصية', 'تعرف إلى الفحص الوجهي والفموي والسجلات والصور والنماذج اللازمة وفق مبررها.'],
      ['تحليل الإطباق والنمو', 'ناقش العلاقة الهيكلية والسنية والازدحام والمسافات والأنسجة الداعمة.'],
      ['تقييم صحة الفم والمخاطر', 'راجع التسوس واللثة والنظافة والالتزام واحتمالات الامتصاص الجذري أو التأثيرات غير المرغوبة.'],
      ['أهداف وخيارات العلاج', 'قارن الأجهزة والخيارات والحدود والمدة المتوقعة ومخاطر الانتكاس مع اختصاصي التقويم.'],
      ['الاحتفاظ والمتابعة', 'ناقش أهمية المثبتات والمتابعة والنظافة ورصد التغيرات بعد انتهاء العلاج.']
    ]
  },
  trauma: {
    title: 'إصابات الأسنان والوجه',
    description: 'سيناريو فرز وتقييم إصابات الأسنان الرضحية، مع التأكيد على التمييز بين الأسنان اللبنية والدائمة.',
    sources: ['iadt','sdcepAcute'],
    steps: [
      ['تقييم الحالة العامة', 'ابدأ بتقييم السلامة العامة والإصابات المصاحبة وعلامات الخطر التي تتطلب رعاية طارئة خارج نطاق عيادة الأسنان.'],
      ['توثيق زمن وآلية الإصابة', 'سجل زمن الإصابة والآلية وفقدان الوعي والأعراض والأجزاء المفقودة وحالة السن قبل الإصابة.'],
      ['تحديد نوع الإصابة', 'فرّق بين الكسر والخلع الجزئي والانزياح والانغراز والانقلاع، وحدد إن كان السن لبنيًا أم دائمًا.'],
      ['الفحص والتصوير', 'افحص الأنسجة الرخوة وحركة السن والإطباق والأنسجة الداعمة واختر التصوير وفق إرشادات الرضوض.'],
      ['الرجوع إلى مسار IADT', 'استخدم الدليل المناسب لنوع الإصابة والعمر والزمن، ولا تعمم توصية إصابة على نوع آخر.'],
      ['التواصل والمتابعة', 'اشرح الإنذار والمتابعة الطويلة ومراقبة اللب والجذر والأنسجة الداعمة، ووثق كل شيء.']
    ]
  },
  pediatric: {
    title: 'تقييم أسنان الأطفال والأسنان اللبنية',
    description: 'مسار تعليمي يراعي التاريخ الصحي والنمو والتعاون واختلاف الأسنان اللبنية والدائمة، وليس بروتوكول علاج لطفل بعينه.',
    sources: ['aapd','aapdPulp','aapdCaries','aapdBehavior','iadt'],
    steps: [
      ['التاريخ والتواصل مع الطفل وولي الأمر', 'اجمع الشكوى والتاريخ الطبي والسني والحساسية والأدوية، وراعِ مستوى فهم الطفل ووجود ولي الأمر والموافقة المناسبة.'],
      ['تقييم النمو والسلوك', 'قدّر العمر النمائي والتعاون والقلق والقدرة على تحمل الزيارة، واختر أسلوب تواصل سلوكي مناسبًا للطفل.'],
      ['تمييز الأسنان اللبنية والدائمة', 'استخدم نظام FDI وتحقق من مرحلة البزوغ والسن المتوقع، ولا تخلط بين بروتوكولات الأسنان اللبنية والدائمة.'],
      ['تقييم التسوس واللب والرضوض', 'راجع نشاط الآفة وأعراض اللب والأنسجة الداعمة وأي إصابة رضحية، واستخدم دليل الحالة المناسب.'],
      ['مناقشة الخيارات الوقائية والعلاجية', 'ناقش الوقاية والتدبير غير الترميمي والترميم أو الإحالة وفق حالة الطفل والدليل المحلي وإشراف المختص.'],
      ['المتابعة والتوثيق', 'حدد مواعيد مراجعة ملائمة للمخاطر والنمو، وسجل التغيرات وتواصل مع ولي الأمر دون إدخال بيانات تعريفية في المحاكي.']
    ]
  },
  emergency: {
    title: 'تقييم الحالات السنية الطارئة',
    description: 'تدريب على الفرز والتعرف على العلامات الخطرة وتحديد مستوى الرعاية والإحالة؛ ليس بديلًا عن تدريب الإنعاش أو بروتوكول الطوارئ المحلي.',
    sources: ['sdcepAcute','sdcepPrescribing','adaEvidence'],
    steps: [
      ['تقييم السلامة والفرز الأولي', 'قيّم استقرار الحالة العامة واستدعِ فريق الطوارئ عند وجود تهديد للحياة وفق بروتوكول المنشأة.'],
      ['التعرف على علامات الخطر', 'انتبه لصعوبة التنفس أو البلع أو التورم سريع الانتشار أو النزف غير المسيطر عليه أو التدهور العام.'],
      ['جمع معلومات موجزة', 'راجع بداية الأعراض والتاريخ الطبي والأدوية والحساسية والعلامات الحيوية وفق التدريب المتاح.'],
      ['تحديد مسار الرعاية', 'ميّز بين حالة تحتاج تدخلًا إسعافيًا فوريًا وحالة تحتاج تقييمًا سنيًا عاجلًا أو موعدًا قريبًا.'],
      ['مراجعة الدليل المحلي', 'ارجع إلى إرشادات الطوارئ والوصف الدوائي المعتمدة محليًا، ولا تستخدم جرعات أو أدوية من ذاكرة النموذج.'],
      ['التوثيق والتسليم', 'وثق التقييم والقرارات ووقت الإحالة والتعليمات، وسلّم الحالة بوضوح إلى مقدم الرعاية التالي.']
    ]
  }
};
let currentCase = 'exam';
let currentStep = -1;
let completedSteps = [];
const scenarioSelect = document.getElementById('scenario-select');
const caseDescription = document.getElementById('case-description');
const caseProgress = document.getElementById('case-progress');
const caseProgressBar = document.getElementById('case-progress-bar');
const caseFeedback = document.getElementById('case-feedback');
const nextStepButton = document.getElementById('next-step');

function updateCaseView() {
  const scenario = trainingCases[currentCase];
  const total = scenario.steps.length;
  const progress = completedSteps.length;
  const complete = progress >= total;
  if (currentStep < 0) {
    caseDescription.textContent = scenario.description;
  } else if (complete) {
    caseDescription.textContent = `اكتمل السيناريو: ${scenario.title}. راجع التقييم مع المشرف.`;
  } else {
    const [title, detail] = scenario.steps[currentStep];
    caseDescription.textContent = `${progress} / ${total} — ${title}: ${detail}`;
  }
  caseProgress.textContent = currentStep < 0 ? 'لم يبدأ التدريب' : (complete ? 'اكتمل السيناريو التعليمي' : `الخطوة ${currentStep + 1} من ${total}`);
  caseProgressBar.style.width = `${(progress / total) * 100}%`;
  nextStepButton.disabled = currentStep < 0 || complete;
  const sourceBox = document.getElementById('case-source-links');
  if (sourceBox) {
    sourceBox.replaceChildren(document.createTextNode('مراجع للمراجعة: '));
    (scenario.sources || ['adaEvidence']).forEach((key, index) => {
      const source = clinicalReferenceIndex[key];
      if (!source) return;
      if (index) sourceBox.appendChild(document.createTextNode(' · '));
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = source.label;
      sourceBox.appendChild(link);
    });
  }
}
scenarioSelect?.addEventListener('change', event => {
  currentCase = event.target.value;
  if (clinicalSurfaceReady) resetClinicalProcedureFlow(currentCase);
  currentStep = -1;
  completedSteps = [];
  caseFeedback.textContent = 'تم اختيار السيناريو. اضغط ابدأ التدريب لعرض الخطوات.';
  updateCaseView();
});
document.getElementById('start-case')?.addEventListener('click', () => {
  currentCase = scenarioSelect.value;
  if (clinicalSurfaceReady) resetClinicalProcedureFlow(currentCase);
  if (currentCase === 'restoration') resetCariesTrainingCase();
  currentStep = 0;
  completedSteps = [];
  caseFeedback.textContent = trainingCases[currentCase].steps[0][1];
  updateCaseView();
});
nextStepButton?.addEventListener('click', () => {
  const steps = trainingCases[currentCase].steps;
  if (currentStep < 0 || currentStep >= steps.length) return;
  completedSteps.push({ title: steps[currentStep][0], completedAt: new Date().toISOString() });
  if (completedSteps.length < steps.length) {
    currentStep += 1;
    caseFeedback.textContent = steps[currentStep][1];
  } else {
    currentStep = steps.length;
    caseFeedback.textContent = 'اكتمل السيناريو. راجع الملاحظات مع المشرف؛ الإكمال لا يعني اجتياز كفاءة سريرية.';
    nextStepButton.disabled = true;
    try {
      const stored = localStorage.getItem('dental-sim-training');
      const history = stored ? JSON.parse(stored) : [];
      const safeHistory = Array.isArray(history) ? history : [];
      safeHistory.push({ scenario: currentCase, title: trainingCases[currentCase].title, completedAt: new Date().toISOString(), steps: completedSteps });
      localStorage.setItem('dental-sim-training', JSON.stringify(safeHistory.slice(-50)));
    } catch (storageError) {
      console.warn('Training progress could not be stored in this browser.', storageError);
    }
  }
  updateCaseView();
});
document.getElementById('export-report')?.addEventListener('click', () => {
  const report = {
    application: 'Dental Simulation',
    reportType: 'educational-training-checklist',
    createdAt: new Date().toISOString(),
    scenario: currentCase,
    title: trainingCases[currentCase].title,
    completed: completedSteps.length,
    total: trainingCases[currentCase].steps.length,
    steps: completedSteps,
    references: (trainingCases[currentCase].sources || []).map(key => clinicalReferenceIndex[key]?.url).filter(Boolean),
    privacy: 'No patient identifiers or clinical records are included.',
    safety: 'Educational checklist only. Not evidence of clinical competency or a validated treatment protocol.'
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dental-training-${currentCase}-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

// Educational chairside inventory. Every entry has a purpose and a safety/context note.
const dentalInventory = [
  {id:'mirror',name:'مرآة فحص الأسنان',category:'exam',type:'tool',keywords:'mirror mouth inspection',detail:'تعطي رؤية غير مباشرة وتساعد على إبعاد الخد واللسان أثناء الفحص.',note:'تحقق من سلامة السطح والتعقيم، ولا تستخدمها كأداة ضغط أو رفع.'},
  {id:'explorer',name:'مسبار استكشافي',category:'exam',type:'tool',keywords:'explorer probe',detail:'أداة فحص لمعاينة الأسطح والحواف ضمن فحص منهجي.',note:'التعامل اللطيف مهم؛ لا تحول المسبار إلى أداة حفر في الآفات.'},
  {id:'periodontal-probe',name:'مسبار دواعم السن',category:'exam',type:'tool',keywords:'periodontal probing pocket depth',detail:'يستخدم ضمن تسجيلات دواعم السن لتقييم أعماق الجيوب والنزف عند الجس.',note:'التسجيل يحتاج قوة قياس متسقة وتفسيرًا وفق التصنيف السريري.'},
  {id:'cotton-pliers',name:'ملقط قطني',category:'exam',type:'tool',keywords:'tweezers college pliers',detail:'لنقل الكرات القطنية والقطع الصغيرة داخل المجال الفموي.',note:'حافظ على السيطرة على الأشياء الصغيرة وتجنب ابتلاعها أو استنشاقها.'},
  {id:'air-water',name:'سرنجة هواء وماء',category:'exam',type:'tool',keywords:'triple syringe air water',detail:'تساعد في شطف وتجفيف المجال حسب نوع الإجراء.',note:'تحقق من سلامة الطرف ومنع الرذاذ والتلوث المتبادل.'},
  {id:'saliva-ejector',name:'شفاط لعاب منخفض الحجم',category:'exam',type:'tool',keywords:'saliva ejector suction',detail:'لإزالة اللعاب والسوائل من جوف الفم.',note:'راقب وضع الطرف وراحة المريض، واتبع تعليمات مكافحة العدوى.'},
  {id:'high-volume-suction',name:'شفاط عالي الحجم',category:'exam',type:'tool',keywords:'HVE suction evacuator',detail:'للتحكم في السوائل والرذاذ أثناء الإجراءات.',note:'اختيار القطر والموضع يعتمد على الإجراء وتدريب المساعد.'},
  {id:'bite-block',name:'حاجز فتح الفم',category:'exam',type:'tool',keywords:'mouth prop bite block',detail:'قد يساعد في دعم فتح الفم في حالات مختارة.',note:'استخدمه فقط عند الحاجة وبعد تقييم راحة المريض وموانع الاستعمال.'},
  {id:'high-speed',name:'قبضة عالية السرعة',category:'restorative',type:'tool',keywords:'high speed handpiece turbine',detail:'قبضة دوارة تستخدم مع أدوات قطع مخصصة في إجراءات سنية مختلفة.',note:'لا تستخدمها دون تدريب ووسائل تبريد وحماية واتباع تعليمات الجهاز.'},
  {id:'low-speed',name:'قبضة منخفضة السرعة',category:'restorative',type:'tool',keywords:'low speed contra angle micromotor',detail:'تستخدم مع ملحقات مختلفة للتشطيب والتلميع وبعض أعمال إزالة المواد.',note:'اختيار السرعة والملحق يعتمد على تعليمات الشركة والإجراء.'},
  {id:'bur-kit',name:'مجموعة رؤوس الحفر',category:'restorative',type:'tool',keywords:'bur diamond carbide round fissure',detail:'مجموعة أشكال وأحجام مختلفة من رؤوس القطع والتشطيب.',note:'اللون والشكل لا يكفيان للتعرف؛ راجع مواصفات المنتج وملاءمته.'},
  {id:'rubber-dam',name:'طقم العزل المطاطي',category:'restorative',type:'tool',keywords:'rubber dam clamp frame sheet',detail:'يتضمن الصفيحة والإطار والمشابك وأدوات الثقب والتركيب.',note:'تحقق من ملاءمة المشبك وسلامة النسج وخطر حساسية اللاتكس.'},
  {id:'matrix',name:'نظام المصفوفة',category:'restorative',type:'tool',keywords:'matrix band sectional ring',detail:'يساعد في إعادة بناء الجدار والتلامس التقريبي في ترميمات مختارة.',note:'الاختيار والموضع يحتاجان تدريبًا ومراجعة شكل السن والتلامس.'},
  {id:'wedges',name:'أوتاد بينية',category:'restorative',type:'tool',keywords:'wood wedge plastic wedge',detail:'تساعد على تكييف شريط المصفوفة وإدارة المجال التقريبي.',note:'اختر الحجم المناسب وتجنب أذية الحليمة اللثوية.'},
  {id:'composite-instrument',name:'أداة وضع الكومبوزيت',category:'restorative',type:'tool',keywords:'composite placement instrument spatula',detail:'للتعامل مع المادة الترميمية وتكييفها ضمن تقنية معتمدة.',note:'نظافة الأداة وتوافقها مع المادة وتعليمات الشركة مهمة.'},
  {id:'curing-light',name:'مصباح التصلب الضوئي',category:'restorative',type:'tool',keywords:'LED curing light',detail:'جهاز ضوئي لتصلب مواد متوافقة مع طيفه.',note:'راجع توافق الطيف والشدة والزمن وفق تعليمات المادة والجهاز، واستخدم حماية العين.'},
  {id:'endo-files',name:'ملفات علاج الجذور',category:'endo',type:'tool',keywords:'endodontic files hand rotary NiTi',detail:'أدوات يدوية أو آلية لإجراءات تنظيف وتشكيل القنوات الجذرية.',note:'اختلاف التشريح ومخاطر الانفصال يفرضان التدريب وخطة طول عمل موثقة.'},
  {id:'apex-locator',name:'جهاز تحديد الذروة الإلكتروني',category:'endo',type:'tool',keywords:'apex locator endodontic',detail:'يساعد في تقدير موضع النهاية العاملة للقناة ضمن سياق التشخيص.',note:'لا يستبدل فهم التشريح أو التحقق السريري والشعاعي عند الحاجة.'},
  {id:'endo-irrigation',name:'سرنجة وريّ بقنية مخصصة',category:'endo',type:'tool',keywords:'irrigation syringe side vented needle',detail:'منظومة توصيل سوائل الري داخل قناة الجذر ضمن إجراءات علاج الجذور.',note:'خطر دفع السائل خارج الذروة يستلزم التدريب والالتزام بالبروتوكول المحلي.'},
  {id:'paper-points',name:'مخاريط ورقية',category:'endo',type:'tool',keywords:'paper points absorbent',detail:'مواد ماصة تستخدم في مرحلة تجفيف القنوات ضمن الإجراء.',note:'الحجم والملاءمة مرتبطان بالقناة وخطة الإجراء.'},
  {id:'endo-spreader',name:'مباعد قنوات',category:'endo',type:'tool',keywords:'endo spreader plugger',detail:'أداة ضمن بعض تقنيات حشو القنوات.',note:'تتبع التقنية المعتمدة وتجنب الضغط غير المسيطر عليه.'},
  {id:'extraction-forceps',name:'ملقط خلع الأسنان',category:'surgery',type:'tool',keywords:'extraction forceps',detail:'أداة جراحية مخصصة للإمساك بالسن أثناء الخلع.',note:'اختيار التصميم يعتمد على السن والجذور والتشريح؛ لا يوضح هذا النموذج قوى الخلع.'},
  {id:'elevator',name:'رافعة جذور',category:'surgery',type:'tool',keywords:'elevator luxator root',detail:'أداة جراحية تستخدم ضمن مبادئ تحريك السن أو الجذر في حالات مختارة.',note:'التوجيه والقوة ومخاطر الأنسجة المجاورة تتطلب تدريبًا جراحيًا مباشرًا.'},
  {id:'periotome',name:'مشرط/رافعة حول سنية دقيقة',category:'surgery',type:'tool',keywords:'periotome luxator',detail:'أداة دقيقة للمساعدة في فصل ألياف الرباط حول السني في سياقات مختارة.',note:'لا تستخدم كبديل عن تقييم صعوبة الحالة وخطة الحماية.'},
  {id:'scalpel',name:'مقبض مشرط جراحي',category:'surgery',type:'tool',keywords:'scalpel blade surgical',detail:'أداة قطع جراحية ضمن إجراءات جراحية مدروسة.',note:'التعامل الآمن والتخلص من الشفرات الحادة وفق سياسة المنشأة.'},
  {id:'curette',name:'مكشطة/ملعقة جراحية',category:'surgery',type:'tool',keywords:'curette surgical bone',detail:'أداة لإزالة أو تنظيف أنسجة ضمن إجراءات جراحية محددة.',note:'الاستعمال التشريحي الدقيق يتطلب تدريبًا وإشرافًا.'},
  {id:'needle-holder',name:'ماسك إبرة جراحية',category:'surgery',type:'tool',keywords:'needle holder suturing',detail:'لإمساك الإبرة أثناء الخياطة الجراحية.',note:'اختر أداة مناسبة لنوع الإبرة والخيط وتدرب على المناولة الآمنة.'},
  {id:'suture-scissors',name:'مقص جراحي',category:'surgery',type:'tool',keywords:'suture scissors surgical',detail:'لقطع الخيوط أو المواد المناسبة وفق الإجراء.',note:'احفظ الحواف الحادة وتعامل مع الأدوات وفق بروتوكول التعقيم.'},
  {id:'ultrasonic-scaler',name:'جهاز إزالة الترسبات فوق الصوتي',category:'perio',type:'tool',keywords:'ultrasonic scaler perio',detail:'أداة اهتزازية لإزالة الترسبات ضمن عناية دواعم السن.',note:'اختيار الطرف والطاقة والتبريد يعتمد على تعليمات الجهاز وحالة المريض.'},
  {id:'gracey-curette',name:'مكشطة Gracey',category:'perio',type:'tool',keywords:'Gracey curette periodontal',detail:'أداة يدوية بتصميمات مختلفة لمناطق محددة من الأسنان.',note:'التعرف على رقم الأداة والسطح العامل يحتاج تدريبًا عمليًا.'},
  {id:'impression-tray',name:'ملعقة طبعة',category:'prostho',type:'tool',keywords:'impression tray',detail:'حامل لمادة الطبعة التقليدية عند استخدامها.',note:'اختيار المقاس والملاءمة قبل أخذ الطبعة أساسيان.'},
  {id:'intraoral-scanner',name:'ماسح داخل الفم',category:'prostho',type:'tool',keywords:'intraoral scanner digital scan',detail:'يلتقط بيانات رقمية لأسطح الأسنان والنسج الظاهرة.',note:'جودة المسح تعتمد على المجال والرطوبة وخطة المسح والمعايرة.'},
  {id:'shade-guide',name:'دليل اختيار اللون',category:'prostho',type:'tool',keywords:'shade guide color',detail:'مرجع بصري لتسجيل لون الأسنان والتواصل مع المختبر.',note:'الإضاءة والبيئة والشفافية تؤثر في التقييم.'},
  {id:'orthodontic-pliers',name:'كماشات تقويمية',category:'ortho',type:'tool',keywords:'orthodontic pliers bracket wire',detail:'أدوات مخصصة لمناولة الأسلاك والملحقات التقويمية.',note:'كل تصميم له وظيفة محددة؛ يلزم تدريب اختصاصي التقويم.'},
  {id:'surgical-drill',name:'قبضة جراحية تعليمية للزرعات',category:'surgery',type:'tool',keywords:'implant surgical drill handpiece',detail:'مجسم تدريبي لتوضيح التفاعل ثلاثي الأبعاد مع موضع افتراضي في الفك.',note:'لا يحاكي سرعة جهاز جراحي أو كثافة العظم أو التخطيط الآمن للزرعة.'},
  {id:'implant-fixture-kit',name:'مجموعة جسم الزرعة والدعامة',category:'surgery',type:'tool',keywords:'implant fixture abutment dental implant',detail:'مجسم تعليمي لجسم الزرعة والدعامة في مسار تقييم التعويض.',note:'أبعاد المجسم وعلاقته بالعظم غير معايرة ولا تصلح لتخطيط مريض.'},
  {id:'ortho-bracket-kit',name:'مجموعة حاصرات التقويم',category:'ortho',type:'tool',keywords:'orthodontic brackets brace',detail:'مكونات مرئية لتدريب ترتيب الحاصرات وربطها بسلك تقويمي افتراضي.',note:'المواضع والقوى غير محسوبة وفق تشخيص تقويمي حقيقي.'},
  {id:'orthodontic-wire',name:'سلك تقويم الأسنان',category:'ortho',type:'tool',keywords:'orthodontic archwire',detail:'سلك افتراضي يربط الحاصرات على القوس السني في مشهد التدريب.',note:'لا يحاكي خواص سبائك التقويم أو القوى البيوميكانيكية المقاسة.'},
  {id:'splint-wire',name:'سلك تثبيت رضوض الأسنان',category:'ortho',type:'tool',keywords:'dental trauma splint wire',detail:'مجسم يوضح مبدأ الربط المرن للأسنان المجاورة في مسار الرضوض.',note:'ليس قالبًا سريريًا أو تعليمات تثبيت معتمدة لإصابة محددة.'},
  {id:'composite-resin',name:'راتنج كومبوزيت',category:'materials',type:'material',keywords:'composite resin restorative',detail:'مادة ترميمية راتنجية ذات خصائص تختلف حسب المنتج واللزوجة والحشوات.',note:'التزم بنشرة الشركة والتوافق اللاصق والتخزين وتاريخ الصلاحية.'},
  {id:'glass-ionomer',name:'إسمنت زجاجي أيوني',category:'materials',type:'material',keywords:'glass ionomer GIC restorative',detail:'مادة ذات استخدامات ترميمية أو قاعدية أو إسمنتية بحسب الصيغة.',note:'لا تفترض أن جميع الأنواع قابلة للتبادل؛ راجع الاستطبابات وتعليمات الشركة.'},
  {id:'etchant',name:'مادة تخريش',category:'materials',type:'material',keywords:'etch phosphoric acid',detail:'مادة لمعالجة السطح ضمن نظم التصاق محددة.',note:'احمِ النسج الرخوة والتزم بتعليمات المادة ولا تعمم زمنًا واحدًا.'},
  {id:'adhesive',name:'نظام لاصق',category:'materials',type:'material',keywords:'bonding adhesive dental',detail:'نظام لاصق يهيئ الارتباط بين بنية السن والمادة الترميمية.',note:'تختلف الأنظمة والخطوات؛ اتبع النشرة الخاصة بالمنتج.'},
  {id:'calcium-silicate',name:'مادة سيليكات الكالسيوم الحيوية',category:'materials',type:'material',keywords:'MTA bioceramic calcium silicate',detail:'فئة مواد حيوية تستخدم في استطبابات لبيّة وترميمية محددة.',note:'الاختيار والتعامل يحدده التشخيص وتعليمات الشركة والمشرف.'},
  {id:'temporary-restoration',name:'مادة ترميم مؤقت',category:'materials',type:'material',keywords:'temporary filling cement',detail:'مادة إغلاق أو ترميم مؤقتة لحالات مختارة.',note:'راجع مدة الاستخدام وخطة الاستبدال ومتطلبات الإغلاق.'},
  {id:'endodontic-sealer',name:'مادة إغلاق قنوات',category:'materials',type:'material',keywords:'root canal sealer',detail:'مادة تستخدم مع مادة الحشو ضمن نظم إغلاق قنوات الجذر.',note:'التركيب والتوافق والتعامل تختلف بين المنتجات.'},
  {id:'gutta-percha',name:'مخاريط غوتا بيركا',category:'materials',type:'material',keywords:'gutta percha obturation',detail:'مادة حشو شائعة ضمن نظم علاج الجذور.',note:'الحجم والتقنية مرتبطان بتشكيل القناة ونظام الحشو.'},
  {id:'impression-silicone',name:'سيليكون طبعات',category:'materials',type:'material',keywords:'PVS addition silicone impression',detail:'مادة طبعة مرنة تستخدم في تطبيقات تعويضية مختلفة.',note:'الخلط وزمن العمل والتخزين وفق المنتج المحدد.'},
  {id:'luting-cement',name:'إسمنت تثبيت تعويضي',category:'materials',type:'material',keywords:'resin cement glass ionomer luting',detail:'مواد لتثبيت التعويضات بحسب نوع الترميم والسطح والمادة.',note:'لا يوجد إسمنت واحد مناسب لكل التعويضات؛ اتبع تعليمات الشركة.'},
  {id:'suture-material',name:'خيوط جراحية',category:'materials',type:'material',keywords:'suture silk vicryl nylon',detail:'خيوط جراحية تختلف في الامتصاص والقطر والبنية.',note:'اختيار النوع والحجم والتوقيت ضمن التدريب الجراحي وبروتوكول المنشأة.'},
  {id:'fluoride-varnish',name:'ورنيش فلورايد تعليمي',category:'materials',type:'material',keywords:'fluoride varnish prevention pediatric',detail:'عبوة افتراضية لتوضيح التغطية الوقائية على سطح السن في مسار الأطفال.',note:'لا تمثل تركيزًا دوائيًا أو جرعة أو قرارًا علاجيًا لطفل بعينه.'},
  {id:'ppe-gloves',name:'قفازات طبية',category:'ppe',type:'material',keywords:'gloves nitrile latex',detail:'حاجز وقائي لليدين ضمن احتياطات مكافحة العدوى.',note:'اختر مادة متوافقة مع الحساسية وسياسة المنشأة، وبدلها بين المهام.'},
  {id:'ppe-mask',name:'كمامة طبية/حماية تنفسية',category:'ppe',type:'material',keywords:'mask respirator',detail:'وسيلة حماية تنفسية تختار وفق نوع الإجراء وتقييم المخاطر.',note:'الملاءمة والاستخدام وفق السياسة الصحية الحالية.'},
  {id:'eye-protection',name:'نظارات واقية ودرع وجه',category:'ppe',type:'material',keywords:'goggles face shield',detail:'حماية العين والوجه من الرذاذ والجزيئات.',note:'نظفها وعقمها أو استبدلها وفق تعليمات الشركة ومكافحة العدوى.'},
  {id:'sterile-drape',name:'غطاء وحاجز أحادي الاستخدام',category:'ppe',type:'material',keywords:'barrier drape disposable',detail:'حواجز للأسطح ومناطق التلامس لتقليل انتقال التلوث.',note:'إزالة آمنة وتبديل بين المرضى وفق بروتوكول المنشأة.'}
];

const inventoryList = document.getElementById('inventory-list');
const inventoryDetail = document.getElementById('inventory-detail');
const inventorySearch = document.getElementById('inventory-search');
const inventoryCategory = document.getElementById('inventory-category');
let selectedInventoryItem = dentalInventory[0];

const activeMaterialRoot = new TransformNode('ActiveTreatmentMaterial', scene);
activeMaterialRoot.parent = treatmentRoot;
activeMaterialRoot.position.set(-1.58, 1.08, 1.12);
const materialBottle = cylinder('ActiveMaterialBottle', .38, .18, [0,0,0], 'glass', activeMaterialRoot, 24);
const materialBottleCap = cylinder('ActiveMaterialCap', .09, .12, [0,.22,0], 'tealDark', activeMaterialRoot, 20);
activeMaterialRoot.setEnabled(false);

function selectInventoryItem(item) {
  if (clinicalSurfaceReady) resetClinicalContactState('تم اختيار عنصر جديد. أعد ملامسة سطح السن لتنفيذ الخطوة التالية.');
  selectedInventoryItem = item;
  if (inventoryDetail) {
    inventoryDetail.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = item.name + (item.type === 'material' ? ' · مادة' : ' · أداة');
    const purpose = document.createElement('p');
    purpose.textContent = item.detail;
    const note = document.createElement('p');
    note.textContent = 'ملاحظة: ' + item.note;
    inventoryDetail.append(title, purpose, note);
  }
  const isMaterial = item.type === 'material';
  if (activeExperience === 'oral-exam') {
    activeInstrumentRoot.setEnabled(false);
    activeMaterialRoot.setEnabled(false);
    selectOralInventoryVisual(item);
  } else {
    activeInstrumentRoot.setEnabled(!isMaterial);
    activeMaterialRoot.setEnabled(isMaterial);
    activeInstrumentRoot.metadata = { treatmentLabel: item.name, detail: item.detail };
  }
  document.getElementById('treatment-interaction-status').textContent =
    'تم اختيار ' + item.name + '. اسحب المجسم إلى مربع العمل أو استخدم زر تحريك الأداة للفم.';
  document.getElementById('selection-name').textContent = item.name;
  document.getElementById('selection-description').textContent = item.detail;
  inventoryList?.querySelectorAll('.inventory-item').forEach(button => {
    button.classList.toggle('selected', button.dataset.inventoryId === item.id);
  });
}
function renderInventory() {
  if (!inventoryList) return;
  const query = (inventorySearch?.value || '').trim().toLocaleLowerCase('ar');
  const category = inventoryCategory?.value || 'all';
  inventoryList.replaceChildren();
  const rows = dentalInventory.filter(item => {
    const matchesCategory = category === 'all' || item.category === category;
    const haystack = (item.name + ' ' + item.keywords + ' ' + item.detail).toLocaleLowerCase('ar');
    return matchesCategory && (!query || haystack.includes(query));
  });
  for (const item of rows) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inventory-item' + (item.id === selectedInventoryItem.id ? ' selected' : '');
    button.dataset.inventoryId = item.id;
    button.draggable = true;
    button.addEventListener('dragstart', event => {
      event.dataTransfer?.setData('application/x-dental-inventory', item.id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
    });
    const name = document.createElement('b');
    name.textContent = item.name;
    const tag = document.createElement('small');
    tag.textContent = item.type === 'material' ? 'مادة / مستهلك' : 'أداة';
    button.append(name, tag);
    button.addEventListener('click', () => selectInventoryItem(item));
    inventoryList.appendChild(button);
  }
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'asset-license-note';
    empty.textContent = 'لا توجد عناصر مطابقة للبحث.';
    inventoryList.appendChild(empty);
  }
}
inventorySearch?.addEventListener('input', renderInventory);
inventoryCategory?.addEventListener('change', renderInventory);
renderInventory();
selectInventoryItem(selectedInventoryItem);

let cariesTrainingStage = 'caries';

const clinicalProcedureFlows = {
  exam: [
    { tool:'mirror', label:'مسح بصري للأسطح', effect:'inspection', contact:'tooth' },
    { tool:'explorer', label:'فحص سطح السن', effect:'surface-map', contact:'tooth' },
    { tool:'periodontal-probe', label:'تسجيل موضع لثوي تعليمي', effect:'measure', contact:'gingiva' }
  ],
  endo: [
    { tool:'rubber-dam', label:'تمثيل العزل حول السن', effect:'isolation', contact:'tooth' },
    { tool:'high-speed', label:'تحضير مدخل تعليمي', effect:'access', contact:'tooth', depth:.18 },
    { tool:'endo-files', label:'إظهار مسار أداة القناة', effect:'canal-file', contact:'tooth' },
    { tool:'endo-irrigation', label:'ري القناة بجزيئات سائلة', effect:'irrigation', contact:'tooth' },
    { tool:'endodontic-sealer', label:'إضافة طبقة مادة إغلاق', effect:'sealer', contact:'tooth' },
    { tool:'gutta-percha', label:'إظهار مادة الإغلاق داخل المسار', effect:'obturation', contact:'tooth' }
  ],
  hygiene: [
    { tool:'periodontal-probe', label:'قياس لثوي افتراضي', effect:'measure', contact:'gingiva' },
    { tool:'ultrasonic-scaler', label:'إزالة ترسبات سطحية افتراضية', effect:'debride', contact:'gingiva' },
    { tool:'gracey-curette', label:'تنظيف موضعي إضافي', effect:'root-clean', contact:'gingiva' },
    { tool:'air-water', label:'شطف المجال المرئي', effect:'irrigation', contact:'gingiva' }
  ],
  extraction: [
    { tool:'periodontal-probe', label:'تقييم السن واللثة', effect:'measure', contact:'gingiva' },
    { tool:'periotome', label:'تمثيل تحرير الرباط حول السن', effect:'release', contact:'gingiva' },
    { tool:'elevator', label:'تطبيق حركة رفع تعليمية محدودة', effect:'luxation', contact:'tooth', force:.8 },
    { tool:'extraction-forceps', label:'تمثيل إزالة السن من المشهد', effect:'extraction', contact:'tooth', force:1.0 },
    { tool:'suture-material', label:'إظهار خيط إغلاق موضعي', effect:'suture', contact:'gingiva' }
  ],
  periodontal: [
    { tool:'periodontal-probe', label:'تسجيل موضع اللثة', effect:'measure', contact:'gingiva' },
    { tool:'ultrasonic-scaler', label:'إزالة ترسبات سطحية', effect:'debride', contact:'gingiva' },
    { tool:'gracey-curette', label:'تنظيف سطحي تكميلي', effect:'root-clean', contact:'gingiva' },
    { tool:'air-water', label:'شطف وإظهار تدفق السوائل', effect:'irrigation', contact:'gingiva' }
  ],
  prostho: [
    { tool:'high-speed', label:'تغيير سطح تحضير افتراضي', effect:'prep', contact:'tooth', depth:.16 },
    { tool:'intraoral-scanner', label:'مسح ثلاثي الأبعاد للسن', effect:'scan', contact:'tooth' },
    { tool:'shade-guide', label:'إضافة قراءة لون تعليمية', effect:'shade', contact:'tooth' },
    { tool:'impression-tray', label:'تحديد موضع ملعقة الطبعة', effect:'tray', contact:'tooth' },
    { tool:'impression-silicone', label:'إظهار مادة الطبعة', effect:'impression', contact:'tooth' },
    { tool:'luting-cement', label:'إظهار طبقة تثبيت تعويضية', effect:'cement', contact:'tooth' }
  ],
  implant: [
    { tool:'intraoral-scanner', label:'تسجيل موضع التعويض الرقمي', effect:'scan', contact:'tooth' },
    { tool:'surgical-drill', label:'تمثيل موضع تحضير عظمي افتراضي', effect:'implant-site', contact:'gingiva' },
    { tool:'implant-fixture-kit', label:'إظهار جسم زرعة تعليمي', effect:'implant-fixture', contact:'gingiva' },
    { tool:'suture-material', label:'إظهار خيط إغلاق موضعي', effect:'suture', contact:'gingiva' }
  ],
  ortho: [
    { tool:'intraoral-scanner', label:'مسح موضع السن', effect:'scan', contact:'tooth' },
    { tool:'ortho-bracket-kit', label:'وضع قاعدة تقويم على السن', effect:'bracket', contact:'tooth' },
    { tool:'orthodontic-wire', label:'ربط قواعد التقويم بسلك', effect:'archwire', contact:'tooth' },
    { tool:'curing-light', label:'تثبيت بصري افتراضي للقاعدة', effect:'bond', contact:'tooth' }
  ],
  trauma: [
    { tool:'mirror', label:'فحص بصري أولي', effect:'inspection', contact:'tooth' },
    { tool:'explorer', label:'تحديد سطح الإصابة', effect:'surface-map', contact:'tooth' },
    { tool:'splint-wire', label:'إظهار وصلة تثبيت تعليمية', effect:'splint', contact:'tooth' },
    { tool:'composite-resin', label:'إضافة مادة ربط افتراضية', effect:'bond', contact:'tooth' },
    { tool:'curing-light', label:'إكمال التثبيت البصري', effect:'bond', contact:'tooth' }
  ],
  emergency: [
    { tool:'mirror', label:'تقييم مجال الفم بصريًا', effect:'inspection', contact:'tooth' },
    { tool:'high-volume-suction', label:'إظهار سحب السوائل والجزيئات', effect:'suction', contact:'tooth' },
    { tool:'air-water', label:'شطف المجال المرئي', effect:'irrigation', contact:'tooth' }
  ],
  pediatric: [
    { tool:'mirror', label:'فحص بصري لطيف', effect:'inspection', contact:'tooth' },
    { tool:'fluoride-varnish', label:'تغطية سطحية تعليمية بالورنيش', effect:'fluoride', contact:'tooth' },
    { tool:'glass-ionomer', label:'إظهار كتلة مادة ترميمية افتراضية', effect:'bond', contact:'tooth' }
  ]
};
let activeClinicalProcedure = 'exam';
let activeClinicalProcedureIndex = 0;
const clinicalProcedureVisuals = [];
const extractedToothKeys = new Set();
let csg2Initialization = null;
const dentalBooleanCutHistory = [];
function resetClinicalProcedureFlow(scenario = 'restoration') {
  restoreDentalBooleanWear();
  activeClinicalProcedure = clinicalProcedureFlows[scenario] ? scenario : 'restoration';
  activeClinicalProcedureIndex = 0;
  for (const visual of clinicalProcedureVisuals) visual.dispose();
  clinicalProcedureVisuals.length = 0;
  for (const key of extractedToothKeys) {
    for (const mesh of dentalMeshByKey.get(key) || []) {
      mesh.setEnabled(true);
      mesh.isVisible = true;
    }
  }
  extractedToothKeys.clear();
  resetClinicalContactState('تمت إعادة ضبط المحاكاة الإجرائية والأنسجة المرئية.');
}
async function ensureDentalBooleanEngine() {
  if (!csg2Initialization) {
    csg2Initialization = InitializeCSG2Async().catch(error => {
      csg2Initialization = null;
      throw error;
    });
  }
  await csg2Initialization;
}
function replaceDentalMeshReference(original, replacement, key) {
  const current = dentalMeshByKey.get(key) || [];
  dentalMeshByKey.set(key, current.map(mesh => mesh === original ? replacement : mesh));
  dentalMeshRecords = dentalMeshRecords.map(record =>
    record.mesh === original ? { ...record, mesh: replacement } : record
  );
  const structureIndex = dentalStructureRecords.findIndex(record => record.mesh === original);
  if (structureIndex >= 0) dentalStructureRecords[structureIndex] = { ...dentalStructureRecords[structureIndex], mesh: replacement };
  if (dentalSelectedKey === key) {
    highlight.removeMesh(original);
    highlight.addMesh(replacement, Color3.FromHexString('#43dbc2'));
  }
}
async function applyDentalBooleanWear() {
  const sourceMesh = clinicalSurface.targetMesh;
  const key = clinicalSurface.targetKey;
  if (!sourceMesh || !key?.startsWith('tooth-') || !clinicalSurface.contactPoint) return false;
  await ensureDentalBooleanEngine();
  const path = clinicalSurface.contactTrace.length
    ? clinicalSurface.contactTrace.filter(sample => sample.key === key)
    : [{ point:clinicalSurface.contactPoint, normal:clinicalSurface.contactNormal, key }];
  const samples = path.length > 10
    ? path.filter((sample, index) => index === 0 || index === path.length - 1 || index % Math.ceil(path.length / 10) === 0)
    : path;
  let originalCSG = null;
  let workingCSG = null;
  try {
    originalCSG = CSG2.FromMesh(sourceMesh, true);
    workingCSG = originalCSG;
    for (let i=0; i<samples.length; i++) {
      const sample = samples[i];
      const localPoint = localPointForMesh(sourceMesh, sample.point);
      const inverse = Matrix.Invert(sourceMesh.computeWorldMatrix(true));
      const localNormal = Vector3.TransformNormal(sample.normal || Vector3.Up(), inverse).normalize();
      const cutter = MeshBuilder.CreateSphere('DentalBurBooleanCutter_' + i, { diameter:.28, segments:16 }, scene);
      let cutterCSG = null;
      try {
        cutter.position.copyFrom(localPoint).subtractInPlace(localNormal.scale(.065));
        cutter.scaling.set(1, .74, 1);
        cutter.bakeCurrentTransformIntoVertices();
        cutterCSG = CSG2.FromMesh(cutter, true);
        const next = workingCSG.subtract(cutterCSG);
        if (workingCSG !== originalCSG) workingCSG.dispose();
        workingCSG = next;
      } finally {
        cutterCSG?.dispose();
        cutter.dispose();
      }
    }
    const replacement = workingCSG.toMesh('Prepared_' + key + '_' + dentalBooleanCutHistory.length, scene, {
      centerMesh:false,
      rebuildNormals:true
    });
    replacement.parent = sourceMesh.parent;
    replacement.position.copyFrom(sourceMesh.position);
    replacement.scaling.copyFrom(sourceMesh.scaling);
    if (sourceMesh.rotationQuaternion) {
      replacement.rotationQuaternion = sourceMesh.rotationQuaternion.clone();
      replacement.rotation.setAll(0);
    } else {
      replacement.rotation.copyFrom(sourceMesh.rotation);
    }
    replacement.material = sourceMesh.material;
    replacement.metadata = { ...(sourceMesh.metadata || {}), dentalScopeKey:key, isBooleanPrepared:true };
    replacement.isPickable = true;
    replacement.isVisible = sourceMesh.isVisible;
    replacement.setEnabled(true);
    sourceMesh.setEnabled(false);
    replaceDentalMeshReference(sourceMesh, replacement, key);
    dentalBooleanCutHistory.push({ original:sourceMesh, replacement, key });
    clinicalSurface.targetMesh = replacement;
    if (clinicalSurface.contactMarker) {
      clinicalSurface.contactMarker.parent = replacement;
      clinicalSurface.contactMarker.position.copyFrom(localPointForMesh(replacement, clinicalSurface.contactPoint));
    }
    if (clinicalSurface.surfaceMark) {
      clinicalSurface.surfaceMark.parent = replacement;
      clinicalSurface.surfaceMark.position.copyFrom(localPointForMesh(replacement, clinicalSurface.contactPoint));
    }
    replacement.computeWorldMatrix(true);
    return true;
  } finally {
    if (workingCSG && workingCSG !== originalCSG) workingCSG.dispose();
    originalCSG?.dispose();
  }
}
function restoreDentalBooleanWear() {
  if (dentalBooleanCutHistory.length) {
    clinicalSurface.contactMarker?.dispose();
    clinicalSurface.surfaceMark?.dispose();
    clinicalSurface.contactMarker = null;
    clinicalSurface.surfaceMark = null;
    clinicalSurface.targetMesh = null;
    clinicalSurface.contactTrace = [];
  }
  for (let i=dentalBooleanCutHistory.length-1;i>=0;i--) {
    const item = dentalBooleanCutHistory[i];
    item.replacement.setEnabled(false);
    item.original.setEnabled(true);
    replaceDentalMeshReference(item.replacement, item.original, item.key);
    item.replacement.dispose(false, true);
  }
  dentalBooleanCutHistory.length = 0;
}
function addProcedureVisual(effect) {
  const mesh = clinicalSurface.targetMesh;
  const worldPoint = clinicalSurface.contactPoint;
  if (!mesh || !worldPoint) return;
  const root = new TransformNode('ClinicalProcedure_' + effect + '_' + clinicalProcedureVisuals.length, scene);
  root.parent = mesh;
  root.position.copyFrom(localPointForMesh(mesh, worldPoint));
  root.metadata = { clinicalEffect:effect, targetKey:clinicalSurface.targetKey };
  const addSphere = (name, diameter, position, materialName, scaling = null) => {
    const object = MeshBuilder.CreateSphere(name, { diameter, segments:18 }, scene);
    object.parent = root;
    object.position.copyFrom(position);
    object.material = materialName;
    object.isPickable = false;
    if (scaling) object.scaling.copyFrom(scaling);
    return object;
  };
  const addBox = (name, dimensions, position, materialName) => {
    const object = MeshBuilder.CreateBox(name, { width:dimensions[0],height:dimensions[1],depth:dimensions[2] }, scene);
    object.parent = root;
    object.position.copyFrom(position);
    object.material = materialName;
    object.isPickable = false;
    return object;
  };
  switch (effect) {
    case 'inspection':
    case 'surface-map':
    case 'measure':
      addSphere('ClinicalInspectionMarker', .18, Vector3.Zero(), mats.accent, new Vector3(1,.12,1));
      break;
    case 'isolation':
      MeshBuilder.CreateTorus('ClinicalRubberDamRing', { diameter:1.1,thickness:.055,tessellation:32 }, scene).parent = root;
      break;
    case 'access':
    case 'prep':
    case 'implant-site':
      addSphere('ClinicalPreparationZone', .34, Vector3.Zero(), clinicalCavityMaterial, new Vector3(1,.2,1));
      break;
    case 'canal-file':
      {
        const file = MeshBuilder.CreateCylinder('ClinicalCanalFile', {height:.9,diameterTop:.018,diameterBottom:.045,tessellation:12},scene);
        file.parent=root;file.material=mats.metal;file.isPickable=false;file.rotation.x=Math.PI/2;
      }
      break;
    case 'irrigation':
    case 'suction':
      spawnClinicalFluid(worldPoint, clinicalSurface.contactNormal || Vector3.Up(), effect === 'suction' ? 4 : 6);
      addSphere('ClinicalFluidTarget', .22, Vector3.Zero(), clinicalWaterMaterial, new Vector3(1,.16,1));
      break;
    case 'sealer':
    case 'cement':
    case 'fluoride':
    case 'bond':
    case 'impression':
      addSphere('ClinicalMaterialLayer', .42, Vector3.Zero(), effect === 'fluoride' ? clinicalWaterMaterial : mats.tooth, new Vector3(1,.11,1));
      break;
    case 'obturation':
      {
        const cone = MeshBuilder.CreateCylinder('ClinicalObturationCone', {height:.85,diameterTop:.015,diameterBottom:.12,tessellation:16},scene);
        cone.parent=root;cone.material=mats.accent;cone.isPickable=false;cone.rotation.x=Math.PI/2;
      }
      break;
    case 'debride':
    case 'root-clean':
      addSphere('ClinicalDebridementTrace', .46, Vector3.Zero(), clinicalDebrisMaterial, new Vector3(1,.1,1));
      break;
    case 'release':
      addSphere('ClinicalLigamentReleaseTrace', .32, Vector3.Zero(), clinicalTissueMarkMaterial, new Vector3(1,.12,1));
      break;
    case 'luxation':
      {
        const pivot = new TransformNode('ClinicalMobilityIndicator',scene);pivot.parent=root;
        const needle = MeshBuilder.CreateCylinder('ClinicalMobilityArrow',{height:.7,diameter:.04,tessellation:10},scene);
        needle.parent=pivot;needle.position.x=.3;needle.rotation.z=Math.PI/2;needle.material=mats.accent;needle.isPickable=false;
        pivot.rotation.z=.16;
      }
      break;
    case 'extraction':
      if (/^tooth-\d{2}$/.test(clinicalSurface.targetKey || '')) {
        for (const toothMesh of dentalMeshByKey.get(clinicalSurface.targetKey) || []) {
          toothMesh.setEnabled(false);
          extractedToothKeys.add(clinicalSurface.targetKey);
        }
      }
      addSphere('ClinicalSocketDisplay', .56, Vector3.Zero(), mats.gum, new Vector3(1,.14,1));
      break;
    case 'scan':
      {
        const ring = MeshBuilder.CreateTorus('ClinicalScanRing',{diameter:.8,thickness:.025,tessellation:40},scene);
        ring.parent=root;ring.material=mats.accent;ring.isPickable=false;
        const ring2=MeshBuilder.CreateTorus('ClinicalScanRing2',{diameter:1.02,thickness:.016,tessellation:40},scene);
        ring2.parent=root;ring2.material=mats.glass;ring2.isPickable=false;
      }
      break;
    case 'shade':
      addSphere('ClinicalShadeSample', .25, Vector3.Zero(), mats.tooth, new Vector3(1,.35,.7));
      break;
    case 'tray':
      addBox('ClinicalImpressionTray',[.68,.08,.34],Vector3.Zero(),mats.metal);
      break;
    case 'bracket':
      addBox('ClinicalOrthodonticBracket',[.25,.14,.12],Vector3.Zero(),mats.metal);
      break;
    case 'archwire':
    case 'splint':
    case 'suture':
      tube('ClinicalWireOrSuture',[[0,0,0],[.25,.10,.1],[.5,0,.18],[.75,.08,.28]],.025,effect==='suture'?'accent':'metal',root);
      break;
    case 'implant-fixture':
      {
        const fixture = MeshBuilder.CreateCylinder('ClinicalImplantFixture',{height:.72,diameterTop:.2,diameterBottom:.27,tessellation:24},scene);
        fixture.parent=root;fixture.material=mats.metal;fixture.isPickable=false;
        for (let i=0;i<4;i++) {
          const thread=MeshBuilder.CreateTorus('ClinicalImplantThread_'+i,{diameter:.2+i*.012,thickness:.024,tessellation:20},scene);
          thread.parent=root;thread.position.y=-.22+i*.13;thread.material=mats.metal;thread.isPickable=false;
        }
      }
      break;
    default:
      addSphere('ClinicalProcedureMarker', .3, Vector3.Zero(), mats.accent);
  }
  clinicalProcedureVisuals.push(root);
}
function performGuidedClinicalProcedure() {
  const flow = clinicalProcedureFlows[activeClinicalProcedure] || [];
  const step = flow[activeClinicalProcedureIndex];
  if (!step) {
    clinicalSimulationFeedback.textContent = 'اكتمل هذا المسار التفاعلي. راجع النتيجة مع المشرف السريري.';
    return true;
  }
  const id = selectedInventoryItem?.id;
  if (id !== step.tool) {
    clinicalSimulationFeedback.textContent = 'الخطوة الحالية تتطلب: ' + (dentalInventory.find(item => item.id === step.tool)?.name || step.tool) + '.';
    return false;
  }
  if (!clinicalSurface.targetMesh || !clinicalSurface.targetKey || clinicalSurface.contactSeconds < .18) {
    clinicalSimulationFeedback.textContent = 'لم يتم رصد تلامس كافٍ مع سطح السن أو اللثة. اضغط واسحب الأداة على السطح أولًا.';
    return false;
  }
  if (step.contact === 'tooth' && !clinicalSurface.targetKey.startsWith('tooth-')) {
    clinicalSimulationFeedback.textContent = 'الموضع المستهدف لهذه الخطوة هو سطح السن، وليس اللثة.';
    return false;
  }
  if (step.contact === 'gingiva' && !clinicalSurface.targetKey.startsWith('gingiva-')) {
    clinicalSimulationFeedback.textContent = 'الموضع المستهدف لهذه الخطوة هو سطح اللثة.';
    return false;
  }
  if (step.depth && clinicalSurface.depthMm < step.depth) {
    clinicalSimulationFeedback.textContent = 'استمر في التلامس السطحي المنضبط حتى يظهر تقدم التحضير التعليمي المطلوب.';
    return false;
  }
  if (step.force && currentClinicalForce() < step.force) {
    clinicalSimulationFeedback.textContent = 'قوة التطبيق الافتراضية أقل من نطاق التدريب لهذه الخطوة.';
    return false;
  }
  if (step.effect === 'irrigation' && !clinicalIrrigationInput?.checked) {
    clinicalSimulationFeedback.textContent = 'فعّل تدفق الري في لوحة محرك التلامس أولًا.';
    return false;
  }
  addProcedureVisual(step.effect);
  activeClinicalProcedureIndex += 1;
  const next = flow[activeClinicalProcedureIndex];
  document.getElementById('caries-stage-label').textContent = 'خطوة ' + activeClinicalProcedureIndex + ' / ' + flow.length;
  document.getElementById('caries-procedure-help').textContent = step.label + ' — سُجلت نتيجة بصرية على المجسم المحدد.';
  clinicalSimulationFeedback.textContent = next
    ? 'اكتملت: ' + step.label + '. الخطوة التالية: ' + (dentalInventory.find(item => item.id === next.tool)?.name || next.tool) + '.'
    : 'اكتمل المسار التفاعلي لهذه الحالة. التقييم النهائي تعليمي وليس شهادة كفاءة سريرية.';
  return true;
}
function updateCariesTrainingPanel(message) {
  const labels = {
    caries: 'الآفة موجودة', cavity: 'تمت إزالة الآفة', etched: 'تم التخريش', bonded: 'تم تطبيق اللاصق', 'ready-to-fill': 'جاهز لوضع الترميم',
    filled: 'تم وضع مادة الترميم', restored: 'اكتمل الترميم التعليمي'
  };
  const stage = document.getElementById('caries-stage-label');
  const help = document.getElementById('caries-procedure-help');
  if (stage) stage.textContent = labels[cariesTrainingStage] || 'حالة غير معروفة';
  if (help) help.textContent = message;
}
function resetCariesTrainingCase() {
  if (clinicalSurfaceReady) restoreDentalBooleanWear();
  if (clinicalSurfaceReady) resetClinicalContactState('أُعيدت حالة التسوس والتلامس إلى البداية.');
  cariesTrainingStage = 'caries';
  clinicalCariesLesion.setEnabled(true);
  clinicalCavity.setEnabled(false);
  clinicalRestoration.setEnabled(false);
  if (activeExperience === 'oral-exam') {
    getOralCariesOverlay(currentCariesTarget);
    updateOralCariesVisual();
    updateCariesTrainingPanel('ظهرت آفة تسوس افتراضية على السن FDI ' + currentCariesTarget + '. اختر القبضة عالية السرعة ثم اسحبها إلى السن لتنفيذ خطوة العرض.');
    return;
  }
  updateCariesTrainingPanel('ظهرت آفة تسوس إطباقية على الضرس التدريبي. اختر القبضة عالية السرعة لإزالة الآفة في النموذج.');
}
async function performClinicalAction() {
  const status = document.getElementById('treatment-interaction-status');
  const oralMode = activeExperience === 'oral-exam';
  if (activeExperience !== 'treatment' && !oralMode) {
    status.textContent = 'افتح وضع فحص الأسنان أو جلسة العلاج أولًا.';
    return;
  }
  if (!isPatientMouthOpen) {
    status.textContent = 'افتح الفم أولًا قبل تنفيذ الإجراء.';
    return;
  }
  if (!isPropAtMouth) {
    status.textContent = 'اسحب الأداة أو المادة إلى مربع العمل أولًا.';
    return;
  }
  const id = selectedInventoryItem.id;
  if (oralMode) {
    if (!clinicalSurface.targetMesh || !clinicalSurface.targetKey || clinicalSurface.contactSeconds < .2) {
      clinicalSimulationFeedback.textContent = 'لا يمكن تسجيل الخطوة دون تلامس فعلي مستمر مع سطح السن أو اللثة. اضغط واسحب الأداة على المجسم أولًا.';
      return;
    }
    if (clinicalSurface.targetKey.startsWith('tooth-') && clinicalSurface.targetKey !== 'tooth-' + currentCariesTarget) {
      clinicalSimulationFeedback.textContent = 'الأداة تلامس سنًا مختلفًا عن السن المستهدف. اختر السن الصحيح أو حدّث الهدف.';
      return;
    }
    const selectedScenario = document.getElementById('scenario-select')?.value || 'restoration';
    if (selectedScenario !== 'restoration') {
      performGuidedClinicalProcedure();
      return;
    }
    if (['high-speed','bur-kit'].includes(id) && clinicalSurface.depthMm < .04) {
      clinicalSimulationFeedback.textContent = 'لم يتم تسجيل إزالة سطحية بعد. أبقِ القبضة ملامسة للسن مع تحكم هادئ في السرعة والضغط.';
      return;
    }
  }
  if (['high-speed','bur-kit'].includes(id) && cariesTrainingStage === 'caries') {
    let booleanWearApplied = false;
    if (oralMode) {
      try {
        booleanWearApplied = await applyDentalBooleanWear();
      } catch (error) {
        console.warn('Boolean tooth preparation could not be applied; keep the contact mark fallback.', error);
      }
    }
    if (!oralMode) {
      clinicalCariesLesion.setEnabled(false);
      clinicalCavity.setEnabled(true);
    }
    cariesTrainingStage = 'cavity';
    updateOralCariesVisual();
    updateCariesTrainingPanel(booleanWearApplied
      ? 'تم طرح حجم القاطع من هندسة سطح السن ثلاثية الأبعاد، ثم تحديث مشهد التحضير. هذه عملية هندسية تعليمية وليست نموذج إزالة أنسجة سريريًا معايرًا.'
      : 'تعذر إجراء Boolean على هندسة هذا السن؛ بقي مؤشر التحضير المرئي بديلًا حتى لا تتوقف التجربة.');
    status.textContent = booleanWearApplied ? 'تم تعديل هندسة السن بعملية طرح ثلاثية الأبعاد.' : 'تم تسجيل أثر تحضير بديل على السن.';
    return;
  }
  if (id === 'etchant' && cariesTrainingStage === 'cavity') {
    cariesTrainingStage = 'etched';
    updateOralCariesVisual();
    updateCariesTrainingPanel('تم تسجيل خطوة التخريش التعليمية. راجع تعليمات المادة الفعلية وإرشادات المشرف قبل أي استخدام سريري.');
    status.textContent = 'تم تطبيق خطوة التخريش على الحالة الافتراضية.';
    return;
  }
  if (id === 'adhesive' && cariesTrainingStage === 'etched') {
    cariesTrainingStage = 'bonded';
    updateOralCariesVisual();
    updateCariesTrainingPanel('تم تسجيل خطوة تطبيق النظام اللاصق. لم تتم محاكاة التفاعل الكيميائي أو التصلب الحقيقي.');
    status.textContent = 'تم تطبيق خطوة اللاصق في النموذج التعليمي.';
    return;
  }
  if (id === 'composite-instrument' && cariesTrainingStage === 'bonded') {
    cariesTrainingStage = 'ready-to-fill';
    updateOralCariesVisual();
    updateCariesTrainingPanel('الأداة جاهزة لوضع مادة الترميم. اختر راتنج الكومبوزيت أو الزجاج الأيوني من المكتبة.');
    status.textContent = 'تم تجهيز أداة وضع مادة الترميم.';
    return;
  }
  if (['composite-resin','glass-ionomer'].includes(id) && ['bonded','ready-to-fill'].includes(cariesTrainingStage)) {
    if (!oralMode) clinicalRestoration.setEnabled(true);
    cariesTrainingStage = id === 'glass-ionomer' ? 'restored' : 'filled';
    updateOralCariesVisual();
    updateCariesTrainingPanel(id === 'glass-ionomer'
      ? 'اكتمل الترميم الافتراضي بمادة الزجاج الأيوني.'
      : 'وضعت كتلة كومبوزيت افتراضية. اختر مصباح التصلب لإكمال تسلسل العرض.');
    status.textContent = 'تم وضع مادة الترميم على السن المستهدف.';
    return;
  }
  if (id === 'curing-light' && cariesTrainingStage === 'filled') {
    if (!oralMode) clinicalCavity.setEnabled(false);
    cariesTrainingStage = 'restored';
    updateOralCariesVisual();
    updateCariesTrainingPanel('اكتمل تسلسل الترميم الافتراضي. الشكل النهائي تعليمي ولا يقيس الحواف أو الإطباق أو جودة الالتصاق.');
    status.textContent = 'اكتمل الترميم المرئي في الحالة الافتراضية.';
    return;
  }
  status.textContent = 'هذه الأداة لا تطابق الخطوة الحالية في سيناريو التسوس. راجع وصف الخطوة واختر العنصر المناسب.';
}
document.getElementById('apply-clinical-action')?.addEventListener('click', performClinicalAction);
document.getElementById('reset-caries-case')?.addEventListener('click', resetCariesTrainingCase);
resetCariesTrainingCase();

canvas.addEventListener('dragover', event => {
  if (!event.dataTransfer?.types.includes('application/x-dental-inventory')) return;
  event.preventDefault();
  canvas.classList.add('clinical-drop-active');
});
canvas.addEventListener('dragleave', () => canvas.classList.remove('clinical-drop-active'));
canvas.addEventListener('drop', event => {
  const id = event.dataTransfer?.getData('application/x-dental-inventory');
  if (!id) return;
  event.preventDefault();
  canvas.classList.remove('clinical-drop-active');
  const item = dentalInventory.find(entry => entry.id === id);
  if (!item) return;
  selectInventoryItem(item);
  if (activeExperience === 'oral-exam') {
    if (!isPatientMouthOpen) {
      document.getElementById('treatment-interaction-status').textContent = 'تم اختيار العنصر؛ افتح الفم أولًا ثم اسحبه مرة أخرى إلى مساحة العمل.';
      return;
    }
    moveSelectedOralInventoryToMouth(item);
    document.getElementById('treatment-interaction-status').textContent = 'تم سحب ' + item.name + ' إلى السن FDI ' + currentCariesTarget + '. اضغط تنفيذ الإجراء بالأداة / المادة المختارة.';
    return;
  }
  if (activeExperience !== 'treatment') {
    document.getElementById('treatment-interaction-status').textContent = 'تم اختيار العنصر. افتح وضع فحص الأسنان أو جلسة العلاج لإدخاله إلى الفم.';
    return;
  }
  if (!isPatientMouthOpen) {
    document.getElementById('treatment-interaction-status').textContent = 'تم اختيار العنصر؛ افتح الفم أولًا ثم اسحبه مرة أخرى إلى مساحة العمل.';
    return;
  }
  const prop = item.type === 'material' ? activeMaterialRoot : activeInstrumentRoot;
  prop.setEnabled(true);
  animateTreatmentNode(prop, new Vector3(-.05, 1.55, -.72), new Vector3(0, 0, -.22));
  isPropAtMouth = true;
  document.getElementById('treatment-interaction-status').textContent = 'تم سحب ' + item.name + ' إلى منطقة العمل. اضغط تنفيذ الإجراء بالأداة / المادة المختارة.';
});

function animateTreatmentNode(node, destination, rotation) {
  const positionAnimation = new Animation(
    'ChairsideToolPosition', 'position', 30,
    Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  const startPosition = node.position.clone();
  const arcMidpoint = Vector3.Lerp(startPosition, destination, 0.5).add(new Vector3(0, 0.28, 0));
  const startRotation = node.rotation.clone();
  const midRotation = Vector3.Lerp(startRotation, rotation, 0.5);
  positionAnimation.setKeys([
    { frame: 0, value: startPosition },
    { frame: 45, value: arcMidpoint },
    { frame: 90, value: destination.clone() }
  ]);
  const rotationAnimation = new Animation(
    'ChairsideToolRotation', 'rotation', 30,
    Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  rotationAnimation.setKeys([
    { frame: 0, value: startRotation },
    { frame: 45, value: midRotation },
    { frame: 90, value: rotation.clone() }
  ]);
  const ease = new CubicEase();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  positionAnimation.setEasingFunction(ease);
  rotationAnimation.setEasingFunction(ease);
  scene.beginDirectAnimation(node, [positionAnimation, rotationAnimation], 0, 90, false);
}
let isPatientMouthOpen = true;
let isPropAtMouth = false;

// Surface-contact simulation: tools only interact when a pointer ray actually intersects
// a registered tooth or gingival mesh. Pressure is an explicit educational input, not
// a sensor reading from real dental equipment.
const clinicalSurface = {
  dragging: false, pointerId: null, targetMesh: null, targetKey: null,
  contactPoint: null, contactNormal: null, contactSeconds: 0, contactTrace: [], activeStrokeKey: null,
  depthMm: 0, lastUiUpdate: 0, fluidAccumulator: 0, particles: [],
  surfaceMark: null, contactMarker: null, deformations: new Map(),
  lastMessageAt: 0
};
const clinicalForceInput = document.getElementById('clinical-force');
const clinicalSpeedInput = document.getElementById('clinical-speed');
const clinicalIrrigationInput = document.getElementById('clinical-irrigation');
const clinicalContactState = document.getElementById('clinical-contact-state');
const clinicalContactTime = document.getElementById('clinical-contact-time');
const clinicalDepth = document.getElementById('clinical-depth');
const clinicalFluidCount = document.getElementById('clinical-fluid-count');
const clinicalTissueState = document.getElementById('clinical-tissue-state');
const clinicalForceBar = document.getElementById('clinical-force-bar');
const clinicalSimulationFeedback = document.getElementById('clinical-simulation-feedback');
const clinicalForceValue = document.getElementById('clinical-force-value');
const clinicalSpeedValue = document.getElementById('clinical-speed-value');
const clinicalWaterMaterial = new StandardMaterial('ClinicalIrrigationWater', scene);
clinicalWaterMaterial.diffuseColor = new Color3(.22,.72,.92);
clinicalWaterMaterial.emissiveColor = new Color3(.05,.22,.34);
clinicalWaterMaterial.alpha = .72;
clinicalWaterMaterial.specularPower = 96;
const clinicalDebrisMaterial = new StandardMaterial('ClinicalDebrisMaterial', scene);
clinicalDebrisMaterial.diffuseColor = new Color3(.75,.68,.51);
clinicalDebrisMaterial.emissiveColor = new Color3(.10,.08,.04);
const clinicalCavityMaterial = new StandardMaterial('ClinicalCavityMaterial', scene);
clinicalCavityMaterial.diffuseColor = new Color3(.16,.09,.06);
clinicalCavityMaterial.emissiveColor = new Color3(.025,.012,.008);
const clinicalTissueMarkMaterial = new StandardMaterial('ClinicalTissueMark', scene);
clinicalTissueMarkMaterial.diffuseColor = new Color3(.82,.35,.43);
clinicalTissueMarkMaterial.emissiveColor = new Color3(.08,.015,.02);

function currentClinicalForce() {
  return Math.max(.1, Math.min(2, Number(clinicalForceInput?.value || .8)));
}
function currentClinicalSpeed() {
  return Math.max(0, Math.min(400000, Number(clinicalSpeedInput?.value || 180000)));
}
function updateClinicalControlLabels() {
  if (clinicalForceValue) clinicalForceValue.textContent = currentClinicalForce().toFixed(1) + ' N';
  if (clinicalSpeedValue) clinicalSpeedValue.textContent = Math.round(currentClinicalSpeed()).toLocaleString('en-US') + ' RPM';
}
clinicalForceInput?.addEventListener('input', updateClinicalControlLabels);
clinicalSpeedInput?.addEventListener('input', updateClinicalControlLabels);
updateClinicalControlLabels();

function clinicalMeshKey(mesh) {
  let node = mesh;
  while (node) {
    const key = node.metadata?.dentalScopeKey;
    if (key) return key;
    node = node.parent;
  }
  return null;
}
function isClinicalSurfaceMesh(mesh) {
  const key = clinicalMeshKey(mesh);
  return !!key && (/^tooth-\d{2}$/.test(key) || key.startsWith('gingiva-'));
}
function pickClinicalSurface(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * engine.getRenderWidth() / Math.max(rect.width, 1);
  const y = (event.clientY - rect.top) * engine.getRenderHeight() / Math.max(rect.height, 1);
  return scene.pick(x, y, isClinicalSurfaceMesh, false, camera);
}
function localPointForMesh(mesh, worldPoint) {
  mesh.computeWorldMatrix(true);
  const inverse = Matrix.Invert(mesh.getWorldMatrix());
  return Vector3.TransformCoordinates(worldPoint, inverse);
}
function ensureContactMarker(mesh) {
  if (clinicalSurface.contactMarker && clinicalSurface.contactMarker.parent !== mesh) {
    clinicalSurface.contactMarker.dispose();
    clinicalSurface.contactMarker = null;
  }
  if (!clinicalSurface.contactMarker) {
    clinicalSurface.contactMarker = MeshBuilder.CreateSphere('ClinicalSurfaceContactMarker', { diameter: .15, segments: 16 }, scene);
    clinicalSurface.contactMarker.material = clinicalCavityMaterial;
    clinicalSurface.contactMarker.isPickable = false;
  }
  clinicalSurface.contactMarker.parent = mesh;
  clinicalSurface.contactMarker.position.set(0,0,0);
  clinicalSurface.contactMarker.scaling.set(.5,.12,.5);
  clinicalSurface.contactMarker.setEnabled(true);
  return clinicalSurface.contactMarker;
}
function ensureSurfaceMark(mesh, point, kind) {
  if (clinicalSurface.surfaceMark && clinicalSurface.surfaceMark.parent !== mesh) {
    clinicalSurface.surfaceMark.dispose();
    clinicalSurface.surfaceMark = null;
  }
  if (!clinicalSurface.surfaceMark) {
    clinicalSurface.surfaceMark = MeshBuilder.CreateSphere('ClinicalDynamicSurfaceMark', { diameter: 1, segments: 20 }, scene);
    clinicalSurface.surfaceMark.isPickable = false;
  }
  const mark = clinicalSurface.surfaceMark;
  mark.parent = mesh;
  mark.position.copyFrom(localPointForMesh(mesh, point));
  mark.material = kind === 'soft-tissue' ? clinicalTissueMarkMaterial
    : kind === 'debridement' ? clinicalDebrisMaterial : clinicalCavityMaterial;
  mark.setEnabled(true);
  mark.scaling.set(.045,.012,.045);
  return mark;
}
function deformGingivaMesh(mesh, worldPoint, force) {
  if (!mesh || !clinicalMeshKey(mesh)?.startsWith('gingiva-')) return;
  try {
    let record = clinicalSurface.deformations.get(mesh);
    if (!record) {
      const original = mesh.getVerticesData(VertexBuffer.PositionKind);
      if (!original || original.length > 240000) return;
      mesh.makeGeometryUnique();
      mesh.setVerticesData(VertexBuffer.PositionKind, original, true, false);
      record = { original: new Float32Array(original), strength: 0, point: Vector3.Zero(), normal: Vector3.Up(), lastUpdate: 0 };
      clinicalSurface.deformations.set(mesh, record);
    }
    record.point.copyFrom(localPointForMesh(mesh, worldPoint));
    const normalWorld = clinicalSurface.contactNormal || Vector3.Up();
    const inverse = Matrix.Invert(mesh.getWorldMatrix());
    record.normal.copyFrom(Vector3.TransformNormal(normalWorld, inverse).normalize());
    record.strength = Math.min(.16, force * .055);
    record.lastUpdate = performance.now();
    const deformed = new Float32Array(record.original);
    const radius = .48;
    for (let i = 0; i < deformed.length; i += 3) {
      const dx = record.original[i] - record.point.x;
      const dy = record.original[i+1] - record.point.y;
      const dz = record.original[i+2] - record.point.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (distance >= radius) continue;
      const falloff = Math.pow(1 - distance/radius, 2);
      const amount = record.strength * falloff;
      deformed[i] += record.normal.x * amount;
      deformed[i+1] += record.normal.y * amount;
      deformed[i+2] += record.normal.z * amount;
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind, deformed, false, false);
  } catch (error) {
    console.debug('Localized gingival deformation skipped for this mesh.', error);
  }
}
function spawnClinicalFluid(point, normal, count = 2) {
  for (let i = 0; i < count; i++) {
    if (clinicalSurface.particles.length >= 70) {
      const old = clinicalSurface.particles.shift();
      old.mesh.dispose();
    }
    const drop = MeshBuilder.CreateSphere('ClinicalFluidParticle', { diameter: .055, segments: 6 }, scene);
    drop.material = clinicalWaterMaterial;
    drop.position.copyFrom(point).addInPlace(normal.scale(-.04));
    drop.isPickable = false;
    const spread = (i - (count - 1) / 2) * .16;
    clinicalSurface.particles.push({
      mesh: drop,
      velocity: normal.scale(-1.1).add(new Vector3(spread, -.4, -spread)).scale(.7),
      age: 0
    });
  }
}
function disposeClinicalParticles() {
  for (const particle of clinicalSurface.particles) particle.mesh.dispose();
  clinicalSurface.particles.length = 0;
  clinicalFluidCount.textContent = '0';
}
function updateClinicalSurfaceFromPick(pick) {
  if (!pick?.hit || !pick.pickedMesh || !isClinicalSurfaceMesh(pick.pickedMesh)) return false;
  const mesh = pick.pickedMesh;
  const key = clinicalMeshKey(mesh);
  const point = pick.pickedPoint.clone();
  const normal = pick.getNormal(true)?.normalize() || Vector3.Up();
  if (clinicalSurface.activeStrokeKey && clinicalSurface.activeStrokeKey !== key) return false;
  if (clinicalSurface.targetKey && clinicalSurface.targetKey !== key) {
    clinicalSurface.contactTrace = [];
    clinicalSurface.contactSeconds = 0;
  }
  clinicalSurface.targetMesh = mesh;
  clinicalSurface.targetKey = key;
  clinicalSurface.contactPoint = point;
  clinicalSurface.contactNormal = normal;
  const previous = clinicalSurface.contactTrace[clinicalSurface.contactTrace.length - 1];
  if (!previous || Vector3.DistanceSquared(previous.point, point) > .035 * .035) {
    clinicalSurface.contactTrace.push({ point:point.clone(), normal:normal.clone(), key });
    if (clinicalSurface.contactTrace.length > 18) clinicalSurface.contactTrace.splice(1, 1);
  }
  ensureContactMarker(mesh).position.copyFrom(localPointForMesh(mesh, point));
  const tool = selectedOralInventoryRoot;
  if (tool) {
    tool.setEnabled(true);
    tool.position.copyFrom(point.add(normal.scale(.78)));
    tool.rotation.set(Math.PI / 2, 0, 0);
  }
  isPropAtMouth = true;
  canvas.classList.add('clinical-contact-armed');
  clinicalContactState.textContent = 'ملامسة ' + (key.startsWith('tooth-') ? 'السن FDI ' + key.slice(-2) : 'اللثة');
  clinicalSimulationFeedback.textContent = 'تم اكتشاف تقاطع شعاع المؤشر مع سطح تشريحي فعلي. استمر بالسحب لرسم مسار تلامس الأداة.';
  return true;
}
function resetClinicalContactState(message = 'تمت إعادة ضبط محرك التلامس.') {
  clinicalSurface.dragging = false;
  clinicalSurface.pointerId = null;
  clinicalSurface.targetMesh = null;
  clinicalSurface.targetKey = null;
  clinicalSurface.contactPoint = null;
  clinicalSurface.contactNormal = null;
  clinicalSurface.contactSeconds = 0;
  clinicalSurface.contactTrace = [];
  clinicalSurface.activeStrokeKey = null;
  clinicalSurface.depthMm = 0;
  clinicalSurface.fluidAccumulator = 0;
  if (clinicalSurface.contactMarker) clinicalSurface.contactMarker.setEnabled(false);
  if (clinicalSurface.surfaceMark) clinicalSurface.surfaceMark.setEnabled(false);
  for (const [mesh, record] of clinicalSurface.deformations) {
    try { mesh.updateVerticesData(VertexBuffer.PositionKind, new Float32Array(record.original), false, false); } catch {}
  }
  clinicalSurface.deformations.clear();
  disposeClinicalParticles();
  clinicalContactState.textContent = 'لا يوجد تلامس';
  clinicalContactTime.textContent = '0.00 s';
  clinicalDepth.textContent = '0.00 mm';
  clinicalTissueState.textContent = 'مستقرة';
  clinicalForceBar.style.width = '0%';
  clinicalSimulationFeedback.textContent = message;
  canvas.classList.remove('clinical-contact-dragging');
}
function updateClinicalTelemetry(force, dt) {
  const contact = clinicalSurface.dragging && clinicalSurface.targetMesh && clinicalSurface.contactPoint;
  const id = selectedInventoryItem?.id || '';
  const key = clinicalSurface.targetKey || '';
  if (contact) {
    clinicalSurface.contactSeconds += dt;
    const rotary = ['high-speed','low-speed','bur-kit'].includes(id);
    const debriding = ['ultrasonic-scaler','gracey-curette','curette','periotome'].includes(id);
    const endodontic = ['endo-files','endo-spreader'].includes(id);
    const pressureScale = force / 2;
    if (rotary && currentClinicalSpeed() > 0 && key.startsWith('tooth-')) {
      const speedScale = currentClinicalSpeed() / 400000;
      clinicalSurface.depthMm = Math.min(2.4, clinicalSurface.depthMm + dt * .74 * speedScale * pressureScale);
      const mark = ensureSurfaceMark(clinicalSurface.targetMesh, clinicalSurface.contactPoint, 'cut');
      const radius = .04 + clinicalSurface.depthMm * .12;
      mark.scaling.set(radius, .012 + clinicalSurface.depthMm * .006, radius);
      clinicalTissueState.textContent = clinicalSurface.depthMm > 1.6 ? 'تحذير: عمق مرتفع' : 'إزالة سطحية';
    } else if (debriding && (key.startsWith('tooth-') || key.startsWith('gingiva-'))) {
      clinicalSurface.depthMm = Math.min(1.1, clinicalSurface.depthMm + dt * .25 * pressureScale);
      const mark = ensureSurfaceMark(clinicalSurface.targetMesh, clinicalSurface.contactPoint, 'debridement');
      const radius = .045 + clinicalSurface.depthMm * .1;
      mark.scaling.set(radius, .014, radius);
      if (key.startsWith('gingiva-')) deformGingivaMesh(clinicalSurface.targetMesh, clinicalSurface.contactPoint, force);
      clinicalTissueState.textContent = 'إزالة ترسبات تعليمية';
    } else if (endodontic && key.startsWith('tooth-')) {
      clinicalSurface.depthMm = Math.min(8, clinicalSurface.depthMm + dt * .42 * pressureScale);
      const mark = ensureSurfaceMark(clinicalSurface.targetMesh, clinicalSurface.contactPoint, 'cut');
      mark.scaling.set(.035, .02 + clinicalSurface.depthMm*.002, .035);
      clinicalTissueState.textContent = 'تقدم داخل نموذج القناة';
    } else if (key.startsWith('gingiva-')) {
      deformGingivaMesh(clinicalSurface.targetMesh, clinicalSurface.contactPoint, force);
      clinicalTissueState.textContent = force > 1.4 ? 'انضغاط مرتفع' : 'تشوه مرن موضعي';
    } else {
      clinicalTissueState.textContent = 'تماس سطحي';
    }
    const irrigationTool = ['air-water','endo-irrigation'].includes(id);
    if (clinicalIrrigationInput?.checked && irrigationTool) {
      clinicalSurface.fluidAccumulator += dt;
      while (clinicalSurface.fluidAccumulator > .075) {
        clinicalSurface.fluidAccumulator -= .075;
        spawnClinicalFluid(clinicalSurface.contactPoint, clinicalSurface.contactNormal, 2);
      }
    }
    const suctionTool = ['saliva-ejector','high-volume-suction'].includes(id);
    if (suctionTool && clinicalSurface.particles.length) {
      const suctionPoint = selectedOralInventoryRoot?.position || clinicalSurface.contactPoint;
      for (const particle of clinicalSurface.particles) {
        const delta = suctionPoint.subtract(particle.mesh.position);
        if (delta.length() > .02) particle.velocity.addInPlace(delta.normalize().scale(dt * 3.2));
      }
    }
    if (rotary && selectedOralInventoryRoot) {
      const spin = Math.min(45, currentClinicalSpeed() / 400000 * 45);
      const bur = selectedOralInventoryRoot.getChildMeshes().find(mesh => mesh.name.includes('RotaryBur'));
      if (bur) bur.rotation.z += dt * spin * 14;
    }
  } else if (clinicalSurface.deformations.size) {
    clinicalTissueState.textContent = 'استعادة مرونة الأنسجة';
  }
  clinicalForceBar.style.width = (contact ? Math.min(100, force / 2 * 100) : 0) + '%';
  clinicalContactTime.textContent = clinicalSurface.contactSeconds.toFixed(2) + ' s';
  clinicalDepth.textContent = clinicalSurface.depthMm.toFixed(2) + ' mm';
  clinicalFluidCount.textContent = String(clinicalSurface.particles.length);
  const now = performance.now();
  if (now - clinicalSurface.lastUiUpdate > 90) {
    clinicalSurface.lastUiUpdate = now;
    if (contact) clinicalContactState.textContent = 'تلامس فعلي · ' + key;
    else if (!clinicalSurface.dragging) clinicalContactState.textContent = 'لا يوجد تلامس مستمر';
  }
}
function updateClinicalParticles(dt) {
  const suction = ['saliva-ejector','high-volume-suction'].includes(selectedInventoryItem?.id) &&
    clinicalSurface.dragging && clinicalSurface.contactPoint;
  for (let i = clinicalSurface.particles.length - 1; i >= 0; i--) {
    const particle = clinicalSurface.particles[i];
    particle.age += dt;
    particle.velocity.y -= dt * 1.25;
    particle.mesh.position.addInPlace(particle.velocity.scale(dt));
    if (suction && selectedOralInventoryRoot) {
      const toward = selectedOralInventoryRoot.position.subtract(particle.mesh.position);
      if (toward.length() < .16) particle.age = 5;
    }
    if (particle.age > 2.3 || particle.mesh.position.y < -5) {
      particle.mesh.dispose();
      clinicalSurface.particles.splice(i, 1);
    }
  }
}
function restoreSoftTissue(dt) {
  if (clinicalSurface.dragging) return;
  for (const [mesh, record] of clinicalSurface.deformations) {
    record.strength *= Math.exp(-dt * 4.5);
    if (record.strength < .003) {
      try { mesh.updateVerticesData(VertexBuffer.PositionKind, new Float32Array(record.original), false, false); } catch {}
      clinicalSurface.deformations.delete(mesh);
      continue;
    }
    try {
      const deformed = new Float32Array(record.original);
      const radius = .48;
      for (let i=0;i<deformed.length;i+=3) {
        const dx=record.original[i]-record.point.x, dy=record.original[i+1]-record.point.y, dz=record.original[i+2]-record.point.z;
        const distance=Math.sqrt(dx*dx+dy*dy+dz*dz);
        if(distance>=radius)continue;
        const amount=record.strength*Math.pow(1-distance/radius,2);
        deformed[i]+=record.normal.x*amount;deformed[i+1]+=record.normal.y*amount;deformed[i+2]+=record.normal.z*amount;
      }
      mesh.updateVerticesData(VertexBuffer.PositionKind,deformed,false,false);
    } catch {}
  }
}
canvas.addEventListener('pointerdown', event => {
  if (activeExperience !== 'oral-exam' || !isPropAtMouth || !selectedOralInventoryRoot) return;
  const pick = pickClinicalSurface(event);
  if (!pick?.hit || !updateClinicalSurfaceFromPick(pick)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  clinicalSurface.dragging = true;
  clinicalSurface.pointerId = event.pointerId;
  clinicalSurface.contactSeconds = 0;
  clinicalSurface.contactTrace = [];
  clinicalSurface.activeStrokeKey = clinicalSurface.targetKey;
  canvas.classList.add('clinical-contact-dragging');
  try { canvas.setPointerCapture(event.pointerId); } catch {}
}, true);
canvas.addEventListener('pointermove', event => {
  if (!clinicalSurface.dragging || event.pointerId !== clinicalSurface.pointerId) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const pick = pickClinicalSurface(event);
  if (pick?.hit && updateClinicalSurfaceFromPick(pick)) {
    clinicalSurface.dragging = true;
    clinicalSurface.pointerId = event.pointerId;
  } else {
    clinicalSurface.targetMesh = null;
    clinicalSurface.targetKey = null;
    clinicalSurface.contactPoint = null;
  }
}, true);
function endClinicalPointerDrag(event) {
  if (!clinicalSurface.dragging || event.pointerId !== clinicalSurface.pointerId) return;
  clinicalSurface.dragging = false;
  clinicalSurface.pointerId = null;
  clinicalSurface.activeStrokeKey = null;
  canvas.classList.remove('clinical-contact-dragging');
  clinicalSimulationFeedback.textContent = clinicalSurface.contactSeconds > .1
    ? 'تم تسجيل تلامس السطح. راجع زمن التلامس والعمق قبل تنفيذ الخطوة.'
    : 'كان التلامس أقصر من اللازم؛ حرّك الأداة على السطح مدة أطول.';
}
canvas.addEventListener('pointerup', endClinicalPointerDrag, true);
canvas.addEventListener('pointercancel', endClinicalPointerDrag, true);
canvas.addEventListener('lostpointercapture', endClinicalPointerDrag, true);
scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(.05, Math.max(.001, engine.getDeltaTime() / 1000));
  updateClinicalTelemetry(currentClinicalForce(), dt);
  updateClinicalParticles(dt);
  restoreSoftTissue(dt);
});
document.getElementById('clinical-reset-physics')?.addEventListener('click', () => {
  resetClinicalContactState();
});
clinicalSurfaceReady = true;
document.getElementById('tool-to-mouth')?.addEventListener('click', () => {
  if (activeExperience !== 'treatment' && activeExperience !== 'oral-exam') {
    document.getElementById('treatment-interaction-status').textContent = 'افتح وضع فحص الأسنان أو جلسة العلاج أولًا.';
    return;
  }
  if (!isPatientMouthOpen) {
    document.getElementById('treatment-interaction-status').textContent = 'افتح فم المريض أولًا قبل إدخال الأداة.';
    return;
  }
  if (activeExperience === 'oral-exam') {
    if (moveSelectedOralInventoryToMouth()) {
      document.getElementById('treatment-interaction-status').textContent =
        'تتحرك ' + selectedInventoryItem.name + ' نحو السن FDI ' + currentCariesTarget + '. اضغط تنفيذ الإجراء لتطبيق خطوة التدريب.';
    }
    return;
  }
  const prop = selectedInventoryItem.type === 'material' ? activeMaterialRoot : activeInstrumentRoot;
  prop.setEnabled(true);
  animateTreatmentNode(prop, new Vector3(-.05, 1.55, -.72), new Vector3(0, 0, -.22));
  isPropAtMouth = true;
  document.getElementById('treatment-interaction-status').textContent =
    'تتحرك ' + selectedInventoryItem.name + ' إلى موضع العمل بسرعة هادئة. الحركة تعليمية ولا تحاكي القوة أو مسارًا سريريًا حقيقيًا.';
});
document.getElementById('tool-to-tray')?.addEventListener('click', () => {
  if (activeExperience === 'oral-exam') {
    returnSelectedOralInventoryToTray();
    document.getElementById('treatment-interaction-status').textContent = 'تم إرجاع ' + selectedInventoryItem.name + ' إلى الصينية ثلاثية الأبعاد.';
    return;
  }
  const prop = selectedInventoryItem.type === 'material' ? activeMaterialRoot : activeInstrumentRoot;
  animateTreatmentNode(prop, new Vector3(-1.58, 1.08, 1.12), new Vector3(0, 0, 0));
  isPropAtMouth = false;
  document.getElementById('treatment-interaction-status').textContent = 'تم إرجاع ' + selectedInventoryItem.name + ' إلى صينية العمل.';
});
document.getElementById('patient-mouth-toggle')?.addEventListener('click', () => {
  if (activeExperience !== 'oral-exam' && activeExperience !== 'dental-scope' && activeExperience !== 'treatment') {
    document.getElementById('treatment-interaction-status').textContent = 'افتح وضع فحص الأسنان أو جلسة العلاج للتحكم في الفك.';
    return;
  }
  if (isPatientMouthOpen && isPropAtMouth) {
    document.getElementById('treatment-interaction-status').textContent = 'أعد الأداة إلى الصينية قبل إغلاق الفم.';
    return;
  }
  isPatientMouthOpen = !isPatientMouthOpen;
  if (activeExperience === 'oral-exam' || activeExperience === 'dental-scope') {
    setDentalJawOpen(isPatientMouthOpen);
  } else {
    const animation = new Animation('PatientJawOpenClose', 'rotation.x', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
    animation.setKeys([
      { frame: 0, value: patientJawPivot.rotation.x },
      { frame: 54, value: isPatientMouthOpen ? .24 : 0 }
    ]);
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    animation.setEasingFunction(ease);
    scene.beginDirectAnimation(patientJawPivot, [animation], 0, 54, false);
  }
  document.getElementById('patient-mouth-toggle').textContent = isPatientMouthOpen ? 'إغلاق الفم' : 'فتح الفم';
  document.getElementById('apply-clinical-action').disabled = !isPatientMouthOpen;
  document.getElementById('treatment-interaction-status').textContent = isPatientMouthOpen ? 'تم فتح الفم.' : 'تم إغلاق الفم.';
});

// Online AI via OpenRouter (Bring Your Own Key) plus optional local providers.
const aiEndpointInput = document.getElementById('ai-endpoint');
const aiProviderSelect = document.getElementById('ai-provider');
const aiModelSelect = document.getElementById('ai-model');
const aiStatus = document.getElementById('ai-status');
const aiMessages = document.getElementById('ai-messages');
const aiForm = document.getElementById('ai-form');
const aiQuestion = document.getElementById('ai-question');
const aiApiKeyInput = document.getElementById('ai-api-key');
const aiOnlineSettings = document.getElementById('ai-online-settings');
const aiLocalSettings = document.getElementById('ai-local-settings');
const aiClearKeyButton = document.getElementById('ai-clear-key');
const aiConversation = [];
const aiOpenRouterBase = 'https://openrouter.ai/api/v1';
let aiApiKey = '';
let aiFreeModels = [];
const aiClinicalContext = [
  'Use these official clinical reference entry points as the preferred sources. Do not invent quotations, doses, or guideline recommendations.',
  'SDCEP Management of Acute Dental Problems, 2nd edition (March 2026), updated support tools announced 30 September 2026: https://www.acutedentalproblems.sdcep.org.uk/ ; covers pain, swelling, bleeding, trauma, ulceration and urgency/referral.',
  'SDCEP Drug Prescribing for Dentistry: https://www.sdcepdentalprescribing.nhs.scot/ ; website notes update to BNF 92 / BNFC 2026-27 and bacterial-infections section updated May 2026. This is UK guidance and is not automatically the local Egyptian formulary.',
  'ADA Caries Management Clinical Practice Guidelines: https://www.ada.org/resources/research/science/evidence-based-dental-research/caries-management-clinical-practice-guidelines ; restorative guideline published 2023 and non-restorative guideline published 2018.',
  'AAE Clinical Guidelines and Position Statements: https://www.aae.org/specialty/clinical-resources/guidelines-position-statements/ ; includes vital pulp therapy and endodontic resources.',
  'EFP Stage I-III Periodontitis Guideline: https://www.efp.org/education/continuing-education/clinical-guidelines/guideline-on-treatment-of-stage-i-iii-periodontitis/ ; evidence-based guideline published 2020.',
  'IADT Dental Trauma Guidelines: https://iadt-dentaltrauma.org/guidelines-and-resources/guidelines/ ; 2020 guidelines cover fractures/luxations, avulsion of permanent teeth and injuries in primary dentition.',
  'AAPD Reference Manual 2026-2027: https://www.aapd.org/research/oral-health-policies--recommendations/ ; includes clinical practice guidelines and best practices for pediatric dentistry.',
  'AAPD Pulp Therapy for Primary and Immature Permanent Teeth, latest revision 2026: https://www.aapd.org/research/oral-health-policies--recommendations/pulp-therapy-for-primary-and-immature-permanent-teeth/ .',
  'AAPD Caries-risk Assessment and Management for Infants, Children, and Adolescents: https://www.aapd.org/research/oral-health-policies--recommendations/caries-risk-assessment-and-management-for-infants-children-and-adolescents/ ; latest revision 2022.',
  'AAPD Behavior Guidance for the Pediatric Dental Patient: https://www.aapd.org/research/oral-health-policies--recommendations/behavior-guidance-for-the-pediatric-dental-patient/ ; latest revision 2024.',
  'FDA Clinical Decision Support overview: https://www.fda.gov/medical-devices/digital-health-center-excellence/step-6-software-function-intended-provide-clinical-decision-support ; emphasizes clinician ability to independently review the basis of recommendations.'
].join('\n');

function addAiMessage(role, message) {
  if (!aiMessages) return;
  const bubble = document.createElement('div');
  bubble.className = 'ai-message ' + role;
  bubble.textContent = String(message);
  aiMessages.appendChild(bubble);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}
function normalizeAiEndpoint() {
  return (aiEndpointInput?.value || 'http://localhost:11434').trim().replace(/\/+$/, '');
}
function isOpenRouterProvider() {
  return aiProviderSelect?.value === 'openrouter';
}
function isPallProvider() {
  return aiProviderSelect?.value === 'openai-compatible';
}
function makeAiOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}
function configureAiProvider() {
  if (!aiModelSelect) return;
  const online = isOpenRouterProvider();
  const pall = isPallProvider();
  aiModelSelect.replaceChildren();
  if (online) {
    aiModelSelect.appendChild(makeAiOption('openrouter/free', 'الموجّه المجاني — يختار نموذجًا متاحًا تلقائيًا'));
    for (const model of aiFreeModels) {
      if (model.id === 'openrouter/free') continue;
      aiModelSelect.appendChild(makeAiOption(model.id, (model.name || model.id) + ' — مجاني'));
    }
    if (aiEndpointInput) aiEndpointInput.value = aiOpenRouterBase;
    if (aiOnlineSettings) aiOnlineSettings.hidden = false;
    if (aiLocalSettings) aiLocalSettings.hidden = true;
    if (aiClearKeyButton) aiClearKeyButton.hidden = false;
    if (aiStatus) aiStatus.textContent = aiApiKey ? 'المفتاح موجود في هذه الجلسة — اختبر الاتصال' : 'أدخل مفتاح OpenRouter للاتصال';
  } else {
    aiModelSelect.replaceChildren();
    const models = pall
      ? [['Harisundar/PALL-Text', 'PALL-Text 8B — تخصص سني، إنجليزي']]
      : [
          ['qwen3.5:4b', 'Qwen3.5 4B — مناسب كبداية'],
          ['qwen3.5:9b', 'Qwen3.5 9B — يحتاج ذاكرة أكبر'],
          ['qwen3.5:27b', 'Qwen3.5 27B — جهاز قوي']
        ];
    for (const [value, label] of models) aiModelSelect.appendChild(makeAiOption(value, label));
    if (aiEndpointInput) aiEndpointInput.value = pall ? 'http://localhost:8000' : 'http://localhost:11434';
    if (aiOnlineSettings) aiOnlineSettings.hidden = true;
    if (aiLocalSettings) aiLocalSettings.hidden = false;
    if (aiClearKeyButton) aiClearKeyButton.hidden = true;
    if (aiStatus) aiStatus.textContent = pall ? 'يتطلب تشغيل PALL-Text عبر vLLM' : 'يتطلب تشغيل Ollama على هذا الجهاز';
  }
  const endpointLabel = document.querySelector('label[for="ai-endpoint"]');
  if (endpointLabel) endpointLabel.textContent = pall ? 'عنوان خادم vLLM' : 'عنوان خادم Ollama';
  aiStatus?.classList.remove('good','bad');
}
aiProviderSelect?.addEventListener('change', configureAiProvider);
aiApiKeyInput?.addEventListener('input', () => { aiApiKey = aiApiKeyInput.value.trim(); });
window.addEventListener('pagehide', () => {
  aiApiKey = '';
  if (aiApiKeyInput) aiApiKeyInput.value = '';
});
aiClearKeyButton?.addEventListener('click', () => {
  aiApiKey = '';
  if (aiApiKeyInput) aiApiKeyInput.value = '';
  aiStatus.textContent = 'تم مسح المفتاح من ذاكرة الصفحة';
  aiStatus.classList.remove('good','bad');
});

async function readAiResponse(response) {
  let payload = {};
  try { payload = await response.json(); } catch { /* handled below */ }
  if (!response.ok) {
    const detail = payload?.error?.message || payload?.error || payload?.message || ('HTTP ' + response.status);
    throw new Error(String(detail));
  }
  return payload;
}
async function testAiConnection() {
  aiStatus.textContent = 'جارٍ اختبار الاتصال…';
  aiStatus.classList.remove('good','bad');
  try {
    if (isOpenRouterProvider()) {
      if (!aiApiKey) throw new Error('أدخل مفتاح OpenRouter في الحقل المخصص أولًا.');
      const response = await fetch(aiOpenRouterBase + '/models', {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + aiApiKey },
        cache: 'no-store',
        signal: AbortSignal.timeout(25000)
      });
      const payload = await readAiResponse(response);
      const models = Array.isArray(payload.data) ? payload.data : [];
      aiFreeModels = models.filter(model => {
        const id = String(model.id || '');
        const output = model.architecture?.output_modalities;
        return id.endsWith(':free') && (!Array.isArray(output) || output.includes('text'));
      }).sort((a,b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
      const selectedModel = aiModelSelect.value;
      configureAiProvider();
      if ([...aiModelSelect.options].some(option => option.value === selectedModel)) aiModelSelect.value = selectedModel;
      aiStatus.textContent = 'متصل بالإنترنت · ' + aiFreeModels.length + ' نموذجًا مجانيًا ظاهرًا';
      aiStatus.classList.add('good');
      addAiMessage('assistant', 'نجح الاتصال السحابي. يمكنك استخدام الموجّه المجاني أو اختيار نموذج مجاني بعينه من القائمة. التوافر والحدود قد تتغير لدى مزود النماذج.');
      return true;
    }
    if (isPallProvider()) {
      const response = await fetch(normalizeAiEndpoint() + '/v1/models', { signal: AbortSignal.timeout(15000) });
      const payload = await readAiResponse(response);
      const models = Array.isArray(payload.data) ? payload.data : [];
      const requested = aiModelSelect.value;
      const installed = models.some(model => model.id === requested || String(model.id || '').toLowerCase().includes('pall'));
      if (!installed) throw new Error('الخادم متصل لكن PALL-Text غير ظاهر في /v1/models.');
    } else {
      const response = await fetch(normalizeAiEndpoint() + '/api/tags', { signal: AbortSignal.timeout(15000) });
      const payload = await readAiResponse(response);
      const models = Array.isArray(payload.models) ? payload.models : [];
      const requested = aiModelSelect.value;
      const installed = models.some(model => model.name === requested || model.name.startsWith(requested + ':') || requested.startsWith(model.name.split(':')[0] + ':'));
      if (!installed) throw new Error('خادم Ollama متصل لكن النموذج ' + requested + ' غير محمّل.');
    }
    aiStatus.textContent = 'متصل · النموذج جاهز';
    aiStatus.classList.add('good');
    return true;
  } catch (error) {
    aiStatus.textContent = 'تعذر الاتصال';
    aiStatus.classList.add('bad');
    addAiMessage('assistant', 'فشل اختبار الاتصال: ' + error.message + (isOpenRouterProvider() ? ' تأكد من صحة مفتاح OpenRouter واتصال الإنترنت.' : ' تأكد من تشغيل الخادم المحلي وإعداد CORS.'));
    return false;
  }
}
document.getElementById('ai-connect')?.addEventListener('click', () => void testAiConnection());

function extractAiText(payload, provider) {
  if (provider === 'ollama') return payload.message?.content || '';
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(part => part?.text || '').join('\n');
  return '';
}

aiForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const question = (aiQuestion?.value || '').trim();
  if (!question) return;
  if (isOpenRouterProvider() && !aiApiKey) {
    addAiMessage('assistant', 'قبل إرسال السؤال، أدخل مفتاح OpenRouter ثم اختبر الاتصال. المفتاح لا يُحفظ على المنصة.');
    return;
  }
  const model = aiModelSelect.value;
  addAiMessage('user', question);
  aiQuestion.value = '';
  const submitButton = document.getElementById('ai-send');
  submitButton.disabled = true;
  aiStatus.textContent = isOpenRouterProvider() ? 'جارٍ إرسال السؤال عبر الإنترنت…' : 'يفكر النموذج المحلي…';
  aiStatus.classList.remove('good','bad');
  aiConversation.push({ role: 'user', content: question });
  const languageInstruction = isPallProvider()
    ? 'PALL-Text is English-first. Answer technical questions in clear English by default. If the user asks in Arabic, answer in Arabic only when confident and retain standard English dental terms in parentheses.'
    : 'Answer in clear Arabic by default unless the user requests another language.';
  const systemPrompt = [
    'You are a careful dental education tutor for dental students, interns and licensed dental professionals.',
    languageInstruction + ' Teach concepts step by step, explain the reason for each stage, instruments, material selection, anatomy, alternatives and common mistakes. Prefer headings and short structured explanations.',
    'This application is an educational simulator, not a clinical decision system. Never diagnose a real patient or write patient-specific prescriptions. Do not provide drug doses, anesthesia doses, or invasive procedural directions for unsupervised use.',
    'For urgent symptoms, advise immediate assessment through the local emergency pathway; never delay emergency care for an AI response.',
    'Use the reference index below as starting points. Separate guideline facts from general explanation, name the organization and publication/revision date when known, and link only sources listed below. Never fabricate a citation, recommendation, quotation or guideline update.',
    'If evidence is insufficient or guidelines differ by jurisdiction, state that and tell the learner to verify current Egyptian law, local formulary, institutional policy and their clinical supervisor. UK SDCEP and US AAPD guidance are not automatically Egyptian rules.',
    'Mention uncertainty and limitations, especially for anatomy variants, medicines, radiology, trauma and surgery. Encourage the learner to ask a supervisor before patient care.',
    'Never request or retain patient identifiers, photos or identifiable clinical records. Do not claim clinical validation or replace a supervisor.',
    'Reference index:\n' + aiClinicalContext
  ].join('\n\n');
  try {
    const messages = [{ role: 'system', content: systemPrompt }, ...aiConversation.slice(-10)];
    const provider = aiProviderSelect.value;
    const endpoint = provider === 'openrouter'
      ? aiOpenRouterBase + '/chat/completions'
      : (isPallProvider() ? normalizeAiEndpoint() + '/v1/chat/completions' : normalizeAiEndpoint() + '/api/chat');
    const requestBody = provider === 'openrouter' || isPallProvider()
      ? { model, messages, stream: false, temperature: 0.2, max_tokens: 1100 }
      : { model, messages, stream: false, options: { temperature: 0.25, num_ctx: 8192, num_predict: 1100 } };
    const headers = { 'Content-Type': 'application/json' };
    if (provider === 'openrouter') {
      headers.Authorization = 'Bearer ' + aiApiKey;
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-OpenRouter-Title'] = 'Dental Simulation';
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(90000)
    });
    const payload = await readAiResponse(response);
    const answer = extractAiText(payload, provider === 'ollama' ? 'ollama' : 'openai-compatible');
    if (!answer.trim()) throw new Error('لم يرجع مزود الذكاء الاصطناعي إجابة نصية.');
    aiConversation.push({ role: 'assistant', content: answer });
    addAiMessage('assistant', answer);
    aiStatus.textContent = provider === 'openrouter' ? 'تم الرد من النموذج السحابي' : 'تم الرد من النموذج المحلي';
    aiStatus.classList.add('good');
  } catch (error) {
    aiConversation.pop();
    let note = error.message;
    if (String(note).includes('402')) note += ' قد تكون الحصة المجانية أو رصيد الحساب قد انتهى.';
    if (String(note).includes('429')) note += ' تجاوزت الحد المؤقت للطلبات؛ انتظر قليلًا أو اختر نموذجًا مجانيًا آخر.';
    if (String(note).includes('401')) note += ' المفتاح غير صحيح أو لم يعد صالحًا.';
    addAiMessage('assistant', 'تعذر الحصول على الإجابة. ' + note + ' لا تستخدم النظام بديلًا عن الأدلة السريرية أو المشرف.');
    aiStatus.textContent = 'فشل الطلب';
    aiStatus.classList.add('bad');
  } finally {
    submitButton.disabled = false;
  }
});

configureAiProvider();
updateCaseView();
setAssetStatus('المشهد البديل جاهز. جارٍ تحميل مكتبة العيادة والتشريح…');
setTimeout(() => showOralExamExperience(), 50);

document.getElementById('mesh-count').textContent=String(scene.meshes.length);
const isCompactDevice = window.matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 4) <= 4;
engine.setHardwareScalingLevel(isCompactDevice ? 1.3 : 1.0);
const targetFrameRate = isCompactDevice ? 30 : 45;
let lastFrameTime = 0;
engine.runRenderLoop(() => {
  const now = performance.now();
  const frameInterval = activeExperience === 'body-anatomy'
    ? 1000 / (isCompactDevice ? 20 : 30)
    : 1000 / targetFrameRate;
  if (now - lastFrameTime < frameInterval) return;
  lastFrameTime = now;
  scene.render();
});
window.addEventListener('resize', () => {
  engine.resize();
  requestAnimationFrame(() => setTimeout(fitVisibleSceneToSquare, 100));
});
document.getElementById('loading').classList.add('hidden');
setTimeout(()=>document.getElementById('loading')?.remove(),500);
