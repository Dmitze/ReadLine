"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = exports.ErrorType = void 0;
exports.asyncHandler = asyncHandler;
exports.handleError = handleError;
exports.sendErrorToUser = sendErrorToUser;
exports.errorMiddleware = errorMiddleware;
exports.retryOperation = retryOperation;
exports.withFallback = withFallback;
exports.withTimeout = withTimeout;
const logger_1 = require("./logger");
var ErrorType;
(function (ErrorType) {
    ErrorType["DATABASE"] = "DATABASE_ERROR";
    ErrorType["VALIDATION"] = "VALIDATION_ERROR";
    ErrorType["NETWORK"] = "NETWORK_ERROR";
    ErrorType["AI"] = "AI_ERROR";
    ErrorType["PERMISSION"] = "PERMISSION_ERROR";
    ErrorType["NOT_FOUND"] = "NOT_FOUND";
    ErrorType["RATE_LIMIT"] = "RATE_LIMIT";
    ErrorType["UNKNOWN"] = "UNKNOWN_ERROR";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
class AppError extends Error {
    constructor(type, message, userMessage, originalError) {
        super(message);
        this.type = type;
        this.userMessage = userMessage;
        this.originalError = originalError;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function asyncHandler(fn, errorType = ErrorType.UNKNOWN) {
    return async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            handleError(error, errorType);
            return undefined;
        }
    };
}
function handleError(error, type = ErrorType.UNKNOWN, context) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger_1.logger.error(`[${type}] ${err.message}`, err, context);
    switch (type) {
        case ErrorType.DATABASE:
            break;
        case ErrorType.RATE_LIMIT:
            break;
    }
}
async function sendErrorToUser(ctx, error, fallbackMessage = '❌ Виникла помилка. Спробуйте пізніше.') {
    try {
        let message = fallbackMessage;
        if (error instanceof AppError && error.userMessage) {
            message = error.userMessage;
        }
        await ctx.reply(message);
    }
    catch (replyError) {
        logger_1.logger.error('Failed to send error message to user', replyError instanceof Error ? replyError : new Error(String(replyError)));
    }
}
function errorMiddleware(handler, errorType = ErrorType.UNKNOWN) {
    return async (ctx) => {
        try {
            await handler(ctx);
        }
        catch (error) {
            handleError(error, errorType, { userId: ctx.from?.id });
            await sendErrorToUser(ctx, error);
        }
    };
}
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxRetries) {
                logger_1.logger.warn(`Operation failed, retrying (${attempt}/${maxRetries})`, {
                    error: lastError.message,
                });
                await new Promise((resolve) => setTimeout(resolve, delay * attempt));
            }
        }
    }
    throw lastError || new Error('Operation failed after retries');
}
async function withFallback(primary, fallback, errorType = ErrorType.UNKNOWN) {
    try {
        return await primary();
    }
    catch (error) {
        handleError(error, errorType);
        logger_1.logger.info('Using fallback due to primary operation failure');
        return await fallback();
    }
}
async function withTimeout(operation, timeoutMs, timeoutMessage = 'Operation timed out') {
    return Promise.race([
        operation(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)),
    ]);
}
//# sourceMappingURL=errorHandler.js.map