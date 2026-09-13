import { test, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

test.describe('PWA live Chromium', () => {
  test('manifest is served and parseable', async ({ request }) => {
    const res = await request.get(`${base}/manifest.webmanifest`);
    expect(res.ok()).toBeTruthy();
    const m = await res.json();
    expect(m.name).toBeTruthy();
    expect(m.display).toBe('standalone');
    expect(m.icons?.length).toBeGreaterThan(0);
  });

  test('service worker script is served', async ({ request }) => {
    const res = await request.get(`${base}/sw.js`);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toMatch(/install/);
    expect(text).toMatch(/fetch/);
  });

  test('page exposes serviceWorker API', async ({ page }) => {
    await page.goto(base);
    const supported = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(supported).toBeTruthy();
  });
});
