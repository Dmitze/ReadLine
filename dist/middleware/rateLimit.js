"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitCallback = exports.rateLimitCommand = exports.rateLimitMessage = exports.callbackLimiter = exports.commandLimiter = exports.messageLimiter = void 0;
exports.cleanupRateLimiters = cleanupRateLimiters;
const logger_1 = require("../utils/logger");
class RateLimiter {
    constructor(maxRequests = 20, windowMs = 60000) {
        this.records = new Map();
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }
    check(userId) {
        const now = Date.now();
        const record = this.records.get(userId);
        if (!record || now > record.resetAt) {
            this.records.set(userId, {
                count: 1,
                resetAt: now + this.windowMs,
            });
            return true;
        }
        if (record.count >= this.maxRequests) {
            logger_1.logger.warn('Rate limit exceeded', {
                userId,
                count: record.count,
                limit: this.maxRequests,
            });
            return false;
        }
        this.records.set(userId, {
            count: record.count + 1,
            resetAt: record.resetAt,
        });
        return true;
    }
    cleanup() {
        const now = Date.now();
        const toDelete = [];
        this.records.forEach((record, userId) => {
            if (now > record.resetAt) {
                toDelete.push(userId);
            }
        });
        toDelete.forEach((userId) => this.records.delete(userId));
        if (toDelete.length > 0) {
            logger_1.logger.debug('Rate limit cleanup', { removed: toDelete.length });
        }
    }
    reset(userId) {
        this.records.delete(userId);
        logger_1.logger.debug('Rate limit reset', { userId });
    }
    getStats() {
        return {
            totalUsers: this.records.size,
            maxRequests: this.maxRequests,
            windowMs: this.windowMs,
        };
    }
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.records.clear();
    }
}
const RATE_LIMITS = {
    MESSAGE_MAX: 60,
    MESSAGE_WINDOW: 60000,
    COMMAND_MAX: 30,
    COMMAND_WINDOW: 60000,
    CALLBACK_MAX: 90,
    CALLBACK_WINDOW: 60000,
};
exports.messageLimiter = new RateLimiter(RATE_LIMITS.MESSAGE_MAX, RATE_LIMITS.MESSAGE_WINDOW);
exports.commandLimiter = new RateLimiter(RATE_LIMITS.COMMAND_MAX, RATE_LIMITS.COMMAND_WINDOW);
exports.callbackLimiter = new RateLimiter(RATE_LIMITS.CALLBACK_MAX, RATE_LIMITS.CALLBACK_WINDOW);
function cleanupRateLimiters() {
    exports.messageLimiter.destroy();
    exports.commandLimiter.destroy();
    exports.callbackLimiter.destroy();
}
const rateLimitMessage = async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
        return next();
    }
    if (!exports.messageLimiter.check(userId)) {
        const { ERRORS } = await Promise.resolve().then(() => __importStar(require('../constants')));
        await ctx.reply(`${ERRORS.RATE_LIMIT}\n\n` +
            'Будь ласка, зачекайте хвилину перед наступним повідомленням.\n\n' +
            '💡 Це захист від спаму.', { parse_mode: 'Markdown' });
        return;
    }
    return next();
};
exports.rateLimitMessage = rateLimitMessage;
const rateLimitCommand = async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
        return next();
    }
    if (!exports.commandLimiter.check(userId)) {
        const { ERRORS } = await Promise.resolve().then(() => __importStar(require('../constants')));
        await ctx.reply(`${ERRORS.RATE_LIMIT}\n\n` +
            'Будь ласка, зачекайте хвилину.\n\n' +
            `💡 Ліміт: ${RATE_LIMITS.COMMAND_MAX} команд на хвилину.`, { parse_mode: 'Markdown' });
        return;
    }
    return next();
};
exports.rateLimitCommand = rateLimitCommand;
const rateLimitCallback = async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
        return next();
    }
    if (!exports.callbackLimiter.check(userId)) {
        const { ERRORS } = await Promise.resolve().then(() => __importStar(require('../constants')));
        await ctx.answerCbQuery(`${ERRORS.RATE_LIMIT} Зачекайте хвилину.`, { show_alert: true });
        return;
    }
    return next();
};
exports.rateLimitCallback = rateLimitCallback;
//# sourceMappingURL=rateLimit.js.map