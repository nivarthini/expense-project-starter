import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  if (status >= 500) logger.error({ err, path: req.path }, message);
  res.status(status).json({ error: message });
}
