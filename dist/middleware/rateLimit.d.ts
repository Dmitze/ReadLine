import { Context, Middleware } from 'telegraf';
declare class RateLimiter {
    private records;
    private maxRequests;
    private windowMs;
    private cleanupTimer?;
    constructor(maxRequests?: number, windowMs?: number);
    check(userId: number): boolean;
    private cleanup;
    reset(userId: number): void;
    getStats(): {
        totalUsers: number;
        maxRequests: number;
        windowMs: number;
    };
    destroy(): void;
}
export declare const messageLimiter: RateLimiter;
export declare const commandLimiter: RateLimiter;
export declare const callbackLimiter: RateLimiter;
export declare function cleanupRateLimiters(): void;
export declare const rateLimitMessage: Middleware<Context>;
export declare const rateLimitCommand: Middleware<Context>;
export declare const rateLimitCallback: Middleware<Context>;
export {};
//# sourceMappingURL=rateLimit.d.ts.map