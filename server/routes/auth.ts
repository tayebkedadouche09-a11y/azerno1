import { Router } from 'express';
import { query, transaction } from '../db.js';
import { createAccessToken, hashPassword, hashToken, verifyPassword } from '../security.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const identifier = String(req.body?.email ?? req.body?.phone ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const requestedCompanyId = String(req.body?.companyId ?? '').trim() || null;
    if (!identifier || !password) return res.status(400).json({ error: 'Email/phone and password are required' });
    const result = await query<{ id: string; name: string; password_hash: string }>(`SELECT id,name,password_hash FROM users WHERE active=TRUE AND (LOWER(email)=$1 OR phone=$1) LIMIT 1`, [identifier]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
    const memberships = await query<{ company_id: string; company_name: string; role: 'owner'|'manager'|'worker' }>(`SELECT cm.company_id,c.name AS company_name,cm.role FROM company_memberships cm JOIN companies c ON c.id=cm.company_id WHERE cm.user_id=$1 AND c.active=TRUE ORDER BY c.created_at ASC`, [user.id]);
    const membership = requestedCompanyId ? memberships.rows.find((m) => m.company_id === requestedCompanyId) : memberships.rows[0];
    if (!membership) return res.status(403).json({ error: requestedCompanyId ? 'You do not have access to this company' : 'No active company membership' });
    const token = createAccessToken(user.id, membership.company_id);
    await query(`INSERT INTO sessions(user_id,company_id,token_hash,expires_at) VALUES($1,$2,$3,NOW()+($4*INTERVAL '1 second'))`, [user.id,membership.company_id,hashToken(token),Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 60*60*12)]);
    res.json({ token,user:{id:user.id,name:user.name,role:membership.role,companyId:membership.company_id,companyName:membership.company_name},companies:memberships.rows });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (req,res) => res.json({ user:req.user }));

router.get('/companies', requireAuth, async (req,res,next) => {
  try {
    const result = await query(`SELECT c.id,c.name,c.slug,c.active,cm.role FROM company_memberships cm JOIN companies c ON c.id=cm.company_id WHERE cm.user_id=$1 AND c.active=TRUE ORDER BY c.created_at ASC`, [req.user!.id]);
    res.json({ items:result.rows });
  } catch (error) { next(error); }
});

router.post('/companies', requireAuth, requireRole('owner'), async (req,res,next) => {
  try {
    const name=String(req.body?.name??'').trim(); const slug=String(req.body?.slug??name.toLowerCase().replace(/[^a-z0-9]+/g,'-')).trim().replace(/^-+|-+$/g,'');
    if(!name||!slug)return res.status(400).json({error:'Company name and slug are required'});
    const result=await transaction(async client=>{const company=await client.query(`INSERT INTO companies(name,slug) VALUES($1,$2) RETURNING id,name,slug,active`,[name,slug]);await client.query(`INSERT INTO company_memberships(company_id,user_id,role) VALUES($1,$2,'owner')`,[company.rows[0].id,req.user!.id]);return company.rows[0];});
    res.status(201).json({company:result});
  } catch(error){next(error);}
});

router.post('/companies/:companyId/select', requireAuth, async (req,res,next) => {
  try {
    const companyId=String(req.params.companyId); const membership=await query<{company_id:string;company_name:string;role:'owner'|'manager'|'worker'}>(`SELECT cm.company_id,c.name AS company_name,cm.role FROM company_memberships cm JOIN companies c ON c.id=cm.company_id WHERE cm.user_id=$1 AND cm.company_id=$2 AND c.active=TRUE`,[req.user!.id,companyId]);
    if(!membership.rows[0])return res.status(403).json({error:'You do not have access to this company'});
    const token=createAccessToken(req.user!.id,companyId);
    await query(`INSERT INTO sessions(user_id,company_id,token_hash,expires_at) VALUES($1,$2,$3,NOW()+($4*INTERVAL '1 second'))`,[req.user!.id,companyId,hashToken(token),Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 60*60*12)]);
    res.json({token,company:membership.rows[0]});
  }catch(error){next(error);}
});

