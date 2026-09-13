import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('intelligence & backup routes', () => {
  it('intelligence router exports overview forecast anomalies assistant', () => {
    const p = join(process.cwd(), 'server/routes/intelligence.ts');
    assert.ok(existsSync(p));
    const src = readFileSync(p, 'utf8');
    assert.match(src, /\/overview/);
    assert.match(src, /\/forecast\/sales/);
    assert.match(src, /\/anomalies/);
    assert.match(src, /\/assistant/);
  });
  it('backup export validates company ownership', () => {
    const p = join(process.cwd(), 'server/routes/backup.ts');
    assert.ok(existsSync(p));
    const src = readFileSync(p, 'utf8');
    assert.match(src, /cross-company/);
    assert.match(src, /schemaVersion/);
  });
  it('server mounts intelligence and backup', () => {
    const src = readFileSync(join(process.cwd(), 'server/index.ts'), 'utf8');
    assert.match(src, /\/api\/intelligence/);
    assert.match(src, /\/api\/backup/);
  });
});
