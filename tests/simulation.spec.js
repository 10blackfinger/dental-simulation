import { test, expect } from '@playwright/test';

test('the clean workspace exposes only the core oral anatomy experience', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

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
  await page.locator('[data-jaw-angle="30"]').click();
  await expect(page.locator('#jaw-angle')).toHaveValue('30');
  await expect(page.locator('#jaw-angle-value')).toHaveText('30°');
  await expect.poll(async () => Number(await page.locator('#jaw-angle-status').getAttribute('data-current-angle'))).toBeGreaterThan(29);
  await page.locator('#jaw-angle').evaluate(input => {
    input.value = '17';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#jaw-angle-value')).toHaveText('17°');
  await page.locator('[data-jaw-angle="0"]').click();
  await expect(page.locator('#jaw-angle')).toHaveValue('0');
  await expect(page.locator('#jaw-angle-value')).toHaveText('0°');
  await expect.poll(async () => Math.abs(Number(await page.locator('#jaw-angle-status').getAttribute('data-current-angle')))).toBeLessThan(1);

  await page.locator('#anatomy-search').fill('القاطع المركزي');
  await expect(page.locator('#structure-list .structure-button')).toHaveCount(4);
  await page.locator('#structure-list .structure-button').first().click();
  await expect(page.locator('#selection-name')).toContainText('القاطع المركزي');
  await expect(page.locator('#selection-description')).toContainText('CBCT');

  await expect(page.locator('#pathology-category option')).toHaveCount(9);
  await expect(page.locator('#pathology-condition option')).toHaveCount(78);
  await expect(page.locator('#apply-pathology')).toBeEnabled();
  await page.locator('#pathology-condition').selectOption('dentin-caries');
  await page.locator('#pathology-target').selectOption('FMA55681');
  await page.locator('#pathology-stage').selectOption('2');
  await page.locator('#pathology-severity').evaluate(input => { input.value = '3'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#apply-pathology').click();
  await expect(page.locator('#active-pathologies .pathology-case')).toHaveCount(1);
  await expect(page.locator('#active-pathologies .pathology-case')).toHaveAttribute('data-pathology-id', 'dentin-caries');
  await expect.poll(async () => Number(await page.locator('#render-canvas').getAttribute('data-pathology-effects'))).toBeGreaterThan(0);
  await page.locator('#pathology-category').selectOption('wear');
  await page.locator('#pathology-condition').selectOption('cracked-tooth');
  await page.locator('#pathology-target').selectOption('FMA55681');
  await page.locator('#apply-pathology').click();
  await expect(page.locator('#active-pathologies .pathology-case')).toHaveCount(2);
  await page.locator('[data-pathology-advance]').first().click();
  await expect(page.locator('#active-pathologies .pathology-case').first()).toContainText('شديد');
  await page.locator('[data-pathology-remove]').last().click();
  await expect(page.locator('#active-pathologies .pathology-case')).toHaveCount(1);
  await page.locator('#clear-pathologies').click();
  await expect(page.locator('#active-pathologies .pathology-case')).toHaveCount(0);
  await page.locator('#pathology-category').selectOption('jaw-lesions');
  await page.locator('#pathology-condition').selectOption('dentigerous-cyst');
  await page.locator('#pathology-target').selectOption('mandible');
  await page.locator('#apply-pathology').click();
  await expect(page.locator('#active-pathologies .pathology-case')).toHaveCount(1);
  await expect(page.locator('#active-pathologies .pathology-case')).toContainText('عظم الفك السفلي');
  await page.locator('#clear-pathologies').click();
  await expect(page.locator('#render-canvas')).toHaveAttribute('data-active-pathologies', '0');

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
