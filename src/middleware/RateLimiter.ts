/**
 * Rate Limiting Middleware
 * REFACTOR-013: Protection from DDoS, brute-force, and abuse
 */

import { Context } from 'telegraf';
import { BotContext } from '../types/telegraf';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (ctx: BotContext) => string;
}

export interface RateLimitStore {
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  get(key: string): Promise<number | null>;
  reset(key: string): Promise<void>;
  resetAll(): Promise<void>;
}

/**
 * In-memory rate limit store
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async incr(key: string): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      this.store.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute default
      return 1;
    }

    entry.count++;
    return entry.count;
  }

  async decr(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;

    entry.count = Math.max(0, entry.count - 1);
    return entry.count;
  }

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.resetTime) {
      this.store.delete(key);
      return null;
    }

    return entry.count;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async resetAll(): Promise<void> {
    this.store.clear();
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Rate limiter statistics
 */
export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  activeKeys: number;
  lastCleanup: Date;
}

/**
 * Rate limiter with multiple strategies
 */
export class RateLimiter {
  private store: RateLimitStore;
  private config: Required<RateLimitConfig>;
  private stats: RateLimitStats;

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    this.config = {
      windowMs: config.windowMs || 60000,
      maxRequests: config.maxRequests || 30,
      skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
      skipFailedRequests: config.skipFailedRequests ?? false,
      keyGenerator: config.keyGenerator || defaultKeyGenerator
    };

    this.store = store || new MemoryRateLimitStore();

    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      activeKeys: 0,
      lastCleanup: new Date()
    };

    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), this.config.windowMs);
  }

  /**
   * Check if request is allowed
   */
  async check(ctx: BotContext): Promise<{ allowed: boolean; remaining: number }> {
    const key = this.config.keyGenerator(ctx);
    const count = (await this.store.get(key)) || 0;

    this.stats.totalRequests++;

    if (count >= this.config.maxRequests) {
      this.stats.blockedRequests++;
      return { allowed: false, remaining: 0 };
    }

    await this.store.incr(key);
    return { allowed: true, remaining: this.config.maxRequests - count - 1 };
  }

  /**
   * Middleware for Telegraf
   */
  middleware() {
    return async (ctx: BotContext, next: () => Promise<void>) => {
      const { allowed, remaining } = await this.check(ctx);

      // Add rate limit info to context
      (ctx as any).rateLimit = { allowed, remaining };

      if (!allowed) {
        await ctx.reply(
          '⚠️ Занадто багато запитів. Спробуйте пізніше.',
          { parse_mode: 'HTML' as const }
        );
        return;
      }

      try {
        await next();
      } catch (error) {
        if (!this.config.skipFailedRequests) {
          // Count failed request in rate limit
        }
        throw error;
      }
    };
  }

  /**
   * Get current statistics
   */
  getStats(): RateLimitStats {
    return { ...this.stats };
  }

  /**
   * Reset all limits
   */
  async reset(): Promise<void> {
    await this.store.resetAll();
    this.stats.blockedRequests = 0;
    this.stats.totalRequests = 0;
  }

  /**
   * Manually add request to limit
   */
  async addRequest(ctx: BotContext): Promise<void> {
    const key = this.config.keyGenerator(ctx);
    await this.store.incr(key);
  }

  /**
   * Cleanup expired entries
   */
  private async cleanup(): Promise<void> {
    if (this.store instanceof MemoryRateLimitStore) {
      await (this.store as MemoryRateLimitStore).cleanup();
      this.stats.lastCleanup = new Date();
    }
  }
}

/**
 * Default key generator - uses user Telegram ID
 */
function defaultKeyGenerator(ctx: BotContext): string {
  return `user:${ctx.from?.id || 'unknown'}`;
}

/**
 * Strategy-based rate limiters
 */

/**
 * Per-user rate limiter
 * Limits requests per user
 */
export class PerUserRateLimiter extends RateLimiter {
  constructor(windowMs: number = 60000, maxRequests: number = 30) {
    super({
      windowMs,
      maxRequests,
      keyGenerator: (ctx) => `user:${ctx.from?.id || 'unknown'}`
    });
  }
}

/**
 * Per-command rate limiter
 * Limits specific command usage
 */
export class PerCommandRateLimiter extends RateLimiter {
  private command: string;

  constructor(command: string, windowMs: number = 60000, maxRequests: number = 10) {
    super(
      {
        windowMs,
        maxRequests,
        keyGenerator: (ctx) =>
          `cmd:${command}:${ctx.from?.id || 'unknown'}`
      },
      new MemoryRateLimitStore()
    );
    this.command = command;
  }
}

/**
 * Per-IP rate limiter (for future HTTP API use)
 */
export class PerIPRateLimiter extends RateLimiter {
  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    super({
      windowMs,
      maxRequests,
      keyGenerator: (ctx) => {
        // Extract IP from context if available
        const ip = (ctx as any).ip || 'unknown';
        return `ip:${ip}`;
      }
    });
  }
}

/**
 * Global rate limiter
 * Limits total requests across all users
 */
export class GlobalRateLimiter extends RateLimiter {
  constructor(windowMs: number = 60000, maxRequests: number = 1000) {
    super({
      windowMs,
      maxRequests,
      keyGenerator: () => 'global'
    });
  }
}

/**
 * Composite rate limiter
 * Applies multiple rate limiters
 */
export class CompositeRateLimiter {
  private limiters: RateLimiter[];

  constructor(...limiters: RateLimiter[]) {
    this.limiters = limiters;
  }

  /**
   * Check all limiters
   */
  async check(ctx: BotContext): Promise<{ allowed: boolean; remaining: number }> {
    const results = await Promise.all(
      this.limiters.map(limiter => limiter.check(ctx))
    );

    const blocked = results.some(r => !r.allowed);
    const remaining = Math.min(...results.map(r => r.remaining));

    return {
      allowed: !blocked,
      remaining: Math.max(0, remaining)
    };
  }

  /**
   * Middleware for Telegraf
   */
  middleware() {
    return async (ctx: BotContext, next: () => Promise<void>) => {
      const { allowed, remaining } = await this.check(ctx);

      (ctx as any).rateLimit = { allowed, remaining };

      if (!allowed) {
        await ctx.reply(
          '⚠️ Занадто багато запитів. Спробуйте пізніше.',
          { parse_mode: 'HTML' as const }
        );
        return;
      }

      await next();
    };
  }
}

/**
 * Create configured rate limiters
 */
export const createRateLimiters = () => ({
  // Global limit: 1000 requests per minute
  global: new GlobalRateLimiter(60000, 1000),

  // Per-user limit: 30 requests per minute
  perUser: new PerUserRateLimiter(60000, 30),

  // Per-command limits
  search: new PerCommandRateLimiter('search', 60000, 20),
  addBook: new PerCommandRateLimiter('addBook', 60000, 10),
  admin: new PerCommandRateLimiter('admin', 60000, 5),

  // Composite: global + per-user
  composite: new CompositeRateLimiter(
    new GlobalRateLimiter(60000, 1000),
    new PerUserRateLimiter(60000, 30)
  )
});
