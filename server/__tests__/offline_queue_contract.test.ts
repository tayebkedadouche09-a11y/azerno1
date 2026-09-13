import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('offline queue source contract', () => {
  it('offlineQueue module defines durable KEY and core operations', () => {
    const path = join(process.cwd(), 'src/lib/offlineQueue.ts');
    assert.ok(existsSync(path));
    const src = readFileSync(path, 'utf8');
    assert.match(src, /azrnou_offline_queue_v2/);
    assert.match(src, /enqueue/);
    assert.match(src, /retryFailed|retry/);
  });

  it('SyncCenter component exists', () => {
    const path = join(process.cwd(), 'src/components/sync/SyncCenter.tsx');
    assert.ok(existsSync(path), 'SyncCenter.tsx must exist');
    const src = readFileSync(path, 'utf8');
    assert.match(src, /offlineQueue/);
  });
});
