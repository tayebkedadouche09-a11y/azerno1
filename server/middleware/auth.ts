import type { NextFunction, Request, Response } from 'express';
import { query } from '../db.js';
import { hashToken, verifyAccessToken } from '../security.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: 'owner' | 'manager' | 'worker'; name: string };
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

    const result = await query<{ id: string; role: 'owner' | 'manager' | 'worker'; name: string }>(
      `SELECT u.id, u.role, u.name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.active = TRUE`,
      [hashToken(token)],
    );

    if (!result.rows[0] || result.rows[0].id !== payload.sub) return res.status(401).json({ error: 'Session revoked' });
    req.user = result.rows[0];
    next();
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
