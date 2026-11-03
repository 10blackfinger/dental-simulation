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
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import { PATHOLOGY_CATEGORIES, DENTAL_PATHOLOGIES } from './pathology-catalog.js';
import { createPathologyRenderer } from './pathology-visuals.js';
import { collectMandibularMeshes, estimateClosedJawCorrection } from './jaw-motion.js';

const canvas = document.getElementById('render-canvas');
const loadingOverlay = document.getElementById('loading');
const statusElement = document.getElementById('asset-status');
const structureListElement = document.getElementById('structure-list');
const structureCountElement = document.getElementById('structure-count');
const layerControlsElement = document.getElementById('layer-controls');
const searchElement = document.getElementById('anatomy-search');
const isolateButton = document.getElementById('isolate-structure');
const restoreButton = document.getElementById('restore-structures');
const selectionName = document.getElementById('selection-name');
const selectionDescription = document.getElementById('selection-description');
const jawAngleInput = document.getElementById('jaw-angle');
const jawAngleValue = document.getElementById('jaw-angle-value');
const jawAngleStatus = document.getElementById('jaw-angle-status');
const jawPresetButtons = [...document.querySelectorAll('[data-jaw-angle]')];
const pathologyCategoryElement = document.getElementById('pathology-category');
const pathologySearchElement = document.getElementById('pathology-search');
const pathologyConditionElement = document.getElementById('pathology-condition');
const pathologyNameElement = document.getElementById('pathology-name');
const pathologySummaryElement = document.getElementById('pathology-summary');
const pathologySymptomsElement = document.getElementById('pathology-symptoms');
const pathologySignsElement = document.getElementById('pathology-signs');
const pathologyRadiographicElement = document.getElementById('pathology-radiographic');
const pathologyTissuesElement = document.getElementById('pathology-tissues');
const pathologyCautionElement = document.getElementById('pathology-caution');
const pathologyTargetElement = document.getElementById('pathology-target');
const pathologyStageElement = document.getElementById('pathology-stage');
const pathologySeverityInput = document.getElementById('pathology-severity');
const pathologySeverityValue = document.getElementById('pathology-severity-value');
const pathologyApplyButton = document.getElementById('apply-pathology');
const pathologyAdvanceButton = document.getElementById('advance-pathology');
const pathologyClearButton = document.getElementById('clear-pathologies');
const activePathologiesElement = document.getElementById('active-pathologies');
const pathologyCountElement = document.getElementById('pathology-count');
let mandiblePivot = null;
let targetJawAngleRadians = 0;
let jawRotationSign = -1;
let jawMotionProbeMesh = null;
let closedJawCorrectionDegrees = 0;
let jawOcclusionCalibration = null;

if (!canvas) throw new Error('3D canvas is missing.');

const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: true,
  antialias: true
});
const scene = new Scene(engine);
const pathologyRenderer = createPathologyRenderer(scene);
scene.clearColor = new Color4(0.035, 0.065, 0.105, 1);
scene.ambientColor = new Color3(0.32, 0.36, 0.4);
scene.environmentIntensity = 0.72;
const environmentUrl = new URL('models/environmentSpecular.env', new URL(import.meta.env.BASE_URL, window.location.href)).href;
scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(environmentUrl, scene);

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
ambient.intensity = 0.92;
const keyLight = new DirectionalLight('AnatomyKeyLight', new Vector3(-0.45, -1, 0.55), scene);
keyLight.position = new Vector3(4, 7, -5);
keyLight.intensity = 1.12;
const fillLight = new DirectionalLight('DentalSoftFill', new Vector3(0.65, -0.3, -0.7), scene);
fillLight.position = new Vector3(-5, 2, 4);
fillLight.intensity = 0.42;
const rimLight = new DirectionalLight('DentalRimLight', new Vector3(0.15, -0.55, 0.85), scene);
rimLight.position = new Vector3(-2, 5, -5);
rimLight.intensity = 0.58;

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
let clinicalStructureData = null;
let clinicalRecords = {};
let clinicalModelActive = false;
const layerVisibility = new Map();
let selectedStructureId = null;
let selectedMeshes = [];
let allMeshesVisible = true;
let activePathologyCases = [];
let nextPathologyCaseId = 1;
let selectedPathologyCaseId = null;
const fallbackRoot = new TransformNode('OralAnatomyFallback', scene);
fallbackRoot.setEnabled(false);

const LAYER_LABELS = {
  teeth: 'الأسنان والعاج',
  mandible: 'عظم الفك السفلي',
  maxilla: 'عظم الفك العلوي والحنك',
  gingiva: 'اللثة',
  enamel: 'طبقة المينا',
  pulp: 'لب السن وقنوات الجذور',
  pdl: 'الرباط حول السني',
  lamina: 'الصفيحة القاسية',
  prosthetic: 'التركيبات والتيجان',
  nerves: 'الأعصاب',
  vessels: 'الشرايين والأوردة',
  midface: 'منتصف الوجه',
  ramus: 'فرع الفك السفلي'
};
const DEFAULT_FRAME_LAYERS = new Set(['teeth', 'mandible', 'maxilla', 'gingiva', 'enamel', 'prosthetic']);
const LOWER_NEUROVASCULAR_IDS = new Set([
  'FMA53243', 'FMA53243B', 'FMA53243T',
  'FMA49695', 'FMA49695T', 'FMA49699',
  'TAHU15802', 'TAHU15802M', 'TAHU15803',
  'FMA75520', 'FMA75521', 'FMA75522'
]);

