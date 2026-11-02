import './style.css';
import '@babylonjs/loaders/glTF';
import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  ArcRotateCamera,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  PointerEventTypes
} from '@babylonjs/core';
import { HighlightLayer } from '@babylonjs/core/Layers/highlightLayer';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';

const canvas = document.getElementById('render-canvas');
const loadingOverlay = document.getElementById('loading');
const statusElement = document.getElementById('asset-status');
const structureListElement = document.getElementById('structure-list');
const searchElement = document.getElementById('anatomy-search');
const isolateButton = document.getElementById('isolate-structure');
const restoreButton = document.getElementById('restore-structures');
const selectionName = document.getElementById('selection-name');
const selectionDescription = document.getElementById('selection-description');
const jawAngleInput = document.getElementById('jaw-angle');
const jawAngleValue = document.getElementById('jaw-angle-value');
const jawAngleStatus = document.getElementById('jaw-angle-status');
const jawPresetButtons = [...document.querySelectorAll('[data-jaw-angle]')];
let mandiblePivot = null;
let targetJawAngleRadians = 0;
let jawRotationSign = -1;

if (!canvas) throw new Error('3D canvas is missing.');

const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: true,
  antialias: true
});
const scene = new Scene(engine);
scene.clearColor = new Color4(0.035, 0.065, 0.105, 1);
scene.ambientColor = new Color3(0.32, 0.36, 0.4);

const camera = new ArcRotateCamera(
  'DentalAnatomyCamera',
  -Math.PI / 2.25,
  1.12,
  6.4,
  new Vector3(0, 0, 0),
  scene
);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 2.4;
camera.upperRadiusLimit = 14;
camera.lowerBetaLimit = 0.16;
camera.upperBetaLimit = Math.PI - 0.16;
camera.wheelDeltaPercentage = 0.012;
camera.panningSensibility = 75;
camera.useNaturalPinchZoom = true;
camera.pinchDeltaPercentage = 0.012;

const ambient = new HemisphericLight('AnatomyAmbient', new Vector3(0, 1, 0), scene);
ambient.intensity = 0.82;
const keyLight = new DirectionalLight('AnatomyKeyLight', new Vector3(-0.45, -1, 0.55), scene);
keyLight.position = new Vector3(4, 7, -5);
keyLight.intensity = 1.05;

const highlight = new HighlightLayer('SelectedAnatomyHighlight', scene);
highlight.innerGlow = false;
highlight.outerGlow = true;

const materials = {};
function createMaterial(name, hex, roughness) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.FromHexString(hex);
  material.specularColor = new Color3(0.28, 0.3, 0.32);
  material.specularPower = Math.max(10, 128 * (1 - roughness));
  materials[name] = material;
  return material;
}
createMaterial('fallbackGum', '#bd7788', 0.62);
createMaterial('fallbackTooth', '#f3e6d1', 0.38);
createMaterial('fallbackBone', '#c7bda9', 0.76);
createMaterial('fallbackBase', '#24384a', 0.82);

let anatomyContainer = null;
let anatomyRoot = null;
let anatomyMeshes = [];
let anatomyCatalog = [];
let selectedStructureId = null;
let selectedMeshes = [];
let allMeshesVisible = true;
const fallbackRoot = new TransformNode('OralAnatomyFallback', scene);
fallbackRoot.setEnabled(false);

function setStatus(message, state) {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.classList.remove('ok', 'warn');
  if (state) statusElement.classList.add(state);
}

function setSelection(title, detail) {
  selectionName.textContent = title;
  selectionDescription.textContent = detail;
}

