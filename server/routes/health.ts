import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, service: 'azrnou-api', database: 'up', timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

export default router;