function isLayerVisible(layer) {
  return layerVisibility.has(layer) ? layerVisibility.get(layer) : true;
}

function applyLayerVisibility() {
  for (const mesh of anatomyMeshes) {
    const record = clinicalRecords[mesh.name];
    mesh.isVisible = !clinicalModelActive || !record || isLayerVisible(record.layer);
  }
  if (selectedMeshes.length) {
    highlight.removeAllMeshes();
    for (const mesh of selectedMeshes) {
      if (mesh.isVisible) highlight.addMesh(mesh, Color3.FromHexString('#47d4bd'));
    }
  }
}

function renderLayerControls() {
  if (!layerControlsElement) return;
  layerControlsElement.replaceChildren();
  const layers = clinicalStructureData?.layers;
  if (!layers || !clinicalModelActive) {
    layerControlsElement.closest('.layers-section')?.setAttribute('hidden', '');
    return;
  }
  layerControlsElement.closest('.layers-section')?.removeAttribute('hidden');
  const orderedKeys = Object.keys(LAYER_LABELS).filter(key => layers[key]);
  for (const [key, config] of Object.entries(layers)) {
    if (!orderedKeys.includes(key)) orderedKeys.push(key);
  }
  for (const key of orderedKeys) {
    const config = layers[key];
    if (!config) continue;
    const label = document.createElement('label');
    label.className = 'layer-toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = isLayerVisible(key);
    input.dataset.layer = key;
    input.addEventListener('change', () => {
      layerVisibility.set(key, input.checked);
      applyLayerVisibility();
      frameMeshes();
    });
    const text = document.createElement('span');
    text.textContent = LAYER_LABELS[key] || config.label || key;
    label.append(input, text);
    layerControlsElement.appendChild(label);
  }
  if (!layerControlsElement.children.length) {
    const empty = document.createElement('p');
    empty.className = 'layer-loading';
    empty.textContent = 'لا توجد طبقات إضافية متاحة في هذا النموذج.';
    layerControlsElement.appendChild(empty);
  }
}



const PATHOLOGY_TISSUE_LABELS = {
  teeth: 'بنية السن والعاج',
  enamel: 'مينا الأسنان',
  pulp: 'لب السن وقنوات الجذر',
  pdl: 'الرباط حول السني',
  gingiva: 'اللثة',
  mandible: 'عظم الفك السفلي',
  maxilla: 'عظم الفك العلوي والحنك',
  lamina: 'الصفيحة القاسية',
  nerves: 'الأعصاب',
  vessels: 'الأوعية الدموية'
};

function selectedPathology() {
  return DENTAL_PATHOLOGIES.find(item => item.id === pathologyConditionElement?.value) || null;
}

function renderPathologyCategories() {
  if (!pathologyCategoryElement) return;
  pathologyCategoryElement.replaceChildren();
  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = 'كل مجموعات الأمراض';
  pathologyCategoryElement.appendChild(all);
  for (const category of PATHOLOGY_CATEGORIES) {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.label;
    pathologyCategoryElement.appendChild(option);
  }
}

function renderPathologyConditionOptions() {
  if (!pathologyConditionElement) return;
  const categoryId = pathologyCategoryElement?.value || 'all';
  const query = (pathologySearchElement?.value || '').trim().toLocaleLowerCase('ar');
  const previousId = pathologyConditionElement.value;
  const available = DENTAL_PATHOLOGIES.filter(condition => {
    const matchesCategory = categoryId === 'all' || condition.category === categoryId;
    const text = [condition.name, condition.summary, condition.id].join(' ').toLocaleLowerCase('ar');
    return matchesCategory && (!query || text.includes(query));
  });

  pathologyConditionElement.replaceChildren();
  for (const condition of available) {
    const option = document.createElement('option');
    option.value = condition.id;
    option.textContent = condition.name;
    pathologyConditionElement.appendChild(option);
  }
  if (!available.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'لا توجد نتائج مطابقة';
    option.disabled = true;
    pathologyConditionElement.appendChild(option);
  } else {
    pathologyConditionElement.value = available.some(item => item.id === previousId)
      ? previousId
      : available[0].id;
  }
  updatePathologyDetails();
}

