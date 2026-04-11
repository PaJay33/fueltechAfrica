import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // Wave Payment
  WAVE_API_URL: z.string().url(),
  WAVE_API_KEY: z.string().min(1, 'WAVE_API_KEY is required'),
  WAVE_API_SECRET: z.string().min(1, 'WAVE_API_SECRET is required'),
  WAVE_MERCHANT_ID: z.string().min(1, 'WAVE_MERCHANT_ID is required'),
  WAVE_WEBHOOK_SECRET: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Pagination
  DEFAULT_PAGE_SIZE: z.string().transform(Number).default('20'),
  MAX_PAGE_SIZE: z.string().transform(Number).default('100'),

  // IoT Simulator
  IOT_SIMULATOR_ENABLED: z.string().transform((val) => val === 'true').default('true'),
  IOT_SIMULATOR_INTERVAL: z.string().transform(Number).default('5000'),
});

// Validate and parse environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      console.error('❌ Invalid environment variables:');
      console.error(missingVars.join('\n'));
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();

// Type for environment variables
export type Env = z.infer<typeof envSchema>;
