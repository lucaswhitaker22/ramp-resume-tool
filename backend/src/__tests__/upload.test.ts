import request from 'supertest';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import app from '../index';
import database from '@/config/database';
import { resumeModel } from '@/models';

describe('File Upload API', () => {
  const testFilesDir = join(__dirname, 'test-files');
  const testPdfPath = join(testFilesDir, 'test-resume.pdf');
  const testTxtPath = join(testFilesDir, 'test-resume.txt');
  const testInvalidPath = join(testFilesDir, 'test-invalid.exe');

  beforeAll(async () => {
    // Connect to database
    await database.connect();
    await database.initialize();

    // Create test files directory
    if (!existsSync(testFilesDir)) {
      mkdirSync(testFilesDir, { recursive: true });
    }

    // Create test files
    writeFileSync(testPdfPath, '%PDF-1.4\nTest PDF content for resume upload testing');
    writeFileSync(testTxtPath, 'John Doe\nSoftware Engineer\nExperience with React and Node.js');
    writeFileSync(testInvalidPath, 'This is not a valid resume file');
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

  describe('POST /api/v1/upload', () => {
    it('should upload a valid PDF file', async () => {
      const response = await request(app)
        .post('/api/v1/upload')
        .attach('resume', testPdfPath)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          fileId: expect.any(String),
          resumeId: expect.any(String),
          originalName: 'test-resume.pdf',
          size: expect.any(Number),
          status: 'encrypted',
        },
        message: 'File uploaded successfully',
      });

      // Verify resume was created in database
      const resume = await resumeModel.findById(response.body.data.resumeId);
      expect(resume).toBeDefined();
      expect(resume?.filename).toBe('test-resume.pdf');
      expect(resume?.status).toBe('uploaded');
    });

    it('should upload a valid TXT file', async () => {
      const response = await request(app)
        .post('/api/v1/upload')
        .attach('resume', testTxtPath)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          originalName: 'test-resume.txt',
          status: 'encrypted',
        },
      });
    });

    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/api/v1/upload')
        .attach('resume', testInvalidPath)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('File type not supported');
    });

    it('should reject requests without files', async () => {
      const response = await request(app)
        .post('/api/v1/upload')
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('No file uploaded');
    });

    it('should reject files that are too large', async () => {
      // Create a large test file (simulate file larger than limit)
      const largePath = join(testFilesDir, 'large-file.pdf');
      const largeContent = '%PDF-1.4\n' + 'x'.repeat(15 * 1024 * 1024); // 15MB
      writeFileSync(largePath, largeContent);

      const response = await request(app)
        .post('/api/v1/upload')
        .attach('resume', largePath)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/upload/:resumeId/extract', () => {
    it('should extract text from uploaded resume', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/v1/upload')
        .attach('resume', testPdfPath)
        .expect(201);

      const resumeId = uploadResponse.body.data.resumeId;

      // Then extract text
      const extractResponse = await request(app)
        .post(`/api/v1/upload/${resumeId}/extract`)
        .expect(200);

      expect(extractResponse.body).toMatchObject({
        success: true,
        data: {
          resumeId,
          contentLength: expect.any(Number),
          wordCount: expect.any(Number),
          filename: 'test-resume.pdf',
        },
        message: 'Text extraction completed successfully',
      });

      // Verify resume status was updated
      const resume = await resumeModel.findById(resumeId);
      expect(resume?.status).toBe('completed');
      expect(resume?.content_text).toBeDefined();
    });

    it('should return error for non-existent resume', async () => {
      const response = await request(app)
        .post('/api/v1/upload/non-existent-id/extract')
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Resume not found');
    });
  });

  describe('GET /api/v1/upload/:resumeId/content', () => {
    it('should return extracted content', async () => {
      // Upload and extract
      const uploadResponse = await request(app)
        .post('/api/v1/upload')
        .attach('resume', testTxtPath)
        .expect(201);

      const resumeId = uploadResponse.body.data.resumeId;

      await request(app)
        .post(`/api/v1/upload/${resumeId}/extract`)
        .expect(200);

      // Get content
      const contentResponse = await request(app)
        .get(`/api/v1/upload/${resumeId}/content`)
        .expect(200);

      expect(contentResponse.body).toMatchObject({
        success: true,
        data: {
          resumeId,
          content: expect.any(String),
        },
      });

      expect(contentResponse.body.data.content.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/v1/upload/:resumeId', () => {
    it('should delete resume and files', async () => {
      // Upload a file first
      const uploadResponse = await request(app)
        .post('/api/v1/upload')
        .attach('resume', testPdfPath)
        .expect(201);

      const resumeId = uploadResponse.body.data.resumeId;

      // Delete the resume
      const deleteResponse = await request(app)
        .delete(`/api/v1/upload/${resumeId}`)
        .expect(200);

      expect(deleteResponse.body).toMatchObject({
        success: true,
        message: 'Resume and associated files deleted successfully',
      });
    });
  });

  describe('GET /api/v1/upload/stats', () => {
    it('should return file statistics', async () => {
      // Upload a few files
      await request(app)
        .post('/api/v1/upload')
        .attach('resume', testPdfPath)
        .expect(201);

      await request(app)
        .post('/api/v1/upload')
        .attach('resume', testTxtPath)
        .expect(201);

      const response = await request(app)
        .get('/api/v1/upload/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalFiles: expect.any(Number),
          totalSize: expect.any(Number),
          averageSize: expect.any(Number),
          fileTypes: expect.any(Object),
        },
      });

      expect(response.body.data.totalFiles).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/v1/upload/validate', () => {
    it('should validate file without storing', async () => {
      const response = await request(app)
        .post('/api/v1/upload/validate')
        .attach('resume', testPdfPath)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          isValid: true,
          errors: [],
          warnings: expect.any(Array),
          fileInfo: {
            name: 'test-resume.pdf',
            size: expect.any(Number),
            type: expect.any(String),
          },
        },
      });

      // Verify no resume was created in database
      const resumes = await resumeModel.findAll();
      expect(resumes).toHaveLength(0);
    });

    it('should return validation errors for invalid files', async () => {
      const response = await request(app)
        .post('/api/v1/upload/validate')
        .attach('resume', testInvalidPath)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Security and Error Handling', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/v1/upload/stats')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/upload')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should rate limit requests', async () => {
      // This test would need to be adjusted based on actual rate limiting configuration
      const response = await request(app)
        .get('/api/v1/upload/stats')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });
});