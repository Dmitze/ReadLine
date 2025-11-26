"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiters = exports.CompositeRateLimiter = exports.GlobalRateLimiter = exports.PerIPRateLimiter = exports.PerCommandRateLimiter = exports.PerUserRateLimiter = exports.RateLimiter = exports.MemoryRateLimitStore = void 0;
class MemoryRateLimitStore {
    constructor() {
        this.store = new Map();
    }
    async incr(key) {
        const now = Date.now();
        const entry = this.store.get(key);
        if (!entry || now > entry.resetTime) {
            this.store.set(key, { count: 1, resetTime: now + 60000 });
            return 1;
        }
        entry.count++;
        return entry.count;
    }
    async decr(key) {
        const entry = this.store.get(key);
        if (!entry)
            return 0;
        entry.count = Math.max(0, entry.count - 1);
        return entry.count;
    }
    async get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        const now = Date.now();
        if (now > entry.resetTime) {
            this.store.delete(key);
            return null;
        }
        return entry.count;
    }
    async reset(key) {
        this.store.delete(key);
    }
    async resetAll() {
        this.store.clear();
    }
    async cleanup() {
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
exports.MemoryRateLimitStore = MemoryRateLimitStore;
class RateLimiter {
    constructor(config, store) {
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
    async check(ctx) {
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
        return async (ctx, next) => {
            const { allowed, remaining } = await this.check(ctx);
            ctx.rateLimit = { allowed, remaining };
            if (!allowed) {
                await ctx.reply('⚠️ Занадто багато запитів. Спробуйте пізніше.', {
                    parse_mode: 'HTML',
                });
                return;
            }
            try {
                await next();
            }
            catch (error) {
                if (!this.config.skipFailedRequests) {
                }
                throw error;
            }
        };
    }
    getStats() {
        return { ...this.stats };
    }
    async reset() {
        await this.store.resetAll();
        this.stats.blockedRequests = 0;
        this.stats.totalRequests = 0;
    }
    async addRequest(ctx) {
        const key = this.config.keyGenerator(ctx);
        await this.store.incr(key);
    }
    async cleanup() {
        if (this.store instanceof MemoryRateLimitStore) {
            await this.store.cleanup();
            this.stats.lastCleanup = new Date();
        }
    }
}
exports.RateLimiter = RateLimiter;
function defaultKeyGenerator(ctx) {
    return `user:${ctx.from?.id || 'unknown'}`;
}
class PerUserRateLimiter extends RateLimiter {
    constructor(windowMs = 60000, maxRequests = 30) {
        super({
            windowMs,
            maxRequests,
            keyGenerator: (ctx) => `user:${ctx.from?.id || 'unknown'}`,
        });
    }
}
exports.PerUserRateLimiter = PerUserRateLimiter;
class PerCommandRateLimiter extends RateLimiter {
    constructor(command, windowMs = 60000, maxRequests = 10) {
        super({
            windowMs,
            maxRequests,
            keyGenerator: (ctx) => `cmd:${command}:${ctx.from?.id || 'unknown'}`,
        }, new MemoryRateLimitStore());
        this.command = command;
    }
}
exports.PerCommandRateLimiter = PerCommandRateLimiter;
class PerIPRateLimiter extends RateLimiter {
    constructor(windowMs = 60000, maxRequests = 100) {
        super({
            windowMs,
            maxRequests,
            keyGenerator: (ctx) => {
                const ip = ctx.ip || 'unknown';
                return `ip:${ip}`;
            },
        });
    }
}
exports.PerIPRateLimiter = PerIPRateLimiter;
class GlobalRateLimiter extends RateLimiter {
    constructor(windowMs = 60000, maxRequests = 1000) {
        super({
            windowMs,
            maxRequests,
            keyGenerator: () => 'global',
        });
    }
}
exports.GlobalRateLimiter = GlobalRateLimiter;
class CompositeRateLimiter {
    constructor(...limiters) {
        this.limiters = limiters;
    }
    async check(ctx) {
        const results = await Promise.all(this.limiters.map((limiter) => limiter.check(ctx)));
        const blocked = results.some((r) => !r.allowed);
        const remaining = Math.min(...results.map((r) => r.remaining));
        return {
            allowed: !blocked,
            remaining: Math.max(0, remaining),
        };
    }
    middleware() {
        return async (ctx, next) => {
            const { allowed, remaining } = await this.check(ctx);
            ctx.rateLimit = { allowed, remaining };
            if (!allowed) {
                await ctx.reply('⚠️ Занадто багато запитів. Спробуйте пізніше.', {
                    parse_mode: 'HTML',
                });
                return;
            }
            await next();
        };
    }
}
exports.CompositeRateLimiter = CompositeRateLimiter;
const createRateLimiters = () => ({
    global: new GlobalRateLimiter(60000, 1000),
    perUser: new PerUserRateLimiter(60000, 30),
    search: new PerCommandRateLimiter('search', 60000, 20),
    addBook: new PerCommandRateLimiter('addBook', 60000, 10),
    admin: new PerCommandRateLimiter('admin', 60000, 5),
    composite: new CompositeRateLimiter(new GlobalRateLimiter(60000, 1000), new PerUserRateLimiter(60000, 30)),
});
exports.createRateLimiters = createRateLimiters;
//# sourceMappingURL=RateLimiter.js.map