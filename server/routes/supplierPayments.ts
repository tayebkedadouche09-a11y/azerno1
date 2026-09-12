import { Router } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const purchaseId = req.query.purchaseId ? String(req.query.purchaseId) : null;
    const supplierId = req.query.supplierId ? String(req.query.supplierId) : null;
    const result = await query(`
      SELECT sp.*, p.number AS purchase_number, s.name AS supplier_name
      FROM supplier_payments sp
      JOIN purchases p ON p.id=sp.purchase_id
      LEFT JOIN suppliers s ON s.id=sp.supplier_id
      WHERE ($1::uuid IS NULL OR sp.purchase_id=$1)
        AND ($2::uuid IS NULL OR sp.supplier_id=$2)
      ORDER BY sp.payment_date DESC, sp.created_at DESC`, [purchaseId, supplierId]);
    res.json({ items: result.rows });
  } catch (e) { next(e); }
});

router.post('/', requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const purchaseId = String(req.body?.purchaseId ?? '').trim();
    const amount = Number(req.body?.amount);
    if (!purchaseId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Purchase and positive payment amount are required' });
    }

    const idempotencyKey = req.body?.idempotencyKey ? String(req.body.idempotencyKey) : null;
    const result = await transaction(async client => {
      if (idempotencyKey) {
        const existing = await client.query(`SELECT * FROM supplier_payments WHERE idempotency_key=$1 LIMIT 1`, [idempotencyKey]);
        if (existing.rows[0]) return existing.rows[0];
      }

      const purchase = await client.query<{
        id: string;
        supplier_id: string | null;
        total: number | string;
        paid_total: number | string;
        status: string;
      }>(`SELECT id,supplier_id,total,paid_total,status FROM purchases WHERE id=$1 FOR UPDATE`, [purchaseId]);
      if (!purchase.rows[0]) throw new Error('Purchase not found');
      if (purchase.rows[0].status === 'cancelled') throw new Error('Cannot pay a cancelled purchase');

      const total = Number(purchase.rows[0].total);
      const paid = Number(purchase.rows[0].paid_total);
      const outstanding = Math.max(total - paid, 0);
      if (amount > outstanding + 0.005) throw new Error(`Payment exceeds purchase balance (${outstanding.toFixed(2)})`);

      const payment = await client.query(`
        INSERT INTO supplier_payments(
          purchase_id,supplier_id,amount,payment_date,method,reference,note,created_by,idempotency_key
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *`, [
          purchaseId,
          purchase.rows[0].supplier_id,
          amount,
          req.body?.date ?? new Date().toISOString().slice(0, 10),
          String(req.body?.method ?? 'cash'),
          req.body?.reference ?? null,
          req.body?.note ?? null,
          req.user!.id,
          idempotencyKey,
        ]);

      const newPaid = paid + amount;
      await client.query(`UPDATE purchases SET paid_total=$2 WHERE id=$1`, [purchaseId, newPaid]);
      await client.query(
        `INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'create','supplier_payment',$2,$3)`,
        [req.user!.id, payment.rows[0].id, JSON.stringify(payment.rows[0])],
      );
      return payment.rows[0];
    });

    res.status(201).json(result);
  } catch (e) { next(e); }
});

export default router;
