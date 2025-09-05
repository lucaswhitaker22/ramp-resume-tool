import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware to add unique request ID to each request
 * Useful for tracking requests across logs and debugging
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  // Use existing request ID from header or generate new one
  const reqId = (req.headers['x-request-id'] as string) || randomUUID();
  
  // Add to request headers
  req.headers['x-request-id'] = reqId;
  
  // Add to response headers for client tracking
  res.setHeader('x-request-id', reqId);
  
  next();
};

export default requestId;