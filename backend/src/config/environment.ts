import dotenv from 'dotenv';
import Joi from 'joi';
import crypto from 'crypto';

// Generate a secure secret (e.g., for dev; don't use in production)
const jwtSecret = crypto.randomBytes(32).toString('base64');
process.env['JWT_SECRET'] = jwtSecret;  // Or export it
console.log('Generated JWT_SECRET:', jwtSecret);

// Load environment variables
dotenv.config();
console.log('Environment config loaded successfully');

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(5000),
  
  // Database Configuration
  DB_PATH: Joi.string().default('./data/resume_review.db'),
  
  // Redis Configuration
  REDIS_URL: Joi.string().uri().default('redis://localhost:6379'),
  
  // File Upload Configuration
  MAX_FILE_SIZE: Joi.number().positive().default(10485760), // 10MB
  UPLOAD_DIR: Joi.string().default('./uploads'),
  
  // Security
  JWT_SECRET: Joi.string().min(32).required(),
  BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),
  
  // CORS Configuration
  CORS_ORIGIN: Joi.string().uri().default('http://localhost:3000'),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  
  database: {
    path: envVars.DB_PATH,
  },
  
  redis: {
    url: envVars.REDIS_URL,
  },
  
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE,
    uploadDir: envVars.UPLOAD_DIR,
  },
  
  security: {
    jwtSecret: envVars.JWT_SECRET,
    bcryptRounds: envVars.BCRYPT_ROUNDS,
  },
  
  cors: {
    origin: envVars.CORS_ORIGIN,
  },
  
  logging: {
    level: envVars.LOG_LEVEL,
  },
} as const;

export default config;