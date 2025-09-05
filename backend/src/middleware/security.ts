import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import config from '@/config/environment';

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow any origin
    if (config.env === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = config.cors.origin.split(',').map((o: string) => o.trim());
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  exposedHeaders: ['x-request-id'],
};

/**
 * Helmet security configuration
 */
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for file uploads
};

/**
 * Rate limiting middleware (basic implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of requestCounts.entries()) {
      if (now > value.resetTime) {
        requestCounts.delete(key);
      }
    }
    
    // Get or create client record
    let clientRecord = requestCounts.get(clientId);
    if (!clientRecord || now > clientRecord.resetTime) {
      clientRecord = { count: 0, resetTime: now + windowMs };
      requestCounts.set(clientId, clientRecord);
    }
    
    // Check rate limit
    if (clientRecord.count >= maxRequests) {
      res.status(429).json({
        error: {
          code: 429,
          message: 'Too many requests',
          retryAfter: Math.ceil((clientRecord.resetTime - now) / 1000),
        },
      });
      return;
    }
    
    // Increment counter
    clientRecord.count++;
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - clientRecord.count);
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientRecord.resetTime / 1000));
    
    next();
  };
};

export { helmet, cors };