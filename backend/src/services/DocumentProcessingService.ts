import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractedContent {
  rawText: string;
  metadata: {
    pageCount?: number;
    format: string;
    fileSize: number;
  };
}

export interface ProcessingResult {
  success: boolean;
  content?: ExtractedContent;
  error?: string;
}

export class DocumentProcessingService {
  private readonly supportedFormats = ['.pdf', '.doc', '.docx', '.txt'];
  
  /**
   * Extract text from PDF files with error handling
   */
  async extractFromPDF(filePath: string, password?: string): Promise<ProcessingResult> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const stats = fs.statSync(filePath);
      
      const options: any = {};
      if (password) {
        options.password = password;
      }
      
      const data = await pdfParse(fileBuffer, options);
      
      const cleanedText = this.cleanAndNormalizeText(data.text);
      
      return {
        success: true,
        content: {
          rawText: cleanedText,
          metadata: {
            pageCount: data.numpages,
            format: 'pdf',
            fileSize: stats.size
          }
        }
      };
    } catch (error: any) {
      let errorMessage = 'Failed to extract text from PDF';
      
      if (error.message?.includes('Invalid or corrupted PDF file')) {
        errorMessage = 'The PDF file appears to be corrupted or invalid';
      } else if (error.message?.includes('password')) {
        errorMessage = 'This PDF is password-protected. Please provide the password or use an unprotected version';
      } else if (error.message?.includes('ENOENT')) {
        errorMessage = 'File not found';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Extract text from DOC/DOCX files using mammoth
   */
  async extractFromWord(filePath: string): Promise<ProcessingResult> {
    try {
      const stats = fs.statSync(filePath);
      const result = await mammoth.extractRawText({ path: filePath });
      
      const cleanedText = this.cleanAndNormalizeText(result.value);
      
      return {
        success: true,
        content: {
          rawText: cleanedText,
          metadata: {
            format: path.extname(filePath).toLowerCase().substring(1),
            fileSize: stats.size
          }
        }
      };
    } catch (error: any) {
      let errorMessage = 'Failed to extract text from Word document';
      
      if (error.message?.includes('ENOENT')) {
        errorMessage = 'File not found';
      } else if (error.message?.includes('not a valid')) {
        errorMessage = 'The document format is not supported or the file is corrupted';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Extract text from plain text files
   */
  async extractFromText(filePath: string): Promise<ProcessingResult> {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const cleanedText = this.cleanAndNormalizeText(content);
      
      return {
        success: true,
        content: {
          rawText: cleanedText,
          metadata: {
            format: 'txt',
            fileSize: stats.size
          }
        }
      };
    } catch (error: any) {
      let errorMessage = 'Failed to read text file';
      
      if (error.message?.includes('ENOENT')) {
        errorMessage = 'File not found';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Unified text extraction interface that detects format and processes accordingly
   */
  async extractText(filePath: string, password?: string): Promise<ProcessingResult> {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'File not found'
        };
      }
      
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (!this.supportedFormats.includes(fileExtension)) {
        return {
          success: false,
          error: `Unsupported file format: ${fileExtension}. Supported formats: ${this.supportedFormats.join(', ')}`
        };
      }
      
      switch (fileExtension) {
        case '.pdf':
          return await this.extractFromPDF(filePath, password);
        case '.doc':
        case '.docx':
          return await this.extractFromWord(filePath);
        case '.txt':
          return await this.extractFromText(filePath);
        default:
          return {
            success: false,
            error: `Unsupported file format: ${fileExtension}`
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Unexpected error during text extraction: ${error.message}`
      };
    }
  }
  
  /**
   * Clean and normalize extracted text
   */
  private cleanAndNormalizeText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might interfere with processing
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove multiple consecutive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
  }
  
  /**
   * Validate file format and size
   */
  validateFile(filePath: string, maxSizeBytes: number = 10 * 1024 * 1024): { valid: boolean; error?: string } {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: 'File not found' };
      }
      
      const stats = fs.statSync(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (!this.supportedFormats.includes(fileExtension)) {
        return { 
          valid: false, 
          error: `Unsupported file format: ${fileExtension}. Supported formats: ${this.supportedFormats.join(', ')}` 
        };
      }
      
      if (stats.size > maxSizeBytes) {
        return { 
          valid: false, 
          error: `File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(maxSizeBytes / 1024 / 1024)}MB)` 
        };
      }
      
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `File validation error: ${error.message}` };
    }
  }
}