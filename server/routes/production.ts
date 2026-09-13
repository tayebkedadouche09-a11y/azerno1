import { Router } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function nextNumber(client: import('pg').PoolClient) {
  const row = await client.query<{ value: { counter?: number } }>('SELECT value FROM app_settings WHERE key=$1 FOR UPDATE', ['batch_number']);
  const n = Number(row.rows[0]?.value?.counter ?? 0) + 1;
  await client.query(`INSERT INTO app_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`, ['batch_number', JSON.stringify({ counter: n })]);
  return `LOT-${String(n).padStart(6, '0')}`;
}

router.get('/batches', async (_req, res, next) => {
  try {
    const r = await query(`SELECT pb.*,p.name AS product_name,pv.name AS variant_name FROM production_batches pb LEFT JOIN products p ON p.id=pb.product_id LEFT JOIN product_variants pv ON pv.id=(SELECT id FROM product_variants WHERE product_id=pb.product_id ORDER BY created_at LIMIT 1) ORDER BY pb.created_at DESC`);
    res.json({ items: r.rows });
  } catch (e) { next(e); }
});

router.post('/batches', requireRole('owner', 'manager', 'worker'), async (req, res, next) => {
  try {
    const milk = Number(req.body?.milkInputLiters ?? 0);
    const output = Number(req.body?.outputQuantity ?? 0);
    const cost = Number(req.body?.totalCost ?? 0);
    const variantId = String(req.body?.outputVariantId ?? '');
    const idempotencyKey = String(req.body?.idempotencyKey ?? req.header('Idempotency-Key') ?? '').trim() || null;
    if (milk <= 0 || output <= 0 || cost < 0 || !variantId) return res.status(400).json({ error: 'Milk input, output quantity, cost and output variant are required' });
    const result = await transaction(async client => {
      if (idempotencyKey) {
        const existing = await client.query(`SELECT * FROM production_batches WHERE idempotency_key=$1 FOR UPDATE`, [idempotencyKey]);
        if (existing.rows[0]) return existing.rows[0];
      }
      const variant = await client.query(`SELECT product_id FROM product_variants WHERE id=$1 AND active=true`, [variantId]);
      if (!variant.rows[0]) throw Object.assign(new Error('Output variant not found'), { status: 404 });
      const number = await nextNumber(client);
      const status = String(req.body?.status ?? 'curing') === 'completed' ? 'completed' : 'curing';
      const b = await client.query(`INSERT INTO production_batches(batch_number,product_id,milk_type,milk_input_liters,total_cost,output_quantity,cost_per_unit,expiry_date,status,notes,created_by,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [number, variant.rows[0].product_id, req.body?.milkType ?? null, milk, cost, output, cost / output, req.body?.expiryDate ?? null, status, req.body?.notes ?? null, req.user!.id, idempotencyKey]);
      if (status === 'completed') {
        await client.query(`INSERT INTO inventory_balances(variant_id,quantity,reserved_quantity) VALUES($1,$2,0) ON CONFLICT(variant_id) DO UPDATE SET quantity=inventory_balances.quantity+$2,updated_at=NOW()`, [variantId, output]);
        await client.query(`INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,reference_id,idempotency_key,created_by) VALUES($1,'production',$2,'production',$3,$4,$5) ON CONFLICT(idempotency_key) DO NOTHING`, [variantId, output, b.rows[0].id, `production:${b.rows[0].id}:${variantId}`, req.user!.id]);
      }
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'create','production_batch',$2,$3)`, [req.user!.id, b.rows[0].id, JSON.stringify({ id: b.rows[0].id, batchNumber: number, status })]);
      return b.rows[0];
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.patch('/batches/:id/complete', requireRole('owner', 'manager', 'worker'), async (req, res, next) => {
  try {
    const result = await transaction(async client => {
      const completionKey = String(req.body?.idempotencyKey ?? req.header('Idempotency-Key') ?? '').trim() || null;
      const batch = await client.query(`SELECT pb.*, pv.id AS variant_id FROM production_batches pb JOIN product_variants pv ON pv.product_id=pb.product_id AND pv.id=$2 WHERE pb.id=$1 FOR UPDATE`, [req.params.id, req.body?.outputVariantId]);
      if (!batch.rows[0]) throw Object.assign(new Error('Production batch not found'), { status: 404 });
      const b = batch.rows[0];
      if (completionKey) {
        const existing = await client.query(`SELECT * FROM production_batches WHERE completion_idempotency_key=$1 FOR UPDATE`, [completionKey]);
        if (existing.rows[0]) return { ...b, status: 'completed' };
      }
      if (b.status === 'completed') return b;
      await client.query(`UPDATE production_batches SET status='completed',completion_idempotency_key=$2,updated_at=NOW() WHERE id=$1`, [req.params.id, completionKey]);
      await client.query(`INSERT INTO inventory_balances(variant_id,quantity,reserved_quantity) VALUES($1,$2,0) ON CONFLICT(variant_id) DO UPDATE SET quantity=inventory_balances.quantity+$2,updated_at=NOW()`, [b.variant_id, b.output_quantity]);
      await client.query(`INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,reference_id,idempotency_key,created_by) VALUES($1,'production',$2,'production',$3,$4,$5) ON CONFLICT(idempotency_key) DO NOTHING`, [b.variant_id, b.output_quantity, b.id, `production:${b.id}:${b.variant_id}`, req.user!.id]);
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,before_data,after_data) VALUES($1,'update','production_batch',$2,$3,$4)`, [req.user!.id, b.id, JSON.stringify({ status: b.status }), JSON.stringify({ status: 'completed' })]);
      return { ...b, status: 'completed' };
    });
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/livestock', async (_req, res, next) => {
  try {
    const r = await query(`SELECT animal_type,COALESCE(SUM(CASE WHEN event_type IN ('purchase','birth') THEN quantity WHEN event_type IN ('sale','death','loss') THEN -quantity ELSE 0 END),0) AS current_count,COALESCE(SUM(CASE WHEN event_type IN ('feed','veterinary','medicine') THEN COALESCE(amount,0) ELSE 0 END),0) AS care_cost FROM livestock_events GROUP BY animal_type ORDER BY animal_type`);
    res.json({ items: r.rows });
  } catch (e) { next(e); }
});

router.post('/livestock/events', requireRole('owner', 'manager', 'worker'), async (req, res, next) => {
  try {
    const type = String(req.body?.eventType ?? ''), animal = String(req.body?.animalType ?? ''), q = Number(req.body?.quantity);
    const idempotencyKey = String(req.body?.idempotencyKey ?? req.header('Idempotency-Key') ?? '').trim() || null;
    if (!['purchase', 'sale', 'birth', 'death', 'loss', 'feed', 'veterinary', 'medicine', 'other'].includes(type) || !['cow', 'goat', 'sheep', 'mixed'].includes(animal) || !Number.isFinite(q) || q <= 0) return res.status(400).json({ error: 'Invalid livestock event' });
    const result = await transaction(async client => {
      if (idempotencyKey) {
        const existing = await client.query(`SELECT * FROM livestock_events WHERE idempotency_key=$1 FOR UPDATE`, [idempotencyKey]);
        if (existing.rows[0]) return existing.rows[0];
      }
      const r = await client.query(`INSERT INTO livestock_events(event_type,animal_type,quantity,amount,event_date,notes,created_by,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [type, animal, q, Number(req.body?.amount ?? 0), req.body?.date ?? new Date().toISOString().slice(0, 10), req.body?.notes ?? null, req.user!.id, idempotencyKey]);
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'create','livestock_event',$2,$3)`, [req.user!.id, r.rows[0].id, JSON.stringify(r.rows[0])]);
      return r.rows[0];
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.get('/feed', async (_req, res, next) => {
  try {
    const r = await query(`SELECT fr.*,s.name AS supplier_name FROM feed_records fr LEFT JOIN suppliers s ON s.id=fr.supplier_id ORDER BY fr.record_date DESC,fr.created_at DESC LIMIT 200`);
    res.json({ items: r.rows });
  } catch (e) { next(e); }
});

router.post('/feed', requireRole('owner', 'manager', 'worker'), async (req, res, next) => {
  try {
    const q = Number(req.body?.quantity), cost = Number(req.body?.cost ?? 0), animal = String(req.body?.animalType ?? 'mixed');
    const idempotencyKey = String(req.body?.idempotencyKey ?? req.header('Idempotency-Key') ?? '').trim() || null;
    if (!['cow', 'goat', 'sheep', 'mixed'].includes(animal) || !Number.isFinite(q) || q <= 0 || !Number.isFinite(cost) || cost < 0) return res.status(400).json({ error: 'Invalid feed record' });
    const result = await transaction(async client => {
      if (idempotencyKey) {
        const existing = await client.query(`SELECT * FROM feed_records WHERE idempotency_key=$1 FOR UPDATE`, [idempotencyKey]);
        if (existing.rows[0]) return existing.rows[0];
      }
      const r = await client.query(`INSERT INTO feed_records(animal_type,quantity,unit,cost,supplier_id,record_date,notes,created_by,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [animal, q, String(req.body?.unit ?? 'kg'), cost, req.body?.supplierId ?? null, req.body?.date ?? new Date().toISOString().slice(0, 10), req.body?.notes ?? null, req.user!.id, idempotencyKey]);
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'create','feed_record',$2,$3)`, [req.user!.id, r.rows[0].id, JSON.stringify(r.rows[0])]);
      return r.rows[0];
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
});

export default router;
