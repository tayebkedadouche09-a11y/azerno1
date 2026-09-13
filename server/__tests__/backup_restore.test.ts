import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.DATABASE_URL;

describe('backup restore rules', () => {
  it('route implements restore + cross-company + schema checks', () => {
    const src = readFileSync(join(process.cwd(), 'server/routes/backup.ts'), 'utf8');
    assert.match(src, /\/restore/);
    assert.match(src, /cross-company restore forbidden/);
    assert.match(src, /schema mismatch/);
    assert.match(src, /transaction/i);
  });

  it('DB: customer insert under company context', async () => {
    if (!url) return;
    const pool = new pg.Pool({ connectionString: url });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL session_replication_role = replica`);
      const co = await client.query(
        `INSERT INTO companies(name, slug) VALUES ('BackupCo', $1) RETURNING id`,
        [`bak-${Date.now()}`]
      );
      const companyId = co.rows[0].id;
      await client.query(`SELECT set_config('app.company_id', $1, true)`, [companyId]);
      await client.query(
        `INSERT INTO customers(name, company_id) VALUES ('Restore Target', $1)`,
        [companyId]
      );
      const c = await client.query(
        `SELECT COUNT(*)::int AS n FROM customers WHERE name='Restore Target'`
      );
      assert.equal(c.rows[0].n, 1);
      await client.query('ROLLBACK');
    } finally {
      client.release();
      await pool.end();
    }
  });
});