function renderPathologyTargets(condition) {
  if (!pathologyTargetElement || !condition) return;
  const previousValue = pathologyTargetElement.value;
  pathologyTargetElement.replaceChildren();

  if (condition.target === 'bone') {
    const targets = [
      ['mandible', 'عظم الفك السفلي'],
      ['maxilla', 'عظم الفك العلوي والحنك']
    ];
    for (const [value, label] of targets) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      pathologyTargetElement.appendChild(option);
    }
    pathologyTargetElement.value = targets.some(item => item[0] === previousValue)
      ? previousValue
      : 'mandible';
    return;
  }

  if (condition.target === 'oral-soft') {
    const targets = [
      ['gum-upper', 'اللثة العلوية – موضع بديل للمخاطية'],
      ['gum-lower', 'اللثة السفلية – موضع بديل للمخاطية'],
      ['palate', 'الحنك العظمي – موضع بديل']
    ];
    for (const [value, label] of targets) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      pathologyTargetElement.appendChild(option);
    }
    pathologyTargetElement.value = targets.some(item => item[0] === previousValue)
      ? previousValue
      : 'gum-upper';
    return;
  }

  const teeth = anatomyCatalog.filter(item => item.sourceId && item.arch && item.layer === 'teeth');
  const allOption = document.createElement('option');
  allOption.value = 'all-teeth';
  allOption.textContent = 'كل الأسنان (28 سنًا)';
  pathologyTargetElement.appendChild(allOption);

  for (const tooth of teeth) {
    const record = clinicalRecords[tooth.sourceId] || {};
    const fdi = record.fdi ? 'FDI ' + record.fdi + ' — ' : '';
    const universal = record.universal ? ' / Universal ' + record.universal : '';
    const option = document.createElement('option');
    option.value = tooth.sourceId;
    option.textContent = fdi + tooth.label + universal;
    pathologyTargetElement.appendChild(option);
  }

  const currentTooth = anatomyCatalog.find(item => item.id === selectedStructureId && item.sourceId && item.arch);
  const validPrevious = previousValue === 'all-teeth' || teeth.some(item => item.sourceId === previousValue);
  pathologyTargetElement.value = validPrevious
    ? previousValue
    : currentTooth?.sourceId || teeth[0]?.sourceId || 'all-teeth';
  allOption.hidden = !condition.allowAllTeeth;
  if (!condition.allowAllTeeth && pathologyTargetElement.value === 'all-teeth') {
    pathologyTargetElement.value = currentTooth?.sourceId || teeth[0]?.sourceId || '';
  }
}

function updatePathologyDetails() {
  const condition = selectedPathology();
  if (!condition) {
    if (pathologyNameElement) pathologyNameElement.textContent = 'اختر حالة مرضية';
    if (pathologySummaryElement) pathologySummaryElement.textContent = 'لا توجد حالة مطابقة للبحث الحالي.';
    return;
  }

  if (pathologyNameElement) pathologyNameElement.textContent = condition.name;
  if (pathologySummaryElement) pathologySummaryElement.textContent = condition.summary;
  if (pathologySymptomsElement) pathologySymptomsElement.textContent = condition.symptoms;
  if (pathologySignsElement) pathologySignsElement.textContent = condition.signs;
  if (pathologyRadiographicElement) pathologyRadiographicElement.textContent = condition.radiographic;
  if (pathologyTissuesElement) {
    pathologyTissuesElement.textContent = condition.layers
      .map(layer => PATHOLOGY_TISSUE_LABELS[layer] || layer)
      .join('، ');
  }
  if (pathologyCautionElement) {
    pathologyCautionElement.textContent = condition.caution || '';
    pathologyCautionElement.hidden = !condition.caution;
  }

  renderPathologyTargets(condition);
  if (pathologyStageElement) {
    const previousStage = Number(pathologyStageElement.value || 0);
    pathologyStageElement.replaceChildren();
    condition.stages.forEach((stage, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = stage.name + ' — ' + stage.description;
      pathologyStageElement.appendChild(option);
    });
    pathologyStageElement.value = String(Math.min(previousStage, condition.stages.length - 1));
  }
  updatePathologySeverity();
}

function updatePathologySeverity() {
  if (!pathologySeverityInput || !pathologySeverityValue) return;
  const value = Math.max(1, Math.min(4, Number(pathologySeverityInput.value) || 1));
  pathologySeverityValue.textContent = value + ' / 4';
}

function setPathologyAvailability(available) {
  if (pathologyApplyButton) {
    pathologyApplyButton.disabled = !available;
    pathologyApplyButton.title = available ? '' : 'يتطلب تشغيل محرك الأمراض تحميل نموذج CBCT الكامل.';
  }
  if (pathologyTargetElement && !available) pathologyTargetElement.disabled = true;
  else if (pathologyTargetElement) pathologyTargetElement.disabled = false;
}

function initializePathologyControls() {
  renderPathologyCategories();
  renderPathologyConditionOptions();
  setPathologyAvailability(clinicalModelActive);
  renderActivePathologies();
}

function pathologyTargetLabel(state) {
  if (state.condition.target === 'bone') {
    return state.targetValue === 'maxilla' ? 'عظم الفك العلوي والحنك' : 'عظم الفك السفلي';
  }
  if (state.condition.target === 'oral-soft') {
    return ({
      'gum-upper': 'اللثة العلوية (موضع بديل)',
      'gum-lower': 'اللثة السفلية (موضع بديل)',
      palate: 'الحنك (موضع بديل)'
    })[state.targetValue] || 'أنسجة رخوة';
  }
  if (state.toothSourceIds?.length) return 'كل الأسنان (' + state.toothSourceIds.length + ')';
  const tooth = anatomyCatalog.find(item => item.sourceId === state.toothSourceId);
  return tooth?.label || state.toothSourceId || 'سن غير محدد';
}

