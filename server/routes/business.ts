import { Router } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/customers', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM customers WHERE active = TRUE ORDER BY name');
    res.json({ items: result.rows });
  } catch (error) { next(error); }
});

router.post('/customers', async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Customer name is required' });
    const result = await query(
      `INSERT INTO customers(name, phone, address, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, req.body?.phone ?? null, req.body?.address ?? null, req.body?.notes ?? null],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.get('/products', async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT p.*, c.name AS category_name,
        COALESCE(json_agg(v ORDER BY v.name) FILTER (WHERE v.id IS NOT NULL), '[]') AS variants
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN product_variants v ON v.product_id = p.id AND v.active = TRUE
      WHERE p.active = TRUE
      GROUP BY p.id, c.name
      ORDER BY p.name
    `);
    res.json({ items: result.rows });
  } catch (error) { next(error); }
});

router.post('/products', requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const variant = req.body?.variant;
    if (!name || !variant?.name || !variant?.unit) return res.status(400).json({ error: 'Product name and variant name/unit are required' });

    const result = await transaction(async (client) => {
      const product = await client.query(
        `INSERT INTO products(name, name_ar) VALUES ($1,$2) RETURNING *`,
        [name, req.body?.nameAr ?? null],
      );
      const createdVariant = await client.query(
        `INSERT INTO product_variants(
          product_id,name,sku,barcode,unit,weight_grams,package_type,
          retail_price,wholesale_price,production_cost,min_stock,min_order_qty,expiry_days,image_url
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [
          product.rows[0].id, variant.name, variant.sku ?? null, variant.barcode ?? null,
          variant.unit, variant.weightGrams ?? null, variant.packageType ?? null,
          Number(variant.retailPrice ?? 0), Number(variant.wholesalePrice ?? 0), Number(variant.productionCost ?? 0),
          Number(variant.minStock ?? 0), Number(variant.minOrderQty ?? 1), variant.expiryDays ?? null, variant.imageUrl ?? null,
        ],
      );
      await client.query(`INSERT INTO inventory_balances(variant_id) VALUES ($1) ON CONFLICT DO NOTHING`, [createdVariant.rows[0].id]);
      return { ...product.rows[0], variants: [createdVariant.rows[0]] };
    });
    res.status(201).json(result);
  } catch (error) { next(error); }
});

router.get('/orders', async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT o.*, c.name AS customer_name,
        COALESCE(json_agg(oi ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id, c.name
      ORDER BY o.created_at DESC
    `);
    res.json({ items: result.rows });
  } catch (error) { next(error); }
});

