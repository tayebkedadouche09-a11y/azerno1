import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('offline queue source contract', () => {
  it('offlineQueue module defines durable KEY and statuses including conflict', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/offlineQueue.ts'), 'utf8');
    assert.match(src, /azrnou_offline_queue_v2/);
    assert.match(src, /conflict/);
    assert.match(src, /rejected/);
    assert.match(src, /enqueue/);
    assert.match(src, /retryFailed/);
  });

  it('SyncCenter exposes conflict UI strings', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/sync/SyncCenter.tsx'), 'utf8');
    assert.match(src, /Conflit|conflict/i);
    assert.match(src, /R\u00e9essayer|retry/i);
  });
});
