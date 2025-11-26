"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Err = exports.Ok = void 0;
exports.ok = ok;
exports.err = err;
exports.asyncResult = asyncResult;
exports.syncResult = syncResult;
exports.combine = combine;
exports.trySequence = trySequence;
exports.handleResult = handleResult;
exports.withResult = withResult;
exports.handleSceneError = handleSceneError;
class Ok {
    constructor(value) {
        this.ok = true;
        this.success = true;
        this.value = value;
    }
    isOk() {
        return true;
    }
    isErr() {
        return false;
    }
    map(fn) {
        return new Ok(fn(this.value));
    }
    flatMap(fn) {
        return fn(this.value);
    }
    unwrap() {
        return this.value;
    }
    unwrapOr(_defaultValue) {
        return this.value;
    }
    tap(fn) {
        fn(this.value);
        return this;
    }
}
exports.Ok = Ok;
class Err {
    constructor(error) {
        this.ok = false;
        this.success = false;
        this.error = error;
    }
    isOk() {
        return false;
    }
    isErr() {
        return true;
    }
    mapErr(fn) {
        return new Err(fn(this.error));
    }
    map(_fn) {
        return new Err(this.error);
    }
    flatMap(_fn) {
        return new Err(this.error);
    }
    unwrap() {
        throw this.error;
    }
    unwrapOr(defaultValue) {
        return defaultValue;
    }
    tap(_fn) {
        return this;
    }
}
exports.Err = Err;
function ok(value) {
    return new Ok(value);
}
function err(error) {
    return new Err(error);
}
async function asyncResult(fn) {
    try {
        const value = await fn();
        return ok(value);
    }
    catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
    }
}
function syncResult(fn) {
    try {
        const value = fn();
        return ok(value);
    }
    catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
    }
}
function combine(...results) {
    const values = [];
    for (const result of results) {
        if (result.isErr()) {
            return result;
        }
        values.push(result.unwrap());
    }
    return ok(values);
}
async function trySequence(operations) {
    for (const operation of operations) {
        const result = await operation();
        if (result.isErr()) {
            return result;
        }
    }
    return err(new Error('No operations provided'));
}
async function handleResult(operation, onSuccess, onError, logContext) {
    const result = await operation();
    if (result.isOk()) {
        await onSuccess(result.value);
    }
    else {
        if (logContext) {
            console.error(`[${logContext}] Error:`, result.error);
        }
        if (onError) {
            await onError(result.error);
        }
        else {
            throw result.error;
        }
    }
}
function withResult(fn) {
    return async (...args) => {
        try {
            const result = await fn(...args);
            return ok(result);
        }
        catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    };
}
async function handleSceneError(ctx, error, userMessage = '❌ Виникла помилка. Спробуйте ще раз.', logContext) {
    const context = logContext || 'SceneError';
    console.error(`[${context}]`, error);
    try {
        await ctx.reply(userMessage);
    }
    catch (replyError) {
        console.error(`[${context}] Failed to send error message:`, replyError);
    }
}
//# sourceMappingURL=Result.js.map