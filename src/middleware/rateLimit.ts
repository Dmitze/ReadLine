import { Context, Middleware } from 'telegraf';
import { logger } from '../utils/logger';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private records: Map<number, RateLimitRecord> = new Map();
  private maxRequests: number;
  private windowMs: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(maxRequests: number = 20, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    this.cleanupTimer = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  check(userId: number): boolean {
    const now = Date.now();
    const record = this.records.get(userId);

    if (!record || now > record.resetAt) {
      this.records.set(userId, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxRequests) {
      logger.warn('Rate limit exceeded', {
        userId,
        count: record.count,
        limit: this.maxRequests,
      });
      return false;
    }

    this.records.set(userId, {
      count: record.count + 1,
      resetAt: record.resetAt,
    });

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: number[] = [];

    this.records.forEach((record, userId) => {
      if (now > record.resetAt) {
        toDelete.push(userId);
      }
    });

    toDelete.forEach((userId) => this.records.delete(userId));

    if (toDelete.length > 0) {
      logger.debug('Rate limit cleanup', { removed: toDelete.length });
    }
  }

  reset(userId: number): void {
    this.records.delete(userId);
    logger.debug('Rate limit reset', { userId });
  }

  getStats() {
    return {
      totalUsers: this.records.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.records.clear();
  }
}

const RATE_LIMITS = {
  MESSAGE_MAX: 60,
  MESSAGE_WINDOW: 60000,
  COMMAND_MAX: 30,
  COMMAND_WINDOW: 60000,
  CALLBACK_MAX: 90,
  CALLBACK_WINDOW: 60000,
} as const;

export const messageLimiter = new RateLimiter(RATE_LIMITS.MESSAGE_MAX, RATE_LIMITS.MESSAGE_WINDOW);
export const commandLimiter = new RateLimiter(RATE_LIMITS.COMMAND_MAX, RATE_LIMITS.COMMAND_WINDOW);
export const callbackLimiter = new RateLimiter(
  RATE_LIMITS.CALLBACK_MAX,
  RATE_LIMITS.CALLBACK_WINDOW
);

export function cleanupRateLimiters(): void {
  messageLimiter.destroy();
  commandLimiter.destroy();
  callbackLimiter.destroy();
}

export const rateLimitMessage: Middleware<Context> = async (ctx, next) => {
  const userId = ctx.from?.id;

  if (!userId) {
    return next();
  }

  if (!messageLimiter.check(userId)) {
    const { ERRORS } = await import('../constants');
    await ctx.reply(
      `${ERRORS.RATE_LIMIT}\n\n` +
        'Будь ласка, зачекайте хвилину перед наступним повідомленням.\n\n' +
        '💡 Це захист від спаму.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  return next();
};

export const rateLimitCommand: Middleware<Context> = async (ctx, next) => {
  const userId = ctx.from?.id;

  if (!userId) {
    return next();
  }

  if (!commandLimiter.check(userId)) {
    const { ERRORS } = await import('../constants');
    await ctx.reply(
      `${ERRORS.RATE_LIMIT}\n\n` +
        'Будь ласка, зачекайте хвилину.\n\n' +
        `💡 Ліміт: ${RATE_LIMITS.COMMAND_MAX} команд на хвилину.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  return next();
};

export const rateLimitCallback: Middleware<Context> = async (ctx, next) => {
  const userId = ctx.from?.id;

  if (!userId) {
    return next();
  }

  if (!callbackLimiter.check(userId)) {
    const { ERRORS } = await import('../constants');
    await ctx.answerCbQuery(`${ERRORS.RATE_LIMIT} Зачекайте хвилину.`, { show_alert: true });
    return;
  }

  return next();
};
