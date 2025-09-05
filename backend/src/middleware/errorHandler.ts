import { Request, Response, NextFunction } from 'express';
import config from '@/config/environment';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Global error handling middleware
 * Handles both operational and programming errors
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;
  
  // Default error properties
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error details
  console.error(`[${requestId}] Error ${statusCode}:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  // Prepare error response
  const errorResponse: any = {
    error: {
      code: statusCode,
      message,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
  
  // Include stack trace in development
  if (config.env === 'development') {
    errorResponse.error.stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = req.headers['x-request-id'] as string;
  
  res.status(404).json({
    error: {
      code: 404,
      message: 'Route not found',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
};

/**
 * Create operational error
 */
export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export default errorHandler;