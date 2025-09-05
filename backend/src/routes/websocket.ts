import { Router, Request, Response, NextFunction } from 'express';
import { createError } from '@/middleware/errorHandler';
import { getWebSocketService } from '@/services/WebSocketService';
import { progressTrackingService } from '@/services/ProgressTrackingService';

const router = Router();

/**
 * GET /api/v1/websocket/status
 * Get WebSocket server status and statistics
 */
router.get(
  '/status',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const webSocketService = getWebSocketService();
      const wsStats = webSocketService.getStats();
      const progressStats = progressTrackingService.getStats();

      res.json({
        success: true,
        data: {
          websocket: {
            totalConnections: wsStats.totalConnections,
            activeAnalyses: wsStats.activeAnalyses,
            subscriptionsByAnalysis: wsStats.subscriptionsByAnalysis,
          },
          progress: {
            activeAnalyses: progressStats.activeAnalyses,
            byStatus: progressStats.byStatus,
            averageCompletionTime: Math.round(progressStats.averageCompletionTime / 1000), // Convert to seconds
          },
          server: {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/websocket/progress/:analysisId
 * Get detailed progress information for a specific analysis
 */
router.get(
  '/progress/:analysisId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      const progress = progressTrackingService.getProgress(analysisId);

      if (!progress) {
        throw createError('Progress tracking not found for this analysis', 404);
      }

      const progressPercentage = progressTrackingService.calculateProgressPercentage(analysisId);
      const currentStep = progress.steps[progress.currentStep];

      res.json({
        success: true,
        data: {
          analysisId: progress.analysisId,
          status: progress.status,
          progress: progressPercentage,
          currentStep: {
            index: progress.currentStep,
            name: currentStep?.name,
            description: currentStep?.description,
            weight: currentStep?.weight,
          },
          timing: {
            startTime: progress.startTime,
            estimatedCompletionTime: progress.estimatedCompletionTime,
            actualCompletionTime: progress.actualCompletionTime,
            elapsedTime: Date.now() - progress.startTime.getTime(),
          },
          steps: progress.steps.map((step, index) => ({
            index,
            name: step.name,
            description: step.description,
            weight: step.weight,
            estimatedDuration: step.estimatedDuration,
            completed: index < progress.currentStep,
            current: index === progress.currentStep,
          })),
          error: progress.error,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/websocket/broadcast
 * Broadcast a system message to all connected clients (admin only)
 */
router.post(
  '/broadcast',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, type = 'info' } = req.body;

      if (!message || typeof message !== 'string') {
        throw createError('Message is required and must be a string', 400);
      }

      if (!['info', 'warning', 'error'].includes(type)) {
        throw createError('Type must be one of: info, warning, error', 400);
      }

      const webSocketService = getWebSocketService();
      webSocketService.broadcastSystemMessage(message, type);

      res.json({
        success: true,
        data: {
          message,
          type,
          broadcastAt: new Date().toISOString(),
          totalConnections: webSocketService.getTotalConnections(),
        },
        message: 'System message broadcasted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/websocket/cleanup
 * Clean up old progress tracking entries
 */
router.post(
  '/cleanup',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { maxAgeMinutes = 60 } = req.body;

      if (typeof maxAgeMinutes !== 'number' || maxAgeMinutes < 1) {
        throw createError('maxAgeMinutes must be a positive number', 400);
      }

      const cleanedCount = progressTrackingService.cleanupOldProgress(maxAgeMinutes);

      res.json({
        success: true,
        data: {
          cleanedCount,
          maxAgeMinutes,
          cleanupAt: new Date().toISOString(),
        },
        message: `Cleaned up ${cleanedCount} old progress tracking entries`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/websocket/health
 * WebSocket health check endpoint
 */
router.get(
  '/health',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const webSocketService = getWebSocketService();
      const totalConnections = webSocketService.getTotalConnections();
      const activeAnalyses = progressTrackingService.getAllActiveProgress().length;

      // Simple health check - if we can get stats, the service is healthy
      const isHealthy = totalConnections >= 0 && activeAnalyses >= 0;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          totalConnections,
          activeAnalyses,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;