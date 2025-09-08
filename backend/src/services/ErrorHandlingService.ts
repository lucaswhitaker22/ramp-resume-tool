import { getWebSocketService } from './WebSocketService';

export interface ErrorContext {
  userId?: string;
  analysisId?: string;
  resumeId?: string;
  jobDescriptionId?: string;
  operation?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface UserFriendlyError {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'validation' | 'processing' | 'system' | 'network' | 'security';
  retryable: boolean;
  suggestedActions: string[];
  supportContact?: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[];
}

export class ErrorHandlingService {
  private errorMappings: Map<string, UserFriendlyError> = new Map();
  private retryConfigs: Map<string, RetryConfig> = new Map();
  private errorLog: Array<{ error: any; context: ErrorContext; timestamp: Date }> = [];
  private maxLogSize = 1000;

  constructor() {
    this.initializeErrorMappings();
    this.initializeRetryConfigs();
  }

  private initializeErrorMappings(): void {
    // File upload errors
    this.errorMappings.set('FILE_TOO_LARGE', {
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds maximum limit',
      userMessage: 'The file you uploaded is too large. Please upload a file smaller than 10MB.',
      severity: 'medium',
      category: 'validation',
      retryable: false,
      suggestedActions: [
        'Reduce the file size by compressing it',
        'Convert to a different format (PDF recommended)',
        'Remove unnecessary images or formatting',
      ],
    });

    this.errorMappings.set('UNSUPPORTED_FILE_FORMAT', {
      code: 'UNSUPPORTED_FILE_FORMAT',
      message: 'File format not supported',
      userMessage: 'This file format is not supported. Please upload a PDF, DOC, DOCX, or TXT file.',
      severity: 'medium',
      category: 'validation',
      retryable: false,
      suggestedActions: [
        'Convert your resume to PDF format',
        'Save as DOC or DOCX from your word processor',
        'Export as plain text if other formats fail',
      ],
    });

    this.errorMappings.set('FILE_CORRUPTED', {
      code: 'FILE_CORRUPTED',
      message: 'File appears to be corrupted or unreadable',
      userMessage: 'We couldn\'t read your file. It may be corrupted or password-protected.',
      severity: 'medium',
      category: 'processing',
      retryable: true,
      suggestedActions: [
        'Try uploading the file again',
        'If the file is password-protected, remove the password',
        'Save a new copy of your resume and try again',
        'Convert to a different format',
      ],
    });

    // Content analysis errors
    this.errorMappings.set('INSUFFICIENT_CONTENT', {
      code: 'INSUFFICIENT_CONTENT',
      message: 'Resume content is too short for meaningful analysis',
      userMessage: 'Your resume appears to be very short. We need more content to provide useful feedback.',
      severity: 'medium',
      category: 'validation',
      retryable: false,
      suggestedActions: [
        'Ensure your resume includes work experience, education, and skills',
        'Check that the file uploaded correctly',
        'Make sure the resume is not mostly images or formatting',
      ],
    });

    this.errorMappings.set('TEXT_EXTRACTION_FAILED', {
      code: 'TEXT_EXTRACTION_FAILED',
      message: 'Failed to extract text from the document',
      userMessage: 'We had trouble reading the text from your resume. This might be due to complex formatting or images.',
      severity: 'high',
      category: 'processing',
      retryable: true,
      suggestedActions: [
        'Try converting your resume to a simpler PDF format',
        'Remove complex formatting, tables, or images',
        'Save as plain text and upload again',
        'Try uploading a different version of your resume',
      ],
    });

    // Job description errors
    this.errorMappings.set('JOB_DESCRIPTION_TOO_SHORT', {
      code: 'JOB_DESCRIPTION_TOO_SHORT',
      message: 'Job description is too short',
      userMessage: 'The job description is too short to provide meaningful analysis. Please provide more details.',
      severity: 'medium',
      category: 'validation',
      retryable: false,
      suggestedActions: [
        'Include job responsibilities and requirements',
        'Add required skills and qualifications',
        'Provide company information if available',
      ],
    });

    this.errorMappings.set('JOB_DESCRIPTION_TOO_LONG', {
      code: 'JOB_DESCRIPTION_TOO_LONG',
      message: 'Job description exceeds maximum length',
      userMessage: 'The job description is too long. Please keep it under 10,000 characters.',
      severity: 'medium',
      category: 'validation',
      retryable: false,
      suggestedActions: [
        'Focus on the most important requirements and responsibilities',
        'Remove duplicate or unnecessary information',
        'Summarize lengthy sections',
      ],
    });

    // Analysis errors
    this.errorMappings.set('ANALYSIS_TIMEOUT', {
      code: 'ANALYSIS_TIMEOUT',
      message: 'Analysis took too long to complete',
      userMessage: 'The analysis is taking longer than expected. This might be due to high server load.',
      severity: 'high',
      category: 'system',
      retryable: true,
      suggestedActions: [
        'Try starting the analysis again',
        'Wait a few minutes and retry',
        'Contact support if the problem persists',
      ],
      supportContact: true,
    });

    this.errorMappings.set('ANALYSIS_SERVICE_UNAVAILABLE', {
      code: 'ANALYSIS_SERVICE_UNAVAILABLE',
      message: 'Analysis service is temporarily unavailable',
      userMessage: 'Our analysis service is temporarily unavailable. Please try again in a few minutes.',
      severity: 'high',
      category: 'system',
      retryable: true,
      suggestedActions: [
        'Wait a few minutes and try again',
        'Check our status page for service updates',
        'Contact support if the issue persists',
      ],
      supportContact: true,
    });

    // System errors
    this.errorMappings.set('DATABASE_CONNECTION_ERROR', {
      code: 'DATABASE_CONNECTION_ERROR',
      message: 'Database connection failed',
      userMessage: 'We\'re experiencing technical difficulties. Please try again in a few minutes.',
      severity: 'critical',
      category: 'system',
      retryable: true,
      suggestedActions: [
        'Wait a few minutes and try again',
        'Refresh the page and retry',
        'Contact support if the problem continues',
      ],
      supportContact: true,
    });

    this.errorMappings.set('RATE_LIMIT_EXCEEDED', {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      userMessage: 'You\'ve made too many requests. Please wait a moment before trying again.',
      severity: 'medium',
      category: 'security',
      retryable: true,
      suggestedActions: [
        'Wait a few minutes before trying again',
        'Avoid rapid successive requests',
        'Contact support if you need higher limits',
      ],
    });

    // Network errors
    this.errorMappings.set('NETWORK_ERROR', {
      code: 'NETWORK_ERROR',
      message: 'Network connection error',
      userMessage: 'There was a problem with the network connection. Please check your internet and try again.',
      severity: 'medium',
      category: 'network',
      retryable: true,
      suggestedActions: [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again',
      ],
    });
  }

