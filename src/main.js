import './style.css';
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

const root = new TransformNode('ClinicRoot', scene);
const room = new TransformNode('RoomGroup', scene); room.parent = root;
const unit = new TransformNode('DentalUnitGroup', scene); unit.parent = root;
const jawGroup = new TransformNode('JawGroup', scene); jawGroup.parent = root;
const toolGroup = new TransformNode('InstrumentGroup', scene); toolGroup.parent = root;

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
let chairHeight = 0;
let lampOn = true;
scene.onPointerObservable.add((pointerInfo) => {
  if (pointerInfo.type !== PointerEventTypes.POINTERPICK || !pointerInfo.pickInfo?.hit) return;
  const picked = pointerInfo.pickInfo.pickedMesh;
  if (!picked || picked === scene.meshes[0]) return;
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

document.getElementById('mesh-count').textContent=String(scene.meshes.length);
engine.runRenderLoop(()=>{scene.render();});
window.addEventListener('resize',()=>engine.resize());
document.getElementById('loading').classList.add('hidden');
setTimeout(()=>document.getElementById('loading')?.remove(),500);
