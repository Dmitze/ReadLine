/**
 * Result Pattern Implementation
 * REFACTOR-008: Replaces try-catch with type-safe error handling
 *
 * Instead of throwing exceptions, functions return Result<T, E>
 * which is either Success with a value or Failure with an error
 */

/**
 * Success result
 */
export class Ok<T, E = Error> {
  readonly ok: true = true;
  readonly success: true = true;
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  isOk(): this is Ok<T, E> {
    return true;
  }

  isErr(): this is Err<T, E> {
    return false;
  }

  /**
   * Transform the value inside Ok
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }

  /**
   * Chain operations that return Result
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  /**
   * Get the value or throw if error
   */
  unwrap(): T {
    return this.value;
  }

  /**
   * Get the value or return a default
   */
  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  /**
   * Execute a function for side effects
   */
  tap(fn: (value: T) => void): Result<T, E> {
    fn(this.value);
    return this;
  }
}

/**
 * Error result
 */
export class Err<T, E = Error> {
  readonly ok: false = false;
  readonly success: false = false;
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  isOk(): this is Ok<T, E> {
    return false;
  }

  isErr(): this is Err<T, E> {
    return true;
  }

  /**
   * Transform the error
   */
  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Err(fn(this.error));
  }

  /**
   * Map over error, but pass through Ok
   */
  map<U>(_fn: (value: T) => U): Result<U, E> {
    return new Err(this.error);
  }

  /**
   * Chain operations that return Result
   */
  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Err(this.error);
  }

  /**
   * Get the value or throw the error
   */
  unwrap(): T {
    throw this.error;
  }

  /**
   * Get the value or return a default
   */
  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  /**
   * Execute a function for side effects
   */
  tap(_fn: (value: T) => void): Result<T, E> {
    return this;
  }
}

/**
 * Result type - either Ok<T> or Err<E>
 */
export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

/**
 * Helper function to create Ok result
 */
export function ok<T, E = Error>(value: T): Result<T, E> {
  return new Ok(value);
}

/**
 * Helper function to create Err result
 */
export function err<T, E = Error>(error: E): Result<T, E> {
  return new Err(error);
}

/**
 * Execute an async operation and wrap result
 */
export async function asyncResult<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Execute a sync operation and wrap result
 */
export function syncResult<T>(fn: () => T): Result<T> {
  try {
    const value = fn();
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Combine multiple results
 * Returns Ok if all are Ok, otherwise Err of the first failure
 */
export function combine<T, E = Error>(...results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (result.isErr()) {
      return result as any;
    }
    values.push(result.unwrap());
  }

  return ok(values);
}

/**
 * Try multiple operations in sequence
 * Stops at first error and returns it
 */
export async function trySequence<T, E = Error>(
  operations: Array<() => Promise<Result<T, E>>>
): Promise<Result<T, E>> {
  for (const operation of operations) {
    const result = await operation();
    if (result.isErr()) {
      return result;
    }
  }

  return err(new Error('No operations provided') as any);
}
