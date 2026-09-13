import 'dotenv/config';
import { pool, query } from './db.js';
import { hashPassword } from './security.js';

async function main() {
  const email = String(process.env.E2E_EMAIL ?? '').trim().toLowerCase();
  const password = String(process.env.E2E_PASSWORD ?? '');
  if (!email || !password) {
    console.log('[seed-e2e] E2E_EMAIL/E2E_PASSWORD not set — skip seed');
    process.exit(0);
  }
  if (!process.env.DATABASE_URL) {
    console.error('[seed-e2e] DATABASE_URL required');
    process.exit(1);
  }

  const name = process.env.E2E_USER_NAME ?? 'E2E Tester';
  const passwordHash = await hashPassword(password);

  await query(`SET session_replication_role = replica`);

  let companyId: string;
  const existingCo = await query<{ id: string }>(
    `SELECT id FROM companies WHERE slug='e2e-company' LIMIT 1`
  );
  if (existingCo.rows[0]) {
    companyId = existingCo.rows[0].id;
  } else {
    const ins = await query<{ id: string }>(
      `INSERT INTO companies(name, slug) VALUES ('E2E Company', 'e2e-company') RETURNING id`
    );
    companyId = ins.rows[0].id;
  }

  let userId: string;
  const existingUser = await query<{ id: string }>(
    `SELECT id FROM users WHERE LOWER(email)=$1 LIMIT 1`,
    [email]
  );
  if (existingUser.rows[0]) {
    userId = existingUser.rows[0].id;
    await query(`UPDATE users SET password_hash=$2, name=$3, active=TRUE WHERE id=$1`, [
      userId,
      passwordHash,
      name,
    ]);
  } else {
    const ins = await query<{ id: string }>(
      `INSERT INTO users(name, email, password_hash, role, active) VALUES ($1,$2,$3,'owner',TRUE) RETURNING id`,
      [name, email, passwordHash]
    );
    userId = ins.rows[0].id;
  }

  await query(
    `INSERT INTO company_memberships(company_id, user_id, role)
     VALUES ($1,$2,'owner')
     ON CONFLICT (company_id, user_id) DO UPDATE SET role='owner'`,
    [companyId, userId]
  );

  console.log(`[seed-e2e] ready user=${email} company=${companyId}`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
