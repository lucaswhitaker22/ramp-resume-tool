import database from '@/config/database';
import migrationManager from '@/config/migrations';
import { ResumeModel, JobDescriptionModel, AnalysisResultModel } from '@/models';

describe('Database Models', () => {
  let resumeModel: ResumeModel;
  let jobDescriptionModel: JobDescriptionModel;
  let analysisResultModel: AnalysisResultModel;

  beforeAll(async () => {
    // Connect to in-memory database for testing
    await database.connect();
    await database.initialize();
    
    resumeModel = new ResumeModel();
    jobDescriptionModel = new JobDescriptionModel();
    analysisResultModel = new AnalysisResultModel();
  });

  afterAll(async () => {
    await database.disconnect();
  });

  beforeEach(async () => {
    // Clean up tables before each test
    await database.run('DELETE FROM analysis_results');
    await database.run('DELETE FROM job_descriptions');
    await database.run('DELETE FROM resumes');
  });

  describe('ResumeModel', () => {
    it('should create a new resume', async () => {
      const resumeId = await resumeModel.createResume({
        filename: 'test-resume.pdf',
        fileSize: 1024,
        contentText: 'Test resume content',
      });

      expect(resumeId).toBeDefined();
      expect(typeof resumeId).toBe('string');

      const resume = await resumeModel.findById(resumeId);
      expect(resume).toBeDefined();
      expect(resume?.filename).toBe('test-resume.pdf');
      expect(resume?.file_size).toBe(1024);
      expect(resume?.status).toBe('uploaded');
    });

    it('should update resume status', async () => {
      const resumeId = await resumeModel.createResume({
        filename: 'test-resume.pdf',
        fileSize: 1024,
      });

      await resumeModel.updateStatus(resumeId, 'processing');

      const resume = await resumeModel.findById(resumeId);
      expect(resume?.status).toBe('processing');
    });

    it('should find resumes by status', async () => {
      await resumeModel.createResume({
        filename: 'resume1.pdf',
        fileSize: 1024,
        status: 'completed',
      });

      await resumeModel.createResume({
        filename: 'resume2.pdf',
        fileSize: 2048,
        status: 'uploaded',
      });

      const completedResumes = await resumeModel.findByStatus('completed');
      const uploadedResumes = await resumeModel.findByStatus('uploaded');

      expect(completedResumes).toHaveLength(1);
      expect(uploadedResumes).toHaveLength(1);
      expect(completedResumes[0]?.filename).toBe('resume1.pdf');
    });

    it('should get resume statistics', async () => {
      await resumeModel.createResume({
        filename: 'resume1.pdf',
        fileSize: 1000,
        status: 'completed',
      });

      await resumeModel.createResume({
        filename: 'resume2.pdf',
        fileSize: 2000,
        status: 'uploaded',
      });

      const stats = await resumeModel.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.byStatus.uploaded).toBe(1);
      expect(stats.avgFileSize).toBe(1500);
    });
  });

  describe('JobDescriptionModel', () => {
    it('should create a new job description', async () => {
      const jobId = await jobDescriptionModel.createJobDescription({
        content: 'Looking for a software engineer with React experience',
        extractedRequirements: {
          requiredSkills: ['React', 'JavaScript'],
          preferredSkills: ['TypeScript'],
          experienceLevel: '2-5 years',
          education: ['Bachelor\'s degree'],
          certifications: [],
          keywords: ['software', 'engineer', 'React'],
        },
      });

      expect(jobId).toBeDefined();

      const result = await jobDescriptionModel.getWithRequirements(jobId);
      expect(result).toBeDefined();
      expect(result?.jobDescription.content).toContain('React experience');
      expect(result?.requirements?.requiredSkills).toContain('React');
    });

    it('should find similar job descriptions', async () => {
      await jobDescriptionModel.createJobDescription({
        content: 'React developer position with TypeScript',
      });

      await jobDescriptionModel.createJobDescription({
        content: 'Python backend developer role',
      });

      const reactJobs = await jobDescriptionModel.findSimilar('React');
      const pythonJobs = await jobDescriptionModel.findSimilar('Python');

      expect(reactJobs).toHaveLength(1);
      expect(pythonJobs).toHaveLength(1);
      expect(reactJobs[0]?.content).toContain('React');
    });
  });

  describe('AnalysisResultModel', () => {
    it('should create and retrieve analysis result', async () => {
      // Create a resume first
      const resumeId = await resumeModel.createResume({
        filename: 'test-resume.pdf',
        fileSize: 1024,
      });

      // Create analysis result
      const analysisId = await analysisResultModel.createAnalysisResult({
        resumeId,
        overallScore: 85,
        categoryScores: {
          content: 80,
          structure: 90,
          keywords: 85,
          experience: 75,
          skills: 95,
        },
        recommendations: [
          {
            id: '1',
            category: 'content',
            priority: 'high',
            title: 'Improve action verbs',
            description: 'Use stronger action verbs',
            impact: 'High impact on readability',
          },
        ],
        strengths: ['Strong technical skills', 'Good experience'],
        improvementAreas: ['Weak action verbs', 'Missing quantifiable results'],
      });

      expect(analysisId).toBeDefined();

      const analysis = await analysisResultModel.getAnalysisResult(analysisId);
      expect(analysis).toBeDefined();
      expect(analysis?.overallScore).toBe(85);
      expect(analysis?.categoryScores.content).toBe(80);
      expect(analysis?.recommendations).toHaveLength(1);
      expect(analysis?.strengths).toContain('Strong technical skills');
    });

    it('should find analysis by resume ID', async () => {
      const resumeId = await resumeModel.createResume({
        filename: 'test-resume.pdf',
        fileSize: 1024,
      });

      await analysisResultModel.createAnalysisResult({
        resumeId,
        overallScore: 75,
        categoryScores: {
          content: 70,
          structure: 80,
          keywords: 75,
          experience: 70,
          skills: 80,
        },
        recommendations: [],
        strengths: [],
        improvementAreas: [],
      });

      const results = await analysisResultModel.findByResumeId(resumeId);
      expect(results).toHaveLength(1);
      expect(results[0]?.overallScore).toBe(75);
    });

    it('should get latest analysis for resume', async () => {
      const resumeId = await resumeModel.createResume({
        filename: 'test-resume.pdf',
        fileSize: 1024,
      });

      // Create first analysis
      await analysisResultModel.createAnalysisResult({
        resumeId,
        overallScore: 70,
        categoryScores: {
          content: 70,
          structure: 70,
          keywords: 70,
          experience: 70,
          skills: 70,
        },
        recommendations: [],
        strengths: [],
        improvementAreas: [],
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create second analysis
      await analysisResultModel.createAnalysisResult({
        resumeId,
        overallScore: 85,
        categoryScores: {
          content: 85,
          structure: 85,
          keywords: 85,
          experience: 85,
          skills: 85,
        },
        recommendations: [],
        strengths: [],
        improvementAreas: [],
      });

      const latest = await analysisResultModel.getLatestForResume(resumeId);
      expect(latest).toBeDefined();
      expect(latest?.overallScore).toBe(85);
    });
  });

  describe('Migration System', () => {
    it('should track migration status', async () => {
      const status = await migrationManager.getStatus();
      
      expect(status.applied).toBeDefined();
      expect(status.pending).toBeDefined();
      expect(Array.isArray(status.applied)).toBe(true);
      expect(Array.isArray(status.pending)).toBe(true);
    });
  });
});