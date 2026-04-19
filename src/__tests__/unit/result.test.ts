describe('Result Pattern', () => {
  type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

  const Ok = <T, E = Error>(value: T): Result<T, E> => ({
    ok: true,
    value,
  });

  const Err = <T, E = Error>(error: E): Result<T, E> => ({
    ok: false,
    error,
  });

  const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok === true;

  const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } =>
    result.ok === false;

  it('should create Ok result', () => {
    const result = Ok(42);

    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('should create Err result', () => {
    const error = new Error('Something went wrong');
    const result = Err(error);

    expect(isOk(result)).toBe(false);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toEqual(error);
    }
  });

  it('should chain Ok results', () => {
    const double = (n: number): Result<number> => Ok(n * 2);
    const addOne = (n: number): Result<number> => Ok(n + 1);

    let result = Ok(5);

    if (isOk(result)) {
      result = double(result.value);
    }
    if (isOk(result)) {
      result = addOne(result.value);
    }

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(11);
    }
  });

  it('should short-circuit on first Err', () => {
    const willFail = (): Result<number> => Err(new Error('Division by zero'));

    const double = (n: number): Result<number> => Ok(n * 2);

    let result: Result<number> = Ok(5);

    if (isOk(result)) {
      result = double(result.value);
    }
    if (isOk(result)) {
      result = willFail();
    }

    expect(isErr(result)).toBe(true);
  });

  it('should handle error propagation', () => {
    const operation = (): Result<number> => {
      return Err(new Error('Operation failed'));
    };

    const wrappedOp = (): Result<number> => {
      const result = operation();
      if (isErr(result)) {
        return Err(new Error(`Wrapped: ${result.error.message}`));
      }
      return result;
    };

    const finalResult = wrappedOp();

    expect(isErr(finalResult)).toBe(true);
    if (isErr(finalResult)) {
      expect(finalResult.error.message).toContain('Wrapped');
      expect(finalResult.error.message).toContain('Operation failed');
    }
  });
});

describe('Result with Async', () => {
  type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

  const Ok = <T, E = Error>(value: T): Result<T, E> => ({
    ok: true,
    value,
  });

  const Err = <T, E = Error>(error: E): Result<T, E> => ({
    ok: false,
    error,
  });

  const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok === true;

  const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } =>
    result.ok === false;

  it('should handle successful async operation', async () => {
    const asyncOp = async (): Promise<Result<string>> => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return Ok('success');
      } catch (error) {
        return Err(error as Error);
      }
    };

    const result = await asyncOp();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe('success');
    }
  });

  it('should handle failed async operation', async () => {
    const asyncOp = async (): Promise<Result<string>> => {
      try {
        await Promise.reject(new Error('Async failed'));
        return Ok('success');
      } catch (error) {
        return Err(error as Error);
      }
    };

    const result = await asyncOp();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Async failed');
    }
  });

  it('should chain multiple async operations', async () => {
    const asyncOp1 = async (): Promise<Result<number>> => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Ok(10);
    };

    const asyncOp2 = async (value: number): Promise<Result<number>> => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Ok(value * 2);
    };

    let result = await asyncOp1();

    if (isOk(result)) {
      result = await asyncOp2(result.value);
    }

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(20);
    }
  });
});

describe('Result Helpers', () => {
  type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

  const Ok = <T, E = Error>(value: T): Result<T, E> => ({
    ok: true,
    value,
  });

  const Err = <T, E = Error>(error: E): Result<T, E> => ({
    ok: false,
    error,
  });

  const unwrap = <T>(result: Result<T>): T => {
    if (result.ok) return result.value;
    throw result.error;
  };

  const unwrapOr = <T>(result: Result<T>, defaultValue: T): T => {
    return result.ok ? result.value : defaultValue;
  };

  const map = <T, U>(result: Result<T>, fn: (value: T) => U): Result<U> => {
    return result.ok ? Ok(fn(result.value)) : (result as any);
  };

  it('should unwrap Ok result', () => {
    const result = Ok(42);

    expect(unwrap(result)).toBe(42);
  });

  it('should throw on unwrap Err', () => {
    const error = new Error('Failed');
    const result = Err(error);

    expect(() => unwrap(result)).toThrow('Failed');
  });

  it('should unwrapOr with default value', () => {
    expect(unwrapOr(Ok(42), 0)).toBe(42);
    expect(unwrapOr(Err(new Error('fail')), 0)).toBe(0);
  });

  it('should map over Ok result', () => {
    const result = Ok(5);
    const mapped = map(result, (n) => n * 2);

    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value).toBe(10);
    }
  });

  it('should not map over Err result', () => {
    const error = new Error('fail');
    const result: Result<number> = Err(error);
    const mapped = map(result, (n: number) => n * 2);

    expect(mapped.ok).toBe(false);
    if (!mapped.ok) {
      expect(mapped.error).toEqual(error);
    }
  });
});
