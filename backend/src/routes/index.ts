import { Router } from 'express';
import uploadRoutes from './upload';
import jobDescriptionRoutes from './jobDescription';
import analysisRoutes from './analysis';
import reportsRoutes from './reports';
import websocketRoutes from './websocket';
import monitoringRoutes from './monitoring';
import feedbackRoutes from './feedback';
import candidatesRoutes from './candidates';

const router = Router();

// Mount route modules
router.use('/upload', uploadRoutes);
router.use('/job-description', jobDescriptionRoutes);
router.use('/analysis', analysisRoutes);
router.use('/reports', reportsRoutes);
router.use('/websocket', websocketRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/candidates', candidatesRoutes);

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
      websocket: '/api/v1/websocket',
      monitoring: '/api/v1/monitoring',
      feedback: '/api/v1/feedback',
      candidates: '/api/v1/candidates',
      health: '/health',
    },
    documentation: 'https://github.com/your-repo/resume-review-tool',
  });
});

export default router;