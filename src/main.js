import './style.css';
import '@babylonjs/loaders/glTF';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { HighlightLayer } from '@babylonjs/core/Layers/highlightLayer';
import {
  Engine, Scene, Vector3, Color3, Color4, HemisphericLight, DirectionalLight,
  ArcRotateCamera, MeshBuilder, StandardMaterial, TransformNode, ActionManager,
  ExecuteCodeAction, PointerEventTypes
} from '@babylonjs/core';

const canvas = document.getElementById('render-canvas');
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
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

function buildStandingPerson(prefix, x, z, clothing, masked = false, withCoat = false) {
  const group = new TransformNode(prefix, scene);
  group.parent = peopleRoot;
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
buildSeatedPatient();
buildStandingPerson('DentistPreview',-1.35,.25,'coat',false,true);
buildStandingPerson('AssistantPreview',1.35,.25,'scrubs',true,false);

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
  activeExperience = 'clinic-pack';
  peopleRoot.setEnabled(false);
  anatomyPanel.hidden = true;
  for (const id of ['view-clinic','view-anatomy','view-people']) {
    document.getElementById(id)?.classList.toggle('selected',id==='view-clinic');
  }
  loadingOverlay?.classList.remove('hidden');
  await ensureClinicModel();
  if (anatomyAssetRoot) anatomyAssetRoot.setEnabled(false);
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

async function showPeopleExperience() {
  activeExperience = 'people';
  root.setEnabled(false);
  clinicAssetRoot?.setEnabled(false);
  anatomyAssetRoot?.setEnabled(false);
  peopleRoot.setEnabled(true);
  anatomyPanel.hidden = true;
  for (const id of ['view-clinic','view-anatomy','view-people']) {
    document.getElementById(id)?.classList.toggle('selected',id==='view-people');
  }
  setProceduralControlsEnabled(false,'clinic');
  camera.lowerRadiusLimit = 3;
  camera.upperRadiusLimit = 12;
  setAssetStatus('وضع الشخصيات: طبيب أسنان ومريض ومساعد، مجسمات توضيحية مولّدة داخل المشروع وليست شخصيات واقعية أو Rig سريريًا.', 'ok');
  document.getElementById('selection-name').textContent = 'فريق عيادة الأسنان';
  document.getElementById('selection-description').textContent = 'شخصيات تعليمية أولية لعرض التوزيع المكاني والأدوار داخل مشهد منفصل.';
  setCamera('orbit');
}
document.getElementById('view-people')?.addEventListener('click',showPeopleExperience);

async function showAnatomyExperience() {
  peopleRoot.setEnabled(false);
  for (const id of ['view-clinic','view-anatomy','view-people']) {
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
const trainingCases = {
  exam: {
    title: 'فحص سريري أولي',
    description: 'تسلسل تعليمي لتنظيم خطوات الفحص والملاحظات دون تسجيل بيانات تعريفية للمريض.',
    steps: [
      ['تهيئة بيئة العمل', 'تأكد من جاهزية بيئة التدريب ومعدات الوقاية وفق سياسة منشأتك التعليمية.'],
      ['جمع التاريخ المرضي', 'راجع التاريخ المرضي والحساسية والأدوية مع استخدام حالة افتراضية خالية من بيانات شخصية.'],
      ['الفحص خارج الفم وداخله', 'اتبع تسلسل فحص منهجي، وسجل الملاحظات الموضوعية دون افتراض تشخيص.'],
      ['الفحوص المساندة', 'حدد ما إذا كانت صور الأشعة أو الاختبارات الإضافية مطلوبة وفق إشراف المختص.'],
      ['ملخص الحالة', 'اعرض النتائج والملاحظات على المشرف قبل صياغة أي خطة علاج.']
    ]
  },
  restoration: {
    title: 'خطوات ترميم تعليمي',
    description: 'سيناريو مفاهيمي لمراحل الترميم؛ لا يحدد مقاسات تحضير أو إعدادات أجهزة أو وصفة سريرية.',
    steps: [
      ['تقييم السن', 'راجع الشكوى والفحص السريري ووسائل التشخيص المناسبة مع المشرف.'],
      ['تحديد الخطة', 'ناقش التشخيص والبدائل والمخاطر والموافقة المستنيرة في حالة افتراضية.'],
      ['التحضير والعزل', 'تعرف إلى أهداف العزل والتحضير المحافظ تحت إشراف سريري مباشر.'],
      ['اختيار المادة', 'قارن خصائص مواد الترميم واستخداماتها وفق تعليمات الشركة والمقرر التعليمي.'],
      ['التقييم النهائي', 'راجع سلامة الترميم والتلامسات والإطباق وخطة المتابعة مع المشرف.']
    ]
  },
  endo: {
    title: 'مبادئ علاج الجذور',
    description: 'تسلسل تعليمي عام لمبادئ التشخيص والتوثيق والعزل، وليس بروتوكولًا علاجيًا تنفيذيًا.',
    steps: [
      ['التشخيص', 'راجع التاريخ المرضي والاختبارات السريرية والتصوير المناسب مع المشرف.'],
      ['تقييم قابلية العلاج', 'ناقش حالة السن والإنذار والبدائل العلاجية قبل اتخاذ القرار.'],
      ['العزل', 'تعرف إلى أهمية العزل ومنع التلوث المتبادل وفق بروتوكول الكلية.'],
      ['فهم التشريح الداخلي', 'استخدم نموذج التشريح لفهم الحجرة والقنوات مع الانتباه إلى الاختلافات التشريحية.'],
      ['التوثيق والمتابعة', 'سجل الإجراءات التعليمية وناقش النتيجة وخطة المتابعة مع المشرف.']
    ]
  },
  hygiene: {
    title: 'إزالة اللويحة والتوعية',
    description: 'حالة تعليمية حول تقييم صحة الفم والتواصل الوقائي مع المريض.',
    steps: [
      ['تقييم صحة اللثة', 'راجع مؤشرات اللثة واللويحة ضمن إطار تدريبي موحد.'],
      ['تحديد عوامل الخطورة', 'ناقش العادات والعوامل السلوكية المؤثرة في صحة الفم.'],
      ['شرح الوقاية', 'اشرح للمريض الافتراضي دور العناية اليومية والمتابعة الدورية.'],
      ['اختيار أداة مناسبة', 'قارن أدوات التنظيف على مستوى الاستخدام التعليمي وموانع الاستعمال العامة.'],
      ['مراجعة النتائج', 'وثق التغيرات التعليمية وخطة المتابعة مع المشرف.']
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
setTimeout(() => showClinicExperience(), 50);

document.getElementById('mesh-count').textContent=String(scene.meshes.length);
engine.runRenderLoop(()=>{scene.render();});
window.addEventListener('resize',()=>engine.resize());
document.getElementById('loading').classList.add('hidden');
setTimeout(()=>document.getElementById('loading')?.remove(),500);