function updateJawAngle(degrees) {
  const angle = Math.max(0, Math.min(40, Math.round(Number(degrees) || 0)));
  if (jawAngleInput) jawAngleInput.value = String(angle);
  if (jawAngleValue) jawAngleValue.textContent = angle + '°';
  targetJawAngleRadians = jawRotationSign * angle * Math.PI / 180;
  if (jawAngleValue) jawAngleValue.dataset.targetAngle = String(angle);

  for (const button of jawPresetButtons) {
    const selected = Number(button.dataset.jawAngle) === angle;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  if (jawAngleStatus) {
    jawAngleStatus.textContent = angle === 0
      ? 'الفك في وضع الإغلاق.'
      : 'زاوية الفتح الحالية: ' + angle + ' درجة.';
  }
}

function registerJawPivot(pivot, movingNodes, rotationSign) {
  const nodes = [...new Set(movingNodes)].filter(Boolean);
  if (!pivot || !nodes.length) {
    if (jawAngleStatus) jawAngleStatus.textContent = 'تعذر تحديد أجزاء الفك السفلي القابلة للحركة.';
    return false;
  }

  pivot.computeWorldMatrix(true);
  for (const node of nodes) {
    if (node === pivot) continue;
    node.computeWorldMatrix(true);
    node.setParent(pivot);
  }

  mandiblePivot = pivot;
  jawRotationSign = rotationSign;
  if (jawAngleStatus) jawAngleStatus.dataset.jointReady = 'true';
  updateJawAngle(Number(jawAngleInput?.value || 0));
  if (jawAngleInput) jawAngleInput.disabled = false;
  for (const button of jawPresetButtons) button.disabled = false;
  if (jawAngleStatus) jawAngleStatus.textContent = 'حرّك المؤشر لتغيير زاوية فتح الفك السفلي.';
  return true;
}

function worldBoundsForMeshes(meshes) {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  let count = 0;
  for (const mesh of meshes) {
    if (!mesh?.getBoundingInfo || !mesh.getTotalVertices?.()) continue;
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    min.minimizeInPlace(bounds.minimumWorld);
    max.maximizeInPlace(bounds.maximumWorld);
    count++;
  }
  return count ? { min, max } : null;
}

function createImportedJawPivot() {
  if (!anatomyRoot) return false;

  const lowerIds = anatomyCatalog
    .filter(item => item.id.startsWith('lower-') || item.id === 'mandible')
    .map(item => item.id);
  const movingNodes = lowerIds.flatMap(id => meshesForStructure(id));
  const uniqueNodes = [...new Set(movingNodes)];
  if (!uniqueNodes.length) return false;

  const mandibleMeshes = meshesForStructure('mandible');
  const jawBounds = worldBoundsForMeshes(mandibleMeshes.length ? mandibleMeshes : uniqueNodes);
  if (!jawBounds) return false;

  const incisors = [
    ...meshesForStructure('lower-left-central-incisor'),
    ...meshesForStructure('lower-right-central-incisor')
  ];
  const incisorBounds = worldBoundsForMeshes(incisors);
  const jawCenterZ = (jawBounds.min.z + jawBounds.max.z) / 2;
  const frontZ = incisorBounds
    ? (incisorBounds.min.z + incisorBounds.max.z) / 2
    : jawCenterZ - 0.01;
  const frontIsMinZ = frontZ < jawCenterZ;
  const hingeZ = frontIsMinZ ? jawBounds.max.z : jawBounds.min.z;
  const hingeWorld = new Vector3(
    (jawBounds.min.x + jawBounds.max.x) / 2,
    jawBounds.max.y,
    hingeZ
  );

  const inverseRoot = anatomyRoot.getWorldMatrix().clone();
  inverseRoot.invert();
  const hingeLocal = Vector3.TransformCoordinates(hingeWorld, inverseRoot);
  const pivot = new TransformNode('MandibleOpeningPivot', scene);
  pivot.parent = anatomyRoot;
  pivot.position.copyFrom(hingeLocal);
  pivot.rotation.setAll(0);
  pivot.computeWorldMatrix(true);

  return registerJawPivot(pivot, uniqueNodes, frontIsMinZ ? -1 : 1);
}

function setCamera(mode) {
  const presets = {
    orbit: [-Math.PI / 2.25, 1.12, 6.4, new Vector3(0, 0, 0)],
    front: [-Math.PI / 2, 1.2, 6.5, new Vector3(0, 0, 0)],
    side: [0, 1.2, 6.5, new Vector3(0, 0, 0)],
    top: [-Math.PI / 2, 0.2, 7.1, new Vector3(0, 0, 0)]
  };
  const view = presets[mode] || presets.orbit;
  camera.alpha = view[0];
  camera.beta = view[1];
  camera.radius = view[2];
  camera.setTarget(view[3]);
  document.querySelectorAll('.camera-button').forEach(button => {
    button.classList.toggle('selected', button.dataset.camera === mode);
  });
}

function frameMeshes(meshes) {
  const candidates = (meshes && meshes.length ? meshes : anatomyMeshes)
    .filter(mesh => mesh && mesh.getTotalVertices && mesh.getTotalVertices() > 0 && mesh.isEnabled());
  if (!candidates.length) return;
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of candidates) {
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    min.minimizeInPlace(bounds.minimumWorld);
    max.maximizeInPlace(bounds.maximumWorld);
  }
  const center = min.add(max).scale(0.5);
  const radius = Math.max(max.subtract(min).length() * 0.72, 2.8);
  camera.setTarget(center);
  camera.radius = radius;
  camera.lowerRadiusLimit = Math.max(1.8, radius * 0.52);
  camera.upperRadiusLimit = Math.max(10, radius * 2.5);
}

