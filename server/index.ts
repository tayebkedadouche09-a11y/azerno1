import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';

const app = express();
const port = Number(process.env.API_PORT ?? 4000);

app.disable('x-powered-by');
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()).filter(Boolean) ?? true,
  credentials: false,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api', (_req, res) => res.json({ name: 'AZRNOU API', version: '1.0.0' }));
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[AZRNOU API]', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[AZRNOU] API listening on :${port}`);
});
