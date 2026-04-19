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

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  tap(fn: (value: T) => void): Result<T, E> {
    fn(this.value);
    return this;
  }
}

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

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Err(fn(this.error));
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return new Err(this.error);
  }

  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Err(this.error);
  }

  unwrap(): T {
    throw this.error;
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  tap(_fn: (value: T) => void): Result<T, E> {
    return this;
  }
}

export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

export function ok<T, E = Error>(value: T): Result<T, E> {
  return new Ok(value);
}

export function err<T, E = Error>(error: E): Result<T, E> {
  return new Err(error);
}

export async function asyncResult<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export function syncResult<T>(fn: () => T): Result<T> {
  try {
    const value = fn();
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

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

export async function handleResult<T>(
  operation: () => Promise<Result<T>>,
  onSuccess: (value: T) => Promise<void> | void,
  onError?: (error: Error) => Promise<void> | void,
  logContext?: string
): Promise<void> {
  const result = await operation();

  if (result.isOk()) {
    await onSuccess(result.value);
  } else {
    if (logContext) {
      console.error(`[${logContext}] Error:`, result.error);
    }
    if (onError) {
      await onError(result.error);
    } else {
      throw result.error;
    }
  }
}

export function withResult<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<Result<R>> {
  return async (...args: T) => {
    try {
      const result = await fn(...args);
      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };
}

export async function handleSceneError(
  ctx: any,
  error: Error,
  userMessage: string = '❌ Виникла помилка. Спробуйте ще раз.',
  logContext?: string
): Promise<void> {
  const context = logContext || 'SceneError';
  console.error(`[${context}]`, error);

  try {
    await ctx.reply(userMessage);
  } catch (replyError) {
    console.error(`[${context}] Failed to send error message:`, replyError);
  }
}
