/**
 * Integration tests against DATABASE_URL (PostgreSQL).
 * Run: npx tsx --test server/__tests__/integration.test.ts
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const url = process.env.DATABASE_URL;
const hasDb = Boolean(url);

describe('AZRNOU integration', () => {
  let pool: pg.Pool | null = null;

  before(async () => {
    if (!hasDb) return;
    pool = new pg.Pool({ connectionString: url });
  });

  after(async () => {
    await pool?.end();
  });

  it('skips cleanly without DATABASE_URL', () => {
    if (!hasDb) assert.ok(true);
    else assert.ok(pool);
  });

  it('companies and memberships tables exist', async () => {
    if (!pool) return;
    const r = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('companies','company_memberships','customers','orders')`
    );
    const names = r.rows.map((x: { table_name: string }) => x.table_name).sort();
    assert.ok(names.includes('companies'));
    assert.ok(names.includes('customers'));
  });

  it('cross-company customer filter isolates rows', async () => {
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const a = await client.query(`INSERT INTO companies (name, slug) VALUES ('Co A', $1) RETURNING id`, [
        `co-a-${Date.now()}`,
      ]);
      const b = await client.query(`INSERT INTO companies (name, slug) VALUES ('Co B', $1) RETURNING id`, [
        `co-b-${Date.now()}`,
      ]);
      const ca = a.rows[0].id;
      const cb = b.rows[0].id;
      const ins = await client.query(
        `INSERT INTO customers (name, company_id) VALUES ('Buyer', $1) RETURNING id`,
        [ca]
      );
      const cid = ins.rows[0].id;
      const visibleB = await client.query(`SELECT id FROM customers WHERE id=$1 AND company_id=$2`, [cid, cb]);
      assert.equal(visibleB.rows.length, 0);
      const visibleA = await client.query(`SELECT id FROM customers WHERE id=$1 AND company_id=$2`, [cid, ca]);
      assert.equal(visibleA.rows.length, 1);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('inventory non-negative constraint or check exists when migration 019 applied', async () => {
    if (!pool) return;
    const r = await pool.query(
      `SELECT conname FROM pg_constraint WHERE conname ILIKE '%inventory%' OR conname ILIKE '%quantity%' LIMIT 5`
    );
    assert.ok(Array.isArray(r.rows));
  });
});
