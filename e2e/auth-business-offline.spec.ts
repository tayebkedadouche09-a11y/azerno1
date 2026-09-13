import { test, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const email = process.env.E2E_EMAIL || '';
const password = process.env.E2E_PASSWORD || '';
const QUEUE_KEY = 'azrnou_offline_queue_v2';

test.describe('authenticated offline business path', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD (GitHub Secrets) to run');

  test('login → offline queue op → online → UI still shows app shell', async ({ page, context }) => {
    await page.goto(base);
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[type="text"]').first();
    const passInput = page.locator('input[type="password"]').first();
    await expect(emailInput).toBeVisible({ timeout: 20000 });
    await emailInput.fill(email);
    await passInput.fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(10);

    await context.setOffline(true);
    await page.evaluate((key) => {
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({
        id: 'auth-e2e-cust-1',
        entity: 'customer',
        action: 'create',
        payload: { name: 'Auth E2E Offline Customer', phone: '0555999888' },
        createdAt: new Date().toISOString(),
        status: 'pending',
        attempts: 0,
      });
      localStorage.setItem(key, JSON.stringify(existing));
    }, QUEUE_KEY);

    await page.reload({ waitUntil: 'domcontentloaded' });
    const queued = await page.evaluate((key) => {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
    }, QUEUE_KEY);
    expect(queued.some((o: { id: string }) => o.id === 'auth-e2e-cust-1')).toBeTruthy();

    await context.setOffline(false);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const still = await page.evaluate((key) => {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
    }, QUEUE_KEY);
    expect(still.some((o: { id: string }) => o.id === 'auth-e2e-cust-1')).toBeTruthy();
  });
});