  private initializeRetryConfigs(): void {
    // Default retry configuration
    this.retryConfigs.set('default', {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        'NETWORK_ERROR',
        'DATABASE_CONNECTION_ERROR',
        'ANALYSIS_TIMEOUT',
        'ANALYSIS_SERVICE_UNAVAILABLE',
        'FILE_CORRUPTED',
        'TEXT_EXTRACTION_FAILED',
      ],
    });

    // File processing retry configuration
    this.retryConfigs.set('file-processing', {
      maxAttempts: 2,
      baseDelay: 2000,
      maxDelay: 8000,
      backoffMultiplier: 2,
      retryableErrors: [
        'FILE_CORRUPTED',
        'TEXT_EXTRACTION_FAILED',
        'NETWORK_ERROR',
      ],
    });

    // Analysis retry configuration
    this.retryConfigs.set('analysis', {
      maxAttempts: 3,
      baseDelay: 5000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableErrors: [
        'ANALYSIS_TIMEOUT',
        'ANALYSIS_SERVICE_UNAVAILABLE',
        'DATABASE_CONNECTION_ERROR',
      ],
    });
  }

  /**
   * Handle and transform an error into a user-friendly format
   */
  public handleError(error: any, context: ErrorContext): UserFriendlyError {
    // Log the error
    this.logError(error, context);

    // Determine error code
    let errorCode = error.code || error.name || 'UNKNOWN_ERROR';
    
    // Map common error patterns
    if (error.message?.includes('file too large') || error.code === 'LIMIT_FILE_SIZE') {
      errorCode = 'FILE_TOO_LARGE';
    } else if (error.message?.includes('unsupported format') || error.message?.includes('invalid file type')) {
      errorCode = 'UNSUPPORTED_FILE_FORMAT';
    } else if (error.message?.includes('corrupted') || error.message?.includes('unreadable')) {
      errorCode = 'FILE_CORRUPTED';
    } else if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      errorCode = 'ANALYSIS_TIMEOUT';
    } else if (error.message?.includes('connection') && error.message?.includes('database')) {
      errorCode = 'DATABASE_CONNECTION_ERROR';
    } else if (error.message?.includes('rate limit') || error.status === 429) {
      errorCode = 'RATE_LIMIT_EXCEEDED';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorCode = 'NETWORK_ERROR';
    }

