import { Router, Request, Response, NextFunction } from 'express';
import { jobDescriptionAnalysisService } from '@/services/JobDescriptionAnalysisService';
import { createError } from '@/middleware/errorHandler';
import { JobDescriptionModel } from '@/models/JobDescription';

const jobDescriptionModel = new JobDescriptionModel();

const router = Router();

/**
 * POST /api/v1/job-description
 * Submit a job description for analysis
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content, title, company } = req.body;

      if (!content || typeof content !== 'string') {
        throw createError('Job description content is required', 400);
      }

      if (content.length > 10000) {
        throw createError('Job description content exceeds maximum length of 10,000 characters', 400);
      }

      if (content.trim().length < 50) {
        throw createError('Job description content is too short (minimum 50 characters)', 400);
      }

      // Analyze the job description
      const analysisResult = await jobDescriptionAnalysisService.analyzeJobDescription(content);

      // Create job description record
      const jobDescriptionId = await jobDescriptionModel.createJobDescription({
        content: content.trim(),
        extractedRequirements: analysisResult,
      });

      const jobDescription = await jobDescriptionModel.findById(jobDescriptionId);

      res.status(201).json({
        success: true,
        data: {
          jobDescriptionId: jobDescription?.id,
          contentLength: jobDescription?.content.length,
          extractedRequirements: {
            requiredSkills: analysisResult.requiredSkills,
            preferredSkills: analysisResult.preferredSkills,
            experienceLevel: analysisResult.experienceLevel,
            education: analysisResult.education,
            certifications: analysisResult.certifications,
            keywordCount: analysisResult.keywords.length,
          },
          createdAt: jobDescription?.created_at,
        },
        message: 'Job description analyzed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/job-description/:jobDescriptionId
 * Get job description details and analysis
 */
router.get(
  '/:jobDescriptionId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobDescriptionId } = req.params;

      if (!jobDescriptionId) {
        throw createError('Job description ID is required', 400);
      }

      const jobDescData = await jobDescriptionModel.getWithRequirements(jobDescriptionId);

      if (!jobDescData) {
        throw createError('Job description not found', 404);
      }

      res.json({
        success: true,
        data: {
          jobDescriptionId: jobDescData.jobDescription.id,
          content: jobDescData.jobDescription.content,
          extractedRequirements: jobDescData.requirements,
          createdAt: jobDescData.jobDescription.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/job-description/:jobDescriptionId
 * Update job description and re-analyze
 */
router.put(
  '/:jobDescriptionId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobDescriptionId } = req.params;
      const { content } = req.body;

      if (!jobDescriptionId) {
        throw createError('Job description ID is required', 400);
      }

      const existingJobDesc = await jobDescriptionModel.findById(jobDescriptionId);

      if (!existingJobDesc) {
        throw createError('Job description not found', 404);
      }

      if (!content || typeof content !== 'string') {
        throw createError('Job description content is required', 400);
      }

      if (content.length > 10000) {
        throw createError('Job description content exceeds maximum length of 10,000 characters', 400);
      }

      if (content.trim().length < 50) {
        throw createError('Job description content is too short (minimum 50 characters)', 400);
      }

      // Re-analyze the updated job description
      const analysisResult = await jobDescriptionAnalysisService.analyzeJobDescription(content);

      // Update job description record
      await jobDescriptionModel.updateById(jobDescriptionId, {
        content: content.trim(),
        extracted_requirements: JSON.stringify(analysisResult),
      });

      const updatedJobDesc = await jobDescriptionModel.findById(jobDescriptionId);

      res.json({
        success: true,
        data: {
          jobDescriptionId: updatedJobDesc?.id,
          contentLength: updatedJobDesc?.content.length,
          extractedRequirements: {
            requiredSkills: analysisResult.requiredSkills,
            preferredSkills: analysisResult.preferredSkills,
            experienceLevel: analysisResult.experienceLevel,
            education: analysisResult.education,
            certifications: analysisResult.certifications,
            keywordCount: analysisResult.keywords.length,
          },
          updatedAt: new Date(),
        },
        message: 'Job description updated and re-analyzed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/job-description/:jobDescriptionId
 * Delete job description
 */
router.delete(
  '/:jobDescriptionId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobDescriptionId } = req.params;

      if (!jobDescriptionId) {
        throw createError('Job description ID is required', 400);
      }

      const jobDescription = await jobDescriptionModel.findById(jobDescriptionId);

      if (!jobDescription) {
        throw createError('Job description not found', 404);
      }

      await jobDescriptionModel.deleteById(jobDescriptionId);

      res.json({
        success: true,
        message: 'Job description deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/job-description/validate
 * Validate job description content without saving
 */
router.post(
  '/validate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        throw createError('Job description content is required', 400);
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Length validation
      if (content.length > 10000) {
        errors.push('Content exceeds maximum length of 10,000 characters');
      }

      if (content.trim().length < 50) {
        errors.push('Content is too short (minimum 50 characters)');
      }

      // Content quality checks
      if (content.trim().length < 200) {
        warnings.push('Short job descriptions may result in less accurate analysis');
      }

      const wordCount = content.trim().split(/\s+/).length;
      if (wordCount < 20) {
        warnings.push('Job description appears to have very few words');
      }

      // Basic structure checks
      const hasRequirements = /requirements?|qualifications?|skills?/i.test(content);
      if (!hasRequirements) {
        warnings.push('Job description may be missing requirements or qualifications section');
      }

      const hasResponsibilities = /responsibilities?|duties?|role|position/i.test(content);
      if (!hasResponsibilities) {
        warnings.push('Job description may be missing responsibilities or role description');
      }

      res.json({
        success: true,
        data: {
          isValid: errors.length === 0,
          errors,
          warnings,
          contentInfo: {
            length: content.length,
            wordCount,
            hasRequirements,
            hasResponsibilities,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;