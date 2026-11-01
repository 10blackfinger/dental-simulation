import { test, expect } from '@playwright/test';

test('clinic, oral anatomy, people and training flow render without browser errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('./');
  await expect(page.locator('#asset-status')).toContainText('تم تحميل مشهد العيادة', { timeout: 45000 });
  await expect(page.locator('#view-treatment')).toHaveClass(/selected/);
  await expect(page.locator('#patient-model-status')).toContainText('تم تحميل المريض', { timeout: 30000 });
  await expect(page.locator('#patient-variant-controls')).toBeVisible();
  await expect(page.locator('#ai-assistant-section')).toBeVisible();
  await expect(page.locator('#scenario-select option')).toHaveCount(11);

  await page.locator('#inventory-category').selectOption('materials');
  await expect(page.locator('.inventory-item').filter({hasText:'راتنج كومبوزيت'})).toHaveCount(1);
  await page.locator('.inventory-item').filter({hasText:'راتنج كومبوزيت'}).click();
  await expect(page.locator('#inventory-detail')).toContainText('مادة');
  await page.locator('#tool-to-mouth').click();
  await page.locator('#tool-to-tray').click();
  await page.locator('#inventory-category').selectOption('exam');
  await page.locator('.inventory-item').filter({hasText:'مرآة فحص الأسنان'}).click();
  await page.locator('#patient-mouth-toggle').click();
  await page.locator('#patient-mouth-toggle').click();
  await page.locator('#tool-to-mouth').click();
  await page.locator('#tool-to-tray').click();

  await page.locator('#view-anatomy').click();
  await expect(page.locator('#asset-status')).toContainText('تم تحميل 33 تركيبًا تشريحيًا منفصلًا', { timeout: 45000 });
  await expect(page.locator('.structure-button')).toHaveCount(33);

  await page.locator('.structure-button').first().click();
  await expect(page.locator('#selection-name')).not.toBeEmpty();
  await page.locator('#isolate-structure').click();
  await page.locator('#restore-structures').click();

  await page.locator('#scenario-select').selectOption('exam');
  await page.locator('#start-case').click();
  for (let step = 0; step < 6; step += 1) {
    await page.locator('#next-step').click();
  }
  await expect(page.locator('#case-progress')).toContainText('اكتمل السيناريو التعليمي');

  await page.locator('#view-people').click();
  await expect(page.locator('#asset-status')).toContainText('وضع الشخصيات');
  await expect(page.locator('#view-people')).toHaveClass(/selected/);
  await expect(page.locator('#patient-model-status')).toContainText('تم تحميل المريض', { timeout: 30000 });
  await page.locator('#patient-female').click();
  await expect(page.locator('#patient-model-status')).toContainText('تم تحميل المريضة', { timeout: 30000 });
  await page.locator('#patient-male').click();
  await expect(page.locator('#patient-model-status')).toContainText('تم تحميل المريض', { timeout: 30000 });


  await page.locator('#view-dental-atlas').click();
  await expect(page.locator('#dental-atlas-status')).toContainText('الأطلس السني جاهز', { timeout: 60000 });
  await expect(page.locator('.tooth-chip')).toHaveCount(32);
  await page.locator('.tooth-chip').filter({hasText:'36'}).click();
  await expect(page.locator('#dental-tooth-mesh-status')).toContainText('مجسمات طبقية', { timeout: 60000 });
  await page.locator('[data-tooth-layer="pulp-chamber"]').uncheck();
  await page.locator('[data-tooth-layer="pulp-chamber"]').check();
  await page.locator('#dental-tooth-back').click();

  const bodyRegistryResponse = await page.request.get(new URL('models/ecorche-structures.json', page.url()).toString());
  expect(bodyRegistryResponse.ok()).toBeTruthy();
  const bodyRegistry = await bodyRegistryResponse.json();
  expect(bodyRegistry).toHaveLength(634);
  await page.locator('#view-clinic').click();
  await expect(page.locator('#asset-status')).toContainText('تم تحميل مشهد العيادة');
  await expect(page.locator('#view-clinic')).toHaveClass(/selected/);

  expect(pageErrors).toEqual([]);
});
