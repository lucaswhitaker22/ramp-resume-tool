import { Router, Request, Response, NextFunction } from 'express';
import { createError } from '@/middleware/errorHandler';
import { notificationService } from '@/services/NotificationService';
import { errorHandlingService } from '@/services/ErrorHandlingService';
import { progressTrackingService } from '@/services/ProgressTrackingService';
import { AnalysisResultModel } from '@/models/AnalysisResult';

const analysisResultModel = new AnalysisResultModel();
const router = Router();

/**
 * POST /api/v1/feedback/retry
 * Retry a failed operation
 */
router.post(
  '/retry',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId, operation, attempt = 1 } = req.body;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      if (!operation) {
        throw createError('Operation type is required', 400);
      }

      // Get retry configuration
      const retryConfig = errorHandlingService.getRetryConfig(operation);
      if (!retryConfig) {
        throw createError(`Retry configuration not found for operation: ${operation}`, 400);
      }

      if (attempt > retryConfig.maxAttempts) {
        throw createError(`Maximum retry attempts (${retryConfig.maxAttempts}) exceeded`, 400);
      }

      // Calculate retry delay
      const retryDelay = errorHandlingService.calculateRetryDelay(attempt, operation);

      // Send retry notification
      notificationService.sendRetryFeedback(
        analysisId,
        operation,
        attempt,
        retryConfig.maxAttempts,
        retryDelay
      );

      // Schedule the retry based on operation type
      let retryPromise: Promise<any>;

      switch (operation) {
        case 'analysis':
          retryPromise = retryAnalysis(analysisId);
          break;
        case 'file-processing':
          retryPromise = retryFileProcessing(analysisId);
          break;
        default:
          throw createError(`Unsupported retry operation: ${operation}`, 400);
      }

      // Execute retry after delay
      setTimeout(async () => {
        try {
          await retryPromise;
          notificationService.sendSuccess(
            analysisId,
            'Retry Successful',
            `${operation} completed successfully after retry.`
          );
        } catch (retryError) {
          const nextAttempt = attempt + 1;
          if (nextAttempt <= retryConfig.maxAttempts) {
            // Schedule next retry
            notificationService.sendRetryFeedback(
              analysisId,
              operation,
              nextAttempt,
              retryConfig.maxAttempts
            );
          } else {
            // Max attempts reached
            notificationService.sendError(
              analysisId,
              'Retry Failed',
              `${operation} failed after ${retryConfig.maxAttempts} attempts. Please contact support.`,
              [
                {
                  label: 'Contact Support',
                  action: 'custom',
                  data: { action: 'contact-support' },
                },
              ]
            );
          }
        }
      }, retryDelay);

      res.json({
        success: true,
        data: {
          analysisId,
          operation,
          attempt,
          maxAttempts: retryConfig.maxAttempts,
          retryDelay,
          scheduledAt: new Date(Date.now() + retryDelay),
        },
        message: `Retry scheduled for ${operation}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/feedback/dismiss
 * Dismiss a notification
 */
router.post(
  '/dismiss',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId, notificationId } = req.body;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      if (!notificationId) {
        throw createError('Notification ID is required', 400);
      }

      const dismissed = notificationService.dismissNotification(analysisId, notificationId);

      if (!dismissed) {
        throw createError('Notification not found or already dismissed', 404);
      }

      res.json({
        success: true,
        data: {
          analysisId,
          notificationId,
          dismissedAt: new Date(),
        },
        message: 'Notification dismissed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/feedback/notifications/:analysisId
 * Get notifications for an analysis
 */
router.get(
  '/notifications/:analysisId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params;
      const { active = 'true' } = req.query;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      const notifications = active === 'true' 
        ? notificationService.getActiveNotifications(analysisId)
        : notificationService.getNotificationHistory(analysisId);

      res.json({
        success: true,
        data: {
          analysisId,
          notifications,
          count: notifications.length,
          activeOnly: active === 'true',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/feedback/validation-error
 * Report a validation error with user-friendly feedback
 */
router.post(
  '/validation-error',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId, field, message, value, suggestedActions } = req.body;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      if (!field) {
        throw createError('Field name is required', 400);
      }

      if (!message) {
        throw createError('Error message is required', 400);
      }

      // Generate default suggested actions if not provided
      const actions = suggestedActions || generateValidationSuggestions(field, value);

      // Send validation error notification
      notificationService.sendValidationError(analysisId, field, message, actions);

      res.json({
        success: true,
        data: {
          analysisId,
          field,
          message,
          suggestedActions: actions,
          reportedAt: new Date(),
        },
        message: 'Validation error reported and user notified',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/feedback/user-action
 * Handle user action from notification
 */
router.post(
  '/user-action',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId, notificationId, action, data } = req.body;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      if (!action) {
        throw createError('Action is required', 400);
      }

      // Handle different action types
      let result: any = {};

      switch (action) {
        case 'retry':
          result = await handleRetryAction(analysisId, data);
          break;
        case 'navigate':
          result = await handleNavigateAction(analysisId, data);
          break;
        case 'download':
          result = await handleDownloadAction(analysisId, data);
          break;
        case 'dismiss':
          result = await handleDismissAction(analysisId, notificationId);
          break;
        case 'custom':
          result = await handleCustomAction(analysisId, data);
          break;
        default:
          throw createError(`Unsupported action: ${action}`, 400);
      }

      res.json({
        success: true,
        data: {
          analysisId,
          action,
          result,
          processedAt: new Date(),
        },
        message: `Action ${action} processed successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/feedback/validate
 * Validate data and provide user-friendly feedback
 */
router.post(
  '/validate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, data, analysisId } = req.body;

      if (!category) {
        throw createError('Validation category is required', 400);
      }

      if (!data) {
        throw createError('Data to validate is required', 400);
      }

      // Import validation service
      const { validationService } = await import('@/services/ValidationService');

      // Perform validation
      const result = await validationService.validateAndNotify(category, data, analysisId);

      res.json({
        success: result.isValid,
        data: {
          category,
          isValid: result.isValid,
          errors: result.errors,
          warnings: result.warnings,
          info: result.info,
          validatedAt: new Date(),
        },
        message: result.isValid ? 'Validation passed' : 'Validation failed',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/feedback/stats
 * Get feedback and notification statistics
 */
router.get(
  '/stats',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const notificationStats = notificationService.getNotificationStats();
      const errorStats = errorHandlingService.getErrorStats();
      
      // Import validation service
      const { validationService } = await import('@/services/ValidationService');
      const validationStats = validationService.getValidationStats();

      res.json({
        success: true,
        data: {
          notifications: notificationStats,
          errors: errorStats,
          validation: validationStats,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Helper function to retry analysis
 */
async function retryAnalysis(analysisId: string): Promise<void> {
  // Get the analysis result
  const analysis = await analysisResultModel.getAnalysisResult(analysisId);
  if (!analysis) {
    throw new Error('Analysis not found');
  }

  // Reset status to pending
  await analysisResultModel.updateStatus(analysisId, 'pending');

  // Restart progress tracking
  progressTrackingService.startTracking(analysisId);

  // The actual analysis retry logic would be implemented here
  // For now, we'll simulate a successful retry
  setTimeout(() => {
    progressTrackingService.complete(analysisId);
  }, 5000);
}

/**
 * Helper function to retry file processing
 */
async function retryFileProcessing(_analysisId: string): Promise<void> {
  // File processing retry logic would be implemented here
  // This is a placeholder implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 3000);
  });
}

/**
 * Generate validation suggestions based on field and value
 */
function generateValidationSuggestions(field: string, _value?: any): string[] {
  const suggestions: string[] = [];

  switch (field.toLowerCase()) {
    case 'file':
    case 'resume':
      suggestions.push(
        'Ensure the file is in PDF, DOC, DOCX, or TXT format',
        'Check that the file size is under 10MB',
        'Verify the file is not corrupted or password-protected'
      );
      break;
    case 'jobdescription':
    case 'job_description':
      suggestions.push(
        'Provide a job description with at least 50 characters',
        'Include job requirements and responsibilities',
        'Keep the description under 10,000 characters'
      );
      break;
    case 'email':
      suggestions.push(
        'Enter a valid email address format (user@domain.com)',
        'Check for typos in the email address',
        'Ensure the domain name is correct'
      );
      break;
    default:
      suggestions.push(
        'Check the input format and try again',
        'Ensure all required fields are filled',
        'Contact support if the issue persists'
      );
  }

  return suggestions;
}

/**
 * Handle retry action
 */
async function handleRetryAction(_analysisId: string, data: any): Promise<any> {
  const operation = data?.operation || 'analysis';
  
  // This would trigger the actual retry logic
  return {
    operation,
    scheduled: true,
    message: `Retry scheduled for ${operation}`,
  };
}

/**
 * Handle navigate action
 */
async function handleNavigateAction(analysisId: string, data: any): Promise<any> {
  return {
    url: data?.url || `/analysis/${analysisId}`,
    message: 'Navigation URL provided',
  };
}

/**
 * Handle download action
 */
async function handleDownloadAction(analysisId: string, data: any): Promise<any> {
  return {
    downloadUrl: data?.url || `/api/v1/reports/${analysisId}/pdf`,
    message: 'Download URL provided',
  };
}

/**
 * Handle dismiss action
 */
async function handleDismissAction(analysisId: string, notificationId: string): Promise<any> {
  const dismissed = notificationService.dismissNotification(analysisId, notificationId);
  
  return {
    dismissed,
    message: dismissed ? 'Notification dismissed' : 'Notification not found',
  };
}

/**
 * Handle custom action
 */
async function handleCustomAction(_analysisId: string, data: any): Promise<any> {
  const customAction = data?.action;
  
  switch (customAction) {
    case 'contact-support':
      return {
        supportEmail: 'support@resumereviewtool.com',
        supportUrl: '/support',
        message: 'Support contact information provided',
      };
    case 'start-analysis':
      return {
        analysisUrl: `/api/v1/analysis`,
        message: 'Analysis start endpoint provided',
      };
    case 'select-file':
      return {
        uploadUrl: `/upload`,
        message: 'File selection page provided',
      };
    default:
      return {
        action: customAction,
        message: 'Custom action processed',
      };
  }
}

export default router;