import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('PWA contract', () => {
  it('manifest has installability fields', () => {
    const p = join(process.cwd(), 'public/manifest.webmanifest');
    assert.ok(existsSync(p));
    const m = JSON.parse(readFileSync(p, 'utf8'));
    assert.ok(m.name && m.short_name && m.start_url && m.display === 'standalone');
    assert.ok(Array.isArray(m.icons) && m.icons.length > 0);
  });
  it('service worker caches app shell', () => {
    const src = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');
    assert.match(src, /install/);
    assert.match(src, /fetch/);
    assert.match(src, /azrnou-shell/);
  });
  it('index registers service worker', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    assert.match(html, /serviceWorker|sw\.js/);
  });
});