function groupForStructure(item) {
  if (item.id.startsWith('upper-')) return 'الفك العلوي';
  if (item.id.startsWith('lower-')) return 'الفك السفلي';
  if (item.id.includes('gum')) return 'اللثة';
  return 'عظام الفك';
}

function renderStructureList(filter) {
  if (!structureListElement) return;
  const query = (filter || '').trim().toLocaleLowerCase('ar');
  structureListElement.replaceChildren();
  const groups = new Map();
  for (const item of anatomyCatalog) {
    const label = item.label || item.id;
    if (query && !label.toLocaleLowerCase('ar').includes(query) && !item.id.toLocaleLowerCase('en').includes(query)) continue;
    const group = item.group || groupForStructure(item);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item);
  }
  for (const [groupName, items] of groups) {
    const heading = document.createElement('div');
    heading.className = 'anatomy-group-title';
    heading.textContent = groupName;
    structureListElement.appendChild(heading);
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'structure-button';
      button.dataset.structure = item.id;
      button.textContent = item.label || item.id;
      button.addEventListener('click', () => selectStructure(item.id));
      structureListElement.appendChild(button);
    }
  }
}

function meshesForStructure(id) {
  const direct = anatomyMeshes.filter(mesh => {
    const name = mesh.name || '';
    return name === id || name.startsWith(id + '_') || mesh.metadata?.structureId === id;
  });
  if (direct.length) return direct;
  return anatomyMeshes.filter(mesh => {
    const token = (mesh.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return token.includes(id.toLowerCase());
  });
}

function clearHighlights() {
  highlight.removeAllMeshes();
  structureListElement?.querySelectorAll('.structure-button').forEach(button => {
    button.classList.toggle('selected', button.dataset.structure === selectedStructureId);
  });
}

function selectStructure(id) {
  const item = anatomyCatalog.find(record => record.id === id);
  if (!item) return;
  selectedStructureId = id;
  selectedMeshes = meshesForStructure(id);
  clearHighlights();
  for (const mesh of selectedMeshes) {
    mesh.isVisible = true;
    highlight.addMesh(mesh, Color3.FromHexString('#47d4bd'));
  }
  setSelection(item.label || id, selectedMeshes.length
    ? 'تم تحديد التركيب داخل النموذج ثلاثي الأبعاد.'
    : 'تم تحديد الاسم في الدليل؛ تعذر مطابقة مجسم مستقل له في الملف الحالي.');
  isolateButton.disabled = selectedMeshes.length === 0;
  structureListElement?.querySelectorAll('.structure-button').forEach(button => {
    button.classList.toggle('selected', button.dataset.structure === id);
  });
  if (selectedMeshes.length) frameMeshes(selectedMeshes);
}

function isolateSelected() {
  if (!selectedMeshes.length) return;
  const visibleSet = new Set(selectedMeshes);
  for (const mesh of anatomyMeshes) mesh.isVisible = visibleSet.has(mesh);
  allMeshesVisible = false;
}

function restoreAll() {
  for (const mesh of anatomyMeshes) mesh.isVisible = true;
  allMeshesVisible = true;
  if (selectedStructureId) {
    for (const mesh of selectedMeshes) highlight.addMesh(mesh, Color3.FromHexString('#47d4bd'));
  }
  frameMeshes();
}

function makeFallbackModel() {
  fallbackRoot.setEnabled(true);
  anatomyMeshes = [];
  const kinds = [
    'central-incisor', 'lateral-incisor', 'canine',
    'first-premolar', 'second-premolar', 'first-molar', 'second-molar'
  ];
  const xPositions = [0.12, 0.31, 0.57, 0.84, 1.1, 1.34, 1.52];
  const fallbackLowerNodes = [];

  function addArch(arch, y) {
    const gumPath = [];
    for (let i = 0; i <= 36; i++) {
      const angle = Math.PI + Math.PI * i / 36;
      gumPath.push(new Vector3(Math.cos(angle) * 1.55, y, Math.sin(angle) * 0.62 + 0.24));
    }
    const gum = MeshBuilder.CreateTube(arch + '-gum', { path: gumPath, radius: 0.2, tessellation: 18 }, scene);
    gum.material = materials.fallbackGum;
    gum.parent = fallbackRoot;
    if (arch === 'lower') fallbackLowerNodes.push(gum);
    anatomyMeshes.push(gum);
    const gumId = arch + '-gum';
    gum.metadata = { structureId: gumId };

    for (const side of ['right', 'left']) {
      for (let index = 0; index < kinds.length; index++) {
        const id = arch + '-' + side + '-' + kinds[index];
        const x = (side === 'right' ? -1 : 1) * xPositions[index];
        const z = 0.24 - (0.62 * Math.sin(Math.acos(Math.min(0.99, xPositions[index] / 1.55))));
        const toothGroup = new TransformNode(id, scene);
        toothGroup.parent = fallbackRoot;
        if (arch === 'lower') fallbackLowerNodes.push(toothGroup);
        const root = MeshBuilder.CreateCylinder(id + '_root', {
          height: 0.42,
          diameterTop: 0.14,
          diameterBottom: 0.25,
          tessellation: 18
        }, scene);
        root.position.set(x, y + (arch === 'upper' ? 0.19 : -0.19), z);
        root.material = materials.fallbackTooth;
        root.parent = toothGroup;
        root.metadata = { structureId: id };
        const crown = MeshBuilder.CreateSphere(id + '_crown', { diameter: 0.3, segments: 20 }, scene);
        crown.scaling.set(0.82, 0.72, 0.9);
        crown.position.set(x, y + (arch === 'upper' ? -0.08 : 0.08), z + 0.015);
        crown.material = materials.fallbackTooth;
        crown.parent = toothGroup;
        crown.metadata = { structureId: id };
        anatomyMeshes.push(root, crown);
      }
    }
  }

  addArch('upper', 0.43);
  addArch('lower', -0.43);

  const maxillaRight = MeshBuilder.CreateSphere('right-maxilla', { diameter: 1, segments: 16 }, scene);
  maxillaRight.scaling.set(0.9, 0.18, 0.34);
  maxillaRight.position.set(-0.72, 0.5, -0.16);
  maxillaRight.material = materials.fallbackBone;
  maxillaRight.parent = fallbackRoot;
  maxillaRight.metadata = { structureId: 'right-maxilla' };
  const maxillaLeft = maxillaRight.clone('left-maxilla');
  maxillaLeft.parent = fallbackRoot;
  maxillaLeft.position.x = 0.72;
  maxillaLeft.metadata = { structureId: 'left-maxilla' };
  const mandible = MeshBuilder.CreateTorus('mandible', { diameter: 2.75, thickness: 0.14, tessellation: 48 }, scene);
  mandible.rotation.x = Math.PI / 2;
  mandible.scaling.z = 0.42;
  mandible.position.y = -0.59;
  mandible.material = materials.fallbackBone;
  mandible.parent = fallbackRoot;
  mandible.metadata = { structureId: 'mandible' };
  anatomyMeshes.push(maxillaRight, maxillaLeft, mandible);
  fallbackLowerNodes.push(mandible);

  const pivot = new TransformNode('FallbackMandibleOpeningPivot', scene);
  pivot.parent = fallbackRoot;
  pivot.position.set(0, -0.43, 0.24);
  pivot.computeWorldMatrix(true);
  registerJawPivot(pivot, fallbackLowerNodes, -1);
}

async function loadCatalog() {
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.href);
  const catalogUrl = new URL('models/anatomy-structures.json', baseUrl);
  try {
    const response = await fetch(catalogUrl);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) throw new Error('Invalid anatomy catalogue');
    anatomyCatalog = payload;
  } catch (error) {
    console.warn('Could not load the anatomy catalogue; using the embedded list.', error);
    anatomyCatalog = [];
    const toothKinds = [
      ['central-incisor', 'القاطع المركزي'],
      ['lateral-incisor', 'القاطع الجانبي'],
      ['canine', 'الناب'],
      ['first-premolar', 'الضاحك الأول'],
      ['second-premolar', 'الضاحك الثاني'],
      ['first-molar', 'الضرس الأول'],
      ['second-molar', 'الضرس الثاني']
    ];
    for (const arch of ['upper', 'lower']) {
      for (const side of ['right', 'left']) {
        for (const [kind, label] of toothKinds) {
          anatomyCatalog.push({
            id: arch + '-' + side + '-' + kind,
            label: label + (arch === 'upper' ? ' — الفك العلوي ' : ' — الفك السفلي ') + (side === 'right' ? 'الأيمن' : 'الأيسر')
          });
        }
      }
    }
    anatomyCatalog.push(
      { id: 'upper-gum', label: 'اللثة العلوية' },
      { id: 'lower-gum', label: 'اللثة السفلية' },
      { id: 'right-maxilla', label: 'عظم الفك العلوي الأيمن' },
      { id: 'left-maxilla', label: 'عظم الفك العلوي الأيسر' },
      { id: 'mandible', label: 'عظم الفك السفلي' }
    );
  }
  renderStructureList('');
}

