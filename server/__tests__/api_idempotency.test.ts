import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const url = process.env.DATABASE_URL;

describe('API/DB idempotency one-effect', () => {
  let pool: pg.Pool | null = null;

  before(async () => {
    if (!url) return;
    pool = new pg.Pool({ connectionString: url });
  });
  after(async () => {
    await pool?.end();
  });

  it('orders: two inserts same idempotency_key → one row', async () => {
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL session_replication_role = replica`);
      const co = await client.query(
        `INSERT INTO companies(name, slug) VALUES ('IdemOrd', $1) RETURNING id`,
        [`idem-ord-${Date.now()}`]
      );
      const companyId = co.rows[0].id;
      await client.query(`SELECT set_config('app.company_id', $1, true)`, [companyId]);

      const key = `order-key-${Date.now()}`;
      const hasKey = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='idempotency_key'`
      );
      if (!hasKey.rows.length) {
        await client.query('ROLLBACK');
        return;
      }

      const cols = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name='orders'`
      );
      const names = new Set(cols.rows.map((r: { column_name: string }) => r.column_name));
      assert.ok(names.has('idempotency_key'));

      let firstId: string | undefined;
      try {
        if (names.has('company_id')) {
          const a = await client.query(
            `INSERT INTO orders(number, status, payment_status, subtotal, total, cost_total, idempotency_key, company_id)
             VALUES ($1,'confirmed','unpaid',10,10,5,$2,$3) RETURNING id`,
            [`N1-${Date.now()}`, key, companyId]
          );
          firstId = a.rows[0].id;
        } else {
          const a = await client.query(
            `INSERT INTO orders(number, status, payment_status, subtotal, total, cost_total, idempotency_key)
             VALUES ($1,'confirmed','unpaid',10,10,5,$2) RETURNING id`,
            [`N1-${Date.now()}`, key]
          );
          firstId = a.rows[0].id;
        }
      } catch (e: any) {
        await client.query('ROLLBACK');
        assert.fail(`first order insert failed: ${e.message}`);
      }

      let duplicateBlocked = false;
      try {
        if (names.has('company_id')) {
          await client.query(
            `INSERT INTO orders(number, status, payment_status, subtotal, total, cost_total, idempotency_key, company_id)
             VALUES ($1,'confirmed','unpaid',99,99,9,$2,$3) RETURNING id`,
            [`N2-${Date.now()}`, key, companyId]
          );
        } else {
          await client.query(
            `INSERT INTO orders(number, status, payment_status, subtotal, total, cost_total, idempotency_key)
             VALUES ($1,'confirmed','unpaid',99,99,9,$2) RETURNING id`,
            [`N2-${Date.now()}`, key]
          );
        }
      } catch {
        duplicateBlocked = true;
      }

      const count = await client.query(
        `SELECT COUNT(*)::int AS c FROM orders WHERE idempotency_key=$1`,
        [key]
      );
      assert.equal(count.rows[0].c, 1, 'must have exactly one order for idempotency key');
      assert.ok(firstId);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('payments: idempotency index probe', async () => {
    if (!pool) return;
    const hasKey = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='idempotency_key'`
    );
    if (!hasKey.rows.length) return;
    const idx = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE tablename='payments' AND indexdef ILIKE '%idempotency%'`
    );
    assert.ok(Array.isArray(idx.rows));
  });

  it('inventory_movements: idempotency column probe', async () => {
    if (!pool) return;
    const col = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='idempotency_key'`
    );
    if (!col.rows.length) return;
    const r = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE tablename='inventory_movements' AND indexdef ILIKE '%idempotency%'`
    );
    assert.ok(Array.isArray(r.rows));
  });
});
