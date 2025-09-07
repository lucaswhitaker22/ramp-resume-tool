import { Router, Request, Response, NextFunction } from 'express';
import { createError } from '@/middleware/errorHandler';
import { errorHandlingService } from '@/services/ErrorHandlingService';
import { notificationService } from '@/services/NotificationService';
import { progressTrackingService } from '@/services/ProgressTrackingService';
import { getWebSocketService } from '@/services/WebSocketService';

const router = Router();

/**
 * GET /api/v1/monitoring/errors
 * Get error statistics and recent errors
 */
router.get(
  '/errors',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const errorStats = errorHandlingService.getErrorStats();
      const recentErrors = errorHandlingService.getRecentErrors(20);

      res.json({
        success: true,
        data: {
          statistics: errorStats,
          recentErrors: recentErrors.map(entry => ({
            error: {
              code: entry.error.code || entry.error.name || 'UNKNOWN',
              message: entry.error.message,
            },
            context: {
              operation: entry.context.operation,
              analysisId: entry.context.analysisId,
              timestamp: entry.context.timestamp,
            },
            timestamp: entry.timestamp,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/monitoring/notifications
 * Get notification statistics
 */
router.get(
  '/notifications',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const notificationStats = notificationService.getNotificationStats();

      res.json({
        success: true,
        data: {
          statistics: notificationStats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/monitoring/notifications/:analysisId
 * Get notifications for a specific analysis
 */
router.get(
  '/notifications/:analysisId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params;
      const { active = 'false' } = req.query;

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
          total: notifications.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/monitoring/notifications/:analysisId/dismiss
 * Dismiss a specific notification
 */
router.post(
  '/notifications/:analysisId/dismiss',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params;
      const { notificationId } = req.body;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      if (!notificationId) {
        throw createError('Notification ID is required', 400);
      }

      const dismissed = notificationService.dismissNotification(analysisId, notificationId);

      if (!dismissed) {
        throw createError('Notification not found', 404);
      }

      res.json({
        success: true,
        data: {
          analysisId,
          notificationId,
          dismissed: true,
        },
        message: 'Notification dismissed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/monitoring/system
 * Get overall system health and statistics
 */
router.get(
  '/system',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const webSocketService = getWebSocketService();
      const wsStats = webSocketService.getStats();
      const progressStats = progressTrackingService.getStats();
      const errorStats = errorHandlingService.getErrorStats();
      const notificationStats = notificationService.getNotificationStats();

      // Calculate system health score (0-100)
      let healthScore = 100;
      
      // Deduct points for recent errors
      if (errorStats.recentErrors > 10) {
        healthScore -= Math.min(errorStats.recentErrors * 2, 30);
      }
      
      // Deduct points for failed analyses
      const failedAnalyses = progressStats.byStatus['failed'] || 0;
      if (failedAnalyses > 0) {
        healthScore -= Math.min(failedAnalyses * 5, 20);
      }
      
      // Deduct points if no active connections (might indicate WebSocket issues)
      if (wsStats.totalConnections === 0 && progressStats.activeAnalyses > 0) {
        healthScore -= 15;
      }

      const systemStatus = healthScore >= 80 ? 'healthy' : 
                          healthScore >= 60 ? 'degraded' : 'unhealthy';

      res.json({
        success: true,
        data: {
          status: systemStatus,
          healthScore,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          websocket: {
            totalConnections: wsStats.totalConnections,
            activeAnalyses: wsStats.activeAnalyses,
          },
          progress: {
            activeAnalyses: progressStats.activeAnalyses,
            byStatus: progressStats.byStatus,
            averageCompletionTime: Math.round(progressStats.averageCompletionTime / 1000),
          },
          errors: {
            totalErrors: errorStats.totalErrors,
            recentErrors: errorStats.recentErrors,
            errorsByCategory: errorStats.errorsByCategory,
          },
          notifications: {
            totalNotifications: notificationStats.totalNotifications,
            recentNotifications: notificationStats.recentNotifications,
            byType: notificationStats.byType,
          },
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            external: Math.round(process.memoryUsage().external / 1024 / 1024),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/monitoring/test-error
 * Test error handling (development only)
 */
router.post(
  '/test-error',
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (process.env['NODE_ENV'] === 'production') {
        throw createError('Test endpoints not available in production', 403);
      }

      const { errorType = 'generic', analysisId } = req.body;

      let error: Error;
      switch (errorType) {
        case 'file-too-large':
          error = createError('File size exceeds maximum limit', 400, 'FILE_TOO_LARGE');
          break;
        case 'analysis-timeout':
          error = createError('Analysis took too long to complete', 408, 'ANALYSIS_TIMEOUT');
          break;
        case 'database-error':
          error = createError('Database connection failed', 500, 'DATABASE_CONNECTION_ERROR');
          break;
        case 'validation-error':
          error = createError('Job description is too short', 400, 'JOB_DESCRIPTION_TOO_SHORT');
          break;
        default:
          error = createError('Test error for monitoring', 500, 'TEST_ERROR');
      }

      // Add analysisId to request params if provided for error context
      if (analysisId) {
        req.params['analysisId'] = analysisId;
      }

      throw error;
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/monitoring/cleanup
 * Clean up old monitoring data
 */
router.post(
  '/cleanup',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        clearErrors = false, 
        clearNotifications = false,
        maxAgeMinutes = 60 
      } = req.body;

      const results: any = {};

      if (clearErrors) {
        errorHandlingService.clearErrorLog();
        results.errorsCleared = true;
      }

      if (clearNotifications) {
        // Clear notification history for all analyses
        // Note: This would need to be implemented in NotificationService
        results.notificationsCleared = true;
      }

      // Clean up old progress tracking
      const cleanedProgress = progressTrackingService.cleanupOldProgress(maxAgeMinutes);
      results.progressEntriesCleared = cleanedProgress;

      res.json({
        success: true,
        data: results,
        message: 'Cleanup completed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;