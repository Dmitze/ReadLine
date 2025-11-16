/**
 * AI Circuit Breaker
 * REFACTOR-009: Circuit Breaker for AI API
 *
 * Specialized circuit breaker for AI API calls (Gemini, OpenAI, etc.)
 * with rate limiting, timeout management, and fallback strategies
 */

import { CircuitBreaker, CircuitState, CircuitMetrics } from './CircuitBreaker';
import { RetryStrategy } from './RetryStrategy';
import { logger } from './logger';

/**
 * AI Circuit Breaker configuration
 */
export interface AICircuitBreakerConfig {
  name?: string;
  failureThreshold?: number; // Number of failures to open circuit (default: 5)
  successThreshold?: number; // Successes in half-open to close (default: 2)
  timeout?: number; // Time to wait before half-open attempt (default: 60000)

  // Rate limiting
  maxRequestsPerMinute?: number; // Rate limit per minute (default: 60)
  maxConcurrentRequests?: number; // Max concurrent requests (default: 5)

  // Retry strategy
  enableRetry?: boolean; // Enable automatic retry (default: true)
  maxRetryAttempts?: number; // Retry attempts (default: 2)
  retryInitialDelay?: number; // Initial retry delay in ms (default: 500)

  // Timeouts
  requestTimeout?: number; // Request timeout in ms (default: 25000)

  // Callbacks
  onFallback?: (reason: string) => Promise<string>; // Fallback handler
}

/**
 * AI Circuit Breaker statistics
 */
export interface AICircuitBreakerStats extends CircuitMetrics {
  rateLimitHits: number;
  concurrentRequests: number;
  averageResponseTime: number;
  totalResponseTime: number;
}

/**
 * Specialized circuit breaker for AI API calls
 */
export class AICircuitBreaker {
  private circuitBreaker: CircuitBreaker<any>;
  private retryStrategy: RetryStrategy;
  private requestQueue: Array<{
    id: string;
    timestamp: number;
  }> = [];
  private concurrentRequests = 0;
  private readonly maxRequestsPerMinute: number;
  private readonly maxConcurrentRequests: number;
  private readonly enableRetry: boolean;
  private readonly requestTimeout: number;
  private readonly onFallback?: (reason: string) => Promise<string>;
  private stats: AICircuitBreakerStats;
  private rateLimitHits = 0;
  private totalResponseTime = 0;
  private responseCount = 0;

