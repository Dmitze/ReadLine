export declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
export interface CircuitMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    rejectedRequests: number;
    lastFailureTime?: number;
    lastSuccessTime?: number;
    state: CircuitState;
    stateChangeTime: number;
}
export interface CircuitBreakerOptions {
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
    monitoringPeriod?: number;
    name?: string;
    onStateChange?: (state: CircuitState, metrics: CircuitMetrics) => void;
}
export declare class CircuitBreaker<T = any> {
    private state;
    private metrics;
    private lastFailureTime;
    private consecutiveSuccesses;
    private consecutiveFailures;
    private readonly failureThreshold;
    private readonly successThreshold;
    private readonly timeout;
    private readonly monitoringPeriod;
    private readonly name;
    private readonly onStateChange?;
    private monitoringTimer?;
    constructor(options?: CircuitBreakerOptions);
    execute<R>(fn: () => Promise<R>): Promise<R>;
    executeSync<R>(fn: () => R): R;
    private onSuccess;
    private onFailure;
    private transitionTo;
    getMetrics(): CircuitMetrics;
    getState(): CircuitState;
    reset(): void;
    private startMonitoring;
    stop(): void;
    getStatus(): string;
}
export declare class HttpCircuitBreaker extends CircuitBreaker {
    private readonly httpErrorCodes;
    constructor(options?: CircuitBreakerOptions);
    executeRequest<T>(url: string, options?: RequestInit): Promise<T>;
}
//# sourceMappingURL=CircuitBreaker.d.ts.map