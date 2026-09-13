import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const url = process.env.DATABASE_URL;

describe('payment/expense idempotency one-effect', () => {
  let pool: pg.Pool | null = null;
  before(async () => { if (url) pool = new pg.Pool({ connectionString: url }); });
  after(async () => { await pool?.end(); });

  it('payments: same key → one row', async () => {
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL session_replication_role = replica');
      const has = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='idempotency_key'`);
      if (!has.rows.length) { await client.query('ROLLBACK'); return; }
      const co = await client.query(`INSERT INTO companies(name, slug) VALUES ('IdemPay2', $1) RETURNING id`, [`ip2-${Date.now()}`]);
      const companyId = co.rows[0].id;
      await client.query(`SELECT set_config('app.company_id', $1, true)`, [companyId]);
      const cust = await client.query(`INSERT INTO customers(name, company_id) VALUES ('C', $1) RETURNING id`, [companyId]);
      const o = await client.query(
        `INSERT INTO orders(number, status, payment_status, subtotal, total, cost_total, paid_total, customer_id, company_id)
         VALUES ($1,'confirmed','unpaid',100,100,50,0,$2,$3) RETURNING id`,
        [`OP-${Date.now()}`, cust.rows[0].id, companyId]
      );
      const key = `pk-${Date.now()}`;
      const ins = async () => {
        await client.query(
          `INSERT INTO payments(customer_id, order_id, amount, method, idempotency_key, company_id)
           VALUES ($1,$2,10,'cash',$3,$4)`,
          [cust.rows[0].id, o.rows[0].id, key, companyId]
        );
      };
      await ins();
      await client.query('SAVEPOINT s');
      let blocked = false;
      try { await ins(); } catch { blocked = true; await client.query('ROLLBACK TO SAVEPOINT s'); }
      const c = await client.query(`SELECT COUNT(*)::int AS c FROM payments WHERE idempotency_key=$1`, [key]);
      assert.equal(c.rows[0].c, 1);
      assert.equal(blocked, true);
      await client.query('ROLLBACK');
    } finally { client.release(); }
  });

  it('expenses: same key → one row', async () => {
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL session_replication_role = replica');
      const has = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='idempotency_key'`);
      if (!has.rows.length) { await client.query('ROLLBACK'); return; }
      const co = await client.query(`INSERT INTO companies(name, slug) VALUES ('IdemExp2', $1) RETURNING id`, [`ie2-${Date.now()}`]);
      const companyId = co.rows[0].id;
      await client.query(`SELECT set_config('app.company_id', $1, true)`, [companyId]);
      const key = `ek-${Date.now()}`;
      const ins = async () => {
        await client.query(
          `INSERT INTO expenses(category, amount, expense_date, note, idempotency_key, company_id)
           VALUES ('ops', 50, CURRENT_DATE, 't', $1, $2)`,
          [key, companyId]
        );
      };
      await ins();
      await client.query('SAVEPOINT s');
      let blocked = false;
      try { await ins(); } catch { blocked = true; await client.query('ROLLBACK TO SAVEPOINT s'); }
      const c = await client.query(`SELECT COUNT(*)::int AS c FROM expenses WHERE idempotency_key=$1`, [key]);
      assert.equal(c.rows[0].c, 1);
      await client.query('ROLLBACK');
    } finally { client.release(); }
  });
});
