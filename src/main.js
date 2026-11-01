import './style.css';
import '@babylonjs/loaders/glTF';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { HighlightLayer } from '@babylonjs/core/Layers/highlightLayer';
import {
  Engine, Scene, Vector3, Color3, Color4, HemisphericLight, DirectionalLight, PointLight,
  ArcRotateCamera, MeshBuilder, StandardMaterial, TransformNode, ActionManager,
  ExecuteCodeAction, PointerEventTypes, Animation, CubicEase, EasingFunction
} from '@babylonjs/core';

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
box('TreatmentPatientLowerJaw', [.31, .085, .2], [0, -.015, -.045], 'skin', patientJawPivot);
for (let i = 0; i < 4; i++) {
  sphere('TreatmentPatientUpperTooth_' + i, .055, [-.09 + i * .06, .315, -.865], 'tooth', treatmentPatient, [1, .35, .7]);
  sphere('TreatmentPatientLowerTooth_' + i, .05, [-.09 + i * .06, .085, -.85], 'tooth', patientJawPivot, [1, .35, .7]);
}
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
  if (activeExperience === 'dental-scope') {
    const dentalKey = picked.metadata?.dentalScopeKey;
    if (dentalKey) {
      selectDentalStructure(dentalKey);
      const match = dentalKey.match(/^tooth-(\\d{2})$/);
      if (match) void loadDentalTooth(match[1]);
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
  for (const mesh of anatomyContainer?.meshes || []) {
    if (mesh.name === id || mesh.name.startsWith(id + '_')) {
      highlight.addMesh(mesh, Color3.FromHexString('#42d6bd'));
      document.getElementById('selection-name').textContent = anatomyCatalog.find(x=>x.id===id)?.label || mesh.name;
      document.getElementById('selection-description').textContent = 'تركيب تشريحي من نموذج BodyParts3D / Anatomography 4.3. استخدمه كمرجع تعليمي بصري فقط.';
    } else {
      highlight.removeMesh(mesh);
    }
  }
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
  for (const id of ['view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas']) {
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
  patientVariantControls.hidden = true;
  peopleRoot.setEnabled(false);
  anatomyPanel.hidden = true;
  bodyPanel.hidden = true;
  dentalAtlasPanel.hidden = true;
  activeExperience = 'treatment';
  for (const id of ['view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas']) {
    document.getElementById(id)?.classList.toggle('selected', id === 'view-treatment');
  }
  loadingOverlay?.classList.remove('hidden');
  await ensureClinicModel();
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
    selected.root.setEnabled(true);
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
    proceduralPatient.setEnabled(true);
    patientStatus.textContent='تعذر تحميل المجسم الخارجي؛ تم إظهار النموذج البديل داخل المشروع.';
    return false;
  }
}
document.getElementById('patient-male')?.addEventListener('click',()=>void selectPatientVariant('male'));
document.getElementById('patient-female')?.addEventListener('click',()=>void selectPatientVariant('female'));

async function showPeopleExperience() {
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
  for (const id of ['view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas']) {
    document.getElementById(id)?.classList.toggle('selected',id==='view-people');
  }
  root.setEnabled(false);
  clinicAssetRoot?.setEnabled(false);
  anatomyAssetRoot?.setEnabled(false);
  peopleRoot.setEnabled(true);
  patientVariantControls.hidden = false;
  anatomyPanel.hidden = true;
  for (const id of ['view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas']) {
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
  for (const id of ['view-treatment','view-clinic','view-anatomy','view-people','view-body','view-dental-atlas']) {
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
  treatmentRoot.setEnabled(false);
  treatmentLight.intensity = 0;
  treatmentLight.setEnabled(false);
  patientVariantControls.hidden = true;
  dentalScopeRoot?.setEnabled(false);
  dentalToothDetails.forEach(item=>item.root.setEnabled(false));
  dentalAtlasPanel.hidden=true;
  engine.setHardwareScalingLevel(1.15);
  for(const id of ['view-clinic','view-anatomy','view-people','view-body','view-dental-atlas']) {
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
  const label=dentalArabicLabel(key);
  document.getElementById('selection-name').textContent=label;
  const info=dentalManifest?.meshes?.[key];
  document.getElementById('selection-description').textContent=
    'معرّف التركيب: '+key+
    (info?' · المصدر التشريحي: '+(info.sourceRef||'BodyParts3D')+' · مستوى النمذجة: '+info.provenance:'');
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
    button.addEventListener('click',()=>void loadDentalTooth(fdi));
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
    camera.lowerRadiusLimit=.25;camera.upperRadiusLimit=20;
    camera.alpha=-Math.PI/2.1;camera.beta=1.15;camera.radius=3.4;
    camera.setTarget(new Vector3(0,.1,0));
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
  treatmentRoot.setEnabled(false);
  treatmentLight.intensity = 0;
  treatmentLight.setEnabled(false);
  patientVariantControls.hidden = true;
  for(const id of ['view-clinic','view-anatomy','view-people','view-body','view-dental-atlas']) {
    document.getElementById(id)?.classList.toggle('selected',id==='view-dental-atlas');
  }
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
    setProceduralControlsEnabled(false,'dental');
    engine.setHardwareScalingLevel(1.25);
    restoreDentalWholeMouth();
    setDentalStatus('الأطلس السني جاهز: 32 سنًا، تشريح داخلي، لثة، عظام، مفاصل، أعصاب وأوعية.', 'ok');
    setCamera('orbit');
  }
  loadingOverlay?.classList.add('hidden');
}
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
  fda: { label: 'FDA — اعتبارات دعم القرار السريري بالبرمجيات', url: 'https://www.fda.gov/medical-devices/digital-health-center-excellence/step-6-software-function-intended-provide-clinical-decision-support' }
};

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
}
scenarioSelect?.addEventListener('change', event => {
  currentCase = event.target.value;
  currentStep = -1;
  completedSteps = [];
  caseFeedback.textContent = 'تم اختيار السيناريو. اضغط ابدأ التدريب لعرض الخطوات.';
  updateCaseView();
});
document.getElementById('start-case')?.addEventListener('click', () => {
  currentCase = scenarioSelect.value;
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

updateCaseView();
setAssetStatus('المشهد البديل جاهز. جارٍ تحميل مكتبة العيادة والتشريح…');
setTimeout(() => showTreatmentExperience(), 50);

document.getElementById('mesh-count').textContent=String(scene.meshes.length);
let lastFrameTime = 0;
engine.runRenderLoop(()=>{
  const now = performance.now();
  const frameInterval = activeExperience === 'body-anatomy' ? 100 : 1000 / 30;
  if (now - lastFrameTime < frameInterval) return;
  lastFrameTime = now;
  scene.render();
});
window.addEventListener('resize',()=>engine.resize());
document.getElementById('loading').classList.add('hidden');
setTimeout(()=>document.getElementById('loading')?.remove(),500);
