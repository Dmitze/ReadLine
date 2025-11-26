import { CircuitState, CircuitMetrics } from './CircuitBreaker';
export interface AICircuitBreakerConfig {
    name?: string;
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
    maxRequestsPerMinute?: number;
    maxConcurrentRequests?: number;
    enableRetry?: boolean;
    maxRetryAttempts?: number;
    retryInitialDelay?: number;
    requestTimeout?: number;
    onFallback?: (reason: string) => Promise<string>;
}
export interface AICircuitBreakerStats extends CircuitMetrics {
    rateLimitHits: number;
    concurrentRequests: number;
    averageResponseTime: number;
    totalResponseTime: number;
}
export declare class AICircuitBreaker {
    private circuitBreaker;
    private retryStrategy;
    private requestQueue;
    private concurrentRequests;
    private readonly maxRequestsPerMinute;
    private readonly maxConcurrentRequests;
    private readonly enableRetry;
    private readonly requestTimeout;
    private readonly onFallback?;
    private stats;
    private rateLimitHits;
    private totalResponseTime;
    private responseCount;
    constructor(config?: AICircuitBreakerConfig);
    request<T>(fn: () => Promise<T>, context?: string): Promise<T>;
    private executeWithTimeout;
    private checkRateLimit;
    getState(): CircuitState;
    getStats(): AICircuitBreakerStats;
    getHealth(): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        state: CircuitState;
        message: string;
    };
    getStatus(): string;
    reset(): void;
    stop(): void;
}
export declare function getAICircuitBreaker(config?: AICircuitBreakerConfig): AICircuitBreaker;
export declare function resetAICircuitBreaker(): void;
//# sourceMappingURL=AICircuitBreaker.d.ts.map