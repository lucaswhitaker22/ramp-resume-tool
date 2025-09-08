import { getWebSocketService, ProgressUpdate } from './WebSocketService';

export interface AnalysisStep {
  name: string;
  description: string;
  weight: number; // Relative weight for progress calculation (0-1)
  estimatedDuration: number; // Estimated duration in milliseconds
}

export interface AnalysisProgress {
  analysisId: string;
  currentStep: number;
  steps: AnalysisStep[];
  startTime: Date;
  estimatedCompletionTime?: Date | undefined;
  actualCompletionTime?: Date | undefined;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string | undefined;
}

export class ProgressTrackingService {
  private progressMap: Map<string, AnalysisProgress> = new Map();
  
  // Default analysis steps
  private readonly defaultSteps: AnalysisStep[] = [
    {
      name: 'initialization',
      description: 'Initializing analysis',
      weight: 0.05,
      estimatedDuration: 1000, // 1 second
    },
    {
      name: 'content-extraction',
      description: 'Extracting resume content',
      weight: 0.15,
      estimatedDuration: 3000, // 3 seconds
    },
    {
      name: 'content-analysis',
      description: 'Analyzing resume content',
      weight: 0.25,
      estimatedDuration: 8000, // 8 seconds
    },
    {
      name: 'ats-compatibility',
      description: 'Checking ATS compatibility',
      weight: 0.20,
      estimatedDuration: 5000, // 5 seconds
    },
    {
      name: 'scoring',
      description: 'Calculating compatibility scores',
      weight: 0.15,
      estimatedDuration: 4000, // 4 seconds
    },
    {
      name: 'recommendations',
      description: 'Generating recommendations',
      weight: 0.15,
      estimatedDuration: 6000, // 6 seconds
    },
    {
      name: 'finalization',
      description: 'Finalizing analysis results',
      weight: 0.05,
      estimatedDuration: 3000, // 3 seconds
    },
  ];

  /**
   * Start tracking progress for an analysis
   */
  public startTracking(analysisId: string, customSteps?: AnalysisStep[]): void {
    const steps = customSteps || this.defaultSteps;
    const totalEstimatedDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);
    
    const progress: AnalysisProgress = {
      analysisId,
      currentStep: 0,
      steps,
      startTime: new Date(),
      estimatedCompletionTime: new Date(Date.now() + totalEstimatedDuration),
      status: 'pending',
    };

    this.progressMap.set(analysisId, progress);

