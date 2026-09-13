import { Router } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const DEFAULT_COMPANY_SETTINGS = {
  name: 'AZRNOU Entreprise',
  slogan: '',
  phone: '',
  phoneSecondary: '',
  address: '',
  wilaya: '',
  email: '',
  nif: '',
  nis: '',
  rc: '',
  rib: '',
  currency: 'DZD / DA',
  documentPrefixes: {},
  documentCounters: {},
  defaultTerms: '',
  whatsappMessageTemplate: '',
};

router.get('/categories', async (_req, res, next) => { try { const result = await query(`SELECT id, name, name_ar, active FROM product_categories WHERE active = TRUE ORDER BY name`); res.json({ items: result.rows }); } catch (error) { next(error); } });

router.get('/company-settings', async (req, res, next) => {
  try {
    const result = await query<{ value: Record<string, unknown> }>(`SELECT value FROM app_settings WHERE company_id=$1 AND key='company_profile' LIMIT 1`, [req.user!.companyId]);
    res.json({ settings: { ...DEFAULT_COMPANY_SETTINGS, ...(result.rows[0]?.value ?? {}) } });
  } catch (error) { next(error); }
});

router.patch('/company-settings', requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const incoming = req.body?.settings && typeof req.body.settings === 'object' ? req.body.settings : req.body;
    if (!incoming || typeof incoming !== 'object') return res.status(400).json({ error: 'Settings object is required' });
    const result = await query<{ value: Record<string, unknown> }>(
      `INSERT INTO app_settings(company_id,key,value) VALUES($1,'company_profile',$2::jsonb)
       ON CONFLICT(company_id,key) DO UPDATE SET value=app_settings.value || EXCLUDED.value,updated_at=NOW()
       RETURNING value`,
      [req.user!.companyId, JSON.stringify(incoming)]
    );
    res.json({ settings: { ...DEFAULT_COMPANY_SETTINGS, ...(result.rows[0]?.value ?? {}) } });
  } catch (error) { next(error); }
});

router.patch('/variants/:id', requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const result = await transaction(async client => {
      const current = await client.query(`SELECT * FROM product_variants WHERE id=$1 AND active=TRUE FOR UPDATE`, [req.params.id]);
      if (!current.rows[0]) throw new Error('Product variant not found');
      const before=current.rows[0]; const name=String(req.body?.name??before.name).trim(); const retailPrice=Number(req.body?.retailPrice??before.retail_price); const wholesalePrice=Number(req.body?.wholesalePrice??before.wholesale_price); const productionCost=Number(req.body?.cost??req.body?.productionCost??before.production_cost); const minStock=Number(req.body?.minStock??before.min_stock); const barcode=req.body?.barcode??before.barcode;
      if(!name||!Number.isFinite(retailPrice)||!Number.isFinite(wholesalePrice)||!Number.isFinite(productionCost)||!Number.isFinite(minStock))throw new Error('Invalid product variant fields');
      if(retailPrice<0||wholesalePrice<0||productionCost<0||minStock<0)throw new Error('Product prices and minimum stock cannot be negative');
      const updated=await client.query(`UPDATE product_variants SET name=$2,retail_price=$3,wholesale_price=$4,production_cost=$5,min_stock=$6,barcode=$7,updated_at=NOW() WHERE id=$1 RETURNING *`,[req.params.id,name,retailPrice,wholesalePrice,productionCost,minStock,barcode]);
      if(Number(before.retail_price)!==retailPrice||Number(before.wholesale_price)!==wholesalePrice||Number(before.production_cost)!==productionCost)await client.query(`INSERT INTO price_history(variant_id,retail_price,wholesale_price,production_cost,changed_by) VALUES($1,$2,$3,$4,$5)`,[req.params.id,retailPrice,wholesalePrice,productionCost,req.user!.id]);
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,before_data,after_data) VALUES($1,'update','product_variant',$2,$3,$4)`,[req.user!.id,req.params.id,JSON.stringify(before),JSON.stringify(updated.rows[0])]);
      return updated.rows[0];
    }); res.json(result);
  } catch(error){next(error);}
});

router.post('/stock-adjustments', requireRole('owner','manager'), async (req,res,next) => {
  try {
    const result=await transaction(async client=>{
      const variantId=String(req.body?.variantId??''); const targetQuantity=Number(req.body?.quantity); const reason=String(req.body?.reason??'').trim(); const idempotencyKey=String(req.body?.idempotencyKey??req.header('Idempotency-Key')??'').trim()||null;
      if(!variantId||!Number.isFinite(targetQuantity)||targetQuantity<0||!reason)throw new Error('Variant, non-negative quantity and reason are required');
      if(idempotencyKey){const existing=await client.query(`SELECT im.* FROM inventory_movements im WHERE im.idempotency_key=$1 FOR UPDATE`,[idempotencyKey]);if(existing.rows[0])return{variantId,duplicate:true,movement:existing.rows[0]};}
      const balance=await client.query(`SELECT quantity,reserved_quantity FROM inventory_balances WHERE variant_id=$1 FOR UPDATE`,[variantId]); if(!balance.rows[0])throw new Error('Inventory balance not found');
      const currentQuantity=Number(balance.rows[0].quantity); const reservedQuantity=Number(balance.rows[0].reserved_quantity); if(targetQuantity<reservedQuantity)throw new Error('Physical stock cannot be lower than reserved stock');
      const delta=targetQuantity-currentQuantity; if(delta===0)return{variantId,quantity:targetQuantity,reservedQuantity,delta:0,reason,duplicate:false};
      const movement=await client.query(`INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,idempotency_key,created_by) VALUES($1,'adjustment',$2,'adjustment',$3,$4) RETURNING *`,[variantId,delta,idempotencyKey??`adjustment:${variantId}:${Date.now()}:${req.user!.id}`,req.user!.id]);
      await client.query(`UPDATE inventory_balances SET quantity=$2,updated_at=NOW() WHERE variant_id=$1`,[variantId,targetQuantity]);
      await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_data) VALUES($1,'adjust','inventory',$2,$3)`,[req.user!.id,variantId,JSON.stringify({targetQuantity,reservedQuantity,reason,movementId:movement.rows[0].id,idempotencyKey})]);
      return{variantId,quantity:targetQuantity,reservedQuantity,delta,reason,duplicate:false};
    }); res.json(result);
  } catch(error){next(error);}
});

