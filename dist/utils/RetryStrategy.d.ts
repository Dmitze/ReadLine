export interface RetryPolicy {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    jitter?: boolean;
    retryableErrors?: (error: Error) => boolean;
    name?: string;
}
export interface RetryStats {
    totalAttempts: number;
    successfulRetries: number;
    failedRetries: number;
    totalDelayMs: number;
    lastAttemptTime?: number;
}
export declare class RetryStrategy {
    private readonly maxAttempts;
    private readonly initialDelay;
    private readonly maxDelay;
    private readonly backoffMultiplier;
    private readonly jitter;
    private readonly retryableErrors;
    private readonly name;
    private stats;
    constructor(policy?: RetryPolicy);
    execute<T>(fn: () => Promise<T>, context?: string): Promise<T>;
    executeSync<T>(fn: () => T, context?: string): T;
    private calculateDelay;
    private sleep;
    getStats(): RetryStats;
    resetStats(): void;
    getFormattedStats(): string;
}
export declare function retryAsync<T>(fn: () => Promise<T>, options?: RetryPolicy): Promise<T>;
export declare function retrySync<T>(fn: () => T, options?: RetryPolicy): T;
export declare function retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts?: number, initialDelay?: number): Promise<T>;
//# sourceMappingURL=RetryStrategy.d.ts.map