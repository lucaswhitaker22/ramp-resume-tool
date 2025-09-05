import { Router } from 'express';
import uploadRoutes from './upload';
import jobDescriptionRoutes from './jobDescription';
import analysisRoutes from './analysis';
import reportsRoutes from './reports';

const router = Router();

// Mount route modules
router.use('/upload', uploadRoutes);
router.use('/job-description', jobDescriptionRoutes);
router.use('/analysis', analysisRoutes);
router.use('/reports', reportsRoutes);

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    message: 'Resume Review Tool API v1',
    version: '1.0.0',
    endpoints: {
      upload: '/api/v1/upload',
      jobDescription: '/api/v1/job-description',
      analysis: '/api/v1/analysis',
      reports: '/api/v1/reports',
      health: '/health',
    },
    documentation: 'https://github.com/your-repo/resume-review-tool',
  });
});

export default router;