router.patch('/orders/:id/status', async (req,res,next) => {
  try {
    const requestedStatus=String(req.body?.status??''); const allowed=new Set(['confirmed','preparing','ready','cancelled']); if(!allowed.has(requestedStatus))throw new Error('Invalid order status transition');
    if(requestedStatus==='cancelled'&&!['owner','manager'].includes(req.user!.role))throw new Error('Only owners or managers can cancel orders');
    if(!['owner','manager','worker'].includes(req.user!.role))throw new Error('Unauthorized');
    const result=await transaction(async client=>{
      const current=await client.query(`SELECT * FROM orders WHERE id=$1 FOR UPDATE`,[req.params.id]); if(!current.rows[0])throw new Error('Order not found'); const from=String(current.rows[0].status);
      if(requestedStatus==='cancelled'){if(!['confirmed','preparing','ready'].includes(from))throw new Error(`Order cannot be cancelled from ${from}`);const items=await client.query(`SELECT id,variant_id,quantity,delivered_quantity FROM order_items WHERE order_id=$1 ORDER BY id FOR UPDATE`,[req.params.id]);for(const item of items.rows){const remaining=Number(item.quantity)-Number(item.delivered_quantity);if(remaining<=0)continue;const balance=await client.query(`SELECT quantity,reserved_quantity FROM inventory_balances WHERE variant_id=$1 FOR UPDATE`,[item.variant_id]);if(!balance.rows[0]||Number(balance.rows[0].reserved_quantity)<remaining)throw new Error(`Reservation mismatch for variant ${item.variant_id}`);await client.query(`UPDATE inventory_balances SET reserved_quantity=reserved_quantity-$2,updated_at=NOW() WHERE variant_id=$1`,[item.variant_id,remaining]);await client.query(`INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,reference_id,idempotency_key,created_by) VALUES($1,'order_reservation',$2,'order',$3,$4,$5) ON CONFLICT(idempotency_key) DO NOTHING`,[item.variant_id,-remaining,req.params.id,`order:${req.params.id}:cancel:${item.id}`,req.user!.id]);}}
      else {const valid=(from==='confirmed'&&requestedStatus==='preparing')||(from==='preparing'&&requestedStatus==='ready')||from===requestedStatus;if(!valid)throw new Error(`Invalid order status transition from ${from} to ${requestedStatus}`);}
      const updated=await client.query(`UPDATE orders SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *`,[req.params.id,requestedStatus]); await client.query(`INSERT INTO audit_logs(user_id,action,entity_type,entity_id,before_data,after_data) VALUES($1,'status_change','order',$2,$3,$4)`,[req.user!.id,req.params.id,JSON.stringify(current.rows[0]),JSON.stringify(updated.rows[0])]); return updated.rows[0];
    }); res.json(result);
  }catch(error){next(error);}
});

export default router;