async function nextNumber(client: import('pg').PoolClient, key: string, prefix: string) {
  const current = await client.query<{ value: { counter?: number } }>(
    `SELECT value FROM app_settings WHERE key = $1 FOR UPDATE`, [key],
  );
  const counter = Number(current.rows[0]?.value?.counter ?? 0) + 1;
  await client.query(
    `INSERT INTO app_settings(key,value) VALUES ($1,$2)
     ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify({ counter })],
  );
  return `${prefix}${String(counter).padStart(6, '0')}`;
}

router.post('/orders', async (req, res, next) => {
  try {
    const customerId = req.body?.customerId || null;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'At least one order item is required' });

    const created = await transaction(async (client) => {
      const normalized: Array<{ variantId: string; quantity: number; unitPrice: number; unitCost: number; discount: number }> = [];
      let subtotal = 0;
      let costTotal = 0;

      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!item.variantId || !Number.isFinite(quantity) || quantity <= 0) throw new Error('Invalid order quantity');
        const variantResult = await client.query(
          `SELECT id, retail_price, wholesale_price, production_cost FROM product_variants WHERE id = $1 AND active = TRUE FOR SHARE`,
          [item.variantId],
        );
        const variant = variantResult.rows[0];
        if (!variant) throw new Error('Product variant not found');

        const balance = await client.query(
          `SELECT quantity, reserved_quantity FROM inventory_balances WHERE variant_id = $1 FOR UPDATE`, [item.variantId],
        );
        const available = Number(balance.rows[0]?.quantity ?? 0) - Number(balance.rows[0]?.reserved_quantity ?? 0);
        if (available < quantity) throw new Error(`Insufficient available stock for variant ${item.variantId}`);

        const unitPrice = Number(item.unitPrice ?? variant.retail_price);
        const unitCost = Number(variant.production_cost);
        const discount = Number(item.discount ?? 0);
        if (unitPrice < 0 || discount < 0) throw new Error('Invalid price or discount');
        subtotal += quantity * unitPrice - discount;
        costTotal += quantity * unitCost;
        normalized.push({ variantId: item.variantId, quantity, unitPrice, unitCost, discount });
      }

      const number = await nextNumber(client, 'order_number', 'BC-');
      const orderResult = await client.query(
        `INSERT INTO orders(number,customer_id,status,payment_status,delivery_date,subtotal,total,cost_total,created_by)
         VALUES ($1,$2,'confirmed','unpaid',$3,$4,$5,$6,$7) RETURNING *`,
        [number, customerId, req.body?.deliveryDate ?? null, subtotal, subtotal, costTotal, req.user!.id],
      );

      for (const item of normalized) {
        await client.query(
          `INSERT INTO order_items(order_id,variant_id,quantity,unit_price,unit_cost,discount) VALUES ($1,$2,$3,$4,$5,$6)`,
          [orderResult.rows[0].id, item.variantId, item.quantity, item.unitPrice, item.unitCost, item.discount],
        );
        await client.query(
          `UPDATE inventory_balances SET reserved_quantity = reserved_quantity + $2, updated_at = NOW() WHERE variant_id = $1`,
          [item.variantId, item.quantity],
        );
        await client.query(
          `INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,reference_id,idempotency_key,created_by)
           VALUES ($1,'order_reservation',$2,'order',$3,$4,$5)`,
          [item.variantId, item.quantity, orderResult.rows[0].id, `order:${orderResult.rows[0].id}:${item.variantId}`, req.user!.id],
        );
      }

      await client.query(
        `INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES ($1,'create','order',$2,$3)`,
        [req.user!.id, orderResult.rows[0].id, JSON.stringify(orderResult.rows[0])],
      );
      return orderResult.rows[0];
    });

    res.status(201).json(created);
  } catch (error) { next(error); }
});

router.post('/payments', async (req, res, next) => {
  try {
    const orderId = String(req.body?.orderId ?? '');
    const amount = Number(req.body?.amount);
    if (!orderId || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Order and positive payment amount are required' });

    const payment = await transaction(async (client) => {
      const order = await client.query(`SELECT id,customer_id,total,paid_total FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
      if (!order.rows[0]) throw new Error('Order not found');
      const remaining = Number(order.rows[0].total) - Number(order.rows[0].paid_total);
      if (amount > remaining) throw new Error('Payment exceeds outstanding balance');

      const inserted = await client.query(
        `INSERT INTO payments(customer_id,order_id,amount,method,note,idempotency_key,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [order.rows[0].customer_id, orderId, amount, String(req.body?.method ?? 'cash'), req.body?.note ?? null, req.body?.idempotencyKey ?? null, req.user!.id],
      );
      const paidTotal = Number(order.rows[0].paid_total) + amount;
      const status = paidTotal >= Number(order.rows[0].total) ? 'paid' : 'partially_paid';
      await client.query(`UPDATE orders SET paid_total = $2, payment_status = $3, status = CASE WHEN status = 'delivered' AND $2 >= total THEN 'paid' ELSE status END, updated_at = NOW() WHERE id = $1`, [orderId, paidTotal, status]);
      return inserted.rows[0];
    });

    res.status(201).json(payment);
  } catch (error) { next(error); }
});

export default router;
