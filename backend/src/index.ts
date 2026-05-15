import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import 'express-async-errors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import { logger } from './utils/logger';
const app = express();
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://expense-project-starter.vercel.app",
    "https://expense-project-starter-ml55e7l7q-snivarthini-5228s-projects.vercel.app"
  ],
  credentials: true
}));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use(errorHandler);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info({ port: PORT }, 'Server running'));
