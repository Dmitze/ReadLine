export declare class Ok<T, E = Error> {
    readonly ok: true;
    readonly success: true;
    readonly value: T;
    constructor(value: T);
    isOk(): this is Ok<T, E>;
    isErr(): this is Err<T, E>;
    map<U>(fn: (value: T) => U): Result<U, E>;
    flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
    unwrap(): T;
    unwrapOr(_defaultValue: T): T;
    tap(fn: (value: T) => void): Result<T, E>;
}
export declare class Err<T, E = Error> {
    readonly ok: false;
    readonly success: false;
    readonly error: E;
    constructor(error: E);
    isOk(): this is Ok<T, E>;
    isErr(): this is Err<T, E>;
    mapErr<F>(fn: (error: E) => F): Result<T, F>;
    map<U>(_fn: (value: T) => U): Result<U, E>;
    flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E>;
    unwrap(): T;
    unwrapOr(defaultValue: T): T;
    tap(_fn: (value: T) => void): Result<T, E>;
}
export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;
export declare function ok<T, E = Error>(value: T): Result<T, E>;
export declare function err<T, E = Error>(error: E): Result<T, E>;
export declare function asyncResult<T>(fn: () => Promise<T>): Promise<Result<T>>;
export declare function syncResult<T>(fn: () => T): Result<T>;
export declare function combine<T, E = Error>(...results: Result<T, E>[]): Result<T[], E>;
export declare function trySequence<T, E = Error>(operations: Array<() => Promise<Result<T, E>>>): Promise<Result<T, E>>;
export declare function handleResult<T>(operation: () => Promise<Result<T>>, onSuccess: (value: T) => Promise<void> | void, onError?: (error: Error) => Promise<void> | void, logContext?: string): Promise<void>;
export declare function withResult<T extends any[], R>(fn: (...args: T) => Promise<R>): (...args: T) => Promise<Result<R>>;
export declare function handleSceneError(ctx: any, error: Error, userMessage?: string, logContext?: string): Promise<void>;
//# sourceMappingURL=Result.d.ts.map