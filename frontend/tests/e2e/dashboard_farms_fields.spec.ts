import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers';

test.describe('Dashboard, Farms & Fields E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test('TC020 / TC024 / TC030: Dashboard, Farms, Fields Navigation & Rendering', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    
    // Check navigation to Farms
    await page.goto('/farms');
    await expect(page).toHaveURL('/farms');

    // Check navigation to Fields
    await page.goto('/fields');
    await expect(page).toHaveURL('/fields');

    // Check navigation to Weather
    await page.goto('/weather');
    await expect(page).toHaveURL('/weather');

    // Check navigation to Sensors
    await page.goto('/sensors');
    await expect(page).toHaveURL('/sensors');

    // Check navigation to History
    await page.goto('/history');
    await expect(page).toHaveURL('/history');
  });
});
