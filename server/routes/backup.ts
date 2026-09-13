import { Router } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

export const SCHEMA_VERSION = '026';

const EXPORT_TABLES = [
  'customers',
  'suppliers',
  'product_categories',
  'products',
  'product_variants',
  'expenses',
] as const;

router.get('/export', requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId;
    const data: Record<string, unknown[]> = {};
    for (const t of EXPORT_TABLES) {
      try {
        const r = await query(`SELECT * FROM ${t}`);
        data[t] = r.rows;
      } catch {
        data[t] = [];
      }
    }
    res.json({
      meta: {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        companyId,
        companyName: req.user!.companyName,
        exportedBy: req.user!.id,
      },
      data,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/validate', requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const meta = body.meta ?? {};
    const errors: string[] = [];
    if (!meta.schemaVersion) errors.push('missing meta.schemaVersion');
    if (!meta.companyId) errors.push('missing meta.companyId');
    if (String(meta.companyId) !== String(req.user!.companyId)) {
      errors.push('cross-company restore forbidden');
    }
    if (meta.schemaVersion && String(meta.schemaVersion) !== SCHEMA_VERSION) {
      errors.push(`schema mismatch: backup=${meta.schemaVersion} current=${SCHEMA_VERSION}`);
    }
    if (!body.data || typeof body.data !== 'object') errors.push('missing data object');
    res.status(errors.length ? 400 : 200).json({ ok: errors.length === 0, errors });
  } catch (e) {
    next(e);
  }
});

router.post('/restore', requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const meta = body.meta ?? {};
    const data = body.data ?? {};

    if (!meta.schemaVersion) return res.status(400).json({ error: 'missing meta.schemaVersion' });
    if (!meta.companyId) return res.status(400).json({ error: 'missing meta.companyId' });
    if (String(meta.companyId) !== String(req.user!.companyId)) {
      return res.status(403).json({ error: 'cross-company restore forbidden' });
    }
    if (String(meta.schemaVersion) !== SCHEMA_VERSION) {
      return res.status(400).json({
        error: `schema mismatch: backup=${meta.schemaVersion} current=${SCHEMA_VERSION}`,
      });
    }
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'missing data object' });
    }

    const customers = Array.isArray(data.customers) ? data.customers : [];
    const result = await transaction(async (client) => {
      let inserted = 0;
      let skipped = 0;
      for (const row of customers) {
        const name = String(row?.name ?? '').trim();
        if (!name) {
          skipped += 1;
          continue;
        }
        const id = row?.id ? String(row.id) : null;
        if (id) {
          const exists = await client.query(`SELECT 1 FROM customers WHERE id=$1`, [id]);
          if (exists.rows[0]) {
            skipped += 1;
            continue;
          }
          await client.query(
            `INSERT INTO customers(id, name, phone, address, notes, customer_type, credit_limit, payment_terms_days)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              id,
              name,
              row.phone ?? null,
              row.address ?? null,
              row.notes ?? null,
              row.customer_type ?? row.type ?? 'wholesale',
              Number(row.credit_limit ?? row.creditLimit ?? 0),
              Number(row.payment_terms_days ?? row.paymentTermsDays ?? 0),
            ]
          );
          inserted += 1;
        } else {
          await client.query(
            `INSERT INTO customers(name, phone, address, notes, customer_type, credit_limit, payment_terms_days)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              name,
              row.phone ?? null,
              row.address ?? null,
              row.notes ?? null,
              row.customer_type ?? row.type ?? 'wholesale',
              Number(row.credit_limit ?? row.creditLimit ?? 0),
              Number(row.payment_terms_days ?? row.paymentTermsDays ?? 0),
            ]
          );
          inserted += 1;
        }
      }
      await client.query(
        `INSERT INTO audit_logs(user_id, action, entity_type, entity_id, after_data)
         VALUES ($1,'restore','backup',$2,$3)`,
        [
          req.user!.id,
          req.user!.companyId,
          JSON.stringify({ inserted, skipped, schemaVersion: SCHEMA_VERSION }),
        ]
      );
      return { inserted, skipped };
    });

    res.json({
      ok: true,
      ...result,
      message: 'Restore committed (customers). Other tables ignored in v1 safe import.',
    });
  } catch (e) {
    next(e);
  }
});

export default router;