function attachCenteredContainer(container) {
  container.addAllToScene();
  const renderMeshes = container.meshes.filter(mesh =>
    mesh.getTotalVertices && mesh.getTotalVertices() > 0 && mesh.getBoundingInfo
  );
  if (!renderMeshes.length) throw new Error('The anatomy GLB contains no renderable meshes.');

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
  const scale = 4.5 / largest;
  anatomyRoot = new TransformNode('OralAnatomyRoot', scene);
  for (const node of container.rootNodes) node.parent = anatomyRoot;
  anatomyRoot.scaling.setAll(scale);
  anatomyRoot.position.set(
    -((min.x + max.x) / 2) * scale,
    -((min.y + max.y) / 2) * scale,
    -((min.z + max.z) / 2) * scale
  );
  anatomyRoot.computeWorldMatrix(true);
  anatomyMeshes = renderMeshes;
  for (const mesh of anatomyMeshes) {
    mesh.isPickable = true;
    mesh.isVisible = true;
  }
  return anatomyMeshes;
}

async function loadOralAnatomy() {
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.href);
  const localRoot = new URL('models/', baseUrl).href;
  try {
    anatomyContainer = await SceneLoader.LoadAssetContainerAsync(localRoot, 'oral-anatomy.glb', scene);
    attachCenteredContainer(anatomyContainer);
    if (!createImportedJawPivot()) {
      setStatus('تم تحميل نموذج تشريح الفم، لكن تعذر تهيئة حركة الفك السفلي.', 'warn');
    } else {
      setStatus('تم تحميل نموذج تشريح الفم. يمكنك تغيير زاوية فتح الفك السفلي.', 'ok');
    }
  } catch (localError) {
    console.warn('Local oral anatomy model unavailable; trying the original source.', localError);
    try {
      anatomyContainer = await SceneLoader.LoadAssetContainerAsync(
        'https://raw.githubusercontent.com/organui/teeth-3d/main/public/models/',
        'teeth.glb',
        scene
      );
      attachCenteredContainer(anatomyContainer);
      if (!createImportedJawPivot()) {
        setStatus('تم تحميل نموذج تشريح الفم، لكن تعذر تهيئة حركة الفك السفلي.', 'warn');
      } else {
        setStatus('تم تحميل نموذج تشريح الفم من المصدر الخارجي.', 'ok');
      }
    } catch (remoteError) {
      console.error('Oral anatomy model could not be loaded.', remoteError);
      makeFallbackModel();
      anatomyMeshes = fallbackRoot.getChildMeshes(false);
      setStatus('تعذر تحميل الملف الأصلي؛ تم إنشاء نموذج تشريحي بديل داخل المشهد.', 'warn');
    }
  }
  frameMeshes();
  loadingOverlay?.classList.add('hidden');
}

