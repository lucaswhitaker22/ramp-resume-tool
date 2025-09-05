import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resumeModel } from '@/models';
import { cleanupFile, encryptFile } from '@/middleware/upload';
import { createError } from '@/middleware/errorHandler';

export interface FileUploadResult {
  fileId: string;
  resumeId: string;
  originalName: string;
  size: number;
  status: 'uploaded' | 'encrypted';
}

export interface FileProcessingResult {
  resumeId: string;
  content: string;
  metadata: {
    filename: string;
    size: number;
    pages?: number;
    wordCount: number;
  };
}

/**
 * File service for handling resume file operations
 */
export class FileService {
  /**
   * Process uploaded file and store metadata
   */
  async processUploadedFile(fileMetadata: Express.Request['fileMetadata']): Promise<FileUploadResult> {
    if (!fileMetadata) {
      throw createError('No file metadata provided', 400);
    }

    // Verify file exists
    if (!existsSync(fileMetadata.path)) {
      throw createError('Uploaded file not found', 404);
    }

    try {
      // Create resume record in database
      const resumeId = await resumeModel.createResume({
        filename: fileMetadata.originalName,
        fileSize: fileMetadata.size,
        status: 'uploaded',
      });

      // Encrypt file for security
      await encryptFile(fileMetadata.path);

      return {
        fileId: fileMetadata.id,
        resumeId,
        originalName: fileMetadata.originalName,
        size: fileMetadata.size,
        status: 'encrypted',
      };
    } catch (error) {
      // Clean up file if database operation fails
      await cleanupFile(fileMetadata.path);
      throw error;
    }
  }

  /**
   * Extract text content from file
   */
  async extractTextContent(resumeId: string): Promise<FileProcessingResult> {
    const resume = await resumeModel.findById(resumeId);
    
    if (!resume) {
      throw createError('Resume not found', 404);
    }

    if (resume.status !== 'uploaded') {
      throw createError('Resume is not in uploadable state', 400);
    }

    try {
      // Update status to processing
      await resumeModel.updateStatus(resumeId, 'processing');

      // For now, we'll implement a basic text extraction
      // In a real implementation, you'd use libraries like pdf-parse, mammoth, etc.
      const content = await this.performTextExtraction(resume.filename);
      
      // Update resume with extracted content
      await resumeModel.updateContent(resumeId, content);

      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      return {
        resumeId,
        content,
        metadata: {
          filename: resume.filename,
          size: resume.file_size,
          wordCount,
        },
      };
    } catch (error) {
      // Update status to failed
      await resumeModel.updateStatus(resumeId, 'failed');
      throw error;
    }
  }

  /**
   * Get file content for processing
   */
  async getFileContent(resumeId: string): Promise<Buffer> {
    const resume = await resumeModel.findById(resumeId);
    
    if (!resume) {
      throw createError('Resume not found', 404);
    }

    // In a real implementation, you'd decrypt and read the actual file
    // For now, we'll return a placeholder
    return Buffer.from(resume.content_text || 'No content available');
  }

  /**
   * Clean up files associated with a resume
   */
  async cleanupResumeFiles(resumeId: string): Promise<void> {
    const resume = await resumeModel.findById(resumeId);
    
    if (!resume) {
      return; // Resume doesn't exist, nothing to clean up
    }

    // In a real implementation, you'd find and delete the actual file
    // For now, we'll just log the cleanup
    console.log(`🗑️  Cleaning up files for resume ${resumeId}`);
  }

  /**
   * Validate file format and content
   */
  async validateFile(fileMetadata: Express.Request['fileMetadata']): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fileMetadata) {
      errors.push('No file metadata provided');
      return { isValid: false, errors, warnings };
    }

    // Check file size
    if (fileMetadata.size === 0) {
      errors.push('File is empty');
    }

    if (fileMetadata.size > 10 * 1024 * 1024) { // 10MB
      warnings.push('File is quite large, processing may take longer');
    }

    // Check file extension
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    if (!allowedExtensions.includes(fileMetadata.extension)) {
      errors.push(`Unsupported file type: ${fileMetadata.extension}`);
    }

    // Check filename
    if (fileMetadata.originalName.length > 255) {
      errors.push('Filename is too long');
    }

    // Basic content validation (if possible)
    try {
      if (existsSync(fileMetadata.path)) {
        const fileBuffer = await readFile(fileMetadata.path);
        
        // Check for PDF signature
        if (fileMetadata.extension === '.pdf') {
          const pdfSignature = fileBuffer.subarray(0, 4).toString();
          if (pdfSignature !== '%PDF') {
            errors.push('File does not appear to be a valid PDF');
          }
        }

        // Check for minimum content size
        if (fileBuffer.length < 100) {
          warnings.push('File appears to be very small, may not contain sufficient content');
        }
      }
    } catch (error) {
      warnings.push('Could not perform detailed file validation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get file statistics
   */
  async getFileStatistics(): Promise<{
    totalFiles: number;
    totalSize: number;
    averageSize: number;
    fileTypes: Record<string, number>;
  }> {
    const stats = await resumeModel.getStatistics();
    
    // In a real implementation, you'd calculate actual file type distribution
    const fileTypes = {
      '.pdf': Math.floor(stats.total * 0.7),
      '.docx': Math.floor(stats.total * 0.2),
      '.doc': Math.floor(stats.total * 0.08),
      '.txt': Math.floor(stats.total * 0.02),
    };

    return {
      totalFiles: stats.total,
      totalSize: stats.avgFileSize * stats.total,
      averageSize: stats.avgFileSize,
      fileTypes,
    };
  }

  /**
   * Perform text extraction (placeholder implementation)
   */
  private async performTextExtraction(filename: string): Promise<string> {
    // This is a placeholder implementation
    // In a real application, you would use appropriate libraries:
    // - pdf-parse for PDF files
    // - mammoth for DOCX files
    // - textract for DOC files
    // - fs.readFile for TXT files

    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return this.extractFromPDF(filename);
      case 'docx':
        return this.extractFromDOCX(filename);
      case 'doc':
        return this.extractFromDOC(filename);
      case 'txt':
        return this.extractFromTXT(filename);
      default:
        throw createError('Unsupported file format for text extraction', 400);
    }
  }

  private async extractFromPDF(filename: string): Promise<string> {
    // Placeholder for PDF extraction
    return `Extracted text from PDF: ${filename}\n\nJohn Doe\nSoftware Engineer\nExperience with React, Node.js, and TypeScript\n\nEducation: Computer Science Degree\nSkills: JavaScript, Python, SQL`;
  }

  private async extractFromDOCX(filename: string): Promise<string> {
    // Placeholder for DOCX extraction
    return `Extracted text from DOCX: ${filename}\n\nJane Smith\nFull Stack Developer\nExperienced in building web applications\n\nTechnical Skills: React, Vue.js, Express.js\nEducation: Software Engineering Degree`;
  }

  private async extractFromDOC(filename: string): Promise<string> {
    // Placeholder for DOC extraction
    return `Extracted text from DOC: ${filename}\n\nBob Johnson\nBackend Developer\nSpecializes in API development and database design\n\nSkills: Node.js, PostgreSQL, MongoDB\nExperience: 5 years in web development`;
  }

  private async extractFromTXT(filename: string): Promise<string> {
    // Placeholder for TXT extraction
    return `Extracted text from TXT: ${filename}\n\nAlice Brown\nData Scientist\nExpert in machine learning and data analysis\n\nSkills: Python, R, SQL, TensorFlow\nEducation: PhD in Data Science`;
  }
}

export const fileService = new FileService();
export default fileService;