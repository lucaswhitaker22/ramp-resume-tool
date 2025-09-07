import { Router, Request, Response, NextFunction } from 'express';
import { createError } from '@/middleware/errorHandler';
import { AnalysisResultModel } from '@/models/AnalysisResult';
import { ResumeModel } from '@/models/Resume';
import { JobDescriptionModel } from '@/models/JobDescription';
import { ResumeContentAnalysisService } from '@/services/ResumeContentAnalysisService';
import { ScoringEngineService } from '@/services/ScoringEngineService';
import { RecommendationEngineService } from '@/services/RecommendationEngineService';
import { ATSCompatibilityService } from '@/services/ATSCompatibilityService';
import { ResumeParsingService } from '@/services/ResumeParsingService';
import { progressTrackingService } from '@/services/ProgressTrackingService';
import { notificationService } from '@/services/NotificationService';

const analysisResultModel = new AnalysisResultModel();
const resumeModel = new ResumeModel();
const jobDescriptionModel = new JobDescriptionModel();
const resumeContentAnalysisService = new ResumeContentAnalysisService();
const scoringEngineService = new ScoringEngineService();
const recommendationEngineService = new RecommendationEngineService();
const atsCompatibilityService = new ATSCompatibilityService();
const resumeParsingService = new ResumeParsingService();

const router = Router();

/**
 * POST /api/v1/analysis
 * Start analysis of resume against job description
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resumeId, jobDescriptionId } = req.body;

      if (!resumeId) {
        throw createError('Resume ID is required', 400);
      }

      // Verify resume exists
      const resume = await resumeModel.findById(resumeId);
      if (!resume) {
        throw createError('Resume not found', 404);
      }

      // Verify job description exists (if provided)
      let jobDescription = null;
      if (jobDescriptionId) {
        const jobDescData = await jobDescriptionModel.getWithRequirements(jobDescriptionId);
        if (!jobDescData) {
          throw createError('Job description not found', 404);
        }
        jobDescription = jobDescData;
      }

      // Check if analysis already exists and is recent
      const existingAnalysis = await analysisResultModel.getLatestForResume(resumeId);

      // If analysis exists and is less than 1 hour old, return it
      if (existingAnalysis) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (existingAnalysis.analyzedAt > oneHourAgo) {
          res.json({
            success: true,
            data: {
              analysisId: existingAnalysis.id,
              status: 'completed',
              resumeId: existingAnalysis.resumeId,
              jobDescriptionId: existingAnalysis.jobDescriptionId,
              overallScore: existingAnalysis.overallScore,
              categoryScores: existingAnalysis.categoryScores,
              analyzedAt: existingAnalysis.analyzedAt,
            },
            message: 'Analysis already exists and is recent',
          });
        }
      }

      // Create new analysis record with pending status
      const analysisId = await analysisResultModel.createAnalysisResult({
        resumeId,
        jobDescriptionId: jobDescriptionId || undefined,
        overallScore: 0,
        categoryScores: {
          content: 0,
          structure: 0,
          keywords: 0,
          experience: 0,
          skills: 0,
        },
        recommendations: [],
        strengths: [],
        improvementAreas: [],
      });

      // Start progress tracking
      progressTrackingService.startTracking(analysisId);

      // Send initial notification
      notificationService.sendInfo(
        analysisId,
        'Analysis Started',
        'Your resume analysis has been queued and will begin shortly.',
        5000
      );

      // Start async analysis (don't await - let it run in background)
      performAnalysis(analysisId, resume, jobDescription).catch(error => {
        console.error('Analysis failed:', error);
        progressTrackingService.fail(analysisId, error.message || 'Analysis failed due to unexpected error');
        
        // Send error notification
        notificationService.sendError(
          analysisId,
          'Analysis Failed',
          error.message || 'Analysis failed due to unexpected error',
          [
            {
              label: 'Try Again',
              action: 'retry',
              data: { operation: 'analysis' },
            },
            {
              label: 'Contact Support',
              action: 'custom',
              data: { action: 'contact-support' },
            },
          ]
        );
      });

      res.status(202).json({
        success: true,
        data: {
          analysisId,
          status: 'pending',
          resumeId,
          jobDescriptionId: jobDescriptionId || null,
          estimatedCompletionTime: new Date(Date.now() + 30000), // 30 seconds estimate
          createdAt: new Date(),
        },
        message: 'Analysis started successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analysis/:analysisId
 * Get analysis results by ID
 */
