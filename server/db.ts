import 'dotenv/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[AZRNOU] DATABASE_URL is not configured. Backend database operations will fail until it is set.');
}

export const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const companyContext = new AsyncLocalStorage<string>();

export function getCompanyContext() {
  return companyContext.getStore() ?? null;
}

export function withCompanyContext<T>(companyId: string, work: () => T): T {
  return companyContext.run(companyId, work);
}

async function prepareClient(client: pg.PoolClient) {
  const companyId = getCompanyContext();
  await client.query('SELECT set_config($1, $2, false)', ['app.company_id', companyId ?? '']);
}

export async function query<T = unknown>(text: string, values: unknown[] = []) {
  const client = await pool.connect();
  try {
    await prepareClient(client);
    return await client.query<T>(text, values);
  } finally {
    client.release();
  }
}

export async function transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await prepareClient(client);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