function revealPathologyLayers(layers) {
  for (const layer of layers || []) {
    if (clinicalStructureData?.layers?.[layer]) layerVisibility.set(layer, true);
  }
  if (layerControlsElement) {
    layerControlsElement.querySelectorAll('input[data-layer]').forEach(input => {
      input.checked = isLayerVisible(input.dataset.layer);
    });
  }
  applyLayerVisibility();
}

function renderActivePathologyVisuals() {
  if (!clinicalModelActive) return;
  const result = pathologyRenderer.render(activePathologyCases, {
    meshes: anatomyMeshes,
    records: clinicalRecords,
    catalog: anatomyCatalog
  });
  if (canvas) canvas.dataset.pathologyEffects = String(result.effects);
  if (canvas) canvas.dataset.activePathologies = String(activePathologyCases.length);
  document.body.dataset.activePathologies = String(activePathologyCases.length);
}

function renderActivePathologies() {
  if (!activePathologiesElement) return;
  activePathologiesElement.replaceChildren();
  if (pathologyCountElement) pathologyCountElement.textContent = activePathologyCases.length + ' حالة نشطة';
  if (pathologyAdvanceButton) pathologyAdvanceButton.disabled = activePathologyCases.length === 0;

  if (!activePathologyCases.length) {
    const empty = document.createElement('p');
    empty.className = 'pathology-empty';
    empty.textContent = 'لم تتم إضافة حالات مرضية بعد.';
    activePathologiesElement.appendChild(empty);
    return;
  }

  for (const state of activePathologyCases) {
    const card = document.createElement('article');
    card.className = 'pathology-case';
    card.dataset.caseId = state.caseId;
    card.dataset.pathologyId = state.condition.id;

    const title = document.createElement('strong');
    title.textContent = state.condition.name;

    const details = document.createElement('small');
    details.textContent = pathologyTargetLabel(state) + ' • ' +
      state.stage.name + ' • شدة المظهر ' + state.severity + ' / 4';

    const actions = document.createElement('div');
    actions.className = 'pathology-case-actions';

    const advance = document.createElement('button');
    advance.type = 'button';
    advance.dataset.pathologyAdvance = state.caseId;
    advance.textContent = state.stageIndex >= state.condition.stages.length - 1 ? 'آخر مرحلة' : 'تطوير المرحلة';
    advance.disabled = state.stageIndex >= state.condition.stages.length - 1 && state.severity >= 4;
    advance.addEventListener('click', () => advancePathologyCase(state.caseId));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.dataset.pathologyRemove = state.caseId;
    remove.textContent = 'إزالة الحالة';
    remove.addEventListener('click', () => removePathologyCase(state.caseId));

    actions.append(advance, remove);
    card.append(title, details, actions);
    activePathologiesElement.appendChild(card);
  }
}

function refreshPathologySimulation() {
  renderActivePathologyVisuals();
  renderActivePathologies();
}

function applySelectedPathology() {
  if (!clinicalModelActive) {
    setStatus('تعذر تطبيق الحالة دون تحميل نموذج CBCT الكامل.', 'warn');
    return;
  }
  const condition = selectedPathology();
  if (!condition) return;

  const targetValue = pathologyTargetElement?.value || '';
  const stageIndex = Math.max(0, Math.min(condition.stages.length - 1, Number(pathologyStageElement?.value || 0)));
  const severity = Math.max(1, Math.min(4, Number(pathologySeverityInput?.value || 2)));
  const state = {
    caseId: String(nextPathologyCaseId++),
    condition,
    targetValue,
    stageIndex,
    stage: condition.stages[stageIndex],
    severity,
    toothSourceId: condition.target === 'tooth' && targetValue !== 'all-teeth' ? targetValue : null,
    toothSourceIds: condition.target === 'tooth' && targetValue === 'all-teeth'
      ? anatomyCatalog.filter(item => item.sourceId && item.arch && item.layer === 'teeth').map(item => item.sourceId)
      : null
  };

  if (condition.target === 'tooth' && !state.toothSourceId && !state.toothSourceIds?.length) {
    setStatus('لا توجد أسنان متاحة لتطبيق هذه الحالة.', 'warn');
    return;
  }

  activePathologyCases.push(state);
  selectedPathologyCaseId = state.caseId;
  revealPathologyLayers(condition.layers);
  refreshPathologySimulation();

  if (state.toothSourceId) {
    const tooth = anatomyCatalog.find(item => item.sourceId === state.toothSourceId);
    if (tooth) selectStructure(tooth.id);
  }

  setStatus('تم تطبيق ' + condition.name + ' على المجسم ثلاثي الأبعاد.', 'ok');
}

function advancePathologyCase(caseId) {
  const state = activePathologyCases.find(item => item.caseId === caseId);
  if (!state) return;
  if (state.stageIndex < state.condition.stages.length - 1) {
    state.stageIndex++;
    state.stage = state.condition.stages[state.stageIndex];
  } else if (state.severity < 4) {
    state.severity++;
  } else {
    setStatus('وصلت الحالة إلى أقصى شدة عرض في هذا النموذج.', 'warn');
    return;
  }
  selectedPathologyCaseId = state.caseId;
  refreshPathologySimulation();
}

