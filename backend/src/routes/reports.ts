import { Router, Request, Response, NextFunction } from 'express';
import { createError } from '@/middleware/errorHandler';
import { AnalysisResultModel } from '@/models/AnalysisResult';

// Dummy models for compatibility
const Resume: any = {};
const JobDescription: any = {};
const AnalysisResult: any = {};

// Model instances
const analysisResultModel = new AnalysisResultModel();

const router = Router();

/**
 * GET /api/v1/reports/:analysisId/pdf
 * Export analysis report as PDF
 */
router.get(
  '/:analysisId/pdf',
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params;
      const { includeResume: _includeResume = 'false' } = req.query;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      const analysisResult = await analysisResultModel.getAnalysisResult(analysisId);

      if (!analysisResult) {
        throw createError('Analysis not found', 404);
      }

      if (analysisResult.status !== 'completed') {
        throw createError('Analysis is not completed yet', 400);
      }

      // Generate PDF report
      throw createError('PDF generation not implemented', 501);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/:analysisId/json
 * Export analysis report as JSON
 */
router.get(
  '/:analysisId/json',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params;
      const { includeResume = 'false', includeJobDescription = 'false' } = req.query;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      const analysisResult = await AnalysisResult.findByPk(analysisId, {
        include: [
          {
            model: Resume,
            as: 'resume',
            attributes: ['id', 'originalName', 'extractedContent', 'uploadedAt'],
          },
          {
            model: JobDescription,
            as: 'jobDescription',
            attributes: ['id', 'title', 'company', 'content', 'extractedRequirements', 'processedAt'],
          },
        ],
      });

      if (!analysisResult) {
        throw createError('Analysis not found', 404);
      }

      if (analysisResult.status !== 'completed') {
        throw createError('Analysis is not completed yet', 400);
      }

      // Build export data
      const exportData: any = {
        analysisId: analysisResult.id,
        status: analysisResult.status,
        overallScore: analysisResult.overallScore,
        categoryScores: analysisResult.categoryScores,
        recommendations: analysisResult.recommendations,
        strengths: analysisResult.strengths,
        improvementAreas: analysisResult.improvementAreas,
        analyzedAt: analysisResult.analyzedAt,
        createdAt: analysisResult.createdAt,
        resume: {
          id: analysisResult.resume?.id,
          originalName: analysisResult.resume?.originalName,
          uploadedAt: analysisResult.resume?.uploadedAt,
        },
        exportedAt: new Date(),
        exportOptions: {
          includeResumeContent: includeResume === 'true',
          includeJobDescription: includeJobDescription === 'true',
        },
      };

      // Include resume content if requested
      if (includeResume === 'true' && analysisResult.resume) {
        exportData.resume.content = analysisResult.resume.extractedContent;
      }

      // Include job description if requested
      if (includeJobDescription === 'true' && analysisResult.jobDescription) {
        exportData.jobDescription = {
          id: analysisResult.jobDescription.id,
          title: analysisResult.jobDescription.title,
          company: analysisResult.jobDescription.company,
          content: analysisResult.jobDescription.content,
          extractedRequirements: analysisResult.jobDescription.extractedRequirements,
          processedAt: analysisResult.jobDescription.processedAt,
        };
      } else if (analysisResult.jobDescription) {
        exportData.jobDescription = {
          id: analysisResult.jobDescription.id,
          title: analysisResult.jobDescription.title,
          company: analysisResult.jobDescription.company,
          processedAt: analysisResult.jobDescription.processedAt,
        };
      }

      // Set response headers for JSON download
      const filename = `resume-analysis-${analysisResult.id}-${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      res.json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/:analysisId/summary
 * Get analysis summary (lightweight report data)
 */
router.get(
  '/:analysisId/summary',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      const analysisResult = await AnalysisResult.findByPk(analysisId, {
        include: [
          {
            model: Resume,
            as: 'resume',
            attributes: ['id', 'originalName', 'uploadedAt'],
          },
          {
            model: JobDescription,
            as: 'jobDescription',
            attributes: ['id', 'title', 'company', 'processedAt'],
          },
        ],
      });

      if (!analysisResult) {
        throw createError('Analysis not found', 404);
      }

      if (analysisResult.status !== 'completed') {
        throw createError('Analysis is not completed yet', 400);
      }

      // Generate summary statistics
      const highPriorityRecommendations = analysisResult.recommendations.filter(
        (rec: any) => rec.priority === 'high'
      ).length;

      const mediumPriorityRecommendations = analysisResult.recommendations.filter(
        (rec: any) => rec.priority === 'medium'
      ).length;

      const lowPriorityRecommendations = analysisResult.recommendations.filter(
        (rec: any) => rec.priority === 'low'
      ).length;

      const topStrengths = analysisResult.strengths.slice(0, 3);
      const topImprovements = analysisResult.improvementAreas.slice(0, 3);

      res.json({
        success: true,
        data: {
          analysisId: analysisResult.id,
          overallScore: analysisResult.overallScore,
          categoryScores: analysisResult.categoryScores,
          recommendationSummary: {
            total: analysisResult.recommendations.length,
            high: highPriorityRecommendations,
            medium: mediumPriorityRecommendations,
            low: lowPriorityRecommendations,
          },
          topStrengths,
          topImprovements,
          resume: {
            id: analysisResult.resume?.id,
            originalName: analysisResult.resume?.originalName,
            uploadedAt: analysisResult.resume?.uploadedAt,
          },
          jobDescription: analysisResult.jobDescription ? {
            id: analysisResult.jobDescription.id,
            title: analysisResult.jobDescription.title,
            company: analysisResult.jobDescription.company,
            processedAt: analysisResult.jobDescription.processedAt,
          } : null,
          analyzedAt: analysisResult.analyzedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/reports/:analysisId/email
 * Email analysis report to user
 */
router.post(
  '/:analysisId/email',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params;
      const { email, format = 'pdf', includeResume = false } = req.body;

      if (!analysisId) {
        throw createError('Analysis ID is required', 400);
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw createError('Valid email address is required', 400);
      }

      const analysisResult = await AnalysisResult.findByPk(analysisId, {
        include: [
          {
            model: Resume,
            as: 'resume',
            attributes: ['id', 'originalName', 'extractedContent', 'uploadedAt'],
          },
          {
            model: JobDescription,
            as: 'jobDescription',
            attributes: ['id', 'title', 'company', 'content', 'processedAt'],
          },
        ],
      });

      if (!analysisResult) {
        throw createError('Analysis not found', 404);
      }

      if (analysisResult.status !== 'completed') {
        throw createError('Analysis is not completed yet', 400);
      }

      // For now, we'll just return success without actually sending email
      // In a real implementation, you would integrate with an email service
      res.json({
        success: true,
        data: {
          analysisId: analysisResult.id,
          email,
          format,
          includeResume,
          scheduledAt: new Date(),
        },
        message: 'Report email scheduled successfully (email functionality not implemented in demo)',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/bulk/:resumeId
 * Get all reports for a resume
 */
router.get(
  '/bulk/:resumeId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resumeId } = req.params;
      const { format = 'json', limit = 10 } = req.query;

      if (!resumeId) {
        throw createError('Resume ID is required', 400);
      }

      const analyses = await AnalysisResult.findAll({
        where: { 
          resumeId,
          status: 'completed',
        },
        include: [
          {
            model: JobDescription,
            as: 'jobDescription',
            attributes: ['id', 'title', 'company', 'processedAt'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit as string),
      });

      if (analyses.length === 0) {
        throw createError('No completed analyses found for this resume', 404);
      }

      if (format === 'pdf') {
        // Generate combined PDF report for all analyses
        throw createError('Bulk PDF generation not implemented', 501);
      } else {
        // Return JSON summary of all analyses
        const summaries = analyses.map((analysis: any) => ({
          analysisId: analysis.id,
          overallScore: analysis.overallScore,
          categoryScores: analysis.categoryScores,
          recommendationCount: analysis.recommendations.length,
          jobDescription: analysis.jobDescription ? {
            id: analysis.jobDescription.id,
            title: analysis.jobDescription.title,
            company: analysis.jobDescription.company,
          } : null,
          analyzedAt: analysis.analyzedAt,
        }));

        res.json({
          success: true,
          data: {
            resumeId,
            totalAnalyses: analyses.length,
            analyses: summaries,
            exportedAt: new Date(),
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;