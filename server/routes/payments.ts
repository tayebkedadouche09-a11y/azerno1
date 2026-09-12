import { Router } from 'express';
import { transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/payments', async (req, res, next) => {
  try {
    const orderId = String(req.body?.orderId ?? '');
    const amount = Number(req.body?.amount);
    const idempotencyKey = req.body?.idempotencyKey ? String(req.body.idempotencyKey) : null;
    if (!orderId || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Order and positive payment amount are required' });

    const payment = await transaction(async client => {
      if (idempotencyKey) {
        const existing = await client.query('SELECT * FROM payments WHERE idempotency_key=$1 LIMIT 1', [idempotencyKey]);
        if (existing.rows[0]) return existing.rows[0];
      }
      const order = await client.query('SELECT id,customer_id,total,paid_total,status FROM orders WHERE id=$1 FOR UPDATE', [orderId]);
      if (!order.rows[0]) throw new Error('Order not found');
      if (String(order.rows[0].status) === 'cancelled') throw new Error('Cannot record payment for a cancelled order');
      const remaining = Number(order.rows[0].total) - Number(order.rows[0].paid_total);
      if (amount > remaining) throw new Error('Payment exceeds outstanding balance');
      const inserted = await client.query(`INSERT INTO payments(customer_id,order_id,amount,method,note,idempotency_key,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [order.rows[0].customer_id, orderId, amount, String(req.body?.method ?? 'cash'), req.body?.note ?? null, idempotencyKey, req.user!.id]);
      const paidTotal = Number(order.rows[0].paid_total) + amount;
      const paymentStatus = paidTotal >= Number(order.rows[0].total) ? 'paid' : 'partially_paid';
      await client.query(`UPDATE orders SET paid_total=$2,payment_status=$3,status=CASE WHEN status='delivered' AND $2>=total THEN 'paid' ELSE status END,updated_at=NOW() WHERE id=$1`, [orderId, paidTotal, paymentStatus]);
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'create','payment',$2,$3)`, [req.user!.id, inserted.rows[0].id, JSON.stringify(inserted.rows[0])]);
      return inserted.rows[0];
    });
    res.status(201).json(payment);
  } catch (error) { next(error); }
});

export default router;
