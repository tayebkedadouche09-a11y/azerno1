import { Router } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function nextNumber(client: import('pg').PoolClient, key: string, prefix: string) {
  const row = await client.query<{ value: { counter?: number } }>('SELECT value FROM app_settings WHERE key=$1 FOR UPDATE', [key]);
  const counter = Number(row.rows[0]?.value?.counter ?? 0) + 1;
  await client.query(`INSERT INTO app_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, [key, JSON.stringify({ counter })]);
  return `${prefix}${String(counter).padStart(6, '0')}`;
}

router.get('/expenses', async (_req, res, next) => {
  try { const result = await query(`SELECT e.*, s.name AS supplier_name FROM expenses e LEFT JOIN suppliers s ON s.id=e.supplier_id ORDER BY e.expense_date DESC,e.created_at DESC`); res.json({ items: result.rows }); } catch(e) { next(e); }
});

router.post('/expenses', requireRole('owner','manager'), async (req,res,next) => {
  try {
    const category=String(req.body?.category??'').trim(); const amount=Number(req.body?.amount);
    if(!category || !Number.isFinite(amount) || amount<0) return res.status(400).json({error:'Category and valid non-negative amount are required'});
    const idempotencyKey = req.body?.idempotencyKey ? String(req.body.idempotencyKey) : null;

    const result=await transaction(async client=>{
      let r;
      if (idempotencyKey) {
        // The idempotency index is partial (NULL keys are intentionally allowed),
        // so PostgreSQL needs the matching index predicate for conflict inference.
        r=await client.query(
          `INSERT INTO expenses(id,category,amount,expense_date,supplier_id,note,created_by,idempotency_key)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
           DO UPDATE SET id=expenses.id
           RETURNING *`,
          [req.body?.id ?? undefined,category,amount,req.body?.date??new Date().toISOString().slice(0,10),req.body?.supplierId??null,req.body?.note??null,req.user!.id,idempotencyKey]
        );
      } else {
        // Client-generated IDs make retries safe even when no explicit idempotency
        // key is available (for example after an online request times out).
        r=await client.query(
          `INSERT INTO expenses(id,category,amount,expense_date,supplier_id,note,created_by)
           VALUES($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO UPDATE SET id=expenses.id
           RETURNING *`,
          [req.body?.id ?? undefined,category,amount,req.body?.date??new Date().toISOString().slice(0,10),req.body?.supplierId??null,req.body?.note??null,req.user!.id]
        );
      }
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'create','expense',$2,$3) ON CONFLICT DO NOTHING`,[req.user!.id,r.rows[0].id,JSON.stringify(r.rows[0])]);
      return r.rows[0];
    });
    res.status(201).json(result);
  } catch(e){next(e);}
});

router.get('/purchases', async (_req,res,next)=>{
  try { const r=await query(`SELECT p.*,s.name AS supplier_name,COALESCE(json_agg(pi ORDER BY pi.id) FILTER(WHERE pi.id IS NOT NULL),'[]') AS items FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id LEFT JOIN purchase_items pi ON pi.purchase_id=p.id GROUP BY p.id,s.name ORDER BY p.purchase_date DESC,p.created_at DESC`); res.json({items:r.rows}); } catch(e){next(e);}
});

router.post('/purchases', requireRole('owner','manager'), async(req,res,next)=>{
  try{
    const items=Array.isArray(req.body?.items)?req.body.items:[]; if(!items.length) return res.status(400).json({error:'At least one purchase item is required'});
    const result=await transaction(async client=>{
      let total=0; const normalized=[];
      for(const item of items){const q=Number(item.quantity), c=Number(item.unitCost); if(!item.variantId||!Number.isFinite(q)||q<=0||!Number.isFinite(c)||c<0) throw new Error('Invalid purchase item'); const line=q*c; total+=line; normalized.push({variantId:item.variantId,quantity:q,unitCost:c,total:line,description:String(item.description??'Purchase item')});}
      const number=await nextNumber(client,'purchase_number','ACH-');
      const p=await client.query(`INSERT INTO purchases(number,supplier_id,purchase_date,subtotal,total,paid_total,status,notes,created_by) VALUES($1,$2,$3,$4,$4,0,'received',$5,$6) RETURNING *`,[number,req.body?.supplierId??null,req.body?.date??new Date().toISOString().slice(0,10),total,req.body?.notes??null,req.user!.id]);
      for(const item of normalized){await client.query(`INSERT INTO purchase_items(purchase_id,variant_id,description,quantity,unit_cost,total) VALUES($1,$2,$3,$4,$5,$6)`,[p.rows[0].id,item.variantId,item.description,item.quantity,item.unitCost,item.total]); await client.query(`INSERT INTO inventory_balances(variant_id,quantity,reserved_quantity) VALUES($1,$2,0) ON CONFLICT(variant_id) DO UPDATE SET quantity=inventory_balances.quantity+$2,updated_at=NOW()`,[item.variantId,item.quantity]); await client.query(`INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,reference_id,idempotency_key,created_by) VALUES($1,'purchase',$2,'purchase',$3,$4,$5)`,[item.variantId,item.quantity,p.rows[0].id,`purchase:${p.rows[0].id}:${item.variantId}`,req.user!.id]);}
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'create','purchase',$2,$3)`,[req.user!.id,p.rows[0].id,JSON.stringify(p.rows[0])]); return p.rows[0];
    }); res.status(201).json(result);
  }catch(e){next(e);}
});

router.get('/cash-summary', async (_req,res,next)=>{
  try{const r=await query(`SELECT COALESCE((SELECT SUM(amount) FROM payments),0) AS incoming,COALESCE((SELECT SUM(amount) FROM expenses),0) AS expenses,COALESCE((SELECT SUM(paid_total) FROM purchases),0) AS purchases_paid`); res.json(r.rows[0]);}catch(e){next(e);}
});

export default router;
