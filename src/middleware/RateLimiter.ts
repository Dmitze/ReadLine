import { Context } from 'telegraf';
import { BotContext } from '../types/telegraf';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
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

export class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async incr(key: string): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + 60000 });
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

export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  activeKeys: number;
  lastCleanup: Date;
}

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
      keyGenerator: config.keyGenerator || defaultKeyGenerator,
    };

    this.store = store || new MemoryRateLimitStore();

    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      activeKeys: 0,
      lastCleanup: new Date(),
    };

    setInterval(() => this.cleanup(), this.config.windowMs);
  }

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

  middleware() {
    return async (ctx: BotContext, next: () => Promise<void>) => {
      const { allowed, remaining } = await this.check(ctx);

      (ctx as any).rateLimit = { allowed, remaining };

      if (!allowed) {
        await ctx.reply('⚠️ Занадто багато запитів. Спробуйте пізніше.', {
          parse_mode: 'HTML' as const,
        });
        return;
      }

      try {
        await next();
      } catch (error) {
        if (!this.config.skipFailedRequests) {
        }
        throw error;
      }
    };
  }

  getStats(): RateLimitStats {
    return { ...this.stats };
  }

  async reset(): Promise<void> {
    await this.store.resetAll();
    this.stats.blockedRequests = 0;
    this.stats.totalRequests = 0;
  }

  async addRequest(ctx: BotContext): Promise<void> {
    const key = this.config.keyGenerator(ctx);
    await this.store.incr(key);
  }

  private async cleanup(): Promise<void> {
    if (this.store instanceof MemoryRateLimitStore) {
      await (this.store as MemoryRateLimitStore).cleanup();
      this.stats.lastCleanup = new Date();
    }
  }
}

function defaultKeyGenerator(ctx: BotContext): string {
  return `user:${ctx.from?.id || 'unknown'}`;
}

export class PerUserRateLimiter extends RateLimiter {
  constructor(windowMs: number = 60000, maxRequests: number = 30) {
    super({
      windowMs,
      maxRequests,
      keyGenerator: (ctx) => `user:${ctx.from?.id || 'unknown'}`,
    });
  }
}

export class PerCommandRateLimiter extends RateLimiter {
  private command: string;

  constructor(command: string, windowMs: number = 60000, maxRequests: number = 10) {
    super(
      {
        windowMs,
        maxRequests,
        keyGenerator: (ctx) => `cmd:${command}:${ctx.from?.id || 'unknown'}`,
      },
      new MemoryRateLimitStore()
    );
    this.command = command;
  }
}

export class PerIPRateLimiter extends RateLimiter {
  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    super({
      windowMs,
      maxRequests,
      keyGenerator: (ctx) => {
        const ip = (ctx as any).ip || 'unknown';
        return `ip:${ip}`;
      },
    });
  }
}

export class GlobalRateLimiter extends RateLimiter {
  constructor(windowMs: number = 60000, maxRequests: number = 1000) {
    super({
      windowMs,
      maxRequests,
      keyGenerator: () => 'global',
    });
  }
}

export class CompositeRateLimiter {
  private limiters: RateLimiter[];

  constructor(...limiters: RateLimiter[]) {
    this.limiters = limiters;
  }

  async check(ctx: BotContext): Promise<{ allowed: boolean; remaining: number }> {
    const results = await Promise.all(this.limiters.map((limiter) => limiter.check(ctx)));

    const blocked = results.some((r) => !r.allowed);
    const remaining = Math.min(...results.map((r) => r.remaining));

    return {
      allowed: !blocked,
      remaining: Math.max(0, remaining),
    };
  }

  middleware() {
    return async (ctx: BotContext, next: () => Promise<void>) => {
      const { allowed, remaining } = await this.check(ctx);

      (ctx as any).rateLimit = { allowed, remaining };

      if (!allowed) {
        await ctx.reply('⚠️ Занадто багато запитів. Спробуйте пізніше.', {
          parse_mode: 'HTML' as const,
        });
        return;
      }

      await next();
    };
  }
}

export const createRateLimiters = () => ({
  global: new GlobalRateLimiter(60000, 1000),

  perUser: new PerUserRateLimiter(60000, 30),

  search: new PerCommandRateLimiter('search', 60000, 20),
  addBook: new PerCommandRateLimiter('addBook', 60000, 10),
  admin: new PerCommandRateLimiter('admin', 60000, 5),

  composite: new CompositeRateLimiter(
    new GlobalRateLimiter(60000, 1000),
    new PerUserRateLimiter(60000, 30)
  ),
});
