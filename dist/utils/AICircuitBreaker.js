"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICircuitBreaker = void 0;
exports.getAICircuitBreaker = getAICircuitBreaker;
exports.resetAICircuitBreaker = resetAICircuitBreaker;
const CircuitBreaker_1 = require("./CircuitBreaker");
const RetryStrategy_1 = require("./RetryStrategy");
const logger_1 = require("./logger");
class AICircuitBreaker {
    constructor(config = {}) {
        this.requestQueue = [];
        this.concurrentRequests = 0;
        this.rateLimitHits = 0;
        this.totalResponseTime = 0;
        this.responseCount = 0;
        const name = config.name || 'AI-API';
        this.maxRequestsPerMinute = config.maxRequestsPerMinute || 60;
        this.maxConcurrentRequests = config.maxConcurrentRequests || 5;
        this.enableRetry = config.enableRetry !== false;
        this.requestTimeout = config.requestTimeout || 25000;
        this.onFallback = config.onFallback;
        this.circuitBreaker = new CircuitBreaker_1.CircuitBreaker({
            name,
            failureThreshold: config.failureThreshold || 5,
            successThreshold: config.successThreshold || 2,
            timeout: config.timeout || 60000,
            onStateChange: (state, metrics) => {
                logger_1.logger.warn(`${name}: Circuit breaker state changed to ${state}`, metrics);
            },
        });
        this.retryStrategy = new RetryStrategy_1.RetryStrategy({
            name: `${name}-Retry`,
            maxAttempts: config.maxRetryAttempts || 2,
            initialDelay: config.retryInitialDelay || 500,
            retryableErrors: (error) => {
                const message = error.message.toLowerCase();
                return (message.includes('timeout') ||
                    message.includes('econnrefused') ||
                    message.includes('econnreset') ||
                    message.includes('429') ||
                    message.includes('503') ||
                    message.includes('502'));
            },
        });
        this.stats = {
            ...this.circuitBreaker.getMetrics(),
            rateLimitHits: 0,
            concurrentRequests: 0,
            averageResponseTime: 0,
            totalResponseTime: 0,
        };
    }
    async request(fn, context) {
        const requestId = `${Date.now()}-${Math.random()}`;
        const startTime = Date.now();
        try {
            if (!this.checkRateLimit()) {
                this.rateLimitHits++;
                const reason = 'Rate limit exceeded';
                logger_1.logger.warn(`AI-API: ${reason}` + (context ? ` (${context})` : ''));
                if (this.onFallback) {
                    return (await this.onFallback(reason));
                }
                throw new Error(reason);
            }
            if (this.concurrentRequests >= this.maxConcurrentRequests) {
                const reason = 'Too many concurrent requests';
                logger_1.logger.warn(`AI-API: ${reason}` + (context ? ` (${context})` : ''));
                if (this.onFallback) {
                    return (await this.onFallback(reason));
                }
                throw new Error(reason);
            }
            this.concurrentRequests++;
            this.requestQueue.push({ id: requestId, timestamp: Date.now() });
            let result;
            if (this.enableRetry) {
                result = await this.retryStrategy.execute(async () => {
                    return this.circuitBreaker.execute(async () => {
                        return await this.executeWithTimeout(fn);
                    });
                }, context);
            }
            else {
                result = await this.circuitBreaker.execute(async () => {
                    return await this.executeWithTimeout(fn);
                });
            }
            const responseTime = Date.now() - startTime;
            this.totalResponseTime += responseTime;
            this.responseCount++;
            logger_1.logger.debug('AI-API request completed' + (context ? ` (${context})` : '') + ` in ${responseTime}ms`);
            return result;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            if (error instanceof Error && error.message.includes('Circuit breaker is OPEN')) {
                logger_1.logger.error('AI-API: Circuit breaker is OPEN' + (context ? ` (${context})` : ''));
                if (this.onFallback) {
                    return (await this.onFallback('Circuit breaker open'));
                }
            }
            logger_1.logger.error('AI-API request failed' + (context ? ` (${context})` : '') + ` after ${responseTime}ms`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
        finally {
            this.concurrentRequests = Math.max(0, this.concurrentRequests - 1);
            this.requestQueue = this.requestQueue.filter((r) => r.id !== requestId);
        }
    }
    async executeWithTimeout(fn) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Request timeout after ${this.requestTimeout}ms`)), this.requestTimeout)),
        ]);
    }
    checkRateLimit() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        this.requestQueue = this.requestQueue.filter((r) => r.timestamp > oneMinuteAgo);
        if (this.requestQueue.length >= this.maxRequestsPerMinute) {
            return false;
        }
        return true;
    }
    getState() {
        return this.circuitBreaker.getState();
    }
    getStats() {
        const metrics = this.circuitBreaker.getMetrics();
        return {
            ...metrics,
            rateLimitHits: this.rateLimitHits,
            concurrentRequests: this.concurrentRequests,
            averageResponseTime: this.responseCount > 0 ? Math.round(this.totalResponseTime / this.responseCount) : 0,
            totalResponseTime: this.totalResponseTime,
        };
    }
    getHealth() {
        const state = this.getState();
        const stats = this.getStats();
        let status = 'healthy';
        let message = 'AI API is healthy';
        if (state === CircuitBreaker_1.CircuitState.OPEN) {
            status = 'unhealthy';
            message = 'AI API circuit breaker is OPEN - service unavailable';
        }
        else if (state === CircuitBreaker_1.CircuitState.HALF_OPEN) {
            status = 'degraded';
            message = 'AI API circuit breaker is HALF_OPEN - testing recovery';
        }
        else if (stats.totalRequests > 0) {
            const successRate = (stats.successfulRequests / stats.totalRequests) * 100;
            if (successRate < 50) {
                status = 'unhealthy';
                message = `AI API has low success rate: ${successRate.toFixed(1)}%`;
            }
            else if (successRate < 90) {
                status = 'degraded';
                message = `AI API success rate: ${successRate.toFixed(1)}%`;
            }
        }
        return { status, state, message };
    }
    getStatus() {
        const stats = this.getStats();
        const health = this.getHealth();
        const successRate = stats.totalRequests > 0
            ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
            : '0.0';
        return (`AI-API [${health.status.toUpperCase()}] ` +
            `State: ${stats.state} | ` +
            `Success: ${successRate}% | ` +
            `Avg Response: ${stats.averageResponseTime}ms | ` +
            `Rate Limit Hits: ${this.rateLimitHits}`);
    }
    reset() {
        this.circuitBreaker.reset();
        this.retryStrategy.resetStats();
        this.rateLimitHits = 0;
        this.totalResponseTime = 0;
        this.responseCount = 0;
        this.requestQueue = [];
        logger_1.logger.info('AI Circuit Breaker reset');
    }
    stop() {
        this.circuitBreaker.stop();
    }
}
exports.AICircuitBreaker = AICircuitBreaker;
let globalAICircuitBreaker = null;
function getAICircuitBreaker(config) {
    if (!globalAICircuitBreaker) {
        globalAICircuitBreaker = new AICircuitBreaker(config);
    }
    return globalAICircuitBreaker;
}
function resetAICircuitBreaker() {
    if (globalAICircuitBreaker) {
        globalAICircuitBreaker.reset();
    }
}
//# sourceMappingURL=AICircuitBreaker.js.map