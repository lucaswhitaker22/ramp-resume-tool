import { Router } from 'express';
import uploadRoutes from './upload';

const router = Router();

// Mount route modules
router.use('/upload', uploadRoutes);

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    message: 'Resume Review Tool API v1',
    version: '1.0.0',
    endpoints: {
      upload: '/api/v1/upload',
      health: '/health',
    },
    documentation: 'https://github.com/your-repo/resume-review-tool',
  });
});

export default router;