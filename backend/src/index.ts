import express from 'express';
import config from '@/config/environment';
import { helmet, cors, corsOptions, helmetOptions, rateLimiter } from '@/middleware/security';
import requestId from '@/middleware/requestId';
import requestLogger from '@/middleware/logging';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));

// Request tracking
app.use(requestId);

// Logging middleware
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Body parsing middleware
app.use(express.json({ 
  limit: `${config.upload.maxFileSize}b`,
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: `${config.upload.maxFileSize}b`
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: process.env['npm_package_version'] || '1.0.0',
    requestId: req.headers['x-request-id'],
  });
});

// API info endpoint
app.get('/api', (_req, res) => {
  res.json({ 
    message: 'Resume Review Tool API',
    version: '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// API routes will be added here
// app.use('/api/v1', routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handling
const server = app.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📊 Health check: http://localhost:${config.port}/health`);
  console.log(`🌍 Environment: ${config.env}`);
  console.log(`🔒 CORS origin: ${config.cors.origin}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;