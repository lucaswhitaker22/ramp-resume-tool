import { Router, Request, Response, NextFunction } from 'express';
import { upload, validateUploadedFile } from '@/middleware/upload';
import { fileService } from '@/services/FileService';
import { candidateService } from '@/services/CandidateService';
import { createError } from '@/middleware/errorHandler';
import { notificationService } from '@/services/NotificationService';

const router = Router();

/**
 * POST /api/v1/upload
 * Upload a resume file
 */
router.post(
  '/',
  upload.single('resume'),
  validateUploadedFile,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.fileMetadata) {
        throw createError('File upload failed', 400);
      }

      // Validate the uploaded file
      const validation = await fileService.validateFile(req.fileMetadata);
      
      if (!validation.isValid) {
        throw createError(`File validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Process the uploaded file
      const result = await fileService.processUploadedFile(req.fileMetadata);

      // Extract text content immediately
      const extractionResult = await fileService.extractTextContent(result.resumeId);

      // Process as candidate and start analysis
      const jobDescriptionId = req.body.jobDescriptionId; // Optional job description ID
      const candidateResult = await candidateService.processNewCandidate(result.resumeId, {
        jobDescriptionId,
        autoAnalyze: true,
      });

      // Send success notification
      notificationService.sendFileUploadFeedback(
        result.resumeId,
        true,
        result.originalName
      );

      res.status(201).json({
        success: true,
        data: {
          fileId: result.fileId,
          resumeId: result.resumeId,
          candidateId: candidateResult.candidateId,
          analysisId: candidateResult.analysisId,
          originalName: result.originalName,
          size: result.size,
          status: candidateResult.status,
          warnings: validation.warnings,
          contentLength: extractionResult.content.length,
          wordCount: extractionResult.metadata.wordCount,
        },
        message: 'File uploaded and analysis started successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/upload/:resumeId/extract
 * Extract text content from uploaded resume
 */
router.post(
  '/:resumeId/extract',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resumeId } = req.params;

      if (!resumeId) {
        throw createError('Resume ID is required', 400);
      }

      const result = await fileService.extractTextContent(resumeId);

      res.json({
        success: true,
        data: {
          resumeId: result.resumeId,
          contentLength: result.content.length,
          wordCount: result.metadata.wordCount,
          filename: result.metadata.filename,
          size: result.metadata.size,
        },
        message: 'Text extraction completed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/upload/:resumeId/content
 * Get extracted content for a resume
 */
router.get(
  '/:resumeId/content',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resumeId } = req.params;

      if (!resumeId) {
        throw createError('Resume ID is required', 400);
      }

      const content = await fileService.getFileContent(resumeId);

      res.json({
        success: true,
        data: {
          resumeId,
          content: content.toString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/upload/:resumeId
 * Delete uploaded resume and associated files
 */
router.delete(
  '/:resumeId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resumeId } = req.params;

      if (!resumeId) {
        throw createError('Resume ID is required', 400);
      }

      await fileService.cleanupResumeFiles(resumeId);

      res.json({
        success: true,
        message: 'Resume and associated files deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/upload/stats
 * Get file upload statistics
 */
router.get(
  '/stats',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await fileService.getFileStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/upload/validate
 * Validate file without uploading (for client-side validation)
 */
router.post(
  '/validate',
  upload.single('resume'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw createError('No file provided for validation', 400);
      }

      // Create temporary file metadata
      const tempMetadata = {
        id: 'temp',
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        extension: req.file.originalname.split('.').pop()?.toLowerCase() || '',
        uploadedAt: new Date(),
      };

      const validation = await fileService.validateFile(tempMetadata);

      // Clean up temporary file
      const { cleanupFile } = await import('@/middleware/upload');
      await cleanupFile(req.file.path);

      res.json({
        success: true,
        data: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          fileInfo: {
            name: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/upload/batch
 * Upload multiple resume files in batch
 */
router.post(
  '/batch',
  upload.array('resumes', 10), // Allow up to 10 files
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        throw createError('No files provided for batch upload', 400);
      }

      const results = [];
      const errors = [];

      // Process each file
      for (const file of files) {
        try {
          // Create file metadata
          const fileMetadata = {
            id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            extension: file.originalname.split('.').pop()?.toLowerCase() || '',
            uploadedAt: new Date(),
          };

          // Validate the file
          const validation = await fileService.validateFile(fileMetadata);
          
          if (!validation.isValid) {
            errors.push({
              filename: file.originalname,
              errors: validation.errors,
              warnings: validation.warnings,
            });
            continue;
          }

          // Process the file
          const result = await fileService.processUploadedFile(fileMetadata);

          // Extract text content
          const extractionResult = await fileService.extractTextContent(result.resumeId);

          // Process as candidate
          const candidateResult = await candidateService.processNewCandidate(result.resumeId, {
            autoAnalyze: true,
          });
          
          results.push({
            fileId: result.fileId,
            resumeId: result.resumeId,
            candidateId: candidateResult.candidateId,
            analysisId: candidateResult.analysisId,
            originalName: result.originalName,
            size: result.size,
            status: candidateResult.status,
            warnings: validation.warnings,
            contentLength: extractionResult.content.length,
            wordCount: extractionResult.metadata.wordCount,
          });

          // Send success notification
          notificationService.sendFileUploadFeedback(
            result.resumeId,
            true,
            result.originalName
          );

        } catch (fileError) {
          errors.push({
            filename: file.originalname,
            errors: [fileError instanceof Error ? fileError.message : 'Unknown error'],
            warnings: [],
          });
        }
      }

      const response = {
        success: results.length > 0,
        data: {
          successful: results,
          failed: errors,
          summary: {
            total: files.length,
            successful: results.length,
            failed: errors.length,
          },
        },
        message: `Batch upload completed: ${results.length} successful, ${errors.length} failed`,
      };

      // Return 207 Multi-Status if there are both successes and failures
      const statusCode = errors.length > 0 && results.length > 0 ? 207 : 
                        results.length > 0 ? 201 : 400;

      res.status(statusCode).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;