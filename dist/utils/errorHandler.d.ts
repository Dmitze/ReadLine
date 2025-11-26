import { Context } from 'telegraf';
export declare enum ErrorType {
    DATABASE = "DATABASE_ERROR",
    VALIDATION = "VALIDATION_ERROR",
    NETWORK = "NETWORK_ERROR",
    AI = "AI_ERROR",
    PERMISSION = "PERMISSION_ERROR",
    NOT_FOUND = "NOT_FOUND",
    RATE_LIMIT = "RATE_LIMIT",
    UNKNOWN = "UNKNOWN_ERROR"
}
export declare class AppError extends Error {
    type: ErrorType;
    userMessage?: string;
    originalError?: Error;
    constructor(type: ErrorType, message: string, userMessage?: string, originalError?: Error);
}
export declare function asyncHandler<T extends unknown[], R>(fn: (...args: T) => Promise<R>, errorType?: ErrorType): (...args: T) => Promise<R | undefined>;
export declare function handleError(error: unknown, type?: ErrorType, context?: Record<string, unknown>): void;
export declare function sendErrorToUser(ctx: Context, error: unknown, fallbackMessage?: string): Promise<void>;
export declare function errorMiddleware(handler: (ctx: Context) => Promise<void>, errorType?: ErrorType): (ctx: Context) => Promise<void>;
export declare function retryOperation<T>(operation: () => Promise<T>, maxRetries?: number, delay?: number): Promise<T>;
export declare function withFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>, errorType?: ErrorType): Promise<T>;
export declare function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number, timeoutMessage?: string): Promise<T>;
//# sourceMappingURL=errorHandler.d.ts.map