function removePathologyCase(caseId) {
  activePathologyCases = activePathologyCases.filter(item => item.caseId !== caseId);
  if (selectedPathologyCaseId === caseId) selectedPathologyCaseId = activePathologyCases.at(-1)?.caseId || null;
  refreshPathologySimulation();
}

function advanceLatestPathology() {
  const state = activePathologyCases.at(-1);
  if (state) advancePathologyCase(state.caseId);
}

function clearAllPathologies() {
  activePathologyCases = [];
  selectedPathologyCaseId = null;
  pathologyRenderer.clear();
  if (canvas) {
    canvas.dataset.pathologyEffects = '0';
    canvas.dataset.activePathologies = '0';
  }
  document.body.dataset.activePathologies = '0';
  renderActivePathologies();
  setStatus('تمت إزالة جميع الحالات المرضية من المجسم.', 'ok');
}

function attachPathologyControls() {
  pathologyCategoryElement?.addEventListener('change', renderPathologyConditionOptions);
  pathologySearchElement?.addEventListener('input', renderPathologyConditionOptions);
  pathologyConditionElement?.addEventListener('change', updatePathologyDetails);
  pathologySeverityInput?.addEventListener('input', updatePathologySeverity);
  pathologyStageElement?.addEventListener('change', () => {});
  pathologyApplyButton?.addEventListener('click', applySelectedPathology);
  pathologyAdvanceButton?.addEventListener('click', advanceLatestPathology);
  pathologyClearButton?.addEventListener('click', clearAllPathologies);
}

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
  targetJawAngleRadians = jawRotationSign * (angle + closedJawCorrectionDegrees) * Math.PI / 180;
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

function registerJawPivot(pivot, movingNodes, rotationSign, closedCorrectionDegrees = 0, occlusion = null) {
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
  closedJawCorrectionDegrees = Number.isFinite(closedCorrectionDegrees) ? closedCorrectionDegrees : 0;
  jawOcclusionCalibration = occlusion;
  if (jawAngleStatus) {
    jawAngleStatus.dataset.jointReady = 'true';
    jawAngleStatus.dataset.closedCorrectionDegrees = closedJawCorrectionDegrees.toFixed(3);
    jawAngleStatus.dataset.occlusionPairs = String(occlusion?.pairCount || 0);
    jawAngleStatus.dataset.occlusionInitialGap = Number.isFinite(occlusion?.initialGap)
      ? occlusion.initialGap.toFixed(5) : '';
    jawAngleStatus.dataset.occlusionGap = Number.isFinite(occlusion?.residualGap)
      ? occlusion.residualGap.toFixed(5) : '';
  }
  updateJawAngle(Number(jawAngleInput?.value || 0));
  if (jawAngleInput) jawAngleInput.disabled = false;
  for (const button of jawPresetButtons) button.disabled = false;
  if (jawAngleStatus) {
    jawAngleStatus.textContent = occlusion?.pairCount
      ? 'تمت معايرة وضع الإغلاق من ' + occlusion.pairCount + ' زوجًا من الأسنان. حرّك المؤشر للفتح.'
      : 'تعذر قياس تلامس الأسنان؛ الحركة تبدأ من وضع التصوير الأصلي.';
  }
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

function getOcclusalPoint(mesh, arch) {
  const positions = mesh?.getVerticesData?.('position');
  if (!positions?.length) return null;
  mesh.computeWorldMatrix(true);
  const world = mesh.getWorldMatrix();

  let extremeY = arch === 'maxillary' ? Infinity : -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const point = Vector3.TransformCoordinates(
      new Vector3(positions[i], positions[i + 1], positions[i + 2]),
      world
    );
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    extremeY = arch === 'maxillary'
      ? Math.min(extremeY, point.y)
      : Math.max(extremeY, point.y);
  }

  if (!Number.isFinite(extremeY)) return null;
  const tolerance = Math.max((maxY - minY) * 0.025, 0.0015);
  const sum = Vector3.Zero();
  let count = 0;
  for (let i = 0; i < positions.length; i += 3) {
    const point = Vector3.TransformCoordinates(
      new Vector3(positions[i], positions[i + 1], positions[i + 2]),
      world
    );
    const nearOcclusal = arch === 'maxillary'
      ? point.y <= extremeY + tolerance
      : point.y >= extremeY - tolerance;
    if (!nearOcclusal) continue;
    sum.addInPlace(point);
    count++;
  }
  return count ? sum.scaleInPlace(1 / count) : null;
}

