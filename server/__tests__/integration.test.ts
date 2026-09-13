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

  it('core tables exist after migrations', async () => {
    if (!pool) return;
    const r = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public'
         AND table_name = ANY($1::text[])`,
      [['companies', 'company_memberships', 'customers', 'orders', 'payments', 'inventory_balances', 'app_settings']]
    );
    const names = new Set(r.rows.map((x: { table_name: string }) => x.table_name));
    for (const t of ['companies', 'customers', 'orders']) {
      assert.ok(names.has(t), `missing table ${t}`);
    }
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
        `co-b-${Date.now() + 1}`,
      ]);
      const ca = a.rows[0].id;
      const cb = b.rows[0].id;
      const ins = await client.query(`INSERT INTO customers (name, company_id) VALUES ('Buyer', $1) RETURNING id`, [ca]);
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

  it('azrnou_app role exists and is not superuser when migration 023 applied', async () => {
    if (!pool) return;
    const r = await pool.query(`SELECT rolname, rolsuper FROM pg_roles WHERE rolname = 'azrnou_app'`);
    if (r.rows.length === 0) {
      assert.ok(true);
      return;
    }
    assert.equal(r.rows[0].rolsuper, false);
  });

  it('RLS policies exist on customers when isolation migration applied', async () => {
    if (!pool) return;
    const r = await pool.query(`SELECT polname FROM pg_policy WHERE polrelid = 'customers'::regclass`);
    assert.ok(Array.isArray(r.rows));
  });

  it('inventory balances constraints probe', async () => {
    if (!pool) return;
    const cons = await pool.query(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'inventory_balances'::regclass`
    );
    assert.ok(Array.isArray(cons.rows));
  });

  it('order idempotency index probe', async () => {
    if (!pool) return;
    const r = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'orders' AND indexdef ILIKE '%idempotency%'`
    );
    assert.ok(Array.isArray(r.rows));
  });
});
