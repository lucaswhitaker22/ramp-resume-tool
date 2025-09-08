import express from 'express';
import { createServer } from 'http';
import config from '@/config/environment';
import { helmet, cors, corsOptions, helmetOptions, rateLimiter } from '@/middleware/security';
import requestId from '@/middleware/requestId';
import requestLogger from '@/middleware/logging';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { initializeWebSocketService } from '@/services/WebSocketService';
import database from '@/config/database';

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

// API routes
import routes from '@/routes';
app.use('/api/v1', routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Connect to database
    await database.connect();
    console.log('📊 Database connected successfully');
    
    // Initialize database with migrations
    await database.initialize();
    console.log('🔄 Database initialized with migrations');
    
    // Create HTTP server and initialize WebSocket
    const httpServer = createServer(app);
    const webSocketService = initializeWebSocketService(httpServer);

    // Start server
    const server = httpServer.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Health check: http://localhost:${config.port}/health`);
      console.log(`🌍 Environment: ${config.env}`);
      console.log(`🔒 CORS origin: ${config.cors.origin}`);
      console.log(`🔌 WebSocket server initialized`);
    });

    // Handle graceful shutdown
    const gracefulShutdown = async () => {
      console.log('Shutting down gracefully...');
      try {
        await webSocketService.close();
        await database.disconnect();
        server.close(() => {
          console.log('Process terminated');
          process.exit(0);
        });
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();



export default app;