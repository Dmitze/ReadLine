/**
 * Circuit Breaker Pattern Implementation
 * REFACTOR-009: Circuit Breaker for AI API
 *
 * Prevents cascading failures by stopping requests when service is unhealthy
 */

import { logger } from './logger';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Failing, reject all requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker metrics
 */
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

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  failureThreshold?: number;      // Number of failures to open circuit (default: 5)
  successThreshold?: number;      // Number of successes in half-open to close (default: 2)
  timeout?: number;               // Time in ms to wait before attempting recovery (default: 60000)
  monitoringPeriod?: number;      // Period to reset metrics (default: 120000)
  name?: string;                  // Circuit breaker name for logging
  onStateChange?: (state: CircuitState, metrics: CircuitMetrics) => void;
}

/**
 * Generic Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private metrics: CircuitMetrics;
  private lastFailureTime: number = 0;
  private consecutiveSuccesses: number = 0;
  private consecutiveFailures: number = 0;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly monitoringPeriod: number;
  private readonly name: string;
  private readonly onStateChange?: (state: CircuitState, metrics: CircuitMetrics) => void;
  private monitoringTimer?: NodeJS.Timeout;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 120000;
    this.name = options.name || 'CircuitBreaker';
    this.onStateChange = options.onStateChange;

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      state: CircuitState.CLOSED,
      stateChangeTime: Date.now(),
    };

    this.startMonitoring();
  }

  /**
   * Execute async function with circuit breaker protection
   */
  async execute<R>(fn: () => Promise<R>): Promise<R> {
    this.metrics.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed to try half-open
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
        logger.debug(`${this.name}: Transitioning to HALF_OPEN state`);
      } else {
        this.metrics.rejectedRequests++;
        throw new Error(`${this.name}: Circuit breaker is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Execute sync function with circuit breaker protection
   */
  executeSync<R>(fn: () => R): R {
    this.metrics.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
        logger.debug(`${this.name}: Transitioning to HALF_OPEN state`);
      } else {
        this.metrics.rejectedRequests++;
        throw new Error(`${this.name}: Circuit breaker is OPEN`);
      }
    }

    try {
      const result = fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.metrics.successfulRequests++;
    this.metrics.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses++;

      if (this.consecutiveSuccesses >= this.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        logger.info(`${this.name}: Circuit breaker CLOSED after successful recovery`);
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures++;
    this.metrics.failedRequests++;
    this.lastFailureTime = Date.now();
    this.metrics.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
      logger.warn(`${this.name}: Circuit breaker OPEN after failure in HALF_OPEN state`);
    } else if (this.state === CircuitState.CLOSED && this.consecutiveFailures >= this.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
      logger.warn(`${this.name}: Circuit breaker OPEN after ${this.consecutiveFailures} consecutive failures`);
    }
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;
    this.metrics.state = newState;
    this.metrics.stateChangeTime = Date.now();

    if (newState === CircuitState.CLOSED) {
      this.consecutiveSuccesses = 0;
      this.consecutiveFailures = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses = 0;
    }

    logger.info(`${this.name}: State changed from ${oldState} to ${newState}`);

    if (this.onStateChange) {
      this.onStateChange(newState, this.getMetrics());
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      state: CircuitState.CLOSED,
      stateChangeTime: Date.now(),
    };
    logger.info(`${this.name}: Circuit breaker reset`);
  }

  /**
   * Start monitoring and periodic reset
   */
  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      // Log metrics
      const successRate = this.metrics.totalRequests > 0
        ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)
        : '0.00';

      logger.debug(`${this.name} Metrics:`, {
        state: this.metrics.state,
        totalRequests: this.metrics.totalRequests,
        successRate: `${successRate}%`,
        failedRequests: this.metrics.failedRequests,
        rejectedRequests: this.metrics.rejectedRequests,
      });
    }, this.monitoringPeriod);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
  }

  /**
   * Get formatted status for logging
   */
  getStatus(): string {
    const successRate = this.metrics.totalRequests > 0
      ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(1)
      : '0.0';

    return `[${this.name}] State: ${this.state} | Success: ${successRate}% | Total: ${this.metrics.totalRequests}`;
  }
}

/**
 * Specialized Circuit Breaker for HTTP requests
 */
export class HttpCircuitBreaker extends CircuitBreaker<Response> {
  private readonly httpErrorCodes: Set<number>;

  constructor(options: CircuitBreakerOptions = {}) {
    super(options);
    // Consider 5xx and specific 4xx errors as failures
    this.httpErrorCodes = new Set([408, 429, 500, 502, 503, 504]);
  }

  /**
   * Execute HTTP request with circuit breaker protection
   */
  async executeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this.execute(async () => {
      const response = await fetch(url, options);

      if (!response.ok) {
        if (this.httpErrorCodes.has(response.status)) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      return response.json() as Promise<T>;
    });
  }
}
