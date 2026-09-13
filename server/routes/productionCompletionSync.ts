import { Router } from 'express';
import { transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/complete', async (req, res, next) => {
  try {
    const batchId = String(req.body?.batchId ?? '').trim();
    const requestedVariantId = String(req.body?.outputVariantId ?? '').trim();
    const idempotencyKey = String(req.body?.idempotencyKey ?? req.header('Idempotency-Key') ?? '').trim();
    if (!batchId || !idempotencyKey) return res.status(400).json({ error: 'batchId and idempotencyKey are required' });

    const result = await transaction(async client => {
      const batchResult = await client.query<any>(`SELECT * FROM production_batches WHERE id=$1 FOR UPDATE`, [batchId]);
      const batch = batchResult.rows[0];
      if (!batch) throw new Error('Production batch not found');
      const variantId = String(batch.output_variant_id ?? '');
      if (!variantId) throw new Error('Production batch has no output variant');
      if (requestedVariantId && requestedVariantId !== variantId) throw new Error('Output variant does not match production batch');

      const existing = await client.query(`SELECT id FROM production_batches WHERE completion_idempotency_key=$1 FOR UPDATE`, [idempotencyKey]);
      if (existing.rows[0]) return { ...batch, status: 'completed', output_variant_id: variantId, duplicate: true };
      if (String(batch.status) === 'completed') return { ...batch, status: 'completed', output_variant_id: variantId, duplicate: true };

      await client.query(`UPDATE production_batches SET status='completed',completion_idempotency_key=$2,updated_at=NOW() WHERE id=$1`, [batchId, idempotencyKey]);
      await client.query(`INSERT INTO inventory_balances(variant_id,quantity,reserved_quantity) VALUES($1,$2,0) ON CONFLICT(variant_id) DO UPDATE SET quantity=inventory_balances.quantity+$2,updated_at=NOW()`, [variantId, Number(batch.output_quantity)]);
      await client.query(`INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,reference_id,idempotency_key,created_by) VALUES($1,'production',$2,'production',$3,$4,$5) ON CONFLICT(idempotency_key) DO NOTHING`, [variantId, Number(batch.output_quantity), batchId, `production:${batchId}:${variantId}`, req.user!.id]);
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'complete','production_batch',$2,$3)`, [req.user!.id, batchId, JSON.stringify({ batchId, outputVariantId: variantId, outputQuantity: Number(batch.output_quantity) })]);
      return { ...batch, status: 'completed', output_variant_id: variantId, duplicate: false };
    });

    res.json({ item: result });
  } catch (error) {
    next(error);
  }
});

export default router;
