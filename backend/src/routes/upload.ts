import { Router, Request, Response, NextFunction } from 'express';
import { upload, validateUploadedFile } from '@/middleware/upload';
import { fileService } from '@/services/FileService';
import { createError } from '@/middleware/errorHandler';

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

      res.status(201).json({
        success: true,
        data: {
          fileId: result.fileId,
          resumeId: result.resumeId,
          originalName: result.originalName,
          size: result.size,
          status: result.status,
          warnings: validation.warnings,
        },
        message: 'File uploaded successfully',
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

export default router;