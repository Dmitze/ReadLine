"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggers = exports.enhancedLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const { combine, timestamp, json, printf, colorize, errors } = winston_1.default.format;
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message} `;
    if (Object.keys(metadata).length > 0) {
        msg += JSON.stringify(metadata);
    }
    return msg;
});
exports.enhancedLogger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
    defaultMeta: {
        service: 'warriors-library-bot',
        version: process.env.npm_package_version || '1.0.0',
    },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join('logs', 'combined.log'),
            maxsize: 5242880,
            maxFiles: 10,
        }),
        new winston_1.default.transports.Console({
            format: combine(colorize(), consoleFormat),
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        }),
    ],
    exitOnError: false,
});
exports.enhancedLogger.exceptions.handle(new winston_1.default.transports.File({
    filename: path_1.default.join('logs', 'exceptions.log'),
}));
exports.enhancedLogger.rejections.handle(new winston_1.default.transports.File({
    filename: path_1.default.join('logs', 'rejections.log'),
}));
exports.loggers = {
    userAction: (userId, action, metadata) => {
        exports.enhancedLogger.info('User action', {
            userId,
            action,
            ...metadata,
            type: 'user_action',
        });
    },
    adminAction: (adminId, action, metadata) => {
        exports.enhancedLogger.info('Admin action', {
            adminId,
            action,
            ...metadata,
            type: 'admin_action',
        });
    },
    dbQuery: (query, duration, metadata) => {
        exports.enhancedLogger.debug('Database query', {
            query,
            duration,
            ...metadata,
            type: 'db_query',
        });
    },
    aiRequest: (userId, prompt, duration, metadata) => {
        exports.enhancedLogger.info('AI request', {
            userId,
            prompt: prompt.substring(0, 100),
            duration,
            ...metadata,
            type: 'ai_request',
        });
    },
    performance: (metric, value, metadata) => {
        exports.enhancedLogger.info('Performance metric', {
            metric,
            value,
            ...metadata,
            type: 'performance',
        });
    },
    security: (event, severity, metadata) => {
        exports.enhancedLogger.warn('Security event', {
            event,
            severity,
            ...metadata,
            type: 'security',
        });
    },
};
exports.default = exports.enhancedLogger;
//# sourceMappingURL=enhancedLogger.js.map