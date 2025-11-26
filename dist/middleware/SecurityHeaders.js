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
exports.SecurityContext = void 0;
exports.securityHeadersMiddleware = securityHeadersMiddleware;
exports.corsMiddleware = corsMiddleware;
exports.requestValidationMiddleware = requestValidationMiddleware;
exports.xssPreventionMiddleware = xssPreventionMiddleware;
exports.createSecurityContextMiddleware = createSecurityContextMiddleware;
exports.createSecurityMiddlewareStack = createSecurityMiddlewareStack;
const logger_1 = require("../utils/logger");
const DEFAULT_SECURITY_HEADERS = {
    contentSecurityPolicy: "default-src 'self'",
    crossOriginResourcePolicy: 'cross-origin',
    crossOriginOpenerPolicy: 'same-origin-allow-popups',
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'SAMEORIGIN',
    xPoweredBy: false,
};
function securityHeadersMiddleware(config = {}) {
    const mergedConfig = { ...DEFAULT_SECURITY_HEADERS, ...config };
    return async (ctx, next) => {
        ctx.securityHeaders = {
            contentSecurityPolicy: mergedConfig.contentSecurityPolicy,
            crossOriginResourcePolicy: mergedConfig.crossOriginResourcePolicy,
            crossOriginOpenerPolicy: mergedConfig.crossOriginOpenerPolicy,
            referrerPolicy: mergedConfig.referrerPolicy,
            strictTransportSecurity: mergedConfig.strictTransportSecurity,
            xContentTypeOptions: mergedConfig.xContentTypeOptions,
            xFrameOptions: mergedConfig.xFrameOptions,
        };
        await next();
    };
}
function corsMiddleware(config = {}) {
    const corsConfig = {
        origin: config.origin || '*',
        credentials: config.credentials ?? true,
        methods: config.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: config.allowedHeaders || [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
        ],
        exposedHeaders: config.exposedHeaders || ['Content-Length', 'X-JSON-Response'],
        maxAge: config.maxAge || 86400,
    };
    return async (ctx, next) => {
        ctx.cors = {
            origin: corsConfig.origin,
            credentials: corsConfig.credentials,
            allowedMethods: corsConfig.methods,
            allowedHeaders: corsConfig.allowedHeaders,
            exposedHeaders: corsConfig.exposedHeaders,
            maxAge: corsConfig.maxAge,
        };
        await next();
    };
}
function isOriginAllowed(origin, allowedOrigins) {
    if (typeof allowedOrigins === 'function') {
        return allowedOrigins(origin);
    }
    if (allowedOrigins === '*') {
        return true;
    }
    if (typeof allowedOrigins === 'string') {
        return origin === allowedOrigins;
    }
    return allowedOrigins.includes(origin);
}
function requestValidationMiddleware() {
    return async (ctx, next) => {
        const { LIMITS } = await Promise.resolve().then(() => __importStar(require('../constants/limits')));
        const callbackData = ctx.callbackQuery?.data;
        if (callbackData && typeof callbackData === 'string') {
            if (callbackData.length > LIMITS.MAX_CALLBACK_DATA_LENGTH) {
                logger_1.logger.warn('⚠️ Large callback_query data detected', {
                    length: callbackData.length,
                    limit: LIMITS.MAX_CALLBACK_DATA_LENGTH
                });
                await ctx.answerCbQuery('❌ Дані занадто великі');
                return;
            }
        }
        const messageText = ctx.message?.text;
        if (messageText && typeof messageText === 'string') {
            if (messageText.length > LIMITS.MESSAGE_MAX) {
                logger_1.logger.warn('⚠️ Large message text detected', {
                    length: messageText.length,
                    limit: LIMITS.MESSAGE_MAX
                });
                await ctx.reply(`⚠️ Повідомлення занадто велике. Максимум ${LIMITS.MESSAGE_MAX} символів.`);
                return;
            }
        }
        const userInput = [messageText, callbackData, ctx.session?.userInput].filter(Boolean);
        for (const input of userInput) {
            if (input && hasSQLInjectionPattern(input)) {
                logger_1.logger.warn(`⚠️ Potential SQL injection detected: ${input}`);
                ctx.isBlocked = true;
                await ctx.reply('❌ Некоректний запит.');
                return;
            }
        }
        await next();
    };
}
function hasSQLInjectionPattern(input) {
    const sqlPatterns = [
        /(\bunion\b.*\bselect\b)/i,
        /(\bor\b.*=.*)/i,
        /(\bdrop\b.*\btable\b)/i,
        /(\binsert\b.*\binto\b)/i,
        /(\bupdate\b.*\bset\b)/i,
        /(\bdelete\b.*\bfrom\b)/i,
        /(-{2}|\/\*|\*\/)/,
        /(\bexec\b|\bexecute\b)/i,
        /(\bselect\b.*\bfrom\b)/i,
    ];
    return sqlPatterns.some((pattern) => pattern.test(input));
}
function xssPreventionMiddleware() {
    return async (ctx, next) => {
        const messageText = ctx.message?.text;
        if (messageText && typeof messageText === 'string') {
            const isXSSDetected = checkXSSPatterns(messageText);
            if (isXSSDetected) {
                logger_1.logger.warn(`⚠️ Potential XSS detected: ${messageText}`);
                ctx.isBlocked = true;
                await ctx.reply('❌ Некоректний формат повідомлення.');
                return;
            }
        }
        await next();
    };
}
function checkXSSPatterns(input) {
    const xssPatterns = [
        /<script[^>]*>[\s\S]*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[^>]*>/gi,
        /<embed[^>]*>/gi,
        /<object[^>]*>/gi,
        /eval\(/gi,
        /expression\(/gi,
    ];
    return xssPatterns.some((pattern) => pattern.test(input));
}
class SecurityContext {
    constructor() {
        this.users = new Map();
    }
    checkUser(userId) {
        let context = this.users.get(userId);
        if (!context) {
            context = {
                userId,
                lastActivity: new Date(),
                requestCount: 0,
                isBlocked: false,
                suspiciousActivities: 0,
            };
            this.users.set(userId, context);
        }
        return context;
    }
    recordSuspiciousActivity(userId) {
        const context = this.checkUser(userId);
        context.suspiciousActivities++;
        if (context.suspiciousActivities >= 3) {
            context.isBlocked = true;
            logger_1.logger.warn(`⚠️ User ${userId} blocked due to suspicious activity`);
        }
    }
    incrementRequest(userId) {
        const context = this.checkUser(userId);
        context.requestCount++;
        context.lastActivity = new Date();
    }
    unblockUser(userId) {
        const context = this.users.get(userId);
        if (context) {
            context.isBlocked = false;
            context.suspiciousActivities = 0;
            logger_1.logger.info(`✅ User ${userId} unblocked`);
        }
    }
    cleanup() {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const [userId, context] of this.users.entries()) {
            if (context.lastActivity.getTime() < cutoff) {
                this.users.delete(userId);
            }
        }
    }
}
exports.SecurityContext = SecurityContext;
function createSecurityContextMiddleware(securityContext) {
    return async (ctx, next) => {
        const userId = ctx.from?.id;
        if (!userId) {
            await next();
            return;
        }
        const userContext = securityContext.checkUser(userId);
        if (userContext.isBlocked) {
            logger_1.logger.warn(`⚠️ Blocked user ${userId} attempted access`);
            return;
        }
        securityContext.incrementRequest(userId);
        ctx.securityContext = userContext;
        await next();
    };
}
function createSecurityMiddlewareStack(config) {
    const securityContext = new SecurityContext();
    return {
        cors: corsMiddleware(config?.cors),
        headers: securityHeadersMiddleware(config?.headers),
        requestValidation: requestValidationMiddleware(),
        xssPrevention: xssPreventionMiddleware(),
        securityContext: createSecurityContextMiddleware(securityContext),
        apply: (bot) => {
            bot.use(corsMiddleware(config?.cors));
            bot.use(securityHeadersMiddleware(config?.headers));
            bot.use(createSecurityContextMiddleware(securityContext));
            bot.use(requestValidationMiddleware());
            bot.use(xssPreventionMiddleware());
        },
        getSecurityContext: () => securityContext,
    };
}
//# sourceMappingURL=SecurityHeaders.js.map