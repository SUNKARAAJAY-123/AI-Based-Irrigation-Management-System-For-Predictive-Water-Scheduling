import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers';

test.describe('Global Multilingual (I18N) E2E Tests (DEF-I18N-001 Revalidation)', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test('TC120: Global Multilingual Language Switcher (English -> Telugu -> Hindi -> English)', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');

    // 1. Check English UI elements
    await expect(page.locator('body')).toContainText(/Dashboard|Overview|Farm/i);

    // 2. Open Language Selector & Switch to Telugu (te-IN)
    const langSelect = page.locator('select').first();
    if (await langSelect.isVisible()) {
      await langSelect.selectOption('te-IN');
      await page.waitForTimeout(500);

      // Navigate to /farms and verify Telugu translations
      await page.goto('/farms');
      await expect(page.locator('body')).toContainText(/పొలాలు|ఫారమ్|హోమ్/i);

      // Navigate to /weather and verify Telugu translations
      await page.goto('/weather');
      await expect(page.locator('body')).toContainText(/వాతావరణం|ఉష్ణోగ్రత/i);

      // Refresh browser and verify language persistence
      await page.reload();
      await expect(page.locator('body')).toContainText(/వాతావరణం|ఉష్ణోగ్రత/i);

      // 3. Switch to Hindi (hi-IN)
      await page.goto('/dashboard');
      await langSelect.selectOption('hi-IN');
      await page.waitForTimeout(500);

      // Navigate to /profile and verify Hindi text
      await page.goto('/profile');
      await expect(page.locator('body')).toContainText(/प्रोफ़ाइल|उपयोगकर्ता|भाषा/i);

      // 4. Switch back to English (en-IN)
      await langSelect.selectOption('en-IN');
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toContainText(/Profile|Settings|User/i);
    }
  });
});
