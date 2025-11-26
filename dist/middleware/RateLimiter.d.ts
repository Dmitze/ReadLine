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
export declare class MemoryRateLimitStore implements RateLimitStore {
    private store;
    incr(key: string): Promise<number>;
    decr(key: string): Promise<number>;
    get(key: string): Promise<number | null>;
    reset(key: string): Promise<void>;
    resetAll(): Promise<void>;
    cleanup(): Promise<number>;
}
export interface RateLimitStats {
    totalRequests: number;
    blockedRequests: number;
    activeKeys: number;
    lastCleanup: Date;
}
export declare class RateLimiter {
    private store;
    private config;
    private stats;
    constructor(config: RateLimitConfig, store?: RateLimitStore);
    check(ctx: BotContext): Promise<{
        allowed: boolean;
        remaining: number;
    }>;
    middleware(): (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
    getStats(): RateLimitStats;
    reset(): Promise<void>;
    addRequest(ctx: BotContext): Promise<void>;
    private cleanup;
}
export declare class PerUserRateLimiter extends RateLimiter {
    constructor(windowMs?: number, maxRequests?: number);
}
export declare class PerCommandRateLimiter extends RateLimiter {
    private command;
    constructor(command: string, windowMs?: number, maxRequests?: number);
}
export declare class PerIPRateLimiter extends RateLimiter {
    constructor(windowMs?: number, maxRequests?: number);
}
export declare class GlobalRateLimiter extends RateLimiter {
    constructor(windowMs?: number, maxRequests?: number);
}
export declare class CompositeRateLimiter {
    private limiters;
    constructor(...limiters: RateLimiter[]);
    check(ctx: BotContext): Promise<{
        allowed: boolean;
        remaining: number;
    }>;
    middleware(): (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
}
export declare const createRateLimiters: () => {
    global: GlobalRateLimiter;
    perUser: PerUserRateLimiter;
    search: PerCommandRateLimiter;
    addBook: PerCommandRateLimiter;
    admin: PerCommandRateLimiter;
    composite: CompositeRateLimiter;
};
//# sourceMappingURL=RateLimiter.d.ts.map