/**
 * Retry Strategy Implementation
 * REFACTOR-009: Circuit Breaker for AI API
 *
 * Implements exponential backoff and customizable retry logic
 */

import { logger } from './logger';

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxAttempts?: number; // Maximum retry attempts (default: 3)
  initialDelay?: number; // Initial delay in ms (default: 100)
  maxDelay?: number; // Maximum delay in ms (default: 10000)
  backoffMultiplier?: number; // Exponential backoff multiplier (default: 2)
  jitter?: boolean; // Add random jitter to delays (default: true)
  retryableErrors?: (error: Error) => boolean; // Custom error check
  name?: string; // Name for logging
}

/**
 * Retry statistics
 */
export interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  totalDelayMs: number;
  lastAttemptTime?: number;
}

/**
 * Retry strategy implementation
 */
export class RetryStrategy {
  private readonly maxAttempts: number;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly backoffMultiplier: number;
  private readonly jitter: boolean;
  private readonly retryableErrors: (error: Error) => boolean;
  private readonly name: string;
  private stats: RetryStats = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    totalDelayMs: 0,
  };

  constructor(policy: RetryPolicy = {}) {
    this.maxAttempts = policy.maxAttempts || 3;
    this.initialDelay = policy.initialDelay || 100;
    this.maxDelay = policy.maxDelay || 10000;
    this.backoffMultiplier = policy.backoffMultiplier || 2;
    this.jitter = policy.jitter !== false;
    this.name = policy.name || 'RetryStrategy';

    // Default: retry on network errors and 5xx
    this.retryableErrors =
      policy.retryableErrors ||
      ((error) => {
        const message = error.message.toLowerCase();
        return (
          message.includes('network') ||
          message.includes('timeout') ||
          message.includes('econnrefused') ||
          message.includes('econnreset') ||
          message.includes('http 5') ||
          message.includes('http 429')
        );
      });
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    let lastError: Error | null = null;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      this.stats.totalAttempts++;

      try {
        const result = await fn();
        this.stats.successfulRetries++;

        if (attempt > 1) {
          logger.info(
            `${this.name}: Operation succeeded on attempt ${attempt}/${this.maxAttempts}` +
              (context ? ` (${context})` : '')
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isRetryable = this.retryableErrors(lastError);

        if (!isRetryable || attempt === this.maxAttempts) {
          this.stats.failedRetries++;
          logger.error(
            `${this.name}: Operation failed after ${attempt} attempts` +
              (context ? ` (${context})` : ''),
            lastError
          );
          throw lastError;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);
        totalDelay += delay;

        logger.warn(
          `${this.name}: Attempt ${attempt} failed, retrying in ${delay}ms` +
            (context ? ` (${context})` : ''),
          { error: lastError.message }
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    this.stats.totalDelayMs += totalDelay;
    this.stats.lastAttemptTime = Date.now();

    if (lastError) {
      throw lastError;
    }

    throw new Error(`${this.name}: Failed after ${this.maxAttempts} attempts`);
  }

  /**
   * Execute function with retry logic (sync)
   */
  executeSync<T>(fn: () => T, context?: string): T {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      this.stats.totalAttempts++;

      try {
        const result = fn();
        this.stats.successfulRetries++;

        if (attempt > 1) {
          logger.info(
            `${this.name}: Operation succeeded on attempt ${attempt}/${this.maxAttempts}` +
              (context ? ` (${context})` : '')
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isRetryable = this.retryableErrors(lastError);

        if (!isRetryable || attempt === this.maxAttempts) {
          this.stats.failedRetries++;
          logger.error(
            `${this.name}: Operation failed after ${attempt} attempts` +
              (context ? ` (${context})` : ''),
            lastError
          );
          throw lastError;
        }

        logger.warn(
          `${this.name}: Attempt ${attempt} failed, retrying` + (context ? ` (${context})` : ''),
          { error: lastError.message }
        );
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error(`${this.name}: Failed after ${this.maxAttempts} attempts`);
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateDelay(attemptNumber: number): number {
    let delay = this.initialDelay * Math.pow(this.backoffMultiplier, attemptNumber - 1);

    // Cap at maxDelay
    delay = Math.min(delay, this.maxDelay);

    // Add jitter if enabled
    if (this.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay = delay + (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.round(delay);
  }

  /**
   * Sleep for specified ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics
   */
  getStats(): RetryStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      totalDelayMs: 0,
    };
    logger.debug(`${this.name}: Statistics reset`);
  }

  /**
   * Get formatted statistics
   */
  getFormattedStats(): string {
    const successRate =
      this.stats.totalAttempts > 0
        ? ((this.stats.successfulRetries / this.stats.totalAttempts) * 100).toFixed(1)
        : '0.0';

    const avgDelay =
      this.stats.totalAttempts > 0
        ? (this.stats.totalDelayMs / this.stats.totalAttempts).toFixed(0)
        : '0';

    return (
      `${this.name}: ` +
      `Total: ${this.stats.totalAttempts}, ` +
      `Success: ${successRate}%, ` +
      `Avg Delay: ${avgDelay}ms, ` +
      `Total Delay: ${this.stats.totalDelayMs}ms`
    );
  }
}

/**
 * Retry helper for one-off usage
 */
export async function retryAsync<T>(fn: () => Promise<T>, options: RetryPolicy = {}): Promise<T> {
  const strategy = new RetryStrategy(options);
  return strategy.execute(fn);
}

/**
 * Retry helper for sync functions
 */
export function retrySync<T>(fn: () => T, options: RetryPolicy = {}): T {
  const strategy = new RetryStrategy(options);
  return strategy.executeSync(fn);
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 100
): Promise<T> {
  const strategy = new RetryStrategy({
    maxAttempts,
    initialDelay,
    backoffMultiplier: 2,
  });
  return strategy.execute(fn);
}
