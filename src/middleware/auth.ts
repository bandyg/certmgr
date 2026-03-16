import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  if (bufA.length !== bufB.length) {
    return false;
  }
  
  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return bufA.length === bufB.length;
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const config = getConfig();
  const logger = getLogger();
  const apiKey = req.headers['a-api-key'] as string;

  if (!apiKey || !safeCompare(apiKey, config.server.apiKey)) {
    logger.warn('Unauthorized access attempt', { path: req.path });
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' } });
    return;
  }

  next();
}
