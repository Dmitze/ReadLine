"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryStrategy = void 0;
exports.retryAsync = retryAsync;
exports.retrySync = retrySync;
exports.retryWithBackoff = retryWithBackoff;
const logger_1 = require("./logger");
class RetryStrategy {
    constructor(policy = {}) {
        this.stats = {
            totalAttempts: 0,
            successfulRetries: 0,
            failedRetries: 0,
            totalDelayMs: 0,
        };
        this.maxAttempts = policy.maxAttempts || 3;
        this.initialDelay = policy.initialDelay || 100;
        this.maxDelay = policy.maxDelay || 10000;
        this.backoffMultiplier = policy.backoffMultiplier || 2;
        this.jitter = policy.jitter !== false;
        this.name = policy.name || 'RetryStrategy';
        this.retryableErrors =
            policy.retryableErrors ||
                ((error) => {
                    const message = error.message.toLowerCase();
                    return (message.includes('network') ||
                        message.includes('timeout') ||
                        message.includes('econnrefused') ||
                        message.includes('econnreset') ||
                        message.includes('http 5') ||
                        message.includes('http 429'));
                });
    }
    async execute(fn, context) {
        let lastError = null;
        let totalDelay = 0;
        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            this.stats.totalAttempts++;
            try {
                const result = await fn();
                this.stats.successfulRetries++;
                if (attempt > 1) {
                    logger_1.logger.info(`${this.name}: Operation succeeded on attempt ${attempt}/${this.maxAttempts}` +
                        (context ? ` (${context})` : ''));
                }
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const isRetryable = this.retryableErrors(lastError);
                if (!isRetryable || attempt === this.maxAttempts) {
                    this.stats.failedRetries++;
                    logger_1.logger.error(`${this.name}: Operation failed after ${attempt} attempts` +
                        (context ? ` (${context})` : ''), lastError);
                    throw lastError;
                }
                const delay = this.calculateDelay(attempt);
                totalDelay += delay;
                logger_1.logger.warn(`${this.name}: Attempt ${attempt} failed, retrying in ${delay}ms` +
                    (context ? ` (${context})` : ''), { error: lastError.message });
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
    executeSync(fn, context) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            this.stats.totalAttempts++;
            try {
                const result = fn();
                this.stats.successfulRetries++;
                if (attempt > 1) {
                    logger_1.logger.info(`${this.name}: Operation succeeded on attempt ${attempt}/${this.maxAttempts}` +
                        (context ? ` (${context})` : ''));
                }
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const isRetryable = this.retryableErrors(lastError);
                if (!isRetryable || attempt === this.maxAttempts) {
                    this.stats.failedRetries++;
                    logger_1.logger.error(`${this.name}: Operation failed after ${attempt} attempts` +
                        (context ? ` (${context})` : ''), lastError);
                    throw lastError;
                }
                logger_1.logger.warn(`${this.name}: Attempt ${attempt} failed, retrying` + (context ? ` (${context})` : ''), { error: lastError.message });
            }
        }
        if (lastError) {
            throw lastError;
        }
        throw new Error(`${this.name}: Failed after ${this.maxAttempts} attempts`);
    }
    calculateDelay(attemptNumber) {
        let delay = this.initialDelay * Math.pow(this.backoffMultiplier, attemptNumber - 1);
        delay = Math.min(delay, this.maxDelay);
        if (this.jitter) {
            const jitterAmount = delay * 0.1;
            delay = delay + (Math.random() - 0.5) * 2 * jitterAmount;
        }
        return Math.round(delay);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    getStats() {
        return { ...this.stats };
    }
    resetStats() {
        this.stats = {
            totalAttempts: 0,
            successfulRetries: 0,
            failedRetries: 0,
            totalDelayMs: 0,
        };
        logger_1.logger.debug(`${this.name}: Statistics reset`);
    }
    getFormattedStats() {
        const successRate = this.stats.totalAttempts > 0
            ? ((this.stats.successfulRetries / this.stats.totalAttempts) * 100).toFixed(1)
            : '0.0';
        const avgDelay = this.stats.totalAttempts > 0
            ? (this.stats.totalDelayMs / this.stats.totalAttempts).toFixed(0)
            : '0';
        return (`${this.name}: ` +
            `Total: ${this.stats.totalAttempts}, ` +
            `Success: ${successRate}%, ` +
            `Avg Delay: ${avgDelay}ms, ` +
            `Total Delay: ${this.stats.totalDelayMs}ms`);
    }
}
exports.RetryStrategy = RetryStrategy;
async function retryAsync(fn, options = {}) {
    const strategy = new RetryStrategy(options);
    return strategy.execute(fn);
}
function retrySync(fn, options = {}) {
    const strategy = new RetryStrategy(options);
    return strategy.executeSync(fn);
}
async function retryWithBackoff(fn, maxAttempts = 3, initialDelay = 100) {
    const strategy = new RetryStrategy({
        maxAttempts,
        initialDelay,
        backoffMultiplier: 2,
    });
    return strategy.execute(fn);
}
//# sourceMappingURL=RetryStrategy.js.map