    // Send initial progress update
    this.sendProgressUpdate(analysisId);
  }

  /**
   * Move to the next step in the analysis
   */
  public nextStep(analysisId: string, customDescription?: string): void {
    const progress = this.progressMap.get(analysisId);
    if (!progress) {
      console.warn(`Progress tracking not found for analysis ${analysisId}`);
      return;
    }

    if (progress.currentStep < progress.steps.length - 1) {
      progress.currentStep++;
      progress.status = 'processing';
      
      // Calculate more accurate estimated completion time based on actual elapsed time
      const elapsedTime = Date.now() - progress.startTime.getTime();
      const completedSteps = progress.currentStep;
      const totalSteps = progress.steps.length;
      
      if (completedSteps > 0) {
        // Use actual performance to adjust estimates
        const averageStepTime = elapsedTime / completedSteps;
        const remainingSteps = totalSteps - completedSteps;
        const estimatedRemainingTime = remainingSteps * averageStepTime;
        progress.estimatedCompletionTime = new Date(Date.now() + estimatedRemainingTime);
      } else {
        // Fallback to original estimation
        const remainingSteps = progress.steps.slice(progress.currentStep);
        const remainingDuration = remainingSteps.reduce((sum, step) => sum + step.estimatedDuration, 0);
        progress.estimatedCompletionTime = new Date(Date.now() + remainingDuration);
      }

      // Override step description if provided
      if (customDescription && progress.currentStep < progress.steps.length) {
        progress.steps[progress.currentStep]!.description = customDescription;
      }

      this.sendProgressUpdate(analysisId);
    }
  }

  /**
   * Complete the analysis tracking
   */
  public complete(analysisId: string): void {
    const progress = this.progressMap.get(analysisId);
    if (!progress) {
      console.warn(`Progress tracking not found for analysis ${analysisId}`);
      return;
    }

    progress.currentStep = progress.steps.length - 1;
    progress.status = 'completed';
    progress.actualCompletionTime = new Date();
    progress.estimatedCompletionTime = undefined;

    this.sendProgressUpdate(analysisId);

    // Clean up after a delay to allow clients to receive the final update
    setTimeout(() => {
      this.progressMap.delete(analysisId);
    }, 30000); // 30 seconds
  }

  /**
   * Mark analysis as failed
   */
  public fail(analysisId: string, error: string): void {
    const progress = this.progressMap.get(analysisId);
    if (!progress) {
      console.warn(`Progress tracking not found for analysis ${analysisId}`);
      return;
    }

    progress.status = 'failed';
    progress.error = error;
    progress.actualCompletionTime = new Date();
    progress.estimatedCompletionTime = undefined;

    this.sendProgressUpdate(analysisId);

    // Send error notification
    try {
      const webSocketService = getWebSocketService();
      webSocketService.sendError(analysisId, error);
    } catch (err) {
      console.error('Failed to send WebSocket error notification:', err);
    }

    // Clean up after a delay
    setTimeout(() => {
      this.progressMap.delete(analysisId);
    }, 60000); // 1 minute for failed analyses
  }

  /**
   * Get current progress for an analysis
   */
  public getProgress(analysisId: string): AnalysisProgress | undefined {
    return this.progressMap.get(analysisId);
  }

  /**
   * Calculate progress percentage
   */
  public calculateProgressPercentage(analysisId: string): number {
    const progress = this.progressMap.get(analysisId);
    if (!progress) {
      return 0;
    }

    if (progress.status === 'completed') {
      return 100;
    }

    if (progress.status === 'failed') {
      return 0;
    }

    // Calculate based on completed steps and their weights
    let completedWeight = 0;
    for (let i = 0; i < progress.currentStep; i++) {
      if (i < progress.steps.length) {
        completedWeight += progress.steps[i]!.weight;
      }
    }

    // Add partial progress for current step based on time elapsed
    if (progress.currentStep < progress.steps.length) {
      const currentStep = progress.steps[progress.currentStep]!;
      const stepStartTime = progress.startTime.getTime() +
        progress.steps.slice(0, progress.currentStep)
          .reduce((sum, step) => sum + step.estimatedDuration, 0);

      const elapsed = Date.now() - stepStartTime;
      const stepProgress = Math.min(elapsed / currentStep.estimatedDuration, 1);
      completedWeight += currentStep.weight * stepProgress;
    }

    return Math.min(Math.round(completedWeight * 100), 99); // Cap at 99% until complete
  }

  /**
   * Send progress update via WebSocket
   */
  private sendProgressUpdate(analysisId: string): void {
    const progress = this.progressMap.get(analysisId);
    if (!progress) {
      return;
    }

    const progressPercentage = this.calculateProgressPercentage(analysisId);
    const currentStep = progress.currentStep < progress.steps.length ? progress.steps[progress.currentStep] : undefined;

    const update: ProgressUpdate = {
      analysisId,
      status: progress.status,
      progress: progressPercentage,
      currentStep: currentStep?.description || 'Processing...',
      estimatedCompletionTime: progress.estimatedCompletionTime,
      error: progress.error,
    };

    try {
      const webSocketService = getWebSocketService();
      webSocketService.sendProgressUpdate(update);
    } catch (error) {
      console.error('Failed to send WebSocket progress update:', error);
    }
  }

  /**
   * Get all active progress tracking
   */
  public getAllActiveProgress(): AnalysisProgress[] {
    return Array.from(this.progressMap.values());
  }

  /**
   * Clean up old progress tracking (for analyses that may have been abandoned)
   */
  public cleanupOldProgress(maxAgeMinutes: number = 60): number {
    const cutoffTime = Date.now() - (maxAgeMinutes * 60 * 1000);
    let cleanedCount = 0;

    this.progressMap.forEach((progress, analysisId) => {
      if (progress.startTime.getTime() < cutoffTime && 
          progress.status !== 'completed' && 
          progress.status !== 'failed') {
        
        // Mark as failed due to timeout
        this.fail(analysisId, 'Analysis timed out');
        cleanedCount++;
      }
    });

    return cleanedCount;
  }

  /**
   * Get statistics about progress tracking
   */
  public getStats(): {
    activeAnalyses: number;
    byStatus: Record<string, number>;
    averageCompletionTime: number;
  } {
    const analyses = Array.from(this.progressMap.values());
    const byStatus: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    let totalCompletionTime = 0;
    let completedCount = 0;

    analyses.forEach(progress => {
      (byStatus as any)[progress.status]++;

      if (progress.actualCompletionTime) {
        totalCompletionTime += progress.actualCompletionTime.getTime() - progress.startTime.getTime();
        completedCount++;
      }
    });

    return {
      activeAnalyses: analyses.length,
      byStatus,
      averageCompletionTime: completedCount > 0 ? totalCompletionTime / completedCount : 0,
    };
  }
}

// Singleton instance
export const progressTrackingService = new ProgressTrackingService();