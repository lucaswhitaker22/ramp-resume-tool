import { Router, Request, Response, NextFunction } from 'express';
import { createError } from '@/middleware/errorHandler';
import { AnalysisResultModel } from '@/models/AnalysisResult';
import { ResumeModel } from '@/models/Resume';
import { JobDescriptionModel } from '@/models/JobDescription';
import { resumeContentAnalysisService } from '@/services/ResumeContentAnalysisService';
import { scoringEngineService } from '@/services/ScoringEngineService';
import { recommendationEngineService } from '@/services/RecommendationEngineService';
import { atsCompatibilityService } from '@/services/ATSCompatibilityService';

const analysisResultModel = new AnalysisResultModel();
const resumeModel = new ResumeModel();
const jobDescriptionModel = new JobDescriptionModel();

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
          return res.json({
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

      // Start async analysis (don't await - let it run in background)
      performAnalysis(analysisId, resume, jobDescription).catch(error => {
        console.error('Analysis failed:', error);
        // Note: We would need to add a method to update analysis status
        // For now, we'll just log the error
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

      let progress = 0;
      let estimatedCompletionTime = null;

      if (analysisResult.status === 'pending') {
        // Calculate progress based on time elapsed
        const elapsed = Date.now() - analysisResult.analyzedAt.getTime();
        progress = Math.min(Math.floor((elapsed / 30000) * 100), 95); // Max 95% until complete
        estimatedCompletionTime = new Date(analysisResult.analyzedAt.getTime() + 30000);
      } else if (analysisResult.status === 'processing') {
        progress = 50; // Halfway through
        estimatedCompletionTime = new Date(Date.now() + 15000); // 15 seconds remaining
      } else if (analysisResult.status === 'completed') {
        progress = 100;
      }

      res.json({
        success: true,
        data: {
          analysisId: analysisResult.id,
          status: analysisResult.status,
          progress,
          overallScore: analysisResult.overallScore,
          error: analysisResult.error,
          estimatedCompletionTime,
          analyzedAt: analysisResult.analyzedAt,
        },
      });
    } catch (error) {
      next(error);
    }
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
    // Update status to processing
    await analysisResultModel.updateStatus(analysisId, 'processing');

    // Perform content analysis
    const contentAnalysis = await resumeContentAnalysisService.analyzeResumeContent(
      resume.content_text || resume.extractedContent || ''
    );

    // Perform ATS compatibility check
    const atsAnalysis = await atsCompatibilityService.checkATSCompatibility(
      resume.content_text || resume.extractedContent || ''
    );

    // Calculate scores
    const scores = await scoringEngineService.calculateOverallScore(
      contentAnalysis,
      atsAnalysis,
      jobDescription?.requirements || null
    );

    // Generate recommendations
    const recommendations = await recommendationEngineService.generateRecommendations(
      contentAnalysis,
      atsAnalysis,
      scores,
      jobDescription?.requirements || null
    );

    // Update analysis result
    await analysisResultModel.updateResults(analysisId, {
      overallScore: scores.overallScore,
      categoryScores: scores.categoryScores,
      recommendations: recommendations.recommendations,
      strengths: recommendations.strengths,
      improvementAreas: recommendations.improvementAreas,
    });
  } catch (error) {
    console.error('Analysis processing error:', error);
    await analysisResultModel.updateStatus(
      analysisId,
      'failed',
      error.message || 'Analysis failed due to unexpected error'
    );
    throw error;
  }
}

export default router;