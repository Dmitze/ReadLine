import { Context } from 'telegraf';
import { logger } from './logger';

export enum ErrorType {
  DATABASE = 'DATABASE_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  NETWORK = 'NETWORK_ERROR',
  AI = 'AI_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public userMessage?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function asyncHandler<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  errorType: ErrorType = ErrorType.UNKNOWN
): (...args: T) => Promise<R | undefined> {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, errorType);
      return undefined;
    }
  };
}

export function handleError(
  error: unknown,
  type: ErrorType = ErrorType.UNKNOWN,
  context?: Record<string, unknown>
): void {
  const err = error instanceof Error ? error : new Error(String(error));

  logger.error(`[${type}] ${err.message}`, err, context);

  switch (type) {
    case ErrorType.DATABASE:
      break;
    case ErrorType.RATE_LIMIT:
      break;
  }
}

export async function sendErrorToUser(
  ctx: Context,
  error: unknown,
  fallbackMessage: string = '❌ Виникла помилка. Спробуйте пізніше.'
): Promise<void> {
  try {
    let message = fallbackMessage;

    if (error instanceof AppError && error.userMessage) {
      message = error.userMessage;
    }

    await ctx.reply(message);
  } catch (replyError) {
    logger.error(
      'Failed to send error message to user',
      replyError instanceof Error ? replyError : new Error(String(replyError))
    );
  }
}

export function errorMiddleware(
  handler: (ctx: Context) => Promise<void>,
  errorType: ErrorType = ErrorType.UNKNOWN
) {
  return async (ctx: Context): Promise<void> => {
    try {
      await handler(ctx);
    } catch (error) {
      handleError(error, errorType, { userId: ctx.from?.id });
      await sendErrorToUser(ctx, error);
    }
  };
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        logger.warn(`Operation failed, retrying (${attempt}/${maxRetries})`, {
          error: lastError.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  errorType: ErrorType = ErrorType.UNKNOWN
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    handleError(error, errorType);
    logger.info('Using fallback due to primary operation failure');
    return await fallback();
  }
}

export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)),
  ]);
}
