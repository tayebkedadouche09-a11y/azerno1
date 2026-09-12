import { Router } from 'express';
import { transaction, query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function nextNumber(client: import('pg').PoolClient, key: string, prefix: string) {
  const row = await client.query<{ value: { counter?: number } }>('SELECT value FROM app_settings WHERE key=$1 FOR UPDATE', [key]);
  const counter = Number(row.rows[0]?.value?.counter ?? 0) + 1;
  await client.query(`INSERT INTO app_settings(key,value) VALUES ($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, [key, JSON.stringify({ counter })]);
  return `${prefix}${String(counter).padStart(6, '0')}`;
}

router.get('/deliveries', async (_req, res, next) => {
  try {
    const result = await query(`SELECT d.*, o.number AS order_number, c.name AS customer_name FROM deliveries d JOIN orders o ON o.id=d.order_id LEFT JOIN customers c ON c.id=o.customer_id ORDER BY d.delivery_date DESC, d.created_at DESC`);
    res.json({ items: result.rows });
  } catch (e) { next(e); }
});

router.post('/deliveries', requireRole('owner','manager','worker'), async (req, res, next) => {
  try {
    const orderId = String(req.body?.orderId ?? '');
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!orderId || !items.length) return res.status(400).json({ error: 'Order and delivery items are required' });

    const created = await transaction(async client => {
      const order = await client.query(`SELECT * FROM orders WHERE id=$1 FOR UPDATE`, [orderId]);
      if (!order.rows[0]) throw new Error('Order not found');

      const number = await nextNumber(client, 'delivery_number', 'BL-');
      const delivery = await client.query(
        `INSERT INTO deliveries(number,order_id,delivery_date,status,delivery_person,address,notes,created_by)
         VALUES($1,$2,$3,'pending',$4,$5,$6,$7) RETURNING *`,
        [number, orderId, req.body?.deliveryDate ?? new Date().toISOString().slice(0,10), req.body?.deliveryPerson ?? null, req.body?.address ?? null, req.body?.notes ?? null, req.user!.id]
      );

      for (const item of items) {
        const qty = Number(item.quantity);
        if (!item.variantId || !Number.isFinite(qty) || qty <= 0) throw new Error('Invalid delivery quantity');

        const oi = await client.query(
          `SELECT id, quantity, delivered_quantity FROM order_items WHERE order_id=$1 AND variant_id=$2 FOR UPDATE`,
          [orderId, item.variantId]
        );
        if (!oi.rows[0]) throw new Error('Variant is not part of the order');

        const remaining = Number(oi.rows[0].quantity) - Number(oi.rows[0].delivered_quantity);
        if (qty > remaining) throw new Error('Delivery exceeds remaining order quantity');

        const stock = await client.query(
          `SELECT quantity,reserved_quantity FROM inventory_balances WHERE variant_id=$1 FOR UPDATE`,
          [item.variantId]
        );
        if (!stock.rows[0] || Number(stock.rows[0].quantity) < qty || Number(stock.rows[0].reserved_quantity) < qty) {
          throw new Error('Insufficient reserved stock for delivery');
        }

        await client.query(`INSERT INTO delivery_items(delivery_id,variant_id,quantity) VALUES($1,$2,$3)`, [delivery.rows[0].id, item.variantId, qty]);
        await client.query(`UPDATE order_items SET delivered_quantity=delivered_quantity+$2 WHERE id=$1`, [oi.rows[0].id, qty]);
        await client.query(`UPDATE inventory_balances SET quantity=quantity-$2,reserved_quantity=reserved_quantity-$2,updated_at=NOW() WHERE variant_id=$1`, [item.variantId, qty]);
        await client.query(
          `INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,reference_id,idempotency_key,created_by)
           VALUES($1,'delivery',$2,'delivery',$3,$4,$5)`,
          [item.variantId, -qty, delivery.rows[0].id, `delivery:${delivery.rows[0].id}:${item.variantId}`, req.user!.id]
        );
      }

      // Determine completion from the complete order, not only from the lines
      // included in this delivery. This prevents a partial delivery from being
      // incorrectly marked as fully delivered when other order lines are omitted.
      const remainingItems = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM order_items
         WHERE order_id=$1 AND delivered_quantity < quantity`,
        [orderId]
      );
      const allDelivered = Number(remainingItems.rows[0]?.count ?? 0) === 0;
      const status = allDelivered ? 'delivered' : 'partially_delivered';

      await client.query(`UPDATE deliveries SET status=$2 WHERE id=$1`, [delivery.rows[0].id, status]);
      await client.query(`UPDATE orders SET status=$2, updated_at=NOW() WHERE id=$1`, [orderId, status]);

      return { ...delivery.rows[0], status };
    });

    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.get('/invoices', async (_req, res, next) => {
  try {
    const result = await query(`SELECT i.*, c.name AS customer_name, o.number AS order_number FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id LEFT JOIN orders o ON o.id=i.order_id ORDER BY i.invoice_date DESC, i.created_at DESC`);
    res.json({ items: result.rows });
  } catch(e) { next(e); }
});

router.post('/invoices/from-order/:orderId', requireRole('owner','manager'), async (req, res, next) => {
  try {
    const invoice = await transaction(async client => {
      const order = await client.query(`SELECT * FROM orders WHERE id=$1 FOR UPDATE`, [req.params.orderId]);
      if (!order.rows[0]) throw new Error('Order not found');
      const existing = await client.query(`SELECT id,number FROM invoices WHERE order_id=$1 AND status <> 'cancelled' LIMIT 1`, [req.params.orderId]);
      if (existing.rows[0]) return existing.rows[0];
      const number = await nextNumber(client,'invoice_number','FAC-');
      const inv = await client.query(`INSERT INTO invoices(number,order_id,customer_id,subtotal,total,paid_total,status,created_by) VALUES($1,$2,$3,$4,$5,$6,'unpaid',$7) RETURNING *`, [number, order.rows[0].id, order.rows[0].customer_id, order.rows[0].subtotal, order.rows[0].total, order.rows[0].paid_total, req.user!.id]);
      const items = await client.query(`SELECT * FROM order_items WHERE order_id=$1`, [req.params.orderId]);
      for (const item of items.rows) await client.query(`INSERT INTO invoice_items(invoice_id,variant_id,description,quantity,unit_price,unit_cost,discount) VALUES($1,$2,$3,$4,$5,$6,$7)`, [inv.rows[0].id,item.variant_id,`Order item ${item.variant_id}`,item.quantity,item.unit_price,item.unit_cost,item.discount]);
      await client.query(`UPDATE orders SET status='invoiced',updated_at=NOW() WHERE id=$1 AND status IN ('delivered','partially_delivered','ready')`, [req.params.orderId]);
      return inv.rows[0];
    });
    res.status(201).json(invoice);
  } catch(e) { next(e); }
});

export default router;
