"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpCircuitBreaker = exports.CircuitBreaker = exports.CircuitState = void 0;
const logger_1 = require("./logger");
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class CircuitBreaker {
    constructor(options = {}) {
        this.state = CircuitState.CLOSED;
        this.lastFailureTime = 0;
        this.consecutiveSuccesses = 0;
        this.consecutiveFailures = 0;
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
    async execute(fn) {
        this.metrics.totalRequests++;
        if (this.state === CircuitState.OPEN) {
            if (Date.now() - this.lastFailureTime >= this.timeout) {
                this.transitionTo(CircuitState.HALF_OPEN);
                logger_1.logger.debug(`${this.name}: Transitioning to HALF_OPEN state`);
            }
            else {
                this.metrics.rejectedRequests++;
                throw new Error(`${this.name}: Circuit breaker is OPEN`);
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    executeSync(fn) {
        this.metrics.totalRequests++;
        if (this.state === CircuitState.OPEN) {
            if (Date.now() - this.lastFailureTime >= this.timeout) {
                this.transitionTo(CircuitState.HALF_OPEN);
                logger_1.logger.debug(`${this.name}: Transitioning to HALF_OPEN state`);
            }
            else {
                this.metrics.rejectedRequests++;
                throw new Error(`${this.name}: Circuit breaker is OPEN`);
            }
        }
        try {
            const result = fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.consecutiveFailures = 0;
        this.metrics.successfulRequests++;
        this.metrics.lastSuccessTime = Date.now();
        if (this.state === CircuitState.HALF_OPEN) {
            this.consecutiveSuccesses++;
            if (this.consecutiveSuccesses >= this.successThreshold) {
                this.transitionTo(CircuitState.CLOSED);
                logger_1.logger.info(`${this.name}: Circuit breaker CLOSED after successful recovery`);
            }
        }
    }
    onFailure() {
        this.consecutiveSuccesses = 0;
        this.consecutiveFailures++;
        this.metrics.failedRequests++;
        this.lastFailureTime = Date.now();
        this.metrics.lastFailureTime = Date.now();
        if (this.state === CircuitState.HALF_OPEN) {
            this.transitionTo(CircuitState.OPEN);
            logger_1.logger.warn(`${this.name}: Circuit breaker OPEN after failure in HALF_OPEN state`);
        }
        else if (this.state === CircuitState.CLOSED &&
            this.consecutiveFailures >= this.failureThreshold) {
            this.transitionTo(CircuitState.OPEN);
            logger_1.logger.warn(`${this.name}: Circuit breaker OPEN after ${this.consecutiveFailures} consecutive failures`);
        }
    }
    transitionTo(newState) {
        if (this.state === newState)
            return;
        const oldState = this.state;
        this.state = newState;
        this.metrics.state = newState;
        this.metrics.stateChangeTime = Date.now();
        if (newState === CircuitState.CLOSED) {
            this.consecutiveSuccesses = 0;
            this.consecutiveFailures = 0;
        }
        else if (newState === CircuitState.HALF_OPEN) {
            this.consecutiveSuccesses = 0;
        }
        logger_1.logger.info(`${this.name}: State changed from ${oldState} to ${newState}`);
        if (this.onStateChange) {
            this.onStateChange(newState, this.getMetrics());
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getState() {
        return this.state;
    }
    reset() {
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
        logger_1.logger.info(`${this.name}: Circuit breaker reset`);
    }
    startMonitoring() {
        this.monitoringTimer = setInterval(() => {
            const successRate = this.metrics.totalRequests > 0
                ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)
                : '0.00';
            logger_1.logger.debug(`${this.name} Metrics:`, {
                state: this.metrics.state,
                totalRequests: this.metrics.totalRequests,
                successRate: `${successRate}%`,
                failedRequests: this.metrics.failedRequests,
                rejectedRequests: this.metrics.rejectedRequests,
            });
        }, this.monitoringPeriod);
    }
    stop() {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
        }
    }
    getStatus() {
        const successRate = this.metrics.totalRequests > 0
            ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(1)
            : '0.0';
        return `[${this.name}] State: ${this.state} | Success: ${successRate}% | Total: ${this.metrics.totalRequests}`;
    }
}
exports.CircuitBreaker = CircuitBreaker;
class HttpCircuitBreaker extends CircuitBreaker {
    constructor(options = {}) {
        super(options);
        this.httpErrorCodes = new Set([408, 429, 500, 502, 503, 504]);
    }
    async executeRequest(url, options = {}) {
        return this.execute(async () => {
            const response = await fetch(url, options);
            if (!response.ok) {
                if (this.httpErrorCodes.has(response.status)) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            return response.json();
        });
    }
}
exports.HttpCircuitBreaker = HttpCircuitBreaker;
//# sourceMappingURL=CircuitBreaker.js.map