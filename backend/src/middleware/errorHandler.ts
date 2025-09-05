import { Request, Response, NextFunction } from 'express';
import config from '@/config/environment';
import { errorHandlingService, ErrorContext } from '@/services/ErrorHandlingService';
import { notificationService } from '@/services/NotificationService';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
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
  const statusCode = err.statusCode || 500;
  
  // Create error context
  const context: ErrorContext = {
    operation: `${req.method} ${req.path}`,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
    timestamp: new Date(),
  };

  // Extract IDs from request if available
  if (req.params.analysisId) {
    context.analysisId = req.params.analysisId;
  }
  if (req.params.resumeId) {
    context.resumeId = req.params.resumeId;
  }
  if (req.params.jobDescriptionId) {
    context.jobDescriptionId = req.params.jobDescriptionId;
  }

  // Handle error with error handling service
  const userFriendlyError = errorHandlingService.handleError(err, context);
  
  // Send user notification if analysis-related
  if (context.analysisId) {
    try {
      notificationService.sendError(
        context.analysisId,
        'Operation Failed',
        userFriendlyError.userMessage,
        userFriendlyError.suggestedActions.map(action => ({
          label: action,
          action: 'custom' as const,
          data: { suggestion: action },
        }))
      );
    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError);
    }
  }
  
  // Log error details
  console.error(`[${requestId}] Error ${statusCode}:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userFriendlyCode: userFriendlyError.code,
  });
  
  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: {
      code: userFriendlyError.code,
      message: userFriendlyError.userMessage,
      severity: userFriendlyError.severity,
      category: userFriendlyError.category,
      retryable: userFriendlyError.retryable,
      suggestedActions: userFriendlyError.suggestedActions,
      supportContact: userFriendlyError.supportContact,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
  
  // Include additional details in development
  if (config.env === 'development') {
    errorResponse.error.originalMessage = err.message;
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
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      severity: 'medium',
      category: 'validation',
      retryable: false,
      suggestedActions: [
        'Check the URL for typos',
        'Verify the resource exists',
        'Contact support if you believe this is an error',
      ],
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
export const createError = (message: string, statusCode: number = 500, code?: string): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  error.code = code;
  return error;
};

export default errorHandler;