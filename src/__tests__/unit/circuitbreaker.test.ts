/**
 * CircuitBreaker Pattern Tests
 * Tests for circuit breaker resilience pattern
 */

describe('Circuit Breaker Pattern', () => {
  // Simple circuit breaker implementation for testing
  enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
  }

  class SimpleCircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private failureThreshold: number = 3;
    private lastFailureTime: number = 0;
    private timeout: number = 1000;

    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (this.state === CircuitState.OPEN) {
        if (Date.now() - this.lastFailureTime > this.timeout) {
          this.state = CircuitState.HALF_OPEN;
        } else {
          throw new Error('Circuit breaker is OPEN');
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

    private onSuccess(): void {
      this.failureCount = 0;
      this.state = CircuitState.CLOSED;
    }

    private onFailure(): void {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN;
      }
    }

    getState(): CircuitState {
      return this.state;
    }
  }

  it('should start in CLOSED state', () => {
    const breaker = new SimpleCircuitBreaker();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should execute function when CLOSED', async () => {
    const breaker = new SimpleCircuitBreaker();
    const mockFn = jest.fn().mockResolvedValue('success');

    const result = await breaker.execute(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalled();
  });

  it('should transition to OPEN after threshold failures', async () => {
    const breaker = new SimpleCircuitBreaker();
    const failingFn = jest.fn().mockRejectedValue(new Error('fail'));

    // First failure
    try {
      await breaker.execute(failingFn);
    } catch {}

    // Second failure
    try {
      await breaker.execute(failingFn);
    } catch {}

    // Third failure - should open circuit
    try {
      await breaker.execute(failingFn);
    } catch {}

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should reject calls when OPEN', async () => {
    const breaker = new SimpleCircuitBreaker();
    const failingFn = jest.fn().mockRejectedValue(new Error('fail'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(failingFn);
      } catch {}
    }

    // Next call should be rejected immediately
    await expect(breaker.execute(() => Promise.resolve('test')))
      .rejects.toThrow('Circuit breaker is OPEN');
  });

  it('should reset failure count on success', async () => {
    const breaker = new SimpleCircuitBreaker();
    let callCount = 0;

    const fn = jest.fn(async () => {
      callCount++;
      if (callCount <= 2) {
        throw new Error('fail');
      }
      return 'success';
    });

    // Two failures
    try {
      await breaker.execute(fn);
    } catch {}
    try {
      await breaker.execute(fn);
    } catch {}

    // One success
    const result = await breaker.execute(fn);

    expect(result).toBe('success');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });
});

describe('Retry Strategy', () => {
  class RetryStrategy {
    private maxRetries: number;
    private backoffMs: number;

    constructor(maxRetries: number = 3, backoffMs: number = 100) {
      this.maxRetries = maxRetries;
      this.backoffMs = backoffMs;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error as Error;

          if (attempt < this.maxRetries + 1) {
            const delay = this.backoffMs * attempt;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;
    }
  }

  it('should succeed on first try', async () => {
    const strategy = new RetryStrategy();
    const fn = jest.fn().mockResolvedValue('success');

    const result = await strategy.execute(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const strategy = new RetryStrategy(3, 10);
    let attempts = 0;

    const fn = jest.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('fail');
      }
      return 'success';
    });

    const result = await strategy.execute(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const strategy = new RetryStrategy(2, 10);
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));

    await expect(strategy.execute(fn))
      .rejects.toThrow('always fails');

    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

describe('Timeout Pattern', () => {
  class TimeoutWrapper {
    private timeoutMs: number;

    constructor(timeoutMs: number) {
      this.timeoutMs = timeoutMs;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
      return Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.timeoutMs)
        )
      ]);
    }
  }

  it('should return result if completed within timeout', async () => {
    const wrapper = new TimeoutWrapper(100);
    const fn = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'success';
    });

    const result = await wrapper.execute(fn);

    expect(result).toBe('success');
  });

  it('should timeout if operation takes too long', async () => {
    const wrapper = new TimeoutWrapper(50);
    const fn = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return 'success';
    });

    await expect(wrapper.execute(fn))
      .rejects.toThrow('Timeout');
  });
});
