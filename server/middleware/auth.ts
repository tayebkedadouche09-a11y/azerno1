import type { NextFunction, Request, Response } from 'express';
import { query, withCompanyContext } from '../db.js';
import { hashToken, verifyAccessToken } from '../security.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: 'owner' | 'manager' | 'worker'; name: string; companyId: string; companyName: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authorization = req.header('authorization');
    if (!authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });

    const token = authorization.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired session' });

    const result = await query<{ id: string; role: 'owner' | 'manager' | 'worker'; name: string; company_id: string; company_name: string }>(
      `SELECT u.id, cm.role, u.name, s.company_id, c.name AS company_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN company_memberships cm ON cm.user_id = u.id AND cm.company_id = s.company_id
       JOIN companies c ON c.id = s.company_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.active = TRUE AND c.active = TRUE`,
      [hashToken(token)],
    );

    const session = result.rows[0];
    if (!session || session.id !== payload.sub || session.company_id !== payload.companyId) return res.status(401).json({ error: 'Session revoked or company access removed' });
    req.user = { id: session.id, role: session.role, name: session.name, companyId: session.company_id, companyName: session.company_name };
    return withCompanyContext(session.company_id, () => next());
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: Array<'owner' | 'manager' | 'worker'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}
