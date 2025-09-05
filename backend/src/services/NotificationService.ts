import { getWebSocketService } from './WebSocketService';

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number; // milliseconds, null for persistent
  actions?: NotificationAction[];
  metadata?: any;
  timestamp: Date;
}

export interface NotificationAction {
  label: string;
  action: 'retry' | 'dismiss' | 'navigate' | 'download' | 'custom';
  data?: any;
}

export interface UserFeedback {
  type: 'validation' | 'progress' | 'completion' | 'error' | 'info';
  message: string;
  details?: string;
  actions?: NotificationAction[];
  persistent?: boolean;
}

export class NotificationService {
  private notificationHistory: Map<string, Notification[]> = new Map(); // analysisId -> notifications
  private maxHistoryPerAnalysis = 50;

  /**
   * Send success notification
   */
  public sendSuccess(
    analysisId: string,
    title: string,
    message: string,
    actions?: NotificationAction[]
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'success',
      title,
      message,
      duration: 5000, // 5 seconds
      actions,
      timestamp: new Date(),
    };

    this.sendNotification(analysisId, notification);
  }

  /**
   * Send info notification
   */
  public sendInfo(
    analysisId: string,
    title: string,
    message: string,
    duration?: number,
    actions?: NotificationAction[]
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'info',
      title,
      message,
      duration: duration || 4000, // 4 seconds default
      actions,
      timestamp: new Date(),
    };

    this.sendNotification(analysisId, notification);
  }

  /**
   * Send warning notification
   */
  public sendWarning(
    analysisId: string,
    title: string,
    message: string,
    actions?: NotificationAction[]
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'warning',
      title,
      message,
      duration: 8000, // 8 seconds
      actions,
      timestamp: new Date(),
    };

    this.sendNotification(analysisId, notification);
  }

  /**
   * Send error notification
   */
  public sendError(
    analysisId: string,
    title: string,
    message: string,
    actions?: NotificationAction[]
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'error',
      title,
      message,
      duration: null, // Persistent until dismissed
      actions,
      timestamp: new Date(),
    };

    this.sendNotification(analysisId, notification);
  }

  /**
   * Send file upload feedback
   */
  public sendFileUploadFeedback(
    analysisId: string,
    success: boolean,
    filename: string,
    details?: string
  ): void {
    if (success) {
      this.sendSuccess(
        analysisId,
        'File Uploaded Successfully',
        `${filename} has been uploaded and is ready for analysis.`,
        [
          {
            label: 'Start Analysis',
            action: 'custom',
            data: { action: 'start-analysis' },
          },
        ]
      );
    } else {
      this.sendError(
        analysisId,
        'File Upload Failed',
        `Failed to upload ${filename}. ${details || 'Please try again.'}`,
        [
          {
            label: 'Try Again',
            action: 'retry',
            data: { operation: 'file-upload' },
          },
          {
            label: 'Choose Different File',
            action: 'custom',
            data: { action: 'select-file' },
          },
        ]
      );
    }
  }

  /**
   * Send analysis progress feedback
   */
  public sendAnalysisProgress(
    analysisId: string,
    step: string,
    progress: number,
    estimatedTime?: Date
  ): void {
    const timeMessage = estimatedTime 
      ? ` (estimated completion: ${this.formatTime(estimatedTime)})`
      : '';

    this.sendInfo(
      analysisId,
      'Analysis in Progress',
      `${step}... ${progress}%${timeMessage}`,
      2000 // Short duration for progress updates
    );
  }

  /**
   * Send analysis completion feedback
   */
  public sendAnalysisCompletion(
    analysisId: string,
    overallScore: number,
    recommendationCount: number
  ): void {
    this.sendSuccess(
      analysisId,
      'Analysis Complete!',
      `Your resume scored ${overallScore}/100 with ${recommendationCount} recommendations for improvement.`,
      [
        {
          label: 'View Results',
          action: 'navigate',
          data: { url: `/analysis/${analysisId}` },
        },
        {
          label: 'Download Report',
          action: 'download',
          data: { url: `/api/v1/reports/${analysisId}/pdf` },
        },
      ]
    );
  }

  /**
   * Send validation error feedback
   */
  public sendValidationError(
    analysisId: string,
    field: string,
    message: string,
    suggestedActions: string[]
  ): void {
    const actions: NotificationAction[] = suggestedActions.map((action, index) => ({
      label: action,
      action: 'custom',
      data: { action: `validation-fix-${index}`, field, suggestion: action },
    }));

    this.sendError(
      analysisId,
      `Validation Error: ${field}`,
      message,
      actions
    );
  }

  /**
   * Send retry suggestion
   */
  public sendRetryFeedback(
    analysisId: string,
    operation: string,
    attempt: number,
    maxAttempts: number,
    nextRetryIn?: number
  ): void {
    const retryMessage = nextRetryIn 
      ? ` Retrying in ${Math.ceil(nextRetryIn / 1000)} seconds...`
      : '';

    this.sendWarning(
      analysisId,
      'Operation Failed',
      `${operation} failed (attempt ${attempt}/${maxAttempts}).${retryMessage}`,
      [
        {
          label: 'Cancel Retry',
          action: 'custom',
          data: { action: 'cancel-retry', operation },
        },
      ]
    );
  }

  /**
   * Send system maintenance notification
   */
  public sendMaintenanceNotification(
    analysisId: string,
    message: string,
    estimatedDuration?: number
  ): void {
    const durationText = estimatedDuration 
      ? ` Expected duration: ${Math.ceil(estimatedDuration / 60000)} minutes.`
      : '';

    this.sendWarning(
      analysisId,
      'System Maintenance',
      `${message}${durationText}`,
      [
        {
          label: 'Check Status',
          action: 'navigate',
          data: { url: '/status' },
        },
      ]
    );
  }

  /**
   * Send generic user feedback
   */
  public sendUserFeedback(analysisId: string, feedback: UserFeedback): void {
    const notification: Notification = {
      id: this.generateId(),
      type: this.mapFeedbackTypeToNotificationType(feedback.type),
      title: this.generateTitleFromFeedbackType(feedback.type),
      message: feedback.message,
      duration: feedback.persistent ? null : this.getDefaultDuration(feedback.type),
      actions: feedback.actions,
      metadata: { details: feedback.details },
      timestamp: new Date(),
    };

    this.sendNotification(analysisId, notification);
  }

  /**
   * Send notification via WebSocket and store in history
   */
  private sendNotification(analysisId: string, notification: Notification): void {
    // Store in history
    if (!this.notificationHistory.has(analysisId)) {
      this.notificationHistory.set(analysisId, []);
    }

    const history = this.notificationHistory.get(analysisId)!;
    history.push(notification);

    // Limit history size
    if (history.length > this.maxHistoryPerAnalysis) {
      history.shift();
    }

    // Send via WebSocket
    try {
      const webSocketService = getWebSocketService();
      webSocketService.sendProgressUpdate({
        analysisId,
        status: 'processing', // This will be overridden by actual status
        progress: 0, // This will be overridden by actual progress
        data: {
          notification,
        },
      });
    } catch (error) {
      console.error('Failed to send notification via WebSocket:', error);
    }

    console.log(`Notification sent for analysis ${analysisId}: ${notification.type} - ${notification.title}`);
  }

  /**
   * Get notification history for an analysis
   */
  public getNotificationHistory(analysisId: string): Notification[] {
    return this.notificationHistory.get(analysisId) || [];
  }

  /**
   * Clear notification history for an analysis
   */
  public clearNotificationHistory(analysisId: string): void {
    this.notificationHistory.delete(analysisId);
  }

  /**
   * Get all active notifications (non-expired)
   */
  public getActiveNotifications(analysisId: string): Notification[] {
    const history = this.notificationHistory.get(analysisId) || [];
    const now = Date.now();

    return history.filter(notification => {
      if (notification.duration === null) {
        return true; // Persistent notifications
      }
      
      const expiryTime = notification.timestamp.getTime() + notification.duration;
      return now < expiryTime;
    });
  }

  /**
   * Dismiss a specific notification
   */
  public dismissNotification(analysisId: string, notificationId: string): boolean {
    const history = this.notificationHistory.get(analysisId);
    if (!history) {
      return false;
    }

    const index = history.findIndex(n => n.id === notificationId);
    if (index === -1) {
      return false;
    }

    // Mark as dismissed by setting duration to 0
    history[index].duration = 0;
    return true;
  }

  /**
   * Get notification statistics
   */
  public getNotificationStats(): {
    totalNotifications: number;
    byType: Record<string, number>;
    activeAnalyses: number;
    recentNotifications: number; // last hour
  } {
    let totalNotifications = 0;
    const byType: Record<string, number> = {
      success: 0,
      info: 0,
      warning: 0,
      error: 0,
    };
    let recentNotifications = 0;
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    this.notificationHistory.forEach(history => {
      history.forEach(notification => {
        totalNotifications++;
        byType[notification.type]++;
        
        if (notification.timestamp.getTime() > oneHourAgo) {
          recentNotifications++;
        }
      });
    });

    return {
      totalNotifications,
      byType,
      activeAnalyses: this.notificationHistory.size,
      recentNotifications,
    };
  }

  /**
   * Generate unique notification ID
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map feedback type to notification type
   */
  private mapFeedbackTypeToNotificationType(feedbackType: string): 'success' | 'info' | 'warning' | 'error' {
    switch (feedbackType) {
      case 'completion':
        return 'success';
      case 'error':
        return 'error';
      case 'validation':
        return 'warning';
      case 'progress':
      case 'info':
      default:
        return 'info';
    }
  }

  /**
   * Generate title from feedback type
   */
  private generateTitleFromFeedbackType(feedbackType: string): string {
    switch (feedbackType) {
      case 'validation':
        return 'Validation Issue';
      case 'progress':
        return 'Progress Update';
      case 'completion':
        return 'Task Completed';
      case 'error':
        return 'Error Occurred';
      case 'info':
      default:
        return 'Information';
    }
  }

  /**
   * Get default duration for feedback type
   */
  private getDefaultDuration(feedbackType: string): number {
    switch (feedbackType) {
      case 'error':
        return null; // Persistent
      case 'validation':
        return 10000; // 10 seconds
      case 'completion':
        return 8000; // 8 seconds
      case 'progress':
        return 3000; // 3 seconds
      case 'info':
      default:
        return 5000; // 5 seconds
    }
  }

  /**
   * Format time for display
   */
  private formatTime(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return `${Math.ceil(diff / 1000)} seconds`;
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.ceil(diff / 60000)} minutes`;
    } else {
      return date.toLocaleTimeString();
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();