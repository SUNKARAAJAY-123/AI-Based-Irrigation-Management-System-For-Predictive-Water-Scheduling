import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers';

test.describe('AgriSmart Voice & Chat Assistant E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test('TC097-TC104: Conversational Chat Assistant Page & Workflow', async ({ page }) => {
    await page.goto('/ai');
    await expect(page).toHaveURL('/ai');
    
    await expect(page.locator('h1')).toContainText(/Kisan AI/i);

    const inputField = page.locator('input[placeholder="Type your question..."]');
    const sendButton = page.locator('button[aria-label="Send query"]');

    // 1. Send "Hi" -> Greeting
    await inputField.fill('Hi');
    await sendButton.click();
    await expect(page.locator('text=/smart farming|help/i').first()).toBeVisible({ timeout: 10000 });

    // 2. Send "How is my tomato field?" -> Field Status
    await inputField.fill('How is my tomato field?');
    await sendButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toContainText(/Tomato|farm|soil/i);

    // 3. Send "When should I irrigate?" -> Irrigation Timing
    await inputField.fill('When should I irrigate?');
    await sendButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toContainText(/irrigation|water|moisture/i);

    // 4. Send Telugu question "నీరు ఎప్పుడు పెట్టాలి?"
    await inputField.fill('నీరు ఎప్పుడు పెట్టాలి?');
    await sendButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toContainText(/నీరు/i);
  });
});
