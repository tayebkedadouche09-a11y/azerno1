import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const SCHEMA_VERSION = '026';

router.get('/export', requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId;
    const tables = [
      'customers', 'suppliers', 'products', 'product_variants',
      'orders', 'payments', 'expenses', 'purchases',
    ];
    const data: Record<string, unknown[]> = {};
    for (const t of tables) {
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

export default router;
