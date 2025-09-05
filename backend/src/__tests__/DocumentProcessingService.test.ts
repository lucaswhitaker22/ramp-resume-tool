import { DocumentProcessingService } from '../services/DocumentProcessingService';
import * as fs from 'fs';
import * as path from 'path';

describe('DocumentProcessingService', () => {
  let service: DocumentProcessingService;
  const testFilesDir = path.join(__dirname, 'test-files');

  beforeAll(() => {
    service = new DocumentProcessingService();
    
    // Create test files directory if it doesn't exist
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
    
    // Create a simple text file for testing
    const testTextContent = `John Doe
Software Engineer
john.doe@email.com
(555) 123-4567

EXPERIENCE
Senior Software Engineer at Tech Corp (2020-2023)
- Developed web applications using React and Node.js
- Led a team of 5 developers
- Improved system performance by 40%

EDUCATION
Bachelor of Science in Computer Science
University of Technology (2016-2020)

SKILLS
JavaScript, TypeScript, React, Node.js, Python, SQL`;
    
    fs.writeFileSync(path.join(testFilesDir, 'test-resume.txt'), testTextContent);
    
    // Create test files with different formats for format detection testing
    fs.writeFileSync(path.join(testFilesDir, 'test-resume.pdf'), 'mock pdf content');
    fs.writeFileSync(path.join(testFilesDir, 'test-resume.doc'), 'mock doc content');
    fs.writeFileSync(path.join(testFilesDir, 'test-resume.docx'), 'mock docx content');
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  describe('extractFromText', () => {
    it('should extract text from a plain text file', async () => {
      const filePath = path.join(testFilesDir, 'test-resume.txt');
      const result = await service.extractFromText(filePath);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content!.rawText).toContain('John Doe');
      expect(result.content!.rawText).toContain('Software Engineer');
      expect(result.content!.metadata.format).toBe('txt');
      expect(result.content!.metadata.fileSize).toBeGreaterThan(0);
    });

    it('should handle non-existent files', async () => {
      const result = await service.extractFromText('/non/existent/file.txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('validateFile', () => {
    it('should validate supported file formats', () => {
      const txtFile = path.join(testFilesDir, 'test-resume.txt');
      const result = service.validateFile(txtFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject unsupported file formats', () => {
      // Create a fake file with unsupported extension
      const unsupportedFile = path.join(testFilesDir, 'test.xyz');
      fs.writeFileSync(unsupportedFile, 'test content');

      const result = service.validateFile(unsupportedFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file format');

      // Clean up
      fs.unlinkSync(unsupportedFile);
    });

    it('should reject files that are too large', () => {
      const txtFile = path.join(testFilesDir, 'test-resume.txt');
      const result = service.validateFile(txtFile, 100); // 100 bytes limit

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should handle non-existent files', () => {
      const result = service.validateFile('/non/existent/file.txt');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('extractText (unified interface)', () => {
    it('should extract text from supported formats', async () => {
      const filePath = path.join(testFilesDir, 'test-resume.txt');
      const result = await service.extractText(filePath);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content!.rawText).toContain('John Doe');
    });

    it('should handle unsupported file formats', async () => {
      const unsupportedFile = path.join(testFilesDir, 'test.xyz');
      fs.writeFileSync(unsupportedFile, 'test content');

      const result = await service.extractText(unsupportedFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format');

      // Clean up
      fs.unlinkSync(unsupportedFile);
    });

    it('should handle non-existent files', async () => {
      const result = await service.extractText('/non/existent/file.txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('format detection and validation', () => {
    it('should detect PDF format correctly', () => {
      const pdfFile = path.join(testFilesDir, 'test-resume.pdf');
      const result = service.validateFile(pdfFile);
      expect(result.valid).toBe(true);
    });

    it('should detect DOC format correctly', () => {
      const docFile = path.join(testFilesDir, 'test-resume.doc');
      const result = service.validateFile(docFile);
      expect(result.valid).toBe(true);
    });

    it('should detect DOCX format correctly', () => {
      const docxFile = path.join(testFilesDir, 'test-resume.docx');
      const result = service.validateFile(docxFile);
      expect(result.valid).toBe(true);
    });

    it('should detect TXT format correctly', () => {
      const txtFile = path.join(testFilesDir, 'test-resume.txt');
      const result = service.validateFile(txtFile);
      expect(result.valid).toBe(true);
    });

    it('should reject unsupported formats', () => {
      const unsupportedFormats = ['.jpg', '.png', '.gif', '.zip', '.exe'];
      
      unsupportedFormats.forEach(ext => {
        const testFile = path.join(testFilesDir, `test${ext}`);
        fs.writeFileSync(testFile, 'test content');
        
        const result = service.validateFile(testFile);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Unsupported file format');
        
        fs.unlinkSync(testFile);
      });
    });
  });

  describe('unified text extraction interface', () => {
    it('should route to correct extraction method based on file extension', async () => {
      const txtFile = path.join(testFilesDir, 'test-resume.txt');
      const result = await service.extractText(txtFile);
      
      expect(result.success).toBe(true);
      expect(result.content!.metadata.format).toBe('txt');
    });

    it('should handle case-insensitive file extensions', async () => {
      const upperCaseFile = path.join(testFilesDir, 'test-resume.TXT');
      fs.copyFileSync(path.join(testFilesDir, 'test-resume.txt'), upperCaseFile);
      
      const result = await service.extractText(upperCaseFile);
      
      expect(result.success).toBe(true);
      expect(result.content!.metadata.format).toBe('txt');
      
      fs.unlinkSync(upperCaseFile);
    });

    it('should provide meaningful error messages for different failure scenarios', async () => {
      // Test non-existent file
      const nonExistentResult = await service.extractText('/path/to/nonexistent.pdf');
      expect(nonExistentResult.success).toBe(false);
      expect(nonExistentResult.error).toContain('File not found');

      // Test unsupported format
      const unsupportedFile = path.join(testFilesDir, 'test.xyz');
      fs.writeFileSync(unsupportedFile, 'content');
      
      const unsupportedResult = await service.extractText(unsupportedFile);
      expect(unsupportedResult.success).toBe(false);
      expect(unsupportedResult.error).toContain('Unsupported file format');
      
      fs.unlinkSync(unsupportedFile);
    });
  });

  describe('cleanAndNormalizeText', () => {
    it('should clean and normalize text properly', async () => {
      // Create a file with messy formatting
      const messyContent = `John    Doe\r\n\r\n\r\n\r\nSoftware   Engineer\n\n\n\n\nEmail:   john@email.com\t\t\t`;
      const messyFile = path.join(testFilesDir, 'messy.txt');
      fs.writeFileSync(messyFile, messyContent);

      const result = await service.extractFromText(messyFile);

      expect(result.success).toBe(true);
      expect(result.content!.rawText).not.toContain('\r');
      expect(result.content!.rawText).not.toMatch(/\s{2,}/); // No multiple spaces
      expect(result.content!.rawText).not.toMatch(/\n{3,}/); // No more than 2 consecutive newlines

      // Clean up
      fs.unlinkSync(messyFile);
    });

    it('should remove special control characters', async () => {
      const contentWithControlChars = `John Doe\x00\x08\x0B\x0C\x0E\x1F\x7F\x9FSoftware Engineer`;
      const testFile = path.join(testFilesDir, 'control-chars.txt');
      fs.writeFileSync(testFile, contentWithControlChars);

      const result = await service.extractFromText(testFile);

      expect(result.success).toBe(true);
      expect(result.content!.rawText).toBe('John Doe Software Engineer');

      fs.unlinkSync(testFile);
    });
  });
});