import { test, expect } from '@playwright/test';

async function dragAcrossToothSurface(page) {
  const canvas = page.locator('#render-canvas');
  const rect = await canvas.boundingBox();
  expect(rect).not.toBeNull();
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(450);
  await page.mouse.move(x + 12, y + 8, { steps: 5 });
  await page.waitForTimeout(450);
  await page.mouse.up();
  await expect(page.locator('#clinical-contact-time')).not.toHaveText('0.00 s', { timeout: 5000 });
}

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
  await expect(page.locator('#view-oral-exam')).toHaveClass(/selected/);
  await expect(page.locator('#asset-status')).toContainText('فحص الأسنان جاهز', { timeout: 90000 });
  await expect(page.locator('#dental-atlas-status')).toContainText('وضع فحص الأسنان جاهز', { timeout: 90000 });
  await expect(page.locator('.tooth-chip')).toHaveCount(32);
  await expect(page.locator('#oral-exam-target-label')).toContainText('36');
  await expect(page.locator('#patient-mouth-toggle')).toHaveText('إغلاق الفم');
  await page.locator('#patient-mouth-toggle').click();
  await expect(page.locator('#patient-mouth-toggle')).toHaveText('فتح الفم');
  await page.locator('#patient-mouth-toggle').click();
  await expect(page.locator('#patient-mouth-toggle')).toHaveText('إغلاق الفم');

  // The integrated treatment room remains available as a separate mode.
  await page.locator('#view-treatment').click();
  await expect(page.locator('#view-treatment')).toHaveClass(/selected/);
  await expect(page.locator('#asset-status')).toContainText('تم تحميل مشهد العيادة', { timeout: 45000 });
  await expect(page.locator('#patient-model-status')).toContainText('تم تحميل المريض', { timeout: 30000 });
  await expect(page.locator('#patient-variant-controls')).toBeVisible();

  // The app shell and square 3D canvas must fit the browser without document scrolling.
  const desktopSquare = await page.locator('.viewport').boundingBox();
  expect(desktopSquare).not.toBeNull();
  expect(Math.abs(desktopSquare.width - desktopSquare.height)).toBeLessThanOrEqual(2);
  const desktopPage = await page.evaluate(() => {
    const overflowing = [...document.querySelectorAll('body *')].map(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName,
        id: element.id,
        className: typeof element.className === 'string' ? element.className : '',
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        position: style.position,
        overflow: style.overflow,
        scrollHeight: element.scrollHeight
      };
    }).filter(item => item.bottom > window.innerHeight + 2 || item.top < -2)
      .sort((a, b) => b.bottom - a.bottom).slice(0, 18);
    return {
      scrollHeight: document.documentElement.scrollHeight,
      bodyScrollHeight: document.body.scrollHeight,
      innerHeight: window.innerHeight,
      appShell: document.querySelector('.app-shell')?.getBoundingClientRect().toJSON(),
      layout: document.querySelector('.layout')?.getBoundingClientRect().toJSON(),
      viewport: document.querySelector('.viewport')?.getBoundingClientRect().toJSON(),
      overflowing
    };
  });
  console.log('DESKTOP_WORKSPACE_DIAGNOSTIC', JSON.stringify(desktopPage));
  expect(desktopPage.scrollHeight).toBeLessThanOrEqual(desktopPage.innerHeight + 2);

  // Important GLBs and registries must exist in the deployed base path, not only on a developer machine.
  for (const asset of [
    'models/clinic-practice.glb',
    'models/patient-male.glb',
    'models/patient-female.glb',
    'models/oral-anatomy.glb',
    'models/ecorche-anatomy.glb',
    'models/dental-scope/manifest.json',
    'models/dental-tools/instrument-tray.glb',
    'models/dental-tools/ultrasonic-scaler.glb',
    'models/dental-tools/curing-light.glb',
    'models/dental-tools/plaster-study-arch.glb',
    'models/dental-tools/surgical-forceps.glb',
    'models/dental-tools/scalpel-set.glb',
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

  // Hands-on caries workflow: select and start the matching interactive pathway first.
  await page.locator('#scenario-select').selectOption('restoration');
  await page.locator('#start-case').click();
  await page.locator('#reset-caries-case').click();
  await page.locator('#inventory-category').selectOption('restorative');
  await page.locator('.inventory-item').filter({ hasText: 'قبضة عالية السرعة' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('تمت إزالة الآفة');
  await page.locator('#inventory-category').selectOption('materials');
  await page.locator('.inventory-item').filter({ hasText: 'مادة تخريش' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('تم التخريش');
  await page.locator('.inventory-item').filter({ hasText: 'نظام لاصق' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('تم تطبيق اللاصق');
  await page.locator('#inventory-category').selectOption('restorative');
  await page.locator('.inventory-item').filter({ hasText: 'أداة وضع الكومبوزيت' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await page.locator('#inventory-category').selectOption('materials');
  await page.locator('.inventory-item').filter({ hasText: 'راتنج كومبوزيت' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('تم وضع مادة الترميم');
  await page.locator('#inventory-category').selectOption('restorative');
  await page.locator('.inventory-item').filter({ hasText: 'مصباح التصلب الضوئي' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('اكتمل الترميم التعليمي');

  await page.locator('#view-anatomy').click();
  await expect(page.locator('#asset-status')).toContainText('تم تحميل 33 تركيبًا تشريحيًا منفصلًا', { timeout: 45000 });
  await expect(page.locator('#structure-list .structure-button')).toHaveCount(33);
  await page.locator('#structure-list .structure-button').first().click();
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
  await expect(page.locator('#patient-mouth-toggle')).toHaveText('فتح الفم');
  await page.locator('#patient-mouth-toggle').click();
  await expect(page.locator('#patient-mouth-toggle')).toHaveText('إغلاق الفم');
  await page.locator('#patient-mouth-toggle').click();
  await expect(page.locator('#patient-mouth-toggle')).toHaveText('فتح الفم');
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

  // The first-class oral exam applies a staged treatment overlay to the selected Dental Scope tooth.
  await page.locator('#view-oral-exam').click();
  await expect(page.locator('#dental-atlas-status')).toContainText('وضع فحص الأسنان جاهز', { timeout: 90000 });
  await page.locator('#inventory-category').selectOption('all');
  const oralInventoryItems = page.locator('#inventory-list .inventory-item');
  await expect(oralInventoryItems).toHaveCount(55);
  for (let i = 0; i < await oralInventoryItems.count(); i += 1) {
    await oralInventoryItems.nth(i).click();
    await expect(page.locator('#selection-name')).not.toBeEmpty();
  }
  await page.locator('.tooth-chip').filter({ hasText: '36' }).click();
  await expect(page.locator('#oral-exam-target-label')).toContainText('36');
  await page.locator('#reset-caries-case').click();
  await page.locator('#inventory-category').selectOption('restorative');
  await page.locator('.inventory-item').filter({ hasText: 'قبضة عالية السرعة' }).dragTo(page.locator('#render-canvas'));
  await expect(page.locator('#treatment-interaction-status')).toContainText('تم سحب قبضة عالية السرعة');
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('تمت إزالة الآفة');
  await expect(page.locator('#caries-procedure-help')).toContainText('تم طرح حجم القاطع', { timeout: 45000 });
  await page.locator('#inventory-category').selectOption('materials');
  await page.locator('.inventory-item').filter({ hasText: 'مادة تخريش' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('تم التخريش');
  await page.locator('.inventory-item').filter({ hasText: 'نظام لاصق' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('تم تطبيق اللاصق');
  await page.locator('#inventory-category').selectOption('restorative');
  await page.locator('.inventory-item').filter({ hasText: 'أداة وضع الكومبوزيت' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await page.locator('#inventory-category').selectOption('materials');
  await page.locator('.inventory-item').filter({ hasText: 'راتنج كومبوزيت' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('تم وضع مادة الترميم');
  await page.locator('#inventory-category').selectOption('restorative');
  await page.locator('.inventory-item').filter({ hasText: 'مصباح التصلب الضوئي' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('اكتمل الترميم التعليمي');

  // Non-restorative paths now require contact and attach visible outcomes to the selected anatomy.
  await page.locator('#scenario-select').selectOption('exam');
  await page.locator('#start-case').click();
  await page.locator('#inventory-category').selectOption('exam');
  await page.locator('.inventory-item').filter({ hasText: 'مرآة فحص الأسنان' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('خطوة 1 / 3');
  await page.locator('.inventory-item').filter({ hasText: 'مسبار استكشافي' }).click();
  await page.locator('#tool-to-mouth').click();
  await dragAcrossToothSurface(page);
  await page.locator('#apply-clinical-action').click();
  await expect(page.locator('#caries-stage-label')).toContainText('خطوة 2 / 3');

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
