import { test, expect } from '@playwright/test';

test('online tutor, square responsive workspace, dental models and training work', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  // A real browser-level cloud API smoke test without consuming an actual API key.
  await page.route('https://openrouter.ai/api/v1/models', async route => {
    const corsHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type, http-referer, x-openrouter-title'
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        data: [{
          id: 'test/dental-tutor:free',
          name: 'Test Dental Tutor',
          architecture: { output_modalities: ['text'] }
        }]
      })
    });
  });
  await page.route('https://openrouter.ai/api/v1/chat/completions', async route => {
    const corsHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type, http-referer, x-openrouter-title'
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ choices: [{ message: { content: 'إجابة اختبار سحابية ناجحة' } }] })
    });
  });

  await page.goto('./');
  await expect(page.locator('#asset-status')).toContainText('تم تحميل مشهد العيادة', { timeout: 45000 });
  await expect(page.locator('#view-treatment')).toHaveClass(/selected/);
  await expect(page.locator('#patient-model-status')).toContainText('تم تحميل المريض', { timeout: 30000 });
  await expect(page.locator('#patient-variant-controls')).toBeVisible();

  // The app shell and square 3D canvas must fit the browser without document scrolling.
  const desktopSquare = await page.locator('.viewport').boundingBox();
  expect(desktopSquare).not.toBeNull();
  expect(Math.abs(desktopSquare.width - desktopSquare.height)).toBeLessThanOrEqual(2);
  const desktopPage = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight
  }));
  expect(desktopPage.scrollHeight).toBeLessThanOrEqual(desktopPage.innerHeight + 2);

  // Important GLBs and registries must exist in the deployed base path, not only on a developer machine.
  for (const asset of [
    'models/clinic-practice.glb',
    'models/patient-male.glb',
    'models/patient-female.glb',
    'models/oral-anatomy.glb',
    'models/ecorche-anatomy.glb',
    'models/dental-scope/manifest.json',
    'models/pediatric-dentition/primary-tooth-74.glb'
  ]) {
    const response = await page.request.head(new URL(asset, page.url()).toString());
    expect(response.ok(), asset + ' should be published').toBeTruthy();
  }

  // Test the online provider and its OpenAI-compatible chat endpoint.
  await expect(page.locator('#ai-provider')).toHaveValue('openrouter');
  await page.locator('#ai-api-key').fill('sk-or-v1-test-key');
  await page.locator('#ai-connect').click();
  await expect(page.locator('#ai-status')).toContainText('متصل بالإنترنت');
  await expect(page.locator('#ai-model option')).toHaveCount(2);
  await page.locator('#ai-question').fill('اشرح وظيفة طبقة المينا باختصار.');
  await page.locator('#ai-send').click();
  await expect(page.locator('.ai-message.assistant').last()).toContainText('إجابة اختبار سحابية ناجحة');
  await expect(page.locator('#ai-status')).toContainText('النموذج السحابي');

  // Keep local specialist/developer options available as optional fallbacks.
  await page.locator('#ai-provider').selectOption('openai-compatible');
  await expect(page.locator('#ai-model option')).toHaveCount(1);
  await expect(page.locator('#ai-model')).toHaveValue('Harisundar/PALL-Text');
  await expect(page.locator('#ai-endpoint')).toHaveValue('http://localhost:8000');
  await page.locator('#ai-provider').selectOption('ollama');
  await expect(page.locator('#ai-model option')).toHaveCount(3);
  await expect(page.locator('#ai-endpoint')).toHaveValue('http://localhost:11434');
  await expect(page.locator('#ai-online-settings')).toBeHidden();
  await expect(page.locator('#ai-local-settings')).toBeVisible();
  await expect(page.locator('#scenario-select option')).toHaveCount(12);

  await page.locator('#inventory-category').selectOption('materials');
  await expect(page.locator('.inventory-item').filter({ hasText: 'راتنج كومبوزيت' })).toHaveCount(1);
  await page.locator('.inventory-item').filter({ hasText: 'راتنج كومبوزيت' }).click();
  await expect(page.locator('#inventory-detail')).toContainText('مادة');
  await page.locator('#tool-to-mouth').click();
  await page.locator('#tool-to-tray').click();
  await page.locator('#inventory-category').selectOption('exam');
  await page.locator('.inventory-item').filter({ hasText: 'مرآة فحص الأسنان' }).click();
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
  for (let step = 0; step < 6; step += 1) await page.locator('#next-step').click();
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
  await page.locator('.tooth-chip').filter({ hasText: '36' }).click();
  await expect(page.locator('#dental-tooth-mesh-status')).toContainText('مجسمات طبقية', { timeout: 60000 });
  await page.locator('[data-tooth-layer="pulp-chamber"]').uncheck();
  await page.locator('[data-tooth-layer="pulp-chamber"]').check();
  await page.locator('#dental-tooth-back').click();

  const bodyRegistryResponse = await page.request.get(new URL('models/ecorche-structures.json', page.url()).toString());
  expect(bodyRegistryResponse.ok()).toBeTruthy();
  const bodyRegistry = await bodyRegistryResponse.json();
  expect(bodyRegistry).toHaveLength(634);
  await page.locator('#view-pediatric').click();
  await expect(page.locator('#pediatric-atlas-status')).toContainText('تم تحميل 10 نماذج', { timeout: 45000 });
  await expect(page.locator('.pediatric-tooth-button')).toHaveCount(10);
  await page.locator('.pediatric-tooth-button').filter({ hasText: '74' }).click();
  await expect(page.locator('#selection-name')).toContainText('74');
  await page.locator('#view-clinic').click();
  await expect(page.locator('#asset-status')).toContainText('تم تحميل مشهد العيادة');
  await expect(page.locator('#view-clinic')).toHaveClass(/selected/);

  // Mobile workspace: fixed viewport, square stage, and independent off-canvas drawers.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const mobileSquare = await page.locator('.viewport').boundingBox();
  expect(mobileSquare).not.toBeNull();
  expect(Math.abs(mobileSquare.width - mobileSquare.height)).toBeLessThanOrEqual(2);
  const mobilePage = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight
  }));
  expect(mobilePage.scrollHeight).toBeLessThanOrEqual(mobilePage.innerHeight + 2);
  await page.locator('#mobile-open-controls').click();
  await expect(page.locator('#sidebar-right')).toHaveClass(/mobile-open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#sidebar-right')).not.toHaveClass(/mobile-open/);
  await page.locator('#mobile-open-library').click();
  await expect(page.locator('#sidebar-left')).toHaveClass(/mobile-open/);
  await page.locator('.mobile-panel-backdrop').click({ position: { x: 360, y: 400 } });
  await expect(page.locator('#sidebar-left')).not.toHaveClass(/mobile-open/);

  expect(pageErrors).toEqual([]);
});
