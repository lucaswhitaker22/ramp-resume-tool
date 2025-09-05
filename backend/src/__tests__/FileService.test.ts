import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import database from '@/config/database';
import { FileService } from '@/services/FileService';

describe('FileService', () => {
  let fileService: FileService;
  const testFilesDir = join(__dirname, 'test-files');
  const testPdfPath = join(testFilesDir, 'test-resume.pdf');

  beforeAll(async () => {
    await database.connect();
    await database.initialize();
    
    fileService = new FileService();

    // Create test files directory
    if (!existsSync(testFilesDir)) {
      mkdirSync(testFilesDir, { recursive: true });
    }

    // Create upload directory for tests
    const uploadDir = './uploads';
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // Create test file
    writeFileSync(testPdfPath, '%PDF-1.4\nTest PDF content for resume processing');
  });

  afterAll(async () => {
    await database.disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await database.run('DELETE FROM analysis_results');
    await database.run('DELETE FROM job_descriptions');
    await database.run('DELETE FROM resumes');
  });

  describe('processUploadedFile', () => {
    it('should process uploaded file metadata', async () => {
      const fileMetadata = {
        id: 'test-file-id',
        originalName: 'test-resume.pdf',
        filename: 'unique-filename.pdf',
        path: testPdfPath,
        size: 1024,
        mimetype: 'application/pdf',
        extension: '.pdf',
        uploadedAt: new Date(),
      };

      const result = await fileService.processUploadedFile(fileMetadata);

      expect(result).toMatchObject({
        fileId: 'test-file-id',
        resumeId: expect.any(String),
        originalName: 'test-resume.pdf',
        size: 1024,
        status: 'encrypted',
      });
    });

    it('should throw error for missing file metadata', async () => {
      await expect(fileService.processUploadedFile(undefined)).rejects.toThrow('No file metadata provided');
    });
  });

  describe('validateFile', () => {
    it('should validate a valid PDF file', async () => {
      const fileMetadata = {
        id: 'test-file-id',
        originalName: 'test-resume.pdf',
        filename: 'unique-filename.pdf',
        path: testPdfPath,
        size: 1024,
        mimetype: 'application/pdf',
        extension: '.pdf',
        uploadedAt: new Date(),
      };

      const validation = await fileService.validateFile(fileMetadata);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty files', async () => {
      const fileMetadata = {
        id: 'test-file-id',
        originalName: 'empty-file.pdf',
        filename: 'empty.pdf',
        path: testPdfPath,
        size: 0,
        mimetype: 'application/pdf',
        extension: '.pdf',
        uploadedAt: new Date(),
      };

      const validation = await fileService.validateFile(fileMetadata);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('File is empty');
    });

    it('should reject unsupported file types', async () => {
      const fileMetadata = {
        id: 'test-file-id',
        originalName: 'malicious.exe',
        filename: 'malicious.exe',
        path: testPdfPath,
        size: 1024,
        mimetype: 'application/octet-stream',
        extension: '.exe',
        uploadedAt: new Date(),
      };

      const validation = await fileService.validateFile(fileMetadata);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unsupported file type: .exe');
    });

    it('should warn about large files', async () => {
      const fileMetadata = {
        id: 'test-file-id',
        originalName: 'large-resume.pdf',
        filename: 'large.pdf',
        path: testPdfPath,
        size: 15 * 1024 * 1024, // 15MB
        mimetype: 'application/pdf',
        extension: '.pdf',
        uploadedAt: new Date(),
      };

      const validation = await fileService.validateFile(fileMetadata);

      expect(validation.warnings).toContain('File is quite large, processing may take longer');
    });
  });

  describe('extractTextContent', () => {
    it('should extract text from PDF files', async () => {
      // First create a resume record
      const fileMetadata = {
        id: 'test-file-id',
        originalName: 'test-resume.pdf',
        filename: 'unique-filename.pdf',
        path: testPdfPath,
        size: 1024,
        mimetype: 'application/pdf',
        extension: '.pdf',
        uploadedAt: new Date(),
      };

      const uploadResult = await fileService.processUploadedFile(fileMetadata);
      
      // Extract text content
      const extractResult = await fileService.extractTextContent(uploadResult.resumeId);

      expect(extractResult).toMatchObject({
        resumeId: uploadResult.resumeId,
        content: expect.any(String),
        metadata: {
          filename: 'test-resume.pdf',
          size: 1024,
          wordCount: expect.any(Number),
        },
      });

      expect(extractResult.content.length).toBeGreaterThan(0);
      expect(extractResult.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should handle different file formats', async () => {
      const formats = [
        { extension: '.pdf', mimetype: 'application/pdf' },
        { extension: '.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { extension: '.doc', mimetype: 'application/msword' },
        { extension: '.txt', mimetype: 'text/plain' },
      ];

      for (const format of formats) {
        const fileMetadata = {
          id: `test-file-${format.extension}`,
          originalName: `test-resume${format.extension}`,
          filename: `unique-filename${format.extension}`,
          path: testPdfPath, // Using same path for simplicity
          size: 1024,
          mimetype: format.mimetype,
          extension: format.extension,
          uploadedAt: new Date(),
        };

        const uploadResult = await fileService.processUploadedFile(fileMetadata);
        const extractResult = await fileService.extractTextContent(uploadResult.resumeId);

        expect(extractResult.content).toContain('Extracted text from');
        expect(extractResult.content).toContain(format.extension.toUpperCase());
      }
    });
  });

  describe('getFileStatistics', () => {
    it('should return file statistics', async () => {
      // Create a few test resumes
      const fileMetadata1 = {
        id: 'test-file-1',
        originalName: 'resume1.pdf',
        filename: 'file1.pdf',
        path: testPdfPath,
        size: 1000,
        mimetype: 'application/pdf',
        extension: '.pdf',
        uploadedAt: new Date(),
      };

      const fileMetadata2 = {
        id: 'test-file-2',
        originalName: 'resume2.docx',
        filename: 'file2.docx',
        path: testPdfPath,
        size: 2000,
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: '.docx',
        uploadedAt: new Date(),
      };

      await fileService.processUploadedFile(fileMetadata1);
      await fileService.processUploadedFile(fileMetadata2);

      const stats = await fileService.getFileStatistics();

      expect(stats).toMatchObject({
        totalFiles: 2,
        totalSize: expect.any(Number),
        averageSize: expect.any(Number),
        fileTypes: expect.any(Object),
      });

      expect(stats.totalFiles).toBe(2);
      expect(stats.fileTypes['.pdf']).toBeGreaterThanOrEqual(0);
      expect(stats.fileTypes['.docx']).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent resume IDs', async () => {
      await expect(fileService.extractTextContent('non-existent-id')).rejects.toThrow('Resume not found');
    });

    it('should handle file processing errors gracefully', async () => {
      const fileMetadata = {
        id: 'test-file-id',
        originalName: 'test-resume.pdf',
        filename: 'unique-filename.pdf',
        path: '/non/existent/path.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        extension: '.pdf',
        uploadedAt: new Date(),
      };

      await expect(fileService.processUploadedFile(fileMetadata)).rejects.toThrow('Uploaded file not found');
    });
  });
});