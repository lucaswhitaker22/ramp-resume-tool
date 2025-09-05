import morgan from 'morgan';
import { Request, Response } from 'express';
import config from '@/config/environment';

// Custom token for request ID
morgan.token('id', (req: Request) => {
  return req.headers['x-request-id'] as string || 'unknown';
});

// Custom token for user ID (if available)
morgan.token('user', (req: Request) => {
  return (req as any).user?.id || 'anonymous';
});

// Custom format for structured logging
const logFormat = config.env === 'production'
  ? ':remote-addr - :user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :id'
  : ':method :url :status :response-time ms - :res[content-length] [:id]';

// Skip logging for health checks in production
const skip = (req: Request, _res: Response) => {
  if (config.env === 'production' && req.url === '/health') {
    return true;
  }
  return false;
};

export const requestLogger = morgan(logFormat, {
  skip,
  stream: {
    write: (message: string) => {
      // Remove trailing newline and log as info
      console.log(message.trim());
    },
  },
});

export default requestLogger;