router.get('/companies/:companyId/members', requireAuth, async (req,res,next) => {
  try {
    const access=await query(`SELECT 1 FROM company_memberships WHERE company_id=$1 AND user_id=$2`,[req.params.companyId,req.user!.id]);
    if(!access.rows[0])return res.status(403).json({error:'Company access denied'});
    const result=await query(`SELECT u.id,u.name,u.email,u.phone,cm.role,u.active FROM company_memberships cm JOIN users u ON u.id=cm.user_id WHERE cm.company_id=$1 ORDER BY u.name`,[req.params.companyId]);
    res.json({items:result.rows});
  }catch(error){next(error);}
});

router.post('/companies/:companyId/members', requireAuth, requireRole('owner','manager'), async (req,res,next) => {
  try {
    const companyId=String(req.params.companyId); if(companyId!==req.user!.companyId && req.user!.role!=='owner')return res.status(403).json({error:'Company access denied'});
    const email=String(req.body?.email??'').trim().toLowerCase(); const role=String(req.body?.role??'worker') as 'owner'|'manager'|'worker';
    if(!email||!['owner','manager','worker'].includes(role))return res.status(400).json({error:'Member email and valid role are required'});
    const member=await query<{id:string;name:string}>(`SELECT id,name FROM users WHERE LOWER(email)=$1 LIMIT 1`,[email]);
    if(!member.rows[0])return res.status(404).json({error:'User not found; create the user account first'});
    if(role==='owner' && req.user!.role!=='owner')return res.status(403).json({error:'Only an owner can grant owner role'});
    await query(`INSERT INTO company_memberships(company_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(company_id,user_id) DO UPDATE SET role=EXCLUDED.role`,[companyId,member.rows[0].id,role]);
    res.status(201).json({member:{id:member.rows[0].id,name:member.rows[0].name,email,role}});
  }catch(error){next(error);}
});

router.delete('/companies/:companyId/members/:userId', requireAuth, requireRole('owner'), async (req,res,next) => {
  try {
    if(String(req.params.companyId)!==req.user!.companyId)return res.status(403).json({error:'Switch to the target company before removing a member'});
    if(String(req.params.userId)===req.user!.id)return res.status(400).json({error:'Owner cannot remove the active account'});
    await query(`DELETE FROM company_memberships WHERE company_id=$1 AND user_id=$2`,[req.params.companyId,req.params.userId]);
    await query(`DELETE FROM sessions WHERE company_id=$1 AND user_id=$2`,[req.params.companyId,req.params.userId]);
    res.status(204).send();
  }catch(error){next(error);}
});

router.post('/logout', requireAuth, async (req,res,next) => {
  try { const token=req.header('authorization')!.slice('Bearer '.length).trim(); await query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(token)]); res.status(204).send(); } catch(error){next(error);}
});

router.post('/bootstrap-owner', async (req,res,next) => {
  try {
    const existing=await query<{count:string}>('SELECT COUNT(*)::text AS count FROM users');
    if(Number(existing.rows[0]?.count??0)>0)return res.status(409).json({error:'Owner already initialized'});
    const name=String(req.body?.name??'').trim(); const email=String(req.body?.email??'').trim().toLowerCase(); const password=String(req.body?.password??'');
    if(!name||!email||password.length<8)return res.status(400).json({error:'Name, email and an 8+ character password are required'});
    const passwordHash=await hashPassword(password);
    const result=await transaction(async client=>{const company=await client.query<{id:string;name:string}>(`UPDATE companies SET name=$1,updated_at=NOW() WHERE slug='azrnou-default' RETURNING id,name`,[String(req.body?.companyName??'AZRNOU Entreprise').trim()||'AZRNOU Entreprise']);const created=await client.query<{id:string;name:string;role:'owner'}>(`INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'owner') RETURNING id,name,role`,[name,email,passwordHash]);await client.query(`INSERT INTO company_memberships(company_id,user_id,role) VALUES($1,$2,'owner') ON CONFLICT DO NOTHING`,[company.rows[0].id,created.rows[0].id]);return {user:created.rows[0],company:company.rows[0]};});
    res.status(201).json(result);
  }catch(error){next(error);}
});

export default router;
