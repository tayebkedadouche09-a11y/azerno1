import { Router } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function nextNumber(client: import('pg').PoolClient, key: string, prefix: string) {
  await client.query(
    `INSERT INTO app_settings(key,value) VALUES($1,$2)
     ON CONFLICT(key) DO NOTHING`,
    [key, JSON.stringify({ counter: 0 })]
  );

  const row = await client.query<{ value: { counter?: number } }>(
    'SELECT value FROM app_settings WHERE key=$1 FOR UPDATE',
    [key]
  );
  const counter = Number(row.rows[0]?.value?.counter ?? 0) + 1;

  await client.query(
    `UPDATE app_settings
     SET value=$2, updated_at=NOW()
     WHERE key=$1`,
    [key, JSON.stringify({ counter })]
  );

  return `${prefix}${String(counter).padStart(6, '0')}`;
}

router.get('/suppliers', async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT s.*,
        COALESCE((SELECT SUM(p.total) FROM purchases p WHERE p.supplier_id=s.id AND p.status<>'cancelled'),0) AS total_purchases,
        COALESCE((SELECT SUM(p.paid_total) FROM purchases p WHERE p.supplier_id=s.id AND p.status<>'cancelled'),0) AS total_paid,
        GREATEST(COALESCE((SELECT SUM(p.total-p.paid_total) FROM purchases p WHERE p.supplier_id=s.id AND p.status<>'cancelled'),0),0) AS balance_owed
      FROM suppliers s WHERE s.active=TRUE ORDER BY s.name`);
    res.json({ items: result.rows });
  } catch(e) { next(e); }
});

router.post('/suppliers', requireRole('owner','manager'), async (req,res,next) => {
  try {
    const name=String(req.body?.name??'').trim();
    if(!name) return res.status(400).json({error:'Supplier name is required'});
    const result=await query(`INSERT INTO suppliers(name,phone,address,notes) VALUES($1,$2,$3,$4) RETURNING *`,[name,req.body?.phone??null,req.body?.address??null,req.body?.notes??null]);
    res.status(201).json({...result.rows[0],total_purchases:0,total_paid:0,balance_owed:0});
  } catch(e){ next(e); }
});

router.patch('/suppliers/:id', requireRole('owner','manager'), async (req,res,next) => {
  try {
    const result=await query(`UPDATE suppliers SET name=COALESCE($2,name),phone=COALESCE($3,phone),address=COALESCE($4,address),notes=COALESCE($5,notes),updated_at=NOW() WHERE id=$1 AND active=TRUE RETURNING *`,[req.params.id,req.body?.name??null,req.body?.phone??null,req.body?.address??null,req.body?.notes??null]);
    if(!result.rows[0]) return res.status(404).json({error:'Supplier not found'});
    res.json(result.rows[0]);
  } catch(e){ next(e); }
});

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
        r=await client.query(`INSERT INTO expenses(id,category,amount,expense_date,supplier_id,note,created_by,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET id=expenses.id RETURNING *`,[req.body?.id ?? undefined,category,amount,req.body?.date??new Date().toISOString().slice(0,10),req.body?.supplierId??null,req.body?.note??null,req.user!.id,idempotencyKey]);
      } else {
        r=await client.query(`INSERT INTO expenses(id,category,amount,expense_date,supplier_id,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET id=expenses.id RETURNING *`,[req.body?.id ?? undefined,category,amount,req.body?.date??new Date().toISOString().slice(0,10),req.body?.supplierId??null,req.body?.note??null,req.user!.id]);
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
    const items=Array.isArray(req.body?.items)?req.body.items:[];
    if(!items.length) return res.status(400).json({error:'At least one purchase item is required'});

    const result=await transaction(async client=>{
      const idempotencyKey=req.body?.idempotencyKey?String(req.body.idempotencyKey):null;
      if(idempotencyKey){
        const existing=await client.query(`SELECT id FROM purchases WHERE idempotency_key=$1 LIMIT 1`,[idempotencyKey]);
        if(existing.rows[0]){
          const existingPurchase=await client.query(`SELECT * FROM purchases WHERE id=$1`,[existing.rows[0].id]);
          return existingPurchase.rows[0];
        }
      }

      let total=0;
      const normalized: Array<{variantId:string;quantity:number;unitCost:number;total:number;description:string}> = [];
      for(const item of items){
        const q=Number(item.quantity), c=Number(item.unitCost);
        if(!item.variantId||!Number.isFinite(q)||q<=0||!Number.isFinite(c)||c<0) throw new Error('Invalid purchase item');
        const line=q*c;
        total+=line;
        normalized.push({variantId:String(item.variantId),quantity:q,unitCost:c,total:line,description:String(item.description??'Purchase item')});
      }

      const number=await nextNumber(client,'purchase_number','ACH-');
      const p=await client.query(`INSERT INTO purchases(number,supplier_id,purchase_date,subtotal,total,paid_total,status,notes,created_by,idempotency_key) VALUES($1,$2,$3,$4,$4,0,'received',$5,$6,$7) RETURNING *`,[number,req.body?.supplierId??null,req.body?.date??new Date().toISOString().slice(0,10),total,req.body?.notes??null,req.user!.id,idempotencyKey]);

      for(const item of normalized){
        const purchaseItem = await client.query<{id:string}>(
          `INSERT INTO purchase_items(purchase_id,variant_id,description,quantity,unit_cost,total)
           VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
          [p.rows[0].id,item.variantId,item.description,item.quantity,item.unitCost,item.total]
        );
        const purchaseItemId = purchaseItem.rows[0].id;

        await client.query(
          `INSERT INTO inventory_balances(variant_id,quantity,reserved_quantity)
           VALUES($1,$2,0)
           ON CONFLICT(variant_id) DO UPDATE
           SET quantity=inventory_balances.quantity+$2,updated_at=NOW()`,
          [item.variantId,item.quantity]
        );

        await client.query(
          `INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,reference_id,idempotency_key,created_by)
           VALUES($1,'purchase',$2,'purchase',$3,$4,$5)`,
          [item.variantId,item.quantity,p.rows[0].id,`purchase:${p.rows[0].id}:item:${purchaseItemId}`,req.user!.id]
        );
      }

      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'create','purchase',$2,$3)`,[req.user!.id,p.rows[0].id,JSON.stringify(p.rows[0])]);
      return p.rows[0];
    });
    res.status(201).json(result);
  }catch(e){next(e);}
});

router.get('/supplier-payments', async (req,res,next)=>{
  try {
    const params: unknown[] = [];
    const where: string[] = [];
    if (req.query.purchaseId) { params.push(String(req.query.purchaseId)); where.push(`sp.purchase_id=$${params.length}`); }
    if (req.query.supplierId) { params.push(String(req.query.supplierId)); where.push(`sp.supplier_id=$${params.length}`); }
    const r=await query(`SELECT sp.*,p.number AS purchase_number,s.name AS supplier_name FROM supplier_payments sp JOIN purchases p ON p.id=sp.purchase_id LEFT JOIN suppliers s ON s.id=sp.supplier_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY sp.payment_date DESC,sp.created_at DESC`,params);
    res.json({items:r.rows});
  } catch(e){next(e);}
});

router.post('/supplier-payments', requireRole('owner','manager'), async(req,res,next)=>{
  try {
    const purchaseId=String(req.body?.purchaseId??'');
    const amount=Number(req.body?.amount);
    if(!purchaseId || !Number.isFinite(amount) || amount<=0) return res.status(400).json({error:'Purchase and positive amount are required'});

    const result=await transaction(async client=>{
      const purchase=await client.query<{id:string;supplier_id:string|null;total:number|string;paid_total:number|string;status:string}>(`SELECT id,supplier_id,total,paid_total,status FROM purchases WHERE id=$1 FOR UPDATE`,[purchaseId]);
      const row=purchase.rows[0];
      if(!row) throw new Error('Purchase not found');

      const key=req.body?.idempotencyKey?String(req.body.idempotencyKey):null;
      if(key){
        const existing=await client.query<{id:string;purchase_id:string}>(`SELECT id,purchase_id FROM supplier_payments WHERE idempotency_key=$1 LIMIT 1`,[key]);
        if(existing.rows[0]){
          if(existing.rows[0].purchase_id !== purchaseId) throw new Error('Idempotency key is already used for another purchase');
          return existing.rows[0];
        }
      }

      if(row.status==='cancelled') throw new Error('Cannot pay a cancelled purchase');
      const total=Number(row.total); const paid=Number(row.paid_total); const remaining=Math.max(total-paid,0);
      if(amount>remaining+0.000001) throw new Error(`Payment exceeds remaining supplier balance (${remaining.toFixed(2)})`);

      const payment=await client.query(`INSERT INTO supplier_payments(purchase_id,supplier_id,amount,payment_date,method,reference,note,created_by,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[purchaseId,row.supplier_id,amount,req.body?.paymentDate??new Date().toISOString().slice(0,10),String(req.body?.method??'cash'),req.body?.reference??null,req.body?.note??null,req.user!.id,key]);
      const newPaid=paid+amount;
      await client.query(`UPDATE purchases SET paid_total=$2 WHERE id=$1`,[purchaseId,newPaid]);
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'create','supplier_payment',$2,$3)`,[req.user!.id,payment.rows[0].id,JSON.stringify(payment.rows[0])]);
      return payment.rows[0];
    });
    res.status(201).json(result);
  } catch(e){next(e);}
});

router.get('/cash-summary', async (_req,res,next)=>{
  try{const r=await query(`SELECT COALESCE((SELECT SUM(amount) FROM payments),0) AS incoming,COALESCE((SELECT SUM(amount) FROM expenses),0) AS expenses,COALESCE((SELECT SUM(paid_total) FROM purchases),0) AS purchases_paid`); res.json(r.rows[0]);}catch(e){next(e);}
});

export default router;