function findStructureForMesh(mesh) {
  let node = mesh;
  while (node) {
    const id = node.metadata?.structureId || node.name;
    const item = anatomyCatalog.find(record => id === record.id || id.startsWith(record.id + '_'));
    if (item) return item;
    node = node.parent;
  }
  return null;
}

scene.onPointerObservable.add(pointerInfo => {
  if (pointerInfo.type !== PointerEventTypes.POINTERPICK || !pointerInfo.pickInfo?.hit) return;
  const mesh = pointerInfo.pickInfo.pickedMesh;
  if (!mesh) return;
  const item = findStructureForMesh(mesh);
  if (item) selectStructure(item.id);
});

document.querySelectorAll('.camera-button').forEach(button => {
  button.addEventListener('click', () => setCamera(button.dataset.camera));
});
document.getElementById('reset-camera')?.addEventListener('click', () => setCamera('orbit'));
searchElement?.addEventListener('input', event => renderStructureList(event.target.value));
isolateButton?.addEventListener('click', isolateSelected);
restoreButton?.addEventListener('click', restoreAll);

jawAngleInput?.addEventListener('input', event => updateJawAngle(event.target.value));
for (const button of jawPresetButtons) {
  button.addEventListener('click', () => updateJawAngle(button.dataset.jawAngle));
}