function collectOpposingOcclusalPairs(meshes) {
  const surfaces = new Map();
  const toothFallbacks = new Map();

  for (const mesh of meshes) {
    const record = clinicalRecords[mesh.name];
    if (!record?.arch || !record?.side || !Number.isFinite(Number(record.position))) continue;
    const toothId = record.layer === 'teeth' ? mesh.name : record.tooth;
    if (!toothId) continue;
    const key = toothId;
    const entry = {
      mesh,
      arch: record.arch,
      side: record.side,
      position: Number(record.position)
    };

    if (record.layer === 'teeth') toothFallbacks.set(key, entry);
    else if (record.layer === 'enamel' || record.layer === 'prosthetic') {
      // Enamel is the true outer surface for natural crowns; prosthetic crowns
      // replace it on the two restored teeth in this scan.
      surfaces.set(key, entry);
    }
  }

  const upper = new Map();
  const lower = new Map();
  for (const [toothId, entry] of toothFallbacks) {
    if (!surfaces.has(toothId)) surfaces.set(toothId, entry);
  }

  for (const entry of surfaces.values()) {
    const point = getOcclusalPoint(entry.mesh, entry.arch);
    if (!point) continue;
    const key = entry.side + ':' + entry.position;
    (entry.arch === 'maxillary' ? upper : lower).set(key, point);
  }

  const pairs = [];
  for (const [key, upperPoint] of upper) {
    const lowerPoint = lower.get(key);
    if (lowerPoint) pairs.push({ upper: upperPoint, lower: lowerPoint });
  }
  return pairs;
}

function createImportedJawPivot() {
  if (!anatomyRoot) return false;

  let movingNodes = [];
  let mandibleMeshes = [];
  let incisors = [];
  if (clinicalModelActive) {
    movingNodes = collectMandibularMeshes(anatomyMeshes, clinicalRecords, LOWER_NEUROVASCULAR_IDS);
    mandibleMeshes = anatomyMeshes.filter(mesh => {
      const record = clinicalRecords[mesh.name];
      return record && (record.layer === 'mandible' || record.layer === 'ramus');
    });
    incisors = anatomyMeshes.filter(mesh => {
      const record = clinicalRecords[mesh.name];
      return record?.layer === 'teeth' &&
        record.arch === 'mandibular' &&
        record.position === 1;
    });
  } else {
    const lowerIds = anatomyCatalog
      .filter(item => item.id.startsWith('lower-') || item.id === 'mandible' || item.id === 'lower-gum')
      .map(item => item.id);
    movingNodes = lowerIds.flatMap(id => meshesForStructure(id));
    mandibleMeshes = meshesForStructure('mandible');
    incisors = [
      ...meshesForStructure('lower-left-central-incisor'),
      ...meshesForStructure('lower-right-central-incisor')
    ];
  }

  const uniqueNodes = [...new Set(movingNodes)];
  if (!uniqueNodes.length) return false;

  // Track the visible enamel of a lower tooth where available. This is also a
  // browser-test probe: it proves the rendered crown follows the rotating jaw,
  // rather than only proving that the pivot angle changed.
  jawMotionProbeMesh = uniqueNodes.find(mesh => {
    const record = clinicalRecords[mesh.name];
    return record?.layer === 'enamel' &&
      record.tooth &&
      clinicalRecords[record.tooth]?.arch === 'mandibular';
  }) || uniqueNodes.find(mesh => {
    const record = clinicalRecords[mesh.name];
    return record?.layer === 'teeth' && record.arch === 'mandibular';
  }) || null;

  if (jawAngleStatus && clinicalModelActive) {
    const lowerToothMeshes = uniqueNodes.filter(mesh => {
      const record = clinicalRecords[mesh.name];
      return record?.layer === 'teeth' && record.arch === 'mandibular';
    });
    const attachedToothMeshes = uniqueNodes.filter(mesh => {
      const record = clinicalRecords[mesh.name];
      return Boolean(record?.tooth && clinicalRecords[record.tooth]?.arch === 'mandibular');
    });
    jawAngleStatus.dataset.lowerToothMeshes = String(lowerToothMeshes.length);
    jawAngleStatus.dataset.attachedToothMeshes = String(attachedToothMeshes.length);
    jawAngleStatus.dataset.movingMeshCount = String(uniqueNodes.length);
  }
  const jawBounds = worldBoundsForMeshes(mandibleMeshes.length ? mandibleMeshes : uniqueNodes);
  if (!jawBounds) return false;

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

  const rotationSign = frontIsMinZ ? -1 : 1;
  const occlusionPairs = collectOpposingOcclusalPairs(anatomyMeshes);
  const occlusion = estimateClosedJawCorrection(occlusionPairs, hingeWorld, {
    targetGap: 0.0025,
    maxCorrectionDegrees: 25
  });
  const uiCorrectionDegrees = occlusion.angleRadians * rotationSign * 180 / Math.PI;

  return registerJawPivot(pivot, uniqueNodes, rotationSign, uiCorrectionDegrees, occlusion);
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
  const sourceMeshes = meshes && meshes.length
    ? meshes
    : anatomyMeshes.filter(mesh => mesh.isVisible);
  const candidates = sourceMeshes
    .filter(mesh => mesh && mesh.getTotalVertices && mesh.getTotalVertices() > 0 && mesh.isEnabled() && mesh.isVisible);
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
  const radius = Math.max(max.subtract(min).length() * 0.72, 2.1);
  camera.setTarget(center);
  camera.radius = radius;
  camera.lowerRadiusLimit = Math.max(1.1, radius * 0.52);
  camera.upperRadiusLimit = Math.max(10, radius * 2.5);
}