    // Get user-friendly error or create default
    const userFriendlyError = this.errorMappings.get(errorCode) || {
      code: errorCode,
      message: error.message || 'An unexpected error occurred',
      userMessage: 'Something went wrong. Please try again or contact support if the problem persists.',
      severity: 'medium' as const,
      category: 'system' as const,
      retryable: true,
      suggestedActions: [
        'Try the operation again',
        'Refresh the page and retry',
        'Contact support if the issue continues',
      ],
      supportContact: true,
    };

    // Send error notification via WebSocket if analysis-related
    if (context.analysisId) {
      try {
        const webSocketService = getWebSocketService();
        webSocketService.sendError(context.analysisId, userFriendlyError.userMessage);
      } catch (wsError) {
        console.error('Failed to send WebSocket error notification:', wsError);
      }
    }

    return userFriendlyError;
  }

  /**
   * Check if an error is retryable
   */
  public isRetryable(errorCode: string, configName: string = 'default'): boolean {
    const config = this.retryConfigs.get(configName);
    if (!config) {
      return false;
    }

    return config.retryableErrors.includes(errorCode);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  public calculateRetryDelay(attempt: number, configName: string = 'default'): number {
    const config = this.retryConfigs.get(configName);
    if (!config) {
      return 1000; // Default 1 second
    }

    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Get retry configuration
   */
  public getRetryConfig(configName: string = 'default'): RetryConfig | undefined {
    return this.retryConfigs.get(configName);
  }

  /**
   * Execute operation with retry logic
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    configName: string = 'default'
  ): Promise<T> {
    const config = this.retryConfigs.get(configName);
    if (!config) {
      throw new Error(`Retry configuration '${configName}' not found`);
    }

    let lastError: any;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const userFriendlyError = this.handleError(error, {
          ...context,
          operation: `${context.operation} (attempt ${attempt}/${config.maxAttempts})`,
        });

        // Send retry notification if analysis-related
        if (context.analysisId && attempt < config.maxAttempts && userFriendlyError.retryable) {
          const delay = this.calculateRetryDelay(attempt, configName);
          try {
            const { notificationService } = await import('./NotificationService');
            notificationService.sendRetryFeedback(
              context.analysisId,
              context.operation || 'operation',
              attempt,
              config.maxAttempts,
              delay
            );
          } catch (notificationError) {
            console.error('Failed to send retry notification:', notificationError);
          }
        }

        // Don't retry if not retryable or if this is the last attempt
        if (!userFriendlyError.retryable || attempt === config.maxAttempts) {
          throw error;
        }

        // Wait before retrying
        const delay = this.calculateRetryDelay(attempt, configName);
        console.log(`Retrying operation after ${delay}ms (attempt ${attempt}/${config.maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Create a retry wrapper for async functions
   */
  public createRetryWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: Partial<ErrorContext>,
    configName: string = 'default'
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      return this.executeWithRetry(
        () => fn(...args),
        {
          timestamp: new Date(),
          ...context,
        },
        configName
      );
    };
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(error: any, context: ErrorContext): void {
    const logEntry = {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name,
      },
      context,
      timestamp: new Date(),
    };

    // Add to in-memory log (with size limit)
    this.errorLog.push(logEntry);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift(); // Remove oldest entry
    }

    // Log to console (in production, this would go to a proper logging service)
    console.error('Error handled:', {
      code: error.code || error.name || 'UNKNOWN',
      message: error.message,
      context: {
        operation: context.operation,
        analysisId: context.analysisId,
        resumeId: context.resumeId,
        timestamp: context.timestamp,
      },
    });
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: number; // last hour
  } {
    const stats = {
      totalErrors: this.errorLog.length,
      errorsByCode: {} as Record<string, number>,
      errorsByCategory: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      recentErrors: 0,
    };

    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    this.errorLog.forEach(entry => {
      const errorCode = entry.error.code || entry.error.name || 'UNKNOWN';
      const userFriendlyError = this.errorMappings.get(errorCode);

      // Count by code
      stats.errorsByCode[errorCode] = (stats.errorsByCode[errorCode] || 0) + 1;

      // Count by category and severity if we have mapping
      if (userFriendlyError) {
        stats.errorsByCategory[userFriendlyError.category] = 
          (stats.errorsByCategory[userFriendlyError.category] || 0) + 1;
        stats.errorsBySeverity[userFriendlyError.severity] = 
          (stats.errorsBySeverity[userFriendlyError.severity] || 0) + 1;
      }

      // Count recent errors
      if (entry.timestamp.getTime() > oneHourAgo) {
        stats.recentErrors++;
      }
    });

    return stats;
  }

  /**
   * Get recent error log entries
   */
  public getRecentErrors(limit: number = 50): Array<{ error: any; context: ErrorContext; timestamp: Date }> {
    return this.errorLog
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear error log
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }
}

// Singleton instance
export const errorHandlingService = new ErrorHandlingService();