const compactDevice = window.matchMedia('(max-width: 760px)').matches ||
  (navigator.hardwareConcurrency || 4) <= 4;
engine.setHardwareScalingLevel(compactDevice ? 1.25 : 1);
let lastFrameTime = 0;
const frameInterval = compactDevice ? 1000 / 30 : 1000 / 45;
engine.runRenderLoop(() => {
  const now = performance.now();
  if (now - lastFrameTime < frameInterval) return;
  const deltaMs = lastFrameTime ? Math.min(100, now - lastFrameTime) : frameInterval;
  lastFrameTime = now;
  if (mandiblePivot) {
    const difference = targetJawAngleRadians - mandiblePivot.rotation.x;
    mandiblePivot.rotation.x += difference * (1 - Math.exp(-deltaMs / 115));
    if (Math.abs(difference) < 0.0005) mandiblePivot.rotation.x = targetJawAngleRadians;
    if (jawAngleStatus) {
      const currentAngle = mandiblePivot.rotation.x * jawRotationSign * 180 / Math.PI;
      jawAngleStatus.dataset.currentAngle = currentAngle.toFixed(2);
    }
  }
  scene.render();
});
window.addEventListener('resize', () => {
  engine.resize();
  requestAnimationFrame(() => frameMeshes());
});

async function initializeWorkspace() {
  await loadCatalog();
  await loadOralAnatomy();
  setCamera('orbit');
}

initializeWorkspace().catch(error => {
  console.error('Workspace initialization failed.', error);
  setStatus('حدث خطأ أثناء تجهيز مساحة العمل. أعد تحميل الصفحة للمحاولة مجددًا.', 'warn');
  loadingOverlay?.classList.add('hidden');
});
