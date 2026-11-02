import { test, expect } from '@playwright/test';

test('the clean workspace exposes only the core oral anatomy experience', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#render-canvas')).toBeVisible();
  await expect(page.locator('#structure-list .structure-button')).toHaveCount(33);
  await expect(page.locator('#asset-status')).toContainText(/تم تحميل|تم إنشاء|تعذر تحميل الملف الأصلي/, { timeout: 90000 });

  await expect(page.locator('#jaw-angle')).toBeEnabled();
  await page.locator('[data-jaw-angle="30"]').click();
  await expect(page.locator('#jaw-angle')).toHaveValue('30');
  await expect(page.locator('#jaw-angle-value')).toHaveText('30°');
  await page.locator('#jaw-angle').evaluate(input => {
    input.value = '17';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#jaw-angle-value')).toHaveText('17°');
  await page.locator('[data-jaw-angle="0"]').click();
  await expect(page.locator('#jaw-angle')).toHaveValue('0');
  await expect(page.locator('#jaw-angle-value')).toHaveText('0°');

  await page.locator('#anatomy-search').fill('القاطع المركزي');
  await expect(page.locator('#structure-list .structure-button')).toHaveCount(4);
  await page.locator('#structure-list .structure-button').first().click();
  await expect(page.locator('#selection-name')).toContainText('القاطع المركزي');

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
  for (const asset of ['models/oral-anatomy.glb', 'models/anatomy-structures.json']) {
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
