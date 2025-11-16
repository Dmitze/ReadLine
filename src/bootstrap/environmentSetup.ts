import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { validateEnv } from '../config/envSchema';
import { LIMITS } from '../constants';

dotenv.config();

export function setupEnvironment() {
  const env = validateEnv();
  logger.info('Environment validation passed', { nodeEnv: env.NODE_ENV });

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.BOT_TOKEN) {
    errors.push('BOT_TOKEN is required');
  } else if (process.env.BOT_TOKEN.length < LIMITS.BOT_TOKEN_MIN) {
    errors.push('BOT_TOKEN appears to be invalid (too short)');
  }

  if (!process.env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY is not set - AI features will be disabled');
  } else if (process.env.GEMINI_API_KEY.length < LIMITS.API_KEY_MIN) {
    warnings.push('GEMINI_API_KEY appears to be invalid (too short) - AI features may not work');
  }

  if (errors.length > 0) {
    logger.error(
      'Environment validation failed - Critical configuration errors',
      new Error(errors.join(', '))
    );
    logger.error(
      'Configuration required',
      new Error('Create .env file with: BOT_TOKEN, GEMINI_API_KEY (optional)')
    );
    process.exit(1);
  }

  if (warnings.length > 0) {
    logger.warn('Environment validation warnings', { warnings });
  }

  logger.info('Environment variables validated successfully');
  return env;
}
