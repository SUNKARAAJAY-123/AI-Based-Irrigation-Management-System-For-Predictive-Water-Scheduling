import { Page } from '@playwright/test';

export async function loginViaApi(page: Page) {
  // Navigate to login page first to initialize origin
  await page.goto('/login');
  
  try {
    const response = await page.request.post('http://localhost:8001/api/auth/login', {
      data: {
        email: 'sunkaraajay66@gmail.com',
        password: 'Password123!'
      }
    });

    if (response.ok()) {
      const data = await response.json();
      const token = data.access_token;
      await page.evaluate((t) => {
        localStorage.setItem('token', t);
      }, token);
      return token;
    }
  } catch (e) {
    console.error('API login failed:', e);
  }

  // Fallback: register a new test user if login failed
  try {
    const regResp = await page.request.post('http://localhost:8001/api/auth/register', {
      data: {
        email: `test_e2e_${Date.now()}@example.com`,
        password: 'Password123!',
        full_name: 'E2E Test User',
        role: 'FARMER'
      }
    });
    if (regResp.ok()) {
      const data = await regResp.json();
      const token = data.access_token;
      await page.evaluate((t) => {
        localStorage.setItem('token', t);
      }, token);
      return token;
    }
  } catch (e) {
    console.error('API registration fallback failed:', e);
  }
}
