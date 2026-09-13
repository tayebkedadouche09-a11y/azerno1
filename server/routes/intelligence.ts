import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/overview', async (_req, res, next) => {
  try {
    const [sales, expenses, stock, debts, low, top] = await Promise.all([
      query<{ revenue: string; cost: string; collected: string }>(
        `SELECT COALESCE(SUM(total),0)::text revenue, COALESCE(SUM(cost_total),0)::text cost, COALESCE(SUM(paid_total),0)::text collected
         FROM orders WHERE status<>'cancelled' AND created_at >= NOW() - INTERVAL '30 days'`
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount),0)::text total FROM expenses WHERE expense_date >= (CURRENT_DATE - INTERVAL '30 days')`
      ),
      query<{ variants: string; available: string; valuation: string }>(
        `SELECT COUNT(*)::text variants,
                COALESCE(SUM(quantity-reserved_quantity),0)::text available,
                COALESCE(SUM((quantity-reserved_quantity)*v.production_cost),0)::text valuation
         FROM inventory_balances b JOIN product_variants v ON v.id=b.variant_id WHERE v.active=TRUE`
      ),
      query<{ outstanding: string }>(
        `SELECT COALESCE(SUM(total-paid_total),0)::text outstanding FROM orders WHERE status<>'cancelled'`
      ),
      query(
        `SELECT v.name, (b.quantity-b.reserved_quantity)::float available, v.min_stock
         FROM product_variants v JOIN inventory_balances b ON b.variant_id=v.id
         WHERE v.active=TRUE AND b.quantity-b.reserved_quantity <= v.min_stock
         ORDER BY available ASC LIMIT 10`
      ),
      query(
        `SELECT v.name, COALESCE(SUM(oi.quantity*(oi.unit_price-oi.unit_cost)),0)::float profit
         FROM order_items oi JOIN product_variants v ON v.id=oi.variant_id
         JOIN orders o ON o.id=oi.order_id WHERE o.status<>'cancelled' AND o.created_at >= NOW() - INTERVAL '30 days'
         GROUP BY v.name ORDER BY profit DESC LIMIT 5`
      ),
    ]);
    const s = sales.rows[0];
    const revenue = Number(s.revenue);
    const cost = Number(s.cost);
    const gross = revenue - cost;
    const exp = Number(expenses.rows[0].total);
    res.json({
      periodDays: 30,
      profit: { revenue, cost, grossMargin: gross, expenses: exp, net: gross - exp },
      inventory: {
        variants: Number(stock.rows[0].variants),
        availableUnits: Number(stock.rows[0].available),
        valuation: Number(stock.rows[0].valuation),
        lowStock: low.rows,
      },
      customerDebt: Number(debts.rows[0].outstanding),
      topProductsByProfit: top.rows,
      assumptions: ['Last 30 days of non-cancelled orders', 'Margin uses unit_cost on order lines'],
    });
  } catch (e) {
    next(e);
  }
});

router.get('/forecast/sales', async (req, res, next) => {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.historyDays ?? 28)));
    const r = await query<{ d: string; revenue: string }>(
      `SELECT created_at::date::text AS d, COALESCE(SUM(total),0)::text AS revenue
       FROM orders WHERE status<>'cancelled' AND created_at >= NOW() - ($1 || ' days')::interval
       GROUP BY created_at::date ORDER BY d`,
      [String(days)]
    );
    const series = r.rows.map((row) => ({ date: row.d, revenue: Number(row.revenue) }));
    const avg = series.length === 0 ? 0 : series.reduce((a, b) => a + b.revenue, 0) / series.length;
    const forecastNext7 = Array.from({ length: 7 }, (_, i) => ({
      dayOffset: i + 1,
      projectedRevenue: Math.round(avg * 100) / 100,
    }));
    res.json({
      historyDays: days,
      method: 'simple_daily_average',
      assumptions: [`Average daily revenue over last ${days} days of non-cancelled orders`],
      confidence: series.length >= 14 ? 'moderate' : series.length >= 7 ? 'low' : 'insufficient_history',
      history: series,
      forecastNext7,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/anomalies', async (_req, res, next) => {
  try {
    const alerts: Array<{ type: string; severity: string; reason: string; entity?: string; value?: number }> = [];
    const bigPayments = await query(
      `SELECT id, amount, created_at FROM payments
       WHERE created_at >= NOW() - INTERVAL '30 days'
         AND amount > (SELECT COALESCE(AVG(amount)*5, 0) FROM payments WHERE created_at >= NOW() - INTERVAL '90 days')
       ORDER BY amount DESC LIMIT 10`
    );
    for (const p of bigPayments.rows) {
      alerts.push({
        type: 'unusual_payment',
        severity: 'medium',
        reason: `Payment ${p.id} amount ${p.amount} exceeds ~5x average of last 90 days`,
        entity: String(p.id),
        value: Number(p.amount),
      });
    }
    const bigExpenses = await query(
      `SELECT id, amount, category FROM expenses
       WHERE expense_date >= CURRENT_DATE - INTERVAL '30 days'
         AND amount > (SELECT COALESCE(AVG(amount)*4, 0) FROM expenses WHERE expense_date >= CURRENT_DATE - INTERVAL '90 days')
       LIMIT 10`
    );
    for (const e of bigExpenses.rows) {
      alerts.push({
        type: 'abnormal_expense',
        severity: 'medium',
        reason: `Expense ${e.id} (${e.category}) amount ${e.amount} is >4x 90-day average`,
        entity: String(e.id),
        value: Number(e.amount),
      });
    }
    const stockNeg = await query(
      `SELECT v.name, b.quantity, b.reserved_quantity
       FROM inventory_balances b JOIN product_variants v ON v.id=b.variant_id
       WHERE b.quantity < 0 OR b.reserved_quantity > b.quantity LIMIT 20`
    );
    for (const s of stockNeg.rows) {
      alerts.push({
        type: 'unusual_inventory',
        severity: 'high',
        reason: `Variant ${s.name}: qty=${s.quantity} reserved=${s.reserved_quantity} violates stock invariants`,
        entity: String(s.name),
      });
    }
    res.json({ generatedAt: new Date().toISOString(), alerts });
  } catch (e) {
    next(e);
  }
});

router.get('/assistant', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? 'priorities').toLowerCase();
    const parts: string[] = [];
    if (q.includes('priorit') || q.includes('today') || q === 'priorities') {
      const low = await query(
        `SELECT COUNT(*)::int c FROM product_variants v
         JOIN inventory_balances b ON b.variant_id=v.id
         WHERE v.active AND b.quantity-b.reserved_quantity<=v.min_stock`
      );
      const debt = await query(
        `SELECT COALESCE(SUM(total-paid_total),0)::float o FROM orders WHERE status<>'cancelled'`
      );
      const pending = await query(
        `SELECT COUNT(*)::int c FROM orders WHERE status IN ('confirmed','preparing','ready')`
      );
      parts.push(
        `Priorites: ${low.rows[0].c} produit(s) sous seuil stock; creances clients ${debt.rows[0].o} DZD; ${pending.rows[0].c} commande(s) ouvertes.`
      );
    }
    if (q.includes('profit') || q.includes('marge') || q.includes('margin')) {
      const r = await query(
        `SELECT COALESCE(SUM(total-cost_total),0)::float g FROM orders WHERE status<>'cancelled' AND created_at>=NOW()-INTERVAL '30 days'`
      );
      parts.push(`Marge brute 30j (orders total-cost_total): ${r.rows[0].g} DZD.`);
    }
    if (q.includes('debt') || q.includes('dette') || q.includes('creance')) {
      const r = await query(
        `SELECT c.name, COALESCE(SUM(o.total-o.paid_total),0)::float bal
         FROM customers c JOIN orders o ON o.customer_id=c.id AND o.status<>'cancelled'
         GROUP BY c.name HAVING SUM(o.total-o.paid_total)>0 ORDER BY bal DESC LIMIT 5`
      );
      parts.push(
        r.rows.length
          ? `Plus grosses dettes: ${r.rows.map((x) => `${x.name}=${x.bal}`).join('; ')}`
          : 'Aucune creance client ouverte.'
      );
    }
    if (q.includes('stock') || q.includes('inventory')) {
      const r = await query(
        `SELECT v.name, (b.quantity-b.reserved_quantity)::float a FROM product_variants v
         JOIN inventory_balances b ON b.variant_id=v.id
         WHERE v.active AND b.quantity-b.reserved_quantity<=v.min_stock ORDER BY a ASC LIMIT 5`
      );
      parts.push(
        r.rows.length
          ? `Stock bas: ${r.rows.map((x) => `${x.name}=${x.a}`).join('; ')}`
          : 'Aucun produit sous seuil min_stock.'
      );
    }
    if (!parts.length) {
      parts.push('Questions supportees: priorities, profit/marge, debt/creances, stock. Donnees limitees a votre societe (RLS).');
    }
    res.json({
      query: q,
      answer: parts.join(' '),
      disclaimer: 'Reponses basees uniquement sur les agregats de la base (pas de faits inventes).',
    });
  } catch (e) {
    next(e);
  }
});

export default router;
