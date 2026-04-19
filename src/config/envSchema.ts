import { z } from 'zod';

export const envSchema = z.object({
  BOT_TOKEN: z.string().min(20, 'BOT_TOKEN must be at least 20 characters'),
  ADMIN_ID: z
    .string()
    .regex(
      /^\d+(\s*,\s*\d+)*$/,
      'ADMIN_ID must be numeric IDs separated by commas (e.g., "123456789" or "123456789, 987654321"'
    ),

  DB_PATH: z.string().default('./database/library.db'),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  AI_PROVIDER: z.enum(['gemini', 'openai', 'groq']).default('gemini'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z
    .string()
    .regex(/^\d+$/, 'REDIS_PORT must be numeric')
    .default('6379')
    .transform(Number),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  PORT: z.string().regex(/^\d+$/, 'PORT must be numeric').default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

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

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}
