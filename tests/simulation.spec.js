import { test, expect } from '@playwright/test';

test('clinic, oral anatomy, people and training flow render without browser errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('./');
  await expect(page.locator('#asset-status')).toContainText('تم تحميل مشهد العيادة', { timeout: 45000 });

  await page.locator('#view-anatomy').click();
  await expect(page.locator('#asset-status')).toContainText('تم تحميل 33 تركيبًا تشريحيًا منفصلًا', { timeout: 45000 });
  await expect(page.locator('.structure-button')).toHaveCount(33);

  await page.locator('.structure-button').first().click();
  await expect(page.locator('#selection-name')).not.toBeEmpty();
  await page.locator('#isolate-structure').click();
  await page.locator('#restore-structures').click();

  await page.locator('#scenario-select').selectOption('exam');
  await page.locator('#start-case').click();
  for (let step = 0; step < 5; step += 1) {
    await page.locator('#next-step').click();
  }
  await expect(page.locator('#case-progress')).toContainText('اكتمل السيناريو التعليمي');

  await page.locator('#view-people').click();
  await expect(page.locator('#asset-status')).toContainText('وضع الشخصيات');
  await expect(page.locator('#view-people')).toHaveClass(/selected/);

  await page.locator('#view-dental-atlas').click();
  await expect(page.locator('#dental-atlas-status')).toContainText('تركيبًا مسجلًا', { timeout: 60000 });
  await expect(page.locator('.tooth-chip')).toHaveCount(32);
  await page.locator('.tooth-chip').filter({hasText:'36'}).click();
  await expect(page.locator('#dental-tooth-mesh-status')).toContainText('مجسمات طبقية', { timeout: 60000 });
  await page.locator('[data-tooth-layer="pulp-chamber"]').uncheck();
  await page.locator('[data-tooth-layer="pulp-chamber"]').check();
  await page.locator('#dental-tooth-back').click();

  await page.locator('#view-body').click();
  await expect(page.locator('#body-mesh-map-status')).toContainText('634 تركيبًا', { timeout: 45000 });
  await expect(page.locator('.body-structure-button')).toHaveCount(634);
  await page.locator('#body-search').fill('femur');
  await expect(page.locator('.body-structure-button').first()).toContainText(/femur/i);
  await page.locator('.body-structure-button').first().click();
  await page.locator('#body-isolate').click();
  await page.locator('#body-restore').click();
  await page.locator('#body-layer-superficial').uncheck();
  await page.locator('#body-layer-superficial').check();

  await page.locator('#view-clinic').click();
  await expect(page.locator('#asset-status')).toContainText('تم تحميل مشهد العيادة');
  await expect(page.locator('#view-clinic')).toHaveClass(/selected/);

  expect(pageErrors).toEqual([]);
});
