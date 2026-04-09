import { z } from 'zod';

/**
 * Environment Variables Validation Schema
 * Provides type-safe access to environment variables with validation
 */
export const envSchema = z.object({
  // Required - Bot Configuration
  BOT_TOKEN: z.string().min(20, 'BOT_TOKEN must be at least 20 characters'),
  ADMIN_ID: z.string().regex(/^\d+(\s*,\s*\d+)*$/, 'ADMIN_ID must be numeric IDs separated by commas (e.g., "123456789" or "123456789, 987654321"'),

  // Database
  DB_PATH: z.string().default('./database/library.db'),

  // Optional - AI Configuration
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  AI_PROVIDER: z.enum(['gemini', 'openai', 'groq']).default('gemini'),

  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z
    .string()
    .regex(/^\d+$/, 'REDIS_PORT must be numeric')
    .default('6379')
    .transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Server
  PORT: z.string().regex(/^\d+$/, 'PORT must be numeric').default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and parses environment variables
 * @throws {ZodError} if validation fails
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment configuration. Please check your .env file.');
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 * Safe to use after calling validateEnv() at app startup
 * Note: Call validateEnv() after dotenv.config() to ensure .env is loaded
 */
let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}
