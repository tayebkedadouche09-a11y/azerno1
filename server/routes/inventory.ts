import { Router } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/returns', async (_req, res, next) => {
  try {
    const result = await query(`SELECT r.*, c.name AS customer_name, o.number AS order_number, v.name AS variant_name FROM product_returns r LEFT JOIN customers c ON c.id=r.customer_id LEFT JOIN orders o ON o.id=r.order_id LEFT JOIN product_variants v ON v.id=r.variant_id ORDER BY r.return_date DESC, r.created_at DESC`);
    res.json({ items: result.rows });
  } catch (e) { next(e); }
});

router.post('/returns', requireRole('owner','manager','worker'), async (req, res, next) => {
  try {
    const result = await transaction(async client => {
      const variantId = String(req.body?.variantId ?? '');
      const quantity = Number(req.body?.quantity);
      const condition = String(req.body?.condition ?? 'resalable');
      if (!variantId || !Number.isFinite(quantity) || quantity <= 0) throw new Error('Valid variant and quantity are required');
      if (!['resalable','damaged','expired'].includes(condition)) throw new Error('Invalid return condition');
      const variant = await client.query(`SELECT id FROM product_variants WHERE id=$1 AND active=true`, [variantId]);
      if (!variant.rows[0]) throw new Error('Product variant not found');
      if (req.body?.orderId) {
        const order = await client.query(`SELECT id FROM orders WHERE id=$1`, [req.body.orderId]);
        if (!order.rows[0]) throw new Error('Order not found');
      }
      const row = await client.query(`INSERT INTO product_returns(order_id,customer_id,variant_id,quantity,reason,condition,return_date,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [req.body?.orderId ?? null, req.body?.customerId ?? null, variantId, quantity, String(req.body?.reason ?? 'Customer return'), condition, req.body?.returnDate ?? new Date().toISOString().slice(0,10), req.body?.notes ?? null, req.user!.id]);
      if (condition === 'resalable') {
        await client.query(`INSERT INTO inventory_balances(variant_id,quantity,reserved_quantity) VALUES($1,$2,0) ON CONFLICT(variant_id) DO UPDATE SET quantity=inventory_balances.quantity+EXCLUDED.quantity, updated_at=NOW()`, [variantId, quantity]);
        await client.query(`INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,reference_id,idempotency_key,created_by) VALUES($1,'return',$2,'return',$3,$4,$5)`, [variantId, quantity, row.rows[0].id, `return:${row.rows[0].id}`, req.user!.id]);
      }
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'create','product_return',$2,$3)`, [req.user!.id, row.rows[0].id, JSON.stringify(row.rows[0])]);
      return row.rows[0];
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.get('/waste', async (_req, res, next) => {
  try {
    const result = await query(`SELECT w.*, v.name AS variant_name, p.name AS product_name FROM waste_losses w LEFT JOIN product_variants v ON v.id=w.variant_id LEFT JOIN products p ON p.id=v.product_id ORDER BY w.loss_date DESC, w.created_at DESC`);
    res.json({ items: result.rows });
  } catch (e) { next(e); }
});

router.post('/waste', requireRole('owner','manager','worker'), async (req, res, next) => {
  try {
    const result = await transaction(async client => {
      const variantId = String(req.body?.variantId ?? '');
      const quantity = Number(req.body?.quantity);
      if (!variantId || !Number.isFinite(quantity) || quantity <= 0 || !req.body?.reason) throw new Error('Variant, positive quantity and reason are required');
      const stock = await client.query(`SELECT quantity,reserved_quantity FROM inventory_balances WHERE variant_id=$1 FOR UPDATE`, [variantId]);
      if (!stock.rows[0] || Number(stock.rows[0].quantity) - Number(stock.rows[0].reserved_quantity) < quantity) throw new Error('Insufficient available stock');
      const row = await client.query(`INSERT INTO waste_losses(variant_id,quantity,reason,loss_date,notes,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [variantId, quantity, String(req.body.reason), req.body?.lossDate ?? new Date().toISOString().slice(0,10), req.body?.notes ?? null, req.user!.id]);
      await client.query(`UPDATE inventory_balances SET quantity=quantity-$2, updated_at=NOW() WHERE variant_id=$1`, [variantId, quantity]);
      await client.query(`INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,reference_id,idempotency_key,created_by) VALUES($1,'waste',$2,'waste',$3,$4,$5)`, [variantId, -quantity, row.rows[0].id, `waste:${row.rows[0].id}`, req.user!.id]);
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'create','waste_loss',$2,$3)`, [req.user!.id, row.rows[0].id, JSON.stringify(row.rows[0])]);
      return row.rows[0];
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, [req.user!.id]);
    res.json({ items: result.rows });
  } catch (e) { next(e); }
});

router.post('/notifications/:id/read', async (req, res, next) => {
  try {
    const result = await query(`UPDATE notifications SET read_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *`, [req.params.id, req.user!.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Notification not found' });
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

export default router;
