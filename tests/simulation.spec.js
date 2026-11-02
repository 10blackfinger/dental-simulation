import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.__DENTAL_SIM_TEST__ = true; });
});

async function triggerPathologyApply(page) {
  await Promise.race([
    page.locator('#apply-pathology').evaluate(button => button.click()),
    new Promise((_, reject) => setTimeout(
      () => reject(new Error('Applying a pathology effect blocked the browser for more than 20 seconds.')),
      20000
    ))
  ]);
}

test('the clean workspace exposes only the core oral anatomy experience', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => { pageErrors.push(error.stack || error.message); console.log('[browser pageerror]', error.stack || error.message); });
  page.on('console', message => { if (message.type() === 'error') console.log('[browser console error]', message.text()); });
  page.on('requestfailed', request => console.log('[browser request failed]', request.url(), request.failure()?.errorText || 'unknown'));

  await page.goto('/');
  await expect(page.locator('#render-canvas')).toBeVisible();
  await expect(page.locator('#structure-list .structure-button')).toHaveCount(32);
  await expect(page.locator('#asset-status')).toContainText(/تم تحميل|تم إنشاء|تعذر تحميل/, { timeout: 90000 });
  await expect(page.locator('#layer-controls .layer-toggle')).toHaveCount(13);
  const enamelLayer = page.locator('#layer-controls input[data-layer="enamel"]');
  await expect(enamelLayer).toBeChecked();
  await enamelLayer.uncheck();
  await expect(enamelLayer).not.toBeChecked();
  await enamelLayer.check();
  await expect(enamelLayer).toBeChecked();

  await expect(page.locator('#jaw-angle')).toBeEnabled();
  await expect(page.locator('#jaw-angle-status')).toHaveAttribute('data-joint-ready', 'true');
  await expect(page.locator('#jaw-angle-status')).toHaveAttribute('data-lower-tooth-meshes', '14');
  await expect.poll(async () => Number(await page.locator('#jaw-angle-status').getAttribute('data-attached-tooth-meshes'))).toBeGreaterThan(0);
  await expect.poll(async () => Boolean(await page.locator('#jaw-angle-status').getAttribute('data-jaw-probe-position'))).toBeTruthy();
  const closedToothPosition = (await page.locator('#jaw-angle-status').getAttribute('data-jaw-probe-position')).split(',').map(Number);

  await page.locator('[data-jaw-angle="30"]').click();
  await expect(page.locator('#jaw-angle')).toHaveValue('30');
  await expect(page.locator('#jaw-angle-value')).toHaveText('30°');
  await expect.poll(async () => Number(await page.locator('#jaw-angle-status').getAttribute('data-current-angle'))).toBeGreaterThan(29);
  const openToothPosition = await page.waitForFunction(() => {
    const raw = document.querySelector('#jaw-angle-status')?.dataset.jawProbePosition;
    if (!raw) return null;
    const current = raw.split(',').map(Number);
    return current;
  }).then(handle => handle.jsonValue());
  expect(Math.hypot(...openToothPosition.map((value, index) => value - closedToothPosition[index]))).toBeGreaterThan(0.05);
  await page.locator('#jaw-angle').evaluate(input => {
    input.value = '17';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#jaw-angle-value')).toHaveText('17°');
  await page.locator('[data-jaw-angle="0"]').click();
  await expect(page.locator('#jaw-angle')).toHaveValue('0');
  await expect(page.locator('#jaw-angle-value')).toHaveText('0°');
  await expect.poll(async () => Math.abs(Number(await page.locator('#jaw-angle-status').getAttribute('data-current-angle')))).toBeLessThan(1);
  const returnedToothPosition = (await page.locator('#jaw-angle-status').getAttribute('data-jaw-probe-position')).split(',').map(Number);
  expect(Math.hypot(...returnedToothPosition.map((value, index) => value - closedToothPosition[index]))).toBeLessThan(0.015);

  await page.locator('#anatomy-search').fill('القاطع المركزي');
  await expect(page.locator('#structure-list .structure-button')).toHaveCount(4);
  await page.locator('#structure-list .structure-button').first().click();
  await expect(page.locator('#selection-name')).toContainText('القاطع المركزي');
  await expect(page.locator('#selection-description')).toContainText('CBCT');



  await expect(page.locator('#view-treatment')).toHaveCount(0);
  await expect(page.locator('#view-clinic')).toHaveCount(0);
  await expect(page.locator('#view-people')).toHaveCount(0);
  await expect(page.locator('#view-dental-atlas')).toHaveCount(0);
  await expect(page.locator('#view-pediatric')).toHaveCount(0);
  await expect(page.locator('#view-body')).toHaveCount(0);
  await expect(page.locator('#patient-variant-controls')).toHaveCount(0);
  await expect(page.locator('#inventory-section')).toHaveCount(0);
  await expect(page.locator('.training-section')).toHaveCount(0);
  await expect(page.locator('#ai-assistant-section')).toHaveCount(0);
  await expect(page.locator('#chair-up')).toHaveCount(0);
  await expect(page.locator('#lamp-toggle')).toHaveCount(0);

  await page.locator('#restore-structures').click();
  await page.locator('#reset-camera').click();
  expect(pageErrors).toEqual([]);
});