  constructor(config: AICircuitBreakerConfig = {}) {
    const name = config.name || 'AI-API';

    this.maxRequestsPerMinute = config.maxRequestsPerMinute || 60;
    this.maxConcurrentRequests = config.maxConcurrentRequests || 5;
    this.enableRetry = config.enableRetry !== false;
    this.requestTimeout = config.requestTimeout || 25000;
    this.onFallback = config.onFallback;

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      name,
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000,
      onStateChange: (state, metrics) => {
        logger.warn(
          `${name}: Circuit breaker state changed to ${state}`,
          metrics as unknown as Record<string, unknown>
        );
      },
    });

    // Initialize retry strategy
    this.retryStrategy = new RetryStrategy({
      name: `${name}-Retry`,
      maxAttempts: config.maxRetryAttempts || 2,
      initialDelay: config.retryInitialDelay || 500,
      retryableErrors: (error) => {
        const message = error.message.toLowerCase();
        // Retry on network errors, timeouts, and specific HTTP errors
        return (
          message.includes('timeout') ||
          message.includes('econnrefused') ||
          message.includes('econnreset') ||
          message.includes('429') || // Too many requests
          message.includes('503') || // Service unavailable
          message.includes('502') // Bad gateway
        );
      },
    });

    // Initialize stats
    this.stats = {
      ...this.circuitBreaker.getMetrics(),
      rateLimitHits: 0,
      concurrentRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
    };
  }

  /**
   * Execute AI API request with protection
   */
  async request<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    const requestId = `${Date.now()}-${Math.random()}`;
    const startTime = Date.now();

    try {
      // Check rate limiting
      if (!this.checkRateLimit()) {
        this.rateLimitHits++;
        const reason = 'Rate limit exceeded';
        logger.warn(`AI-API: ${reason}` + (context ? ` (${context})` : ''));

        if (this.onFallback) {
          return (await this.onFallback(reason)) as T;
        }

        throw new Error(reason);
      }

      // Check concurrent requests
      if (this.concurrentRequests >= this.maxConcurrentRequests) {
        const reason = 'Too many concurrent requests';
        logger.warn(`AI-API: ${reason}` + (context ? ` (${context})` : ''));

        if (this.onFallback) {
          return (await this.onFallback(reason)) as T;
        }

        throw new Error(reason);
      }

      this.concurrentRequests++;
      this.requestQueue.push({ id: requestId, timestamp: Date.now() });

      // Execute with circuit breaker and retry
      let result: T;

      if (this.enableRetry) {
        result = await this.retryStrategy.execute(async () => {
          return this.circuitBreaker.execute(async () => {
            return await this.executeWithTimeout(fn);
          });
        }, context);
      } else {
        result = await this.circuitBreaker.execute(async () => {
          return await this.executeWithTimeout(fn);
        });
      }

      const responseTime = Date.now() - startTime;
      this.totalResponseTime += responseTime;
      this.responseCount++;

      logger.debug(
        'AI-API request completed' + (context ? ` (${context})` : '') + ` in ${responseTime}ms`
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error instanceof Error && error.message.includes('Circuit breaker is OPEN')) {
        logger.error('AI-API: Circuit breaker is OPEN' + (context ? ` (${context})` : ''));

        if (this.onFallback) {
          return (await this.onFallback('Circuit breaker open')) as T;
        }
      }

      logger.error(
        'AI-API request failed' + (context ? ` (${context})` : '') + ` after ${responseTime}ms`,
        error instanceof Error ? error : new Error(String(error))
      );

      throw error;
    } finally {
      this.concurrentRequests = Math.max(0, this.concurrentRequests - 1);
      this.requestQueue = this.requestQueue.filter((r) => r.id !== requestId);
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout after ${this.requestTimeout}ms`)),
          this.requestTimeout
        )
      ),
    ]);
  }

  /**
   * Check rate limit (requests per minute)
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old requests outside the window
    this.requestQueue = this.requestQueue.filter((r) => r.timestamp > oneMinuteAgo);

    // Check if we're at the limit
    if (this.requestQueue.length >= this.maxRequestsPerMinute) {
      return false;
    }

    return true;
  }

  /**
   * Get circuit breaker state
   */
  getState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Get combined statistics
   */
  getStats(): AICircuitBreakerStats {
    const metrics = this.circuitBreaker.getMetrics();

    return {
      ...metrics,
      rateLimitHits: this.rateLimitHits,
      concurrentRequests: this.concurrentRequests,
      averageResponseTime:
        this.responseCount > 0 ? Math.round(this.totalResponseTime / this.responseCount) : 0,
      totalResponseTime: this.totalResponseTime,
    };
  }

  /**
   * Get health status
   */
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    state: CircuitState;
    message: string;
  } {
    const state = this.getState();
    const stats = this.getStats();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'AI API is healthy';

    if (state === CircuitState.OPEN) {
      status = 'unhealthy';
      message = 'AI API circuit breaker is OPEN - service unavailable';
    } else if (state === CircuitState.HALF_OPEN) {
      status = 'degraded';
      message = 'AI API circuit breaker is HALF_OPEN - testing recovery';
    } else if (stats.totalRequests > 0) {
      const successRate = (stats.successfulRequests / stats.totalRequests) * 100;

      if (successRate < 50) {
        status = 'unhealthy';
        message = `AI API has low success rate: ${successRate.toFixed(1)}%`;
      } else if (successRate < 90) {
        status = 'degraded';
        message = `AI API success rate: ${successRate.toFixed(1)}%`;
      }
    }

    return { status, state, message };
  }

  /**
   * Get formatted status
   */
  getStatus(): string {
    const stats = this.getStats();
    const health = this.getHealth();
    const successRate =
      stats.totalRequests > 0
        ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
        : '0.0';

    return (
      `AI-API [${health.status.toUpperCase()}] ` +
      `State: ${stats.state} | ` +
      `Success: ${successRate}% | ` +
      `Avg Response: ${stats.averageResponseTime}ms | ` +
      `Rate Limit Hits: ${this.rateLimitHits}`
    );
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.circuitBreaker.reset();
    this.retryStrategy.resetStats();
    this.rateLimitHits = 0;
    this.totalResponseTime = 0;
    this.responseCount = 0;
    this.requestQueue = [];
    logger.info('AI Circuit Breaker reset');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.circuitBreaker.stop();
  }
}

/**
 * Global AI Circuit Breaker instance
 */
let globalAICircuitBreaker: AICircuitBreaker | null = null;

/**
 * Get or create global AI Circuit Breaker
 */
export function getAICircuitBreaker(config?: AICircuitBreakerConfig): AICircuitBreaker {
  if (!globalAICircuitBreaker) {
    globalAICircuitBreaker = new AICircuitBreaker(config);
  }
  return globalAICircuitBreaker;
}

/**
 * Reset global AI Circuit Breaker
 */
export function resetAICircuitBreaker(): void {
  if (globalAICircuitBreaker) {
    globalAICircuitBreaker.reset();
  }
}