router.get(
  '/:analysisId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      const analysisResult = await analysisResultModel.getAnalysisResult(analysisId);

      if (!analysisResult) {
        throw createError('Analysis not found', 404);
      }

      // Get related resume and job description data
      const resume = await resumeModel.findById(analysisResult.resumeId);
      let jobDescription = null;
      if (analysisResult.jobDescriptionId) {
        const jobDescData = await jobDescriptionModel.getWithRequirements(analysisResult.jobDescriptionId);
        jobDescription = jobDescData?.jobDescription;
      }

      res.json({
        success: true,
        data: {
          analysisId: analysisResult.id,
          status: analysisResult.status,
          resumeId: analysisResult.resumeId,
          jobDescriptionId: analysisResult.jobDescriptionId,
          overallScore: analysisResult.overallScore,
          categoryScores: analysisResult.categoryScores,
          recommendations: analysisResult.recommendations,
          strengths: analysisResult.strengths,
          improvementAreas: analysisResult.improvementAreas,
          error: analysisResult.error,
          analyzedAt: analysisResult.analyzedAt,
          resume: resume ? {
            id: resume.id,
            filename: resume.filename,
            uploadedAt: resume.uploaded_at,
          } : null,
          jobDescription: jobDescription ? {
            id: jobDescription.id,
            content: jobDescription.content,
            createdAt: jobDescription.created_at,
          } : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/analysis/:analysisId/status
 * Get analysis status (lightweight endpoint for polling)
 */
router.get(
  '/:analysisId/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      const analysisResult = await analysisResultModel.getAnalysisResult(analysisId);

      if (!analysisResult) {
        throw createError('Analysis not found', 404);
      }

      // Get progress from tracking service
      const progressData = progressTrackingService.getProgress(analysisId);
      let progress = 0;
      let estimatedCompletionTime = null;
      let currentStep = 'Processing...';

      if (progressData) {
        progress = progressTrackingService.calculateProgressPercentage(analysisId);
        estimatedCompletionTime = progressData.estimatedCompletionTime;
        currentStep = progressData.steps[progressData.currentStep]?.description || 'Processing...';
      } else {
        // Fallback calculation if progress tracking is not available
        if (analysisResult.status === 'pending') {
          progress = 5;
          estimatedCompletionTime = new Date(Date.now() + 30000);
        } else if (analysisResult.status === 'processing') {
          progress = 50;
          estimatedCompletionTime = new Date(Date.now() + 15000);
        } else if (analysisResult.status === 'completed') {
          progress = 100;
        }
      }

      res.json({
        success: true,
        data: {
          analysisId: analysisResult.id,
          status: analysisResult.status,
          progress,
          currentStep,
          overallScore: analysisResult.overallScore,
          error: analysisResult.error,
          estimatedCompletionTime,
          analyzedAt: analysisResult.analyzedAt,
        },
      });
    } catch (error) {
      next(error);
      return;
    }
    return;
  }
);

/**
 * GET /api/v1/analysis/resume/:resumeId
 * Get all analyses for a specific resume
 */
router.get(
  '/resume/:resumeId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resumeId } = req.params;
      const { limit = 10 } = req.query;

      if (!resumeId) {
        throw createError('Resume ID is required', 400);
      }

      const analyses = await analysisResultModel.findByResumeId(resumeId);
      
      // Sort by analyzed date and limit results
      const sortedAnalyses = analyses
        .sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime())
        .slice(0, parseInt(limit as string));

      // Get job description details for each analysis
      const analysesWithJobDesc = await Promise.all(
        sortedAnalyses.map(async (analysis) => {
          let jobDescription = null;
          if (analysis.jobDescriptionId) {
            const jobDescData = await jobDescriptionModel.getWithRequirements(analysis.jobDescriptionId);
            jobDescription = jobDescData?.jobDescription;
          }

          return {
            analysisId: analysis.id,
            status: analysis.status,
            overallScore: analysis.overallScore,
            jobDescription: jobDescription ? {
              id: jobDescription.id,
              content: jobDescription.content.substring(0, 200) + '...', // Truncate for list view
              createdAt: jobDescription.created_at,
            } : null,
            analyzedAt: analysis.analyzedAt,
          };
        })
      );

      res.json({
        success: true,
        data: {
          analyses: analysesWithJobDesc,
          pagination: {
            total: analyses.length,
            limit: parseInt(limit as string),
            hasMore: analyses.length > parseInt(limit as string),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/analysis/:analysisId
 * Delete analysis result
 */
router.delete(
  '/:analysisId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      const analysisResult = await analysisResultModel.getAnalysisResult(analysisId);

      if (!analysisResult) {
        throw createError('Analysis not found', 404);
      }

      await analysisResultModel.deleteById(analysisId);

      res.json({
        success: true,
        message: 'Analysis deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Perform the actual analysis (async function)
 */
async function performAnalysis(
  analysisId: string,
  resume: any,
  jobDescription: any | null
): Promise<void> {
  try {
    // Step 1: Initialization
    progressTrackingService.nextStep(analysisId, 'Initializing analysis...');
    await analysisResultModel.updateStatus(analysisId, 'processing');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initialization time

    // Step 2: Parse resume content
    progressTrackingService.nextStep(analysisId, 'Parsing resume content...');
    const resumeText = resume.content_text || resume.extractedContent || '';
    const { content: parsedResume, sections } = resumeParsingService.parseResumeWithSections(resumeText);
    console.log('Parsed resume:', JSON.stringify(parsedResume, null, 2));

    // Step 3: Content analysis
    progressTrackingService.nextStep(analysisId, 'Analyzing resume content...');
    const contentAnalysis = await resumeContentAnalysisService.analyzeResumeContent(
      parsedResume,
      sections,
      jobDescription?.requirements || undefined
    );
    console.log('Content analysis result:', JSON.stringify(contentAnalysis, null, 2));

    // Step 4: ATS compatibility check
    progressTrackingService.nextStep(analysisId, 'Checking ATS compatibility...');
    const atsAnalysis = atsCompatibilityService.analyzeATSCompatibility(
      parsedResume,
      sections
    );
    console.log('ATS analysis result:', JSON.stringify(atsAnalysis, null, 2));

    // Step 5: Calculate scores
    progressTrackingService.nextStep(analysisId, 'Calculating compatibility scores...');
    const scores = await scoringEngineService.calculateOverallScore(
      parsedResume,
      sections,
      jobDescription?.requirements || undefined,
      jobDescription?.content || undefined
    );

    // Step 6: Generate recommendations
    progressTrackingService.nextStep(analysisId, 'Generating recommendations...');
    const recommendations = await recommendationEngineService.generateRecommendations(
      parsedResume,
      sections,
      scores.categoryScores,
      jobDescription?.requirements || undefined
    );
    console.log('Recommendations result:', JSON.stringify(recommendations, null, 2));

    // Step 7: Finalization
    progressTrackingService.nextStep(analysisId, 'Finalizing analysis results...');

    // Update analysis result
    await analysisResultModel.updateResults(analysisId, {
      overallScore: scores.overallScore,
      categoryScores: scores.categoryScores,
      recommendations: recommendations.recommendations.map(r => ({
        id: r.id,
        category: r.category,
        priority: r.priority,
        title: r.title,
        description: r.description,
        impact: r.impact,
        ...(r.examples && { examples: r.examples })
      })),
      strengths: scores.explanation.strengths,
      improvementAreas: scores.explanation.improvements,
    });

    // Complete progress tracking
    progressTrackingService.complete(analysisId);

    // Send completion notification
    notificationService.sendAnalysisCompletion(
      analysisId,
      scores.overallScore,
      recommendations.recommendations.length
    );

  } catch (error) {
    console.error('Analysis processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed due to unexpected error';
    await analysisResultModel.updateStatus(
      analysisId,
      'failed',
      errorMessage
    );

    // Mark progress as failed
    progressTrackingService.fail(analysisId, errorMessage);

    throw error;
  }
}

export default router;