test('pathology catalogue and disease details load in the browser', async ({ page }) => {
  page.on('pageerror', error => console.log('[pathology pageerror]', error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error') console.log('[pathology console error]', message.text()); });
  page.on('requestfailed', request => console.log('[pathology request failed]', request.url(), request.failure()?.errorText || 'unknown'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#asset-status')).toContainText(/تم تحميل|تم إنشاء|تعذر تحميل/, { timeout: 90000 });
  await expect(page.locator('#pathology-category option')).toHaveCount(9);
  await expect(page.locator('#pathology-condition option')).toHaveCount(108);
  await expect(page.locator('#apply-pathology')).toBeEnabled();

  await page.locator('#pathology-condition').selectOption('dentin-caries');
  await expect(page.locator('#pathology-name')).toContainText('تسوس ممتد إلى العاج');
  await expect(page.locator('#pathology-symptoms')).not.toBeEmpty();
  await expect(page.locator('#pathology-signs')).not.toBeEmpty();
  await expect(page.locator('#pathology-radiographic')).not.toBeEmpty();
  await expect(page.locator('#pathology-tissues')).toContainText('مينا الأسنان');
  await expect(page.locator('#pathology-target option')).toHaveCount(29);

  await page.locator('#pathology-category').selectOption('jaw-lesions');
  await page.locator('#pathology-condition').selectOption('dentigerous-cyst');
  await expect(page.locator('#pathology-name')).toContainText('كيس تاجي');
  await expect(page.locator('#pathology-target option')).toHaveCount(2);
  await expect(page.locator('#pathology-target')).toHaveValue('mandible');

  await page.locator('#pathology-category').selectOption('developmental');
  await page.locator('#pathology-condition').selectOption('impacted-tooth');
  await expect(page.locator('#pathology-name')).toContainText('سن مطمور');
  await page.locator('#pathology-category').selectOption('endodontic');
  await page.locator('#pathology-condition').selectOption('external-cervical-resorption');
  await expect(page.locator('#pathology-name')).toContainText('امتصاص جذري خارجي عنقي');

  await page.locator('#pathology-category').selectOption('caries');
  await page.locator('#pathology-condition').selectOption('deep-caries');
  await triggerPathologyApply(page);
  await expect(page.locator('#active-pathologies .pathology-case')).toHaveCount(1);
  await expect(page.locator('#pathology-count')).toContainText('1 حالة نشطة');
  await expect(page.locator('#render-canvas')).toHaveAttribute('data-active-pathologies', '1');
  await page.locator('[data-pathology-advance]').first().click();
  await expect(page.locator('#active-pathologies .pathology-case small')).toContainText(/شدة المظهر/);
  await page.locator('[data-pathology-remove]').first().click();
  await expect(page.locator('#active-pathologies .pathology-case')).toHaveCount(0);
  await expect(page.locator('#render-canvas')).toHaveAttribute('data-active-pathologies', '0');
});

test('the oral anatomy model and catalogue are published', async ({ page }) => {
  await page.goto('/');
  for (const asset of ['models/clinical-dentition.glb', 'models/clinical-teeth.json', 'models/environmentSpecular.env', 'models/oral-anatomy.glb', 'models/anatomy-structures.json']) {
    const response = await page.request.get(new URL(asset, page.url()).toString());
    expect(response.ok(), asset + ' should be published').toBeTruthy();
  }
});

test('the 3D workspace remains usable on a mobile-sized viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#render-canvas')).toBeVisible();
  await expect(page.locator('#anatomy-search')).toBeVisible();
  await expect(page.locator('#reset-camera')).toBeVisible();
  const canvasBox = await page.locator('#render-canvas').boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox.width).toBeGreaterThan(240);
  expect(canvasBox.height).toBeGreaterThan(240);
});