function groupForStructure(item) {
  if (item.group) return item.group;
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
  let visibleCount = 0;
  for (const [groupName, items] of groups) {
    const heading = document.createElement('div');
    heading.className = 'anatomy-group-title';
    heading.textContent = groupName;
    structureListElement.appendChild(heading);
    for (const item of items) {
      visibleCount++;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'structure-button';
      button.dataset.structure = item.id;
      button.textContent = item.label || item.id;
      button.addEventListener('click', () => selectStructure(item.id));
      structureListElement.appendChild(button);
    }
  }
  if (structureCountElement) {
    structureCountElement.textContent = query
      ? visibleCount + ' نتيجة'
      : anatomyCatalog.length + ' تركيبًا';
  }
}

function meshesForStructure(id) {
  const item = anatomyCatalog.find(record => record.id === id);
  if (clinicalModelActive) {
    const sourceId = item?.sourceId || id;
    return anatomyMeshes.filter(mesh => {
      const record = clinicalRecords[mesh.name];
      return mesh.name === sourceId || record?.tooth === sourceId;
    });
  }
  const legacyIds = item?.legacyIds?.length ? item.legacyIds : [id];
  return anatomyMeshes.filter(mesh => {
    const name = mesh.name || '';
    return legacyIds.some(legacyId =>
      name === legacyId ||
      name.startsWith(legacyId + '_') ||
      mesh.metadata?.structureId === legacyId
    );
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
  if (item.sourceId && item.arch && pathologyTargetElement && selectedPathology()?.target === 'tooth') {
    pathologyTargetElement.value = item.sourceId;
  }
  clearHighlights();
  for (const mesh of selectedMeshes) {
    if (mesh.isVisible) highlight.addMesh(mesh, Color3.FromHexString('#47d4bd'));
  }
  const provenanceTier = item.clinicalRecord?.provenance?.tier;
  const provenanceText = {
    measured: 'هندسة مستخرجة مباشرة من تصوير CBCT.',
    derived: 'هندسة مشتقة من قياسات التصوير ومراجع تشريحية.',
    schematic: 'تمثيل تشريحي توضيحي مستند إلى مراجع، وليس ظاهرًا مباشرة في التصوير.'
  }[provenanceTier] || '';
  const detail = selectedMeshes.length
    ? ['تم تحديد التركيب داخل النموذج ثلاثي الأبعاد.', provenanceText].filter(Boolean).join(' ')
    : 'تم تحديد الاسم في الدليل؛ تعذر مطابقة مجسم مستقل له في الملف الحالي.';
  setSelection(item.label || id, detail);
  isolateButton.disabled = selectedMeshes.length === 0;
  structureListElement?.querySelectorAll('.structure-button').forEach(button => {
    button.classList.toggle('selected', button.dataset.structure === id);
  });
  const visibleSelected = selectedMeshes.filter(mesh => mesh.isVisible);
  if (visibleSelected.length) frameMeshes(visibleSelected);
}

function isolateSelected() {
  if (!selectedMeshes.length) return;
  const visibleSet = new Set(selectedMeshes);
  for (const mesh of anatomyMeshes) {
    const record = clinicalRecords[mesh.name];
    const enabled = !clinicalModelActive || !record || isLayerVisible(record.layer);
    mesh.isVisible = visibleSet.has(mesh) && enabled;
  }
  allMeshesVisible = false;
}

function restoreAll() {
  if (clinicalModelActive) applyLayerVisibility();
  else for (const mesh of anatomyMeshes) mesh.isVisible = true;
  allMeshesVisible = true;
  if (selectedStructureId) {
    for (const mesh of selectedMeshes) {
      if (mesh.isVisible) highlight.addMesh(mesh, Color3.FromHexString('#47d4bd'));
    }
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
  const clinicalUrl = new URL('models/clinical-teeth.json', baseUrl);
  try {
    const response = await fetch(catalogUrl);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) throw new Error('Invalid anatomy catalogue');
    anatomyCatalog = payload;
  } catch (error) {
    console.warn('Could not load the anatomy catalogue; using the embedded list.', error);
    anatomyCatalog = [];
  }

  try {
    const response = await fetch(clinicalUrl);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const payload = await response.json();
    if (payload?.source !== 'cbct' || !payload.structures || !payload.layers) {
      throw new Error('The clinical anatomy metadata is incomplete.');
    }
    clinicalStructureData = payload;
    clinicalRecords = payload.structures;
    layerVisibility.clear();
    for (const [key, config] of Object.entries(payload.layers)) {
      layerVisibility.set(key, Boolean(config.visible));
    }
    for (const item of anatomyCatalog) {
      const record = clinicalRecords[item.sourceId] || null;
      item.clinicalRecord = record;
      if (record) {
        item.position = record.position;
        item.type = record.type;
        item.fdi = record.fdi;
        item.universal = record.universal;
      }
    }
  } catch (error) {
    console.warn('CBCT structure metadata unavailable; legacy anatomy will be used.', error);
    clinicalStructureData = null;
    clinicalRecords = {};
    layerVisibility.clear();
  }

  renderStructureList('');
  renderLayerControls();
  initializePathologyControls();
}

function attachCenteredContainer(container) {
  container.addAllToScene();
  const renderMeshes = container.meshes.filter(mesh =>
    mesh.getTotalVertices && mesh.getTotalVertices() > 0 && mesh.getBoundingInfo
  );
  if (!renderMeshes.length) throw new Error('The anatomy GLB contains no renderable meshes.');

  for (const mesh of renderMeshes) mesh.computeWorldMatrix(true);
  const framingMeshes = clinicalModelActive
    ? renderMeshes.filter(mesh => {
      const record = clinicalRecords[mesh.name];
      return record && DEFAULT_FRAME_LAYERS.has(record.layer);
    })
    : renderMeshes;
  const boundsMeshes = framingMeshes.length ? framingMeshes : renderMeshes;
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of boundsMeshes) {
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
  if (clinicalModelActive) applyLayerVisibility();
  return anatomyMeshes;
}

async function loadOralAnatomy() {
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.href);
  const localRoot = new URL('models/', baseUrl).href;

  if (clinicalStructureData) {
    try {
      anatomyContainer = await SceneLoader.LoadAssetContainerAsync(localRoot, 'clinical-dentition.glb', scene);
      clinicalModelActive = true;
      attachCenteredContainer(anatomyContainer);
      renderLayerControls();
      if (!createImportedJawPivot()) {
        setStatus('تم تحميل نموذج CBCT، لكن تعذر تهيئة حركة الفك السفلي.', 'warn');
      } else {
        setStatus('تم تحميل تشريح الأسنان من تصوير CBCT. يمكنك فحص طبقات السن واللثة والعظم.', 'ok');
      }
      setPathologyAvailability(true);
      frameMeshes();
      loadingOverlay?.classList.add('hidden');
      return;
    } catch (clinicalError) {
      console.warn('The CBCT-derived model could not be loaded; trying the legacy model.', clinicalError);
      clinicalModelActive = false;
      setPathologyAvailability(false);
      anatomyContainer = null;
      layerControlsElement?.closest('.layers-section')?.setAttribute('hidden', '');
    }
  }

  try {
    anatomyContainer = await SceneLoader.LoadAssetContainerAsync(localRoot, 'oral-anatomy.glb', scene);
    attachCenteredContainer(anatomyContainer);
    setPathologyAvailability(false);
    if (!createImportedJawPivot()) {
      setStatus('تم تحميل النموذج الأساسي، لكن تعذر تهيئة حركة الفك السفلي.', 'warn');
    } else {
      setStatus('تم تحميل نموذج تشريح الفم الأساسي. يمكنك تغيير زاوية فتح الفك السفلي.', 'ok');
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
      clinicalModelActive = false;
      setPathologyAvailability(false);
      makeFallbackModel();
      anatomyMeshes = fallbackRoot.getChildMeshes(false);
      setStatus('تعذر تحميل الملفات الخارجية؛ تم إنشاء نموذج تشريحي بديل مبسط داخل المشهد.', 'warn');
    }
  }
  renderLayerControls();
  frameMeshes();
  loadingOverlay?.classList.add('hidden');
}

function findStructureForMesh(mesh) {
  let node = mesh;
  while (node) {
    if (clinicalModelActive) {
      const record = clinicalRecords[node.name];
      if (record) {
        const baseToothId = record.tooth || (record.layer === 'teeth' ? node.name : null);
        if (baseToothId) {
          const toothItem = anatomyCatalog.find(item => item.sourceId === baseToothId);
          if (toothItem) return toothItem;
        }
        const directItem = anatomyCatalog.find(item => item.sourceId === node.name);
        if (directItem) return directItem;
      }
    } else {
      const id = node.metadata?.structureId || node.name;
      const item = anatomyCatalog.find(record =>
        id === record.id ||
        id.startsWith(record.id + '_') ||
        record.legacyIds?.some(legacyId => id === legacyId || id.startsWith(legacyId + '_'))
      );
      if (item) return item;
    }
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

attachPathologyControls();

jawAngleInput?.addEventListener('input', event => updateJawAngle(event.target.value));
for (const button of jawPresetButtons) {
  button.addEventListener('click', () => updateJawAngle(button.dataset.jawAngle));
}

const testRenderMode = window.__DENTAL_SIM_TEST__ === true;
const compactDevice = window.matchMedia('(max-width: 760px)').matches ||
  (navigator.hardwareConcurrency || 4) <= 4;
engine.setHardwareScalingLevel(testRenderMode ? 2 : compactDevice ? 1.25 : 1);
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
      const modelAngle = mandiblePivot.rotation.x * jawRotationSign * 180 / Math.PI;
      const currentAngle = modelAngle - closedJawCorrectionDegrees;
      jawAngleStatus.dataset.currentAngle = currentAngle.toFixed(2);
      jawAngleStatus.dataset.modelAngle = modelAngle.toFixed(2);
      if (jawMotionProbeMesh) {
        jawMotionProbeMesh.computeWorldMatrix(true);
        const position = jawMotionProbeMesh.getAbsolutePosition();
        jawAngleStatus.dataset.jawProbePosition =
          [position.x, position.y, position.z].map(value => value.toFixed(5)).join(',');
      }
    }
  }
  if (!testRenderMode) scene.render();
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
