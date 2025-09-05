import multer from 'multer';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import config from '@/config/environment';
import { createError } from './errorHandler';

// Ensure upload directory exists
const uploadDir = config.upload.uploadDir;
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream', // Some browsers send this for .docx
  ],
  '.txt': ['text/plain'],
} as const;

const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_FILE_TYPES);
// const ALLOWED_MIME_TYPES = Object.values(ALLOWED_FILE_TYPES).flat();

/**
 * File filter function for multer
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  const fileExtension = extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  // Check file extension
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    const error = createError(
      `File type not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      400
    );
    return cb(error);
  }

  // Check MIME type
  const allowedMimeTypes = ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES];
  if (!allowedMimeTypes.some(allowedType => allowedType === mimeType)) {
    const error = createError(
      `Invalid file format. Expected ${allowedMimeTypes.join(' or ')} for ${fileExtension} files`,
      400
    );
    return cb(error);
  }

  cb(null, true);
};

/**
 * Storage configuration for multer
 */
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename with original extension
    const fileExtension = extname(file.originalname);
    const uniqueName = `${randomUUID()}${fileExtension}`;
    cb(null, uniqueName);
  },
});

/**
 * Multer configuration
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize, // Max file size from config
    files: 1, // Only allow single file upload
    fields: 10, // Limit number of fields
    fieldNameSize: 100, // Limit field name size
    fieldSize: 1024 * 1024, // 1MB limit for field values
  },
});

/**
 * File validation middleware (additional security checks)
 */
export const validateUploadedFile = (req: Request, _res: any, next: any): void => {
  if (!req.file) {
    return next(createError('No file uploaded', 400));
  }

  const file = req.file;

  // Additional file size check
  if (file.size > config.upload.maxFileSize) {
    return next(createError(
      `File too large. Maximum size is ${Math.round(config.upload.maxFileSize / 1024 / 1024)}MB`,
      400
    ));
  }

  // Check if file actually exists on disk
  if (!existsSync(file.path)) {
    return next(createError('File upload failed', 500));
  }

  // Add file metadata to request
  req.fileMetadata = {
    id: randomUUID(),
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    extension: extname(file.originalname).toLowerCase(),
    uploadedAt: new Date(),
  };

  next();
};

/**
 * File cleanup utility
 */
export const cleanupFile = async (filePath: string): Promise<void> => {
  try {
    const { unlink } = await import('fs/promises');
    if (existsSync(filePath)) {
      await unlink(filePath);
      console.log(`🗑️  Cleaned up file: ${filePath}`);
    }
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
};

/**
 * Scheduled cleanup for old files (older than 24 hours)
 */
export const cleanupOldFiles = async (): Promise<void> => {
  try {
    const { readdir, stat } = await import('fs/promises');
    const files = await readdir(uploadDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    let cleanedCount = 0;

    for (const file of files) {
      const filePath = join(uploadDir, file);
      try {
        const stats = await stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAge) {
          await cleanupFile(filePath);
          cleanedCount++;
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old files`);
    }
  } catch (error) {
    console.error('Error during file cleanup:', error);
  }
};

/**
 * Get file info utility
 */
export const getFileInfo = (file: Express.Multer.File) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    extension: extname(file.originalname).toLowerCase(),
    path: file.path,
  };
};

/**
 * File encryption utilities (basic implementation)
 */
export const encryptFile = async (filePath: string): Promise<string> => {
  // For now, we'll implement a simple file renaming as "encryption"
  // In production, you'd want to use proper encryption libraries
  const encryptedPath = `${filePath}.encrypted`;
  
  try {
    const { rename } = await import('fs/promises');
    await rename(filePath, encryptedPath);
    return encryptedPath;
  } catch (error) {
    console.error('Error encrypting file:', error);
    throw createError('File encryption failed', 500);
  }
};

export const decryptFile = async (encryptedPath: string): Promise<string> => {
  // Reverse of the encryption process
  const originalPath = encryptedPath.replace('.encrypted', '');
  
  try {
    const { rename } = await import('fs/promises');
    await rename(encryptedPath, originalPath);
    return originalPath;
  } catch (error) {
    console.error('Error decrypting file:', error);
    throw createError('File decryption failed', 500);
  }
};

// Start cleanup scheduler (runs every hour)
if (config.env !== 'test') {
  setInterval(cleanupOldFiles, 60 * 60 * 1000); // 1 hour
  console.log('📅 File cleanup scheduler started (runs every hour)');
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      fileMetadata?: {
        id: string;
        originalName: string;
        filename: string;
        path: string;
        size: number;
        mimetype: string;
        extension: string;
        uploadedAt: Date;
      };
    }
  }
}