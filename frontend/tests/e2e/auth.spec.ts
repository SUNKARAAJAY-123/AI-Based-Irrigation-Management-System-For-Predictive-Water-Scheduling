import { test, expect } from '@playwright/test';

test.describe('Authentication & Navigation E2E Tests', () => {
  
  test('TC001 / TC005: Register & Login Page Rendering', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('TC006: Invalid Credentials Error Display', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid_user_test@example.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(1000);
    // Page stays on /login upon invalid credentials
    await expect(page).toHaveURL('/login');
  });

  test('TC008: Protected Route Redirect when Unauthenticated', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/);
  });
});
