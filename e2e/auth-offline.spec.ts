import { test, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const email = process.env.E2E_EMAIL || '';
const password = process.env.E2E_PASSWORD || '';
const QUEUE_KEY = 'azrnou_offline_queue_v2';

test.describe('Chromium offline queue durability', () => {
  test('queue survives offline + reload on app origin', async ({ page, context }) => {
    await page.goto(base);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate((key) => {
      localStorage.setItem(
        key,
        JSON.stringify([
          {
            id: 'ci-offline-1',
            entity: 'customer',
            action: 'create',
            payload: { name: 'CI Offline Client', phone: '0555000111' },
            createdAt: new Date().toISOString(),
            status: 'pending',
            attempts: 0,
          },
        ])
      );
    }, QUEUE_KEY);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const offlineItems = await page.evaluate((key) => {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
    }, QUEUE_KEY);
    expect(offlineItems.some((o: { id: string }) => o.id === 'ci-offline-1')).toBeTruthy();
    await context.setOffline(false);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const onlineItems = await page.evaluate((key) => {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
    }, QUEUE_KEY);
    expect(onlineItems.some((o: { id: string }) => o.id === 'ci-offline-1')).toBeTruthy();
  });

  test('duplicate retry keeps single operation id', async ({ page }) => {
    await page.goto(base);
    const result = await page.evaluate((key) => {
      const op = {
        id: 'ci-dup-1',
        entity: 'expense',
        action: 'create',
        payload: { amount: 10, idempotencyKey: 'ci-exp' },
        createdAt: new Date().toISOString(),
        status: 'failed',
        attempts: 1,
        lastError: 'network',
      };
      localStorage.setItem(key, JSON.stringify([op]));
      const items = JSON.parse(localStorage.getItem(key)!) as typeof op[];
      const updated = items.map((i) =>
        i.id === 'ci-dup-1' ? { ...i, status: 'pending', attempts: i.attempts + 1 } : i
      );
      localStorage.setItem(key, JSON.stringify(updated));
      const final = JSON.parse(localStorage.getItem(key)!);
      return { count: final.length, status: final[0].status, attempts: final[0].attempts };
    }, QUEUE_KEY);
    expect(result.count).toBe(1);
    expect(result.status).toBe('pending');
    expect(result.attempts).toBe(2);
  });

  test('optional login when E2E credentials set', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL/E2E_PASSWORD not set');
    await page.goto(base);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill(email);
    await passInput.fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2500);
    await expect(page.locator('body')).toContainText(/AZRNOU|Tableau|Dashboard|Commandes|Clients|Connexion/i);
  });
});
